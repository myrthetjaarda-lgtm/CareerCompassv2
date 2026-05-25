# Sprint 1: Critical Path & Build Order

**Goal:** Foundation & Authentication
**Timeline:** 4-6 weeks solo
**Status:** 57 GitHub issues ready

## Executive Summary

**DO NOT START** coding randomly. Follow this critical path to unblock everything else.

**Week 1 (Infrastructure)** → **Week 2 (Auth + DB)** → **Week 3 (User + Docs)** → **Week 4 (Job Tracker)**

---

## TIER 1: BLOCKS EVERYTHING (Do First)

### Week 1: Docker + Local Dev Environment

These 4 issues unblock all other development. **No feature code** yet — just infrastructure.

**KAN-1: Set up Docker & docker-compose**
- [ ] Create `docker-compose.dev.yml` with backend, frontend, postgres, redis
- [ ] Dockerfile for backend (Python FastAPI)
- [ ] Dockerfile for frontend (Node + Vite)
- [ ] All services start with `docker-compose up`
- [ ] Health checks on all containers
- **Effort:** 2 points
- **Depends on:** Nothing
- **Test:** `docker-compose up` → all services healthy

**KAN-2: FastAPI app scaffold + project structure**
- [ ] FastAPI application entry point (`app/main.py`)
- [ ] Project directory structure (models, schemas, services, api)
- [ ] CORS configuration
- [ ] Error handling middleware
- [ ] Logging configuration
- [ ] Health check endpoint (`GET /health`)
- **Effort:** 2 points
- **Depends on:** KAN-1
- **Test:** `curl http://localhost:8000/health` returns 200

**KAN-3: PostgreSQL connection + Alembic migrations**
- [ ] SQLAlchemy configuration (`app/db/session.py`)
- [ ] Base declarative model (`app/db/base.py`)
- [ ] Alembic initialized for migrations
- [ ] Connection pooling configured
- [ ] Migration commands working
- **Effort:** 2 points
- **Depends on:** KAN-1, KAN-2
- **Test:** `alembic upgrade head` succeeds, health check confirms DB connection

**KAN-4: GitHub Actions CI/CD setup**
- [ ] `.github/workflows/ci.yml` (lint, test, build)
- [ ] `.github/workflows/docker-build.yml` (Docker push on tag)
- [ ] Status badges in README
- [ ] All workflows passing
- **Effort:** 1 point
- **Depends on:** KAN-1, KAN-2
- **Test:** Push to main → CI runs, no failures

**Status:** After KAN-1 to KAN-4, you have a working local dev environment.

---

### Week 2: Authentication & Security

These 4 issues handle user auth. **Blocks user profile, job tracker, everything else.**

**KAN-5: JWT authentication implementation**
- [ ] `app/core/security.py` with JWT token generation/validation
- [ ] Password hashing (bcrypt)
- [ ] Token expiration logic
- [ ] Refresh token mechanism
- [ ] `app/api/v1/auth.py` endpoints:
  - `POST /auth/register` (create user)
  - `POST /auth/login` (get JWT token)
  - `POST /auth/refresh` (refresh expired token)
- **Effort:** 3 points
- **Depends on:** KAN-1 to KAN-4
- **Test:** `POST /auth/register` creates user, `POST /auth/login` returns JWT, token validates

**KAN-6: User model + database schema**
- [ ] `User` model in SQLAlchemy:
  - `id`, `email`, `hashed_password`, `first_name`, `last_name`
  - `created_at`, `updated_at`
  - `is_active`, `is_verified`
- [ ] Initial Alembic migration
- [ ] Unique constraints on email
- **Effort:** 1 point
- **Depends on:** KAN-3
- **Test:** `alembic upgrade head` creates users table, can insert/query users

