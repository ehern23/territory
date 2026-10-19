"use client";

import { motion } from "motion/react";
import { HEALTH_HEX } from "@/domain/health";
import { FRUIT_HEX } from "@/three/palette";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { ARCHETYPE_LABEL } from "@/data/profiles";
import type { SellerProfile } from "@/domain/profile";

/** The honesty line, per kind of territory. */
function provenance(p: SellerProfile): string {
  if (p.id === "vercel") {
    return "Company research is public and labelled; people, CRM activity and dollar values are fictional demo data.";
  }
  if (p.source === "researched") {
    return "Target companies and their context were researched by Claude and are unverified; people, CRM activity and dollar values are fictional demo data.";
  }
  if (p.source === "archetype") {
    return `Targets come from a ${ARCHETYPE_LABEL[p.archetype].toLowerCase()} archetype; organizations, people, CRM activity and dollar values are illustrative.`;
  }
  return "Target companies are real and their context is labelled seller inference; people, CRM activity and dollar values are fictional demo data.";
}

/** The visual language, in one card. */
export function Legend({ onClose }: { onClose: () => void }) {
  const profile = useTerritoryStore((s) => s.profile);
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="glass glass-strong absolute right-0 top-[calc(100%+10px)] w-[min(340px,calc(100vw-32px))] p-5 flex flex-col gap-4"
      role="dialog"
      aria-label="How to read the forest"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow">How to read the forest</span>
        <button type="button" className="btn btn-ghost btn-sm -mr-2" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <Row title="Tree = account" body="Height is potential ARR. Girth is the size of the enterprise." />
      <Row title="Limbs = business units" body="A bare limb is dormant by choice. Fresh light green is a limb reactivated by a new signal.">
        <span className="dot" style={{ background: "#b5dc6e" }} />
      </Row>
      <Row title="Canopy = engagement health" body="Recency, stakeholder depth, executive access and deal momentum.">
        <span className="flex gap-1">
          {(["thriving", "healthy", "cooling", "at-risk", "withering"] as const).map((b) => (
            <span key={b} className="dot" style={{ background: HEALTH_HEX[b] }} />
          ))}
        </span>
      </Row>
      <Row title="Fruit = pipeline" body="Size is deal value. Colour and glow ripen with stage: discovery → qualified → validation → commercial.">
        <span className="flex gap-1">
          {(["bud", "young", "growing", "ripe"] as const).map((m) => (
            <span key={m} className="dot" style={{ background: FRUIT_HEX[m] }} />
          ))}
        </span>
      </Row>
      <p className="text-[11px] text-paper-40 leading-relaxed">
        Illustrative {profile.territoryLabel} territory. {provenance(profile)}
      </p>
    </motion.div>
  );
}

function Row({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium">{title}</span>
        {children}
      </div>
      <p className="text-[12px] text-paper-60 leading-relaxed">{body}</p>
    </div>
  );
}
