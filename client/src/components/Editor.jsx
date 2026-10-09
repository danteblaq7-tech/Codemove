// =====================================================================
// REPLACES client/src/components/Editor.jsx
// A Codesters-style workspace:  TOOLKIT | code editor (line numbers) | action buttons | stage + console
//   • Toolkit buttons insert ready-made HTML/CSS/JS snippets at the cursor
//   • ▶ Run  (also Ctrl/Cmd+Enter)   💾 Save (Ctrl/Cmd+S) + autosave   ⟲ Reset to starter   ■ Stop
//   • The stage is a sandboxed iframe. Scripts may run (allow-scripts) but the page has NO access to
//     CodeMove (no allow-same-origin), so learner code can't read tokens or call our API.
//   • console.log / errors from the learner's page appear in the Console panel and are stored
//     with each run (code_runs.output / has_error), so teachers can see where learners get stuck.
// =====================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import './Editor.css';

/* ---------- Toolkit: [label, hover tip, snippet]. "$|" marks where the cursor lands. ---------- */
const TOOLKIT = [
  { id: 'page', icon: '🧱', name: 'Page', items: [
    ['Heading 1', 'The main title of the page.', '<h1>$|</h1>\n'],
    ['Heading 2', 'A smaller section heading.', '<h2>$|</h2>\n'],
    ['Paragraph', 'A block of text.', '<p>$|</p>\n'],
    ['Group (div)', 'Wraps elements so you can style them together.', '<div>\n  $|\n</div>\n'],
  ] },
  { id: 'text', icon: '🔤', name: 'Text', items: [
    ['Bold text', 'Makes text stand out.', '<strong>$|</strong>'],
    ['Italic text', 'Slants the text.', '<em>$|</em>'],
    ['Line break', 'Starts a new line.', '<br>\n'],
    ['Link', 'Sends the visitor to another page.', '<a href="$|">Link text</a>'],
  ] },
  { id: 'lists', icon: '📋', name: 'Lists', items: [
    ['Bullet list', 'An unordered list.', '<ul>\n  <li>$|</li>\n  <li></li>\n</ul>\n'],
    ['Numbered list', 'An ordered list.', '<ol>\n  <li>$|</li>\n  <li></li>\n</ol>\n'],
    ['Table', 'Rows and columns of data.', '<table border="1">\n  <tr>\n    <th>$|</th>\n    <th></th>\n  </tr>\n  <tr>\n    <td></td>\n    <td></td>\n  </tr>\n</table>\n'],
  ] },
  { id: 'media', icon: '🖼️', name: 'Media', items: [
    ['Image', 'Shows a picture. Paste the image address in src.', '<img src="$|" alt="Describe the image" width="200">\n'],
    ['Button', 'A clickable button.', '<button>$|Click me</button>\n'],
    ['Text box', 'Lets the visitor type something.', '<input type="text" placeholder="$|">\n'],
  ] },
  { id: 'style', icon: '🎨', name: 'Style', items: [
    ['Style block', 'Where your CSS lives.', '<style>\n  $|\n</style>\n'],
    ['Text colour', 'Inside a CSS rule.', 'color: $|tomato;\n'],
    ['Background', 'Inside a CSS rule.', 'background-color: $|lightyellow;\n'],
    ['Font size', 'Inside a CSS rule.', 'font-size: $|24px;\n'],
    ['Centre text', 'Inside a CSS rule.', 'text-align: center;\n'],
  ] },
  { id: 'script', icon: '⚡', name: 'Script', items: [
    ['Script block', 'Where your JavaScript lives.', '<script>\n  $|\n</script>\n'],
    ['Print message', 'Shows a message in the Console below the stage.', 'console.log("$|Hello!");\n'],
    ['On click', 'Runs code when the first button is clicked.', 'document.querySelector("button").addEventListener("click", () => {\n  $|\n});\n'],
  ] },
];

