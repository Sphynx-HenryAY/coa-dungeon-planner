import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_DUNGEONS } from "./dungeons.ts";
import { mergeDungeons } from "./storage.ts";

describe("mergeDungeons", () => {
  it("returns defaults when nothing is saved", () => {
    assert.deepEqual(mergeDungeons(undefined), DEFAULT_DUNGEONS);
    assert.deepEqual(mergeDungeons([]), DEFAULT_DUNGEONS);
  });

  it("keeps gold and name edits on known dungeons", () => {
    const merged = mergeDungeons([
      { id: "sp", name: "SP", gold: 12345, powerReq: 70000 },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, "sp");
    assert.equal(merged[0].gold, 12345);
    assert.equal(merged[0].powerReq, 70000);
  });

  it("keeps custom dungeons after defaults were removed", () => {
    const merged = mergeDungeons([
      { id: "custom-1", name: "新副本", gold: 999, powerReq: 10000 },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].name, "新副本");
    assert.equal(merged[0].gold, 999);
    assert.equal(
      merged.some((dungeon) => dungeon.id === "king"),
      false,
    );
  });

  it("fills missing gold from the default dungeon", () => {
    const merged = mergeDungeons([
      { id: "king", name: "King", gold: undefined as unknown as number, powerReq: 0 },
    ]);
    const king = DEFAULT_DUNGEONS.find((dungeon) => dungeon.id === "king");
    assert.equal(merged[0].gold, king?.gold);
  });
});
