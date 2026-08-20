import { getToken, notifySessionExpired } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8010';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function checkOk(res: Response, label: string): Promise<void> {
  if (res.status === 401) {
    notifySessionExpired();
    throw new Error('Session expired -- please log in again');
  }
  if (!res.ok) throw new Error(`${label} failed: ${res.status}`);
}

export interface ApiCommodity {
  id: number;
  name: string;
  name_hi: string | null;
  default_lot_quintals: number | null;
  market_count: number;
}

export interface ApiMarket {
  id: number;
  district: string;
  market_name: string;
  display_name: string | null;
  lat: number | null;
  lon: number | null;
  first_seen_date: string;
  last_seen_date: string;
}

export interface ApiPriceRow {
  commodity_id: number;
  market_id: number;
  district: string;
  market_name: string;
  lat: number | null;
  lon: number | null;
  variety: string | null;
  grade: string | null;
  as_of_date: string | null;
  /** Raw as reported by the source -- may be mis-entered as Rs/kg, see `unit`. */
  min_price: number | null;
  max_price: number | null;
  modal_price: number | null;
  status: 'fresh' | 'stale' | 'missing';
  /** Detected unit for the raw price fields above. 'kg' means the raw value looked like a Rs/kg entry mistaken for Rs/quintal -- use the *_normalized fields for any calculation. */
  unit: 'quintal' | 'kg';
  min_price_normalized: number | null;
  max_price_normalized: number | null;
  modal_price_normalized: number | null;
}

export interface ApiHistoryRow {
  market_id: number;
  district: string;
  market_name: string;
  variety: string;
  grade: string;
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  unit: 'quintal' | 'kg';
  min_price_normalized: number;
  max_price_normalized: number;
  modal_price_normalized: number;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  await checkOk(res, `GET ${path}`);
  return res.json();
}

export function fetchCommodities(): Promise<ApiCommodity[]> {
  return getJSON('/api/commodities');
}

export function fetchMarkets(needsGeocoding?: boolean): Promise<ApiMarket[]> {
  const qs = needsGeocoding === undefined ? '' : `?needs_geocoding=${needsGeocoding}`;
  return getJSON(`/api/markets${qs}`);
}

export function fetchAllPrices(
  windowDays: number,
  asOf?: string,
): Promise<{ window_days: number; as_of: string; prices_by_commodity: Record<string, ApiPriceRow[]> }> {
  const params = new URLSearchParams({ window_days: String(windowDays) });
  if (asOf) params.set('as_of', asOf);
  return getJSON(`/api/prices/all?${params}`);
}

export function fetchPriceHistory(commodityId: string, days = 30): Promise<ApiHistoryRow[]> {
  return getJSON(`/api/prices/history?commodity_id=${commodityId}&days=${days}`);
}

export function fetchArchiveDates(): Promise<string[]> {
  return getJSON('/api/dates');
}

export interface SyncStatus {
  latest_arrival_date: string | null;
  /** ISO timestamp of the most recent ingest write, real wall-clock time -- not the same as latest_arrival_date, which is a calendar day. */
  last_synced_at: string | null;
}

export function fetchSyncStatus(): Promise<SyncStatus> {
  return getJSON('/api/sync-status');
}

export interface IngestResult {
  records_fetched: number;
  rows_written: number;
  new_markets: number;
  new_commodities: number;
}

export async function triggerIngest(): Promise<IngestResult> {
  const res = await fetch(`${API_BASE}/api/ingest`, { method: 'POST', headers: authHeaders() });
  await checkOk(res, 'POST /api/ingest');
  return res.json();
}

export async function updateMarketLocation(
  id: number,
  body: { lat: number; lon: number; display_name?: string },
): Promise<ApiMarket> {
  const res = await fetch(`${API_BASE}/api/markets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  await checkOk(res, `PATCH /api/markets/${id}`);
  return res.json();
}

export interface ApiContact {
  id: number;
  market_id: number;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactInput {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export function fetchContacts(marketId: number): Promise<ApiContact[]> {
  return getJSON(`/api/markets/${marketId}/contacts`);
}

export async function createContact(marketId: number, body: ContactInput): Promise<ApiContact> {
  const res = await fetch(`${API_BASE}/api/markets/${marketId}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  await checkOk(res, `POST /api/markets/${marketId}/contacts`);
  return res.json();
}

export async function updateContact(id: number, body: Partial<ContactInput>): Promise<ApiContact> {
  const res = await fetch(`${API_BASE}/api/contacts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  await checkOk(res, `PATCH /api/contacts/${id}`);
  return res.json();
}

export async function deleteContact(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/contacts/${id}`, { method: 'DELETE', headers: authHeaders() });
  await checkOk(res, `DELETE /api/contacts/${id}`);
}
