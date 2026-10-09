# NO ESCUCHES — Modificaciones para Codex

Versión: 1.0 · Fecha: 9 de octubre de 2026.

Documento de cambios sobre el prototipo existente. Leer junto con `NO_ESCUCHES_PROYECTO.md` y `NO_ESCUCHES_REGLAS_DISENO.md`.

## 1. Instrucción principal

Implementa estas tres modificaciones en la aplicación actual:

1. Animaciones de interacción en todas las acciones y sonidos en eventos concretos.
2. Apuesta inicial y precio mínimo obligatorio de **$1** por compra manual.
3. Ruleta para decidir cuál de los dos jugadores comienza la primera subasta.

Este archivo contiene únicamente la ampliación actual; no reconstruyas el proyecto desde cero. Reutiliza la arquitectura, componentes, catálogo, configuración y persistencia existentes. Si la implementación aún no comenzó, incorpora estos cambios al construir el prototipo.

**Los requisitos de este documento prevalecen sobre instrucciones anteriores que permitan compras manuales a $0, excluyan los sonidos o dejen las animaciones fuera del MVP.** Actualiza las pruebas y textos afectados: no basta con cambiar la apariencia de los controles.

Mantener React, TypeScript, Vite, Tailwind, shadcn/ui y la separación entre UI, dominio, estado y persistencia. El prototipo sigue sin BBDD, backend, servicios externos, autenticación real ni despliegue. Usar `localStorage` para partida y preferencias.

Aplicar las reglas visuales existentes y las habilidades **UI/UX Pro Max** y **`gpt-taste`** durante la implementación, leyendo sus instrucciones reales cuando estén disponibles. Este documento no acredita su ejecución ni sustituye sus instrucciones. No introducir una estética diferente sin integrarla con el diseño del proyecto.

## 2. Resumen de lo que debe cambiar

| Área | Comportamiento requerido |
| --- | --- |
| Interacciones | Toda acción tiene feedback visual coherente |
| Sonidos | Efectos breves para inicio, compra, deshacer, reparto, fin, resultados y ruleta |
| Compra manual | Precio entero mínimo de $1, limitado por el saldo |
| Primera oferta | Cada subasta comienza en $1; el host registra el precio final acordado presencialmente |
| Precio por defecto | $1 al mostrar cada nuevo ítem |
| Reparto automático | Sigue siendo gratuito; no constituye una compra |
| Inicio de partida | Ruleta con dos jugadores y probabilidades iguales |
| Resultado de la ruleta | Persistente, sin repetir sorteo al recargar o deshacer |
| Accesibilidad | Silencio, volumen y movimiento reducido |

## 3. Animaciones: alcance de todas las acciones

Cada acción interactiva debe tener una respuesta visual perceptible. No es necesario crear una animación compleja y distinta para cada botón: definir un sistema común de pulsación, selección, entrada/salida y confirmación.

### Matriz obligatoria

| Acción | Animación o feedback requerido |
| --- | --- |
| Pulsar botones y enlaces | Compresión breve y cambio de superficie; foco visible |
| Hover cuando el dispositivo lo admita | Cambio sutil de borde o fondo, sin movimiento permanente |
| Enfocar campos | Estado de foco claro y transición breve; nunca desplazar el campo mientras se escribe |
| Navegar | Entrada/salida breve del contenido manteniendo la navegación estable |
| Abrir/cerrar menú, diálogo o panel | Opacidad y desplazamiento pequeño, conservando el manejo accesible del foco |
| Cambiar categoría o modo de selección | Transición del contenido y actualización visible del resumen |
| Cambiar total, límite o proporción | Actualización inmediata con énfasis corto en el valor/resumen |
| Seleccionar/quitar ítems manuales | Check/borde y actualización del contador |
| Añadir/quitar filas personalizadas | Entrada/salida breve; foco lógico en el campo nuevo o siguiente control |
| Crear, editar, guardar o duplicar catálogo | Confirmación visible y entrada/actualización de tarjeta o fila |
| Activar/desactivar categorías o ítems | Transición del switch y etiqueta de estado |
| Eliminar con confirmación | Salida de la fila y mensaje de confirmación |
| Comenzar partida | Entrada de la ruleta y de las identidades de ambos jugadores |
| Girar ruleta | Giro que termina exactamente en el jugador seleccionado |
| Mostrar resultado de ruleta | Énfasis del nombre y mensaje de primera oferta |
| Seleccionar jugador | Borde/check y énfasis breve en su tarjeta |
| Seleccionar precio | Chip seleccionado y actualización de la confirmación |
| Comprar/asignar | Carta hacia el jugador; resaltar saldo y contador; sustituir por el siguiente ítem |
| Deshacer | Retorno breve de carta y énfasis en el estado restaurado |
| Repartir automáticamente | Un aviso de lote y actualización del contador del receptor |
| Finalizar | Entrada del estado de fin, sin señalar un ganador |
| Abrir resultados | Aparición escalonada corta de las listas y clasificación visible |
| Nueva partida/repetir configuración | Transición a preparación; nueva ruleta al iniciar una partida nueva |
| Rechazar una acción | Error junto al control y borde visible; no sacudir toda la pantalla |
| Cambiar preferencias | Actualización clara del control y de su estado |

