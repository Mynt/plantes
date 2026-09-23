import { auth, db } from "../app.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const panel = document.getElementById("panel");
const submissionsList = document.getElementById("submissions-list");

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

document.getElementById("logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginForm.hidden = false;
    panel.hidden = true;
    return;
  }
  const token = await user.getIdTokenResult();
  if (!token.claims.teacher) {
    loginStatus.textContent =
      "Esta cuenta no tiene permisos de profesorado.";
    await signOut(auth);
    return;
  }
  loginForm.hidden = true;
  panel.hidden = false;
  await renderSubmissions();
});

async function renderSubmissions() {
  submissionsList.innerHTML = "Cargando…";
  const snap = await getDocs(collection(db, "submissions"));
  submissionsList.innerHTML = "";

  snap.forEach((docSnap) => {
    const submission = docSnap.data();
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2>${submission.title || "(sin título)"} — ${submission.studentAlias}</h2>
      <p class="muted">${submission.institute} · ${submission.date || ""}</p>
      <div class="plants"></div>
      <div class="field">
        <label>Nota final (0-10)</label>
        <input type="number" min="0" max="10" class="grade-input" value="${submission.assessment?.grade ?? ""}" />
      </div>
      <div class="field">
        <label>Comentario general</label>
        <textarea class="teacher-comment" rows="2">${submission.assessment?.teacherComment || ""}</textarea>
      </div>
      <button class="btn btn-primary save-btn">Guardar corrección</button>
      <p class="save-status muted"></p>
    `;

    const plantsEl = card.querySelector(".plants");
    submission.plants.forEach((plant, idx) => {
      const plantCard = document.createElement("div");
      plantCard.className = "plant-card";
      plantCard.dataset.plantIndex = String(idx);
      plantCard.innerHTML = `
        <h3>${plant.proposedName}</h3>
        <p class="muted">${plant.habitat || ""} — ${plant.notes || ""}</p>
        <div class="photo-grid">
          ${plant.photoUrls.map((url) => `<img src="${url}" />`).join("")}
        </div>
        <div class="field">
          <label>Estado</label>
          <select class="assessment-status">
            <option value="pendiente" ${plant.assessment.status === "pendiente" ? "selected" : ""}>Pendiente</option>
            <option value="correcto" ${plant.assessment.status === "correcto" ? "selected" : ""}>Correcto</option>
            <option value="incorrecto" ${plant.assessment.status === "incorrecto" ? "selected" : ""}>Incorrecto</option>
          </select>
        </div>
        <div class="field">
          <label>Nombre correcto</label>
          <input class="assessment-correct-name" value="${plant.assessment.correctName || ""}" />
        </div>
        <div class="field">
          <label>Comentario</label>
          <input class="assessment-comment" value="${plant.assessment.comment || ""}" />
        </div>
      `;
      plantsEl.appendChild(plantCard);
    });

    card.querySelector(".save-btn").addEventListener("click", async () => {
      const statusEl = card.querySelector(".save-status");
      statusEl.textContent = "Guardando…";

      const updatedPlants = submission.plants.map((plant, idx) => {
        const plantCard = plantsEl.querySelector(
          `[data-plant-index="${idx}"]`
        );
        return {
          ...plant,
          assessment: {
            status: plantCard.querySelector(".assessment-status").value,
            correctName: plantCard.querySelector(".assessment-correct-name").value.trim(),
            comment: plantCard.querySelector(".assessment-comment").value.trim(),
          },
        };
      });

      const grade = card.querySelector(".grade-input").value;

      try {
        await updateDoc(doc(db, "submissions", docSnap.id), {
          plants: updatedPlants,
          assessment: {
            grade: grade === "" ? null : Number(grade),
            teacherComment: card.querySelector(".teacher-comment").value.trim(),
            updatedAt: new Date().toISOString(),
          },
        });
        statusEl.textContent = "Guardado.";
      } catch (err) {
        statusEl.textContent = "Error: " + err.message;
      }
    });

    submissionsList.appendChild(card);
  });
}

document.getElementById("export").addEventListener("click", async () => {
  const snap = await getDocs(collection(db, "submissions"));
  const data = snap.docs.map((d) => d.data());
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "submissions.json";
  a.click();
  URL.revokeObjectURL(url);
});
