import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

// Import and ensure all 9 microservices are initialized and listening on ports 3001-3009
import './src/services/1-auth-service/server';
import './src/services/2-user-service/server';
import './src/services/3-resource-service/server';
import './src/services/4-geospatial-service/server';
import './src/services/5-emergency-service/server';
import './src/services/6-allocation-service/server';
import './src/services/7-notification-service/server';
import './src/services/8-analytics-service/server';
import './src/services/9-shelter-volunteer-service/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const GATEWAY_PORT = 3000;

app.use(cors());

// Microservice Route Mapping
const SERVICES = {
  auth: { port: 3001, url: 'http://127.0.0.1:3001' },
  user: { port: 3002, url: 'http://127.0.0.1:3002' },
  resource: { port: 3003, url: 'http://127.0.0.1:3003' },
  geospatial: { port: 3004, url: 'http://127.0.0.1:3004' },
  emergency: { port: 3005, url: 'http://127.0.0.1:3005' },
  allocation: { port: 3006, url: 'http://127.0.0.1:3006' },
  notification: { port: 3007, url: 'http://127.0.0.1:3007' },
  analytics: { port: 3008, url: 'http://127.0.0.1:3008' },
  shelter_volunteer: { port: 3009, url: 'http://127.0.0.1:3009' },
};

// Helper proxy generator with automatic body handling and error fallback
function createServiceProxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      proxyReq: fixRequestBody,
      error: (err, req, res) => {
        const response = res as Response;
        if (!response.headersSent) {
          response.status(503).json({
            error: `Gateway proxy error connecting to service at ${target}`,
            details: err.message,
          });
        }
      },
    },
  });
}

// 1. Comprehensive Gateway Health Check Endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  const checkService = async (name: string, url: string, port: number, db: string) => {
    try {
      const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
      const data = await resp.json().catch(() => ({}));
      return {
        service: name,
        port,
        database: db,
        status: resp.ok ? 'healthy' : 'unhealthy',
        response_time_ms: data ? 'ok' : 'error',
      };
    } catch (e: any) {
      return {
        service: name,
        port,
        database: db,
        status: 'unreachable',
        error: e.message,
      };
    }
  };

  const [
    authHealth,
    userHealth,
    resourceHealth,
    geospatialHealth,
    emergencyHealth,
    allocationHealth,
    notificationHealth,
    analyticsHealth,
    shelterHealth,
  ] = await Promise.all([
    checkService('Authentication Service', SERVICES.auth.url, 3001, '.data/auth_service.db'),
    checkService('User Management Service', SERVICES.user.url, 3002, '.data/user_service.db'),
    checkService('Resource Management Service', SERVICES.resource.url, 3003, '.data/resource_service.db'),
    checkService('Geospatial Discovery Service', SERVICES.geospatial.url, 3004, '.data/geospatial_service.db'),
    checkService('Emergency Management Service', SERVICES.emergency.url, 3005, '.data/emergency_service.db'),
    checkService('Resource Allocation Service', SERVICES.allocation.url, 3006, '.data/allocation_service.db'),
    checkService('Notification Service', SERVICES.notification.url, 3007, '.data/notification_service.db'),
    checkService('Reporting & Analytics Service', SERVICES.analytics.url, 3008, '.data/analytics_service.db'),
    checkService('Volunteer & Shelter Coordination Service', SERVICES.shelter_volunteer.url, 3009, '.data/shelter_volunteer_service.db'),
  ]);

  res.json({
    status: 'healthy',
    gateway: {
      name: 'GeoResQ API Gateway',
      port: GATEWAY_PORT,
      architecture: 'Distributed Microservices Architecture',
      total_services: 9,
    },
    timestamp: new Date().toISOString(),
    services: [
      authHealth,
      userHealth,
      resourceHealth,
      geospatialHealth,
      emergencyHealth,
      allocationHealth,
      notificationHealth,
      analyticsHealth,
      shelterHealth,
    ],
  });
});

// 2. Microservice Reverse Proxy Routes
app.use('/api/auth', createServiceProxy(SERVICES.auth.url));
app.use('/api/users', createServiceProxy(SERVICES.user.url));
app.use('/api/resources', createServiceProxy(SERVICES.resource.url));
app.use('/api/geospatial', createServiceProxy(SERVICES.geospatial.url));

// Legacy shelter & volunteer paths mapped under /api/emergencies routed to Service 9
app.use('/api/emergencies/shelters', createServiceProxy(SERVICES.shelter_volunteer.url));
app.use('/api/emergencies/volunteers', createServiceProxy(SERVICES.shelter_volunteer.url));

// Emergency core routes routed to Service 5
app.use('/api/emergencies', createServiceProxy(SERVICES.emergency.url));

// Allocations, Notifications, Analytics routed to Services 6, 7, 8
app.use('/api/allocations', createServiceProxy(SERVICES.allocation.url));
app.use('/api/notifications', createServiceProxy(SERVICES.notification.url));
app.use('/api/analytics', createServiceProxy(SERVICES.analytics.url));

// Direct shelter & volunteer endpoints routed to Service 9
app.use('/api/shelters', createServiceProxy(SERVICES.shelter_volunteer.url));
app.use('/api/volunteers', createServiceProxy(SERVICES.shelter_volunteer.url));

// 3. Vite Frontend Middleware Integration
async function startGateway() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(GATEWAY_PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`[GeoResQ API Gateway] Running on http://0.0.0.0:${GATEWAY_PORT}`);
    console.log(`[Services Running]`);
    console.log(` - Port 3001: Authentication Service (.data/auth_service.db)`);
    console.log(` - Port 3002: User Management Service (.data/user_service.db)`);
    console.log(` - Port 3003: Resource Management Service (.data/resource_service.db)`);
    console.log(` - Port 3004: Geospatial Discovery Service (.data/geospatial_service.db)`);
    console.log(` - Port 3005: Emergency Management Service (.data/emergency_service.db)`);
    console.log(` - Port 3006: Resource Allocation Service (.data/allocation_service.db)`);
    console.log(` - Port 3007: Notification Service (.data/notification_service.db)`);
    console.log(` - Port 3008: Reporting & Analytics Service (.data/analytics_service.db)`);
    console.log(` - Port 3009: Volunteer & Shelter Service (.data/shelter_volunteer_service.db)`);
    console.log(`=======================================================`);
  });
}

startGateway().catch((err) => {
  console.error('[GeoResQ API Gateway] Initialization failure:', err);
  process.exit(1);
});
