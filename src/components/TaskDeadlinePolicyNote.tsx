import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const TASK_DEADLINE_POLICY_NOTE =
  "The task deadline is a strict commitment. If the acceptor fails to complete the task by the agreed deadline, the requestor has the right to request a Force Closure. If the request is approved by the admin, the requestor will receive a full refund of the reward amount, and the acceptor will forfeit their entire Trust Deposit, with a portion paid to the requestor as compensation.";

interface TaskDeadlinePolicyNoteProps {
  className?: string;
}

/** Shared deadline / force-close policy note visible to both parties. */
export default function TaskDeadlinePolicyNote({ className }: TaskDeadlinePolicyNoteProps) {
  return (
    <Alert className={className}>
      <Info className="h-4 w-4" />
      <AlertDescription className="text-sm leading-relaxed">
        {TASK_DEADLINE_POLICY_NOTE}
      </AlertDescription>
    </Alert>
  );
}
