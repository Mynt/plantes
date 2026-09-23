# Identificación de plantas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir y desplegar una app estática (GitHub Pages) con backend Firebase donde el alumnado entrega identificaciones de plantas (libres o ligadas a un listado del profesor) y el profesorado corrige, puntúa y gestiona listados de referencia con fotos ocultas hasta su publicación.

**Architecture:** Frontend vanilla JS (ES modules, sin build step) con tres páginas (portada, estudiante, profesor) que hablan directamente con Firebase Authentication, Cloud Firestore y Cloud Storage vía el SDK modular cargado por CDN. La lógica pura (generación de códigos, cálculo de "entrega completa") vive en `lib/` y se testea con `node --test`; el resto se verifica manualmente contra un proyecto Firebase real, siguiendo el plan de pruebas de la spec.

**Tech Stack:** HTML/CSS/JS vanilla, Firebase SDK modular v10.13.0 (Auth, Firestore, Storage) vía `https://www.gstatic.com/firebasejs/10.13.0/...`, Node.js ≥ 18 (`node --test`, `firebase-admin` para el script de alta de profesorado), Firebase CLI para desplegar reglas, GitHub Pages para hosting.

**Spec:** `/Users/juanvi/Documents/GitHub/plantes/docs/superpowers/specs/2026-09-23-identificacion-plantas-design.md`

## Global Constraints

- Firebase en tier gratuito Spark, sin cuenta de facturación (Blaze) — no usar Cloud Functions.
- Fotos: comprimidas en cliente antes de subir, límite 5 MB por archivo, solo `image/*`.
- Alumnado se identifica con alias, nunca nombre completo (privacidad de menores).
- Sin frameworks de frontend; JS vanilla con ES modules nativos del navegador.
- Firebase SDK modular v10.13.0 fijo en todos los ficheros (misma versión en todos los `import`).
- Node ≥ 18 para scripts (`node --test`, `firebase-admin`).
- ID de `submissions` determinista `{listId}_{authUid}` cuando la entrega está ligada a un listado; autogenerado si es libre.
- `plantLists` y `plantListPhotos` son documentos separados con el mismo `listId` — nunca mezclar fotos en `plantLists`.

---

## Task 1: Scaffolding del proyecto y portada

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `styles.css`
- Create: `index.html`
- Create: `README.md`

**Interfaces:**
- Produces: variables CSS compartidas (`--color-primary`, `--color-bg`, `--color-card`, `--radius`, `--spacing`) y clases `.card`, `.btn`, `.btn-primary`, `.field`, `.container` que usarán todas las páginas posteriores.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "identificacion-plantas",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/"
  },
  "devDependencies": {
    "firebase-admin": "^12.6.0"
  }
}
```

- [ ] **Step 2: Crear `.gitignore`**

```
node_modules/
serviceAccountKey.json
.firebase/
firebase-debug.log
firestore-debug.log
storage-debug.log
.DS_Store
```

- [ ] **Step 3: Crear `styles.css`**

```css
:root {
  --color-primary: #2f6f4f;
  --color-primary-dark: #234f38;
  --color-bg: #f5f7f3;
  --color-card: #ffffff;
  --color-text: #1f2a22;
  --color-muted: #5b6b60;
  --color-danger: #b3452f;
  --color-ok: #2f6f4f;
  --radius: 10px;
  --spacing: 1rem;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
}

.container {
  max-width: 780px;
  margin: 0 auto;
  padding: calc(var(--spacing) * 1.5) var(--spacing);
}

.card {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: calc(var(--spacing) * 1.25);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  margin-bottom: var(--spacing);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: var(--spacing);
}

.field label {
  font-weight: 600;
  font-size: 0.9rem;
}

.field input,
.field textarea,
.field select {
  padding: 0.6rem;
  border: 1px solid #cdd6cf;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
}

