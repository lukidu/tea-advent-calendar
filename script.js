/* script.js – Tee Adventskalender
   Geöffnete Türchen werden pro Kalenderjahr in localStorage gespeichert.
*/

// ============================================================
// HIER DAS JAHR EINTRAGEN, in dem der Kalender läuft.
// - Vor dem 1. Dezember dieses Jahres: alle Türchen gesperrt
// - Im Dezember dieses Jahres: Türchen 1 bis heute offen
// - Danach (Januar usw.): alle Türchen bleiben offen
// Bei einem neuen Jahr beginnen die geöffneten Türchen automatisch neu.
// ============================================================
const CALENDAR_YEAR = 2026;

// ============================================================
// TESTMODUS: Bei true tut die Seite so, als wäre heute TEST_DATE.
// Die Uhr läuft ab diesem Datum normal weiter (mit der echten Uhrzeit).
// Im Test geöffnete Türchen werden getrennt gespeichert und stören
// den echten Kalender nicht.
// WICHTIG: Vor dem Verschenken wieder auf false stellen!
// ============================================================
const TEST_MODE = true;
const TEST_DATE = '2026-12-10'; // Jahr-Monat-Tag

const STORAGE_KEY        = TEST_MODE ? 'openedDoors-test' : `openedDoors-${CALENDAR_YEAR}`;
const LEGACY_STORAGE_KEY = 'openedDoors'; // alter Speicherort (Kalender 2025)
const VERSION            = '12.6';

const calendar      = document.getElementById('calendar');
const modal         = document.getElementById('modal');
const modalClose    = document.getElementById('modalClose');
const teaDay        = document.getElementById('teaDay');
const teaName       = document.getElementById('teaName');
const teaImage      = document.getElementById('teaImage');
const teaDescription= document.getElementById('teaDescription');
const teaPreparation= document.getElementById('teaPreparation');
const teaExpiry     = document.getElementById('teaExpiry');
const progressText  = document.getElementById('progressText');
const progressBar   = document.getElementById('progressBar');
const countdownEl   = document.getElementById('countdown');
const toastEl       = document.getElementById('toast');
const snowEl        = document.getElementById('snow');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Speicher ---------- */

// localStorage kann fehlen (privater Modus) oder kaputte Daten enthalten –
// beides darf die Seite nicht zum Absturz bringen.
function loadOpenedDoors() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // Stand aus der alten Version übernehmen, damit 2025 nichts verloren geht
    if (raw === null && !TEST_MODE && CALENDAR_YEAR === 2025) raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return [];
    const days = stored.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 24);
    return Array.from(new Set(days));
  } catch (err) {
    console.warn('Gespeicherte Türchen konnten nicht gelesen werden:', err);
    return [];
  }
}

function saveOpenedDoors() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openedDoors));
  } catch (err) {
    console.warn('Türchen konnten nicht gespeichert werden:', err);
  }
}

let openedDoors = loadOpenedDoors();

/* ---------- Daten laden ---------- */

let teas = [];
fetch(`teas.json?v=${VERSION}`)
  .then(res => {
    if(!res.ok) throw new Error('teas.json konnte nicht geladen werden');
    return res.json();
  })
  .then(data => {
    if (!Array.isArray(data)) throw new Error('teas.json hat ein unerwartetes Format');
    teas = data;
    renderCalendar();
    updateCountdown();
    setInterval(updateCountdown, 1000);
  })
  .catch(err => {
    console.error('Fehler beim Laden der Teedaten:', err);
    const msg = document.createElement('p');
    msg.className = 'load-error';
    msg.textContent = 'Fehler: Die Teedaten konnten nicht geladen werden.';
    calendar.replaceChildren(msg);
  });

/* ---------- Datumslogik ---------- */

// Abstand zwischen simuliertem und echtem Datum (0 ausserhalb des Testmodus)
const timeOffset = (() => {
  if (!TEST_MODE) return 0;
  const [y, m, d] = TEST_DATE.split('-').map(Number);
  const real = new Date();
  const simulated = new Date(y, m - 1, d, real.getHours(), real.getMinutes(), real.getSeconds());
  return Number.isNaN(simulated.getTime()) ? 0 : simulated - real;
})();

// Das aktuelle Datum – im Testmodus das simulierte
function currentDate() {
  return new Date(Date.now() + timeOffset);
}

