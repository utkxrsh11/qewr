import { Type } from '@google/genai';
import { ai } from './gemini.ts';
import { Concept, PlatformerRound, PlatformerStep, PlatformerDecoy } from '../src/types/course.ts';

const PLATFORMER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    levelId: { type: Type.STRING },
    rounds: {
      type: Type.ARRAY,
      description: 'List of process ordering rounds (one per concept with optional challenge round)',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          conceptId: { type: Type.STRING },
          kind: { type: Type.STRING, enum: ['order', 'challenge'] },
          title: { type: Type.STRING },
          instruction: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING, description: 'Step label max 60 chars with no numbering' },
                explanation: { type: Type.STRING, description: '1-2 sentences max 200 chars' },
              },
              required: ['id', 'label', 'explanation'],
            },
          },
          decoy: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              whyNot: { type: Type.STRING },
            },
            required: ['id', 'label', 'whyNot'],
          },
          page: { type: Type.INTEGER },
          sourceQuote: { type: Type.STRING },
        },
        required: ['id', 'conceptId', 'title', 'instruction', 'steps'],
      },
    },
  },
  required: ['levelId', 'rounds'],
};

const PLATFORMER_INSTRUCTIONS = `You are an expert teacher turning processes into ordering challenges. Using ONLY the concept information provided (name, summary, steps, source quote), create one ordering challenge per concept. Rules:
1. title: a short challenge title, max 60 characters.
2. instruction: one sentence telling the student what to put in order, max 120 characters (for example 'Put the stages of cellular respiration in the correct order').
3. steps: the process steps in the CORRECT order. Use the provided steps and keep their order. Never reorder them and never invent steps that are not supported by the provided information. Rewrite each step as a short, clear label of at most 60 characters, with no numbering such as '1.'. If more than 8 steps are provided, merge neighboring steps so that there are at most 8. If fewer than 2 steps are provided, return an empty steps array.
4. For each step also provide an explanation of 1 to 2 sentences (max 200 characters) saying what happens in this step and why it comes at this point in the process, for example what it depends on from the previous step.
5. decoy (optional): only when there are 4 or more steps, provide ONE plausible but incorrect extra step that a student could confuse with the process, for example a step from a similar process mentioned in the material or a common misconception. Give its label (max 60 characters) and whyNot (1 to 2 sentences explaining why it does not belong in this process). The decoy must be clearly distinguishable from the real steps using the provided information. If you cannot create a good decoy, set decoy to null.
6. Include the conceptId and the page number exactly as provided.
7. Return ONLY valid JSON matching the schema. No markdown, no commentary.`;

/**
 * Builds resilient offline fallback rounds directly from concept data.
 */
export function buildOfflinePlatformerRounds(levelId: string, concepts: Concept[]): PlatformerRound[] {
  const processConcepts = concepts.filter((c) => c.type === 'process');
  const rounds: PlatformerRound[] = [];

  processConcepts.forEach((concept, cIdx) => {
    const rawSteps = concept.steps && concept.steps.length >= 2 ? concept.steps : ['Initial stage', 'Concluding stage'];
    const truncatedSteps: PlatformerStep[] = [];

    const maxItems = Math.min(8, rawSteps.length);
    for (let i = 0; i < maxItems; i++) {
      let label = rawSteps[i].replace(/^\d+[\.\)\s]+/, '').trim();
      if (i === maxItems - 1 && rawSteps.length > 8) {
        label = (label.slice(0, 40) + ' and further steps').slice(0, 60);
      } else {
        if (label.length > 60) {
          label = label.slice(0, 57).trim() + '...';
        }
      }

      const summaryExcerpt = concept.summary.length > 150 ? concept.summary.slice(0, 147) + '...' : concept.summary;
      const explanation = `Step ${i + 1} of ${concept.name}. ${summaryExcerpt}`.slice(0, 200);

      truncatedSteps.push({
        id: `${levelId}-c${cIdx + 1}-r1-s${i + 1}`,
        label,
        explanation,
      });
    }

    const orderRound: PlatformerRound = {
      id: `${levelId}-c${cIdx + 1}-r1`,
      conceptId: concept.id,
      kind: 'order',
      title: `${concept.name.slice(0, 45)} Sequence`,
      instruction: `Put the stages of ${concept.name.toLowerCase()} in the correct order.`.slice(0, 120),
      steps: truncatedSteps,
      decoy: null,
      page: concept.page,
      sourceQuote: concept.sourceQuote,
    };
    rounds.push(orderRound);
  });

  return rounds.slice(0, 4);
}

/**
 * Extract significant words for validation check.
 */
function getSignificantWords(text: string): Set<string> {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'into']);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
  );
}

/**
 * Validates generated platformer output against strict schema rules.
 */
