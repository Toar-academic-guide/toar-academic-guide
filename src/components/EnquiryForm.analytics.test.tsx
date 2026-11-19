// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ENQUIRY_COPY } from '@/lib/enquiries';
import EnquiryForm from './EnquiryForm';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { capture } }));
beforeEach(() => {
  capture.mockReset();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/enquiry?private=value#private');
});

it('tracks real dialog progression once and accepted attempts including retry, without values', async () => {
  let finish!: (response: Response) => void;
  const send = vi
    .fn()
    .mockImplementation(() => new Promise<Response>((resolve) => (finish = resolve)));
  vi.stubGlobal('fetch', send);
  const form = (
    <StrictMode>
      <EnquiryForm programId="cs" institutionId="tau" title="מדעי המחשב" />
    </StrictMode>
  );
  const { rerender } = render(form);
  const submit = () => fireEvent.submit(document.querySelector('form')!);
  submit();
  expect(send).not.toHaveBeenCalled();
  expect(capture.mock.calls.map(([name]) => name)).toEqual(['enquiry_form_viewed']);
  fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.nameLabel), {
    target: { value: 'Private Name' },
  });
  fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.nameLabel), {
    target: { value: 'Private Name Again' },
  });
  submit();
  expect(send).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.phoneLabel), {
    target: { value: '0501234567' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  submit();
  submit();
  expect(send).toHaveBeenCalledTimes(1);
  rerender(form);
  await act(async () =>
    finish(Response.json({ error: 'private provider details' }, { status: 502 })),
  );
  submit();
  expect(send).toHaveBeenCalledTimes(2);
  expect(JSON.parse(send.mock.calls[0][1].body).requestId).toBe(
    JSON.parse(send.mock.calls[1][1].body).requestId,
  );
  await act(async () => finish(Response.json({ data: { received: true } }, { status: 201 })));
  expect(capture.mock.calls.map(([name]) => name)).toEqual([
    'enquiry_form_viewed',
    'enquiry_form_step_completed',
    'enquiry_form_step_completed',
    'enquiry_submit_attempted',
    'enquiry_submit_failed',
    'enquiry_submit_attempted',
    'enquiry_submitted',
  ]);
  expect(
    capture.mock.calls
      .filter(([name]) => name === 'enquiry_form_step_completed')
      .map(([, props]) => props),
  ).toEqual([
    { program_id: 'cs', institution_id: 'tau', surface: 'enquiry_page', step: 'contact_entered' },
    { program_id: 'cs', institution_id: 'tau', surface: 'enquiry_page', step: 'validated' },
  ]);
  expect(
    capture.mock.calls
      .filter(([name]) => name === 'enquiry_submit_attempted')
      .map(([, props]) => props),
  ).toEqual([
    { program_id: 'cs', institution_id: 'tau', surface: 'enquiry_page', attempt_kind: 'initial' },
    { program_id: 'cs', institution_id: 'tau', surface: 'enquiry_page', attempt_kind: 'retry' },
  ]);
  const payloads = JSON.stringify(capture.mock.calls);
  for (const value of ['Private', '0501234567', 'private', 'requestId', 'prepConsent'])
    expect(payloads).not.toContain(value);
  vi.unstubAllGlobals();
});
