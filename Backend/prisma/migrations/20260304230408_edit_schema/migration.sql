/*
  Warnings:

  - Made the column `invoiceImage` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `invoiceImage` on table `Sale` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('CAPS', 'PREFORM');

-- CreateEnum
CREATE TYPE "InventoryAuditFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_shiftId_fkey";

-- AlterTable
ALTER TABLE "Attendance" ALTER COLUMN "shiftId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Maintenance" ADD COLUMN     "imagePath" TEXT,
ALTER COLUMN "downtimeMinutes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Purchase" ALTER COLUMN "invoiceImage" SET NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "invoiceImage" SET NOT NULL;

-- CreateTable
CREATE TABLE "ProductionSetting" (
    "id" SERIAL NOT NULL,
    "productType" "ProductType" NOT NULL,
    "piecesPerCarton" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" SERIAL NOT NULL,
    "qualityCheckIntervalMinutes" INTEGER NOT NULL,
    "qualityCheckReminderMinutes" INTEGER NOT NULL,
    "inventoryAuditFrequency" "InventoryAuditFrequency" NOT NULL,
    "shiftEndReminderMinutes" INTEGER NOT NULL,
    "weeklyReportDayOfWeek" INTEGER NOT NULL,
    "weeklyReportTime" TEXT NOT NULL,
    "monthlyReportDayOfMonth" INTEGER NOT NULL,
    "monthlyReportTime" TEXT NOT NULL,
    "updatedById" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionSetting_productType_key" ON "ProductionSetting"("productType");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionSetting" ADD CONSTRAINT "ProductionSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
