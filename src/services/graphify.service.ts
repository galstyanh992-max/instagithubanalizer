import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

const GRAPHIFY_CLI = process.env.GRAPHIFY_CLI || "C:\\Users\\Admin\\AppData\\Local\\Python\\pythoncore-3.14-64\\Scripts\\graphify.exe";
const PROJECT_ROOT = process.cwd();
const GRAPH_OUT_DIR = path.join(PROJECT_ROOT, "graphify-out");

export interface GraphifyQueryResult {
  stdout: string;
  stderr: string;
}

export const graphifyService = {
  /**
   * Build or refresh the project knowledge graph.
   * Runs: graphify . --code-only
   */
  async analyzeProject(): Promise<GraphifyQueryResult> {
    try {
      const { stdout, stderr } = await execAsync(`"${GRAPHIFY_CLI}" . --code-only`, {
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        maxBuffer: 10 * 1024 * 1024,
      });
      return { stdout, stderr };
    } catch (err: any) {
      throw new Error(`Graphify analyze failed: ${err.message}\n${err.stderr || ""}`);
    }
  },

  /**
   * Query the project graph with natural language.
   * Runs: graphify query "<text>"
   */
  async query(queryText: string): Promise<GraphifyQueryResult> {
    try {
      const { stdout, stderr } = await execAsync(`"${GRAPHIFY_CLI}" query "${queryText.replace(/"/g, '\\"')}"`, {
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        maxBuffer: 10 * 1024 * 1024,
      });
      return { stdout, stderr };
    } catch (err: any) {
      throw new Error(`Graphify query failed: ${err.message}\n${err.stderr || ""}`);
    }
  },

  /**
   * Get the path between two concepts in the graph.
   */
  async path(fromConcept: string, toConcept: string): Promise<GraphifyQueryResult> {
    try {
      const { stdout, stderr } = await execAsync(
        `"${GRAPHIFY_CLI}" path "${fromConcept.replace(/"/g, '\\"')}" "${toConcept.replace(/"/g, '\\"')}"`,
        { cwd: PROJECT_ROOT, env: { ...process.env }, maxBuffer: 10 * 1024 * 1024 }
      );
      return { stdout, stderr };
    } catch (err: any) {
      throw new Error(`Graphify path failed: ${err.message}\n${err.stderr || ""}`);
    }
  },

  /**
   * Explain a node in the graph.
   */
  async explain(node: string): Promise<GraphifyQueryResult> {
    try {
      const { stdout, stderr } = await execAsync(`"${GRAPHIFY_CLI}" explain "${node.replace(/"/g, '\\"')}"`, {
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        maxBuffer: 10 * 1024 * 1024,
      });
      return { stdout, stderr };
    } catch (err: any) {
      throw new Error(`Graphify explain failed: ${err.message}\n${err.stderr || ""}`);
    }
  },

  /**
   * Return the graph.json content for UI visualization or further processing.
   */
  async getGraphJson(): Promise<unknown> {
    const fs = await import("fs/promises");
    const graphPath = path.join(GRAPH_OUT_DIR, "graph.json");
    const raw = await fs.readFile(graphPath, "utf-8");
    return JSON.parse(raw);
  },

  /**
   * Check if graph output exists.
   */
  async isGraphBuilt(): Promise<boolean> {
    const fs = await import("fs/promises");
    try {
      await fs.access(path.join(GRAPH_OUT_DIR, "graph.json"));
      return true;
    } catch {
      return false;
    }
  },
};
