# NO ESCUCHES — Reglas de diseño para Codex

Versión: 1.0 · Fecha: 8 de octubre de 2026.

Aplicar junto con `NO_ESCUCHES_PROYECTO.md`. Este archivo define la experiencia y dirección visual del prototipo; no cambia sus reglas de juego ni autoriza incorporar servicios externos.

## 1. Uso obligatorio de UI/UX Pro Max y gpt-taste

Antes de diseñar o implementar pantallas, localizar y leer las instrucciones completas de **UI/UX Pro Max** y **`gpt-taste`** disponibles en el entorno Codex donde se desarrolle el proyecto. Aplicar ambas durante la definición del sistema visual y la revisión final.

- Usar UI/UX Pro Max para fundamentar flujos, jerarquía, componentes, comportamiento responsive y accesibilidad según sus instrucciones reales.
- Usar `gpt-taste` para orientar la dirección visual, composición y revisión estética según sus instrucciones reales.
- Si cualquiera prescribe herramientas, referencias o un flujo concreto, seguirlo dentro del alcance del prototipo.
- Registrar en el README las habilidades efectivamente utilizadas y las decisiones aplicadas.

**Estas funciones expresan cómo se solicita usar las habilidades; no son una transcripción de sus SKILL.md.** No inventar instrucciones, comandos, rutas de instalación ni afirmar que se usaron sin haberlas leído.

Si no aparecen, buscar sus instrucciones en el catálogo de habilidades y en las ubicaciones indicadas por el entorno. Si siguen ausentes, informar exactamente cuál falta y solicitar su fuente antes de cerrar el diseño como conforme. Se puede avanzar en el motor y contratos locales mientras se resuelve la disponibilidad.

Este documento se ha redactado como especificación; no acredita que estas dos habilidades hayan sido ejecutadas al escribirlo.

## 2. Intención del producto

Debe sentirse como una herramienta de party game para una junta entre amigos: divertida, directa y fácil de manejar. El host está mirando a personas, hablando y anotando; necesita entender el siguiente paso de un vistazo.

Tres prioridades:

1. Leer el ítem actual y los saldos rápidamente.
2. Asignar con precisión desde un teléfono.
3. Mantener el suspenso hasta los resultados.

No convertir el juego en un dashboard empresarial, una plantilla SaaS o una página de marketing extensa. La personalidad debe aparecer en tipografía, color, composición y mensajes breves, sin competir con las decisiones.

## 3. Dirección visual propuesta

Base propuesta para que ambas habilidades la refinen: **mesa de juego nocturna con acentos de color y tipografía expresiva**. Fondo oscuro cálido, superficies legibles, un acento lima para la acción principal y dos identidades de jugador diferenciadas. Evitar neón excesivo, efectos casino, confeti persistente, cristal transparente y degradados decorativos en cada tarjeta.

El título NO ESCUCHES puede tener tratamiento tipográfico propio; no hace falta crear un logo complejo para el MVP. Un símbolo sencillo de cartas/opciones puede acompañarlo si aporta identidad.

La interfaz debe tener una composición reconocible: ítem como protagonista, información de jugadores estable y controles cercanos a la acción. No llenar todas las pantallas de bloques idénticos.

## 4. Tokens iniciales

Valores de partida, sujetos a validación de contraste y ajustes de las habilidades. Centralizar en variables CSS y tokens Tailwind; no dispersar colores hardcodeados.

| Token | Propuesta | Uso |
| --- | --- | --- |
| Fondo | `#121316` | Lienzo principal |
| Superficie | `#1D2025` | Paneles y controles |
| Superficie elevada | `#282D34` | Selección y diálogos |
| Texto principal | `#F5F3EA` | Nombres, títulos y cantidades |
| Texto secundario | `#B5BAC3` | Ayudas y contexto |
| Acento principal | `#D5F36B` | Acción primaria, con texto oscuro |
| Jugador 1 | `#81B9FF` | Identidad constante del primer jugador |
| Jugador 2 | `#F5B17B` | Identidad constante del segundo jugador |
| Bueno | `#88D6A3` | Solo zonas donde se revela el tipo |
| Malo/error | `#FF8F9B` | Resultados y errores con texto/icono |

Validar contraste real en cada combinación; no asumir que una paleta lo garantiza. Bordes sutiles para delimitar superficies, foco de alto contraste y sombras moderadas. La identidad de jugador no debe confundirse con GOOD/BAD.

Espaciado con escala de 4/8 px; base de controles de 48 px de alto, acciones principales 52–56 px. Radios coherentes de 12–20 px según tamaño, evitando redondear absolutamente todo como una píldora.

