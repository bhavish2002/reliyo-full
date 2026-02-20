import { useState } from "react";
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
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, TASK_STATUSES, type TaskStatus } from "@/lib/taskTypes";

const DEMO_TASKS = [
  { id: "RLY-TSK-2026-D8K3M7", title: "Deliver documents to Koramangala", requestor: "Ravi Kumar", acceptor: "Amit T.", status: "open" as TaskStatus, reward: 500, created: "2026-02-10" },
  { id: "RLY-TSK-2026-L4P9N2", title: "Design a logo for bakery startup", requestor: "Priya Sharma", acceptor: "Rohan J.", status: "in_progress" as TaskStatus, reward: 2000, created: "2026-02-08" },
  { id: "RLY-TSK-2026-T7R2X5", title: "Translate brochure to Tamil", requestor: "Sanjay Patel", acceptor: "Sneha P.", status: "done" as TaskStatus, reward: 1500, created: "2026-02-05" },
  { id: "RLY-TSK-2026-B5W8Q3", title: "Build landing page for SaaS", requestor: "Meera Joshi", acceptor: "Arjun M.", status: "disputed" as TaskStatus, reward: 5000, created: "2026-02-12" },
  { id: "RLY-TSK-2026-S6J4V8", title: "Write SEO blog articles on fintech", requestor: "Ankit Verma", acceptor: "Priya K.", status: "completed" as TaskStatus, reward: 3000, created: "2026-02-11" },
  { id: "RLY-TSK-2026-F2H8K4", title: "Social media management", requestor: "Arjun Mehta", acceptor: "—", status: "open" as TaskStatus, reward: 10000, created: "2026-02-14" },
  { id: "RLY-TSK-2026-G5N3P7", title: "Data entry for product listings", requestor: "Rajesh S.", acceptor: "Rohan J.", status: "committed" as TaskStatus, reward: 3000, created: "2026-02-13" },
  { id: "RLY-TSK-2026-H9Q6R2", title: "Photography for wedding event", requestor: "Meena K.", acceptor: "Amit T.", status: "closed" as TaskStatus, reward: 8000, created: "2026-01-28" },
];

const AdminAllTasks = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = DEMO_TASKS.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">All Tasks</h1>
        <p className="text-sm text-muted-foreground">Monitor and audit all platform tasks</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by title or Task ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
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
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{t.id}</TableCell>
                <TableCell className="text-sm font-medium max-w-[200px] truncate">{t.title}</TableCell>
                <TableCell className="text-sm">{t.requestor}</TableCell>
                <TableCell className="text-sm">{t.acceptor}</TableCell>
                <TableCell>
                  <Badge className={`${STATUS_COLORS[t.status]} text-[10px]`}>{STATUS_LABELS[t.status]}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold">₹{t.reward.toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.created}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <p>Showing {filtered.length} of {DEMO_TASKS.length} tasks</p>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAllTasks;
