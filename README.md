# SmartPOS CRM AI

SmartPOS CRM AI is a full-stack retail operations platform that combines point-of-sale workflows, customer relationship management, pricing controls, and machine learning-assisted insights in a single application.

The project is designed for local development and product demonstration. It includes a FastAPI backend, a React + Vite frontend, PostgreSQL persistence, role-based access control, and seeded demo data for analytics and ML features.

## What the platform covers

- POS billing with GST/tax-aware invoices and payment handling
- Product catalog and category management
- Customer management with invoice history
- Dynamic pricing workflows and price-drop eligibility tracking
- Notification workflows for eligible customers after price changes
- Dashboard analytics for revenue, products, and customers
- ML-assisted customer segmentation, recommendations, and price prediction
- Role-based access for admin, manager, and cashier users

## Core capabilities

### Operations

- Create and manage products, stock, GST rates, and categories
- Generate invoices with subtotal, tax, total amount, amount tendered, and change due
- Track customer purchase history and invoice-level detail
- Update product pricing and identify customers affected by price drops

### Analytics and ML

- Revenue KPI and revenue trend endpoints
- Top-product analytics from invoice data
- K-means based customer segmentation using spend, purchase frequency, and average order value
- Product recommendations based on bought-together invoice patterns
- Price prediction using historical product price changes

### Access control

- JWT-based authentication
- First registered user is promoted to `admin`
- Supported roles: `admin`, `manager`, `cashier`
- Frontend navigation and backend APIs enforce role access

## Tech stack

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

### Machine learning

- pandas
- scikit-learn
- numpy

## Architecture

```text
frontend (React + Vite)
	|
	| HTTP / JWT
	v
backend (FastAPI)
	|
	| SQLAlchemy
	v
PostgreSQL

ML modules run inside the backend and operate on live transactional data.
```

## Repository structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI route modules
│   │   ├── core/             # auth, JWT, security, dependencies
│   │   ├── db/               # database config, init, seed
│   │   ├── ml/               # segmentation, pricing, recommendations
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # request/response schemas
│   │   └── main.py           # FastAPI application entry point
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── vite.config.ts
├── run_backend.bat
├── run_frontend.bat
├── run_full_stack.bat
└── README.md
```

## Local setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/RaKa8904/SmartPOS-CRM-AI.git
cd SmartPOS-CRM-AI
```

### 2. Configure the database

Create a PostgreSQL database:

```sql
CREATE DATABASE smart_pos_crm_ai;
```

Create a backend environment file at `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:<your-password>@localhost:5432/smart_pos_crm_ai
```

Optional notification configuration:

```env
# Auth security
JWT_SECRET_KEY=change-me-access-secret
JWT_REFRESH_SECRET_KEY=change-me-refresh-secret
ACCESS_TOKEN_EXPIRE_MINUTES=20
REFRESH_TOKEN_EXPIRE_DAYS=7
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_MINUTES=15
INVITE_EXPIRE_HOURS=48
PASSWORD_RESET_EXPIRE_MINUTES=30
FRONTEND_URL=http://localhost:5173

# SMTP (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password

# SMS mode: mock, generic, or twilio
SMS_PROVIDER=mock

# mock mode: no external SMS provider required (logs to backend console)

# Twilio settings
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1XXXXXXXXXX

# Generic SMS settings (if SMS_PROVIDER=generic)
# SMS_PROVIDER_URL=https://your-sms-provider/send
# SMS_API_KEY=your-api-key
# SMS_SENDER_ID=SmartPOS
```

You can also copy defaults from `backend/.env.example`.

## Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend endpoints:

- API root: `http://127.0.0.1:8000/`
- Swagger UI: `http://127.0.0.1:8000/docs`

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

- App: `http://localhost:5173`

## Demo data

The repository includes a reset-and-seed utility for loading realistic SmartPOS demo data used by analytics and ML features.

Current seed profile:

- 10 categories
- 36 products
- 25 customers
- 63 invoices
- historical price changes for selected products
- invoice patterns designed to produce meaningful customer segments and price-drop eligibility

Run the seed utility:

```bash
cd backend
venv\Scripts\python.exe -m app.db.reset_seed_demo
```

This script clears business data tables and reseeds categories, products, customers, invoices, invoice items, and price history while keeping registered users intact.

## Build and validation

Frontend production build:

```bash
cd frontend
npm run build
```

## Main application areas

### Dashboard

- KPI cards for revenue, customers, and products
- revenue trend visualization
- top-product analytics

### Billing

- create invoices from product catalog
- GST-aware total calculation
- cash handling with amount tendered and change due

### Products and categories

- create, list, delete, and restock products
- assign products to categories
- manage GST rates and stock levels

### Customers

- browse customer records
- inspect invoice history by customer

### Pricing and notifications

- update product pricing
- identify customers who previously paid more than the current price
- prepare notification workflows for price-drop communication

### ML insights

- customer segmentation with K-means clustering
- next-product recommendations from invoice co-purchase history
- price prediction based on product price history

## Role access model

| Area          | Admin | Manager | Cashier |
| ------------- | ----- | ------- | ------- |
| Dashboard     | Yes   | Yes     | No      |
| Billing       | Yes   | Yes     | Yes     |
| Products      | Yes   | Yes     | No      |
| Categories    | Yes   | Yes     | No      |
| Customers     | Yes   | Yes     | Yes     |
| Pricing       | Yes   | Yes     | No      |
| Notifications | Yes   | Yes     | No      |
| ML Insights   | Yes   | Yes     | No      |

## Important implementation notes

- The backend expects `DATABASE_URL` in `backend/.env`
- CORS is configured for local Vite development on ports `5173` and `5174`
- The application is currently optimized for local development and demo usage
- Before production use, secrets and operational settings should be externalized and hardened

## API surface overview

Key backend route groups:

- `/auth` - registration and login
- `/products` - product management and restocking
- `/billing` - invoice creation and billing flows
- `/customers` - customer management
- `/customer-history` - customer invoice history
- `/categories` - category management
- `/pricing` - price updates
- `/price-drops` - eligible customer discovery after price changes
- `/notifications` - notification workflow endpoints
- `/analytics` - KPI and reporting endpoints
- `/ml` - segmentation, recommendations, and price prediction

## Known limitations

- The repository is development-focused and not yet production-hardened
- JWT secret management should be moved fully to environment configuration before deployment
- The current setup assumes a locally running PostgreSQL instance

## Roadmap ideas

- barcode-scanner integration
- returns and refunds workflow
- discount and coupon engine
- audit logs and admin controls
- containerized deployment and CI/CD

## Author

Developed by RaKa as a full-stack Smart POS + CRM + AI project for demonstration, learning, and portfolio use.