### Ritmo y consistencia

- Pulsación: aproximadamente 80–120 ms.
- Selección y controles: 140–180 ms.
- Paneles, navegación y cartas: 200–260 ms.
- Compra, inicio, fin y resultado: 300–450 ms.
- Resultados escalonados: 30–50 ms entre elementos, con duración total del grupo de hasta 600 ms.
- El giro de ruleta es una excepción: aproximadamente 2–3 segundos, sin espera adicional antes o después.

Centralizar estos valores en tokens. Preferir opacidad y transformaciones pequeñas; no animar dimensiones de forma que salten los controles. Usar cifras tabulares en dinero y contadores. Evitar destellos, movimiento continuo, efectos de cámara y confeti persistente.

Para la asignación, no mezclar el ítem saliente con los controles del siguiente: mientras se presenta el cambio, no debe poder comprarse dos veces el anterior ni cobrar el siguiente con una carta desactualizada. El botón debe seguir protegido contra doble envío.

Guardar el estado funcional al aceptar la acción. Ninguna regla de dinero, asignación o finalización debe depender de que se ejecute `animationend`. Cancelar una animación no deshace por sí mismo una compra. La acción explícita Deshacer sí restaura el snapshot completo.

### Movimiento reducido

Ofrecer preferencias **Sistema**, **Reducido** y **Sin animaciones**. Respetar siempre la preferencia del sistema por reducir movimiento.

En Reducido, sustituir desplazamientos, giros, rebotes y conteos animados por cambios inmediatos o fades de hasta 100 ms. En Sin animaciones, actualizar inmediatamente. Mantener mensajes, check, bordes y foco; no eliminar el feedback.

La ruleta debe seguir funcionando sin giro: calcular y guardar el resultado, mostrarlo directamente y permitir continuar. No conservar los 2–3 segundos de espera cuando la animación está desactivada.

## 4. Sonidos

### Eventos sonoros

| Evento | Efecto |
| --- | --- |
| Partida nueva iniciada | Acorde corto de inicio |
| Ruleta girando | Ticks suaves coordinados con el giro |
| Resultado de ruleta | Confirmación breve y neutral |
| Compra válida | Efecto corto de carta/ficha |
| Deshacer | Efecto breve de reversión |
| Reparto automático | Un único efecto para todo el lote |
| Partida terminada | Acorde neutral de cierre |
| Abrir resultados por primera vez | Revelación breve, igual para cualquier composición |
| Guardar/duplicar catálogo | Confirmación discreta |
| Confirmar eliminación | Efecto suave diferente del guardado |
| Envío rechazado | Aviso tenue por intento explícito |

No emitir sonidos al escribir, enfocar, hacer hover, buscar, seleccionar jugador/precio o arrastrar sliders. No hace falta audio en todos los clics. No reproducir errores por cada carácter ni al renderizar mensajes existentes.

Si una compra provoca reparto y finalización, coordinar los efectos en una secuencia breve, aproximadamente hasta 900 ms en total. No superponer tres efectos completos ni emitir un sonido por cada ítem automático. Deshacer debe cortar la secuencia pendiente.

