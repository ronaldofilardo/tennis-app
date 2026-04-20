SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'matches' AND (indexname LIKE '%publicMatchCode%' OR indexdef LIKE '%publicMatchCode%')
ORDER BY indexname;
