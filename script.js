/* script.js
   - Testmodus: TEST_MODE = true erlaubt das "Vorspulen"
   - geöffnete Türen werden nur während der Session gespeichert
*/

const TEST_MODE = true;        // true = benutze TEST_DAY anstatt echtes Datum
const TEST_DAY = 2;             // bis zu welchem Tag testweise geöffnet werden darf

const calendar = document.getElementById('calendar');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const teaName = document.getElementById('teaName');
const teaImage = document.getElementById('teaImage');
const teaDescription = document.getElementById('teaDescription');
const yearSpan = document.getElementById('year');

yearSpan.textContent = new Date().getFullYear();

// Geöffnete Türen nur für die Session
let openedDoors = [];

// Load teas and render
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

/* Prüft, ob ein Türchen geöffnet werden darf */
function canOpen(day){
  if(TEST_MODE) return day <= TEST_DAY; // Testmodus übersteuert alles

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Januar, 11 = Dezember
  const currentDay = now.getDate();

  const startMonth = 11; // Dezember
  const startYear = 2025;

  // Türchen ab 24. Dezember: immer offen
  if(currentYear > startYear || (currentYear === startYear && currentMonth === startMonth && day >= 24)) {
    return true;
  }

  // vor 1. Dezember: alle Türchen gesperrt
  if(currentYear < startYear || (currentYear === startYear && currentMonth < startMonth)){
    return false;
  }

  // ab 1. Dezember bis 23. Dezember: nur Tage <= heute offen
  if(currentYear === startYear && currentMonth === startMonth){
    return day <= currentDay;
  }

  // Default: gesperrt
  return false;
}

function renderCalendar(){
  calendar.innerHTML = '';

  for(let day = 1; day <= 24; day++){
    const tile = document.createElement('div');
    tile.classList.add('door');

    const tea = teas.find(t => Number(t.id) === day);

    const isOpened = openedDoors.includes(day);
    const isOpenable = canOpen(day);

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
  if(!canOpen(day)){
    alert('Dieses Türchen darf erst ab dem 1. Dezember geöffnet werden!');
    return;
  }

  if(tea) showTea(tea);
  else alert('Für dieses Türchen ist noch kein Tee definiert.');

  if(!openedDoors.includes(day)){
    openedDoors.push(day);
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
