import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { extractCourse } from './server/courseExtractor.ts';
import { generateLevelQuestions } from './server/questionGenerator.ts';
import { generateLieHunterRounds } from './server/lieHunterGenerator.ts';

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Support up to 50MB payload for 20MB base64 PDFs
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // SSE endpoint for course extraction with step-by-step progress
  app.post('/api/course/extract', async (req: Request, res: Response) => {
    const { pdfBase64, text, fileName } = req.body || {};

    if (!pdfBase64 && !text) {
      res.status(400).json({ error: 'Please provide either a PDF or text content.' });
      return;
    }

    // Set up SSE headers with unbuffered streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let isFinished = false;
    const abortController = new AbortController();

    const sendEvent = (data: any) => {
      if (res.writableEnded) return;
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    };

    // Correctly detect client disconnect (res.on close before writableEnded)
    res.on('close', () => {
      if (!res.writableEnded && !isFinished) {
        console.log('Client disconnected before response completion.');
        abortController.abort();
      }
    });

    // 3 minute timeout rule
    const timeoutId = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        abortController.abort();
        console.warn('Extraction timed out after 3 minutes.');
        sendEvent({
          type: 'error',
          code: 'TIMEOUT',
          message: 'This is taking too long. Try a smaller file.',
          technical: 'Request exceeded maximum processing time limit of 180 seconds.',
        });
        res.end();
      }
    }, 180_000);

    try {
      const course = await extractCourse({
        pdfBase64,
        text,
        fileName,
        signal: abortController.signal,
        onProgress: (step, stepIndex) => {
          sendEvent({
            type: 'progress',
            step,
            stepIndex,
          });
        },
      });

      if (!isFinished && !res.writableEnded) {
        isFinished = true;
        clearTimeout(timeoutId);
        sendEvent({
          type: 'complete',
          course,
        });
        res.end();
      }
    } catch (err: any) {
      if (isFinished || res.writableEnded) return;
      isFinished = true;
      clearTimeout(timeoutId);

      console.error('Extraction error technical detail:', err);

      let userMessage = "We couldn't reach the AI service. Check your connection and try again.";
      let errorCode = 'UNKNOWN';

      const errorMsg = String(err?.message || '');
      const errorStatus = err?.status || err?.statusCode || (err?.response && err?.response.status);

      if (errorMsg === 'ABORTED' || abortController.signal.aborted) {
        return; // Client cancelled
      } else if (errorMsg === 'INVALID_JSON_AFTER_RETRY') {
        errorCode = 'INVALID_JSON';
        userMessage = "The AI returned something we couldn't read. Try again, or try a different file.";
      } else if (errorMsg === 'UNREADABLE_PDF') {
        errorCode = 'SCANNED_OR_UNREADABLE';
        userMessage = 'This PDF looks like scanned images with no readable text. Try a text-based PDF, or paste the text instead.';
      } else if (errorMsg === 'DOCUMENT_TOO_SHORT') {
        errorCode = 'TOO_SHORT';
        userMessage = 'We found very little study content in this file. Try a longer or more detailed document.';
      } else if (errorStatus === 429 || errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit')) {
        errorCode = 'RATE_LIMIT';
        userMessage = 'The AI service is busy right now. Please wait a minute and try again.';
      } else if (errorMsg.toLowerCase().includes('fetch failed') || errorMsg.toLowerCase().includes('enotfound') || errorMsg.toLowerCase().includes('network')) {
        errorCode = 'NETWORK';
        userMessage = "We couldn't reach the AI service. Check your connection and try again.";
      }

      sendEvent({
        type: 'error',
        code: errorCode,
        message: userMessage,
        technical: errorMsg,
      });
      res.end();
    }
  });

  // POST endpoint for level question generation
  app.post('/api/questions/generate', async (req: Request, res: Response) => {
    const { levelId, courseTitle, concepts } = req.body || {};

    if (!levelId || !Array.isArray(concepts) || concepts.length === 0) {
      res.status(400).json({ error: 'Please provide levelId and an array of concepts.' });
      return;
    }

    const abortController = new AbortController();
    let isFinished = false;

    res.on('close', () => {
      if (!res.writableEnded && !isFinished) {
        console.log('Client cancelled question generation connection.');
        abortController.abort();
      }
    });

    // 90 second timeout limit per Phase 2 spec
    const timeoutId = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        abortController.abort();
        res.status(504).json({
          code: 'TIMEOUT',
          message: 'This is taking too long. Try again.',
          technical: 'Question generation timed out after 90 seconds.',
        });
      }
    }, 90_000);

    try {
      const questions = await generateLevelQuestions({
        levelId,
        courseTitle: courseTitle || 'Study Course',
        concepts,
        signal: abortController.signal,
      });

      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeoutId);
        res.json({
          levelId,
          questions,
        });
      }
    } catch (err: any) {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeoutId);

      console.error('Question generation error technical detail:', err);

      let userMessage = "We couldn't reach the AI service. Check your connection and try again.";
      let statusCode = 500;
      let errorCode = 'UNKNOWN';

      const errorMsg = String(err?.message || '');
      const errorStatus = err?.status || err?.statusCode || (err?.response && err?.response.status);

      if (errorMsg === 'ABORTED' || abortController.signal.aborted) {
        return; // Client cancelled
      } else if (errorMsg === 'INVALID_QUESTIONS_AFTER_RETRY') {
        errorCode = 'INVALID_QUESTIONS';
        userMessage = "We couldn't build a good challenge for this level. Try again or choose another level.";
      } else if (
        errorStatus === 429 ||
        errorMsg.includes('429') ||
        errorMsg.toLowerCase().includes('quota') ||
        errorMsg.toLowerCase().includes('rate limit')
      ) {
        errorCode = 'RATE_LIMIT';
        statusCode = 429;
        userMessage = 'The AI service is busy right now. Please wait a minute and try again.';
      } else if (
        errorMsg.toLowerCase().includes('fetch failed') ||
        errorMsg.toLowerCase().includes('enotfound') ||
        errorMsg.toLowerCase().includes('network')
      ) {
        errorCode = 'NETWORK';
        userMessage = "We couldn't reach the AI service. Check your connection and try again.";
      }

      res.status(statusCode).json({
        code: errorCode,
        message: userMessage,
        technical: errorMsg,
      });
    }
  });

  // POST endpoint for Lie Hunter round generation
  app.post('/api/lie-hunter/generate', async (req: Request, res: Response) => {
    const { levelId, courseTitle, concepts } = req.body || {};

    if (!levelId || !Array.isArray(concepts) || concepts.length === 0) {
      res.status(400).json({ error: 'Please provide levelId and an array of concepts.' });
      return;
    }

    const abortController = new AbortController();
    let isFinished = false;

    res.on('close', () => {
      if (!res.writableEnded && !isFinished) {
        console.log('Client cancelled Lie Hunter generation connection.');
        abortController.abort();
      }
    });

    // 90 second timeout limit per Section 10 spec
    const timeoutId = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        abortController.abort();
        res.status(504).json({
          code: 'TIMEOUT',
          message: 'This is taking too long. Try again.',
          technical: 'Lie Hunter generation timed out after 90 seconds.',
        });
      }
    }, 90_000);

    try {
      const rounds = await generateLieHunterRounds({
        levelId,
        courseTitle: courseTitle || 'Study Course',
        concepts,
        signal: abortController.signal,
      });

      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeoutId);
        res.json({
          levelId,
          rounds,
        });
      }
    } catch (err: any) {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeoutId);

      console.error('Lie Hunter generation error technical detail:', err);

      let userMessage = "We couldn't reach the AI service. Check your connection and try again.";
      let statusCode = 500;
      let errorCode = 'LIEHUNTER_GENERATION_FAILED';

      const errorMsg = String(err?.message || '');
      const errorStatus = err?.status || err?.statusCode || (err?.response && err?.response.status);

      if (errorMsg === 'ABORTED' || abortController.signal.aborted) {
        return; // Client cancelled
      } else if (
        errorStatus === 429 ||
        errorMsg.includes('429') ||
        errorMsg.toLowerCase().includes('quota') ||
        errorMsg.toLowerCase().includes('rate limit')
      ) {
        errorCode = 'RATE_LIMIT';
        statusCode = 429;
        userMessage = 'The AI service is busy right now. Please wait a minute and try again.';
      } else if (
        errorMsg.toLowerCase().includes('fetch failed') ||
        errorMsg.toLowerCase().includes('enotfound') ||
        errorMsg.toLowerCase().includes('network')
      ) {
        errorCode = 'NETWORK';
        userMessage = "We couldn't reach the AI service. Check your connection and try again.";
      } else if (errorMsg.includes('INVALID') || errorMsg.includes('REJECTED')) {
        errorCode = 'LIEHUNTER_CONTENT_INVALID';
        userMessage = "We couldn't build a good case file for this level.";
      }

      res.status(statusCode).json({
        code: errorCode,
        message: userMessage,
        technical: errorMsg,
      });
    }
  });

  // Mount Vite or static dist

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`StudyQuest server is active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
