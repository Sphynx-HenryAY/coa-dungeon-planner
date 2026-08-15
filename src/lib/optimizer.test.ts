import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_DUNGEONS, DEFAULT_RULES } from "./dungeons.ts";
import {
  bestPlanForCharacter,
  planTableHtml,
  planTableTsv,
  planWeek,
} from "./optimizer.ts";
import type { Character, Dungeon } from "./types.ts";

function character(id: string, name: string, power: number): Character {
  return { id, name, power };
}

function totalRuns(
  attempts: Record<string, number>,
  dungeons: Dungeon[] = DEFAULT_DUNGEONS,
): number {
  return dungeons.reduce((sum, dungeon) => sum + (attempts[dungeon.id] ?? 0), 0);
}

describe("bestPlanForCharacter", () => {
  it("uses the highest-gold dungeons to reach the 1M cap", () => {
    const maxCounts = Object.fromEntries(
      DEFAULT_DUNGEONS.map((dungeon) => [dungeon.id, 3]),
    );
    const plan = bestPlanForCharacter(DEFAULT_DUNGEONS, maxCounts, 1_000_000);
    const gold = DEFAULT_DUNGEONS.reduce(
      (sum, dungeon) => sum + (plan[dungeon.id] ?? 0) * dungeon.gold,
      0,
    );
    assert.ok(gold >= 1_000_000, `expected at least 1M, got ${gold}`);
    assert.equal(plan.king, 3);
    assert.equal(plan.tof, 3);
    assert.ok((plan.dl ?? 0) >= 2);
    assert.ok(totalRuns(plan) <= 12);
  });

  it("never exceeds 3 attempts on a dungeon", () => {
    const maxCounts = Object.fromEntries(
      DEFAULT_DUNGEONS.map((dungeon) => [dungeon.id, 3]),
    );
    const plan = bestPlanForCharacter(DEFAULT_DUNGEONS, maxCounts, 1_000_000);
    for (const dungeon of DEFAULT_DUNGEONS) {
      assert.ok((plan[dungeon.id] ?? 0) <= 3);
    }
  });

  it("respects per-dungeon availability", () => {
    const maxCounts = Object.fromEntries(
      DEFAULT_DUNGEONS.map((dungeon) => [dungeon.id, dungeon.id === "king" ? 1 : 0]),
    );
    const plan = bestPlanForCharacter(DEFAULT_DUNGEONS, maxCounts, 1_000_000);
    assert.equal(plan.king, 1);
    assert.equal(totalRuns(plan), 1);
  });
});

describe("planWeek", () => {
  it("blocks 60k-gated dungeons for a 50k character", () => {
    const plan = planWeek(
      [character("a", "mid", 50000)],
      DEFAULT_DUNGEONS,
      DEFAULT_RULES,
    );
    assert.equal(plan.attempts.a.sp, 0);
    assert.equal(plan.attempts.a.dd, 0);
    assert.equal(plan.attempts.a.ht, 0);
    assert.equal(plan.attempts.a.ks, 0);
    assert.ok((plan.attempts.a.dl ?? 0) > 0);
    assert.ok(plan.characterGold.a.capped >= 950_000);
  });

  it("blocks DL for characters under 40k", () => {
    const plan = planWeek(
      [character("a", "low", 39999)],
      DEFAULT_DUNGEONS,
      DEFAULT_RULES,
    );
    assert.equal(plan.attempts.a.dl, 0);
    assert.equal(plan.attempts.a.dd, 0);
    assert.ok((plan.attempts.a.king ?? 0) > 0);
    assert.ok((plan.attempts.a.tof ?? 0) > 0);
  });

  it("lets anyone run no-limit dungeons", () => {
    const plan = planWeek(
      [character("a", "starter", 1)],
      DEFAULT_DUNGEONS,
      DEFAULT_RULES,
    );
    assert.ok((plan.attempts.a.king ?? 0) + (plan.attempts.a.tof ?? 0) > 0);
    assert.equal(plan.attempts.a.ad >= 0, true);
    assert.equal(plan.attempts.a.queen >= 0, true);
  });

  it("keeps each dungeon at or under the account weekly cap", () => {
    const roster = Array.from({ length: 12 }, (_, index) =>
      character(`c${index}`, `char${index}`, 100000),
    );
    const plan = planWeek(roster, DEFAULT_DUNGEONS, DEFAULT_RULES);
    for (const dungeon of DEFAULT_DUNGEONS) {
      assert.ok(
        plan.dungeonUsed[dungeon.id] <= DEFAULT_RULES.accountWeeklyAttempts,
        `${dungeon.name} used ${plan.dungeonUsed[dungeon.id]}`,
      );
    }
  });

  it("reserves high-gold no-limit dungeons for weaker characters", () => {
    const roster = [
      character("weak", "weak", 30000),
      character("strong", "strong", 90000),
    ];
    const plan = planWeek(roster, DEFAULT_DUNGEONS, {
      ...DEFAULT_RULES,
      accountWeeklyAttempts: 3,
    });
    assert.equal(plan.attempts.weak.king, 3);
    assert.equal(plan.attempts.strong.king, 0);
    assert.ok((plan.attempts.strong.dd ?? 0) + (plan.attempts.strong.dl ?? 0) > 0);
    assert.ok(plan.characterGold.weak.capped >= 800_000);
    assert.ok(plan.characterGold.strong.capped >= 800_000);
  });

  it("gets a typical 11-character roster near 1M each", () => {
    const powers = [
      101385, 98000, 85500, 80000, 65001, 65000, 53800, 52000, 48000, 45000,
      40000,
    ];
    const roster = powers.map((power, index) =>
      character(`c${index}`, `char${index}`, power),
    );
    const plan = planWeek(roster, DEFAULT_DUNGEONS, DEFAULT_RULES);
    for (const character of roster) {
      const gold = plan.characterGold[character.id];
      assert.ok(
        gold.capped >= 900_000,
        `${character.name} only reached ${gold.capped}`,
      );
    }
    assert.ok(plan.accountGold.capped >= 11 * 900_000);
  });

  it("ignores characters that have no power yet", () => {
    const plan = planWeek(
      [
        { id: "blank", name: "mb", power: null },
        character("ready", "king", 100000),
      ],
      DEFAULT_DUNGEONS,
    );
    assert.equal(plan.attempts.blank, undefined);
    assert.ok(plan.characterGold.ready.capped > 0);
  });
});

