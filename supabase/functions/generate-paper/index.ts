import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Set up PDF.js worker - use unpkg for better reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.js`;

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

// Extract readable text from PDF content using PDF.js - OPTIMIZED for speed
async function extractTextFromPDF(pdfContent: string, startPage: number = 1, endPage: number = 1000): Promise<string> {
  try {
    // Check content size - reject if too large (>50MB base64 for 1000+ pages)
    if (pdfContent.length > 50 * 1024 * 1024) {
      console.error('PDF content too large:', pdfContent.length);
      return fallbackExtractText(pdfContent.substring(0, 1000000), startPage, endPage);
    }

    let pdfData: Uint8Array;
    
    try {
      // Decode base64 to binary
      const binaryString = atob(pdfContent);
      pdfData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pdfData[i] = binaryString.charCodeAt(i);
      }
    } catch (decodeError) {
      console.warn('Base64 decode failed, using fallback extraction');
      return fallbackExtractText(pdfContent, startPage, endPage);
    }

    // Load PDF document with timeout
    const pdf = await Promise.race([
      pdfjsLib.getDocument({ data: pdfData }).promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF parsing timeout')), 30000)
      )
    ]);
    
    const maxPages = Math.min(pdf.numPages, endPage);
    const minPage = Math.max(1, startPage);
    
    let extractedText = '';
    let totalLength = 0;
    const maxLength = 100000; // Limit extracted text to 100K chars for 1000+ pages

    // Extract text from each page with early exit
    for (let pageNum = minPage; pageNum <= maxPages; pageNum++) {
      if (totalLength >= maxLength) break; // Stop if we have enough text
      
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract and join text items
        const pageText = textContent.items
          .map((item: any) => {
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .filter((s: string) => s.length > 0)
          .join(' ');
        
        if (pageText.trim().length > 0) {
          extractedText += pageText + ' ';
          totalLength += pageText.length;
        }
      } catch (pageError) {
        console.warn(`Failed to extract text from page ${pageNum}:`, pageError);
        // Continue with next page
      }
    }

    // Clean up the extracted text
    extractedText = sanitizeText(extractedText);

    // If we couldn't extract meaningful text, try fallback
    if (extractedText.length < 50) {
      console.warn('PDF.js extraction too short, trying fallback');
      extractedText = fallbackExtractText(pdfContent.substring(0, 500000), startPage, endPage);
    }

    if (extractedText.length < 20) {
      return `Note: Could not extract text from pages ${startPage}-${maxPages}. Please ensure the PDF is text-based (not scanned images).`;
    }

    console.log(`Extracted ${extractedText.length} chars from pages ${startPage}-${maxPages}`);
    return extractedText;
  } catch (error) {
    console.error('PDF.js extraction error:', error);
    // Fallback to basic extraction
    return fallbackExtractText(pdfContent.substring(0, 500000), startPage, endPage);
  }
}

// Fallback text extraction for when PDF.js fails - OPTIMIZED for speed
function fallbackExtractText(content: string, startPage: number = 1, endPage: number = 1000): string {
  try {
    const textMatches: string[] = [];
    let charCount = 0;
    const maxChars = 30000;
    
    // Match content between BT (begin text) and ET (end text) markers
    const btEtPattern = /BT\s*([\s\S]{0,5000}?)\s*ET/g;
    let match;
    
    while ((match = btEtPattern.exec(content)) !== null && charCount < maxChars) {
      const textStream = match[1];
      // Extract string literals
      const stringPattern = /\((.*?)\)/g;
      let stringMatch;
      while ((stringMatch = stringPattern.exec(textStream)) !== null && charCount < maxChars) {
        const text = stringMatch[1];
        // Only include readable text
        if (text.length > 3 && /[\x20-\x7E]/.test(text)) {
          textMatches.push(text);
          charCount += text.length;
        }
      }
    }

    let extractedText = textMatches.join(' ');
    
    // If still minimal, try simpler pattern
    if (extractedText.length < 50 && charCount < maxChars) {
      const simpleStringPattern = /\(([^\)]{5,200})\)/g;
      const allStrings: string[] = [];
      let stringMatch;
      while ((stringMatch = simpleStringPattern.exec(content)) !== null && charCount < maxChars) {
        const text = stringMatch[1];
        if (/[\x20-\x7E]/.test(text) && text.length > 5) {
          allStrings.push(text);
          charCount += text.length;
        }
      }
      extractedText = allStrings.join(' ');
    }

    return sanitizeText(extractedText);
  } catch (error) {
    console.error('Fallback extraction error:', error);
    return '';
  }
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

    const { pdfContent, className, subject, totalMarks, mcqCount, shortCount, longCount, startPage = 1, endPage = 1000, paperType = 'printable', examLink = null, teacherSecretCode = null, examDuration = 60, showCorrectAnswers = false } = await req.json();

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
${extractedText.substring(0, 5000)}

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
${extractedText.substring(0, 5000)}

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
    
    // Add 60 second timeout for faster response
    const questionResponse = await Promise.race([
      fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Generate examination questions in valid JSON format only. No markdown, no explanations.' },
            { role: 'user', content: questionPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI question generation timeout after 60 seconds')), 60000)
      )
    ]) as Response;

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

    // Sanitize the PDF content for storage (remove binary/null chars)
    const sanitizedPdfContent = sanitizeText(extractedText).substring(0, 50000);

    // Save question paper to database IMMEDIATELY (without waiting for answers)
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
        exam_link: paperType === 'online' ? null : null,
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

    // Return success immediately with questions - don't wait for answers
    console.log('Paper generated successfully:', paper.paper_id);
    
    // Generate answers asynchronously in background (non-blocking)
    generateAnswersAsync(supabaseClient, paper.id, user.id, subject, className, questions, extractedText)
      .catch(err => console.error('Async answer generation failed:', err));

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

// Async function to generate answers without blocking user response
async function generateAnswersAsync(
  supabaseClient: any,
  paperId: string,
  teacherId: string,
  subject: string,
  className: string,
  questions: any,
  extractedText: string
): Promise<void> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return;

    const answerPrompt = `Based on the following questions for ${subject} Class ${className}, provide the complete answer key.

