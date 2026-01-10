import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize text content to remove null characters and non-printable chars
function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, '') // Remove null characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
    .replace(/\\u0000/g, '') // Remove escaped null characters
    .replace(/[\r\n]+/g, ' ') // Replace newlines with spaces for cleaner text
    .trim();
}

// Sanitize JSON string before parsing - more aggressive cleaning
function sanitizeJsonString(text: string): string {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/[\x00-\x1F\x7F]/g, (char) => {
      // Keep only valid whitespace characters
      if (char === '\n' || char === '\r' || char === '\t') {
        return char === '\t' ? ' ' : char;
      }
      return '';
    })
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

// Extract readable text from PDF content (basic extraction)
function extractTextFromPDF(content: string, startPage: number = 1, endPage: number = 999): string {
  // Split content by page markers and filter by page range
  const pagePattern = /\/Type\s*\/Page[^s]/g;
  const pages: string[] = [];
  let lastIndex = 0;
  let pageNum = 0;
  let match;
  
  // Find all page boundaries
  const pageIndices: number[] = [];
  while ((match = pagePattern.exec(content)) !== null) {
    pageIndices.push(match.index);
  }
  
  // Extract content for each page
  for (let i = 0; i < pageIndices.length; i++) {
    pageNum = i + 1;
    const start = pageIndices[i];
    const end = i < pageIndices.length - 1 ? pageIndices[i + 1] : content.length;
    
    // Only include pages in the specified range
    if (pageNum >= startPage && pageNum <= endPage) {
      const pageContent = content.substring(start, end);
      pages.push(pageContent);
    }
  }
  
  // If no page markers found, treat entire content as single page
  const contentToProcess = pages.length > 0 ? pages.join(' ') : content;
  
  // Remove binary data and extract readable strings
  const textMatches = contentToProcess.match(/[\x20-\x7E\s]{20,}/g) || [];
  let extractedText = textMatches.join(' ');
  
  // Try to extract text between stream markers
  const streamMatches = contentToProcess.match(/stream\s*([\s\S]*?)\s*endstream/g) || [];
  for (const streamMatch of streamMatches) {
    const streamContent = streamMatch.replace(/stream|endstream/g, '').trim();
    // Only include if it looks like readable text
    if (/^[\x20-\x7E\s]+$/.test(streamContent) && streamContent.length > 10) {
      extractedText += ' ' + streamContent;
    }
  }
  
  // Clean up the extracted text
  extractedText = sanitizeText(extractedText);
  
  // If we couldn't extract meaningful text, return a notice
  if (extractedText.length < 100) {
    return `Note: The PDF content from pages ${startPage}-${endPage} could not be fully extracted. Please ensure you're uploading a text-based PDF (not a scanned image).`;
  }
  
  console.log(`Extracted text from pages ${startPage}-${endPage}, length: ${extractedText.length}`);
  return extractedText;
}

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

    // Check if user is a teacher
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'teacher') {
      return new Response(JSON.stringify({ error: 'Only teachers can generate papers' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { pdfContent, className, subject, totalMarks, mcqCount, shortCount, longCount, startPage = 1, endPage = 999, paperType = 'printable', examLink = null, teacherSecretCode = null, examDuration = 60, showCorrectAnswers = false } = await req.json();

    if (!pdfContent || !className || !subject || !totalMarks) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Processing PDF for pages ${startPage} to ${endPage}`);
    
    // Extract and sanitize text from PDF (only from specified page range)
    const extractedText = extractTextFromPDF(pdfContent, startPage, endPage);
    console.log('Extracted text length:', extractedText.length);

    // For online exams, only generate MCQ questions
    const isOnlineExam = paperType === 'online';
    const actualMcqCount = isOnlineExam ? (mcqCount || 10) : mcqCount;
    const actualShortCount = isOnlineExam ? 0 : shortCount;
    const actualLongCount = isOnlineExam ? 0 : longCount;

    // Generate questions using AI
    const questionPrompt = isOnlineExam 
      ? `You are an experienced school teacher creating an ONLINE MCQ examination.

SYLLABUS CONTENT (FROM PAGES ${startPage} TO ${endPage} ONLY):
${extractedText.substring(0, 15000)}

EXAM REQUIREMENTS:
- Class: ${className}
- Subject: ${subject}
- Total Marks: ${totalMarks}
- MCQ Questions: Exactly ${actualMcqCount} questions
- This is an ONLINE exam - ONLY MCQ questions are allowed

STRICT RULES:
1. Generate EXACTLY ${actualMcqCount} MCQ questions
2. Each MCQ MUST have exactly 4 options labeled A), B), C), D)
3. Only ONE correct answer per question
4. All questions MUST be based on the provided syllabus content only
5. Use formal school examination language
6. Questions should be age-appropriate for the specified class
7. DO NOT include any answers in this response
8. DO NOT generate short or long answer questions - ONLY MCQ

OUTPUT FORMAT (JSON only, no markdown):
{
  "mcq": [
    { "number": 1, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "marks": 1 }
  ],
  "short": [],
  "long": [],
  "totalMarks": ${totalMarks}
}

Generate the MCQ question paper now:`
      : `You are an experienced school teacher creating an examination paper.

