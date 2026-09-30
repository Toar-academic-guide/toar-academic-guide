import { z } from 'zod';

export const colmanBagrutInputsShape = {
  colmanBagrutAverage: z.number().min(50).max(130).optional(),
  colmanBagrutCertificateConfirmed: z.boolean().optional(),
};
export const COLMAN_CS_PROGRAM_URL = 'https://www.colman.ac.il/academics/ba/computer-science/';
export const COLMAN_BAGRUT_CALCULATOR_URL =
  'https://wwwi.colman.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1';
