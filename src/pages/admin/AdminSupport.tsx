import { useState, useEffect } from "react";
import { Ticket, CheckCircle, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import {
  listAdminSupportTickets,
  updateAdminSupportTicket,
  type AdminSupportTicketRow,
} from "@/lib/admin/api";

const AdminSupport = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<AdminSupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleAction = async (id: string, status: "reviewed" | "deleted") => {
    try {
      await updateAdminSupportTicket(id, status);
      await refresh();
      toast({ title: `Ticket ${status === "reviewed" ? "marked as reviewed" : "deleted"}` });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
            <p className="text-sm text-muted-foreground">{openCount} open ticket{openCount !== 1 ? "s" : ""}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4 text-primary" /> All Tickets
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
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.id}</TableCell>
                        <TableCell className="text-sm">{t.name}</TableCell>
                        <TableCell className="text-sm">{t.email}</TableCell>
                        <TableCell className="text-sm">{t.phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm" title={t.issue}>{t.issue}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "open" ? "destructive" : t.status === "reviewed" ? "default" : "secondary"}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {t.status === "open" && (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => void handleAction(t.id, "reviewed")} title="Mark Reviewed">
                                <CheckCircle className="h-4 w-4 text-success" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => void handleAction(t.id, "deleted")} title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
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
    </AdminLayout>
  );
};

export default AdminSupport;