export function validatePlatformerRounds(
  rawJson: any,
  concepts: Concept[],
  levelId: string
): { isValid: boolean; rounds: PlatformerRound[]; issues: string[] } {
  const issues: string[] = [];
  if (!rawJson || typeof rawJson !== 'object') {
    return { isValid: false, rounds: [], issues: ['Response is not an object'] };
  }

  const rawRounds = rawJson.rounds;
  if (!Array.isArray(rawRounds) || rawRounds.length === 0) {
    return { isValid: false, rounds: [], issues: ['rounds must be a non-empty array'] };
  }

  const processConceptsMap = new Map<string, Concept>();
  concepts.forEach((c) => {
    if (c.type === 'process') {
      processConceptsMap.set(c.id, c);
    }
  });

  const validatedRounds: PlatformerRound[] = [];
  const seenRoundIds = new Set<string>();

  for (let rIdx = 0; rIdx < rawRounds.length; rIdx++) {
    const r = rawRounds[rIdx];
    if (!r || typeof r !== 'object') {
      issues.push(`Round ${rIdx} is not an object`);
      continue;
    }

    const concept = processConceptsMap.get(r.conceptId);
    if (!concept) {
      issues.push(`Round ${rIdx} references unknown or non-process concept ${r.conceptId}`);
      continue;
    }

    const steps = r.steps;
    if (!Array.isArray(steps) || steps.length < 2 || steps.length > 8) {
      issues.push(`Round ${rIdx} steps count must be between 2 and 8 (got ${steps?.length})`);
      continue;
    }

    const origSteps = concept.steps || [];
    if (origSteps.length > 0 && steps.length > origSteps.length) {
      issues.push(`Round ${rIdx} step count (${steps.length}) exceeds original step count (${origSteps.length})`);
      continue;
    }

    // Step check: distinct labels, max 60 chars, explanations max 200 chars
    const seenLabels = new Set<string>();
    const seenStepIds = new Set<string>();
    const validatedSteps: PlatformerStep[] = [];
    let stepFailed = false;

    for (let sIdx = 0; sIdx < steps.length; sIdx++) {
      const s = steps[sIdx];
      if (!s || typeof s !== 'object') {
        issues.push(`Round ${rIdx} step ${sIdx} is invalid`);
        stepFailed = true;
        break;
      }
      const label = String(s.label || '').trim();
      const explanation = String(s.explanation || '').trim();

      if (!label || label.length > 60) {
        issues.push(`Round ${rIdx} step ${sIdx} label invalid length (1-60 chars): "${label}"`);
        stepFailed = true;
        break;
      }
      const lower = label.toLowerCase();
      if (seenLabels.has(lower)) {
        issues.push(`Round ${rIdx} step label duplicated: "${label}"`);
        stepFailed = true;
        break;
      }
      seenLabels.add(lower);

      if (!explanation || explanation.length > 200) {
        issues.push(`Round ${rIdx} step ${sIdx} explanation invalid length (1-200 chars)`);
        stepFailed = true;
        break;
      }

      // Check alignment with original step if step count matches
      if (origSteps.length > 0 && steps.length === origSteps.length && origSteps[sIdx]) {
        const origWords = getSignificantWords(origSteps[sIdx]);
        const labelWords = getSignificantWords(label);
        let hasOverlap = false;
        for (const w of labelWords) {
          if (origWords.has(w)) {
            hasOverlap = true;
            break;
          }
        }
        if (!hasOverlap && origWords.size > 0 && labelWords.size > 0) {
          // If no direct word match, check substring
          const origLower = origSteps[sIdx].toLowerCase();
          for (const w of labelWords) {
            if (origLower.includes(w)) {
              hasOverlap = true;
              break;
            }
          }
          if (!hasOverlap) {
            issues.push(`Round ${rIdx} step ${sIdx} ("${label}") does not match original step content ("${origSteps[sIdx].slice(0, 30)}")`);
            stepFailed = true;
            break;
          }
        }
      }

      const stepId = s.id && !seenStepIds.has(s.id) ? s.id : `${levelId}-r${rIdx + 1}-s${sIdx + 1}`;
      seenStepIds.add(stepId);

      validatedSteps.push({
        id: stepId,
        label,
        explanation,
      });
    }

    if (stepFailed) continue;

    // Validate decoy
    let validatedDecoy: PlatformerDecoy | null = null;
    if (r.decoy && typeof r.decoy === 'object') {
      const dLabel = String(r.decoy.label || '').trim();
      const whyNot = String(r.decoy.whyNot || '').trim();
      if (dLabel && whyNot) {
        if (dLabel.length <= 60 && !seenLabels.has(dLabel.toLowerCase())) {
          validatedDecoy = {
            id: r.decoy.id || `${levelId}-r${rIdx + 1}-d1`,
            label: dLabel,
            whyNot: whyNot.slice(0, 200),
          };
        } else {
          issues.push(`Round ${rIdx} decoy invalid or duplicates real step`);
        }
      }
    }

    const roundId = r.id && !seenRoundIds.has(r.id) ? r.id : `${levelId}-r${rIdx + 1}`;
    seenRoundIds.add(roundId);

    // Overwrite page and sourceQuote from course concept data
    validatedRounds.push({
      id: roundId,
      conceptId: concept.id,
      kind: r.kind === 'challenge' ? 'challenge' : 'order',
      title: String(r.title || `${concept.name} Sequence`).slice(0, 60),
      instruction: String(r.instruction || `Put the stages of ${concept.name.toLowerCase()} in order.`).slice(0, 120),
      steps: validatedSteps,
      decoy: validatedDecoy,
      page: concept.page,
      sourceQuote: concept.sourceQuote,
    });
  }

  // Assemble order and challenge rounds according to section 6 spec
  // For each concept: order round then challenge round (if 4+ steps and valid decoy)
  // Cap at 4 rounds total
  const finalRounds: PlatformerRound[] = [];
  const conceptIds = Array.from(processConceptsMap.keys());

  conceptIds.forEach((cid) => {
    const matching = validatedRounds.filter((vr) => vr.conceptId === cid);
    const order = matching.find((m) => m.kind === 'order') || matching[0];
    if (order) {
      finalRounds.push({ ...order, kind: 'order', decoy: null });
      const challengeCandidate = matching.find((m) => m.kind === 'challenge' && m.decoy !== null);
      if (challengeCandidate && order.steps.length >= 4 && challengeCandidate.decoy) {
        finalRounds.push({
          ...order,
          id: `${order.id}-ch`,
          kind: 'challenge',
          decoy: challengeCandidate.decoy,
          title: `Challenge: ${order.title}`.slice(0, 60),
        });
      }
    }
  });

  // Cap at 4 rounds by dropping challenge rounds from the end
  let capped = [...finalRounds];
  while (capped.length > 4) {
    const lastChallengeIdx = capped.map((r) => r.kind).lastIndexOf('challenge');
    if (lastChallengeIdx !== -1) {
      capped.splice(lastChallengeIdx, 1);
    } else {
      capped.pop();
    }
  }

  return {
    isValid: capped.length > 0 && issues.length === 0,
    rounds: capped,
    issues,
  };
}

