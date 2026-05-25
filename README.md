# CareerCompass Pro

**Job Application & Career Intelligence Operating System for job seekers in Germany (EU expansion later)**

A comprehensive platform combining job application tracking, company intelligence, interview prep, contract analysis, and tax/payroll compliance — all designed for German employment market.

## Status

**Sprint 1: Foundation & Authentication** — 57 issues, solo developer, Docker-first local development.

## Quick Start

### Prerequisites
- Docker & Docker Compose (v20.10+)
- Node.js 18+ (for local development without Docker)
- Python 3.11+ (backend)
- PostgreSQL 15+ (or use docker-compose)

### Development Setup (5 minutes)

```bash
# Clone repo
git clone https://github.com/myrthetjaarda-lgtm/CareerCompassv2.git
cd CareerCompassv2

# Start all services (local dev environment)
docker-compose -f docker-compose.dev.yml up

# Services available:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API docs: http://localhost:8000/docs
# PostgreSQL: localhost:5432 (user: compass, pass: compass_dev)
# Redis: localhost:6379

# In another terminal, run migrations
docker-compose -f docker-compose.dev.yml exec backend python -m alembic upgrade head

# Seed test data (optional)
docker-compose -f docker-compose.dev.yml exec backend python scripts/seed_db.py
```

### Production Deployment (AWS)

```bash
# Build Docker images
docker build -t careercompass-frontend -f frontend/Dockerfile.prod frontend/
docker build -t careercompass-backend -f backend/Dockerfile.prod backend/

# Push to AWS ECR (after Sprint 1)
# Tag & push to AWS RDS, ECS, S3, Cognito
```

---

## Architecture

### System Overview

CareerCompass Pro is a full-stack application with clear separation of concerns:

**Frontend:** React 18 + TypeScript + TailwindCSS + React Query
**Backend:** Python FastAPI + Pydantic + SQLAlchemy + Alembic
**Database:** PostgreSQL + Redis (caching)
**Auth:** JWT (local dev), AWS Cognito (production)
**Storage:** Local (dev), AWS S3 (production)
**Infrastructure:** Docker Compose (dev), AWS ECS/RDS/S3/Cognito (production)

### Module Priority & Dependency Map

```
TIER 1: BLOCKS EVERYTHING
├── Infrastructure & Authentication (KAN-1 to KAN-8)
│   ├── Docker setup, local dev environment
│   ├── FastAPI + PostgreSQL + migrations
│   ├── JWT auth (local), Cognito migration path
│   └── API health checks, logging, monitoring
│
TIER 2: CORE FEATURES (start after Tier 1)
├── Career Profile & Document Vault (KAN-9 to KAN-15)
│   ├── User profile creation
│   ├── Resume/CV storage + versioning
│   ├── Cover letter templates
│   └── Document management (upload, tag, search)
│
├── Company Hubs (KAN-16 to KAN-22)
│   ├── Company data model
│   ├── Auto-fetch mission/vision/values
│   ├── Salary ranges, benefits, reviews
│   └── Company comparison tools
│
├── Job Application Tracker (KAN-23 to KAN-32)
│   ├── Job posting ingest (URL, manual, LinkedIn import)
│   ├── Application status workflow
│   ├── Timeline tracking (applied, interviews, offer)
│   └── Bulk actions, filtering, reporting
│
TIER 3: ENHANCED FEATURES (after Tier 2)
├── Interview Prep (KAN-33 to KAN-40)
│   ├── STAR method practice
│   ├── Red flag detection (from job posting)
│   ├── Question library (by role, seniority)
│   └── Post-interview scoring
│
├── Contract & Offer Analysis (KAN-41 to KAN-47)
│   ├── Contract upload + parsing
│   ├── Bruto/Netto salary calculator
│   ├── Benefits comparison (health, pension, etc.)
│   └── Red flag detection + recommendations
│
TIER 4: COMPLIANCE & LONGEVITY
├── Payroll & Tax Compliance (KAN-48 to KAN-52)
│   ├── Tax document storage
│   ├── Deduction categorization
│   ├── Steuererklärung preparation
│   └── Multi-language support (German, English, etc.)
│
├── Termination & Severance (KAN-53 to KAN-57)
│   ├── Termination agreement (Aufhebungsvertrag) analysis
│   ├── Severance calculator
│   ├── Legal rights by country
│   └── Next steps & job search strategy
```

### Code Structure

