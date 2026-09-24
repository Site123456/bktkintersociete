import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Pages that need a signed-in person (API routes check access themselves and answer 401/403).
const isPrivatePage = createRouteMatcher(["/deliveries(.*)", "/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPrivatePage(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
