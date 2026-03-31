/*
  Warnings:

  - You are about to drop the column `userId` on the `ChatGroup` table. All the data in the column will be lost.
  - You are about to drop the column `isRead` on the `GroupMessage` table. All the data in the column will be lost.
  - The `capsStatus` column on the `QualityCheck` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `preformStatus` column on the `QualityCheck` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Machine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Maintenance` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Notification` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `QualityCheck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Supplier` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('OPERATIONAL', 'UNDER_MAINTENANCE', 'BROKEN', 'OFFLINE', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "DowntimeReason" AS ENUM ('BELT_FAILURE', 'MOTOR_ISSUE', 'HYDRAULIC_FAILURE', 'SEAL_LEAK', 'ELECTRICAL', 'SENSOR_MALFUNCTION', 'SCHEDULED_MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('PASS', 'FAIL', 'REWORK_REQUIRED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CHAT_MESSAGE', 'PRODUCTION_ALERT', 'MAINTENANCE_URGENT', 'QUALITY_ISSUE', 'SYSTEM_MESSAGE', 'PAYROLL_READY', 'INVENTORY_LOW');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PROFILE_IMAGE', 'ID_IMAGE', 'INVOICE', 'MACHINE_READING', 'MAINTENANCE_REPORT', 'QUALITY_REPORT');

-- CreateEnum
CREATE TYPE "GroupCategory" AS ENUM ('DEPARTMENT', 'TEAM', 'PROJECT', 'GENERAL');

-- DropForeignKey
ALTER TABLE "ChatGroup" DROP CONSTRAINT "ChatGroup_userId_fkey";

-- AlterTable
ALTER TABLE "ChatGroup" DROP COLUMN "userId",
ADD COLUMN     "category" "GroupCategory" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "GroupMessage" DROP COLUMN "isRead";

-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "MachineStatus" NOT NULL DEFAULT 'OPERATIONAL',
ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedBy" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Maintenance" ADD COLUMN     "downtimeReason" "DowntimeReason" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "chatGroupId" INTEGER,
ADD COLUMN     "machineId" INTEGER,
ADD COLUMN     "productionId" INTEGER,
ADD COLUMN     "readAt" TIMESTAMP(3),
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "QualityCheck" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "capsStatus",
ADD COLUMN     "capsStatus" "QualityStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
DROP COLUMN "preformStatus",
ADD COLUMN     "preformStatus" "QualityStatus" NOT NULL DEFAULT 'PENDING_REVIEW';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "changes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAttachment" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileType" "FileType" NOT NULL,
    "userId" INTEGER,
    "purchaseId" INTEGER,
    "saleId" INTEGER,
    "machineReadingId" INTEGER,
    "maintenanceId" INTEGER,
    "qualityCheckId" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_statusChangedBy_fkey" FOREIGN KEY ("statusChangedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "ChatGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "ProductionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_machineReadingId_fkey" FOREIGN KEY ("machineReadingId") REFERENCES "MachineReading"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "Maintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_qualityCheckId_fkey" FOREIGN KEY ("qualityCheckId") REFERENCES "QualityCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
