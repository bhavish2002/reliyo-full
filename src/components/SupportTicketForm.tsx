import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createSupportTicket } from "@/lib/support/api";
import { formatDisplayPhone } from "@/lib/userSettings";
import { ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = {
  nameMin: 2,
  nameMax: 120,
  emailMax: 200,
  subjectMin: 3,
  subjectMax: 200,
  issueMin: 10,
  issueMax: 4000,
} as const;

type TicketField = "name" | "email" | "phone" | "subject" | "issue";

type TicketFieldErrors = Partial<Record<TicketField, string>>;

function normalizePhoneForApi(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits || phone.trim();
}

function validatePhone(phone: string): string | undefined {
  const trimmed = phone.trim();
  if (!trimmed) return "Phone number is required.";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return undefined;
  if (digits.length === 12 && digits.startsWith("91")) return undefined;
  if (digits.length >= 10 && digits.length <= 15) return undefined;
  return "Enter a valid phone number (10 digits, or include country code).";
}

function validateSupportTicketFields(values: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  issue: string;
}): TicketFieldErrors {
  const errors: TicketFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const subject = values.subject.trim();
  const issue = values.issue.trim();

  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length < LIMITS.nameMin) {
    errors.name = `Name must be at least ${LIMITS.nameMin} characters.`;
  } else if (name.length > LIMITS.nameMax) {
    errors.name = `Name must be ${LIMITS.nameMax} characters or fewer.`;
  }

  if (!email) {
    errors.email = "Email is required.";
  } else if (email.length > LIMITS.emailMax) {
    errors.email = `Email must be ${LIMITS.emailMax} characters or fewer.`;
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const phoneError = validatePhone(values.phone);
  if (phoneError) errors.phone = phoneError;

  if (!subject) {
    errors.subject = "Subject is required.";
  } else if (subject.length < LIMITS.subjectMin) {
    errors.subject = `Subject must be at least ${LIMITS.subjectMin} characters.`;
  } else if (subject.length > LIMITS.subjectMax) {
    errors.subject = `Subject must be ${LIMITS.subjectMax} characters or fewer.`;
  }

  if (!issue) {
    errors.issue = "Issue description is required.";
  } else if (issue.length < LIMITS.issueMin) {
    errors.issue = `Issue description must be at least ${LIMITS.issueMin} characters.`;
  } else if (issue.length > LIMITS.issueMax) {
    errors.issue = `Issue description must be ${LIMITS.issueMax} characters or fewer.`;
  }

  return errors;
}

export interface SupportTicketFormProfile {
  name: string | null;
  email: string | null;
  phone: string;
}

interface SupportTicketFormProps {
  profile?: SupportTicketFormProfile | null;
  authenticated?: boolean;
}

const RequiredMark = () => (
  <span className="text-destructive ml-0.5" aria-hidden="true">
    *
  </span>
);

