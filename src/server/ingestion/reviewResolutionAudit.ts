import { AsyncLocalStorage } from 'node:async_hooks';

// Keep the authenticated operator scoped to this server action, including concurrent requests.
const reviewActor = new AsyncLocalStorage<string>();

export function withReviewResolutionActor<T>(
  actor: string,
  operation: () => Promise<T>,
): Promise<T> {
  return reviewActor.run(actor, operation);
}

export function getReviewResolutionActor(): string | null {
  return reviewActor.getStore() ?? null;
}
