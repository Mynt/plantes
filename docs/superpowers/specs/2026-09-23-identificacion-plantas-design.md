# Identificación de plantas — diseño

Fecha: 2026-09-23

## Objetivo

Aplicación web estática para que alumnado entregue conjuntos de fotografías de
plantas junto a sus identificaciones propuestas. El profesorado revisa cada
conjunto, marca las identificaciones como correctas o incorrectas, escribe el
nombre correcto, comentarios y una nota final.

## Arquitectura

- **Frontend:** HTML, CSS y JavaScript sin dependencias, alojado en GitHub
  Pages.
- **Backend:** Firebase (tier gratuito Spark) — Authentication, Cloud
  Firestore, Cloud Storage.
- **Hosting del código:** GitHub Pages sirviendo directamente desde la rama
  `main`.

## Estructura del repositorio

```
plantes/
├─ index.html                 Portada y accesos
├─ styles.css                 Estilos comunes y diseño adaptable
├─ firebase-config.js         Config pública de Firebase (no secreta)
├─ app.js                     Utilidades compartidas: init Firebase,
│                             compresión de imágenes, helpers Firestore/Storage
├─ estudiante/
│  └─ index.html              Formulario para crear y enviar conjuntos
├─ profesor/
│  └─ index.html              Panel para revisar, corregir y puntuar
├─ firebase.json               Configuración del proyecto Firebase
├─ firestore.rules             Reglas de seguridad de Firestore
├─ storage.rules               Reglas de seguridad de Storage
├─ scripts/
│  └─ set-teacher-claim.js     Script Node para dar de alta a un profesor
├─ arquitectura.txt            Documentación previa (referencia)
└─ README.md                  Puesta en marcha y despliegue
```

## Interfaz del estudiante

Auth anónima de Firebase al cargar la página (silenciosa, sin formulario de
login). El formulario recoge:

- Alias de la persona que entrega el conjunto (no nombre real completo, por
  privacidad de menores).
- Instituto o centro educativo.
- Título opcional del conjunto y fecha de observación.
- Varias fichas de planta: nombre propuesto, lugar/hábitat, observaciones y
  una o más fotos.

Al enviar: las imágenes se comprimen y redimensionan en el navegador antes de
subirse a Storage; el documento se crea en Firestore con `status: pendiente`
en cada planta. Una vez creado, el alumnado **no puede editarlo ni leerlo de
nuevo** (evita fraudes tipo "corregir después de ver la nota").

## Interfaz del profesorado

Login con email/contraseña (cuentas dadas de alta manualmente por el
administrador, ver despliegue). El panel muestra todos los conjuntos
guardados, con autor y centro. Para cada planta permite:

- Marcar la propuesta como correcta o incorrecta.
- Escribir el nombre correcto o aceptado.
- Añadir una observación de corrección.
- Asignar una nota de 0 a 10 al conjunto completo.
- Guardar la corrección (actualiza el documento en Firestore).
- Exportar todos los conjuntos a JSON.

## Modelo de datos (Firestore)

Colección `submissions`, un documento por envío:

```
{
  id,
  studentAlias,
  institute,
  title,
  date,
  createdAt,
  authUid,              // uid anónimo del alumno, para las reglas
  plants: [
    {
      id,
      proposedName,
      habitat,
      notes,
      photoUrls: [],
      assessment: {
        status: 'pendiente' | 'correcto' | 'incorrecto',
        correctName,
        comment
      }
    }
  ],
  assessment: { grade, teacherComment, updatedAt }
}
```

Fotos en Storage bajo `submissions/{submissionId}/{plantId}/{filename}`.

## Seguridad

**Firestore (`firestore.rules`):**
- `create` en `submissions`: permitido si el usuario está autenticado
  (anónimo o no) y `authUid` del documento coincide con `request.auth.uid`.
- `read`/`update`/`delete` en `submissions`: solo si el token tiene el custom
  claim `teacher == true`. El alumnado no puede releer ni modificar lo que
  envió.
- El campo `assessment` (tanto a nivel de planta como global) solo es
  escribible por profesorado; se valida en las reglas que el campo
  `plants[].proposedName` etc. no cambie en updates de profesor.

**Storage (`storage.rules`):**
- `write`: solo autenticado, solo tipos `image/*`, límite 5 MB por archivo.
- `read`: público (necesario para mostrar las fotos en el panel de
  profesorado sin backend intermedio). Los nombres de fichero son opacos
  (UUID), no hay listado público del bucket.

**Alta de profesorado:** el administrador crea la cuenta email/contraseña
desde la consola de Firebase y ejecuta
`node scripts/set-teacher-claim.js <email>` para asignarle el custom claim
`teacher: true` (usa Firebase Admin SDK con una clave de servicio local, que
**no se sube al repositorio**).

**Privacidad:** solo alias, nunca nombre completo de menores, en el
formulario del alumnado. Fotos limitadas a plantas, no a personas — se
advierte en el propio formulario que no debe aparecer gente reconocible en
las imágenes.

## Despliegue

1. Crear repositorio GitHub en la cuenta personal del usuario (`Mynt`),
   subir el código inicial.
2. El usuario crea el proyecto Firebase (paso manual, requiere su login
   OAuth) y activa Authentication (Anónimo + Email/contraseña), Firestore y
   Storage en modo producción.
3. El usuario copia el `firebaseConfig` público (apiKey, authDomain, etc. —
   no son secretos) a `firebase-config.js`.
4. Desplegar `firestore.rules` y `storage.rules` con Firebase CLI
   (`firebase deploy --only firestore:rules,storage:rules`), requiere login
   interactivo del usuario la primera vez.
5. Activar GitHub Pages: Settings → Pages → Deploy from branch `main` /
   `(root)`.
6. Dar de alta la primera cuenta de profesorado y ejecutar el script de
   custom claim.

## Testing

Pruebas manuales contra el proyecto Firebase real (no hay backend propio que
testear con mocks):
- Servir la carpeta en local (`npx serve` o similar) apuntando al proyecto
  Firebase real.
- Flujo alumno: rellenar formulario con 2-3 plantas y fotos, enviar,
  verificar que aparece en Firestore/Storage.
- Flujo profesor: login, ver el conjunto enviado, corregir cada planta,
  poner nota, guardar, verificar persistencia tras recargar.
- Verificar que un usuario anónimo (alumno) no puede leer `submissions` de
  Firestore vía consola del navegador (comprobación manual de las reglas).

## Fuera de alcance (YAGNI)

- Edición de envíos ya corregidos.
- Notificaciones por email al alumnado.
- Roles intermedios (coordinador, etc.) — solo alumno/profesor.
- Multi-idioma.
