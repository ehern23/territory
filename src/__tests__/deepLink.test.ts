import { describe, expect, it } from "vitest";
import { sellerFromSearch } from "@/components/onboarding/seller";

describe("?seller= deep link", () => {
  it("opens the named preset", () => {
    for (const id of ["anthropic", "openai", "cursor", "stripe", "vercel"]) {
      expect(sellerFromSearch(`?seller=${id}`)?.preset.profile.id).toBe(id);
    }
  });

  it("accepts aliases and any case", () => {
    expect(sellerFromSearch("?seller=Anthropic")?.preset.profile.id).toBe("anthropic");
    expect(sellerFromSearch("?seller=open-ai")?.preset.profile.id).toBe("openai");
    expect(sellerFromSearch("?seller=claude")?.preset.profile.id).toBe("anthropic");
    expect(sellerFromSearch("?seller=anysphere")?.preset.profile.id).toBe("cursor");
  });

  it("takes an optional role and falls back to the preset's own", () => {
    expect(sellerFromSearch("?seller=cursor&role=sdr")?.role).toBe("SDR");
    const link = sellerFromSearch("?seller=cursor&role=ceo");
    expect(link?.role).toBe(link?.preset.profile.role);
  });

  it("ignores unknown or missing sellers", () => {
    expect(sellerFromSearch("")).toBeNull();
    expect(sellerFromSearch("?seller=")).toBeNull();
    expect(sellerFromSearch("?seller=acme-widgets")).toBeNull();
    expect(sellerFromSearch("?lite&perf")).toBeNull();
  });
});
