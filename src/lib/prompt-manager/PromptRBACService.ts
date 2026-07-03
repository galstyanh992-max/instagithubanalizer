import { db } from '@/lib/db';

export class PromptAuthorizationError extends Error {
  public status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'PromptAuthorizationError';
  }
}

export class PromptRBACService {
  /**
   * Defines which roles can perform which actions.
   */
  static readonly PERMISSIONS = {
    view: ['viewer', 'editor', 'prompt_engineer', 'admin', 'owner'],
    create_template: ['editor', 'prompt_engineer', 'admin', 'owner'],
    add_version: ['editor', 'prompt_engineer', 'admin', 'owner'],
    promote_staging: ['prompt_engineer', 'admin', 'owner'],
    promote_prod: ['admin', 'owner'],
    rollback: ['admin', 'owner'],
    archive: ['admin', 'owner'],
    execute_sandbox: ['prompt_engineer', 'admin', 'owner'],
    view_cost: ['prompt_engineer', 'admin', 'owner']
  };

  /**
   * Get the role for an agent. If no binding exists, assume viewer.
   */
  static async getRole(agentId: string): Promise<string> {
    const binding = await db.promptRoleBinding.findUnique({
      where: { agentId }
    });
    return binding?.role || 'viewer';
  }

  /**
   * Check if an agent has permission to perform an action.
   */
  static async can(agentId: string, action: keyof typeof PromptRBACService.PERMISSIONS): Promise<boolean> {
    const role = await this.getRole(agentId);
    const allowedRoles = this.PERMISSIONS[action] || [];
    return allowedRoles.includes(role);
  }

  /**
   * Throws an error if the agent lacks permission.
   */
  static async enforce(agentId: string, action: keyof typeof PromptRBACService.PERMISSIONS): Promise<void> {
    const isAllowed = await this.can(agentId, action);
    if (!isAllowed) {
      const role = await this.getRole(agentId);
      throw new PromptAuthorizationError(`Forbidden: Role '${role}' is not authorized to perform action '${action}'`);
    }
  }
}