SYLLABUS CONTENT (FROM PAGES ${startPage} TO ${endPage} ONLY):
${extractedText.substring(0, 15000)}

EXAM REQUIREMENTS:
- Class: ${className}
- Subject: ${subject}
- Total Marks: ${totalMarks}
- MCQ Questions: Exactly ${mcqCount} questions
- Short Answer Questions: Exactly ${shortCount} questions  
- Long Answer Questions: Exactly ${longCount} questions
- Source: Pages ${startPage} to ${endPage} only

STRICT RULES:
1. Generate EXACTLY the specified number of questions for each type - no more, no less
2. All questions MUST be based on the provided syllabus content only
3. Use formal school examination language
4. Questions should be age-appropriate for the specified class
5. DO NOT include any answers in this response
6. Each question type should have appropriate marks allocated
7. If the syllabus content is unclear, create general questions for the subject and class level
8. For MCQs, each question MUST have exactly 4 options labeled A), B), C), D)

OUTPUT FORMAT (JSON only, no markdown):
{
  "mcq": [
    { "number": 1, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "marks": 1 }
  ],
  "short": [
    { "number": 1, "question": "...", "marks": 2 }
  ],
  "long": [
    { "number": 1, "question": "...", "marks": 5 }
  ],
  "totalMarks": ${totalMarks}
}

Generate the question paper now:`;

    console.log('Generating questions with AI...');
    const questionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert school teacher who creates examination papers. Always respond with valid JSON only, no markdown formatting.' },
          { role: 'user', content: questionPrompt }
        ],
      }),
    });

    if (!questionResponse.ok) {
      const errorText = await questionResponse.text();
      console.error('AI question generation error:', questionResponse.status, errorText);
      if (questionResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (questionResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Failed to generate questions');
    }

    const questionData = await questionResponse.json();
    const questionsText = questionData.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    let questions;
    try {
      // Clean the response using the sanitize function
      const cleanedText = sanitizeJsonString(questionsText);
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found');
      }
    } catch (parseError) {
      console.error('Failed to parse questions:', parseError, questionsText.substring(0, 500));
      throw new Error('Failed to parse AI response for questions');
    }

    // Generate answers in a separate AI call
    const answerPrompt = `Based on the following questions for ${subject} Class ${className}, provide the complete answer key.

QUESTIONS:
${JSON.stringify(questions, null, 2)}

SYLLABUS CONTENT FOR REFERENCE:
${extractedText.substring(0, 10000)}

Provide detailed answers in this JSON format (no markdown, pure JSON only):
{
  "mcq": [
    { "number": 1, "correctAnswer": "A", "explanation": "Brief explanation" }
  ],
  "short": [
    { "number": 1, "answer": "Complete answer text" }
  ],
  "long": [
    { "number": 1, "answer": "Detailed answer with all key points" }
  ]
}

Generate the answer key now:`;

    console.log('Generating answers with AI...');
    const answerResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert teacher providing answer keys. Always respond with valid JSON only, no markdown formatting.' },
          { role: 'user', content: answerPrompt }
        ],
      }),
    });

    if (!answerResponse.ok) {
      console.error('AI answer generation error:', answerResponse.status);
      throw new Error('Failed to generate answers');
    }

    const answerData = await answerResponse.json();
    const answersText = answerData.choices?.[0]?.message?.content || '';
    
    let answers;
    try {
      // Clean the response using the sanitize function
      const cleanedText = sanitizeJsonString(answersText);
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        answers = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found');
      }
    } catch (parseError) {
      console.error('Failed to parse answers:', parseError, answersText.substring(0, 500));
      throw new Error('Failed to parse answers');
    }

    // Sanitize the PDF content for storage (remove binary/null chars)
    const sanitizedPdfContent = sanitizeText(extractedText).substring(0, 50000);

    // Save question paper to database
    const { data: paper, error: paperError } = await supabaseClient
      .from('question_papers')
      .insert({
        teacher_id: user.id,
        class_name: className,
        subject: subject,
        total_marks: totalMarks,
        mcq_count: isOnlineExam ? actualMcqCount : mcqCount,
        short_count: actualShortCount,
        long_count: actualLongCount,
        questions: questions,
        pdf_content: sanitizedPdfContent,
        paper_type: paperType,
        exam_link: paperType === 'online' ? null : null, // Online exams use internal system, not external links
        teacher_secret_code: teacherSecretCode,
        exam_duration: isOnlineExam ? examDuration : null,
        show_correct_answers: isOnlineExam ? showCorrectAnswers : false,
      })
      .select()
      .single();

    if (paperError) {
      console.error('Error saving paper:', paperError);
      throw new Error('Failed to save question paper');
    }

    // Save answers separately (only teacher can access via RLS)
    const { error: answerError } = await supabaseClient
      .from('answers')
      .insert({
        paper_id: paper.id,
        teacher_id: user.id,
        answers: answers,
      });

    if (answerError) {
      console.error('Error saving answers:', answerError);
      throw new Error('Failed to save answers');
    }

    console.log('Paper generated successfully:', paper.paper_id);

    return new Response(JSON.stringify({
      success: true,
      paperId: paper.paper_id,
      questions: questions,
      shareableLink: `/paper/${paper.paper_id}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-paper:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
