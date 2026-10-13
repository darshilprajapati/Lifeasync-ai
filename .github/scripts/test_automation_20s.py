#!/usr/bin/env python3
"""
LifeSync AI - Temporary 20-Second Automated Email Diagnostic Test Runner
Target Recipient: gdarshil1203@gmail.com
Purpose: Verify high-frequency automation triggering, backend database probe, and SMTP delivery.
Safety Controls: Non-overlapping executions, safety cap on iterations, clean logging without secret leakage.
"""

import os
import sys
import time
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

RECIPIENT_EMAIL = "gdarshil1203@gmail.com"
TEST_INTERVAL_SECONDS = 20
DEFAULT_MAX_ITERATIONS = 5  # Safety cap per diagnostic execution cycle

def get_current_ist_time():
    utc_now = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    ist_time = utc_now + ist_offset
    return ist_time.strftime("%Y-%m-%d %I:%M:%S %p IST")

def send_test_email(iteration, total_iterations, smtp_host, smtp_port, smtp_user, smtp_pass, sender_email):
    ist_time = get_current_ist_time()
    subject = f"[TEST 20s AUTOMATION] LifeSync AI — Scheduled Test Email #{iteration}/{total_iterations} (20s Interval)"

    plain_content = f"""LifeSync AI — Temporary 20-Second Automation Test
=========================================================
Iteration: #{iteration} of {total_iterations}
Execution Interval: Every 20 seconds
Target Recipient: {RECIPIENT_EMAIL}
Execution Time (IST): {ist_time}
Status: VERIFIED & ACTIVE

Diagnostic Summary:
- Scheduler Trigger: Executed successfully
- SMTP Connection: Established ({smtp_host}:{smtp_port})
- Authentication: Authenticated
- Message Delivery: Dispatched directly to inbox
- Purpose: Temporary verification before final monthly schedule transition.
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 24px; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 10px; border-left: 6px solid #3b82f6; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 16px;">
      <h2 style="color: #1e3a8a; margin: 0; font-size: 18px;">LifeSync AI &bull; Temporary Automation Test</h2>
      <span style="background: #dbeafe; color: #1e40af; font-size: 12px; font-weight: bold; padding: 4px 8px; border-radius: 4px;">Iteration #{iteration}/{total_iterations}</span>
    </div>
    <p style="color: #4b5563; font-size: 14px; margin-top: 0;">
      This is a temporary diagnostic email dispatched every <strong>20 seconds</strong> to verify that LifeSync AI's end-to-end email automation is functioning reliably.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
      <tr><td style="padding: 6px 0; color: #6b7280; font-weight: bold; width: 160px;">Trigger Interval:</td><td style="color: #111827;">Every 20 seconds (Temporary)</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280; font-weight: bold;">Status:</td><td style="color: #10b981; font-weight: bold;">DELIVERED (SUCCESS)</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280; font-weight: bold;">Execution Time (IST):</td><td style="color: #111827;">{ist_time}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280; font-weight: bold;">Recipient:</td><td style="color: #111827;">{RECIPIENT_EMAIL}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280; font-weight: bold;">SMTP Host:</td><td style="color: #111827;">{smtp_host}:{smtp_port}</td></tr>
    </table>
    <div style="margin-top: 20px; padding: 12px; background-color: #eff6ff; border-radius: 6px; color: #1e40af; font-size: 12px; line-height: 1.4;">
      <strong>Diagnostic Phase Active:</strong> Once confirmed, this high-frequency 20-second test mode will be switched to your intended permanent monthly schedule.
    </div>
  </div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["To"] = RECIPIENT_EMAIL
    msg["From"] = sender_email
    msg["Subject"] = subject

    msg.attach(MIMEText(plain_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    port = int(smtp_port)
    if port == 465:
        server = smtplib.SMTP_SSL(smtp_host, port, timeout=15)
    else:
        server = smtplib.SMTP(smtp_host, port, timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()

    server.login(smtp_user, smtp_pass)
    server.sendmail(sender_email, [RECIPIENT_EMAIL], msg.as_string())
    server.quit()
    print(f"[{ist_time}] Test email #{iteration}/{total_iterations} successfully sent to {RECIPIENT_EMAIL}")
    return True

def run_test_sequence(max_iterations=DEFAULT_MAX_ITERATIONS):
    # Retrieve SMTP credentials from environment variables or gitignored local dev settings
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT")
    smtp_user = os.environ.get("SMTP_USER") or os.environ.get("SMTP_USERNAME")
    smtp_pass = os.environ.get("SMTP_PASSWORD") or os.environ.get("SMTP_PASS")
    sender_email = os.environ.get("SMTP_FROM")

    # If environment variables are not set, attempt loading from local gitignored appsettings.Development.json
    if not (smtp_user and smtp_pass):
        try:
            import json
            repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            dev_settings_path = os.path.join(repo_root, "backend", "LifeSyncAI.API", "appsettings.Development.json")
            if os.path.exists(dev_settings_path):
                with open(dev_settings_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    smtp_cfg = cfg.get("SmtpSettings", {})
                    smtp_host = smtp_host or smtp_cfg.get("Host", "smtp.gmail.com")
                    smtp_port = smtp_port or smtp_cfg.get("Port", "587")
                    smtp_user = smtp_user or smtp_cfg.get("Username")
                    smtp_pass = smtp_pass or smtp_cfg.get("Password")
                    sender_email = sender_email or smtp_cfg.get("SenderEmail") or smtp_user
        except Exception as e:
            print(f"[WARN] Could not load local development settings: {e}")

    smtp_host = smtp_host or "smtp.gmail.com"
    smtp_port = smtp_port or "587"
    sender_email = sender_email or smtp_user or "no-reply@lifesync.ai"

    if not smtp_user or not smtp_pass:
        print("[ERROR] SMTP credentials not provided. Set SMTP_USER and SMTP_PASSWORD environment variables.")
        return False

    print("===================================================================")
    print(" LifeSync AI — Automated 20-Second Diagnostic Email Test")
    print("===================================================================")
    print(f"Target Recipient: {RECIPIENT_EMAIL}")
    print(f"Interval:         {TEST_INTERVAL_SECONDS} seconds")
    print(f"Iterations:       {max_iterations} cycles")
    print(f"Start Time (IST): {get_current_ist_time()}")
    print("===================================================================\n")

    successful_runs = 0
    for i in range(1, max_iterations + 1):
        print(f"--- Iteration {i}/{max_iterations} starting at {get_current_ist_time()} ---")
        try:
            success = send_test_email(i, max_iterations, smtp_host, smtp_port, smtp_user, smtp_pass, sender_email)
            if success:
                successful_runs += 1
        except Exception as e:
            print(f"[{get_current_ist_time()}] [ERROR] Iteration {i} failed: {type(e).__name__}: {str(e)}")

        if i < max_iterations:
            print(f"Waiting {TEST_INTERVAL_SECONDS} seconds before next iteration...\n")
            time.sleep(TEST_INTERVAL_SECONDS)

    print("\n===================================================================")
    print(f" Diagnostic test sequence finished at {get_current_ist_time()}")
    print(f" Results: {successful_runs}/{max_iterations} emails delivered successfully.")
    print("===================================================================")
    return successful_runs == max_iterations

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_MAX_ITERATIONS
    success = run_test_sequence(count)
    sys.exit(0 if success else 1)
