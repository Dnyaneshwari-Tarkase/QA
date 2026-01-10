import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2, Link2, LogOut, Eye, Copy, Check, Trash2, Globe, Printer, Key, Timer } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

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

export default function Dashboard() {
  const { user, role, secretCode, signOut, loading: authLoading } = useAuth();
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
  const [examLink, setExamLink] = useState('');
  const [examDuration, setExamDuration] = useState('60');
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'teacher') {
      fetchTeacherPapers();
    } else if (user && role === 'student' && secretCode) {
      fetchStudentPapers();
    } else if (user && role === 'student') {
      setLoadingPapers(false);
    }
  }, [user, role, secretCode]);

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

  const fetchStudentPapers = async () => {
    if (!secretCode) return;
    
    try {
      const { data, error } = await supabase
        .from('question_papers')
        .select('id, paper_id, class_name, subject, total_marks, mcq_count, short_count, long_count, created_at, paper_type, exam_link, teacher_secret_code')
        .eq('teacher_secret_code', secretCode)
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Student Dashboard
  if (role === 'student') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold font-serif">ExamPaper Pro</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <span className="badge-student">Student</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {/* Secret Code Display */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Your Teacher's Class
              </CardTitle>
              <CardDescription>
                You are connected to your teacher using their secret code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Key className="h-4 w-4 text-muted-foreground" />
                <code className="font-mono text-sm">{secretCode || 'No code assigned'}</code>
              </div>
            </CardContent>
          </Card>

          {/* Papers List for Students */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Your Question Papers</CardTitle>
              <CardDescription>
                Question papers from your teacher are displayed here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPapers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : papers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No papers available yet. Check back later!
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {papers.map((paper) => (
                    <div
                      key={paper.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (paper.paper_type === 'online') {
                          navigate(`/exam/${paper.paper_id}`);
                        } else {
                          navigate(`/paper/${paper.paper_id}`);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {paper.subject} - {paper.class_name}
                            </h4>
                            {paper.paper_type === 'online' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                <Globe className="h-3 w-3" />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                <Printer className="h-3 w-3" />
                                Printable
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {paper.total_marks} marks • MCQ: {paper.mcq_count}, Short: {paper.short_count}, Long: {paper.long_count}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(paper.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (paper.paper_type === 'online') {
                              navigate(`/exam/${paper.paper_id}`);
                            } else {
                              navigate(`/paper/${paper.paper_id}`);
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Teacher Dashboard
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold font-serif">ExamPaper Pro</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <span className="badge-teacher">Teacher</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Secret Code Display for Teacher */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Your Secret Code
            </CardTitle>
            <CardDescription>
              Share this code with your students so they can access your papers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <Key className="h-4 w-4 text-primary" />
                <code className="font-mono text-lg font-bold text-primary">{secretCode || 'Loading...'}</code>
              </div>
              <Button variant="outline" size="icon" onClick={copySecretCode}>
                {copiedSecretCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Students need this code to sign up and view your papers.
            </p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Generate Paper Section */}
          <Card className="h-fit">
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
                      {pdfContent ? `PDF Loaded ✓ (${totalPages || '?'} pages)` : 'Click to upload PDF'}
                    </p>
                  </label>
                </div>
              </div>

              {/* Page Range Selection */}
              {pdfContent && (
                <div className="space-y-2">
                  <Label>Page Range (Generate questions from these pages only)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Start Page</Label>
                      <Input
                        type="number"
                        value={startPage}
                        onChange={(e) => setStartPage(e.target.value)}
                        min="1"
                        max={totalPages || undefined}
                        placeholder="1"
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
                        placeholder={String(totalPages || '')}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Questions will be generated from pages {startPage || 1} to {endPage || totalPages || '?'}
                  </p>
                </div>
              )}

              {/* Class & Subject */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
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
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g. Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>

              {/* Total Marks */}
              <div className="space-y-2">
                <Label htmlFor="total-marks">Total Marks</Label>
                <Input
                  id="total-marks"
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                />
              </div>

              {/* Question Limits */}
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
                  <p className="text-xs text-muted-foreground">
                    Online exams only support MCQ questions
                  </p>
                )}
              </div>

              {/* Paper Type Selection */}
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
                      Printable Paper
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

              {/* Exam Settings (only shown for online papers) */}
              {paperType === 'online' && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Timer className="h-4 w-4" />
                    <span className="font-medium text-sm">Online Exam Settings</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="exam-duration">Exam Duration (minutes)</Label>
                    <Select value={examDuration} onValueChange={setExamDuration}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
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
                    <div className="space-y-0.5">
                      <Label htmlFor="show-answers">Show Correct Answers</Label>
                      <p className="text-xs text-muted-foreground">
                        Students can see correct answers after submission
                      </p>
                    </div>
                    <Switch
                      id="show-answers"
                      checked={showCorrectAnswers}
                      onCheckedChange={setShowCorrectAnswers}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    • Timer starts when student opens the exam<br />
                    • Tab switching triggers warnings (auto-submit after 2)<br />
                    • Each student can only attempt once
                  </p>
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
                  'Generate Question Paper'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Papers List */}
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
                <p className="text-center text-muted-foreground py-8">
                  No papers generated yet. Create your first question paper!
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {papers.map((paper) => (
                    <div
                      key={paper.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {paper.subject} - {paper.class_name}
                            </h4>
                            {paper.paper_type === 'online' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                <Globe className="h-3 w-3" />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                <Printer className="h-3 w-3" />
                                Printable
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {paper.total_marks} marks • MCQ: {paper.mcq_count}, Short: {paper.short_count}, Long: {paper.long_count}
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
                            onClick={() => navigate(`/paper/${paper.paper_id}`)}
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
        </div>
      </main>
    </div>
  );
}