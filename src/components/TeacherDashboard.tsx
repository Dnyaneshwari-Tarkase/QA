import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Loader2,
  Link2,
  LogOut,
  Eye,
  Copy,
  Check,
  Globe,
  Printer,
  Key,
  Timer,
  Users,
  BarChart3,
  Plus,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ExamLogo } from "./ExamLogo";
import { StudentResultsCard } from "./StudentResultsCard";

interface QuestionPaper {
  id: string;
  paper_id: string;
  class_name: string;
  subject: string;
  total_marks: number;
  mcq_count: number;
  short_count: number;
  long_count: number;
  created_at: string;
  paper_type: "printable" | "online";
  exam_link: string | null;
  teacher_secret_code: string | null;
}

interface TeacherDashboardProps {
  user: { id: string; email?: string } | null;
  secretCode: string | null;
  onSignOut: () => void;
}

export function TeacherDashboard({
  user,
  secretCode,
  onSignOut,
}: TeacherDashboardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfContent, setPdfContent] = useState("");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [mcqCount, setMcqCount] = useState("10");
  const [shortCount, setShortCount] = useState("5");
  const [longCount, setLongCount] = useState("3");
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("");
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSecretCode, setCopiedSecretCode] = useState(false);
  const [paperType, setPaperType] = useState<"printable" | "online">(
    "printable"
  );
  const [examDuration, setExamDuration] = useState("60");
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [activeTab, setActiveTab] = useState("results");

  useEffect(() => {
    if (user) {
      fetchTeacherPapers();
    }
  }, [user]);

  const fetchTeacherPapers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("question_papers")
        .select(
          "id, paper_id, class_name, subject, total_marks, mcq_count, short_count, long_count, created_at, paper_type, exam_link, teacher_secret_code"
        )
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPapers((data || []) as QuestionPaper[]);
    } catch (error) {
      console.error("Error fetching papers:", error);
    } finally {
      setLoadingPapers(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setPdfContent(text.substring(0, 50000));

      const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
      const estimatedPages = pageMatches ? pageMatches.length : 10;
      setTotalPages(estimatedPages);
      setStartPage("1");
      setEndPage(String(estimatedPages));

      toast({
        title: "PDF Uploaded",
        description: `File "${file.name}" loaded (estimated ${estimatedPages} pages).`,
      });
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!pdfContent) {
      toast({
        title: "No PDF Content",
        description: "Please upload a PDF file first.",
        variant: "destructive",
      });
      return;
    }

    if (!className || !subject) {
      toast({
        title: "Missing Information",
        description: "Please fill in class and subject.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-paper",
        {
          body: {
            pdfContent,
            className,
            subject,
            totalMarks: parseInt(totalMarks),
            mcqCount: parseInt(mcqCount),
            shortCount: paperType === "online" ? 0 : parseInt(shortCount),
            longCount: paperType === "online" ? 0 : parseInt(longCount),
            startPage: parseInt(startPage) || 1,
            endPage: parseInt(endPage) || totalPages || 999,
            paperType,
            examLink: null,
            teacherSecretCode: secretCode,
            examDuration:
              paperType === "online" ? parseInt(examDuration) : null,
            showCorrectAnswers:
              paperType === "online" ? showCorrectAnswers : false,
          },
        }
      );

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Paper Generated!",
        description:
          paperType === "online"
            ? "Online exam created! Share the link with students."
            : "Your question paper has been created successfully.",
      });

      fetchTeacherPapers();
      navigate(`/paper/${data.paperId}`);
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description:
          error instanceof Error ? error.message : "Failed to generate paper",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLink = async (paperId: string) => {
    const link = `${window.location.origin}/paper/${paperId}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(paperId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Link Copied",
      description: "Shareable link copied to clipboard.",
    });
  };

  const copySecretCode = async () => {
    if (secretCode) {
      await navigator.clipboard.writeText(secretCode);
      setCopiedSecretCode(true);
      setTimeout(() => setCopiedSecretCode(false), 2000);
      toast({
        title: "Secret Code Copied",
        description: "Share this code with your students.",
      });
    }
  };

  const onlinePapers = papers.filter((p) => p.paper_type === "online");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <ExamLogo size="md" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <span className="badge-teacher">Teacher</span>
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Secret Code Banner */}
        <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <Key className="h-4 w-4 text-primary" />
                </div>

                <div>
                  <p className="font-medium text-sm">Your Class Code</p>
                  <p className="text-xs text-muted-foreground">
                    Share with students to join your class
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-4 py-2 bg-card rounded-lg border border-primary/20 font-mono text-lg font-bold text-primary">
                  {secretCode || "Loading..."}
                </code>
                <Button variant="outline" size="icon" onClick={copySecretCode}>
                  {copiedSecretCode ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Results</span>
            </TabsTrigger>
            <TabsTrigger value="papers" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Papers</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </TabsTrigger>
          </TabsList>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-semibold">
                  Student Results
                </h2>
                <p className="text-sm text-muted-foreground">
                  Track student submissions and performance
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {onlinePapers.length} online exam
                {onlinePapers.length !== 1 ? "s" : ""}
              </div>
            </div>

            {loadingPapers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : onlinePapers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    No online exams yet. Create one to track student results.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setActiveTab("create")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Online Exam
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {onlinePapers.map((paper) => (
                  <StudentResultsCard
                    key={paper.id}
                    paperId={paper.id}
                    paperTitle={`${paper.subject} - ${paper.class_name}`}
                    totalMarks={paper.total_marks}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Papers Tab */}
          <TabsContent value="papers">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary" />
                  Your Papers
                </CardTitle>
                <CardDescription>
                  Manage and share your generated question papers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPapers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : papers.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      No papers generated yet.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => setActiveTab("create")}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Paper
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {papers.map((paper) => (
                      <div
                        key={paper.id}
                        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium">
                                {paper.subject} - {paper.class_name}
                              </h4>
                              {paper.paper_type === "online" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  <Globe className="h-3 w-3" />
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                  <Printer className="h-3 w-3" />
                                  Printable
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {paper.total_marks} marks • MCQ: {paper.mcq_count}
                              {paper.paper_type !== "online" &&
                                `, Short: ${paper.short_count}, Long: ${paper.long_count}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(paper.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyLink(paper.paper_id)}
                            >
                              {copiedId === paper.paper_id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(`/paper/${paper.paper_id}`)
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Generate Question Paper
                </CardTitle>
                <CardDescription>
                  Upload a PDF and configure your question paper settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* PDF Upload */}
                <div className="space-y-2">
                  <Label>Upload PDF (Syllabus/Notes)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {pdfContent
                          ? `PDF Loaded ✓ (${totalPages || "?"} pages)`
                          : "Click to upload PDF"}
                      </p>
                    </label>
                  </div>
                </div>

                {/* Page Range */}
                {pdfContent && (
                  <div className="space-y-2">
                    <Label>Page Range</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Start Page
                        </Label>
                        <Input
                          type="number"
                          value={startPage}
                          onChange={(e) => setStartPage(e.target.value)}
                          min="1"
                          max={totalPages || undefined}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          End Page
                        </Label>
                        <Input
                          type="number"
                          value={endPage}
                          onChange={(e) => setEndPage(e.target.value)}
                          min={parseInt(startPage) || 1}
                          max={totalPages || undefined}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Class & Subject */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={className} onValueChange={setClassName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(12)].map((_, i) => (
                          <SelectItem key={i + 1} value={`Class ${i + 1}`}>
                            Class {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      placeholder="e.g. Mathematics"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                </div>

                {/* Total Marks */}
                <div className="space-y-2">
                  <Label>Total Marks</Label>
                  <Input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                  />
                </div>

                {/* Question Counts */}
                <div className="space-y-3">
                  <Label>Question Limits</Label>
                  <div
                    className={`grid gap-4 ${
                      paperType === "online" ? "grid-cols-1" : "grid-cols-3"
                    }`}
                  >
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        MCQ
                      </Label>
                      <Input
                        type="number"
                        value={mcqCount}
                        onChange={(e) => setMcqCount(e.target.value)}
                        min="0"
                      />
                    </div>
                    {paperType !== "online" && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Short Answer
                          </Label>
                          <Input
                            type="number"
                            value={shortCount}
                            onChange={(e) => setShortCount(e.target.value)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Long Answer
                          </Label>
                          <Input
                            type="number"
                            value={longCount}
                            onChange={(e) => setLongCount(e.target.value)}
                            min="0"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {paperType === "online" && (
                    <p className="text-xs text-muted-foreground">
                      Online exams only support MCQ questions
                    </p>
                  )}
                </div>

                {/* Paper Type */}
                <div className="space-y-3">
                  <Label>Paper Type</Label>
                  <RadioGroup
                    value={paperType}
                    onValueChange={(value: "printable" | "online") =>
                      setPaperType(value)
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="printable" id="printable" />
                      <Label
                        htmlFor="printable"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Printer className="h-4 w-4" />
                        Printable
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="online" id="online" />
                      <Label
                        htmlFor="online"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Globe className="h-4 w-4" />
                        Online Exam
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Online Exam Settings */}
                {paperType === "online" && (
                  <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 text-primary">
                      <Timer className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        Online Exam Settings
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label>Exam Duration</Label>
                      <Select
                        value={examDuration}
                        onValueChange={setExamDuration}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                          <SelectItem value="90">90 minutes</SelectItem>
                          <SelectItem value="120">120 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Correct Answers</Label>
                        <p className="text-xs text-muted-foreground">
                          After submission
                        </p>
                      </div>
                      <Switch
                        checked={showCorrectAnswers}
                        onCheckedChange={setShowCorrectAnswers}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !pdfContent}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Paper...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Question Paper
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
