import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, BookOpen, MessageSquare, FileText, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createTicket } from "@/lib/supportTickets";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const helpGuides = [
  { title: "Getting Started with Reliyo", description: "Learn how to create your account, set up your profile, and post your first task." },
  { title: "How Escrow Payments Work", description: "Understand how funds are held securely and released upon task completion." },
  { title: "Understanding Trust Scores", description: "Learn how reliability ratings are calculated and how to improve yours." },
  { title: "Dispute Resolution Process", description: "Step-by-step guide to raising and resolving disputes on the platform." },
  { title: "Managing Your Tasks", description: "Tips for tracking, updating, and completing tasks efficiently." },
  { title: "Account Security Best Practices", description: "Protect your account with strong passwords and security settings." },
];

const faqItems = [
  { q: "How do I create a task?", a: "Navigate to your dashboard and click 'Create Task'. Fill in the details including title, description, deadline, and reward amount. The platform fee will be calculated automatically." },
  { q: "What happens if a task is not completed on time?", a: "If the acceptor fails to meet the deadline, the requestor can raise a dispute or request a force close. The platform's dispute resolution process will handle the situation fairly." },
  { q: "How are payments secured?", a: "All payments are held in escrow. The reward amount is locked when a task is created and only released to the acceptor upon successful completion and approval by the requestor." },
  { q: "Can I cancel a task after posting?", a: "You can cancel a task before it is accepted. Once accepted, you'll need to follow the dispute or force-close process if issues arise." },
  { q: "How do trust scores work?", a: "Trust scores are calculated based on your task completion rate, timeliness, dispute history, and overall platform behavior. Higher scores unlock more opportunities." },
  { q: "What is the platform fee?", a: "Reliyo charges a 5% platform fee on each task reward to maintain the marketplace infrastructure, escrow system, and dispute resolution services." },
];

const HelpSupport = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");

  const filteredGuides = helpGuides.filter(
    (g) => g.title.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFaq = faqItems.filter(
    (f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !issue.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    const ticket = createTicket({ name: name.trim(), email: email.trim(), phone: phone.trim(), issue: issue.trim() });
    console.log(`[Mock Email] Support ticket ${ticket.id} submitted by ${ticket.email}`);
    setTicketId(ticket.id);
    setSubmitted(true);
    setName(""); setEmail(""); setPhone(""); setIssue("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 py-12">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Help & Support</h1>
        <p className="mt-2 text-muted-foreground">Find answers, explore guides, or submit a support ticket.</p>

        {/* Search */}
        <div className="relative mt-8 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search guides and FAQs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Help Guides */}
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
            {filteredGuides.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No guides match your search.</p>}
          </div>
        </section>

        {/* FAQ */}
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
            {filteredFaq.length === 0 && <p className="text-sm text-muted-foreground mt-4">No FAQs match your search.</p>}
          </div>
        </section>

        {/* Support Ticket */}
        <section className="mt-12 max-w-lg">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <FileText className="h-5 w-5 text-primary" /> Submit a Support Ticket
          </h2>
          {submitted ? (
            <Card className="mt-6 border-success/30 bg-success/5">
              <CardContent className="py-8 text-center">
                <p className="text-lg font-semibold text-foreground">Ticket Submitted Successfully!</p>
                <p className="mt-2 text-sm text-muted-foreground">Your ticket ID is <span className="font-mono font-semibold text-primary">{ticketId}</span></p>
                <p className="mt-1 text-sm text-muted-foreground">We'll get back to you via email shortly.</p>
                <Button className="mt-4" variant="outline" onClick={() => setSubmitted(false)}>Submit Another Ticket</Button>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="ticket-name">Name</Label>
                <Input id="ticket-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
              </div>
              <div>
                <Label htmlFor="ticket-email">Email</Label>
                <Input id="ticket-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <Label htmlFor="ticket-phone">Phone Number</Label>
                <Input id="ticket-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
              </div>
              <div>
                <Label htmlFor="ticket-issue">Issue Description</Label>
                <Textarea id="ticket-issue" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe your issue in detail..." rows={4} />
              </div>
              <Button type="submit" className="w-full" disabled={!name.trim() || !email.trim() || !phone.trim() || !issue.trim()}>
                Submit Ticket
              </Button>
            </form>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default HelpSupport;
