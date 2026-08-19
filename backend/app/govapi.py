import os
from datetime import date, datetime

import requests

BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

# data.gov.in silently drops requests with Python's default User-Agent
# (connection hangs until read-timeout, no error response). A browser-like
# UA is required on every call. See backend/documentation/postgres-schema.md
# and project memory for how this was diagnosed.
_HEADERS = {"User-Agent": "Mozilla/5.0"}


def fetch_all_records(state: str = "Maharashtra", page_size: int = 200) -> list[dict]:
    """Fetch every record for a state, paginating via offset/limit.

    Note: filters[arrival_date] is documented but not actually supported by
    this resource (confirmed via its own field_exposed metadata) -- every
    call returns whatever the latest snapshot is, regardless of date filter.
    So there is no way to request a specific past date; only "today" exists
    from the live API's point of view.
    """
    api_key = os.environ["GOV_API_KEY"]
    records: list[dict] = []
    offset = 0

    while True:
        params = {
            "api-key": api_key,
            "format": "json",
            "limit": page_size,
            "offset": offset,
            "filters[state]": state,
        }
        response = requests.get(BASE_URL, params=params, headers=_HEADERS, timeout=30)
        response.raise_for_status()
        payload = response.json()

        batch = payload.get("records", [])
        records.extend(batch)

        total = int(payload.get("total", len(records)))
        offset += page_size
        if offset >= total or not batch:
            break

    return records


def parse_arrival_date(raw: str) -> date:
    return datetime.strptime(raw, "%d/%m/%Y").date()
