import { DEFAULT_DUNGEONS } from "./dungeons";
import { formatPowerReq, numberLocale } from "./format";
import type { Dungeon, Locale, PlannerRules } from "./types";

const LOCALE_STORAGE_KEY = "coa-dungeon-planner-locale";

const en = {
  docTitle: "COA Dungeon Planner",
  docDescription:
    "Crystal of Atlan weekly dungeon planner — assign attempts to hit 1 million gold per character.",
  language: "Language",
  eyebrow: "Crystal of Atlan",
  title: "Weekly dungeon planner",
  lede: "Enter each character's name and power. The planner assigns up to {max} attempts per dungeon so every character lands as close as possible to the {gold} weekly gold cap.",
  characters: "Characters",
  powerGates: "Power gates: {gates}",
  gateNoLimit: "{names} have no limit",
  loadSpreadsheet: "Load spreadsheet names",
  clearRoster: "Clear roster",
  characterName: "Character name",
  power: "Power",
  addCharacter: "Add character",
  colName: "Name",
  colPower: "Power",
  colCanRun: "Can run",
  colDungeon: "Dungeon",
  colGoldClear: "Gold / clear",
  colPowerNeeded: "Power needed",
  colAccountCap: "Account cap",
  enterPower: "enter power",
  none: "none",
  remove: "Remove",
  dungeonsTitle: "Dungeons",
  dungeonsHint:
    "Gold per clear comes from the dungeon tab in your Excel file. Edit name, gold, or power, or add a dungeon if rewards changed.",
  dungeonName: "Dungeon name",
  goldPerClear: "Gold / clear",
  powerNeeded: "Power needed (0 = no limit)",
  addDungeon: "Add dungeon",
  goldCap: "Gold cap / character",
  maxRuns: "Max runs / character / dungeon",
  accountRuns: "Account runs / dungeon",
  resetDungeons: "Reset dungeon data",
  calculate: "Calculate weekly plan",
  missingPowerOne: "{count} character still needs a power value.",
  missingPowerMany: "{count} characters still need a power value.",
  weeklyPlan: "Weekly plan",
  accountGold: "Account gold {gold}",
  rawSuffix: " · raw {gold}",
  characterCountOne: "{count} character",
  characterCountMany: "{count} characters",
  copyPlan: "Copy plan",
  copied: "Copied",
  copyTable: "Copy table",
  tableCopied: "Table copied",
  hide: "Hide",
  underCap: "{gold} under cap",
  cappedRaw: "capped · raw {gold}",
  atCap: "at cap",
  tableHint:
    "Assignment grid. Copy table, then paste into Google Sheets or Excel.",
  colCharacter: "Character",
  colGold: "Gold",
  usedHeader: "Used / {n}",
  footer:
    "Roster is saved in this browser. Use Load spreadsheet names to restore the characters from the dungeon tab, then type each power.",
  resetEverything: "Reset everything",
  errorNeedCharacter: "Add at least one character with a name and power.",
  errorNeedDungeon: "Add at least one dungeon.",
  errorCharacterName: "Enter a character name.",
  errorPower: "Power must be a number, like 65000 or 65k.",
  errorCopyPlan: "Could not copy the plan.",
  errorCopyTable: "Could not copy the table.",
  errorDungeonName: "Enter a dungeon name.",
  errorGold: "Gold must be a number, like 65000 or 65k.",
  errorPowerReq: "Power needed must be a number, like 60000 or 60k.",
  errorLastDungeon: "Keep at least one dungeon.",
  nPerWeek: "{n} / week",
  planTitle: "Crystal of Atlan weekly dungeon plan",
  planRules:
    "Gold cap {gold} / character · max {max} runs / dungeon · {account} account runs / dungeon",
  noRuns: "no runs",
  characterLine: "{name} ({power} power): {runs} → {gold} gold",
  characterLineRaw:
    "{name} ({power} power): {runs} → {gold} gold (raw {raw})",
  accountTotal: "Account total: {gold} gold",
  dungeonSlots: "Dungeon slots: {slots}",
  placeholderName: "scytheguard",
  placeholderPower: "65000 or 65k",
  placeholderDungeon: "New dungeon",
  placeholderGold: "50000",
  copyTableTitle: "Copies a grid you can paste into Google Sheets or Excel",
  noLimitShort: "no limit",
} as const;

