import { useEffect, useState } from 'react';
import type { CommoditySpreadRow } from '../lib/analytics';
import { formatKm } from '../lib/format';
import { Icon } from './Icon';
import { MandiMap, type RouteInfo } from './MandiMap';
import { ContactsBlock } from './ContactsBlock';

interface MandiInfoPanelProps {
  row: CommoditySpreadRow;
  tierIndex: number;
}

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
            <span className={hasA ? 'text-wheat' : 'text-dim'}>Point A {hasA ? '· mapped' : '· not available'}</span>
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
