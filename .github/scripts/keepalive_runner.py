#!/usr/bin/env python3
"""
LifeSync AI - Daily Keep-Alive and Database Connectivity Probe Runner
Scheduled to run daily at 12:00 PM IST (06:30 AM UTC / '30 6 * * *')
Performs lightweight database connectivity probe and dispatches status notification to gdarshil1203@gmail.com
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

RECIPIENT_EMAIL = "gdarshil1203@gmail.com"
MAX_RETRIES = 2
REQUEST_TIMEOUT_SECONDS = 60
RETRY_DELAY_SECONDS = 5


def get_current_ist_time():
    utc_now = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    ist_time = utc_now + ist_offset
    return ist_time.strftime("%Y-%m-%d %I:%M:%S %p IST")


def probe_keep_alive(api_base_url, keepalive_secret):
    url = f"{api_base_url.rstrip('/')}/api/system/keep-alive"
    headers = {
        "User-Agent": "LifeSyncAI-Scheduled-KeepAlive/1.0",
        "Accept": "application/json",
        "X-KeepAlive-Key": keepalive_secret
    }

    last_error = None
    last_status = None

    for attempt in range(1, MAX_RETRIES + 2):
        print(f"[{get_current_ist_time()}] Keep-alive probe attempt {attempt}/{MAX_RETRIES + 1} -> {url}")
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                status_code = response.getcode()
                response_body = response.read().decode("utf-8")
                
                try:
                    payload = json.loads(response_body)
                except Exception:
                    payload = {}

                if status_code == 200 and payload.get("isSuccess"):
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


def send_notification_email(is_success, probe_result):
    ist_time_str = get_current_ist_time()
    
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT", "587")
    smtp_user = os.environ.get("SMTP_USER") or os.environ.get("SMTP_USERNAME")
    smtp_pass = os.environ.get("SMTP_PASSWORD") or os.environ.get("SMTP_PASS")
    sender_email = os.environ.get("SMTP_FROM")

    # Local development fallback if running manual diagnostic on development machine
    if not (smtp_user and smtp_pass):
        try:
            repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            dev_settings = os.path.join(repo_root, "backend", "LifeSyncAI.API", "appsettings.Development.json")
            if os.path.exists(dev_settings):
                with open(dev_settings, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    scfg = cfg.get("SmtpSettings", {})
                    smtp_host = smtp_host or scfg.get("Host")
                    smtp_port = smtp_port or scfg.get("Port", "587")
                    smtp_user = smtp_user or scfg.get("Username")
                    smtp_pass = smtp_pass or scfg.get("Password")
                    sender_email = sender_email or scfg.get("SenderEmail")
        except Exception:
            pass

    sender_email = sender_email or smtp_user or "notifications@lifesync.ai"

    if not smtp_host or not smtp_user or not smtp_pass:
        print("\n[WARNING] Email dispatch skipped: SMTP credentials not fully configured in environment.")
        print("Required GitHub Secrets:")
        print("  - SMTP_HOST (e.g. smtp.gmail.com or smtp.sendgrid.net)")
        print("  - SMTP_PORT (e.g. 587)")
        print("  - SMTP_USER / SMTP_USERNAME")
        print("  - SMTP_PASSWORD")
        print(f"Target recipient: {RECIPIENT_EMAIL}\n")
        return False

    msg = MIMEMultipart("alternative")
    msg["To"] = RECIPIENT_EMAIL
    msg["From"] = sender_email

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
      Please check Render/backend logs and verify Neon PostgreSQL database status.
    </div>
  </div>
</body>
</html>"""

    msg["Subject"] = subject
    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        port_num = int(smtp_port)
        if port_num == 465:
            server = smtplib.SMTP_SSL(smtp_host, port_num, timeout=20)
        else:
            server = smtplib.SMTP(smtp_host, port_num, timeout=20)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(smtp_user, smtp_pass)
        server.sendmail(sender_email, [RECIPIENT_EMAIL], msg.as_string())
        server.quit()
        print(f"[{ist_time_str}] Notification email successfully dispatched to {RECIPIENT_EMAIL}.")
        return True
    except Exception as e:
        print(f"[{ist_time_str}] Failed to deliver notification email: {type(e).__name__}: {str(e)}")
        return False


def main():
    api_base_url = os.environ.get("API_BASE_URL") or os.environ.get("BACKEND_URL") or "https://lifesync-ai.onrender.com"
    keepalive_secret = os.environ.get("KEEPALIVE_SECRET") or "LifeSync_KeepAlive_Secret_2026_Key!"

    print(f"=== LifeSync AI Scheduled Keep-Alive Task ===")
    print(f"Target API Base: {api_base_url}")
    print(f"Notification Recipient: {RECIPIENT_EMAIL}")
    print(f"Time (IST): {get_current_ist_time()}")

    if not keepalive_secret:
        print("[ERROR] KEEPALIVE_SECRET environment variable is missing. Cannot authenticate keep-alive probe.")
        probe_result = {
            "success": False,
            "status_code": None,
            "error": "Missing KEEPALIVE_SECRET configuration in GitHub Actions Secrets."
        }
        send_notification_email(False, probe_result)
        sys.exit(1)

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
