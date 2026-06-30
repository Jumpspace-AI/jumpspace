from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence, TypeVar

CONTRACT_VERSION = 1

SCHEMA_NAMES: tuple[str, ...] = (
    "error",
    "schema.list",
    "schema.show",
    "schema.coverage",
    "task.list",
    "task.find",
    "task.find.compact",
    "task.audit",
    "task.last",
    "task.history",
    "task.handoff",
    "init.ci",
    "task.doctor",
    "release.doctor",
    "release.install-doctor",
    "task.context",
    "task.related",
    "task.related.compact",
    "task.plan.review",
    "task.plan.save",
    "task.plan.show",
    "task.plan.validate",
    "task.ready",
    "task.execute",
    "task.next",
    "task.step.complete",
    "task.status",
    "task.verify",
    "task.work",
    "task.ask",
    "task.ask.compact",
    "task.semantic.build",
    "task.semantic.status",
    "task.semantic.search",
    "task.semantic.eval",
    "task.query",
    "task.drift",
    "task.ci",
    "task.pr.comment",
    "intent.list",
    "intent.check",
    "intent.validate",
    "intent.verify",
    "task.repair",
    "task.link",
    "task.link.suggest",
    "task.link.eval",
    "task.bootstrap.context",
    "task.bootstrap.discover",
    "task.bootstrap.propose",
    "task.bootstrap.validate",
    "task.bootstrap.apply",
)

T = TypeVar("T")


@dataclass(frozen=True)
class CommandError:
    code: str
    message: str
    taskId: str | None = None
    path: str | None = None
    stepId: str | None = None


@dataclass(frozen=True)
class ErrorEnvelope:
    errors: Sequence[CommandError]
    ok: bool = False


@dataclass(frozen=True)
class SchemaListEntry:
    name: str
    command: str
    description: str


@dataclass(frozen=True)
class SchemaDefinition:
    name: str
    command: str
    description: str
    schema: Mapping[str, Any]


@dataclass(frozen=True)
class SchemaListResult:
    schemas: Sequence[SchemaListEntry]
    ok: bool = True
    contract_version: int = CONTRACT_VERSION


@dataclass(frozen=True)
class SchemaShowResult:
    schema: SchemaDefinition
    ok: bool = True
    contract_version: int = CONTRACT_VERSION


@dataclass(frozen=True)
class JumpTask:
    id: str
    title: str
    type: str
    status: str
    doc: Mapping[str, Any]
    spec: str
    code: Sequence[str] = field(default_factory=tuple)
    tests: Sequence[str] = field(default_factory=tuple)
    depends_on: Sequence[str] = field(default_factory=tuple)
    module: str | None = None
    space: str | None = None
    keywords: Sequence[str] = field(default_factory=tuple)
    gaps: Sequence[str] = field(default_factory=tuple)


@dataclass(frozen=True)
class ListResult:
    tasks: Sequence[JumpTask | Mapping[str, Any]]


@dataclass(frozen=True)
class FindResult:
    query: str
    mode: str
    results: Sequence[Mapping[str, Any]]


@dataclass(frozen=True)
class ContextResult:
    task: JumpTask | Mapping[str, Any]
    plan: Mapping[str, Any] | None
    execution: Mapping[str, Any] | None


@dataclass(frozen=True)
class WorkResult:
    task: JumpTask | Mapping[str, Any]
    plan: Mapping[str, Any]
    next_steps: Sequence[Mapping[str, Any]]
    ok: bool = True
    packet_version: int = 1
    schemas: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class ChangedResult:
    since: str
    files: Sequence[Mapping[str, Any]]
    ok: bool = True


@dataclass(frozen=True)
class GraphQueryResult:
    query: Mapping[str, Any]
    results: Sequence[Mapping[str, Any]]
    unanswered_constraints: Sequence[Mapping[str, Any]]
    ok: bool = True


@dataclass(frozen=True)
class HistoryResult:
    history_path: str
    total: int
    returned: int
    filters: Mapping[str, Any]
    entries: Sequence[Mapping[str, Any]]
    ok: bool = True


@dataclass(frozen=True)
class HandoffResult:
    packet_version: int
    generated_at: str
    status: str
    filters: Mapping[str, Any]
    summary: Mapping[str, Any]
    recent_mutations: Mapping[str, Any]
    last_mutation: Mapping[str, Any] | None
    touched_files: Sequence[str]
    task_ids: Sequence[str]
    config_changes: Sequence[str]
    mutation_warnings: Sequence[Mapping[str, Any]]
    health: Mapping[str, Any]
    task: Mapping[str, Any] | None
    suggested_commands: Sequence[str]
    schemas: Mapping[str, str]
    ok: bool = True


@dataclass(frozen=True)
class SemanticBuildResult:
    index_path: str
    task_count: int
    document_count: int
    source_index: Mapping[str, Any]
    backend: Mapping[str, Any]
    config_updated: bool
    ok: bool = True


@dataclass(frozen=True)
class SemanticStatusResult:
    enabled: bool
    path: str
    exists: bool
    ready: bool
    stale: bool
    issues: Sequence[Mapping[str, Any]]
    source_index: Mapping[str, Any] | None
    backend: Mapping[str, Any] | None
    document_count: int
    ok: bool = True


@dataclass(frozen=True)
class SemanticSearchResult:
    query: str
    index_path: str
    backend: Mapping[str, Any]
    results: Sequence[Mapping[str, Any]]
    ok: bool = True


@dataclass(frozen=True)
class SemanticEvalResult:
    query_count: int
    summary: Mapping[str, Any]
    active_backend: Mapping[str, Any] | None
    results: Sequence[Mapping[str, Any]]
    ok: bool = True


@dataclass(frozen=True)
class LinkEvalResult:
    suite: str
    fixture_path: str | None
    case_count: int
    summary: Mapping[str, Any]
    cases: Sequence[Mapping[str, Any]]
    ok: bool = True


@dataclass(frozen=True)
class ReleaseDoctorResult:
    checked_at: str
    status: str
    summary: Mapping[str, Any]
    package: Mapping[str, Any]
    package_dry_run: Mapping[str, Any]
    schemas: Mapping[str, Any]
    registry: Mapping[str, Any]
    local_blockers: Sequence[Mapping[str, Any]]
    local_warnings: Sequence[Mapping[str, Any]]
    external_warnings: Sequence[Mapping[str, Any]]
    ok: bool = True


@dataclass(frozen=True)
class BootstrapProposeResult:
    proposal: Mapping[str, Any]
    validation: Mapping[str, Any]
    summary: Mapping[str, Any]
    ok: bool = True
    propose_version: int = 1
    mode: str = "deterministic_extraction"
    agent_generated: bool = False
    human_approval_required: bool = True
    proposal_file: str | None = None


@dataclass(frozen=True)
class BootstrapApplyResult:
    dry_run: bool
    applied: Sequence[Mapping[str, Any]]
    config_paths_added: Sequence[str]
    ok: bool = True


def is_schema_name(value: str) -> bool:
    return value in SCHEMA_NAMES


def is_error_envelope(value: Mapping[str, Any]) -> bool:
    return value.get("ok") is False and isinstance(value.get("errors"), list)


def assert_ok(result: T | Mapping[str, Any]) -> T | Mapping[str, Any]:
    if isinstance(result, Mapping) and is_error_envelope(result):
        messages = [str(error.get("message", "")) for error in result.get("errors", []) if isinstance(error, Mapping)]
        raise ValueError("; ".join(message for message in messages if message) or "Unknown Jumpspace error.")
    return result
