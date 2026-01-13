import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StudentResult {
  attempt_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  score: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  total_questions: number | null;
  submitted_at: string | null;
  is_submitted: boolean;
}

interface StudentResultsCardProps {
  paperId: string;
  paperTitle: string;
  totalMarks: number;
}

export function StudentResultsCard({ paperId, paperTitle, totalMarks }: StudentResultsCardProps) {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchResults();
  }, [paperId]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase.rpc('get_paper_results', {
        p_paper_id: paperId
      });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student results.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const submittedCount = results.filter(r => r.is_submitted).length;
  const averageScore = submittedCount > 0 
    ? Math.round(results.filter(r => r.is_submitted).reduce((sum, r) => sum + (r.score || 0), 0) / submittedCount * 100 / (results[0]?.total_questions || 1))
    : 0;

  if (loading) {
    return (
      <Card className="border-border/40 bg-card/50">
        <div className="flex items-center justify-center py-5">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Compact Header */}
      <div 
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{paperTitle}</h3>
            <p className="text-xs text-muted-foreground">
              {results.length} student{results.length !== 1 ? 's' : ''} • {totalMarks} marks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge 
            variant="outline" 
            className="h-7 px-2.5 text-xs font-medium bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/50"
          >
            <CheckCircle className="h-3 w-3 mr-1.5" />
            {submittedCount} submitted
          </Badge>
          <div className="p-1.5 hover:bg-muted/50 rounded-md transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </div>

      {expanded && (
        <CardContent className="p-0 border-t border-border/30">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-muted/10">
            <div className="flex flex-col items-center py-3 px-4 bg-card rounded-lg border border-border/40">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Users className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">Total</span>
              </div>
              <span className="text-xl font-bold">{results.length}</span>
            </div>
            <div className="flex flex-col items-center py-3 px-4 bg-green-50/80 dark:bg-green-950/20 rounded-lg border border-green-200/40 dark:border-green-800/30">
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500 mb-1">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">Submitted</span>
              </div>
              <span className="text-xl font-bold text-green-700 dark:text-green-400">{submittedCount}</span>
            </div>
            <div className="flex flex-col items-center py-3 px-4 bg-red-50/80 dark:bg-red-950/20 rounded-lg border border-red-200/40 dark:border-red-800/30">
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500 mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">Avg Score</span>
              </div>
              <span className="text-xl font-bold text-red-600 dark:text-red-400">{averageScore}%</span>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-y border-border/30">
            <div className="col-span-4">Student</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-center">Score</div>
            <div className="col-span-2 text-center hidden sm:block">Performance</div>
            <div className="col-span-2 text-right hidden md:block">Submitted</div>
          </div>

          {/* Student List */}
          {results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No students have started this exam yet.
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="divide-y divide-border/20">
                {results.map((result) => {
                  const percentage = result.is_submitted && result.total_questions 
                    ? Math.round((result.score || 0) / result.total_questions * 100) 
                    : 0;
                  
                  return (
                    <div 
                      key={result.attempt_id} 
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/10 transition-colors"
                    >
                      {/* Student Info */}
                      <div className="col-span-4 min-w-0">
                        <p className="font-medium text-sm truncate">{result.student_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.student_email}</p>
                      </div>

                      {/* Status */}
                      <div className="col-span-2 flex justify-center">
                        {result.is_submitted ? (
                          <Badge className="h-6 text-[11px] px-2 bg-green-100 text-green-700 hover:bg-green-100 border-0 dark:bg-green-900/40 dark:text-green-400 font-medium">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-6 text-[11px] px-2 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50 font-medium">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>

                      {/* Score */}
                      <div className="col-span-2 text-center">
                        {result.is_submitted ? (
                          <div>
                            <span className="font-bold text-base">
                              {result.score ?? 0}
                              <span className="text-xs text-muted-foreground font-normal">/{result.total_questions}</span>
                            </span>
                            <div className="flex items-center justify-center gap-2 mt-0.5">
                              <span className="text-[11px] text-green-600 dark:text-green-400 flex items-center font-medium">
                                <CheckCircle className="h-3 w-3 mr-0.5" />
                                {result.correct_count}
                              </span>
                              <span className="text-[11px] text-red-500 dark:text-red-400 flex items-center font-medium">
                                <XCircle className="h-3 w-3 mr-0.5" />
                                {result.wrong_count}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Performance Bar */}
                      <div className="col-span-2 hidden sm:flex items-center gap-2">
                        {result.is_submitted ? (
                          <>
                            <Progress value={percentage} className="h-2 flex-1" />
                            <span className="text-xs font-semibold w-9 text-right">{percentage}%</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-center w-full">—</span>
                        )}
                      </div>

                      {/* Submission Time */}
                      <div className="col-span-2 text-right hidden md:block">
                        <span className="text-xs text-muted-foreground">
                          {result.submitted_at 
                            ? new Date(result.submitted_at).toLocaleString(undefined, {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
}
