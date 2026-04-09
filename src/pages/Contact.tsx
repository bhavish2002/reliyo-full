import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Mail, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Contact = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    console.log(`[Mock] Contact form: ${name}, ${email}, ${message}`);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 py-12">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">We'd love to hear from you. Reach out with questions, feedback, or partnership inquiries.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Contact Info */}
          <div className="space-y-6">
            {[
              { icon: MapPin, label: "Address", value: "123 Innovation Drive, Tech Park, CA 94016" },
              { icon: Mail, label: "Email", value: "support@reliyo.com" },
              { icon: Phone, label: "Phone", value: "+1 (800) 555-0199" },
            ].map((c, i) => (
              <Card key={i}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <c.icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.label}</p>
                    <p className="text-sm text-muted-foreground">{c.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <Card className="border-success/30 bg-success/5">
                <CardContent className="py-12 text-center">
                  <p className="text-lg font-semibold text-foreground">Message Sent!</p>
                  <p className="mt-2 text-sm text-muted-foreground">Thank you for reaching out. We'll respond within 1-2 business days.</p>
                  <Button className="mt-4" variant="outline" onClick={() => { setSent(false); setName(""); setEmail(""); setMessage(""); }}>
                    Send Another Message
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="contact-name">Name</Label>
                  <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email</Label>
                  <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="contact-msg">Message</Label>
                  <Textarea id="contact-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" rows={5} />
                </div>
                <Button type="submit" className="w-full" disabled={!name.trim() || !email.trim() || !message.trim()}>
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
