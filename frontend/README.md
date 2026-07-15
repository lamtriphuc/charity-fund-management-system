# Frontend — Charity Fund Management Client

React SPA client for the Charity Fund Management System.

## Tech Stack

- **Framework:** React 19 + Vite 8
- **UI Library:** Ant Design 6
- **Styling:** Tailwind CSS 4
- **Routing:** React Router v7
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Icons:** @ant-design/icons
- **Google Auth:** @react-oauth/google
- **Payment:** PayOS

## Quick Start

```bash
npm install
# Configure .env (see root README)
npm run dev       # http://localhost:5173
```

## Pages & Routes

| Route              | Page                  | Access        |
|--------------------|-----------------------|---------------|
| `/`                | HomePage              | Public        |
| `/campaigns`       | CampaignsPage         | Public        |
| `/campaigns/:id`   | CampaignDetailPage    | Public        |
| `/campaigns/:id/donate` | DonatePage       | Public        |
| `/propose`         | ProposeCampaignPage   | Authenticated |
| `/login`           | Login                 | Public        |
| `/register`        | Register              | Public        |
| `/forgot-password` | ForgotPassword        | Public        |
| `/profile`         | ProfilePage           | Authenticated |
| `/statement`       | StatementPage         | Authenticated |
| `/admin/*`         | Admin dashboard pages | Admin         |
| `/auditor/*`       | Auditor review pages  | Auditor       |
| `/volunteer/*`     | Volunteer pages       | Volunteer     |

## Layouts

| Layout         | Description                              |
|----------------|------------------------------------------|
| AuthLayout     | Login / Register / Forgot password pages |
| UserLayout     | Main user-facing pages with header/footer|
| AdminLayout    | Admin dashboard with sidebar navigation  |
| AuditorLayout  | Auditor review interface                 |
| RoleBasedRoute | Route guard that checks user role        |

## Available Scripts

| Script            | Description                     |
|-------------------|---------------------------------|
| `npm run dev`     | Start Vite dev server           |
| `npm run build`   | Build for production            |
| `npm run preview` | Preview production build        |
| `npm run lint`    | ESLint source code              |

## Project Structure

```
src/
├── assets/           # Static assets (logos, images)
├── components/       # Shared UI components
│   ├── AppHeader.jsx
│   └── AppFooter.jsx
├── layouts/          # Page layouts
│   ├── AdminLayout.jsx
│   ├── AuditorLayout.jsx
│   ├── AuthLayout.jsx
│   ├── UserLayout.jsx
│   └── RoleBasedRoute.jsx
├── pages/            # Page components
│   ├── admin/        # Admin dashboard
│   ├── auditor/      # Auditor review
│   └── volunteer/    # Volunteer pages
├── services/         # API client modules
│   ├── api.js        # Axios instance with interceptors
│   ├── authService.js
│   ├── campaignService.js
│   ├── donationService.js
│   ├── disbursementService.js
│   ├── ledgerService.js
│   ├── analyticService.js
│   ├── auditService.js
│   ├── userService.js
│   └── profileService.js
├── store/            # Zustand stores
│   └── authStore.js
└── utils/            # Helper utilities
    └── helper.js
```

## Environment Variables

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Features

- **Role-based UI** — Different layouts and pages for Admin, User, Auditor, and Volunteer roles
- **JWT Auth** — Login/register with access & refresh tokens stored in cookies
- **Google OAuth** — One-click sign-in with Google
- **Campaign Browsing** — View, search, and filter fundraising campaigns
- **Donation Flow** — Donate to campaigns with optional anonymity and messages
- **Disbursement Requests** — Volunteers can request and track fund disbursements
- **Admin Dashboard** — Manage users, campaigns, donations, and system settings
- **Audit Viewer** — Read-only audit log review for compliance
- **Responsive Design** — Tailwind CSS + Ant Design for mobile-friendly layouts