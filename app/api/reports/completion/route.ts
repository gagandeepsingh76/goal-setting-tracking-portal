import { handleApiError, jsonOk, requireUser } from "@/lib/api";
import { getCompletionReport } from "@/lib/completion-report";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser(["MANAGER", "ADMIN"]);
    return jsonOk(await getCompletionReport(user));
  } catch (error) {
    return handleApiError(error);
  }
}
