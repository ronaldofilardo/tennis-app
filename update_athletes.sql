UPDATE athlete_profiles 
SET "createdByUserId" = 'cmpgvvnjz0000hpvsb9efuspi' 
WHERE "createdByUserId" IS NULL;

SELECT id, name, "createdByUserId" FROM athlete_profiles LIMIT 20;
