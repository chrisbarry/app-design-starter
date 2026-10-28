// DOM helpers: pinning comments to elements, and swapping edited text into the page.
//
// Edits are matched on the text itself, not on where it sits, so they survive
// re-renders and in-app navigation that doesn't change the URL. The same string
// on the same page is edited everywhere it appears.

export const UI_ATTR = "data-review-ui";

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "TEMPLATE"]);

export const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export function currentPage() {
  return location.pathname.replace(/\/+$/, "") || "/";
}

export function isReviewUi(node: Node | null): boolean {
  const el = node instanceof Element ? node : node?.parentElement;
  return !!el?.closest(`[${UI_ATTR}]`);
}

// What the app last wrote into each text node we've changed, and what we wrote over it
const originals = new WeakMap<Text, string>();
const applied = new WeakMap<Text, string>();

/** The text the app rendered, ignoring any review edit on top of it. */
function source(t: Text) {
  const v = t.nodeValue ?? "";
  return applied.get(t) === v ? (originals.get(t) ?? v) : v;
}

function sourceText(el: Element) {
  let s = "";
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) s += source(n as Text);
  return norm(s);
}

// ── Comment anchors ─────────────────────────────────────────────

/** A short text fingerprint: the element's own text, or its nearest ancestor's when it has none. */
export function fingerprint(el: Element) {
  for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
    const t = sourceText(e);
    if (t) return t.slice(0, 80);
  }
  return "";
}

export function selectorFor(el: Element) {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.body) {
    const rid = node.getAttribute("data-review-id");
    if (rid) return [`[data-review-id="${CSS.escape(rid)}"]`, ...parts].join(" > ");
    // Skip generated ids (React useId and friends) since they change between renders
    if (node.id && !/[:«»]|\d{3,}/.test(node.id)) return [`#${CSS.escape(node.id)}`, ...parts].join(" > ");
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    const tag = node.tagName.toLowerCase();
    const same = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
    parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(node) + 1})` : tag);
    node = parent;
  }
  return ["body", ...parts].join(" > ");
}

// Anchor lookups are cached until the DOM changes, so scrolling stays cheap
let domVersion = 0;
const anchorCache = new Map<string, Element | null>();
export function domChanged() {
  domVersion++;
}

export function resolveAnchor(selector: string, snippet: string): Element | null {
  const key = `${domVersion}\u0000${selector}\u0000${snippet}`;
  if (anchorCache.has(key)) return anchorCache.get(key)!;
  if (anchorCache.size > 500) anchorCache.clear();
  const found = findAnchor(selector, snippet);
  anchorCache.set(key, found);
  return found;
}

function findAnchor(selector: string, snippet: string): Element | null {
  let el: Element | null = null;
  try {
    el = document.querySelector(selector);
  } catch {
    // stored selector no longer parses
  }
  // The path must still hold the same content, or it's a different screen that happens to share the layout
  if (el && !isReviewUi(el) && fingerprint(el) === snippet) return el;
  const tag = selector.split(">").pop()?.trim().split(/[:.#[]/)[0] || "*";
  for (const c of Array.from(document.body.getElementsByTagName(tag))) {
    if (!isReviewUi(c) && fingerprint(c) === snippet) return c;
  }
  return null;
}

/** The element a comment click should pin to: whole icons rather than their inner paths. */
export function pickElement(el: Element) {
  return el.closest("svg") ?? el;
}

// ── Text units ──────────────────────────────────────────────────

/** One editable piece of text: a whole element if it holds only text, otherwise one text node. */
export type TextUnit = { el: Element; nodes: Text[]; key: string };

const textChildren = (el: Element) =>
  Array.from(el.childNodes).filter((n): n is Text => n.nodeType === Node.TEXT_NODE);

function unitOf(node: Text): TextUnit | null {
  const el = node.parentElement;
  if (!el || SKIP.has(el.tagName) || isReviewUi(el)) return null;
  const nodes = el.children.length === 0 ? textChildren(el) : [node];
  const key = norm(nodes.map(source).join(""));
  return key ? { el, nodes, key } : null;
}

function textNodeAt(x: number, y: number): Text | null {
  const d = document as Document & {
    caretPositionFromPoint?(x: number, y: number): { offsetNode: Node } | null;
    caretRangeFromPoint?(x: number, y: number): Range | null;
  };
  const node = d.caretPositionFromPoint?.(x, y)?.offsetNode ?? d.caretRangeFromPoint?.(x, y)?.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  // The caret APIs snap to the nearest text, so check the click really landed on it
  const r = document.createRange();
  r.selectNodeContents(node);
  for (const b of Array.from(r.getClientRects())) {
    if (x >= b.left - 2 && x <= b.right + 2 && y >= b.top - 2 && y <= b.bottom + 2) return node as Text;
  }
  return null;
}

export function unitAt(x: number, y: number, target: Element): TextUnit | null {
  const hit = textNodeAt(x, y);
  if (hit) return unitOf(hit);
  // Clicked the padding of something that only holds text, like a button
  if (target.children.length === 0) {
    const t = textChildren(target).find((n) => norm(source(n)));
    if (t) return unitOf(t);
  }
  return null;
}

export function unitRect(u: TextUnit): DOMRect | null {
  if (!u.nodes[0].isConnected) return null;
  const r = document.createRange();
  r.setStartBefore(u.nodes[0]);
  r.setEndAfter(u.nodes[u.nodes.length - 1]);
  const b = r.getBoundingClientRect();
  return b.width || b.height ? b : null;
}

function set(t: Text, v: string) {
  const cur = t.nodeValue ?? "";
  // Anything we didn't write ourselves came from the app, so it's the new original
  if (applied.get(t) !== cur) originals.set(t, cur);
  if (cur !== v) t.nodeValue = v;
  applied.set(t, v);
}

function restore(t: Text) {
  if (!applied.has(t)) return;
  const v = source(t);
  if (t.nodeValue !== v) t.nodeValue = v;
  applied.delete(t);
}

/**
 * Put edited text into the page and restore anything no longer edited.
 * `edits` maps original text to replacement. Returns the units that are edited.
 */
export function applyEdits(edits: Map<string, string>): TextUnit[] {
  const found: TextUnit[] = [];
  const done = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.nodeType === Node.TEXT_NODE
        ? NodeFilter.FILTER_ACCEPT
        : SKIP.has((n as Element).tagName) || (n as Element).hasAttribute(UI_ATTR)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_SKIP,
  });
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const parent = n.parentElement;
    if (parent && parent.children.length === 0) {
      if (done.has(parent)) continue;
      done.add(parent);
    }
    const u = unitOf(n);
    if (!u) continue;
    const next = edits.get(u.key);
    if (next === undefined) {
      u.nodes.forEach(restore);
      continue;
    }
    const lead = source(u.nodes[0]).match(/^\s*/)![0];
    const trail = source(u.nodes[u.nodes.length - 1]).match(/\s*$/)![0];
    u.nodes.forEach((t, i) => set(t, i === 0 ? lead + next + trail : ""));
    found.push(u);
  }
  return found;
}
