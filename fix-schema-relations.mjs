import fs from 'fs';

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// OrchestrationRun relations
content = content.replace(/AgentExecution\s+AgentExecution\[\]/g, 'agentExecutions AgentExecution[]');
content = content.replace(/AgentTask\s+AgentTask\[\]/g, 'tasks AgentTask[]');
content = content.replace(/Checkpoint\s+Checkpoint\[\]/g, 'checkpoints Checkpoint[]');
content = content.replace(/DecisionLog\s+DecisionLog\[\]/g, 'decisionLogs DecisionLog[]');
content = content.replace(/Finding\s+Finding\[\]/g, 'findings Finding[]');
content = content.replace(/VerificationResult\s+VerificationResult\[\]/g, 'verificationResults VerificationResult[]');

// VerificationResult relations
content = content.replace(/Finding\s+String\s+@default\("\[\]"\)/g, 'findings String @default("[]")');

// InfrastructureOperation relations
content = content.replace(/InfrastructureOperationStep\s+InfrastructureOperationStep\[\]/g, 'steps InfrastructureOperationStep[]');

fs.writeFileSync('prisma/schema.prisma', content);
