import React from "react";
import { AboutPage as KitAboutPage } from "../kit";
import { METHODS } from "../methodology";
import { withBase } from "../router";

const REPO = "https://github.com/kadoa-org/layoffs-tracker";

export default function AboutPage() {
  return (
    <div className="dk-container">
      <KitAboutPage
        dataset="layoffs"
        lede="Every US layoff notice filed under the federal WARN Act, collected from state labor departments into one table."
        sources={[
          { name: "State labor departments", href: withBase("/states"), what: "WARN notices from each state's official list" },
          { name: "Big Local News warn-scraper", href: "https://github.com/biglocalnews/warn-scraper", what: "Older notices for some states" },
          { name: "NAICS", href: "https://www.census.gov/naics/", what: "Sector names for the sector chart" },
        ]}
        steps={[
          { title: "Monitor", text: "Kadoa checks state labor department sites for new WARN notices every day." },
          { title: "Extract", text: "It pulls each notice from spreadsheets, web pages and PDFs." },
          { title: "Normalize", text: "Names, dates and notice types are put in one format, and duplicates removed." },
          { title: "Link", text: "Every notice links back to its state's WARN page." },
        ]}
        methods={METHODS}
        corrections={
          <>
            Found an error? <a href={`${REPO}/issues`}>Open an issue on GitHub</a>.
          </>
        }
      />
    </div>
  );
}
