import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: hoistedMocks.createSupabaseServerClient,
}));

vi.mock('@/db/client', () => ({
  getDb: hoistedMocks.getDb,
}));

vi.mock('server-only', () => ({}));

import { POST, DELETE } from './route';

describe('documents API route', () => {
  let mockSupabase: any;
  let mockDb: any;
  let mockTx: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
          remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      },
    };
    hoistedMocks.createSupabaseServerClient.mockResolvedValue(mockSupabase);

    mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      }),
    };

    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
      transaction: vi.fn().mockImplementation((callback) => callback(mockTx)),
    };
    hoistedMocks.getDb.mockReturnValue(mockDb);
  });

  describe('POST /api/documents', () => {
    it('returns 401 if user is unauthenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Unauthorized'),
      });

      const req = new Request('http://localhost/api/documents', {
        method: 'POST',
      });
      const res = await POST(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error.code).toBe('AUTH_REQUIRED');
    });

    it('returns 400 if file or kind is missing', async () => {
      const formData = new FormData();
      formData.append('kind', 'psychometric');
      // No file appended

      const req = new Request('http://localhost/api/documents', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('FILE_AND_KIND_REQUIRED');
    });

    it('returns 400 if kind is invalid', async () => {
      const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'invalid-kind');

      const req = new Request('http://localhost/api/documents', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('INVALID_DOCUMENT_KIND');
    });

    it('returns 400 if file is too large', async () => {
      const buffer = new Uint8Array(6 * 1024 * 1024);
      const file = new File([buffer], 'large.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'psychometric');

      const req = new Request('http://localhost/api/documents', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('FILE_TOO_LARGE');
    });

    it('returns 400 if file mime type is not allowed', async () => {
      const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'psychometric');

      const req = new Request('http://localhost/api/documents', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('successfully uploads file, performs DB inserts, and returns document info', async () => {
      const file = new File(['dummy pdf'], 'report.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'psychometric');

      const req = new Request('http://localhost/api/documents', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.kind).toBe('psychometric');
      expect(json.data.displayName).toBe('תדפיס פסיכומטרי');
      expect(json.data.id).toBeTypeOf('string');

      // Verify Storage upload called
      const storageFromMock = mockSupabase.storage.from;
      expect(storageFromMock).toHaveBeenCalledWith('documents');
      expect(storageFromMock().upload).toHaveBeenCalled();

      // Verify DB transaction called
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
    });

    it('deletes old file from storage when replacing an existing document of same kind', async () => {
      const file = new File(['dummy image'], 'image.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', 'psychometric');

      // Setup mock to return an existing document
      const existingDoc = {
        id: 'old-doc-id',
        kind: 'psychometric',
        storagePath: 'user-123/psychometric/old-uuid',
      };
      mockTx.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingDoc]),
          }),
        }),
      });

      const req = new Request('http://localhost/api/documents', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      // Verify deletion of old file was called on storage
      expect(mockSupabase.storage.from().remove).toHaveBeenCalledWith(['user-123/psychometric/old-uuid']);
      expect(mockTx.delete).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/documents', () => {
    it('successfully deletes old document if it exists in DB', async () => {
      const existingDoc = {
        id: 'doc-to-delete',
        kind: 'psychometric',
        storagePath: 'user-123/psychometric/some-uuid',
      };
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingDoc]),
          }),
        }),
      });

      const req = new Request('http://localhost/api/documents?kind=psychometric', {
        method: 'DELETE',
      });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.success).toBe(true);

      // Verify deletion from DB and Storage
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockSupabase.storage.from().remove).toHaveBeenCalledWith(['user-123/psychometric/some-uuid']);
    });

    it('returns null if document to delete does not exist', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const req = new Request('http://localhost/api/documents?kind=psychometric', {
        method: 'DELETE',
      });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeNull();
    });
  });
});
