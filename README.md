# AI Resume Analyzer

![AI Resume Analyzer](./assets/ai-resume-analyzer-hero.svg)

An AI-powered resume analysis platform that helps job seekers evaluate and improve their resumes using large language models. The application analyzes resume content against ATS (Applicant Tracking System) criteria, compares resumes against specific job descriptions, generates improved rewrites, and produces tailored cover letters — all through a secure, authenticated web interface.

## Overview

Job seekers often have no visibility into how their resume performs against automated ATS screening or how well it aligns with a specific job posting. This project addresses that gap by combining PDF text extraction with LLM-based analysis to give users structured, actionable feedback — an ATS compatibility score, skill-gap analysis, AI-rewritten content, and a generated cover letter — without needing to guess what recruiters or automated systems are looking for.

## Key Features

- **Resume Upload & Parsing** — Drag-and-drop PDF upload with server-side text extraction (PyMuPDF)
- **ATS Resume Analysis** — AI-generated ATS compatibility score, extracted/missing skills, strengths, weaknesses, and actionable suggestions
- **Resume vs Job Description Match** — Match score, matching/missing skills, and a tailored recommendation based on a specific job description
- **AI Resume Rewrite** — AI-improved professional summary, experience, projects, skills, and keyword suggestions, optionally tailored to a job description
- **AI Cover Letter Generation** — Structured, plain-text cover letter (recipient, subject, greeting, body, closing, signature) generated from the resume and job description
- **Export Options** — Download analysis reports and cover letters as PDF or DOCX, and copy cover letters to clipboard
- **User Authentication** — Email/password signup, login, and password reset via Supabase Auth
- **Light/Dark Theme** — Persistent, user-toggleable theme
- **Resume Versions API** — Backend REST API for creating, listing, renaming, duplicating, comparing, and deleting saved resume versions, scoped per authenticated user (frontend management UI status: *to be confirmed*)

## User Workflow

```
User (Browser)
   → React Frontend (Vercel)
      → FastAPI Backend (Render)
         → PDF text extraction (PyMuPDF)
         → Groq LLM API (Llama 3.3 70B) for analysis/rewrite/cover letter generation
         → Supabase (Auth + Postgres) for user sessions and resume version storage
      → Structured JSON response
   → Results rendered in the dashboard (score, skills, suggestions, etc.)
```

Users authenticate via Supabase Auth, upload a resume PDF, optionally paste a job description, and select one of four AI actions. Results are rendered directly in the dashboard, with options to export as PDF/DOCX or copy to clipboard.

## Tech Stack

**Frontend**
- React (Vite)
- React Router (`react-router-dom`)
- Tailwind CSS v4 (Vite plugin, no `tailwind.config.js`)
- Axios (API client)
- jsPDF (client-side PDF export)
- `docx` + `file-saver` (client-side DOCX export)

**Backend**
- FastAPI
- Uvicorn (ASGI server)
- Pydantic (request/response schemas)
- python-multipart (file upload handling)

**AI / LLM**
- Groq API (Llama 3.3 70B — `llama-3.3-70b-versatile`)

**Database / Auth**
- Supabase Auth (JWT-based authentication)
- Supabase Postgres (`resume_versions` table, Row Level Security enabled)
- `supabase-py` (backend Supabase client, service-role access)
- `python-jose` (JWT verification on the backend)

**PDF Processing**
- PyMuPDF (`fitz`) — server-side PDF text extraction

**Deployment**
- Frontend: Vercel
- Backend: Render

## Architecture

```
┌─────────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│   React Frontend     │  HTTPS │   FastAPI Backend      │  HTTPS │   Groq API        │
│   (Vercel)            │ ─────▶ │   (Render)             │ ─────▶ │   (Llama 3.3 70B) │
│                       │        │                        │        └─────────────────┘
│  - Auth (Supabase)    │        │  /resume/*             │
│  - Dashboard UI       │        │  /versions/*           │        ┌─────────────────┐
│  - PDF/DOCX export     │        │                        │ ─────▶ │   Supabase        │
└─────────────────────┘        │  - PDF extraction (fitz)│        │   (Auth + Postgres)│
                                  │  - JWT verification    │        └─────────────────┘
                                  └──────────────────────┘
```

## Project Structure

