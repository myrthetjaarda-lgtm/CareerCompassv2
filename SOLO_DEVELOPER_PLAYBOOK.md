# Solo Developer Playbook: CareerCompass Pro

**You're building alone.** This playbook keeps you moving fast without burnout or major mistakes.

---

## Daily Routine (30-45 min setup, then 6+ hours focused work)

### Morning (9:00 AM)

**5 min: Review board**
```
Open GitHub Project board (sorted by Tier)
Identify next unblocked issue
Example: "KAN-2 is ready (KAN-1 done), take it today"
```

**5 min: Daily standup (yourself)**
```
Yesterday: Completed KAN-1 (Docker setup)
Today: KAN-2 (FastAPI scaffold)
Blocker: None
Confidence: High (straightforward boilerplate)
```

**5 min: Environment check**
```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Verify all healthy
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

**20 min: Code setup**
```bash
# Create feature branch
git checkout -b feat/KAN-2-fastapi-scaffold

# Open IDE
code .

# Terminal tabs:
# Tab 1: Docker logs
# Tab 2: Git/commits
# Tab 3: Testing
# Tab 4: Notes
```

### Deep Work (10:00 AM - 4:00 PM)

**Goal:** 6 uninterrupted hours on code.

**Rules:**
- Slack/email off
- Phone in another room
- 1 pomodoro = 50 min focused + 10 min break
- Every 2 pomodoros, run tests
- Every 4 pomodoros, commit (if feature complete)

**If stuck >30 min:**
- Switch to a different issue
- Come back to blocker later
- Solo dev = flexibility to context-switch productively

### Evening (4:00 PM - 5:00 PM)

**30 min: Commit & test**
```bash
# Run all tests
docker-compose -f docker-compose.dev.yml exec backend pytest
docker-compose -f docker-compose.dev.yml exec frontend npm test

# Run linter
docker-compose -f docker-compose.dev.yml exec backend black app/
docker-compose -f docker-compose.dev.yml exec backend ruff check app/
docker-compose -f docker-compose.dev.yml exec frontend npm run lint

# Commit (even if not done)
git commit -m "wip: KAN-2 FastAPI scaffold, models defined"
```

**20 min: Update tracking**
```
GitHub issue: Move to "In Progress"
Add comment with:
  - What you did today
  - What's left
  - Any blockers
  - ETA to "Done"
```

**10 min: Tomorrow planning**
```
Next issue to start?
Any dependencies?
Any risky steps to prepare for?
```

---

## Weekly Routine (1 hour Friday)

### Friday 4:00 PM - 5:00 PM: Retrospective

**15 min: What went well?**
```
# Did any issue take much less time than estimated?
# What helped you move fast?
# Any happy bugs (unexpected benefits)?

Example:
- Docker setup was easier than expected
- Pydantic validation saved time on validation logic
- Pair-programming with Claude was 3x faster than solo thinking
```

**15 min: What went wrong?**
```
# Any blockers that wasted time?
# What took longer than expected?
# Any bugs that cost hours to debug?

Example:
- Database migration syntax was confusing
- Forgot to add health check, wasted 30 min debugging
- Tests were brittle, needed multiple rewrites
```

**15 min: What's next?**
```
# Are you on track for Sprint 1 (32 issues, 4-6 weeks)?
# What's the next critical path item?
# Any major architecture decisions coming up?

Example:
- Completed 8/32 issues (25% done, 2 weeks in)
- On track for Week 4 completion
- Next: Job Application Tracker (10 issues)
- Decision needed: Use Celery or APScheduler for reminders?
```

**15 min: Sustainability check**
```
# Are you burned out?
# Did you take breaks?
# Did you pair-program (talk to Claude)?
# Did you sleep enough?

Rules:
- 6 hours of focused work = good day
- 8 hours = very productive day
- 10+ hours = burnout risk, don't do this
- Take weekends off (code is still there Monday)
```

---

## Decision Framework: What to Build Next?

**You have 57 issues. How do you pick the next one?**

### Rule 1: Follow the Critical Path

**Always start with Tier 1 (Infrastructure).**

```
Tier 1: 8 issues
├─ KAN-1: Docker setup
├─ KAN-2: FastAPI scaffold
├─ KAN-3: PostgreSQL + Alembic
├─ KAN-4: GitHub Actions CI/CD
├─ KAN-5: JWT auth
├─ KAN-6: User model
├─ KAN-7: Protected routes
└─ KAN-8: Environment config

DO NOT SKIP OR REORDER. These are your foundation.
```

### Rule 2: Dependencies First

**Before starting an issue, check: what must be done first?**

```
KAN-25: Application model
├─ Depends on: KAN-23 (Job model)
├─ Depends on: KAN-3 (Database + migrations)
└─ Depends on: KAN-6 (User model)

