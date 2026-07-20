import 'server-only';

import { and, eq, notInArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { bagrutProfileVersions, savedPrograms, uploadedDocuments, userProfiles } from '@/db/schema';
import type { UserProfile } from '@/types';

import { mergeUserProfileDraft } from './migration';
import {
  buildUserProfileRow,
  serializeUserProfileSnapshot,
  type UserProfileSnapshot,
} from './serializers';
import { normalizeStructuredBagrutRecord } from './structuredBagrut';

type DatabaseTransaction = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

export async function getUserProfileSnapshot(userId: string): Promise<UserProfileSnapshot> {
  const db = getDb();
  const [profileRow] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  const savedProgramRows = await db
    .select({ programId: savedPrograms.programId })
    .from(savedPrograms)
    .where(eq(savedPrograms.userId, userId));
  const uploadedDocumentRows = await db
    .select()
    .from(uploadedDocuments)
    .where(eq(uploadedDocuments.userId, userId));
  const [bagrutProfileVersion] = profileRow?.bagrutProfileVersionId
    ? await db
        .select()
        .from(bagrutProfileVersions)
        .where(eq(bagrutProfileVersions.id, profileRow.bagrutProfileVersionId))
        .limit(1)
    : [];

  return serializeUserProfileSnapshot(
    profileRow,
    savedProgramRows,
    uploadedDocumentRows,
    bagrutProfileVersion,
  );
}

export async function replaceUserProfileSnapshot(
  userId: string,
  profile: UserProfile,
): Promise<UserProfileSnapshot> {
  const db = getDb();
  const nextSavedProgramIds = Array.from(new Set(profile.savedProgramIds ?? []));
  const normalizedSubjectRecord = profile.academicScores?.bagrut?.subjectRecord
    ? normalizeStructuredBagrutRecord(profile.academicScores.bagrut.subjectRecord)
    : undefined;

  await db.transaction(async (tx) => {
    const bagrutProfileVersionId = normalizedSubjectRecord
      ? await getOrCreateBagrutProfileVersion(tx, userId, normalizedSubjectRecord)
      : null;

    await tx
      .insert(userProfiles)
      .values({
        ...buildUserProfileRow(userId, profile),
        bagrutProfileVersionId,
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          firstName: profile.firstName?.trim() || null,
          lastName: profile.lastName?.trim() || null,
          geographicPreference: profile.geographicPreference,
          psychometricOverall: profile.academicScores?.psychometric?.overall ?? null,
          psychometricQuantitative: profile.academicScores?.psychometric?.quantitative ?? null,
          psychometricVerbal: profile.academicScores?.psychometric?.verbal ?? null,
          psychometricEnglish: profile.academicScores?.psychometric?.english ?? null,
          bagrutWeightedAverage: profile.academicScores?.bagrut?.weightedAverage ?? null,
          bagrutProfileVersionId,
          updatedAt: new Date(),
        },
      });

    if (nextSavedProgramIds.length > 0) {
      await tx
        .delete(savedPrograms)
        .where(
          and(
            eq(savedPrograms.userId, userId),
            notInArray(savedPrograms.programId, nextSavedProgramIds),
          ),
        );
    } else {
      await tx.delete(savedPrograms).where(eq(savedPrograms.userId, userId));
    }

    if (nextSavedProgramIds.length > 0) {
      await tx
        .insert(savedPrograms)
        .values(nextSavedProgramIds.map((programId) => ({ userId, programId })))
        .onConflictDoNothing();
    }
  });

  return getUserProfileSnapshot(userId);
}

async function getOrCreateBagrutProfileVersion(
  tx: DatabaseTransaction,
  userId: string,
  record: ReturnType<typeof normalizeStructuredBagrutRecord>,
): Promise<string> {
  const [existing] = await tx
    .select({ id: bagrutProfileVersions.id })
    .from(bagrutProfileVersions)
    .where(
      and(
        eq(bagrutProfileVersions.userId, userId),
        eq(bagrutProfileVersions.contentHash, record.profileHash),
      ),
    )
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await tx
    .insert(bagrutProfileVersions)
    .values({
      userId,
      schemaVersion: record.schemaVersion,
      contentHash: record.profileHash,
      sector: record.sector,
      subjects: record.subjects,
    })
    .onConflictDoNothing()
    .returning({ id: bagrutProfileVersions.id });

  if (created) {
    return created.id;
  }

  const [concurrentVersion] = await tx
    .select({ id: bagrutProfileVersions.id })
    .from(bagrutProfileVersions)
    .where(
      and(
        eq(bagrutProfileVersions.userId, userId),
        eq(bagrutProfileVersions.contentHash, record.profileHash),
      ),
    )
    .limit(1);

  if (!concurrentVersion) {
    throw new Error('Unable to persist the structured Bagrut profile version.');
  }

  return concurrentVersion.id;
}

export async function mergeUserProfileDraftIntoSnapshot(
  userId: string,
  draft: UserProfile,
): Promise<UserProfileSnapshot> {
  const existing = await getUserProfileSnapshot(userId);
  const merged = mergeUserProfileDraft(existing, draft);
  return replaceUserProfileSnapshot(userId, merged);
}

export async function addSavedProgram(
  userId: string,
  programId: string,
): Promise<UserProfileSnapshot> {
  const db = getDb();

  await db.insert(savedPrograms).values({ userId, programId }).onConflictDoNothing();

  return getUserProfileSnapshot(userId);
}

export async function removeSavedProgram(
  userId: string,
  programId: string,
): Promise<UserProfileSnapshot> {
  const db = getDb();

  await db
    .delete(savedPrograms)
    .where(and(eq(savedPrograms.userId, userId), eq(savedPrograms.programId, programId)));

  return getUserProfileSnapshot(userId);
}