describe("plan table export", () => {
  it("exports a tab-separated grid Sheets and Excel can paste", () => {
    const roster = [
      character("weak", "weak", 30000),
      character("strong", "strong", 90000),
    ];
    const plan = planWeek(roster, DEFAULT_DUNGEONS, DEFAULT_RULES);
    const tsv = planTableTsv(roster, DEFAULT_DUNGEONS, plan, DEFAULT_RULES);
    const lines = tsv.split("\n");
    assert.equal(
      lines[0],
      ["Character", "Power", ...DEFAULT_DUNGEONS.map((dungeon) => dungeon.name), "Gold"].join(
        "\t",
      ),
    );
    const weak = lines[1].split("\t");
    assert.equal(weak[0], "weak");
    assert.equal(weak[1], "30000");
    assert.equal(weak[2], ""); // SP is 60k-gated
    assert.equal(Number(weak.at(-1)), plan.characterGold.weak.raw);
    const strong = lines[2].split("\t");
    assert.equal(Number(strong.at(-1)), plan.characterGold.strong.raw);
    const footer = lines.at(-1)?.split("\t") ?? [];
    assert.equal(footer[0], "Used / 18");
    assert.equal(footer[1], "");
    assert.equal(Number(footer.at(-1)), plan.accountGold.raw);
    assert.ok(plan.accountGold.raw >= plan.accountGold.capped);
    assert.equal(footer[2 + DEFAULT_DUNGEONS.findIndex((d) => d.id === "king")], String(plan.dungeonUsed.king));
    const overCap = roster.find(
      (member) => plan.characterGold[member.id].raw > plan.characterGold[member.id].capped,
    );
    if (overCap) {
      const row = lines[roster.indexOf(overCap) + 1].split("\t");
      assert.ok(Number(row.at(-1)) > DEFAULT_RULES.goldCap);
    }
  });

  it("quotes cells that contain tabs", () => {
    const roster = [character("a", "tab\there", 90000)];
    const plan = planWeek(roster, DEFAULT_DUNGEONS, DEFAULT_RULES);
    const tsv = planTableTsv(roster, DEFAULT_DUNGEONS, plan, DEFAULT_RULES);
    assert.ok(tsv.split("\n")[1].startsWith('"tab\there"\t'));
  });

  it("exports an HTML table with escaped names", () => {
    const roster = [character("a", 'A & B <c>', 90000)];
    const plan = planWeek(roster, DEFAULT_DUNGEONS, DEFAULT_RULES);
    const html = planTableHtml(roster, DEFAULT_DUNGEONS, plan, DEFAULT_RULES);
    assert.ok(html.includes("<table>"));
    assert.ok(html.includes("<th>Character</th>"));
    assert.ok(html.includes("<th>King</th>"));
    assert.ok(html.includes("A &amp; B &lt;c&gt;"));
    assert.ok(!html.includes("A & B <c>"));
    assert.ok(html.includes("<tfoot>"));
  });

  it("exports Traditional Chinese headers when given zh-Hant copy", async () => {
    const { planCopy } = await import("./i18n.ts");
    const roster = [character("a", "mb", 90000)];
    const plan = planWeek(roster, DEFAULT_DUNGEONS, DEFAULT_RULES);
    const copy = planCopy("zh-Hant", DEFAULT_RULES);
    const tsv = planTableTsv(roster, DEFAULT_DUNGEONS, plan, DEFAULT_RULES, copy);
    assert.ok(tsv.startsWith(["角色", "戰力"].join("\t")));
    assert.ok(tsv.includes("囚籠"));
    assert.ok(tsv.includes("國王"));
    assert.ok(tsv.includes("金幣"));
  });
});
