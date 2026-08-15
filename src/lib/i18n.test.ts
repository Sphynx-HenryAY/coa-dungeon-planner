import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_DUNGEONS, DEFAULT_RULES } from "./dungeons.ts";
import { formatPower, formatPowerReq } from "./format.ts";
import {
  dungeonLabel,
  planCopy,
  powerGatesText,
  t,
} from "./i18n.ts";

describe("dungeonLabel", () => {
  it("uses Traditional Chinese names for default dungeons", () => {
    const byId = Object.fromEntries(
      DEFAULT_DUNGEONS.map((dungeon) => [dungeon.id, dungeon]),
    );
    assert.equal(dungeonLabel(byId.sp, "zh-Hant"), "囚籠");
    assert.equal(dungeonLabel(byId.dd, "zh-Hant"), "迷津");
    assert.equal(dungeonLabel(byId.ht, "zh-Hant"), "心臟");
    assert.equal(dungeonLabel(byId.ks, "zh-Hant"), "章魚");
    assert.equal(dungeonLabel(byId.dl, "zh-Hant"), "烏鴉");
    assert.equal(dungeonLabel(byId.ad, "zh-Hant"), "天啟");
    assert.equal(dungeonLabel(byId.tof, "zh-Hant"), "遺跡");
    assert.equal(dungeonLabel(byId.queen, "zh-Hant"), "皇后");
    assert.equal(dungeonLabel(byId.king, "zh-Hant"), "國王");
  });

  it("keeps English codes in the English locale", () => {
    assert.equal(dungeonLabel(DEFAULT_DUNGEONS[0], "en"), "SP");
    assert.equal(
      dungeonLabel(DEFAULT_DUNGEONS.find((dungeon) => dungeon.id === "king")!, "en"),
      "King",
    );
  });

  it("keeps a custom dungeon name in every locale", () => {
    const custom = { id: "sp", name: "自訂囚籠", gold: 1, powerReq: 0 };
    assert.equal(dungeonLabel(custom, "zh-Hant"), "自訂囚籠");
    assert.equal(dungeonLabel(custom, "en"), "自訂囚籠");
  });
});

describe("i18n copy", () => {
  it("translates UI strings", () => {
    assert.equal(t("zh-Hant", "title"), "每週副本規劃");
    assert.equal(t("en", "title"), "Weekly dungeon planner");
    assert.equal(t("zh-Hant", "addDungeon"), "新增副本");
  });

  it("builds a Traditional Chinese plan table header", () => {
    const copy = planCopy("zh-Hant", DEFAULT_RULES);
    assert.equal(copy.characterHeader, "角色");
    assert.equal(copy.goldHeader, "金幣");
    assert.equal(copy.dungeonName(DEFAULT_DUNGEONS[0]), "囚籠");
    assert.match(copy.usedHeader, /已用 \/ 18/);
  });

  it("summarizes power gates with localized names", () => {
    const text = powerGatesText(DEFAULT_DUNGEONS, "zh-Hant");
    assert.match(text, /戰力門檻/);
    assert.match(text, /囚籠/);
    assert.match(text, /烏鴉/);
    assert.match(text, /國王/);
    assert.match(text, /無限制/);
  });
});

describe("formatPower", () => {
  it("uses 萬 for round Traditional Chinese powers", () => {
    assert.equal(formatPower(60000, "zh-Hant"), "6萬");
    assert.equal(formatPowerReq(40000, "zh-Hant", "無限制"), "4萬+");
    assert.equal(formatPowerReq(0, "zh-Hant", "無限制"), "無限制");
  });
});
