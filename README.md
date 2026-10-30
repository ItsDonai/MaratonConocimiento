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

`src/questions.json` contiene el banco. Cada pregunta tiene un `id` único, categoría, texto, 3 o 4 opciones, `answer` (índice desde cero) y explicación. Cada opción contiene `text` e `image`:

```json
{ "text": "Marte", "image": "/images/q1-1.svg" }
```

Las rutas `/images/` corresponden a `public/images/`. Las imágenes actuales son ilustraciones provisionales para probar el funcionamiento. Se pueden sustituir por fotos locales PNG, JPG o WebP actualizando las rutas. No se necesita internet para jugar. Reiniciar Tauri al cambiar el banco, porque Rust lo incorpora durante la compilación.

## Organización

- `src/game.js`: reglas, turnos, puntuación, deshacer y proyección del estado público.
- `src/game.test.js`: pruebas de las reglas y del banco.
- `src/main.js`: configuración, control y vista de participantes.
- `src-tauri/src/lib.rs`: estado compartido en memoria y apertura de la ventana pública; solo la ventana principal puede modificarlo.
- `src-tauri/tauri.conf.json`: configuración de la aplicación.

La lógica de juego está en JavaScript; Rust conecta las ventanas. La vista pública no muestra la clave hasta acertar o revelar; esto no constituye protección contra inspección del código en esta aplicación local.

## Verificar

```powershell
npm.cmd test
npm.cmd run build
cargo check --manifest-path src-tauri/Cargo.toml
```

El diseño visual definitivo queda pendiente.
