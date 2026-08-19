# Postgres Schema — Mandi Price Archive

Three tables. `markets` and `commodities` are dynamically discovered dimension
tables (populated by the ingest pipeline, enriched via the UI); `price_observations`
is the daily fact archive everything else is computed from.

```sql
CREATE TABLE markets (
  id               serial PRIMARY KEY,
  district         text NOT NULL,
  market_name      text NOT NULL,          -- exact string from the Agmarknet API
  display_name     text,                   -- optional curated cleanup for the UI
  lat              double precision,       -- NULL until geocoded
  lon              double precision,
  geocoded_at      timestamptz,
  geocoded_by      text,                   -- 'seed_import' or a user id
  first_seen_date  date NOT NULL,
  last_seen_date   date NOT NULL,
  UNIQUE (district, market_name)
);

CREATE TABLE commodities (
  id                    serial PRIMARY KEY,
  name                  text NOT NULL UNIQUE,  -- exact string from the Agmarknet API
  name_hi               text,                  -- curated, optional
  default_lot_quintals  numeric                -- curated, optional (illustrative, not API data)
);

CREATE TABLE price_observations (
  id                   bigserial PRIMARY KEY,
  market_id            int NOT NULL REFERENCES markets(id),
  commodity_id         int NOT NULL REFERENCES commodities(id),
  variety              text NOT NULL,
  grade                text NOT NULL,
  arrival_date         date NOT NULL,      -- the API record's own arrival_date
  min_price            numeric NOT NULL,
  max_price            numeric NOT NULL,
  modal_price          numeric NOT NULL,
  source_snapshot_date date NOT NULL,      -- calendar date our ingest job ran
  ingested_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market_id, commodity_id, variety, grade, arrival_date)
);

CREATE INDEX idx_price_obs_commodity_date ON price_observations (commodity_id, arrival_date DESC);
CREATE INDEX idx_price_obs_market_date ON price_observations (market_id, arrival_date DESC);
```

## How the tables connect

- `price_observations.market_id → markets.id` — every price row belongs to exactly
  one market. Ingest resolves this FK by looking up `(district, market_name)`
  from the raw API record; if no row matches, a new `markets` row is inserted first
  with `lat`/`lon` left `NULL` (pending geocoding via the UI editor).
- `price_observations.commodity_id → commodities.id` — same pattern, keyed on
  `commodities.name`.
- The `UNIQUE (market_id, commodity_id, variety, grade, arrival_date)` constraint
  on `price_observations` is the upsert key — it's what makes re-running ingest
  on data the API has already served idempotent (`ON CONFLICT DO NOTHING`, or
  `DO UPDATE` if prices are ever revised after publication).
- `variety` and `grade` are kept as their own columns rather than collapsed,
  because the same market can report multiple variety/grade combinations for
  the same commodity on the same day (e.g. Tur FAQ and Tur Non-FAQ), each with
  its own modal price.
- Nothing references `arrival_date` across tables — it's a plain column, not a
  foreign key — because the Agmarknet API's `filters[arrival_date]` parameter
  is silently ignored server-side (confirmed via the resource's own
  `field_exposed` metadata, see `agmarknet-mandi-price-api-reference.md`).
  Historical range queries are only possible by filtering the *archive* on this
  column, never by re-querying the live API for a past date.

## Data-flow scenarios

- **Daily ingest:** pull today's live snapshot → look up/insert `markets` and
  `commodities` rows → upsert into `price_observations` keyed on
  `(market_id, commodity_id, variety, grade, arrival_date)`.
- **"Today only" dashboard view (window = 1):** `SELECT ... FROM price_observations
  WHERE arrival_date = today` — no carry-forward, matches whatever markets
  actually reported today.
- **"Last N days" carry-forward (window = 2–5):** for each `commodity_id`, take
  `DISTINCT market_id` ever seen for that commodity, `LEFT JOIN` each to its
  most recent `price_observations` row where `arrival_date >= today - N + 1` —
  markets with a hit get tagged `fresh`/`stale` by whether that date is today;
  markets with no hit in the window become `missing` placeholders.
- **New market appears with no location:** ingest inserts it into `markets`
  with `lat`/`lon = NULL` → it surfaces in the UI as needing geocoding →
  `PATCH /markets/{id}` from the location-editor UI fills in `lat`/`lon`/`geocoded_by`.
- **Trend dashboard for one market:** `SELECT arrival_date, modal_price FROM
  price_observations WHERE market_id = X AND commodity_id = Y ORDER BY arrival_date`
  — a straight time series straight off the archive, no live API call involved.
