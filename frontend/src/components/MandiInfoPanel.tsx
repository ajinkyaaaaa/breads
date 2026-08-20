import { useEffect, useState } from 'react';
import type { CommoditySpreadRow } from '../lib/analytics';
import { createContact, deleteContact, fetchContacts, updateContact, type ApiContact, type ContactInput } from '../lib/api';
import { formatKm } from '../lib/format';
import type { Mandi } from '../data/types';
import { Icon } from './Icon';
import { MandiMap, type RouteInfo } from './MandiMap';

interface MandiInfoPanelProps {
  row: CommoditySpreadRow;
  tierIndex: number;
}

const EMPTY_DRAFT: ContactInput = { name: '', role: '', phone: '', email: '', notes: '' };

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function MandiInfoPanel({ row, tierIndex }: MandiInfoPanelProps) {
  const tier = row.tiers[Math.min(tierIndex, row.tiers.length - 1)];
  const pointA = tier.buy.mandi;
  const pointB = tier.sell.mandi;
  const hasA = pointA.lat !== null && pointA.lon !== null;
  const hasB = pointB.lat !== null && pointB.lon !== null;
  const showMap = hasA || hasB;

  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex min-h-[200px] flex-1 flex-col border-b border-wheat/10">
        <div className="flex items-center justify-between px-6 pb-1 pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">Mandi Locations</div>
          <div className="flex items-center gap-3 text-[10px] font-medium">
            <span className={hasA ? 'text-white' : 'text-dim'}>Point A {hasA ? '· mapped' : '· not available'}</span>
            <span className={hasB ? 'text-sage' : 'text-dim'}>Point B {hasB ? '· mapped' : '· not available'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 pb-2 text-[11px] text-dim">
          {routeInfo ? (
            <>
              <span className="flex items-center gap-1">
                <Icon name="local_shipping" size={12} />
                {formatKm(routeInfo.distanceKm)}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="schedule" size={12} />
                {formatDuration(routeInfo.durationMin)}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="payments" size={12} />
                Tolls: not available
              </span>
            </>
          ) : (
            hasA &&
            hasB && <span className="flex items-center gap-1 text-dim">Routing…</span>
          )}
        </div>
        <div className="relative flex-1 overflow-hidden">
          {showMap ? (
            <MandiMap pointA={pointA} pointB={pointB} onRouteChange={setRouteInfo} />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-dim">
              <Icon name="map" size={16} />
              Not available — neither mandi is geocoded yet.
            </div>
          )}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 divide-x divide-wheat/10 overflow-y-auto py-4">
        <div className="pl-6 pr-4">
          <ContactsBlock point="A" mandi={pointA} onNotify={setToast} />
        </div>
        <div className="pl-4 pr-6">
          <ContactsBlock point="B" mandi={pointB} onNotify={setToast} />
        </div>
      </div>

      {toast && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-sm border border-sage/40 bg-sage-dim px-3 py-1.5 text-[11px] font-medium text-sage shadow-lg">
          <Icon name="check" size={12} />
          {toast}
        </div>
      )}
    </div>
  );
}

interface ContactsBlockProps {
  point: 'A' | 'B';
  mandi: Mandi;
  onNotify: (message: string) => void;
}

