# GeoResQ - Intelligent Geospatial Resource Discovery, Allocation & Emergency Coordination System

GeoResQ is an enterprise-grade full-stack geospatial platform designed to solve critical challenges in disaster response, emergency assistance, resource accessibility, and humanitarian supply chain distribution.

---

## 1. System Architecture Overview

```
                                    +------------------------------------+
                                    |         React 19 + Vite SPA        |
                                    |  (Tailwind CSS, Leaflet, Recharts) |
                                    +-----------------+------------------+
                                                      |
                                          HTTP REST / Bearer JWT
                                                      |
                                    +-----------------v------------------+
                                    |         Express API Gateway        |
                                    |         (server.ts : PORT 3000)    |
                                    +---+-----+-----+-----+----+----+----+
                                        |     |     |     |    |    |
        +-------------------------------+     |     |     |    |    +-------------------------------+
        |                                     |     |     |    |                                    |
+-------v-------+  +------------v--+  +-------v-----+  +--v----v----+  +--------------v-+  +------------v--+
| Service 1:    |  | Service 2:    |  | Service 3:  |  | Service 4: |  | Service 5:     |  | Service 6:    |
| Authentication|  | User Mgmt     |  | Resource    |  | Geospatial |  | Emergency Mgmt |  | Resource      |
| Service       |  | Service       |  | Service     |  | Discovery  |  | Service        |  | Allocation    |
| (Port 3001)   |  | (Port 3002)   |  | (Port 3003) |  | (Port 3004)|  | (Port 3005)    |  | (Port 3006)   |
+-------+-------+  +------------+--+  +-------+-----+  +-------+----+  +--------------+-+  +------------+--+
        |                       |             |                |                      |                 |
        |                       |             |                |                      |                 |
        |                       |             |                |                      |                 |
+-------v-------+  +------------v--+  +-------v-----+          |       +--------------v-+  +------------v--+
| Service 7:    |  | Service 8:    |  | Service 9:  |          |       | .data/         |  | .data/        |
| Notification  |  | Analytics     |  | Shelter &   |          |       | emergency_     |  | allocation_   |
| Service       |  | Service       |  | Volunteer   |          |       | service.db     |  | service.db    |
| (Port 3007)   |  | (Port 3008)   |  | (Port 3009) |          |       +----------------+  +---------------+
+-------+-------+  +------------+--+  +-------+-----+          |
        |                       |             |                |
        v                       v             v                v
+-------------------------------------------------------------------------------------------------------+
|                                Dedicated SQLite3 Microservice Databases                               |
|  .data/auth_service.db           .data/user_service.db              .data/resource_service.db          |
|  .data/geospatial_service.db     .data/notification_service.db      .data/analytics_service.db         |
|  .data/shelter_volunteer_service.db                                                                   |
+-------------------------------------------------------------------------------------------------------+
```

---

## 2. Microservices Directory & Port Registry

| # | Microservice | Port | Database | Primary REST API Endpoints | NPM Start Command |
|---|---|---|---|---|---|
| **1** | **Authentication Service** | `3001` | `.data/auth_service.db` | `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/demo-login` | `npm run dev:auth` |
| **2** | **User Management Service** | `3002` | `.data/user_service.db` | `/api/users`, `/api/users/:id`, `/api/users/profile` | `npm run dev:user` |
| **3** | **Resource Management Service** | `3003` | `.data/resource_service.db` | `/api/resources`, `/api/resources/categories`, `/api/resources/:id`, `/api/resources/:id/stock` | `npm run dev:resource` |
| **4** | **Geospatial Discovery Service** | `3004` | `.data/geospatial_service.db` | `/api/geospatial/nearby`, `/api/geospatial/districts`, `/api/geospatial/distance` | `npm run dev:geospatial` |
| **5** | **Emergency Management Service** | `3005` | `.data/emergency_service.db` | `/api/emergencies`, `/api/emergencies/:id`, `/api/emergencies/:id/status` | `npm run dev:emergency` |
| **6** | **Resource Allocation Service** | `3006` | `.data/allocation_service.db` | `/api/allocations`, `/api/allocations/recommendations/:emergencyId`, `/api/allocations/audit-logs` | `npm run dev:allocation` |
| **7** | **Notification Service** | `3007` | `.data/notification_service.db` | `/api/notifications`, `/api/notifications/:id/read`, `/api/notifications/read-all` | `npm run dev:notification` |
| **8** | **Reporting & Analytics Service** | `3008` | `.data/analytics_service.db` | `/api/analytics/overview`, `/api/analytics/snapshots` | `npm run dev:analytics` |
| **9** | **Volunteer & Shelter Service** | `3009` | `.data/shelter_volunteer_service.db` | `/api/shelters`, `/api/volunteers`, `/api/volunteers/:id/assign` | `npm run dev:shelter` |
| **GW**| **API Gateway & SPA Server** | `3000` | Gateway & Reverse Proxy | `/api/health`, `/api/*` (reverse proxies to 3001–3009) | `npm run dev` or `npm run dev:all` |

