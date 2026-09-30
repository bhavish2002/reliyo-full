export type UserRole = "requestor" | "acceptor" | "admin";

export interface UserPreferences {
  emailNotifications: boolean;
  taskUpdateAlerts: boolean;
  marketingEmails: boolean;
  preferredCurrency: string;
  darkMode: "system" | "light" | "dark";
}

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  role: UserRole;
  suspended: boolean;
  bio?: string | null;
  location?: string | null;
  createdAt?: string;
  preferences?: UserPreferences;
  /** Average rating received as acceptor (from closed tasks). */
  averageRating?: number | null;
  ratingCount?: number;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export type PatchMePayload = {
  name?: string;
  email?: string;
  bio?: string;
  location?: string;
  preferences?: Partial<UserPreferences>;
};
