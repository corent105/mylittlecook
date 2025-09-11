import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      hasCompletedOnboarding?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    hasCompletedOnboarding?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    uid?: string;
    hasCompletedOnboarding?: boolean;
  }
}