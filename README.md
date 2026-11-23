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

### Torneo de varios equipos

Desde la pantalla inicial, **Crear torneo de varios equipos** registra entre 2 y 32 equipos, cada uno con su nombre y logo. El administrador elige los dos participantes de cada enfrentamiento; no hay eliminación automática, por lo que un equipo que perdió puede volver a jugar.

Para cada encuentro se elige **límite de preguntas** o **primero en alcanzar los puntos**. El turno inicial de cada pregunta sigue siendo decisión del conductor. Al cerrar la pregunta que alcanza el límite, si hay un ganador, el conductor revisa y pulsa **Confirmar ganador**. Hasta confirmar no se habilita otro encuentro. La pantalla pública muestra al ganador y el control añade el resultado, marcador y cantidad de preguntas al historial temporal. **Corregir antes de confirmar** permite volver a la última pregunta y deshacer una selección accidental.

Si el límite de preguntas termina empatado, se continúa con preguntas extra hasta desempatar. El control mantiene una lista de equipos con victorias. Cuando se decide jugar la final, marcar **Es la final del torneo** y seleccionar dos equipos que hayan ganado al menos un encuentro. Confirmar el resultado de la final muestra al campeón y cierra el torneo.

Las preguntas se consideran usadas desde que se muestran, incluso si ambos equipos fallan. No se repiten entre encuentros del mismo torneo; las preguntas reservadas pero nunca mostradas siguen disponibles. Al cerrar un enfrentamiento, gana el equipo con más puntos. Esto también aplica si se agota el banco antes de alcanzar la meta. El botón Cerrar enfrentamiento permite cerrar manualmente y después confirmar al ganador. Si hay empate y el banco se agota, el encuentro se pausa para incorporar preguntas de desempate. **Reemplazar banco de preguntas del torneo** sustituye el banco completo; después usar **Continuar con el nuevo banco**. El historial y los puntos se conservan. Importar una actualización con un id ya existente no libera esa pregunta para reutilizarla.

El torneo y sus resultados son temporales en escritorio: cerrar la aplicación o confirmar **Salir del torneo** descarta el historial y el control de preguntas usadas. SQLite conserva el banco y el logo del sistema. En la prueba de navegador, el torneo usa el mismo almacenamiento local que las partidas.

### Partida individual de dos equipos

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

`src/questions.json` contiene las preguntas de ejemplo que se cargan solo al crear la base por primera vez. En navegador se usa ese banco de ejemplo. Cada pregunta tiene un `id` único, categoría, texto, 3 o 4 opciones y `answer` (índice desde cero). Cada opción contiene `text` e `image`:

```json
{ "text": "Marte", "image": "/images/q1-1.svg" }
```

Las rutas `/images/` del banco de ejemplo corresponden a `public/images/`. Sus imágenes son ilustraciones provisionales. Las nuevas imágenes se importan desde PNG, JPG o WebP, se adaptan a un máximo de 1024 píxeles y se guardan como JPEG dentro de SQLite (las zonas transparentes quedan blancas). No se necesita internet para jugar. Editar el JSON no modifica una base ya creada: usar el importador para añadir o actualizar preguntas.

## Importar desde CSV

1. En la configuración inicial, pulsar **Importar preguntas desde CSV**. Esta función está disponible en escritorio, antes de iniciar una partida.
2. Pulsar **Descargar plantilla CSV** en el formulario y elegir dónde guardarla, o usar `public/plantilla-preguntas.csv` del proyecto. Las tres filas son ejemplos solo de texto: sustituirlas por las preguntas propias. Se pueden añadir imágenes opcionalmente. **Cómo llenar la plantilla CSV** muestra las instrucciones y los límites dentro del sistema. Cancelar la descarga no modifica el banco de preguntas.
3. Guardar el CSV con codificación **UTF-8**, separado por coma o punto y coma. Los textos que contengan el separador o saltos de línea deben ir entre comillas dobles; una comilla dentro de un campo se escribe dos veces.
4. Seleccionar el CSV y sus imágenes individuales, o una carpeta de imágenes. En las columnas `imagen_a` a `imagen_d` escribir solo el nombre del archivo, por ejemplo `marte.jpg`, sin rutas. Los nombres no distinguen mayúsculas; no se permiten dos archivos seleccionados con el mismo nombre.
5. Pulsar **Revisar importación**. Corregir los errores antes de continuar. Se puede expandir la vista previa para inspeccionar textos, imágenes y respuesta correcta.
6. Confirmar con **Guardar…**. El CSV reemplaza el banco completo: las preguntas anteriores se eliminan y quedan únicamente las del archivo nuevo. La importación se guarda en una sola transacción: si falla, no se aplica parcialmente.

Columnas: `id,categoria,pregunta,opcion_a,imagen_a,opcion_b,imagen_b,opcion_c,imagen_c,opcion_d,imagen_d,correcta`.

Las opciones A, B y C son obligatorias. D es opcional: dejar vacíos tanto su texto como su imagen. `correcta` debe contener A, B, C o D. Cada importación reemplaza el banco completo, incluso si coinciden identificadores; los ejemplos iniciales usan los ids `1` a `8`. La plantilla ya no incluye explicación. Las imágenes son opcionales: deja las columnas imagen vacías (o elimínalas) para preguntas solo de texto.

