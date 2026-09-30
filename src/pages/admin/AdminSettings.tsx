import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdminLayout from "@/components/AdminLayout";
import { Shield, Clock, IndianRupee, Loader2, Info } from "lucide-react";
import { fetchAdminPlatformSettings, type AdminPlatformSettings } from "@/lib/admin/api";
import { ApiClientError } from "@/lib/api/client";

const AdminSettings = () => {
  const [policy, setPolicy] = useState<AdminPlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAdminPlatformSettings();
        if (!cancelled) setPolicy(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : "Could not load platform settings.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const strikeLabel =
    policy?.inactivityStrikeHours?.map((h) => `${h}h`).join(" / ") ?? "—";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform policy values enforced by the API (read-only)
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading platform settings…
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {policy && (
        <div className="max-w-2xl space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              These values are defined in backend code and apply to all tasks. Editing from
              this screen will be available in a future release (Sprint 8D-P1).
            </AlertDescription>
          </Alert>

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
                  <Input
                    className="mt-1 bg-muted"
                    type="number"
                    value={policy.platformFeePercent}
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <Label className="text-xs">Trust Deposit (%)</Label>
                  <Input
                    className="mt-1 bg-muted"
                    type="number"
                    value={policy.trustDepositPercent}
                    readOnly
                    disabled
                  />
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
                  <Input
                    className="mt-1 bg-muted"
                    type="number"
                    value={policy.quitGraceHours}
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Acceptor may quit with trust refund within this window after accept.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Inactivity strike thresholds</Label>
                  <Input
                    className="mt-1 bg-muted"
                    value={strikeLabel}
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Requestor inactivity on <code className="text-xs">done</code> tasks — 3
                    strikes then auto-close.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-close on 3-strike SLA</p>
                  <p className="text-xs text-muted-foreground">
                    Always enabled via scheduled inactivity job
                  </p>
                </div>
                <Switch checked={policy.autoCloseOnThreeStrikes} disabled />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSettings;
