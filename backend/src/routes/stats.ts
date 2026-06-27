import { Router } from "express";
import { db } from "../db/db.js";
import { checkAndEscalateSlaBreaches } from "../services/escalation.js";
import { issues, categories } from "../db/schema/index.js";
import { count, eq, inArray, isNotNull, sql, notInArray, and } from "drizzle-orm";

export const statsRouter = Router();

statsRouter.get("/", async (req, res) => {
  // Hackathon-scale inline check for SLA breaches
  checkAndEscalateSlaBreaches().catch(console.error);

  try {
    // 1. Total issue count
    const [totalIssuesResult] = await db.select({ value: count() }).from(issues);
    const totalIssues = totalIssuesResult.value;

    // 2. Resolved count (status in resolved/closed)
    const [resolvedCountResult] = await db
      .select({ value: count() })
      .from(issues)
      .where(inArray(issues.status, ["resolved", "closed"]));
    const resolvedCount = resolvedCountResult.value;

    // 3. Average resolution time in hours
    const avgResTimeQuery = sql`
      WITH resolved_issues AS (
        SELECT id FROM issues WHERE status IN ('resolved', 'closed')
      ),
      first_reported AS (
        SELECT issue_id, MIN(created_at) as reported_at 
        FROM issue_status_history 
        WHERE to_status = 'reported' 
        GROUP BY issue_id
      ),
      first_resolved AS (
        SELECT issue_id, MIN(created_at) as resolved_at 
        FROM issue_status_history 
        WHERE to_status IN ('resolved', 'closed') 
        GROUP BY issue_id
      )
      SELECT AVG(EXTRACT(EPOCH FROM (r.resolved_at - rep.reported_at)) / 3600) as avg_resolution_hours
      FROM resolved_issues i
      JOIN first_reported rep ON i.id = rep.issue_id
      JOIN first_resolved r ON i.id = r.issue_id
    `;
    const avgResTimeRes = await db.execute(avgResTimeQuery);
    const averageResolutionHours = Number(avgResTimeRes.rows[0]?.avg_resolution_hours || 0);

    // 4. Count grouped by category name
    const categoryCountsRes = await db
      .select({
        categoryName: categories.name,
        count: count(issues.id),
      })
      .from(issues)
      .leftJoin(categories, eq(issues.categoryId, categories.id))
      .groupBy(categories.name);

    const issuesByCategory = categoryCountsRes.reduce((acc, row) => {
      const name = row.categoryName || "uncategorized";
      acc[name] = row.count;
      return acc;
    }, {} as Record<string, number>);

    // 5. Count grouped by status
    const statusCountsRes = await db
      .select({
        status: issues.status,
        count: count(),
      })
      .from(issues)
      .groupBy(issues.status);

    const issuesByStatus = statusCountsRes.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);

    // 6. Count of currently SLA-breached issues
    const [slaBreachedResult] = await db
      .select({ value: count() })
      .from(issues)
      .where(
        and(
          isNotNull(issues.slaDeadline),
          sql`${issues.slaDeadline} < NOW()`,
          notInArray(issues.status, ["resolved", "closed"])
        )
      );
    const slaBreachedCount = slaBreachedResult.value;

    res.json({
      totalIssues,
      resolvedCount,
      averageResolutionHours,
      issuesByCategory,
      issuesByStatus,
      slaBreachedCount,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

statsRouter.get("/hotspots", async (req, res) => {
  try {
    const query = sql`
      WITH current_period AS (
        SELECT ward_id, category_id, count(id) as current_count
        FROM issues
        WHERE ward_id IS NOT NULL 
          AND category_id IS NOT NULL
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY ward_id, category_id
      ),
      previous_period AS (
        SELECT ward_id, category_id, count(id) as previous_count
        FROM issues
        WHERE ward_id IS NOT NULL 
          AND category_id IS NOT NULL
          AND created_at >= NOW() - INTERVAL '60 days'
          AND created_at < NOW() - INTERVAL '30 days'
        GROUP BY ward_id, category_id
      )
      SELECT 
        w.name as "wardName", 
        c.name as "categoryName", 
        COALESCE(cp.current_count, 0)::int as "currentCount", 
        COALESCE(pp.previous_count, 0)::int as "previousCount"
      FROM current_period cp
      FULL OUTER JOIN previous_period pp ON cp.ward_id = pp.ward_id AND cp.category_id = pp.category_id
      JOIN wards w ON w.id = COALESCE(cp.ward_id, pp.ward_id)
      JOIN categories c ON c.id = COALESCE(cp.category_id, pp.category_id)
      ORDER BY "currentCount" DESC
      LIMIT 10
    `;

    const result = await db.execute(query);
    const hotspots = result.rows.map((row: any) => {
      const currentCount = row.currentCount;
      const previousCount = row.previousCount;
      let trend = "stable";
      if (currentCount > previousCount) trend = "rising";
      else if (currentCount < previousCount) trend = "falling";

      return {
        wardName: row.wardName,
        categoryName: row.categoryName,
        currentCount,
        previousCount,
        trend
      };
    });

    res.json({ hotspots });
  } catch (error) {
    console.error("Error fetching hotspots:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
