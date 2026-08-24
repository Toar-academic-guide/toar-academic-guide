import { mondayAdmissionEvidenceRecords } from '@/data/admissions/mondayEvidence.generated';
import { INSTITUTION_BY_ID, type InstitutionRecord } from '@/data/institutions';
import mondayInstitutionsExport from '@/data/mondayInstitutions.generated.json';
import yoramInstitutionLogos from '@/data/yoramInstitutionLogos.generated.json';

export type InstitutionAreaFilter =
  | 'all'
  | 'center'
  | 'north'
  | 'south'
  | 'jerusalem'
  | 'tel_aviv'
  | 'haifa'
  | 'online';

export type InstitutionCategoryFilter =
  | 'all'
  | 'popular'
  | 'universities'
  | 'public_colleges'
  | 'private_colleges'
  | 'professional_schools';

export type InstitutionCredentialFilter =
  | 'all'
  | 'academic_degree'
  | 'professional_certificate'
  | 'subsidized'
  | 'unsubsidized';

export interface InstitutionDirectoryItem {
  id: string;
  itemId: string;
  name: string;
  mondayUrl: string;
  type: string | null;
  funding: string | null;
  location: string | null;
  diplomaType: string | null;
  sourceUrl: string | null;
  domain: string | null;
  logoUrl: string | null;
  areas: InstitutionAreaFilter[];
  categories: InstitutionCategoryFilter[];
  credentials: InstitutionCredentialFilter[];
  coverageLevel: string | null;
  confidence: string | null;
  launchPriority: string | null;
}

const POPULAR_INSTITUTION_IDS = new Set([
  'tau',
  'huji',
  'technion',
  'bgu',
  'haifa',
  'biu',
  'ariel',
  'reichman',
  'ono',
]);

const EXCLUDED_MONDAY_ITEM_IDS = new Set(['12242591498']);

const DIRECTORY_LOGO_OVERRIDES: Record<
  string,
  {
    domain?: string;
    logoUrl?: string;
    sourceUrl?: string;
  }
> = {
  danon: {
    domain: 'danon.org.il',
    logoUrl: 'https://www.meirdanon.com/wp-content/uploads/2015/09/nl2-danon.png',
    sourceUrl: 'https://www.danon.org.il',
  },
  wizo: {
    domain: 'wizo.org.il',
  },
  mon_12220697934: {
    domain: 'bpm-music.com',
    logoUrl: 'https://i1.sndcdn.com/avatars-000030802522-35lsuk-t500x500.jpg',
    sourceUrl: 'https://www.bpm-music.com',
  },
  mon_12220697940: {
    logoUrl: '/institution-logos/yoram-levinstein.png',
  },
  mon_12341118768: {
    logoUrl: '/institution-logos/hbs-college.png',
  },
  mon_12341122479: {
    logoUrl: '/institution-logos/inline-college.png',
  },
  mon_12341064485: {
    logoUrl: '/institution-logos/anat-barzilai.png',
  },
  mon_12341092879: {
    logoUrl: '/institution-logos/studio-6b.png',
  },
  mon_12341098736: {
    logoUrl: '/institution-logos/laledet.png',
  },
  mon_12341102883: {
    logoUrl: '/institution-logos/res-college.png',
  },
  mon_12341114949: {
    logoUrl: '/institution-logos/msc-college.png',
  },
  mon_12341127690: {
    logoUrl: '/institution-logos/erez-college.png',
  },
  mon_12341128292: {
    logoUrl: '/institution-logos/medicine-college.png',
  },
  mon_12341133521: {
    logoUrl: '/institution-logos/minhal-tech.png',
  },
  mon_12341142616: {
    logoUrl: '/institution-logos/master-college.png',
  },
  mon_12341144078: {
    logoUrl: '/institution-logos/natasha-denona.png',
  },
  mon_12341092241: {
    logoUrl: '/institution-logos/psagot-college.png',
  },
  mon_12341126780: {
    logoUrl: '/institution-logos/ravit-asaf.png',
  },
};

type MondayInstitutionExportRow = (typeof mondayInstitutionsExport.rows)[number];
type YoramInstitutionLogoMap = Record<string, string>;

const evidenceByItemId = new Map<string, (typeof mondayAdmissionEvidenceRecords)[number]>(
  mondayAdmissionEvidenceRecords.map((record) => [record.itemId, record]),
);
const yoramLogosByInstituteId = yoramInstitutionLogos as YoramInstitutionLogoMap;

const PROFESSIONAL_SCHOOL_PATTERNS = [
  /בית\s*הספר/,
  /ביה"?ס/,
  /סטודיו/,
  /מכון/,
  /אקדמיה/,
  /academy/i,
  /school/i,
];

function cleanMondayItemName(name: string) {
  return name
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/\s*\.\d+\s*$/, '')
    .replace(/\\/g, '')
    .trim();
}

function extractUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.match(/https?:\/\/\S+/)?.[0] ?? null;
}

