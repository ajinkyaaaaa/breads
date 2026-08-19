-- Single shared login credential for the whole app -- not a multi-user
-- accounts table, just one gate. password_hash is a bcrypt hash, never
-- plaintext. Row is inserted via scripts/set_auth.py, not this migration,
-- so hashing always goes through the same code path as verification.
CREATE TABLE app_auth (
  id            serial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