✗ Don't start KAN-25 if KAN-23 isn't done
✓ Do finish KAN-23 first, then KAN-25
```

### Rule 3: Effort vs. Impact

**Prefer high-impact, low-effort issues.**

```
Effort grid:

HIGH IMPACT
  ↑ │ Do First!     │ Save for later
    │ (KAN-1,2,3)   │ (KAN-40, video)
IMPACT
    │ Nice to have   │ Skip
    │ (KAN-39, QA)   │ (edge cases)
    └──────────────────────────→
        LOW        EFFORT         HIGH

Priority order:
1. High impact, low effort (KAN-1 to KAN-8)
2. High impact, medium effort (KAN-23 to KAN-26)
3. Medium impact, low effort (KAN-12, filtering)
4. Low impact, any effort (KAN-40, video)
```

### Rule 4: De-Risk Early

**Do risky stuff first when you have time to recover.**

```
Risky? Do early.  │  Safe? Do late.
───────────────────────────────────
KAN-1: Docker     │  KAN-31: Flags
KAN-4: CI/CD      │  KAN-32: Search
KAN-5: Auth       │  KAN-15: Filtering
KAN-24: Scraping  │  KAN-14: Templates
```

### Rule 5: Momentum Matters

**If you're stuck, switch to unrelated issue to unstick yourself.**

```
Stuck on KAN-5 (JWT auth)?
Don't keep banging your head.
Switch to KAN-9 (User profile) for 2 hours.
Come back to KAN-5 fresh tomorrow.
Solo dev advantage: no meetings to interrupt context switches.
```

---

## Productivity Hacks: How to 10x Faster

### Hack 1: Pair with Claude for Architecture Decisions

**When:** Stuck on how to structure something
**How:** Open a new Claude chat, paste in the problem
**Result:** 15 min discussion = saved 3 hours of false starts

**Example:**
```
"KAN-25 requires tracking application status.
Should status be an enum or a separate StatusHistory model?
Pros/cons of each?"

Claude: "Use enum for current status, separate model for history"
You: "Write the SQLAlchemy code"
Claude: [code]
You: 2 minutes to paste and test. Done.
```

### Hack 2: Template Everything

**Don't write boilerplate.** Save time with templates.

```
API endpoint template:
  - Request schema (Pydantic)
  - Response schema
  - Dependency (get_current_user)
  - Error handling
  - Test case

Copy once, modify for each endpoint.
Same for models, tests, migrations.
```

### Hack 3: Test Early, Test Often

**Testing isn't slowing you down. Bad bugs are.**

```
DON'T: Code for 8 hours, test at end (finds bugs everywhere)
DO: Code 1.5 hours, test, code 1.5 hours, test

Time saved: 5 hours (no debugging)
Sanity saved: priceless
```

### Hack 4: Auto-Format + Linting

**Don't waste brain cycles on formatting.**

```bash
# Before every commit
black app/
ruff check app/ --fix
npm run lint --fix

Then review the diffs. Done.
```

### Hack 5: Commit Messages as Progress Log

**Use git commits as your solo standup.**

```
git log --oneline
> wip: KAN-2 FastAPI scaffold, models defined
> feat: KAN-2 auth dependencies, tests passing
> wip: KAN-3 migrations, health check endpoint
> feat: KAN-3 database connected, migrations working
```

This is your progress log. Don't make commits vague.

### Hack 6: Keep Designs Simple

**No fancy optimizations before you ship.**

```
DON'T: Spend 3 days optimizing database queries (premature)
DO: Get it working, measure, optimize only if slow

(This is how you finish features, not get stuck in perfection)
```

### Hack 7: Batch Similar Tasks

**Don't context-switch wildly.**

```
DAY 1: All backend database work (KAN-3, KAN-6, KAN-25)
DAY 2: All API endpoint work (KAN-7, KAN-26, KAN-28)
DAY 3: All frontend setup (Vite, routing, styling)
DAY 4: All testing (unit, integration, E2E)