// Prüft, ob ein Türchen geöffnet werden darf
function canOpen(day) {
  const now   = currentDate();
  const year  = now.getFullYear();
  const month = now.getMonth(); // 11 = Dezember

  if (year < CALENDAR_YEAR) return false;
  if (year > CALENDAR_YEAR) return true;
  if (month < 11) return false;
  return day <= now.getDate();
}

// Das Türchen von heute (1–24) oder null ausserhalb der Adventszeit
function todaysDoor() {
  const now = currentDate();
  if (now.getFullYear() !== CALENDAR_YEAR || now.getMonth() !== 11) return null;
  return now.getDate() <= 24 ? now.getDate() : null;
}

function openableCount() {
  let n = 0;
  for (let day = 1; day <= 24; day++) if (canOpen(day)) n++;
  return n;
}

/* ---------- Gemischte Anordnung ---------- */

// Die Türchen sind wie bei einem echten Adventskalender durcheinander und
// verschieden gross. Die Anordnung hängt nur vom Jahr ab: Sie ist bei jedem
// Besuch gleich, aber jedes Jahr anders.
// 2 grosse (2×2), 3 breite (2×1), 3 hohe (1×2) und 16 kleine Türchen
// ergeben 36 Felder – das geht bei 6, 4 und 3 Spalten genau auf.
const SIZES = [
  ...Array(2).fill({ name: 'big',  w: 2, h: 2 }),
  ...Array(3).fill({ name: 'wide', w: 2, h: 1 }),
  ...Array(3).fill({ name: 'tall', w: 1, h: 2 }),
  ...Array(16).fill({ name: 'small', w: 1, h: 1 }),
];
const TOTAL_CELLS = 36;

// Zufallszahlen mit festem Startwert (mulberry32)
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const random = seededRandom(CALENDAR_YEAR);
// Welches Türchen welche Grösse hat (Index = Tag - 1)
const doorSizes = shuffled(SIZES, random);
// Reihenfolge, in der die Türchen ins Raster gelegt werden
const doorOrder = shuffled(Array.from({ length: 24 }, (_, i) => i + 1), random);

// Legt alle Türchen lückenlos in ein Raster mit `cols` Spalten.
// Ergebnis: pro Tag { col, row } (jeweils ab 1).
function packDoors(cols) {
  const rows = TOTAL_CELLS / cols;
  const used = Array.from({ length: rows }, () => Array(cols).fill(false));
  const placed = {};
  const remaining = doorOrder.slice();

  function fits(r, c, w, h) {
    if (c + w > cols || r + h > rows) return false;
    for (let y = r; y < r + h; y++)
      for (let x = c; x < c + w; x++)
        if (used[y][x]) return false;
    return true;
  }
  function mark(r, c, w, h, value) {
    for (let y = r; y < r + h; y++)
      for (let x = c; x < c + w; x++) used[y][x] = value;
  }
  function place() {
    if (remaining.length === 0) return true;
    // erstes freies Feld suchen
    let r = 0, c = 0;
    outer: for (r = 0; r < rows; r++)
      for (c = 0; c < cols; c++)
        if (!used[r][c]) break outer;

    const tried = new Set();
    for (let i = 0; i < remaining.length; i++) {
      const day = remaining[i];
      const size = doorSizes[day - 1];
      if (tried.has(size.name)) continue; // gleiche Grösse passt hier auch nicht
      tried.add(size.name);
      if (!fits(r, c, size.w, size.h)) continue;
      mark(r, c, size.w, size.h, true);
      remaining.splice(i, 1);
      placed[day] = { col: c + 1, row: r + 1 };
      if (place()) return true;
      remaining.splice(i, 0, day);
      mark(r, c, size.w, size.h, false);
    }
    return false;
  }

  return place() ? placed : null;
}

const columnQueries = [
  { cols: 3, query: window.matchMedia('(max-width:520px)') },
  { cols: 4, query: window.matchMedia('(max-width:900px)') },
];
function currentColumns() {
  const match = columnQueries.find(entry => entry.query.matches);
  return match ? match.cols : 6;
}

const layouts = {};
function applyLayout() {
  const cols = currentColumns();
  if (!(cols in layouts)) layouts[cols] = packDoors(cols);
  const layout = layouts[cols];
  Array.from(calendar.children).forEach((tile, index) => {
    if (!tile.classList.contains('door')) return;
    const size = doorSizes[index];
    const pos  = layout && layout[index + 1];
    // Ohne gültige Anordnung fliessen die Türchen einfach der Reihe nach
    tile.style.gridColumn = pos ? `${pos.col} / span ${size.w}` : `span ${size.w}`;
    tile.style.gridRow    = pos ? `${pos.row} / span ${size.h}` : `span ${size.h}`;
  });
}
columnQueries.forEach(entry => entry.query.addEventListener('change', applyLayout));

