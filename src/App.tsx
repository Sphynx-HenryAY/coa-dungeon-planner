import { FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  canRunDungeon,
  DEFAULT_DUNGEONS,
  DEFAULT_RULES,
  parsePower,
  readyCharacters,
} from "./lib/dungeons";
import { formatGold, formatPowerReq } from "./lib/format";
import { planWeek, summarizePlanText } from "./lib/optimizer";
import {
  blankCharacter,
  defaultState,
  loadState,
  saveState,
  spreadsheetRoster,
} from "./lib/storage";
import type { Character, Dungeon, PlannerRules, WeekPlan } from "./lib/types";

export default function App() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [dungeons, setDungeons] = useState<Dungeon[]>(DEFAULT_DUNGEONS);
  const [rules, setRules] = useState<PlannerRules>(DEFAULT_RULES);
  const [draftName, setDraftName] = useState("");
  const [draftPower, setDraftPower] = useState("");
  const [powerInputs, setPowerInputs] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");

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

  const ready = useMemo(() => readyCharacters(characters), [characters]);
  const missingPower = characters.filter(
    (character) => character.name.trim() && character.power === null,
  );

  const calculate = () => {
    setCopied(false);
    if (ready.length === 0) {
      setPlan(null);
      setError("Add at least one character with a name and power.");
      return;
    }
    setError("");
    setPlan(planWeek(ready, dungeons, rules));
  };

  const addCharacter = (event?: FormEvent) => {
    event?.preventDefault();
    const name = draftName.trim();
    const power = parsePower(draftPower);
    if (!name) {
      setError("Enter a character name.");
      return;
    }
    if (draftPower.trim() && power === null) {
      setError("Power must be a number, like 65000 or 65k.");
      return;
    }
    setError("");
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

  const copyPlan = async () => {
    if (!plan) return;
    await navigator.clipboard.writeText(
      summarizePlanText(characters, dungeons, plan, rules),
    );
    setCopied(true);
  };

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Crystal of Atlan</p>
        <h1>Weekly dungeon planner</h1>
        <p className="lede">
          Enter each character&apos;s name and power. The planner assigns up to
          3 attempts per dungeon so every character lands as close as possible
          to the {formatGold(rules.goldCap)} weekly gold cap.
        </p>
      </header>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Characters</h2>
            <p>
              Power gates: DL {formatPowerReq(40000)} · SP / DD / HT / KS{" "}
              {formatPowerReq(60000)} · King, Queen, TOF, AD have no limit.
            </p>
          </div>
          <div className="row-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => replaceRoster(spreadsheetRoster())}
            >
              Load spreadsheet names
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => replaceRoster([blankCharacter()])}
            >
              Clear roster
            </button>
          </div>
        </div>

        <form className="add-row" onSubmit={addCharacter}>
          <label>
            Character name
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="scytheguard"
              autoComplete="off"
            />
          </label>
          <label>
            Power
            <input
              value={draftPower}
              onChange={(event) => setDraftPower(event.target.value)}
              placeholder="65000 or 65k"
              inputMode="decimal"
            />
          </label>
          <button type="submit">Add character</button>
        </form>

        <div className="table-wrap">
          <table className="roster">
            <thead>
              <tr>
                <th>Name</th>
                <th>Power</th>
                <th>Can run</th>
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
                      placeholder="Character name"
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
                      placeholder="e.g. 65k"
                      inputMode="decimal"
                    />
                  </td>
                  <td className="muted">
                    {character.power === null
                      ? "enter power"
                      : dungeons
                          .filter((dungeon) =>
                            canRunDungeon(character.power ?? 0, dungeon),
                          )
                          .map((dungeon) => dungeon.name)
                          .join(" · ") || "none"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => removeCharacter(character.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="panel rules">
        <summary>Dungeon gold and power gates</summary>
        <p className="hint">
          Gold per clear comes from the dungeon tab in your Excel file. Edit if
          a reward changed.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dungeon</th>
                <th>Gold / clear</th>
                <th>Power needed</th>
                <th>Account cap</th>
              </tr>
            </thead>
            <tbody>
              {dungeons.map((dungeon) => (
                <tr key={dungeon.id}>
                  <td>{dungeon.name}</td>
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
                      : `${rules.accountWeeklyAttempts} / week`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rule-fields">
          <label>
            Gold cap / character
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
            Max runs / character / dungeon
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
            Account runs / dungeon
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
            Reset dungeon data
          </button>
        </div>
      </details>

      <div className="calculate-bar">
        <button type="button" className="primary" onClick={calculate}>
          Calculate weekly plan
        </button>
        {missingPower.length > 0 && (
          <p className="warn">
            {missingPower.length} character
            {missingPower.length === 1 ? "" : "s"} still need a power value.
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </div>

      {plan && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Weekly plan</h2>
              <p>
                Account gold {formatGold(plan.accountGold.capped)}
                {plan.accountGold.raw > plan.accountGold.capped
                  ? ` · raw ${formatGold(plan.accountGold.raw)}`
                  : ""}{" "}
                · {ready.length} character{ready.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="row-actions">
              <button type="button" className="secondary" onClick={copyPlan}>
                {copied ? "Copied" : "Copy plan"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setPlan(null)}
              >
                Hide
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
                    <span>{formatGold(gold.capped)}</span>
                  </header>
                  <div className="bar" aria-hidden="true">
                    <div className="bar-fill" style={{ width: `${ratio * 100}%` }} />
                  </div>
                  <p className="muted">
                    {gold.remaining > 0
                      ? `${formatGold(gold.remaining)} under cap`
                      : gold.raw > gold.capped
                        ? `capped · raw ${formatGold(gold.raw)}`
                        : "at cap"}
                  </p>
                  <ul>
                    {dungeons
                      .filter(
                        (dungeon) =>
                          (plan.attempts[character.id]?.[dungeon.id] ?? 0) > 0,
                      )
                      .map((dungeon) => (
                        <li key={dungeon.id}>
                          <strong>{dungeon.name}</strong>
                          <span>
                            x{plan.attempts[character.id][dungeon.id]} ·{" "}
                            {formatGold(
                              plan.attempts[character.id][dungeon.id] *
                                dungeon.gold,
                            )}
                          </span>
                        </li>
                      ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <div className="table-wrap">
            <table className="plan">
              <thead>
                <tr>
                  <th>Character</th>
                  {dungeons.map((dungeon) => (
                    <th key={dungeon.id}>{dungeon.name}</th>
                  ))}
                  <th>Gold</th>
                </tr>
              </thead>
              <tbody>
                {ready.map((character) => (
                  <tr key={character.id}>
                    <td>
                      {character.name}
                      <div className="muted tiny">
                        {character.power?.toLocaleString("en-US")}
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
                      {formatGold(plan.characterGold[character.id].capped)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Used / {rules.accountWeeklyAttempts}</th>
                  {dungeons.map((dungeon) => (
                    <th key={dungeon.id}>
                      {plan.dungeonUsed[dungeon.id] ?? 0}
                    </th>
                  ))}
                  <th>{formatGold(plan.accountGold.capped)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <footer className="foot">
        Roster is saved in this browser. Use Load spreadsheet names to restore
        the characters from the dungeon tab, then type each power.
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
          Reset everything
        </button>
      </footer>
    </div>
  );
}
