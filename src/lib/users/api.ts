import { apiClient } from "@/lib/api/client";

export interface UserRatingStats {
  averageRating: number | null;
  ratingCount: number;
}

export function fetchUserRating(userId: string) {
  return apiClient.get<UserRatingStats>(`/users/${userId}/rating`);
}
