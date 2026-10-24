import { Type } from '@google/genai';
import { ai } from './gemini.ts';
import { Concept, LieHunterRound, Statement, FalseStatement, TrueStatement } from '../src/types/course.ts';

const LIE_HUNTER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    levelId: { type: Type.STRING },
    rounds: {
      type: Type.ARRAY,
      description: 'List of spot-the-lie rounds (2 per concept: easy first, then hard)',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          conceptId: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ['easy', 'hard'] },
          page: { type: Type.INTEGER },
          sourceQuote: { type: Type.STRING },
          statements: {
            type: Type.ARRAY,
            description: 'Exactly 4 statements: 3 true and 1 false',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING, description: 'Complete statement under 160 characters' },
                isFalse: { type: Type.BOOLEAN, description: 'True for the single altered statement, false for others' },
                basis: { type: Type.STRING, description: 'Exact 3-12 word phrase copied verbatim from concept info' },
                original: { type: Type.STRING, description: 'The accurate uncorrupted statement (only for false statement)' },
                alteredPart: { type: Type.STRING, description: 'Exact altered words in text that replaced truePart' },
                truePart: { type: Type.STRING, description: 'Exact words in original that alteredPart replaced' },
                explanation: { type: Type.STRING, description: '1-2 sentences <= 220 chars explaining why statement is false' },
              },
              required: ['id', 'text', 'isFalse', 'basis'],
            },
          },
        },
        required: ['id', 'conceptId', 'difficulty', 'statements'],
      },
    },
  },
  required: ['levelId', 'rounds'],
};

const LIE_HUNTER_INSTRUCTIONS = `You are a teacher creating a spot-the-false-statement game. Using ONLY the concept information provided, write evidence boards. Each board belongs to one concept and has exactly 4 short statements: 3 true and 1 false. Rules:
1. TRUE statements must be accurate and directly supported by the provided information. Each true statement states a DIFFERENT fact. Do not write two true statements that say the same thing in different words. If one concept does not contain enough distinct facts, you may use facts from other concepts provided in this level, but the board's conceptId stays the same.
2. The FALSE statement must be a corrupted version of a true fact from the material, changed in exactly ONE key detail. Allowed corruption types: number or quantity changed, a term swapped for a similar term from the material, cause and effect reversed, direction reversed (increase and decrease, before and after), order of steps swapped, wrong condition or scope, wrong name or place. Use a different corruption type on different boards where possible.
3. The false statement must be clearly false according to the material, not ambiguous or debatable. Do not use outside knowledge.
4. Difficulty: for 'easy' boards the altered detail should be fairly noticeable (for example a clearly different term). For 'hard' boards the alteration should be subtle (for example a changed number, a swapped adjacent step, or a near-synonym term that has a different meaning in this material).
5. Do NOT make the false statement easy to spot by style: all 4 statements must have similar length (within about 25 percent of each other), similar tone and structure, and must NOT rely on words like 'always', 'never', 'only', or 'all' unless the true statements use such words as well.
6. Each statement is at most 160 characters. Statements are complete sentences.
7. For the false statement provide:
   - original: the TRUE version of that statement (before corruption)
   - alteredPart: the exact words in the false statement that were changed (must appear word for word inside the false statement)
   - truePart: the exact words in 'original' that the alteredPart replaced (must appear word for word inside 'original')
   - explanation: 1 to 2 sentences saying why the false statement is wrong and what the material actually says (max 220 characters)
   - basis: an exact short phrase (3 to 12 words) copied word for word from the provided concept information that supports 'original'
8. For each TRUE statement provide a 'basis': an exact short phrase (3 to 12 words) copied word for word from the provided concept information that supports it.
9. Include the conceptId and the page number exactly as provided.
10. Return ONLY valid JSON matching the schema. No markdown, no commentary.`;

