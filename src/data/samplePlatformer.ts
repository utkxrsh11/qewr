/**
 * Sample Process Platformer Content
 * Pre-authored, validated rounds for the sample water cycle course.
 * Guarantees zero-network offline playability for mixed levels.
 */

import { PlatformerRound } from '../types/course.ts';

export const SAMPLE_PLATFORMER_ROUNDS: Record<string, PlatformerRound[]> = {
  // Level 1: ch1-L1 contains ch1-c1 (Solar Evaporation Cycle, 5 steps)
  'ch1-L1': [
    {
      id: 'ch1-L1-r1',
      conceptId: 'ch1-c1',
      kind: 'order',
      title: 'Solar Evaporation Sequence',
      instruction: 'Put the stages of solar evaporation in the correct physical sequence.',
      steps: [
        {
          id: 'ch1-L1-r1-s1',
          label: 'Solar radiation strikes exposed water surfaces',
          explanation: 'Incoming sunlight warms the surface layer of lakes and oceans, initiating heat transfer.',
        },
        {
          id: 'ch1-L1-r1-s2',
          label: 'Molecules absorb thermal energy and break bonds',
          explanation: 'Thermal energy overcomes intermolecular hydrogen bonding holding liquid water molecules together.',
        },
        {
          id: 'ch1-L1-r1-s3',
          label: 'Liquid undergoes phase change into invisible vapor',
          explanation: 'Energized molecules transition from liquid to gaseous water vapor.',
        },
        {
          id: 'ch1-L1-r1-s4',
          label: 'Warm, buoyant vapor rises into the troposphere',
          explanation: 'Warm humid air is less dense than surrounding air, causing natural convective lift.',
        },
        {
          id: 'ch1-L1-r1-s5',
          label: 'Ascending vapor expands and cools adiabatically',
          explanation: 'As vapor reaches lower atmospheric pressures, it expands and cools toward its dew point.',
        },
      ],
      decoy: null,
      page: 1,
      sourceQuote: 'Solar radiation heats oceanic and freshwater surfaces, driving evaporation into the lower atmosphere.',
    },
    {
      id: 'ch1-L1-r2',
      conceptId: 'ch1-c1',
      kind: 'challenge',
      title: 'Challenge: Solar Evaporation (Avoid Decoy!)',
      instruction: 'Order the true evaporation steps without stepping on the false decoy step.',
      steps: [
        {
          id: 'ch1-L1-r2-s1',
          label: 'Solar radiation strikes exposed water surfaces',
          explanation: 'Incoming sunlight warms the surface layer of lakes and oceans.',
        },
        {
          id: 'ch1-L1-r2-s2',
          label: 'Molecules absorb thermal energy and break bonds',
          explanation: 'Liquid water molecules absorb latent heat to break hydrogen bonds.',
        },
        {
          id: 'ch1-L1-r2-s3',
          label: 'Liquid undergoes phase change into invisible vapor',
          explanation: 'Phase transition produces gaseous vapor molecules.',
        },
        {
          id: 'ch1-L1-r2-s4',
          label: 'Warm, buoyant vapor rises into the troposphere',
          explanation: 'Low-density warm vapor rises into higher atmospheric layers.',
        },
        {
          id: 'ch1-L1-r2-s5',
          label: 'Ascending vapor expands and cools adiabatically',
          explanation: 'Adiabatic expansion cools the vapor toward droplet condensation.',
        },
      ],
      decoy: {
        id: 'ch1-L1-r2-d1',
        label: 'Molecules freeze immediately into high ice crystals',
        whyNot: 'Evaporated vapor ascends as a warm gas; evaporation does not immediately freeze into ice crystals at the surface.',
      },
      page: 1,
      sourceQuote: 'Solar radiation heats oceanic and freshwater surfaces, driving evaporation into the lower atmosphere.',
    },
  ],

  // Level 2: ch2-L1 contains ch2-c1 (Orographic Precipitation, 3 steps)
  'ch2-L1': [
    {
      id: 'ch2-L1-r1',
      conceptId: 'ch2-c1',
      kind: 'order',
      title: 'Orographic Precipitation Flow',
      instruction: 'Arrange the steps of mountain-induced precipitation in order.',
      steps: [
        {
          id: 'ch2-L1-r1-s1',
          label: 'Moist maritime air mass approaches mountain range',
          explanation: 'Prevailing winds transport moisture-rich ocean air toward coastal mountain barriers.',
        },
        {
          id: 'ch2-L1-r1-s2',
          label: 'Topography forces air to ascend and cool',
          explanation: 'Encountering elevated slopes, the air is physically forced upward and cools adiabatically.',
        },
        {
          id: 'ch2-L1-r1-s3',
          label: 'Precipitation discharges along the windward slope',
          explanation: 'Cooling past saturation causes condensed droplets to fall as heavy rainfall.',
        },
      ],
      decoy: null,
      page: 4,
      sourceQuote: 'When moist winds encounter mountainous barriers, forced ascent induces adiabatic cooling and orographic rain.',
    },
  ],
};
