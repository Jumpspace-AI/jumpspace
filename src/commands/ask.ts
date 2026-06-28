import { loadConfig, readIndex } from "../core/config.js";
import { renderAskSummary, summarizeQuestionEvidence } from "../core/ask.js";
import { semanticIndexStatus } from "../core/semanticIndex.js";

export type AskOptions = {
  root?: string;
  compact?: boolean;
  json?: boolean;
  writeLine?: (line: string) => void;
};

export async function runAsk(question: string, options: AskOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const [config, index] = await Promise.all([loadConfig(root), readIndex(root)]);
  const semanticStatus = await semanticIndexStatus(root, index, config);
  const summary = await summarizeQuestionEvidence(index, question, {
    semantic: {
      status: semanticStatus,
      index: semanticStatus.index ?? undefined,
    },
  });

  const body =
    options.json && options.compact
      ? {
          ok: true,
          compact: true,
          question: summary.question,
          retrieval_mode: summary.retrieval_mode,
          terms: summary.terms,
          coverage: summary.coverage,
          unanswered_terms: summary.unanswered_terms,
          retrieval: summary.retrieval,
          weak_evidence: summary.weak_evidence,
          evidence: summary.evidence.map((item) => ({
            task_id: item.task_id,
            title: item.title,
            status: item.status,
            path: item.path,
            heading: item.heading,
            match_reasons: item.match_reasons,
            matched_terms: item.matched_terms,
            semantic_terms: item.semantic_terms,
            retrieval_sources: item.retrieval_sources,
            scores: item.scores,
            linked_code_count: item.linked_code.length,
            linked_test_count: item.linked_tests.length,
            connected_task_ids: item.connected_tasks.map((task) => task.task_id),
            graph_path_count: item.graph_expansion.length,
          })),
        }
      : { ok: true, ...summary };
  writeLine(options.json ? JSON.stringify(body, null, 2) : renderAskSummary(summary));
  return 0;
}
