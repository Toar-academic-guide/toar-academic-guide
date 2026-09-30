'use client';

import {
  HAIFA_INFORMATION_SYSTEMS_TRACKS,
  getHaifaInformationSystemsTrack,
} from '@/lib/haifaAdmissionsInputs';

export default function HaifaInformationSystemsTrackFields(props: {
  track: string;
  partnerRequirements: string;
  onTrackChange: (value: string) => void;
  onPartnerChange: (value: string) => void;
  disabled?: boolean;
  inputClassName: string;
}) {
  const selected = getHaifaInformationSystemsTrack(props.track);
  return (
    <div className="col-span-full flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="haifaInformationSystemsTrack"
          className="text-xs font-medium text-slate-600"
        >
          מסלול מערכות מידע בחיפה
        </label>
        <select
          id="haifaInformationSystemsTrack"
          value={props.track}
          onChange={(event) => props.onTrackChange(event.target.value)}
          disabled={props.disabled}
          className={props.inputClassName}
        >
          <option value="">בחרו מסלול</option>
          {HAIFA_INFORMATION_SYSTEMS_TRACKS.map((track) => (
            <option key={track.value} value={track.value}>
              {track.label}
            </option>
          ))}
          <option value="single_major">חד־חוגי רגיל — המיפוי טרם אומת</option>
        </select>
      </div>
      {props.track === 'single_major' && (
        <p className="text-sm text-slate-600">
          המיפוי של המסלול החד־חוגי הרגיל למחשבון הרשמי טרם אומת. לא ניתן לחשב עבורו זכאות בשלב זה.
        </p>
      )}
      {selected?.partnerRequired && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="haifaInformationSystemsPartnerRequirementsConfirmed"
            className="text-xs font-medium text-slate-600"
          >
            האם אתם עומדים בתנאי הקבלה של החוג השני?
          </label>
          <select
            id="haifaInformationSystemsPartnerRequirementsConfirmed"
            value={props.partnerRequirements}
            onChange={(event) => props.onPartnerChange(event.target.value)}
            disabled={props.disabled}
            className={props.inputClassName}
          >
            <option value="">טרם בדקתי</option>
            <option value="true">כן, בדקתי ואני עומד/ת בתנאים</option>
            <option value="false">לא</option>
          </select>
          <p className="text-xs text-slate-500">
            החישוב כאן בודק את צד מערכות המידע. במסלול דו־חוגי נדרשת עמידה גם בתנאי החוג השני, לפי
            הבדיקה שלכם.
          </p>
        </div>
      )}
    </div>
  );
}
