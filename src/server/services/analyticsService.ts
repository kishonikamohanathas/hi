import { Router, Response } from 'express';
import { authDb, resourceDb, emergencyDb, allocationDb } from '../db/init';

export const analyticsRouter = Router();

// Overall platform metrics and dashboard charts data
analyticsRouter.get('/overview', (req, res: Response): void => {
  // Aggregate real database metrics
  const totalUsers = (authDb.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const activeProviders = (authDb.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'provider' AND status = 'active'").get() as any).count;
  const totalResources = (resourceDb.prepare('SELECT COUNT(*) as count FROM resources').get() as any).count;
  const availableResources = (resourceDb.prepare("SELECT COUNT(*) as count FROM resources WHERE availability = 'available'").get() as any).count;
  const totalEmergencies = (emergencyDb.prepare('SELECT COUNT(*) as count FROM emergencies').get() as any).count;
  const resolvedEmergencies = (emergencyDb.prepare("SELECT COUNT(*) as count FROM emergencies WHERE status IN ('resolved', 'closed')").get() as any).count;
  const activeEmergencies = (emergencyDb.prepare("SELECT COUNT(*) as count FROM emergencies WHERE status NOT IN ('resolved', 'closed')").get() as any).count;
  const totalAllocations = (allocationDb.prepare('SELECT COUNT(*) as count FROM allocations').get() as any).count;
  const completedAllocations = (allocationDb.prepare("SELECT COUNT(*) as count FROM allocations WHERE status IN ('delivered', 'completed')").get() as any).count;

  // Resources by Category
  const categoryDistribution = resourceDb.prepare(`
    SELECT category as name, COUNT(*) as count, SUM(quantity) as total_units
    FROM resources
    GROUP BY category
    ORDER BY count DESC
  `).all();

  // Emergencies by Priority
  const emergenciesByPriority = emergencyDb.prepare(`
    SELECT priority, COUNT(*) as count
    FROM emergencies
    GROUP BY priority
    ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
  `).all();

  // Emergencies by Status
  const emergenciesByStatus = emergencyDb.prepare(`
    SELECT status, COUNT(*) as count
    FROM emergencies
    GROUP BY status
  `).all();

  // District distribution
  const districtDistribution = resourceDb.prepare(`
    SELECT district, COUNT(*) as resource_count, SUM(quantity) as total_items
    FROM resources
    GROUP BY district
    ORDER BY resource_count DESC
    LIMIT 8
  `).all();

  // Allocation status breakdown
  const allocationBreakdown = allocationDb.prepare(`
    SELECT status, COUNT(*) as count
    FROM allocations
    GROUP BY status
  `).all();

  // Real audit logs
  const auditLogs = allocationDb.prepare(`
    SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20
  `).all();

  res.json({
    metrics: {
      total_users: totalUsers,
      active_providers: activeProviders,
      total_resources: totalResources,
      available_resources: availableResources,
      total_emergencies: totalEmergencies,
      active_emergencies: activeEmergencies,
      resolved_emergencies: resolvedEmergencies,
      total_allocations: totalAllocations,
      completed_allocations: completedAllocations,
      response_rate_percent: totalEmergencies > 0 ? Math.round((resolvedEmergencies / totalEmergencies) * 100) : 100,
    },
    category_distribution: categoryDistribution,
    emergencies_by_priority: emergenciesByPriority,
    emergencies_by_status: emergenciesByStatus,
    district_distribution: districtDistribution,
    allocation_breakdown: allocationBreakdown,
    audit_logs: auditLogs,
  });
});
