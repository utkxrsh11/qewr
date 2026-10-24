/**
 * Built-in Sample Course: The Hydrologic Cycle
 * Exact Phase 1 schema, 2 chapters, 6 concepts covering fact, process, and detail.
 */

import { Course } from '../types/course.ts';

export const SAMPLE_COURSE: Course = {
  courseTitle: "Hydrologic Cycle & Global Water Systems",
  sourceName: "earth_science_water_cycle.pdf",
  totalPages: 6,
  createdAt: "2026-10-24T12:00:00.000Z",
  chapters: [
    {
      id: "ch1",
      title: "Atmospheric Water Movement & Evaporation",
      pageStart: 1,
      pageEnd: 3,
      concepts: [
        {
          id: "ch1-c1",
          name: "Solar Evaporation Cycle",
          summary: "Solar irradiance warms surface water in oceans, lakes, and rivers, supplying the thermal energy needed for liquid molecules to vaporize into the lower troposphere.",
          type: "process",
          page: 1,
          sourceQuote: "Solar radiation heats oceanic and freshwater surfaces, driving evaporation into the lower atmosphere.",
          steps: [
            "Solar radiation strikes exposed water surfaces",
            "Surface molecules absorb thermal energy and break hydrogen bonds",
            "Liquid water undergoes phase change into invisible water vapor",
            "Warm, low-density vapor rises into the cooler troposphere",
            "Ascending vapor expands and cools toward condensation threshold"
          ]
        },
        {
          id: "ch1-c2",
          name: "Latent Heat of Vaporization",
          summary: "Water requires an exceptionally high energy input of roughly 2,260 Joules per gram to vaporize, acting as the primary thermal transport mechanism on Earth.",
          type: "detail",
          page: 2,
          sourceQuote: "The latent heat of vaporization requires approximately 2,260 J/g, transferring immense thermal energy across climate zones."
        },
        {
          id: "ch1-c3",
          name: "Condensation Nuclei",
          summary: "Microscopic suspended particles including sea salt, volcanic ash, dust, and aerosols that provide physical surfaces upon which vapor condenses into cloud droplets.",
          type: "fact",
          page: 3,
          sourceQuote: "Condensation requires microscopic suspended particles known as condensation nuclei for droplet accretion."
        }
      ]
    },
    {
      id: "ch2",
      title: "Precipitation & Terrestrial Infiltration",
      pageStart: 4,
      pageEnd: 6,
      concepts: [
        {
          id: "ch2-c1",
          name: "Orographic Precipitation Mechanism",
          summary: "Prevailing winds push moisture-rich air against elevated mountain topography, inducing adiabatic cooling, condensation, and heavy rainfall on windward slopes.",
          type: "process",
          page: 4,
          sourceQuote: "When moist winds encounter mountainous barriers, forced ascent induces adiabatic cooling and orographic rain.",
          steps: [
            "Moist maritime air mass approaches an elevated mountain range",
            "Topographical obstruction forces the air to ascend and adiabatically cool",
            "Precipitation discharges along the windward slope"
          ]
        },
        {
          id: "ch2-c2",
          name: "Aquifer Percolation Rate",
          summary: "Unconfined coarse sand aquifers exhibit typical percolation velocities between 10 and 30 millimeters per hour depending on hydraulic conductivity and grain packing.",
          type: "detail",
          page: 5,
          sourceQuote: "Percolation through coarse sandy soil averages between 10 and 30 millimeters per hour into regional unconfined aquifers."
        },
        {
          id: "ch2-c3",
          name: "Groundwater Water Table",
          summary: "The subterranean boundary surface where pore pressure equals atmospheric pressure, separating the upper vadose zone from the fully saturated phreatic zone.",
          type: "fact",
          page: 6,
          sourceQuote: "The water table defines the upper surface of the saturation zone beneath which all rock and soil pores are filled with water."
        }
      ]
    }
  ]
};
