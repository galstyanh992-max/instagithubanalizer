import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

export type InfrastructureStatus = "CREATED" | "VALIDATING" | "PLANNING" | "WAITING_APPROVAL" | "CREATING_LOCAL" | "VERIFYING" | "COMPLETED" | "PARTIAL" | "BLOCKED" | "FAILED" | "CANCELLED";
export type ProviderName = "github" | "vercel" | "supabase";

export interface CreateProjectRequest {
  projectName: string;
  localPath: string;
  idempotencyKey: string;
  dryRun?: boolean;
  providers?: ProviderName[];
}

export interface ProjectInfrastructureResult {
  operationId: string;
  status: InfrastructureStatus;
  localPath: string;
  requiresApproval: boolean;
  logs: string[];
}

const D_DRIVE = "D:\\";
const SECRET_KEY = /(?:token|secret|password|api[_-]?key|authorization)/i;

export function normalizeDDrivePath(input: string): string {
  const value = input.trim();
  if (!value || value.startsWith("\\\\") || /^\\\\[.?]\\/.test(value) || /^[a-z]:/i.test(value) && !/^d:/i.test(value)) {
    throw new Error("forbidden local path");
  }
  const resolved = path.win32.resolve(value);
  if (!/^d:\\(?:|[^\\].*)$/i.test(resolved) || resolved === D_DRIVE) {
    throw new Error("local path must be a child of D:\\");
  }
  return resolved;
}

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, SECRET_KEY.test(key) ? "[REDACTED]" : redactSecrets(item)]));
}

function safeName(projectName: string): string {
  const name = projectName.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(name)) throw new Error("projectName must contain lowercase letters, numbers, and hyphens only");
  return name;
}

function parseJson<T>(value: string): T { return JSON.parse(value) as T; }

export const projectInfrastructureService = {
  async plan(request: CreateProjectRequest): Promise<ProjectInfrastructureResult> {
    const projectName = safeName(request.projectName);
    const localPath = normalizeDDrivePath(request.localPath);
    if (!request.idempotencyKey || request.idempotencyKey.length > 128) throw new Error("idempotencyKey is required");
    const providers = Array.from(new Set(request.providers ?? []));
    const existing = await db.infrastructureOperation.findUnique({ where: { idempotencyKey: request.idempotencyKey }, include: { steps: true } });
    if (existing) return { operationId: existing.id, status: existing.status as InfrastructureStatus, localPath: existing.localPath, requiresApproval: providers.length > 0, logs: existing.steps.map((step) => step.message) };

    const external = providers.length > 0;
    const status: InfrastructureStatus = external ? "WAITING_APPROVAL" : "PLANNING";
    const operation = await db.infrastructureOperation.create({
      data: {
        idempotencyKey: request.idempotencyKey,
        name: projectName,
        localPath,
        status,
        requested: JSON.stringify(redactSecrets({ projectName, localPath, dryRun: request.dryRun !== false, providers })),
        steps: { create: [
          { kind: "LOCAL_BOOTSTRAP", status: "PLANNED", message: `Local bootstrap planned: ${localPath}` },
          ...providers.map((provider) => ({ kind: provider.toUpperCase(), status: "WAITING_APPROVAL", message: `${provider} creation requires approval` })),
        ] },
      },
      include: { steps: true },
    });
    return { operationId: operation.id, status, localPath, requiresApproval: external, logs: operation.steps.map((step) => step.message) };
  },

  async get(operationId: string) {
    return db.infrastructureOperation.findUnique({ where: { id: operationId }, include: { steps: { orderBy: { createdAt: "asc" } } } });
  },

  async approve(operationId: string): Promise<ProjectInfrastructureResult> {
    const operation = await this.get(operationId);
    if (!operation) throw new Error("operation not found");
    if (operation.status !== "WAITING_APPROVAL") throw new Error("operation is not waiting for approval");
    await db.infrastructureOperation.update({ where: { id: operationId }, data: { approval: JSON.stringify({ approvedAt: new Date().toISOString(), scope: "provider creation explicitly approved" }), status: "PLANNING" } });
    await db.infrastructureOperationStep.updateMany({ where: { operationId, status: "WAITING_APPROVAL" }, data: { status: "PLANNED", message: "Approved; still planned and not executed by this endpoint" } });
    return { operationId, status: "PLANNING", localPath: operation.localPath, requiresApproval: false, logs: ["Approval recorded. External actions remain unexecuted until a dedicated adapter is invoked."] };
  },

  async bootstrapLocal(operationId: string): Promise<ProjectInfrastructureResult> {
    const operation = await this.get(operationId);
    if (!operation) throw new Error("operation not found");
    if (["CANCELLED", "COMPLETED"].includes(operation.status)) throw new Error("operation cannot be bootstrapped");
    const requested = parseJson<{ providers?: ProviderName[] }>(operation.requested);
    if ((requested.providers ?? []).length > 0 && operation.status === "WAITING_APPROVAL") throw new Error("approval required before provider-backed operation");
    const localPath = normalizeDDrivePath(operation.localPath);
    await db.infrastructureOperation.update({ where: { id: operationId }, data: { status: "CREATING_LOCAL" } });
    try {
      const entry = await fs.stat(localPath).catch(() => null);
      if (entry) {
        const contents = await fs.readdir(localPath);
        if (contents.length > 0) throw new Error("refusing to overwrite a non-empty directory");
      } else {
        await fs.mkdir(localPath, { recursive: true });
      }
      const marker = path.win32.join(localPath, ".jarvis-operation.json");
      await fs.writeFile(marker, JSON.stringify({ operationId, createdAt: new Date().toISOString() }, null, 2), { encoding: "utf8", flag: "wx" }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
      await db.infrastructureOperation.update({ where: { id: operationId }, data: { status: "COMPLETED", compensation: JSON.stringify({ createdFiles: [marker], manualRollback: "Remove only files recorded by this operation after review." }) } });
      await db.infrastructureOperationStep.updateMany({ where: { operationId, kind: "LOCAL_BOOTSTRAP" }, data: { status: "COMPLETED", message: "Local bootstrap completed", evidence: JSON.stringify({ marker }) } });
      return { operationId, status: "COMPLETED", localPath, requiresApproval: false, logs: ["Local bootstrap completed"] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "local bootstrap failed";
      await db.infrastructureOperation.update({ where: { id: operationId }, data: { status: "FAILED", error: message } });
      throw new Error(message);
    }
  },

  async cancel(operationId: string) {
    const operation = await this.get(operationId);
    if (!operation) throw new Error("operation not found");
    if (["COMPLETED", "CANCELLED"].includes(operation.status)) throw new Error("operation cannot be cancelled");
    return db.infrastructureOperation.update({ where: { id: operationId }, data: { status: "CANCELLED" } });
  },
};
