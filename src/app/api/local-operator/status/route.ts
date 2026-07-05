import { ok, safe } from "@/lib/api";
import { getAllowedWorkspace } from "@/lib/local-operator/workspace-policy";
import { getLocalToolBridgePlan } from "@/lib/local-operator/tool-bridge";

export const runtime = "nodejs";

export const GET = safe(async () => {
  const workspace = getAllowedWorkspace();
  return ok({
    status: workspace ? "configured" : "local_agent_required",
    workspace: workspace ? { id: workspace.id, rootPath: workspace.rootPath } : null,
    bridges: [getLocalToolBridgePlan("mcp"), getLocalToolBridgePlan("desktop_commander")],
  });
});
