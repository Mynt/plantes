import { ensureAnonAuth, uuid, compressImage, uploadPhoto, db } from "../app.js";
import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const plantsContainer = document.getElementById("plants-container");
const addPlantBtn = document.getElementById("add-plant");
const form = document.getElementById("submission-form");
const statusEl = document.getElementById("status");

let plantCount = 0;

function addPlantCard() {
  plantCount += 1;
  const index = plantCount;
  const card = document.createElement("div");
  card.className = "plant-card";
  card.dataset.index = String(index);
  card.innerHTML = `
    <h3>Planta ${index}</h3>
    <div class="field">
      <label>Nombre propuesto</label>
      <input class="plant-name" required />
    </div>
    <div class="field">
      <label>Lugar / hábitat</label>
      <input class="plant-habitat" />
    </div>
    <div class="field">
      <label>Observaciones</label>
      <textarea class="plant-notes" rows="2"></textarea>
    </div>
    <div class="field">
      <label>Fotos</label>
      <input class="plant-photos" type="file" accept="image/*" multiple />
    </div>
  `;
  plantsContainer.appendChild(card);
}

addPlantBtn.addEventListener("click", addPlantCard);
addPlantCard();

async function readPlantCards() {
  const cards = Array.from(plantsContainer.querySelectorAll(".plant-card"));
  const plants = [];
  for (const card of cards) {
    const proposedName = card.querySelector(".plant-name").value.trim();
    if (!proposedName) continue;
    const habitat = card.querySelector(".plant-habitat").value.trim();
    const notes = card.querySelector(".plant-notes").value.trim();
    const fileInput = card.querySelector(".plant-photos");
    const plantId = uuid();

    const photoUrls = [];
    for (const file of fileInput.files) {
      const blob = await compressImage(file);
      const path = `submissions/pending-${plantId}/${uuid()}.jpg`;
      const url = await uploadPhoto(path, blob);
      photoUrls.push(url);
    }

    plants.push({
      id: plantId,
      proposedName,
      habitat,
      notes,
      photoUrls,
      assessment: { status: "pendiente", correctName: "", comment: "" },
    });
  }
  return plants;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "Enviando…";
  form.querySelector('button[type="submit"]').disabled = true;

  try {
    const user = await ensureAnonAuth();
    const plants = await readPlantCards();
    if (plants.length === 0) {
      throw new Error("Añade al menos una planta con nombre propuesto.");
    }

    const submissionId = uuid();
    const submission = {
      id: submissionId,
      studentAlias: document.getElementById("alias").value.trim(),
      institute: document.getElementById("institute").value.trim(),
      title: document.getElementById("title").value.trim(),
      date: document.getElementById("date").value || null,
      createdAt: new Date().toISOString(),
      authUid: user.uid,
      plants,
      assessment: { grade: null, teacherComment: "", updatedAt: null },
    };

    await setDoc(doc(db, "submissions", submissionId), submission);

    statusEl.textContent = "¡Conjunto enviado! Gracias.";
    form.reset();
    plantsContainer.innerHTML = "";
    plantCount = 0;
    addPlantCard();
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    form.querySelector('button[type="submit"]').disabled = false;
  }
});
