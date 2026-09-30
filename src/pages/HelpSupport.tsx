import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, BookOpen, MessageSquare, FileText, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardLayout from "@/components/DashboardLayout";
import { SupportTicketForm } from "@/components/SupportTicketForm";
import { useAuth } from "@/contexts/AuthContext";

const helpGuides = [
  { title: "Getting Started with Reliyo", description: "Learn how to create your account, set up your profile, and post your first task." },
  { title: "How platform-held payments work", description: "Understand how funds are held by the platform and released upon task completion per policy." },
  { title: "Understanding Trust Scores", description: "Learn how reliability ratings are calculated and how to improve yours." },
  { title: "Dispute Resolution Process", description: "Step-by-step guide to raising and resolving disputes on the platform." },
  { title: "Managing Your Tasks", description: "Tips for tracking, updating, and completing tasks efficiently." },
  { title: "Account Security Best Practices", description: "Protect your account with strong passwords and security settings." },
];

const faqItems = [
  { q: "How do I create a task?", a: "Navigate to your dashboard and click 'Create Task'. Fill in the details including title, description, deadline, and reward amount. The platform fee will be calculated automatically." },
  { q: "What happens if a task is not completed on time?", a: "If the acceptor fails to meet the deadline, the requestor can raise a dispute or request a force close. The platform's dispute resolution process will handle the situation fairly." },
  { q: "How are payments secured?", a: "Task payments are held as platform-held funds. The reward amount is locked when a task is funded and released to the acceptor only after successful completion and approval by the requestor, subject to policy and fees." },
  { q: "Can I cancel a task after posting?", a: "You can cancel a task before it is accepted. Once accepted, you'll need to follow the dispute or force-close process if issues arise." },
  { q: "How do trust scores work?", a: "Trust scores are calculated based on your task completion rate, timeliness, dispute history, and overall platform behavior. Higher scores unlock more opportunities." },
  { q: "What is the platform fee?", a: "Reliyo charges a 5% platform fee on eligible settlements to maintain the marketplace infrastructure, payment handling, and dispute resolution services." },
];

const HelpSupportContent = () => {
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const fromDashboard = searchParams.get("from") === "dashboard";
  const { user, isAuthenticated } = useAuth();
  /** Dashboard shell + profile prefill only when opened from the in-app Support button. */
  const fromDashboardSession = fromDashboard && isAuthenticated;

  const filteredGuides = helpGuides.filter(
    (g) => g.title.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredFaq = faqItems.filter(
    (f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()),
  );

  const backLink = fromDashboardSession ? (
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
      <ChevronLeft className="h-4 w-4" /> Back to Dashboard
    </Link>
  ) : (
    <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
      <ChevronLeft className="h-4 w-4" /> Back to Home
    </Link>
  );

  const body = (
    <div className={fromDashboardSession ? "" : "container px-4 py-12"}>
      {backLink}

      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Help & Support</h1>
      <p className="mt-2 text-muted-foreground">Find answers, explore guides, or submit a support ticket.</p>

      <div className="relative mt-8 max-w-lg">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search guides and FAQs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <BookOpen className="h-5 w-5 text-primary" /> Help Guides
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGuides.map((g, i) => (
            <Card key={i} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{g.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{g.description}</p>
              </CardContent>
            </Card>
          ))}
          {filteredGuides.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">No guides match your search.</p>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <MessageSquare className="h-5 w-5 text-primary" /> Frequently Asked Questions
        </h2>
        <div className="mt-6 max-w-2xl">
          <Accordion type="single" collapsible className="w-full">
            {filteredFaq.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {filteredFaq.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">No FAQs match your search.</p>
          )}
        </div>
      </section>

      <section className="mt-12 max-w-lg">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <FileText className="h-5 w-5 text-primary" /> Submit a Support Ticket
        </h2>
        <SupportTicketForm
          key={fromDashboardSession ? "dashboard" : "public"}
          profile={
            fromDashboardSession && user
              ? { name: user.name, email: user.email, phone: user.phone }
              : null
          }
          authenticated={fromDashboardSession}
        />
      </section>
    </div>
  );

  if (fromDashboardSession) {
    return <DashboardLayout>{body}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {body}
      <Footer />
    </div>
  );
};

const HelpSupport = () => <HelpSupportContent />;

export default HelpSupport;
