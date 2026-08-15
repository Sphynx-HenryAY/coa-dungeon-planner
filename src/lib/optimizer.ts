import {
  accessibleDungeons,
  canRunDungeon,
  DEFAULT_RULES,
  readyCharacters,
} from "./dungeons";
import type { PlanCopy } from "./i18n";
import type {
  Character,
  CharacterGold,
  CharacterId,
  Dungeon,
  DungeonId,
  PlannerRules,
  WeekPlan,
} from "./types";

export type { PlanCopy };

type ComboScore = {
  attempts: Record<DungeonId, number>;
  gold: number;
  capped: number;
  overshoot: number;
  runs: number;
  restrictedWeight: number;
};

function emptyAttempts(dungeons: Dungeon[]): Record<DungeonId, number> {
  return Object.fromEntries(dungeons.map((dungeon) => [dungeon.id, 0]));
}

function scoreCombo(
  attempts: Record<DungeonId, number>,
  dungeons: Dungeon[],
  goldCap: number,
): ComboScore {
  let gold = 0;
  let runs = 0;
  let restrictedWeight = 0;
  for (const dungeon of dungeons) {
    const count = attempts[dungeon.id] ?? 0;
    gold += count * dungeon.gold;
    runs += count;
    restrictedWeight += count * dungeon.powerReq;
  }
  const capped = Math.min(gold, goldCap);
  return {
    attempts,
    gold,
    capped,
    overshoot: Math.max(0, gold - goldCap),
    runs,
    restrictedWeight,
  };
}

function isBetter(next: ComboScore, current: ComboScore | null): boolean {
  if (!current) return true;
  if (next.capped !== current.capped) return next.capped > current.capped;
  if (next.runs !== current.runs) return next.runs < current.runs;
  if (next.overshoot !== current.overshoot) {
    return next.overshoot < current.overshoot;
  }
  return next.restrictedWeight > current.restrictedWeight;
}

/** Best 0–3 counts per dungeon so this character lands as close to the gold cap as possible. */
export function bestPlanForCharacter(
  dungeons: Dungeon[],
  maxCounts: Record<DungeonId, number>,
  goldCap: number,
): Record<DungeonId, number> {
  const options = dungeons.filter((dungeon) => (maxCounts[dungeon.id] ?? 0) > 0);
  const best: { score: ComboScore | null } = { score: null };

  const walk = (index: number, attempts: Record<DungeonId, number>) => {
    if (index === options.length) {
      const score = scoreCombo(attempts, dungeons, goldCap);
      if (isBetter(score, best.score)) {
        best.score = {
          ...score,
          attempts: { ...attempts },
        };
      }
      return;
    }
    const dungeon = options[index];
    const max = maxCounts[dungeon.id] ?? 0;
    for (let count = 0; count <= max; count += 1) {
      attempts[dungeon.id] = count;
      walk(index + 1, attempts);
    }
    attempts[dungeon.id] = 0;
  };

  walk(0, emptyAttempts(dungeons));
  return best.score?.attempts ?? emptyAttempts(dungeons);
}

function goldFromAttempts(
  attempts: Record<DungeonId, number>,
  dungeons: Dungeon[],
  goldCap: number,
): CharacterGold {
  const raw = dungeons.reduce(
    (sum, dungeon) => sum + (attempts[dungeon.id] ?? 0) * dungeon.gold,
    0,
  );
  const capped = Math.min(raw, goldCap);
  return { raw, capped, remaining: Math.max(0, goldCap - raw) };
}

type Move = {
  characterId: CharacterId;
  dungeonId: DungeonId;
  gain: number;
  overshoot: number;
  currentGold: number;
  powerReq: number;
  characterPower: number;
  options: number;
};

function isBetterMove(next: Move, current: Move | null): boolean {
  if (!current) return true;
  if (next.gain !== current.gain) return next.gain > current.gain;
  if (next.overshoot !== current.overshoot) {
    return next.overshoot < current.overshoot;
  }
  if (next.currentGold !== current.currentGold) {
    return next.currentGold < current.currentGold;
  }
  if (next.powerReq !== current.powerReq) return next.powerReq > current.powerReq;
  if (next.options !== current.options) return next.options < current.options;
  return next.characterPower < current.characterPower;
}

