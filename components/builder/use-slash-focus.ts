"use client";

import { useEffect } from "react";

const TYPING =
  "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='dialog'], [role='alertdialog'], [role='menu']";

/** "/" focuses the field with this id, unless the person is typing somewhere or a dialog is open. */
export function useSlashFocus(inputId: string) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || e.isComposing) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.closest(TYPING))) return;
      const el = document.getElementById(inputId);
      if (!(el instanceof HTMLInputElement) || el.disabled) return;
      e.preventDefault();
      el.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputId]);
}
