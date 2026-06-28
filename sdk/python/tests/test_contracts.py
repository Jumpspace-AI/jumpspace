import json
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from jumpspace_sdk import CONTRACT_VERSION, SCHEMA_NAMES, assert_ok, is_error_envelope, is_schema_name
from jumpspace_sdk.contracts import BootstrapProposeResult, CommandError, ErrorEnvelope, FindResult


class PythonSdkContractsTest(unittest.TestCase):
    def test_schema_names_match_cli_catalog(self) -> None:
        root = Path(__file__).resolve().parents[3]
        output = subprocess.check_output(
            ["node", str(root / "dist" / "cli.js"), "schema", "list", "--json"],
            cwd=root,
            text=True,
        )
        catalog = json.loads(output)
        generated_catalog = json.loads((root / "schemas" / "catalog.json").read_text())

        self.assertEqual(CONTRACT_VERSION, 1)
        self.assertEqual(list(SCHEMA_NAMES), [schema["name"] for schema in catalog["schemas"]])
        self.assertEqual(list(SCHEMA_NAMES), [schema["name"] for schema in generated_catalog["schemas"]])
        self.assertTrue(is_schema_name("bootstrap.propose"))
        self.assertFalse(is_schema_name("missing"))

        for schema_name in SCHEMA_NAMES:
            artifact = json.loads((root / "schemas" / f"{schema_name}.schema.json").read_text())
            self.assertEqual(artifact["contract_version"], CONTRACT_VERSION)
            self.assertEqual(artifact["name"], schema_name)

    def test_error_helpers(self) -> None:
        envelope = {"ok": False, "errors": [{"code": "NOPE", "message": "Nope."}]}

        self.assertTrue(is_error_envelope(envelope))
        with self.assertRaisesRegex(ValueError, "Nope"):
            assert_ok(envelope)

        dataclass_envelope = ErrorEnvelope(errors=[CommandError(code="NOPE", message="Nope.")])
        self.assertFalse(dataclass_envelope.ok)
        self.assertEqual(dataclass_envelope.errors[0].code, "NOPE")

    def test_command_dataclasses(self) -> None:
        find = FindResult(query="approval", mode="all", results=[])
        propose = BootstrapProposeResult(proposal={"tasks": []}, validation={"ok": True}, summary={"proposed_tasks": 0})

        self.assertEqual(find.mode, "all")
        self.assertEqual(propose.mode, "deterministic_extraction")
        self.assertFalse(propose.agent_generated)
        self.assertTrue(propose.human_approval_required)


if __name__ == "__main__":
    unittest.main()