function hostnameFromUrl(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function yoramLogoFromSourceUrl(sourceUrl: string | null) {
  const instituteId = sourceUrl?.match(/yoram\.walla\.co\.il\/institute\/(\d+)/)?.[1];

  return instituteId ? (yoramLogosByInstituteId[instituteId] ?? null) : null;
}

function addArea(areas: Set<InstitutionAreaFilter>, area: InstitutionAreaFilter) {
  if (area !== 'all') {
    areas.add(area);
  }
}

function inferAreas(location: string | null, fallbackRegion: InstitutionRecord['region'] | null) {
  const areas = new Set<InstitutionAreaFilter>();
  const value = location ?? '';

  if (/אונליין|און\s*ליין|on-?line|online/i.test(value)) {
    addArea(areas, 'online');
  }
  if (/ירושלים/.test(value)) {
    addArea(areas, 'jerusalem');
  }
  if (/תל\s*אביב/.test(value)) {
    addArea(areas, 'tel_aviv');
  }
  if (/חיפה/.test(value)) {
    addArea(areas, 'haifa');
  }

  if (/גליל|גולן|חיפה|כרמיאל|צפת|כנרת|קרית\s*שמונה|קרית טבעון|עכו|עמק יזרעאל|נצרת|טבריה/.test(value)) {
    addArea(areas, 'north');
  }
  if (/באר\s*שבע|אילת|שדה\s*בוקר|נגב|שדרות|אשדוד|אשקלון|באר טוביה|קבוצת יבנה/.test(value)) {
    addArea(areas, 'south');
  }
  if (
    /תל\s*אביב|רמת\s*גן|הרצליה|ראשון\s*לציון|פתח\s*תקווה|נתניה|חולון|אריאל|רחובות|כפר\s*סבא|בני\s*ברק|רעננה|קרית\s*אונו|עמק\s*חפר|חדרה|אור\s*עקיבא/.test(
      value,
    )
  ) {
    addArea(areas, 'center');
  }

  if (areas.size === 0 && fallbackRegion && fallbackRegion !== 'any') {
    addArea(areas, fallbackRegion);
  }

  return [...areas];
}

function inferCategories(args: {
  id: string;
  name: string;
  type: string | null;
  diplomaType: string | null;
}) {
  const categories = new Set<InstitutionCategoryFilter>();
  const { id, name, type, diplomaType } = args;

  if (POPULAR_INSTITUTION_IDS.has(id)) {
    categories.add('popular');
  }
  if (type?.includes('אוניברסיטה')) {
    categories.add('universities');
  }
  if (type === 'מכללה ציבורית') {
    categories.add('public_colleges');
  }
  if (type === 'מכללה פרטית' || type === 'אוניברסיטה פרטית') {
    categories.add('private_colleges');
  }
  if (
    diplomaType === 'תעודה מקצועית' ||
    PROFESSIONAL_SCHOOL_PATTERNS.some((pattern) => pattern.test(name))
  ) {
    categories.add('professional_schools');
  }

  return [...categories];
}

function inferCredentials(args: {
  diplomaType: string | null;
  funding: string | null;
}) {
  const credentials = new Set<InstitutionCredentialFilter>();
  const { diplomaType, funding } = args;

  if (diplomaType === 'תואר אקדמי') {
    credentials.add('academic_degree');
  }
  if (diplomaType === 'תעודה מקצועית') {
    credentials.add('professional_certificate');
  }
  if (funding === 'מסובסד') {
    credentials.add('subsidized');
  }
  if (funding === 'לא מסובסד') {
    credentials.add('unsubsidized');
  }

  return [...credentials];
}

export function getInstitutionDirectoryItems(): InstitutionDirectoryItem[] {
  return mondayInstitutionsExport.rows
    .filter((row: MondayInstitutionExportRow) => !EXCLUDED_MONDAY_ITEM_IDS.has(row.itemId))
    .map((row: MondayInstitutionExportRow) => {
    const evidence = evidenceByItemId.get(row.itemId);
    const id = evidence?.catalogueInstitutionId ?? `mon_${row.itemId}`;
    const institution = INSTITUTION_BY_ID[id as keyof typeof INSTITUTION_BY_ID];
    const override = DIRECTORY_LOGO_OVERRIDES[id];
    const name =
      institution?.name ?? evidence?.displayName ?? cleanMondayItemName(row.itemName);
    const sourceUrl =
      override?.sourceUrl ??
      extractUrl(row.officialSource) ??
      extractUrl(row.calculatorLink) ??
      extractUrl(row.additionalLink) ??
      evidence?.officialUrls[0] ??
      institution?.programUrl ??
      institution?.calculatorUrl ??
      null;
    const domain = override?.domain ?? institution?.domain ?? hostnameFromUrl(sourceUrl);
    const yoramLogoUrl = yoramLogoFromSourceUrl(sourceUrl);

    return {
      id,
      itemId: row.itemId,
      name,
      mondayUrl: row.mondayUrl,
      type: row.institutionType,
      funding: row.funding,
      location: row.location,
      diplomaType: row.diplomaType,
      sourceUrl,
      domain,
      logoUrl: override?.logoUrl ?? institution?.logoUrl ?? yoramLogoUrl,
      areas: inferAreas(row.location, institution?.region ?? null),
      categories: inferCategories({
        id,
        name,
        type: row.institutionType,
        diplomaType: row.diplomaType,
      }),
      credentials: inferCredentials({
        diplomaType: row.diplomaType,
        funding: row.funding,
      }),
      coverageLevel: row.coverageLevel ?? evidence?.publicBucket ?? null,
      confidence: row.confidenceLevel ?? evidence?.confidence ?? null,
      launchPriority:
        row.launchPriority ??
        (evidence?.catalogueVisibility === 'catalogue_mapped' ? 'Product Ready' : null),
    };
  });
}
