export type ReviewItemStatus = 'pending' | 'approved' | 'rejected';
export type ReviewTargetField = 'sourceFreshness' | (string & {});

export interface SourceFreshnessProposedValue {
  sourceId: string;
  normalizedFingerprint: string;
  normalizedDecisionPayload: Record<string, unknown>;
  reproducedFields: string[];
  limitations: string[];
  nextAction: string | null;
}

export type ParsedSourceFreshnessProposedValue =
  | {
      ok: true;
      value: SourceFreshnessProposedValue;
    }
  | {
      ok: false;
      reason: 'invalid_source_freshness_value';
    };

export function parseSourceFreshnessProposedValue(
  proposedValue: unknown,
): ParsedSourceFreshnessProposedValue {
  if (!isRecord(proposedValue)) {
    return { ok: false, reason: 'invalid_source_freshness_value' };
  }

  const sourceId = proposedValue.sourceId;
  const normalizedFingerprint = proposedValue.normalizedFingerprint;
  const normalizedDecisionPayload = proposedValue.normalizedDecisionPayload;

  if (
    typeof sourceId !== 'string' ||
    sourceId.length === 0 ||
    typeof normalizedFingerprint !== 'string' ||
    normalizedFingerprint.length === 0 ||
    !isRecord(normalizedDecisionPayload)
  ) {
    return { ok: false, reason: 'invalid_source_freshness_value' };
  }

  return {
    ok: true,
    value: {
      sourceId,
      normalizedFingerprint,
      normalizedDecisionPayload,
      reproducedFields: stringArray(proposedValue.reproducedFields),
      limitations: stringArray(proposedValue.limitations),
      nextAction:
        typeof proposedValue.nextAction === 'string' && proposedValue.nextAction.length > 0
          ? proposedValue.nextAction
          : null,
    },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}
