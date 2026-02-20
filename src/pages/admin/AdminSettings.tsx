import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "@/hooks/use-toast";
import { Save, Shield, Clock, IndianRupee } from "lucide-react";

const AdminSettings = () => {
  const [platformFee, setPlatformFee] = useState("5");
  const [trustDeposit, setTrustDeposit] = useState("10");
  const [graceHours, setGraceHours] = useState("2");
  const [slaWarning, setSlaWarning] = useState("48");
  const [autoClose, setAutoClose] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSave = () => {
    toast({ title: "Settings Saved", description: "Platform configuration updated successfully." });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Platform configuration and policies</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" /> Financial Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Platform Fee (%)</Label>
                <Input className="mt-1" type="number" value={platformFee} onChange={(e) => setPlatformFee(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Trust Deposit (%)</Label>
                <Input className="mt-1" type="number" value={trustDeposit} onChange={(e) => setTrustDeposit(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Time & SLA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Quit Grace Period (hours)</Label>
                <Input className="mt-1" type="number" value={graceHours} onChange={(e) => setGraceHours(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">SLA Warning Interval (hours)</Label>
                <Input className="mt-1" type="number" value={slaWarning} onChange={(e) => setSlaWarning(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Automation & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-close on 3-strike SLA</p>
                <p className="text-xs text-muted-foreground">Automatically close tasks after 3 unanswered SLA warnings</p>
              </div>
              <Switch checked={autoClose} onCheckedChange={setAutoClose} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email notifications</p>
                <p className="text-xs text-muted-foreground">Send email alerts for disputes and escalations</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
          </CardContent>
        </Card>

        <Button className="gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" /> Save Settings
        </Button>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
