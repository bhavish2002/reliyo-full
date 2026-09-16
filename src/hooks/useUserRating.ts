import { useEffect, useState } from "react";
import { fetchUserRating, type UserRatingStats } from "@/lib/users/api";
import { useTasksListRefresh } from "@/hooks/useTasksListRefresh";

const EMPTY: UserRatingStats = { averageRating: null, ratingCount: 0 };

/** Fetch live user rating stats; refreshes when tasks change. */
export function useUserRating(userId: string | undefined | null) {
  const refreshKey = useTasksListRefresh();
  const [stats, setStats] = useState<UserRatingStats>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setStats(EMPTY);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchUserRating(userId)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  return { ...stats, loading };
}
