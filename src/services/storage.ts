import { Course } from '../types/course.ts';

const STORAGE_KEY = 'studyquest_course';

export function saveCourseToStorage(course: Course): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(course));
    return true;
  } catch (err) {
    console.warn('Unable to save course to localStorage:', err);
    return false;
  }
}

export function loadCourseFromStorage(): Course | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.chapters) && parsed.courseTitle) {
      return parsed as Course;
    }
    return null;
  } catch (err) {
    console.warn('Unable to load course from localStorage:', err);
    return null;
  }
}

export function clearCourseFromStorage(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn('Unable to clear course from localStorage:', err);
    return false;
  }
}
