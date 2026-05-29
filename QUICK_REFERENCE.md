# CareerCompass Pro: Quick Reference Card

**Print this or bookmark it. You'll reference it constantly.**

---

## Files Provided

### 📖 Read These First
```
00_START_HERE.md          ← Read this today (12-step setup)
README.md                 ← Setup instructions + architecture
SPRINT_1_CRITICAL_PATH.md ← Build order for 32 issues
```

### 📚 Keep for Reference
```
SOLO_DEVELOPER_PLAYBOOK.md ← Daily routine, hacks, emergency kit
AWS_STRATEGY.md           ← Local development → AWS migration
GITHUB_PROJECT_SETUP.md   ← Board automation
DELIVERY_SUMMARY.md       ← This file
```

### 🐳 Copy to Your Repo
```
docker-compose.dev.yml         → Root directory
Dockerfile.backend.dev         → backend/Dockerfile
Dockerfile.frontend.dev        → frontend/Dockerfile
ci.yml                         → .github/workflows/
docker-build.yml              → .github/workflows/
requirements.txt              → backend/
package.json                  → frontend/
```

---

## First Day Checklist (2 hours)

```
⏱️  0:00-0:20  Read 00_START_HERE.md
⏱️  0:20-0:40  Copy Docker files to repo
⏱️  0:40-0:50  Start Docker: docker-compose -f docker-compose.dev.yml up
⏱️  0:50-1:00  Verify all healthy: curl http://localhost:8000/health
⏱️  1:00-1:30  Set up GitHub Project board (57 issues, labels, filters)
⏱️  1:30-2:00  Read SPRINT_1_CRITICAL_PATH.md (understand Tier 1-2-3)
            You're ready to code.
```

---

## Daily Developer Commands

### Start Services
```bash
docker-compose -f docker-compose.dev.yml up
docker-compose -f docker-compose.dev.yml ps          # See status
docker-compose -f docker-compose.dev.yml logs -f     # Watch logs
```

### Create Feature Branch
```bash
git checkout -b feat/KAN-1-description
```

### Run Tests
```bash
docker-compose -f docker-compose.dev.yml exec backend pytest
docker-compose -f docker-compose.dev.yml exec frontend npm test
```

### Lint Code
```bash
docker-compose -f docker-compose.dev.yml exec backend black app/
docker-compose -f docker-compose.dev.yml exec backend ruff check app/
docker-compose -f docker-compose.dev.yml exec frontend npm run lint
```

### Commit & Push
```bash
git commit -m "feat: KAN-1 [clear description]"
git push origin feat/KAN-1-description
# Create PR on GitHub
# Watch CI pass ✓
# Merge to main
```

---

## Weekly Metrics Check (Friday 4 PM)

```
Questions to ask yourself:
[ ] How many issues closed this week?
[ ] Are you on track for Sprint 1 (32 issues in 4-6 weeks)?
[ ] Any blockers or gotchas?
[ ] Did you take breaks?
[ ] Are you burned out? (if yes, rest this weekend)
[ ] What's next week's focus?
```

---

## Emergency Kit (When Things Break)

### Docker Won't Start
```bash
docker-compose -f docker-compose.dev.yml down -v
docker system prune -a
docker-compose -f docker-compose.dev.yml up --build
```

### Database Migration Failed
```bash
docker-compose -f docker-compose.dev.yml exec backend alembic downgrade -1
# Fix migration file
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

### Tests Fail but Code Looks Right
```bash
rm -rf backend/.pytest_cache
rm -rf frontend/node_modules/.vite
docker-compose -f docker-compose.dev.yml exec backend pytest -vv
```

### Port Already in Use
```bash
docker ps
docker kill <container-id>
# Or edit docker-compose.dev.yml port mapping
```

### Git Mess (wrong branch, accidental commit)
```bash
git branch                      # Check current branch
git checkout -b feat/KAN-X      # Switch to right branch
git reset --soft HEAD~1         # Undo last commit, keep changes
git commit -m "correct message"
```

---

## 32 Issues Timeline

### Week 1 (Tier 1: Infrastructure)
```
KAN-1: Docker setup
KAN-2: FastAPI scaffold
KAN-3: PostgreSQL + Alembic
KAN-4: GitHub Actions CI/CD
KAN-5: JWT authentication
KAN-6: User model + database
KAN-7: Protected routes
KAN-8: Environment configuration

Target: 8/8 done by Friday
Status: 25% of Sprint 1 complete
```

### Week 2-3 (Tier 2a: User & Documents)
```
KAN-9: User profile model
KAN-10: Document model + file upload
KAN-11: Upload/download endpoints
KAN-12: Document versioning
KAN-13: Resume text extraction
KAN-14: Cover letter templates
KAN-15: Document search + filtering

Target: 15/32 done by Friday
Status: 47% of Sprint 1 complete
```

### Week 3-4 (Tier 2b: Job Application Tracker)
```
KAN-23: Job posting model
KAN-24: Job ingest (manual + URL)
KAN-25: Application model + status
KAN-26: Application CRUD + endpoints
KAN-27: Timeline + interview tracking
KAN-28: Analytics (stats endpoint)
KAN-29: Bulk actions + CSV import
KAN-30: Reminders (prep)
KAN-31: Red flag detection (prep)
KAN-32: Search + saved searches

