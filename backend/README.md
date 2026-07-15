# Backend — Charity Fund Management API

NestJS REST API server for the Charity Fund Management System.

## Tech Stack

- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL (TypeORM)
- **Search:** Elasticsearch 8.13
- **Auth:** JWT, Passport.js, Google OAuth
- **File Upload:** Cloudinary
- **Payment:** PayOS
- **Scheduling:** `@nestjs/schedule`
- **Validation:** `class-validator` + `class-transformer`
- **Testing:** Jest + Supertest

## Quick Start

```bash
npm install
# Start Elasticsearch & Kibana
docker compose up -d
# Configure .env (see root README)
npm run migration:run
npm run seed      # optional: seed demo data
npm run dev       # http://localhost:3000
```

## API Modules

| Module         | Description                                    |
|----------------|------------------------------------------------|
| Auth           | JWT authentication, Google OAuth, refresh tokens|
| Users          | User CRUD, role management, KYC, account status |
| Campaigns      | Campaign CRUD, approval workflow, status lifecycle|
| Donations      | Donation processing, payment integration (PayOS)|
| Disbursements  | Fund disbursement requests, proof uploads, approval|
| Ledger         | General ledger accounting for financial tracking|
| Analytic       | Dashboards, data aggregation, Excel export      |
| Audit          | Audit logging with before/after snapshots       |
| Search         | Elasticsearch full-text search integration      |
| Cron           | Scheduled reconciliation & log archiving        |
| System         | Notifications (INFO, SUCCESS, WARNING, URGENT)  |

## Available Scripts

| Script                          | Description                     |
|---------------------------------|---------------------------------|
| `npm run dev`                   | Watch mode with SWC             |
| `npm run build`                 | Build for production            |
| `npm run start`                 | Start server                    |
| `npm run start:prod`            | Start production build          |
| `npm run test`                  | Unit tests                      |
| `npm run test:e2e`              | End-to-end tests                |
| `npm run test:cov`              | Coverage report                 |
| `npm run lint`                  | ESLint + Prettier               |
| `npm run seed`                  | Seed demo data                  |
| `npm run reset`                 | Reset seeded data               |
| `npm run migration:generate`    | Generate TypeORM migration      |
| `npm run migration:run`         | Run pending migrations          |
| `npm run migration:revert`      | Revert last migration           |

## Project Structure

```
src/
├── common/           # Shared utilities
│   ├── cloudinary/   # Cloudinary provider & service
│   ├── decorators/   # Custom decorators (e.g., @Roles, @CurrentUser)
│   ├── guards/       # Auth & role guards
│   └── interceptors/ # Global interceptors
├── modules/          # Feature modules (listed above)
├── migrations/       # TypeORM migration files
└── seeder/           # Database seeding utilities
```

## Environment Variables

See the [root README](../README.md) for a complete list of required environment variables.

## Docker Services

- **Elasticsearch** — port 9200
- **Kibana** — port 5601