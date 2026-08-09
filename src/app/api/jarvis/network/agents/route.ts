import { NextResponse } from "next/server";
import { jarvisAgentRegistry } from "@/lib/jarvis/agent-registry";
import { discoverCapabilities } from "@/lib/jarvis/capability-discovery";

export const runtime = "nodejs";

/**
 * GET /api/jarvis/network/agents
 * Returns all registered JARVIS network agents and available capabilities.
 */
export async function GET() {
  try {
    const agents = jarvisAgentRegistry.listEnabled();
    const capabilities = await discoverCapabilities();

    return NextResponse.json({
      agents,
      capabilitySummary: capabilities.summary,
    });
  } catch (error) {
    console.error("[api/jarvis/network/agents] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
