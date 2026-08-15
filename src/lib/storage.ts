import {
  DEFAULT_DUNGEONS,
  DEFAULT_RULES,
  SPREADSHEET_CHARACTER_NAMES,
} from "./dungeons";
import type { Character, Dungeon, PlannerRules } from "./types";

const STORAGE_KEY = "coa-dungeon-planner-v1";

export type PersistedState = {
  characters: Character[];
  dungeons: Dungeon[];
  rules: PlannerRules;
};

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function blankCharacter(name = ""): Character {
  return { id: makeId(), name, power: null };
}

export function blankDungeon(name = "", gold = 0, powerReq = 0): Dungeon {
  return { id: makeId(), name, gold, powerReq };
}

export function spreadsheetRoster(): Character[] {
  return SPREADSHEET_CHARACTER_NAMES.map((name) => blankCharacter(name));
}

export function defaultState(): PersistedState {
  return {
    characters: spreadsheetRoster(),
    dungeons: DEFAULT_DUNGEONS.map((dungeon) => ({ ...dungeon })),
    rules: { ...DEFAULT_RULES },
  };
}

export function loadState(): PersistedState {
  const fallback = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const characters = Array.isArray(parsed.characters)
      ? parsed.characters
          .filter((character) => character && typeof character.id === "string")
          .map((character) => ({
            id: character.id,
            name: String(character.name ?? ""),
            power:
              typeof character.power === "number" &&
              Number.isFinite(character.power)
                ? character.power
                : null,
          }))
      : fallback.characters;
    const dungeons = mergeDungeons(parsed.dungeons);
    const rules = {
      goldCap: Number(parsed.rules?.goldCap) || fallback.rules.goldCap,
      maxAttemptsPerDungeon:
        Number(parsed.rules?.maxAttemptsPerDungeon) ||
        fallback.rules.maxAttemptsPerDungeon,
      accountWeeklyAttempts:
        Number(parsed.rules?.accountWeeklyAttempts) ||
        fallback.rules.accountWeeklyAttempts,
    };
    return {
      characters: characters.length > 0 ? characters : fallback.characters,
      dungeons,
      rules,
    };
  } catch {
    return fallback;
  }
}

function normalizeDungeon(
  dungeon: Partial<Dungeon>,
  fallback?: Dungeon,
): Dungeon | null {
  if (typeof dungeon.id !== "string" || !dungeon.id.trim()) return null;
  const gold =
    typeof dungeon.gold === "number" && dungeon.gold >= 0
      ? dungeon.gold
      : fallback?.gold;
  const powerReq =
    typeof dungeon.powerReq === "number" && dungeon.powerReq >= 0
      ? dungeon.powerReq
      : fallback?.powerReq;
  if (gold === undefined || powerReq === undefined) return null;
  return {
    id: dungeon.id,
    name: dungeon.name?.trim() || fallback?.name || dungeon.id,
    gold,
    powerReq,
  };
}

/** Saved list is the source of truth so custom, edited, and deleted dungeons persist. */
export function mergeDungeons(saved: Dungeon[] | undefined): Dungeon[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return DEFAULT_DUNGEONS.map((dungeon) => ({ ...dungeon }));
  }
  const defaults = new Map(
    DEFAULT_DUNGEONS.map((dungeon) => [dungeon.id, dungeon]),
  );
  const seen = new Set<string>();
  const merged: Dungeon[] = [];
  for (const item of saved) {
    if (!item || seen.has(item.id)) continue;
    const dungeon = normalizeDungeon(item, defaults.get(item.id));
    if (!dungeon) continue;
    seen.add(dungeon.id);
    merged.push(dungeon);
  }
  return merged.length > 0
    ? merged
    : DEFAULT_DUNGEONS.map((dungeon) => ({ ...dungeon }));
}

export function saveState(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
