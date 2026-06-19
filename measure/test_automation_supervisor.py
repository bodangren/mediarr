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
            root / "measure" / "runs" / "run_one" / "track_one" / role,
        )

    def write_result(self, ctx, **overrides):
        payload = {
            "schema_version": supervisor.AUDIT_RESULT_SCHEMA_VERSION,
            "status": "pass",
            "summary": "Verified",
            "blocking_findings": [],
            "nonblocking_findings": [],
            "evidence": ["focused test"],
            "commands": ["python3 -m unittest measure/test_automation_supervisor.py: pass"],
            "changed_files": [],
            "retry_recommendation": "none",
            "confidence": "high",
            **overrides,
        }
        path = supervisor.audit_result_path(ctx)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload), encoding="utf-8")

    def write_archived_track(self, root: Path, *, with_manifest: bool = True):
        measure = root / "measure"
        active_track = measure / "tracks" / "track_one"
        if active_track.exists():
            active_track.rmdir()
        archive = measure / "archive" / "track_one"
        archive.mkdir(parents=True, exist_ok=True)
        (archive / "plan.md").write_text(
            "# Plan\n\n"
            "## Phase 1: Work [checkpoint: abc1234]\n\n"
            "- [x] Complete work (abc1234)\n",
            encoding="utf-8",
        )
        (archive / "metadata.json").write_text(
            json.dumps({"id": "track_one", "status": "done", "completed": "2026-06-19"}),
            encoding="utf-8",
        )
        if with_manifest:
            (archive / supervisor.CLOSEOUT_MANIFEST_NAME).write_text(
                json.dumps({"track_id": "track_one", "deleted_artifacts": []}),
                encoding="utf-8",
            )
        (measure / "tracks.md").write_text(
            "## Active Tracks -- Execution Order\n\n## Archived Tracks\ntrack_one\n",
            encoding="utf-8",
        )

    def test_new_role_default_models(self):
        with tempfile.TemporaryDirectory() as temp:
            config = self.load_config(Path(temp))

        self.assertEqual(config.phase_acceptance_model, "vocengine-coding/glm-5.2")
        self.assertEqual(config.adversarial_model, "minimax-cn-coding-plan/MiniMax-M3")
        self.assertEqual(config.ux_model, "kimi-for-coding/k2p7")
        self.assertEqual(config.acceptance_model, "openai/gpt-5.5")
        self.assertEqual(config.closeout_model, "deepseek/deepseek-v4-flash")

    def test_ux_auto_requires_dev_url_and_user_facing_change(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            config = self.load_config(root, PROJECT_DEV_URL="http://localhost:5173")
            with mock.patch.object(supervisor, "changed_files_since", return_value=["server/src/service.ts"]):
                self.assertFalse(supervisor.ux_audit_applicable(config, "base"))
            with mock.patch.object(supervisor, "changed_files_since", return_value=["app/src/Page.tsx"]):
                self.assertTrue(supervisor.ux_audit_applicable(config, "base"))
            with mock.patch.object(supervisor, "changed_files_since", return_value=["app/src/Page.test.tsx"]):
                self.assertFalse(supervisor.ux_audit_applicable(config, "base"))
            with mock.patch.object(supervisor, "changed_files_since", return_value=["clients/mediarr-client/lib/screens/home_screen.dart"]):
                self.assertTrue(supervisor.ux_audit_applicable(config, "base"))
            with mock.patch.object(supervisor, "changed_files_since", return_value=["measure/tracks/track_one/plan.md"]):
                self.assertFalse(supervisor.ux_audit_applicable(config, "base"))

    def test_ux_modes_override_auto_detection(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            always = self.load_config(root, UX_REQUIRED="always")
            never = self.load_config(root, UX_REQUIRED="never", PROJECT_DEV_URL="http://localhost:5173")

        self.assertTrue(supervisor.ux_audit_applicable(always, "base"))
        self.assertFalse(supervisor.ux_audit_applicable(never, "base"))

    def test_audit_result_must_use_versioned_schema(self):
        with tempfile.TemporaryDirectory() as temp:
            ctx = self.make_context(Path(temp), "phase_acceptance")
            path = supervisor.audit_result_path(ctx)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({"status": "pass", "summary": "legacy", "findings": []}), encoding="utf-8")
            feedback = supervisor.read_passing_audit_result(ctx)

        self.assertTrue(any("schema_version" in item for item in feedback))
        self.assertTrue(any("legacy findings" in item for item in feedback))

    def test_audit_result_must_explicitly_pass(self):
        with tempfile.TemporaryDirectory() as temp:
            ctx = self.make_context(Path(temp), "phase_acceptance")
            self.write_result(
                ctx,
                status="fail",
                blocking_findings=["Missing regression test"],
                retry_recommendation="retry_tests",
            )
            feedback = supervisor.read_passing_audit_result(ctx)

        self.assertIn("status must be 'pass'", feedback[0])
        self.assertIn("retry_tests", feedback[0])

    def test_ux_audit_requires_webbridge_evidence(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            ctx = self.make_context(root, "ux")
            self.write_result(
                ctx,
                webbridge_status="healthy",
                webbridge_evidence={"screenshots": [], "accessibility_snapshots": [], "interactions": []},
            )
            failed = supervisor.gate_ux(self.load_config(root, REQUIRE_AGENT_RESULT_BLOCK="false"), ctx)
            self.write_result(
                ctx,
                webbridge_status="healthy",
                webbridge_evidence={
                    "screenshots": ["measure/runs/run_one/track_one/ux/screen.png"],
                    "accessibility_snapshots": [],
                    "interactions": [],
                },
            )
            passed = supervisor.gate_ux(self.load_config(root, REQUIRE_AGENT_RESULT_BLOCK="false"), ctx)

        self.assertFalse(failed.passed)
        self.assertTrue(passed.passed)

    def test_closeout_gate_requires_archive_preflight_manifest_and_artifact_cleanup(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            measure = root / "measure"
            (measure / "tracks" / "track_one").mkdir(parents=True)
            (measure / "archive").mkdir(parents=True)
            (measure / "tracks.md").write_text(
                "## Active Tracks -- Execution Order\ntrack_one\n\n## Archived Tracks\n",
                encoding="utf-8",
            )
            config = self.load_config(
                root,
                RUN_ID="run_one",
                RUN_ROOT=str(measure / "runs"),
                REQUIRE_AGENT_RESULT_BLOCK="false",
            )
            ctx = self.make_context(root, "closeout")
            ctx.context_dir = measure / "runs" / "run_one" / "track_one" / "closeout"
            self.write_result(ctx)

            failed_active = supervisor.gate_closeout(config, ctx)
            self.write_archived_track(root)
            stale_dir = measure / "runs" / "run_one" / "track_one" / "phase-1"
            stale_dir.mkdir(parents=True)
            failed_stale = supervisor.gate_closeout(config, ctx)
            stale_dir.rmdir()
            passed = supervisor.gate_closeout(config, ctx)

        self.assertFalse(failed_active.passed)
        self.assertTrue(any("Track must be moved" in item for item in failed_active.feedback))
        self.assertFalse(failed_stale.passed)
        self.assertTrue(any("delete bulky" in item for item in failed_stale.feedback))
        self.assertTrue(passed.passed)

    def test_cleanup_remaining_track_artifacts_removes_safe_track_dir(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            measure = root / "measure"
            config = self.load_config(root, RUN_ID="run_one", RUN_ROOT=str(measure / "runs"))
            artifact_dir = measure / "runs" / "run_one" / "track_one" / "closeout"
            artifact_dir.mkdir(parents=True)

            removed = supervisor.cleanup_remaining_track_artifacts(config, "track_one")

        self.assertTrue(removed)
        self.assertFalse((measure / "runs" / "run_one" / "track_one").exists())


if __name__ == "__main__":
    unittest.main()
