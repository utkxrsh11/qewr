import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';

/**
 * Shared Gemini client utility initialized server-side.
 * Uses process.env.GEMINI_API_KEY with user-agent 'aistudio-build'.
 */
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

