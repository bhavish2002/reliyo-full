import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, MapPin, Calendar, Star, Info, LayoutGrid, List,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { ALL_COUNTRY_NAMES } from "@/lib/countriesStates";
import { getCurrentUser } from "@/lib/auth";

interface Task {
  id: string;
  taskId?: string;
  title: string;
  description: string;
  status: string;
  location: string;
  country?: string;
  reward: number;
  deadline: string;
  createdAt: string;
  createdBy: string;
  skills?: string[];
  domain?: string;
  workType?: string;
  manpower?: number;
  updateFrequency?: string;
}

const DOMAIN_OPTIONS = [
  "All", "Technology", "Design", "Marketing", "Writing",
  "Translation", "Delivery", "Cleaning", "Other",
];

const DEMO_BROWSE_TASKS: Task[] = [
  {
    id: "browse1", taskId: "RLY-TSK-2026-D8K3M7", title: "Deliver documents to Koramangala office",
    description: "Pick up documents from HSR Layout and deliver to Koramangala office before 5 PM. Must have own vehicle.",
    status: "open", location: "Bengaluru", country: "India", reward: 500, deadline: "2026-02-15",
    createdAt: "2026-02-10T10:00:00Z", createdBy: "Ravi Kumar",
    skills: ["physical", "delivery", "local-knowledge"], domain: "Delivery", workType: "Physical",
    manpower: 1, updateFrequency: "Daily",
  },
  {
    id: "browse2", taskId: "RLY-TSK-2026-L4P9N2", title: "Design a logo for my bakery startup",
    description: "Need a modern, minimalist logo for an artisan bakery. Must deliver in AI and PNG formats.",
    status: "open", location: "Mumbai", country: "India", reward: 2000, deadline: "2026-02-21",
    createdAt: "2026-02-08T10:00:00Z", createdBy: "Priya Sharma",
    skills: ["design", "creative"], domain: "Design", workType: "Virtual",
    manpower: 1, updateFrequency: "Weekly",
  },
  {
    id: "browse3", taskId: "RLY-TSK-2026-T7R2X5", title: "Translate product brochure to Tamil",
    description: "Professional translation of a 10-page product brochure from English to Tamil. Must maintain formatting.",
    status: "open", location: "Chennai", country: "India", reward: 1500, deadline: "2026-03-02",
    createdAt: "2026-02-05T10:00:00Z", createdBy: "Sanjay Patel",
    skills: ["translation", "tamil", "english"], domain: "Translation", workType: "Virtual",
    manpower: 1, updateFrequency: "Weekly",
  },
  {
    id: "browse4", taskId: "RLY-TSK-2026-B5W8Q3", title: "Build a landing page for SaaS product",
    description: "Create a responsive landing page using React and Tailwind CSS. Must include hero, features, pricing sections.",
    status: "open", location: "Remote", country: "United States", reward: 5000, deadline: "2026-03-10",
    createdAt: "2026-02-12T10:00:00Z", createdBy: "Meera Joshi",
    skills: ["react", "tailwind", "frontend"], domain: "Technology", workType: "Virtual",
    manpower: 1, updateFrequency: "Daily",
  },
  {
    id: "browse5", taskId: "RLY-TSK-2026-S6J4V8", title: "Write SEO blog articles on fintech",
    description: "Write 5 high-quality blog articles of 1500 words each on fintech topics. Must be SEO-optimized.",
    status: "open", location: "Remote", country: "United Kingdom", reward: 3000, deadline: "2026-02-28",
    createdAt: "2026-02-11T10:00:00Z", createdBy: "Ankit Verma",
    skills: ["writing", "seo", "fintech"], domain: "Writing", workType: "Virtual",
    manpower: 1, updateFrequency: "Weekly",
  },
];

const TASK_RATINGS: Record<string, number> = {
  browse1: 4.7, browse2: 4.2, browse3: 4.5, browse4: 4.8, browse5: 3.9,
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
      />
    ))}
    <span className="ml-1 text-xs text-muted-foreground">{rating}</span>
  </div>
);

const BrowseTasks = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("All");
  const [domainFilter, setDomainFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Load user-created tasks from localStorage + demo browse tasks
    const stored = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]") as Task[];
    const openStored = stored.filter((t) => t.status === "open");
    // Get accepted task IDs to exclude them
    const acceptedTasks = JSON.parse(localStorage.getItem("reliyo_accepted_tasks") || "[]") as Task[];
    const acceptedIds = new Set(acceptedTasks.map((t) => t.id));
    // Merge with demo tasks, deduplicate by id, exclude accepted
    const ids = new Set(openStored.map((t) => t.id));
    const merged = [
      ...openStored.filter((t) => !acceptedIds.has(t.id)),
      ...DEMO_BROWSE_TASKS.filter((t) => !ids.has(t.id) && !acceptedIds.has(t.id)),
    ];
    setAllTasks(merged);
  }, []);

  const filtered = useMemo(() => {
    return allTasks.filter((t) => {
      // Exclude own tasks
      const currentUser = getCurrentUser();
      if (currentUser && t.createdBy === currentUser.name) return false;
      if (t.status !== "open") return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // Country filter: match on the country field
      if (countryFilter !== "All") {
        const taskCountry = t.country?.toLowerCase() || "";
        if (taskCountry !== countryFilter.toLowerCase()) return false;
      }
      if (domainFilter !== "All" && t.domain !== domainFilter) return false;
      return true;
    });
  }, [allTasks, searchQuery, countryFilter, domainFilter]);

  return (
    <DashboardLayout>
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-foreground">Browse Tasks</h1>
        <p className="text-sm text-muted-foreground">Find tasks that match your skills</p>
      </div>

      {/* Info banner */}
      <div className="my-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <p>
          Accepting a task requires you to lock a trust deposit equal to 10% of the reward amount to ensure reliability.
          This deposit will be fully refunded upon successful completion of the task.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="All">All Countries</SelectItem>
            {ALL_COUNTRY_NAMES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent>
            {DOMAIN_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>{d === "All" ? "All Domains" : d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            className="rounded-none h-9 w-9"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="rounded-none h-9 w-9"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No tasks found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-2" : "space-y-3"}>
          {filtered.map((task) => {
            const rating = TASK_RATINGS[task.id] ?? 4.0;
            return (
              <Card
                key={task.id}
                className="rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/task/${task.id}`, { state: { fromBrowse: true } })}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      {task.taskId && (
                        <p className="text-[10px] font-mono text-muted-foreground mb-0.5">{task.taskId}</p>
                      )}
                      <p className="text-sm font-semibold text-foreground leading-snug pr-3">{task.title}</p>
                    </div>
                    <Badge className="bg-primary text-primary-foreground text-xs shrink-0">Open</Badge>
                  </div>
                  {task.skills && task.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {task.skills.slice(0, 3).map((s) => (
                        <Badge key={s} variant="outline" className="text-xs font-normal">{s}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {task.location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{task.location}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {task.deadline ? format(new Date(task.deadline), "MMM d") : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{(task as any).currencySymbol || "₹"}{task.reward.toLocaleString()}</span>
                    <StarRating rating={rating} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default BrowseTasks;
