import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import AdminLayout from "@/components/AdminLayout";
import { Search, Flag, Ban, AlertTriangle } from "lucide-react";
import { getAllPlatformUsers, getAllPlatformTasks, getSuspendedUsers, suspendUserWithPhone, type PlatformUser } from "@/lib/adminData";
import { toast } from "@/hooks/use-toast";
import { TEST_CREDENTIALS } from "@/lib/auth";

const ACTIVE_STATUSES = ["committed", "in_progress", "done", "disputed"];

function getUserOnboardDate(name: string): string {
  try {
    const tasks = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]");
    const accepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]");
    const all = [...tasks, ...accepted];
    const dates = all
      .filter((t: any) => t.createdBy === name || t.acceptedBy === name)
      .map((t: any) => t.createdAt)
      .filter(Boolean)
      .sort();
    return dates.length > 0 ? new Date(dates[0]).toLocaleDateString() : "—";
  } catch {
    return "—";
  }
}

function getLastActivityDate(name: string): string {
  try {
    const tasks = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]");
    const accepted = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]");
    const all = [...tasks, ...accepted];
    const dates = all
      .filter((t: any) => t.createdBy === name || t.acceptedBy === name)
      .map((t: any) => t.createdAt)
      .filter(Boolean)
      .sort()
      .reverse();
    if (dates.length === 0) return "—";
    const lastDate = new Date(dates[0]);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince === 0) return "Today";
    if (daysSince === 1) return "1 day ago";
    return `${daysSince} days ago`;
  } catch {
    return "—";
  }
}

function hasActiveTasks(name: string): boolean {
  const tasks = getAllPlatformTasks();
  return tasks.some(t =>
    (t.createdBy === name || t.acceptedBy === name) &&
    ACTIVE_STATUSES.includes(t.status)
  );
}

function getUserPhone(userId: string): string | undefined {
  const cred = TEST_CREDENTIALS.find(c => c.user.id === userId);
  return cred?.phone;
}

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState(() => getAllPlatformUsers());
  const [suspendDialog, setSuspendDialog] = useState<PlatformUser | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendedMap, setSuspendedMap] = useState(getSuspendedUsers);

  useEffect(() => {
    const interval = setInterval(() => {
      setUsers(getAllPlatformUsers());
      setSuspendedMap(getSuspendedUsers());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = users.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSuspend = () => {
    if (!suspendDialog || !suspendReason.trim()) return;

    const activeCheck = hasActiveTasks(suspendDialog.name);
    if (activeCheck) {
      toast({
        title: "Cannot Suspend",
        description: "This user has active tasks (Committed, In Progress, Done, or Disputed). Resolve those first.",
        variant: "destructive",
      });
      return;
    }

    const phone = getUserPhone(suspendDialog.id);
    suspendUserWithPhone(suspendDialog.id, suspendReason.trim(), phone);
    setSuspendedMap(getSuspendedUsers());

    // Send termination notification (simulated email)
    const terminationNotif = {
      id: `notif-suspend-${Date.now()}`,
      type: "admin_abuse_flag" as const,
      title: "Account Terminated",
      message: `Your account has been suspended due to policy violation: "${suspendReason.trim()}". You will no longer be able to access the platform. If you believe this is an error, contact support.`,
      target: "requestor" as const,
      priority: "critical" as const,
      taskId: "",
      taskTitle: "",
      createdAt: new Date().toISOString(),
      read: false,
      userId: suspendDialog.id,
      userName: suspendDialog.name,
    };
    try {
      const existing = JSON.parse(localStorage.getItem("reliyo_notifications") || "[]");
      existing.push(terminationNotif);
      localStorage.setItem("reliyo_notifications", JSON.stringify(existing));
    } catch {}

    setSuspendDialog(null);
    setSuspendReason("");
    toast({ title: "User Suspended", description: `${suspendDialog.name} has been suspended. A termination notification has been sent.` });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">Live platform users derived from task activity</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs text-center">Tasks Created</TableHead>
              <TableHead className="text-xs text-center">Tasks Accepted</TableHead>
              <TableHead className="text-xs text-center">Onboarded On</TableHead>
              <TableHead className="text-xs text-center">Inactivity Tracker</TableHead>
              <TableHead className="text-xs text-center">Status</TableHead>
              <TableHead className="text-xs w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
            ) : filtered.map((u) => {
              const isSuspended = !!suspendedMap[u.id];
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                          {u.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {u.name}
                          {u.flagged && <Flag className="h-3 w-3 text-destructive" />}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">{u.tasksCreated}</TableCell>
                  <TableCell className="text-center text-sm">{u.tasksAccepted}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">{getUserOnboardDate(u.name)}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">{getLastActivityDate(u.name)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={isSuspended
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20"
                    } variant="outline">
                      {isSuspended ? "suspended" : "active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!isSuspended && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={() => { setSuspendDialog(u); setSuspendReason(""); }}
                      >
                        <Ban className="h-3 w-3" /> Suspend
                      </Button>
                    )}
                    {isSuspended && (
                      <span className="text-[10px] text-muted-foreground">{suspendedMap[u.id]?.reason?.slice(0, 30)}...</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Suspend User
            </DialogTitle>
            <DialogDescription>
              Suspend {suspendDialog?.name}. They will not be able to log in again using the same phone number or create/accept any tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {hasActiveTasks(suspendDialog?.name || "") && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This user has active tasks. Suspension is blocked until those tasks are resolved.
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Reason <span className="text-destructive">*</span></p>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter the reason for suspension (mandatory)..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSuspendDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!suspendReason.trim() || hasActiveTasks(suspendDialog?.name || "")}
              onClick={handleSuspend}
            >
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
