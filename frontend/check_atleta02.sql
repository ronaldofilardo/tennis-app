-- Check Atleta 02 complete data including user and club membership
SELECT 
  ap."globalId", 
  ap."name", 
  ap."cpf", 
  ap."birthDate",
  u."id" as user_id,
  u."email",
  cm."id" as membership_id,
  cm."clubId",
  cm."role",
  cm."status"
FROM athlete_profiles ap
LEFT JOIN users u ON ap."userId" = u."id"
LEFT JOIN club_memberships cm ON u."id" = cm."userId"
WHERE ap."name" = 'Atleta 02'
ORDER BY cm."joinedAt" DESC;