```
CareerCompassv2/
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components (auth, dashboard, etc.)
│   │   ├── modules/           # Feature modules (Profile, JobTracker, etc.)
│   │   ├── services/          # API clients (useQuery, useMutation hooks)
│   │   ├── types/             # TypeScript interfaces (shared with backend)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Helpers (formatting, validation)
│   │   ├── store/             # Zustand state management
│   │   ├── styles/            # TailwindCSS + theme
│   │   └── App.tsx
│   ├── public/
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   ├── docker-compose.dev.yml
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py              # JWT/Cognito endpoints
│   │   │   │   ├── users.py             # User profile
│   │   │   │   ├── documents.py         # Resume, cover letter vault
│   │   │   │   ├── companies.py         # Company data
│   │   │   │   ├── jobs.py              # Job postings
│   │   │   │   ├── applications.py      # Application tracker
│   │   │   │   ├── interviews.py        # Interview prep
│   │   │   │   ├── contracts.py         # Contract analysis
│   │   │   │   ├── payroll.py           # Tax & payroll
│   │   │   │   ├── termination.py       # Termination & severance
│   │   │   │   └── health.py            # Health checks
│   │   │   └── dependencies.py          # Shared auth, DB deps
│   │   │
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── document.py
│   │   │   ├── company.py
│   │   │   ├── job.py
│   │   │   ├── application.py
│   │   │   ├── interview.py
│   │   │   ├── contract.py
│   │   │   ├── payroll.py
│   │   │   └── termination.py
│   │   │
│   │   ├── schemas/               # Pydantic request/response models
│   │   │   └── (mirrors models/)
│   │   │
│   │   ├── services/              # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── document_service.py
│   │   │   ├── company_service.py  # Web scraping, data enrichment
│   │   │   ├── job_service.py      # Ingest, parsing, enrichment
│   │   │   ├── application_service.py
│   │   │   └── ...
│   │   │
│   │   ├── core/
│   │   │   ├── config.py           # Environment config
│   │   │   ├── security.py         # JWT, password hashing
│   │   │   ├── logger.py           # Structured logging
│   │   │   └── exceptions.py       # Custom exceptions
│   │   │
│   │   ├── db/
│   │   │   ├── session.py          # SQLAlchemy session management
│   │   │   ├── base.py             # Base declarative model
│   │   │   └── migrations/         # Alembic migrations
│   │   │
│   │   ├── external/
│   │   │   ├── aws.py              # S3, Cognito, etc. (mock locally)
│   │   │   ├── linkedin_scraper.py # LinkedIn job + profile scraping
│   │   │   ├── company_api.py      # Clearbit, Crunchbase, etc.
│   │   │   └── gemini_api.py       # Contract parsing, red flag detection
│   │   │
│   │   └── main.py                 # FastAPI app entry point
│   │
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── conftest.py
│   │
│   ├── scripts/
│   │   ├── seed_db.py              # Test data
│   │   └── migrations.py
│   │
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # Test, lint, coverage
│   │   ├── docker-build.yml        # Docker build on tag
│   │   └── deploy-aws.yml          # Deploy to AWS (later)
│   │
│   └── ISSUE_TEMPLATE/
│       ├── bug.md
│       ├── feature.md
│       └── story.md
│
├── docker-compose.dev.yml          # Local development
├── docker-compose.prod.yml         # Production (ECS reference)
├── .gitignore
├── .env.example
└── README.md (this file)
```

---

## Development Workflow

### 1. Before You Code: Sprint Planning

```bash
# Check GitHub Project board (automated from issue labels)
# Issues auto-sorted by:
# - Dependency (Infrastructure first, then Tier 2, etc.)
# - Effort (story points from label)
# - Status (To Do → In Progress → In Review → Done)

# Prioritized build order (critical path):
# Week 1: Auth + DB setup (KAN-1 to KAN-8)
# Week 2: User profile + document vault (KAN-9 to KAN-15)
# Week 3: Job tracker core (KAN-23 to KAN-32)
# Then: Company hubs, interview prep, contracts...
```

### 2. Writing Code

**Frontend (React + TypeScript)**

```bash
# Start dev server
docker-compose -f docker-compose.dev.yml up frontend

# Run tests
docker-compose -f docker-compose.dev.yml exec frontend npm test

# Build for production
npm run build
```

**Backend (FastAPI)**

```bash
# Start API server (hot reload enabled)
docker-compose -f docker-compose.dev.yml up backend

# Run tests
docker-compose -f docker-compose.dev.yml exec backend pytest

# Create migration
docker-compose -f docker-compose.dev.yml exec backend alembic revision --autogenerate -m "Add new field"

# Run migration
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

### 3. Testing & Quality

All CI/CD runs automatically on push (GitHub Actions):

```
Push → Lint (ESLint, Black, Ruff) → Test (Jest, pytest) → Docker build → Docker push (on tag)
```

**Local testing before push:**

```bash
# Frontend
npm run lint
npm run test

# Backend
black app/
ruff check app/
pytest

# Both
docker-compose -f docker-compose.dev.yml up --build
```

### 4. Git Workflow

```bash
# Create feature branch
git checkout -b feat/KAN-1-setup-auth

# Commit with issue reference
git commit -m "feat: JWT authentication endpoints (KAN-1)"

# Push & create PR
git push origin feat/KAN-1-setup-auth

# PR triggers CI (tests, lint, Docker build)
# Merge to main after review