**KAN-7: Protected route middleware + current_user dependency**
- [ ] `app/api/dependencies.py` with `get_current_user()`
- [ ] JWT validation on protected endpoints
- [ ] User object injectable into route handlers
- [ ] 401 Unauthorized for missing/invalid tokens
- **Effort:** 1 point
- **Depends on:** KAN-5, KAN-6
- **Test:** `GET /me` with token returns user, without token returns 401

**KAN-8: Environment configuration + .env management**
- [ ] `app/core/config.py` with Pydantic settings
- [ ] `.env.example` with all required vars
- [ ] Local dev `.env` (git-ignored)
- [ ] Docker env vars in `docker-compose.dev.yml`
- [ ] Support for `ENVIRONMENT` (development/test/production)
- **Effort:** 1 point
- **Depends on:** KAN-2
- **Test:** App starts with `.env`, config loads correctly, `ENVIRONMENT=test` works

**Status:** After KAN-5 to KAN-8, you have authentication. Next features can protect routes with `@get_current_user`.

---

## TIER 2: CORE FEATURES (Start After Week 2)

### Week 2-3: User Profile & Document Vault

These 7 issues handle user data + resume/CV storage. **Unblocks company hubs, job tracker.**

**KAN-9: User profile model + CRUD endpoints**
- [ ] Extend `User` model:
  - `location`, `phone`, `timezone`, `profile_picture_url`
  - `current_role`, `years_experience`, `industry`
  - `bio`, `linkedin_url`, `github_url`
- [ ] Alembic migration
- [ ] `GET /api/v1/users/me` (current user profile)
- [ ] `PUT /api/v1/users/me` (update profile)
- **Effort:** 2 points
- **Depends on:** KAN-6, KAN-7
- **Test:** Create user, update profile, verify fields persist

**KAN-10: Document model + file upload infrastructure**
- [ ] `Document` model:
  - `id`, `user_id`, `filename`, `file_type` (resume, cover_letter, etc.)
  - `storage_path`, `upload_date`, `size_bytes`
  - `is_primary` (which resume is "active")
  - `tags` (JSON field for categorization)
- [ ] Alembic migration
- [ ] Local file storage (`/uploads/documents/`)
- [ ] File size validation (max 50MB)
- [ ] Allowed file types (PDF, DOCX, TXT, ODT)
- **Effort:** 2 points
- **Depends on:** KAN-6
- **Test:** Upload PDF, file saved locally, metadata in DB

