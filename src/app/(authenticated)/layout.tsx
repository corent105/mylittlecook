'use client';

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { useRouter } from "next/navigation";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to sign in if not authenticated
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-orange-600 border-t-transparent"></div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    router.push("/auth/signin");
    return null;
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
}
