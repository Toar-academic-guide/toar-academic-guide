import type { BagrutSubject } from '@/types';

export interface RouteProfile {
  psychometric: number;
  subjects: BagrutSubject[];
}

export type RouteAction =
  | { id: string; kind: 'psychometric'; from: number; to: number }
  | {
      id: string;
      kind: 'improve_grade';
      subjectId: string;
      fromGrade: number;
      toGrade: number;
    }
  | {
      id: string;
      kind: 'expand_units';
      subjectId: string;
      fromUnits: number;
      toUnits: number;
    }
  | { id: string; kind: 'add_subject'; subjectId: string; units: 5; grade: number };

export function applyRouteAction(profile: RouteProfile, action: RouteAction): RouteProfile | null {
  if (action.kind === 'psychometric') {
    if (
      profile.psychometric !== action.from ||
      action.to <= action.from ||
      action.to > 800 ||
      action.to < 200
    ) {
      return null;
    }
    return { ...profile, psychometric: action.to };
  }

  const subjects = profile.subjects.map((subject) => ({ ...subject }));
  const subjectIndex = subjects.findIndex((subject) => subject.subjectId === action.subjectId);

  if (action.kind === 'add_subject') {
    if (subjectIndex !== -1 || action.units !== 5 || action.grade < 0 || action.grade > 100) {
      return null;
    }
    return {
      ...profile,
      subjects: [
        ...subjects,
        { subjectId: action.subjectId, units: action.units, grade: action.grade },
      ],
    };
  }

  if (subjectIndex === -1) {
    return null;
  }

  const subject = subjects[subjectIndex]!;
  if (action.kind === 'improve_grade') {
    if (
      subject.grade !== action.fromGrade ||
      action.toGrade <= action.fromGrade ||
      action.toGrade > 100
    ) {
      return null;
    }
    subjects[subjectIndex] = { ...subject, grade: action.toGrade };
  }

  if (action.kind === 'expand_units') {
    if (
      subject.units !== action.fromUnits ||
      action.toUnits <= action.fromUnits ||
      action.toUnits > 5
    ) {
      return null;
    }
    subjects[subjectIndex] = { ...subject, units: action.toUnits };
  }

  return { ...profile, subjects };
}
