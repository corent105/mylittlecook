import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // All matched routes require authentication
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect all routes except home, auth pages, and API routes
export const config = {
  matcher: [
    "/planning/:path*",
    "/recettes/:path*",
    "/liste-de-courses/:path*",
    "/admin/:path*"
  ]
};