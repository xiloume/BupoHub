import { ok, options, withSession } from "@/server/api";
import { getAdminStats } from "@/server/admin/stats";

export const OPTIONS = options;
export const GET = withSession(async (req) => {
  const { recentAudit: _a, recentUsers: _u, ...stats } = await getAdminStats();
  return ok(req, stats);
}, "admin.stats");
