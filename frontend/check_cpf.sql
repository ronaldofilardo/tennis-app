-- Check athletes with CPF
SELECT "globalId", "name", "cpf", "birthDate" 
FROM athlete_profiles 
WHERE cpf IS NOT NULL AND cpf != ''
ORDER BY "createdAt" DESC
LIMIT 20;
