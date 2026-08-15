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

function mergeDungeons(saved: Dungeon[] | undefined): Dungeon[] {
  const byId = new Map(
    (saved ?? [])
      .filter((dungeon) => dungeon && typeof dungeon.id === "string")
      .map((dungeon) => [dungeon.id, dungeon]),
  );
  return DEFAULT_DUNGEONS.map((base) => {
    const override = byId.get(base.id);
    if (!override) return { ...base };
    return {
      ...base,
      name: override.name?.trim() || base.name,
      gold:
        typeof override.gold === "number" && override.gold >= 0
          ? override.gold
          : base.gold,
      powerReq:
        typeof override.powerReq === "number" && override.powerReq >= 0
          ? override.powerReq
          : base.powerReq,
    };
  });
}

export function saveState(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
