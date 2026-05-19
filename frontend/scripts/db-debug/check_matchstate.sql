-- Verificar se matchState tem pointsHistory para a partida em questão
SELECT 
  id,
  status,
  CASE 
    WHEN "matchState" IS NOT NULL THEN 'TEM matchState'
    ELSE 'SEM matchState'
  END as "temMatchState",
  CASE 
    WHEN "matchState"::text LIKE '%pointsHistory%' THEN 'TEM pointsHistory'
    ELSE 'SEM pointsHistory'
  END as "temPointsHistory",
  LENGTH("matchState"::text) as "tamanho"
FROM matches 
WHERE id = 'cmnspyvha0003hprgtt2ke70v'
   OR id IN (
     SELECT "matchId" FROM match_annotation_sessions 
     ORDER BY "startedAt" DESC LIMIT 5
   )
ORDER BY "updatedAt" DESC
LIMIT 5;
