# npm Install-Script Approvals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make npm 12 execute the UI's reviewed native dependency install scripts so a fresh or cached Linux launch produces a usable SQLite binding and completes the production build.

**Architecture:** Keep lifecycle-script trust policy in `ui/package.json`, where npm 12 reads it, with exact version-pinned approvals for the five packages reported as blocked. Standard-library tests cross-check that policy against `ui/package-lock.json` and exercise manager recovery: cached and newly installed dependency trees must load SQLite, otherwise the manager runs a targeted `npm rebuild sqlite3` and revalidates before saving its dependency hash.

**Tech Stack:** npm/package.json, npm lockfile v3, Python 3 `unittest`, existing Python environment manager, Next.js

---

## File Structure

- Create `testing/test_ui_install_scripts.py`: validates the complete approval policy and checks every approved version against the committed npm lockfile.
- Modify `ui/package.json`: declares the reviewed, version-pinned npm `allowScripts` policy.
- Create `testing/test_manager_nodejs.py`: covers cached dependency validation, targeted rebuild, revalidation, and failure-state caching behavior.
- Modify `manager/nodejs.py`: validates SQLite on the cache fast path and after installation, rebuilding only SQLite when needed.

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

### Task 3: Add Regression Coverage for Cached Broken Installations

**Files:**
- Create: `testing/test_manager_nodejs.py`
- Test: `testing/test_manager_nodejs.py`

- [ ] **Step 1: Write failing manager recovery tests**

Create `testing/test_manager_nodejs.py` with:

```python
import contextlib
import unittest
from unittest import mock

from manager import nodejs


class UiDependencyRecoveryTest(unittest.TestCase):
    def _common_patches(self, binding_results):
        stack = contextlib.ExitStack()
        stack.enter_context(mock.patch("manager.env.venv_exists", return_value=True))
        stack.enter_context(
            mock.patch(
                "manager.env.load_state",
                return_value={nodejs.UI_STATE_KEY: "manifest-hash"},
            )
        )
        save_state = stack.enter_context(mock.patch("manager.env.save_state"))
        stack.enter_context(mock.patch.object(nodejs, "_ui_deps_hash", return_value="manifest-hash"))
        stack.enter_context(mock.patch.object(nodejs.os.path, "isfile", return_value=True))
        stack.enter_context(mock.patch.object(nodejs.os.path, "isdir", return_value=True))
        stack.enter_context(mock.patch.object(nodejs, "find_npm", return_value="/npm"))
        stack.enter_context(
            mock.patch.object(nodejs, "find_node", create=True, return_value="/node")
        )
        binding = stack.enter_context(
            mock.patch.object(
                nodejs,
                "_sqlite_binding_available",
                create=True,
                side_effect=binding_results,
            )
        )
        run = stack.enter_context(mock.patch.object(nodejs, "run"))
        return stack, save_state, binding, run

    def test_valid_cached_dependencies_remain_a_noop(self):
        stack, save_state, binding, run = self._common_patches([True])
        with stack:
            self.assertFalse(nodejs.ensure_ui_deps(env={"PATH": "/bin"}))

        binding.assert_called_once_with("/node", {"PATH": "/bin"})
        run.assert_not_called()
        save_state.assert_not_called()

    def test_missing_cached_binding_is_rebuilt_and_revalidated(self):
        stack, save_state, binding, run = self._common_patches(
            [False, False, True]
        )
        run.side_effect = [(0, None), (0, None)]
        with stack:
            self.assertTrue(nodejs.ensure_ui_deps(env={"PATH": "/bin"}))

        self.assertEqual(binding.call_count, 3)
        run.assert_any_call(
            ["/npm", "install", "--no-save", "--no-audit", "--no-fund"],
            cwd=nodejs.UI_DIR,
            env={"PATH": "/bin"},
            stream=True,
            check=False,
        )
        run.assert_any_call(
            ["/npm", "rebuild", "sqlite3"],
            cwd=nodejs.UI_DIR,
            env={"PATH": "/bin"},
            stream=True,
            check=False,
        )
        save_state.assert_called_once_with({nodejs.UI_STATE_KEY: "manifest-hash"})

    def test_failed_rebuild_does_not_save_dependency_hash(self):
        stack, save_state, binding, run = self._common_patches([False, False])
        run.side_effect = [(0, None), (1, None)]
        with stack:
            self.assertFalse(nodejs.ensure_ui_deps(env={"PATH": "/bin"}))

        save_state.assert_not_called()

    def test_failed_post_rebuild_validation_does_not_save_dependency_hash(self):
        stack, save_state, binding, run = self._common_patches(
            [False, False, False]
        )
        run.side_effect = [(0, None), (0, None)]
        with stack:
            self.assertFalse(nodejs.ensure_ui_deps(env={"PATH": "/bin"}))

        self.assertEqual(binding.call_count, 3)
        save_state.assert_not_called()


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
.venv/bin/python -m unittest testing.test_manager_nodejs -v
```

