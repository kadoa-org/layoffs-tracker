// Rules and calculations shown on the About page, one collapsible item each.
export const METHODS = [
  {
    title: "Limits",
    body: [
      "States post notices on their own schedule, some only monthly, so recent weeks are incomplete.",
      "Some states publish no notices, and history goes back further in some states than others.",
      "Extraction can make mistakes. Check the state's WARN page before relying on a notice.",
    ],
  },
  {
    title: "What a WARN notice is",
    body: [
      "The WARN Act requires employers with 100 or more employees to give 60 days' notice of plant closings and mass layoffs. A closing that costs 50 or more jobs at one site needs a notice. So does a layoff of 500 or more, or of 50 to 499 if they are a third of the site's workers.",
      "WARN is a floor, not a count of all job losses. Small or spread-out cuts, buyouts and attrition never trigger a notice.",
    ],
  },
  {
    id: "coverage",
    title: "Coverage by state",
    body: "Each state publishes its own list, in its own format, going back as far as it chooses. Arkansas keeps notices confidential by law, and Mississippi, New Hampshire, Wyoming and Puerto Rico publish no usable list. Some states reach back to the 1990s and others only a few years, so older years are undercounted.",
  },
  {
    title: "Workers, dates and types",
    body: [
      "Workers is the headcount in the notice. The final number can differ. Charts count a notice in the month the state received it, or by the layoff date when that is all a state gives.",
      "Each notice is labeled a closure, mass layoff, relocation or amendment from the state's wording. Exact duplicates are removed, but an amendment counts as its own notice.",
      "Sectors come from the industry on the notice, mapped to NAICS sectors. Notices without an industry are left out of the sector chart.",
    ],
  },
];
