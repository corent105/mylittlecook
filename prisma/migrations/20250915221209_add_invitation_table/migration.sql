/*
  Warnings:

  - You are about to drop the `user_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."user_settings" DROP CONSTRAINT "user_settings_userId_fkey";

-- DropTable
DROP TABLE "public"."user_settings";

-- CreateTable
CREATE TABLE "public"."profile_invitations" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "profileName" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,
    "mealUserId" TEXT NOT NULL,

    CONSTRAINT "profile_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_invitations_token_key" ON "public"."profile_invitations"("token");

-- AddForeignKey
ALTER TABLE "public"."profile_invitations" ADD CONSTRAINT "profile_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."profile_invitations" ADD CONSTRAINT "profile_invitations_mealUserId_fkey" FOREIGN KEY ("mealUserId") REFERENCES "public"."meal_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