QUESTIONS:
${JSON.stringify(questions, null, 2).substring(0, 3000)}

SYLLABUS CONTENT FOR REFERENCE:
${extractedText.substring(0, 5000)}

Provide answers in this JSON format (no markdown, pure JSON):
{
  "mcq": [
    { "number": 1, "correctAnswer": "A" }
  ],
  "short": [
    { "number": 1, "answer": "..." }
  ],
  "long": [
    { "number": 1, "answer": "..." }
  ]
}`;

    console.log('Generating answers asynchronously...');

    const answerResponse = await Promise.race([
      fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Generate answer keys in valid JSON format only.' },
            { role: 'user', content: answerPrompt }
          ],
          temperature: 0.5,
          max_tokens: 1500,
        }),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 60000)
      )
    ]);

    if (!answerResponse.ok) {
      console.warn('Answer generation failed:', answerResponse.status);
      return;
    }

    const answerData = await answerResponse.json();
    const answersText = answerData.choices?.[0]?.message?.content || '';
    
    let answers;
    try {
      const cleanedText = sanitizeJsonString(answersText);
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        answers = JSON.parse(jsonMatch[0]);
      } else {
        return;
      }
    } catch {
      console.warn('Failed to parse answers');
      return;
    }

    // Save answers to database
    await supabaseClient
      .from('answers')
      .insert({
        paper_id: paperId,
        teacher_id: teacherId,
        answers: answers,
      });

    console.log('Answers generated and saved asynchronously');
  } catch (error) {
    console.warn('Async answer generation error:', error);
    // Don't throw - just log warning, answers can be generated later
  }
}
