SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'matches' AND column_name = 'publicMatchCode'
) as column_exists;