# Tag release
git tag v0.1.0
git push origin v0.1.0  # Triggers Docker push to registry
```

---

## Environment Configuration

### Local Development (.env.dev)

```env
# Backend
ENVIRONMENT=development
SECRET_KEY=dev-secret-key-change-in-production
DATABASE_URL=postgresql://compass:compass_dev@postgres:5432/compass_dev
REDIS_URL=redis://redis:6379/0
DEBUG=True
LOG_LEVEL=DEBUG

# Auth (JWT)
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# AWS (mocked locally)
AWS_REGION=eu-central-1
AWS_COGNITO_USER_POOL_ID=mock-pool-id
AWS_COGNITO_CLIENT_ID=mock-client-id
AWS_S3_BUCKET=compass-dev-bucket
USE_AWS=False  # Use local mocks

# Frontend
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
```

### Production (AWS)

After Sprint 1, migrate to:

```env
ENVIRONMENT=production
SECRET_KEY=[generated via AWS Secrets Manager]
DATABASE_URL=[AWS RDS Postgres endpoint]
AWS_REGION=eu-central-1
USE_AWS=True
AWS_COGNITO_USER_POOL_ID=[real pool ID]
AWS_S3_BUCKET=careercompass-prod
```

---

## Key Technologies

**Frontend**
- **React 18** + **TypeScript** for type-safe UI
- **TailwindCSS** for styling
- **React Query** for server state management
- **Zustand** for client state
- **React Hook Form** for forms
- **Zod** for schema validation
- **Vite** for fast bundling
- **Jest** + **React Testing Library** for tests

**Backend**
- **FastAPI** for high-performance async API
- **Pydantic** for request/response validation
- **SQLAlchemy 2.0** for ORM
- **Alembic** for database migrations
- **pytest** for testing
- **Black** + **Ruff** for code quality
- **Uvicorn** for ASGI server
- **Python-jose** for JWT auth

**Database & Cache**
- **PostgreSQL 15** for relational data
- **Redis** for sessions, caching, rate limiting
- **Alembic** for version-controlled migrations

**Infrastructure**
- **Docker** & **Docker Compose** for containerization
- **GitHub Actions** for CI/CD
- **AWS** (RDS, S3, Cognito, ECS) for production (post-Sprint 1)

---

## Deployment

### Local (Development)

```bash
docker-compose -f docker-compose.dev.yml up
```

### Production (AWS)

```bash
# After Sprint 1 is complete
# 1. Create AWS account + set up RDS, S3, Cognito
# 2. Update .env.prod with AWS credentials
# 3. Build & push Docker images to ECR
# 4. Deploy to ECS + ALB
# 5. Set up CloudFront CDN for frontend

# See: deployment/ directory (coming in Sprint 2)
```

---

## Roadmap

**Sprint 1: Foundation** (Current)
- Infrastructure & containerization
- Authentication (JWT → Cognito migration path)
- User profile + document vault
- Database schema + migrations
- CI/CD pipeline

**Sprint 2: Core Features** (4-6 weeks)
- Job application tracker
- Company intelligence
- Interview prep tools

**Sprint 3: Analysis & Compliance** (6-8 weeks)
- Contract analysis + calculator
- Tax & payroll compliance
- Termination & severance tools

**Sprint 4+: Scale & Polish**
- Mobile app (React Native)
- EU expansion (multi-language)
- Machine learning (red flag detection, salary recommendations)

---

## Contributing

### Solo Developer Checklist

Before pushing code:

```
[ ] Tests pass (frontend & backend)
[ ] Code is linted (ESLint, Black, Ruff)
[ ] No console errors or warnings
[ ] Database migrations are created (if schema changed)
[ ] Commit message references issue (e.g., KAN-1)
[ ] PR description explains changes + testing steps
```

### Code Standards

- **TypeScript**: Strict mode, no `any` types
- **Python**: Type hints on all functions, docstrings
- **Testing**: ≥80% coverage for new features
- **Commits**: Use conventional commits (feat, fix, docs, etc.)

---

## Support & Debugging

### Common Issues

**Docker containers won't start**
```bash
docker-compose -f docker-compose.dev.yml down -v  # Remove volumes
docker-compose -f docker-compose.dev.yml up --build
```

**Database migration failed**
```bash
docker-compose -f docker-compose.dev.yml exec backend alembic downgrade -1
# Fix migration file, then:
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

**Port already in use**
```bash
# Change port in docker-compose.dev.yml or:
docker ps  # Find container using port
docker kill <container-id>
```

**Frontend can't reach backend**
- Check `REACT_APP_API_URL` in `.env`
- Ensure backend is running: `curl http://localhost:8000/health`
- Check browser console for CORS errors

### Logs

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend
```

---

## Contact & Feedback

Solo developer? Questions? Open an issue on GitHub.

---

**Last updated:** 2026-05-25
**Status:** Sprint 1 — Foundation & Authentication
