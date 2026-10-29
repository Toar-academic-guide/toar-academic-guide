-- FILE ONLY. Jorje: run after production deploy is READY, before applying the repair.
-- Save these actual rows outside the database; they override the repository-based rollback assumption.
SELECT id, program_id, institution_id, specific_admission_notes
FROM public.admission_requirements
WHERE institution_id = 'bgu' AND program_id IN ('business', 'bgu_business')
ORDER BY program_id, id;
