import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDb } from '@/db/client';
import { uploadedDocuments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export async function POST(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const kind = formData.get('kind') as string | null;

    if (!file || !kind) {
      throw new ApiRouteError(400, 'FILE_AND_KIND_REQUIRED', 'Both file and kind are required.');
    }

    if (kind !== 'psychometric' && kind !== 'bagrut') {
      throw new ApiRouteError(
        400,
        'INVALID_DOCUMENT_KIND',
        "Document kind must be 'psychometric' or 'bagrut'.",
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ApiRouteError(400, 'FILE_TOO_LARGE', 'File size exceeds the 5MB limit.');
    }

    // Check mime type (prefix check or direct array check)
    const isImage = file.type.startsWith('image/');
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.type);
    if (!isAllowedMime && !isImage) {
      throw new ApiRouteError(400, 'INVALID_FILE_TYPE', 'Only PDF and images are allowed.');
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      throw new ApiRouteError(
        503,
        'SUPABASE_STORAGE_UNAVAILABLE',
        'Supabase storage is not configured.',
      );
    }

    const uuid = crypto.randomUUID();
    const storagePath = `${userId}/${kind}/${uuid}`;

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 1. Upload new file to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw new ApiRouteError(
        500,
        'STORAGE_UPLOAD_FAILED',
        `Failed to upload file to storage: ${uploadError.message}`,
      );
    }

    const db = getDb();
    let oldStoragePathToDelete: string | null = null;
    const newDocId = crypto.randomUUID();

    // 2. Perform DB updates in transaction
    await db.transaction(async (tx) => {
      // Find existing document of this kind for this user
      const [existingDoc] = await tx
        .select()
        .from(uploadedDocuments)
        .where(and(eq(uploadedDocuments.userId, userId), eq(uploadedDocuments.kind, kind)))
        .limit(1);

      if (existingDoc) {
        oldStoragePathToDelete = existingDoc.storagePath;
        // Delete the old record
        await tx.delete(uploadedDocuments).where(eq(uploadedDocuments.id, existingDoc.id));
      }

      // Insert the new record
      await tx.insert(uploadedDocuments).values({
        id: newDocId,
        userId,
        kind,
        storageProvider: 'supabase_storage',
        storagePath,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    });

    // 3. Clean up the old file in storage AFTER the DB transaction commits successfully
    if (oldStoragePathToDelete) {
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove([oldStoragePathToDelete]);

      if (deleteError) {
        console.warn(
          `[documents API] Warning: failed to delete old storage file at ${oldStoragePathToDelete}:`,
          deleteError.message,
        );
      }
    }

    return Response.json({
      data: {
        id: newDocId,
        kind,
        displayName: buildDocumentDisplayName(kind),
        sizeBytes: file.size,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId();
    const url = new URL(request.url);
    const kind = url.searchParams.get('kind');

    if (!kind) {
      throw new ApiRouteError(400, 'KIND_REQUIRED', "Query parameter 'kind' is required.");
    }

    if (kind !== 'psychometric' && kind !== 'bagrut') {
      throw new ApiRouteError(
        400,
        'INVALID_DOCUMENT_KIND',
        "Document kind must be 'psychometric' or 'bagrut'.",
      );
    }

    const db = getDb();
    const [existingDoc] = await db
      .select()
      .from(uploadedDocuments)
      .where(and(eq(uploadedDocuments.userId, userId), eq(uploadedDocuments.kind, kind)))
      .limit(1);

    if (!existingDoc) {
      return Response.json({ data: null });
    }

    // Delete DB record first
    await db.delete(uploadedDocuments).where(eq(uploadedDocuments.id, existingDoc.id));

    // Try deleting from storage
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove([existingDoc.storagePath]);

      if (deleteError) {
        console.warn(
          `[documents API] Warning: failed to delete storage file at ${existingDoc.storagePath}:`,
          deleteError.message,
        );
      }
    }

    return Response.json({ data: { success: true } });
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function requireAuthenticatedUserId() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new ApiRouteError(503, 'SUPABASE_AUTH_UNAVAILABLE', 'Supabase auth is not configured.');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiRouteError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  return user.id;
}

class ApiRouteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof ApiRouteError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : 'Unable to process document operation.';

  return Response.json(
    {
      error: {
        code: 'DOCUMENTS_INTERNAL_ERROR',
        message,
      },
    },
    { status: 500 },
  );
}

function buildDocumentDisplayName(kind: 'psychometric' | 'bagrut') {
  switch (kind) {
    case 'psychometric':
      return 'תדפיס פסיכומטרי';
    case 'bagrut':
      return 'גיליון ציוני בגרות';
  }
}
