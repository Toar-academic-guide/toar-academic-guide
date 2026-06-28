import { University } from '@/types';

// University definitions — formula types and sekhem weights.
// Program/degree data has moved to src/data/degrees/.
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
  {
    id: 'haifa',
    name: 'אוניברסיטת חיפה',
    formulaType: 'weighted_scaled',
    sekhemWeight: { psy: 0.75, bag: 0.25 },
    scaleDescription: 'סכם 200–800 (יחס 1:3 בגרות:פסיכומטרי — רוב החוגים)',
  },
  {
    id: 'biu',
    name: 'אוניברסיטת בר-אילן',
    formulaType: 'weighted_scaled',
    sekhemWeight: { psy: 0.6, bag: 0.4 },
    scaleDescription: 'סכם 200–800',
  },
  {
    id: 'ariel',
    name: 'אוניברסיטת אריאל',
    formulaType: 'weighted_scaled',
    sekhemWeight: { psy: 0.5, bag: 0.5 },
    scaleDescription: 'סכם 200–800 (משקל שווה פסיכומטרי ובגרות)',
  },
  {
    id: 'reichman',
    name: 'אוניברסיטת רייכמן',
    formulaType: 'weighted_scaled',
    sekhemWeight: { psy: 0.5, bag: 0.5 },
    scaleDescription: 'מדד קבלה רייכמן',
  },
  {
    id: 'afeka',
    name: 'מכללת אפקה',
    formulaType: 'weighted_scaled',
    sekhemWeight: { psy: 0.5, bag: 0.5 },
    scaleDescription: 'ציון התאמה אפקה',
  },
  {
    id: 'hit',
    name: 'המכון הטכנולוגי חולון (HIT)',
    formulaType: 'minimum_floors',
    scaleDescription: 'סף קבלה HIT',
  },
];
