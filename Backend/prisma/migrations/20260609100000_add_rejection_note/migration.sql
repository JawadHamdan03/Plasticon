-- Add rejectionNote column to Quotation table (safe: adds only if missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Quotation' AND column_name = 'rejectionNote'
  ) THEN
    ALTER TABLE "Quotation" ADD COLUMN "rejectionNote" TEXT;
  END IF;
END $$;
