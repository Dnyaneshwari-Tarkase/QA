import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Shield, Share2, GraduationCap, BookOpen, Users } from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-serif font-bold text-foreground">QuestionIQ</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
            Generate Professional
            <span className="text-primary block">Question Papers</span>
            in Minutes
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload your syllabus PDF, set your requirements, and let AI create 
            perfectly formatted exam papers with secure answer keys.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 py-6">
                <BookOpen className="mr-2 h-5 w-5" />
                Start Creating Papers
              </Button>
            </Link>
            {/* <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Watch Demo
            </Button> */}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-serif font-bold text-center text-foreground mb-12">
            Everything Teachers Need
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon={<FileText className="h-10 w-10" />}
              title="Smart PDF Processing"
              description="Upload any textbook or notes PDF. Our AI extracts relevant content and generates curriculum-aligned questions."
            />
            <FeatureCard
              icon={<Shield className="h-10 w-10" />}
              title="Secure Answer Keys"
              description="Answer keys are encrypted and accessible only to you. Students see only the question paper."
            />
            <FeatureCard
              icon={<Share2 className="h-10 w-10" />}
              title="Instant Sharing"
              description="Generate unique links for each paper. Share with students via any platform - WhatsApp, email, or LMS."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-serif font-bold text-center text-foreground mb-12">
            How It Works
          </h2>
          <div className="space-y-8">
            <Step
              number="1"
              title="Upload Your PDF"
              description="Upload your textbook chapter, notes, or any study material in PDF format."
            />
            <Step
              number="2"
              title="Configure Your Paper"
              description="Select class, subject, total marks, and specify how many MCQs, short answers, and long answers you need."
            />
            <Step
              number="3"
              title="Generate & Share"
              description="AI generates your paper instantly. Get a unique link to share with students - they'll only see questions!"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard number="10,000+" label="Papers Generated" />
            <StatCard number="500+" label="Teachers" />
            <StatCard number="50+" label="Subjects" />
            <StatCard number="99%" label="Satisfaction" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <Users className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-serif font-bold text-foreground mb-4">
            Join Thousands of Educators
          </h2>
          <p className="text-muted-foreground mb-8">
            Stop spending hours creating question papers manually. Let AI do the heavy lifting while you focus on teaching.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8">
              Create Your First Paper — Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-serif font-bold">QuestionIQ</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 MyApp. Built by Dnyaneshwari Tarkase.
          </p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
    <div className="text-primary mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

const Step = ({ number, title, description }: { number: string; title: string; description: string }) => (
  <div className="flex gap-6 items-start">
    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
      {number}
    </div>
    <div>
      <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  </div>
);

const StatCard = ({ number, label }: { number: string; label: string }) => (
  <div>
    <div className="text-3xl md:text-4xl font-bold mb-1">{number}</div>
    <div className="text-primary-foreground/80">{label}</div>
  </div>
);

export default Index;
