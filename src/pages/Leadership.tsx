import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const teamMembers = [
  { name: "Alex Morgan", role: "Chief Executive Officer", bio: "A visionary leader with 15+ years of experience in building scalable SaaS platforms and marketplace businesses.", initials: "AM" },
  { name: "Priya Sharma", role: "Chief Technology Officer", bio: "Expert in distributed systems and platform architecture, passionate about building trust-driven technology solutions.", initials: "PS" },
  { name: "David Chen", role: "Chief Operating Officer", bio: "Operations strategist who has scaled multiple marketplace startups from seed to series B.", initials: "DC" },
  { name: "Sarah Williams", role: "VP of Product", bio: "Product leader focused on user experience and building features that drive engagement and trust.", initials: "SW" },
  { name: "James Okafor", role: "VP of Engineering", bio: "Engineering leader with deep expertise in secure payment systems and real-time collaboration tools.", initials: "JO" },
  { name: "Maria Gonzalez", role: "Head of Customer Success", bio: "Customer advocate dedicated to ensuring every user has a seamless and rewarding experience on Reliyo.", initials: "MG" },
];

const Leadership = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container px-4 py-12">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Our Leadership</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">Meet the team driving Reliyo's mission to build the most trusted task marketplace.</p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((m, i) => (
          <Card key={i} className="transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col items-center pt-8 pb-6 text-center">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">{m.initials}</AvatarFallback>
              </Avatar>
              <h3 className="text-base font-semibold text-foreground">{m.name}</h3>
              <p className="text-sm font-medium text-primary">{m.role}</p>
              <p className="mt-3 text-sm text-muted-foreground">{m.bio}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    <Footer />
  </div>
);

export default Leadership;
