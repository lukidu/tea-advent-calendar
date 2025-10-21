const calendar = document.getElementById("calendar");
const modal = document.getElementById("modal");
const closeBtn = document.getElementById("closeBtn");
const teaName = document.getElementById("teaName");
const teaImage = document.getElementById("teaImage");
const teaDescription = document.getElementById("teaDescription");

let teas = [];

// 🧪 TESTMODUS aktivieren
// true = Testmodus
// false = Normalmodus (nutzt heutiges Datum)
const TEST_MODE = true;
const TEST_DAY = 24; // bis zu welchem Türchen du öffnen kannst

fetch("teas.json")
  .then(res => res.json())
  .then(data => {
    teas = data;
    renderCalendar();
  });

function renderCalendar() {
  const today = TEST_MODE ? TEST_DAY : new Date().getDate();

  for (let day = 1; day <= 24; day++) {
    const door = document.createElement("div");
    door.classList.add("door");
    door.textContent = day;

    door.addEventListener("click", () => {
      if (day > today) {
        alert("Dieses Türchen darf erst später geöffnet werden!");
        return;
      }
      const tea = teas.find(t => t.id === day);
      if (tea) showTea(tea);
      else alert("Noch kein Tee für diesen Tag definiert!");
    });

    calendar.appendChild(door);
  }
}

function showTea(tea) {
  teaName.textContent = tea.name;
  teaImage.src = tea.image;
  teaDescription.textContent = tea.description;
  modal.classList.remove("hidden");
}

closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
