# npm Install-Script Approvals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make npm 12 execute the UI's reviewed native dependency install scripts so a fresh or cached Linux launch produces a usable SQLite binding and completes the production build.

**Architecture:** Keep lifecycle-script trust policy in `ui/package.json`, where npm 12 reads it, with exact version-pinned approvals for the five packages reported as blocked. A small standard-library regression test cross-checks that policy against the versions and install-script metadata in `ui/package-lock.json`; changing the manifest naturally invalidates the manager's existing UI dependency hash.

**Tech Stack:** npm/package.json, npm lockfile v3, Python 3 `unittest`, existing Python environment manager, Next.js

---

## File Structure

- Create `testing/test_ui_install_scripts.py`: validates the complete approval policy and checks every approved version against the committed npm lockfile.
- Modify `ui/package.json`: declares the reviewed, version-pinned npm `allowScripts` policy.
- Do not modify `manager/nodejs.py`: its manifest hash already causes the repaired policy to be applied on the next dependency sync.

### Task 1: Add Regression Coverage for the Approval Policy

**Files:**
- Create: `testing/test_ui_install_scripts.py`
- Test: `testing/test_ui_install_scripts.py`

- [ ] **Step 1: Write the failing test**

Create `testing/test_ui_install_scripts.py` with:

```python
import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
UI_DIR = REPO_ROOT / "ui"
EXPECTED_APPROVALS = {
    "@prisma/client@6.3.1": True,
    "@prisma/engines@6.3.1": True,
    "prisma@6.3.1": True,
    "sharp@0.34.5": True,
    "sqlite3@6.0.1": True,
}
LOCKFILE_PATHS = {
    "@prisma/client@6.3.1": "node_modules/@prisma/client",
    "@prisma/engines@6.3.1": "node_modules/@prisma/engines",
    "prisma@6.3.1": "node_modules/prisma",
    "sharp@0.34.5": "node_modules/next/node_modules/sharp",
    "sqlite3@6.0.1": "node_modules/sqlite3",
}


class UiInstallScriptPolicyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.package = json.loads((UI_DIR / "package.json").read_text())
        cls.lock = json.loads((UI_DIR / "package-lock.json").read_text())

    def test_policy_contains_only_reviewed_pinned_approvals(self):
        self.assertEqual(self.package.get("allowScripts"), EXPECTED_APPROVALS)

    def test_approved_versions_match_script_bearing_lockfile_packages(self):
        for approval, lock_path in LOCKFILE_PATHS.items():
            with self.subTest(approval=approval):
                _, version = approval.rsplit("@", 1)
                locked = self.lock["packages"][lock_path]
                self.assertEqual(locked["version"], version)
                self.assertTrue(locked.get("hasInstallScript"))
                self.assertTrue(EXPECTED_APPROVALS[approval])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
.venv/bin/python -m unittest testing.test_ui_install_scripts -v
```

Expected: `test_policy_contains_only_reviewed_pinned_approvals` fails because `ui/package.json` has no `allowScripts` field. The lockfile consistency test passes.

- [ ] **Step 3: Commit the failing regression test**

```bash
git add testing/test_ui_install_scripts.py
git commit -m "test: cover npm install-script approvals"
```

### Task 2: Declare the Reviewed npm Install Scripts

**Files:**
- Modify: `ui/package.json`
- Test: `testing/test_ui_install_scripts.py`

- [ ] **Step 1: Add the minimal approval policy**

Insert this top-level field after `optionalDependencies` and before `prettier` in `ui/package.json`:

```json
"allowScripts": {
  "@prisma/client@6.3.1": true,
  "@prisma/engines@6.3.1": true,
  "prisma@6.3.1": true,
  "sharp@0.34.5": true,
  "sqlite3@6.0.1": true
},
```

Do not add `fsevents` or `macstats`: they are optional platform-specific packages and npm 12 did not identify their scripts as pending on the failing Linux installation. Do not use an unpinned package name or blanket approval.

- [ ] **Step 2: Run the focused test to verify it passes**

Run:

```bash
.venv/bin/python -m unittest testing.test_ui_install_scripts -v
```

Expected: both tests pass.

- [ ] **Step 3: Confirm the manifest change triggers a dependency resync**

Run:

```bash
.venv/bin/python - <<'PY'
from manager import env, nodejs

print("cached:", env.load_state().get(nodejs.UI_STATE_KEY))
print("wanted:", nodejs._ui_deps_hash())
assert env.load_state().get(nodejs.UI_STATE_KEY) != nodejs._ui_deps_hash()
PY
```

Expected: the two hashes differ and the assertion succeeds.

- [ ] **Step 4: Commit the approval policy**

```bash
git add ui/package.json
git commit -m "fix: approve required npm install scripts"
```

### Task 3: Repair the Installation and Verify the Production Build

**Files:**
- Verify: `ui/package.json`
- Verify: `ui/package-lock.json`
- Verify: `ui/node_modules/sqlite3/`

- [ ] **Step 1: Run the manager-owned UI dependency sync**

Run:

```bash
.venv/bin/python - <<'PY'
from manager.nodejs import ensure_ui_deps

assert ensure_ui_deps()
PY
```

Expected: npm installs/rebuilds the approved packages, no blocked-script list is printed, and the manager prints `UI dependencies ready.`

- [ ] **Step 2: Verify npm has no pending install-script decisions**

Run:

```bash
cd ui
npm install-scripts ls
```

Expected under npm 12: `All dependencies with install scripts are configured.` Older npm versions may not provide this command; in that case the policy regression test and native-module load are the authoritative checks.

- [ ] **Step 3: Verify SQLite's native binding loads**

Run from `ui/`:

```bash
node -e 'require("sqlite3"); console.log("sqlite3 binding loaded")'
```

Expected: exit code 0 and `sqlite3 binding loaded`.

- [ ] **Step 4: Verify the production UI build**

Run from `ui/`:

```bash
npm run build
```

Expected: Next.js completes the production build. The existing optional `macos-temperature-sensor` resolution warning may appear on Linux, but there is no SQLite binding error and the command exits 0.

- [ ] **Step 5: Verify installation preserved the committed manifests**

Run from the repository root:

```bash
git diff --exit-code -- ui/package.json ui/package-lock.json
git status --short
```

Expected: the diff command exits 0. Status contains no generated UI manifest changes and no unexpected files.

- [ ] **Step 6: Run the regression test once more**

Run:

```bash
.venv/bin/python -m unittest testing.test_ui_install_scripts -v
```

Expected: both tests pass.

- [ ] **Step 7: Record verification only if a tracked adjustment was required**

No commit is expected for this task. If verification exposes a necessary tracked change, stop and return to root-cause analysis instead of bundling an unplanned fix.
