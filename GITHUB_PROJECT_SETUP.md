# GitHub Project Board Setup for Sprint 1

**Goal:** Automated Kanban board with 57 issues auto-organized by dependency + effort

## Step 1: Create GitHub Project

1. Go to your repo: `https://github.com/myrthetjaarda-lgtm/CareerCompassv2`
2. Click "Projects" tab
3. Click "New project"
4. Choose "Table" layout (better than Board for sorting)
5. Name: `Sprint 1: Foundation & Authentication`
6. Set visibility: Public

## Step 2: Configure Views

### View 1: Kanban (Status)

```
Board view grouped by: Status
Fields shown:
  - Title
  - Assignee (you, since solo)
  - Effort (label)
  - Dependency (label)
  - Priority (label)

Columns:
  1. To Do (auto-populated from status:todo label)
  2. In Progress (auto-populated from status:in_progress)
  3. In Review (auto-populated from status:review)
  4. Done (auto-populated from status:done)
```

### View 2: By Dependency (Table)

```
Sort by: Tier (custom field)
Then by: Effort (high → low)
Filter: Tier = 1 OR 2 (focus on what unblocks)
```

### View 3: By Effort (Roadmap)

```
Roadmap view
Group by: Tier
Show: Effort as relative size
Highlights: Critical path (high priority + blocking many)
```

## Step 3: Label System

Create these labels in your repo:

```
# Status Labels
status:todo (color: #ffa500, orange)
status:in_progress (color: #1f6feb, blue)
status:review (color: #a371f7, purple)
status:done (color: #28a745, green)

# Effort (Story Points)
effort:1 (small, 1-2 hours)
effort:2 (medium, 4-8 hours)
effort:3 (large, 8-16 hours)
effort:5 (epic, 2+ days)

# Tier
tier:1-infrastructure (blocks everything)
tier:2-core-features (start after tier 1)
tier:3-enhanced (nice to have)

# Priority
priority:critical (do first)
priority:high (do next)
priority:medium (do when time)
priority:low (nice to have)

# Feature Area
feature:auth
feature:profile
feature:documents
feature:jobs
feature:applications
feature:companies
feature:interviews
feature:contracts
feature:payroll
feature:termination

# Type
type:frontend
type:backend
type:devops
type:database
type:testing
```

## Step 4: Bulk Label Issues

Once you've created all 57 issues in GitHub, bulk-add labels using this strategy:

**Tier 1 (KAN-1 to KAN-8):**
```
- tier:1-infrastructure
- status:todo
- effort:2-3
- priority:critical
```

**Tier 2 (KAN-9 to KAN-32):**
```
- tier:2-core-features
- status:todo
- effort:1-2
- priority:high
```

**Tier 3 (KAN-33 to KAN-57):**
```
- tier:3-enhanced
- status:todo
- effort:2-3
- priority:medium
```

Plus feature-specific labels per issue (e.g., KAN-5 gets `feature:auth`).

## Step 5: Automation Rules

In Project settings, set up auto-transition:

```
When: Issue is opened
Then: Auto-add label "status:todo"

When: PR is merged and references issue
Then: Auto-move to "In Review"

When: Issue is closed
Then: Auto-move to "Done"
```

## Step 6: Filtering for Critical Path

In your Kanban view, filter to see only:
```
tier:1-infrastructure OR (tier:2-core-features AND effort <= 2)
```

This shows the critical path first.

## Step 7: Daily Workflow

Every morning:
1. Open Project board
2. Check "To Do" column sorted by Tier
3. Move next issue to "In Progress"
4. Create feature branch: `git checkout -b feat/KAN-1-description`
5. When done, move to "In Review", create PR
6. After merge, mark "Done"

## GitHub API for Bulk Labeling (Optional)

If you want to automate label assignment, use this script:

```bash
#!/bin/bash

# Add tier:1-infrastructure to KAN-1 through KAN-8
for i in {1..8}; do
  gh issue edit KAN-$i --add-label "tier:1-infrastructure,status:todo,priority:critical"
done

# Add tier:2-core-features to KAN-9 through KAN-32
for i in {9..32}; do
  gh issue edit KAN-$i --add-label "tier:2-core-features,status:todo,priority:high"
done

# Add tier:3-enhanced to KAN-33 through KAN-57
for i in {33..57}; do
  gh issue edit KAN-$i --add-label "tier:3-enhanced,status:todo,priority:medium"
done
```

Install GitHub CLI: https://cli.github.com

## Project Board Link

Once created, share this link:
```
https://github.com/myrthetjaarda-lgtm/CareerCompassv2/projects/1
```

(or whatever project number GitHub assigns)

## Why This Works

- **Auto-organized by dependencies** → You always see what's unblocked
- **Kanban view** → Visualize flow (To Do → In Progress → Done)
- **Effort labels** → Estimate time commitments
- **Filtered views** → Focus on critical path first, ignore nice-to-haves
- **Mobile-friendly** → Check progress on phone
