# SETUP INSTRUCTIONS: Copy These Files to Your GitHub Repo

**Everything below is ready in `/mnt/user-data/outputs/`. Copy them to your repo in the structure shown.**

---

## Option 1: Automated Setup (Recommended)

If you have the repo cloned locally:

```bash
# Download the setup script
curl -O https://path-to-raw-outputs/setup.sh

# Run it (replace with your actual repo path)
bash setup.sh /path/to/CareerCompassv2

# Then:
cd /path/to/CareerCompassv2
git add .
git commit -m "chore: initial project setup with Docker, CI/CD, docs"
git push origin main
```

---

## Option 2: Manual Copy (If Preferred)

Copy these files in this exact structure:

```
CareerCompassv2/
├── 00_START_HERE.md                    ← Documentation
├── README.md
├── SPRINT_1_CRITICAL_PATH.md
├── SOLO_DEVELOPER_PLAYBOOK.md
├── AWS_STRATEGY.md
├── GITHUB_PROJECT_SETUP.md
├── QUICK_REFERENCE.md
├── DELIVERY_SUMMARY.md
├── CONTRIBUTING.md
├── .env.example                        ← Configuration
├── .gitignore
├── .dockerignore
├── docker-compose.dev.yml              ← Docker
├── nginx.conf
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                      ← GitHub Actions
│   │   └── docker-build.yml
│   └── ISSUE_TEMPLATE/
│       ├── bug.md
│       ├── feature.md
│       └── pull_request_template.md
│
├── backend/
│   ├── Dockerfile                      ← Development
│   ├── Dockerfile.prod                 ← Production
│   ├── requirements.txt
│   └── .gitignore
│
└── frontend/
    ├── Dockerfile                      ← Development
    ├── Dockerfile.prod                 ← Production
    ├── package.json
    └── .gitignore
```

---

## Step-by-Step Manual Copy

### 1. Root Directory Files

```bash
cd /path/to/CareerCompassv2

# Documentation (copy all 8 files)
cp /mnt/user-data/outputs/00_START_HERE.md .
cp /mnt/user-data/outputs/README.md .
cp /mnt/user-data/outputs/SPRINT_1_CRITICAL_PATH.md .
cp /mnt/user-data/outputs/SOLO_DEVELOPER_PLAYBOOK.md .
cp /mnt/user-data/outputs/AWS_STRATEGY.md .
cp /mnt/user-data/outputs/GITHUB_PROJECT_SETUP.md .
cp /mnt/user-data/outputs/QUICK_REFERENCE.md .
cp /mnt/user-data/outputs/DELIVERY_SUMMARY.md .

# Docker
cp /mnt/user-data/outputs/docker-compose.dev.yml .
cp /mnt/user-data/outputs/nginx.conf .

# Configuration files (create these)
# .env.example - see below
# .gitignore - see below
# .dockerignore - see below
# CONTRIBUTING.md - see below
```

### 2. Backend Directory

```bash
cd backend

# Copy files
cp /mnt/user-data/outputs/Dockerfile.backend.dev Dockerfile
cp /mnt/user-data/outputs/Dockerfile.backend.prod Dockerfile.prod
cp /mnt/user-data/outputs/requirements.txt .

# Create .gitignore (see template below)
```

### 3. Frontend Directory

```bash
cd ../frontend

# Copy files
cp /mnt/user-data/outputs/Dockerfile.frontend.dev Dockerfile
cp /mnt/user-data/outputs/Dockerfile.frontend.prod Dockerfile.prod
cp /mnt/user-data/outputs/package.json .

# Create .gitignore (see template below)
```

### 4. GitHub Actions

```bash
cd ../.github/workflows

cp /mnt/user-data/outputs/ci.yml .
cp /mnt/user-data/outputs/docker-build.yml .
```

### 5. Create Configuration Files

**Root: `.env.example`**
```env
ENVIRONMENT=development
SECRET_KEY=dev-secret-key-change-in-production
DEBUG=True
LOG_LEVEL=DEBUG

DATABASE_URL=postgresql://compass:compass_dev@postgres:5432/compass_dev
REDIS_URL=redis://redis:6379/0

JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

AWS_REGION=eu-central-1
AWS_COGNITO_USER_POOL_ID=mock-pool-id
AWS_COGNITO_CLIENT_ID=mock-client-id
AWS_S3_BUCKET=compass-dev-bucket
USE_AWS=False

REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
VITE_API_URL=http://localhost:8000
```

**Root: `.gitignore`**
```
.env
.env.local
.env.*.local

node_modules/
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/
.venv/
venv/

.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

.pytest_cache/
.coverage
htmlcov/
coverage/

/frontend/dist
/frontend/build

logs/
*.log
npm-debug.log*

postgres_data/
redis_data/

uploads/
```

**Root: `.dockerignore`**
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.DS_Store
__pycache__
.pytest_cache
.venv
```

**Root: `CONTRIBUTING.md`**
```markdown
# Contributing to CareerCompass Pro

Solo developer? Here's how to contribute (to yourself):

## Before You Code

