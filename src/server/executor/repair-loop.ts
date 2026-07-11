import { JarvisTask } from "./types";
import { VerificationResult } from "./verification";
import { writeTaskFile, readTaskFile } from "../local-control/tasks";
import { logAuditEvent } from "../local-control/audit-log";

const MAX_ITERATIONS = 3;

export async function initiateRepairLoop(task: JarvisTask, verificationResults: VerificationResult[]): Promise<JarvisTask> {
  const currentIteration = task.iterationCount || 0;
  
  // Find related errors that actually trigger repair
  const relatedErrors = verificationResults.filter(r => r.status === "fail_related");
  
  if (relatedErrors.length === 0) {
     // If there are no related errors, we don't need a repair loop for this component
     // We can just return the task, maybe status "needs_repair" but it won't be automated.
     return task;
  }

  const iterationDir = `repairs/iteration-${currentIteration + 1}`;
  const totalOutput = relatedErrors.map(r => `[${r.command}]\n${r.stdout}\n${r.stderr}`).join("\n\n");

  if (currentIteration >= MAX_ITERATIONS) {
    task.status = "needs_repair";
    await writeTaskFile(task.taskId, task.repoPath, `${iterationDir}/repair-loop.md`, 
      `# Repair Loop Halted\nMax iterations (${MAX_ITERATIONS}) reached.\n\n## Last Error:\n${totalOutput}`
    );
    return task;
  }

  const repairPrompt = `# Repair Loop (Iteration ${currentIteration + 1} of ${MAX_ITERATIONS})

## Verification Error Output
\`\`\`
${totalOutput}
\`\`\`

Please fix the errors shown above.
`;

  await writeTaskFile(task.taskId, task.repoPath, `${iterationDir}/repair-prompt.md`, repairPrompt);
  await writeTaskFile(task.taskId, task.repoPath, `${iterationDir}/repair-context.json`, JSON.stringify(relatedErrors, null, 2));
  
  // Log repair action
  await logAuditEvent(task.repoPath, {
    id: "repair-" + currentIteration,
    taskId: task.taskId,
    actor: "jarvis",
    action: "repair_loop_created",
    status: "allowed",
    metadata: { iteration: currentIteration + 1, sourceFailure: "verification", status: "allowed" }
  });

  // Update task state. In real scenario, the promptPath would point to the new repair prompt.
  task.iterationCount = currentIteration + 1;
  task.status = "awaiting_approval"; 
  task.mode = "REPAIR_LOOP";

  return task;
}
