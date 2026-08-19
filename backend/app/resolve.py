"""LOCF-with-staleness resolver: given a commodity and a trailing window of
N days, return one row per market that has ever reported that commodity --
tagged fresh (reported today), stale (carried forward from within the
window, with its real date), or missing (nothing in-window at all).

Runs entirely against the Postgres archive -- never calls the live API.
"""

import math
import statistics
from datetime import date, timedelta

from .db import get_connection

MAX_WINDOW_DAYS = 5

# The Agmarknet feed has no unit field -- every price is implicitly Rs/quintal.
# In practice some markets clearly mis-enter a price in Rs/kg instead (quintal
# = 100kg, so this shows up as a price ~100x smaller than every other market
# reporting the same commodity that day). Rather than silently dropping these
# rows or leaving a 100x bogus spread in the UI, detect the mismatch against
# the peer group and expose both the raw entry and a quintal-normalized
# value, so the frontend can compute on the corrected number while still
# showing the user what was actually reported.
#
# A single reference median isn't robust when a large minority (not just one
# or two markets) share the same kg/quintal mixup -- that drags the median
# into a dead zone between the two real clusters. So this runs two passes:
# pass 1 classifies against the raw median, pass 2 rebuilds the reference
# from pass 1's normalized values (now dominated by one coherent quintal-scale
# cluster) and reclassifies against that -- which converges correctly even
# when half the reporting markets got the unit wrong.
#
# Peer-relative comparison still fails when the *majority* of reporters share
# the mixup (e.g. 3 of 4 Pune-area markets all mis-enter Rs/kg) -- the wrong
# cluster then looks locally "normal" and the one correct market looks like
# the outlier instead. So this is backstopped by an absolute floor: across
# the whole archive, observed modal prices are either <=20 (a hard cluster of
# obvious per-kg entries) or >=300 -- nothing in between -- so any price under
# Rs 100/quintal is treated as certainly mis-entered regardless of what peers
# in the same request happen to say.
_MIN_LOG10_DEVIATION_TO_SUSPECT = 1.0  # price must be >=10x off the reference before we even consider it
_ABSOLUTE_KG_CEILING = 100  # no real Rs/quintal price in this dataset goes below ~300


def _classify_kg(rows: list[dict], reference_median: float) -> list[bool]:
    flags = []
    for r in rows:
        price = r["modal_price"]
        if price is None or price <= 0:
            flags.append(False)
            continue
        if price < _ABSOLUTE_KG_CEILING:
            flags.append(True)
            continue
        if reference_median <= 0:
            flags.append(False)
            continue
        raw_dist = abs(math.log10(price / reference_median))
        scaled_dist = abs(math.log10((price * 100) / reference_median))
        flags.append(raw_dist >= _MIN_LOG10_DEVIATION_TO_SUSPECT and scaled_dist < raw_dist)
    return flags


def _normalize_units(rows: list[dict]) -> list[dict]:
    def _plain(r: dict) -> dict:
        r["unit"] = "quintal"
        r["modal_price_normalized"] = r["modal_price"]
        r["min_price_normalized"] = r["min_price"]
        r["max_price_normalized"] = r["max_price"]
        return r

    modals = [r["modal_price"] for r in rows if r["modal_price"] is not None and r["modal_price"] > 0]
    if not modals:
        return [_plain(r) for r in rows]

    # Below _MIN_PEERS_FOR_UNIT_CHECK there isn't enough of a peer group for
    # the relative (median-based) pass to mean anything, but the absolute
    # floor inside _classify_kg still applies regardless of peer count.
    pass1_median = statistics.median(modals)
    pass1_flags = _classify_kg(rows, pass1_median)

    normalized_modals = [
        (r["modal_price"] * 100 if is_kg else r["modal_price"])
        for r, is_kg in zip(rows, pass1_flags)
        if r["modal_price"] is not None and r["modal_price"] > 0
    ]
    pass2_median = statistics.median(normalized_modals) if normalized_modals else pass1_median
    pass2_flags = _classify_kg(rows, pass2_median)

    for r, is_kg in zip(rows, pass2_flags):
        if r["modal_price"] is None:
            _plain(r)
            continue
        if is_kg:
            r["unit"] = "kg"
            r["modal_price_normalized"] = r["modal_price"] * 100
            r["min_price_normalized"] = r["min_price"] * 100 if r["min_price"] is not None else None
            r["max_price_normalized"] = r["max_price"] * 100 if r["max_price"] is not None else None
        else:
            _plain(r)

    return rows


