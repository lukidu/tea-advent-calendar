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
const CALENDAR_YEAR = 2025;

// Testmodus: true erlaubt das "Vorspulen" bis TEST_DAY
const TEST_MODE = false;
const TEST_DAY = 24;

const STORAGE_KEY        = `openedDoors-${CALENDAR_YEAR}`;
const LEGACY_STORAGE_KEY = 'openedDoors'; // alter Speicherort (Kalender 2025)

const calendar      = document.getElementById('calendar');
const modal         = document.getElementById('modal');
const modalClose    = document.getElementById('modalClose');
const teaName       = document.getElementById('teaName');
const teaImage      = document.getElementById('teaImage');
const teaDescription= document.getElementById('teaDescription');
const teaPreparation= document.getElementById('teaPreparation');
const teaExpiry     = document.getElementById('teaExpiry');

// Geöffnete Türchen aus localStorage laden.
// localStorage kann fehlen (privater Modus) oder kaputte Daten enthalten –
// beides darf die Seite nicht zum Absturz bringen.
function loadOpenedDoors() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // Stand aus der alten Version übernehmen, damit 2025 nichts verloren geht
    if (raw === null && CALENDAR_YEAR === 2025) raw = localStorage.getItem(LEGACY_STORAGE_KEY);
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

// Load teas and render
let teas = [];
fetch('teas.json?v=11.2')
  .then(res => {
    if(!res.ok) throw new Error('teas.json konnte nicht geladen werden');
    return res.json();
  })
  .then(data => {
    if (!Array.isArray(data)) throw new Error('teas.json hat ein unerwartetes Format');
    teas = data;
    renderCalendar();
  })
  .catch(err => {
    console.error('Fehler beim Laden der Teedaten:', err);
    calendar.innerHTML = '<p style="color:#6b6b6b">Fehler: teas.json konnte nicht geladen werden.</p>';
  });

// Prüft, ob ein Türchen geöffnet werden darf
function canOpen(day) {
  if (TEST_MODE) return day <= TEST_DAY;

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth(); // 11 = Dezember

  if (year < CALENDAR_YEAR) return false;
  if (year > CALENDAR_YEAR) return true;
  if (month < 11) return false;
  return day <= now.getDate();
}

function renderCalendar(){
  calendar.innerHTML = '';

  for(let day=1; day<=24; day++){
    // <button>, damit die Türchen auch per Tastatur bedienbar sind
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.classList.add('door');

    const tea = teas.find(t => Number(t.id) === day);

    const isOpenable = canOpen(day);
    const isOpened   = isOpenable && openedDoors.includes(day);

    if(isOpened){
      tile.classList.add('opened');
      tile.setAttribute('aria-label', `Türchen ${day}${tea && tea.name ? ': ' + tea.name : ''}`);
      if(tea && tea.image){
        const img = document.createElement('img');
        img.src = tea.image;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        tile.appendChild(img);

        const label = document.createElement('span');
        label.classList.add('day-label');
        label.textContent = day;
        tile.appendChild(label);
      } else {
        tile.textContent = day;
      }

      tile.addEventListener('click', () => {
        if(tea) showTea(tea);
      });

    } else {
      tile.textContent = day;
      if(!isOpenable){
        tile.classList.add('locked');
        tile.disabled = true;
        tile.setAttribute('aria-label', `Türchen ${day} (noch verschlossen)`);
      } else {
        tile.classList.add('openable');
        tile.setAttribute('aria-label', `Türchen ${day} öffnen`);
        tile.addEventListener('click', () => openDoor(day, tea));
      }
    }
    calendar.appendChild(tile);
  }
}

function openDoor(day, tea){
  if(!canOpen(day)){
    alert(`Dieses Türchen darf erst am ${day}. Dezember geöffnet werden!`);
    return;
  }

  if(tea) showTea(tea);
  else alert('Für dieses Türchen ist noch kein Tee definiert.');

  if(!openedDoors.includes(day)){
    openedDoors.push(day);
    saveOpenedDoors();
    renderCalendar();
  }
}

let lastFocused = null;

function showTea(tea){
  teaName.textContent        = tea.name || '';
  // Altes Bild sofort entfernen, damit nicht kurz der vorherige Tee zu sehen ist
  teaImage.removeAttribute('src');
  if (tea.image) teaImage.src = tea.image;
  teaImage.hidden            = !tea.image;
  teaImage.alt               = tea.name || '';
  teaDescription.textContent = tea.description || '';
  teaPreparation.textContent = tea.preparation || '';
  teaExpiry.textContent      = tea.expiry || '';

  // renderCalendar() ersetzt die Türchen – darum den Tag merken, nicht das Element
  const active = document.activeElement;
  lastFocused = active && active.classList.contains('door')
    ? Array.from(calendar.children).indexOf(active)
    : null;

  modal.classList.remove('hidden');
  modalClose.focus();
}

function closeModal(){
  if (modal.classList.contains('hidden')) return;
  modal.classList.add('hidden');
  if (lastFocused !== null && calendar.children[lastFocused]) {
    calendar.children[lastFocused].focus();
  }
  lastFocused = null;
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if(e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape') closeModal();
});
