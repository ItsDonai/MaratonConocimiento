# Maratón del Conocimiento

Aplicación de escritorio con Tauri 2, Rust y JavaScript. Un conductor registra las respuestas que los equipos dicen en voz alta.

## Ejecutar

```powershell
npm.cmd install
npm.cmd run desktop
```

Windows requiere Rust (MSVC), Microsoft C++ Build Tools con Windows SDK y WebView2. Requisitos: https://v2.tauri.app/start/prerequisites/

Para probar en navegador: `npm.cmd run dev` y abrir http://127.0.0.1:1420. Para generar instalador: `npm.cmd run desktop:build`.

## Conducir una partida

1. Escribir los nombres de los dos equipos.
2. Elegir una cantidad de preguntas o ronda libre (todo el banco).
3. Abrir la pantalla de participantes y moverla al segundo monitor o proyector. La ventana principal contiene la clave correcta: no proyectarla.
4. Iniciar la partida. Las preguntas salen aleatoriamente y sin repetirse.
5. Elegir el equipo que comienza la pregunta; se puede cambiar antes del primer intento.
6. Seleccionar la opción que el equipo diga. Un acierto suma un punto y cierra los intentos. Un error bloquea esa opción y pasa el turno al otro equipo.
7. Si ambos fallan, revelar la respuesta es opcional y no suma puntos.
8. Avanzar manualmente. Al terminar se muestra el ganador o empate.

**Deshacer última acción** corrige un turno, intento, punto o revelación de la pregunta actual. No retrocede a una pregunta anterior. **Nueva partida** pide confirmar antes de borrar el marcador.

La pantalla pública solo permite observar. Se actualiza aproximadamente cada 350 ms y puede cerrarse y reabrirse desde el control sin perder la partida. En escritorio Rust conserva el estado en memoria mientras la aplicación está abierta, incluso si se recarga la interfaz. Cerrar el conductor termina la aplicación y descarta la partida. No hay guardado permanente de partidas de escritorio todavía.

En navegador, se usa almacenamiento local para comunicar las vistas; abrir solo un control por origen. Es una modalidad de prueba, no un sistema multiusuario en red.

## Preguntas e imágenes

En escritorio, el banco se guarda en **SQLite**, en `preguntas.sqlite` dentro de la carpeta de datos de la aplicación (`%APPDATA%/com.maratonconocimiento.desktop/` en Windows). Las preguntas y las imágenes importadas quedan dentro de esa base y sobreviven al cierre de la aplicación. No se instala un servidor SQL.

`src/questions.json` contiene las preguntas de ejemplo que se cargan solo al crear la base por primera vez. En navegador se usa ese banco de ejemplo. Cada pregunta tiene un `id` único, categoría, texto, 3 o 4 opciones, `answer` (índice desde cero) y explicación. Cada opción contiene `text` e `image`:

```json
{ "text": "Marte", "image": "/images/q1-1.svg" }
```

Las rutas `/images/` del banco de ejemplo corresponden a `public/images/`. Sus imágenes son ilustraciones provisionales. Las nuevas imágenes se importan desde PNG, JPG o WebP, se adaptan a un máximo de 1024 píxeles y se guardan como JPEG dentro de SQLite (las zonas transparentes quedan blancas). No se necesita internet para jugar. Editar el JSON no modifica una base ya creada: usar el importador para añadir o actualizar preguntas.

## Importar desde CSV

1. En la configuración inicial, pulsar **Importar preguntas desde CSV**. Esta función está disponible en escritorio, antes de iniciar una partida.
2. Descargar la plantilla del formulario o usar `public/plantilla-preguntas.csv` del proyecto. Las dos filas son ejemplos: proporcionar las imágenes que nombran o sustituirlas por las propias.
3. Guardar el CSV con codificación **UTF-8**, separado por coma o punto y coma. Los textos que contengan el separador o saltos de línea deben ir entre comillas dobles; una comilla dentro de un campo se escribe dos veces.
4. Seleccionar el CSV y sus imágenes individuales, o una carpeta de imágenes. En las columnas `imagen_a` a `imagen_d` escribir solo el nombre del archivo, por ejemplo `marte.jpg`, sin rutas. Los nombres no distinguen mayúsculas; no se permiten dos archivos seleccionados con el mismo nombre.
5. Pulsar **Revisar importación**. Corregir los errores antes de continuar. Se puede expandir la vista previa para inspeccionar textos, imágenes y respuesta correcta.
6. Confirmar con **Guardar…**. Se añaden los identificadores nuevos y se actualizan los existentes; el resto del banco se conserva. La importación se guarda en una sola transacción: si falla, no se aplica parcialmente.

