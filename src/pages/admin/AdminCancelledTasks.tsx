import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AdminLayout from "@/components/AdminLayout";
import { listAdminCancelledTasks } from "@/lib/admin/api";
import { ApiClientError } from "@/lib/api/client";

const AdminCancelledTasks = () => {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listAdminCancelledTasks>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setRows(await listAdminCancelledTasks());
        setError(null);
      } catch (err) {
        setRows([]);
        setError(err instanceof ApiClientError ? err.message : "Failed to load cancelled tasks.");
      }
    })();
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Cancelled Tasks</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Archival view of requestor-cancelled open tasks (DR-006 retention).
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Requestor</TableHead>
                <TableHead>Cancelled</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No cancelled tasks recorded.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.taskId}>
                    <TableCell className="font-mono text-xs">{r.taskDisplayId}</TableCell>
                    <TableCell className="text-sm">{r.title}</TableCell>
                    <TableCell className="text-sm">{r.requestor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.cancelledAt ? new Date(r.cancelledAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {r.cancelReason ?? "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminCancelledTasks;