.btn {
  display: inline-block;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover { background: var(--color-primary-dark); }

.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.muted { color: var(--color-muted); font-size: 0.9rem; }
.status-ok { color: var(--color-ok); font-weight: 600; }
.status-bad { color: var(--color-danger); font-weight: 600; }

.plant-card {
  border: 1px solid #e1e7e2;
  border-radius: var(--radius);
  padding: var(--spacing);
  margin-bottom: var(--spacing);
}

.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.photo-grid img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
}
```

- [ ] **Step 4: Crear `index.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Identificación de plantas</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Identificación de plantas</h1>
      <p class="muted">
        Entrega tus fotos de plantas con la identificación propuesta, o
        entra al panel de profesorado para corregir y gestionar listados.
      </p>
      <p>
        <a class="btn btn-primary" href="estudiante/">Soy alumno/a</a>
        <a class="btn btn-secondary" href="profesor/">Soy profesor/a</a>
      </p>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 5: Crear `README.md` (esqueleto, se completa en la Tarea 11)**

```markdown
# Identificación de plantas

App estática (GitHub Pages) + Firebase para que el alumnado entregue
identificaciones de plantas y el profesorado las corrija.

Ver `docs/superpowers/specs/2026-09-23-identificacion-plantas-design.md`
para el diseño completo.

## Puesta en marcha

(Instrucciones completas en la Tarea 11 de
`docs/superpowers/plans/2026-09-23-identificacion-plantas.md`.)
```

- [ ] **Step 6: Verificación manual**

Abrir `index.html` directamente en el navegador (doble clic o
`open index.html`). Comprobar que se ve la portada con los dos botones
(los enlaces darán 404 hasta las tareas 5 y 7, es esperado).

- [ ] **Step 7: Commit**

```bash
cd "/Users/juanvi/Documents/GitHub/plantes"
git add package.json .gitignore styles.css index.html README.md
git commit -m "Scaffold project: shared styles and landing page"
```

---

## Task 2: Lógica pura — generación de código y cálculo de entrega completa

**Files:**
- Create: `lib/codegen.js`
- Create: `lib/completeness.js`
- Test: `test/codegen.test.js`
- Test: `test/completeness.test.js`

**Interfaces:**
- Produces: `generateListCode(length = 6): string` — código alfanumérico sin caracteres ambiguos, usado como `plantLists.code`.
- Produces: `isSubmissionComplete(requiredPlantIds: string[], submissionPlants: {refPlantId?: string, proposedName?: string}[]): boolean` — usado por `estudiante/app.js` al entregar y coherente con lo que las reglas de Firestore validan implícitamente vía el campo `complete` guardado.

- [ ] **Step 1: Escribir el test que falla para `codegen`**

Crear `test/codegen.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateListCode } from '../lib/codegen.js';

test('genera un código de la longitud pedida', () => {
  const code = generateListCode(6);
  assert.equal(code.length, 6);
});

test('usa solo el alfabeto permitido (sin 0/O/1/I ambiguos)', () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 50; i++) {
    const code = generateListCode(8);
    for (const char of code) {
      assert.ok(alphabet.includes(char), `carácter inesperado: ${char}`);
    }
  }
});

test('longitud por defecto es 6', () => {
  assert.equal(generateListCode().length, 6);
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node --test test/codegen.test.js`
Expected: FAIL — `lib/codegen.js` no existe todavía.

- [ ] **Step 3: Implementar `lib/codegen.js`**

```js
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateListCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * ALPHABET.length);
    code += ALPHABET[index];
  }
  return code;
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node --test test/codegen.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Escribir el test que falla para `completeness`**

Crear `test/completeness.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { isSubmissionComplete } from '../lib/completeness.js';

test('false si faltan plantas por responder', () => {
  const required = ['p1', 'p2', 'p3'];
  const submitted = [
    { refPlantId: 'p1', proposedName: 'Romero' },
    { refPlantId: 'p2', proposedName: 'Tomillo' },
  ];
  assert.equal(isSubmissionComplete(required, submitted), false);
});

test('true si todas las plantas requeridas tienen respuesta no vacía', () => {
  const required = ['p1', 'p2'];
  const submitted = [
    { refPlantId: 'p1', proposedName: 'Romero' },
    { refPlantId: 'p2', proposedName: 'Tomillo' },
  ];
  assert.equal(isSubmissionComplete(required, submitted), true);
});

test('false si la respuesta está en blanco', () => {
  const required = ['p1', 'p2'];
  const submitted = [
    { refPlantId: 'p1', proposedName: 'Romero' },
    { refPlantId: 'p2', proposedName: '   ' },
  ];
  assert.equal(isSubmissionComplete(required, submitted), false);
});

