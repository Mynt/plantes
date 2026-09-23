import { auth, db, uuid, compressImage, uploadPhoto } from "../app.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { generateListCode } from "../lib/codegen.js";

const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const panel = document.getElementById("panel");
const newListForm = document.getElementById("new-list-form");
const listsContainer = document.getElementById("lists-container");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Entrando…";
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value.trim(),
      document.getElementById("password").value
    );
  } catch (err) {
    loginStatus.textContent = "Error: " + err.message;
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginForm.hidden = false;
    panel.hidden = true;
    return;
  }
  const token = await user.getIdTokenResult();
  if (!token.claims.teacher) {
    loginStatus.textContent = "Esta cuenta no tiene permisos de profesorado.";
    await signOut(auth);
    return;
  }
  loginForm.hidden = true;
  panel.hidden = false;
  await renderLists();
});

newListForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const statusEl = document.getElementById("new-list-status");
  statusEl.textContent = "Creando…";

  try {
    const listId = uuid();
    const code = generateListCode();
    const plantNames = document
      .getElementById("new-plant-names")
      .value.split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (plantNames.length === 0) {
      throw new Error("Añade al menos un nombre de planta.");
    }

    const plants = plantNames.map((name) => ({ id: uuid(), name }));

    await setDoc(doc(db, "plantLists", listId), {
      listId,
      code,
      title: document.getElementById("new-title").value.trim(),
      teacherText: document.getElementById("new-text").value.trim(),
      published: false,
      createdBy: auth.currentUser.uid,
      plants,
    });

    await setDoc(doc(db, "plantListPhotos", listId), {
      listId,
      plants: plants.map((p) => ({ id: p.id, photoUrls: [] })),
    });

    newListForm.reset();
    statusEl.textContent = "Listado creado.";
    await renderLists();
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  }
});

async function renderLists() {
  listsContainer.innerHTML = "Cargando…";
  const snap = await getDocs(collection(db, "plantLists"));
  listsContainer.innerHTML = "";

  for (const listDoc of snap.docs) {
    const list = { listId: listDoc.id, ...listDoc.data() };
    const photosDoc = await getDoc(doc(db, "plantListPhotos", list.listId));
    const photosById = Object.fromEntries(
      (photosDoc.data()?.plants || []).map((p) => [p.id, p.photoUrls])
    );

    const submissionsSnap = await getDocs(
      query(collection(db, "submissions"), where("listId", "==", list.listId))
    );
    const total = submissionsSnap.size;
    const complete = submissionsSnap.docs.filter(
      (d) => d.data().complete === true
    ).length;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2>${escapeHtml(list.title)}</h2>
      <p class="muted">Enlace: <code>estudiante/?lista=${list.code}</code>
        · <button class="btn btn-secondary copy-link">Copiar enlace</button>
      </p>
      <p class="muted">Entregas: ${complete} completas de ${total} recibidas.</p>
      <p>${list.published ? '<span class="status-ok">Publicado</span>' : '<span class="status-bad">No publicado</span>'}</p>
      <button class="btn btn-primary toggle-publish">
        ${list.published ? "Despublicar" : "Publicar fotos"}
      </button>
      <div class="plants"></div>
    `;

    const plantsEl = card.querySelector(".plants");
    list.plants.forEach((plant) => {
      const plantCard = document.createElement("div");
      plantCard.className = "plant-card";
      plantCard.innerHTML = `
        <h3>${escapeHtml(plant.name)}</h3>
        <div class="photo-grid">
          ${(photosById[plant.id] || [])
            .map((url) => `<img src="${url}" />`)
            .join("")}
        </div>
        <input type="file" class="photo-input" accept="image/*" multiple />
        <button class="btn btn-secondary upload-photos">Subir fotos</button>
      `;
      plantCard.querySelector(".upload-photos").addEventListener(
        "click",
        async () => {
          const fileInput = plantCard.querySelector(".photo-input");
          const newUrls = [];
          for (const file of fileInput.files) {
            const blob = await compressImage(file);
            const path = `plantLists/${list.listId}/${plant.id}/${uuid()}.jpg`;
            newUrls.push(await uploadPhoto(path, blob));
          }
          const current = photosDoc.data().plants.map((p) =>
            p.id === plant.id
              ? { ...p, photoUrls: [...p.photoUrls, ...newUrls] }
              : p
          );
          await updateDoc(doc(db, "plantListPhotos", list.listId), {
            plants: current,
          });
          await renderLists();
        }
      );
      plantsEl.appendChild(plantCard);
    });

    card.querySelector(".copy-link").addEventListener("click", () => {
      const url = `${location.origin}${location.pathname.replace(
        "profesor/listados.html",
        "estudiante/"
      )}?lista=${list.code}`;
      navigator.clipboard.writeText(url);
    });

    card.querySelector(".toggle-publish").addEventListener("click", async () => {
      await updateDoc(doc(db, "plantLists", list.listId), {
        published: !list.published,
      });
      await renderLists();
    });

    listsContainer.appendChild(card);
  }
}
