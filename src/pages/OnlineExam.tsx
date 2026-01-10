import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface MCQQuestion {
  number: number;
  question: string;
  options: string[];
  marks: number;
}

interface ExamResult {
  score: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  showCorrectAnswers: boolean;
  correctAnswers?: { number: number; correctAnswer: string }[];
}

export default function OnlineExam() {
  const { paperId } = useParams<{ paperId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [examTitle, setExamTitle] = useState('');
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [paperUuid, setPaperUuid] = useState<string | null>(null);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);

  // Security: Disable right-click and copy/paste
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast({
        title: 'Not Allowed',
        description: 'Right-click is disabled during the exam.',
        variant: 'destructive',
      });
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        title: 'Not Allowed',
        description: 'Copy/paste is disabled during the exam.',
        variant: 'destructive',
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'a')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toast]);

  // Security: Tab switch detection
  useEffect(() => {
    if (isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newCount = tabWarnings + 1;
        setTabWarnings(newCount);

        if (newCount >= 2) {
          toast({
            title: 'Exam Auto-Submitted',
            description: 'You switched tabs too many times. Your exam has been submitted.',
            variant: 'destructive',
          });
          handleSubmit(true);
        } else {
          toast({
            title: `Warning ${newCount}/2`,
            description: 'Switching tabs is not allowed. After 2 warnings, your exam will be auto-submitted.',
            variant: 'destructive',
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tabWarnings, isSubmitted]);

  // Timer
  useEffect(() => {
    if (isSubmitted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast({
            title: 'Time Up!',
            description: 'Your exam has been auto-submitted.',
            variant: 'destructive',
          });
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, timeRemaining]);

  // Auto-save answers
  const saveAnswers = useCallback(async () => {
    if (!attemptId || isSubmitted) return;

    try {
      await supabase
        .from('exam_attempts')
        .update({ 
          answers: Object.entries(answers).map(([num, ans]) => ({ number: parseInt(num), answer: ans })),
          time_remaining: timeRemaining,
          tab_switch_count: tabWarnings,
        })
        .eq('id', attemptId);
    } catch (error) {
      console.error('Error saving answers:', error);
    }
  }, [attemptId, answers, timeRemaining, tabWarnings, isSubmitted]);

  // Save every 30 seconds
  useEffect(() => {
    if (!attemptId || isSubmitted) return;
    const interval = setInterval(saveAnswers, 30000);
    return () => clearInterval(interval);
  }, [saveAnswers, attemptId, isSubmitted]);

  // Fetch exam data
  useEffect(() => {
    const fetchExam = async () => {
      if (!paperId || !user) return;

      try {
        // Get paper details
        const { data: paperData, error: paperError } = await supabase
          .from('question_papers')
          .select('*')
          .eq('paper_id', paperId);

        if (paperError) throw paperError;
        if (!paperData || paperData.length === 0) {
          toast({ title: 'Error', description: 'Exam not found.', variant: 'destructive' });
          navigate('/dashboard');
          return;
        }

        const paper = paperData[0] as any;
        
        if (paper.paper_type !== 'online') {
          toast({ title: 'Error', description: 'This is not an online exam.', variant: 'destructive' });
          navigate(`/paper/${paperId}`);
          return;
        }

        setPaperUuid(paper.id);
        setExamTitle(`${paper.subject} - ${paper.class_name}`);
        setShowCorrectAnswers(paper.show_correct_answers || false);

        const mcqQuestions = (paper.questions as any)?.mcq || [];
        
        // Shuffle options for each question
        const shuffledQuestions = mcqQuestions.map((q: MCQQuestion) => ({
          ...q,
          options: shuffleArray([...q.options]),
        }));
        
        setQuestions(shuffledQuestions);

        // Check for existing attempt
        const { data: existingAttempt } = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('paper_id', paper.id)
          .eq('student_id', user.id)
          .maybeSingle();

        if (existingAttempt) {
          if (existingAttempt.is_submitted) {
            setAlreadyAttempted(true);
            setIsSubmitted(true);
            setResult({
              score: existingAttempt.score || 0,
              correctCount: existingAttempt.correct_count || 0,
              wrongCount: existingAttempt.wrong_count || 0,
              totalQuestions: existingAttempt.total_questions || 0,
              showCorrectAnswers: paper.show_correct_answers || false,
            });
            setLoading(false);
            return;
          }
          
          // Resume existing attempt
          setAttemptId(existingAttempt.id);
          setTimeRemaining(existingAttempt.time_remaining || paper.exam_duration * 60);
          setTabWarnings(existingAttempt.tab_switch_count || 0);
          
          // Restore answers
          const savedAnswers = (existingAttempt.answers as any[]) || [];
          const answersMap: { [key: number]: string } = {};
          savedAnswers.forEach((a) => {
            if (a.number && a.answer) answersMap[a.number] = a.answer;
          });
          setAnswers(answersMap);
        } else {
          // Create new attempt
          const { data: newAttempt, error: attemptError } = await supabase
            .from('exam_attempts')
            .insert({
              paper_id: paper.id,
              student_id: user.id,
              time_remaining: (paper.exam_duration || 60) * 60,
              total_questions: mcqQuestions.length,
            })
            .select()
            .single();

          if (attemptError) throw attemptError;
          
          setAttemptId(newAttempt.id);
          setTimeRemaining((paper.exam_duration || 60) * 60);
        }
      } catch (error) {
        console.error('Error fetching exam:', error);
        toast({ title: 'Error', description: 'Failed to load exam.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchExam();
    } else if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [paperId, user, authLoading, navigate, toast]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleAnswerChange = (questionNumber: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionNumber]: answer }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!attemptId || !paperUuid || isSubmitted) return;

    try {
      setLoading(true);

      // Calculate score using edge function
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-exam`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attemptId,
            paperId: paperUuid,
            answers: Object.entries(answers).map(([num, ans]) => ({ number: parseInt(num), answer: ans })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit exam');
      }

      setResult(data);
      setIsSubmitted(true);

      toast({
        title: autoSubmit ? 'Exam Auto-Submitted' : 'Exam Submitted!',
        description: `Your score: ${data.score}/${data.totalQuestions * (questions[0]?.marks || 1)}`,
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast({ title: 'Error', description: 'Failed to submit exam.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Result screen
  if (isSubmitted && result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl font-serif">
              {alreadyAttempted ? 'Exam Already Completed' : 'Exam Submitted!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary mb-2">
                {result.score} / {result.totalQuestions * (questions[0]?.marks || 1)}
              </p>
              <p className="text-muted-foreground">Your Score</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{result.totalQuestions}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.correctCount}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.wrongCount}</p>
                <p className="text-xs text-muted-foreground">Wrong</p>
              </div>
            </div>

            {result.showCorrectAnswers && result.correctAnswers && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Correct Answers:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.correctAnswers.map((ans) => (
                    <div key={ans.number} className="flex justify-between p-2 bg-muted/50 rounded">
                      <span>Question {ans.number}</span>
                      <span className="font-medium">{ans.correctAnswer}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header with timer */}
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="font-serif font-semibold">{examTitle}</h1>
            <div className="flex items-center gap-4">
              {tabWarnings > 0 && (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings: {tabWarnings}/2
                </span>
              )}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                timeRemaining < 300 ? 'bg-destructive/20 text-destructive' : 'bg-primary/10 text-primary'
              }`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
              </div>
            </div>
          </div>
          <Progress value={(currentIndex + 1) / questions.length * 100} className="mt-2 h-1" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {currentQuestion && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-sm font-medium">{currentQuestion.marks} mark{currentQuestion.marks > 1 ? 's' : ''}</span>
              </div>
              <CardTitle className="text-lg leading-relaxed mt-2">
                {currentQuestion.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={answers[currentQuestion.number] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.number, value)}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                      answers[currentQuestion.number] === option
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                    onClick={() => handleAnswerChange(currentQuestion.number, option)}
                  >
                    <RadioGroupItem value={option} id={`option-${idx}`} />
                    <Label htmlFor={`option-${idx}`} className="cursor-pointer flex-1">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                {currentIndex === questions.length - 1 ? (
                  <Button onClick={() => handleSubmit(false)}>
                    Submit Exam
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>

              {/* Question navigation dots */}
              <div className="flex flex-wrap gap-2 justify-center pt-4">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                      idx === currentIndex
                        ? 'bg-primary text-primary-foreground'
                        : answers[questions[idx].number]
                        ? 'bg-green-500 text-white'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