function assignFromPool(
  characters: Character[],
  allDungeons: Dungeon[],
  pool: Dungeon[],
  attempts: Record<CharacterId, Record<DungeonId, number>>,
  remainingSlots: Record<DungeonId, number>,
  rawGold: Record<CharacterId, number>,
  rules: PlannerRules,
) {
  const optionCount = Object.fromEntries(
    characters.map((character) => [
      character.id,
      accessibleDungeons(character.power ?? 0, pool).length,
    ]),
  );
  const goldById = Object.fromEntries(
    allDungeons.map((dungeon) => [dungeon.id, dungeon.gold]),
  );

  let assigned = true;
  while (assigned) {
    assigned = false;
    let best: Move | null = null;

    for (const character of characters) {
      const currentRaw = rawGold[character.id];
      const currentCapped = Math.min(currentRaw, rules.goldCap);
      if (currentCapped >= rules.goldCap) continue;
      const power = character.power ?? 0;

      for (const dungeon of pool) {
        if (!canRunDungeon(power, dungeon)) continue;
        if ((remainingSlots[dungeon.id] ?? 0) <= 0) continue;
        if (
          (attempts[character.id][dungeon.id] ?? 0) >=
          rules.maxAttemptsPerDungeon
        ) {
          continue;
        }
        const nextRaw = currentRaw + dungeon.gold;
        const nextCapped = Math.min(nextRaw, rules.goldCap);
        const gain = nextCapped - currentCapped;
        if (gain <= 0) continue;
        const move: Move = {
          characterId: character.id,
          dungeonId: dungeon.id,
          gain,
          overshoot: Math.max(0, nextRaw - rules.goldCap),
          currentGold: currentRaw,
          powerReq: dungeon.powerReq,
          characterPower: power,
          options: optionCount[character.id],
        };
        if (isBetterMove(move, best)) best = move;
      }
    }

    if (!best) break;
    const pick = best;
    attempts[pick.characterId][pick.dungeonId] += 1;
    remainingSlots[pick.dungeonId] -= 1;
    rawGold[pick.characterId] += goldById[pick.dungeonId] ?? 0;
    assigned = true;
  }
}

function assignRuns(
  characters: Character[],
  dungeons: Dungeon[],
  rules: PlannerRules,
): Record<CharacterId, Record<DungeonId, number>> {
  const remainingSlots = Object.fromEntries(
    dungeons.map((dungeon) => [dungeon.id, rules.accountWeeklyAttempts]),
  );
  const attempts: Record<CharacterId, Record<DungeonId, number>> = {};
  const rawGold: Record<CharacterId, number> = {};

  for (const character of characters) {
    attempts[character.id] = emptyAttempts(dungeons);
    rawGold[character.id] = 0;
  }

  const gated = dungeons.filter((dungeon) => dungeon.powerReq > 0);
  const open = dungeons.filter((dungeon) => dungeon.powerReq <= 0);
  assignFromPool(
    characters,
    dungeons,
    gated,
    attempts,
    remainingSlots,
    rawGold,
    rules,
  );
  assignFromPool(
    characters,
    dungeons,
    open,
    attempts,
    remainingSlots,
    rawGold,
    rules,
  );
  assignFromPool(
    characters,
    dungeons,
    dungeons,
    attempts,
    remainingSlots,
    rawGold,
    rules,
  );
  trimOvershoot(characters, dungeons, attempts, remainingSlots, rawGold, rules);
  assignFromPool(
    characters,
    dungeons,
    dungeons,
    attempts,
    remainingSlots,
    rawGold,
    rules,
  );
  return attempts;
}

/** Drop runs that are only wasting gold above the weekly cap. */
function trimOvershoot(
  characters: Character[],
  dungeons: Dungeon[],
  attempts: Record<CharacterId, Record<DungeonId, number>>,
  remainingSlots: Record<DungeonId, number>,
  rawGold: Record<CharacterId, number>,
  rules: PlannerRules,
) {
  const cheapestFirst = [...dungeons].sort((a, b) => a.gold - b.gold);
  for (const character of characters) {
    let changed = true;
    while (changed) {
      changed = false;
      if (rawGold[character.id] <= rules.goldCap) break;
      for (const dungeon of cheapestFirst) {
        const count = attempts[character.id][dungeon.id] ?? 0;
        if (count <= 0) continue;
        if (rawGold[character.id] - dungeon.gold < rules.goldCap) continue;
        attempts[character.id][dungeon.id] = count - 1;
        remainingSlots[dungeon.id] += 1;
        rawGold[character.id] -= dungeon.gold;
        changed = true;
        break;
      }
    }
  }
}

export function planWeek(
  characters: Character[],
  dungeons: Dungeon[],
  rules: PlannerRules = DEFAULT_RULES,
): WeekPlan {
  const usable = readyCharacters(characters);
  const attempts = assignRuns(usable, dungeons, rules);

  const characterGold: Record<CharacterId, CharacterGold> = {};
  let accountRaw = 0;
  let accountCapped = 0;
  for (const character of usable) {
    const gold = goldFromAttempts(
      attempts[character.id],
      dungeons,
      rules.goldCap,
    );
    characterGold[character.id] = gold;
    accountRaw += gold.raw;
    accountCapped += gold.capped;
  }

  const dungeonUsed = Object.fromEntries(
    dungeons.map((dungeon) => [
      dungeon.id,
      usable.reduce(
        (sum, character) => sum + (attempts[character.id]?.[dungeon.id] ?? 0),
        0,
      ),
    ]),
  );

  return {
    attempts,
    characterGold,
    dungeonUsed,
    accountGold: { raw: accountRaw, capped: accountCapped },
  };
}

