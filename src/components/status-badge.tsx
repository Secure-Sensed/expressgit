import { Badge } from "@/components/ui/badge";
import { formatStatusLabel, statusTone } from "@/lib/utils";

export function StatusBadge({ status, className = "" }: { status?: string | null; className?: string }) {
  const tone = statusTone(status);
  return (
    <Badge
      className={className}
      variant={
        tone === "success" ? "success" : tone === "danger" ? "danger" : tone === "accent" ? "accent" : tone === "muted" ? "muted" : "default"
      }
    >
      {formatStatusLabel(status)}
    </Badge>
  );
}
