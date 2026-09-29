import { useState } from 'react';
import { api } from '../api';

// HTML/CSS editor. Preview iframe has sandbox="" so learner code cannot run scripts.
export default function Editor({ lessonId, initial }) {
  const [code, setCode] = useState(initial);
  const [doc, setDoc] = useState(initial);
  function run() {
    setDoc(code);
    api(`/lessons/${lessonId}/runs`, { method: 'POST', body: { code } }).catch(() => {});
  }
  return (
    <div className="editor">
      <div className="ed-head"><span>HTML</span><button className="run" onClick={run}>Run ▶</button></div>
      <div className="ed-body">
        <textarea value={code} spellCheck={false} aria-label="Code editor" onChange={(e) => setCode(e.target.value)} />
        <iframe title="Preview" sandbox="" srcDoc={doc} />
      </div>
    </div>
  );
}
