SELECT id, "matchId", status, "isActive", "endedAt", "finalStateSnapshot" 
FROM match_annotation_sessions 
ORDER BY "startedAt" DESC 
LIMIT 5;
