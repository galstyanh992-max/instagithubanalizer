import fs from 'fs';

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

const mappings = {
  'agent_executions': 'AgentExecution',
  'agent_tasks': 'AgentTask',
  'chat_attachments': 'ChatAttachment',
  'checkpoints': 'Checkpoint',
  'codex_provider_sessions': 'CodexProviderSession',
  'decision_logs': 'DecisionLog',
  'findings': 'Finding',
  'infrastructure_operation_steps': 'InfrastructureOperationStep',
  'infrastructure_operations': 'InfrastructureOperation',
  'orchestration_runs': 'OrchestrationRun',
  'verification_results': 'VerificationResult',
  'audit_logs': 'AuditLog',
  'devices': 'Device',
  'task_events': 'TaskEvent',
  'task_runs': 'TaskRun'
};

for (const [snake, pascal] of Object.entries(mappings)) {
  // Replace model definitions
  const regex = new RegExp(`model ${snake} \\{([\\s\\S]*?)\\}`, 'g');
  content = content.replace(regex, (match, body) => {
    let newBody = body;
    if (!newBody.includes(`@@map("${snake}")`)) {
       newBody = newBody.replace(/(\s+)$/, `\n  @@map("${snake}")$1`);
    }
    return `model ${pascal} {${newBody}}`;
  });
}

// Replace relation types globally, but NOT inside @@map
for (const [snake, pascal] of Object.entries(mappings)) {
  const typeRegex = new RegExp(`(?<!@@map\\(")(?<!model )\\b${snake}\\b`, 'g');
  content = content.replace(typeRegex, pascal);
}

fs.writeFileSync('prisma/schema.prisma', content);
