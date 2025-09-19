#!/usr/bin/env python3
"""
Admin password configuration for Unicode's Portfolio
This file contains the admin password that can be imported by the Node.js server
"""

# Admin password - change this in production
ADMIN_PASSWORD = "unicode2024!"

def get_admin_password():
    """Return the admin password"""
    return ADMIN_PASSWORD

if __name__ == "__main__":
    print("Current admin password:", ADMIN_PASSWORD)
