"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useAccountView } from "@/store/selectors";
import { AccountPanel } from "./panels/AccountPanel";
import { BranchPanel } from "./panels/BranchPanel";
import { ProspectPanel } from "./panels/ProspectPanel";
import { OpportunityPanel } from "./panels/OpportunityPanel";
import { RootsPanel } from "./panels/RootsPanel";
import { ScorePanel } from "./panels/ScorePanel";
import { AnalyzePanel } from "./panels/AnalyzePanel";
import { PenetrationPanel } from "./panels/PenetrationPanel";
import { ActivityPanel } from "./panels/ActivityPanel";

/**
 * Contextual surface. Desktop: a side panel. Mobile: a bottom sheet.
 * The tree stays primary; the panel never navigates away from it.
 */
export function ContextPanel() {
  const mode = useTerritoryStore((s) => s.mode);
  const activeAccountId = useTerritoryStore((s) => s.activeAccountId);
  const view = useTerritoryStore((s) => s.view);
  const selectedProspectId = useTerritoryStore((s) => s.selectedProspectId);
  const selectedOpportunityId = useTerritoryStore((s) => s.selectedOpportunityId);
  const focusBusinessUnitId = useTerritoryStore((s) => s.focusBusinessUnitId);
  const focusTeamId = useTerritoryStore((s) => s.focusTeamId);
  const navigatorOpen = useTerritoryStore((s) => s.navigatorOpen);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const reduce = useReducedMotion();
  const account = useAccountView(mode === "account" ? activeAccountId : null);

  if (mode !== "account" || !account) return null;

  let key = "account";
  let content: React.ReactNode = <AccountPanel view={account} />;
  if (view === "roots") {
    key = "roots";
    content = <RootsPanel view={account} />;
  } else if (view === "score") {
    key = "score";
    content = <ScorePanel view={account} />;
  } else if (view === "analyze") {
    key = "analyze";
    content = <AnalyzePanel view={account} />;
  } else if (view === "penetration") {
    key = "penetration";
    content = <PenetrationPanel view={account} />;
  } else if (view === "activity") {
    key = "activity";
    content = <ActivityPanel view={account} />;
  } else if (selectedProspectId) {
    key = `prospect:${selectedProspectId}`;
    content = <ProspectPanel view={account} prospectId={selectedProspectId} />;
  } else if (selectedOpportunityId) {
    key = `opp:${selectedOpportunityId}`;
    content = <OpportunityPanel view={account} opportunityId={selectedOpportunityId} />;
  } else if (focusBusinessUnitId) {
    key = `bu:${focusBusinessUnitId}:${focusTeamId ?? ""}`;
    content = <BranchPanel view={account} businessUnitId={focusBusinessUnitId} teamId={focusTeamId} />;
  }

  if (isCompact) {
    // Bottom sheet. The default account panel only appears when explicitly opened,
    // so the tree stays visible on small screens.
    const visible = key !== "account" || navigatorOpen;
    return (
      <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none">
        <AnimatePresence initial={false}>
          {visible && (
            <motion.section
              key={key}
              initial={reduce ? false : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { y: 30, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              className="surface absolute inset-x-2 bottom-[calc(66px+env(safe-area-inset-bottom))] rounded-[16px] max-h-[52vh] flex flex-col pointer-events-auto overflow-hidden"
              aria-live="polite"
            >
              <div className="flex justify-center pt-2">
                <span className="block h-1 w-9 rounded-full bg-paper-20" aria-hidden />
              </div>
              <div className="scroll flex-1 px-4 pb-4 pt-2">{content}</div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Side panel. One content tree only — overlapping exit/enter layers were
  // leaving stale account copy visible over the next surface.
  return (
    <aside
      className="surface absolute right-5 top-[84px] bottom-[20px] w-[372px] z-30 flex flex-col overflow-hidden"
      aria-live="polite"
    >
      <motion.div
        key={key}
        initial={reduce ? false : { opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        className="scroll flex-1 p-5"
      >
        {content}
      </motion.div>
    </aside>
  );
}
