# Registro de validación

Fecha: 9 de octubre de 2026, America/Santiago.

## Resultado final

| Verificación       | Resultado                                                 |
| ------------------ | --------------------------------------------------------- |
| `npm install`      | Correcto; dependencias y lockfile disponibles             |
| `npm run dev`      | Vite disponible en `http://127.0.0.1:5198`                |
| `npm run build`    | Correcto: TypeScript estricto y compilación de producción |
| `npm test`         | 54 pruebas aprobadas, cuatro archivos                     |
| `npm run test:e2e` | 17 flujos aprobados en Microsoft Edge                     |
| `npm audit`        | 0 vulnerabilidades reportadas                             |

El build emite dos avisos de Rollup sobre comentarios de optimización en Zod. Se eliminan esos comentarios al compilar; la compilación finaliza correctamente.

## Dominio y persistencia

Las pruebas cubren conservación del total y ausencia de repetición; mezclas de 0, 2, 4, 6 y 8 malos; selección manual exacta; nombres recortados; capacidad insuficiente; $0, saldo agotado y dinero inicial 0 rechazados en nuevas acciones; descuento exacto de $1 y $3; rechazo de negativos, decimales, `NaN`, infinito y exceso de saldo; rechazo de una decisión ya consumida; reparto automático gratuito; agotamiento sin alcanzar límite; límites 8/3, 8/5 y 9/5; restauración completa del snapshot con el mismo orden; datos dañados e invariantes; referencias y duplicados del catálogo; error de escritura; repetición con nuevos IDs; e invalidación de fuentes inactivas.

Los ocho recorridos originales actualizados verifican:

1. Crear y usar una categoría nueva; mover un ítem y cambiar su tipo; conservar intacta la copia de una partida; informar que ya no puede repetirse una selección manual del catálogo.
2. Asignar con doble clic sin duplicación, cobrar, recargar, repartir automáticamente, ver resultados y deshacer después de recargar.
3. Mezclas extremas, selección manual 1/7, partida personalizada temporal y validación visible del límite.
4. Crear, editar, activar/desactivar, duplicar y eliminar categorías e ítems con persistencia y confirmación de eliminación.
5. Recuperar una partida dañada de forma explícita e informar un fallo simulado de escritura sin iniciar la partida.
6. Capturas y recorrido completo en anchos 360, 390, 768 y 1366 px, nombres largos, ausencia de scroll horizontal, skip link y movimiento reducido.
7. Repetir directamente, bloquear resultados anticipados, manejar rutas sin partida o inexistentes y devolver el foco al cerrar una confirmación con Escape.
8. Error de capacidad, precio sobre el saldo, precio negativo y finalización por agotamiento con límite 5.

## Cambios de la versión 1.1

Se añadieron pruebas para el sorteo 50/50 con aleatoriedad controlada, ambos segmentos y aterrizajes reales a 270°/90°, bloqueo antes de confirmar, ausencia de transacciones al girar, recarga a mitad del giro, ausencia de un segundo sorteo, undo y repetición. La migración prueba partidas antiguas vacías, compras históricas a $0, snapshot anterior a la primera compra y dinero inicial antiguo 0; los datos se conservan y las acciones nuevas exigen $1.

Los nueve recorridos nuevos verifican además el bloqueo al agotar ambos saldos sin reparto gratuito, preferencias persistentes, volumen, teclado y foco del diálogo, cambio a reducido durante el giro, respeto del sistema y funcionamiento inmediato sin animaciones. Se instrumentó Web Audio real en Edge: la compra genera tonos, seleccionar jugador/precio no los genera, silenciar corta sonidos y la cola pendiente, y recargar no reproduce eventos anteriores. Un AudioContext deliberadamente fallido informa el problema y permite guardar compras.

Las pruebas unitarias del servicio cubren cancelación por silencio, volumen 0 y undo, fallo de audio y una secuencia compra/reparto/fin inferior a 900 ms con un solo efecto de lote. El estado funcional se persiste antes de los efectos; el giro no decide las reglas al terminar y cancelar una presentación no revierte compras. Los recursos y listeners se limpian al desmontar o al ocultar la pestaña; no existe una cola persistida.

## Revisión visual y accesibilidad

Se inspeccionaron capturas de preparación, juego, resultados y Admin tanto en móvil como en notebook, además del inicio. Se corrigieron la alineación de saldos con nombres largos, la colocación del icono de precio y el contraste de los bordes. Ambos jugadores conservan igual ancho y los saldos quedan alineados al pie de sus tarjetas.

Evidencia en `validation/`:

- `home-*.png`, `setup-*.png`, `play-*.png`, `results-*.png`, `admin-*.png`: 20 capturas en los cuatro anchos.
- `wheel-*.png`: cuatro anchos, incluidos nombres largos; `wheel-result-1.png` y `wheel-result-2.png`: ambos segmentos con indicador y texto coincidentes.
- `preferences-1366.png`: controles de sonido, volumen y movimiento en diálogo con foco contenido.
- `long-item-390.png`: carta con nombre de ítem largo, sin truncarlo ni generar desbordamiento.
- `reduced-height-390.png`: confirmación alcanzable al reducir la pantalla a 390 × 360 px y enfocar el precio.
- `reflow.json`: revisión adicional a 200% de tamaño base de texto en inicio, preparación, catálogo y Admin, sin desbordamiento; menú móvil operativo.
- `contrast.json`: medición WCAG de 10 combinaciones de tokens. Todos los textos medidos superan 4,5:1; los bordes funcionales superan 3:1 en sus superficies.

La clasificación no se presenta mediante color, icono, etiqueta o historial en la pantalla del host. Se muestran los tipos en preparación y resultados. Las confirmaciones usan Radix AlertDialog, con foco contenido y retorno al disparador. Los precios y selecciones tienen controles nativos y botones grandes; la app respeta `prefers-reduced-motion`.

## Alcance de la comprobación

Las pruebas se ejecutaron en un navegador de escritorio con viewports emulados. No se probó en un teléfono físico, con teclado virtual real, VoiceOver o TalkBack. Reducir la altura disponible y aumentar el texto ayuda a verificar el diseño, pero no sustituye esas comprobaciones en dispositivos reales.

Se comprobó síntesis y cancelación mediante Web Audio; no se evaluó el nivel acústico en altavoces físicos ni el comportamiento de todos los navegadores móviles.

La persistencia sigue siendo exclusivamente local por navegador y origen. Admin es de demostración y no tiene protección real. No se implementaron servicios externos, autenticación, bases de datos, sincronización ni hosting, conforme al alcance solicitado.
