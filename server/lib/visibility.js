// =====================================================================
// server/lib/visibility.js  (REPLACES the Update 5 version)
// One place that decides whether a lesson is open to learners.
//   hidden    : is_hidden = true                         -> invisible to learners
//   scheduled : release_at is in the future              -> locked teaser, opens by itself
//   waiting   : requires_code and NO code issued yet      -> locked, waiting for the teacher
//   coded     : requires_code and a code has been issued -> each learner types the code once
//   visible   : everything else
// =====================================================================
import { randomInt } from 'node:crypto';

export const lessonState = (l, now = Date.now()) => {
  if (l.is_hidden) return 'hidden';
  if (l.release_at && new Date(l.release_at).getTime() > now) return 'scheduled';
  if (l.requires_code) return l.access_code ? 'coded' : 'waiting';
  return 'visible';
};

// "Open" = counts towards course totals / progress / scores (a coded lesson counts once its code is issued).
export const isOpen = (l, now = Date.now()) => ['visible', 'coded'].includes(lessonState(l, now));

// Can THIS learner open it? `unlocked` is a Set of lesson ids they have already entered the code for.
export const canEnter = (l, unlocked, now = Date.now()) => {
  const s = lessonState(l, now);
  return s === 'visible' || (s === 'coded' && unlocked.has(l.id));
};

export const niceDate = (iso) => new Date(iso).toLocaleString('en-GB', {
  timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) + ' (East Africa Time)';

// 6 characters, no 0/O/1/I/L so a code read out in class is hard to mistype.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function makeCode(taken = new Set()) {
  for (;;) {
    let c = '';
    for (let i = 0; i < 6; i++) c += ALPHABET[randomInt(ALPHABET.length)];
    if (!taken.has(c)) { taken.add(c); return c; }
  }
}
