import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function updateTaskState(taskId: string, installationId: string, expectedCurrentStates: string[], targetState: string, additionalData: any = {}) {
  const device = await db.device.findUnique({ where: { installationId } });
  if (!device || device.revokedAt) {
    return NextResponse.json({ error: 'Device invalid or revoked' }, { status: 403 });
  }

  const task = await db.agentTask.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Enforce binding (task must be claimed by THIS device)
  if (task.agentId !== device.id) {
    return NextResponse.json({ error: 'Task not claimed by this device' }, { status: 403 });
  }

  if (!expectedCurrentStates.includes(task.status)) {
    // Return 409 Conflict for invalid state transitions
    return NextResponse.json({ error: `Invalid state transition from ${task.status} to ${targetState}` }, { status: 409 });
  }

  const updated = await db.agentTask.update({
    where: { id: taskId },
    data: {
      status: targetState,
      ...additionalData
    }
  });

  return NextResponse.json({ task: updated });
}

export function redactPayload(payload: any): any {
  if (!payload) return payload;
  const sensitiveKeys = ['token', 'authorization', 'password', 'databaseurl', 'directurl', 'secret', 'key'];
  
  if (typeof payload === 'string') {
    // Basic string redaction if it looks like a token or URL with password
    return payload; // Hard to redact raw strings without context, rely on object keys
  }

  if (typeof payload === 'object') {
    if (Array.isArray(payload)) {
      return payload.map(item => redactPayload(item));
    }
    const redacted = { ...payload };
    for (const key of Object.keys(redacted)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = redactPayload(redacted[key]);
      }
    }
    return redacted;
  }
  
  return payload;
}
