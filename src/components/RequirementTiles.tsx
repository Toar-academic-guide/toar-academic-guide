import Link from 'next/link';
import type { Program } from '@/data/degrees/types';
import { selectRequirementTiles } from '@/lib/requirementTiles';
import { ROUTES } from '@/lib/routes';
import AdmissionRequirements, { RequirementList } from './AdmissionRequirements';

export default function RequirementTiles({
  program,
  institutionId,
  requirements,
  showCalculatorLink = false,
  preserveRequirements = false,
  verificationIssue,
}: {
  program: Program;
  institutionId: string;
  requirements: string[];
  showCalculatorLink?: boolean;
  preserveRequirements?: boolean;
  verificationIssue?: string;
}) {
  const { model } = selectRequirementTiles({
    program,
    institutionId,
    requirements,
    verificationIssue,
  });
  if (!model)
    return (
      <AdmissionRequirements
        programId={program.id}
        institutionId={institutionId}
        requirements={requirements}
      />
    );
  const details = [
    ...new Set(
      preserveRequirements
        ? [...requirements, ...(model.supplementalDetails ?? [])]
        : model.details,
    ),
  ];
  return (
    <div className="mt-3 text-right text-sm text-[#35415b]" dir="rtl">
      <p className="mb-2 text-xs text-[var(--text-muted)]">
        {model.scope ? `${model.scope} · ` : ''}
        {model.semantics === 'alternatives' ? 'מספיק אחד מאלה:' : 'התנאים:'}
      </p>
      {model.status && (
        <p className="-mt-1 mb-2 text-xs text-[var(--text-muted)]">{model.status}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {model.tiles.map((tile, index) => (
          <div
            key={`${tile.label}:${index}`}
            className="min-w-0 basis-full grow rounded-2xl text-center border border-slate-200 px-4 py-3.5 sm:max-w-[220px] sm:basis-[150px]"
          >
            <div
              className={`font-bold text-[#19233d] ${typeof tile.value === 'number' ? 'text-3xl leading-[1.1]' : 'text-[17px] leading-[33px]'}`}
            >
              {tile.value}
            </div>
            <div className="mt-1 text-sm font-semibold text-[#35415b]">{tile.label}</div>
            {tile.qualifiers.map((text) => (
              <div key={text} className="mt-0.5 text-xs text-[var(--text-muted)]">
                {text}
              </div>
            ))}
          </div>
        ))}
      </div>
      {model.chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">חובה בכל דרך:</span>
          {model.chips.map((text) => (
            <span
              key={text}
              className="rounded-full border border-[#c9c2e4] px-3 py-[3px] text-sm text-[#6554b8]"
            >
              {text}
            </span>
          ))}
        </div>
      )}
      {showCalculatorLink && (
        <p className="mt-3.5">
          <Link
            href={ROUTES.calculator}
            className="text-xs text-[var(--text-muted)] underline underline-offset-[3px]"
          >
            התנאים מורכבים? בדקו את הסיכויים שלכם
          </Link>
        </p>
      )}
      <details className="group mt-3 border-t border-[#dce1ee] pt-1">
        <summary className="w-fit cursor-pointer rounded-sm py-2 font-semibold text-[#6554b8] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6554b8]">
          פרטים נוספים
        </summary>
        <div className="pt-1">
          <RequirementList items={details} formulaOverview />
        </div>
      </details>
    </div>
  );
}
