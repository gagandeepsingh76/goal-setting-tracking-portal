import { handleApiError, jsonOk, requireUser } from "@/lib/api";
import { runEscalationCheck } from "@/lib/escalation";

export async function POST() {
  try {
    const user = await requireUser(["ADMIN"]);
    const result = await runEscalationCheck(user.id);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
