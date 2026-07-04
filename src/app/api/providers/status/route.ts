import { NextResponse } from "next/server";
import { aiProviderRouter } from "@/services/ai-provider-router.service";

export async function GET() {
  const status = aiProviderRouter.getStatus();
  return NextResponse.json(status);
}
