-- See backend/documentation/postgres-schema.md for the full design rationale.

CREATE TABLE markets (
  id               serial PRIMARY KEY,
  district         text NOT NULL,
  market_name      text NOT NULL,
  display_name     text,
  lat              double precision,
  lon              double precision,
  geocoded_at      timestamptz,
  geocoded_by      text,
  first_seen_date  date NOT NULL,
  last_seen_date   date NOT NULL,
  UNIQUE (district, market_name)
);

CREATE TABLE commodities (
  id                    serial PRIMARY KEY,
  name                  text NOT NULL UNIQUE,
  name_hi               text,
  default_lot_quintals  numeric
);

CREATE TABLE price_observations (
  id                    bigserial PRIMARY KEY,
  market_id             int NOT NULL REFERENCES markets(id),
  commodity_id          int NOT NULL REFERENCES commodities(id),
  variety               text NOT NULL,
  grade                 text NOT NULL,
  arrival_date          date NOT NULL,
  min_price             numeric NOT NULL,
  max_price             numeric NOT NULL,
  modal_price            numeric NOT NULL,
  source_snapshot_date  date NOT NULL,
  ingested_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_id, commodity_id, variety, grade, arrival_date)
);

CREATE INDEX idx_price_obs_commodity_date ON price_observations (commodity_id, arrival_date DESC);
CREATE INDEX idx_price_obs_market_date ON price_observations (market_id, arrival_date DESC);
