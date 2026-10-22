import registry from '@/data/institutionWebsites.json';

const websitesByInstitution = new Map<string, string | null>();
const directoryWebsites = new Map<string, string | null>();

for (const [itemId, entry] of Object.entries(registry.directory)) {
  directoryWebsites.set(itemId, entry.website);
  websitesByInstitution.set(`mon_${itemId}`, entry.website);
  // Several schools share an older canonical ID. The directory always uses itemId;
  // canonical programme IDs use the main institution's first entry.
  if (!websitesByInstitution.has(entry.institutionId)) {
    websitesByInstitution.set(entry.institutionId, entry.website);
  }
}
for (const [id, website] of Object.entries(registry.additional)) {
  websitesByInstitution.set(id, website);
}

function parseWebUrl(value?: string | null): URL | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return;
    return url;
  } catch {
    return undefined;
  }
}

// Registry domains are institution-owned, including their faculty/admissions subdomains.
function institutionDomain(url: URL): string {
  const parts = url.hostname.split('.');
  return parts.slice(parts.at(-1) === 'il' ? -3 : -2).join('.');
}

const officialDomains = new Set(
  [...websitesByInstitution.values()].flatMap((website) => {
    const url = parseWebUrl(website);
    return url ? [institutionDomain(url)] : [];
  }),
);

export function institutionWebsite(itemId: string): string | null {
  return directoryWebsites.get(itemId) ?? null;
}

/** Presentation only: never use tracked URLs for evidence fingerprints or API requests. */
export function institutionLink(
  value?: string | null,
  institutionId?: string,
  { fallbackToWebsite = true }: { fallbackToWebsite?: boolean } = {},
): string | undefined {
  let url = parseWebUrl(value);
  if (institutionId) {
    const website = parseWebUrl(websitesByInstitution.get(institutionId));
    if (!website) return undefined;
    if (!url || institutionDomain(url) !== institutionDomain(website)) {
      if (!fallbackToWebsite) return undefined;
      url = website;
    }
  } else if (!url || !officialDomains.has(institutionDomain(url))) {
    return undefined;
  }
  if (!url) return undefined;
  url.searchParams.set('utm_source', 'myway');
  url.searchParams.set('utm_medium', 'referral');
  return url.href;
}
