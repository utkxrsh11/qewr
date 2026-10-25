import { Type, ThinkingLevel } from '@google/genai';
import { PDFDocument } from 'pdf-lib';
import { ai } from './gemini.ts';
import { Course, Chapter, Concept } from '../src/types/course.ts';
import { validateCourse } from '../src/services/courseValidator.ts';
import { cleanCourse } from '../src/services/courseCleaner.ts';

export interface ExtractionProgressCallback {
  (step: string, stepIndex: number): void;
}

const COURSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    courseTitle: {
      type: Type.STRING,
      description: 'A concise and informative title for the course generated from the document',
    },
    totalPages: {
      type: Type.INTEGER,
      description: 'Total number of pages in this document or section (must be >= 1)',
    },
    chapters: {
      type: Type.ARRAY,
      description: 'The chapters or major logical sections extracted from the document',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Chapter ID such as ch1' },
          title: { type: Type.STRING, description: 'Chapter title' },
          pageStart: { type: Type.INTEGER, description: 'Starting page number (>= 1)' },
          pageEnd: { type: Type.INTEGER, description: 'Ending page number (>= pageStart)' },
          concepts: {
            type: Type.ARRAY,
            description: 'Key concepts extracted for this chapter',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'Concept ID such as ch1-c1' },
                name: { type: Type.STRING, description: 'Concept name (max 8 words)' },
                summary: {
                  type: Type.STRING,
                  description: 'Clear, high-yield explanation in 1 to 2 sentences using only information from the document',
                },
                type: {
                  type: Type.STRING,
                  enum: ['fact', 'process', 'detail'],
                  description: 'Category: fact, process, or detail',
                },
                page: {
                  type: Type.INTEGER,
                  description: 'The PDF page number where this concept appears',
                },
                sourceQuote: {
                  type: Type.STRING,
                  description: 'Short exact phrase (5 to 15 words) copied word for word from the document',
                },
                steps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Ordered sequence of steps (2 to 5 items), required when type is process',
                },
              },
              required: ['id', 'name', 'summary', 'type', 'page', 'sourceQuote'],
            },
          },
        },
        required: ['id', 'title', 'pageStart', 'pageEnd', 'concepts'],
      },
    },
  },
  required: ['courseTitle', 'totalPages', 'chapters'],
};

const BASE_INSTRUCTIONS = `You are an expert curriculum designer analyzing study material. Read the provided document and extract a structured, high-yield study course from it rapidly and accurately. Follow these rules strictly:

1. Identify 3 to 5 key chapters or major logical sections of the document. Keep chapter titles clear and concise.
2. Within each chapter, extract 2 to 4 high-yield, exam-critical concepts that students must master (aim for 6 to 12 total concepts across the course). Prioritize core foundational concepts over exhaustive trivia.
3. For each concept, provide:
   - name: a concise, clear name (2 to 6 words)
   - summary: a clear, high-yield explanation in 1 to 2 sentences using information directly from the document
   - type: exactly one of "fact", "process", or "detail":
       * "fact": a definition, term, rule, law, or core idea to remember
       * "process": a sequence of steps, stages, a cycle, or timeline where ORDER matters
       * "detail": a specific number, formula, exception, or precise statement where exact wording matters
   - page: the PDF page number (counting from 1 for the first page) where the concept is primarily explained
   - sourceQuote: a short exact quote (5 to 15 words) copied word-for-word from the document to verify this concept
4. For concepts of type "process", also provide steps: an ordered array of 2 to 5 concise step labels taken directly from the document.
5. Use only information that is actually in the document. Do not invent facts or add outside knowledge.
6. Return ONLY valid JSON matching the requested schema. No markdown, no code fences.
7. Include totalPages as an integer representing the total page count of the material.`;

/**
 * Executes model generation with appropriate thinking config per model.
 */
async function executeExtractionCall(modelName: string, parts: any[]) {
  const config: any = {
    responseMimeType: 'application/json',
    responseSchema: COURSE_SCHEMA,
  };
  if (modelName === 'gemini-3.8-flash') {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  }
  return ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config,
  });
}

/**
 * Executes a single Gemini extraction call with JSON mode, ThinkingLevel.LOW, automatic model failover, and validation retry.
 */
