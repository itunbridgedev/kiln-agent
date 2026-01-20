-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "studioId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "studioId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "parentCategoryId" INTEGER,
ALTER COLUMN "studioId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ProductCategory_parentCategoryId_idx" ON "ProductCategory"("parentCategoryId");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
