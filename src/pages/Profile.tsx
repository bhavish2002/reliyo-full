import { useState, useEffect } from "react";
import {
  Phone, Mail, MapPin, Star, Edit2, Camera, Save, X, Shield, Settings, User,
  Bell, MessageSquare, TrendingUp, Palette, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { getCurrentUser } from "@/lib/auth";
import { getUserSettings, updateUserSetting, applyTheme, type UserSettings } from "@/lib/userSettings";
import { toast } from "@/hooks/use-toast";

interface ProfileData {
  name: string;
  phone: string;
  email: string;
  location: string;
  bio: string;
  rating: number;
  reviewCount: number;
  reliability: number;
  tasksCompleted: number;
  tasksCreated: number;
  memberSince: string;
}

const DEFAULT_PROFILE: ProfileData = {
  name: "Arjun Mehta",
  phone: "+91 98765 43210",
  email: "arjun@example.com",
  location: "Bengaluru",
  bio: "Experienced freelancer specializing in technology and design tasks. Available for both virtual and physical work across major Indian cities.",
  rating: 4.7,
  reviewCount: 73,
  reliability: 94,
  tasksCompleted: 23,
  tasksCreated: 12,
  memberSince: "Jan 2025",
};

const StarRating = ({ rating, reviewCount }: { rating: number; reviewCount: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i <= Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
      />
    ))}
    <span className="ml-1.5 text-sm text-muted-foreground">{rating} ({reviewCount})</span>
  </div>
);

const SettingRow = ({
  icon: Icon, label, description, checked, onToggle,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onToggle} />
  </div>
);

const Profile = () => {
  const currentUser = getCurrentUser();
  const userId = currentUser?.id || "guest";

  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<UserSettings>(() => getUserSettings(userId));

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(settings.darkMode);
  }, [settings.darkMode]);

  // Listen for system theme changes when mode is "system"
  useEffect(() => {
    if (settings.darkMode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [settings.darkMode]);

  useEffect(() => {
    setSettings(getUserSettings(userId));
  }, [userId]);

  const toggleSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = updateUserSetting(userId, key, value);
    setSettings(updated);

    const friendlyName: Record<string, string> = {
      emailNotifications: "Email Notifications",
      taskUpdateAlerts: "Task Update Alerts",
      marketingEmails: "Marketing Emails",
      darkMode: "Theme",
      preferredCurrency: "Default Currency",
    };

    toast({
      title: "Setting updated",
      description: `${friendlyName[key] || key} has been ${typeof value === "boolean" ? (value ? "enabled" : "disabled") : "updated"}.`,
    });
  };

  const startEdit = () => { setDraft({ ...profile }); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const saveEdit = () => {
    setProfile({ ...draft, name: profile.name, phone: profile.phone });
    setEditing(false);
    toast({ title: "Profile saved", description: "Your profile has been updated." });
  };

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
            <Button variant="ghost" size="sm" onClick={cancelEdit}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" className="gap-2" onClick={saveEdit}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        )}
      </div>

      {/* Main profile card */}
      <Card className="rounded-xl mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative group">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                  {profile.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {editing && (
                <button className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-background" />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
              <div className="mt-1"><StarRating rating={profile.rating} reviewCount={profile.reviewCount} /></div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">{profile.phone}</p>
                    {editing && <p className="text-xs text-muted-foreground italic mt-0.5">Cannot be changed</p>}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    {editing ? (
                      <Input className="h-8 text-sm mt-0.5" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                    ) : (
                      <p className="text-sm font-medium text-foreground">{profile.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    {editing ? (
                      <Input className="h-8 text-sm mt-0.5" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
                    ) : (
                      <p className="text-sm font-medium text-foreground">{profile.location}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bio */}
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <User className="h-4 w-4" /> About
            </h3>
            {editing ? (
              <Textarea className="min-h-[100px]" value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Reliability & Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-[hsl(var(--success))]/10 p-3 text-center">
                <p className="text-2xl font-bold text-[hsl(var(--success))]">{profile.reliability}%</p>
                <p className="text-xs text-muted-foreground">Reliability Score</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{profile.rating}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{profile.tasksCompleted}</p>
                <p className="text-xs text-muted-foreground">Tasks Completed</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{profile.tasksCreated}</p>
                <p className="text-xs text-muted-foreground">Tasks Created</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Member since {profile.memberSince}</p>
          </CardContent>
        </Card>

        {/* ── Settings ────────────────────────────────────────────────────── */}
        <Card className="rounded-xl lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
              <Settings className="h-4 w-4" /> Settings
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Manage your notifications, appearance, and preferences.</p>

            {/* Notifications group */}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-2">Notifications</p>
            <SettingRow
              icon={Mail}
              label="Email Notifications"
              description="Receive email alerts for task updates, status changes, and deadlines"
              checked={settings.emailNotifications}
              onToggle={(v) => toggleSetting("emailNotifications", v)}
            />
            <SettingRow
              icon={MessageSquare}
              label="Task Update Alerts"
              description="Receive in-app alerts when tasks you created or accepted change status"
              checked={settings.taskUpdateAlerts}
              onToggle={(v) => toggleSetting("taskUpdateAlerts", v)}
            />
            <SettingRow
              icon={TrendingUp}
              label="Marketing Emails"
              description="Receive tips, promotions, and platform announcements (not critical system emails)"
              checked={settings.marketingEmails}
              onToggle={(v) => toggleSetting("marketingEmails", v)}
            />

            {/* Preferences group */}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-6">Preferences</p>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-start gap-3">
                <Palette className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground">Choose your preferred appearance — applies instantly</p>
                </div>
              </div>
              <Select value={settings.darkMode} onValueChange={(v) => toggleSetting("darkMode", v as UserSettings["darkMode"])}>
                <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
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
                  <p className="text-xs text-muted-foreground">Pre-selected when creating new tasks</p>
                </div>
              </div>
              <Select value={settings.preferredCurrency} onValueChange={(v) => toggleSetting("preferredCurrency", v)}>
                <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
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
