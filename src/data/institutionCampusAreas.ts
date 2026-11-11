import type { GeographicRegion } from '@/types';
import type { InstitutionAreaFilter } from './institutionDirectory';

// Directory campus geography is independent of calculator/catalogue region labels.
// https://www.ariel.ac.il/wp/marketing/wp-content/uploads/sites/208/2026/06/OpenDayMap1.6.2026_JUN_N_print-4.pdf
// https://www.ono.ac.il/ono-map/ (three campuses: Kiryat Ono, Jerusalem and Haifa)
const CAMPUS_AREAS: Readonly<Record<string, readonly InstitutionAreaFilter[]>> = {
  ariel: [],
  ono: ['center', 'jerusalem', 'haifa', 'north'],
  // https://www.openu.ac.il/about/departments/marom/Pages/default.aspx
  open_university: ['center', 'tel_aviv', 'jerusalem', 'haifa', 'north', 'south', 'online'],
  // https://www.reidman.co.il/דרכי-הגעה-לקמפוסים
  reidman: ['center', 'tel_aviv', 'jerusalem', 'haifa', 'north', 'south'],
  // https://www.johnbryce.co.il/wp-content/uploads/2026/05/תקנון-מרכז-הדרכה-גון-ברייס-14.1.26.pdf
  johnbryce: ['center', 'tel_aviv', 'jerusalem', 'haifa', 'north'],
};

export function directoryCampusAreas(
  id: string,
  location: string | null,
  fallbackRegion: GeographicRegion | null,
) {
  const known = CAMPUS_AREAS[id];
  if (known) return [...known];
  const areas = new Set<InstitutionAreaFilter>();
  // Imported addresses end with the city. Street names are not campus geography.
  const parts = (location ?? '').split(',');
  const address = /[0-9]|רחוב|שדרות|דרך|קניון/.test(parts.slice(0, -1).join(','));
  const value = (address ? parts.at(-1) : location)?.trim() ?? '';
  // Ariel has no matching option in this directory; keep it discoverable in All.
  if (value === 'אריאל') return [];

  if (/אונליין|און\s*ליין|on-?line|online/i.test(value)) {
    areas.add('online');
  }
  if (/ירושלים/.test(value)) {
    areas.add('jerusalem');
  }
  if (/תל\s*אביב/.test(value)) {
    areas.add('tel_aviv');
  }
  if (/חיפה/.test(value)) {
    areas.add('haifa');
  }

  if (
    /גליל|גולן|חיפה|כרמיאל|צפת|כנרת|קרית\s*שמונה|קרית טבעון|עכו|עמק יזרעאל|נצרת|טבריה/.test(value)
  ) {
    areas.add('north');
  }
  if (/באר\s*שבע|אילת|שדה\s*בוקר|נגב|שדרות|אשדוד|אשקלון|באר טוביה|קבוצת יבנה/.test(value)) {
    areas.add('south');
  }
  if (
    /תל\s*אביב|רמת\s*גן|הרצליה|ראשון\s*לציון|פתח\s*תקווה|נתניה|חולון|רחובות|כפר\s*סבא|בני\s*ברק|רעננה|קרית\s*אונו|עמק\s*חפר|חדרה|אור\s*עקיבא/.test(
      value,
    )
  ) {
    areas.add('center');
  }

  if (areas.size === 0 && fallbackRegion && fallbackRegion !== 'any') {
    areas.add(fallbackRegion);
  }

  return [...areas];
}
