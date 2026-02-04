import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  TrendingUp,
  Award
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
  const pendingCount = results.length - submittedCount;
  const averageScore = submittedCount > 0 
    ? Math.round(results.filter(r => r.is_submitted).reduce((sum, r) => sum + (r.score || 0), 0) / submittedCount * 100 / (results[0]?.total_questions || 1))
    : 0;

  if (loading) {
    return (
      <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/90 backdrop-blur-sm border border-border/40 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Compact Header */}
      <button 
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center shrink-0">
            <Award className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left min-w-0">
            <h3 className="text-sm font-semibold truncate text-foreground">{paperTitle}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{results.length} students</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span>{totalMarks} marks</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Stats Badges */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle className="h-3 w-3" />
              {submittedCount}
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                {pendingCount}
              </span>
            )}
          </div>
          <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${expanded ? 'bg-muted' : 'hover:bg-muted/50'}`}>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border/30 animate-fade-in">
          {/* Mini Stats Row */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted/20">
            <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border/30">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total</p>
                <p className="text-base font-bold">{results.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/80 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/30 dark:border-emerald-800/30">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80 font-medium">Done</p>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{submittedCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-primary/70 font-medium">Avg</p>
                <p className="text-base font-bold text-primary">{averageScore}%</p>
              </div>
            </div>
          </div>

          {/* Compact Table */}
          {results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No students have started this exam yet.
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-1 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-y border-border/20">
                <div className="col-span-5 md:col-span-4">Student</div>
                <div className="col-span-3 md:col-span-2 text-center">Status</div>
                <div className="col-span-4 md:col-span-3 text-center">Score</div>
                <div className="hidden md:block col-span-3 text-right">Time</div>
              </div>

              {/* Scrollable List */}
              <ScrollArea className="max-h-[280px]">
                <div className="divide-y divide-border/10">
                  {results.map((result, index) => {
                    const percentage = result.is_submitted && result.total_questions 
                      ? Math.round((result.score || 0) / result.total_questions * 100) 
                      : 0;
                    
                    return (
                      <div 
                        key={result.attempt_id} 
                        className="grid grid-cols-12 gap-1 px-4 py-2.5 items-center hover:bg-muted/20 transition-colors"
                        style={{ animationDelay: `${index * 20}ms` }}
                      >
                        {/* Student */}
                        <div className="col-span-5 md:col-span-4 min-w-0">
                          <p className="text-sm font-medium truncate">{result.student_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{result.student_email}</p>
                        </div>

                        {/* Status */}
                        <div className="col-span-3 md:col-span-2 flex justify-center">
                          {result.is_submitted ? (
                            <Badge className="h-5 text-[10px] px-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 dark:bg-emerald-900/40 dark:text-emerald-400 font-medium">
                              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                              Done
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 text-[10px] px-1.5 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50 font-medium">
                              <Clock className="h-2.5 w-2.5 mr-0.5" />
                              Pending
                            </Badge>
                          )}
                        </div>

                        {/* Score */}
                        <div className="col-span-4 md:col-span-3">
                          {result.is_submitted ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold">{result.score ?? 0}</span>
                                  <span className="text-[10px] text-muted-foreground">/{result.total_questions}</span>
                                </div>
                                <Progress value={percentage} className="h-1 mt-1" />
                              </div>
                              <div className="flex gap-1 text-[10px] shrink-0">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{result.correct_count}✓</span>
                                <span className="text-red-500 dark:text-red-400 font-medium">{result.wrong_count}✗</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-center block">—</span>
                          )}
                        </div>

                        {/* Time */}
                        <div className="hidden md:block col-span-3 text-right">
                          <span className="text-[11px] text-muted-foreground">
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
