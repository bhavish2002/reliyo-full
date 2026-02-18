import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Lock, CheckCircle2, Info, ChevronDown, CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";

const WORK_TYPES = ["Virtual", "Physical", "Hybrid"];
const UPDATE_FREQUENCIES = ["Daily", "Weekly", "Bi-weekly", "Monthly"];
const DOMAINS = ["Technology", "Design", "Marketing", "Writing", "Translation", "Delivery", "Cleaning", "Other"];
const COUNTRIES = ["India"];
const STATES: Record<string, string[]> = {
  India: ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Uttar Pradesh", "Gujarat", "Rajasthan", "Other"],
};

interface TaskForm {
  title: string;
  description: string;
  workType: string;
  manpower: number;
  skills: string[];
  updateFrequency: string;
  domain: string;
  country: string;
  state: string;
  city: string;
  reward: number;
  deadline: Date | undefined;
}

const initialForm: TaskForm = {
  title: "",
  description: "",
  workType: "",
  manpower: 1,
  skills: [],
  updateFrequency: "",
  domain: "",
  country: "",
  state: "",
  city: "",
  reward: 500,
  deadline: undefined,
};

const PLATFORM_FEE_PERCENT = 5;

const StepIndicator = ({ current }: { current: number }) => {
  const steps = [
    { num: 1, label: "Details" },
    { num: 2, label: "Review" },
    { num: 3, label: "Lock Reward" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                current > step.num
                  ? "bg-primary text-primary-foreground"
                  : current === step.num
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {current > step.num ? <CheckCircle2 className="h-5 w-5" /> : step.num}
            </div>
            {current === step.num && (
              <span className="mt-1 text-xs font-medium text-foreground">{step.label}</span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-2 h-0.5 w-16 ${current > step.num ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
};

const CreateTask = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<TaskForm>(initialForm);
  const [skillInput, setSkillInput] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);

  const updateField = <K extends keyof TaskForm>(key: K, value: TaskForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      updateField("skills", [...form.skills, s]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) =>
    updateField("skills", form.skills.filter((s) => s !== skill));

  const platformFee = Math.round(form.reward * (PLATFORM_FEE_PERCENT / 100));
  const totalPayout = form.reward;

  const canProceedStep1 =
    form.title.trim() && form.description.trim() && form.workType && form.reward >= 100 && form.deadline;

  const handlePublish = () => {
    // Save to localStorage for simulated My Tasks
    const tasks = JSON.parse(localStorage.getItem("reliyo_tasks") || "[]");
    const newTask = {
      id: Date.now().toString(),
      ...form,
      deadline: form.deadline ? form.deadline.toISOString() : "",
      status: "open",
      location: [form.city, form.state, form.country].filter(Boolean).join(", "),
      createdAt: new Date().toISOString(),
      createdBy: "Arjun Mehta",
    };
    tasks.push(newTask);
    localStorage.setItem("reliyo_tasks", JSON.stringify(tasks));

    toast({ title: "Task Published!", description: "Your task is now live and visible to workers." });
    navigate("/my-tasks");
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Create a Task</h1>
      <StepIndicator current={step} />

      {/* Step 1: Details */}
      {step === 1 && (
        <Card className="rounded-xl max-w-3xl mx-auto">
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input
                className="mt-1"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                className="mt-1 min-h-[100px]"
                placeholder="Describe the task in detail..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Work Type</label>
                <Select value={form.workType} onValueChange={(v) => updateField("workType", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Manpower</label>
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  value={form.manpower}
                  onChange={(e) => updateField("manpower", parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Skills</label>
              <div className="mt-1 flex gap-2">
                <Input
                  placeholder="Add a skill"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                />
                <Button variant="outline" type="button" onClick={addSkill}>Add</Button>
              </div>
              {form.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1">
                      {s}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(s)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Update Frequency</label>
                <Select value={form.updateFrequency} onValueChange={(v) => updateField("updateFrequency", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {UPDATE_FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Domain</label>
                <Select value={form.domain} onValueChange={(v) => updateField("domain", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Country</label>
                <Select value={form.country} onValueChange={(v) => { updateField("country", v); updateField("state", ""); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">State</label>
                <Select value={form.state} onValueChange={(v) => updateField("state", v)} disabled={!form.country}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(STATES[form.country] || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">City</label>
                <Input
                  className="mt-1"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Reward (₹)</label>
                <Input
                  className="mt-1"
                  type="number"
                  min={100}
                  value={form.reward}
                  onChange={(e) => updateField("reward", parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Deadline</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="mt-1 w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.deadline ? format(form.deadline, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.deadline}
                      onSelect={(d) => updateField("deadline", d)}
                      disabled={(d) => d < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button disabled={!canProceedStep1} onClick={() => setStep(2)} className="gap-2">
                Next — Review <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <div className="max-w-3xl mx-auto space-y-4">
          <Card className="rounded-xl">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Review Your Task</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div><p className="text-xs text-muted-foreground">Title</p><p className="text-sm font-medium">{form.title}</p></div>
                <div><p className="text-xs text-muted-foreground">Work Type</p><p className="text-sm font-medium">{form.workType || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm font-medium">{form.description}</p></div>
                <div><p className="text-xs text-muted-foreground">Manpower</p><p className="text-sm font-medium">{form.manpower}</p></div>
                <div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium">{[form.city, form.state, form.country].filter(Boolean).join(", ") || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Deadline</p><p className="text-sm font-medium">{form.deadline ? format(form.deadline, "MMMM do, yyyy") : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Update Frequency</p><p className="text-sm font-medium">{form.updateFrequency || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Skills</p><p className="text-sm font-medium">{form.skills.join(", ") || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Domain</p><p className="text-sm font-medium">{form.domain || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Reward</p><p className="text-sm font-medium text-primary">₹{form.reward.toLocaleString()}</p></div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Info className="h-4 w-4 shrink-0" />
            Your full reward amount will be refunded if the task is cancelled or not completed.
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            <Button onClick={() => setStep(3)} className="gap-2">
              Next — Lock Reward <Lock className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Lock Reward */}
      {step === 3 && (
        <div className="max-w-3xl mx-auto space-y-4">
          <Card className="rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-bold text-foreground">Lock Reward</h2>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pay Breakdown</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Total Reward</span><span>₹{form.reward.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Platform Fee ({PLATFORM_FEE_PERCENT}%)</span><span className="text-destructive">-₹{platformFee}</span></div>
              </div>

              <div className="mt-4 flex justify-between rounded-lg bg-muted p-3 font-semibold">
                <span>Total Payout</span>
                <span className="text-lg">₹{totalPayout.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-primary mb-2">Terms & conditions <Info className="inline h-3.5 w-3.5" /></p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="terms"
                  checked={agreedTerms}
                  onCheckedChange={(c) => setAgreedTerms(c === true)}
                />
                <label htmlFor="terms" className="text-sm">I hereby agree to the terms and conditions above</label>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Info className="h-4 w-4 shrink-0" />
            Your full reward amount will be refunded if the task is cancelled or not completed.
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            <Button disabled={!agreedTerms} onClick={handlePublish} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Confirm & Publish Task
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CreateTask;
