import os
from datetime import date

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .db import get_connection
from .ingest import run_ingest
from .resolve import MAX_WINDOW_DAYS, _normalize_units, resolve_all_prices, resolve_commodity_prices

app = FastAPI(title="Mandi Price API")

# Local dev origin always allowed; the deployed frontend's origin is added via
# an env var so a URL change (e.g. a new Railway domain) doesn't need a code change.
_extra_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", *_extra_origins],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/commodities")
def list_commodities():
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.id, c.name, c.name_hi, c.default_lot_quintals,
                   count(DISTINCT po.market_id) AS market_count
            FROM commodities c
            JOIN price_observations po ON po.commodity_id = c.id
            GROUP BY c.id
            ORDER BY market_count DESC, c.name
            """
        )
        return cur.fetchall()


@app.get("/api/markets")
def list_markets(needs_geocoding: bool | None = None):
    query = "SELECT id, district, market_name, display_name, lat, lon, first_seen_date, last_seen_date FROM markets"
    params: dict = {}
    if needs_geocoding is not None:
        query += " WHERE lat IS NULL" if needs_geocoding else " WHERE lat IS NOT NULL"
    query += " ORDER BY district, market_name"

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()


class MarketLocationUpdate(BaseModel):
    lat: float
    lon: float
    display_name: str | None = None
    geocoded_by: str = "ui_editor"


@app.patch("/api/markets/{market_id}")
def update_market_location(market_id: int, update: MarketLocationUpdate):
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE markets
            SET lat = %s, lon = %s,
                display_name = COALESCE(%s, display_name),
                geocoded_at = now(), geocoded_by = %s
            WHERE id = %s
            RETURNING id, district, market_name, display_name, lat, lon
            """,
            (update.lat, update.lon, update.display_name, update.geocoded_by, market_id),
        )
        row = cur.fetchone()
        conn.commit()

    if not row:
        raise HTTPException(status_code=404, detail="Market not found")
    return row


@app.get("/api/prices")
def get_prices(commodity_id: int, window_days: int = 1, as_of: date | None = None):
    if window_days < 1 or window_days > MAX_WINDOW_DAYS:
        raise HTTPException(status_code=400, detail=f"window_days must be between 1 and {MAX_WINDOW_DAYS}")

    rows = resolve_commodity_prices(commodity_id, window_days=window_days, as_of=as_of)
    return {
        "commodity_id": commodity_id,
        "window_days": window_days,
        "as_of": (as_of or date.today()).isoformat(),
        "prices": rows,
    }


@app.get("/api/prices/all")
def get_all_prices(window_days: int = 1, as_of: date | None = None):
    if window_days < 1 or window_days > MAX_WINDOW_DAYS:
        raise HTTPException(status_code=400, detail=f"window_days must be between 1 and {MAX_WINDOW_DAYS}")

    grouped = resolve_all_prices(window_days=window_days, as_of=as_of)
    return {
        "window_days": window_days,
        "as_of": (as_of or date.today()).isoformat(),
        "prices_by_commodity": grouped,
    }


@app.get("/api/prices/history")
def get_price_history(commodity_id: int, days: int = 30):
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT po.market_id, m.district, m.market_name, po.variety, po.grade,
                   po.arrival_date, po.min_price, po.max_price, po.modal_price
            FROM price_observations po
            JOIN markets m ON m.id = po.market_id
            WHERE po.commodity_id = %s
              AND po.arrival_date >= CURRENT_DATE - (%s || ' days')::interval
            ORDER BY po.arrival_date
            """,
            (commodity_id, days),
        )
        rows = cur.fetchall()

    by_date: dict = {}
    for row in rows:
        by_date.setdefault(row["arrival_date"], []).append(row)
    for day_rows in by_date.values():
        _normalize_units(day_rows)

    return rows


@app.get("/api/dates")
def list_archive_dates():
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT DISTINCT arrival_date FROM price_observations ORDER BY arrival_date")
        return [row["arrival_date"] for row in cur.fetchall()]


@app.get("/api/sync-status")
def get_sync_status():
    """Newest arrival_date the archive has, and the real wall-clock time of the
    most recent ingest write -- lets the frontend tell "showing an older day
    because that's genuinely the latest the source has published" apart from
    "just hasn't resynced in a while"."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT MAX(arrival_date) AS latest_arrival_date, MAX(ingested_at) AS last_synced_at FROM price_observations")
        row = cur.fetchone()
    return {
        "latest_arrival_date": row["latest_arrival_date"].isoformat() if row["latest_arrival_date"] else None,
        "last_synced_at": row["last_synced_at"].isoformat() if row["last_synced_at"] else None,
    }


@app.post("/api/ingest")
def trigger_ingest():
    return run_ingest()
