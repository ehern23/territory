"use client";

import type { ReactNode } from "react";
import { Eyebrow } from "../ui";

export function PanelHeader({
  eyebrow,
  title,
  aside,
  onClose,
  closeLabel = "Close",
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  aside?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-[18px] font-semibold tracking-tight leading-tight mt-1">{title}</h2>
        {aside && <div className="mt-1.5 flex flex-wrap items-center gap-2">{aside}</div>}
      </div>
      {onClose && (
        <button type="button" className="btn btn-ghost btn-sm -mr-2 -mt-1 flex-none" onClick={onClose} aria-label={closeLabel}>
          ✕
        </button>
      )}
    </div>
  );
}
