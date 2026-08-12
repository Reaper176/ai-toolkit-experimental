# Repository Fork Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Reaper176/ai-toolkit-experimental` the publishing and installation home for this customized checkout while preserving `ostris/ai-toolkit` as its upstream and attribution source.

**Architecture:** First update only ownership-facing repository references and commit that content change. Then reconfigure Git remotes, fetch the fork, prove the fork's `main` is an ancestor of local `main`, and perform only a normal fast-forward push. Finish with repository-wide URL and branch-tracking audits.

**Tech Stack:** Git, GitHub CLI, Bash, ripgrep, Markdown, JSON notebooks, Python metadata

---

### Task 1: Update Ownership-Facing Repository References

**Files:**
- Modify: `info.py:6`
- Modify: `README.md:90`
- Modify: `README.md:131`
- Modify: `README.md:148`
- Modify: `README.md:232`
- Modify: `notebooks/SliderTraining.ipynb:35`
- Modify: `notebooks/FLUX_1_dev_LoRA_Training.ipynb:31`
- Modify: `notebooks/FLUX_1_schnell_LoRA_Training.ipynb:34`
- Modify: `docker/Dockerfile:94`

- [ ] **Step 1: Record the pre-change ownership-reference audit**

Run:

```bash
rg -n --hidden -S "github\.com/ostris/ai-toolkit" \
  info.py README.md notebooks docker flux_train_ui.py jobs config manager
```

Expected: ownership-facing matches in `info.py`, `README.md`, the three notebooks, and `docker/Dockerfile`, plus intentional upstream references in attribution, issue comments, Modal context, and Spark wheels.

- [ ] **Step 2: Change the repository metadata URL**

Change `info.py` from:

```python
v["repo"] = "https://github.com/ostris/ai-toolkit"
```

to:

```python
v["repo"] = "https://github.com/Reaper176/ai-toolkit-experimental"
```

- [ ] **Step 3: Change README clone commands**

Replace every README command:

```bash
git clone https://github.com/ostris/ai-toolkit.git
```

with:

```bash
git clone https://github.com/Reaper176/ai-toolkit-experimental.git
```

- [ ] **Step 4: Change notebook clone commands**

In all three listed notebooks, replace only the clone URL inside the JSON cell source:

```text
https://github.com/ostris/ai-toolkit
```

with:

```text
https://github.com/Reaper176/ai-toolkit-experimental
```

Preserve notebook JSON formatting and all other cell content.

- [ ] **Step 5: Change the Docker source clone**

Change the source repository in `docker/Dockerfile` to:

```dockerfile
git clone https://github.com/Reaper176/ai-toolkit-experimental.git /tmp/ai-toolkit-src && \
```

- [ ] **Step 6: Validate modified file syntax and whitespace**

Run:

```bash
python -m py_compile info.py
python -m json.tool notebooks/SliderTraining.ipynb >/dev/null
python -m json.tool notebooks/FLUX_1_dev_LoRA_Training.ipynb >/dev/null
python -m json.tool notebooks/FLUX_1_schnell_LoRA_Training.ipynb >/dev/null
git diff --check
```

Expected: every command exits with status 0 and produces no error output.

- [ ] **Step 7: Audit ownership and preserved upstream references**

Run:

```bash
rg -n --hidden -S "github\.com/Reaper176/ai-toolkit-experimental" \
  info.py README.md notebooks docker
rg -n --hidden -S "github\.com/ostris/ai-toolkit" \
  info.py README.md notebooks docker flux_train_ui.py jobs config manager
```

Expected: the first search reports `info.py`, four README commands, three notebooks, and `docker/Dockerfile`. The second reports only intentional references: Ostris attribution, upstream issue links, Modal context, and `ai-toolkit-spark-wheels`; it must not report stale clone commands or `info.py`.

- [ ] **Step 8: Commit the repository-reference migration**

Run:

```bash
git add info.py README.md \
  notebooks/SliderTraining.ipynb \
  notebooks/FLUX_1_dev_LoRA_Training.ipynb \
  notebooks/FLUX_1_schnell_LoRA_Training.ipynb \
  docker/Dockerfile
git commit -m "chore: point project references to experimental fork"
```

Expected: one commit containing only the listed ownership-reference changes.

### Task 2: Configure Fork and Upstream Remotes

**Files:**
- Modify local repository configuration: `.git/config` through `git remote` commands

- [ ] **Step 1: Capture the existing remote and working-tree state**

Run:

