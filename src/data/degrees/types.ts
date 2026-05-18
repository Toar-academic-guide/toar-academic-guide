import type { UniversityId } from '@/types';

export interface Program {
  id: string;
  name: string;
  institution: string;
  type: 'academic' | 'certificate' | 'vocational';
  category: string;
  riasecScore: { R: number; I: number; A: number; S: number; E: number; C: number };
  admissionType: 'sekhem' | 'requirements';
  admissionRequirements: string[];
  // ── Sekhem-track fields (required when admissionType === 'sekhem') ─────────
  thresholds?: Record<UniversityId, number | null>;
  isTauEngineering?: boolean;
  directPsychometric?: Partial<Record<UniversityId, number>>;
}
