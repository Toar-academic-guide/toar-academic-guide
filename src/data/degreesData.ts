import { University, Degree } from '@/types';

// Thresholds for TAU / HUJI / BGU are on the 200–800 Sekhem scale.
// Technion thresholds are on its own 60–100 Sekhem scale (official formula).
// All values approximate the real yearly cutoffs based on public CHE / university data.

export const UNIVERSITIES: University[] = [
  {
    id: 'tau',
    name: 'אוניברסיטת תל אביב',
    formulaType: 'weighted_scaled',
    sekhemWeight: { psy: 0.6, bag: 0.4 },
    scaleDescription: 'סכם 200–800',
  },
  {
    id: 'huji',
    name: 'האוניברסיטה העברית בירושלים',
    formulaType: 'weighted_scaled',
    sekhemWeight: { psy: 0.55, bag: 0.45 },
    scaleDescription: 'סכם 200–800',
  },
  {
    id: 'technion',
    name: 'הטכניון – מכון טכנולוגי לישראל',
    formulaType: 'technion_linear',
    scaleDescription: 'סכם 60–100',
  },
  {
    id: 'bgu',
    name: 'אוניברסיטת בן-גוריון בנגב',
    formulaType: 'weighted_scaled',
    sekhemWeight: { psy: 0.45, bag: 0.55 },
    scaleDescription: 'סכם 200–800',
  },
];

export const DEGREES: Degree[] = [
  {
    id: 'cs',
    name: 'מדעי המחשב',
    // TAU/HUJI/BGU: weighted scale (200–800) | Technion: linear scale (60–100)
    // TAU threshold is calibrated for the Engineering Index (with Math5+Physics5 bonuses).
    thresholds: { tau: 700, huji: 690, technion: 92, bgu: 645 },
    isTauEngineering: true,
  },
  {
    id: 'ee',
    name: 'הנדסת חשמל',
    thresholds: { tau: 655, huji: null, technion: 88, bgu: 615 },
    isTauEngineering: true,
  },
  {
    id: 'psychology',
    name: 'פסיכולוגיה',
    thresholds: { tau: 720, huji: 725, technion: null, bgu: 675 },
    isTauEngineering: false,
    // HUJI offers a direct admission track (קבלה ישירה) for Psychology:
    // applicants with psychometric ≥ 660 are admitted without meeting the combined index.
    directPsychometric: { huji: 660 },
  },
  {
    id: 'me',
    name: 'הנדסת מכונות',
    thresholds: { tau: 640, huji: null, technion: 86, bgu: 595 },
    isTauEngineering: true,
  },
  {
    id: 'medicine',
    name: 'רפואה',
    // Technion: Rappaport Faculty of Medicine
    thresholds: { tau: 770, huji: 775, technion: 94, bgu: 760 },
    isTauEngineering: false,
  },
  {
    id: 'law',
    name: 'משפטים',
    thresholds: { tau: 695, huji: 705, technion: null, bgu: 650 },
    isTauEngineering: false,
  },
  {
    id: 'business',
    name: 'מנהל עסקים',
    thresholds: { tau: 640, huji: 630, technion: null, bgu: 590 },
    isTauEngineering: false,
  },
  {
    id: 'economics',
    name: 'כלכלה',
    thresholds: { tau: 670, huji: 660, technion: null, bgu: 615 },
    isTauEngineering: false,
  },
  {
    id: 'datascience',
    name: 'מדעי הנתונים',
    thresholds: { tau: 688, huji: 678, technion: 90, bgu: 635 },
    isTauEngineering: true,
  },
];
