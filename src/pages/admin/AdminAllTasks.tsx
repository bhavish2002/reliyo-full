import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AdminLayout from "@/components/AdminLayout";
import AdminTaskDetailDialog from "@/components/AdminTaskDetailDialog";
import { Search, Eye } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, TASK_STATUSES, type TaskStatus, type Task } from "@/lib/taskTypes";
import { getAllPlatformTasks } from "@/lib/adminData";

// Filter out "completed" from dropdown (deprecated)
const DROPDOWN_STATUSES = TASK_STATUSES.filter(s => s !== "completed");

const AdminAllTasks = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tasks, setTasks] = useState(() => getAllPlatformTasks());
  const [viewTask, setViewTask] = useState<Task | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTasks(getAllPlatformTasks()), 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.taskId || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">All Tasks</h1>
        <p className="text-sm text-muted-foreground">Live view of all platform tasks</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by title or Task ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {DROPDOWN_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Task ID</TableHead>
              <TableHead className="text-xs">Title</TableHead>
              <TableHead className="text-xs">Requestor</TableHead>
              <TableHead className="text-xs">Acceptor</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Reward</TableHead>
              <TableHead className="text-xs">Created</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tasks found</TableCell></TableRow>
            ) : filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{t.taskId || t.id}</TableCell>
                <TableCell className="text-sm font-medium max-w-[200px] truncate">{t.title}</TableCell>
                <TableCell className="text-sm">{t.createdBy || "—"}</TableCell>
                <TableCell className="text-sm">{t.acceptedBy || "—"}</TableCell>
                <TableCell>
                  <Badge className={`${STATUS_COLORS[t.status as TaskStatus]} text-[10px]`}>{STATUS_LABELS[t.status as TaskStatus]}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold">{t.currencySymbol || "₹"}{t.reward.toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewTask(t)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-4 text-sm text-muted-foreground">
        Showing {filtered.length} of {tasks.length} tasks
      </div>

      <AdminTaskDetailDialog task={viewTask} open={!!viewTask} onOpenChange={() => setViewTask(null)} />
    </AdminLayout>
  );
};

export default AdminAllTasks;