**KAN-11: Document upload/download endpoints**
- [ ] `POST /api/v1/documents` (multipart upload)
- [ ] `GET /api/v1/documents` (list user's documents)
- [ ] `GET /api/v1/documents/{id}/download` (download file)
- [ ] `DELETE /api/v1/documents/{id}` (delete file + DB record)
- [ ] `PUT /api/v1/documents/{id}` (mark as primary, update tags)
- **Effort:** 2 points
- **Depends on:** KAN-10, KAN-7
- **Test:** Upload → list → download → verify file matches original

**KAN-12: Document versioning + history**
- [ ] Track upload date, version number per document
- [ ] `GET /api/v1/documents/{id}/versions` (list all versions)
- [ ] Store up to 5 versions per document (auto-delete old ones)
- [ ] `PATCH /api/v1/documents/{id}/restore/{version}` (restore old version)
- **Effort:** 2 points
- **Depends on:** KAN-11
- **Test:** Upload new version, old version retrievable, history shows all

**KAN-13: Resume/CV text extraction (Google Docs integration optional)**
- [ ] Extract text from uploaded PDF/DOCX
- [ ] Store extracted text in DB (searchable)
- [ ] Manual text input fallback (paste resume text)
- [ ] `GET /api/v1/documents/{id}/text` (return extracted text)
- **Effort:** 2 points (1 if skipping extraction, doing manual only)
- **Depends on:** KAN-11
- **Test:** Upload PDF, extract text, search by name/email found

**KAN-14: Cover letter templates + quick generation**
- [ ] `CoverLetterTemplate` model with placeholders: `{company_name}`, `{role}`, `{hiring_manager}`
- [ ] Pre-built templates (generic, by industry)
- [ ] `POST /api/v1/cover-letters` (create from template)
- [ ] `PUT /api/v1/cover-letters/{id}` (edit, save as document)
- [ ] Variable replacement logic
- **Effort:** 2 points
- **Depends on:** KAN-9, KAN-10
- **Test:** Create cover letter from template, variables replaced, saves as document

**KAN-15: Document search + filtering**
- [ ] `GET /api/v1/documents?search=&type=&tag=` query params
- [ ] Full-text search on document text content
- [ ] Filter by type (resume, cover_letter, etc.)
- [ ] Filter by tags (Python, manager, remote, etc.)
- [ ] Sort by upload date, name, type
- **Effort:** 1 point
- **Depends on:** KAN-13
- **Test:** Upload multiple docs with tags, search returns correct results

**Status:** After KAN-9 to KAN-15, users can manage profiles and documents. Ready for job tracker.

---

### Week 3-4: Job Application Tracker Core

These 10 issues handle job posting ingest and application tracking. **Unblocks company hubs, interview prep.**

**KAN-23: Job posting model + database schema**
- [ ] `Job` model:
  - `id`, `user_id`, `title`, `company_name`, `location`
  - `job_url` (source URL), `description_text` (full JD)
  - `salary_range_min`, `salary_range_max`, `currency`
  - `employment_type` (full-time, contract, etc.)
  - `required_languages`, `benefits_tags`
  - `posted_date`, `application_deadline`, `created_at`
  - `tags` (JSON: languages, remote, salary_range, etc.)
- [ ] Alembic migration
- [ ] Indexes on user_id, created_at, status
- **Effort:** 1 point
- **Depends on:** KAN-3
- **Test:** Create job, verify all fields persist, can query by user

**KAN-24: Job posting ingest (manual + URL import)**
- [ ] `POST /api/v1/jobs` (manual entry with all fields)
- [ ] `POST /api/v1/jobs/import` (paste URL → auto-fetch + parse)
- [ ] Web scraper for common job boards (LinkedIn, Indeed, StepStone, etc.)
- [ ] Fallback: manual entry if scrape fails
- [ ] Extract: title, company, location, salary, JD text
- [ ] Dedupe: check if job already exists (by URL)
- **Effort:** 3 points
- **Depends on:** KAN-23
- **Test:** Paste LinkedIn URL → fields auto-populate, job created

**KAN-25: Application model + status tracking**
- [ ] `Application` model:
  - `id`, `job_id`, `user_id`, `status` (applied, screening, phone_call, interview, offer, rejected, withdrawn)
  - `date_applied`, `date_last_contact`, `expected_response_date`
  - `notes` (internal notes by user)
  - `salary_expectation`, `salary_offered`
  - `rating` (1-5 stars, user interest)
- [ ] Status transitions with timestamps
- [ ] Alembic migration
- [ ] Indexes on status, date_applied, user_id
- **Effort:** 1 point
- **Depends on:** KAN-23
- **Test:** Create job → create application → update status → timestamps recorded

**KAN-26: Application CRUD + status update endpoints**
- [ ] `POST /api/v1/applications` (apply to job)
- [ ] `GET /api/v1/applications` (list user's applications with filters)
- [ ] `GET /api/v1/applications/{id}` (single application details)
- [ ] `PATCH /api/v1/applications/{id}` (update status, notes, salary, rating)
- [ ] `DELETE /api/v1/applications/{id}` (withdraw application)
- [ ] Filter: status, date range, rating, salary range
- [ ] Sort: by date_applied, status, rating, expected_response_date
- **Effort:** 2 points
- **Depends on:** KAN-25, KAN-7
- **Test:** Create 5 applications with different statuses, filter/sort all work

**KAN-27: Application timeline + interview history**
- [ ] `InterviewEvent` model:
  - `id`, `application_id`, `event_type` (phone_screen, technical, behavioral, etc.)
  - `date`, `interviewer_name`, `notes`, `feedback_score`
  - `is_completed`, `next_steps`
- [ ] `POST /api/v1/applications/{id}/interviews` (log interview)
- [ ] `GET /api/v1/applications/{id}/timeline` (chronological events)
- [ ] `PATCH /api/v1/applications/{id}/interviews/{event_id}` (update feedback)
- [ ] Alembic migration
- **Effort:** 2 points
- **Depends on:** KAN-25
- **Test:** Create application → log 2 interviews → timeline shows both with dates

**KAN-28: Job application analytics (dashboards prep)**
- [ ] `GET /api/v1/applications/stats` (summary metrics):
  - Total applications, by status, by month
  - Average time to response
  - Offer rate (offers / applications)
  - Status breakdown pie chart data
- [ ] Aggregation queries (no real dashboard yet, just API)
- **Effort:** 2 points
- **Depends on:** KAN-26
- **Test:** Create 10 applications → stats endpoint returns accurate counts

**KAN-29: Bulk actions + import**
- [ ] `PATCH /api/v1/applications/bulk` (update multiple at once)
  - Bulk status change, add tags, delete
- [ ] CSV import endpoint (upload CSV with job postings)
  - Parse columns: title, company, url, location, salary
  - Create jobs + applications in one request
- [ ] `GET /api/v1/applications/export` (download as CSV)
- **Effort:** 2 points
- **Depends on:** KAN-26
- **Test:** Import 20 jobs from CSV → all created, bulk status update works

**KAN-30: Application reminders + notifications (prep)**
- [ ] `Reminder` model:
  - `id`, `application_id`, `reminder_type` (follow_up, response_deadline, interview_prep)
  - `scheduled_date`, `is_sent`
- [ ] `POST /api/v1/applications/{id}/reminders` (set reminder)
- [ ] Background task scaffold (Celery/APScheduler) for sending reminders
- [ ] (Actual email/push in Sprint 2)
- **Effort:** 1 point
- **Depends on:** KAN-25
- **Test:** Create reminder, scheduled_date set correctly, can query pending reminders

**KAN-31: Red flag detection (prep) + notes**
- [ ] Flag system for suspicious job postings:
  - No salary range, vague JD, "unlimited" travel, MLM vibes, etc.
- [ ] `flags` field (JSON) on Job model
- [ ] `POST /api/v1/jobs/{id}/flag` (user marks as suspicious)
- [ ] `GET /api/v1/jobs/flags` (list flagged jobs by reason)
- [ ] (ML red flag detection in Sprint 2)
- **Effort:** 1 point
- **Depends on:** KAN-23
- **Test:** Create job, mark as suspicious, appears in flagged list

**KAN-32: Application search + saved searches**
- [ ] Full-text search on job title, company, description
- [ ] `GET /api/v1/search?q=python+berlin` (cross-application search)
- [ ] `SavedSearch` model (save filter combos for reuse)
- [ ] `POST /api/v1/saved-searches`, `DELETE`, `GET /api/v1/saved-searches`
- **Effort:** 1 point
- **Depends on:** KAN-26
- **Test:** Search for "Python" → finds matching jobs/applications, saved search persists

**Status:** After KAN-23 to KAN-32, you have a fully functional job application tracker.

---

## TIER 3: ENHANCED FEATURES (Start Week 4+)

### Interview Prep (KAN-33 to KAN-40)

**KAN-33:** Question library + search
**KAN-34:** STAR method template + practice
**KAN-35:** Interview scorecards
**KAN-36:** Post-interview feedback
**KAN-37:** Red flag detection (from JD)
**KAN-38:** Interview reminders + prep checklist
**KAN-39:** Technical question bank (by role)
**KAN-40:** Video practice recording (optional)

### Company Hubs (KAN-16 to KAN-22)

**KAN-16:** Company model + data schema
**KAN-17:** Auto-fetch mission/vision/values (Crunchbase, LinkedIn)
**KAN-18:** Salary ranges + benefits intelligence
**KAN-19:** Glassdoor/Levels.fyi reviews integration
**KAN-20:** Company comparison tool
**KAN-21:** Company watchlist
**KAN-22:** Company research checklist

### Contract & Offer Analysis (KAN-41 to KAN-47)

**KAN-41:** Contract upload + PDF text extraction
**KAN-42:** Bruto → Netto salary calculator
**KAN-43:** Benefits comparison matrix
**KAN-44:** Red flag detection (low severance, unfair clauses)
**KAN-45:** Offer letter parsing + auto-comparison
**KAN-46:** Negotiation tips (by role, location)
**KAN-47:** Contract versioning + amendment tracking

### Payroll & Tax Compliance (KAN-48 to KAN-52)

**KAN-48:** Tax document upload + storage
**KAN-49:** Deduction categorization (Werbungskosten, etc.)
**KAN-50:** Steuererklärung data export
**KAN-51:** Multi-language support (German, English, French, Spanish)
**KAN-52:** Tax calculator preview

### Termination & Severance (KAN-53 to KAN-57)

**KAN-53:** Termination agreement (Aufhebungsvertrag) analysis
**KAN-54:** Severance calculator (by role, location, tenure)
**KAN-55:** Legal rights by country
**KAN-56:** Next steps guidance + job search strategy
**KAN-57:** Termination document templates

---

## Solo Developer Checklist

### Before Every Coding Session

- [ ] Review this critical path
- [ ] Pick the next unblocked issue
- [ ] Create feature branch: `git checkout -b feat/KAN-X-description`
- [ ] Check issue dependencies (ensure all are done first)

### During Coding

- [ ] Run tests locally: `pytest` (backend) or `npm test` (frontend)
- [ ] Run linter: `black`, `ruff` (backend) or `npm run lint` (frontend)
- [ ] Update issue: move to "In Progress" on GitHub
- [ ] Commit frequently: `git commit -m "feat: [KAN-X] clear description"`

### Before Pushing

- [ ] All tests pass
- [ ] Code is linted
- [ ] Database migrations created (if schema changed)
- [ ] No console errors/warnings
- [ ] Document any external dependencies (pip/npm)

### After Pushing

- [ ] Create PR with issue link
- [ ] Wait for CI (tests, lint, Docker build)
- [ ] Squash & merge when green
- [ ] Mark issue as "Done" on board
- [ ] Tag git commit once fully working

### Testing Strategy

**Unit tests:** 80%+ coverage on business logic (services, utils)
**Integration tests:** Auth flow, DB operations, API endpoints
**Manual testing:** Full feature flow in browser/Postman
**Load testing:** (Post-Sprint 1, AWS migration)

---

## Risk Mitigation

**Risk:** Scope creep (57 issues is a LOT)
**Mitigation:** Only code Tiers 1 & 2 in Sprint 1. Tier 3 is optional/future.

**Risk:** Database migrations fail mid-sprint
**Mitigation:** Commit migrations separately from code. Test rollback.

**Risk:** Docker or CI setup fails
**Mitigation:** Get KAN-1 and KAN-4 working FIRST. Block everything else until they're solid.

**Risk:** Authentication bugs compromise security
**Mitigation:** Lots of tests for KAN-5. Use industry-standard libs (python-jose, bcrypt, not homemade crypto).

---

## Done Criteria for Sprint 1

- All 32 Tier 1 + 2 issues closed (KAN-1 to KAN-32)
- CI/CD passing on all commits
- 80%+ test coverage
- README complete with setup instructions
- Docker environment working for new developers
- Zero high-severity bugs
- All issues have clear acceptance criteria in GitHub

---

**Next Step:** Follow this order. Don't jump around. Start with KAN-1 (Docker) today.
