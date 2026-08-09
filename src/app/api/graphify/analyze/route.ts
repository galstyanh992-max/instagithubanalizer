import { ok, err, safe } from "@/lib/api";
import { graphifyService } from "@/services/graphify.service";

export const POST = safe(async () => {
  try {
    const result = await graphifyService.analyzeProject();
    return ok({ message: "Graphify analysis completed", stdout: result.stdout, stderr: result.stderr });
  } catch (e: any) {
    return err(e.message, 500);
  }
});
