// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ loading: false, user: null }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/psychometric-accommodations' }));
import Page, { metadata } from './page';

it('renders the approved answer and official-source policy in the page HTML', () => {
  render(<Page />);
  const main = screen.getByRole('main');
  expect(main.getAttribute('dir')).toBe('rtl');
  expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe(
    'התאמות לפסיכומטרי: איזה אבחון, לכמה זמן, והאם הוא תופס גם במוסד?',
  );
  expect(
    within(main)
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent),
  ).toEqual(['מי יכול לבקש, ומה שולחים', 'האם מסמך אחד תופס גם בבחינה וגם במוסד', 'שאלות נפוצות']);
  expect(main.textContent).toContain(
    'אישור לבחינה הפסיכומטרית אינו עובר אוטומטית לאמירנט ולא למוסד הלימודים.',
  );
  expect(main.textContent).toContain('אבחון שנערך אחרי גיל 16 ולא עברו 5 שנים מיום עריכתו.');
  expect(main.textContent).toContain('לצד האבחון מצרפים שאלון למאבחן ומסמכי רקע מגיל צעיר.');
  expect(main.textContent).toContain('לאבחון מת״ל עדכני אין צורך להוסיף שאלון למאבחן');
  expect(main.textContent).toContain('מאל״ו דורש בקשה נפרדת לכל בחינה');
  expect(main.textContent).not.toMatch(/מגיע לכם|מאושרות תמיד|תוקף.*קשב/);
  expect(main.querySelector('a[href="/amirnet"]')).toBeNull();
  const sourceHosts = Array.from(main.querySelectorAll('a[href^="https://"]')).map(
    (link) => new URL(link.getAttribute('href')!).hostname,
  );
  expect(new Set(sourceHosts)).toEqual(new Set(['www.nite.org.il', 'www.gov.il']));
  for (const source of main.querySelectorAll('p[class*="source"]')) {
    expect(source.textContent).toContain('14.11.2026');
  }
  for (const number of main.querySelectorAll('bdi')) expect(number.getAttribute('dir')).toBe('ltr');
});

it('keeps FAQPage identical to the four visible questions and answers', () => {
  const { container } = render(<Page />);
  const faq = JSON.parse(
    container.querySelector('main script[type="application/ld+json"]')!.textContent!,
  )['@graph'][0];
  expect(faq['@type']).toBe('FAQPage');
  expect(faq.mainEntity).toHaveLength(4);
  const visible = Array.from(container.querySelectorAll('section[aria-labelledby="faq"] div'));
  expect(faq.mainEntity).toEqual(
    visible.map((item) => ({
      '@type': 'Question',
      name: item.querySelector('h3')!.textContent,
      acceptedAnswer: { '@type': 'Answer', text: item.querySelector('p')!.textContent },
    })),
  );
});

it('sets the exact search metadata and self-canonical URL', () => {
  expect(metadata.title).toEqual({
    absolute: 'התאמות לפסיכומטרי: אבחון, תוקף ובקשה למוסד | MyWay',
  });
  expect(metadata.description).toBe(
    'מי זכאי לבחינה פסיכומטרית בתנאים מותאמים, מתי אבחון נחשב עדכני, ולמה אישור למאל״ו לא עובר אוטומטית לאמירנט או למוסד הלימודים. לפי הכללים הרשמיים של מאל״ו.',
  );
  expect(metadata.alternates?.canonical).toBe(
    'https://findmyway.co.il/psychometric-accommodations',
  );
});
