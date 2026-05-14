import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const sections = [
  { title: "1. Data Collection", content: "Reliyo collects personal information that you provide when creating an account, including your name, email address, phone number, and location. We also collect usage data such as task activity, payment history, and interaction patterns to improve our services." },
  { title: "2. How We Use Your Data", content: "Your data is used to operate and maintain the platform, process payments and platform-held funds flows, calculate trust and reliability scores, communicate important updates and notifications, improve platform features and user experience, and comply with legal obligations." },
  { title: "3. Cookies and Tracking", content: "Reliyo uses cookies and similar tracking technologies to maintain your session, remember your preferences, analyze platform usage patterns, and improve performance. You can manage cookie preferences through your browser settings, though disabling cookies may affect platform functionality." },
  { title: "4. Data Protection", content: "We implement industry-standard security measures to protect your personal data, including encryption of data in transit and at rest, secure payment processing, regular security audits and vulnerability assessments, and access controls limiting data access to authorized personnel only." },
  { title: "5. Third-Party Sharing", content: "Reliyo does not sell your personal data. We may share information with payment processors to facilitate payments and settlements, legal authorities when required by law, service providers who assist in platform operations (under strict confidentiality agreements), and other users only to the extent necessary for task completion (e.g., displaying your name and trust score)." },
  { title: "6. Data Retention", content: "We retain your personal data for as long as your account is active or as needed to provide services. Upon account deletion, we will remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes such as dispute resolution." },
  { title: "7. Your Rights", content: "You have the right to access, correct, or delete your personal data, request a copy of your data in a portable format, opt out of non-essential communications, and lodge a complaint with a data protection authority. To exercise these rights, contact us at privacy@reliyo.com." },
  { title: "8. Changes to This Policy", content: "We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notification. Continued use of Reliyo after changes take effect constitutes acceptance of the updated policy." },
  { title: "9. Contact", content: "For privacy-related inquiries, please contact our Data Protection Team at privacy@reliyo.com or through the Contact Us page on our website." },
];

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container px-4 py-12 max-w-3xl">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Privacy Policy</h1>
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

export default Privacy;
