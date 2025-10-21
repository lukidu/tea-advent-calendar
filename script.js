/* script.js
   - Testmodus: TEST_MODE = true erlaubt das "Vorspulen"
   - openedDoors wird in localStorage gespeichert (Array von Zahlen)
*/

const TEST_MODE = true;        // true = benutze TEST_DAY anstatt echtes Datum
const TEST_DAY = 3;           // bis zu welchem Tag testweise geöffnet werden darf

const calendar = document.getElementById('calendar');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const teaName = document.getElementById('teaName');
const teaImage = document.getElementById('teaImage');
const teaDescription = document.getElementById('teaDescription');
const yearSpan = document.getElementById('year');
const clearLocalBtn = document.getElementById('clearLocal');

yearSpan.textContent = new Date().getFullYear();

// Load opened doors from localStorage
let openedDoors = JSON.parse(localStorage.getItem('openedDoors')) || [];

// ensure unique integers
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

function renderCalendar(){
  const today = TEST_MODE ? TEST_DAY : new Date().getDate();
  calendar.innerHTML = '';

  for(let day = 1; day <= 24; day++){
    const tile = document.createElement('div');
    tile.classList.add('door');

    // find tea info if present
    const tea = teas.find(t => Number(t.id) === day);

    const isOpened = openedDoors.includes(day);
    const isOpenable = day <= today;

    if(isOpened){
      tile.classList.add('opened');
      // show image if available else show day-label
      if(tea && tea.image){
        const img = document.createElement('img');
        img.src = tea.image;
        img.alt = tea.name || `Tee ${day}`;
        tile.appendChild(img);

        // small day label overlay (optional)
        const label = document.createElement('div');
        label.classList.add('day-label');
        label.textContent = day;
        tile.appendChild(label);

      } else {
        tile.textContent = day;
      }

      // allow opening the modal again by clicking opened tile
      tile.addEventListener('click', () => {
        if(tea) showTea(tea);
      });

    } else {
      // not opened yet
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
  const today = TEST_MODE ? TEST_DAY : new Date().getDate();
  if(day > today){
    alert('Dieses Türchen darf erst später geöffnet werden!');
    return;
  }

  // show modal
  if(tea) showTea(tea);
  else {
    alert('Für dieses Türchen ist noch kein Tee definiert.');
  }

  // mark as opened (if not already)
  if(!openedDoors.includes(day)){
    openedDoors.push(day);
    localStorage.setItem('openedDoors', JSON.stringify(openedDoors));
    // re-render to show the image in the tile
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

// close modal via X or clicking outside
modalClose.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
  if(e.target === modal) modal.classList.add('hidden');
});

// ----- DEV: optional Reset (hidden by default) -----
// If you ever want a reset button while developing, unhide #clearLocal in index.html or here:
clearLocalBtn.addEventListener('click', () => {
  if(confirm('LocalStorage wirklich löschen? (öffnet alle Türchen zurück)')){
    localStorage.removeItem('openedDoors');
    openedDoors = [];
    renderCalendar();
  }
});
