🧩 SmartPOS-CRM-AI — Setup & Run Guide
This project is a full-stack Smart POS + CRM system with AI insights, built using FastAPI (Backend), React + Vite (Frontend), and PostgreSQL (Database).

It supports:
Product & billing management
Customer tracking
Analytics & ML-based insights
Secure authentication

🛠️ System Requirements
Make sure the following are installed on your system:
Python 3.10+
Node.js 18+
PostgreSQL 14+
Git

📁 Project Structure (Important)
SMARTPOS-CRM-AI/
├── backend/        # FastAPI backend
├── frontend/       # React frontend (Vite)
├── ml_models/      # ML logic
├── run_backend.bat
├── run_frontend.bat
├── run_full_stack.bat
└── README.md

🗄️ Database Setup (VERY IMPORTANT)
1️⃣ Create Database
Open PowerShell / CMD and run:
psql -U postgres
Inside psql:
CREATE DATABASE smart_pos_crm_ai;


2️⃣ Restore Database
Navigate to the folder containing the SQL dump:
cd path\to\sql_backup_folder

Run:
psql -U postgres smart_pos_crm_ai < smart_pos_crm_ai.sql
If no error appears → database restored successfully ✅

🔧 Backend Setup (FastAPI)
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

Run backend:
uvicorn app.main:app --reload

Backend will run at:
http://127.0.0.1:8000

API Docs:
http://127.0.0.1:8000/docs

🎨 Frontend Setup (React + Vite)
cd frontend
npm install
npm run dev

Frontend will run at:
http://localhost:5173

▶️ One-Click Run (Windows)

For convenience:
run_backend.bat → Starts backend
run_frontend.bat → Starts frontend
run_full_stack.bat → Starts both

🔐 Authentication
Login & Registration are available
JWT-based authentication
Protected routes handled on frontend

🤖 ML Features
Customer segmentation
Product recommendations
Price prediction
These features depend on existing data in the database.

❗ Common Issues
CORS error → Ensure backend is running first
DB connection error → Check database name & restore step
Blank ML insights → Ensure products & customers exist

📌 Notes for Reviewers
This project demonstrates full-stack integration
Focus is on architecture & working pipeline, not deployment
Designed for academic demonstration & learning

👨‍💻 Author
RaKA
Project implemented for academic demonstration purposes.
