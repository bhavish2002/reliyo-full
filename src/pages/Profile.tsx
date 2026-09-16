import { useState, useEffect, useCallback } from "react";
import {
  Phone, Mail, MapPin, Edit2, Save, X, Shield, Settings, User,
  Bell, MessageSquare, TrendingUp, Palette, Globe, Loader2, AlertCircle, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { patchMe } from "@/lib/auth/api";
import {
  applyTheme,
  formatDisplayPhone,
  formatMemberSince,
  getUserSettings,
  setUserSettingsCache,
  type UserSettings,
} from "@/lib/userSettings";
import { toast } from "@/hooks/use-toast";
import { ApiClientError } from "@/lib/api/client";
import { UserRatingDisplay } from "@/components/UserRatingDisplay";
import { useUserRating } from "@/hooks/useUserRating";

interface ProfileDraft {
  email: string;
  location: string;
  bio: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SettingRow = ({
  icon: Icon, label, description, checked, onToggle, disabled,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} />
  </div>
);

const Profile = () => {
  const { user, isLoading: authLoading, refreshProfile } = useAuth();
  const myRating = useUserRating(user?.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>({ email: "", location: "", bio: "" });
  const [settings, setSettings] = useState<UserSettings>(() =>
    getUserSettings(user?.id ?? "guest", user?.preferences),
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefKey, setSavingPrefKey] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});

  useEffect(() => {
    if (!user) return;
    setSettings(getUserSettings(user.id, user.preferences));
    setDraft({
      email: user.email ?? "",
      location: user.location ?? "",
      bio: user.bio ?? "",
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void refreshProfile();
  }, [user?.id, refreshProfile]);

  useEffect(() => {
    applyTheme(settings.darkMode);
  }, [settings.darkMode]);

  useEffect(() => {
    if (settings.darkMode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [settings.darkMode]);

  const persistPreferences = useCallback(
    async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      if (!user) return;
      setSavingPrefKey(key);
      const optimistic = { ...settings, [key]: value };
      setSettings(optimistic);
      setUserSettingsCache(user.id, optimistic);
      if (key === "darkMode") applyTheme(value as UserSettings["darkMode"]);

      try {
        const updated = await patchMe({ preferences: { [key]: value } });
        const merged = getUserSettings(user.id, updated.preferences);
        setSettings(merged);
        setUserSettingsCache(user.id, merged);
        await refreshProfile();
        toast({
          title: "Setting updated",
          description: "Your preference has been saved.",
        });
      } catch (err) {
        setSettings(settings);
        setUserSettingsCache(user.id, settings);
        if (key === "darkMode") applyTheme(settings.darkMode);
        const message =
          err instanceof ApiClientError ? err.message : "Could not save preference.";
        toast({ title: "Save failed", description: message, variant: "destructive" });
      } finally {
        setSavingPrefKey(null);
      }
    },
    [user, settings, refreshProfile],
  );

  const startEdit = () => {
    if (!user) return;
    setDraft({
      email: user.email ?? "",
      location: user.location ?? "",
      bio: user.bio ?? "",
    });
    setFieldErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    setFieldErrors({});
    setEditing(false);
  };

  const validateDraft = (): boolean => {
    const errors: Partial<Record<keyof ProfileDraft, string>> = {};
    const email = draft.email.trim();
    if (email && !EMAIL_RE.test(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (draft.location.length > 200) {
      errors.location = "Location must be 200 characters or fewer.";
    }
    if (draft.bio.length > 2000) {
      errors.bio = "Bio must be 2000 characters or fewer.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveEdit = async () => {
    if (!user || !validateDraft()) return;
    setSavingProfile(true);
    try {
      await patchMe({
        email: draft.email.trim() || undefined,
        location: draft.location.trim(),
        bio: draft.bio.trim(),
      });
      await refreshProfile();
      setEditing(false);
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Could not save profile.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading profile…
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Sign in to view your profile.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const displayName = user.name ?? "User";
  const displayPhone = formatDisplayPhone(user.phone);
  const memberSince = formatMemberSince(user.createdAt);
  const prefsDisabled = savingPrefKey != null;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        {!editing ? (
          <Button variant="outline" size="sm" className="gap-2" onClick={startEdit}>
            <Edit2 className="h-4 w-4" /> Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={savingProfile}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" className="gap-2" onClick={saveEdit} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        )}
      </div>

      <Card className="rounded-xl mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Your Rating
          </h3>
          <UserRatingDisplay
            averageRating={myRating.averageRating ?? user.averageRating}
            ratingCount={myRating.ratingCount || user.ratingCount}
            size="md"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Average from requestors on tasks you completed as acceptor. Updates when you are rated on a closed task.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-xl mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">{displayPhone}</p>
                    {editing && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">Cannot be changed</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="w-full">
                    <p className="text-xs text-muted-foreground">Email</p>
                    {editing ? (
                      <>
                        <Input
                          className="h-8 text-sm mt-0.5"
                          value={draft.email}
                          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                        />
                        {fieldErrors.email && (
                          <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{user.email || "—"}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="w-full">
                    <p className="text-xs text-muted-foreground">Location</p>
                    {editing ? (
                      <>
                        <Input
                          className="h-8 text-sm mt-0.5"
                          value={draft.location}
                          onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                        />
                        {fieldErrors.location && (
                          <p className="text-xs text-destructive mt-1">{fieldErrors.location}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{user.location || "—"}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <User className="h-4 w-4" /> About
            </h3>
            {editing ? (
              <>
                <Textarea
                  className="min-h-[100px]"
                  value={draft.bio}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                />
                {fieldErrors.bio && (
                  <p className="text-xs text-destructive mt-1">{fieldErrors.bio}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {user.bio || "No bio yet."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Account Info
            </h3>
            <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
              <Settings className="h-4 w-4" /> Settings
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Preferences are saved to your account and sync across devices.
            </p>

            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-2">
              Notifications
            </p>
            <SettingRow
              icon={Mail}
              label="Email Notifications"
              description="Receive email alerts for task updates, status changes, and deadlines"
              checked={settings.emailNotifications}
              onToggle={(v) => void persistPreferences("emailNotifications", v)}
              disabled={prefsDisabled}
            />
            <SettingRow
              icon={MessageSquare}
              label="Task Update Alerts"
              description="Receive in-app alerts when tasks you created or accepted change status"
              checked={settings.taskUpdateAlerts}
              onToggle={(v) => void persistPreferences("taskUpdateAlerts", v)}
              disabled={prefsDisabled}
            />
            <SettingRow
              icon={TrendingUp}
              label="Marketing Emails"
              description="Receive tips, promotions, and platform announcements"
              checked={settings.marketingEmails}
              onToggle={(v) => void persistPreferences("marketingEmails", v)}
              disabled={prefsDisabled}
            />

            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-6">
              Preferences
            </p>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-start gap-3">
                <Palette className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground">Light, dark, or match your system</p>
                </div>
              </div>
              <Select
                value={settings.darkMode}
                onValueChange={(v) =>
                  void persistPreferences("darkMode", v as UserSettings["darkMode"])
                }
                disabled={prefsDisabled}
              >
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Default Currency</p>
                  <p className="text-xs text-muted-foreground">
                    Dashboard amounts convert to this currency using fixed rates
                  </p>
                </div>
              </div>
              <Select
                value={settings.preferredCurrency}
                onValueChange={(v) => void persistPreferences("preferredCurrency", v)}
                disabled={prefsDisabled}
              >
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="GBP">£ GBP</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                  <SelectItem value="AUD">A$ AUD</SelectItem>
                  <SelectItem value="CAD">C$ CAD</SelectItem>
                  <SelectItem value="JPY">¥ JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