test('false si no hay plantas requeridas (listado vacío no cuenta como completo)', () => {
  assert.equal(isSubmissionComplete([], []), false);
});

test('ignora entregas duplicadas o de otras plantas', () => {
  const required = ['p1'];
  const submitted = [
    { refPlantId: 'p1', proposedName: 'Romero' },
    { refPlantId: 'otra-no-requerida', proposedName: 'Lavanda' },
  ];
  assert.equal(isSubmissionComplete(required, submitted), true);
});
```

- [ ] **Step 6: Ejecutar y comprobar que falla**

Run: `node --test test/completeness.test.js`
Expected: FAIL — `lib/completeness.js` no existe todavía.

- [ ] **Step 7: Implementar `lib/completeness.js`**

```js
export function isSubmissionComplete(requiredPlantIds, submissionPlants) {
  if (!requiredPlantIds || requiredPlantIds.length === 0) return false;

  const answered = new Set(
    submissionPlants
      .filter((p) => (p.proposedName || '').trim().length > 0)
      .map((p) => p.refPlantId)
  );

  return requiredPlantIds.every((id) => answered.has(id));
}
```

- [ ] **Step 8: Ejecutar todos los tests y comprobar que pasan**

Run: `npm test`
Expected: PASS (8 tests en total entre ambos ficheros)

- [ ] **Step 9: Commit**

```bash
git add lib/codegen.js lib/completeness.js test/codegen.test.js test/completeness.test.js
git commit -m "Add pure logic for list codes and submission completeness"
```

---

## Task 3: Crear el proyecto Firebase y el repositorio GitHub

Esta tarea no produce código; deja el entorno listo para que las tareas
siguientes puedan probarse contra servicios reales.

- [ ] **Step 1 (usuario): Crear el proyecto Firebase**

En https://console.firebase.google.com, con tu cuenta Google:
1. "Añadir proyecto" → nombre, por ejemplo `identificacion-plantas`.
2. Desactivar Google Analytics (no hace falta para este proyecto).
3. Dentro del proyecto: **Build → Authentication → Get started** → activar
   proveedores **Anónimo** y **Correo electrónico/contraseña**.
4. **Build → Firestore Database → Create database** → modo producción,
   región más cercana (ej. `eur3`).
5. **Build → Storage → Get started** → modo producción, misma región.
6. **Project settings (⚙) → General → Your apps → Web (`</>`)** → registrar
   una app web (nombre `plantes-web`), sin Firebase Hosting. Copiar el
   objeto `firebaseConfig` que se muestra.
7. **Project settings → Service accounts → Generate new private key** →
   descargar el JSON y guardarlo como
   `/Users/juanvi/Documents/GitHub/plantes/serviceAccountKey.json` (ya
   está en `.gitignore`, no se sube al repo).

Pega aquí (en el chat) el objeto `firebaseConfig` del paso 6 cuando lo
tengas — no es secreto, son claves públicas de cliente.

- [ ] **Step 2 (yo, con `gh`): Crear el repositorio GitHub**

```bash
gh auth switch --hostname github.com --user Mynt
cd "/Users/juanvi/Documents/GitHub/plantes"
gh repo create plantes --private --source=. --remote=origin
git push -u origin main
```

- [ ] **Step 3: Verificación**

Confirmar en https://github.com (cuenta Mynt) que el repositorio `plantes`
existe y tiene el primer commit. Confirmar en la consola Firebase que
Authentication (Anónimo + Email/contraseña), Firestore y Storage están
activos.

---

## Task 4: Módulo compartido de Firebase (`firebase-config.js` + `app.js`)

**Files:**
- Create: `firebase-config.js`
- Create: `app.js`

**Interfaces:**
- Produces: `app`, `auth`, `db`, `storage` (instancias Firebase inicializadas).
- Produces: `ensureAnonAuth(): Promise<User>` — resuelve con el usuario anónimo actual, iniciando sesión si hace falta.
- Produces: `uuid(): string`.
- Produces: `compressImage(file: File, maxDimension = 1280, quality = 0.75): Promise<Blob>`.
- Produces: `uploadPhoto(storagePath: string, blob: Blob): Promise<string>` — sube y devuelve la URL de descarga.
- Consumes: `firebaseConfig` desde `firebase-config.js` (rellenado con los valores reales obtenidos en la Tarea 3).

- [ ] **Step 1: Crear `firebase-config.js` con los valores reales**

Sustituir los valores de ejemplo por el `firebaseConfig` copiado en la
Tarea 3, Step 1.6:

```js
export const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "identificacion-plantas.firebaseapp.com",
  projectId: "identificacion-plantas",
  storageBucket: "identificacion-plantas.appspot.com",
  messagingSenderId: "PEGA_AQUI",
  appId: "PEGA_AQUI",
};
```

- [ ] **Step 2: Crear `app.js`**

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export function ensureAnonAuth() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
          return;
        }
        signInAnonymously(auth).catch((err) => {
          unsubscribe();
          reject(err);
        });
      },
      reject
    );
  });
}

export function uuid() {
  return crypto.randomUUID();
}

export function compressImage(file, maxDimension = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("No se pudo comprimir la imagen"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadPhoto(storagePath, blob) {
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(fileRef);
}
```

