import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
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
  Plus
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ExamLogo } from './ExamLogo';
import { StudentResultsCard } from './StudentResultsCard';

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
  paper_type: 'printable' | 'online';
  exam_link: string | null;
  teacher_secret_code: string | null;
}

interface TeacherDashboardProps {
  user: { id: string; email?: string } | null;
  secretCode: string | null;
  onSignOut: () => void;
}

export function TeacherDashboard({ user, secretCode, onSignOut }: TeacherDashboardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfContent, setPdfContent] = useState('');
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [mcqCount, setMcqCount] = useState('10');
  const [shortCount, setShortCount] = useState('5');
  const [longCount, setLongCount] = useState('3');
  const [startPage, setStartPage] = useState('1');
  const [endPage, setEndPage] = useState('');
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSecretCode, setCopiedSecretCode] = useState(false);
  const [paperType, setPaperType] = useState<'printable' | 'online'>('printable');
  const [examDuration, setExamDuration] = useState('60');
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [activeTab, setActiveTab] = useState('results');

  useEffect(() => {
    if (user) {
      fetchTeacherPapers();
    }
  }, [user]);

  const fetchTeacherPapers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('question_papers')
        .select('id, paper_id, class_name, subject, total_marks, mcq_count, short_count, long_count, created_at, paper_type, exam_link, teacher_secret_code')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPapers((data || []) as QuestionPaper[]);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoadingPapers(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid File',
        description: 'Please upload a PDF file.',
        variant: 'destructive',
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
      setStartPage('1');
      setEndPage(String(estimatedPages));
      
      toast({
        title: 'PDF Uploaded',
        description: `File "${file.name}" loaded (estimated ${estimatedPages} pages).`,
      });
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!pdfContent) {
      toast({
        title: 'No PDF Content',
        description: 'Please upload a PDF file first.',
        variant: 'destructive',
      });
      return;
    }

    if (!className || !subject) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in class and subject.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-paper', {
        body: {
          pdfContent,
          className,
          subject,
          totalMarks: parseInt(totalMarks),
          mcqCount: parseInt(mcqCount),
          shortCount: paperType === 'online' ? 0 : parseInt(shortCount),
          longCount: paperType === 'online' ? 0 : parseInt(longCount),
          startPage: parseInt(startPage) || 1,
          endPage: parseInt(endPage) || totalPages || 999,
          paperType,
          examLink: null,
          teacherSecretCode: secretCode,
          examDuration: paperType === 'online' ? parseInt(examDuration) : null,
          showCorrectAnswers: paperType === 'online' ? showCorrectAnswers : false,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Paper Generated!',
        description: paperType === 'online' 
          ? 'Online exam created! Share the link with students.'
          : 'Your question paper has been created successfully.',
      });

      fetchTeacherPapers();
      navigate(`/paper/${data.paperId}`);
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate paper',
        variant: 'destructive',
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
      title: 'Link Copied',
      description: 'Shareable link copied to clipboard.',
    });
  };

  const copySecretCode = async () => {
    if (secretCode) {
      await navigator.clipboard.writeText(secretCode);
      setCopiedSecretCode(true);
      setTimeout(() => setCopiedSecretCode(false), 2000);
      toast({
        title: 'Secret Code Copied',
        description: 'Share this code with your students.',
      });
    }
  };

  const onlinePapers = papers.filter(p => p.paper_type === 'online');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Compact Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
          <ExamLogo size="md" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[150px]">{user?.email}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">Teacher</span>
            <Button variant="ghost" size="sm" onClick={onSignOut} className="h-8 px-2">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-5xl">
        {/* Compact Secret Code Card */}
        <div className="mb-4 p-3 bg-card/90 backdrop-blur-sm border border-border/40 rounded-xl shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center shrink-0">
                <Key className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Class Code</p>
                <p className="text-[11px] text-muted-foreground/70 hidden sm:block">Share with students</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <code className="px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/20 font-mono text-sm font-semibold text-primary tracking-wide">
                {secretCode || '...'}
              </code>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copySecretCode}>
                {copiedSecretCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Compact Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="h-9 p-0.5 bg-muted/40 border border-border/30 rounded-lg w-fit gap-0.5">
            <TabsTrigger value="results" className="h-8 px-3 text-xs rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Results</span>
            </TabsTrigger>
            <TabsTrigger value="papers" className="h-8 px-3 text-xs rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span>Papers</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="h-8 px-3 text-xs rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Create</span>
            </TabsTrigger>
          </TabsList>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-3 mt-0">
            <div className="flex items-center justify-between py-1">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Student Results</h2>
                <p className="text-xs text-muted-foreground">Track submissions and performance</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                <Users className="h-3 w-3" />
                <span>{onlinePapers.length} exam{onlinePapers.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {loadingPapers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : onlinePapers.length === 0 ? (
              <div className="bg-card/80 border border-dashed border-border/50 rounded-xl p-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No online exams yet</p>
                <Button size="sm" onClick={() => setActiveTab('create')} className="h-8 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create Online Exam
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
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
          <TabsContent value="papers" className="mt-0">
            <div className="bg-card/90 backdrop-blur-sm border border-border/40 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Your Papers</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Manage and share question papers</p>
              </div>
              
              {loadingPapers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : papers.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No papers generated yet</p>
                  <Button size="sm" onClick={() => setActiveTab('create')} className="h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create Your First Paper
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="divide-y divide-border/20">
                    {papers.map((paper) => (
                      <div
                        key={paper.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-medium truncate">
                              {paper.subject} - {paper.class_name}
                            </h4>
                            {paper.paper_type === 'online' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                                <Globe className="h-2.5 w-2.5" />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                <Printer className="h-2.5 w-2.5" />
                                Print
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {paper.total_marks} marks • MCQ: {paper.mcq_count}
                            {paper.paper_type !== 'online' && ` • Short: ${paper.short_count} • Long: ${paper.long_count}`}
                            <span className="mx-1.5">•</span>
                            {new Date(paper.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(paper.paper_id)}>
                            {copiedId === paper.paper_id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/paper/${paper.paper_id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create" className="mt-0">
            <div className="bg-card/90 backdrop-blur-sm border border-border/40 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Generate Question Paper</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Upload PDF and configure settings</p>
              </div>
              
              <div className="p-4 space-y-4">
                {/* PDF Upload */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Upload PDF</Label>
                  <div className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center hover:border-primary/40 transition-colors bg-muted/20">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground/60 mb-1.5" />
                      <p className="text-xs text-muted-foreground">
                        {pdfContent ? `PDF Loaded ✓ (${totalPages || '?'} pages)` : 'Click to upload PDF'}
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
                        <Label className="text-xs text-muted-foreground">Start Page</Label>
                        <Input
                          type="number"
                          value={startPage}
                          onChange={(e) => setStartPage(e.target.value)}
                          min="1"
                          max={totalPages || undefined}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">End Page</Label>
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
                  <div className={`grid gap-4 ${paperType === 'online' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">MCQ</Label>
                      <Input
                        type="number"
                        value={mcqCount}
                        onChange={(e) => setMcqCount(e.target.value)}
                        min="0"
                      />
                    </div>
                    {paperType !== 'online' && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Short Answer</Label>
                          <Input
                            type="number"
                            value={shortCount}
                            onChange={(e) => setShortCount(e.target.value)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Long Answer</Label>
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
                  {paperType === 'online' && (
                    <p className="text-xs text-muted-foreground">Online exams only support MCQ questions</p>
                  )}
                </div>

                {/* Paper Type */}
                <div className="space-y-3">
                  <Label>Paper Type</Label>
                  <RadioGroup 
                    value={paperType} 
                    onValueChange={(value: 'printable' | 'online') => setPaperType(value)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="printable" id="printable" />
                      <Label htmlFor="printable" className="flex items-center gap-2 cursor-pointer">
                        <Printer className="h-4 w-4" />
                        Printable
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="online" id="online" />
                      <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer">
                        <Globe className="h-4 w-4" />
                        Online Exam
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Online Exam Settings */}
                {paperType === 'online' && (
                  <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 text-primary">
                      <Timer className="h-4 w-4" />
                      <span className="font-medium text-sm">Online Exam Settings</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Exam Duration</Label>
                      <Select value={examDuration} onValueChange={setExamDuration}>
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
                        <p className="text-xs text-muted-foreground">After submission</p>
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
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