Brain stays in one mode. Faster than jumping.
```

---

## Common Pitfalls (Avoid These)

### Pitfall 1: Perfectionism

**Symptom:** You've been on KAN-7 for 3 days, still refactoring
**Fix:** "Good enough" is done. Ship it. Improve later.
**Rule:** If it passes tests and fulfills acceptance criteria, it's done.

### Pitfall 2: Scope Creep

**Symptom:** "While I'm here, I'll also add caching/metrics/monitoring"
**Fix:** Write it down in a new issue for Sprint 2. Move on.
**Rule:** One issue = one PR. Don't gold-plate.

### Pitfall 3: Skipping Tests

**Symptom:** "I'll test it manually, no time for unit tests"
**Fix:** Write tests FIRST (TDD is faster for solo dev)
**Rule:** No test? No merge.

### Pitfall 4: Deferred Documentation

**Symptom:** Code done, docs still blank
**Fix:** Document as you code (docstrings, comments, README)
**Rule:** If you can't explain it in a comment, it's too complex.

### Pitfall 5: Ignoring Warnings

**Symptom:** `ruff` reports 40 issues, you ignore them
**Fix:** Fix linting issues immediately (takes 2 min)
**Rule:** CI should pass. No exceptions.

### Pitfall 6: Staying Up Late

**Symptom:** "One more issue before sleep"
**Fix:** No. Sleep. Tired code = bugs.
**Rule:** 6 hours focused work ≠ 12 hours tired work.

### Pitfall 7: No Breaks from Code

**Symptom:** 6 hours no break, brain melting
**Fix:** Pomodoro timer (50/10). Go outside.
**Rule:** Mental freshness > more code.

---

## Emergency Kit: When Things Break

### "Docker won't start"

```bash
# Nuclear option: reset everything
docker-compose -f docker-compose.dev.yml down -v
docker system prune -a
docker-compose -f docker-compose.dev.yml up --build

# If still broken: check disk space
df -h
docker system df
```

### "Database migration failed"

```bash
# Rollback
docker-compose -f docker-compose.dev.yml exec backend alembic downgrade -1

# Inspect migration file
cat backend/app/db/migrations/versions/[latest].py

# Edit if needed, then re-run
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

### "Tests fail but code looks right"

```bash
# Clear cache
rm -rf backend/.pytest_cache
rm -rf frontend/node_modules/.vite

# Re-run
docker-compose -f docker-compose.dev.yml exec backend pytest -vv
npm test -- --no-cache
```

### "Git is messy (accidental commits, wrong branch)"

```bash
# Check current branch
git branch

# Switch to right branch
git checkout main
git pull origin main
git checkout -b feat/KAN-X-fixed

# If you committed to wrong branch
git reset --soft HEAD~1  # Undo last commit, keep changes
git checkout -b feat/KAN-X-fixed
git commit -m "feat: KAN-X fixed description"
```

### "I accidentally deleted something"

```bash
# Git has your back
git reflog
git show <commit-hash>:<path-to-file>

# Or recover from uncommitted changes
git checkout HEAD -- <file>
```

---

## Metrics: Am I on Track?

**Every Friday, check these:**

```
Target: 32 issues (Tier 1 + 2) in 4-6 weeks

Week 1: 8 issues (KAN-1 to KAN-8)       → 25% done
Week 2: 7 issues (KAN-5 to KAN-11)      → 50% done
Week 3: 10 issues (KAN-12 to KAN-32)    → 75% done
Week 4: 7 issues (KAN-23 to KAN-32)     → 100% done

Velocity metrics:
- Issues closed per week
- Average effort per issue
- Test coverage %
- Build pass rate (CI)
```

**If behind on Friday:**
- Cut Tier 3 issues entirely
- Reduce scope (remove "nice to have" features)
- Ask for pair programming help (Claude)
- Don't push weekends (counterproductive)

---

## Staying Sane: Mental Health Checkup

**Solo dev is hard. These are signs you need a break:**

```
✗ I'm dreading opening the laptop
✗ I've been coding 10+ hours/day
✗ I'm skipping meals or sleep
✗ I'm writing code without tests
✗ I stopped enjoying the project
✗ I haven't seen friends in 2 weeks

Action: STOP. Take a day off. Talk to someone. This is temporary.
Recovery time is faster than burnout time.
```

**What actually helps:**

```
✓ Talk through problems (pair with Claude)
✓ Celebrate small wins (finished a Tier!)
✓ Exercise (clears brain)
✓ Social time (friends, family)
✓ Sleep 8 hours (non-negotiable)
✓ Breaks (pomodoro timer, outside time)
```

---

## End-of-Sprint 1 Checklist

**When you finish KAN-32, verify:**

```
[ ] All 32 Tier 1 + 2 issues are "Done" on board
[ ] GitHub Project shows 100% complete
[ ] CI/CD passing on all commits
[ ] Test coverage ≥80%
[ ] README is complete + accurate
[ ] Docker setup works for fresh clone
[ ] Zero high-severity bugs
[ ] All issues have clear notes on what was done
[ ] Code is linted (black, ruff, ESLint)
[ ] No console warnings/errors
[ ] Celebrate! You just built the foundation.
```

---

**You've got this. Build fast, stay healthy, ship things.**