/* ---------- Console bridge: injected in front of the learner's HTML (one line, so it never shifts their line numbers by more than 1) ---------- */
const BRIDGE = '<script>(function(){var s=function(t,a){try{parent.postMessage({__ide:1,t:t,m:Array.prototype.map.call(a,function(x){try{return typeof x==="object"?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(" ")},"*")}catch(e){}};["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){s(k,arguments);o.apply(console,arguments)}});window.addEventListener("error",function(e){s("error",[e.message+(e.lineno?" (line "+Math.max(1,e.lineno-1)+")":"")])});window.addEventListener("unhandledrejection",function(e){s("error",["Unhandled: "+e.reason])})})();</script>\n';
const buildDoc = (code) => BRIDGE + code;
const BLANK = '<!doctype html><body style="margin:0;background:#fff"></body>';

const STATUS = { idle: '', dirty: 'Unsaved changes…', saving: 'Saving…', saved: 'Saved ✓', error: 'Could not save – check your connection' };

export default function Editor({ lessonId, starter = '', saved = null }) {
  const start = saved ?? starter;                       // saved work wins over the lesson's starter code
  const [code, setCode] = useState(start);
  const [stage, setStage] = useState(() => ({ html: buildDoc(start), n: 0 }));
  const [tab, setTab] = useState(TOOLKIT[0].id);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('idle');
  const taRef = useRef(null), gutRef = useRef(null), frameRef = useRef(null);
  const selRef = useRef(null);                          // last caret position (used if the editor lost focus)
  const trapRef = useRef(true);                         // Tab inserts spaces; Esc then Tab leaves the editor (keyboard users)
  const codeRef = useRef(code); codeRef.current = code;
  const savedRef = useRef(start);                       // what the server currently has
  const logsRef = useRef([]), pendingRef = useRef(null);

  /* ---------- save (button, Ctrl+S, autosave) ---------- */
  const save = useCallback(async () => {
    const mine = codeRef.current;
    setStatus('saving');
    try {
      await api(`/lessons/${lessonId}/code`, { method: 'PUT', body: { code: mine } });
      savedRef.current = mine;
      setStatus(codeRef.current === mine ? 'saved' : 'dirty');   // typed more while saving? stay "dirty"
    } catch { setStatus('error'); }
  }, [lessonId]);

  useEffect(() => {                                     // autosave 2s after the learner stops typing
    if (status !== 'dirty') return;
    const t = setTimeout(save, 2000);
    return () => clearTimeout(t);
  }, [status, code, save]);

  /* ---------- run history (what the teacher sees in code_runs) ---------- */
  const flushRun = useCallback(() => {
    const p = pendingRef.current; if (!p) return;
    clearTimeout(p.timer); pendingRef.current = null;
    const out = logsRef.current.map((l) => `[${l.t}] ${l.m}`).join('\n');
    api(`/lessons/${lessonId}/runs`, { method: 'POST', body: { code: p.code, output: out, hasError: logsRef.current.some((l) => l.t === 'error') } }).catch(() => {});
  }, [lessonId]);

  // Leaving the lesson: don't lose the last few seconds of typing or the last run.
  useEffect(() => () => {
    flushRun();
    if (codeRef.current !== savedRef.current) api(`/lessons/${lessonId}/code`, { method: 'PUT', body: { code: codeRef.current } }).catch(() => {});
  }, [lessonId, flushRun]);

  // Messages from the stage iframe (only trust OUR iframe).
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data?.__ide || e.source !== frameRef.current?.contentWindow) return;
      logsRef.current = [...logsRef.current, { t: String(e.data.t).slice(0, 8), m: String(e.data.m).slice(0, 500) }].slice(-200);
      setLogs(logsRef.current);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  /* ---------- toolbar actions ---------- */
  const run = useCallback(() => {
    flushRun();                                         // close out the previous run first
    logsRef.current = []; setLogs([]);
    setStage((s) => ({ html: buildDoc(codeRef.current), n: s.n + 1 }));   // new key = fresh iframe, even if code is unchanged
    pendingRef.current = { code: codeRef.current, timer: setTimeout(flushRun, 1500) };   // wait 1.5s to collect console output
  }, [flushRun]);
  const stop = () => setStage((s) => ({ html: BLANK, n: s.n + 1 }));
  const reset = () => {
    if (!window.confirm('Reset to the starter code? Your changes in the editor will be replaced.')) return;
    setCode(starter); setStatus('dirty');
  };

  /* ---------- editor behaviour ---------- */
  function insert(snippet) {
    const ta = taRef.current, cur = codeRef.current;
    const live = document.activeElement === ta;
    const s = live ? ta.selectionStart : selRef.current?.[0] ?? cur.length;
    const e = live ? ta.selectionEnd : selRef.current?.[1] ?? cur.length;
    const mark = snippet.indexOf('$|'), text = snippet.replace('$|', '');
    const caret = s + (mark >= 0 ? mark : text.length);
    setCode(cur.slice(0, s) + text + cur.slice(e)); setStatus('dirty');
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(caret, caret); });
  }
  function onKeyDown(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 'Enter') { e.preventDefault(); return run(); }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); return save(); }
    if (e.key === 'Escape') { trapRef.current = false; return; }
    if (e.key === 'Tab' && !e.shiftKey && trapRef.current) { e.preventDefault(); return insert('  '); }
    trapRef.current = true;
  }

  const lines = code.split('\n').length;
  const cat = TOOLKIT.find((c) => c.id === tab);

  return (
    <section className="ide" aria-label="Code workspace">
      {/* ---- Toolkit ---- */}
      <aside className="ide-tools">
        <div className="ide-tools-h">TOOLKIT</div>
        <div className="ide-cats" role="tablist" aria-label="Toolkit categories">
          {TOOLKIT.map((c) => (
            <button key={c.id} role="tab" aria-selected={tab === c.id} className="ide-cat" onClick={() => setTab(c.id)}>
              <span aria-hidden="true">{c.icon}</span><small>{c.name}</small>
            </button>
          ))}
        </div>
        <div className="ide-tools-b">
          <h4>{cat.name}</h4>
          {cat.items.map(([label, tip, snippet]) => (
            <button key={label} className="ide-block" title={tip}
              onMouseDown={(e) => e.preventDefault() /* keep the caret in the editor */} onClick={() => insert(snippet)}>
              {label}<i aria-hidden="true">i</i>
            </button>
          ))}
        </div>
      </aside>

      {/* ---- Code editor with line numbers ---- */}
      <div className="ide-code">
        <pre ref={gutRef} className="ide-gutter" aria-hidden="true">{Array.from({ length: lines }, (_, i) => i + 1).join('\n')}</pre>
        <textarea ref={taRef} value={code} spellCheck={false} wrap="off" aria-label="Code editor"
          onChange={(e) => { setCode(e.target.value); setStatus('dirty'); }}
          onScroll={(e) => { gutRef.current.scrollTop = e.target.scrollTop; }}
          onBlur={(e) => { selRef.current = [e.target.selectionStart, e.target.selectionEnd]; }}
          onKeyDown={onKeyDown} />
      </div>

      {/* ---- Action buttons ---- */}
      <div className="ide-actions">
        <button className="ide-act run" onClick={run} title="Run (Ctrl+Enter)" aria-label="Run code">▶</button>
        <button className="ide-act save" onClick={save} title="Save (Ctrl+S)" aria-label="Save code">💾</button>
        <button className="ide-act reset" onClick={reset} title="Reset to starter code" aria-label="Reset to starter code">⟲</button>
        <button className="ide-act stop" onClick={stop} title="Stop and clear the stage" aria-label="Stop and clear the stage">■</button>
      </div>

      {/* ---- Stage + console ---- */}
      <div className="ide-stage">
        <iframe key={stage.n} ref={frameRef} title="Preview" sandbox="allow-scripts" srcDoc={stage.html} />
        <div className="ide-console" role="log" aria-label="Console">
          <div className="ide-console-h"><span>Console</span>
            <button onClick={() => { logsRef.current = []; setLogs([]); }}>Clear</button></div>
          {logs.length === 0 && <div className="ide-line dim">Messages from console.log and errors show up here.</div>}
          {logs.map((l, i) => <div key={i} className={`ide-line ${l.t}`}>{l.m}</div>)}
        </div>
      </div>

      <div className="ide-status">
        <span>{STATUS[status]}</span>
        <span>Ctrl+Enter run · Ctrl+S save · Esc then Tab leaves the editor</span>
      </div>
    </section>
  );
}