## 5. Tipografía

Máximo dos familias: una expresiva para títulos/ítem y otra muy legible para UI. Preferir recursos locales o fuentes del sistema; ninguna dependencia de una descarga externa debe ser necesaria para usar el prototipo.

- Texto y formularios: 16 px como base.
- Ayudas: 14 px cuando siga siendo legible.
- Nombre del ítem: aproximadamente 28–48 px, adaptado a ancho y longitud.
- Saldos: cifras con variante tabular para evitar saltos.
- Evitar mayúsculas en párrafos y textos largos.
- Los nombres largos deben envolver sin truncar el contenido esencial.

No usar tamaños enormes que hagan desaparecer controles en teléfonos bajos. La tipografía expresiva es un acento, no una excusa para dificultar lectura.

## 6. Navegación y responsive

Diseñar primero para móvil. Verificar al menos 360 px y 390 px de ancho, tablet de 768 px y notebook de 1366 px.

En móvil, navegación compacta con enlaces accesibles a Nueva partida, Categorías y Admin; no llenar el área de juego con navegación secundaria. Usar menú si hace falta. En notebook, navegación visible y contenido con ancho máximo razonable; no estirar formularios de borde a borde.

Panel del host:

- Mantener ambos jugadores visibles y con igual peso visual.
- Ítem y progreso en la parte principal.
- Selección y confirmación en una zona alcanzable con el pulgar.
- Historial compacto por debajo o en un panel secundario.
- Si se fija una acción al fondo, reservar espacio, respetar safe areas y garantizar que no tapa contenido ni foco.
- El teclado virtual no debe ocultar el precio, su error o la confirmación.

Adaptar por espacio disponible, no por nombre del dispositivo. Evitar scroll horizontal, tablas rígidas y tooltips como única vía para conocer una acción.

## 7. Reglas por pantalla

### Inicio

Una acción principal: «Nueva partida». Si hay partida activa, dar prioridad a «Continuar partida». Mostrar una explicación de una frase y accesos secundarios discretos. No inventar rankings, estadísticas o reseñas.

### Preparación

Agrupar en secciones claras: Jugadores, Reglas e Ítems. Mantener resumen de total/composición/límite cerca de Comenzar.

Usar un selector explícito entre Categoría existente y Personalizada. Para catálogo, otro selector entre Aleatoria y Manual. No esconder modos importantes en un menú.

Slider de malos con valor numérico editable y texto «2 buenos + 6 malos». Ambos extremos deben funcionar. En manual, marcar seleccionados y mostrar «8 de 8», sin depender solo del color. Si hay demasiados o faltan ítems, indicar cuánto y cómo corregirlo.

Formularios con etiquetas visibles; los placeholders son ejemplos, no etiquetas. Los errores van junto al campo y deben conservar los datos ingresados.

### Juego

Orden de lectura: progreso, ítem, jugadores y saldo, precio, confirmar. Mostrar un único ítem actual. Nunca adelantar ítems futuros durante la partida.

Los botones de jugadores deben mostrar nombre y selección con borde/icono/texto. La acción principal debe expresar la decisión: «Asignar a Bastián por $2». Desactivar cuando falte información, explicando qué falta en contexto.

No colorear la carta según tipo. No añadir GOOD/BAD ni siquiera en el historial o nombre accesible. El nombre por sí mismo puede resultar absurdo; no modificarlo para ocultarlo.

Tras una asignación, feedback breve y avance claro. Mantener la estructura estable; no saltar el layout ni cambiar aleatoriamente los colores.

### Fin y resultados

Explicar el reparto automático: «Nicolás llegó al límite. Los 3 ítems restantes van a Bastián por $0».

Resultados paralelos por jugador, con nombre, lista y resumen. Usar texto «Bueno»/«Malo» más icono y color. Mostrar «Automático · $0» de forma legible. No usar celebraciones que sugieran un ganador que el juego no calcula.

Nueva partida y Repetir configuración deben distinguirse. Deshacer la última acción estará disponible cuando el estado lo permita.

### Catálogo y Admin

Catálogo orientado a elegir. Admin orientado a editar sin perder personalidad ni claridad. Mostrar conteos activos; en Admin, indicar también desactivados cuando sea útil.

Buenos y Malos en dos columnas solo si hay espacio; en móvil, apilados o con pestañas y sus contadores. Evitar listas inmensas sin búsqueda ni grupos.

