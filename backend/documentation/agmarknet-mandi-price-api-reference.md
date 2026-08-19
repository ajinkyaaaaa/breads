# Agmarknet Mandi Price API — Reference

**Base URL:**
```
https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
```

**Source:** data.gov.in / Agmarknet (Ministry of Agriculture and Farmers Welfare, DMI)
**Dataset:** Current Daily Price of Various Commodities from Various Markets (Mandi)
**Coverage:** All India, updated daily
**Auth:** Requires free `api-key` from data.gov.in

---

## API Control Parameters

| Param | Required | Example | Notes |
|---|---|---|---|
| `api-key` | Yes | `abcd1234...` | Your personal key from data.gov.in → My Info |
| `format` | Yes | `json` | Also supports `xml` |
| `limit` | No | `50` | Max records per call; increase if `total` exceeds default |
| `offset` | No | `0` | Use for pagination when `total` > `limit` |

---

## Filterable Data Fields

| Field | Type | Example Value | Notes |
|---|---|---|---|
| `filters[state]` | keyword | `Maharashtra` | |
| `filters[district]` | keyword | `Nagpur` | |
| `filters[market]` | keyword | `Nagpur APMC` | **Not the same as taluka names** — see note below |
| `filters[commodity]` | keyword | `Tomato` | |
| `filters[variety]` | keyword | `Local` | |
| `filters[grade]` | keyword | `FAQ` / `Non-FAQ` / `Local` | |
| `filters[arrival_date]` | date | `17/08/2026` | Format is `DD/MM/YYYY`, not ISO |

---

## Output-Only Fields (not filterable)

| Field | Type | Description |
|---|---|---|
| `min_price` | double | Lowest recorded price for the day |
| `max_price` | double | Highest recorded price for the day |
| `modal_price` | double | Most-traded price — **use this as the primary value** |

---

## Important Notes

- **`market` field ≠ your mandi/taluka list.** The dataset groups by APMC name (e.g. "Nagpur APMC," "Kalmeshwar APMC"), not by individual sub-market names like Kalamna, Katol, Kamptee. Build a mapping table by first querying without a `market` filter and collecting the distinct values actually returned.
- **Reporting gaps are normal.** Not every mandi reports every day — expect fewer markets in results than your full target list on any given date.
- **No true intraday data exists here.** This is one record per market per commodity per day. For intraday, no reliable public API exists (see notes on eNAM).
- **`arrival_date` format is `DD/MM/YYYY`** — parse accordingly, don't assume ISO 8601.

---

## Example Request

```
https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=YOUR_KEY&format=json&limit=50&filters[state]=Maharashtra&filters[district]=Nagpur&filters[commodity]=Tomato
```