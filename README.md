# SmartPOS CRM AI

SmartPOS CRM AI is a full-stack retail operations platform that combines POS billing, CRM workflows, pricing intelligence, notifications, analytics, and machine learning in one system.

It is built for practical business usage with role-based access, secure authentication, and seeded analytics-ready data.

## Highlights

- POS billing with GST/tax-aware invoice generation
- Real-time stock-aware cart controls in billing
- Product and category management with GST rates
- Customer profiles, invoice history, edit/delete actions, and spending charts
- Dynamic pricing center with audit trail, bulk update, schedule support, and customer impact tracking
- Notification campaigns for price-drop eligible customers
- Dashboard analytics and ML insights for customer and product behavior
- Security hardening with stricter JWT handling, login rate limiting, and secure headers

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Axios

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL
- Pydantic
- Passlib
- python-jose
- slowapi

### ML Libraries

- pandas
- scikit-learn
- numpy

## Architecture

```text
Frontend (React + Vite)
        |
        | HTTP + JWT
        v
Backend (FastAPI)
        |
        | SQLAlchemy ORM
        v
PostgreSQL

ML modules run in backend services over transactional data.
```

## Repository Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI route modules
│   │   ├── core/          # auth, jwt, security, dependencies, limiter
│   │   ├── db/            # database config/init/seed
│   │   ├── ml/            # ML services
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── main.py        # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── run_backend.bat
├── run_frontend.bat
├── run_full_stack.bat
└── README.md
```

## Key Features

### 1) Billing and POS

- Create GST-compliant invoices with subtotal, tax, and grand total
- Payment handling: cash, card, UPI, credit
- Cash amount tendered and automatic change due validation
- Cart quantity controls with live totals
- Real-time inventory-safe billing behavior:
  - Stock visibly decreases/increases live with cart quantity changes
  - Add/quantity-increase is blocked when stock is exhausted
  - Insufficient stock is shown with custom in-app alert (no browser default alert)

### 2) Product and Category Management

- Product CRUD-style operations and restocking
- GST tax rate per product
- Category assignment and category management
- Soft-delete strategy on products

### 3) Customer Management

- Customer list with search and richer profile panel
- Add customer workflow
- Edit and delete customer actions in customer cards
- Customer invoice history with invoice modal and print support
- Spending analytics charts on customer page

### 4) Pricing Center

- Single-product price update
- Price-drop impact lookup (eligible customers)
- In-page customer notification trigger for price-drop campaigns
- Price history endpoint + chart support
- Bulk price update (flat or percentage)
- Scheduled price changes with cancel support
- Scheduled processor endpoint for due changes
- Price change audit trail endpoint and UI tab
- Product search selector and stock indicators in pricing flow

### 5) Notifications

- Template and campaign workflows
- Product-linked campaign generation
- Email/SMS channel support hooks
- Campaign send, retry, and status tracking

### 6) Dashboard and Analytics

- KPI cards
- Revenue and invoice trends
- Product/customer performance metrics
- Operational visuals and business snapshots

### 7) ML Insights

- Customer Segmentation
- Churn Risk Prediction
- Customer Lifetime Value
- Product Recommendations
- Price Trend Prediction
- Demand Forecasting
- Anomaly Detection

Recent UX additions in ML Insights:

- Search for Segments, Churn, LTV, and Demand lists
- Searchable product selection for Recommendations and Price Trend panels
- Clickable LTV tier rank cards to filter customers by tier

## Authentication, Authorization, and Security

### Auth and RBAC

- JWT access and refresh token model
- Role-based access: admin, manager, cashier
- Invite-token registration for non-first users
- Account lockout after failed login attempts
- Session revocation and token version enforcement

### Security Hardening Implemented

- Removed hardcoded JWT secret fallback
- Startup fails fast when `JWT_SECRET_KEY` is missing
- Login route rate limited using slowapi (`10/minute` per IP)
- Security headers middleware enabled:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=()`
  - `Strict-Transport-Security`