export function SupportTicketForm({ profile, authenticated }: SupportTicketFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState(
    profile?.phone ? formatDisplayPhone(profile.phone) : "",
  );
  const [subject, setSubject] = useState("");
  const [issue, setIssue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<TicketFieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<TicketField, boolean>>>({});

  useEffect(() => {
    if (!profile) return;
    if (profile.name) setName(profile.name);
    if (profile.email) setEmail(profile.email);
    if (profile.phone) setPhone(formatDisplayPhone(profile.phone));
  }, [profile?.name, profile?.email, profile?.phone]);

  const clearFieldError = (field: TicketField) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const markTouched = (field: TicketField) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const validateField = (field: TicketField, values: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    issue: string;
  }): string | undefined => validateSupportTicketFields(values)[field];

  const handleBlur = (field: TicketField) => {
    markTouched(field);
    const values = { name, email, phone, subject, issue };
    const message = validateField(field, values);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const values = { name, email, phone, subject, issue };
    const errors = validateSupportTicketFields(values);
    setFieldErrors(errors);
    setTouched({
      name: true,
      email: true,
      phone: true,
      subject: true,
      issue: true,
    });
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Please fix the highlighted fields",
        description: "All fields are required and must meet the format rules below.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const trimmedIssue = issue.trim();
      const ticket = await createSupportTicket({
        name: name.trim(),
        email: email.trim(),
        phone: normalizePhoneForApi(phone),
        subject: subject.trim(),
        issue: trimmedIssue,
      });
      setTicketId(ticket.id);
      setSubmitted(true);
      setSubject("");
      setIssue("");
      setFieldErrors({});
      setTouched({});
      if (!authenticated) {
        setName("");
        setEmail("");
        setPhone("");
      }
    } catch (err) {
      const description =
        err instanceof ApiClientError
          ? err.message
          : "Please try again later.";
      toast({
        title: "Could not submit ticket",
        description,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyTicketId = async () => {
    try {
      await navigator.clipboard.writeText(ticketId);
      setCopied(true);
      toast({ title: "Ticket ID copied" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const showError = (field: TicketField) =>
    touched[field] && fieldErrors[field] ? fieldErrors[field] : undefined;

  const inputErrorClass = (field: TicketField) =>
    showError(field) ? "border-destructive focus-visible:ring-destructive" : undefined;

  if (submitted) {
    return (
      <Card className="mt-6 border-success/30 bg-success/5">
        <CardContent className="py-8 text-center">
          <p className="text-lg font-semibold text-foreground">Ticket Submitted Successfully!</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your ticket ID is{" "}
            <span className="font-mono font-semibold text-primary">{ticketId}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => void copyTicketId()}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy ticket ID
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">
            We&apos;ll get back to you via email shortly.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => setSubmitted(false)}>
            Submit Another Ticket
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
      <div>
        <Label htmlFor="ticket-name">
          Name
          <RequiredMark />
        </Label>
        <Input
          id="ticket-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearFieldError("name");
          }}
          onBlur={() => handleBlur("name")}
          placeholder="Your full name"
          maxLength={LIMITS.nameMax}
          readOnly={authenticated && !!profile?.name}
          aria-invalid={!!showError("name")}
          aria-describedby={showError("name") ? "ticket-name-error" : undefined}
          className={cn(
            authenticated && profile?.name ? "bg-muted" : undefined,
            inputErrorClass("name"),
          )}
        />
        {showError("name") && (
          <p id="ticket-name-error" className="text-xs text-destructive mt-1">
            {showError("name")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="ticket-email">
          Email
          <RequiredMark />
        </Label>
        <Input
          id="ticket-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError("email");
          }}
          onBlur={() => handleBlur("email")}
          placeholder="you@example.com"
          maxLength={LIMITS.emailMax}
          readOnly={authenticated && !!profile?.email}
          aria-invalid={!!showError("email")}
          aria-describedby={showError("email") ? "ticket-email-error" : undefined}
          className={cn(
            authenticated && profile?.email ? "bg-muted" : undefined,
            inputErrorClass("email"),
          )}
        />
        {showError("email") && (
          <p id="ticket-email-error" className="text-xs text-destructive mt-1">
            {showError("email")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="ticket-phone">
          Phone Number
          <RequiredMark />
        </Label>
        <Input
          id="ticket-phone"
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            clearFieldError("phone");
          }}
          onBlur={() => handleBlur("phone")}
          placeholder="+91 90000 00001"
          readOnly={authenticated && !!profile?.phone}
          aria-invalid={!!showError("phone")}
          aria-describedby={showError("phone") ? "ticket-phone-error" : undefined}
          className={cn(
            authenticated && profile?.phone ? "bg-muted" : undefined,
            inputErrorClass("phone"),
          )}
        />
        {showError("phone") && (
          <p id="ticket-phone-error" className="text-xs text-destructive mt-1">
            {showError("phone")}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="ticket-subject">
          Subject
          <RequiredMark />
        </Label>
        <Input
          id="ticket-subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            clearFieldError("subject");
          }}
          onBlur={() => handleBlur("subject")}
          placeholder="Brief summary of your issue"
          maxLength={LIMITS.subjectMax}
          aria-invalid={!!showError("subject")}
          aria-describedby={showError("subject") ? "ticket-subject-error" : "ticket-subject-hint"}
        />
        <div className="flex items-start justify-between gap-2 mt-1">
          {showError("subject") ? (
            <p id="ticket-subject-error" className="text-xs text-destructive">
              {showError("subject")}
            </p>
          ) : (
            <p id="ticket-subject-hint" className="text-xs text-muted-foreground">
              {LIMITS.subjectMin}–{LIMITS.subjectMax} characters
            </p>
          )}
          <p className="text-xs text-muted-foreground shrink-0">
            {subject.length}/{LIMITS.subjectMax}
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="ticket-issue">
          Issue Description
          <RequiredMark />
        </Label>
        <Textarea
          id="ticket-issue"
          value={issue}
          onChange={(e) => {
            setIssue(e.target.value);
            clearFieldError("issue");
          }}
          onBlur={() => handleBlur("issue")}
          placeholder="Describe your issue in detail..."
          rows={4}
          maxLength={LIMITS.issueMax}
          aria-invalid={!!showError("issue")}
          aria-describedby={showError("issue") ? "ticket-issue-error" : "ticket-issue-hint"}
          className={inputErrorClass("issue")}
        />
        <div className="flex items-start justify-between gap-2 mt-1">
          {showError("issue") ? (
            <p id="ticket-issue-error" className="text-xs text-destructive">
              {showError("issue")}
            </p>
          ) : (
            <p id="ticket-issue-hint" className="text-xs text-muted-foreground">
              At least {LIMITS.issueMin} characters
            </p>
          )}
          <p className="text-xs text-muted-foreground shrink-0">
            {issue.length}/{LIMITS.issueMax}
          </p>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit Ticket"}
      </Button>
    </form>
  );
}
