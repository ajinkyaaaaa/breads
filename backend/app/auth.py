"""Single shared login credential -- not a multi-user accounts system.

The credential itself lives in Postgres (app_auth, one row, bcrypt-hashed
password), not in code or an env var, so it can be rotated by re-running
scripts/set_auth.py without a redeploy. What IS an env var is AUTH_SECRET,
the key used to sign session tokens -- that's a server secret, not a
credential, and rotating it just invalidates existing sessions.
"""

import os
import time

import bcrypt
import jwt
from fastapi import Header, HTTPException

from .db import get_connection

_AUTH_SECRET = os.environ["AUTH_SECRET"]
_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days


def verify_credentials(username: str, password: str) -> bool:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT password_hash FROM app_auth WHERE username = %s", (username,))
        row = cur.fetchone()
    if not row:
        return False
    return bcrypt.checkpw(password.encode(), row["password_hash"].encode())


def issue_token(username: str) -> str:
    payload = {"sub": username, "exp": int(time.time()) + _TOKEN_TTL_SECONDS}
    return jwt.encode(payload, _AUTH_SECRET, algorithm="HS256")


def require_auth(authorization: str | None = Header(default=None)) -> str:
    """FastAPI dependency -- add to any route that needs a logged-in session."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, _AUTH_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return payload["sub"]
