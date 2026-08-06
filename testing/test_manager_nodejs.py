import contextlib
import unittest
from unittest import mock

from manager import env as manager_env
from manager import nodejs


TEST_ENV = {"PATH": "/bin"}
INSTALL_CALL = mock.call(
    ["/npm", "install", "--no-save", "--no-audit", "--no-fund"],
    cwd=nodejs.UI_DIR,
    env=TEST_ENV,
    stream=True,
    check=False,
)
REBUILD_CALL = mock.call(
    ["/npm", "rebuild", "sqlite3"],
    cwd=nodejs.UI_DIR,
    env=TEST_ENV,
    stream=True,
    check=False,
)


@contextlib.contextmanager
def patched_ui_install(binding_checks, run_results=()):
    with contextlib.ExitStack() as stack:
        stack.enter_context(
            mock.patch.object(manager_env, "venv_exists", return_value=True)
        )
        stack.enter_context(
            mock.patch.object(
                manager_env,
                "load_state",
                side_effect=lambda: {nodejs.UI_STATE_KEY: "manifest-hash"},
            )
        )
        save_state = stack.enter_context(
            mock.patch.object(manager_env, "save_state")
        )
        stack.enter_context(
            mock.patch.object(nodejs, "_ui_deps_hash", return_value="manifest-hash")
        )
        stack.enter_context(mock.patch.object(nodejs.os.path, "isfile", return_value=True))
        stack.enter_context(mock.patch.object(nodejs.os.path, "isdir", return_value=True))
        find_npm = stack.enter_context(
            mock.patch.object(nodejs, "find_npm", return_value="/npm")
        )
        stack.enter_context(
            mock.patch.object(nodejs, "find_node", return_value="/node", create=True)
        )
        binding_available = stack.enter_context(
            mock.patch.object(
                nodejs,
                "_sqlite_binding_available",
                side_effect=binding_checks,
                create=True,
            )
        )
        run = stack.enter_context(
            mock.patch.object(nodejs, "run", side_effect=run_results)
        )
        yield save_state, find_npm, binding_available, run


class EnsureUiDepsTest(unittest.TestCase):
    def test_cached_tree_with_working_sqlite_is_a_no_op(self):
        with patched_ui_install([True]) as (
            save_state,
            find_npm,
            binding_available,
            run,
        ):
            changed = nodejs.ensure_ui_deps(env=TEST_ENV)

        self.assertFalse(changed)
        binding_available.assert_called_once_with("/node", TEST_ENV)
        find_npm.assert_not_called()
        run.assert_not_called()
        save_state.assert_not_called()

    def test_cached_tree_with_broken_sqlite_installs_and_rebuilds(self):
        with patched_ui_install(
            [False, False, True], [(0, ""), (0, "")]
        ) as (save_state, _, binding_available, run):
            changed = nodejs.ensure_ui_deps(env=TEST_ENV)

        self.assertTrue(changed)
        self.assertEqual(run.call_args_list, [INSTALL_CALL, REBUILD_CALL])
        self.assertEqual(
            binding_available.call_args_list,
            [mock.call("/node", TEST_ENV)] * 3,
        )
        save_state.assert_called_once_with({nodejs.UI_STATE_KEY: "manifest-hash"})

    def test_failed_sqlite_rebuild_does_not_save_state(self):
        with patched_ui_install(
            [False, False], [(0, ""), (1, "")]
        ) as (save_state, _, binding_available, run):
            changed = nodejs.ensure_ui_deps(env=TEST_ENV)

        self.assertFalse(changed)
        self.assertEqual(run.call_args_list, [INSTALL_CALL, REBUILD_CALL])
        self.assertEqual(
            binding_available.call_args_list,
            [mock.call("/node", TEST_ENV)] * 2,
        )
        save_state.assert_not_called()

    def test_sqlite_still_broken_after_rebuild_does_not_save_state(self):
        with patched_ui_install(
            [False, False, False], [(0, ""), (0, "")]
        ) as (save_state, _, binding_available, run):
            changed = nodejs.ensure_ui_deps(env=TEST_ENV)

        self.assertFalse(changed)
        self.assertEqual(run.call_args_list, [INSTALL_CALL, REBUILD_CALL])
        self.assertEqual(
            binding_available.call_args_list,
            [mock.call("/node", TEST_ENV)] * 3,
        )
        save_state.assert_not_called()


if __name__ == "__main__":
    unittest.main()