Editar/eliminar deben tener nombres accesibles, no solo lápiz/basurero. Confirmar eliminaciones en un diálogo que nombre lo afectado. Tras guardar, actualizar la vista y dar feedback visible. Tras crear una categoría vacía, guiar a añadir ítems.

Indicación discreta de administración local de demostración, sin simular un login seguro.

## 8. Componentes y estados

Crear componentes compartidos para botones, campos, controles segmentados, tarjeta de jugador, composición, ítem actual, historial, editor de ítems, estado vacío y confirmaciones. Usar shadcn/ui como base accesible y personalizar sus tokens.

Diseñar estados predeterminado, hover cuando aplique, foco, presionado, seleccionado, deshabilitado, error y vacío. Añadir estados de carga solo donde exista una operación real; no retrasar artificialmente acciones locales para mostrar un spinner.

Estados vacíos con explicación y acción concreta: «Esta categoría aún no tiene ítems. Añade uno bueno o malo». Fallos de persistencia deben ser visibles; no ocultarlos dentro de un toast que desaparece antes de leerlo.

No usar alertas nativas del navegador como sistema visual principal si hay componentes accesibles disponibles.

## 9. Accesibilidad y prevención de errores

- Objetivos táctiles de al menos 44 × 44 px; preferir 48 px para controles habituales.
- Contraste mínimo objetivo: 4.5:1 para texto normal y 3:1 para texto grande y elementos gráficos funcionales.
- Navegación completa por teclado y foco claramente visible.
- Usar botones reales, labels, controles semánticos y nombres accesibles.
- Indicar selección/estado por algo más que color.
- Diálogos con foco contenido, cierre adecuado y devolución del foco al disparador.
- Anunciar cambios relevantes con `aria-live` sin leer cada elemento de toda la pantalla.
- No ocultar errores en hover ni depender de gestos complejos.
- Respetar zoom, texto largo y `prefers-reduced-motion`.
- No convertir deshacer en una acción que cambia de lugar inesperadamente.

Al asignar dinero, prevenir doble envío y mostrar falta de saldo antes de confirmar. Las validaciones tienen tono directo: «Le quedan $4. El precio no puede superar ese saldo».

## 10. Movimiento y humor

Animaciones cortas, aproximadamente 120–220 ms, para selección, entrada del ítem y cambios de estado. Si se usa una revelación más expresiva, debe poder reducirse y no bloquear el siguiente paso. Evitar destellos, movimiento continuo y scroll automático inesperado.

Humor breve en contextos secundarios, por ejemplo «8 malos. Hoy nadie vino a ganar». No bromear en mensajes de saldo, errores, borrado o fallos de guardado. No agregar una ruleta, casino o mecánica extra que no esté en el requerimiento.

No activar sonidos por defecto; no son necesarios en este prototipo.

## 11. Límites visuales

- No usar plantillas empresariales sin adaptación.
- No dejar estilos shadcn/ui predeterminados como identidad final.
- No combinar muchos acentos intensos en la misma pantalla.
- No usar emojis como sustituto de todos los iconos; reservarlos principalmente para categorías.
- No aplicar glassmorphism, degradados, sombras o animaciones a cada elemento.
- No introducir ilustraciones que ocupen el espacio de controles esenciales.
- No poner términos técnicos como localStorage, repositorio o RLS en el flujo normal del jugador.
- No mostrar botones que todavía no funcionen ni funciones futuras como si ya existieran.
- No sacrificar precisión de precios y estados por una apariencia divertida.

## 12. Revisión antes de entregar

1. Confirmar lectura y aplicación real de UI/UX Pro Max y `gpt-taste` en el entorno de implementación.
2. Revisar capturas de preparación, juego, resultados y Admin en móvil y notebook; corregir jerarquía y consistencia.
3. Probar nombres largos, ítems largos y listas completas de ocho o más opciones.
4. Probar 0 buenos/8 malos y 8 buenos/0 malos sin controles rotos.
5. Confirmar que GOOD/BAD no se filtra en la pantalla del host.
6. Probar teclado, foco, contraste, zoom y movimiento reducido.
7. Probar precio con teclado virtual y barras fijas en un viewport móvil.
8. Verificar errores, listas vacías, confirmación de borrado y fallos de persistencia.
9. Confirmar que no existe scroll horizontal ni contenido tapado.
10. Recorrer una partida completa y administrar una nueva categoría.

La entrega se considera conforme cuando combina una identidad visual propia con un flujo claro y todas las reglas funcionales de `NO_ESCUCHES_PROYECTO.md`. Una captura atractiva no sustituye la verificación del juego completo.
