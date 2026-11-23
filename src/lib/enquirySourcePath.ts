// Page routes in src/app; the coverage test checks this list against the route tree.
const staticPages = new Set([
  '/',
  '/about',
  '/privacy',
  '/terms',
  '/contact',
  '/accessibility',
  '/dev',
  '/login',
  '/signup',
  '/programs',
  '/institutions',
  '/enquiry',
  '/threshold-alerts',
  '/sekhem-calculator',
  '/calculator',
  '/psychometric-dates',
  '/psychometric-two-domain',
  '/amirnet',
  '/psychometric-accommodations',
  '/atuda',
  '/open-days',
  '/transfer',
  '/without-psychometric',
  '/bagrut-improvement',
  '/app',
  '/app/assessment',
  '/app/recommendations',
  '/app/profile',
  '/app/saved-programs',
  '/app/calculator',
  '/internal/data-health',
]);
const dynamicPage = /^\/(?:programs|institutions|internal\/reviews)\/[^/]+$/;

export function enquirySourcePath(value: string): string {
  const pathname = value.split(/[?#]/)[0];
  return staticPages.has(pathname) || dynamicPage.test(pathname) ? pathname : '/';
}
