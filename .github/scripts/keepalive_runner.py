#!/usr/bin/env python3
"""
LifeSync AI - Daily Keep-Alive and Database Connectivity Probe Runner
Scheduled to run daily at 12:00 PM IST (06:30 AM UTC / '30 6 * * *')
Performs lightweight database connectivity probe and dispatches status notification.
Uses exact configuration variable names from Render environment:
- ADMIN_EMAIL
- EmailSettings__ApiKey
- EmailSettings__Provider
- EmailSettings__SenderEmail
- EmailSettings__SenderName
- KeepAliveSettings__SecretKey
"""

import os
import sys
import json
import time
import ipaddress
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone, timedelta
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

MAX_RETRIES = 2
REQUEST_TIMEOUT_SECONDS = 60
RETRY_DELAY_SECONDS = 5
ALLOWED_URL_SCHEMES = {"http", "https"}
BREVO_API_ENDPOINT = "https://api.brevo.com/v3/smtp/email"
CLOUD_METADATA_IPS = {
    "169.254.169.254",
    "fd00:ec2::254",
}


def is_blocked_destination(hostname: str, allow_local: bool = False) -> tuple[bool, str]:
    """
    Checks whether a hostname represents a prohibited destination, such as
    cloud metadata endpoints, link-local IPs, private networks, or unauthorized localhost.
    """
    clean_host = hostname.strip("[]").lower()

    # 1. Cloud metadata service check (always blocked unconditionally)
    if clean_host in CLOUD_METADATA_IPS:
        return True, "Cloud metadata service access (169.254.169.254) is strictly prohibited."

    # 2. Localhost check
    if clean_host == "localhost" or clean_host.endswith(".localhost"):
        if not allow_local:
            return True, "Localhost access is prohibited in production keepalive mode."
        return False, ""

    # 3. Direct IP address check
    try:
        ip = ipaddress.ip_address(clean_host)
        if ip.is_loopback:
            if not allow_local:
                return True, "Loopback addresses are prohibited in production keepalive mode."
            return False, ""
        if ip.is_link_local:
            return True, f"Link-local network address '{ip}' is strictly prohibited."
        if ip.is_private:
            if not allow_local:
                return True, f"Private/internal network address '{ip}' is prohibited."
            return False, ""
        if ip.is_multicast or ip.is_reserved:
            return True, f"Reserved or multicast address '{ip}' is prohibited."
    except ValueError:
        pass

    return False, ""


def validate_target_url(raw_url: str, allow_local: bool = False) -> str:
    """
    Validates that a URL:
    1. Uses safe protocols strictly in {'http', 'https'} (explicitly rejecting file://, ftp://, etc.)
    2. Has a valid netloc and hostname
    3. Does not target cloud metadata or unauthorized private/internal addresses.
    """
    if not raw_url or not isinstance(raw_url, str):
        raise ValueError("Invalid URL: URL must be a non-empty string.")

    raw_url = raw_url.strip()
    parsed = urllib.parse.urlparse(raw_url)

    scheme = parsed.scheme.lower()
    if scheme not in ALLOWED_URL_SCHEMES:
        raise ValueError(
            f"Blocked unsafe URL scheme '{parsed.scheme}'. Only http and https schemes are permitted."
        )

    if not parsed.netloc or not parsed.hostname:
        raise ValueError(f"Invalid destination URL: missing valid network location/hostname in '{raw_url}'.")

    blocked, reason = is_blocked_destination(parsed.hostname, allow_local=allow_local)
    if blocked:
        raise ValueError(f"Destination '{parsed.hostname}' is prohibited: {reason}")

    return raw_url


class SafeSchemeHandler(urllib.request.BaseHandler):
    """
    Explicitly intercepts any attempt to open non-HTTP/HTTPS URLs, guaranteeing
    that file://, ftp://, or other custom protocol handlers cannot be invoked.
    """
    def default_open(self, req):
        if req.type and req.type.lower() not in ALLOWED_URL_SCHEMES:
            raise urllib.error.URLError(f"Prohibited protocol scheme: {req.type}")
        return None


def get_safe_opener() -> urllib.request.OpenerDirector:
    """
    Builds a dedicated urllib opener that registers HTTP/HTTPS handlers
    and enforces safe scheme restrictions without exposing default FileHandler behavior.
    """
    return urllib.request.build_opener(
        SafeSchemeHandler(),
        urllib.request.HTTPHandler(),
        urllib.request.HTTPSHandler(),
        urllib.request.HTTPRedirectHandler(),
        urllib.request.HTTPErrorProcessor()
    )


def get_current_ist_time():
    utc_now = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    ist_time = utc_now + ist_offset
    return ist_time.strftime("%Y-%m-%d %I:%M:%S %p IST")


