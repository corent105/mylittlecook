import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id;
        // Récupérer les informations complètes de l'utilisateur depuis la base de données
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { hasCompletedOnboarding: true }
        });
        session.user.hasCompletedOnboarding = dbUser?.hasCompletedOnboarding ?? false;
      }
      return session;
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id;
        token.hasCompletedOnboarding = user.hasCompletedOnboarding;
      }
      return token;
    },
  },
  session: {
    strategy: "database",
  },
};