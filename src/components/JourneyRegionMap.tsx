'use client';

import { useId, useState } from 'react';
import { journeyGeography } from '@/data/journeyGeography';
import { LOCATIONS, type JourneyLocation } from '@/lib/studyJourney';

const REGION_IDS: Record<string, JourneyLocation> = {
  צפון: 'north',
  מרכז: 'center',
  ירושלים: 'jerusalem',
  דרום: 'south',
};
export default function JourneyRegionMap({
  selected,
  counts,
  onSelect,
}: {
  selected: JourneyLocation[];
  counts: Partial<Record<JourneyLocation, number>>;
  onSelect: (region: JourneyLocation) => void;
}) {
  const [hint, setHint] = useState<JourneyLocation | null>(null);
  const tooltipId = useId();
  return (
    <div className="journey-map" onMouseLeave={() => setHint(null)}>
      <svg viewBox="-40 0 300 420" role="group" aria-label="בחירת אזור לימודים על המפה">
        {journeyGeography.map(({ id, d, region }) => {
          const area = region ? REGION_IDS[region] : undefined;
          if (!area) return <path key={id} d={d} className="map-context" aria-hidden="true" />;
          const active = selected.includes('all') || selected.includes(area);
          return (
            <path
              key={id}
              d={d}
              role="button"
              tabIndex={0}
              aria-label={`בחירת ${LOCATIONS[area]} במפה`}
              aria-pressed={active}
              aria-describedby={hint === area ? tooltipId : undefined}
              className={hint === area ? 'map-hover' : ''}
              onMouseEnter={() => setHint(area)}
              onFocus={() => setHint(area)}
              onBlur={() => setHint(null)}
              onClick={() => {
                setHint(area);
                onSelect(area);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setHint(area);
                  onSelect(area);
                } else if (event.key === 'Escape') setHint(null);
              }}
            />
          );
        })}
      </svg>
      {hint && (
        <div id={tooltipId} role="tooltip" className={`journey-map-hint hint-${hint}`}>
          {LOCATIONS[hint]} · {counts[hint] ?? 0} מוסדות
        </div>
      )}
    </div>
  );
}
