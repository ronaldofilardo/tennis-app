-- Check both athletes with full profile data
SELECT 
  ap."globalId", 
  ap."name", 
  ap."cpf", 
  ap."birthDate",
  u."email",
  cm."role",
  cm."status"
FROM athlete_profiles ap
LEFT JOIN users u ON ap."userId" = u."id"
LEFT JOIN club_memberships cm ON u."id" = cm."userId"
WHERE ap."name" IN ('Atleta Play', 'Atleta 02')
ORDER BY ap."createdAt" DESC;
