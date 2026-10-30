# Maratón del Conocimiento

Primer proyecto de escritorio con **Tauri 2 + Rust + JavaScript**, sin framework de interfaz para facilitar el aprendizaje.

## Primera versión

- Ocho preguntas de cultura general, en orden aleatorio.
- Tres o cuatro opciones con una sola respuesta correcta.
- Corrección inmediata, explicación y puntuación final.
- Funciona sin conexión una vez compilada. No guarda partidas todavía.

## Probar la interfaz

Con Node.js instalado, desde esta carpeta:

```powershell
npm.cmd install
npm.cmd run dev
```

Abrir http://127.0.0.1:1420 en el navegador. Esta modalidad usa el mismo banco de preguntas directamente, sin ejecutar Rust.

## Ejecutar como aplicación de escritorio en Windows

Requisitos oficiales: https://v2.tauri.app/start/prerequisites/

1. Instalar Microsoft C++ Build Tools con la carga de trabajo **Desarrollo para el escritorio con C++** y un Windows SDK.
2. Instalar Rust mediante https://rustup.rs/ usando la configuración MSVC predeterminada.
3. Comprobar que Microsoft Edge WebView2 Runtime está instalado.
4. Abrir una terminal nueva y comprobar `rustc --version` y `cargo --version`.
5. Ejecutar:

```powershell
npm.cmd run desktop
```

Para generar el instalador: `npm.cmd run desktop:build`. El resultado estará en `src-tauri/target/release/bundle/nsis/`.

## Cómo se conectan las piezas

1. `index.html` abre la interfaz.
2. `src/main.js` controla inicio, preguntas, respuestas y resultados.
3. `src/style.css` define la apariencia.
4. `src/questions.json` contiene las preguntas. `answer` es el índice correcto: 0 es la primera opción.
5. En escritorio, JavaScript llama a `get_questions` mediante `invoke`.
6. `src-tauri/src/lib.rs` recibe esa llamada en Rust y devuelve el banco incorporado en el ejecutable.
7. `src-tauri/tauri.conf.json` configura la ventana y la compilación.

La puntuación se calcula en JavaScript para que esta primera versión sea fácil de seguir. Una siguiente práctica puede llevar esa lógica a Rust. Esta versión está pensada para uso local de aprendizaje, sin controles contra trampas.

## Agregar preguntas

Copiar una entrada del JSON, asignar un `id` único y escribir `category`, `text`, `options`, `answer` y `explanation`. Cada pregunta debe tener 3 o 4 opciones. Al modificar el banco, reiniciar Tauri para incorporar los cambios al código Rust.
