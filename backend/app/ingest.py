"""Daily ingest pipeline: pull the live Agmarknet snapshot and archive it.

Upserts markets/commodities it hasn't seen before, then upserts every price
row into price_observations keyed on
(market_id, commodity_id, variety, grade, arrival_date) -- safe to re-run.
"""

from datetime import date

from psycopg import Connection

from .db import get_connection
from .govapi import fetch_all_records, parse_arrival_date


def _get_or_create_market(conn: Connection, district: str, market_name: str, today: date) -> tuple[int, bool]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM markets WHERE district = %s AND market_name = %s",
            (district, market_name),
        )
        row = cur.fetchone()
        if row:
            cur.execute(
                "UPDATE markets SET last_seen_date = %s WHERE id = %s",
                (today, row["id"]),
            )
            return row["id"], False

        cur.execute(
            """
            INSERT INTO markets (district, market_name, lat, lon, first_seen_date, last_seen_date)
            VALUES (%s, %s, NULL, NULL, %s, %s)
            RETURNING id
            """,
            (district, market_name, today, today),
        )
        return cur.fetchone()["id"], True


def _get_or_create_commodity(conn: Connection, name: str) -> tuple[int, bool]:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM commodities WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            return row["id"], False

        cur.execute(
            "INSERT INTO commodities (name) VALUES (%s) RETURNING id",
            (name,),
        )
        return cur.fetchone()["id"], True


def run_ingest() -> dict:
    today = date.today()
    records = fetch_all_records()

    market_cache: dict[tuple[str, str], int] = {}
    commodity_cache: dict[str, int] = {}
    new_markets = 0
    new_commodities = 0
    rows_written = 0

    with get_connection() as conn:
        for rec in records:
            district = rec["district"]
            market_name = rec["market"]
            commodity_name = rec["commodity"]

            market_key = (district, market_name)
            if market_key not in market_cache:
                market_id, created = _get_or_create_market(conn, district, market_name, today)
                market_cache[market_key] = market_id
                if created:
                    new_markets += 1

            if commodity_name not in commodity_cache:
                commodity_id, created = _get_or_create_commodity(conn, commodity_name)
                commodity_cache[commodity_name] = commodity_id
                if created:
                    new_commodities += 1

            arrival_date = parse_arrival_date(rec["arrival_date"])

            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO price_observations
                        (market_id, commodity_id, variety, grade, arrival_date,
                         min_price, max_price, modal_price, source_snapshot_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (market_id, commodity_id, variety, grade, arrival_date)
                    DO UPDATE SET
                        min_price = EXCLUDED.min_price,
                        max_price = EXCLUDED.max_price,
                        modal_price = EXCLUDED.modal_price,
                        source_snapshot_date = EXCLUDED.source_snapshot_date,
                        ingested_at = now()
                    """,
                    (
                        market_cache[market_key],
                        commodity_cache[commodity_name],
                        rec["variety"],
                        rec["grade"],
                        arrival_date,
                        rec["min_price"],
                        rec["max_price"],
                        rec["modal_price"],
                        today,
                    ),
                )
                rows_written += 1

        conn.commit()

    return {
        "records_fetched": len(records),
        "rows_written": rows_written,
        "new_markets": new_markets,
        "new_commodities": new_commodities,
    }


if __name__ == "__main__":
    print(run_ingest())
