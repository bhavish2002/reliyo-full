import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import AdminLayout from "@/components/AdminLayout";
import { Search, Star, Shield, Flag } from "lucide-react";

const DEMO_USERS = [
  { id: "USR-001", name: "Arjun Mehta", email: "arjun@reliyo.com", role: "Requestor", tasks: 18, rating: 4.7, reliability: 92, status: "active", flagged: false },
  { id: "USR-002", name: "Priya Sharma", email: "priya@reliyo.com", role: "Acceptor", tasks: 28, rating: 4.9, reliability: 98, status: "active", flagged: false },
  { id: "USR-003", name: "Amit Trivedi", email: "amit@reliyo.com", role: "Acceptor", tasks: 24, rating: 4.8, reliability: 96, status: "active", flagged: false },
  { id: "USR-004", name: "Rohan Joshi", email: "rohan@reliyo.com", role: "Acceptor", tasks: 21, rating: 4.7, reliability: 94, status: "active", flagged: true },
  { id: "USR-005", name: "Sneha Patel", email: "sneha@reliyo.com", role: "Requestor", tasks: 16, rating: 4.6, reliability: 90, status: "active", flagged: false },
  { id: "USR-006", name: "Rajesh Singh", email: "rajesh@reliyo.com", role: "Requestor", tasks: 8, rating: 3.2, reliability: 65, status: "suspended", flagged: true },
];

const AdminUsers = () => {
  const [search, setSearch] = useState("");

  const filtered = DEMO_USERS.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">Manage and audit platform users</p>
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
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs text-center">Tasks</TableHead>
              <TableHead className="text-xs text-center">Rating</TableHead>
              <TableHead className="text-xs text-center">Reliability</TableHead>
              <TableHead className="text-xs text-center">Status</TableHead>
              <TableHead className="text-xs w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
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
                <TableCell>
                  <Badge variant="outline" className="text-xs">{u.role}</Badge>
                </TableCell>
                <TableCell className="text-center text-sm">{u.tasks}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 text-primary fill-primary" /> {u.rating}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-sm font-semibold ${u.reliability >= 90 ? "text-success" : u.reliability >= 70 ? "text-primary" : "text-destructive"}`}>
                    {u.reliability}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={u.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"} variant="outline">
                    {u.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                    {!u.flagged && <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive">Flag</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AdminLayout>
  );
};

export default AdminUsers;
