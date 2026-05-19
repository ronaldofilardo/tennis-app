DELETE FROM match_annotation_sessions WHERE status = 'IN_PROGRESS' AND "endedAt" IS NULL;
SELECT COUNT(*) as deleted_sessions;
