import { auth, db } from "../app.js";
import { t } from "../i18n.js";
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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = t("loggingInStatus");
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value.trim(),
      document.getElementById("password").value
    );
  } catch (err) {
    loginStatus.textContent = t("errorPrefix") + err.message;
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
    loginStatus.textContent = t("notTeacherError");
    await signOut(auth);
    return;
  }
  loginForm.hidden = true;
  panel.hidden = false;
  await renderSubmissions();
});

async function renderSubmissions() {
  submissionsList.innerHTML = t("loadingStatus");
  const snap = await getDocs(collection(db, "submissions"));
  submissionsList.innerHTML = "";

  snap.forEach((docSnap) => {
    try {
      const submission = docSnap.data();
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h2>${escapeHtml(submission.title) || t("noTitle")} — ${escapeHtml(submission.studentAlias)}</h2>
        <p class="muted">${escapeHtml(submission.institute)} · ${escapeHtml(submission.date || "")}</p>
        <div class="plants"></div>
        <div class="field">
          <label>${t("gradeLabel")}</label>
          <input type="number" min="0" max="10" class="grade-input" value="${escapeHtml(submission.assessment?.grade ?? "")}" />
        </div>
        <div class="field">
          <label>${t("generalCommentLabel")}</label>
          <textarea class="teacher-comment" rows="2">${escapeHtml(submission.assessment?.teacherComment || "")}</textarea>
        </div>
        <button class="btn btn-primary save-btn">${t("saveBtn")}</button>
        <p class="save-status muted"></p>
      `;

      const plantsEl = card.querySelector(".plants");
      const plants = Array.isArray(submission.plants) ? submission.plants : [];
      plants.forEach((plant, idx) => {
        const assessment = plant.assessment || {};
        const photoUrls = Array.isArray(plant.photoUrls) ? plant.photoUrls : [];
        const plantCard = document.createElement("div");
        plantCard.className = "plant-card";
        plantCard.dataset.plantIndex = String(idx);
        plantCard.innerHTML = `
          <h3>${escapeHtml(plant.proposedName)}</h3>
          <p class="muted">${escapeHtml(plant.habitat || "")} — ${escapeHtml(plant.notes || "")}</p>
          <div class="photo-grid"></div>
          <div class="field">
            <label>${t("statusLabel")}</label>
            <select class="assessment-status">
              <option value="pendiente" ${assessment.status === "pendiente" ? "selected" : ""}>${t("statusPending")}</option>
              <option value="correcto" ${assessment.status === "correcto" ? "selected" : ""}>${t("statusCorrect")}</option>
              <option value="incorrecto" ${assessment.status === "incorrecto" ? "selected" : ""}>${t("statusIncorrect")}</option>
            </select>
          </div>
          <div class="field">
            <label>${t("correctNameLabel")}</label>
            <input class="assessment-correct-name" value="${escapeHtml(assessment.correctName || "")}" />
          </div>
          <div class="field">
            <label>${t("commentLabel")}</label>
            <input class="assessment-comment" value="${escapeHtml(assessment.comment || "")}" />
          </div>
        `;
        const photoGrid = plantCard.querySelector(".photo-grid");
        for (const url of photoUrls) {
          const img = document.createElement("img");
          img.src = url;
          photoGrid.appendChild(img);
        }
        plantsEl.appendChild(plantCard);
      });

      card.querySelector(".save-btn").addEventListener("click", async () => {
        const statusEl = card.querySelector(".save-status");
        statusEl.textContent = t("savingStatus");

        const updatedPlants = plants.map((plant, idx) => {
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
          statusEl.textContent = t("savedStatus");
        } catch (err) {
          statusEl.textContent = t("errorPrefix") + err.message;
        }
      });

      submissionsList.appendChild(card);
    } catch (err) {
      console.error("Error al renderizar la entrega", docSnap.id, err);
    }
  });
}

window.addEventListener("langchange", () => {
  if (!panel.hidden) renderSubmissions();
});

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
