-- Remove auto-assigned patients (seed assigned all patients; should be selective)
DELETE FROM "nurse_patient_assignments";

-- Remove the auto-created nurse profile if it was seeded without proper assignment
-- (keep it — the nurse user needs the profile to authenticate)
