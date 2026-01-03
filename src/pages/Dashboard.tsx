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
import { Upload, FileText, Loader2, Link2, LogOut, Eye, Copy, Check, Trash2 } from 'lucide-react';

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
}

export default function Dashboard() {
  const { user, role, signOut, loading: authLoading } = useAuth();
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'teacher') {
      fetchPapers();
    } else if (user && role === 'student') {
      setLoadingPapers(false);
    }
  }, [user, role]);

  const fetchPapers = async () => {
    try {
      const { data, error } = await supabase
        .from('question_papers')
        .select('id, paper_id, class_name, subject, total_marks, mcq_count, short_count, long_count, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPapers(data || []);
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

    // Read PDF as text (simplified - in production use a PDF parser)
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      // For demo, we'll use the raw content - in production, use a proper PDF parser
      setPdfContent(text.substring(0, 50000));
      
      // Estimate page count from PDF content
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
          shortCount: parseInt(shortCount),
          longCount: parseInt(longCount),
          startPage: parseInt(startPage) || 1,
          endPage: parseInt(endPage) || totalPages || 999,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Paper Generated!',
        description: 'Your question paper has been created successfully.',
      });

      // Refresh papers list
      fetchPapers();

      // Navigate to view the paper
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
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Student Dashboard</CardTitle>
              <CardDescription>
                Enter a paper link shared by your teacher to view the question paper.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Students can view question papers using the shareable links provided by teachers.
                Simply paste the link in your browser or ask your teacher for the paper link.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">MCQ</Label>
                    <Input
                      type="number"
                      value={mcqCount}
                      onChange={(e) => setMcqCount(e.target.value)}
                      min="0"
                    />
                  </div>
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
                </div>
              </div>

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
                          <h4 className="font-medium">
                            {paper.subject} - {paper.class_name}
                          </h4>
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