Usar sonidos suaves de cartas, fichas y tonos breves de arcade, con volumen uniforme. Duración habitual 80–250 ms; acordes de inicio/fin/revelación 300–700 ms. No incluir voces, gritos, música de fondo ni sonidos reconocibles copiados de otras franquicias.

Los efectos deben existir realmente: síntesis local o archivos incluidos en el proyecto con permiso de uso. No depender de streaming, APIs ni descargas externas, ni entregar un servicio vacío o rutas rotas como implementación final.

### Controles y reproducción

- Sonido desactivado inicialmente, con opción visible **Activar sonidos** en preparación.
- Control accesible de silencio durante la partida, incluida la ruleta.
- Volumen de 0 a 100; valor inicial sugerido 35. Volumen 0 equivale a silencio.
- Botón **Probar sonido** en preferencias.
- Persistir las preferencias en `no-escuches:preferences:v1` o el equivalente ya utilizado.
- Inicializar o habilitar audio desde una interacción del usuario; al recargar, no reproducir automáticamente efectos anteriores.
- Silenciar detiene sonidos actuales y cancela sonidos pendientes.
- Ocultar la pestaña cancela efectos pendientes; no reproducir una cola antigua al regresar.
- Si el navegador bloquea el audio o falla un recurso, el juego sigue funcionando. Mostrar una indicación discreta cuando corresponda, sin bloquear compras ni guardados.

### Suspenso

Antes de resultados, la clasificación GOOD/BAD no debe afectar color, duración, movimiento, sonido o tono. La misma compra tiene el mismo feedback para ambos tipos. No anticipar nombres de ítems futuros durante el reparto automático; anunciar solo el receptor y la cantidad.

## 5. Apuesta y precio mínimo de $1

### Regla funcional

**Cada subasta comienza con una oferta de $1. Toda compra manual requiere un precio final entero igual o mayor que $1.** No permitir compras manuales gratuitas.

La aplicación sigue siendo una herramienta del host: las pujas y acuerdos ocurren presencialmente. No añadir un motor de subastas, turnos online, incrementos obligatorios o cobros por cada oferta. Solo registrar al comprador definitivo y el importe final.

### Controles de precio

1. Eliminar el botón rápido $0.
2. Mostrar precios rápidos **$1, $2, $3, $4, $5 y $10**.
3. Al abrir cada nuevo ítem, establecer el precio en **$1** y limpiar la selección del comprador.
4. El campo personalizado acepta únicamente enteros desde 1.
5. Mostrar **«La subasta comienza en $1»** junto al precio o en el contexto del ítem.
6. La confirmación conserva el formato explícito: **«Asignar a Nicolás por $3»**.
7. Si el comprador no tiene saldo suficiente, deshabilitar la confirmación y explicar el motivo. Los botones superiores al saldo seleccionado pueden deshabilitarse, conservando validación en el dominio.

No cambiar silenciosamente $0 por $1, redondear decimales o reducir un precio al saldo disponible. Mostrar el error y pedir corrección.

### Validaciones obligatorias

- Precio presente, finito, entero y `>= 1`.
- Precio no superior al saldo actual del comprador.
- Partida activa y ruleta inicial resuelta/confirmada.
- Ítem actual sin asignar y jugador con capacidad.
- Dinero inicial común entero **igual o mayor que 1** para nuevas partidas.

Validar tanto en la UI como en el motor; modificar el input desde DevTools o llamar directamente a la acción no debe aceptar $0. El saldo nunca puede quedar negativo.

Mensajes sugeridos:

- **«La apuesta mínima es $1.»**
- **«Ingresa un monto entero desde $1.»**
- **«Le quedan $4. El precio no puede superar ese saldo.»**
- **«Este jugador no tiene saldo para una compra.»**

Si ningún jugador elegible puede pagar el mínimo y quedan ítems, mostrar un estado claro de falta de saldo. No permitir $0, inventar dinero ni finalizar con un reparto gratuito por una regla nueva. Mantener disponibles las salidas existentes para abandonar/iniciar otra partida con confirmación. El reparto automático solo se activa por las reglas de límite ya definidas.

### Excepción: reparto automático

Los ítems restantes asignados automáticamente al alcanzar el límite mantienen **precio $0** y `autoAssigned: true`. No son apuestas ni compras manuales y no descuentan dinero.

