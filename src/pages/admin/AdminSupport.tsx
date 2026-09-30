import { useState, useEffect } from "react";
import { Ticket, CheckCircle, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import {
  listAdminSupportTickets,
  updateAdminSupportTicket,
  type AdminSupportTicketRow,
} from "@/lib/admin/api";

function statusLabel(status: string): string {
  if (status === "done") return "Done";
  if (status === "reviewed") return "Reviewed";
  if (status === "open") return "Open";
  return status;
}

function statusVariant(status: string): "destructive" | "default" | "secondary" {
  if (status === "open") return "destructive";
  if (status === "done") return "default";
  if (status === "reviewed") return "secondary";
  return "secondary";
}

const AdminSupport = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<AdminSupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminSupportTicketRow | null>(null);
  const [markingDone, setMarkingDone] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const rows = await listAdminSupportTickets();
      setTickets(rows);
    } catch {
      toast({ title: "Could not load tickets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleViewDetails = async (ticket: AdminSupportTicketRow) => {
    setSelected(ticket);
    if (ticket.status !== "open") return;
    try {
      await updateAdminSupportTicket(ticket.id, "reviewed");
      await refresh();
      setSelected((prev) => (prev?.id === ticket.id ? { ...prev, status: "reviewed" } : prev));
    } catch {
      toast({ title: "Could not mark ticket as reviewed", variant: "destructive" });
    }
  };

  const handleMarkDone = async (id: string) => {
    setMarkingDone(id);
    try {
      await updateAdminSupportTicket(id, "done");
      await refresh();
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status: "done" } : null));
      }
      toast({
        title: "Ticket marked as done",
        description: "Seen and processed — follow up with the user via email.",
      });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setMarkingDone(null);
    }
  };

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Support</h1>
            <p className="text-sm text-muted-foreground">
              {openCount} open ticket{openCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <Alert>
          <AlertDescription>
            Reply to users via email outside Reliyo. Marking a ticket as Done means it has been
            seen and processed — no further in-platform workflow is required.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4 text-primary" /> Support Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && tickets.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading tickets…</p>
            ) : tickets.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No support tickets yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.id}</TableCell>
                        <TableCell className="text-sm">{t.name}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-sm" title={t.subject}>
                          {t.subject}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(t.status)}>{statusLabel(t.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleViewDetails(t)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(t.status === "open" || t.status === "reviewed") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={markingDone === t.id}
                                onClick={() => void handleMarkDone(t.id)}
                                title="Mark as done"
                              >
                                <CheckCircle className="h-4 w-4 text-success" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">{selected.id}</DialogTitle>
                <DialogDescription>
                  Submitted{" "}
                  {new Date(selected.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">User</p>
                  <p className="font-medium">{selected.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Email</p>
                  <p>{selected.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Phone</p>
                  <p>{selected.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Subject</p>
                  <p>{selected.subject}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Issue</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{selected.issue}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
                  <Badge variant={statusVariant(selected.status)} className="mt-1">
                    {statusLabel(selected.status)}
                  </Badge>
                </div>
              </div>
              {(selected.status === "open" || selected.status === "reviewed") && (
                <Button
                  className="w-full gap-2"
                  disabled={markingDone === selected.id}
                  onClick={() => void handleMarkDone(selected.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark as Done
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSupport;
