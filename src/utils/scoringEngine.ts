import type { ProfileDimension, ProfileScores, ValuesProfile } from '@/types';
import type { DimWeights, QuickPickAnswer } from '@/data/testItems';
import {
  QUICK_PICK_SCORES,
  getMultiSelectQuestion,
  getQuickPickItem,
  MIN_ANSWERED_ITEMS,
} from '@/data/testItems';

const ALL_DIMS: ProfileDimension[] = ['AN', 'TE', 'CR', 'SO', 'LE', 'OR', 'DI', 'ER'];

function emptyProfile(): ProfileScores {
  return { AN: 0, TE: 0, CR: 0, SO: 0, LE: 0, OR: 0, DI: 0, ER: 0 };
}

function applyWeights(profile: ProfileScores, weights: DimWeights, multiplier = 1): void {
  for (const [dim, value] of Object.entries(weights) as [ProfileDimension, number][]) {
    profile[dim] += value * multiplier;
  }
}

// ── Answer shapes collected by the assessment component ─────────────────────

export interface MultiSelectAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface QuickPickAnswerEntry {
  itemId: string;
  answer: QuickPickAnswer;
}

export interface ValueSliderAnswer {
  sliderId: string;
  value: number; // -2 to +2
}

export interface AssessmentAnswers {
  multiSelect: MultiSelectAnswer[];
  quickPicks: QuickPickAnswerEntry[];
  valueSliders: ValueSliderAnswer[];
}

// ── Count answered items ────────────────────────────────────────────────────

export function countAnsweredItems(answers: AssessmentAnswers): number {
  const multiSelectCount = answers.multiSelect.filter(
    (a) => a.selectedOptionIds.length > 0
  ).length;
  const quickPickCount = answers.quickPicks.length;
  const sliderCount = answers.valueSliders.length;
  return multiSelectCount + quickPickCount + sliderCount;
}

export function hasEnoughAnswers(answers: AssessmentAnswers): boolean {
  return countAnsweredItems(answers) >= MIN_ANSWERED_ITEMS;
}

// ── Compute profile scores from all sections ────────────────────────────────

export function computeProfileScores(answers: AssessmentAnswers): ProfileScores {
  const raw = emptyProfile();

  for (const msAnswer of answers.multiSelect) {
    const question = getMultiSelectQuestion(msAnswer.questionId);
    if (!question) continue;

    for (const optionId of msAnswer.selectedOptionIds) {
      const option = question.options.find((o) => o.id === optionId);
      if (!option) continue;
      applyWeights(raw, option.weights);
    }
  }

  for (const qpAnswer of answers.quickPicks) {
    const item = getQuickPickItem(qpAnswer.itemId);
    if (!item) continue;
    const score = QUICK_PICK_SCORES[qpAnswer.answer];
    raw[item.dim] += score;
  }

  return normalizeProfile(raw);
}

// ── Normalize to 0–5 scale ──────────────────────────────────────────────────

function normalizeProfile(raw: ProfileScores): ProfileScores {
  const values = ALL_DIMS.map((d) => raw[d]);
  const maxVal = Math.max(...values, 1);

  const normalized = emptyProfile();
  for (const dim of ALL_DIMS) {
    normalized[dim] = Math.max(0, Math.min(5, (raw[dim] / maxVal) * 5));
  }
  return normalized;
}

// ── Compute values profile ──────────────────────────────────────────────────

export function computeValuesProfile(answers: AssessmentAnswers): ValuesProfile {
  const values: ValuesProfile = {
    incomeVsImpact: 0,
    independenceVsTeam: 0,
    growthVsStability: 0,
    prestigeVsMeaning: 0,
  };

  for (const slider of answers.valueSliders) {
    const clamped = Math.max(-2, Math.min(2, slider.value));
    if (slider.sliderId === 'V1') values.incomeVsImpact = clamped;
    else if (slider.sliderId === 'V2') values.independenceVsTeam = clamped;
    else if (slider.sliderId === 'V3') values.growthVsStability = clamped;
    else if (slider.sliderId === 'V4') values.prestigeVsMeaning = clamped;
  }

  return values;
}

// ── Get top dimensions ──────────────────────────────────────────────────────

export function getTopDimensions(
  scores: ProfileScores,
  count = 2
): ProfileDimension[] {
  return (Object.entries(scores) as [ProfileDimension, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([dim]) => dim);
}
