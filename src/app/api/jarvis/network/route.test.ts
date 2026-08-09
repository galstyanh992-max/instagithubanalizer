import { describe, expect, it } from "vitest";
import { parseNetworkRequest } from "./route";

describe("parseNetworkRequest", () => {
  it("accepts the control-center form payload", async () => {
    const request = new Request("http://localhost/api/jarvis/network", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        goal: "verify run",
        constraints: "safe, local only",
        mode: "fast",
        dryRun: "true",
      }),
    });
    await expect(parseNetworkRequest(request)).resolves.toEqual({
      goal: "verify run",
      constraints: ["safe", "local only"],
      mode: "fast",
      dryRun: true,
    });
  });

  it("accepts the JSON API contract", async () => {
    const body = { goal: "verify API", constraints: [], mode: "balanced", dryRun: true };
    const request = new Request("http://localhost/api/jarvis/network", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    await expect(parseNetworkRequest(request)).resolves.toEqual(body);
  });
});
