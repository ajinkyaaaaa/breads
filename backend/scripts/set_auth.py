"""Set (or rotate) the single login credential.

Usage: python scripts/set_auth.py <username> <password>

Replaces whatever credential currently exists -- this app has exactly one
shared login, not a multi-user table, so there's only ever one row.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt

from app.db import get_connection


def main():
    if len(sys.argv) != 3:
        print("Usage: python scripts/set_auth.py <username> <password>")
        sys.exit(1)

    username, password = sys.argv[1], sys.argv[2]
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM app_auth")
            cur.execute(
                "INSERT INTO app_auth (username, password_hash) VALUES (%s, %s)",
                (username, password_hash),
            )
        conn.commit()

    print(f"Credential set for username '{username}'.")


if __name__ == "__main__":
    main()
