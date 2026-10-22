"use client";

import { Component, type ReactNode } from "react";

/** Renders nothing if an optional scene element (e.g. image-based light) fails to load. */
export class OptionalScenePart extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Optional scene element unavailable:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
