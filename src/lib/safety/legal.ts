/**
 * Locked legal wording for the Palatable Safety module. Every safety
 * page renders LIABILITY_FOOTER verbatim. The copy below was reviewed
 * for v1 launch and must not be softened in marketing rewrites.
 *
 * Strategic context: Palatable holds the records; the operator is the
 * legal record-keeper. We are not the inspector, we are not the
 * advisor, we are not the substitute for due diligence. Hospitality
 * software competitors in this space (Food Alert / Alert65 / Navitas)
 * make implicit claims of "compliance" via white-glove consultancy
 * pricing. Palatable does not. The difference is the wedge — and the
 * wedge depends on this wording staying honest.
 */

export const LIABILITY_FOOTER = {
  heading: 'Records held by you',
  body: `Palatable holds these records on your behalf. You remain the legal record-keeper for food safety compliance under the Food Safety Act 1990 and the Food Information Regulations 2014. Palatable is not a substitute for an EHO inspection, a Level 3 Food Hygiene qualification, or professional safety consultancy.`,
  emergencyLine: 'In an active food safety emergency, contact your local Environmental Health Officer directly.',
};

/**
 * Onboarding modal wording — shown the first time an owner enters the
 * Safety section. Must be acknowledged before any safety_* writes go
 * through.
 */
export const ONBOARDING_COPY = {
  title: 'About Palatable Safety',
  body_md: `Palatable Safety is a **record-keeping tool**. It replaces the FSA's paper diary. It is **not** certification, it is **not** legal advice, and it is **not** a substitute for an EHO inspection.

You remain the legal record-keeper. Palatable holds the data, scoped to your site, on servers in the EU. You can export it at any time.

The features inside Safety are aligned with the FSA's Safer Food, Better Business (SFBB) pack and UK Food Safety Act 1990. They do **not** make you compliant on their own. Compliance requires you to **use them honestly + consistently** and to act on what they show you.

By continuing you confirm you've read this, that you understand the records are yours, and that you take responsibility for the food safety operation at this site.`,
  ackLabel: 'I understand · let me in',
};

/**
 * Per-page FSA references. Each safety surface renders a strip linking
 * to fsa.gov.uk pages relevant to that surface. Links are external —
 * we never embed inspector content inside Palatable.
 */
export const FSA_REFERENCES = {
  opening_checks: [
    {
      label: 'SFBB pack (free)',
      url: 'https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb',
    },
    {
      label: 'Food hygiene regulations',
      url: 'https://www.food.gov.uk/business-guidance/food-hygiene-regulations',
    },
  ],
  probe_readings: [
    {
      label: 'Temperature controls',
      url: 'https://www.food.gov.uk/business-guidance/temperature-control',
    },
    {
      label: 'Cooking temperatures',
      url: 'https://www.food.gov.uk/business-guidance/safer-food-better-business-for-caterers',
    },
  ],
  incidents: [
    {
      label: 'Reporting incidents',
      url: 'https://www.food.gov.uk/business-guidance/reporting-food-incidents',
    },
    {
      label: 'Allergen guidance',
      url: 'https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses',
    },
  ],
  cleaning: [
    {
      label: 'Cleaning effectively',
      url: 'https://www.food.gov.uk/business-guidance/cleaning-effectively-in-your-business',
    },
  ],
  training: [
    {
      label: 'Staff training',
      url: 'https://www.food.gov.uk/business-guidance/staff-training-for-food-businesses',
    },
  ],
  haccp: [
    {
      label: 'HACCP guidance',
      url: 'https://www.food.gov.uk/business-guidance/hazard-analysis-and-critical-control-point-haccp',
    },
  ],
  eho: [
    {
      label: 'Food hygiene inspections',
      url: 'https://www.food.gov.uk/business-guidance/food-hygiene-inspections',
    },
    {
      label: 'Right of appeal',
      url: 'https://www.food.gov.uk/business-guidance/your-right-of-appeal',
    },
  ],
} as const;

export type SafetySurfaceKey = keyof typeof FSA_REFERENCES;
