/** Additional grades used by BGU's current engineering calculator. */
export interface BguEngineeringInputs {
  /** All applicable subject, preparatory and diploma grades have been entered. */
  detailsConfirmed: boolean;
  route?: 'auto' | 'engineering_score' | 'direct';
  physicsCoursePassed?: boolean;
  preparatoryInstitution?: 'bgu' | 'technion';
  preparatoryCompletionYear?: number;
  preparatoryMathUnits?: 4 | 5;
  preparatoryMathGrade?: number;
  preparatoryPhysicsUnits?: 4 | 5;
  preparatoryPhysicsGrade?: number;
  /** BGU precise-sciences/engineering preparatory average for the direct Industrial route. */
  industrialPreparatoryAverage?: number;
  /** Confirms a completed, recognized practical-engineer diploma, not a technician certificate. */
  diplomaRecognized?: boolean;
  diplomaMathHours?: number;
  diplomaMathGrade?: number;
  diplomaPhysicsHours?: number;
  diplomaPhysicsGrade?: number;
}
