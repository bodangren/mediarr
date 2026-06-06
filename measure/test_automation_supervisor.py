import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT = Path(__file__).with_name("automation-supervisor.py")
SPEC = importlib.util.spec_from_file_location("automation_supervisor", SCRIPT)
assert SPEC and SPEC.loader
supervisor = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = supervisor
SPEC.loader.exec_module(supervisor)


class AutomationSupervisorTest(unittest.TestCase):
    def load_config(self, root: Path, **env: str):
        values = {"MEASURE_REPO_ROOT": str(root), **env}
        with mock.patch.dict(os.environ, values, clear=True):
            return supervisor.load_config()

    def make_context(self, root: Path, role: str):
        return supervisor.RoleContext(
            supervisor.RoleConfig(role, "test/model", "", ""),
            "track_one",
            "Phase 1: Work",
            "measure/tracks/track_one/plan.md",
            "measure/tracks/track_one/test-strategy.md",
            root / "measure" / "runs" / role,
        )

    def write_result(self, ctx, **overrides):
        payload = {
            "status": "pass",
            "summary": "Verified",
            "findings": [],
            "evidence": ["focused test"],
            **overrides,
        }
        path = supervisor.audit_result_path(ctx)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload), encoding="utf-8")

    def test_new_role_default_models(self):
        with tempfile.TemporaryDirectory() as temp:
            config = self.load_config(Path(temp))

        self.assertEqual(config.phase_acceptance_model, "opencode-go/qwen3.7-plus")
        self.assertEqual(config.adversarial_model, "vocengine-coding/ark-code-latest")
        self.assertEqual(config.ux_model, "kimi-for-coding/k2p6")
        self.assertEqual(config.acceptance_model, "vocengine-coding/glm-5.1")
        self.assertEqual(config.closeout_model, "minimax-cn-coding-plan/MiniMax-M3")

    def test_ux_auto_requires_dev_url_and_frontend_change(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            config = self.load_config(root, PROJECT_DEV_URL="http://localhost:5173")
            with mock.patch.object(supervisor, "changed_files_since", return_value=["server/src/service.ts"]):
                self.assertFalse(supervisor.ux_audit_applicable(config, "base"))
            with mock.patch.object(supervisor, "changed_files_since", return_value=["app/src/Page.tsx"]):
                self.assertTrue(supervisor.ux_audit_applicable(config, "base"))

    def test_ux_modes_override_auto_detection(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            always = self.load_config(root, UX_REQUIRED="always")
            never = self.load_config(root, UX_REQUIRED="never", PROJECT_DEV_URL="http://localhost:5173")

        self.assertTrue(supervisor.ux_audit_applicable(always, "base"))
        self.assertFalse(supervisor.ux_audit_applicable(never, "base"))

    def test_audit_result_must_explicitly_pass(self):
        with tempfile.TemporaryDirectory() as temp:
            ctx = self.make_context(Path(temp), "phase_acceptance")
            self.write_result(ctx, status="fail")
            feedback = supervisor.read_passing_audit_result(ctx)

        self.assertIn("status must be 'pass'", feedback[0])

    def test_closeout_gate_requires_archive_and_active_registry_removal(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            measure = root / "measure"
            (measure / "tracks" / "track_one").mkdir(parents=True)
            (measure / "archive").mkdir(parents=True)
            (measure / "tracks.md").write_text(
                "## Pending Tracks\ntrack_one\n\n## Archived Tracks\n",
                encoding="utf-8",
            )
            config = self.load_config(root, REQUIRE_AGENT_RESULT_BLOCK="false")
            ctx = self.make_context(root, "closeout")
            self.write_result(ctx)

            failed = supervisor.gate_closeout(config, ctx)
            (measure / "tracks" / "track_one").rename(measure / "archive" / "track_one")
            (measure / "tracks.md").write_text(
                "## Pending Tracks\n\n## Archived Tracks\ntrack_one\n",
                encoding="utf-8",
            )
            passed = supervisor.gate_closeout(config, ctx)

        self.assertFalse(failed.passed)
        self.assertTrue(passed.passed)


if __name__ == "__main__":
    unittest.main()
