import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { jarvisAgentRegistry } from "@/lib/jarvis/agent-registry";
import { discoverCapabilities } from "@/lib/jarvis/capability-discovery";

export const dynamic = "force-dynamic";

export default async function JarvisControlCenterPage() {
  const agents = jarvisAgentRegistry.listEnabled();
  const capabilities = await discoverCapabilities();

  return (
    <main className="min-h-screen p-6 md:p-10 bg-background text-foreground">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">JARVIS Network Control Center</h1>
        <p className="text-muted-foreground mt-2">
          Multi-agent orchestration, release gates, and live run status.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{capabilities.summary.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {capabilities.summary.available} available
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {Object.entries(capabilities.summary.bySource)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" • ")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {Object.entries(capabilities.summary.byCategory)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" • ")}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Start a Run</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action="/api/jarvis/network"
              method="POST"
              className="flex flex-col gap-4"
            >
              <Input
                name="goal"
                placeholder="Describe the goal for the agent network..."
                required
              />
              <Input
                name="constraints"
                placeholder="Constraints (optional, comma-separated)"
              />
              <div className="flex gap-3">
                <Button type="submit">Run (dry-run)</Button>
                <Button type="submit" variant="outline" name="mode" value="fast">
                  Fast
                </Button>
                <Button type="submit" variant="outline" name="mode" value="thorough">
                  Thorough
                </Button>
              </div>
              <input type="hidden" name="dryRun" value="true" />
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <a href="/api/jarvis/network/agents">GET /agents</a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/api/jarvis/orchestrate">Legacy /orchestrate</a>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {agent.name}
                <Badge variant="secondary">{agent.role}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{agent.mission}</p>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 6).map((cap) => (
                  <Badge key={cap} variant="outline" className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
