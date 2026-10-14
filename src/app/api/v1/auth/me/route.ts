import { ok, options, serializeUser, withSession } from "@/server/api";

export const OPTIONS = options;
export const GET = withSession(async (req, user) => ok(req, serializeUser(user)));