async function callGeminiExtract({
  inlinePdfBase64,
  text,
  customInstructions,
  expectedTotalPages,
  signal,
}: {
  inlinePdfBase64?: string;
  text?: string;
  customInstructions?: string;
  expectedTotalPages?: number;
  signal?: AbortSignal;
}): Promise<any> {
  const parts: any[] = [];

  if (inlinePdfBase64) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: inlinePdfBase64,
      },
    });
  }

  const promptContent = customInstructions
    ? `${BASE_INSTRUCTIONS}\n\n${customInstructions}`
    : text
      ? `${BASE_INSTRUCTIONS}\n\nNote: The content below is pasted text without page divisions. Treat all content as page 1 and set every concept's "page" to 1 and totalPages to 1.\n\nDOCUMENT TEXT:\n"""\n${text}\n"""`
      : BASE_INSTRUCTIONS;

  parts.push({ text: promptContent });

  // Call 1 with primary model and failover to gemini-3.1-flash-lite if experiencing high demand
  let activeModel = 'gemini-3.8-flash';
  let response: any;
  try {
    response = await executeExtractionCall(activeModel, parts);
  } catch (primaryErr: any) {
    console.warn(`[CourseExtractor] Primary model ${activeModel} failed (${primaryErr?.status || primaryErr?.message}). Failing over immediately to gemini-3.1-flash-lite...`);
    activeModel = 'gemini-3.1-flash-lite';
    response = await executeExtractionCall(activeModel, parts);
  }

  const rawText = response?.text || '';
  let parsed: any;
  try {
    parsed = JSON.parse(rawText.trim());
  } catch (err) {
    console.warn('Initial JSON parse failed. Retrying with explicit corrective instruction...', err);
  }

  if (parsed && typeof parsed === 'object') {
    if ((!parsed.totalPages || parsed.totalPages < 1) && expectedTotalPages) {
      parsed.totalPages = expectedTotalPages;
    }
  }

  // Validate output
  let validation = parsed ? validateCourse(parsed) : { isValid: false, errors: ['Failed to parse JSON response.'] };

  // If invalid, retry ONCE with note explaining exactly what was invalid
  if (!validation.isValid) {
    console.log('Gemini output invalid on first attempt, retrying once. Errors:', validation.errors);
    const retryNote = `The previous JSON response did not pass validation. Specific issues:\n${validation.errors
      .map((e) => `- ${e}`)
      .join('\n')}\n\nPlease regenerate the JSON course object fixing all the above issues. Remember: valid JSON only matching the schema.`;

    const retryParts = [
      ...parts,
      { text: `PREVIOUS FAILED OUTPUT:\n${rawText.slice(0, 4000)}` },
      { text: retryNote },
    ];

    let retryResponse: any;
    try {
      retryResponse = await executeExtractionCall(activeModel, retryParts);
    } catch (retryErr: any) {
      if (activeModel !== 'gemini-3.1-flash-lite') {
        activeModel = 'gemini-3.1-flash-lite';
        retryResponse = await executeExtractionCall(activeModel, retryParts);
      } else {
        throw retryErr;
      }
    }

    const retryRawText = retryResponse?.text || '';
    try {
      parsed = JSON.parse(retryRawText.trim());
      if (parsed && typeof parsed === 'object') {
        if ((!parsed.totalPages || parsed.totalPages < 1) && expectedTotalPages) {
          parsed.totalPages = expectedTotalPages;
        }
      }
      validation = validateCourse(parsed);
    } catch (retryErr) {
      console.error('Retry JSON parse failed completely.', retryErr);
      throw new Error('INVALID_JSON_AFTER_RETRY');
    }

    if (!validation.isValid) {
      console.error('Validation failed after retry:', validation.errors);
      throw new Error('INVALID_JSON_AFTER_RETRY');
    }
  }

  return parsed;
}

/**
 * Main Course Extraction Orchestrator
 */
