import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { attemptId, paperId, answers } = await req.json();

    if (!attemptId || !paperId || !answers) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the answer key from answers table
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: answerData, error: answerError } = await supabaseAdmin
      .from('answers')
      .select('answers')
      .eq('paper_id', paperId)
      .single();

    if (answerError || !answerData) {
      console.error('Error fetching answers:', answerError);
      return new Response(JSON.stringify({ error: 'Could not find answer key' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get paper details for show_correct_answers flag
    const { data: paperData } = await supabaseAdmin
      .from('question_papers')
      .select('show_correct_answers, questions')
      .eq('id', paperId)
      .single();

    const correctAnswers = (answerData.answers as any)?.mcq || [];
    const studentAnswers = answers as { number: number; answer: string }[];
    
    let correctCount = 0;
    let wrongCount = 0;
    let score = 0;

    const mcqQuestions = (paperData?.questions as any)?.mcq || [];
    const marksPerQuestion = mcqQuestions[0]?.marks || 1;

    // Calculate score
    correctAnswers.forEach((ca: { number: number; correctAnswer: string }) => {
      const studentAnswer = studentAnswers.find(sa => sa.number === ca.number);
      
      if (studentAnswer) {
        // Extract just the letter from the correct answer (e.g., "A" from "A) Option text")
        const correctLetter = ca.correctAnswer.charAt(0).toUpperCase();
        const studentLetter = studentAnswer.answer.charAt(0).toUpperCase();

        if (correctLetter === studentLetter) {
          correctCount++;
          score += marksPerQuestion;
        } else {
          wrongCount++;
        }
      } else {
        wrongCount++; // Unanswered counts as wrong
      }
    });

    const totalQuestions = correctAnswers.length;

    // Update attempt with results
    const { error: updateError } = await supabaseClient
      .from('exam_attempts')
      .update({
        is_submitted: true,
        submitted_at: new Date().toISOString(),
        answers: answers,
        score,
        correct_count: correctCount,
        wrong_count: wrongCount,
        total_questions: totalQuestions,
      })
      .eq('id', attemptId)
      .eq('student_id', user.id);

    if (updateError) {
      console.error('Error updating attempt:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to save results' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response: any = {
      score,
      correctCount,
      wrongCount,
      totalQuestions,
      showCorrectAnswers: paperData?.show_correct_answers || false,
    };

    // Include correct answers if teacher enabled it
    if (paperData?.show_correct_answers) {
      response.correctAnswers = correctAnswers.map((ca: { number: number; correctAnswer: string }) => ({
        number: ca.number,
        correctAnswer: ca.correctAnswer,
      }));
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in submit-exam:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
