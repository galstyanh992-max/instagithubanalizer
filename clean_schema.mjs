import fs from 'fs';

const schemaPath = 'prisma/schema.prisma';
const original = fs.readFileSync(schemaPath, 'utf8');

const modelsToRemove = new Set([
  'Category', 'Tag', 'RepositoryTag', 
  'BrowserOperatorTask', 'BrowserOperatorLog', 'BrowserOperatorScreenshot', 'BrowserOperatorProviderConfig',
  'SkillDefinition', 'AgentSkillLink', 'SkillUsageLog', 'SkillPack', 'SkillPackItem', 
  'ToolPack', 'ToolPackItem', 'AgentCapabilityScore', 'AgentToolLink', 'MarketplaceItem', 'ToolUsageLog', 
  'ContentItem', 'ContentReview', 'PublishingQueueItem', 'Lead', 'Contact', 'Conversation', 'ConversationMessage', 'Deal', 'FollowUp', 
  'ProjectArtifact', 'AuditLog', 
  'Epic', 'Task', 'TaskRun', 'TaskEvent'
]);

// Include fields to remove
const fieldsToRemove = new Set(['epicId', 'taskId', 'taskRunId', 'categoryId', 'tagId', 'repositoryTagId', 'browserOperatorTaskId', 'skillPackId', 'toolPackId']);

let currentModel = null;
let outputLines = [];
let skip = false;

const lines = original.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  const match = line.match(/^model\s+([A-Za-z0-9_]+)\s+{/);
  if (match) {
    currentModel = match[1];
    if (modelsToRemove.has(currentModel)) {
      skip = true;
      continue;
    }
  }

  if (skip) {
    if (line.trim() === '}') {
      skip = false;
    }
    continue;
  }

  // Remove lines referencing removed models as types
  let hasRemovedType = false;
  for (const rm of modelsToRemove) {
    // exact match for type: e.g. " Epic ", " Epic?", " Epic[]"
    const regex = new RegExp(`\\s${rm}(\\?|\\[\\])?\\s`);
    if (regex.test(line) && !line.startsWith('//')) {
      hasRemovedType = true;
      break;
    }
    // Also check relation fields at end of line like "Task[] @relation(...)"
    const regex2 = new RegExp(`\\s${rm}(\\?|\\[\\])?$`);
    if (regex2.test(line.trimRight())) {
      hasRemovedType = true;
      break;
    }
  }
  
  if (hasRemovedType && !line.includes('UserTask')) {
    continue;
  }

  // Remove fields that are foreign keys to removed models
  let hasRemovedField = false;
  for (const f of fieldsToRemove) {
    const regex = new RegExp(`^\\s+${f}\\s+`);
    if (regex.test(line)) {
      hasRemovedField = true;
      break;
    }
  }
  if (hasRemovedField) continue;

  // Remove indexes involving removed fields
  let hasRemovedIndex = false;
  for (const f of fieldsToRemove) {
    if (line.includes(`@@index`) && line.includes(f)) {
      hasRemovedIndex = true;
      break;
    }
  }
  if (hasRemovedIndex) continue;

  // OrchestrationRun tweaks
  if (currentModel === 'OrchestrationRun' && line.trim().startsWith('userId ')) {
    outputLines.push('  ownerUserId        String?              @map("user_id")');
    continue;
  }
  
  // Exclude duplicate Device if any
  if (currentModel === 'Device') {
    // Actually, Device exists in schema.prisma!
    // So we don't need to append it at the end if it's already there!
  }

  outputLines.push(line);
}

// Check if Device model was found
const hasDevice = outputLines.some(l => l.startsWith('model Device {'));
if (!hasDevice) {
  outputLines.push(`
model Device {
  id          String   @id @default(cuid())
  ownerUserId String
  fingerprint String   @unique
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("devices")
}
`);
}

fs.writeFileSync('prisma/schema_clean.prisma', outputLines.join('\n'));
