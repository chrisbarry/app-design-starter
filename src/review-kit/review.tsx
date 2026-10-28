"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import type { FirebaseOptions } from "firebase/app";
import { CSS } from "./styles";
import { Icon } from "./icons";
import { Tour } from "./tour";
import { createApi, liveEdits, type ReviewApi, type ReviewComment, type ReviewEdit } from "./store";
import {
  UI_ATTR,
  applyEdits,
  currentPage,
  domChanged,
  fingerprint,
  isReviewUi,
  norm,
  pickElement,
  resolveAnchor,
  selectorFor,
  unitAt,
  unitRect,
  type TextUnit,
} from "./anchor";

export type ReviewProps = {
  /** Keeps this project's comments and edits apart from other projects in the same Firebase. */
  project: string;
  /** Web config of the Firebase project that stores the review data. */
  firebase: FirebaseOptions;
  /** Shared password asked for before anything else. Leave out to skip it. */
  password?: string;
  /** Shown above the sign-in screens. */
  title?: string;
  children: React.ReactNode;
};

const NAME_KEY = "review-kit:name";
const HIDDEN_KEY = "review-kit:hidden";
const TOURED_KEY = "review-kit:toured";
const UI = { [UI_ATTR]: "" };

const listeners = new Set<() => void>();

const store = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // private mode or blocked storage: the setting just won't stick
    }
    listeners.forEach((l) => l());
  },
};

/** A localStorage value, or undefined until we're in the browser. */
function useStored(key: string) {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => store.get(key),
    () => undefined,
  );
}

// ── Gate: password, then name ───────────────────────────────────

export function Review({ project, firebase, password, title, children }: ReviewProps) {
  const unlockKey = `review-kit:${project}:unlocked`;
  const unlockedValue = useStored(unlockKey);
  const nameValue = useStored(NAME_KEY);

  if (unlockedValue === undefined || nameValue === undefined) return <div className="rk-gate" {...UI} />;
  const unlocked = !password || unlockedValue === "true";
  const name = nameValue ?? "";

  if (!unlocked) {
    return (
      <GateScreen
        key="password"
        title={title}
        heading="Enter the password"
        hint="This is a private preview."
        type="password"
        button="Continue"
        error="That's not it. Try again."
        check={(v) => {
          if (v.toLowerCase() !== password!.toLowerCase()) return false;
          store.set(unlockKey, "true");
          return true;
        }}
      />
    );
  }

  if (!name) {
    return (
      <GateScreen
        key="name"
        title={title}
        heading="What's your name?"
        hint="So everyone can see who left each comment and edit."
        type="text"
        button="Start reviewing"
        error="Add your name to carry on."
        check={(v) => {
          if (!v) return false;
          store.set(NAME_KEY, v);
          return true;
        }}
      />
    );
  }

  return (
    <>
      {children}
      <Overlay
        project={project}
        firebase={firebase}
        name={name}
        onRename={() => store.set(NAME_KEY, null)}
      />
    </>
  );
}

function GateScreen(props: {
  title?: string;
  heading: string;
  hint: string;
  type: "password" | "text";
  button: string;
  error: string;
  check(value: string): boolean;
}) {
  const [value, setValue] = useState("");
  const [bad, setBad] = useState(false);
  return (
    <div className="rk-gate" {...UI}>
      <style>{CSS}</style>
      <form
        className="rk-gate-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (!props.check(value.trim())) setBad(true);
        }}
      >
        {props.title && <p className="rk-gate-eyebrow">{props.title}</p>}
        <h1>{props.heading}</h1>
        <p className="rk-gate-hint">{props.hint}</p>
        <input
          className={bad ? "rk-input rk-bad" : "rk-input"}
          type={props.type}
          value={value}
          autoFocus
          autoComplete={props.type === "password" ? "current-password" : "name"}
          placeholder={props.type === "password" ? "Password" : "Your name"}
          aria-label={props.type === "password" ? "Password" : "Your name"}
          onChange={(e) => {
            setValue(e.target.value);
            setBad(false);
          }}
        />
        {bad && <p className="rk-gate-error">{props.error}</p>}
        <button className="rk-btn rk-btn-primary" type="submit">
          {props.button}
        </button>
      </form>
    </div>
  );
}

