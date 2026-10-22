"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLiquidGlass } from "./Glass";

/**
 * One piece of liquid glass that folds between a full panel and a small
 * bubble. It is a single surface the whole way: the glass springs to its new
 * shape (overshooting a touch, like a droplet settling), the radius flows
 * from card to pill, the contents dissolve through a blur rather than
 * sliding, and a band of light sweeps across the glass as it changes.
 */

const SPRING = { type: "spring" as const, stiffness: 420, damping: 30, mass: 0.85 };

export function GlassMorph({
  open,
  className,
  panelClassName = "",
  bubbleClassName = "",
  radius = 22,
  strength = 64,
  blur = 9,
  enabled = true,
  bubble,
  children,
  label,
  onOpen,
  as = "aside",
  ref: externalRef,
}: {
  open: boolean;
  /** Positioning classes shared by both states (e.g. "absolute left-4 top-[76px]"). */
  className: string;
  panelClassName?: string;
  bubbleClassName?: string;
  radius?: number;
  strength?: number;
  blur?: number;
  enabled?: boolean;
  /** What the folded bubble shows. */
  bubble: ReactNode;
  children: ReactNode;
  label: string;
  onOpen: () => void;
  as?: "aside" | "section" | "div";
  ref?: React.Ref<HTMLElement | null>;
}) {
  const reduce = useReducedMotion();
  const local = useRef<HTMLElement>(null);
  const [sheen, setSheen] = useState(0);
  const first = useRef(true);
  useLiquidGlass(local, { radius: open ? radius : 999, strength: open ? strength : 22, blur: open ? blur : 6, saturate: 1.55, bevel: open ? undefined : 12, enabled });

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSheen((n) => n + 1);
  }, [open]);

  const setRefs = (el: HTMLElement | null) => {
    local.current = el;
    if (typeof externalRef === "function") externalRef(el);
    else if (externalRef && "current" in externalRef) (externalRef as { current: HTMLElement | null }).current = el;
  };

  const Tag = motion[as];
  const transition = reduce ? { duration: 0 } : SPRING;
  const content = reduce ? { duration: 0 } : { duration: 0.26, ease: [0.2, 0.8, 0.2, 1] as const };

  return (
    <Tag
      ref={setRefs}
      layout
      transition={{ layout: transition }}
      style={{ borderRadius: open ? radius : 999 }}
      className={`glass glass-morph ${className} ${open ? panelClassName : `glass-pill ${bubbleClassName}`}`}
      aria-label={label}
      data-open={open}
    >
      {/* A band of light passes over the glass whenever it changes shape. */}
      {sheen > 0 && <span key={sheen} className="glass-sheen" aria-hidden />}
      <AnimatePresence mode="popLayout" initial={false}>
        {open ? (
          <motion.div
            key="panel"
            layout="position"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.97 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.96 }}
            transition={content}
            className="glass-morph__content"
          >
            {children}
          </motion.div>
        ) : (
          <motion.button
            key="bubble"
            layout="position"
            type="button"
            initial={{ opacity: 0, filter: "blur(6px)", scale: 0.9 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(6px)", scale: 0.9 }}
            transition={content}
            onClick={onOpen}
            className="glass-morph__bubble"
            aria-label={`Show ${label.toLowerCase()}`}
            aria-expanded={false}
          >
            {bubble}
          </motion.button>
        )}
      </AnimatePresence>
    </Tag>
  );
}

/** The small "fold away" control that sits in a panel's corner. */
export function FoldButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="fold-btn" onClick={onClick} aria-label={label} title={label}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <path d="M5 12h14" />
      </svg>
    </button>
  );
}