/**
 * Generate platformer rounds for process concepts via Gemini with retry and fallback.
 */
export async function generatePlatformerRounds({
  levelId,
  courseTitle,
  concepts,
  signal,
}: {
  levelId: string;
  courseTitle: string;
  concepts: Concept[];
  signal?: AbortSignal;
}): Promise<PlatformerRound[]> {
  const processConcepts = concepts.filter((c) => c.type === 'process');
  if (processConcepts.length === 0) {
    return [];
  }

  const promptConceptsText = processConcepts
    .map(
      (c, idx) =>
        `CONCEPT ${idx + 1}:
conceptId: ${c.id}
name: ${c.name}
page: ${c.page}
sourceQuote: ${c.sourceQuote}
summary: ${c.summary}
steps:
${(c.steps || []).map((s, si) => `  ${si + 1}. ${s}`).join('\n')}`
    )
    .join('\n\n');

  const basePrompt = `Course: "${courseTitle}"
Level: "${levelId}"

${PLATFORMER_INSTRUCTIONS}

CONCEPTS FOR THIS LEVEL:
${promptConceptsText}`;

  try {
    // Attempt 1: Gemini call
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: basePrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: PLATFORMER_SCHEMA,
        temperature: 0.2,
      },
    });

    if (signal?.aborted) throw new Error('ABORTED');

    const text = response.text || '';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // JSON parse error
    }

    if (parsed) {
      const validation = validatePlatformerRounds(parsed, processConcepts, levelId);
      if (validation.isValid && validation.rounds.length > 0) {
        return validation.rounds;
      }

      console.warn(`[PlatformerGenerator] Attempt 1 validation issues:`, validation.issues);

      // Attempt 2: Retry with exact issues listed
      const retryPrompt = `${basePrompt}

CRITICAL FIX NEEDED: Your previous response had the following validation issues:
${validation.issues.slice(0, 5).join('\n')}

Please regenerate strictly fixing each issue. Maintain exact step order and <=60 chars per label.`;

      const retryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: retryPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: PLATFORMER_SCHEMA,
          temperature: 0.1,
        },
      });

      if (signal?.aborted) throw new Error('ABORTED');
      try {
        const retryParsed = JSON.parse(retryResponse.text || '');
        const retryValidation = validatePlatformerRounds(retryParsed, processConcepts, levelId);
        if (retryValidation.rounds.length > 0) {
          return retryValidation.rounds;
        }
      } catch (err) {
        console.warn('[PlatformerGenerator] Retry parse error:', err);
      }
    }
  } catch (err: any) {
    if (signal?.aborted || err?.message === 'ABORTED') {
      throw new Error('ABORTED');
    }
    console.warn('[PlatformerGenerator] Gemini call failed, utilizing offline fallback:', err);
  }

  // Guaranteed offline fallback per Section 6
  console.log(`[PlatformerGenerator] Using offline fallback for level ${levelId}`);
  return buildOfflinePlatformerRounds(levelId, processConcepts);
}
