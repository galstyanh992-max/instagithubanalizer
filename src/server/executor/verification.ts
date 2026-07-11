import { JarvisTask } from "./types";
import { runAllowedCommand } from "../local-control/command-runner";
import { writeTaskFile } from "../local-control/tasks";

export type VerificationStatus =
  | "pass"
  | "fail_related"
  | "fail_preexisting"
  | "fail_unknown"
  | "blocked_environment";

export interface VerificationResult {
  command: string;
  exitCode: number | null;
  status: VerificationStatus;
  stdout: string;
  stderr: string;
  evidence: string[];
}

export async function runVerificationGates(task: JarvisTask, approvalId: string): Promise<VerificationResult[]> {
  const gates = [
    "npm run lint",
    "npm run typecheck"
  ];
  
  const results: VerificationResult[] = [];

  for (const gate of gates) {
    let status: VerificationStatus = "pass";
    let evidence: string[] = [];
    try {
      const result = await runAllowedCommand({
        repoRoot: task.repoPath,
        command: gate,
        taskId: task.taskId,
        approvalId
      });

      if (result.exitCode !== 0) {
        // Simple heuristic for classification
        if (result.stdout.includes("scripts/") || result.stdout.includes("JarwisyanAICore")) {
           status = "fail_preexisting";
           evidence.push("Detected known preexisting failing files in output.");
        } else if (result.stderr.includes("Can't reach database server")) {
           status = "blocked_environment";
           evidence.push("Database connection timeout detected.");
        } else if (result.stdout.includes("src/server/executor") || result.stdout.includes("src/server/local-control")) {
           status = "fail_related";
           evidence.push("Error found in related task files.");
        } else {
           status = "fail_unknown";
           evidence.push("Unclassified failure.");
        }
      }

      results.push({
        command: gate,
        exitCode: result.exitCode,
        status,
        stdout: result.stdout,
        stderr: result.stderr,
        evidence
      });
      
      const totalOutput = `--- [${gate}] exit: ${result.exitCode} status: ${status} ---\n${result.stdout}\n${result.stderr}`;
      await writeTaskFile(task.taskId, task.repoPath, `verification-${gate.replace(/ /g, "_")}.md`, totalOutput);

    } catch (e: any) {
      status = "fail_unknown";
      evidence.push(e.message);
      results.push({
        command: gate,
        exitCode: 1,
        status,
        stdout: "",
        stderr: e.message,
        evidence
      });
      await writeTaskFile(task.taskId, task.repoPath, `verification-${gate.replace(/ /g, "_")}.md`, `ERROR: ${e.message}`);
    }
  }

  return results;
}
