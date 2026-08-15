import { FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  canRunDungeon,
  DEFAULT_DUNGEONS,
  DEFAULT_RULES,
  parsePower,
  readyCharacters,
} from "./lib/dungeons";
import { copySpreadsheet } from "./lib/clipboard";
import { formatGold } from "./lib/format";
import {
  applyDocumentLocale,
  detectLocale,
  dungeonLabel,
  persistLocale,
  planCopy,
  powerGatesText,
  t,
  type MessageKey,
} from "./lib/i18n";
import {
  planTableHtml,
  planTableTsv,
  planWeek,
  summarizePlanText,
} from "./lib/optimizer";
import {
  blankCharacter,
  blankDungeon,
  defaultState,
  loadState,
  saveState,
  spreadsheetRoster,
} from "./lib/storage";
import type { Character, Dungeon, Locale, PlannerRules, WeekPlan } from "./lib/types";

function parseAmount(raw: string): number | null {
  if (!raw.trim()) return 0;
  return parsePower(raw);
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [characters, setCharacters] = useState<Character[]>([]);
  const [dungeons, setDungeons] = useState<Dungeon[]>(DEFAULT_DUNGEONS);
  const [rules, setRules] = useState<PlannerRules>(DEFAULT_RULES);
  const [draftName, setDraftName] = useState("");
  const [draftPower, setDraftPower] = useState("");
  const [draftDungeonName, setDraftDungeonName] = useState("");
  const [draftDungeonGold, setDraftDungeonGold] = useState("");
  const [draftDungeonPower, setDraftDungeonPower] = useState("");
  const [powerInputs, setPowerInputs] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [copied, setCopied] = useState<"plan" | "table" | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [errorKey, setErrorKey] = useState<MessageKey | "">("");

  useEffect(() => {
    const stored = loadState();
    setCharacters(stored.characters);
    setDungeons(stored.dungeons);
    setRules(stored.rules);
    setPowerInputs(
      Object.fromEntries(
        stored.characters.map((character) => [
          character.id,
          character.power === null ? "" : String(character.power),
        ]),
      ),
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ characters, dungeons, rules });
  }, [characters, dungeons, rules, hydrated]);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const ready = useMemo(() => readyCharacters(characters), [characters]);
  const missingPower = characters.filter(
    (character) => character.name.trim() && character.power === null,
  );
  const copy = useMemo(() => planCopy(locale, rules), [locale, rules]);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    persistLocale(next);
  };

  const calculate = () => {
    setCopied(null);
    if (dungeons.length === 0) {
      setPlan(null);
      setErrorKey("errorNeedDungeon");
      return;
    }
    if (ready.length === 0) {
      setPlan(null);
      setErrorKey("errorNeedCharacter");
      return;
    }
    setErrorKey("");
    setPlan(planWeek(ready, dungeons, rules));
  };

  const addCharacter = (event?: FormEvent) => {
    event?.preventDefault();
    const name = draftName.trim();
    const power = parsePower(draftPower);
    if (!name) {
      setErrorKey("errorCharacterName");
      return;
    }
    if (draftPower.trim() && power === null) {
      setErrorKey("errorPower");
      return;
    }
    setErrorKey("");
    const next = { ...blankCharacter(name), power };
    setCharacters((current) => [...current, next]);
    setPowerInputs((current) => ({
      ...current,
      [next.id]: power === null ? "" : String(power),
    }));
    setDraftName("");
    setDraftPower("");
    setPlan(null);
  };

  const addDungeon = (event?: FormEvent) => {
    event?.preventDefault();
    const name = draftDungeonName.trim();
    const gold = parseAmount(draftDungeonGold);
    const powerReq = parseAmount(draftDungeonPower);
    if (!name) {
      setErrorKey("errorDungeonName");
      return;
    }
    if (gold === null) {
      setErrorKey("errorGold");
      return;
    }
    if (powerReq === null) {
      setErrorKey("errorPowerReq");
      return;
    }
    setErrorKey("");
    setDungeons((current) => [...current, blankDungeon(name, gold, powerReq)]);
    setDraftDungeonName("");
    setDraftDungeonGold("");
    setDraftDungeonPower("");
    setPlan(null);
  };

  const replaceRoster = (next: Character[]) => {
    setCharacters(next);
    setPowerInputs(
      Object.fromEntries(
        next.map((character) => [
          character.id,
          character.power === null ? "" : String(character.power),
        ]),
      ),
    );
    setPlan(null);
  };

  const updateCharacter = (id: string, patch: Partial<Character>) => {
    setCharacters((current) =>
      current.map((character) =>
        character.id === id ? { ...character, ...patch } : character,
      ),
    );
    setPlan(null);
  };

  const removeCharacter = (id: string) => {
    setCharacters((current) => current.filter((character) => character.id !== id));
    setPlan(null);
  };

  const updateDungeon = (id: string, patch: Partial<Dungeon>) => {
    setDungeons((current) =>
      current.map((dungeon) =>
        dungeon.id === id ? { ...dungeon, ...patch } : dungeon,
      ),
    );
    setPlan(null);
  };

  const removeDungeon = (id: string) => {
    if (dungeons.length <= 1) {
      setErrorKey("errorLastDungeon");
      return;
    }
    setErrorKey("");
    setDungeons((current) => current.filter((dungeon) => dungeon.id !== id));
    setPlan(null);
  };

  const copyPlan = async () => {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(
        summarizePlanText(characters, dungeons, plan, rules, copy),
      );
      setErrorKey("");
      setCopied("plan");
    } catch {
      setErrorKey("errorCopyPlan");
    }
  };

  const copyPlanTable = async () => {
    if (!plan) return;
    try {
      await copySpreadsheet(
        planTableTsv(characters, dungeons, plan, rules, copy),
        planTableHtml(characters, dungeons, plan, rules, copy),
      );
      setErrorKey("");
      setCopied("table");
    } catch {
      setErrorKey("errorCopyTable");
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-top">
          <div>
            <p className="eyebrow">{t(locale, "eyebrow")}</p>
            <h1>{t(locale, "title")}</h1>
          </div>
          <div className="lang-switch" role="group" aria-label={t(locale, "language")}>
            <button
              type="button"
              className={locale === "en" ? "active" : undefined}
              aria-pressed={locale === "en"}
              onClick={() => changeLocale("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={locale === "zh-Hant" ? "active" : undefined}
              aria-pressed={locale === "zh-Hant"}
              onClick={() => changeLocale("zh-Hant")}
            >
              繁中
            </button>
          </div>
        </div>
        <p className="lede">
          {t(locale, "lede", {
            max: rules.maxAttemptsPerDungeon,
            gold: formatGold(rules.goldCap, locale),
          })}
        </p>
      </header>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>{t(locale, "characters")}</h2>
            <p>{powerGatesText(dungeons, locale)}</p>
          </div>
          <div className="row-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => replaceRoster(spreadsheetRoster())}
            >
              {t(locale, "loadSpreadsheet")}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => replaceRoster([blankCharacter()])}
            >
              {t(locale, "clearRoster")}
            </button>
          </div>
        </div>

        <form className="add-row" onSubmit={addCharacter}>
          <label>
            {t(locale, "characterName")}
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={t(locale, "placeholderName")}
              autoComplete="off"
            />
          </label>
          <label>
            {t(locale, "power")}
            <input
              value={draftPower}
              onChange={(event) => setDraftPower(event.target.value)}
              placeholder={t(locale, "placeholderPower")}
              inputMode="decimal"
            />
          </label>
          <button type="submit">{t(locale, "addCharacter")}</button>
        </form>

        <div className="table-wrap">
          <table className="roster">
            <thead>
              <tr>
                <th>{t(locale, "colName")}</th>
                <th>{t(locale, "colPower")}</th>
                <th>{t(locale, "colCanRun")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {characters.map((character) => (
                <tr key={character.id}>
                  <td>
                    <input
                      value={character.name}
                      onChange={(event) =>
                        updateCharacter(character.id, {
                          name: event.target.value,
                        })
                      }
                      placeholder={t(locale, "characterName")}
                    />
                  </td>
                  <td>
                    <input
                      value={powerInputs[character.id] ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value;
                        setPowerInputs((current) => ({
                          ...current,
                          [character.id]: raw,
                        }));
                        if (!raw.trim()) {
                          updateCharacter(character.id, { power: null });
                          return;
                        }
                        const parsed = parsePower(raw);
                        if (parsed !== null) {
                          updateCharacter(character.id, { power: parsed });
                        }
                      }}
                      placeholder={t(locale, "placeholderPower")}
                      inputMode="decimal"
                    />
                  </td>
                  <td className="muted">
                    {character.power === null
                      ? t(locale, "enterPower")
                      : dungeons
                          .filter((dungeon) =>
                            canRunDungeon(character.power ?? 0, dungeon),
                          )
                          .map((dungeon) => dungeonLabel(dungeon, locale))
                          .join(" · ") || t(locale, "none")}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => removeCharacter(character.id)}
                    >
                      {t(locale, "remove")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>{t(locale, "dungeonsTitle")}</h2>
            <p>{t(locale, "dungeonsHint")}</p>
          </div>
        </div>
        <form className="add-row four" onSubmit={addDungeon}>
          <label>
            {t(locale, "dungeonName")}
            <input
              value={draftDungeonName}
              onChange={(event) => setDraftDungeonName(event.target.value)}
              placeholder={t(locale, "placeholderDungeon")}
              autoComplete="off"
            />
          </label>
          <label>
            {t(locale, "goldPerClear")}
            <input
              value={draftDungeonGold}
              onChange={(event) => setDraftDungeonGold(event.target.value)}
              placeholder={t(locale, "placeholderGold")}
              inputMode="decimal"
            />
          </label>
          <label>
            {t(locale, "powerNeeded")}
            <input
              value={draftDungeonPower}
              onChange={(event) => setDraftDungeonPower(event.target.value)}
              placeholder="0"
              inputMode="decimal"
            />
          </label>
          <button type="submit">{t(locale, "addDungeon")}</button>
        </form>
        <div className="table-wrap">
          <table className="dungeon-table">
            <thead>
              <tr>
                <th>{t(locale, "colDungeon")}</th>
                <th>{t(locale, "colGoldClear")}</th>
                <th>{t(locale, "colPowerNeeded")}</th>
                <th>{t(locale, "colAccountCap")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dungeons.map((dungeon) => (
                <tr key={dungeon.id}>
                  <td>
                    <input
                      value={dungeonLabel(dungeon, locale)}
                      onChange={(event) =>
                        updateDungeon(dungeon.id, {
                          name: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={dungeon.gold}
                      onChange={(event) =>
                        updateDungeon(dungeon.id, {
                          gold: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={dungeon.powerReq}
                      onChange={(event) =>
                        updateDungeon(dungeon.id, {
                          powerReq: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="muted">
                    {plan
                      ? `${plan.dungeonUsed[dungeon.id] ?? 0} / ${rules.accountWeeklyAttempts}`
                      : t(locale, "nPerWeek", {
                          n: rules.accountWeeklyAttempts,
                        })}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => removeDungeon(dungeon.id)}
                    >
                      {t(locale, "remove")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rule-fields">
          <label>
            {t(locale, "goldCap")}
            <input
              type="number"
              min={0}
              value={rules.goldCap}
              onChange={(event) => {
                setRules((current) => ({
                  ...current,
                  goldCap: Number(event.target.value) || 0,
                }));
                setPlan(null);
              }}
            />
          </label>
          <label>
            {t(locale, "maxRuns")}
            <input
              type="number"
              min={0}
              value={rules.maxAttemptsPerDungeon}
              onChange={(event) => {
                setRules((current) => ({
                  ...current,
                  maxAttemptsPerDungeon: Number(event.target.value) || 0,
                }));
                setPlan(null);
              }}
            />
          </label>
          <label>
            {t(locale, "accountRuns")}
            <input
              type="number"
              min={0}
              value={rules.accountWeeklyAttempts}
              onChange={(event) => {
                setRules((current) => ({
                  ...current,
                  accountWeeklyAttempts: Number(event.target.value) || 0,
                }));
                setPlan(null);
              }}
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDungeons(DEFAULT_DUNGEONS.map((dungeon) => ({ ...dungeon })));
              setRules({ ...DEFAULT_RULES });
              setPlan(null);
            }}
          >
            {t(locale, "resetDungeons")}
          </button>
        </div>
      </section>

      <div className="calculate-bar">
        <button type="button" className="primary" onClick={calculate}>
          {t(locale, "calculate")}
        </button>
        {missingPower.length > 0 && (
          <p className="warn">
            {t(
              locale,
              missingPower.length === 1 ? "missingPowerOne" : "missingPowerMany",
              { count: missingPower.length },
            )}
          </p>
        )}
        {errorKey && <p className="error">{t(locale, errorKey)}</p>}
      </div>

      {plan && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>{t(locale, "weeklyPlan")}</h2>
              <p>
                {t(locale, "accountGold", {
                  gold: formatGold(plan.accountGold.capped, locale),
                })}
                {plan.accountGold.raw > plan.accountGold.capped
                  ? t(locale, "rawSuffix", {
                      gold: formatGold(plan.accountGold.raw, locale),
                    })
                  : ""}{" "}
                ·{" "}
                {t(
                  locale,
                  ready.length === 1 ? "characterCountOne" : "characterCountMany",
                  { count: ready.length },
                )}
              </p>
            </div>
            <div className="row-actions">
              <button type="button" className="secondary" onClick={copyPlan}>
                {copied === "plan" ? t(locale, "copied") : t(locale, "copyPlan")}
              </button>
              <button
                type="button"
                className="secondary"
                title={t(locale, "copyTableTitle")}
                onClick={copyPlanTable}
              >
                {copied === "table"
                  ? t(locale, "tableCopied")
                  : t(locale, "copyTable")}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setPlan(null)}
              >
                {t(locale, "hide")}
              </button>
            </div>
          </div>

          <div className="summary-grid">
            {ready.map((character) => {
              const gold = plan.characterGold[character.id];
              const ratio = Math.min(1, gold.capped / rules.goldCap);
              return (
                <article key={character.id} className="char-card">
                  <header>
                    <h3>{character.name}</h3>
                    <span>{formatGold(gold.capped, locale)}</span>
                  </header>
                  <div className="bar" aria-hidden="true">
                    <div className="bar-fill" style={{ width: `${ratio * 100}%` }} />
                  </div>
                  <p className="muted">
                    {gold.remaining > 0
                      ? t(locale, "underCap", {
                          gold: formatGold(gold.remaining, locale),
                        })
                      : gold.raw > gold.capped
                        ? t(locale, "cappedRaw", {
                            gold: formatGold(gold.raw, locale),
                          })
                        : t(locale, "atCap")}
                  </p>
                  <ul>
                    {dungeons
                      .filter(
                        (dungeon) =>
                          (plan.attempts[character.id]?.[dungeon.id] ?? 0) > 0,
                      )
                      .map((dungeon) => (
                        <li key={dungeon.id}>
                          <strong>{dungeonLabel(dungeon, locale)}</strong>
                          <span>
                            x{plan.attempts[character.id][dungeon.id]} ·{" "}
                            {formatGold(
                              plan.attempts[character.id][dungeon.id] *
                                dungeon.gold,
                              locale,
                            )}
                          </span>
                        </li>
                      ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <div className="table-toolbar">
            <p className="hint">{t(locale, "tableHint")}</p>
            <button
              type="button"
              className="secondary"
              title={t(locale, "copyTableTitle")}
              onClick={copyPlanTable}
            >
              {copied === "table"
                ? t(locale, "tableCopied")
                : t(locale, "copyTable")}
            </button>
          </div>
          <div className="table-wrap">
            <table className="plan">
              <thead>
                <tr>
                  <th>{t(locale, "colCharacter")}</th>
                  {dungeons.map((dungeon) => (
                    <th key={dungeon.id}>{dungeonLabel(dungeon, locale)}</th>
                  ))}
                  <th>{t(locale, "colGold")}</th>
                </tr>
              </thead>
              <tbody>
                {ready.map((character) => (
                  <tr key={character.id}>
                    <td>
                      {character.name}
                      <div className="muted tiny">
                        {character.power?.toLocaleString(
                          copy.numberLocale,
                        )}
                      </div>
                    </td>
                    {dungeons.map((dungeon) => {
                      const count =
                        plan.attempts[character.id]?.[dungeon.id] ?? 0;
                      const locked = !canRunDungeon(
                        character.power ?? 0,
                        dungeon,
                      );
                      return (
                        <td
                          key={dungeon.id}
                          className={
                            locked ? "locked" : count > 0 ? "hit" : undefined
                          }
                        >
                          {locked ? "—" : count || ""}
                        </td>
                      );
                    })}
                    <td className="gold-cell">
                      {formatGold(
                        plan.characterGold[character.id].raw,
                        locale,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>{t(locale, "usedHeader", { n: rules.accountWeeklyAttempts })}</th>
                  {dungeons.map((dungeon) => (
                    <th key={dungeon.id}>
                      {plan.dungeonUsed[dungeon.id] ?? 0}
                    </th>
                  ))}
                  <th>{formatGold(plan.accountGold.raw, locale)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <footer className="foot">
        {t(locale, "footer")}
        <button
          type="button"
          className="linkish"
          onClick={() => {
            const reset = defaultState();
            replaceRoster(reset.characters);
            setDungeons(reset.dungeons);
            setRules(reset.rules);
          }}
        >
          {t(locale, "resetEverything")}
        </button>
      </footer>
    </div>
  );
}
