import { Course } from '../types/course.ts';

export interface ExtractCourseCallbacks {
  onProgress?: (step: string, stepIndex: number) => void;
  onComplete: (course: Course) => void;
  onError: (userMessage: string, technical?: string) => void;
}

export async function startExtractionStream(
  payload: { pdfBase64?: string; text?: string; fileName?: string },
  callbacks: ExtractCourseCallbacks,
  signal?: AbortSignal
): Promise<void> {
  let isDone = false;

  try {
    const response = await fetch('/api/course/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Server returned HTTP error status:', response.status, errText);
      callbacks.onError("We couldn't reach the AI service. Check your connection and try again.", errText);
      return;
    }

    if (!response.body) {
      callbacks.onError("We couldn't reach the AI service. Check your connection and try again.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const processBlock = (block: string): boolean => {
      const lines = block.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'progress') {
              callbacks.onProgress?.(data.step, data.stepIndex);
            } else if (data.type === 'complete') {
              isDone = true;
              callbacks.onComplete(data.course);
              return true;
            } else if (data.type === 'error') {
              isDone = true;
              console.error('Extraction error event received:', data.technical || data.message);
              callbacks.onError(data.message, data.technical);
              return true;
            }
          } catch (parseErr) {
            console.warn('Failed to parse SSE event JSON line:', line, parseErr);
          }
        }
      }
      return false;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          processBlock(buffer);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      // The last part may be incomplete
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (part.trim()) {
          const finished = processBlock(part);
          if (finished) return;
        }
      }
    }

    if (!isDone) {
      callbacks.onError("The connection closed before the course was completed. Please try again.");
    }
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError') {
      console.log('Extraction aborted by user.');
      return;
    }
    console.error('Network or streaming error:', err);
    callbacks.onError("We couldn't reach the AI service. Check your connection and try again.", String(err));
  }
}
