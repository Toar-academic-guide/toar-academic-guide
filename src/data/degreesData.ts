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
];
