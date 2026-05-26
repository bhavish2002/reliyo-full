import { useState, useEffect, useCallback } from "react";
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
import { Search, Ban, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ApiClientError } from "@/lib/api/client";
import {
  listAdminUsers,
  setUserSuspension,
  type AdminUserRow,
} from "@/lib/admin/api";
import { format, formatDistanceToNow } from "date-fns";

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspendDialog, setSuspendDialog] = useState<AdminUserRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAdminUsers();
      setUsers(rows);
    } catch (err) {
      toast({
        title: "Failed to load users",
        description: err instanceof ApiClientError ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q)
    );
  });

  const handleSuspend = async () => {
    if (!suspendDialog || !suspendReason.trim()) return;
    try {
      await setUserSuspension(suspendDialog.id, true, suspendReason.trim());
      setSuspendDialog(null);
      setSuspendReason("");
      await loadUsers();
      toast({
        title: "User suspended",
        description: `${suspendDialog.name} can no longer access the platform.`,
      });
    } catch (err) {
      toast({
        title: "Suspension failed",
        description: err instanceof ApiClientError ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">Platform users from the database</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.email || `+${u.phone}`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">{u.tasksCreated}</TableCell>
                  <TableCell className="text-center text-sm">{u.tasksAccepted}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {format(new Date(u.onboardedOn), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(u.onboardedOn), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        u.suspended
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20"
                      }
                      variant="outline"
                    >
                      {u.suspended ? "suspended" : "active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!u.suspended && u.platformRole !== "admin" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={() => {
                          setSuspendDialog(u);
                          setSuspendReason("");
                        }}
                      >
                        <Ban className="h-3 w-3" /> Suspend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Suspend User
            </DialogTitle>
            <DialogDescription>
              Suspend {suspendDialog?.name}. They will not be able to use the platform until
              reinstated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                Reason <span className="text-destructive">*</span>
              </p>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter the reason for suspension (mandatory)..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSuspendDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!suspendReason.trim()}
              onClick={() => void handleSuspend()}
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
