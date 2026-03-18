-- Check athletes from screenshot by partial IDs
SELECT "globalId", "name", "cpf", "birthDate" 
FROM athlete_profiles 
WHERE "globalId" ILIKE '%cmrv%' 
ORDER BY "createdAt" DESC;
