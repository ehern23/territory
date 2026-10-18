"use client";

import { useRef } from "react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { AccountTree, type TreeVisualState } from "./flora/AccountTree";
import { accountPosition } from "./layout";

const PLACEHOLDER: Record<string, number> = {
  jpmc: 0.95, walmart: 0.8, disney: 0.72, amex: 0.55, nike: 0.68, starbucks: 0.45, marriott: 0.3, ford: 0.15,
};

function ForestTree({ accountId }: { accountId: string }) {
  const stateRef = useRef<TreeVisualState>({
    vitality: PLACEHOLDER[accountId] ?? 0.8,
    dormant: [],
    spring: [],
    focus: [],
    dim: 0,
    glow: 0,
  });
  return <AccountTree accountId={accountId} position={accountPosition(accountId)} stateRef={stateRef} />;
}

export function Forest() {
  const accounts = useTerritoryStore((s) => s.accounts);
  return (
    <group>
      {accounts.map((a) => (
        <ForestTree key={a.id} accountId={a.id} />
      ))}
    </group>
  );
}
