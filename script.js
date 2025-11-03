/* script.js
   - Testmodus: TEST_MODE = true erlaubt das "Vorspulen"
   - openedDoors wird in localStorage gespeichert (Array von Zahlen)
*/

const TEST_MODE = true;
const TEST_DAY = 24;

const calendar      = document.getElementById('calendar');
const modal         = document.getElementById('modal');
const modalClose    = document.getElementById('modalClose');
const teaName       = document.getElementById('teaName');
const teaImage      = document.getElementById('teaImage');
const teaDescription= document.getElementById('teaDescription');
const teaPreparation= document.getElementById('teaPreparation');
const teaExpiry     = document.getElementById('teaExpiry');
const yearSpan      = document.getElementById('year');
const clearLocalBtn = document.getElementById('clearLocal');

yearSpan.textContent = new Date().getFullYear();

// Load opened doors from localStorage
let openedDoors = JSON.parse(localStorage.getItem('openedDoors')) || [];
openedDoors = Array.from(new Set(openedDoors.map(n => Number(n)).filter(n => !isNaN(n))));

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

// Prüft, ob ein Türchen geöffnet werden darf
function canOpen(day) {
  if (TEST_MODE) return day <= TEST_DAY;

  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay   = now.getDate();

  const startMonth = 11;
  const startYear  = 2025;

  if (currentYear > startYear
    || (currentYear === startYear && currentMonth > startMonth)
    || (currentYear === startYear && currentMonth === startMonth && currentDay > 24)) {
    return true;
  }
  if (currentYear < startYear
    || (currentYear === startYear && currentMonth < startMonth)) {
    return false;
  }
  if (currentYear === startYear && currentMonth === startMonth) {
    return day <= currentDay;
  }
  return false;
}

function renderCalendar(){
  calendar.innerHTML = '';

  for(let day=1; day<=24; day++){
    const tile = document.createElement('div');
    tile.classList.add('door');

    const tea = teas.find(t => Number(t.id) === day);

    const isOpened  = openedDoors.includes(day) && canOpen(day);
    const isOpenable= canOpen(day);

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
    localStorage.setItem('openedDoors', JSON.stringify(openedDoors));
    renderCalendar();
  }
}

function showTea(tea){
  teaName.textContent        = tea.name || '';
  teaImage.src               = tea.image || '';
  teaImage.alt               = tea.name || '';
  teaDescription.textContent = tea.description || '';
  teaPreparation.textContent = tea.preparation || '';
  teaExpiry.textContent      = tea.expiry || '';
  modal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
  if(e.target === modal) modal.classList.add('hidden');
});