// ── Overlay ─────────────────────────────────────────────────────

type Mode = "browse" | "comment" | "edit";
type Draft =
  | { kind: "comment"; selector: string; snippet: string; fx: number; fy: number; x: number; y: number }
  | { kind: "edit"; unit: TextUnit; x: number; y: number };

type Kit = { api: ReviewApi; me: string; page: string; flash(message: string): void };
const KitCtx = createContext<Kit | null>(null);
const useKit = () => useContext(KitCtx)!;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function Overlay({
  project,
  firebase,
  name,
  onRename,
}: {
  project: string;
  firebase: FirebaseOptions;
  name: string;
  onRename(): void;
}) {
  const api = useMemo(() => createApi(firebase, project), [firebase, project]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [edits, setEdits] = useState<ReviewEdit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(currentPage);
  const [mode, setMode] = useState<Mode>("browse");
  const [hidden, setHidden] = useState(() => store.get(HIDDEN_KEY) === "true");
  const [panel, setPanel] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [thread, setThread] = useState<{ id: string; x: number; y: number } | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const [units, setUnits] = useState<TextUnit[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [touring, setTouring] = useState(() => store.get(TOURED_KEY) !== "true");
  const [, setFrame] = useState(0);
  const toastTimer = useRef(0);

  const flash = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  useEffect(
    () => api.watch({ comments: setComments, edits: setEdits, error: (m) => setError(m) }),
    [api],
  );

  // Catches client-side navigation in any router without hooking into it
  useEffect(() => {
    const id = window.setInterval(() => setPage(currentPage()), 400);
    return () => clearInterval(id);
  }, []);

  const live = useMemo(() => liveEdits(edits), [edits]);
  const pageEdits = useMemo(() => {
    const m = new Map<string, string>();
    if (!showOriginal) for (const e of live) if (e.page === page) m.set(e.original, e.text);
    return m;
  }, [live, page, showOriginal]);

  // Keep edited text in the page as the app re-renders, and keep pins in place
  const editsRef = useRef(pageEdits);
  const refresh = useRef(() => {});
  useEffect(() => {
    let raf = 0;
    let dirty = true;
    const run = () => {
      raf = 0;
      if (dirty) {
        dirty = false;
        domChanged();
        setUnits(applyEdits(editsRef.current));
      }
      setFrame((f) => f + 1);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    // Content changes re-apply edits; attribute changes (classes, inline styles) only move things
    const observer = new MutationObserver((records) => {
      const app = records.filter((r) => !isReviewUi(r.target));
      if (!app.length) return;
      if (app.some((r) => r.type !== "attributes")) dirty = true;
      schedule();
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    refresh.current = () => {
      dirty = true;
      schedule();
    };
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
      applyEdits(new Map());
    };
  }, []);
  useEffect(() => {
    editsRef.current = pageEdits;
    refresh.current();
  }, [pageEdits]);

  const changeMode = (next: Mode) => {
    setMode((m) => (m === next ? "browse" : next));
    setDraft(null);
    setHover(null);
    setThread(null);
  };

  // Comment and edit modes take over clicks so the app underneath doesn't react
  useEffect(() => {
    if (mode === "browse") return;
    const targetOf = (e: Event) => (e.target instanceof Element && !isReviewUi(e.target) ? e.target : null);
    const onMove = (e: PointerEvent) => {
      const el = targetOf(e);
      if (!el) return setHover(null);
      if (mode === "comment") setHover(pickElement(el).getBoundingClientRect());
      else {
        const u = unitAt(e.clientX, e.clientY, el);
        setHover(u ? unitRect(u) : null);
      }
    };
    const block = (e: Event) => {
      if (!targetOf(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onClick = (e: MouseEvent) => {
      const el = targetOf(e);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      setThread(null);
      setHover(null);
      if (mode === "comment") {
        const anchor = pickElement(el);
        const r = anchor.getBoundingClientRect();
        setDraft({
          kind: "comment",
          selector: selectorFor(anchor),
          snippet: fingerprint(anchor),
          fx: clamp01((e.clientX - r.left) / (r.width || 1)),
          fy: clamp01((e.clientY - r.top) / (r.height || 1)),
          x: e.clientX,
          y: e.clientY,
        });
      } else {
        const unit = unitAt(e.clientX, e.clientY, el);
        if (unit) setDraft({ kind: "edit", unit, x: e.clientX, y: e.clientY });
        else flash("No text there. Tap on the words you want to change.");
      }
    };
    const blocked = ["pointerdown", "pointerup", "mousedown", "mouseup", "dblclick", "submit"];
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("click", onClick, true);
    blocked.forEach((t) => window.addEventListener(t, block, true));
    return () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("click", onClick, true);
      blocked.forEach((t) => window.removeEventListener(t, block, true));
    };
  }, [mode]);

  // C and E switch modes, Esc backs out
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setDraft(null);
        setThread(null);
        setHover(null);
        setMode("browse");
      } else if (e.key === "c" || e.key === "e") {
        const next = e.key === "c" ? "comment" : "edit";
        setMode((m) => (m === next ? "browse" : next));
        setDraft(null);
        setHover(null);
        setThread(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const roots = comments.filter((c) => !c.replyTo).sort((a, b) => a.at - b.at);
  const numbers = new Map<string, number>();
  const perPage = new Map<string, number>();
  for (const c of roots) {
    const n = (perPage.get(c.page) ?? 0) + 1;
    perPage.set(c.page, n);
    numbers.set(c.id, n);
  }
  const openHere = roots.filter((c) => c.page === page && !c.resolved).length;

  const pins = roots
    .filter((c) => c.page === page && c.selector && (showResolved || !c.resolved || c.id === thread?.id))
    .flatMap((c) => {
      const el = resolveAnchor(c.selector, c.snippet);
      const r = el?.getBoundingClientRect();
      if (!r || (!r.width && !r.height)) return [];
      return [{ c, x: r.left + c.fx * r.width, y: r.top + c.fy * r.height }];
    });

  const locate = (c: ReviewComment) => {
    const el = c.selector ? resolveAnchor(c.selector, c.snippet) : null;
    if (!el) return flash(c.page === page ? "That part isn't on screen right now." : `That's on ${c.page}`);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setFocusId(c.id);
    window.setTimeout(() => setFocusId(null), 2200);
  };

  const startTour = () => {
    setMode("browse");
    setPanel(false);
    setDraft(null);
    setThread(null);
    setHover(null);
    setTouring(true);
  };
  const endTour = () => {
    setTouring(false);
    store.set(TOURED_KEY, "true");
  };

  const kit: Kit = { api, me: name, page, flash };
  const openThread = thread ? roots.find((c) => c.id === thread.id) : undefined;
  const hint =
    mode === "comment"
      ? "Click anything to comment · Esc to stop"
      : mode === "edit"
        ? "Click any text to change it · Esc to stop"
        : null;

  if (typeof document === "undefined") return null;
  return createPortal(
    <KitCtx.Provider value={kit}>
      <div className="rk-root" {...UI}>
        <style>{CSS}</style>

        {hidden ? (
          <button
            className="rk-tab"
            title="Show review tools"
            onClick={() => {
              setHidden(false);
              store.set(HIDDEN_KEY, null);
            }}
          >
            <Icon name="show" size={16} />
            {openHere > 0 && <span className="rk-count">{openHere}</span>}
          </button>
        ) : (
          <>
            {mode === "edit" &&
              units.map((u, i) => {
                const r = unitRect(u);
                return r && <div key={i} className="rk-edited" style={box(r)} />;
              })}
            {hover && <div className={`rk-hover rk-hover-${mode}`} style={box(hover)} />}

            {pins.map(({ c, x, y }) => (
              <button
                key={c.id}
                className={[
                  "rk-pin",
                  c.resolved && "rk-resolved",
                  thread?.id === c.id && "rk-active",
                  focusId === c.id && "rk-pulse",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ left: x, top: y }}
                title={`${c.author}: ${c.text}`}
                onClick={() => {
                  setDraft(null);
                  setThread(thread?.id === c.id ? null : { id: c.id, x, y });
                }}
              >
                {numbers.get(c.id)}
              </button>
            ))}

            {hint && (
              <div className="rk-hint" style={{ background: mode === "comment" ? "var(--rk-comment)" : "var(--rk-edit)" }}>
                {hint}
              </div>
            )}

            {draft?.kind === "comment" && (
              <Pop x={draft.x} y={draft.y} onClose={() => setDraft(null)}>
                <p className="rk-label">New comment</p>
                <Composer
                  placeholder="What do you think?"
                  submit="Post"
                  onCancel={() => setDraft(null)}
                  onSubmit={(text) => {
                    const { selector, snippet, fx, fy } = draft;
                    save(api.comment({ page, text, author: name, selector, snippet, fx, fy, replyTo: "" }), flash);
                    setDraft(null);
                  }}
                />
              </Pop>
            )}

            {draft?.kind === "edit" && (
              <Pop x={draft.x} y={draft.y} onClose={() => setDraft(null)}>
                <EditBox
                  original={draft.unit.key}
                  history={edits.filter((e) => e.page === page && e.original === draft.unit.key)}
                  onDone={() => setDraft(null)}
                />
              </Pop>
            )}

            {openThread && thread && (
              <Pop x={thread.x + 18} y={thread.y - 24} onClose={() => setThread(null)}>
                <Thread
                  root={openThread}
                  n={numbers.get(openThread.id)!}
                  replies={comments.filter((c) => c.replyTo === openThread.id)}
                  onDeleted={() => setThread(null)}
                />
              </Pop>
            )}

            {panel && (
              <Panel
                project={project}
                roots={roots}
                comments={comments}
                live={live}
                numbers={numbers}
                error={error}
                showResolved={showResolved}
                setShowResolved={setShowResolved}
                showOriginal={showOriginal}
                setShowOriginal={setShowOriginal}
                onLocate={locate}
                onClose={() => setPanel(false)}
              />
            )}

            <div className={panel ? "rk-bar rk-shift" : "rk-bar"} data-rk-tour="bar">
              <button
                data-rk-tour="comment"
                className={mode === "comment" ? "rk-tool rk-on-comment" : "rk-tool"}
                title="Comment (C)"
                aria-pressed={mode === "comment"}
                onClick={() => changeMode("comment")}
              >
                <Icon name="comment" />
              </button>
              <button
                data-rk-tour="edit"
                className={mode === "edit" ? "rk-tool rk-on-edit" : "rk-tool"}
                title="Edit text (E)"
                aria-pressed={mode === "edit"}
                onClick={() => changeMode("edit")}
              >
                <Icon name="edit" />
              </button>
              <button
                data-rk-tour="panel"
                className={panel ? "rk-tool rk-on" : "rk-tool"}
                title="All comments and edits"
                aria-pressed={panel}
                onClick={() => setPanel(!panel)}
              >
                <Icon name="panel" />
                {openHere > 0 && <span className="rk-count">{openHere}</span>}
              </button>
              <span className="rk-sep" />
              <button data-rk-tour="help" className="rk-tool" title="How to use these tools" onClick={startTour}>
                <Icon name="help" size={16} />
              </button>
              <button
                className="rk-me"
                style={{ background: colourFor(name) }}
                title={`Reviewing as ${name}. Click to change.`}
                onClick={() => {
                  if (window.confirm(`You're reviewing as ${name}. Change your name?`)) onRename();
                }}
              >
                {initials(name)}
              </button>
              <button
                data-rk-tour="hide"
                className="rk-tool"
                title="Hide review tools"
                onClick={() => {
                  setHidden(true);
                  setMode("browse");
                  setPanel(false);
                  setDraft(null);
                  setThread(null);
                  store.set(HIDDEN_KEY, "true");
                }}
              >
                <Icon name="hide" size={16} />
              </button>
            </div>

            {/* After the toolbar so the spotlight ring draws over it */}
            {touring && <Tour name={name} onDone={endTour} />}
          </>
        )}

        {toast && <div className="rk-toast">{toast}</div>}
      </div>
    </KitCtx.Provider>,
    document.body,
  );
}

// ── Pieces ──────────────────────────────────────────────────────

function Pop({ x, y, onClose, children }: { x: number; y: number; onClose(): void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // Open beside the click, flipped or nudged to stay on screen
  useLayoutEffect(() => {
    const el = ref.current!;
    const { offsetWidth: w, offsetHeight: h } = el;
    let left = x + 12;
    let top = y + 12;
    if (left + w > innerWidth - 8) left = Math.max(8, x - w - 12);
    if (top + h > innerHeight - 8) top = Math.max(8, innerHeight - h - 8);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!ref.current?.contains(t) && !t.closest?.(".rk-pin, .rk-bar")) close.current();
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, []);

  return (
    <div ref={ref} className="rk-pop" style={{ left: x, top: y }} role="dialog">
      {children}
    </div>
  );
}

function Composer({
  initial = "",
  placeholder,
  submit,
  onSubmit,
  onCancel,
  autoFocus = true,
}: {
  initial?: string;
  placeholder?: string;
  submit: string;
  onSubmit(text: string): void;
  onCancel?(): void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(initial);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText("");
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <textarea
        className="rk-ta"
        value={text}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send();
          } else if (e.key === "Escape") onCancel?.();
        }}
      />
      <div className="rk-row">
        <span className="rk-keys rk-grow">⌘↵ to {submit.toLowerCase()}</span>
        {onCancel && (
          <button type="button" className="rk-btn rk-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="rk-btn rk-btn-primary" disabled={!text.trim()}>
          {submit}
        </button>
      </div>
    </form>
  );
}

function EditBox({ original, history, onDone }: { original: string; history: ReviewEdit[]; onDone(): void }) {
  const { api, me, page, flash } = useKit();
  const past = [...history].sort((a, b) => b.at - a.at);
  const current = past[0]?.text ?? original;
  const edited = current !== original;
  const write = (text: string) => {
    if (norm(text) !== norm(current)) save(api.edit({ page, original, text, author: me }), flash);
    onDone();
  };
  return (
    <>
      <p className="rk-label">Edit text</p>
      {edited && (
        <p className="rk-quote">
          Was <s>{original}</s>
        </p>
      )}
      <Composer initial={current} submit="Save" onSubmit={write} onCancel={onDone} />
      {edited && (
        <div className="rk-row">
          <button type="button" className="rk-btn rk-btn-ghost" onClick={() => write(original)}>
            <Icon name="undo" size={14} /> Put the original back
          </button>
        </div>
      )}
      {past.length > 0 && (
        <ul className="rk-history">
          {past.slice(0, 6).map((h) => (
            <li key={h.id} title={h.text}>
              {h.author} · {ago(h.at)} · {h.text === original ? "reset" : `“${h.text}”`}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Message({ c, n }: { c: ReviewComment; n?: number }) {
  return (
    <div className="rk-msg">
      <span className="rk-av" style={{ background: colourFor(c.author) }}>
        {initials(c.author)}
      </span>
      <div className="rk-msg-body">
        <span className="rk-who">{c.author}</span>
        <span className="rk-when">
          {ago(c.at)}
          {n !== undefined && ` · #${n}`}
        </span>
        <p className="rk-text">{c.text}</p>
      </div>
    </div>
  );
}

function Thread({
  root,
  n,
  replies,
  onDeleted,
}: {
  root: ReviewComment;
  n: number;
  replies: ReviewComment[];
  onDeleted?(): void;
}) {
  const { api, me, page, flash } = useKit();
  const sorted = [...replies].sort((a, b) => a.at - b.at);
  return (
    <>
      <div className="rk-scroll">
        <Message c={root} n={n} />
        {sorted.map((r) => (
          <Message key={r.id} c={r} />
        ))}
      </div>
      {root.resolved && <p className="rk-quote">Resolved by {root.resolvedBy}</p>}
      <div style={{ marginTop: 8 }}>
        <Composer
          placeholder="Reply"
          submit="Reply"
          autoFocus={false}
          onSubmit={(text) =>
            save(
              api.comment({ page: root.page || page, text, author: me, selector: "", snippet: "", fx: 0, fy: 0, replyTo: root.id }),
              flash,
            )
          }
        />
      </div>
      <div className="rk-row">
        <button type="button" className="rk-btn" onClick={() => save(api.resolve(root.id, !root.resolved, me), flash)}>
          <Icon name={root.resolved ? "undo" : "check"} size={14} /> {root.resolved ? "Reopen" : "Resolve"}
        </button>
        <span className="rk-grow" />
        {root.author === me && (
          <button
            type="button"
            className="rk-btn rk-btn-ghost rk-btn-danger"
            onClick={() => {
              if (!window.confirm("Delete this comment and its replies?")) return;
              [root, ...replies].forEach((c) => save(api.remove(c.id), flash));
              onDeleted?.();
            }}
          >
            Delete
          </button>
        )}
      </div>
    </>
  );
}

function Panel(props: {
  project: string;
  roots: ReviewComment[];
  comments: ReviewComment[];
  live: ReviewEdit[];
  numbers: Map<string, number>;
  error: string | null;
  showResolved: boolean;
  setShowResolved(v: boolean): void;
  showOriginal: boolean;
  setShowOriginal(v: boolean): void;
  onLocate(c: ReviewComment): void;
  onClose(): void;
}) {
  const { api, me, page, flash } = useKit();
  const [tab, setTab] = useState<"comments" | "edits">("comments");
  const [open, setOpen] = useState<string | null>(null);
  const [general, setGeneral] = useState(false);
  const shown = props.roots.filter((c) => props.showResolved || !c.resolved).reverse();
  const edits = [...props.live].sort((a, b) => b.at - a.at);
  const openCount = props.roots.filter((c) => !c.resolved).length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(props.project, props.roots, props.comments, props.live));
      flash("Copied as Markdown");
    } catch {
      flash("Couldn't copy. Your browser blocked the clipboard.");
    }
  };

  return (
    <aside className="rk-panel" aria-label="Review">
      <div className="rk-panel-head">
        <h2>Review</h2>
        <button className="rk-btn rk-btn-ghost" onClick={copy} title="Copy everything as Markdown">
          <Icon name="copy" size={14} /> Copy all
        </button>
        <button className="rk-btn rk-btn-ghost" onClick={props.onClose} aria-label="Close">
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="rk-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "comments"} onClick={() => setTab("comments")}>
          Comments{openCount ? ` (${openCount})` : ""}
        </button>
        <button role="tab" aria-selected={tab === "edits"} onClick={() => setTab("edits")}>
          Text edits{edits.length ? ` (${edits.length})` : ""}
        </button>
      </div>

      <div className="rk-panel-body">
        {props.error && <p className="rk-error">Can&apos;t reach the review database: {props.error}</p>}

        {tab === "comments" && (
          <>
            {general ? (
              <div className="rk-item">
                <Composer
                  placeholder="A comment about this page as a whole"
                  submit="Post"
                  onCancel={() => setGeneral(false)}
                  onSubmit={(text) => {
                    save(api.comment({ page, text, author: me, selector: "", snippet: "", fx: 0, fy: 0, replyTo: "" }), flash);
                    setGeneral(false);
                  }}
                />
              </div>
            ) : (
              <button className="rk-btn" onClick={() => setGeneral(true)}>
                <Icon name="comment" size={14} /> Comment on the whole page
              </button>
            )}
            {shown.length === 0 && (
              <p className="rk-empty">
                No {props.showResolved ? "" : "open "}comments yet. Press the speech bubble, then click anything.
              </p>
            )}
            {shown.map((c) => {
              const replies = props.comments.filter((r) => r.replyTo === c.id);
              const n = props.numbers.get(c.id);
              return (
                <div key={c.id} className="rk-item">
                  <div className="rk-item-head" onClick={() => setOpen(open === c.id ? null : c.id)}>
                    <span className={`rk-num${c.resolved ? " rk-resolved" : ""}${c.selector ? "" : " rk-general"}`}>{n}</span>
                    <span className="rk-who">{c.author}</span>
                    <span className="rk-when rk-grow">{ago(c.at)}</span>
                    {c.page !== page && <span className="rk-page">{c.page}</span>}
                    {c.selector && (
                      <button
                        className="rk-btn rk-btn-ghost"
                        title="Show on the page"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onLocate(c);
                        }}
                      >
                        <Icon name="locate" size={14} />
                      </button>
                    )}
                  </div>
                  {open === c.id ? (
                    <div style={{ marginTop: 6 }}>
                      <Thread root={c} n={n!} replies={replies} />
                    </div>
                  ) : (
                    <p className="rk-text" onClick={() => setOpen(c.id)} style={{ cursor: "pointer" }}>
                      {c.text}
                      {replies.length > 0 && (
                        <span className="rk-when">
                          {" "}
                          · {replies.length} {replies.length === 1 ? "reply" : "replies"}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === "edits" && (
          <>
            {edits.length === 0 && <p className="rk-empty">No text edits yet. Press the pencil, then click any words.</p>}
            {edits.map((e) => (
              <div key={e.id} className="rk-item">
                <div className="rk-item-head" style={{ cursor: "default" }}>
                  <span className="rk-av" style={{ background: colourFor(e.author), width: 20, height: 20, fontSize: 9 }}>
                    {initials(e.author)}
                  </span>
                  <span className="rk-who">{e.author}</span>
                  <span className="rk-when rk-grow">{ago(e.at)}</span>
                  {e.page !== page && <span className="rk-page">{e.page}</span>}
                  <button
                    className="rk-btn rk-btn-ghost"
                    title="Put the original back"
                    onClick={() => save(api.edit({ page: e.page, original: e.original, text: e.original, author: me }), flash)}
                  >
                    <Icon name="undo" size={14} />
                  </button>
                </div>
                <p className="rk-quote" style={{ margin: "6px 0 4px" }}>
                  <s>{e.original}</s>
                </p>
                <p className="rk-text">{e.text}</p>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="rk-panel-foot">
        <label className="rk-check">
          <input type="checkbox" checked={props.showResolved} onChange={(e) => props.setShowResolved(e.target.checked)} />
          Show resolved
        </label>
        <label className="rk-check">
          <input type="checkbox" checked={props.showOriginal} onChange={(e) => props.setShowOriginal(e.target.checked)} />
          Show original text
        </label>
      </div>
    </aside>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

/** Firestore applies writes locally straight away, so don't wait on the server; just report failures. */
function save(p: Promise<unknown>, flash: (m: string) => void) {
  p.catch((e: Error) => flash(`Couldn't save: ${e.message}`));
}

const box = (r: DOMRect): React.CSSProperties => ({ left: r.left, top: r.top, width: r.width, height: r.height });

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function colourFor(name: string) {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 52% 42%)`;
}

function ago(ms: number) {
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function toMarkdown(project: string, roots: ReviewComment[], all: ReviewComment[], live: ReviewEdit[]) {
  const day = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const q = (s: string) => s.replace(/\n+/g, " ");
  const lines = [`# Review: ${project}`, "", `Exported ${day(Date.now())}`, ""];
  lines.push(`## Text edits (${live.length})`, "");
  for (const e of [...live].sort((a, b) => a.page.localeCompare(b.page) || a.at - b.at)) {
    lines.push(`- \`${e.page}\` “${q(e.original)}” → “${q(e.text)}” (${e.author}, ${day(e.at)})`);
  }
  for (const [label, list] of [
    ["Open comments", roots.filter((c) => !c.resolved)],
    ["Resolved comments", roots.filter((c) => c.resolved)],
  ] as const) {
    lines.push("", `## ${label} (${list.length})`, "");
    for (const c of list) {
      const where = c.selector ? `on “${c.snippet.slice(0, 50)}”` : "whole page";
      lines.push(`- \`${c.page}\` · ${where} · **${c.author}**, ${day(c.at)}: ${q(c.text)}`);
      for (const r of all.filter((r) => r.replyTo === c.id).sort((a, b) => a.at - b.at)) {
        lines.push(`  - **${r.author}**: ${q(r.text)}`);
      }
      if (c.resolved) lines.push(`  - _Resolved by ${c.resolvedBy}_`);
    }
  }
  return lines.join("\n") + "\n";
}
