# Identificación de plantas — diseño

Fecha: 2026-09-23

## Objetivo

Aplicación web estática para que alumnado entregue conjuntos de fotografías de
plantas junto a sus identificaciones propuestas. El profesorado revisa cada
conjunto, marca las identificaciones como correctas o incorrectas, escribe el
nombre correcto, comentarios y una nota final.

Además, el profesorado puede crear **listados de referencia**: un conjunto de
nombres de plantas con un texto explicativo del trabajo a realizar, y fotos de
esas plantas que el alumnado no puede ver hasta que (a) el profesor publica el
listado y (b) el propio alumno ha entregado una propuesta para todas las
plantas del listado.

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
│  └─ index.html              Formulario para crear y enviar conjuntos;
│                             muestra el listado de referencia si se accede
│                             con ?lista=CODE
├─ profesor/
│  ├─ index.html              Panel para revisar, corregir y puntuar
│  └─ listados.html           Crear/editar listados de referencia, subir
│                             fotos y publicar
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

### Acceso a un listado de referencia

Si la URL incluye `?lista=CODE`, la página resuelve `CODE` al `listId`
correspondiente (consulta pública a `plantLists` filtrando por `code`) y
muestra, antes del formulario:

- El texto explicativo del trabajo (`teacherText`).
- Los nombres de las plantas del listado (`plants[].name`), sin fotos.

El formulario de entrega queda ligado a ese `listId`: el alumno debe
proponer una identificación para cada planta del listado (no fichas libres).
Al enviar, el cliente calcula `complete` comparando los nombres cubiertos
por la entrega contra `plants[].name` del listado, y el documento de la
entrega se guarda con `id` determinista `{listId}_{authUid}` — esto impide
que el mismo alumno (mismo navegador) entregue dos veces para el mismo
listado.

Tras entregar, si `plantLists/{listId}.published == true` y su propia
entrega tiene `complete == true`, la página consulta
`plantListPhotos/{listId}` y muestra las fotos correctas de cada planta
junto a su nombre. Si no se cumplen ambas condiciones, no se muestran
(y la consulta ni siquiera se hace, o falla por reglas si se intenta).

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

### Gestión de listados de referencia (`profesor/listados.html`)

Requiere el mismo login de profesorado. Permite:

- Crear un listado: título, texto explicativo, lista de nombres de planta.
  Se genera automáticamente un `code` corto (para la URL) y un `listId`.
- Por cada planta del listado, subir una o más fotos de referencia (se
  guardan en Storage bajo `plantLists/{listId}/{plantId}/...` y sus URLs en
  `plantListPhotos/{listId}`, **no** en `plantLists/{listId}`).
- Ver cuántos alumnos han entregado y cuántas entregas están `complete` para
  ese listado (consulta a `submissions` filtrando por `listId`).
- Botón **Publicar fotos**: cambia `plantLists/{listId}.published` a
  `true`. Reversible (se puede despublicar).
- Copiar el enlace del listado (`estudiante/?lista=CODE`) para compartir con
  el alumnado.

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

`submissions` incorpora dos campos nuevos respecto al diseño original:
`listId` (referencia al listado, si la entrega viene de uno) y `complete`
(booleano, calculado en cliente al entregar). El `id` del documento es
`{listId}_{authUid}` cuando hay listado; se mantiene autogenerado cuando la
entrega es libre (sin `?lista=`).

**Colección `plantLists`** (metadatos públicos, sin fotos):

```
{
  listId,
  code,              // corto, usado en la URL ?lista=CODE
  title,
  teacherText,
  published: false,
  createdBy,         // uid del profesor
  plants: [
    { id, name }
  ]
}
```

**Colección `plantListPhotos`** (documento separado, mismo `listId` como
ID de documento, para poder ocultarlo por completo mientras no está
publicado):

```
{
  listId,
  plants: [
    { id, photoUrls: [] }
  ]
}
```

## Seguridad

**Firestore (`firestore.rules`):**
- `create` en `submissions`: permitido si el usuario está autenticado
  (anónimo o no) y `authUid` del documento coincide con `request.auth.uid`.
  Si `listId` está presente, el `id` del documento debe ser
  `{listId}_{request.auth.uid}` (evita entregas duplicadas del mismo alumno
  al mismo listado).
- `read`/`update`/`delete` en `submissions`: solo si el token tiene el custom
  claim `teacher == true`. El alumnado no puede releer ni modificar lo que
  envió, ni siquiera su propio documento.
- El campo `assessment` (tanto a nivel de planta como global) solo es
  escribible por profesorado; se valida en las reglas que el campo
  `plants[].proposedName` etc. no cambie en updates de profesor.
- `plantLists`: lectura pública (cualquiera, incluso sin autenticar, puede
  resolver `code` → listado y ver nombres + texto). Escritura solo
  profesorado.
- `plantListPhotos/{listId}`: lectura permitida solo si
  `get(/databases/$(database)/documents/plantLists/$(listId)).data.published
  == true` **y** existe
  `get(/databases/$(database)/documents/submissions/$(listId + '_' +
  request.auth.uid))` con `complete == true`. Escritura solo profesorado.

**Storage (`storage.rules`):**
- `submissions/**` (fotos del alumnado): `write` solo autenticado, solo
  `image/*`, límite 5 MB. `read` público (necesario para el panel de
  profesorado). Nombres de fichero opacos (UUID).
- `plantLists/**` (fotos de referencia del profesor): `write` solo
  profesorado. `read` con la misma condición de doble comprobación que
  `plantListPhotos` en Firestore, usando `firestore.get()` desde las reglas
  de Storage.

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
- Flujo listado: profesor crea listado con 2-3 plantas, texto y fotos de
  referencia; copia el enlace `?lista=CODE`.
- Alumno abre el enlace, ve nombres + texto pero no fotos; entrega
  identificaciones para todas las plantas del listado.
- Antes de publicar: recargar la página del alumno y verificar que sigue
  sin ver fotos (aunque su entrega sea `complete`).
- Profesor pulsa "Publicar fotos"; alumno recarga y ahora sí ve las fotos
  correctas.
- Verificar que un alumno que NO ha entregado (o entregó incompleto) sigue
  sin poder leer `plantListPhotos/{listId}` aunque el listado esté
  publicado (comprobación manual de las reglas).

## Fuera de alcance (YAGNI)

- Edición de envíos ya corregidos.
- Notificaciones por email al alumnado.
- Roles intermedios (coordinador, etc.) — solo alumno/profesor.
- Multi-idioma.
- Edición de un listado ya publicado con fotos (se puede despublicar,
  editar y volver a publicar, pero no hay un flujo de "versión" del
  listado).
- Límite de tiempo/plazo automático para las entregas de un listado (el
  profesor publica manualmente cuando decide que ya no acepta más).