const zhHant: { [K in keyof typeof en]: string } = {
  docTitle: "亞特蘭之晶 副本規劃",
  docDescription:
    "亞特蘭之晶每週副本規劃——分配挑戰次數，讓每位角色盡量達到金幣上限。",
  language: "語言",
  eyebrow: "亞特蘭之晶",
  title: "每週副本規劃",
  lede: "輸入每位角色的名稱與戰力。規劃器會為每個副本分配最多 {max} 次挑戰，讓每位角色盡量接近每週 {gold} 金幣上限。",
  characters: "角色",
  powerGates: "戰力門檻：{gates}",
  gateNoLimit: "{names}無限制",
  loadSpreadsheet: "載入試算表角色",
  clearRoster: "清空角色",
  characterName: "角色名稱",
  power: "戰力",
  addCharacter: "新增角色",
  colName: "名稱",
  colPower: "戰力",
  colCanRun: "可挑戰",
  colDungeon: "副本",
  colGoldClear: "每次金幣",
  colPowerNeeded: "所需戰力",
  colAccountCap: "帳號上限",
  enterPower: "請輸入戰力",
  none: "無",
  remove: "移除",
  dungeonsTitle: "副本",
  dungeonsHint:
    "每次通關金幣來自試算表的副本分頁。獎勵變更時可在此修改名稱、金幣或戰力，也可新增副本。",
  dungeonName: "副本名稱",
  goldPerClear: "每次金幣",
  powerNeeded: "所需戰力（0 為無限制）",
  addDungeon: "新增副本",
  goldCap: "每位角色金幣上限",
  maxRuns: "每位角色每個副本次數上限",
  accountRuns: "每個副本帳號次數",
  resetDungeons: "重設副本資料",
  calculate: "計算每週規劃",
  missingPowerOne: "{count} 位角色尚未填寫戰力。",
  missingPowerMany: "{count} 位角色尚未填寫戰力。",
  weeklyPlan: "每週規劃",
  accountGold: "帳號金幣 {gold}",
  rawSuffix: " · 未封頂 {gold}",
  characterCountOne: "{count} 位角色",
  characterCountMany: "{count} 位角色",
  copyPlan: "複製規劃",
  copied: "已複製",
  copyTable: "複製表格",
  tableCopied: "已複製表格",
  hide: "隱藏",
  underCap: "低於上限 {gold}",
  cappedRaw: "已達上限 · 未封頂 {gold}",
  atCap: "已達上限",
  tableHint: "分配表。複製表格後可貼到 Google 試算表或 Excel。",
  colCharacter: "角色",
  colGold: "金幣",
  usedHeader: "已用 / {n}",
  footer:
    "角色清單會存在這個瀏覽器。按「載入試算表角色」可還原副本分頁上的角色，再逐一輸入戰力。",
  resetEverything: "全部重設",
  errorNeedCharacter: "請至少新增一位有名稱與戰力的角色。",
  errorNeedDungeon: "請至少新增一個副本。",
  errorCharacterName: "請輸入角色名稱。",
  errorPower: "戰力必須是數字，例如 65000 或 65k。",
  errorCopyPlan: "無法複製規劃。",
  errorCopyTable: "無法複製表格。",
  errorDungeonName: "請輸入副本名稱。",
  errorGold: "金幣必須是數字，例如 65000 或 65k。",
  errorPowerReq: "所需戰力必須是數字，例如 60000 或 60k。",
  errorLastDungeon: "請至少保留一個副本。",
  nPerWeek: "{n} / 週",
  planTitle: "亞特蘭之晶每週副本規劃",
  planRules:
    "金幣上限 {gold} / 角色 · 每個副本最多 {max} 次 · 帳號每個副本 {account} 次",
  noRuns: "無挑戰",
  characterLine: "{name}（戰力 {power}）：{runs} → {gold} 金幣",
  characterLineRaw:
    "{name}（戰力 {power}）：{runs} → {gold} 金幣（未封頂 {raw}）",
  accountTotal: "帳號合計：{gold} 金幣",
  dungeonSlots: "副本名額：{slots}",
  placeholderName: "scytheguard",
  placeholderPower: "65000 或 65k",
  placeholderDungeon: "新副本",
  placeholderGold: "50000",
  copyTableTitle: "複製後可貼到 Google 試算表或 Excel",
  noLimitShort: "無限制",
};

const messages: Record<Locale, { [K in MessageKey]: string }> = {
  en,
  "zh-Hant": zhHant,
};

