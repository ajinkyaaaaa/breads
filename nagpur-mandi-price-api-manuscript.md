# Nagpur Mandi Commodity Price Lookup Tool
### Design Notes & Data Source Rationale

---

## 1. Purpose

To build a reliable, queryable price-lookup tool for vegetable and agricultural commodity prices across the wholesale markets (mandis / APMCs) of Nagpur district, Maharashtra.

## 2. Background: The Mandi System

Every district in India has one or more **APMCs (Agricultural Produce Market Committees)** — regulated wholesale markets, commonly called *mandis*, where farmers and traders bring produce for centralized auction-based price discovery.

**Mandis in scope (Nagpur district):**

Kalamna, Kamptee, Katol, Saoner, Umred, Ramtek, Narkhed, Bhiwapur, Hingna, Mauda, and Mandhal.

- **Kalamna** is the district's primary hub — a large APMC campus and one of the original pilot markets for **eNAM** (National Agriculture Market), meaning gate entry, lot creation, bidding, and auction are conducted digitally.
- **Katol** is a major centre for orange trading.
- **Mandhal** (Kuhi taluka) is known for chilli and draws traders from neighbouring states.

## 3. Data Source Decision

Two candidate sources were evaluated:

| Option | Description | Verdict |
|---|---|---|
| MSAMB internal endpoint | Undocumented AJAX call behind msamb.com's price page | Rejected — no formal API, could break without notice, Marathi-only labels |
| **data.gov.in API** | Official Open Government Data platform, sourced from Agmarknet | **Selected** — documented, free API key, English JSON output |

The data.gov.in dataset ("Current Daily Price of Various Commodities from Various Markets") is generated from the **AGMARKNET portal**, maintained by the Directorate of Marketing and Inspection (DMI), Ministry of Agriculture and Farmers Welfare. It is queryable by state, district, market, and commodity.

## 4. Data Reliability

**Pipeline:** Mandi staff record daily arrivals and prices (min, max, modal) directly into the Agmarknet portal; entries are reviewed by officials before publication. Over 2 million price records are processed monthly across India, making this the same dataset used by academic research bodies (e.g., Ashoka University's CEDA).

**Known limitations:**
- Reporting discipline varies by state and mandi — smaller or less digitized mandis occasionally miss days of reporting (documented cases include entire state marketing boards being flagged by the Ministry for non-reporting).
- Maharashtra is a comparatively strong-reporting state; Kalamna (an eNAM mandi) reports consistently.
- Smaller taluka mandis (e.g., Bhiwapur, Hingna) may have gaps or manual-entry inconsistencies.
- Min/max prices can be skewed by single outlier lots.

**Design implication:** Use **modal price** as the core value — it represents the most commonly traded rate for the day and is far less sensitive to outliers than min or max.

## 5. Data Granularity: Daily vs. Intra-day

| | Daily Granularity (Agmarknet / data.gov.in) | Intra-day Tick Data (eNAM) |
|---|---|---|
| What it is | One summary record per mandi, per commodity, per day (min/max/modal + arrival volume) | Individual lot-level auction transactions as they happen |
| Analogy | A match scorecard after the game | Ball-by-ball live commentary |
| Availability | Uploaded after market close (evening / next morning) | Real-time, available at eNAM-integrated mandis (e.g., Kalamna) |
| Fit for this tool | **Yes — this is the right model for a price-lookup tool** | Not needed now; relevant only for a future live-auction tracker |

**Operational rule:** Since uploads happen after market close, the tool should treat the **latest available date's record as "today's price"** and gracefully fall back to the most recent prior date if a given day's data is missing for a mandi.

## 6. Data Model Summary

- **Granularity:** One record per mandi, per commodity, per day
- **Core field:** Modal price
- **Supplementary fields:** Min price, max price, arrival quantity (for context, not primary display)
- **Fallback logic:** If today's record is absent, show the most recent available date and label it accordingly

## 7. Access Method

```
GET https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
    ?api-key=YOUR_KEY
    &format=json
    &filters[state]=Maharashtra
    &filters[district]=Nagpur
    &filters[commodity]=Tomato
```

Requires a free, registered API key from data.gov.in.

## 8. Reference Sources Consulted

- Agmarknet — agmarknet.gov.in (primary data origin)
- eNAM — enam.gov.in (intra-day / auction data, eNAM-integrated mandis)
- MSAMB — msamb.com/ApmcDetail/APMCPriceInformation (state board portal, evaluated and set aside)
- data.gov.in — Open Government Data Platform (selected API source)
- CEDA, Ashoka University — independent research portal built on the same underlying dataset

---
*Compiled from project discussion — Nagpur Mandi Price Lookup Tool.*
