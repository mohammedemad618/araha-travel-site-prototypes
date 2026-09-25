'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Makes everything except `el` inert (walking up to <body> and disabling each
 * ancestor's siblings), so keyboard and screen-reader focus stays inside a
 * modal. Returns a function that undoes exactly what it changed.
 */
export function inertOutside(el: HTMLElement): () => void {
  const changed: HTMLElement[] = [];
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    for (const sib of parent ? Array.from(parent.children) : []) {
      if (sib !== node && sib instanceof HTMLElement && !sib.inert) {
        sib.inert = true;
        changed.push(sib);
      }
    }
    node = parent;
  }
  return () => changed.forEach((s) => (s.inert = false));
}

/**
 * Modal dialog behaviour: locks page scroll, makes the rest of the page inert,
 * moves focus into the dialog, closes on Escape and returns focus to the opener.
 * Runs only when `open` changes, so re-renders inside the dialog keep focus.
 */
export function useModal(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  initialFocus = 'input,select,textarea,button,a[href]',
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    root.style.overflow = 'hidden';
    // The backdrop sits next to the dialog inside [data-modal-root] and must stay clickable.
    const restore = inertOutside(el.closest<HTMLElement>('[data-modal-root]') ?? el);
    const first = Array.from(el.querySelectorAll<HTMLElement>(initialFocus)).find(
      (n) => n.tabIndex >= 0 && n.getClientRects().length > 0,
    );
    (first ?? el).focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = '';
      restore();
      window.removeEventListener('keydown', onKey);
      opener?.focus({ preventScroll: true });
    };
  }, [open, ref, initialFocus]);
}
