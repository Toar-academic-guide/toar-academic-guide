import { describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/db/client', () => ({
  getDb: hoistedMocks.getDb,
}));

import { buildUserProfileRow, serializeUserProfileSnapshot } from '@/server/user/serializers';
import { getUserProfileSnapshot } from '@/server/user/profile';

describe('user profile serializers', () => {
  it('serializes a sparse row into the frontend profile shape', () => {
    const snapshot = serializeUserProfileSnapshot(
      {
        userId: '00000000-0000-0000-0000-000000000001',
        firstName: 'מלי',
        lastName: 'כהן',
        geographicPreference: 'south',
        psychometricOverall: 701,
        psychometricQuantitative: null,
        psychometricVerbal: 132,
        psychometricEnglish: null,
        bagrutWeightedAverage: 108,
        riasecR: null,
        riasecI: null,
        riasecA: null,
        riasecS: null,
        riasecE: null,
        riasecC: null,
        avoidanceTags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [{ programId: 'tau_cs' }],
    );

    expect(snapshot).toEqual({
      firstName: 'מלי',
      lastName: 'כהן',
      geographicPreference: 'south',
      academicScores: {
        psychometric: {
          overall: 701,
          verbal: 132,
        },
        bagrut: {
          weightedAverage: 108,
        },
      },
      savedProgramIds: ['tau_cs'],
      uploadedDocuments: [],
    });
  });

  it('serializes a structured Bagrut version separately from legacy average-only data', () => {
    const snapshot = serializeUserProfileSnapshot(
      {
        userId: '00000000-0000-0000-0000-000000000001',
        firstName: null,
        lastName: null,
        geographicPreference: 'any',
        psychometricOverall: null,
        psychometricQuantitative: null,
        psychometricVerbal: null,
        psychometricEnglish: null,
        bagrutWeightedAverage: 106,
        riasecR: null,
        riasecI: null,
        riasecA: null,
        riasecS: null,
        riasecE: null,
        riasecC: null,
        avoidanceTags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [],
      [],
      {
        id: '00000000-0000-0000-0000-000000000010',
        userId: '00000000-0000-0000-0000-000000000001',
        schemaVersion: 1,
        contentHash: 'sha256:profile-hash',
        sector: 'jewish',
        subjects: [
          { subjectId: 'history', units: 2, grade: 88 },
          { subjectId: 'mathematics', units: 5, grade: 92 },
        ],
        createdAt: new Date(),
      },
    );

    expect(snapshot.academicScores?.bagrut).toEqual({
      weightedAverage: 106,
      subjectRecord: {
        schemaVersion: 1,
        profileHash: 'sha256:profile-hash',
        sector: 'jewish',
        subjects: [
          { subjectId: 'history', units: 2, grade: 88 },
          { subjectId: 'mathematics', units: 5, grade: 92 },
        ],
      },
    });
  });

  it('builds a DB row with nulls for missing score fields', () => {
    const row = buildUserProfileRow('00000000-0000-0000-0000-000000000002', {
      firstName: 'Dana',
      lastName: 'Levi',
      geographicPreference: 'any',
      academicScores: {
        psychometric: {
          overall: 650,
        },
      },
    });

    expect(row).toMatchObject({
      userId: '00000000-0000-0000-0000-000000000002',
      firstName: 'Dana',
      lastName: 'Levi',
      geographicPreference: 'any',
      psychometricOverall: 650,
      psychometricQuantitative: null,
      psychometricVerbal: null,
      psychometricEnglish: null,
      bagrutWeightedAverage: null,
    });
  });

  it('keeps legacy rows without names backward-compatible', () => {
    const snapshot = serializeUserProfileSnapshot(
      {
        userId: '00000000-0000-0000-0000-000000000003',
        firstName: null,
        lastName: null,
        geographicPreference: 'any',
        psychometricOverall: null,
        psychometricQuantitative: null,
        psychometricVerbal: null,
        psychometricEnglish: null,
        bagrutWeightedAverage: null,
        riasecR: null,
        riasecI: null,
        riasecA: null,
        riasecS: null,
        riasecE: null,
        riasecC: null,
        avoidanceTags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [],
    );

    expect(snapshot).toEqual({
      geographicPreference: 'any',
      savedProgramIds: [],
      uploadedDocuments: [],
    });
  });

  it('serializes uploaded documents metadata when present', () => {
    const snapshot = serializeUserProfileSnapshot(
      {
        userId: '00000000-0000-0000-0000-000000000004',
        firstName: 'Dana',
        lastName: 'Levi',
        geographicPreference: 'any',
        psychometricOverall: null,
        psychometricQuantitative: null,
        psychometricVerbal: null,
        psychometricEnglish: null,
        bagrutWeightedAverage: null,
        riasecR: null,
        riasecI: null,
        riasecA: null,
        riasecS: null,
        riasecE: null,
        riasecC: null,
        avoidanceTags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [],
      [
        {
          id: 'doc-1',
          userId: '00000000-0000-0000-0000-000000000004',
          kind: 'psychometric',
          storageProvider: 'supabase_storage',
          storagePath: '00000000-0000-0000-0000-000000000004/psychometric/file-1',
          originalFileName: 'report.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 102400,
          uploadedAt: new Date(),
        },
      ],
    );

    expect(snapshot).toEqual({
      firstName: 'Dana',
      lastName: 'Levi',
      geographicPreference: 'any',
      savedProgramIds: [],
      uploadedDocuments: [
        {
          id: 'doc-1',
          kind: 'psychometric',
          displayName: 'תדפיס פסיכומטרי',
          sizeBytes: 102400,
        },
      ],
    });
  });

  it('omits unsupported uploaded document kinds from the public snapshot', () => {
    const snapshot = serializeUserProfileSnapshot(
      {
        userId: '00000000-0000-0000-0000-000000000010',
        firstName: null,
        lastName: null,
        geographicPreference: 'any',
        psychometricOverall: null,
        psychometricQuantitative: null,
        psychometricVerbal: null,
        psychometricEnglish: null,
        bagrutWeightedAverage: null,
        riasecR: null,
        riasecI: null,
        riasecA: null,
        riasecS: null,
        riasecE: null,
        riasecC: null,
        avoidanceTags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [],
      [
        {
          id: 'doc-2',
          userId: '00000000-0000-0000-0000-000000000010',
          kind: 'other',
          storageProvider: 'supabase_storage',
          storagePath: '00000000-0000-0000-0000-000000000010/other/file-1',
          originalFileName: 'other.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 4096,
          uploadedAt: new Date(),
        },
      ],
    );

    expect(snapshot.uploadedDocuments).toEqual([]);
  });
});

describe('getUserProfileSnapshot', () => {
  it('loads the immutable structured Bagrut version referenced by the profile', async () => {
    const mockSelect = vi.fn();
    hoistedMocks.getDb.mockReturnValue({ select: mockSelect });

    const profileRow = {
      userId: 'user-structured',
      firstName: null,
      lastName: null,
      geographicPreference: 'any',
      psychometricOverall: null,
      psychometricQuantitative: null,
      psychometricVerbal: null,
      psychometricEnglish: null,
      bagrutWeightedAverage: 106,
      bagrutProfileVersionId: '00000000-0000-0000-0000-000000000010',
      riasecR: null,
      riasecI: null,
      riasecA: null,
      riasecS: null,
      riasecE: null,
      riasecC: null,
      avoidanceTags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const versionRow = {
      id: '00000000-0000-0000-0000-000000000010',
      userId: 'user-structured',
      schemaVersion: 1,
      contentHash: 'sha256:profile-hash',
      sector: 'jewish',
      subjects: [{ subjectId: 'mathematics', units: 5, grade: 92 }],
      createdAt: new Date(),
    };

    mockSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([profileRow]) }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([versionRow]) }),
        }),
      });

    await expect(getUserProfileSnapshot('user-structured')).resolves.toMatchObject({
      academicScores: {
        bagrut: {
          weightedAverage: 106,
          subjectRecord: {
            schemaVersion: 1,
            profileHash: 'sha256:profile-hash',
            sector: 'jewish',
            subjects: [{ subjectId: 'mathematics', units: 5, grade: 92 }],
          },
        },
      },
    });
  });

  it('correctly queries database for user profile, saved programs, and uploaded documents', async () => {
    const mockSelect = vi.fn();
    const mockDb = { select: mockSelect };
    hoistedMocks.getDb.mockReturnValue(mockDb);

    const profileRow = {
      userId: 'user-123',
      firstName: 'Test',
      lastName: 'User',
      geographicPreference: 'north',
      psychometricOverall: 700,
      psychometricQuantitative: 140,
      psychometricVerbal: 135,
      psychometricEnglish: 125,
      bagrutWeightedAverage: 105,
    };

    const savedProgramRows = [{ programId: 'huji_cs' }];

    const documentRows = [
      {
        id: 'doc-1',
        userId: 'user-123',
        kind: 'psychometric',
        storageProvider: 'supabase_storage',
        storagePath: 'user-123/psychometric/file-1',
        originalFileName: 'report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100000,
        uploadedAt: new Date(),
      },
    ];

    // Chaining mock for Profile query
    const mockLimit = vi.fn().mockResolvedValueOnce([profileRow]);
    const mockWhere1 = vi.fn().mockReturnValueOnce({ limit: mockLimit });
    const mockFrom1 = vi.fn().mockReturnValueOnce({ where: mockWhere1 });
    mockSelect.mockReturnValueOnce({ from: mockFrom1 });

    // Chaining mock for Saved Programs query
    const mockWhere2 = vi.fn().mockResolvedValueOnce(savedProgramRows);
    const mockFrom2 = vi.fn().mockReturnValueOnce({ where: mockWhere2 });
    mockSelect.mockReturnValueOnce({ from: mockFrom2 });

    // Chaining mock for Documents query
    const mockWhere3 = vi.fn().mockResolvedValueOnce(documentRows);
    const mockFrom3 = vi.fn().mockReturnValueOnce({ where: mockWhere3 });
    mockSelect.mockReturnValueOnce({ from: mockFrom3 });

    const snapshot = await getUserProfileSnapshot('user-123');

    expect(snapshot).toEqual({
      firstName: 'Test',
      lastName: 'User',
      geographicPreference: 'north',
      academicScores: {
        psychometric: {
          overall: 700,
          quantitative: 140,
          verbal: 135,
          english: 125,
        },
        bagrut: {
          weightedAverage: 105,
        },
      },
      savedProgramIds: ['huji_cs'],
      uploadedDocuments: [
        {
          id: 'doc-1',
          kind: 'psychometric',
          displayName: 'תדפיס פסיכומטרי',
          sizeBytes: 100000,
        },
      ],
    });
  });
});
