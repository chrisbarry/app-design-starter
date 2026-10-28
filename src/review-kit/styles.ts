// Plain CSS so the kit looks the same in any project, whatever it uses for styling.
// Everything is prefixed rk- and scoped under .rk-root / .rk-gate.

export const CSS = `
.rk-root, .rk-gate {
  --rk-ink: #18161d; --rk-sub: #6f6a78; --rk-line: #e7e4eb; --rk-soft: #f4f3f6; --rk-bg: #fff;
  --rk-comment: #ff5a2c; --rk-edit: #10a05a; --rk-focus: #2f6bff; --rk-danger: #d93a3a;
  font: 13px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--rk-ink); -webkit-font-smoothing: antialiased; letter-spacing: 0;
}
.rk-root *, .rk-gate * { box-sizing: border-box; }
.rk-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; }
.rk-root button { font-family: inherit; }

.rk-bar { position: fixed; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: auto;
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px;
  background: var(--rk-ink); border-radius: 999px; box-shadow: 0 10px 30px rgba(15,12,25,.28); }
.rk-bar.rk-shift { right: 372px; }
.rk-sep { width: 20px; height: 1px; background: rgba(255,255,255,.14); margin: 2px 0; }
.rk-tool { position: relative; width: 36px; height: 36px; border-radius: 999px; border: 0; padding: 0;
  display: grid; place-items: center; background: transparent; color: rgba(255,255,255,.78); cursor: pointer; }
.rk-tool:hover { background: rgba(255,255,255,.1); color: #fff; }
.rk-tool:focus-visible { outline: 2px solid var(--rk-focus); outline-offset: 2px; }
.rk-tool.rk-on-comment { background: var(--rk-comment); color: #fff; }
.rk-tool.rk-on-edit { background: var(--rk-edit); color: #fff; }
.rk-tool.rk-on { background: rgba(255,255,255,.16); color: #fff; }
.rk-count { position: absolute; top: 1px; right: 0; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 99px;
  background: var(--rk-comment); color: #fff; font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; }
.rk-me { width: 30px; height: 30px; border-radius: 999px; border: 0; cursor: pointer; color: #fff;
  font-size: 11px; font-weight: 700; display: grid; place-items: center; }
.rk-tab { position: fixed; right: 0; top: 50%; transform: translateY(-50%); pointer-events: auto; width: 24px; height: 56px;
  border: 0; border-radius: 12px 0 0 12px; background: var(--rk-ink); color: #fff; cursor: pointer; display: grid; place-items: center;
  box-shadow: 0 6px 20px rgba(15,12,25,.25); }
.rk-tab .rk-count { top: -6px; right: auto; left: -6px; }

.rk-hint { position: fixed; top: 32px; left: 50%; transform: translateX(-50%); pointer-events: none; white-space: nowrap;
  padding: 7px 14px; border-radius: 999px; color: #fff; font-weight: 600; font-size: 12.5px;
  box-shadow: 0 6px 20px rgba(15,12,25,.22); max-width: calc(100vw - 24px); overflow: hidden; text-overflow: ellipsis; }
.rk-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); pointer-events: none;
  padding: 9px 14px; border-radius: 10px; background: var(--rk-ink); color: #fff; font-weight: 500;
  box-shadow: 0 6px 20px rgba(15,12,25,.25); max-width: calc(100vw - 24px); }

.rk-hover { position: fixed; pointer-events: none; border-radius: 4px; }
.rk-hover-comment { outline: 2px solid var(--rk-comment); background: rgba(255,90,44,.07); }
.rk-hover-edit { outline: 2px dashed var(--rk-edit); outline-offset: 2px; background: rgba(16,160,90,.08); }
.rk-edited { position: fixed; pointer-events: none; border-bottom: 2px solid var(--rk-edit); background: rgba(16,160,90,.12); border-radius: 2px; }

.rk-pin { position: fixed; pointer-events: auto; transform: translate(-2px, -100%); width: 26px; height: 26px; padding: 0;
  border-radius: 50% 50% 50% 3px; border: 2px solid #fff; background: var(--rk-comment); color: #fff; cursor: pointer;
  font-size: 11.5px; font-weight: 700; box-shadow: 0 3px 10px rgba(15,12,25,.3); }
.rk-pin.rk-resolved { background: #9a95a3; }
.rk-pin.rk-active { background: var(--rk-ink); }
.rk-pin.rk-pulse { animation: rk-pulse 1s ease-out 2; }
@keyframes rk-pulse { 0% { box-shadow: 0 0 0 0 rgba(255,90,44,.6); } 100% { box-shadow: 0 0 0 16px rgba(255,90,44,0); } }

.rk-pop { position: fixed; width: 300px; max-width: calc(100vw - 16px); pointer-events: auto; padding: 12px;
  background: var(--rk-bg); border-radius: 14px; box-shadow: 0 14px 44px rgba(15,12,25,.22), 0 0 0 1px rgba(15,12,25,.06); }
.rk-label { margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--rk-sub); }
.rk-ta { display: block; width: 100%; min-height: 64px; max-height: 40vh; resize: vertical; margin: 0; padding: 8px 10px;
  border: 1px solid var(--rk-line); border-radius: 10px; background: #fff; color: var(--rk-ink); font: inherit; outline: none; }
.rk-ta:focus { border-color: var(--rk-focus); box-shadow: 0 0 0 3px rgba(47,107,255,.15); }
.rk-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.rk-row .rk-grow { flex: 1; }
.rk-btn { appearance: none; border: 0; border-radius: 8px; padding: 7px 11px; cursor: pointer; font: inherit;
  font-size: 12.5px; font-weight: 600; line-height: 1; background: var(--rk-soft); color: var(--rk-ink);
  display: inline-flex; align-items: center; gap: 5px; }
.rk-btn:hover { background: #ebe9ee; }
.rk-btn:disabled { opacity: .45; cursor: default; }
.rk-btn:focus-visible { outline: 2px solid var(--rk-focus); outline-offset: 2px; }
.rk-btn-primary { background: var(--rk-ink); color: #fff; }
.rk-btn-primary:hover { background: #2c2933; }
.rk-btn-ghost { background: transparent; color: var(--rk-sub); padding: 6px 8px; }
.rk-btn-ghost:hover { background: var(--rk-soft); color: var(--rk-ink); }
.rk-btn-danger { color: var(--rk-danger); }
.rk-keys { color: var(--rk-sub); font-size: 11px; }

.rk-msg { display: flex; gap: 8px; padding: 6px 0; }
.rk-msg + .rk-msg { border-top: 1px solid var(--rk-line); padding-top: 9px; }
.rk-av { flex: none; width: 24px; height: 24px; border-radius: 999px; color: #fff; display: grid; place-items: center;
  font-size: 10px; font-weight: 700; }
.rk-msg-body { min-width: 0; flex: 1; }
.rk-who { font-weight: 650; }
.rk-when { color: var(--rk-sub); font-size: 11.5px; margin-left: 4px; }
.rk-text { margin: 2px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.rk-quote { margin: 0 0 8px; padding: 6px 9px; border-left: 3px solid var(--rk-line); color: var(--rk-sub);
  font-size: 12px; overflow-wrap: anywhere; }
.rk-quote s { color: #a49fad; }
.rk-history { list-style: none; margin: 10px 0 0; padding: 8px 0 0; border-top: 1px solid var(--rk-line);
  color: var(--rk-sub); font-size: 11.5px; display: grid; gap: 3px; }
.rk-history li { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rk-scroll { max-height: 46vh; overflow-y: auto; margin: -2px -4px 0; padding: 0 4px; }

.rk-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 360px; max-width: 100vw; pointer-events: auto;
  background: var(--rk-bg); box-shadow: -14px 0 44px rgba(15,12,25,.16); display: flex; flex-direction: column; }
.rk-panel-head { display: flex; align-items: center; gap: 8px; padding: 14px 14px 10px; }
.rk-panel-head h2 { margin: 0; font-size: 15px; font-weight: 700; flex: 1; }
.rk-tabs { display: flex; gap: 4px; padding: 0 14px 10px; border-bottom: 1px solid var(--rk-line); }
.rk-tabs button { flex: 1; border: 0; border-radius: 8px; padding: 7px 8px; background: transparent; color: var(--rk-sub);
  font: inherit; font-weight: 600; cursor: pointer; }
.rk-tabs button[aria-selected="true"] { background: var(--rk-soft); color: var(--rk-ink); }
.rk-panel-body { flex: 1; overflow-y: auto; padding: 10px 14px 16px; }
.rk-panel-foot { border-top: 1px solid var(--rk-line); padding: 10px 14px; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; }
.rk-check { display: inline-flex; align-items: center; gap: 6px; color: var(--rk-sub); cursor: pointer; font-size: 12px; }
.rk-check input { margin: 0; accent-color: var(--rk-ink); }
.rk-item { border: 1px solid var(--rk-line); border-radius: 12px; padding: 10px; margin-top: 8px; background: #fff; }
.rk-item-head { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.rk-num { flex: none; width: 20px; height: 20px; border-radius: 50% 50% 50% 3px; background: var(--rk-comment); color: #fff;
  font-size: 10px; font-weight: 700; display: grid; place-items: center; }
.rk-num.rk-resolved { background: #9a95a3; }
.rk-num.rk-general { background: var(--rk-ink); }
.rk-page { color: var(--rk-sub); font-size: 11px; }
.rk-empty { color: var(--rk-sub); text-align: center; padding: 28px 12px; }
.rk-error { margin: 8px 0 0; padding: 8px 10px; border-radius: 8px; background: #fdecec; color: #a32020; font-size: 12px; }

.rk-spot { position: fixed; pointer-events: none; border-radius: 999px; box-shadow: 0 0 0 2px var(--rk-focus), 0 0 0 9999px rgba(15,12,25,.4);
  transition: left .2s, top .2s, width .2s, height .2s; }
.rk-tour { position: fixed; pointer-events: auto; padding: 16px; background: var(--rk-bg); border-radius: 14px;
  box-shadow: 0 14px 44px rgba(15,12,25,.28), 0 0 0 1px rgba(15,12,25,.06); transition: top .2s; }
.rk-tour h2 { margin: 0; font-size: 15px; line-height: 1.3; font-weight: 700; }
.rk-tour-body { margin: 6px 0 0; color: var(--rk-ink); }
.rk-tour .rk-keys { margin: 6px 0 0; }
.rk-tour .rk-row { margin-top: 14px; }
.rk-tour-arrow { position: absolute; right: -6px; width: 12px; height: 12px; margin-top: -6px; background: var(--rk-bg);
  transform: rotate(45deg); border-radius: 2px; transition: top .2s; }

.rk-gate { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; padding: 16px; background: #f3f1f6; }
.rk-gate-card { width: 100%; max-width: 360px; padding: 28px; background: #fff; border-radius: 20px;
  box-shadow: 0 20px 60px rgba(15,12,25,.12), 0 0 0 1px rgba(15,12,25,.05); }
.rk-gate-eyebrow { margin: 0 0 14px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--rk-sub); }
.rk-gate h1 { margin: 0; font-size: 22px; line-height: 1.2; font-weight: 750; letter-spacing: -.01em; }
.rk-gate-hint { margin: 6px 0 18px; color: var(--rk-sub); font-size: 14px; }
.rk-input { display: block; width: 100%; height: 44px; padding: 0 14px; border: 1px solid var(--rk-line); border-radius: 12px;
  font: inherit; font-size: 15px; color: var(--rk-ink); background: #fff; outline: none; }
.rk-input:focus { border-color: var(--rk-focus); box-shadow: 0 0 0 3px rgba(47,107,255,.15); }
.rk-input.rk-bad { border-color: var(--rk-danger); animation: rk-shake .3s; }
@keyframes rk-shake { 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
.rk-gate-error { margin: 8px 0 0; color: var(--rk-danger); font-size: 13px; }
.rk-gate .rk-btn-primary { width: 100%; height: 44px; margin-top: 14px; justify-content: center; font-size: 14px; border-radius: 12px; }

@media (max-width: 640px) {
  .rk-bar.rk-shift { display: none; }
  .rk-panel { width: 100vw; }
}
@media (hover: none) {
  .rk-keys { visibility: hidden; }
}
@media (prefers-reduced-motion: reduce) {
  .rk-pin.rk-pulse, .rk-input.rk-bad { animation: none; }
  .rk-spot, .rk-tour, .rk-tour-arrow { transition: none; }
}
`;
