// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcademicProfileForm from '@/components/AcademicProfileForm';

describe('AcademicProfileForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders pre-populated file names from initialDocuments', () => {
    const initialDocuments = [
      {
        id: '1',
        kind: 'psychometric' as const,
        originalFileName: 'psy_cert.pdf',
        sizeBytes: 153600, // 150 KB
      },
      {
        id: '2',
        kind: 'bagrut' as const,
        originalFileName: 'bagrut_cert.png',
        sizeBytes: 204800, // 200 KB
      },
    ];

    render(
      <AcademicProfileForm
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        initialDocuments={initialDocuments}
      />
    );

    expect(screen.getByText('psy_cert.pdf')).toBeTruthy();
    expect(screen.getByText('(150 KB)')).toBeTruthy();
    expect(screen.getByText('bagrut_cert.png')).toBeTruthy();
    expect(screen.getByText('(200 KB)')).toBeTruthy();
  });

  it('triggers POST requests for newly selected files on save', async () => {
    const onComplete = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'new-id' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<AcademicProfileForm onComplete={onComplete} onSkip={vi.fn()} />);

    // Mock choosing a file for psychometric
    const file = new File(['hello'], 'test_psy.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText('העלאת תדפיס פסיכומטרי');
    
    // We trigger onChange directly on the input with target files
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify filename appears in the UI
    expect(screen.getByText('test_psy.pdf')).toBeTruthy();

    // Fill in overall score
    fireEvent.change(screen.getByPlaceholderText('למשל: 650'), { target: { value: '710' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    // Loader should appear and button should be disabled
    expect(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }).hasAttribute('disabled')).toBe(true);

    await waitFor(() => expect(onComplete).toHaveBeenCalled());

    // Expect fetch to be called with POST /api/documents and formData
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/documents');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('kind')).toBe('psychometric');
    expect(init.body.get('file')).toBeInstanceOf(File);
    expect(init.body.get('file').name).toBe('test_psy.pdf');
  });

  it('triggers DELETE requests for removed initial documents on save', async () => {
    const onComplete = vi.fn();
    const initialDocuments = [
      {
        id: '1',
        kind: 'psychometric' as const,
        originalFileName: 'psy_cert.pdf',
        sizeBytes: 153600,
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { success: true } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AcademicProfileForm
        onComplete={onComplete}
        onSkip={vi.fn()}
        initialDocuments={initialDocuments}
      />
    );

    // Verify initially rendered
    expect(screen.getByText('psy_cert.pdf')).toBeTruthy();

    // Click remove button
    fireEvent.click(screen.getByRole('button', { name: 'הסר קובץ' }));

    // Verify it is removed from UI
    expect(screen.queryByText('psy_cert.pdf')).toBeNull();

    // Save
    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());

    // Expect fetch to be called with DELETE /api/documents?kind=psychometric
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/documents?kind=psychometric');
    expect(init.method).toBe('DELETE');
  });

  it('renders error message in Hebrew on upload failure', async () => {
    const onComplete = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { code: 'FILE_TOO_LARGE', message: 'קובץ גדול מדי' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<AcademicProfileForm onComplete={onComplete} onSkip={vi.fn()} />);

    const file = new File(['hello'], 'large.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText('העלאת תדפיס פסיכומטרי');
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }));

    await waitFor(() => {
      expect(screen.getByText('קובץ גדול מדי')).toBeTruthy();
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'שמור והמשך לשאלון ←' }).hasAttribute('disabled')).toBe(false);
  });
});
