import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const sections = [
  { title: "1. Introduction", content: "Welcome to Reliyo. These Terms of Service ('Terms') govern your access to and use of the Reliyo platform, including our website, applications, and services. By creating an account or using our services, you agree to be bound by these Terms. If you do not agree, you may not use the platform." },
  { title: "2. Eligibility", content: "You must be at least 18 years old to use Reliyo. By using the platform, you represent and warrant that you have the legal capacity to enter into a binding agreement and that all information you provide is accurate and complete." },
  { title: "3. User Responsibilities", content: "Users are responsible for maintaining the confidentiality of their account credentials, providing accurate information, completing accepted tasks in good faith, and communicating respectfully with other users. Any misuse of the platform, including fraudulent task creation or acceptance, may result in account suspension or termination." },
  { title: "4. Acceptable Use", content: "You agree not to use Reliyo for any unlawful purpose, to post misleading or fraudulent tasks, to harass or abuse other users, to attempt to circumvent the platform's payment or escrow system, or to use automated tools to scrape or manipulate the platform." },
  { title: "5. Payments and Escrow", content: "All task payments are processed through Reliyo's escrow system. Funds are held securely until the task is completed and approved. Platform fees (5%) are deducted at the time of task creation. Refunds and payouts are subject to Reliyo's dispute resolution process." },
  { title: "6. Service Limitations", content: "Reliyo provides the platform on an 'as-is' basis. We do not guarantee uninterrupted service, specific outcomes from task engagements, or the quality of work provided by any user. We reserve the right to modify, suspend, or discontinue any feature of the platform at any time." },
  { title: "7. Termination", content: "Reliyo reserves the right to suspend or terminate your account at any time for violation of these Terms, fraudulent activity, repeated disputes, or conduct that harms the platform community. Upon termination, any pending escrow funds will be handled in accordance with our dispute resolution policies." },
  { title: "8. Limitation of Liability", content: "To the maximum extent permitted by law, Reliyo shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform. Our total liability shall not exceed the amount of fees you have paid to Reliyo in the twelve months preceding the claim." },
  { title: "9. Changes to Terms", content: "We may update these Terms from time to time. We will notify users of material changes via email or platform notification. Continued use of the platform after changes take effect constitutes acceptance of the revised Terms." },
  { title: "10. Contact", content: "If you have questions about these Terms, please contact us at legal@reliyo.com or through our Contact Us page." },
];

const Terms = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container px-4 py-12 max-w-3xl">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: April 9, 2026</p>
      <div className="mt-8 space-y-8">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.content}</p>
          </section>
        ))}
      </div>
    </div>
    <Footer />
  </div>
);

export default Terms;
