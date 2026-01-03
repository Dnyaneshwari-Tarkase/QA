import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  FileText,
  Shield,
  Share2,
  GraduationCap,
  BookOpen,
  Users,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Clock,
  Zap,
} from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-serif font-bold text-foreground tracking-tight">
              QuestionIQ
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it Works
            </a>
            {/* <a
              href="#testimonials"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Testimonials
            </a> */}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button className="gap-2">
                  Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="text-sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="gap-2">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            AI-Powered Question Paper Generator
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-foreground mb-6 leading-tight animate-fade-in">
            Create Professional
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent block mt-2">
              Exam Papers in Minutes
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in">
            Upload your syllabus, set requirements, and let our AI generate
            perfectly formatted question papers with secure answer keys. Trusted
            by 500+ educators.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Link to="/auth">
              <Button
                size="lg"
                className="text-base px-8 py-6 gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                <BookOpen className="h-5 w-5" />
                Start Creating — Free
              </Button>
            </Link>
            {/* <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6 gap-2 hover:bg-muted/50 transition-all"
            >
              <Clock className="h-5 w-5" />
              Watch 2-min Demo
            </Button> */}
          </div>

          {/* <div className="flex items-center justify-center gap-6 mt-10 text-sm text-muted-foreground animate-fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" /> No credit card
              required
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" /> 5 papers free
            </span>
          </div> */}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-3 mb-4">
              Everything You Need to Create Perfect Exams
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Designed specifically for educators who want to save time without
              compromising quality.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="Smart PDF Processing"
              description="Upload any textbook, notes, or study material. Our AI extracts and understands content to generate relevant, curriculum-aligned questions."
              highlight="AI-Powered"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Secure Answer Keys"
              description="Answer keys are encrypted and accessible only to you. Students see only the question paper — keeping assessments fair and secure."
              highlight="Encrypted"
            />
            <FeatureCard
              icon={<Share2 className="h-6 w-6" />}
              title="Instant Sharing"
              description="Generate unique shareable links for each paper. Distribute via WhatsApp, email, or any LMS with a single click."
              highlight="One-Click"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-3 mb-4">
              From PDF to Exam in 3 Simple Steps
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              No complicated setup. No learning curve. Just upload and generate.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Step
              number="01"
              title="Upload Your Content"
              description="Drag and drop your textbook chapter, lecture notes, or any study material in PDF format."
              icon={<FileText className="h-5 w-5" />}
            />
            <Step
              number="02"
              title="Configure Your Paper"
              description="Select class, subject, total marks. Specify MCQs, short answers, and long answers as needed."
              icon={<Zap className="h-5 w-5" />}
            />
            <Step
              number="03"
              title="Generate & Share"
              description="AI creates your paper instantly. Share the unique link — students see questions only!"
              icon={<Share2 className="h-5 w-5" />}
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3),transparent_70%)]" />
        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <StatCard number="10,000+" label="Papers Generated" />
            <StatCard number="500+" label="Active Teachers" />
            <StatCard number="50+" label="Subjects Covered" />
            <StatCard number="99%" label="Satisfaction Rate" />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {/* <section id="testimonials" className="py-24 px-6 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-wider">
              Testimonials
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-3 mb-4">
              Loved by Educators Worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="QuestionIQ has saved me hours every week. The question quality is excellent and my students love the clean paper format."
              author="Dr. Priya Sharma"
              role="Physics Teacher, Delhi Public School"
            />
            <TestimonialCard
              quote="Finally, an AI tool that actually understands the curriculum. The MCQs are well-crafted and the answer security feature is brilliant."
              author="Rajesh Kumar"
              role="Mathematics HOD, KV School"
            />
            <TestimonialCard
              quote="I was skeptical at first, but the results speak for themselves. My paper preparation time dropped from 3 hours to 10 minutes!"
              author="Sarah Thompson"
              role="English Teacher, International Academy"
            />
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-gradient-to-br from-card to-muted/50 rounded-3xl p-10 md:p-16 text-center border border-border shadow-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Ready to Transform Your Exam Prep?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg max-w-xl mx-auto">
              Join thousands of educators saving hours every week. Create your
              first paper in under 5 minutes.
            </p>
            <Link to="/auth">
              <Button
                size="lg"
                className="text-base px-10 py-6 gap-2 shadow-lg"
              >
                Create Your First Paper — Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • 5 papers free forever
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 bg-muted/20">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-serif font-bold text-lg">QuestionIQ</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a
                href="#features"
                className="hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="hover:text-foreground transition-colors"
              >
                How it Works
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 QuestionIQ. Built by Dnyaneshwari Tarkase.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight: string;
}) => (
  <div className="group bg-card p-8 rounded-2xl border border-border hover:border-primary/30 shadow-sm hover:shadow-xl transition-all duration-300">
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-primary/10 p-3 rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
        {highlight}
      </span>
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const Step = ({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) => (
  <div className="text-center group">
    <div className="relative inline-flex items-center justify-center mb-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-lg group-hover:scale-105 transition-transform">
        {number}
      </div>
      <div className="absolute -bottom-2 -right-2 bg-background border border-border rounded-full p-2 shadow-sm">
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const StatCard = ({ number, label }: { number: string; label: string }) => (
  <div className="text-center">
    <div className="text-4xl md:text-5xl font-bold mb-2">{number}</div>
    <div className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">
      {label}
    </div>
  </div>
);

const TestimonialCard = ({
  quote,
  author,
  role,
}: {
  quote: string;
  author: string;
  role: string;
}) => (
  <div className="bg-card p-8 rounded-2xl border border-border hover:shadow-lg transition-shadow">
    <p className="text-foreground mb-6 leading-relaxed italic">"{quote}"</p>
    <div>
      <p className="font-semibold text-foreground">{author}</p>
      <p className="text-sm text-muted-foreground">{role}</p>
    </div>
  </div>
);

export default Index;
