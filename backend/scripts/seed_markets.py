"""One-time import of backend/data/market_locations.json into the markets table.

Run once against a fresh database, before the first ingest run. After this,
market_locations.json is no longer the source of truth -- new markets
discovered by ingest get inserted with lat/lon = NULL and are geocoded via
the location-editor UI (PATCH /markets/{id}) instead.
"""

import json
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import get_connection

SEED_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "market_locations.json"
)


def main():
    with open(SEED_PATH) as f:
        seed = json.load(f)

    today = date.today()
    inserted = 0
    skipped = 0

    with get_connection() as conn:
        with conn.cursor() as cur:
            for key, loc in seed.items():
                if key == "_meta":
                    continue
                district, market_name = key.split("|", 1)

                cur.execute(
                    """
                    INSERT INTO markets (district, market_name, display_name, lat, lon, geocoded_at, geocoded_by, first_seen_date, last_seen_date)
                    VALUES (%s, %s, %s, %s, %s, now(), 'seed_import', %s, %s)
                    ON CONFLICT (district, market_name) DO NOTHING
                    """,
                    (district, market_name, loc["town"], loc["lat"], loc["lon"], today, today),
                )
                if cur.rowcount:
                    inserted += 1
                else:
                    skipped += 1
        conn.commit()

    print(f"Seeded {inserted} markets ({skipped} already existed).")


if __name__ == "__main__":
    main()
