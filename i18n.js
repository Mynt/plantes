const STORAGE_KEY = "lang";

const dict = {
  es: {
    // Compartido
    backLink: "← Volver",
    loginHeading: "Acceso profesorado",
    emailLabel: "Email",
    passwordLabel: "Contraseña",
    loginBtn: "Entrar",
    loggingInStatus: "Entrando…",
    notTeacherError: "Esta cuenta no tiene permisos de profesorado.",
    loadingStatus: "Cargando…",
    errorPrefix: "Error: ",

    // index.html
    indexTitle: "Identificación de plantas",
    indexHeading: "Identificación de plantas",
    indexIntro:
      "Entrega tus fotos de plantas con la identificación propuesta, o entra al panel de profesorado para corregir y gestionar listados.",
    indexBtnStudent: "Soy alumno/a",
    indexBtnTeacher: "Soy profesor/a",

    // estudiante/index.html + app.js
    estudianteTitle: "Entregar identificación — Alumnado",
    resultPhotosHeading: "Fotos correctas",
    plantsToIdentifyLabel: "Plantas a identificar:",
    newSetTitle: "Nuevo conjunto",
    aliasLabel: "Alias (no pongas tu nombre completo)",
    instituteLabel: "Instituto / centro",
    titleLabel: "Título del conjunto (opcional)",
    dateLabel: "Fecha de observación",
    privacyWarning:
      "Las fotos deben ser solo de plantas. No incluyas personas reconocibles.",
    addPlantBtn: "+ Añadir planta",
    submitBtn: "Enviar conjunto",
    plantDefaultTitle: "Planta {n}",
    plantNameLabelRef: "Tu identificación",
    plantNameLabelFree: "Nombre propuesto",
    plantHabitatLabel: "Lugar / hábitat",
    plantNotesLabel: "Observaciones",
    plantPhotosLabel: "Fotos",
    listLoadError: "No se pudo cargar el listado. Comprueba tu conexión.",
    listInvalidLink: "El enlace del listado no es válido.",
    errNoPlants: "Añade al menos una planta con nombre propuesto.",
    sendingStatus: "Enviando…",
    sentStatus: "¡Conjunto enviado! Gracias.",
    alreadySubmitted: "Ya has entregado tu identificación para este listado.",

    // profesor/index.html + app.js
    profesorTitle: "Panel de profesorado",
    manageListsLink: "Gestionar listados",
    logoutBtn: "Cerrar sesión",
    exportBtn: "Exportar JSON",
    noTitle: "(sin título)",
    gradeLabel: "Nota final (0-10)",
    generalCommentLabel: "Comentario general",
    saveBtn: "Guardar corrección",
    savingStatus: "Guardando…",
    savedStatus: "Guardado.",
    statusLabel: "Estado",
    statusPending: "Pendiente",
    statusCorrect: "Correcto",
    statusIncorrect: "Incorrecto",
    correctNameLabel: "Nombre correcto",
    commentLabel: "Comentario",

    // profesor/listados.html + listados.js
    listadosTitle: "Listados de referencia — Profesorado",
    backToPanelLink: "← Panel de corrección",
    newListHeading: "Nuevo listado",
    listTitleLabel: "Título",
    explanatoryTextLabel: "Texto explicativo para el alumnado",
    plantNamesLabel: "Nombres de planta (uno por línea)",
    plantNamesPlaceholder: "Romero\nTomillo\nLavanda",
    createListBtn: "Crear listado",
    creatingStatus: "Creando…",
    errNoPlantNames: "Añade al menos un nombre de planta.",
    listCreatedStatus: "Listado creado.",
    linkLabel: "Enlace:",
    copyLinkBtn: "Copiar enlace",
    submissionsCountText: "Entregas: {complete} completas de {total} recibidas.",
    publishedStatus: "Publicado",
    unpublishedStatus: "No publicado",
    unpublishBtn: "Despublicar",
    publishBtn: "Publicar fotos",
    uploadPhotosBtn: "Subir fotos",
  },
  ca: {
    backLink: "← Torna",
    loginHeading: "Accés professorat",
    emailLabel: "Correu electrònic",
    passwordLabel: "Contrasenya",
    loginBtn: "Entra",
    loggingInStatus: "Entrant…",
    notTeacherError: "Aquest compte no té permisos de professorat.",
    loadingStatus: "Carregant…",
    errorPrefix: "Error: ",

    indexTitle: "Identificació de plantes",
    indexHeading: "Identificació de plantes",
    indexIntro:
      "Lliura les teves fotos de plantes amb la identificació proposada, o entra al panell de professorat per corregir i gestionar llistats.",
    indexBtnStudent: "Sóc alumne/a",
    indexBtnTeacher: "Sóc professor/a",

    estudianteTitle: "Lliurar identificació — Alumnat",
    resultPhotosHeading: "Fotos correctes",
    plantsToIdentifyLabel: "Plantes a identificar:",
    newSetTitle: "Nou conjunt",
    aliasLabel: "Àlies (no posis el teu nom complet)",
    instituteLabel: "Institut / centre",
    titleLabel: "Títol del conjunt (opcional)",
    dateLabel: "Data d'observació",
    privacyWarning:
      "Les fotos han de ser només de plantes. No hi incloguis persones reconeixibles.",
    addPlantBtn: "+ Afegeix planta",
    submitBtn: "Envia el conjunt",
    plantDefaultTitle: "Planta {n}",
    plantNameLabelRef: "La teva identificació",
    plantNameLabelFree: "Nom proposat",
    plantHabitatLabel: "Lloc / hàbitat",
    plantNotesLabel: "Observacions",
    plantPhotosLabel: "Fotos",
    listLoadError: "No s'ha pogut carregar el llistat. Comprova la connexió.",
    listInvalidLink: "L'enllaç del llistat no és vàlid.",
    errNoPlants: "Afegeix com a mínim una planta amb nom proposat.",
    sendingStatus: "Enviant…",
    sentStatus: "Conjunt enviat! Gràcies.",
    alreadySubmitted: "Ja has lliurat la teva identificació per a aquest llistat.",

    profesorTitle: "Panell de professorat",
    manageListsLink: "Gestiona llistats",
    logoutBtn: "Tanca sessió",
    exportBtn: "Exporta JSON",
    noTitle: "(sense títol)",
    gradeLabel: "Nota final (0-10)",
    generalCommentLabel: "Comentari general",
    saveBtn: "Desa la correcció",
    savingStatus: "Desant…",
    savedStatus: "Desat.",
    statusLabel: "Estat",
    statusPending: "Pendent",
    statusCorrect: "Correcte",
    statusIncorrect: "Incorrecte",
    correctNameLabel: "Nom correcte",
    commentLabel: "Comentari",

    listadosTitle: "Llistats de referència — Professorat",
    backToPanelLink: "← Panell de correcció",
    newListHeading: "Nou llistat",
    listTitleLabel: "Títol",
    explanatoryTextLabel: "Text explicatiu per a l'alumnat",
    plantNamesLabel: "Noms de planta (un per línia)",
    plantNamesPlaceholder: "Romaní\nFarigola\nLavanda",
    createListBtn: "Crea el llistat",
    creatingStatus: "Creant…",
    errNoPlantNames: "Afegeix com a mínim un nom de planta.",
    listCreatedStatus: "Llistat creat.",
    linkLabel: "Enllaç:",
    copyLinkBtn: "Copia l'enllaç",
    submissionsCountText: "Entregues: {complete} completes de {total} rebudes.",
    publishedStatus: "Publicat",
    unpublishedStatus: "No publicat",
    unpublishBtn: "Despublica",
    publishBtn: "Publica les fotos",
    uploadPhotosBtn: "Puja fotos",
  },
};

function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "ca") return saved;
  } catch {
    // localStorage no disponible: seguimos con la detección del navegador
  }
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("ca") ? "ca" : "es";
}

let currentLang = detectLang();

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage no disponible: el idioma solo dura la visita actual
  }
  applyTranslations();
  window.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

export function t(key, vars) {
  let str = dict[currentLang]?.[key] ?? dict.es[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.replaceAll(`{${name}}`, value);
    }
  }
  return str;
}

export function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}

export function renderLangSwitcher(container) {
  container.className = "lang-switch";
  container.innerHTML = "";
  for (const lang of ["ca", "es"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = lang.toUpperCase();
    btn.dataset.lang = lang;
    btn.addEventListener("click", () => setLang(lang));
    container.appendChild(btn);
  }
  applyTranslations();
}
