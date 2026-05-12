import { readFileSync } from "node:fs";

export const WATER_SECTOR_SYSTEM_PROMPT = readFileSync(
  new URL("./water-sector.md", import.meta.url),
  "utf8",
).trim();