def resolve_commodity_prices(commodity_id: int, window_days: int = 1, as_of: date | None = None) -> list[dict]:
    window_days = max(1, min(window_days, MAX_WINDOW_DAYS))
    as_of = as_of or date.today()
    window_start = as_of - timedelta(days=window_days - 1)

    query = """
        WITH watchlist AS (
            SELECT DISTINCT market_id
            FROM price_observations
            WHERE commodity_id = %(commodity_id)s
        ),
        latest_in_window AS (
            SELECT DISTINCT ON (po.market_id, po.variety, po.grade)
                po.market_id,
                po.variety,
                po.grade,
                po.arrival_date,
                po.min_price,
                po.max_price,
                po.modal_price
            FROM price_observations po
            WHERE po.commodity_id = %(commodity_id)s
              AND po.arrival_date BETWEEN %(window_start)s AND %(as_of)s
            ORDER BY po.market_id, po.variety, po.grade, po.arrival_date DESC
        )
        SELECT
            w.market_id,
            m.district,
            m.market_name,
            m.lat,
            m.lon,
            l.variety,
            l.grade,
            l.arrival_date AS as_of_date,
            l.min_price,
            l.max_price,
            l.modal_price,
            CASE
                WHEN l.arrival_date IS NULL THEN 'missing'
                WHEN l.arrival_date = %(as_of)s THEN 'fresh'
                ELSE 'stale'
            END AS status
        FROM watchlist w
        JOIN markets m ON m.id = w.market_id
        LEFT JOIN latest_in_window l ON l.market_id = w.market_id
        ORDER BY m.district, m.market_name, l.variety;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                {
                    "commodity_id": commodity_id,
                    "window_start": window_start,
                    "as_of": as_of,
                },
            )
            return _normalize_units(cur.fetchall())


def resolve_all_prices(window_days: int = 1, as_of: date | None = None) -> dict[int, list[dict]]:
    """Same resolution as resolve_commodity_prices, but for every commodity at
    once in a single query -- avoids one API round-trip per commodity when the
    frontend needs the full statewide spread table.
    """
    window_days = max(1, min(window_days, MAX_WINDOW_DAYS))
    as_of = as_of or date.today()
    window_start = as_of - timedelta(days=window_days - 1)

    query = """
        WITH watchlist AS (
            SELECT DISTINCT commodity_id, market_id
            FROM price_observations
        ),
        latest_in_window AS (
            SELECT DISTINCT ON (po.commodity_id, po.market_id, po.variety, po.grade)
                po.commodity_id,
                po.market_id,
                po.variety,
                po.grade,
                po.arrival_date,
                po.min_price,
                po.max_price,
                po.modal_price
            FROM price_observations po
            WHERE po.arrival_date BETWEEN %(window_start)s AND %(as_of)s
            ORDER BY po.commodity_id, po.market_id, po.variety, po.grade, po.arrival_date DESC
        )
        SELECT
            w.commodity_id,
            w.market_id,
            m.district,
            m.market_name,
            m.lat,
            m.lon,
            l.variety,
            l.grade,
            l.arrival_date AS as_of_date,
            l.min_price,
            l.max_price,
            l.modal_price,
            CASE
                WHEN l.arrival_date IS NULL THEN 'missing'
                WHEN l.arrival_date = %(as_of)s THEN 'fresh'
                ELSE 'stale'
            END AS status
        FROM watchlist w
        JOIN markets m ON m.id = w.market_id
        LEFT JOIN latest_in_window l
            ON l.commodity_id = w.commodity_id AND l.market_id = w.market_id
        ORDER BY w.commodity_id, m.district, m.market_name, l.variety;
    """

    grouped: dict[int, list[dict]] = {}
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, {"window_start": window_start, "as_of": as_of})
            for row in cur.fetchall():
                grouped.setdefault(row["commodity_id"], []).append(row)

    for commodity_id, rows in grouped.items():
        grouped[commodity_id] = _normalize_units(rows)

    return grouped
