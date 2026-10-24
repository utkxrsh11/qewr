import { Concept, Question } from '../types/course.ts';
import { shuffleQuestionsWithProgression } from './questionValidator.ts';

/**
 * Generates high-quality, concept-grounded multiple-choice questions
 * directly from concept definitions, summaries, and quotes.
 * Used as a zero-failure fallback whenever AI services are throttled (503/429) or offline.
 */
export function generateFallbackQuestions(concepts: Concept[]): Question[] {
  const allQuestions: Question[] = [];

  // Helper to extract clean clauses under 80 characters
  const cleanSnippet = (text: string, maxLen = 75): string => {
    if (!text) return '';
    let cleaned = text.replace(/^[“"']|[”"']$/g, '').trim();
    if (cleaned.length <= maxLen) return cleaned;
    const cut = cleaned.substring(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 20 ? cut.substring(0, lastSpace) : cut) + '...';
  };

  concepts.forEach((concept, cIdx) => {
    const conceptNum = cIdx + 1;
    const name = concept.name.trim();
    const summary = concept.summary.trim();
    const quote = concept.sourceQuote.trim();
    const steps = concept.steps && concept.steps.length > 0 ? concept.steps : null;

    // --- QUESTION 1: EASY (Foundational Concept Meaning / Identification) ---
    const q1Correct = cleanSnippet(quote || summary, 75);
    const q1DistractorA = `Unrelated surface fluctuation having zero thermal effect`;
    const q1DistractorB = `Secondary mechanical byproduct with no active role`;

    // Shuffle options and record correct index
    const q1OptionsRaw = [
      { text: q1Correct, correct: true },
      { text: q1DistractorA, correct: false },
      { text: q1DistractorB, correct: false },
    ];
    // Deterministic shuffle based on concept index so positions vary
    const shift1 = cIdx % 3;
    const q1Options = [
      q1OptionsRaw[shift1],
      q1OptionsRaw[(shift1 + 1) % 3],
      q1OptionsRaw[(shift1 + 2) % 3],
    ];
    const q1CorrectIndex = q1Options.findIndex((o) => o.correct) as 0 | 1 | 2;

    allQuestions.push({
      id: `${concept.id}-q1`,
      conceptId: concept.id,
      difficulty: 'easy',
      question: `What primary role or definition is associated with ${name}?`,
      options: [q1Options[0].text, q1Options[1].text, q1Options[2].text],
      correctIndex: q1CorrectIndex,
      explanation: `${name} is defined as: "${summary}".`,
      page: concept.page,
      sourceQuote: concept.sourceQuote,
    });

    // --- QUESTION 2: MEDIUM (Mechanisms, Steps, or Quantitative Details) ---
    let q2Question = '';
    let q2Correct = '';
    let q2DistractorA = '';
    let q2DistractorB = '';

    if (concept.type === 'process' && steps && steps.length >= 2) {
      q2Question = `In the process of ${name}, what critical stage takes place?`;
      q2Correct = cleanSnippet(steps[1] || steps[0], 75);
      q2DistractorA = `Total cessation of molecular momentum`;
      q2DistractorB = `Immediate reverse deposition into crystalline solids`;
    } else if (concept.type === 'detail') {
      q2Question = `Regarding ${name}, which specific characteristic is highlighted?`;
      q2Correct = cleanSnippet(summary, 75);
      q2DistractorA = `Requires negligible energy input across environments`;
      q2DistractorB = `Remains entirely static regardless of local conditions`;
    } else {
      q2Question = `Which principle governs the behavior of ${name}?`;
      q2Correct = cleanSnippet(summary, 75);
      q2DistractorA = `Operates completely independent of atmospheric physical laws`;
      q2DistractorB = `Produces an inverse reaction in all observed states`;
    }

    const shift2 = (cIdx + 1) % 3;
    const q2OptionsRaw = [
      { text: q2Correct, correct: true },
      { text: q2DistractorA, correct: false },
      { text: q2DistractorB, correct: false },
    ];
    const q2Options = [
      q2OptionsRaw[shift2],
      q2OptionsRaw[(shift2 + 1) % 3],
      q2OptionsRaw[(shift2 + 2) % 3],
    ];
    const q2CorrectIndex = q2Options.findIndex((o) => o.correct) as 0 | 1 | 2;

    allQuestions.push({
      id: `${concept.id}-q2`,
      conceptId: concept.id,
      difficulty: 'medium',
      question: q2Question,
      options: [q2Options[0].text, q2Options[1].text, q2Options[2].text],
      correctIndex: q2CorrectIndex,
      explanation: `Course material confirms that ${summary}`,
      page: concept.page,
      sourceQuote: concept.sourceQuote,
    });

    // --- QUESTION 3: HARD (Deep Analysis & Causality) ---
    const q3Question = `Why is ${name} critical to understanding this system?`;
    const q3Correct = cleanSnippet(
      quote.length > 20 ? quote : `It provides the underlying mechanism for ${name}`,
      75
    );
    const q3DistractorA = `It acts merely as an ornamental label without functional bearing`;
    const q3DistractorB = `It directly contradicts standard thermodynamic principles`;

    const shift3 = (cIdx + 2) % 3;
    const q3OptionsRaw = [
      { text: q3Correct, correct: true },
      { text: q3DistractorA, correct: false },
      { text: q3DistractorB, correct: false },
    ];
    const q3Options = [
      q3OptionsRaw[shift3],
      q3OptionsRaw[(shift3 + 1) % 3],
      q3OptionsRaw[(shift3 + 2) % 3],
    ];
    const q3CorrectIndex = q3Options.findIndex((o) => o.correct) as 0 | 1 | 2;

    allQuestions.push({
      id: `${concept.id}-q3`,
      conceptId: concept.id,
      difficulty: 'hard',
      question: q3Question,
      options: [q3Options[0].text, q3Options[1].text, q3Options[2].text],
      correctIndex: q3CorrectIndex,
      explanation: `As noted on page ${concept.page}: "${concept.sourceQuote}"`,
      page: concept.page,
      sourceQuote: concept.sourceQuote,
    });
  });

  return shuffleQuestionsWithProgression(allQuestions);
}
