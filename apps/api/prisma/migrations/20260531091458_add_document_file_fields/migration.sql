-- CreateEnum
CREATE TYPE "DocumentSourceType" AS ENUM ('PASTE', 'PDF', 'TEXT_FILE');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalFilename" TEXT,
ADD COLUMN     "sourceType" "DocumentSourceType" NOT NULL DEFAULT 'PASTE',
ADD COLUMN     "storedFileKey" TEXT;
