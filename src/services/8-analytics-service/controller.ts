import { Request, Response } from 'express';
import { analyticsDb } from './db';

export class AnalyticsController {
  static async getOverview(req: Request, res: Response): Promise<void> {
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://127.0.0.1:3002';
    const resourceServiceUrl = process.env.RESOURCE_SERVICE_URL || 'http://127.0.0.1:3003';
    const emergencyServiceUrl = process.env.EMERGENCY_SERVICE_URL || 'http://127.0.0.1:3005';
    const allocationServiceUrl = process.env.ALLOCATION_SERVICE_URL || 'http://127.0.0.1:3006';

    try {
      // Parallel REST calls to peer microservices
      const [usersRes, resourcesRes, emergenciesRes, allocationsRes, auditRes] = await Promise.all([
        fetch(`${userServiceUrl}/api/users`).then(r => r.json()).catch(() => ({ users: [] })),
        fetch(`${resourceServiceUrl}/api/resources`).then(r => r.json()).catch(() => ({ resources: [] })),
        fetch(`${emergencyServiceUrl}/api/emergencies`).then(r => r.json()).catch(() => ({ emergencies: [] })),
        fetch(`${allocationServiceUrl}/api/allocations`).then(r => r.json()).catch(() => ({ allocations: [] })),
        fetch(`${allocationServiceUrl}/api/allocations/audit-logs`).then(r => r.json()).catch(() => ({ audit_logs: [] })),
      ]);

      const users: any[] = (usersRes as any).users || [];
      const resources: any[] = (resourcesRes as any).resources || [];
      const emergencies: any[] = (emergenciesRes as any).emergencies || [];
      const allocations: any[] = (allocationsRes as any).allocations || [];
      const auditLogs: any[] = (auditRes as any).audit_logs || [];

      const totalUsers = users.length;
      const activeProviders = users.filter((u: any) => u.role === 'provider' && u.status === 'active').length;
      const totalResources = resources.length;
      const availableResources = resources.filter((r: any) => r.availability === 'available').length;
      const totalEmergencies = emergencies.length;
      const resolvedEmergencies = emergencies.filter((e: any) => ['resolved', 'closed'].includes(e.status)).length;
      const activeEmergencies = emergencies.filter((e: any) => !['resolved', 'closed'].includes(e.status)).length;
      const totalAllocations = allocations.length;
      const completedAllocations = allocations.filter((a: any) => ['delivered', 'completed'].includes(a.status)).length;

      // Category Distribution
      const categoryMap = new Map<string, { count: number; total_units: number }>();
      for (const r of resources) {
        const cat = r.category || 'General';
        const current = categoryMap.get(cat) || { count: 0, total_units: 0 };
        current.count += 1;
        current.total_units += Number(r.quantity) || 0;
        categoryMap.set(cat, current);
      }
      const categoryDistribution = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        count: data.count,
        total_units: data.total_units,
      }));

      // Emergencies by Priority
      const priorityMap = new Map<string, number>();
      for (const e of emergencies) {
        const p = e.priority || 'medium';
        priorityMap.set(p, (priorityMap.get(p) || 0) + 1);
      }
      const emergenciesByPriority = ['critical', 'high', 'medium', 'low']
        .filter(p => priorityMap.has(p))
        .map(priority => ({
          priority,
          count: priorityMap.get(priority) || 0,
        }));

      // Emergencies by Status
      const statusMap = new Map<string, number>();
      for (const e of emergencies) {
        const s = e.status || 'reported';
        statusMap.set(s, (statusMap.get(s) || 0) + 1);
      }
      const emergenciesByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
      }));

      // District Distribution
      const districtMap = new Map<string, { resource_count: number; total_items: number }>();
      for (const r of resources) {
        const d = r.district || 'Colombo';
        const current = districtMap.get(d) || { resource_count: 0, total_items: 0 };
        current.resource_count += 1;
        current.total_items += Number(r.quantity) || 0;
        districtMap.set(d, current);
      }
      const districtDistribution = Array.from(districtMap.entries()).map(([district, data]) => ({
        district,
        resource_count: data.resource_count,
        total_items: data.total_items,
      }));

      // Allocation Breakdown
      const allocStatusMap = new Map<string, number>();
      for (const a of allocations) {
        const s = a.status || 'allocated';
        allocStatusMap.set(s, (allocStatusMap.get(s) || 0) + 1);
      }
      const allocationBreakdown = Array.from(allocStatusMap.entries()).map(([status, count]) => ({
        status,
        count,
      }));

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
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to aggregate analytics: ' + err.message });
    }
  }

  static getSnapshots(req: Request, res: Response): void {
    const snapshots = analyticsDb.prepare('SELECT * FROM platform_snapshots ORDER BY snapshot_date DESC LIMIT 12').all();
    res.json({ snapshots });
  }
}