Separar la validación de compra de la operación interna de reparto. La UI no puede usar `autoAssigned` como una opción para evitar el mínimo. En resultados, distinguir **«Compra · $1»** de **«Asignado automáticamente · $0»**.

## 6. Ruleta inicial

### Objetivo y alcance

Decidir quién hace la **primera oferta de la primera subasta**. No decide quién compra, no cobra $1 y no selecciona al comprador en los controles del host.

Realizar un sorteo por partida. No girar entre todos los ítems ni inventar una regla de alternancia para subastas posteriores. Las decisiones posteriores continúan siendo presenciales.

### Flujo

1. El host configura y valida la partida.
2. Pulsar Comenzar crea y guarda la partida con el orden de ítems definitivo.
3. Mostrar la ruleta antes de revelar el primer ítem; la asignación permanece bloqueada.
4. La ruleta muestra dos mitades iguales, con nombres y colores constantes de ambos jugadores.
5. El host pulsa **Girar ruleta**.
6. Elegir un jugador con probabilidad **50 % / 50 %**, guardar su ID y después animar el giro hacia él.
7. Mostrar **«Nicolás comienza ofreciendo $1»**, aclarando que corresponde a la primera subasta.
8. Mostrar el botón **Comenzar subasta**.
9. Al pulsarlo, marcar el inicio confirmado, revelar el primer ítem y habilitar el flujo habitual del host.

El dinero se descuenta únicamente al confirmar una compra. La primera oferta de $1 es una regla presencial, no una transacción automática por ganar la ruleta.

### Diseño

Usar una rueda circular con dos segmentos del mismo tamaño y un indicador fijo. Mantener la identidad de color de cada jugador utilizada en el resto de la aplicación. Mostrar nombres legibles, incluyendo nombres largos, y el resultado también como texto fuera de la rueda.

El giro debe desacelerar y terminar en el interior del segmento elegido, lejos del borde. La animación representa un resultado ya calculado: no determinar al ganador a partir de un temporizador, una medición de píxeles o el último frame.

Mientras gira, deshabilitar Girar y Comenzar subasta. Permitir silencio y preferencias. Anunciar el resultado de forma accesible una sola vez; no anunciar cada tick ni cada vuelta.

El ganador debe ser exactamente el jugador cuyo nombre aparece en el resultado. No ofrecer Volver a girar dentro de la misma partida.

### Persistencia y recuperación

Identificar jugadores por ID, nunca por nombre. Persistir como mínimo el resultado y si el host ya confirmó comenzar la primera subasta. Adaptar estos campos al modelo existente sin duplicar fuentes de verdad.

Modelo conceptual sugerido:

```ts
interface OpeningAuction {
  startingPlayerId: string | null;
  confirmed: boolean;
}
```

- `startingPlayerId === null`: todavía no se sorteó; mostrar Girar ruleta.
- Resultado guardado y `confirmed === false`: mostrar el resultado y Comenzar subasta.
- Resultado guardado y `confirmed === true`: mostrar el juego; no repetir ruleta.

El estado de animación es efímero; no necesita persistirse. Si se recarga o se abandona la pantalla durante el giro, recuperar el resultado ya guardado y mostrarlo directamente, sin otro sorteo ni sonido antiguo. Cancelar animación y audio pendientes.

Deshacer una asignación no borra ni cambia el resultado inicial. Repetir configuración crea una nueva partida y vuelve a sortear; continuar una existente conserva el resultado.

No reproducir el sonido de resultado al montar la pantalla de recuperación. Solo una acción nueva aceptada dispara efectos.

## 7. Integración técnica

Separar tres responsabilidades:

1. **Dominio:** validación de precios, asignaciones y estado inicial de la subasta.
2. **Presentación:** animaciones, componentes, foco y mensajes.
3. **Audio:** reproducción centralizada, volumen, silencio y cancelación.

Mantener el motor puro y comprobable sin React. Los sonidos no se disparan desde renders ni desde efectos que observan el saldo o `status` sin distinguir acciones nuevas. Emitir eventos identificados tras aceptar acciones; consumirlos una sola vez. No persistir una cola de audio que se reproduzca al hidratar.

Reutilizar las transiciones disponibles o usar CSS para controles simples. Si se necesita una librería para entradas/salidas coordinadas o ruleta, usar una sola y justificarla. Limpiar listeners, temporizadores y recursos al desmontar; verificar que React Strict Mode no duplica efectos.

