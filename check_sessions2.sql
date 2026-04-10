SELECT 
  id, 
  "matchId", 
  status, 
  "isActive", 
  "endedAt",
  CASE WHEN "finalStateSnapshot" IS NOT NULL THEN 'SIM' ELSE 'NULL' END as "temSnapshot",
  LENGTH("finalStateSnapshot") as "tamanhoSnapshot"
FROM match_annotation_sessions 
ORDER BY "startedAt" DESC 
LIMIT 10;