1. Read the critical path → `SPRINT_1_CRITICAL_PATH.md`
2. Pick next unblocked issue → Check GitHub Project board
3. Create feature branch → `git checkout -b feat/KAN-X-description`

## Development Workflow

```bash
docker-compose -f docker-compose.dev.yml up
docker-compose -f docker-compose.dev.yml exec backend pytest
docker-compose -f docker-compose.dev.yml exec frontend npm test
```

See `README.md` for full details.
```

**Backend: `.gitignore`**
```
__pycache__/
*.py[cod]
*$py.class

venv/
env/
ENV/
.venv

.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

.pytest_cache/
htmlcov/
.coverage

.mypy_cache/

.env
.env.local

.vscode/
.idea/
*.swp
*~

.DS_Store
Thumbs.db

migrations/versions/*.py
```

**Frontend: `.gitignore`**
```
/node_modules
/.pnp
.pnp.js

/coverage

/build
/dist

.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

---

## GitHub Issue Templates

Create these in `.github/ISSUE_TEMPLATE/`:

**`.github/ISSUE_TEMPLATE/bug.md`**
```markdown
---
name: Bug Report
about: Something isn't working

---

## Description
Brief description of the bug.

## Steps to Reproduce
1. ...
2. ...

## Expected Behavior
What should happen?

## Actual Behavior
What actually happens?
```

**`.github/ISSUE_TEMPLATE/feature.md`**
```markdown
---
name: Feature Request
about: Suggest a new feature

---

## Description
Brief description of the feature.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Dependencies
- KAN-X (must be done first)

## Effort Estimate
- 1 point (1-2 hours)
- 2 points (4-8 hours)
- 3 points (8-16 hours)
```

**`.github/pull_request_template.md`**
```markdown
## Issue
Closes #KAN-X

## Changes
- Describe what changed
- List key files modified

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing done

## Checklist
- [ ] Code is linted
- [ ] Tests pass locally
- [ ] CI passes
- [ ] Database migrations (if applicable)
- [ ] Documentation updated
```

---

## Verify Everything is in Place

```bash
cd /path/to/CareerCompassv2

# Check all files exist
ls -la | grep -E "^-.*\.md|env|gitignore|dockerignore"
ls -la .github/workflows/
ls -la backend/ | grep -E "Dockerfile|requirements"
ls -la frontend/ | grep -E "Dockerfile|package"

# Should show:
# ✓ All 8 markdown files
# ✓ docker-compose.dev.yml
# ✓ .env.example, .gitignore, .dockerignore
# ✓ ci.yml, docker-build.yml in workflows/
# ✓ Dockerfiles and dependencies in backend/frontend/
```

---

## First Git Commit

```bash
cd /path/to/CareerCompassv2

git add .

git commit -m "chore: initial project setup with Docker, CI/CD, docs, and configuration"

git push origin main

# Wait for CI/CD to run (check Actions tab on GitHub)
```

---

## Next: Start Docker

```bash
docker-compose -f docker-compose.dev.yml up

# In another terminal, verify:
curl http://localhost:8000/health
curl http://localhost:3000
```

---

## All Files Available At

```
/mnt/user-data/outputs/
```

**Complete list:**
```
00_START_HERE.md
README.md
SPRINT_1_CRITICAL_PATH.md
SOLO_DEVELOPER_PLAYBOOK.md
AWS_STRATEGY.md
GITHUB_PROJECT_SETUP.md
QUICK_REFERENCE.md
DELIVERY_SUMMARY.md

docker-compose.dev.yml
Dockerfile.backend.dev
Dockerfile.backend.prod
Dockerfile.frontend.dev
Dockerfile.frontend.prod
nginx.conf

ci.yml
docker-build.yml

requirements.txt
package.json

setup.sh (optional automated setup)
```

---

## TL;DR: Just Run This

```bash
# Navigate to your repo
cd /path/to/CareerCompassv2

# Copy all files (manual approach)
cp /mnt/user-data/outputs/*.md .
cp /mnt/user-data/outputs/docker-compose.dev.yml .
cp /mnt/user-data/outputs/nginx.conf .
mkdir -p .github/workflows backend frontend
cp /mnt/user-data/outputs/Dockerfile.* . 2>/dev/null || true
cp /mnt/user-data/outputs/Dockerfile.backend.dev backend/Dockerfile
cp /mnt/user-data/outputs/Dockerfile.backend.prod backend/Dockerfile.prod
cp /mnt/user-data/outputs/Dockerfile.frontend.dev frontend/Dockerfile
cp /mnt/user-data/outputs/Dockerfile.frontend.prod frontend/Dockerfile.prod
cp /mnt/user-data/outputs/*.yml .github/workflows/
cp /mnt/user-data/outputs/requirements.txt backend/
cp /mnt/user-data/outputs/package.json frontend/

# Create config files (from templates above)
# Then:
git add .
git commit -m "chore: initial setup"
git push

# Start coding:
docker-compose -f docker-compose.dev.yml up
```

---

**All 20 files ready. Copy them. Start Docker. Build CareerCompass Pro. 🚀**
