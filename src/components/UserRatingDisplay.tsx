import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UserRatingDisplayProps {
  averageRating?: number | null;
  ratingCount?: number;
  size?: "sm" | "md";
  className?: string;
  showEmpty?: boolean;
}

export function formatRatingAverage(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

/** Star rating from stored acceptor averages (requestor-submitted on task close). */
export function UserRatingDisplay({
  averageRating,
  ratingCount = 0,
  size = "sm",
  className,
  showEmpty = true,
}: UserRatingDisplayProps) {
  const starClass = size === "md" ? "h-4 w-4" : "h-3 w-3";
  const textClass = size === "md" ? "text-sm" : "text-xs";

  if (ratingCount <= 0 || averageRating == null) {
    if (!showEmpty) return null;
    return (
      <span className={cn(textClass, "text-muted-foreground", className)}>
        No ratings yet
      </span>
    );
  }

  const roundedStars = Math.round(averageRating);

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            starClass,
            i <= roundedStars
              ? "fill-primary text-primary"
              : "text-muted-foreground/40",
          )}
        />
      ))}
      <span className={cn("ml-1 text-muted-foreground", textClass)}>
        {formatRatingAverage(averageRating)} ({ratingCount})
      </span>
    </div>
  );
}
