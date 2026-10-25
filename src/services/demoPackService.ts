/**
 * Demo Pack Service (Phase 7)
 * Handles offline-safe demo pack creation, export, validation, and auto-initialization
 * for ?demo=1 and ?demo=1&offline=1 flags.
 */

import { Course, StudyQuestProgress } from '../types/course.ts';
import { SAMPLE_COURSE } from '../data/sampleCourse.ts';
import { SAMPLE_LEVEL_QUESTIONS } from '../data/sampleQuestions.ts';
import { SAMPLE_LIE_HUNTER_BOARDS } from '../data/sampleLieHunter.ts';
import { SAMPLE_PLATFORMER_ROUNDS } from '../data/samplePlatformer.ts';
import { safeSetItem } from './storageManager.ts';
import { seedDemoProgress, loadProgress } from './progressService.ts';

export interface DemoPack {
  format: 'studyquest-demo-pack';
  version: number;
  exportedAt: string;
  course: Course;
  progress: StudyQuestProgress;
  caches?: {
    questions?: Record<string, any>;
    lieHunter?: Record<string, any>;
    platformer?: Record<string, any>;
  };
}

/**
 * Exports current course, progress, and caches into a portable JSON string.
 */
export function exportDemoPack(course: Course, progress: StudyQuestProgress): string {
  const pack: DemoPack = {
    format: 'studyquest-demo-pack',
    version: 7,
    exportedAt: new Date().toISOString(),
    course,
    progress,
    caches: {
      questions: SAMPLE_LEVEL_QUESTIONS,
      lieHunter: SAMPLE_LIE_HUNTER_BOARDS,
      platformer: SAMPLE_PLATFORMER_ROUNDS,
    },
  };
  return JSON.stringify(pack, null, 2);
}

/**
 * Validates and imports a demo pack JSON into localStorage.
 */
export function importDemoPack(jsonString: string): {
  success: boolean;
  error?: string;
  course?: Course;
  progress?: StudyQuestProgress;
} {
  try {
    const parsed = JSON.parse(jsonString) as DemoPack;
    if (parsed.format !== 'studyquest-demo-pack' || !parsed.course || !parsed.course.chapters) {
      return { success: false, error: 'Invalid demo pack schema.' };
    }

    safeSetItem('studyquest_course', JSON.stringify(parsed.course));
    if (parsed.progress) {
      safeSetItem('studyquest_progress', JSON.stringify(parsed.progress));
    }

    // Warm caches if provided
    if (parsed.caches?.questions) {
      Object.entries(parsed.caches.questions).forEach(([levelId, qs]) => {
        safeSetItem(
          `studyquest_questions_${levelId}`,
          JSON.stringify({ levelId, conceptHash: 'demo', questions: qs })
        );
      });
    }

    return {
      success: true,
      course: parsed.course,
      progress: parsed.progress || loadProgress(),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to parse JSON file.' };
  }
}

/**
 * Initializes full offline-safe demo state for the application.
 */
export function setupDemoMode(offline = false): { course: Course; progress: StudyQuestProgress } {
  // 1. Save sample course
  safeSetItem('studyquest_course', JSON.stringify(SAMPLE_COURSE));

  // 2. Seed realistic demo progress (streaks, review states, exam countdown)
  const seededProgress = seedDemoProgress(SAMPLE_COURSE);

  // 3. Populate sample question caches so all levels are instant zero-latency
  Object.entries(SAMPLE_LEVEL_QUESTIONS).forEach(([levelId, qs]) => {
    safeSetItem(
      `studyquest_questions_${levelId}`,
      JSON.stringify({ levelId, conceptHash: 'sample', questions: qs })
    );
  });

  // 4. Populate Lie Hunter caches
  Object.entries(SAMPLE_LIE_HUNTER_BOARDS).forEach(([levelId, rounds]) => {
    safeSetItem(
      `studyquest_liehunter_${levelId}_v1`,
      JSON.stringify({ levelId, conceptHash: 'sample', rounds })
    );
  });

  // 5. Populate Platformer caches
  Object.entries(SAMPLE_PLATFORMER_ROUNDS).forEach(([levelId, rounds]) => {
    safeSetItem(
      `studyquest_platformer_${levelId}_v1`,
      JSON.stringify({ levelId, conceptHash: 'sample', rounds })
    );
  });

  // 6. Mark welcomed so demo flow is immediate
  safeSetItem('studyquest_welcomed', 'true');

  if (offline) {
    safeSetItem('studyquest_offline_mode', 'true');
  }

  return { course: SAMPLE_COURSE, progress: seededProgress };
}
