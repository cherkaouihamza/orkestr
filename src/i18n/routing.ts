import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  pathnames: {
    "/": "/",
    "/login": "/login",
    "/register": "/register",
    "/spaces": "/spaces",
    "/spaces/new": "/spaces/new",
    "/events/[eventId]": "/events/[eventId]",
    "/events/[eventId]/overview": "/events/[eventId]/overview",
    "/events/[eventId]/participants": "/events/[eventId]/participants",
    "/events/[eventId]/teams": "/events/[eventId]/teams",
    "/events/[eventId]/milestones": "/events/[eventId]/milestones",
    "/events/[eventId]/jury": "/events/[eventId]/jury",
    "/events/[eventId]/settings": "/events/[eventId]/settings",
    "/my-events/[eventId]": "/my-events/[eventId]",
  },
});

export type Locale = (typeof routing.locales)[number];
