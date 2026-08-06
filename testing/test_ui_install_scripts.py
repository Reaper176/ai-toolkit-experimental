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