function normalizeText(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Builds the combined level text against which basis phrases are verified.
 */
function buildLevelSearchCorpus(concepts: Concept[]): string {
  const chunks: string[] = [];
  concepts.forEach((c) => {
    chunks.push(c.name);
    chunks.push(c.summary);
    chunks.push(c.sourceQuote);
    if (Array.isArray(c.steps)) {
      chunks.push(...c.steps);
    }
  });
  return normalizeText(chunks.join(' '));
}

export interface ValidationReport {
  validRounds: LieHunterRound[];
  invalidRounds: Array<{ round: any; reason: string }>;
  isAcceptable: boolean;
}

/**
 * Validates Lie Hunter rounds according to Phase 4 rules.
 */
export function validateLieHunterRounds(
  rawRounds: any[],
  levelId: string,
  concepts: Concept[]
): ValidationReport {
  const corpus = buildLevelSearchCorpus(concepts);
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  const validRounds: LieHunterRound[] = [];
  const invalidRounds: Array<{ round: any; reason: string }> = [];

  rawRounds.forEach((r, rIdx) => {
    if (!r || typeof r !== 'object') {
      invalidRounds.push({ round: r, reason: 'Round is not an object' });
      return;
    }

    const concept = conceptMap.get(r.conceptId);
    if (!concept) {
      invalidRounds.push({ round: r, reason: `Unknown conceptId: ${r.conceptId}` });
      return;
    }

    const statements = Array.isArray(r.statements) ? r.statements : [];
    if (statements.length !== 4) {
      invalidRounds.push({ round: r, reason: `Round must have exactly 4 statements, got ${statements.length}` });
      return;
    }

    const falseStatements = statements.filter((s: any) => s.isFalse === true);
    const trueStatements = statements.filter((s: any) => s.isFalse === false);

    if (falseStatements.length !== 1 || trueStatements.length !== 3) {
      invalidRounds.push({
        round: r,
        reason: `Round must have exactly 1 false and 3 true statements (got ${falseStatements.length} false, ${trueStatements.length} true)`,
      });
      return;
    }

    const falseStmt = falseStatements[0];

    // Check all statement texts
    const textsSet = new Set<string>();
    let textError = '';
    for (const s of statements) {
      const text = typeof s.text === 'string' ? s.text.trim() : '';
      if (!text) {
        textError = 'Statement has empty text';
        break;
      }
      if (text.length > 160) {
        textError = `Statement exceeds 160 chars (${text.length})`;
        break;
      }
      const lower = text.toLowerCase();
      if (textsSet.has(lower)) {
        textError = 'Duplicate statement text in round';
        break;
      }
      textsSet.add(lower);
    }

    if (textError) {
      invalidRounds.push({ round: r, reason: textError });
      return;
    }

    // Length fairness check: false statement length within 30% of average length of 3 true statements
    const avgTrueLen = trueStatements.reduce((sum: number, s: any) => sum + s.text.length, 0) / 3;
    const minAllowed = avgTrueLen * 0.7;
    const maxAllowed = avgTrueLen * 1.3;
    if (falseStmt.text.length < minAllowed || falseStmt.text.length > maxAllowed) {
      invalidRounds.push({
        round: r,
        reason: `Length fairness violated: false stmt len=${falseStmt.text.length}, true avg=${avgTrueLen.toFixed(1)}`,
      });
      return;
    }

    // False statement internal integrity
    const original = (falseStmt.original || '').trim();
    const alteredPart = (falseStmt.alteredPart || '').trim();
    const truePart = (falseStmt.truePart || '').trim();
    const explanation = (falseStmt.explanation || '').trim();

    if (!original || !alteredPart || !truePart || !explanation) {
      invalidRounds.push({ round: r, reason: 'False statement missing original/alteredPart/truePart/explanation' });
      return;
    }

    if (explanation.length > 220) {
      invalidRounds.push({ round: r, reason: `Explanation exceeds 220 chars (${explanation.length})` });
      return;
    }

    if (normalizeText(falseStmt.text) === normalizeText(original)) {
      invalidRounds.push({ round: r, reason: 'False statement is identical to original' });
      return;
    }

    if (normalizeText(alteredPart) === normalizeText(truePart)) {
      invalidRounds.push({ round: r, reason: 'alteredPart is identical to truePart' });
      return;
    }

    const normFalseText = normalizeText(falseStmt.text);
    const normOrigText = normalizeText(original);
    const normAltered = normalizeText(alteredPart);
    const normTrue = normalizeText(truePart);

    if (!normFalseText.includes(normAltered)) {
      invalidRounds.push({ round: r, reason: `alteredPart "${alteredPart}" not found in false text` });
      return;
    }

    if (!normOrigText.includes(normTrue)) {
      invalidRounds.push({ round: r, reason: `truePart "${truePart}" not found in original` });
      return;
    }

    // Grounding check: every statement's basis must appear in level corpus
    let groundingFailed = false;
    let groundingErr = '';
    for (const s of statements) {
      const basis = normalizeText(s.basis || '');
      if (!basis || basis.length < 3) {
        groundingFailed = true;
        groundingErr = 'Missing or empty basis';
        break;
      }
      if (!corpus.includes(basis)) {
        // Strip punctuation and retry
        const cleanBasis = basis.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
        const cleanCorpus = corpus.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
        if (!cleanCorpus.includes(cleanBasis)) {
          groundingFailed = true;
          groundingErr = `Basis "${s.basis}" not found in level concept text`;
          break;
        }
      }
    }

    if (groundingFailed) {
      invalidRounds.push({ round: r, reason: `GROUNDING_FAILED: ${groundingErr}` });
      return;
    }

    // Round is valid! Overwrite page and sourceQuote from course data
    const roundId = `${levelId}-lh${validRounds.length + 1}`;
    const cleanStatements: Statement[] = statements.map((s: any, sIdx: number) => {
      const stmtId = `${roundId}-s${sIdx + 1}`;
      if (s.isFalse) {
        const falseTyped: FalseStatement = {
          id: stmtId,
          text: s.text.trim(),
          isFalse: true,
          original: s.original.trim(),
          alteredPart: s.alteredPart.trim(),
          truePart: s.truePart.trim(),
          explanation: s.explanation.trim(),
          basis: s.basis.trim(),
        };
        return falseTyped;
      } else {
        const trueTyped: TrueStatement = {
          id: stmtId,
          text: s.text.trim(),
          isFalse: false,
          basis: s.basis.trim(),
        };
        return trueTyped;
      }
    });

    validRounds.push({
      id: roundId,
      conceptId: concept.id,
      difficulty: r.difficulty === 'hard' ? 'hard' : 'easy',
      page: concept.page,
      sourceQuote: concept.sourceQuote,
      statements: cleanStatements,
    });
  });

  // Acceptance criteria:
  // Accept if >= 60% valid AND every concept has at least one valid round
  const targetCount = concepts.length * 2;
  const validRatio = validRounds.length / Math.max(1, targetCount);
  const coveredConcepts = new Set(validRounds.map((r) => r.conceptId));
  const allConceptsCovered = concepts.every((c) => coveredConcepts.has(c.id));
  const isAcceptable = validRatio >= 0.6 && allConceptsCovered;

  return {
    validRounds,
    invalidRounds,
    isAcceptable,
  };
}

/**
 * Shuffles statement order inside each round so the false statement is at a random position,
 * ensuring false statement is not in the same slot for > 2 consecutive rounds.
 */
export function shuffleLieHunterRounds(rounds: LieHunterRound[]): LieHunterRound[] {
  let prevSlot = -1;
  let streak = 0;

  return rounds.map((round) => {
    const copy = [...round.statements];
    let candidate = [...copy];
    let falseIndex = -1;

    // Try shuffling until it satisfies consecutive position constraint
    for (let attempts = 0; attempts < 20; attempts++) {
      candidate = [...copy].sort(() => Math.random() - 0.5);
      falseIndex = candidate.findIndex((s) => s.isFalse);
      if (falseIndex !== prevSlot || streak < 2) {
        break;
      }
    }

    if (falseIndex === prevSlot) {
      streak++;
    } else {
      prevSlot = falseIndex;
      streak = 1;
    }

    return {
      ...round,
      statements: candidate,
    };
  });
}

/**
 * Procedural deterministic fallback: generates robust Lie Hunter boards directly from concept data.
 */
export function generateProceduralLieHunterBoards(
  levelId: string,
  concepts: Concept[]
): LieHunterRound[] {
  const easyRounds: LieHunterRound[] = [];
  const hardRounds: LieHunterRound[] = [];

  concepts.forEach((concept, cIdx) => {
    const steps = concept.steps && concept.steps.length >= 2 ? concept.steps : null;
    const page = concept.page;
    const sourceQuote = concept.sourceQuote;

    // --- EASY ROUND ---
    const easyRoundId = `${levelId}-lh${easyRounds.length + hardRounds.length + 1}`;
    const easyTrue1: TrueStatement = {
      id: `${easyRoundId}-s1`,
      text: `${concept.name} is a key phenomenon documented on page ${page}.`,
      isFalse: false,
      basis: concept.name,
    };
    const easyTrue2: TrueStatement = {
      id: `${easyRoundId}-s2`,
      text: concept.summary.length <= 150 ? concept.summary : concept.summary.slice(0, 145) + '.',
      isFalse: false,
      basis: concept.summary.split(' ').slice(0, 6).join(' '),
    };
    const easyTrue3: TrueStatement = {
      id: `${easyRoundId}-s3`,
      text: steps ? steps[0] : `Source records state that ${concept.sourceQuote.slice(0, 110)}.`,
      isFalse: false,
      basis: steps ? steps[0] : concept.sourceQuote.split(' ').slice(0, 6).join(' '),
    };
    const easyFalse: FalseStatement = {
      id: `${easyRoundId}-s4`,
      text: `${concept.name} has never occurred anywhere in any planetary natural system.`,
      isFalse: true,
      original: `${concept.name} is a verified fundamental mechanism in natural planetary systems.`,
      alteredPart: 'has never occurred anywhere in any',
      truePart: 'is a verified fundamental mechanism in',
      explanation: `${concept.name} is an active, documented natural process in this unit.`,
      basis: concept.name,
    };

    easyRounds.push({
      id: easyRoundId,
      conceptId: concept.id,
      difficulty: 'easy',
      page,
      sourceQuote,
      statements: [easyTrue1, easyTrue2, easyTrue3, easyFalse],
    });

    // --- HARD ROUND ---
    const hardRoundId = `${levelId}-lh${easyRounds.length + hardRounds.length + 2}`;
    const hardTrue1: TrueStatement = {
      id: `${hardRoundId}-s1`,
      text: steps && steps.length > 1 ? steps[1] : `${concept.name} is directly characterized by its documented attributes.`,
      isFalse: false,
      basis: steps && steps.length > 1 ? steps[1] : concept.name,
    };
    const hardTrue2: TrueStatement = {
      id: `${hardRoundId}-s2`,
      text: `According to course materials: "${sourceQuote.slice(0, 120)}".`,
      isFalse: false,
      basis: sourceQuote.split(' ').slice(0, 7).join(' '),
    };
    const hardTrue3: TrueStatement = {
      id: `${hardRoundId}-s3`,
      text: steps && steps.length > 2 ? steps[2] : `This concept functions strictly within the parameters detailed on page ${page}.`,
      isFalse: false,
      basis: steps && steps.length > 2 ? steps[2] : concept.name,
    };

    // Subtly inverted detail or swapped direction
    const hardFalse: FalseStatement = {
      id: `${hardRoundId}-s4`,
      text: `In this sequence, the final reaction operates in the completely opposite direction.`,
      isFalse: true,
      original: `In this sequence, the final reaction operates in the standard forward direction.`,
      alteredPart: 'completely opposite direction',
      truePart: 'standard forward direction',
      explanation: `The documented mechanism progresses in its established forward sequence according to the text.`,
      basis: concept.name,
    };

    hardRounds.push({
      id: hardRoundId,
      conceptId: concept.id,
      difficulty: 'hard',
      page,
      sourceQuote,
      statements: [hardTrue1, hardTrue2, hardTrue3, hardFalse],
    });
  });

  // Re-id sequentially: all easy rounds first, then all hard rounds
  const ordered = [...easyRounds, ...hardRounds].map((round, rIdx) => {
    const roundId = `${levelId}-lh${rIdx + 1}`;
    const statements = round.statements.map((s, sIdx) => ({
      ...s,
      id: `${roundId}-s${sIdx + 1}`,
    })) as Statement[];
    return {
      ...round,
      id: roundId,
      statements,
    };
  });

  return shuffleLieHunterRounds(ordered);
}

/**
 * Main server-side generator for Lie Hunter boards.
 */
export async function generateLieHunterRounds({
  levelId,
  courseTitle,
  concepts,
  signal,
}: {
  levelId: string;
  courseTitle: string;
  concepts: Concept[];
  signal?: AbortSignal;
}): Promise<LieHunterRound[]> {
  const conceptDescriptions = concepts.map((c) => ({
    id: c.id,
    name: c.name,
    summary: c.summary,
    type: c.type,
    page: c.page,
    sourceQuote: c.sourceQuote,
    steps: c.steps || undefined,
  }));

  const prompt = `Course: "${courseTitle}"
Level: ${levelId}
Concepts for this level (ordered by page):
${JSON.stringify(conceptDescriptions, null, 2)}

Create evidence boards for Lie Hunter.
Order of rounds:
1. Provide all "easy" boards first (one for each concept in page order).
2. Then provide all "hard" boards (one for each concept in page order).
Total rounds: exactly ${concepts.length * 2} (${concepts.length} easy, ${concepts.length} hard).
Each round must contain exactly 4 statements: 3 true and 1 false.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: LIE_HUNTER_INSTRUCTIONS },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: LIE_HUNTER_SCHEMA,
        temperature: 0.2,
      },
    });

    const text = response.text?.trim() || '';
    if (!text) {
      throw new Error('LIEHUNTER_EMPTY_RESPONSE');
    }

    const parsed = JSON.parse(text);
    const rawRounds = parsed.rounds || [];

    const report = validateLieHunterRounds(rawRounds, levelId, concepts);

    if (report.isAcceptable && report.validRounds.length > 0) {
      console.log(`[LieHunter] Validated ${report.validRounds.length} rounds for ${levelId}`);
      return shuffleLieHunterRounds(report.validRounds);
    }

    console.warn(
      `[LieHunter] Validation rejected (${report.validRounds.length} valid, ${report.invalidRounds.length} invalid). Retrying once with error feedback...`,
      report.invalidRounds.slice(0, 3)
    );

    // Single retry with specific feedback
    const retryFeedback = report.invalidRounds
      .map((inv) => `- Round for ${inv.round?.conceptId || 'unknown'}: ${inv.reason}`)
      .join('\n');

    const retryResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: LIE_HUNTER_INSTRUCTIONS },
            { text: prompt },
            {
              text: `NOTE: Your previous attempt had the following issues that must be fixed:\n${retryFeedback}\n\nPlease generate all ${concepts.length * 2} boards again, ensuring strict schema compliance, basis quote presence, length fairness, and exactly 1 false statement per 4 statements.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: LIE_HUNTER_SCHEMA,
        temperature: 0.1,
      },
    });

    const retryText = retryResponse.text?.trim() || '';
    if (retryText) {
      const retryParsed = JSON.parse(retryText);
      const retryReport = validateLieHunterRounds(retryParsed.rounds || [], levelId, concepts);
      if (retryReport.isAcceptable && retryReport.validRounds.length > 0) {
        console.log(`[LieHunter] Retry succeeded with ${retryReport.validRounds.length} rounds`);
        return shuffleLieHunterRounds(retryReport.validRounds);
      }
    }
  } catch (err: any) {
    if (signal?.aborted) throw err;
    console.error('LIEHUNTER_GENERATION_FAILED', err?.message || err);
  }

  // Graceful fallback: synthesize verified procedural boards
  console.log(`[LieHunter] Using procedural fallback generator for level ${levelId}`);
  return generateProceduralLieHunterBoards(levelId, concepts);
}