const DUNGEON_NAMES: Record<Locale, Record<string, string>> = {
  en: {
    sp: "SP",
    dd: "DD",
    ht: "HT",
    ks: "KS",
    dl: "DL",
    ad: "AD",
    tof: "TOF",
    queen: "Queen",
    king: "King",
  },
  "zh-Hant": {
    sp: "囚籠",
    dd: "迷津",
    ht: "心臟",
    ks: "章魚",
    dl: "烏鴉",
    ad: "天啟",
    tof: "遺跡",
    queen: "皇后",
    king: "國王",
  },
};

export type MessageKey = keyof typeof en;

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh-Hant";
}

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // ignore missing storage
  }
  if (typeof navigator === "undefined") return "en";
  const candidates = [...(navigator.languages ?? []), navigator.language];
  for (const lang of candidates) {
    if (!lang) continue;
    const lower = lang.toLowerCase();
    if (
      lower.startsWith("zh-hant") ||
      lower.startsWith("zh-tw") ||
      lower.startsWith("zh-hk") ||
      lower.startsWith("zh-mo")
    ) {
      return "zh-Hant";
    }
  }
  return "en";
}

export function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore quota / private mode
  }
}

export function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "zh-Hant" ? "zh-Hant" : "en";
  document.title = t(locale, "docTitle");
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", t(locale, "docDescription"));
}

export function t(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = messages[locale][key] ?? messages.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name)
      ? String(vars[name])
      : `{${name}}`,
  );
}

export function usesDefaultDungeonName(dungeon: Dungeon): boolean {
  const base = DEFAULT_DUNGEONS.find((item) => item.id === dungeon.id);
  return Boolean(base && dungeon.name === base.name);
}

export function dungeonLabel(dungeon: Dungeon, locale: Locale): string {
  if (!usesDefaultDungeonName(dungeon)) return dungeon.name;
  return DUNGEON_NAMES[locale][dungeon.id] ?? dungeon.name;
}

export function powerGatesText(dungeons: Dungeon[], locale: Locale): string {
  const groups = new Map<number, Dungeon[]>();
  for (const dungeon of dungeons) {
    const req = dungeon.powerReq > 0 ? dungeon.powerReq : 0;
    const list = groups.get(req) ?? [];
    list.push(dungeon);
    groups.set(req, list);
  }
  const nameJoiner = locale === "zh-Hant" ? "、" : ", ";
  const parts = [...groups.entries()]
    .sort((a, b) => {
      if (a[0] === 0) return 1;
      if (b[0] === 0) return -1;
      return b[0] - a[0];
    })
    .map(([req, list]) => {
      const names = list.map((dungeon) => dungeonLabel(dungeon, locale));
      if (req === 0) {
        return t(locale, "gateNoLimit", { names: names.join(nameJoiner) });
      }
      return `${names.join(" / ")} ${formatPowerReq(req, locale, t(locale, "noLimitShort"))}`;
    });
  return t(locale, "powerGates", { gates: parts.join(" · ") });
}

export type PlanCopy = {
  title: string;
  rulesLine: string;
  noRuns: string;
  formatCharacter: (info: {
    name: string;
    power: string;
    runs: string;
    gold: string;
    raw: string | null;
  }) => string;
  formatAccountTotal: (gold: string) => string;
  formatDungeonSlots: (slots: string) => string;
  characterHeader: string;
  powerHeader: string;
  goldHeader: string;
  usedHeader: string;
  dungeonName: (dungeon: Dungeon) => string;
  numberLocale: string;
};

export function planCopy(locale: Locale, rules: PlannerRules): PlanCopy {
  const tag = numberLocale(locale);
  return {
    title: t(locale, "planTitle"),
    rulesLine: t(locale, "planRules", {
      gold: rules.goldCap.toLocaleString(tag),
      max: rules.maxAttemptsPerDungeon,
      account: rules.accountWeeklyAttempts,
    }),
    noRuns: t(locale, "noRuns"),
    formatCharacter: ({ name, power, runs, gold, raw }) =>
      raw
        ? t(locale, "characterLineRaw", { name, power, runs, gold, raw })
        : t(locale, "characterLine", { name, power, runs, gold }),
    formatAccountTotal: (gold) => t(locale, "accountTotal", { gold }),
    formatDungeonSlots: (slots) => t(locale, "dungeonSlots", { slots }),
    characterHeader: t(locale, "colCharacter"),
    powerHeader: t(locale, "colPower"),
    goldHeader: t(locale, "colGold"),
    usedHeader: t(locale, "usedHeader", { n: rules.accountWeeklyAttempts }),
    dungeonName: (dungeon) => dungeonLabel(dungeon, locale),
    numberLocale: tag,
  };
}
