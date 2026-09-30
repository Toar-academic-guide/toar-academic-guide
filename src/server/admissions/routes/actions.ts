import type { BagrutSubjectRecord, BagrutSubjectV2 } from '@/types';

export interface RouteProfile {
  psychometric: number;
  psychometricComponents?: {
    quantitative?: number;
    verbal?: number;
    english?: number;
  };
  subjectRecord: BagrutSubjectRecord;
}

export type RouteAction =
  | {
      id: string;
      kind: 'psychometric';
      component?: 'overall' | 'quantitative' | 'verbal' | 'english';
      from: number;
      to: number;
    }
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
    const component = action.component ?? 'overall';
    const current =
      component === 'overall' ? profile.psychometric : profile.psychometricComponents?.[component];
    const maximum = component === 'overall' ? 800 : 150;
    const minimum = component === 'overall' ? 200 : 50;
    if (
      current !== action.from ||
      !Number.isInteger(action.to) ||
      action.to <= action.from ||
      action.to > maximum ||
      action.to < minimum
    ) {
      return null;
    }
    if (component === 'overall') return { ...profile, psychometric: action.to };
    return {
      ...profile,
      psychometricComponents: {
        ...profile.psychometricComponents!,
        [component]: action.to,
      },
    };
  }

  const subjects = profile.subjectRecord.subjects.map((subject) => ({ ...subject }));
  const subjectIndex = subjects.findIndex(
    (subject) =>
      subject.subjectId === action.subjectId &&
      (profile.subjectRecord.schemaVersion === 1 ||
        ('assessmentKind' in subject && subject.assessmentKind === 'exam')),
  );

  if (action.kind === 'add_subject') {
    const subjectAlreadyExists = subjects.some((subject) => subject.subjectId === action.subjectId);
    if (
      subjectAlreadyExists ||
      action.subjectId.trim().length === 0 ||
      action.units !== 5 ||
      !Number.isInteger(action.grade) ||
      action.grade < 0 ||
      action.grade > 100
    ) {
      return null;
    }
    return {
      ...profile,
      subjectRecord: withChangedSubjects(profile.subjectRecord, [
        ...subjects,
        profile.subjectRecord.schemaVersion === 2
          ? {
              subjectId: action.subjectId,
              units: action.units,
              grade: action.grade,
              assessmentKind: 'exam',
            }
          : { subjectId: action.subjectId, units: action.units, grade: action.grade },
      ]),
    };
  }

  if (subjectIndex === -1) {
    return null;
  }

  const subject = subjects[subjectIndex]!;
  if (action.kind === 'improve_grade') {
    if (
      subject.grade !== action.fromGrade ||
      !Number.isInteger(action.toGrade) ||
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
      !Number.isInteger(action.toUnits) ||
      action.toUnits <= action.fromUnits ||
      action.toUnits > 5
    ) {
      return null;
    }
    subjects[subjectIndex] = { ...subject, units: action.toUnits };
  }

  return { ...profile, subjectRecord: withChangedSubjects(profile.subjectRecord, subjects) };
}

export function applyRouteActions(
  profile: RouteProfile,
  actions: RouteAction[],
): RouteProfile | null {
  return actions.reduce<RouteProfile | null>(
    (current, action) => (current ? applyRouteAction(current, action) : null),
    profile,
  );
}

function withChangedSubjects(
  record: BagrutSubjectRecord,
  subjects: BagrutSubjectRecord['subjects'],
): BagrutSubjectRecord {
  const sortedSubjects = [...subjects].sort(
    (left, right) =>
      left.subjectId.localeCompare(right.subjectId) ||
      ('assessmentKind' in left && 'assessmentKind' in right
        ? left.assessmentKind.localeCompare(right.assessmentKind)
        : 0),
  );
  if (record.schemaVersion === 2) {
    return {
      schemaVersion: 2,
      sector: record.sector,
      certificateType: record.certificateType,
      complete: record.complete,
      subjects: sortedSubjects as BagrutSubjectV2[],
    };
  }

  return {
    schemaVersion: 1,
    sector: record.sector,
    subjects: sortedSubjects,
  };
}
