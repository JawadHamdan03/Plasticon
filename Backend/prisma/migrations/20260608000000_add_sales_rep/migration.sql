-- Add SALES_REP to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SALES_REP';

-- Add assignedSalesRepId to Customer (safe to run multiple times via DO block)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Customer' AND column_name = 'assignedSalesRepId'
  ) THEN
    ALTER TABLE "Customer" ADD COLUMN "assignedSalesRepId" INTEGER;
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedSalesRepId_fkey"
      FOREIGN KEY ("assignedSalesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- QuotationStatus enum
DO $$ BEGIN
  CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Quotation table
CREATE TABLE IF NOT EXISTS "Quotation" (
  "id"          SERIAL PRIMARY KEY,
  "customerId"  INTEGER NOT NULL,
  "createdById" INTEGER NOT NULL,
  "status"      "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
  "notes"       TEXT,
  "validUntil"  TIMESTAMP(3),
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("customerId")  REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("createdById") REFERENCES "User"("id")     ON DELETE RESTRICT ON UPDATE CASCADE
);

-- QuotationItem table
CREATE TABLE IF NOT EXISTS "QuotationItem" (
  "id"           SERIAL PRIMARY KEY,
  "quotationId"  INTEGER NOT NULL,
  "productType"  TEXT NOT NULL,
  "size"         TEXT NOT NULL,
  "quantity"     DOUBLE PRECISION NOT NULL,
  "pricePerUnit" DOUBLE PRECISION NOT NULL,
  FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CustomerVisit table
CREATE TABLE IF NOT EXISTS "CustomerVisit" (
  "id"          SERIAL PRIMARY KEY,
  "customerId"  INTEGER NOT NULL,
  "loggedById"  INTEGER NOT NULL,
  "visitDate"   TIMESTAMP(3) NOT NULL,
  "outcome"     TEXT,
  "notes"       TEXT,
  "nextVisitAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("loggedById") REFERENCES "User"("id")     ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CustomerVisit_visitDate_idx" ON "CustomerVisit"("visitDate");

-- SalesTarget table
CREATE TABLE IF NOT EXISTS "SalesTarget" (
  "id"             SERIAL PRIMARY KEY,
  "repId"          INTEGER NOT NULL,
  "month"          INTEGER NOT NULL,
  "year"           INTEGER NOT NULL,
  "targetAmount"   DOUBLE PRECISION NOT NULL,
  "achievedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("repId", "month", "year")
);
