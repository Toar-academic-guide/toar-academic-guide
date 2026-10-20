// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EnquiryForm from './EnquiryForm';

describe('EnquiryForm', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('keeps the details after failure, retries the same request, then confirms delivery', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: { message: 'לא נשלח' } }, { status: 502 }))
      .mockResolvedValueOnce(Response.json({ data: { received: true } }, { status: 201 }));
    vi.stubGlobal('fetch', send);
    render(<EnquiryForm programId="physiotherapy" institutionId="tau" title="פיזיותרפיה" />);
    fireEvent.change(screen.getByLabelText('שם מלא'), { target: { value: 'בדיקת MyWay' } });
    fireEvent.change(screen.getByLabelText('מספר טלפון'), { target: { value: '0501234567' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'שליחת בקשה' }));
    expect((await screen.findByRole('alert')).textContent).toContain('לא נשלח');
    expect((screen.getByLabelText('שם מלא') as HTMLInputElement).value).toBe('בדיקת MyWay');
    fireEvent.click(screen.getByRole('button', { name: 'שליחת בקשה' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('הפנייה התקבלה'));
    expect(send.mock.calls[0][1].body).toBe(send.mock.calls[1][1].body);
    expect(JSON.parse(send.mock.calls[0][1].body)).toMatchObject({
      programId: 'physiotherapy',
      institutionId: 'tau',
      consent: true,
    });
  });
});
