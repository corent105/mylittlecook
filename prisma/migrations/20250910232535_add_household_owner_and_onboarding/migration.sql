/*
  Warnings:

  - You are about to drop the column `projectId` on the `meal_plans` table. All the data in the column will be lost.
  - You are about to drop the `project_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projects` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."meal_plans" DROP CONSTRAINT "meal_plans_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."project_members" DROP CONSTRAINT "project_members_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."project_members" DROP CONSTRAINT "project_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_ownerId_fkey";

-- DropIndex
DROP INDEX "public"."meal_plans_projectId_week_dayOfWeek_mealType_key";

-- AlterTable
ALTER TABLE "public"."meal_plans" DROP COLUMN "projectId";

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "public"."project_members";

-- DropTable
DROP TABLE "public"."projects";

-- DropEnum
DROP TYPE "public"."ProjectRole";

-- CreateTable
CREATE TABLE "public"."meal_users" (
    "id" TEXT NOT NULL,
    "pseudo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "meal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."meal_plan_assignments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealPlanId" TEXT NOT NULL,
    "mealUserId" TEXT NOT NULL,

    CONSTRAINT "meal_plan_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_settings" (
    "id" TEXT NOT NULL,
    "defaultPeopleCount" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_assignments_mealPlanId_mealUserId_key" ON "public"."meal_plan_assignments"("mealPlanId", "mealUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "public"."user_settings"("userId");

-- AddForeignKey
ALTER TABLE "public"."meal_users" ADD CONSTRAINT "meal_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_users" ADD CONSTRAINT "meal_users_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_plan_assignments" ADD CONSTRAINT "meal_plan_assignments_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "public"."meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_plan_assignments" ADD CONSTRAINT "meal_plan_assignments_mealUserId_fkey" FOREIGN KEY ("mealUserId") REFERENCES "public"."meal_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
