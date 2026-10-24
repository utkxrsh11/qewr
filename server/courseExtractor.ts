import { Type } from '@google/genai';
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
                  description: 'Clear explanation in 1 to 3 sentences using only information from the document',
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
                  description: 'Short exact phrase (5 to 20 words) copied word for word from the document',
                },
                steps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Ordered sequence of steps (at least 2 items), required when type is process',
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

const BASE_INSTRUCTIONS = `You are an expert teacher analyzing study material. Read the provided document and extract a structured course from it. Follow these rules strictly:

1. Identify the chapters or major sections of the document. If the document has no clear chapters, group the content into logical sections of your own, with clear titles.
2. Within each chapter, extract the key concepts a student must understand to do well in an exam on this material. Include every important concept, not just a few. Prefer completeness over brevity, but do not invent concepts that are not in the document.
3. For each concept, provide:
   - name: a short, clear name (max 8 words)
   - summary: a clear explanation in 1 to 3 sentences, using only information from the document
   - type: exactly one of "fact", "process", or "detail", defined as follows:
       * "fact": a definition, term, rule, law, or core idea to remember
       * "process": a sequence of steps, stages, a cycle, an algorithm, or a timeline where ORDER matters
       * "detail": a specific number, date, name, formula, exception, or precise statement where exact wording matters
   - page: the PDF page number (counting from 1 for the first page of the file) where the concept appears. Use the page where it is mainly explained. Never guess; if unsure, use the earliest page where it appears.
   - sourceQuote: a short exact phrase (5 to 20 words) copied word for word from the document that supports this concept, so it can be verified
4. For concepts of type "process", also provide steps: an ordered array of short step descriptions (2 to 10 steps) taken from the document.
5. Use only information that is actually in the document. Do not add outside knowledge.
6. Return ONLY valid JSON matching the requested schema. No markdown, no code fences, no commentary before or after.
7. Include totalPages as an integer representing the total page count of the material.`;

/**
 * Executes a single Gemini extraction call with JSON mode and optional validation retry.
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

  // Call 1
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: COURSE_SCHEMA,
    },
  });

  const rawText = response.text || '';
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

    const retryResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          ...parts,
          { text: `PREVIOUS FAILED OUTPUT:\n${rawText.slice(0, 4000)}` },
          { text: retryNote },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: COURSE_SCHEMA,
      },
    });

    const retryRawText = retryResponse.text || '';
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

  // Check if chunking is required (> 30 pages and doc loaded)
  if (pdfDoc && pageCount > 30) {
    console.log(`PDF has ${pageCount} pages (> 30). Processing in chunks of 15 pages...`);
    const chunkSize = 15;
    const totalChunks = Math.ceil(pageCount / chunkSize);
    const accumulatedChapters: Chapter[] = [];
    let generatedCourseTitle = '';

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      if (signal?.aborted) {
        throw new Error('ABORTED');
      }

      const startPageNum = chunkIdx * chunkSize + 1;
      const endPageNum = Math.min(pageCount, (chunkIdx + 1) * chunkSize);
      const chunkLabel = `Extracting concepts (part ${chunkIdx + 1} of ${totalChunks})...`;
      onProgress?.(chunkLabel, 2);

      // Create sliced PDF
      const subDoc = await PDFDocument.create();
      const pageIndices: number[] = [];
      for (let p = startPageNum - 1; p < endPageNum; p++) {
        pageIndices.push(p);
      }
      const copiedPages = await subDoc.copyPages(pdfDoc, pageIndices);
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

      if (!generatedCourseTitle && chunkCourse.courseTitle) {
        generatedCourseTitle = chunkCourse.courseTitle;
      }

      if (Array.isArray(chunkCourse.chapters)) {
        chunkCourse.chapters.forEach((ch: any) => {
          // Adjust concept pages if model reported relative 1..15 instead of absolute
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
