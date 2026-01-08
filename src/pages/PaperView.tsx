import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer, Eye, EyeOff, ArrowLeft, GraduationCap, ExternalLink, Globe } from 'lucide-react';

interface Question {
  number: number;
  question: string;
  options?: string[];
  marks: number;
}

interface Questions {
  mcq: Question[];
  short: Question[];
  long: Question[];
  totalMarks: number;
}

interface Answer {
  number: number;
  correctAnswer?: string;
  explanation?: string;
  answer?: string;
}

interface Answers {
  mcq: Answer[];
  short: Answer[];
  long: Answer[];
}

interface Paper {
  id: string;
  paper_id: string;
  class_name: string;
  subject: string;
  total_marks: number;
  questions: Questions;
  created_at: string;
  paper_type: 'printable' | 'online';
  exam_link: string | null;
}

export default function PaperView() {
  const { paperId } = useParams<{ paperId: string }>();
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [paper, setPaper] = useState<Paper | null>(null);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  useEffect(() => {
    if (paperId) {
      fetchPaper();
    }
  }, [paperId]);

  const fetchPaper = async () => {
    console.log('Fetching paper with paperId:', paperId);
    try {
      const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .eq('paper_id', paperId as string);

      console.log('Query result - data:', data, 'error:', error);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('No paper found for paperId:', paperId);
        setPaper(null);
        return;
      }
      
      const paperData = data[0] as unknown as {
        id: string;
        paper_id: string;
        class_name: string;
        subject: string;
        total_marks: number;
        questions: unknown;
        created_at: string;
        paper_type: string | null;
        exam_link: string | null;
      };
      
      setPaper({
        id: paperData.id,
        paper_id: paperData.paper_id,
        class_name: paperData.class_name,
        subject: paperData.subject,
        total_marks: paperData.total_marks,
        questions: paperData.questions as Questions,
        created_at: paperData.created_at,
        paper_type: (paperData.paper_type || 'printable') as 'printable' | 'online',
        exam_link: paperData.exam_link || null,
      });
    } catch (error) {
      console.error('Error fetching paper:', error);
      toast({
        title: 'Error',
        description: 'Failed to load question paper.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    if (!paperId || loadingAnswers || answers) return;
    
    setLoadingAnswers(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-answers?paperId=${paperId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch answers');
      }

      setAnswers(data.answers);
      setShowAnswers(true);
    } catch (error) {
      console.error('Error fetching answers:', error);
      toast({
        title: 'Access Denied',
        description: error instanceof Error ? error.message : 'Only the teacher who created this paper can view answers.',
        variant: 'destructive',
      });
    } finally {
      setLoadingAnswers(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Question paper not found.</p>
            <Button asChild className="mt-4">
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTeacher = role === 'teacher';
  const questions = paper.questions;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - hidden when printing */}
      <header className="border-b border-border bg-card no-print">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to={user ? '/dashboard' : '/'}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-xl font-bold font-serif">Question Paper</h1>
          </div>
          <div className="flex items-center gap-2">
            {isTeacher && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (showAnswers) {
                    setShowAnswers(false);
                  } else {
                    fetchAnswers();
                  }
                }}
                disabled={loadingAnswers}
              >
                {loadingAnswers ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : showAnswers ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Answers
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    View Answers
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </header>

      {/* Paper Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b border-border pb-6">
            <div className="flex justify-center mb-4">
              <GraduationCap className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif">{paper.subject}</CardTitle>
            <p className="text-muted-foreground">{paper.class_name}</p>
            <div className="flex justify-center gap-8 mt-4 text-sm">
              <span>Total Marks: <strong>{paper.total_marks}</strong></span>
              <span>Date: {new Date(paper.created_at).toLocaleDateString()}</span>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-8">
            {/* Online Exam Link - only shown to logged-in users for online papers */}
            {paper.paper_type === 'online' && paper.exam_link && (
              user ? (
                <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-primary">Online Exam</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Click the button below to access the online examination form.
                  </p>
                  <Button asChild>
                    <a href={paper.exam_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Exam Link
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Online Exam</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Please <a href="/auth" className="text-primary underline">log in</a> to access the online exam link.
                  </p>
                </div>
              )
            )}

            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">General Instructions:</h3>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Read all questions carefully before answering.</li>
                <li>All questions are compulsory.</li>
                <li>Write neat and legible answers.</li>
                <li>Marks are indicated against each question.</li>
              </ol>
            </div>

            {/* MCQ Section */}
            {questions.mcq && questions.mcq.length > 0 && (
              <div>
                <h2 className="text-xl font-serif font-semibold mb-4 border-l-4 border-primary pl-4">
                  Section A: Multiple Choice Questions
                </h2>
                <div className="space-y-6">
                  {questions.mcq.map((q, idx) => (
                    <div key={idx} className="animate-fade-in">
                      <p className="font-medium">
                        Q{q.number}. {q.question}
                        <span className="text-muted-foreground text-sm ml-2">[{q.marks} mark{q.marks > 1 ? 's' : ''}]</span>
                      </p>
                      {q.options && (
                        <div className="ml-6 mt-2 grid grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => (
                            <p key={optIdx} className="text-muted-foreground">{opt}</p>
                          ))}
                        </div>
                      )}
                      {showAnswers && answers?.mcq?.[idx] && (
                        <div className="ml-6 mt-2 p-3 bg-success/10 rounded border border-success/20">
                          <p className="text-sm font-medium text-success">
                            Answer: {answers.mcq[idx].correctAnswer}
                          </p>
                          {answers.mcq[idx].explanation && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {answers.mcq[idx].explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Short Answer Section */}
            {questions.short && questions.short.length > 0 && (
              <div>
                <h2 className="text-xl font-serif font-semibold mb-4 border-l-4 border-primary pl-4">
                  Section B: Short Answer Questions
                </h2>
                <div className="space-y-6">
                  {questions.short.map((q, idx) => (
                    <div key={idx} className="animate-fade-in">
                      <p className="font-medium">
                        Q{q.number}. {q.question}
                        <span className="text-muted-foreground text-sm ml-2">[{q.marks} marks]</span>
                      </p>
                      {showAnswers && answers?.short?.[idx] && (
                        <div className="ml-6 mt-2 p-3 bg-success/10 rounded border border-success/20">
                          <p className="text-sm font-medium text-success">Answer:</p>
                          <p className="text-sm text-foreground mt-1">
                            {answers.short[idx].answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Long Answer Section */}
            {questions.long && questions.long.length > 0 && (
              <div>
                <h2 className="text-xl font-serif font-semibold mb-4 border-l-4 border-primary pl-4">
                  Section C: Long Answer Questions
                </h2>
                <div className="space-y-6">
                  {questions.long.map((q, idx) => (
                    <div key={idx} className="animate-fade-in">
                      <p className="font-medium">
                        Q{q.number}. {q.question}
                        <span className="text-muted-foreground text-sm ml-2">[{q.marks} marks]</span>
                      </p>
                      {showAnswers && answers?.long?.[idx] && (
                        <div className="ml-6 mt-2 p-3 bg-success/10 rounded border border-success/20">
                          <p className="text-sm font-medium text-success">Answer:</p>
                          <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                            {answers.long[idx].answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">--- End of Question Paper ---</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
