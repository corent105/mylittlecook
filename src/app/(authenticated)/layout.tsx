import { ReactNode } from "react";
import {notFound, redirect} from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    // If the user is not authenticated, return the 404 page as requested
    notFound();
  }
  
  if (!session.user.hasCompletedOnboarding) {
    redirect('/onboarding/foyer');
  }

  return <>{children}</>;
}
