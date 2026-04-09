import { Link } from "react-router-dom";
import { ChevronLeft, Target, Eye, Zap, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container px-4 py-12">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">About Reliyo</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Reliyo is a trust-driven task marketplace designed to connect people who need work done with reliable individuals who deliver results. Every interaction on Reliyo is backed by escrow-secured payments, transparent tracking, and a reputation system that rewards reliability.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <Card className="border-t-4 border-t-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Our Mission</h2>
            </div>
            <p className="text-sm text-muted-foreground">To create a marketplace where trust is the foundation of every transaction, ensuring fair outcomes for both requestors and task acceptors through transparent processes and secure payments.</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Eye className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Our Vision</h2>
            </div>
            <p className="text-sm text-muted-foreground">To become the world's most trusted task marketplace, where every user's reliability is recognized and rewarded, and where disputes are resolved fairly and transparently.</p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-foreground">What We Do</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Reliyo enables individuals and businesses to post tasks, find skilled acceptors, and complete work with confidence. Our platform handles the complexity of payments, deadlines, and quality assurance so you can focus on what matters.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-foreground">Why Reliyo?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Shield, title: "Escrow-Secured Payments", desc: "Funds are locked until work is verified, protecting both parties." },
            { icon: Zap, title: "Trust Scores", desc: "Every user builds a reliability score based on their platform behavior." },
            { icon: Target, title: "Fair Dispute Resolution", desc: "Multi-level dispute system ensures conflicts are resolved equitably." },
          ].map((v, i) => (
            <Card key={i} className="transition-shadow hover:shadow-md">
              <CardContent className="pt-6">
                <v.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground">{v.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
    <Footer />
  </div>
);

export default About;
