import * as fs from "fs";
import csv from "csv-parser";

export const REGEX = {
  lobby: [/(\[.*?\])?\s*([a-zA-Z0-9_]+)\s*\[.*?\]\s*�\s*(.*)/],
  bedwars: [/(\[.*?\])?\s*([a-zA-Z0-9_]+)\s*\[.*?\]\s*�\s*(.*)/],
  factionsimmortal: [
    /ToP\s?\?\s?�\[(.*?)\]�\s(.*?)\s\[.*?\]\s�\s(.*)/,
    /\?\s?�\[(.*?)\]�\s(.*?)\s�\s(.*)/,
    /\|\[.*?\]\|\s*([a-zA-Z0-9_]+)\s*.*?\s*�\s*(.*)/,
  ],
  skyblockdream: ["|[(.*?)]| ([^;]+) ; (?:(.*?) � )?(.*)"],
  kitpvp: [],
  thebridge: [/(\[.*?\])?\s*([a-zA-Z0-9_]+)\s*\[.*?\]\s*�\s*(.*)/],
  prison: [],
};

export const PROFANITIES = {
  en: "../AutoReportMinecraft/profanities/en/profanity_en.csv",
};

interface Slur {
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
  return new Promise((resolve, reject) => {
    fs.createReadStream(PROFANITIES.en)
      .pipe(csv())
      .on("data", (row: Slur) => {
        if (message.includes(row.text)) {
          resolve(row);
        }
      })
      .on("end", () => {
        resolve(null);
      })
      .on("error", reject);
  });
}
