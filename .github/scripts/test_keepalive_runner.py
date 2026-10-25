#!/usr/bin/env python3
"""
Unit tests for .github/scripts/keepalive_runner.py
Validates URL scheme restrictions, private/cloud metadata blocking,
localhost handling, and safe protocol enforcement.
"""

import os
import sys
import unittest
from pathlib import Path

# Ensure the .github/scripts directory is on sys.path
scripts_dir = Path(__file__).resolve().parent
if str(scripts_dir) not in sys.path:
    sys.path.insert(0, str(scripts_dir))

from keepalive_runner import (
    validate_target_url,
    is_blocked_destination,
    SafeSchemeHandler,
    get_safe_opener,
    BREVO_API_ENDPOINT,
)
import urllib.request
import urllib.error


class TestKeepAliveSecurity(unittest.TestCase):

    # 1. Valid URLs
    def test_valid_https_url(self):
        url = "https://lifesync-api-3x29.onrender.com/api/system/keep-alive"
        validated = validate_target_url(url, allow_local=False)
        self.assertEqual(validated, url)

    def test_valid_brevo_endpoint(self):
        validated = validate_target_url(BREVO_API_ENDPOINT, allow_local=False)
        self.assertEqual(validated, BREVO_API_ENDPOINT)

    # 2. file:// scheme rejection
    def test_reject_file_scheme(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("file:///etc/passwd")
        self.assertIn("Blocked unsafe URL scheme 'file'", str(ctx.exception))

    def test_reject_windows_file_scheme(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("file:///C:/Windows/win.ini")
        self.assertIn("Blocked unsafe URL scheme 'file'", str(ctx.exception))

    # 3. Unexpected schemes rejection
    def test_reject_ftp_scheme(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("ftp://ftp.example.com/file.txt")
        self.assertIn("Blocked unsafe URL scheme 'ftp'", str(ctx.exception))

    def test_reject_gopher_scheme(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("gopher://gopher.example.com/1")
        self.assertIn("Blocked unsafe URL scheme 'gopher'", str(ctx.exception))

    def test_reject_data_scheme(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("data:text/plain;base64,SGVsbG8=")
        self.assertIn("Blocked unsafe URL scheme 'data'", str(ctx.exception))

    # 4. Cloud metadata blocking
    def test_reject_cloud_metadata_ipv4(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("http://169.254.169.254/latest/meta-data/")
        self.assertIn("Cloud metadata service access (169.254.169.254) is strictly prohibited", str(ctx.exception))

    def test_reject_cloud_metadata_even_with_allow_local(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("http://169.254.169.254/latest/meta-data/", allow_local=True)
        self.assertIn("Cloud metadata service access (169.254.169.254) is strictly prohibited", str(ctx.exception))

    # 5. Private / internal network blocking
    def test_reject_private_10_network(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("https://10.0.0.1/api/probe", allow_local=False)
        self.assertIn("Private/internal network address", str(ctx.exception))

    def test_reject_private_192_168_network(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("https://192.168.1.1/api/probe", allow_local=False)
        self.assertIn("Private/internal network address", str(ctx.exception))

    def test_reject_private_172_16_network(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("https://172.16.0.5/api/probe", allow_local=False)
        self.assertIn("Private/internal network address", str(ctx.exception))

    # 6. Localhost handling
    def test_reject_localhost_in_production_mode(self):
        with self.assertRaises(ValueError) as ctx:
            validate_target_url("http://localhost:5048/api/probe", allow_local=False)
        self.assertIn("Localhost access is prohibited in production keepalive mode", str(ctx.exception))

    def test_allow_localhost_when_explicitly_configured(self):
        url = "http://localhost:5048/api/probe"
        validated = validate_target_url(url, allow_local=True)
        self.assertEqual(validated, url)

    def test_allow_127_0_0_1_when_explicitly_configured(self):
        url = "http://127.0.0.1:5048/api/probe"
        validated = validate_target_url(url, allow_local=True)
        self.assertEqual(validated, url)

    # 7. Safe opener and protocol handler
    def test_safe_opener_initialization(self):
        opener = get_safe_opener()
        self.assertIsInstance(opener, urllib.request.OpenerDirector)

    def test_safe_scheme_handler_blocks_non_http_request(self):
        handler = SafeSchemeHandler()
        dummy_req = urllib.request.Request("custom-protocol://example.com/resource")
        with self.assertRaises(urllib.error.URLError) as ctx:
            handler.default_open(dummy_req)
        self.assertIn("Prohibited protocol scheme", str(ctx.exception.reason))


if __name__ == "__main__":
    unittest.main()
