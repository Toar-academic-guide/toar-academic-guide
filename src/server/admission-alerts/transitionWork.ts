import 'server-only';

import { and, eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import {
  admissionAlertTransitionWork,
  admissionReleases,
  admissionTargetTransitions,
} from '@/db/schema';

export interface AdmissionAlertTransitionWorkRepository {
  getPublishedRelease(releaseId: string): Promise<{ id: string } | null>;
  listTransitionIds(releaseId: string): Promise<string[]>;
  createWork(transitionId: string): Promise<boolean>;
}

export async function enqueueAdmissionAlertTransitionWork(input: {
  releaseId: string;
  repository?: AdmissionAlertTransitionWorkRepository;
}): Promise<{ status: 'enqueued'; createdWorkCount: number } | { status: 'not_processable' }> {
  const repository = input.repository ?? createDrizzleAdmissionAlertTransitionWorkRepository();
  const release = await repository.getPublishedRelease(input.releaseId);
  if (!release) {
    return { status: 'not_processable' };
  }

  const transitionIds = await repository.listTransitionIds(release.id);
  const creations = await Promise.all(
    transitionIds.map((transitionId) => repository.createWork(transitionId)),
  );
  return { status: 'enqueued', createdWorkCount: creations.filter(Boolean).length };
}

export function createDrizzleAdmissionAlertTransitionWorkRepository(
  db = getDb(),
): AdmissionAlertTransitionWorkRepository {
  return {
    async getPublishedRelease(releaseId) {
      const [release] = await db
        .select({ id: admissionReleases.id })
        .from(admissionReleases)
        .where(and(eq(admissionReleases.id, releaseId), eq(admissionReleases.status, 'published')))
        .limit(1);
      return release ?? null;
    },
    async listTransitionIds(releaseId) {
      const transitions = await db
        .select({ id: admissionTargetTransitions.id })
        .from(admissionTargetTransitions)
        .where(eq(admissionTargetTransitions.releaseId, releaseId));
      return transitions.map((transition) => transition.id);
    },
    async createWork(transitionId) {
      const [work] = await db
        .insert(admissionAlertTransitionWork)
        .values({ transitionId })
        .onConflictDoNothing({ target: admissionAlertTransitionWork.transitionId })
        .returning({ id: admissionAlertTransitionWork.id });
      return work !== undefined;
    },
  };
}
