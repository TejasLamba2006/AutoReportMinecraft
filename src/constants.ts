import * as fs from "fs";
import csv from "csv-parser";

export const PROFANITIES = {
  en: "../AutoReportMinecraft/profanities/en/profanity_en.csv",
};

export interface Slur {
  text: string;
  canonical_form_1: string;
  canonical_form_2?: string;
  canonical_form_3?: string;
  category_1: string;
  category_2?: string;
  category_3?: string;
  severity_rating: number;
  severity_description: string;
}

export function checkProfanity(message: string): Promise<Slur | null> {
  if (!message) return Promise.resolve(null);
  const words = message.split(/\s+/);
  return new Promise((resolve, reject) => {
    fs.createReadStream(PROFANITIES.en)
      .pipe(csv())
      .on("data", (row: Slur) => {
        if (words.includes(row.text)) {
          resolve(row);
        }
      })
      .on("end", () => {
        resolve(null);
      })
      .on("error", reject);
  });
}
