import { Badge } from "@/components/ui/badge";
import { roundScore } from "@/lib/utils";

export function ScoreDisplay({ score }: { score?: number | null }) {
  if (score == null) return <Badge variant="outline">N/A</Badge>;
  if (score >= 0.8) return <Badge variant="success">{roundScore(score)}</Badge>;
  if (score >= 0.5) return <Badge variant="warning">{roundScore(score)}</Badge>;
  return <Badge variant="danger">{roundScore(score)}</Badge>;
}
