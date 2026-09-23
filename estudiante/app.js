import { ensureAnonAuth, uuid, compressImage, uploadPhoto, db } from "../app.js";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { isSubmissionComplete } from "../lib/completeness.js";
import { t } from "../i18n.js";

const params = new URLSearchParams(window.location.search);
const listCode = params.get("lista");
let activeList = null; // { listId, title, teacherText, plants: [{id, name}], published }

// Resolve anonymous auth once at page load; both loadActiveList() (for the
// speculative "show revealed photos" check) and the submit handler share this
// same resolved user instead of each calling ensureAnonAuth() independently.
const userReady = ensureAnonAuth();

async function loadActiveList() {
  try {
    if (!listCode) return;

    let snap;
    try {
      const q = query(collection(db, "plantLists"), where("code", "==", listCode));
      snap = await getDocs(q);
    } catch (err) {
      statusEl.textContent = t("listLoadError");
      form.hidden = true;
      return;
    }

    if (snap.empty) {
      statusEl.textContent = t("listInvalidLink");
      form.hidden = true;
      return;
    }

    const listDoc = snap.docs[0];
    activeList = { listId: listDoc.id, ...listDoc.data() };

    document.getElementById("form-title").textContent = activeList.title;
    document.getElementById("list-info").hidden = false;
    document.getElementById("list-title").textContent = activeList.title;
    document.getElementById("list-text").textContent = activeList.teacherText;
    document.getElementById("list-names").textContent = activeList.plants
      .map((p) => p.name)
      .join(", ");

    plantsContainer.innerHTML = "";
    plantCount = 0;
    for (const plant of activeList.plants) {
      addPlantCard(plant);
    }
    addPlantBtn.hidden = true;

    // Speculatively check whether this student already has a complete
    // submission for a now-published list (the normal "revisit after the
    // teacher publishes" flow). Silent no-op if not eligible yet: not
    // published, or no completed submission for this uid yet.
    try {
      const user = await userReady;
      await maybeShowResultPhotos(activeList.listId, user.uid);
    } catch {
      // Not eligible yet, or auth failed — leave the empty form as-is.
    }
  } finally {
    // Enable submit button after list loads (or if no list needed)
    document.querySelector('button[type="submit"]').disabled = false;
  }
}

const plantsContainer = document.getElementById("plants-container");
const addPlantBtn = document.getElementById("add-plant");
const form = document.getElementById("submission-form");
const statusEl = document.getElementById("status");

let plantCount = 0;

// Disable submit button until loadActiveList() finishes (prevents race condition with list-bound submissions)
form.querySelector('button[type="submit"]').disabled = true;

function addPlantCard(refPlant = null) {
  plantCount += 1;
  const index = plantCount;
  const card = document.createElement("div");
  card.className = "plant-card";
  card.dataset.index = String(index);
  if (refPlant) card.dataset.refPlantId = refPlant.id;
  card.innerHTML = `
    <h3>${refPlant ? refPlant.name : t("plantDefaultTitle", { n: index })}</h3>
    <div class="field">
      <label>${refPlant ? t("plantNameLabelRef") : t("plantNameLabelFree")}</label>
      <input class="plant-name" required />
    </div>
    <div class="field">
      <label>${t("plantHabitatLabel")}</label>
      <input class="plant-habitat" />
    </div>
    <div class="field">
      <label>${t("plantNotesLabel")}</label>
      <textarea class="plant-notes" rows="2"></textarea>
    </div>
    <div class="field">
      <label>${t("plantPhotosLabel")}</label>
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
      refPlantId: card.dataset.refPlantId || null,
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
  statusEl.textContent = t("sendingStatus");
  form.querySelector('button[type="submit"]').disabled = true;

  try {
    const user = await userReady;
    const plants = await readPlantCards();
    if (plants.length === 0) {
      throw new Error(t("errNoPlants"));
    }

    const submissionId = activeList
      ? `${activeList.listId}_${user.uid}`
      : `${user.uid}_${uuid()}`;

    const complete = activeList
      ? isSubmissionComplete(
          activeList.plants.map((p) => p.id),
          plants
        )
      : false;

    const submission = {
      id: submissionId,
      studentAlias: document.getElementById("alias").value.trim(),
      institute: document.getElementById("institute").value.trim(),
      title: document.getElementById("title").value.trim(),
      date: document.getElementById("date").value || null,
      createdAt: new Date().toISOString(),
      authUid: user.uid,
      listId: activeList ? activeList.listId : null,
      complete,
      plants,
      assessment: { grade: null, teacherComment: "", updatedAt: null },
    };

    await setDoc(doc(db, "submissions", submissionId), submission);

    statusEl.textContent = t("sentStatus");

    if (activeList) {
      // List-bound submission: hide form (one submission per student per list)
      form.hidden = true;
      if (complete) {
        await maybeShowResultPhotos(activeList.listId, user.uid);
      }
    } else {
      // Free-form submission: reset form for next entry
      form.reset();
      plantsContainer.innerHTML = "";
      plantCount = 0;
      addPlantCard();
    }
  } catch (err) {
    if (activeList && err.code === "permission-denied") {
      // A legitimate first-time create for a fresh uid never hits
      // permission-denied on a list-bound submission — this means the
      // student already has a submission doc for this list.
      statusEl.textContent = t("alreadySubmitted");
    } else {
      statusEl.textContent = t("errorPrefix") + err.message;
    }
  } finally {
    form.querySelector('button[type="submit"]').disabled = false;
  }
});

async function maybeShowResultPhotos(listId, uid) {
  const listSnap = await getDoc(doc(db, "plantLists", listId));
  if (!listSnap.exists() || listSnap.data().published !== true) return;

  let photosSnap;
  try {
    photosSnap = await getDoc(doc(db, "plantListPhotos", listId));
  } catch {
    return; // las reglas deniegan la lectura: no publicado todavía para este alumno
  }
  if (!photosSnap.exists()) return;

  const namesById = Object.fromEntries(
    activeList.plants.map((p) => [p.id, p.name])
  );
  const container = document.getElementById("result-photos-list");
  container.innerHTML = "";
  for (const plant of photosSnap.data().plants) {
    const block = document.createElement("div");
    block.innerHTML = `<h3>${namesById[plant.id] || ""}</h3>`;
    const grid = document.createElement("div");
    grid.className = "photo-grid";
    for (const url of plant.photoUrls) {
      const img = document.createElement("img");
      img.src = url;
      grid.appendChild(img);
    }
    block.appendChild(grid);
    container.appendChild(block);
  }
  document.getElementById("result-photos").hidden = false;
}

loadActiveList();