---

## 2. Technology Stack

- **Frontend**:
  - React 19 (TypeScript, Functional Hooks)
  - Tailwind CSS (Deep Navy `#102A43`, Emergency Red `#E63946`, Teal `#0F766E`, Blue `#2563EB`)
  - Leaflet.js & OpenStreetMap
  - Recharts for Real-Time Database Analytics
  - Lucide React Icons
  - Framer Motion

- **Backend & Microservices**:
  - Node.js & Express.js
  - API Gateway Routing
  - JWT Authentication & Bcrypt Password Hashing
  - Haversine Geospatial Discovery Engine
  - Transactional Inventory Lock Allocation Engine

- **Database**:
  - Better-SQLite3 with Write-Ahead Logging (`WAL`)
  - Modular isolated database files per service boundary

---

## 3. Directory Structure

```
├── .data/                           # Isolated SQLite microservice databases
├── src/
│   ├── api/
│   │   └── client.ts                # Strongly-typed API client
│   ├── assets/
│   │   └── images/                  # High-resolution photographic assets
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminDashboard.tsx   # Recharts analytics, user & listing moderation
│   │   ├── auth/
│   │   │   └── AuthModal.tsx        # Login/Register with instant role switcher
│   │   ├── citizen/
│   │   │   └── CitizenDashboard.tsx # Nearby discovery, interactive map, incident filing
│   │   ├── common/
│   │   │   ├── Footer.tsx           # Public footer
│   │   │   ├── MapComponent.tsx     # Leaflet map with custom pins and click picker
│   │   │   ├── Navbar.tsx           # Top Bar contract navigation
│   │   │   └── StatusBadge.tsx      # Clean typography status tags
│   │   ├── coordinator/
│   │   │   └── CoordinatorDashboard.tsx # Live tactical map, triage & match engine
│   │   ├── landing/
│   │   │   └── LandingPage.tsx      # High-impact landing page
│   │   └── provider/
│   │       └── ProviderDashboard.tsx# Inventory management & dispatch workflow
│   ├── context/
│   │   └── AuthContext.tsx          # JWT session and persona switcher
│   ├── server/
│   │   ├── db/
│   │   │   └── init.ts              # SQLite database initialization & seed data
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts    # JWT verification & role authorization
│   │   └── services/
│   │       ├── allocationService.ts # Match scoring & transactional deductions
│   │       ├── analyticsService.ts  # Database aggregations
│   │       ├── authService.ts       # Auth routes & demo switch
│   │       ├── emergencyService.ts  # Incident triage, shelters, volunteers
│   │       ├── geospatialService.ts # Haversine distance calculations
│   │       ├── notificationService.ts # In-app notifications
│   │       ├── resourceService.ts   # Resource catalog CRUD
│   │       └── userService.ts       # User administration
│   ├── types/
│   │   └── index.ts                 # TypeScript data contracts
│   ├── App.tsx                      # Main app router
│   ├── index.css                    # Tailwind CSS base and Leaflet styles
│   └── main.tsx                     # React root
├── server.ts                        # Full-stack server entry point
├── package.json
└── tsconfig.json
```

---

## 4. Key Workflows & Features

1. **Intelligent Geospatial Discovery**:
   - Computes great-circle distances using the Haversine trigonometric formula:
     $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
   - Generates direct OpenStreetMap navigation links.
   - Configurable radius slider from 5 km to 100 km.

2. **Automated Resource Allocation Match Engine**:
   - Evaluates emergency coordinates against active inventory.
   - Calculates a 0–100 Match Score based on:
     - Geographical distance (up to 35 pts)
     - District alignment (10 pts)
     - Resource category match (up to 25 pts)
     - Stock availability and emergency priority (up to 15 pts)
   - Transactional inventory deduction prevents over-allocation.

3. **Multi-Role Security Model**:
   - **Citizen**: Browse supplies, report emergencies with coordinates, track assistance.
   - **Resource Provider**: Add inventory, set coordinates, manage supply dispatch.
   - **Emergency Coordinator**: Live command map, triage incidents, trigger auto-match allocations, deploy volunteers, monitor shelters.
   - **Administrator**: Moderate users, verify providers, inspect audit logs, view Recharts graphs.

---

## 5. Instant Demo Accounts

Use the **Demo Persona Switcher** in the top navigation or Auth Modal to instantly test any role:

| Persona | Role | Email |
| :--- | :--- | :--- |
| **Dr. Aruni Bandara** | Administrator | `admin@georesq.org` |
| **Kavinda Perera** | Emergency Coordinator | `coordinator@georesq.org` |
| **Apex Relief Logistics** | Resource Provider | `provider@georesq.org` |
| **Sunil Weerasinghe** | Citizen / Resident | `citizen@georesq.org` |

*Password for all pre-seeded accounts: `Password123!`*
