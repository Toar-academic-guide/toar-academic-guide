import { describe, expect, it } from 'vitest';
import registry from '@/data/institutionWebsites.json';
import { getInstitutionDirectoryItems } from '@/data/institutionDirectory';
import { institutionLink, institutionWebsite } from './institutionLinks';

describe('official institution links', () => {
  it('covers every directory row without selecting imported aggregator links', () => {
    const directory = getInstitutionDirectoryItems();
    expect(Object.keys(registry.directory)).toHaveLength(directory.length);
    for (const item of directory) {
      expect(item.sourceUrl).toBe(institutionWebsite(item.itemId));
      if (!item.sourceUrl) continue;
      const url = new URL(institutionLink(item.sourceUrl)!);
      expect(url.hostname).not.toMatch(/walla|yoram|michlalot|course\.co\.il/);
      expect(url.searchParams.get('utm_source')).toBe('myway');
      expect(url.searchParams.get('utm_medium')).toBe('referral');
    }
  });

  it('preserves official paths, query parameters and fragments without duplicate tracking', () => {
    const input =
      'https://go.tau.ac.il/he/communication/ba?v=requirements&utm_source=old&utm_medium=old#requirements';
    const linked = institutionLink(input, 'tau')!;
    const url = new URL(linked);
    expect(url.pathname).toBe('/he/communication/ba');
    expect(url.searchParams.get('v')).toBe('requirements');
    expect(url.hash).toBe('#requirements');
    expect(url.searchParams.getAll('utm_source')).toEqual(['myway']);
    expect(url.searchParams.getAll('utm_medium')).toEqual(['referral']);
    expect(institutionLink(linked, 'tau')).toBe(linked);
    expect(
      new URL(
        institutionLink('https://www.beit-zvi.com/?CategoryID=160', 'beit_zvi')!,
      ).searchParams.get('CategoryID'),
    ).toBe('160');
  });

  it('corrects wrong-school destinations using the actual institution identity', () => {
    expect(new URL(institutionLink('https://www.pac.ac.il/', 'mon_12341187728')!).hostname).toBe(
      'preciseclass.com',
    );
    expect(new URL(institutionLink('https://www.pac.ac.il/', 'mon_12341168601')!).hostname).toBe(
      'expressenglish.co.il',
    );
    expect(new URL(institutionLink('https://www.danon.co.il/', 'danon')!).hostname).toBe(
      'www.danon.org.il',
    );
    expect(new URL(institutionLink('https://www.elevation.ac.il/', 'elevation')!).hostname).toBe(
      'elevation.ac',
    );
  });

  it('keeps distinct schools under the same parent separate in the directory', () => {
    expect(institutionWebsite('12341155971')).toBe('https://www.openu.ac.il/dialog/');
    expect(institutionWebsite('12341148655')).toBe('https://www.openu.ac.il/tafnit/');
    expect(institutionWebsite('12341168193')).toBe('https://www.ruppin-tech.co.il/');
    expect(institutionWebsite('12220708946')).toBe('https://www.ruppin.ac.il/');
    expect(new URL(institutionLink(undefined, 'kinneret')!).hostname).toBe('do.kinneret.ac.il');
    expect(new URL(institutionLink(undefined, 'mon_12341101391')!).hostname).toBe('www.ktec.co.il');
    expect(new URL(institutionLink(undefined, 'tiltan')!).hostname).toBe('tiltan.co.il');
    expect(new URL(institutionLink(undefined, 'mon_12341161868')!).hostname).toBe(
      'www.tiltancollege.co.il',
    );
  });

  it('does not substitute a homepage for an unavailable calculator or alternative route', () => {
    expect(institutionLink(undefined, 'tau', { fallbackToWebsite: false })).toBeUndefined();
    expect(
      institutionLink('https://yoram.walla.co.il/institute/1', 'tau', { fallbackToWebsite: false }),
    ).toBeUndefined();
    expect(
      institutionLink('https://bgu4u.bgu.ac.il/html/average_calc/index.php', 'bgu', {
        fallbackToWebsite: false,
      }),
    ).toContain('utm_medium=referral');
  });

  it('withholds unverified destinations while retaining their directory entries', () => {
    expect(
      getInstitutionDirectoryItems().find((item) => item.itemId === '12341203595'),
    ).toBeDefined();
    expect(institutionWebsite('12341203595')).toBeNull();
    expect(institutionLink('https://www.etgar.co.il/', 'mon_12341203595')).toBeUndefined();
    expect(institutionLink('https://www.pardeshana.ac.il/', 'pardeshana')).toBeUndefined();
    expect(institutionLink('https://yoram.walla.co.il/institute/1')).toBeUndefined();
    expect(institutionLink('https://example.com')).toBeUndefined();
    expect(institutionLink('https://go.tau.ac.il.evil.example')).toBeUndefined();
    expect(institutionLink('javascript:alert(1)')).toBeUndefined();
    expect(institutionLink('https://user:secret@go.tau.ac.il/')).toBeUndefined();
  });
});