Target: 32/32 done by Friday
Status: 100% of Sprint 1 complete ✓
```

---

## Services URLs (While Running)

```
Frontend:     http://localhost:3000
Backend API:  http://localhost:8000
API Docs:     http://localhost:8000/docs  ← Try endpoints here
Health Check: http://localhost:8000/health
PostgreSQL:   localhost:5432 (user: compass, pass: compass_dev)
Redis:        localhost:6379
```

---

## Key Decisions You've Made

| Decision | Sprint 1 | Sprint 2 |
|----------|----------|----------|
| **Storage** | Local files | AWS S3 |
| **Auth** | JWT | AWS Cognito |
| **Database** | PostgreSQL (Docker) | RDS (managed) |
| **API** | FastAPI (Docker) | ECS + ALB |
| **Frontend** | Vite dev server | CloudFront + S3 |
| **Cost** | $0 | $75-155/month |
| **Setup Time** | 10 min | 1 week |
| **Code Changes** | NONE (just env vars) |

---

## Productivity Hacks

```
✓ Pomodoro timer: 50 min focus + 10 min break
✓ Phone in another room (no distractions)
✓ Pair with Claude when stuck (5 min help > 3 hours alone)
✓ Test early, test often (find bugs sooner)
✓ Commit frequently (small, incremental changes)
✓ Take 1 day off per week (you need it)
✓ Don't work >6 hours/day focused (diminishing returns)
✓ Talk through blockers (rubber duck debugging)
✓ Switch issues if stuck >1 hour (context switch helps)
✓ Celebrate small wins (finished a Tier!)
```

---

## Common Pitfalls to Avoid

```
✗ Perfectionism: "Good enough" is done. Ship it.
✗ Scope creep: Write new ideas in new issues. Move on.
✗ Skipping tests: Tests find bugs early. Save time.
✗ Ignoring linting: Fix warnings. Takes 2 min.
✗ Staying up late: Sleep > code. Tired code = bugs.
✗ No breaks: Pomodoro timer. Rest your brain.
✗ Random issue picking: Follow critical path (Tier 1 → 2 → 3).
✗ No documentation: Comment as you code. Helps future you.
```

---

## Architecture at a Glance

```
FRONTEND (React 18 + TypeScript)
├─ Pages: Auth, Dashboard, Profile, JobTracker, etc.
├─ Components: Reusable UI elements
├─ Services: API calls (useQuery, useMutation)
├─ Store: Zustand (global state)
└─ Styles: TailwindCSS

BACKEND (FastAPI + Python)
├─ API routes: /api/v1/{auth,users,documents,jobs,...}
├─ Models: SQLAlchemy ORM (User, Document, Job, Application)
├─ Services: Business logic (auth_service, storage_service, ...)
├─ Schemas: Pydantic request/response validation
└─ DB: PostgreSQL with Alembic migrations

DATABASE (PostgreSQL + Redis)
├─ Tables: users, documents, jobs, applications, interviews
├─ Migrations: Auto-generated by Alembic
└─ Cache: Redis for sessions, rate limiting

INFRASTRUCTURE
├─ Local: Docker Compose (dev)
├─ Staging: Docker (later)
└─ Production: AWS ECS + RDS + S3 + Cognito (Sprint 2)
```

---

## How to Know You're On Track

| Milestone | Target | Status |
|-----------|--------|--------|
| Tier 1 (KAN-1 to 8) | Week 1 | 8/8 done? |
| Tier 2a (KAN-9 to 15) | Week 2-3 | 7/7 done? |
| Tier 2b (KAN-23 to 32) | Week 3-4 | 10/10 done? |
| **Total Sprint 1** | **4-6 weeks** | **32/32 done?** |

**If Week 1 is not 8/8 done:** Pick up pace or cut Tier 3 (KAN-33 to 57).

**If Week 2 is not 15/32 done:** Cut Tier 3. Focus on getting core features out.

---

## When to Pair with Claude

```
Stuck for < 30 min:  Keep trying, you've got this
Stuck for 30 min:    Take a break, walk
Stuck for 1 hour:    ✓ Open Claude chat (describe problem)
Stuck for 2 hours:   ✓ Switch to different issue
Stuck for 4 hours:   ✓ Ask human mentor/friend
Completely lost:     ✓ Read playbook emergency kit
```

**Claude's best for:**
- Architecture decisions ("Should I use Enum or separate Model?")
- Code generation ("Write SQLAlchemy model for Job")
- Debugging ("This test fails with X error, why?")
- Explanation ("How does Alembic migrations work?")

**Not a replacement for:**
- Sleep (you need it)
- Friends (you need them)
- Breaks (take them)

---

## Success Looks Like (End of Sprint 1)

```
✓ 32 GitHub issues closed (Tier 1 + 2)
✓ Docker environment fully working
✓ Full-stack app running (React + FastAPI)
✓ Database with migrations working
✓ Authentication implemented + tested
✓ CI/CD pipeline passing on all commits
✓ 80%+ test coverage
✓ Complete documentation (README, setup, architecture)
✓ Ready for AWS migration (Sprint 2)
✓ Zero burnout (took breaks, slept, not exhausted)
✓ Learned a ton building solo
```

---

## Go Build It

You have:
- ✅ Complete documentation
- ✅ Docker setup
- ✅ CI/CD pipeline
- ✅ Build order (critical path)
- ✅ Daily playbook
- ✅ Emergency kit

**What's missing?** Your code.

**Time to write it.**

```bash
cd CareerCompassv2
docker-compose -f docker-compose.dev.yml up
git checkout -b feat/KAN-1-docker-setup
# Implement KAN-1
git commit -m "feat: KAN-1 Docker setup, all services running"
git push origin feat/KAN-1-docker-setup
# Create PR → CI passes → Merge → Mark done
# Pick KAN-2
# Repeat 31 times
```

**You've got 4-6 weeks. You've got everything you need.**

**Build fast. Ship CareerCompass Pro. 🚀**

---

**Last Updated:** 2026-05-25
**Status:** Ready to Code
**Next:** Open 00_START_HERE.md and follow Step 1