function ContactsBlock({ point, mandi, onNotify }: ContactsBlockProps) {
  const marketId = Number(mandi.code);
  const [contacts, setContacts] = useState<ApiContact[] | null>(null);
  const [formMode, setFormMode] = useState<'closed' | 'add' | number>('closed');
  const [draft, setDraft] = useState<ContactInput>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setContacts(null);
    setFormMode('closed');
    setError(null);
    setConfirmDeleteId(null);
    fetchContacts(marketId)
      .then(setContacts)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load contacts'));
  }, [marketId]);

  // Auto-revert the delete confirm state so an unrelated click a while later
  // doesn't land on an armed "confirm delete" button by surprise.
  useEffect(() => {
    if (confirmDeleteId === null) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  function openAdd() {
    setDraft(EMPTY_DRAFT);
    setError(null);
    setFormMode('add');
  }

  function openEdit(c: ApiContact) {
    setDraft({ name: c.name, role: c.role ?? '', phone: c.phone ?? '', email: c.email ?? '', notes: c.notes ?? '' });
    setError(null);
    setFormMode(c.id);
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      setError('Name is required');
      return;
    }
    setError(null);
    setSaving(true);
    const body: ContactInput = {
      name: draft.name.trim(),
      role: draft.role?.trim() || undefined,
      phone: draft.phone?.trim() || undefined,
      email: draft.email?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
    };
    try {
      if (formMode === 'add') {
        const created = await createContact(marketId, body);
        setContacts((prev) => [...(prev ?? []), created]);
        onNotify(`Contact added — ${created.name}`);
      } else if (typeof formMode === 'number') {
        const updated = await updateContact(formMode, body);
        setContacts((prev) => (prev ?? []).map((c) => (c.id === updated.id ? updated : c)));
        onNotify(`Contact updated — ${updated.name}`);
      }
      setFormMode('closed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: ApiContact) {
    if (confirmDeleteId !== c.id) {
      setConfirmDeleteId(c.id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await deleteContact(c.id);
      setContacts((prev) => (prev ?? []).filter((x) => x.id !== c.id));
      onNotify(`Contact deleted — ${c.name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete contact');
    }
  }

  const accentText = point === 'A' ? 'text-white' : 'text-sage';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={`flex min-w-0 items-center gap-1.5 truncate text-[12px] font-semibold ${accentText}`}>
          <Icon name="location_on" size={13} />
          <span className="truncate">{mandi.name}</span>
        </div>
        <div className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-dim">Point {point}</div>
      </div>

      {error && <div className="mb-2 rounded-sm border border-rust/30 bg-rust-dim px-2.5 py-1.5 text-[11px] text-rust">{error}</div>}

      {contacts === null ? (
        <div className="py-3 text-[12px] text-dim">Loading…</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {contacts.length === 0 && formMode !== 'add' && (
            <div className="flex flex-col items-start gap-2 rounded-sm border border-dashed border-wheat/15 px-3 py-3 text-[12px] text-dim">
              <span className="flex items-center gap-1.5">
                <Icon name="person" size={14} />
                No contacts yet for this mandi.
              </span>
              <button
                onClick={openAdd}
                className="flex shrink-0 items-center gap-1 font-medium text-amber transition-colors duration-150 hover:text-wheat"
              >
                <Icon name="add" size={13} />
                Add contact
              </button>
            </div>
          )}

          {contacts.map((c) =>
            formMode === c.id ? (
              <ContactForm
                key={c.id}
                draft={draft}
                onChange={setDraft}
                onSave={handleSave}
                onCancel={() => setFormMode('closed')}
                saving={saving}
              />
            ) : (
              <div key={c.id} className="flex items-start justify-between gap-2 rounded-sm border border-wheat/10 bg-surface px-3 py-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface2 text-dim">
                    <Icon name="person" size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="truncate text-[12px] font-medium text-wheat">{c.name}</span>
                      {c.role && <span className="truncate text-[10px] text-dim">· {c.role}</span>}
                    </div>
                    <div className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-dim">
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 font-mono transition-colors duration-150 hover:text-wheat">
                          <Icon name="call" size={11} />
                          {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="flex items-center gap-1 truncate font-mono transition-colors duration-150 hover:text-wheat"
                        >
                          <Icon name="mail" size={11} />
                          <span className="truncate">{c.email}</span>
                        </a>
                      )}
                      {!c.phone && !c.email && <span>No phone or email on file</span>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => openEdit(c)} title="Edit" className="rounded-sm p-1 text-dim transition-colors duration-150 hover:text-amber">
                    <Icon name="edit" size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    title={confirmDeleteId === c.id ? 'Click again to confirm' : 'Delete'}
                    className={`rounded-sm px-1.5 py-1 text-[10px] font-medium transition-colors duration-150 ${
                      confirmDeleteId === c.id ? 'bg-rust text-wheat' : 'text-dim hover:text-rust'
                    }`}
                  >
                    {confirmDeleteId === c.id ? 'Confirm?' : <Icon name="delete" size={13} />}
                  </button>
                </div>
              </div>
            ),
          )}

          {formMode === 'add' && (
            <ContactForm draft={draft} onChange={setDraft} onSave={handleSave} onCancel={() => setFormMode('closed')} saving={saving} />
          )}

          {contacts.length > 0 && formMode === 'closed' && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1 self-start rounded-sm px-1 py-1 text-[11px] font-medium text-amber transition-colors duration-150 hover:text-wheat"
            >
              <Icon name="add" size={13} />
              Add contact
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface ContactFormProps {
  draft: ContactInput;
  onChange: (draft: ContactInput) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function ContactForm({ draft, onChange, onSave, onCancel, saving }: ContactFormProps) {
  return (
    <div className="rounded-sm border border-amber/30 bg-surface px-3 py-2.5">
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Name"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          className="min-w-[120px] flex-1 rounded-sm border border-wheat/10 bg-ink px-2 py-1 text-[12px] text-wheat outline-none focus:border-amber"
        />
        <input
          placeholder="Role (optional)"
          value={draft.role ?? ''}
          onChange={(e) => onChange({ ...draft, role: e.target.value })}
          className="min-w-[120px] flex-1 rounded-sm border border-wheat/10 bg-ink px-2 py-1 text-[12px] text-wheat outline-none focus:border-amber"
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <input
          placeholder="Phone (optional)"
          value={draft.phone ?? ''}
          onChange={(e) => onChange({ ...draft, phone: e.target.value })}
          className="min-w-[110px] flex-1 rounded-sm border border-wheat/10 bg-ink px-2 py-1 font-mono text-[12px] text-wheat outline-none focus:border-amber"
        />
        <input
          placeholder="Email (optional)"
          value={draft.email ?? ''}
          onChange={(e) => onChange({ ...draft, email: e.target.value })}
          className="min-w-[140px] flex-1 rounded-sm border border-wheat/10 bg-ink px-2 py-1 text-[12px] text-wheat outline-none focus:border-amber"
        />
      </div>
      <div className="mt-1.5">
        <input
          placeholder="Notes (optional)"
          value={draft.notes ?? ''}
          onChange={(e) => onChange({ ...draft, notes: e.target.value })}
          className="w-full rounded-sm border border-wheat/10 bg-ink px-2 py-1 text-[12px] text-wheat outline-none focus:border-amber"
        />
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        <button onClick={onCancel} className="rounded-sm px-2.5 py-1 text-[11px] font-medium text-dim transition-colors duration-150 hover:text-wheat">
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !draft.name.trim()}
          className="rounded-sm bg-amber px-3 py-1 text-[11px] font-semibold text-ink transition-opacity duration-150 disabled:opacity-30"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
