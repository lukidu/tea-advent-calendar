const ADVENT_YEAR = 2025;       // Hier Jahr anpassen für nächsten Adventskalender
const TEST_MODE = false;        // true = benutze TEST_DAY anstatt echtes Datum
const TEST_DAY = 2;             // bis zu welchem Tag testweise geöffnet werden darf

const calendar = document.getElementById('calendar');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const teaName = document.getElementById('teaName');
const teaImage = document.getElementById('teaImage');
const teaDescription = document.getElementById('teaDescription');
const yearSpan = document.getElementById('year');
const clearLocalBtn = document.getElementById('clearLocal');

yearSpan.textContent = new Date().getFullYear();

// Gespeicherte geöffneten Türen laden
let openedDoors = JSON.parse(localStorage.getItem('openedDoors')) || [];

// unique integers sicherstellen
openedDoors = Array.from(new Set(openedDoors.map(n => Number(n)).filter(n => !isNaN(n))));

// Teedaten laden und Kalender rendern
let teas = [];
fetch('teas.json')
  .then(res => {
    if(!res.ok) throw new Error('teas.json konnte nicht geladen werden');
    return res.json();
  })
  .then(data => {
    teas = data;
    renderCalendar();
  })
  .catch(err => {
    console.error('Fehler beim Laden der Teedaten:', err);
    calendar.innerHTML = '<p style="color:#6b6b6b">Fehler: teas.json konnte nicht geladen werden.</p>';
  });

// Prüft ob das Datum mindestens 1. Dezember ADVENT_YEAR ist
function isAtLeastDecember() {
  const now = new Date();
  if(now.getFullYear() < ADVENT_YEAR) return false;
  if(now.getFullYear() === ADVENT_YEAR && now.getMonth() < 11) return false; // Monat 11 = Dezember
  return true; // Ab Dezember ADVENT_YEAR (und später)
}

// Prüft ob das Datum zwischen 1.12.ADVENT_YEAR und 24.12.ADVENT_YEAR liegt (inklusive)
function isBetweenDec1And24() {
  const now = new Date();
  return now.getFullYear() === ADVENT_YEAR && now.getMonth() === 11 && now.getDate() <= 24;
}

function renderCalendar(){
  // const allowed = TEST_MODE || isAtLeastDecember();

  // if(!allowed){
  //   calendar.innerHTML = `<p style="color:#6b6b6b; text-align:center;">Der Adventskalender ist erst ab Dezember ${ADVENT_YEAR} aktiv.</p>`;
  //   return;
  // }

  const now = new Date();
  const dayOfMonth = TEST_MODE ? TEST_DAY : now.getDate();

  calendar.innerHTML = '';

  for(let day = 1; day <= 24; day++){
    const tile = document.createElement('div');
    tile.classList.add('door');

    const tea = teas.find(t => Number(t.id) === day);

    const isOpened = openedDoors.includes(day);

    // Bestimmen ob das Türchen geöffnet werden darf
    // Alle Türchen sind sichtbar, aber nur "openable" wenn erlaubt
    const isOpenable = TEST_MODE 
      || (now.getFullYear() === ADVENT_YEAR && now.getMonth() === 11 && now.getDate() < 25 && day <= dayOfMonth)
      || (now.getFullYear() > ADVENT_YEAR || (now.getFullYear() === ADVENT_YEAR && now.getMonth() > 11))
      // Nach dem 24.12. alle offen
      ;

    if(isOpened){
      tile.classList.add('opened');

      if(tea && tea.image){
        const img = document.createElement('img');
        img.src = tea.image;
        img.alt = tea.name || `Tee ${day}`;
        tile.appendChild(img);

        const label = document.createElement('div');
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
      } else {
        tile.classList.add('openable');
        tile.addEventListener('click', () => openDoor(day, tea));
      }
    }

    calendar.appendChild(tile);
  }
}

function openDoor(day, tea){
  const now = new Date();

  // Prüfen ob Kalender ab 1.12.ADVENT_YEAR aktiv ist oder Testmodus
  if(!TEST_MODE && !isAtLeastDecember()){
    alert(`Der Adventskalender ist erst ab Dezember ${ADVENT_YEAR} aktiv.`);
    return;
  }

  // Prüfen ob das Türchen geöffnet werden darf
  if(!TEST_MODE){
    if(now.getFullYear() === ADVENT_YEAR && now.getMonth() === 11 && now.getDate() < 25){
      // vor dem 25.12.ADVENT_YEAR: Tür nur öffnen, wenn Tag <= aktueller Tag
      if(day > now.getDate()){
        alert('Dieses Türchen darf erst später geöffnet werden!');
        return;
      }
    }
    // nach dem 24.12. ist alles offen
  }

  if(tea) {
    showTea(tea);
  } else {
    alert('Für dieses Türchen ist noch kein Tee definiert.');
  }

  if(!openedDoors.includes(day)){
    openedDoors.push(day);
    localStorage.setItem('openedDoors', JSON.stringify(openedDoors));
    renderCalendar();
  }
}

function showTea(tea){
  teaName.textContent = tea.name || '';
  teaImage.src = tea.image || '';
  teaImage.alt = tea.name || '';
  teaDescription.textContent = tea.description || '';
  modal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
  if(e.target === modal) modal.classList.add('hidden');
});