/* ---------- Kalender ---------- */

let renderedOpenable = -1;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildTile(day, today, justOpened){
  // <button>, damit die Türchen auch per Tastatur bedienbar sind
  const tile = el('button', `door size-${doorSizes[day - 1].name}`);
  tile.type = 'button';

  const tea = teas.find(t => Number(t.id) === day);

  const isOpenable = canOpen(day);
  const isOpened   = isOpenable && openedDoors.includes(day);

  if (day === today) tile.classList.add('today');
  if (day === justOpened) tile.classList.add('just-opened');

  if(isOpened){
    tile.classList.add('opened');
    tile.setAttribute('aria-label', `Türchen ${day}${tea && tea.name ? ': ' + tea.name : ''}`);
    if(tea && tea.image){
      const img = el('img');
      img.src = tea.image;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      tile.appendChild(img);
      tile.appendChild(el('span', 'day-label', day));
      if (tea.name) tile.appendChild(el('span', 'door-name', tea.name));
    } else {
      tile.appendChild(el('span', 'door-num', day));
    }
    tile.addEventListener('click', () => {
      if(tea) showTea(tea, day);
    });

  } else {
    tile.appendChild(el('span', 'door-num', day));
    if(!isOpenable){
      tile.classList.add('locked');
      // aria-disabled statt disabled: so kann ein Klick eine Rückmeldung geben
      tile.setAttribute('aria-disabled', 'true');
      tile.setAttribute('aria-label', `Türchen ${day} (noch verschlossen)`);
      tile.appendChild(el('span', 'door-lock'));
      tile.addEventListener('click', () => lockedFeedback(tile, day));
    } else {
      tile.classList.add('openable');
      tile.setAttribute('aria-label', `Türchen ${day} öffnen`);
      if (day === today) tile.appendChild(el('span', 'door-badge', 'Heute'));
      tile.addEventListener('click', () => openDoor(day, tea, tile));
    }
  }
  return tile;
}

function renderCalendar(){
  const today = todaysDoor();
  const tiles = [];
  for(let day=1; day<=24; day++) tiles.push(buildTile(day, today));

  calendar.replaceChildren(...tiles);
  applyLayout();
  renderedOpenable = openableCount();
  updateProgress();
}

// Tauscht nur ein einzelnes Türchen aus. Der Rest der Seite bleibt
// unberührt, damit sich beim Öffnen nichts verschiebt (iPhone/Safari
// springt sonst an den Seitenanfang).
function replaceTile(day, justOpened){
  const old = calendar.children[day - 1];
  if (!old) { renderCalendar(); return null; }
  const tile = buildTile(day, todaysDoor(), justOpened);
  tile.style.gridColumn = old.style.gridColumn;
  tile.style.gridRow    = old.style.gridRow;
  calendar.replaceChild(tile, old);
  updateProgress();
  return tile;
}

function updateProgress() {
  const count = openedDoors.filter(canOpen).length;
  progressText.textContent = `${count} von 24 geöffnet`;
  progressBar.style.width = `${(count / 24) * 100}%`;
}

function lockedFeedback(tile, day) {
  tile.classList.remove('shake');
  void tile.offsetWidth; // Animation neu starten
  tile.classList.add('shake');
  toast(`Noch etwas Geduld – Türchen ${day} öffnet sich am ${day}. Dezember.`);
}

let opening = false;

function openDoor(day, tea, tile){
  if(opening) return;
  if(!canOpen(day)){
    lockedFeedback(tile, day);
    return;
  }
  if(!tea){
    toast('Für dieses Türchen ist noch kein Tee definiert.');
    return;
  }

  if(!openedDoors.includes(day)){
    openedDoors.push(day);
    saveOpenedDoors();
  }

  if(reducedMotion){
    replaceTile(day);
    showTea(tea, day);
    return;
  }

  // Türchen klappt weg, das Bild klappt herein, dann erscheint der Tee
  opening = true;
  tile.classList.add('closing');
  setTimeout(() => {
    // Scroll-Position merken und notfalls wiederherstellen
    const x = window.scrollX, y = window.scrollY;
    const opened = replaceTile(day, day);
    if (opened) sparkle(opened);
    const keepScroll = () => { if (window.scrollY !== y) window.scrollTo(x, y); };
    keepScroll();
    requestAnimationFrame(keepScroll);
    setTimeout(() => {
      opening = false;
      showTea(tea, day);
    }, 650);
  }, 220);
}

