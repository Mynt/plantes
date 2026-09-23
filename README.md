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
