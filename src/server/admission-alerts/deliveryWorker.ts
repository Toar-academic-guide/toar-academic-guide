import 'server-only';

export interface AdmissionAlertDeliveryRepository {
  claimNextDelivery(): Promise<{
    id: string;
    idempotencyKey: string;
    subscriptionStatus: 'pending_delivery' | 'cancelled' | 'notified';
  } | null>;
  acceptDelivery(input: { outboxId: string; providerMessageId: string }): Promise<void>;
  retryDelivery(outboxId: string): Promise<void>;
}

export interface AdmissionAlertMailProvider {
  send(input: {
    idempotencyKey: string;
  }): Promise<{ status: 'accepted'; providerMessageId: string } | { status: 'retryable' }>;
}

export async function processAdmissionAlertDelivery(input: {
  repository: AdmissionAlertDeliveryRepository;
  provider: AdmissionAlertMailProvider;
}): Promise<
  | { status: 'idle' }
  | { status: 'accepted'; outboxId: string }
  | { status: 'retry'; outboxId: string }
> {
  const delivery = await input.repository.claimNextDelivery();
  if (!delivery) return { status: 'idle' };
  if (delivery.subscriptionStatus !== 'pending_delivery') return { status: 'idle' };

  const sent = await input.provider.send({ idempotencyKey: delivery.idempotencyKey });
  if (sent.status === 'accepted') {
    await input.repository.acceptDelivery({
      outboxId: delivery.id,
      providerMessageId: sent.providerMessageId,
    });
    return { status: 'accepted', outboxId: delivery.id };
  }

  await input.repository.retryDelivery(delivery.id);
  return { status: 'retry', outboxId: delivery.id };
}
