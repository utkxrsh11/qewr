import { Type, ThinkingLevel } from '@google/genai';
import { ai } from './gemini.ts';
import { Concept, Question } from '../src/types/course.ts';
import { validateAndCleanQuestions, shuffleQuestionsWithProgression } from '../src/services/questionValidator.ts';
import { generateFallbackQuestions } from '../src/services/fallbackQuestionGenerator.ts';

const QUESTIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    levelId: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      description: 'Exam-style multiple choice questions testing the provided concepts',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Question id such as ch1-L1-q1' },
          conceptId: { type: Type.STRING, description: 'Matching concept id' },
          difficulty: {
            type: Type.STRING,
            enum: ['easy', 'medium', 'hard'],
            description: 'Difficulty tier: easy, medium, or hard',
          },
          question: { type: Type.STRING, description: 'Concise question under 200 characters' },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Exactly 3 plausible answer options under 80 characters each',
          },
          correctIndex: {
            type: Type.INTEGER,
            description: 'Zero-based index (0, 1, or 2) of the correct option',
          },
          explanation: {
            type: Type.STRING,
            description: '1 to 3 sentences explaining why the correct answer is right and distractors wrong',
          },
          page: { type: Type.INTEGER, description: 'Exact page number from concept' },
          sourceQuote: { type: Type.STRING, description: 'Exact source quote from concept' },
        },
        required: [
          'id',
          'conceptId',
          'difficulty',
          'question',
          'options',
          'correctIndex',
          'explanation',
          'page',
          'sourceQuote',
        ],
      },
    },
  },
  required: ['levelId', 'questions'],
};

const QUESTION_INSTRUCTIONS = `You are an expert teacher writing exam-style multiple choice questions.
Using ONLY the concept information provided, write questions that test understanding of each concept. Rules:
1. Write exactly 3 questions per concept: one easy, one medium, one harder.
2. Each question has exactly 3 answer options and exactly one correct option.
3. The wrong options (distractors) must be plausible and based on real misunderstandings, similar terms from the same material, or near-miss values. Never use joke answers, 'all of the above', or 'none of the above'.
4. All 3 options must be similar in length and style, so the correct answer is not obvious from its length or wording. Vary which position holds the correct answer (do not always put it first).
5. Keep each question under 200 characters and each option under 80 characters.
6. Provide a clear explanation (1 to 3 sentences) of why the correct answer is right and, where helpful, why a tempting wrong answer is wrong.
7. Do not use outside knowledge. Everything must be supported by the provided concept information.
8. Include the concept id and the page number exactly as provided.
9. Do not write two questions that ask the same thing.
10. Return ONLY valid JSON matching the schema. No markdown, no commentary.`;

export async function generateLevelQuestions({
  levelId,
  courseTitle,
  concepts,
  signal,
}: {
  levelId: string;
  courseTitle: string;
  concepts: Concept[];
  signal?: AbortSignal;
}): Promise<Question[]> {
  const conceptsSummary = concepts
    .map((c, i) => {
      let text = `Concept #${i + 1}:
- id: "${c.id}"
- name: "${c.name}"
- type: "${c.type}"
- page: ${c.page}
- summary: "${c.summary}"
- sourceQuote: "${c.sourceQuote}"`;
      if (c.type === 'process' && c.steps && c.steps.length > 0) {
        text += `\n- steps: ${JSON.stringify(c.steps)}`;
      }
      return text;
    })
    .join('\n\n');

  const promptText = `${QUESTION_INSTRUCTIONS}

COURSE: "${courseTitle}"
LEVEL ID: "${levelId}"
NUMBER OF CONCEPTS: ${concepts.length} (Requires exactly ${concepts.length * 3} questions in total: 1 easy, 1 medium, 1 hard per concept)

CONCEPTS TO TEST:
${conceptsSummary}`;

  // Helper to attempt generation with a specific Gemini model with low thinking latency
  const tryGenerateWithModel = async (modelName: string, timeoutMs = 6000): Promise<any | null> => {
    try {
      const callPromise = ai.models.generateContent({
        model: modelName,
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: QUESTIONS_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs);
        callPromise.finally(() => clearTimeout(timer));
      });

      const response: any = await Promise.race([callPromise, timeoutPromise]);
      const rawText = response?.text || '';
      return JSON.parse(rawText.trim());
    } catch (err: any) {
      console.warn(`[QuestionGenerator] Generation with ${modelName} failed or timed out:`, err?.message || err);
      return null;
    }
  };

  // 1. Attempt primary model (gemini-3.8-flash)
  let parsed = await tryGenerateWithModel('gemini-3.8-flash', 4000);

  // 2. Fallback to secondary model (gemini-3.1-flash-lite) if primary was throttled or unavailable
  if (!parsed) {
    console.log('[QuestionGenerator] Retrying with gemini-3.1-flash-lite...');
    parsed = await tryGenerateWithModel('gemini-3.1-flash-lite', 3500);
  }

  // 3. If model output was parsed, validate questions
  if (parsed?.questions && Array.isArray(parsed.questions)) {
    const validation = validateAndCleanQuestions(parsed.questions, concepts);
    if (validation.isValid) {
      return shuffleQuestionsWithProgression(validation.questions);
    }
    console.warn('[QuestionGenerator] AI output failed strict schema validation:', validation.errors);
  }

  // 4. Zero-failure resilient procedural generation
  // If the AI service is 503 (high demand), 429 (rate limited), or output had validation errors,
  // generate high-quality, concept-grounded questions directly so users are never blocked.
  console.log('[QuestionGenerator] Seamlessly generating concept-grounded challenge questions for level', levelId);
  return generateFallbackQuestions(concepts);
}

