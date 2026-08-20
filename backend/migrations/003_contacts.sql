CREATE TABLE mandi_contacts (
  id          serial PRIMARY KEY,
  market_id   integer NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  name        text NOT NULL,
  role        text,
  phone       text,
  email       text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON mandi_contacts (market_id);