export async function extractCourse({
  pdfBase64,
  text,
  fileName,
  onProgress,
  signal,
}: {
  pdfBase64?: string;
  text?: string;
  fileName?: string;
  onProgress?: ExtractionProgressCallback;
  signal?: AbortSignal;
}): Promise<Course> {
  const effectiveSourceName = fileName || (text ? 'Pasted Text' : 'document.pdf');

  // Step 1: Reading
  onProgress?.('Reading your PDF...', 0);

  if (text) {
    // Pasted text flow
    if (text.length < 300) {
      throw new Error('DOCUMENT_TOO_SHORT');
    }

    onProgress?.('Finding chapters...', 1);
    onProgress?.('Extracting concepts...', 2);

    const rawCourse = await callGeminiExtract({ text, expectedTotalPages: 1, signal });
    rawCourse.sourceName = effectiveSourceName;
    rawCourse.totalPages = 1;

    // Enforce page 1 for pasted text
    if (Array.isArray(rawCourse.chapters)) {
      rawCourse.chapters.forEach((ch: any) => {
        ch.pageStart = 1;
        ch.pageEnd = 1;
        if (Array.isArray(ch.concepts)) {
          ch.concepts.forEach((c: any) => {
            c.page = 1;
          });
        }
      });
    }

    onProgress?.('Checking the results...', 3);
    const cleaned = cleanCourse(rawCourse);

    const totalConcepts = cleaned.chapters.reduce((sum, ch) => sum + ch.concepts.length, 0);
    if (totalConcepts < 3) {
      throw new Error('DOCUMENT_TOO_SHORT');
    }

    onProgress?.('Your course is ready!', 4);
    return cleaned;
  }

  if (!pdfBase64) {
    throw new Error('INVALID_REQUEST');
  }

  // Parse PDF to determine page count and detect if chunking is required
  let pdfBuffer: Buffer;
  let pageCount = 1;
  let pdfDoc: PDFDocument | null = null;

  try {
    pdfBuffer = Buffer.from(pdfBase64, 'base64');
    pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    pageCount = pdfDoc.getPageCount();
  } catch (pdfErr) {
    console.warn('pdf-lib failed to parse PDF structure; falling back to direct Gemini reading:', pdfErr);
    // If pdf-lib fails (e.g. non-standard xref), proceed with direct Gemini processing
    pageCount = 1;
  }

  // Check if chunking is required (> 80 pages and doc loaded)
  if (pdfDoc && pageCount > 80) {
    console.log(`PDF has ${pageCount} pages (> 80). Processing in parallel chunks of 40 pages...`);
    const chunkSize = 40;
    const totalChunks = Math.ceil(pageCount / chunkSize);
    onProgress?.(`Extracting concepts across ${totalChunks} sections in parallel...`, 2);

    const chunkPromises = Array.from({ length: totalChunks }, async (_, chunkIdx) => {
      if (signal?.aborted) throw new Error('ABORTED');

      const startPageNum = chunkIdx * chunkSize + 1;
      const endPageNum = Math.min(pageCount, (chunkIdx + 1) * chunkSize);

      // Create sliced PDF
      const subDoc = await PDFDocument.create();
      const pageIndices: number[] = [];
      for (let p = startPageNum - 1; p < endPageNum; p++) {
        pageIndices.push(p);
      }
      const copiedPages = await subDoc.copyPages(pdfDoc!, pageIndices);
      copiedPages.forEach((p) => subDoc.addPage(p));
      const subBytes = await subDoc.save();
      const subBase64 = Buffer.from(subBytes).toString('base64');

      const chunkInstructions = `Note: This chunk contains pages ${startPageNum} through ${endPageNum} of a ${pageCount}-page document.
The concept "page" attribute must be the true document page number between ${startPageNum} and ${endPageNum}.
Chapter pageStart and pageEnd must also be within ${startPageNum} and ${endPageNum}.`;

      const chunkCourse = await callGeminiExtract({
        inlinePdfBase64: subBase64,
        customInstructions: chunkInstructions,
        expectedTotalPages: pageCount,
        signal,
      });

      return { chunkIdx, startPageNum, endPageNum, chunkCourse };
    });

    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.sort((a, b) => a.chunkIdx - b.chunkIdx);

    const accumulatedChapters: Chapter[] = [];
    let generatedCourseTitle = '';

    for (const { startPageNum, endPageNum, chunkCourse } of chunkResults) {
      if (!generatedCourseTitle && chunkCourse.courseTitle) {
        generatedCourseTitle = chunkCourse.courseTitle;
      }

      if (Array.isArray(chunkCourse.chapters)) {
        chunkCourse.chapters.forEach((ch: any) => {
          if (Array.isArray(ch.concepts)) {
            ch.concepts.forEach((c: any) => {
              if (c.page < startPageNum || c.page > endPageNum) {
                if (c.page >= 1 && c.page <= chunkSize) {
                  c.page = startPageNum + (c.page - 1);
                } else {
                  c.page = Math.max(startPageNum, Math.min(endPageNum, c.page));
                }
              }
            });
          }
          ch.pageStart = Math.max(startPageNum, ch.pageStart || startPageNum);
          ch.pageEnd = Math.min(endPageNum, Math.max(ch.pageStart, ch.pageEnd || endPageNum));
          accumulatedChapters.push(ch);
        });
      }
    }

    onProgress?.('Checking the results...', 3);

    const mergedCourse: Course = {
      courseTitle: generatedCourseTitle || effectiveSourceName.replace(/\.pdf$/i, ''),
      sourceName: effectiveSourceName,
      totalPages: pageCount,
      createdAt: new Date().toISOString(),
      chapters: accumulatedChapters,
    };

    const cleaned = cleanCourse(mergedCourse);
    const totalConcepts = cleaned.chapters.reduce((sum, ch) => sum + ch.concepts.length, 0);

    if (totalConcepts < 3) {
      throw new Error('DOCUMENT_TOO_SHORT');
    }

    onProgress?.('Your course is ready!', 4);
    return cleaned;
  }

  // Normal flow (<= 30 pages or direct fallback)
  onProgress?.('Finding chapters...', 1);
  onProgress?.('Extracting concepts...', 2);

  const rawCourse = await callGeminiExtract({
    inlinePdfBase64: pdfBase64,
    expectedTotalPages: pageCount,
    signal,
  });

  rawCourse.sourceName = effectiveSourceName;
  rawCourse.totalPages = Math.max(pageCount, Number(rawCourse.totalPages) || pageCount);

  onProgress?.('Checking the results...', 3);
  const cleaned = cleanCourse(rawCourse);

  const totalConcepts = cleaned.chapters.reduce((sum, ch) => sum + ch.concepts.length, 0);
  if (totalConcepts < 3) {
    throw new Error('DOCUMENT_TOO_SHORT');
  }

  onProgress?.('Your course is ready!', 4);
  return cleaned;
}
