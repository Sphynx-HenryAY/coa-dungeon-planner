export type DungeonId = string;
export type CharacterId = string;

export type Dungeon = {
  id: DungeonId;
  name: string;
  gold: number;
  /** 0 means no power gate. */
  powerReq: number;
};

export type Character = {
  id: CharacterId;
  name: string;
  power: number | null;
};

export type CharacterGold = {
  raw: number;
  capped: number;
  remaining: number;
};

export type WeekPlan = {
  attempts: Record<CharacterId, Record<DungeonId, number>>;
  characterGold: Record<CharacterId, CharacterGold>;
  dungeonUsed: Record<DungeonId, number>;
  accountGold: { raw: number; capped: number };
};

export type PlannerRules = {
  goldCap: number;
  maxAttemptsPerDungeon: number;
  accountWeeklyAttempts: number;
};