/* ---------- Effekte ---------- */

function sparkle(tile) {
  const rect  = tile.getBoundingClientRect();
  const burst = el('div', 'burst');
  burst.style.left = `${rect.left + rect.width / 2}px`;
  burst.style.top  = `${rect.top + rect.height / 2}px`;
  const count = 18;
  for (let i = 0; i < count; i++) {
    const spark = el('span', 'spark');
    spark.style.setProperty('--a', `${(360 / count) * i + Math.random() * 14}deg`);
    spark.style.setProperty('--d', `${70 + Math.random() * 70}px`);
    spark.style.setProperty('--s', `${5 + Math.random() * 6}px`);
    if (i % 3 === 0) spark.classList.add('spark-alt');
    burst.appendChild(spark);
  }
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1000);
}

function makeSnow() {
  if (reducedMotion) return;
  const count = window.innerWidth < 600 ? 28 : 55;
  for (let i = 0; i < count; i++) {
    const flake = el('span', 'flake');
    const size = 2 + Math.random() * 6;
    flake.style.setProperty('--x', `${Math.random() * 100}%`);
    flake.style.setProperty('--size', `${size}px`);
    flake.style.setProperty('--dur', `${9 + Math.random() * 12 + (8 - size)}s`);
    flake.style.setProperty('--delay', `${-Math.random() * 20}s`);
    flake.style.setProperty('--drift', `${-40 + Math.random() * 80}px`);
    flake.style.setProperty('--o', `${0.35 + Math.random() * 0.55}`);
    snowEl.appendChild(flake);
  }
}
makeSnow();

let toastTimer = null;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

/* ---------- Countdown ---------- */

function pad(n) { return String(n).padStart(2, '0'); }

function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function countdownText() {
  const now   = currentDate();
  const start = new Date(CALENDAR_YEAR, 11, 1);
  const last  = new Date(CALENDAR_YEAR, 11, 24);

  if (now < start) {
    const ms = start - now;
    const days = Math.floor(ms / 86400000);
    if (days >= 2) return `Erstes Türchen in ${days} Tagen`;
    return `Erstes Türchen in ${formatDuration(ms)}`;
  }
  if (now < last) {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return `Nächstes Türchen in ${formatDuration(midnight - now)}`;
  }
  if (now.getFullYear() === CALENDAR_YEAR) return 'Frohe Weihnachten!';
  return 'Alle Türchen sind offen';
}

function updateCountdown() {
  countdownEl.textContent = (TEST_MODE ? 'Testmodus · ' : '') + countdownText();
  countdownEl.hidden = false;
  // Um Mitternacht wird ein neues Türchen frei – Kalender neu zeichnen
  if (!opening && openableCount() !== renderedOpenable) renderCalendar();
}

/* ---------- Modal ---------- */

let lastDay = null;

let usingKeyboard = false;
document.addEventListener('keydown', () => { usingKeyboard = true; }, true);
document.addEventListener('pointerdown', () => { usingKeyboard = false; }, true);

function showTea(tea, day){
  teaDay.textContent         = day;
  teaName.textContent        = tea.name || '';
  // Altes Bild sofort entfernen, damit nicht kurz der vorherige Tee zu sehen ist
  teaImage.removeAttribute('src');
  if (tea.image) teaImage.src = tea.image;
  teaImage.parentElement.hidden = !tea.image;
  teaImage.alt               = tea.name || '';
  teaDescription.textContent = tea.description || '';
  teaPreparation.textContent = tea.preparation || '–';
  teaExpiry.textContent      = tea.expiry || '–';

  lastDay = day;
  modal.classList.remove('hidden');
  // preventScroll: die Seite soll beim Öffnen und Schliessen nicht springen
  modalClose.focus({ preventScroll: true });
}

function closeModal(){
  if (modal.classList.contains('hidden')) return;
  modal.classList.add('hidden');
  // renderCalendar() ersetzt die Türchen – darum über den Tag wiederfinden
  const tile = lastDay ? calendar.children[lastDay - 1] : null;
  // Fokus nur bei Tastaturbedienung zurück aufs Türchen setzen – bei
  // Maus und Finger bliebe sonst ein goldener Fokusrahmen stehen
  if (tile && usingKeyboard) tile.focus({ preventScroll: true });
  else if (document.activeElement) document.activeElement.blur();
  lastDay = null;
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if(e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape') closeModal();
});