```
resume-analyzer/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── app/
│       ├── core/
│       │   ├── config.py
│       │   └── supabase_client.py
│       ├── dependencies/
│       │   └── auth.py
│       ├── routes/
│       │   ├── resume.py
│       │   └── versions.py
│       ├── schemas/
│       │   ├── resume_schema.py
│       │   └── version_schema.py
│       └── services/
│           ├── gemini_service.py      # Groq-backed resume analysis (legacy filename)
│           ├── jd_match_service.py
│           ├── rewrite_service.py
│           ├── cover_letter_service.py
│           ├── version_service.py
│           └── pdf_extractor.py
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── lib/
        │   └── supabaseClient.js
        ├── context/
        │   ├── AuthContext.jsx
        │   └── ThemeContext.jsx
        ├── components/
        │   ├── ProtectedRoute.jsx
        │   └── ThemeToggle.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Signup.jsx
        │   ├── ForgotPassword.jsx
        │   ├── ResetPassword.jsx
        │   └── Dashboard.jsx
        └── services/
            ├── apiClient.js
            └── resumeService.js
```

> Note: `gemini_service.py` is a legacy filename retained from an earlier provider migration — it currently uses the Groq API, not Google Gemini.

## API Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Health check |
| POST | `/resume/analyze` | Upload a resume PDF and return ATS analysis (score, skills, strengths, weaknesses, suggestions) |
| POST | `/resume/match-jd` | Compare a resume against a job description (match score, skill gaps, recommendation) |
| POST | `/resume/rewrite` | Generate an improved rewrite of the resume, optionally tailored to a job description |
| POST | `/resume/cover-letter` | Generate a structured cover letter from a resume and job description |
| POST | `/versions` | Upload a PDF and create a new saved resume version (authenticated) |
| GET | `/versions` | List all resume versions for the authenticated user |
| GET | `/versions/{id}` | Get full detail of a specific resume version |
| PATCH | `/versions/{id}` | Rename a resume version |
| POST | `/versions/{id}/duplicate` | Duplicate a resume version |
| PATCH | `/versions/{id}/set-active` | Mark a resume version as active |
| DELETE | `/versions/{id}` | Delete a resume version |
| POST | `/versions/compare` | Return raw text of two resume versions for client-side comparison |

All `/versions/*` endpoints require a valid Supabase-issued JWT (Bearer token) and are scoped to the authenticated user.

## Security

- All secrets (API keys, database credentials, JWT secrets) are managed via environment variables and are **not committed to source control** (`.env` is excluded via `.gitignore`).
- Backend endpoints under `/versions/*` require JWT authentication; the authenticated user's ID (from the verified token) is used for every database query — user-supplied IDs from request bodies are never trusted.
- The Supabase `resume_versions` table has Row Level Security (RLS) enabled as a database-level safety net in addition to application-level authorization checks.
- CORS is restricted to explicitly configured allowed origins.

## Local Development

### Prerequisites
- Node.js and npm
- Python 3.10+
- A Groq API key
- A Supabase project (URL, service role key, JWT secret, anon key)

### Clone the repository
```bash
git clone https://github.com/sompallesandhya-art/resume-analyzer.git
cd resume-analyzer
```

### Backend setup
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```
GROQ_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
```

Run the backend:
```bash
uvicorn main:app --reload
```

### Frontend setup
```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Run the frontend:
```bash
npm run dev
```

## Environment Variables

**Backend**
- `GROQ_API_KEY`
- `ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

**Frontend**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Deployment

- **Frontend:** Deployed on [Vercel](https://vercel.com)
  Live URL: [https://resume-analyzer-six-ochre.vercel.app](https://resume-analyzer-six-ochre.vercel.app)
- **Backend:** Deployed on [Render](https://render.com) as a Python web service (root directory: `backend`)

## Live Demo

**[https://resume-analyzer-six-ochre.vercel.app](https://resume-analyzer-six-ochre.vercel.app)**

*Screenshots to be added.*

## Engineering Highlights

- Full-stack architecture with a decoupled React frontend and FastAPI backend deployed on separate platforms (Vercel + Render)
- REST API design with clear resource-based routing (`/resume/*`, `/versions/*`)
- LLM integration (Groq/Llama 3.3) with structured JSON-mode prompting and defensive response parsing (handling markdown-wrapped and malformed JSON output)
- Server-side PDF text extraction pipeline (PyMuPDF)
- JWT-based authentication with per-request identity verification, independent of any single provider's SDK on the backend
- Database access pattern that enforces user-scoped authorization at the application layer, backed by Postgres Row Level Security
- Client-side document generation (PDF via jsPDF, DOCX via the `docx` library) without additional backend load

## Future Improvements

*The following are potential future enhancements and are not currently implemented:*

- Frontend UI for managing resume versions (list, compare, restore)
- Resume analysis history and dashboard analytics (score trends, usage stats)
- Job application tracker
- AI-powered interview preparation
- Conversational AI resume assistant
- Voice-based mock interview practice
- Subscription/premium tiering

## Author

**Sompalle Sandhya**
AI Engineer | Full-Stack AI Developer

GitHub: [https://github.com/sompallesandhya-art](https://github.com/sompallesandhya-art)
