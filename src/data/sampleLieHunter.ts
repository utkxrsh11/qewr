import { LieHunterRound } from '../types/course.ts';

/**
 * Built-in Sample Lie Hunter Boards for Hydrologic Cycle Course.
 * Perfectly valid against the Phase 4 schema, grounding constraints, and length fairness rules.
 */
export const SAMPLE_LIE_HUNTER_BOARDS: Record<string, LieHunterRound[]> = {
  'ch1-L1': [
    // 1. Concept 1 Easy: Solar Evaporation Cycle (ch1-c1, p1)
    {
      id: 'ch1-L1-lh1',
      conceptId: 'ch1-c1',
      difficulty: 'easy',
      page: 1,
      sourceQuote: 'Solar radiation heats oceanic and freshwater surfaces, driving evaporation into the lower atmosphere.',
      statements: [
        {
          id: 'ch1-L1-lh1-s1',
          text: 'Incoming solar radiation strikes exposed water surfaces across the globe.',
          isFalse: false,
          basis: 'Solar radiation strikes exposed water surfaces',
        },
        {
          id: 'ch1-L1-lh1-s2',
          text: 'Surface molecules absorb thermal energy and break hydrogen bonds.',
          isFalse: false,
          basis: 'Surface molecules absorb thermal energy and break hydrogen bonds',
        },
        {
          id: 'ch1-L1-lh1-s3',
          text: 'Liquid water freezes directly into solid iceberg structures in the ocean.',
          isFalse: true,
          original: 'Liquid water undergoes phase change into invisible water vapor.',
          alteredPart: 'freezes directly into solid iceberg structures in the ocean',
          truePart: 'undergoes phase change into invisible water vapor',
          explanation: 'Solar evaporation causes liquid water to vaporize into gas, rather than freezing into icebergs.',
          basis: 'Liquid water undergoes phase change into invisible water vapor',
        },
        {
          id: 'ch1-L1-lh1-s4',
          text: 'Warm, low-density vapor rises upward into the cooler troposphere.',
          isFalse: false,
          basis: 'Warm, low-density vapor rises into the cooler troposphere',
        },
      ],
    },

    // 2. Concept 2 Easy: Latent Heat of Vaporization (ch1-c2, p2)
    {
      id: 'ch1-L1-lh2',
      conceptId: 'ch1-c2',
      difficulty: 'easy',
      page: 2,
      sourceQuote: 'The latent heat of vaporization requires approximately 2,260 J/g, transferring immense thermal energy across climate zones.',
      statements: [
        {
          id: 'ch1-L1-lh2-s1',
          text: 'Water requires an exceptionally high energy input of roughly 2,260 Joules per gram.',
          isFalse: false,
          basis: 'roughly 2,260 Joules per gram',
        },
        {
          id: 'ch1-L1-lh2-s2',
          text: 'This process acts as the primary thermal transport mechanism on Earth.',
          isFalse: false,
          basis: 'primary thermal transport mechanism on Earth',
        },
        {
          id: 'ch1-L1-lh2-s3',
          text: 'Vaporization transfers zero thermal energy across planetary climate zones.',
          isFalse: true,
          original: 'Vaporization transfers immense thermal energy across climate zones.',
          alteredPart: 'zero thermal energy across planetary',
          truePart: 'immense thermal energy across',
          explanation: 'The latent heat of vaporization transfers immense thermal energy between climate regions rather than zero energy.',
          basis: 'transferring immense thermal energy across climate zones',
        },
        {
          id: 'ch1-L1-lh2-s4',
          text: 'The latent heat of vaporization requires approximately 2,260 J/g to vaporize.',
          isFalse: false,
          basis: 'latent heat of vaporization requires approximately 2,260 J/g',
        },
      ],
    },

    // 3. Concept 3 Easy: Condensation Nuclei (ch1-c3, p3)
    {
      id: 'ch1-L1-lh3',
      conceptId: 'ch1-c3',
      difficulty: 'easy',
      page: 3,
      sourceQuote: 'Condensation requires microscopic suspended particles known as condensation nuclei for droplet accretion.',
      statements: [
        {
          id: 'ch1-L1-lh3-s1',
          text: 'Condensation requires microscopic suspended particles for droplet accretion.',
          isFalse: false,
          basis: 'microscopic suspended particles known as condensation nuclei',
        },
        {
          id: 'ch1-L1-lh3-s2',
          text: 'Microscopic suspended particles include sea salt, volcanic ash, dust, and aerosols.',
          isFalse: false,
          basis: 'sea salt, volcanic ash, dust, and aerosols',
        },
        {
          id: 'ch1-L1-lh3-s3',
          text: 'These particles provide physical surfaces upon which vapor condenses into droplets.',
          isFalse: false,
          basis: 'provide physical surfaces upon which vapor condenses into cloud droplets',
        },
        {
          id: 'ch1-L1-lh3-s4',
          text: 'Giant heavy boulders suspended in the air provide nuclei for droplet accretion.',
          isFalse: true,
          original: 'Microscopic suspended particles in the air provide nuclei for droplet accretion.',
          alteredPart: 'Giant heavy boulders',
          truePart: 'Microscopic suspended particles',
          explanation: 'Condensation nuclei are microscopic suspended particles like dust or salt, not giant boulders.',
          basis: 'microscopic suspended particles known as condensation nuclei',
        },
      ],
    },

    // 4. Concept 1 Hard: Solar Evaporation Cycle (ch1-c1, p1)
    {
      id: 'ch1-L1-lh4',
      conceptId: 'ch1-c1',
      difficulty: 'hard',
      page: 1,
      sourceQuote: 'Solar radiation heats oceanic and freshwater surfaces, driving evaporation into the lower atmosphere.',
      statements: [
        {
          id: 'ch1-L1-lh4-s1',
          text: 'Solar irradiance warms surface water in oceans, lakes, and rivers across Earth.',
          isFalse: false,
          basis: 'Solar irradiance warms surface water in oceans, lakes, and rivers',
        },
        {
          id: 'ch1-L1-lh4-s2',
          text: 'Heavy, high-density vapor sinks downward into the cooler troposphere.',
          isFalse: true,
          original: 'Warm, low-density vapor rises upward into the cooler troposphere.',
          alteredPart: 'Heavy, high-density vapor sinks downward',
          truePart: 'Warm, low-density vapor rises upward',
          explanation: 'Water vapor is warm and low-density, which causes it to rise into the atmosphere rather than sink.',
          basis: 'Warm, low-density vapor rises into the cooler troposphere',
        },
        {
          id: 'ch1-L1-lh4-s3',
          text: 'Surface molecules absorb thermal energy to break intermolecular hydrogen bonds.',
          isFalse: false,
          basis: 'Surface molecules absorb thermal energy and break hydrogen bonds',
        },
        {
          id: 'ch1-L1-lh4-s4',
          text: 'Liquid water undergoes phase change into invisible water vapor in the air.',
          isFalse: false,
          basis: 'Liquid water undergoes phase change into invisible water vapor',
        },
      ],
    },

    // 5. Concept 2 Hard: Latent Heat of Vaporization (ch1-c2, p2)
    {
      id: 'ch1-L1-lh5',
      conceptId: 'ch1-c2',
      difficulty: 'hard',
      page: 2,
      sourceQuote: 'The latent heat of vaporization requires approximately 2,260 J/g, transferring immense thermal energy across climate zones.',
      statements: [
        {
          id: 'ch1-L1-lh5-s1',
          text: 'Water requires an energy input of roughly 2,260 Joules per gram to vaporize.',
          isFalse: false,
          basis: 'energy input of roughly 2,260 Joules per gram to vaporize',
        },
        {
          id: 'ch1-L1-lh5-s2',
          text: 'This phase change functions as the primary thermal transport mechanism on Earth.',
          isFalse: false,
          basis: 'primary thermal transport mechanism on Earth',
        },
        {
          id: 'ch1-L1-lh5-s3',
          text: 'The latent heat of vaporization requires approximately 450 J/g to vaporize water.',
          isFalse: true,
          original: 'The latent heat of vaporization requires approximately 2,260 J/g to vaporize water.',
          alteredPart: '450 J/g',
          truePart: '2,260 J/g',
          explanation: 'The latent heat of vaporization of water is approximately 2,260 J/g, not 450 J/g.',
          basis: 'latent heat of vaporization requires approximately 2,260 J/g',
        },
        {
          id: 'ch1-L1-lh5-s4',
          text: 'Immense thermal energy is transferred across planetary climate zones by vapor.',
          isFalse: false,
          basis: 'transferring immense thermal energy across climate zones',
        },
      ],
    },

    // 6. Concept 3 Hard: Condensation Nuclei (ch1-c3, p3)
    {
      id: 'ch1-L1-lh6',
      conceptId: 'ch1-c3',
      difficulty: 'hard',
      page: 3,
      sourceQuote: 'Condensation requires microscopic suspended particles known as condensation nuclei for droplet accretion.',
      statements: [
        {
          id: 'ch1-L1-lh6-s1',
          text: 'Microscopic suspended particles are known as condensation nuclei for accretion.',
          isFalse: false,
          basis: 'microscopic suspended particles known as condensation nuclei',
        },
        {
          id: 'ch1-L1-lh6-s2',
          text: 'Condensation nuclei provide physical surfaces upon which vapor condenses into droplets.',
          isFalse: false,
          basis: 'provide physical surfaces upon which vapor condenses into cloud droplets',
        },
        {
          id: 'ch1-L1-lh6-s3',
          text: 'Microscopic suspended particles including sea salt, volcanic ash, dust, and aerosols.',
          isFalse: false,
          basis: 'sea salt, volcanic ash, dust, and aerosols',
        },
        {
          id: 'ch1-L1-lh6-s4',
          text: 'Vapor condenses spontaneously in pure vacuum without needing any physical surfaces.',
          isFalse: true,
          original: 'Condensation requires microscopic suspended particles that provide physical surfaces.',
          alteredPart: 'spontaneously in pure vacuum without needing any',
          truePart: 'requires microscopic suspended particles that provide',
          explanation: 'In the atmosphere, condensation requires physical particle surfaces (nuclei) rather than occurring spontaneously in vacuum.',
          basis: 'provide physical surfaces upon which vapor condenses into cloud droplets',
        },
      ],
    },
  ],

  'ch2-L1': [
    // 1. Concept 1 Easy: Orographic Precipitation Mechanism (ch2-c1, p4)
    {
      id: 'ch2-L1-lh1',
      conceptId: 'ch2-c1',
      difficulty: 'easy',
      page: 4,
      sourceQuote: 'When moist winds encounter mountainous barriers, forced ascent induces adiabatic cooling and orographic rain.',
      statements: [
        {
          id: 'ch2-L1-lh1-s1',
          text: 'Moist maritime air mass approaches an elevated mountain range.',
          isFalse: false,
          basis: 'Moist maritime air mass approaches an elevated mountain range',
        },
        {
          id: 'ch2-L1-lh1-s2',
          text: 'Topographical obstruction forces the air to ascend rapidly.',
          isFalse: false,
          basis: 'Topographical obstruction forces the air to ascend rapidly',
        },
        {
          id: 'ch2-L1-lh1-s3',
          text: 'Adiabatic expansion heats the air mass to boiling volcanic temperatures.',
          isFalse: true,
          original: 'Adiabatic expansion cools the air mass to its dew point temperature.',
          alteredPart: 'heats the air mass to boiling volcanic temperatures',
          truePart: 'cools the air mass to its dew point temperature',
          explanation: 'Ascending air undergoes adiabatic expansion which cools it to dew point, not heating it.',
          basis: 'Adiabatic expansion cools the air mass to its dew point temperature',
        },
        {
          id: 'ch2-L1-lh1-s4',
          text: 'Precipitation falls on windward slopes while dry air creates a leeward rain shadow.',
          isFalse: false,
          basis: 'Precipitation falls on the windward slope while dry air creates a leeward rain shadow',
        },
      ],
    },

    // 2. Concept 2 Easy: Aquifer Percolation Rate (ch2-c2, p5)
    {
      id: 'ch2-L1-lh2',
      conceptId: 'ch2-c2',
      difficulty: 'easy',
      page: 5,
      sourceQuote: 'Percolation through coarse sandy soil averages between 10 and 30 millimeters per hour into regional unconfined aquifers.',
      statements: [
        {
          id: 'ch2-L1-lh2-s1',
          text: 'Unconfined coarse sand aquifers exhibit typical percolation velocities.',
          isFalse: false,
          basis: 'Unconfined coarse sand aquifers exhibit typical percolation velocities',
        },
        {
          id: 'ch2-L1-lh2-s2',
          text: 'Percolation velocities average between 10 and 30 millimeters per hour.',
          isFalse: false,
          basis: 'averages between 10 and 30 millimeters per hour',
        },
        {
          id: 'ch2-L1-lh2-s3',
          text: 'Water percolates through sandy soil at five hundred kilometers per second.',
          isFalse: true,
          original: 'Water percolates through sandy soil at ten to thirty millimeters per hour.',
          alteredPart: 'five hundred kilometers per second',
          truePart: 'ten to thirty millimeters per hour',
          explanation: 'Percolation through coarse sand is a slow underground seep (10-30 mm/h), not high-speed flow.',
          basis: 'averages between 10 and 30 millimeters per hour',
        },
        {
          id: 'ch2-L1-lh2-s4',
          text: 'Percolation rates depend on hydraulic conductivity and grain packing.',
          isFalse: false,
          basis: 'hydraulic conductivity and grain packing',
        },
      ],
    },

    // 3. Concept 3 Easy: Groundwater Water Table (ch2-c3, p6)
    {
      id: 'ch2-L1-lh3',
      conceptId: 'ch2-c3',
      difficulty: 'easy',
      page: 6,
      sourceQuote: 'The water table defines the upper surface of the saturation zone beneath which all rock and soil pores are filled with water.',
      statements: [
        {
          id: 'ch2-L1-lh3-s1',
          text: 'The water table defines the upper surface of the saturation zone.',
          isFalse: false,
          basis: 'water table defines the upper surface of the saturation zone',
        },
        {
          id: 'ch2-L1-lh3-s2',
          text: 'Beneath the table, all rock and soil pores are filled with water.',
          isFalse: false,
          basis: 'all rock and soil pores are filled with water',
        },
        {
          id: 'ch2-L1-lh3-s3',
          text: 'The subterranean boundary surface where pore pressure equals atmospheric pressure.',
          isFalse: false,
          basis: 'pore pressure equals atmospheric pressure',
        },
        {
          id: 'ch2-L1-lh3-s4',
          text: 'The water table is a wooden dining furniture item placed inside caverns.',
          isFalse: true,
          original: 'The water table is a subterranean boundary separating hydrological zones.',
          alteredPart: 'wooden dining furniture item placed inside caverns',
          truePart: 'subterranean boundary separating hydrological zones',
          explanation: 'The groundwater water table is a subterranean hydrological boundary, not a wooden piece of furniture.',
          basis: 'subterranean boundary surface where pore pressure equals atmospheric pressure',
        },
      ],
    },

    // 4. Concept 1 Hard: Orographic Precipitation Mechanism (ch2-c1, p4)
    {
      id: 'ch2-L1-lh4',
      conceptId: 'ch2-c1',
      difficulty: 'hard',
      page: 4,
      sourceQuote: 'When moist winds encounter mountainous barriers, forced ascent induces adiabatic cooling and orographic rain.',
      statements: [
        {
          id: 'ch2-L1-lh4-s1',
          text: 'When moist winds encounter mountainous barriers, forced ascent induces cooling.',
          isFalse: false,
          basis: 'forced ascent induces adiabatic cooling and orographic rain',
        },
        {
          id: 'ch2-L1-lh4-s2',
          text: 'Heavy precipitation falls on the leeward slope creating a wet rainforest shadow.',
          isFalse: true,
          original: 'Precipitation falls on the windward slope while dry air creates a leeward rain shadow.',
          alteredPart: 'leeward slope creating a wet rainforest',
          truePart: 'windward slope while dry air creates a leeward rain',
          explanation: 'Rain falls on the windward side of mountains; the downwind leeward slope is sheltered in a dry rain shadow.',
          basis: 'Precipitation falls on the windward slope while dry air creates a leeward rain shadow',
        },
        {
          id: 'ch2-L1-lh4-s3',
          text: 'Topographical obstruction forces approaching moist air to ascend rapidly.',
          isFalse: false,
          basis: 'Topographical obstruction forces the air to ascend rapidly',
        },
        {
          id: 'ch2-L1-lh4-s4',
          text: 'Adiabatic expansion cools the air mass down to its dew point temperature.',
          isFalse: false,
          basis: 'Adiabatic expansion cools the air mass to its dew point temperature',
        },
      ],
    },

    // 5. Concept 2 Hard: Aquifer Percolation Rate (ch2-c2, p5)
    {
      id: 'ch2-L1-lh5',
      conceptId: 'ch2-c2',
      difficulty: 'hard',
      page: 5,
      sourceQuote: 'Percolation through coarse sandy soil averages between 10 and 30 millimeters per hour into regional unconfined aquifers.',
      statements: [
        {
          id: 'ch2-L1-lh5-s1',
          text: 'Percolation through coarse sandy soil averages between 10 and 30 mm per hour.',
          isFalse: false,
          basis: 'averages between 10 and 30 millimeters per hour',
        },
        {
          id: 'ch2-L1-lh5-s2',
          text: 'Unconfined coarse sand aquifers exhibit velocities determined by conductivity.',
          isFalse: false,
          basis: 'hydraulic conductivity and grain packing',
        },
        {
          id: 'ch2-L1-lh5-s3',
          text: 'Percolation through coarse sandy soil averages between 10 and 30 meters per second.',
          isFalse: true,
          original: 'Percolation through coarse sandy soil averages between 10 and 30 millimeters per hour.',
          alteredPart: 'meters per second',
          truePart: 'millimeters per hour',
          explanation: 'Aquifer percolation moves at millimeters per hour, not meters per second.',
          basis: 'averages between 10 and 30 millimeters per hour',
        },
        {
          id: 'ch2-L1-lh5-s4',
          text: 'Flow rates into regional unconfined aquifers depend on grain packing geometry.',
          isFalse: false,
          basis: 'hydraulic conductivity and grain packing',
        },
      ],
    },

    // 6. Concept 3 Hard: Groundwater Water Table (ch2-c3, p6)
    {
      id: 'ch2-L1-lh6',
      conceptId: 'ch2-c3',
      difficulty: 'hard',
      page: 6,
      sourceQuote: 'The water table defines the upper surface of the saturation zone beneath which all rock and soil pores are filled with water.',
      statements: [
        {
          id: 'ch2-L1-lh6-s1',
          text: 'The water table defines the upper surface of the subsurface saturation zone.',
          isFalse: false,
          basis: 'upper surface of the saturation zone',
        },
        {
          id: 'ch2-L1-lh6-s2',
          text: 'All rock and soil pores beneath this boundary are completely filled with water.',
          isFalse: false,
          basis: 'all rock and soil pores are filled with water',
        },
        {
          id: 'ch2-L1-lh6-s3',
          text: 'The boundary separates the lower vadose zone from the upper phreatic zone.',
          isFalse: true,
          original: 'The boundary separates the upper vadose zone from the fully saturated phreatic zone.',
          alteredPart: 'lower vadose zone from the upper',
          truePart: 'upper vadose zone from the fully saturated',
          explanation: 'The vadose zone lies above (upper), and the saturated phreatic zone lies below (lower).',
          basis: 'separating the upper vadose zone from the fully saturated phreatic zone',
        },
        {
          id: 'ch2-L1-lh6-s4',
          text: 'Pore pressure equals atmospheric pressure along this subterranean boundary surface.',
          isFalse: false,
          basis: 'pore pressure equals atmospheric pressure',
        },
      ],
    },
  ],
};