```bash
git status --short --branch
git remote -v
git branch -vv
```

Expected: the working tree is clean; the sole current remote is `origin` at `https://github.com/ostris/ai-toolkit.git`.

- [ ] **Step 2: Rename the upstream remote**

Run:

```bash
git remote rename origin upstream
```

Expected: Git preserves the Ostris URL and updates remote-tracking configuration from `origin` to `upstream`.

- [ ] **Step 3: Add the fork as origin**

Run:

```bash
git remote add origin https://github.com/Reaper176/ai-toolkit-experimental.git
git fetch --prune origin
```

Expected: `origin/main` is fetched successfully without changing the working tree.

- [ ] **Step 4: Verify exact remote URLs**

Run:

```bash
test "$(git remote get-url origin)" = "https://github.com/Reaper176/ai-toolkit-experimental.git"
test "$(git remote get-url --push origin)" = "https://github.com/Reaper176/ai-toolkit-experimental.git"
test "$(git remote get-url upstream)" = "https://github.com/ostris/ai-toolkit.git"
test "$(git remote get-url --push upstream)" = "https://github.com/ostris/ai-toolkit.git"
git remote -v
```

Expected: all four `test` commands exit 0, and `git remote -v` shows the fork as `origin` and Ostris as `upstream` for fetch and push.

### Task 3: Prove Ancestry and Publish Without Rewriting History

**Files:**
- Modify remote branch: `Reaper176/ai-toolkit-experimental` branch `main`, only through a normal fast-forward push
- Modify local branch tracking: `.git/config` through `git push -u`

- [ ] **Step 1: Refresh both remote histories**

Run:

```bash
git fetch --prune origin
git fetch --prune upstream
git status --short --branch
```

Expected: fetches succeed and the working tree remains clean.

- [ ] **Step 2: Check fork ancestry before any push**

Run:

```bash
git merge-base --is-ancestor origin/main main
```

Expected: exit status 0. If it is nonzero, stop without pushing or changing tracking; report the fork/local divergence and request an explicit integration decision.

- [ ] **Step 3: Preview the commits to publish**

Run:

```bash
git log --oneline --decorate origin/main..main
```

Expected: only the intended local customization history, design/plan commits, and repository-reference migration are listed. If unrelated or unexpected commits appear, stop before pushing.

- [ ] **Step 4: Push normally and establish tracking**

Run:

```bash
git push -u origin main
```

Expected: a normal fast-forward update succeeds. Do not add `--force`, `--force-with-lease`, or a leading `+` refspec.

- [ ] **Step 5: Verify remote identity and branch tracking**

Run:

```bash
test "$(git config --get branch.main.remote)" = "origin"
test "$(git config --get branch.main.merge)" = "refs/heads/main"
test "$(git rev-parse main)" = "$(git rev-parse origin/main)"
git status --short --branch
git branch -vv
```

Expected: all tests exit 0; `main` tracks `origin/main`; local and fork commits match; the working tree is clean.

### Task 4: Final Migration Audit

**Files:**
- Verify only; no expected modifications

- [ ] **Step 1: Run the full repository reference audit**

Run:

```bash
rg -n --hidden -S "github\.com/Reaper176/ai-toolkit-experimental" . \
  --glob '!.git/**' --glob '!ui/node_modules/**' --glob '!venv/**' \
  --glob '!.venv/**' --glob '!output/**'
rg -n --hidden -S "github\.com/ostris/ai-toolkit" . \
  --glob '!.git/**' --glob '!ui/node_modules/**' --glob '!venv/**' \
  --glob '!.venv/**' --glob '!output/**'
```

Expected: all ownership-facing locations point to the fork. Remaining Ostris matches are limited to attribution, upstream issue references, Modal context, and the Spark wheels dependency.

- [ ] **Step 2: Confirm GitHub sees the intended fork**

Run:

```bash
gh repo view Reaper176/ai-toolkit-experimental \
  --json nameWithOwner,url,isFork,parent,defaultBranchRef,visibility
```

Expected: `nameWithOwner` is `Reaper176/ai-toolkit-experimental`, `defaultBranchRef.name` is `main`, and `parent` identifies `ostris/ai-toolkit`.

- [ ] **Step 3: Record final state**

Run:

```bash
git status --short --branch
git remote -v
git branch -vv
git log -3 --oneline --decorate
```

Expected: clean `main` tracking `origin/main`, correct fork/upstream remotes, and the migration commit visible in recent history.
