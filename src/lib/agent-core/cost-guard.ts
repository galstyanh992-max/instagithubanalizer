export class InsufficientFundsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}

/**
 * Check if the workspace budget is sufficient to cover the task cost estimate.
 * @param monthlyBudgetUsd Total budget for the month
 * @param spentThisMonth Amount already spent this month
 * @param taskCostEstimate Estimated cost for the new task
 * @throws InsufficientFundsError if budget is exceeded
 */
export function checkWorkspaceBudget(monthlyBudgetUsd: number, spentThisMonth: number, taskCostEstimate: number): void {
  // If budget is 0, we might assume unlimited or no budget set depending on business logic. 
  // Let's assume if it's explicitly set to a positive number, we enforce it.
  if (monthlyBudgetUsd > 0) {
    const projectedSpend = spentThisMonth + taskCostEstimate;
    if (projectedSpend > monthlyBudgetUsd) {
      throw new InsufficientFundsError(
        `Workspace budget exceeded. Budget: $${monthlyBudgetUsd}, Spent: $${spentThisMonth}, Estimated: $${taskCostEstimate}.`
      );
    }
  }
}

/**
 * Check if a task has exceeded its individual maximum cost limit.
 * @param maxCostUsd The maximum allowed cost for this specific task
 * @param currentCostUsd The current accumulated cost of this task
 * @param nextStepEstimate The estimated cost of the next step
 * @throws InsufficientFundsError if task limit is exceeded
 */
export function checkTaskCostLimit(maxCostUsd: number, currentCostUsd: number, nextStepEstimate: number = 0): void {
  if (maxCostUsd > 0) {
    const projectedCost = currentCostUsd + nextStepEstimate;
    if (projectedCost > maxCostUsd) {
      throw new InsufficientFundsError(
        `Task cost limit exceeded. Limit: $${maxCostUsd}, Current: $${currentCostUsd}, Next Step: $${nextStepEstimate}.`
      );
    }
  }
}