Columnas: `id,categoria,pregunta,opcion_a,imagen_a,opcion_b,imagen_b,opcion_c,imagen_c,opcion_d,imagen_d,correcta,explicacion`.

Las opciones A, B y C son obligatorias. D es opcional: dejar vacíos tanto su texto como su imagen. `correcta` debe contener A, B, C o D. Mantener un `id` estable para actualizar una pregunta; los ejemplos iniciales usan los ids `1` a `8`. La explicación puede quedar vacía.

Límites: 500 preguntas por CSV, CSV de hasta 2 MB, imagen original de hasta 20 MB y 80 millones de píxeles, lote procesado de hasta 64 MB. Textos: id de hasta 80 caracteres, categoría de 60, pregunta de 180, opción de 80 y explicación de 300. Se recomiendan textos cortos para proyección a 800×600.

El banco guardado se copia al comenzar cada partida. Las preguntas de una partida y su marcador no se guardan permanentemente todavía. La importación por ZIP y el editor de preguntas quedan para una etapa posterior.

## Organización

- `src/game.js`: reglas, turnos, puntuación, deshacer y proyección del estado público.
- `src/game.test.js`: pruebas de las reglas y del banco.
- `src/importer.js` y `src/import-view.js`: lectura, validación, asociación de imágenes y revisión del CSV.
- `src/importer.test.js`: pruebas de CSV e identificación de imágenes.
- `src/main.js`: configuración, control y vista de participantes.
- `src-tauri/src/lib.rs`: estado compartido en memoria y apertura de la ventana pública; solo la ventana principal puede modificarlo.
- `src-tauri/src/bank.rs`: banco SQLite, importación transaccional y pruebas de persistencia.
- `src-tauri/tauri.conf.json`: configuración de la aplicación.

La lógica de juego está en JavaScript; Rust conecta las ventanas. La vista pública no muestra la clave hasta acertar o revelar; esto no constituye protección contra inspección del código en esta aplicación local.

## Verificar

```powershell
npm.cmd test
npm.cmd run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

El diseño visual definitivo queda pendiente.

## Pantalla de participantes y proyectores

En la pantalla inicial, **Configurar logo del sistema** permite elegir un PNG, JPG o WebP, revisar su vista previa y guardarlo sin cambiar código. El logo se conserva en SQLite, mantiene la transparencia y se refleja en ambas ventanas (la pública lo actualiza en unos dos segundos). **Usar logo original** prepara la restauración del logo del encuentro; pulsar **Guardar logo** para confirmarla. Se admite una imagen original de hasta 20 MB, se adapta a un máximo de 1024 píxeles y debe ocupar hasta 2 MB una vez procesada. En navegador, esta preferencia usa el almacenamiento local.

La distribución se ajusta automáticamente al espacio disponible: 800×600 y 1024×768 (4:3), 1024×720, 1920×1080 (16:9) y ultrawide. Las imágenes conservan sus proporciones. En pantallas de relación 2:1 o mayor las opciones se distribuyen en una fila; en las demás se usa una cuadrícula de dos columnas.

En la ventana de participantes, **F11** alterna pantalla completa y **Escape** sale de ella. Para aprovechar una resolución de proyector de 800×600 completa, usar pantalla completa: los bordes y la barra de título de una ventana ocupan parte de esos píxeles. Esta función adapta el contenido y no cambia la resolución configurada en Windows. `src/participants.css` mantiene estos ajustes separados de la vista del conductor.
