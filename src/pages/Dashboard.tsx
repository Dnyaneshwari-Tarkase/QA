import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, Eye, Key, Globe, Printer } from 'lucide-react';
import { TeacherDashboard } from '@/components/TeacherDashboard';
import { ExamLogo } from '@/components/ExamLogo';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

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
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'student' && secretCode) {
      fetchStudentPapers();
    } else if (user && role === 'student') {
      setLoadingPapers(false);
    }
  }, [user, role, secretCode]);

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

  // Teacher Dashboard - New enhanced version
  if (role === 'teacher') {
    return (
      <TeacherDashboard 
        user={user} 
        secretCode={secretCode} 
        onSignOut={handleSignOut} 
      />
    );
  }

  // Student Dashboard
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <ExamLogo size="md" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <span className="badge-student">Student</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {/* Secret Code Display */}
        <Card className="mb-6 bg-gradient-to-r from-accent/5 to-accent/10 border-accent/20">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Key className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm">Your Teacher's Class</p>
                  <p className="text-xs text-muted-foreground">Connected via secret code</p>
                </div>
              </div>
              <code className="px-4 py-2 bg-card rounded-lg border border-accent/20 font-mono font-bold text-accent">
                {secretCode || 'No code assigned'}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Papers List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Your Question Papers</CardTitle>
            <CardDescription>
              Question papers from your teacher
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">
                            {paper.subject} - {paper.class_name}
                          </h4>
                          {paper.paper_type === 'online' ? (
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