function defaultPlanCopy(rules: PlannerRules): PlanCopy {
  const tag = "en-US";
  return {
    title: "Crystal of Atlan weekly dungeon plan",
    rulesLine: `Gold cap ${rules.goldCap.toLocaleString(tag)} / character · max ${rules.maxAttemptsPerDungeon} runs / dungeon · ${rules.accountWeeklyAttempts} account runs / dungeon`,
    noRuns: "no runs",
    formatCharacter: ({ name, power, runs, gold, raw }) =>
      `${name} (${power} power): ${runs} → ${gold} gold${raw ? ` (raw ${raw})` : ""}`,
    formatAccountTotal: (gold) => `Account total: ${gold} gold`,
    formatDungeonSlots: (slots) => `Dungeon slots: ${slots}`,
    characterHeader: "Character",
    powerHeader: "Power",
    goldHeader: "Gold",
    usedHeader: `Used / ${rules.accountWeeklyAttempts}`,
    dungeonName: (dungeon) => dungeon.name,
    numberLocale: tag,
  };
}

export function summarizePlanText(
  characters: Character[],
  dungeons: Dungeon[],
  plan: WeekPlan,
  rules: PlannerRules = DEFAULT_RULES,
  copy: PlanCopy = defaultPlanCopy(rules),
): string {
  const tag = copy.numberLocale;
  const lines: string[] = [copy.title, copy.rulesLine, ""];

  for (const character of readyCharacters(characters)) {
    const gold = plan.characterGold[character.id];
    const runs = dungeons
      .map((dungeon) => {
        const count = plan.attempts[character.id]?.[dungeon.id] ?? 0;
        if (count <= 0) return null;
        return `${copy.dungeonName(dungeon)} x${count}`;
      })
      .filter((part): part is string => part !== null);
    lines.push(
      copy.formatCharacter({
        name: character.name,
        power: character.power?.toLocaleString(tag) ?? "",
        runs: runs.join(", ") || copy.noRuns,
        gold: gold.capped.toLocaleString(tag),
        raw:
          gold.raw > gold.capped ? gold.raw.toLocaleString(tag) : null,
      }),
    );
  }

  lines.push("");
  lines.push(copy.formatAccountTotal(plan.accountGold.capped.toLocaleString(tag)));
  lines.push(
    copy.formatDungeonSlots(
      dungeons
        .map(
          (dungeon) =>
            `${copy.dungeonName(dungeon)} ${plan.dungeonUsed[dungeon.id] ?? 0}/${rules.accountWeeklyAttempts}`,
        )
        .join(" · "),
    ),
  );
  return lines.join("\n");
}

export type PlanTableCell = string | number;

/** Grid matching the weekly plan table, with Power as its own column. */
export function planTableRows(
  characters: Character[],
  dungeons: Dungeon[],
  plan: WeekPlan,
  rules: PlannerRules = DEFAULT_RULES,
  copy: PlanCopy = defaultPlanCopy(rules),
): PlanTableCell[][] {
  const ready = readyCharacters(characters);
  const header: PlanTableCell[] = [
    copy.characterHeader,
    copy.powerHeader,
    ...dungeons.map((dungeon) => copy.dungeonName(dungeon)),
    copy.goldHeader,
  ];
  const body = ready.map((character) => {
    const cells: PlanTableCell[] = [character.name, character.power ?? ""];
    for (const dungeon of dungeons) {
      if (!canRunDungeon(character.power ?? 0, dungeon)) {
        cells.push("");
        continue;
      }
      const count = plan.attempts[character.id]?.[dungeon.id] ?? 0;
      cells.push(count > 0 ? count : "");
    }
    cells.push(plan.characterGold[character.id]?.raw ?? 0);
    return cells;
  });
  const footer: PlanTableCell[] = [
    copy.usedHeader,
    "",
    ...dungeons.map((dungeon) => plan.dungeonUsed[dungeon.id] ?? 0),
    plan.accountGold.raw,
  ];
  return [header, ...body, footer];
}

function tsvCell(value: PlanTableCell): string {
  const text = String(value);
  if (/[\t\n\r"]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function planTableTsv(
  characters: Character[],
  dungeons: Dungeon[],
  plan: WeekPlan,
  rules: PlannerRules = DEFAULT_RULES,
  copy?: PlanCopy,
): string {
  return planTableRows(characters, dungeons, plan, rules, copy)
    .map((row) => row.map(tsvCell).join("\t"))
    .join("\n");
}

export function planTableHtml(
  characters: Character[],
  dungeons: Dungeon[],
  plan: WeekPlan,
  rules: PlannerRules = DEFAULT_RULES,
  copy?: PlanCopy,
): string {
  const rows = planTableRows(characters, dungeons, plan, rules, copy);
  const header = rows[0] ?? [];
  const footer = rows.length > 1 ? rows[rows.length - 1] : [];
  const body = rows.slice(1, -1);
  const headerHtml = header
    .map((cell) => `<th>${escapeHtml(String(cell))}</th>`)
    .join("");
  const bodyHtml = body
    .map(
      (row) =>
        `<tr>${row
          .map((cell: PlanTableCell) => `<td>${escapeHtml(String(cell))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const footerHtml = footer
    .map((cell) => `<th>${escapeHtml(String(cell))}</th>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody><tfoot><tr>${footerHtml}</tr></tfoot></table></body></html>`;
}
