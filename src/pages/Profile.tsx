import { useState } from "react";
import {
  Phone, Mail, MapPin, Star, Edit2, Camera, Save, X, Shield, Settings, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";

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

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i <= Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
      />
    ))}
    <span className="ml-1.5 text-sm text-muted-foreground">{rating} ({DEFAULT_PROFILE.reviewCount})</span>
  </div>
);

const Profile = () => {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_PROFILE);

  const startEdit = () => {
    setDraft({ ...profile });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    // Name and phone can't be changed
    setProfile({
      ...draft,
      name: profile.name,
      phone: profile.phone,
    });
    setEditing(false);
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
            {/* Avatar */}
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
              <div className="mt-1">
                <StarRating rating={profile.rating} />
              </div>

              {/* Contact details */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">{profile.phone}</p>
                    {editing && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">Cannot be changed</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    {editing ? (
                      <Input
                        className="h-8 text-sm mt-0.5"
                        value={draft.email}
                        onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                      />
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
                      <Input
                        className="h-8 text-sm mt-0.5"
                        value={draft.location}
                        onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                      />
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
              <Textarea
                className="min-h-[100px]"
                value={draft.bio}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              />
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
              <div className="rounded-lg bg-success/10 p-3 text-center">
                <p className="text-2xl font-bold text-success">{profile.reliability}%</p>
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

        {/* Settings */}
        <Card className="rounded-xl lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" /> Settings
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive email alerts for task updates</p>
                </div>
                <Badge variant="secondary">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Badge variant="outline">Disabled</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Public Profile</p>
                  <p className="text-xs text-muted-foreground">Make your profile visible to other users</p>
                </div>
                <Badge variant="secondary">Enabled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
