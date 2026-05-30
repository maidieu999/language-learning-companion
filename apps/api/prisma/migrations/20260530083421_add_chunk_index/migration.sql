/*
  Warnings:

  - Added the required column `chunkIndex` to the `Chunk` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chunk" ADD COLUMN     "chunkIndex" INTEGER NOT NULL;
