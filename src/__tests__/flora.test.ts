import { describe, expect, it } from "vitest";
import { generateTree } from "@/three/flora/generateTree";
import { accountTreeParams } from "@/three/flora/accountTrees";
import { territory } from "@/data";

describe("tree generation", () => {
  it("is deterministic and maps one scaffold limb per business unit", () => {
    for (const account of territory.accounts) {
      const params = accountTreeParams(account);
      const a = generateTree(params);
      const b = generateTree(params);
      expect(a.cards.length).toBe(b.cards.length);
      expect(a.cards[0].center.toArray()).toEqual(b.cards[0].center.toArray());
      expect(a.limbs.filter(Boolean).length).toBe(account.businessUnits.length);
      for (let i = 0; i < account.businessUnits.length; i++) {
        expect(a.cards.some((c) => c.limb === i)).toBe(true);
      }
    }
  });

  it("grows taller trees for accounts with more potential", () => {
    const sorted = [...territory.accounts].sort((x, y) => x.scale.opportunity - y.scale.opportunity);
    const low = generateTree(accountTreeParams(sorted[0]));
    const high = generateTree(accountTreeParams(sorted[sorted.length - 1]));
    expect(high.height).toBeGreaterThanOrEqual(low.height);
  });
});