- [ ] **Step 3: Verificación manual**

Crear un fichero temporal `smoke-test.html` en la raíz (no se commitea):

```html
<!doctype html>
<script type="module">
  import { ensureAnonAuth } from "./app.js";
  ensureAnonAuth().then((user) => {
    document.body.textContent = "Auth anónima OK, uid: " + user.uid;
  }).catch((err) => {
    document.body.textContent = "ERROR: " + err.message;
  });
</script>
```

Servir la carpeta (`npx serve .` o `python3 -m http.server`) y abrir
`http://localhost:PUERTO/smoke-test.html`. Debe mostrar "Auth anónima OK,
uid: ...". Si da error de config, revisar `firebase-config.js`. Borrar
`smoke-test.html` al terminar.

- [ ] **Step 4: Commit**

```bash
git add firebase-config.js app.js
git commit -m "Add shared Firebase init module"
```

---

## Task 5: Formulario de estudiante — entrega libre (sin listado)

**Files:**
- Create: `estudiante/index.html`
- Create: `estudiante/app.js`

**Interfaces:**
- Consumes: `ensureAnonAuth`, `uuid`, `compressImage`, `uploadPhoto`, `db` desde `../app.js`.
- Produces: estructura de datos `submission` en Firestore (colección `submissions`) tal como la define la spec, sin `listId` ni `complete` en este flujo libre.

- [ ] **Step 1: Crear `estudiante/index.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Entregar identificación — Alumnado</title>
  <link rel="stylesheet" href="../styles.css" />
</head>
<body>
  <div class="container">
    <p><a href="../">&larr; Volver</a></p>

    <div id="list-info" class="card" hidden>
      <h1 id="list-title"></h1>
      <p id="list-text" class="muted"></p>
      <p class="muted">Plantas a identificar: <span id="list-names"></span></p>
    </div>

    <div id="result-photos" class="card" hidden>
      <h2>Fotos correctas</h2>
      <div id="result-photos-list"></div>
    </div>

    <form id="submission-form" class="card">
      <h1 id="form-title">Nuevo conjunto</h1>

      <div class="field">
        <label for="alias">Alias (no pongas tu nombre completo)</label>
        <input id="alias" name="alias" required />
      </div>
      <div class="field">
        <label for="institute">Instituto / centro</label>
        <input id="institute" name="institute" required />
      </div>
      <div class="field">
        <label for="title">Título del conjunto (opcional)</label>
        <input id="title" name="title" />
      </div>
      <div class="field">
        <label for="date">Fecha de observación</label>
        <input id="date" name="date" type="date" />
      </div>

      <div id="plants-container"></div>

      <button type="button" id="add-plant" class="btn btn-secondary">
        + Añadir planta
      </button>
      <hr />
      <button type="submit" class="btn btn-primary">Enviar conjunto</button>
      <p id="status" class="muted"></p>
    </form>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Crear `estudiante/app.js`**

```js
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
```

- [ ] **Step 3: Verificación manual**

Servir la carpeta (`npx serve .`), abrir `estudiante/`, rellenar alias,
instituto y una planta con una foto, enviar. En la consola Firebase →
Firestore, comprobar que aparece un documento en `submissions` con los
datos correctos y `photoUrls` con una URL válida; en Storage, comprobar
que la imagen subió bajo `submissions/pending-.../...jpg`.

- [ ] **Step 4: Commit**

```bash
git add estudiante/index.html estudiante/app.js
git commit -m "Add student free-form submission form"
```

---

## Task 6: Formulario de estudiante — flujo ligado a un listado (`?lista=CODE`)

**Files:**
- Modify: `estudiante/index.html` (ya tiene los bloques `list-info` y `result-photos`, sin cambios de marcado)
- Modify: `estudiante/app.js`

**Interfaces:**
- Consumes: `isSubmissionComplete` desde `../lib/completeness.js`.
- Consumes: colecciones `plantLists` (lectura pública) y `plantListPhotos` (lectura condicional) vía Firestore.
- Produces: entregas con `listId`, `complete` y plantas con `refPlantId`, guardadas con id determinista `{listId}_{authUid}`.

- [ ] **Step 1: Añadir resolución del listado al principio de `estudiante/app.js`**

Insertar tras los imports existentes (añadiendo `getDoc`, `getDocs`,
`collection`, `query`, `where` a la importación de firestore):

```js
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

