# Takari · exploración pixel art

## Espera activa: Takari dormido

`takari-sleeping-v4.png` es la fuente actual de espera: Takari sentado con piernas cruzadas, ojos cerrados y manos en el regazo, con torso, brazos, muslos, mejillas y cuello ligeramente más robustos. Conserva la pose y la identidad; v1, v2 y v3 quedan como referencias de las revisiones anteriores.

## Paleta y contornos de referencia

`palette.json` contiene 14 colores RGB seleccionados por muestreo de `logos/takari/takari.png`: dorado ocre, amarillo claro, verde petróleo, grises, blanco y negro puro. El boceto original tiene degradados; esta es su selección discreta de referencia para pixel art.

La fuente v4 se corrigió con la herramienta de imágenes integrada. Como la generación no garantiza RGB exactos, la aplicación normaliza el render de espera con `src/takari-palette.js`: usa solo la paleta, transparencia binaria y borde exterior negro `#000000`. Los tonos oscuros rojizos se asignan al negro. No modifica físicamente los PNG fuente: el ajuste ocurre al cargarlos y se conserva en caché mientras la aplicación esté abierta.

Las nuevas variantes deben usar `palette.json` como autoridad cromática y el mismo normalizador al integrarlas. No tomar nuevos colores de una generación anterior ni cambiar el color de Takari según el tema de interfaz. Los objetos (libro, copa, fuego) necesitan paletas independientes antes de normalizar hojas que los contengan. La hoja de victoria anterior queda conservada; esta normalización se aplica por ahora a la espera.

Validación del render v4: 14 colores admitidos, alfa 0 o 255 y 6.924 píxeles del borde exterior negros, sin excepciones. Las pruebas automatizadas de paleta comprueban preservación de colores, eliminación de tonos rojizos y bordes negros.

La imagen permanece fija y las tres letras Z suben en un ciclo de 2,7 segundos. Así no hay cambios de registro, recortes de cuello ni manos entre cuadros. Se muestra antes de la partida, al preparar el primer enfrentamiento y al usar **Mostrar pantalla de espera** entre encuentros. La animación se prueba en **Probar animaciones → Takari durmiendo · espera**. Con movimiento reducido se conserva la imagen y las Z estáticas. Esta versión sustituye la lectura en la interfaz; los diseños anteriores se conservan como referencia.

Dos propuestas generadas con la herramienta de imágenes integrada a partir de `logos/takari/takari.png` y `takari_costado.png`.

- `takari-pixel-concept-v1.png`: adaptación más detallada, con emblema simplificado en el polo.
- `takari-pixel-concept-v2.png`: versión más simplificada, sin letras en el polo.

Son conceptos ampliados con transparencia, no sprites finales de 32×32 píxeles. La generación no respetó exactamente la cuadrícula de 32×32 solicitada. No deben anunciarse como sprites de esa resolución ni como una hoja de animación terminada.

Rasgos a conservar: piel dorada, cuernos grises, alas y vientre amarillo claro, polo verde petróleo con detalles blancos, cola en punta y mango con hoja verde.

Antes de integrar: elegir el diseño, realizar la adaptación final a una cuadrícula real (32×32 para iconos; considerar 64×64 si se desea conservar más detalle), fijar paleta, silueta, punto de apoyo y espacio de cada cuadro. Las futuras animaciones deben compartir esas medidas y la misma identidad.

Otros estados sugeridos: reposo/parpadeo, pensar, celebrar acierto y reacción amable al error. Estos estados todavía no están dibujados. La primera prueba de victoria se describe a continuación.

## Espera con libro

La versión activa es `takari-reading-sheet-v2.png`: hoja transparente de **1254×1254**, con cuatro celdas de **627×627** en cuadrícula 2×2. Corrige la mano adicional de la primera versión. La versión v1 queda conservada como referencia y ya no se utiliza.

En la aplicación el cuerpo, los brazos y todo el libro se mantienen fijos tomando únicamente el primer cuadro. La animación actual usa una hoja superpuesta con tres estados discretos: reposo, página levantada y página pasada. Su punto de apoyo permanece fijo en el lomo. El ciclo dura 2,4 segundos. Ya no se intercambian recortes del libro de los otros cuadros, porque podían producir desfases en los bordes. Se revisaron capturas de los tres estados y el anclaje de la hoja permanece idéntico. Las cuatro ilustraciones originales se conservan como fuente, pero no se reproducen completas en la espera.

Se muestra en participantes antes de iniciar la partida, al preparar el primer enfrentamiento y, después de una victoria de torneo, al pulsar **Mostrar pantalla de espera** en el control. Así el conductor decide cuándo dejar atrás la celebración del ganador. La espera conserva resultados y preguntas usadas; desaparece al iniciar el siguiente encuentro. La final mantiene su pantalla de campeón.

También está en **Probar animaciones → Takari leyendo · espera**. Con movimiento reducido se muestra el primer cuadro estático. Detener efectos detiene la prueba; no interrumpe la espera real de los participantes.

## Primera prueba de victoria

`takari-victory-sheet-v1.png` contiene dos celdas de **887×887**, alineadas en una imagen transparente de **1774×887**. Pose A: copa frente al cuerpo. Pose B: copa levantada y pequeña llamarada. Se generó a partir de la primera propuesta pixel art, manteniendo el mismo personaje.

En **Probar animaciones → Takari con copa y fuego**, las dos poses se alternan cada 800 ms (ciclo de 1,6 segundos). **Detener efectos** o salir del panel detiene el bucle y devuelve la pose inicial. Con movimiento reducido se muestra la pose inicial sin bucle.

Esta es una prueba visual: aún no sustituye la copa de las victorias reales. El personaje puede tener pequeñas variaciones de registro entre las poses generadas; es una alternancia deliberada de dos imágenes, no una interpolación de movimiento. Los originales grandes se conservan para reutilización futura. Todavía no se han exportado versiones de icono ni otros estados.
