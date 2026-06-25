import { db } from "../db/db.js";
import { sql } from "drizzle-orm";
import { issueStatusHistory } from "../db/schema/index.js";

export async function checkAndEscalateSlaBreaches() {
  try {
    const query = sql`
      SELECT id, status, sla_deadline
      FROM issues
      WHERE sla_deadline < now()
        AND status NOT IN ('resolved', 'closed', 'rejected')
        AND NOT EXISTS (
          SELECT 1 FROM issue_status_history
          WHERE issue_id = issues.id
            AND note LIKE 'SLA breached%'
        )
    `;
    const res = await db.execute(query);
    const breachedIssues = res.rows as any[];

    if (breachedIssues.length === 0) return;

    const newHistories = breachedIssues.map(row => {
      const slaDate = new Date(row.sla_deadline);
      const exceededMs = Date.now() - slaDate.getTime();
      const exceededHours = Math.floor(exceededMs / (1000 * 60 * 60));
      
      return {
        issueId: row.id,
        fromStatus: row.status as any,
        toStatus: row.status as any,
        changedBy: null,
        note: `SLA breached — auto-escalated, exceeded deadline by ${Math.max(1, exceededHours)} hours`,
      };
    });

    await db.insert(issueStatusHistory).values(newHistories);
    console.log(`Auto-escalated ${newHistories.length} breached issues.`);
  } catch (error) {
    console.error("Error in checkAndEscalateSlaBreaches:", error);
  }
}
