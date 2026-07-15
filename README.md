# Charity Fund Management System

A comprehensive web application for managing charitable funds, campaigns, donations, and disbursements with full audit trail and search capabilities.

## 🏗️ Architecture

This project follows a **monorepo** structure with two main packages:

```
charity-fund-management-system/
├── backend/          # NestJS REST API server
├── frontend/         # React SPA client
└── README.md         # This file
```

## 🚀 Tech Stack

### Backend (`backend/`)
- **Framework:** [NestJS](https://nestjs.com/) — progressive Node.js framework
- **Language:** TypeScript
- **Database:** PostgreSQL (via [TypeORM](https://typeorm.io/))
- **Search:** Elasticsearch (with Kibana for visualization)
- **Authentication:** JWT, Passport.js, Google OAuth
- **File Upload:** Cloudinary
- **Payment:** PayOS
- **Cron Jobs:** `@nestjs/schedule`
- **Containerization:** Docker Compose (Elasticsearch + Kibana)

### Frontend (`frontend/`)
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **UI Library:** [Ant Design 6](https://ant.design/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Routing:** React Router v7
- **State Management:** Zustand
- **HTTP Client:** Axios

## ✨ Key Features

### Campaign Management
- Create, approve/reject, and manage fundraising campaigns
- Two campaign types: **FLEXIBLE** (raise what you can) and **FIXED** (target-based)
- Campaign lifecycle: PENDING → APPROVED/REJECTED → ACTIVE → COMPLETED
- Image upload via Cloudinary integration

### Donation System
- Make donations to campaigns (authenticated or anonymous)
- Multiple payment methods (bank transfer, PayOS)
- Unique transaction references for traceability
- Donor name & message support

### Disbursement Management
- Volunteers can request fund disbursements from approved campaigns
- Multi-level approval workflow with proof attachments
- Track disbursement status: PENDING_APPROVAL → APPROVED/REJECTED → COMPLETED

### User & Role Management
- Role-based access control with distinct dashboards:
  - **Admin** — full system administration
  - **User** — donor/volunteer self-service
  - **Auditor** — read-only audit reviews
- KYC (Know Your Customer) verification for users
- Account status management (ACTIVE, SUSPENDED, BANNED)

### Audit & Compliance
- Comprehensive audit logging with before/after snapshots
- Action, entity, actor tracking with IP and user-agent capture
- Severity levels: INFO, WARNING, ERROR, CRITICAL
- Searchable audit logs stored in both PostgreSQL and Elasticsearch

### Search & Analytics
- Full-text search powered by Elasticsearch
- Campaign, donation, and user analytics
- Data visualization dashboards for administrators
- Excel export support via ExcelJS

### Notifications & Cron Jobs
- In-app notification system with types: INFO, SUCCESS, WARNING, URGENT
- Automated daily reconciliation jobs
- Log archiver for audit log retention

## ⚙️ Getting Started

### Prerequisites
- Node.js (>= 18.x)
- PostgreSQL (>= 14.x)
- Docker & Docker Compose (for Elasticsearch/Kibana)
- npm or yarn

### 1. Clone & Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

**Backend** — Create `backend/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=charity_fund_db

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# PayOS
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
```

**Frontend** — Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Start Infrastructure Services

```bash
cd backend
docker compose up -d   # Starts Elasticsearch (port 9200) & Kibana (port 5601)
```

### 4. Run Database Migrations

```bash
cd backend
npm run migration:run
```

### 5. Seed Demo Data (Optional)

```bash
npm run seed
```

### 6. Start Development Servers

```bash
# Terminal 1 — Backend (port 3000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Visit **http://localhost:5173** to access the application.

## 📦 Available Scripts

### Backend

| Script                | Description                            |
|-----------------------|----------------------------------------|
| `npm run dev`         | Start NestJS in watch mode (SWC)       |
| `npm run build`       | Build for production                   |
| `npm run start:prod`  | Start production server                |
| `npm run test`        | Run unit tests                         |
| `npm run test:e2e`    | Run end-to-end tests                   |
| `npm run test:cov`    | Run tests with coverage                |
| `npm run seed`        | Seed the database with demo data       |
| `npm run reset`       | Reset seeded data                      |
| `npm run lint`        | Lint source code                       |
| `npm run migration:generate` | Generate a new migration       |
| `npm run migration:run`      | Run pending migrations         |
| `npm run migration:revert`   | Revert the last migration      |

### Frontend

| Script            | Description                     |
|-------------------|---------------------------------|
| `npm run dev`     | Start Vite dev server           |
| `npm run build`   | Build for production            |
| `npm run preview` | Preview production build        |
| `npm run lint`    | Lint source code                |

## 🔧 Project Structure

### Backend (`backend/`)

```
backend/
├── src/
│   ├── common/           # Shared utilities
│   │   ├── cloudinary/   # Cloudinary integration
│   │   ├── decorators/   # Custom decorators
│   │   ├── guards/       # Auth & role guards
│   │   └── interceptors/ # Global interceptors
│   ├── modules/
│   │   ├── analytic/     # Analytics & dashboards
│   │   ├── audit/        # Audit logging
│   │   ├── auth/         # JWT & OAuth authentication
│   │   ├── campaigns/    # Campaign CRUD & approval
│   │   ├── cron/         # Scheduled jobs
│   │   ├── disbursements/# Fund disbursement workflow
│   │   ├── donations/    # Donation processing
│   │   ├── ledger/       # General ledger accounting
│   │   ├── search/       # Elasticsearch integration
│   │   ├── system/       # Notifications & system config
│   │   └── users/        # User & role management
│   ├── migrations/       # TypeORM migrations
│   └── seeder/           # Database seeder
├── test/                 # E2E tests
├── data-source.ts        # TypeORM data source config
└── docker-compose.yml    # Elasticsearch + Kibana
```

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── assets/           # Static assets (logos, images)
│   ├── components/       # Shared UI components
│   ├── layouts/          # Page layouts (Admin, User, Auditor, Auth)
│   ├── pages/            # Page components by role
│   │   ├── admin/        # Admin dashboard pages
│   │   ├── auditor/      # Auditor review pages
│   │   └── volunteer/    # Volunteer-specific pages
│   ├── services/         # API client modules
│   ├── store/            # Zustand state stores
│   └── utils/            # Helper utilities
├── public/               # Static public files
└── vite.config.js        # Vite configuration
```

## 🐳 Docker Setup

The `docker-compose.yml` in `backend/` provides:

- **Elasticsearch 8.13.0** — Full-text search engine (port 9200)
- **Kibana 8.13.0** — Elasticsearch visualization (port 5601)

## 🧪 Testing

```bash
# Run backend unit tests
cd backend && npm test

# Run backend E2E tests
cd backend && npm run test:e2e

# Run backend tests with coverage
cd backend && npm run test:cov
```

## 🔒 Security

- JWT-based authentication with access & refresh tokens
- Passport.js strategies for local and Google OAuth
- Role-based access control (Admin, User, Auditor)
- Input validation with `class-validator` and whitelisting
- Comprehensive audit logging for all critical operations
- Cookie-based token storage with HTTP-only cookies

## 📄 License

This project is private and not yet licensed for public use.

## 🤝 Contributing

Internal project — contributions are managed by the development team.

---

For more detailed documentation, refer to:
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)