Límites: 500 preguntas por CSV, CSV de hasta 2 MB, imagen original de hasta 20 MB y 80 millones de píxeles, lote procesado de hasta 64 MB. Textos: id de hasta 80 caracteres, categoría de 60, pregunta de 1200 y opción de 400. Se recomiendan textos cortos para proyección a 800×600.

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

### Celebraciones

Las respuestas correctas lanzan una ráfaga breve de confeti. Las victorias muestran una copa y fuegos artificiales de partículas; en torneo se activan después de confirmar al ganador, también para el campeón de la final. Un empate no activa una celebración de victoria. Los efectos funcionan en ambos temas, se detienen al cambiar de pregunta o pantalla y no se repiten con las actualizaciones del marcador. No bloquean los botones ni añaden sonido.

Se utiliza `canvas-confetti`, incluido localmente en la aplicación, sin conexiones a servicios externos. La preferencia de movimiento reducido del sistema desactiva las partículas y las animaciones, manteniendo visible la copa y el resultado. El comportamiento está separado en `src/celebrations.js` y `src/celebrations.css`.

### Temas de apariencia

**Configurar tema**, en la pantalla inicial, permite elegir entre **Clásico** y **Concurso pop**. La selección se puede previsualizar, guardar o cancelar. En escritorio se conserva en SQLite; en navegador se guarda localmente. La ventana pública se actualiza en unos dos segundos. El tema cambia la apariencia de ambas ventanas, conserva los colores de los equipos y respeta el ajuste a los proyectores. Concurso pop incluye una animación breve de acierto que se omite si el sistema tiene activada la preferencia de movimiento reducido.

Los temas se registran en `src/themes.js` y sus estilos están separados en `src/themes.css`. Para añadir otro, registrar un id, nombre y descripción, añadir estilos bajo `body[data-theme="nuevo-id"]` y admitir el id en `save_theme` de `src-tauri/src/bank.rs`. Las reglas del juego no dependen del tema.

En la pantalla inicial, **Configurar logo del sistema** permite elegir un PNG, JPG o WebP, revisar su vista previa y guardarlo sin cambiar código. El logo se conserva en SQLite, mantiene la transparencia y se refleja en ambas ventanas (la pública lo actualiza en unos dos segundos). **Usar logo original** prepara la restauración del logo del encuentro; pulsar **Guardar logo** para confirmarla. Se admite una imagen original de hasta 20 MB, se adapta a un máximo de 1024 píxeles y debe ocupar hasta 2 MB una vez procesada. En navegador, esta preferencia usa el almacenamiento local.

La distribución se ajusta automáticamente al espacio disponible: 800×600 y 1024×768 (4:3), 1024×720, 1920×1080 (16:9) y ultrawide. Las imágenes conservan sus proporciones. En pantallas de relación 2:1 o mayor las opciones se distribuyen en una fila; en las demás se usa una cuadrícula de dos columnas.

En la ventana de participantes, **F11** alterna pantalla completa y **Escape** sale de ella. Para aprovechar una resolución de proyector de 800×600 completa, usar pantalla completa: los bordes y la barra de título de una ventana ocupan parte de esos píxeles. Esta función adapta el contenido y no cambia la resolución configurada en Windows. `src/participants.css` mantiene estos ajustes separados de la vista del conductor.

### Preguntas solo de texto

Las respuestas sin imagen se muestran en tarjetas con letras A–D. Las preguntas largas usan texto más compacto y respuestas en una columna en la pantalla de participantes; si el contenido excede la pantalla se puede desplazar para leerlo completo. No se recorta el texto. La explicación ya no se solicita ni se muestra. Se admiten hasta 1200 caracteres por pregunta y 400 por respuesta. Las imágenes siguen siendo opcionales para bancos mixtos.

### Sustitución del banco

Al importar un CSV, la revisión indica cuántas preguntas tiene el banco actual y cuántas tendrá el nuevo. Solo al pulsar **Reemplazar banco** se elimina el anterior y se guarda el nuevo, en una única transacción. Un archivo inválido o un fallo de guardado conserva el banco anterior completo. Los bancos no se combinan ni se archivan. El logo y el tema se conservan. En torneo se puede cambiar el banco entre encuentros o durante un desempate pausado; se conservan los puntos, el historial y los identificadores ya usados para evitar repeticiones.

### Rondas con control externo de los enfrentamientos

**Iniciar rondas con varios equipos** registra los equipos disponibles. Antes de cada ronda se eligen libremente dos equipos y la cantidad de preguntas (4 por defecto). La ronda termina al alcanzar esa cantidad incluso en empate, sin desempates automáticos. **Confirmar resultado y elegir equipos** habilita el siguiente enfrentamiento. Cualquier equipo puede volver a participar y no se exige haber ganado antes. Los pases directos, eliminatorias y la decisión de la final se controlan fuera de la aplicación. El sistema conserva únicamente los resultados y las preguntas usadas durante esa sesión. Las preguntas que nunca se mostraron siguen disponibles; salir de la sesión reinicia ese control.

### Mantener la cantidad entre partidos

La cantidad de preguntas se elige en el primer enfrentamiento y se conserva durante toda la sesión. Tras confirmar un resultado, **Siguiente partido** permite elegir otros dos equipos, manteniendo esa cantidad y excluyendo las preguntas ya mostradas. Si no quedan suficientes preguntas para un partido completo, el botón se desactiva. **Volver al inicio** reinicia los resultados y el control de preguntas usadas: el banco cargado se conserva y todas sus preguntas vuelven a estar disponibles al iniciar otra sesión.