Actualizar todas las referencias activas a compras manuales por $0: helpers, botones, valores iniciales, mensajes y pruebas. Mantener el cero en el reparto automático y en datos históricos legítimos.

### Partidas guardadas de la versión anterior

- No modificar precios históricos ni recalcular saldos de compras anteriores a $0.
- Una partida ya en curso continúa con sus asignaciones guardadas; todas las compras futuras cumplen el nuevo mínimo.
- No insertar una ruleta inicial a mitad de una partida que ya tenga asignaciones: marcar esa etapa como ya superada en la migración y conservar el juego.
- Una partida sin asignaciones y sin resultado inicial pasa por la ruleta antes de su primera compra.
- Si hay un snapshot antiguo de deshacer, normalizar también su estructura para que restaurarlo no rompa el acceso al juego.
- Versionar y validar el estado recuperado. No borrar catálogo o partida automáticamente para introducir campos nuevos.

## 8. Criterios de aceptación

1. Todos los controles de inicio, preparación, juego, resultados y Admin presentan feedback visual consistente.
2. Reducido/Sin animaciones conserva todas las acciones y muestra resultados sin esperas artificiales.
3. Sonido, volumen y silencio funcionan y persisten; silenciar corta efectos actuales y pendientes.
4. Recargar, rerenderizar o volver a una ruta no repite efectos anteriores.
5. GOOD/BAD no se filtra mediante audio o movimiento durante el juego.
6. No existe un botón rápido $0 para compra manual.
7. Cada ítem comienza con precio $1 y comprador sin seleccionar.
8. Rechazar $0, negativos, decimales, valores no finitos y precios superiores al saldo, también al invocar directamente el motor.
9. Una compra de $1 descuenta exactamente $1 una única vez, incluso con doble clic.
10. Un jugador con $0 no compra manualmente; no se habilita una compra gratuita como alternativa.
11. El reparto automático mantiene $0, no altera saldo y continúa distinguiéndose en resultados.
12. Crear una partida muestra la ruleta antes del primer ítem.
13. Ambos segmentos tienen igual tamaño y la selección usa probabilidades iguales.
14. La rueda se detiene en el jugador seleccionado y el texto coincide con él.
15. Girar no descuenta dinero ni asigna el ítem al ganador del sorteo.
16. No permitir asignaciones antes de confirmar Comenzar subasta.
17. Doble clic en Girar crea un único resultado; no hay botón para volver a sortear esa partida.
18. Recargar durante el giro conserva el resultado y lo muestra sin repetir giro/audio.
19. Deshacer conserva el resultado inicial y revierte la compra/reparto correspondiente.
20. Repetir configuración crea otra partida con una nueva ruleta; continuar conserva la anterior.
21. Una partida antigua con compras a $0 conserva su historial y saldo, pero no permite nuevas compras manuales a $0.
22. Si ambos jugadores elegibles quedan sin saldo, mostrar el bloqueo sin asignaciones gratuitas inventadas.
23. Animaciones interrumpidas o audio fallido no dejan controles bloqueados ni corrompen la persistencia.
24. La experiencia funciona en móvil, tablet y notebook, con teclado, foco visible y nombres largos.
25. El proyecto sigue ejecutándose y compilando con sus comandos habituales, sin configurar BBDD ni servicios externos.

Verificar con pruebas enfocadas al motor los límites de precio, conservación de saldos, reparto gratuito y bloqueo inicial. Para la ruleta, comprobar ambos resultados con aleatoriedad controlada y la restauración; no usar una prueba estadística aleatoria como único criterio de corrección. Revisar visualmente las transiciones y probar cancelación, silencio y movimiento reducido.

## 9. Entregable esperado

Entregar el prototipo actualizado con estos cambios completos, sin botones decorativos ni efectos simulados mediante retrasos arbitrarios. Documentar brevemente las nuevas preferencias, el mínimo de compra y la ruleta inicial. Indicar qué comprobaciones se ejecutaron y cualquier limitación real.

Este archivo amplía el proyecto existente; no reemplaza los documentos completos ni añade reglas de puja posteriores que el usuario no haya definido.
