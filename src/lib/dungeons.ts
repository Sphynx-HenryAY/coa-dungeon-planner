import type { Character, Dungeon, PlannerRules } from "./types";

/** Gold per clear taken from the dungeon tab headers in 燒賣 裝備.xlsx. */
export const DEFAULT_DUNGEONS: Dungeon[] = [
  { id: "sp", name: "SP", gold: 40000, powerReq: 60000 },
  { id: "dd", name: "DD", gold: 80000, powerReq: 60000 },
  { id: "ht", name: "HT", gold: 45000, powerReq: 60000 },
  { id: "ks", name: "KS", gold: 65001, powerReq: 60000 },
  { id: "dl", name: "DL", gold: 85500, powerReq: 40000 },
  { id: "ad", name: "AD", gold: 65000, powerReq: 0 },
  { id: "tof", name: "TOF", gold: 98000, powerReq: 0 },
  { id: "queen", name: "Queen", gold: 53800, powerReq: 0 },
  { id: "king", name: "King", gold: 101385, powerReq: 0 },
];

export const DEFAULT_RULES: PlannerRules = {
  goldCap: 1_000_000,
  maxAttemptsPerDungeon: 3,
  accountWeeklyAttempts: 18,
};

/** Character names already listed on the dungeon tab. */
export const SPREADSHEET_CHARACTER_NAMES = [
  "mb",
  "scytheguard",
  "glaciate",
  "starburster",
  "berserker",
  "mirage",
  "blademaid",
  "gunner",
  "mystrix",
  "rhapsodia",
  "karmaslayer",
];

export function canRunDungeon(power: number, dungeon: Dungeon): boolean {
  return dungeon.powerReq <= 0 || power >= dungeon.powerReq;
}

export function accessibleDungeons(
  power: number,
  dungeons: Dungeon[],
): Dungeon[] {
  return dungeons.filter((dungeon) => canRunDungeon(power, dungeon));
}

export function readyCharacters(characters: Character[]): Character[] {
  return characters.filter(
    (character) =>
      character.name.trim().length > 0 &&
      character.power !== null &&
      Number.isFinite(character.power) &&
      character.power >= 0,
  );
}

export function parsePower(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase().replace(/,/g, "");
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(k)?$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return match[2] === "k" ? Math.round(value * 1000) : Math.round(value);
}
