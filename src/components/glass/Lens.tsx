"use client";

import { useCallback, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { motion, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import { useLiquidGlass } from "./Glass";

/**
 * A liquid lens that glides between the options of a group. It follows the
 * pointer (or keyboard focus) from item to item on a spring, stretches in the
 * direction it travels, and in Chromium magnifies and bends the label beneath
 * it like the iOS 26 selection bubble. Items opt in with `data-lens`.
 */
export function LensGroup({
  children,
  className = "",
  radius = 999,
  as = "div",
  ref,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
  as?: "div" | "ul" | "ol" | "nav";
  ref?: Ref<HTMLDivElement | null>;
} & Record<string, unknown>) {
  const container = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => container.current as HTMLDivElement, []);
  const lensRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const spring = reduce ? { stiffness: 2000, damping: 100 } : { stiffness: 520, damping: 34, mass: 0.7 };
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);
  const w = useSpring(0, spring);
  const h = useSpring(0, spring);
  const vx = useVelocity(x);
  // Stretch along the direction of travel, squash across it.
  const sx = useTransform(vx, [-2400, 0, 2400], [1.18, 1, 1.18]);
  const sy = useTransform(vx, [-2400, 0, 2400], [0.88, 1, 0.88]);
  const refracting = useLiquidGlass(lensRef, { radius: Math.min(radius, 22), strength: 12, blur: 0.3, saturate: 1.5, bevel: 7, magnify: 0.1 });

  const moveTo = useCallback(
    (el: HTMLElement) => {
      const c = container.current;
      if (!c) return;
      const cr = c.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const first = !visible;
      const pad = 2;
      const tx = r.left - cr.left - pad + c.scrollLeft;
      const ty = r.top - cr.top - pad + c.scrollTop;
      if (first) {
        x.jump(tx);
        y.jump(ty);
        w.jump(r.width + pad * 2);
        h.jump(r.height + pad * 2);
      } else {
        x.set(tx);
        y.set(ty);
        w.set(r.width + pad * 2);
        h.set(r.height + pad * 2);
      }
      setVisible(true);
    },
    [visible, x, y, w, h],
  );

  const onOver = (e: React.PointerEvent | React.FocusEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-lens]");
    if (el && container.current?.contains(el)) moveTo(el);
  };

  const Tag = as as "div";
  return (
    <Tag
      ref={container}
      className={`relative ${className}`}
      onPointerOver={onOver}
      onFocus={onOver}
      onPointerLeave={() => setVisible(false)}
      onBlur={(e: React.FocusEvent) => {
        if (!container.current?.contains(e.relatedTarget as Node)) setVisible(false);
      }}
      {...rest}
    >
      <motion.div
        ref={lensRef}
        aria-hidden
        className={`lens ${refracting ? "lens--refract" : ""}`}
        style={{ x, y, width: w, height: h, scaleX: sx, scaleY: sy, borderRadius: radius, opacity: visible ? 1 : 0 }}
        transition={{ opacity: { duration: 0.18 } }}
      />
      {children}
    </Tag>
  );
}
