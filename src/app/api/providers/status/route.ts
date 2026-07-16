import { NextResponse } from "next/server";
import { aiProviderRouter } from "@/services/ai-provider-router.service";
import { initProviders } from "@/lib/ai-provider/server";

export async function GET() {
  await initProviders();
  const status = aiProviderRouter.getStatus();
  return NextResponse.json(status);
}