Expected: tests fail because `ensure_ui_deps` neither validates cached SQLite nor calls the planned recovery path.

- [ ] **Step 3: Commit the failing tests**

```bash
git add testing/test_manager_nodejs.py
git commit -m "test: cover broken SQLite dependency recovery"
```

### Task 4: Validate and Repair SQLite Before Caching UI Dependencies

**Files:**
- Modify: `manager/nodejs.py`
- Test: `testing/test_manager_nodejs.py`

- [ ] **Step 1: Add Node lookup and SQLite validation helpers**

Add beside `find_npm`:

```python
def find_node(env=None):
    """Node from the local .node/ copy when installed, else the system."""
    path = (env or npm_env()).get("PATH")
    return shutil.which("node.exe" if IS_WINDOWS else "node", path=path)


def _sqlite_binding_available(node, env):
    if node is None:
        return False
    code, _ = run(
        [node, "-e", 'require("sqlite3")'],
        cwd=UI_DIR,
        env=env,
        check=False,
    )
    return code == 0
```

- [ ] **Step 2: Guard the cached fast path with binding validation**

In `ensure_ui_deps`, construct `env` and locate Node before the cache check. Replace the unconditional cached return with:

```python
    env = env or npm_env()
    node = find_node(env)
    cached = env_mod.venv_exists() and env_mod.load_state().get(UI_STATE_KEY) == want
    if cached and os.path.isdir(os.path.join(UI_DIR, "node_modules")):
        if _sqlite_binding_available(node, env):
            ok("UI dependencies already installed.")
            return False
        warn("Cached UI dependencies have a broken SQLite binding — repairing.")
```

Keep dry-run behavior after this check. Remove the later duplicate `env = env or npm_env()` assignment.

- [ ] **Step 3: Add targeted rebuild and revalidation before saving state**

After a successful npm install and before `save_state`, add:

```python
    if not _sqlite_binding_available(node, env):
        info("Rebuilding SQLite native binding...")
        code, _ = run(
            [npm, "rebuild", "sqlite3"],
            cwd=UI_DIR,
            env=env,
            stream=True,
            check=False,
        )
        if code != 0 or not _sqlite_binding_available(node, env):
            warn("SQLite native binding repair failed — the UI may not start.")
            return False
```

This must execute before writing `UI_STATE_KEY` so an unusable dependency tree is never cached as ready.

- [ ] **Step 4: Run focused tests**

Run:

```bash
.venv/bin/python -m unittest testing.test_manager_nodejs testing.test_ui_install_scripts -v
```

Expected: all six tests pass.

- [ ] **Step 5: Commit the manager repair**

```bash
git add manager/nodejs.py
git commit -m "fix: repair missing SQLite native binding"
```

### Task 5: Verify Recovery and the Production Build

**Files:**
- Verify: `ui/package.json`
- Verify: `ui/package-lock.json`
- Verify: `ui/node_modules/sqlite3/`

- [ ] **Step 1: Force the recovery path without deleting dependencies**

Move the existing SQLite native binding to a temporary backup, run the manager sync, then restore the backup only if the manager fails:

```bash
binding="$(find ui/node_modules/sqlite3 -name node_sqlite3.node -print -quit)"
test -n "$binding"
backup="${binding}.verification-backup"
mv "$binding" "$backup"
if .venv/bin/python - <<'PY'
from manager.nodejs import ensure_ui_deps

assert ensure_ui_deps()
PY
then
  test -f "$binding"
  rm "$backup"
else
  mv "$backup" "$binding"
  exit 1
fi
```

Expected: the manager detects the broken cached tree, runs the targeted SQLite rebuild, validates the repaired binding, and prints `UI dependencies ready.` The explicit backup makes the diagnostic reversible if recovery fails.

- [ ] **Step 2: Verify npm has no pending install-script decisions**

Run from `ui/`:

```bash
npm install-scripts ls
```

Expected under npm 12: no packages have unreviewed install scripts.

- [ ] **Step 3: Verify SQLite and the production build**

Run from `ui/`:

```bash
node -e 'require("sqlite3"); console.log("sqlite3 binding loaded")'
npm run build
```

Expected: SQLite loads and Next.js completes the production build. The existing optional `macos-temperature-sensor` warning may appear on Linux.

- [ ] **Step 4: Verify repository cleanliness and all focused tests**

Run from the repository root:

```bash
git diff --exit-code -- ui/package.json ui/package-lock.json
git status --short
.venv/bin/python -m unittest testing.test_manager_nodejs testing.test_ui_install_scripts -v
```

Expected: manifests are unchanged, status has no unexpected files, and all six tests pass.

- [ ] **Step 5: Record verification only if a tracked adjustment was required**

No commit is expected. If verification exposes a necessary tracked change, stop and return to root-cause analysis rather than bundling an unplanned fix.