const params = new URLSearchParams(window.location.search);
const listCode = params.get("lista");
let activeList = null; // { listId, title, teacherText, plants: [{id, name}], published }

async function loadActiveList() {
  if (!listCode) return;

  const q = query(collection(db, "plantLists"), where("code", "==", listCode));
  const snap = await getDocs(q);
  if (snap.empty) {
    statusEl.textContent = "El enlace del listado no es válido.";
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
}
```

- [ ] **Step 2: Adaptar `addPlantCard` para aceptar una planta de referencia opcional**

Reemplazar la función `addPlantCard` existente:

```js
function addPlantCard(refPlant = null) {
  plantCount += 1;
  const index = plantCount;
  const card = document.createElement("div");
  card.className = "plant-card";
  card.dataset.index = String(index);
  if (refPlant) card.dataset.refPlantId = refPlant.id;
  card.innerHTML = `
    <h3>${refPlant ? refPlant.name : "Planta " + index}</h3>
    <div class="field">
      <label>${refPlant ? "Tu identificación" : "Nombre propuesto"}</label>
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
```

- [ ] **Step 3: Adaptar `readPlantCards` para incluir `refPlantId` cuando aplica**

Reemplazar la línea que hace `plants.push({ ... })` dentro de
`readPlantCards` por:

```js
    plants.push({
      id: plantId,
      refPlantId: card.dataset.refPlantId || null,
      proposedName,
      habitat,
      notes,
      photoUrls,
      assessment: { status: "pendiente", correctName: "", comment: "" },
    });
```

- [ ] **Step 4: Reescribir el listener de `submit` para ramificar según `activeList`**

Reemplazar el cuerpo del `try` dentro del listener `form.addEventListener("submit", ...)`:

```js
    const user = await ensureAnonAuth();
    const plants = await readPlantCards();
    if (plants.length === 0) {
      throw new Error("Añade al menos una planta con nombre propuesto.");
    }

    const submissionId = activeList
      ? `${activeList.listId}_${user.uid}`
      : uuid();

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

    statusEl.textContent = "¡Conjunto enviado! Gracias.";
    form.hidden = true;

    if (activeList && complete) {
      await maybeShowResultPhotos(activeList.listId, user.uid);
    }
```

(Deja el `catch`/`finally` existentes tal cual.)

- [ ] **Step 5: Añadir `maybeShowResultPhotos` y llamar a `loadActiveList` al cargar**

Añadir al final de `estudiante/app.js`:

```js
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
```

- [ ] **Step 6: Verificación manual**

Necesita un listado ya creado en Firestore para probar — se puede crear
uno a mano desde la consola Firebase con esta estructura mínima antes de
que exista el panel de profesor (Tarea 8):

```
Colección plantLists, documento con ID "test-list-1":
{ code: "TEST01", title: "Prueba", teacherText: "Identifica estas 2 plantas",
  published: false, createdBy: "manual",
  plants: [ { id: "p1", name: "Romero" }, { id: "p2", name: "Tomillo" } ] }
```

Abrir `estudiante/?lista=TEST01`, comprobar que se ven el texto y los
nombres sin fotos, rellenar ambas plantas y enviar. Comprobar en Firestore
que el documento de `submissions` tiene id `test-list-1_<uid>`,
`listId: "test-list-1"` y `complete: true`. Recargar la página con el
mismo navegador (mismo uid anónimo): no debe verse ninguna foto porque
`published` es `false`. Cambiar `published` a `true` manualmente en la
consola, crear un documento `plantListPhotos/test-list-1` con
`{ plants: [{ id: "p1", photoUrls: ["https://..."] }, { id: "p2", photoUrls: [] }] }`,
recargar: ahora sí debe mostrarse la foto de Romero. Borrar el listado y
la entrega de prueba al terminar.

- [ ] **Step 7: Commit**

```bash
git add estudiante/app.js
git commit -m "Support list-bound submissions and reveal published photos"
```

---

## Task 7: Panel de profesorado — login y corrección

**Files:**
- Create: `profesor/index.html`
- Create: `profesor/app.js`

**Interfaces:**
- Consumes: `auth`, `db` desde `../app.js`.
- Consumes: custom claim `teacher` en el token del usuario (asignado en la Tarea 10).

- [ ] **Step 1: Crear `profesor/index.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Panel de profesorado</title>
  <link rel="stylesheet" href="../styles.css" />
</head>
<body>
  <div class="container">
    <p><a href="../">&larr; Volver</a> · <a href="listados.html">Gestionar listados</a></p>

    <form id="login-form" class="card">
      <h1>Acceso profesorado</h1>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" required />
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input id="password" type="password" required />
      </div>
      <button type="submit" class="btn btn-primary">Entrar</button>
      <p id="login-status" class="muted"></p>
    </form>

    <div id="panel" hidden>
      <div class="card">
        <button id="logout" class="btn btn-secondary">Cerrar sesión</button>
        <button id="export" class="btn btn-secondary">Exportar JSON</button>
      </div>
      <div id="submissions-list"></div>
    </div>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Crear `profesor/app.js`**

```js
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
```

- [ ] **Step 2: Verificación manual**

No puede verificarse por completo hasta tener una cuenta con claim
`teacher` (Tarea 10). De momento: abrir `profesor/`, intentar login con
un email cualquiera sin cuenta creada, comprobar que se muestra el error
de Firebase Auth (`auth/invalid-credential` o similar) — confirma que el
formulario y la llamada a `signInWithEmailAndPassword` funcionan. La
verificación completa del flujo de corrección se hace en la Tarea 10,
Step 3.

- [ ] **Step 3: Commit**

```bash
git add profesor/index.html profesor/app.js
git commit -m "Add teacher panel: login and submission review"
```

---

## Task 8: Panel de profesorado — gestión de listados de referencia

**Files:**
- Create: `profesor/listados.html`
- Create: `profesor/listados.js`

**Interfaces:**
- Consumes: `generateListCode` desde `../lib/codegen.js`.
- Consumes: `auth`, `db`, `uuid`, `compressImage`, `uploadPhoto` desde `../app.js`.
- Produces: documentos en `plantLists` y `plantListPhotos` como los define la spec.

- [ ] **Step 1: Crear `profesor/listados.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Listados de referencia — Profesorado</title>
  <link rel="stylesheet" href="../styles.css" />
</head>
<body>
  <div class="container">
    <p><a href="index.html">&larr; Panel de corrección</a></p>

    <form id="login-form" class="card">
      <h1>Acceso profesorado</h1>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" required />
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input id="password" type="password" required />
      </div>
      <button type="submit" class="btn btn-primary">Entrar</button>
      <p id="login-status" class="muted"></p>
    </form>

    <div id="panel" hidden>
      <form id="new-list-form" class="card">
        <h2>Nuevo listado</h2>
        <div class="field">
          <label>Título</label>
          <input id="new-title" required />
        </div>
        <div class="field">
          <label>Texto explicativo para el alumnado</label>
          <textarea id="new-text" rows="3" required></textarea>
        </div>
        <div class="field">
          <label>Nombres de planta (uno por línea)</label>
          <textarea id="new-plant-names" rows="4" required placeholder="Romero&#10;Tomillo&#10;Lavanda"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Crear listado</button>
        <p id="new-list-status" class="muted"></p>
      </form>

      <div id="lists-container"></div>
    </div>
  </div>

  <script type="module" src="listados.js"></script>
</body>
</html>
```

- [ ] **Step 2: Crear `profesor/listados.js`**

```js
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
      <h2>${list.title}</h2>
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
        <h3>${plant.name}</h3>
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
```

- [ ] **Step 3: Verificación manual**

(Se completa en la Tarea 10, cuando exista una cuenta con claim
`teacher`.) Comprobar que sin login no se puede ver el formulario de
creación (queda oculto tras `login-form`).

- [ ] **Step 4: Commit**

```bash
git add profesor/listados.html profesor/listados.js
git commit -m "Add teacher panel: reference plant lists management"
```

---

## Task 9: Reglas de seguridad de Firestore y Storage

**Files:**
- Create: `firestore.json` (parte de `firebase.json`, ver Step 1)
- Create: `firebase.json`
- Create: `firestore.rules`
- Create: `storage.rules`

- [ ] **Step 1: Crear `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

- [ ] **Step 2: Crear `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isTeacher() {
      return request.auth != null && request.auth.token.teacher == true;
    }

    match /submissions/{submissionId} {
      allow create: if request.auth != null
        && request.resource.data.authUid == request.auth.uid
        && (
          !('listId' in request.resource.data)
          || request.resource.data.listId == null
          || submissionId == request.resource.data.listId + '_' + request.auth.uid
        );
      allow read, update, delete: if isTeacher();
    }

    match /plantLists/{listId} {
      allow read: if true;
      allow write: if isTeacher();
    }

    match /plantListPhotos/{listId} {
      allow read: if request.auth != null
        && get(/databases/$(database)/documents/plantLists/$(listId)).data.published == true
        && exists(/databases/$(database)/documents/submissions/$(listId + '_' + request.auth.uid))
        && get(/databases/$(database)/documents/submissions/$(listId + '_' + request.auth.uid)).data.complete == true;
      allow write: if isTeacher();
    }
  }
}
```

- [ ] **Step 3: Crear `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isTeacher() {
      return request.auth != null && request.auth.token.teacher == true;
    }

    match /submissions/{allPaths=**} {
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow read: if true;
    }

    match /plantLists/{listId}/{allPaths=**} {
      allow write: if isTeacher()
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow read: if request.auth != null
        && firestore.get(/databases/(default)/documents/plantLists/$(listId)).data.published == true
        && firestore.exists(/databases/(default)/documents/submissions/$(listId + '_' + request.auth.uid))
        && firestore.get(/databases/(default)/documents/submissions/$(listId + '_' + request.auth.uid)).data.complete == true;
    }
  }
}
```

- [ ] **Step 4: Instalar Firebase CLI y desplegar las reglas**

```bash
cd "/Users/juanvi/Documents/GitHub/plantes"
npx firebase-tools login
npx firebase-tools use --add   # elegir el proyecto creado en la Tarea 3
npx firebase-tools deploy --only firestore:rules,storage:rules
```

`login` abrirá el navegador para autenticación OAuth interactiva del
usuario (paso manual suyo, no puede automatizarse).

- [ ] **Step 5: Verificación manual — reglas denegando correctamente**

Con la app de alumno abierta (sin login de profesor) y las DevTools del
navegador abiertas, ejecutar en la consola:

```js
import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js")
  .then(async ({ getFirestore, collection, getDocs }) => {
    const { db } = await import("./app.js");
    try {
      await getDocs(collection(db, "submissions"));
      console.log("FALLO: debería haber denegado la lectura");
    } catch (e) {
      console.log("OK, denegado:", e.code);
    }
  });
```

Debe imprimir `OK, denegado: permission-denied`. Repetir el flujo manual
de la Tarea 6, Step 6 (listado no publicado → sin fotos; publicado →
fotos visibles) para confirmar que las reglas nuevas siguen funcionando
igual que con los datos creados a mano.

- [ ] **Step 6: Commit**

```bash
git add firebase.json firestore.rules storage.rules
git commit -m "Add Firestore and Storage security rules"
```

---

## Task 10: Alta de la primera cuenta de profesorado

**Files:**
- Create: `scripts/set-teacher-claim.js`
- Modify: `package.json` (añadir `firebase-admin` si no se instaló ya en la Tarea 1)

**Interfaces:**
- Consumes: `serviceAccountKey.json` (creado en la Tarea 3, ignorado por git).

- [ ] **Step 1: Crear `scripts/set-teacher-claim.js`**

```js
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";

const [, , email] = process.argv;
if (!email) {
  console.error("Uso: node scripts/set-teacher-claim.js <email>");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  readFileSync(new URL("../serviceAccountKey.json", import.meta.url))
);

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { teacher: true });

console.log(`Claim teacher=true asignado a ${email} (uid ${user.uid}).`);
console.log(
  "El profesor debe cerrar sesión y volver a entrar para que el claim tenga efecto."
);
```

- [ ] **Step 2: Instalar dependencias**

```bash
cd "/Users/juanvi/Documents/GitHub/plantes"
npm install
```

- [ ] **Step 3 (usuario): Crear la cuenta de profesorado y asignar el claim**

1. En la consola Firebase → Authentication → Users → Add user: email y
   contraseña de la primera cuenta de profesor.
2. Ejecutar:

```bash
node scripts/set-teacher-claim.js el-email-del-profesor@example.com
```

- [ ] **Step 4: Verificación manual — flujo de profesorado completo**

Abrir `profesor/`, entrar con esa cuenta, comprobar que aparece el panel
(no el mensaje de "sin permisos"). Corregir el conjunto entregado en la
Tarea 5/6, guardar, recargar y comprobar que la corrección persiste.
Abrir `profesor/listados.html`, crear un listado real, subir una foto de
referencia a una planta, copiar el enlace y repetir el flujo de la Tarea
6 con datos reales (ya no hace falta crear el listado a mano en la
consola). Publicar el listado y confirmar que el alumno ve la foto.

- [ ] **Step 5: Commit**

```bash
git add scripts/set-teacher-claim.js package.json package-lock.json
git commit -m "Add script to grant the teacher custom claim"
```

---

## Task 11: GitHub Pages y README final

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Activar GitHub Pages**

En GitHub (repo `plantes`, cuenta Mynt) → Settings → Pages → Source:
"Deploy from a branch" → Branch `main` / `(root)` → Save. Anotar la URL
pública que muestra GitHub (tarda 1-2 minutos en estar lista).

- [ ] **Step 2: Completar `README.md`**

```markdown
# Identificación de plantas

App estática (GitHub Pages) + Firebase para que el alumnado entregue
identificaciones de plantas y el profesorado las corrija, puntúe y
gestione listados de referencia con fotos ocultas hasta su publicación.

Ver el diseño completo en
`docs/superpowers/specs/2026-09-23-identificacion-plantas-design.md`.

## Estructura

- `estudiante/` — formulario de entrega (libre o `?lista=CODE`)
- `profesor/` — panel de corrección (`index.html`) y gestión de listados
  (`listados.html`)
- `lib/` — lógica pura, testeada con `node --test`
- `scripts/set-teacher-claim.js` — da de alta a un profesor

## Desarrollo local

```bash
npm install
npm test               # tests de lib/
npx serve .             # sirve la app en http://localhost:3000
```

## Puesta en marcha desde cero

1. Crear un proyecto en https://console.firebase.google.com, activar
   Authentication (Anónimo + Email/contraseña), Firestore y Storage.
2. Copiar el `firebaseConfig` de la app web registrada a
   `firebase-config.js`.
3. Descargar una clave de servicio (Project settings → Service accounts)
   como `serviceAccountKey.json` en la raíz del repo (no se sube a git).
4. `npx firebase-tools login && npx firebase-tools use --add`
5. `npx firebase-tools deploy --only firestore:rules,storage:rules`
6. Crear la cuenta de profesorado en Authentication → Users, y ejecutar
   `node scripts/set-teacher-claim.js <email>`.
7. Activar GitHub Pages: Settings → Pages → Deploy from branch `main` /
   `(root)`.

## Privacidad

El alumnado se identifica con alias, nunca con su nombre completo. Las
fotos deben ser de plantas, no de personas.
```

- [ ] **Step 3: Verificación manual — smoke test en producción**

Abrir la URL pública de GitHub Pages. Repetir un flujo completo (entrega
libre, entrega ligada a listado, corrección de profesor, publicación de
fotos) contra la URL real, no en local.

- [ ] **Step 4: Commit y push**

```bash
git add README.md
git commit -m "Complete README with deployment instructions"
git push
```
