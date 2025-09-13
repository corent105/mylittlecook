-- AlterTable
ALTER TABLE "public"."meal_plans" ADD COLUMN     "cookResponsibleId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."meal_plans" ADD CONSTRAINT "meal_plans_cookResponsibleId_fkey" FOREIGN KEY ("cookResponsibleId") REFERENCES "public"."meal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
