/* script.js
   - Testmodus: TEST_MODE = true erlaubt das "Vorspulen"
   - openedDoors wird in localStorage gespeichert (Array von Zahlen)
*/

const TEST_MODE = false;        // true = benutze TEST_DAY anstatt echtes Datum
const TEST_DAY = 3;             // bis zu welchem Tag testweise geöffnet werden darf

const calendar = document.getElementById('calendar');

const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const teaName = document.getElementById('teaName');
const teaImage = document.getElementById('teaImage');
const teaDescription = document.getElementById('teaDescription');

const teaExtra = document.getElementById('teaExtra');
const teaBestBefore = document.getElementById('teaBestBefore');
const teaIngredients = document.getElementById('teaIngredients');
const teaPreparation = document.getElementById('teaPreparation');

const yearSpan = document.getElementById('year');
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

/* Prüft, ob ein Türchen geöffnet werden darf */
function canOpen(day) {
  if (TEST_MODE) return day <= TEST_DAY; // Testmodus übersteuert alles

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Januar, 11 = Dezember
  const currentDay = now.getDate();

  const startMonth = 10;
  const startYear = 2025;

  // Türchen ab 24.: immer offen
  if (currentYear > startYear
    || (currentYear === startYear && currentMonth > startMonth)
    || (currentYear === startYear && currentMonth === startMonth && currentDay > 24)) {
    return true;
  }

  // Vor dem 1.: alle Türchen gesperrt
  if (currentYear < startYear
    || (currentYear === startYear && currentMonth < startMonth)) {
    return false;
  }

  // Vom 1. bis zum 24.: nur Türchen bis zum heutigen Datum offen
  if (currentYear === startYear && currentMonth === startMonth) {
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

    const isOpened = openedDoors.includes(day) && canOpen(day);
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
    localStorage.setItem('openedDoors', JSON.stringify(openedDoors));
    renderCalendar();
  }
}

function showTea(tea){
  // Titel
  teaName.textContent = tea.name || '';

  // Bild
  if (tea.image) {
    teaImage.src = tea.image;
    teaImage.alt = tea.name || '';
    teaImage.style.display = 'block';
  } else {
    teaImage.src = '';
    teaImage.style.display = 'none';
  }

  // Beschrieb (Haupttext)
  teaDescription.textContent = tea.description || '';

  // Zusatzbeschrieb (kleiner, grau)
  if (tea.extraDescription) {
    teaExtra.textContent = tea.extraDescription;
    teaExtra.style.display = 'block';
  } else {
    teaExtra.textContent = '';
    teaExtra.style.display = 'none';
  }

  // Haltbarkeitsdatum
  teaBestBefore.textContent = tea.bestBefore || '–';

  // Zutaten
  teaIngredients.textContent = tea.ingredients || '–';

  // Zubereitung
  teaPreparation.textContent = tea.preparation || '–';

  modal.classList.remove('hidden');
}

modalClose.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
  if(e.target === modal) modal.classList.add('hidden');
});
