-- CreateEnum
CREATE TYPE "public"."RecipeCategoryType" AS ENUM ('BREAKFAST', 'APPETIZER', 'STARTER', 'MAIN_COURSE', 'SIDE_DISH', 'DESSERT', 'BEVERAGE');

-- CreateTable
CREATE TABLE "public"."recipe_types" (
    "id" TEXT NOT NULL,
    "type" "public"."RecipeCategoryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipeId" TEXT NOT NULL,

    CONSTRAINT "recipe_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_types_recipeId_type_key" ON "public"."recipe_types"("recipeId", "type");

-- AddForeignKey
ALTER TABLE "public"."recipe_types" ADD CONSTRAINT "recipe_types_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
