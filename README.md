# CareerCompass Pro

Job Application & Career Intelligence Operating System for Germany + EU.

## Features

**10 Core Modules:**
1. **Career Profile & Document Vault** - Resume upload, skills extraction, encrypted document storage
2. **Company Hubs** - Per-company intelligence, salary benchmarking, sharing controls
3. **Job Application Tracker** - Pipeline, CV matching, red flags, analytics
4. **Interview Prep** - Question library, STAR practice, post-interview scoring
5. **Contract & Offer Analysis** - Upload parsing, Bruto/Netto calculator, red flag detection
6. **Payroll & Tax Compliance** - Tax organizer, Steuererklärung helper, payroll checklists
7. **Termination & Severance** - Legal rights, severance calculator, Aufhebungsvertrag analyzer
8. **Analytics & Reporting** - Job funnel, salary trends, company benchmarking
9. **Department Customization** - Recruitment, Payroll, Culture, Onboarding views
10. **Integrations** - LinkedIn, Gmail, Google Calendar, Glassdoor, Kununu

## Tech Stack

**Frontend:** React 18 + TypeScript, Tailwind CSS, Redux Toolkit
**Backend:** FastAPI (Python), PostgreSQL, Redis, Celery
**AI/ML:** Tesseract OCR, spaCy NLP, GPT-4 Vision API, Whisper API
**Infrastructure:** Docker, GitHub Actions, AWS (VPC, RDS, S3, CloudFront)

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/myrthetjaarda-lgtm/CareerCompassv2.git
cd CareerCompassv2
cp .env.example .env
```

### 2. Start Development Environment

```bash
docker-compose up --build
```

This starts:
- PostgreSQL (localhost:5432)
- Redis (localhost:6379)
- FastAPI Backend (localhost:8000)
- React Frontend (localhost:3000)

### 3. Access Services

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **Database:** postgres://carecompass_user@localhost:5432/carecompass_dev

## Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pytest tests/  # Run tests
black app/  # Format code
```

### Frontend

```bash
cd frontend
npm install
npm start  # Dev server at localhost:3000
npm test   # Run tests
npm run lint  # ESLint
```

## Project Structure

```
.
├── frontend/           # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── styles/
│   ├── Dockerfile
│   └── package.json
│
├── backend/            # FastAPI backend
│   ├── app/
│   │   ├── routers/    # API endpoints
│   │   ├── models/     # SQLAlchemy models
│   │   ├── schemas/    # Pydantic schemas
│   │   ├── services/   # Business logic
│   │   └── utils/      # Helper functions
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── migrations/     # Alembic migrations
│
├── infra/              # Infrastructure
│   ├── terraform/      # Terraform configs
│   ├── docker/         # Docker configs
│   └── kubernetes/     # K8s manifests
│
├── docs/               # Documentation
├── .github/
│   ├── workflows/      # GitHub Actions
│   └── ISSUE_TEMPLATE/ # Issue templates
│
├── docker-compose.yml  # Local dev environment
├── .env.example        # Environment template
├── .gitignore          # Git ignore rules
└── README.md          # This file
```

## GitHub Issues

All 57 Sprint 1 issues available: https://github.com/myrthetjaarda-lgtm/CareerCompassv2/issues

**8 Epics:**
- Infrastructure, Authentication & Core API (8 issues)
- Career Profile & Document Vault (8 issues)
- Company Hubs (8 issues)
- Job Application Tracker (9 issues)
- Interview Prep & Performance (6 issues)
- Contract & Offer Analysis (5 issues)
- Payroll & Tax Compliance (5 issues)
- Employment Termination & Severance (6 issues)

## Roadmap

- **Phase 1 MVP** (Q3 2026, 16 weeks): Core features
- **Phase 2** (Q4 2026): LinkedIn import, transcription, Outlook
- **Phase 3** (Q2 2027): Spain/Italy/France localization, department customization
- **Phase 4** (Q4 2027): Enterprise SSO, API access, community

## Pricing

- **Free:** 5 applications/month, basic features
- **Premium:** €11.99/month (unlimited, AI-powered)
- **Pro:** €24.99/month (everything + recording + lawyer discounts)
- **Enterprise:** Custom (SSO, API, role-based access)

## Contributing

This is a solo project. When hiring, follow the Contributing Guidelines.

## License

MIT License - See LICENSE file for details

## Contact

**Founder:** Myrthe Tjaarda  
**Email:** myrthe@carecompass.pro  
**Location:** Berlin, Germany