- Registration response hardened to reduce email enumeration
- Password strength validation added (minimum length, uppercase, number)

## Role Access Matrix

| Area                          | Admin      | Manager | Cashier |
| ----------------------------- | ---------- | ------- | ------- |
| Dashboard                     | Yes        | Yes     | No      |
| Billing                       | Yes        | Yes     | Yes     |
| Products                      | Yes        | Yes     | No      |
| Categories                    | Yes        | Yes     | No      |
| Customers                     | Yes        | Yes     | Yes     |
| Pricing                       | Yes        | Yes     | No      |
| Notifications                 | Yes        | Yes     | No      |
| ML Insights                   | Yes        | Yes     | No      |
| Users / Audit / User Activity | Admin only | No      | No      |

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ (Ensure you create a blank database named `smart_pos_crm_ai` before running the backend)
- Git

### 1) Clone

```bash
git clone https://github.com/RaKa8904/SmartPOS-CRM-AI.git
cd SmartPOS-CRM-AI
```

### 2) Configure Backend Environment

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<password>@localhost:5432/smart_pos_crm_ai

JWT_SECRET_KEY=<generate-a-strong-secret>
JWT_REFRESH_SECRET_KEY=<generate-a-strong-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=20
REFRESH_TOKEN_EXPIRE_DAYS=7
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_MINUTES=15
INVITE_EXPIRE_HOURS=48
PASSWORD_RESET_EXPIRE_MINUTES=30
FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
SMS_PROVIDER=mock
```

Generate secrets:

```bash
python -c "import secrets; print(secrets.token_hex(64))"
```

### 3) Run with Windows Batch Scripts (Convenience)

For Windows users, pre-configured batch scripts are provided in the project root to run the application easily:

- **Launch Both (Full Stack)**: Run [run_full_stack.bat](file:///c:/Users/Raka/Projects/SmartPOS-CRM-AI/run_full_stack.bat) to automatically install frontend dependencies, start the FastAPI backend server (waiting 3 seconds for it to bind), and launch the React Vite dev server in separate windows.
- **Launch Backend Only**: Run [run_backend.bat](file:///c:/Users/Raka/Projects/SmartPOS-CRM-AI/run_backend.bat).
- **Launch Frontend Only**: Run [run_frontend.bat](file:///c:/Users/Raka/Projects/SmartPOS-CRM-AI/run_frontend.bat).

Alternatively, follow the manual instructions below:

### 4) Run Backend (Manual)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 5) Run Frontend (Manual)

```bash
cd frontend
npm install
npm run dev
```

App URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

## Demo Data Seeding

Use the comprehensive seed script to populate 30 days of realistic demo data:

```bash
cd backend
venv\Scripts\python.exe scripts/seed_full_demo.py
```

> [!NOTE]
> The database seeding script runs over the schema created automatically by the backend. Ensure you run the backend service at least once first (so the database tables are created) before running the seeding script.

This seeds all business entities (12 categories, 50 products, 35 customers, 400+ invoices with line items, price history, notification campaigns, audit logs, and inventory shortages) while preserving registered users. Payment methods include cash, UPI, card, and credit.

## Build and Validation

### Frontend build

```bash
cd frontend
npm run build
```

## API Route Groups (High Level)

- `/auth` authentication and session flows
- `/products` product operations
- `/categories` category operations
- `/billing` invoice creation and retrieval
- `/customers` customer CRUD and history
- `/pricing` pricing controls, bulk/scheduled/audit
- `/price-drops` customer eligibility checks
- `/notifications` templates, campaigns, send/retry
- `/analytics` dashboard metrics
- `/ml` segmentation/churn/ltv/recommendations/forecast/anomalies
- `/users`, `/audit-logs`, `/user-activity` admin modules

## License

This project is distributed under the terms in [LICENSE](LICENSE).

## Author

Built by RaKa as a full-stack Smart POS + CRM + AI platform.
