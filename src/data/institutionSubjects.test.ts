import { describe, expect, it } from 'vitest';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import { directorySubject } from './institutionSubjects';

describe('institution directory subjects', () => {
  const programmes = getStaticCataloguePrograms();
  it('maps every listed canonical catalogue programme to a field and subject', () => {
    for (const programme of programmes) {
      if (programme.isListed === false || canonicalProgramId(programme.id) !== programme.id)
        continue;
      const subject = directorySubject(programme, programme.name);
      expect(subject.field.label, programme.id).toBeTruthy();
      expect(subject.key, programme.id).toBeTruthy();
    }
  });
  it('places the same academic subject in the same field across catalogue categories', () => {
    const generic = programmes.find((p) => p.id === 'cs')!;
    const specific = programmes.find((p) => p.id === 'tau_cs')!;
    expect(directorySubject(generic, 'מדעי המחשב')).toEqual(
      directorySubject(specific, 'מדעי המחשב'),
    );
    expect(directorySubject(generic, 'מדעי המחשב').field.label).toBe('מחשבים וטכנולוגיה');
  });
  it('does not conflate a professional course with an academic programme of the same name', () => {
    const academic = programmes.find((p) => p.id === 'cs')!;
    const certificate = { ...academic, type: 'certificate' as const };
    expect(directorySubject(academic, 'מדעי המחשב').key).not.toBe(
      directorySubject(certificate, 'מדעי המחשב').key,
    );
  });
  it('keeps software engineering distinct from computer science', () => {
    const programme = programmes.find((p) => p.id === 'afeka_softwareeng')!;
    expect(directorySubject(programme, programme.name).field.label).toBe('הנדסה');
    expect(directorySubject(programme, programme.name).label).toBe('הנדסת תוכנה');
  });
});