def probe_keep_alive(api_base_url, keepalive_secret, allow_local=False):
    allow_local = allow_local or os.environ.get("ALLOW_LOCAL_PROBE", "").lower() in ("true", "1", "yes")
    clean_base_url = validate_target_url(api_base_url, allow_local=allow_local)
    url = validate_target_url(f"{clean_base_url.rstrip('/')}/api/system/keep-alive", allow_local=allow_local)
    headers = {
        "User-Agent": "LifeSyncAI-Scheduled-KeepAlive/1.0",
        "Accept": "application/json",
        "X-KeepAlive-Key": keepalive_secret
    }

    last_error = None
    last_status = None
    opener = get_safe_opener()

    for attempt in range(1, MAX_RETRIES + 2):
        print(f"[{get_current_ist_time()}] Keep-alive probe attempt {attempt}/{MAX_RETRIES + 1} -> {url}")
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with opener.open(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                status_code = response.getcode()
                response_body = response.read().decode("utf-8")
                
                try:
                    payload = json.loads(response_body)
                except Exception:
                    payload = {}

                if response_body.strip().startswith("<") or "<html" in response_body.lower():
                    last_status = status_code
                    last_error = f"API returned HTML instead of JSON. Ensure BACKEND_URL points to your ASP.NET Core Web Service (backend) on Render, not your frontend static site."
                elif status_code == 200 and payload.get("isSuccess"):
                    return {
                        "success": True,
                        "status_code": status_code,
                        "data": payload.get("data", {}),
                        "message": payload.get("message", "Database connectivity check passed.")
                    }
                else:
                    last_status = status_code
                    last_error = payload.get("message") or f"Unexpected status {status_code}"

        except urllib.error.HTTPError as e:
            last_status = e.code
            try:
                body = e.read().decode("utf-8")
                parsed = json.loads(body)
                last_error = parsed.get("message") or f"HTTP {e.code}: {e.reason}"
            except Exception:
                last_error = f"HTTP {e.code}: {e.reason}"

        except urllib.error.URLError as e:
            last_status = None
            last_error = f"Network/Connection error: {e.reason}"

        except Exception as e:
            last_status = None
            last_error = f"Unexpected error: {type(e).__name__}"

        if attempt <= MAX_RETRIES:
            print(f"Attempt {attempt} failed: {last_error}. Retrying in {RETRY_DELAY_SECONDS}s...")
            time.sleep(RETRY_DELAY_SECONDS)

    return {
        "success": False,
        "status_code": last_status,
        "error": last_error or "Unknown probe failure"
    }


def send_via_brevo(api_key, sender_email, sender_name, to_email, subject, html_content, text_content):
    brevo_url = validate_target_url(BREVO_API_ENDPOINT, allow_local=False)
    parsed = urllib.parse.urlparse(brevo_url)
    if parsed.hostname != "api.brevo.com" or parsed.scheme != "https":
        raise ValueError("Invalid Brevo endpoint destination.")

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content
    }
    req = urllib.request.Request(brevo_url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    opener = get_safe_opener()
    with opener.open(req, timeout=20) as resp:
        return resp.getcode() in (200, 201)


def send_notification_email(is_success, probe_result):
    ist_time_str = get_current_ist_time()
    
    # Read variables strictly from the Render environment configuration
    recipient_email = os.environ.get("ADMIN_EMAIL") or "gdarshil1203@gmail.com"
    email_api_key = os.environ.get("EmailSettings__ApiKey")
    sender_email = os.environ.get("EmailSettings__SenderEmail") or "roomsmessage999@gmail.com"
    sender_name = os.environ.get("EmailSettings__SenderName") or "LifeSync Support"
    email_provider = os.environ.get("EmailSettings__Provider") or "Brevo"

    # Local fallback for diagnostics if running locally
    if not email_api_key:
        try:
            repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            dev_settings = os.path.join(repo_root, "backend", "LifeSyncAI.API", "appsettings.Development.json")
            if os.path.exists(dev_settings):
                with open(dev_settings, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    esec = cfg.get("EmailSettings", {})
                    email_api_key = email_api_key or esec.get("ApiKey")
                    sender_email = sender_email or esec.get("SenderEmail")
                    sender_name = sender_name or esec.get("SenderName")
        except Exception:
            pass

    if is_success:
        subject = "LifeSync AI — Daily Keep-Alive SUCCESS"
        provider = probe_result.get("data", {}).get("provider", "PostgreSQL (Neon Serverless)")
        
        text_content = (
            f"LifeSync AI — Daily Keep-Alive SUCCESS\n\n"
            f"Status: SUCCESS\n"
            f"Timestamp (IST): {ist_time_str}\n"
            f"Database Connectivity: Passed\n"
            f"Configured Provider: {provider}\n"
            f"Message: {probe_result.get('message', 'Keep-alive completed successfully.')}\n\n"
            f"No manual action required."
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border-left: 6px solid #10b981; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <h2 style="color: #10b981; margin-top: 0;">LifeSync AI — Daily Keep-Alive SUCCESS</h2>
    <p style="color: #4b5563; font-size: 15px;">The scheduled daily database connectivity check has completed successfully.</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 160px;">Result:</td><td style="color: #10b981; font-weight: bold;">SUCCESS</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Database Connectivity:</td><td style="color: #111827;">Passed (Connected)</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Provider:</td><td style="color: #111827;">{provider}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Execution Time:</td><td style="color: #111827;">{ist_time_str}</td></tr>
    </table>
    <div style="margin-top: 24px; padding: 12px; background-color: #ecfdf5; border-radius: 6px; color: #065f46; font-size: 13px;">
      All systems are healthy. No manual action is required.
    </div>
  </div>
</body>
</html>"""
    else:
        subject = "LifeSync AI — Daily Keep-Alive FAILED"
        status_code = probe_result.get("status_code")
        status_disp = f"HTTP {status_code}" if status_code else "Connection / Network Error"
        error_desc = probe_result.get("error", "Database probe failed.")

        text_content = (
            f"LifeSync AI — Daily Keep-Alive FAILED\n\n"
            f"Status: FAILED\n"
            f"Timestamp (IST): {ist_time_str}\n"
            f"Failed Operation: Database Keep-Alive Connectivity Probe\n"
            f"Status Code / Category: {status_disp}\n"
            f"Description: {error_desc}\n"
            f"Action Required: Immediate manual attention recommended.\n"
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border-left: 6px solid #ef4444; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <h2 style="color: #ef4444; margin-top: 0;">LifeSync AI — Daily Keep-Alive FAILED</h2>
    <p style="color: #4b5563; font-size: 15px;">The scheduled daily database connectivity check encountered an error and requires attention.</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 160px;">Result:</td><td style="color: #ef4444; font-weight: bold;">FAILED</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Failed Operation:</td><td style="color: #111827;">Database Connectivity Probe</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Status Code / Category:</td><td style="color: #ef4444; font-weight: bold;">{status_disp}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Sanitized Error:</td><td style="color: #111827;">{error_desc}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Execution Time:</td><td style="color: #111827;">{ist_time_str}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Action Required:</td><td style="color: #dc2626; font-weight: bold;">YES (Please inspect backend and database status)</td></tr>
    </table>
    <div style="margin-top: 24px; padding: 12px; background-color: #fef2f2; border-radius: 6px; color: #991b1b; font-size: 13px;">
      Please check Render backend Web Service status and verify Neon PostgreSQL database connection.
    </div>
  </div>
</body>
</html>"""

    # 1. Send via Brevo API if EmailSettings__ApiKey is configured
    if email_api_key:
        try:
            if send_via_brevo(email_api_key, sender_email, sender_name, recipient_email, subject, html_content, text_content):
                print(f"[{ist_time_str}] Notification email successfully dispatched to {recipient_email} via Brevo API.")
                return True
        except Exception as e:
            print(f"[{ist_time_str}] Brevo dispatch failed: {type(e).__name__}: {str(e)}.")

    # 2. Fallback to local SMTP if present in development configuration
    try:
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        dev_settings = os.path.join(repo_root, "backend", "LifeSyncAI.API", "appsettings.Development.json")
        if os.path.exists(dev_settings):
            with open(dev_settings, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                scfg = cfg.get("SmtpSettings", {})
                smtp_host = scfg.get("Host")
                smtp_port = int(scfg.get("Port", 587))
                smtp_user = scfg.get("Username")
                smtp_pass = scfg.get("Password")

                if smtp_host and smtp_user and smtp_pass:
                    msg = MIMEMultipart("alternative")
                    msg["To"] = recipient_email
                    msg["From"] = sender_email
                    msg["Subject"] = subject
                    msg.attach(MIMEText(text_content, "plain"))
                    msg.attach(MIMEText(html_content, "html"))

                    server = smtplib.SMTP(smtp_host, smtp_port, timeout=20)
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(sender_email, [recipient_email], msg.as_string())
                    server.quit()
                    print(f"[{ist_time_str}] Notification email successfully dispatched to {recipient_email} via local SMTP fallback.")
                    return True
    except Exception as e:
        print(f"[{ist_time_str}] Local fallback failed: {e}")

    print("\n[WARNING] Email dispatch skipped: EmailSettings__ApiKey is not configured in environment.")
    print(f"Target recipient: {recipient_email}\n")
    return False


def main():
    api_base_url = os.environ.get("BACKEND_URL") or "https://lifesync-api-3x29.onrender.com"
    keepalive_secret = os.environ.get("KeepAliveSettings__SecretKey") or "LifeSync_KeepAlive_Secret_2026_Key!"
    recipient_email = os.environ.get("ADMIN_EMAIL") or "gdarshil1203@gmail.com"

    print(f"=== LifeSync AI Scheduled Keep-Alive Task ===")
    print(f"Target API Base: {api_base_url}")
    print(f"Notification Recipient (ADMIN_EMAIL): {recipient_email}")
    print(f"Time (IST): {get_current_ist_time()}")

    result = probe_keep_alive(api_base_url, keepalive_secret)

    if result["success"]:
        print(f"Keep-alive check PASSED: {result.get('message')}")
        send_notification_email(True, result)
        sys.exit(0)
    else:
        print(f"Keep-alive check FAILED: {result.get('error')}")
        send_notification_email(False, result)
        sys.exit(1)


if __name__ == "__main__":
    main()
