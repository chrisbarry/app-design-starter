"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// A first-run walkthrough of the toolbar. Each step points at one button, found by its
// data-rk-tour attribute, and dims everything else.

type Step = { target: string; title: string; body: React.ReactNode; keys?: string };

const steps = (name: string): Step[] => [
  {
    target: "bar",
    title: `Hi ${name.split(" ")[0]}, these are your review tools`,
    body: "Leave comments and suggest wording right on the page. Everything is saved and shows up live for everyone reviewing.",
  },
  {
    target: "comment",
    title: "Comment on anything",
    body: "Turn this on, then click any part of the page to pin a comment there. Click a pin to reply, resolve or delete.",
    keys: "Shortcut: C",
  },
  {
    target: "edit",
    title: "Change the wording",
    body: "Turn this on, then click any text to rewrite it. Your version replaces the original for everyone, and the original is kept.",
    keys: "Shortcut: E",
  },
  {
    target: "panel",
    title: "See everything in one list",
    body: "Every comment and edit across the site. You can also comment on a whole page here, or copy everything at once.",
  },
  {
    target: "hide",
    title: "Use the app normally",
    body: "While commenting or editing, clicks go to the review tools. Turn the tool off again, or tuck the toolbar away with this arrow.",
    keys: "Esc stops commenting or editing",
  },
  {
    target: "help",
    title: "That's it",
    body: "You can open this guide again here whenever you need it.",
  },
];

const touch = () => typeof matchMedia !== "undefined" && matchMedia("(hover: none)").matches;

export function Tour({ name, onDone }: { name: string; onDone(): void }) {
  const all = steps(name);
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLSpanElement>(null);
  const step = all[i];
  const last = i === all.length - 1;
  const next = () => (last ? onDone() : setI(i + 1));

  // Read during render like the pins do: the overlay re-renders whenever the page moves
  const rect = document.querySelector(`[data-rk-tour="${step.target}"]`)?.getBoundingClientRect();
  const middle = rect ? rect.top + rect.height / 2 : 0;

  // Centre the card on the target, kept on screen, with the arrow still pointing at it
  useLayoutEffect(() => {
    const el = card.current;
    if (!el || !arrow.current) return;
    const h = el.offsetHeight;
    const top = Math.min(Math.max(12, middle - h / 2), innerHeight - h - 12);
    el.style.top = `${top}px`;
    arrow.current.style.top = `${Math.min(Math.max(18, middle - top), h - 18)}px`;
  }, [i, middle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft" && i > 0) setI(i - 1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  if (!rect) return null;
  const pad = 4;

  return (
    <>
      <div
        className="rk-spot"
        style={{
          left: rect.left - pad,
          top: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        }}
      />
      <div
        ref={card}
        className="rk-tour"
        role="dialog"
        aria-label="How to use the review tools"
        style={{ right: innerWidth - rect.left + 16, width: Math.max(220, Math.min(300, rect.left - 32)) }}
      >
        <span ref={arrow} className="rk-tour-arrow" />
        <p className="rk-label">
          {i + 1} of {all.length}
        </p>
        <h2>{step.title}</h2>
        <p className="rk-tour-body">{step.body}</p>
        {step.keys && !touch() && <p className="rk-keys">{step.keys}</p>}
        <div className="rk-row">
          {i === 0 ? (
            <button className="rk-btn rk-btn-ghost" onClick={onDone}>
              Skip
            </button>
          ) : (
            <button className="rk-btn rk-btn-ghost" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <span className="rk-grow" />
          <button className="rk-btn rk-btn-primary" autoFocus onClick={next}>
            {last ? "Start reviewing" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
