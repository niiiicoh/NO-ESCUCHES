# NO ESCUCHES — Requerimiento del proyecto para Codex

Versión: 1.0 · Fecha: 8 de octubre de 2026 · Nombre provisional: **NO ESCUCHES**.

Documento complementario obligatorio: `NO_ESCUCHES_REGLAS_DISENO.md`.

## 1. Instrucción principal

Construye un primer prototipo web completo y funcional para administrar un minijuego presencial entre dos jugadores. Solo el host utiliza la aplicación en un teléfono, tablet o notebook; las conversaciones, compras y pujas ocurren presencialmente.

**Esta primera versión NO debe incluir base de datos de ningún tipo, Supabase, Firebase, backend, API externa, autenticación real ni configuración de Cloudflare.** Todo debe funcionar en local con datos iniciales y persistencia en `localStorage`. No usar SQLite ni IndexedDB. La arquitectura debe permitir incorporar servicios reales posteriormente sin reescribir la interfaz.

Para el diseño, usar obligatoriamente **UI/UX Pro Max** y **`gpt-taste`**, siguiendo el documento de reglas de diseño. Estos nombres son requisitos para el entorno de implementación, no dependencias npm del producto.

Implementa la aplicación; no te limites a entregar pantallas estáticas, un plan o botones sin funcionalidad. Prioriza reglas correctas, persistencia y usabilidad antes de añadir animaciones avanzadas.

## 2. Concepto y dinámica

Cada partida tiene una temática, dos jugadores, dinero ficticio y un conjunto de ítems clasificados internamente como `GOOD` o `BAD`. El host muestra un ítem por vez, registra quién lo obtuvo y cuánto pagó; la aplicación descuenta el dinero y guarda la asignación.

Ejemplo predeterminado:

| Parámetro | Valor |
| --- | --- |
| Jugadores | Jugador 1 y Jugador 2, nombres editables |
| Dinero inicial por jugador | $20 ficticios |
| Total de ítems | 8 |
| Límite por jugador | 4 |
| Composición inicial | 4 buenos + 4 malos |

Ejemplo: Nicolás compra Pepperoni por $3. Su saldo pasa de $20 a $17 y su contador aumenta en uno.

La aplicación no dirige pujas, no decide quién debe comprar, no ejecuta pagos y no necesita conexión entre dispositivos. El host puede asignar cualquier ítem por $0. Si nadie quiere un ítem, el host igualmente debe resolver su asignación presencialmente; no existe saltar o descartar un ítem en este MVP.

La clasificación es una etiqueta editorial del catálogo, no una evaluación calculada por el sistema. Los ejemplos absurdos son contenido ficticio del juego.

## 3. Alcance del MVP

- Inicio con acceso a nueva partida, categorías y administración; continuar si existe una partida activa.
- Configuración de dos jugadores, dinero, total de ítems y límite por jugador.
- Categoría existente con selección automática aleatoria o selección manual exacta.
- Partida personalizada con ítems escritos por el host y cualquier proporción de buenos/malos.
- Pantalla del host, selección de jugador/precio, validaciones, descuento e historial de asignaciones.
- Finalización automática, reparto gratuito de los ítems restantes y resultados.
- Deshacer la última acción, incluyendo el reparto automático que esa acción haya provocado.
- Repetir configuración y crear otra partida.
- Administración local de categorías e ítems: crear, editar, duplicar categorías, activar/desactivar, buscar y eliminar con confirmación.
- Restauración de catálogo y partida tras recargar.

Fuera de esta primera versión: cuentas públicas, login real, autorización real, BBDD, sincronización, historial global de partidas, multijugador online, WebSockets, pagos, ganador automático, sonidos obligatorios, app nativa y despliegue. El historial del MVP es el registro de asignaciones de la partida actual; un archivo de partidas anteriores puede añadirse en otra fase.

## 4. Stack y arquitectura local

Usar React, TypeScript estricto, Vite, Tailwind CSS, shadcn/ui, React Router y Zustand para el estado de la partida. No usar Redux ni Next.js. Adaptar los componentes shadcn/ui al diseño propio.

Separar cuatro responsabilidades:

1. **UI:** páginas y componentes reutilizables.
2. **Dominio:** reglas, validaciones y transiciones puras de la partida.
3. **Estado:** store con acciones y estado derivado.
4. **Persistencia:** repositorios y adaptador de `localStorage`.

Los componentes no deben leer/escribir `localStorage` directamente ni importar arrays seed como fuente del catálogo. Inyectar o centralizar repositorios con contratos asíncronos para facilitar su sustitución futura. El motor del juego debe poder probarse sin renderizar React.

Estructura sugerida:

```text
src/
  app/                   # Router, providers y composición
  components/ui/         # Componentes base
  features/game/         # Motor, store, controles y validaciones
  features/categories/   # Consulta y selección
  features/admin/        # Edición local
  pages/
  hooks/
  services/              # Auth mock y utilidades de aplicación
  repositories/          # Contratos e implementación local
  types/
  lib/                   # Persistencia y helpers generales
  data/                  # Seed inicial
```

No concentrar toda la app en `App.tsx`. Evitar `any`, lógica duplicada y dependencias innecesarias.

## 5. Rutas

| Ruta | Función |
| --- | --- |
| `/` | Inicio y continuar partida |
| `/game/new` | Configuración |
| `/game/play` | Pantalla del host |
| `/game/results` | Resultados |
| `/categories` | Catálogo disponible para jugar |
| `/admin` | Panel local de categorías |
| `/admin/categories/:id` | Edición de categoría e ítems |

Sin partida válida, `/game/play` y `/game/results` deben mostrar una salida clara hacia nueva partida. Si la partida ya terminó, abrir resultados; si aún está activa, no mostrar resultados anticipados. Incluir página de ruta inexistente.

## 6. Nueva partida

### Datos generales

- Dos nombres obligatorios, recortando espacios. Usar valores iniciales Jugador 1/Jugador 2. Identificar a los jugadores mediante IDs, no nombres.
- Dinero inicial común: número entero no negativo, predeterminado 20. Es moneda ficticia, no CLP ni cobros reales.
- Total: entero igual o mayor que 2, predeterminado 8.
- Límite por jugador: entero positivo, predeterminado `ceil(total / 2)`.

**Decisión de coherencia para el prototipo:** permitir un límite configurable entre `ceil(total / 2)` y `total`. Por tanto, debe cumplirse `total <= 2 * límite`. Así el reparto restante nunca excede el límite del segundo jugador. Con total 8 y límite 3, impedir comenzar y explicar que se necesita al menos 4. Con total 8 y límite 5, una distribución 5/3 es válida. Con total impar, puede haber una diferencia de un ítem o mayor según el límite elegido; no prometer reparto idéntico.

Cuando cambie el total, recalcular el límite predeterminado si el host no lo personalizó; si quedó inválido, mostrar validación visible. No corregir silenciosamente una configuración manual.

### Modo A: categoría existente

Seleccionar una categoría activa del catálogo. Mostrar sus cantidades activas disponibles.

**Selección automática:** controlar la cantidad de malos mediante slider y un campo numérico accesible. Su rango es de 0 al total, ambos incluidos. Calcular `buenos = total - malos`. Mostrar siempre la composición, por ejemplo «2 buenos + 6 malos». No imponer una proporción 50/50.

Seleccionar sin reemplazo la cantidad requerida de cada tipo, unir ambas muestras y mezclar con Fisher–Yates. No usar `sort(() => Math.random() - 0.5)`. Guardar el orden al crear la partida; no volver a sortear al recargar o renderizar.

**Selección manual exacta:** listar los ítems activos buenos/malos con controles de selección, mostrar contadores por tipo y `seleccionados / total`. El host elige exactamente qué ítems se incluirán y puede usar cualquier composición. En este modo, la composición se deriva de la selección y reemplaza al slider automático. Mezclar los seleccionados antes de empezar.

Permitir crear una opción para esta partida desde la preparación, sin obligar al host a salir. Esta opción temporal no modifica el catálogo; si se desea añadirla permanentemente, hacerlo desde Admin.

### Modo B: partida personalizada

Nombre de temática obligatorio y dos listas editables: Buenos y Malos. Permitir añadir y eliminar filas, incluyendo cero filas de uno de los tipos. No guardar automáticamente la temática en el catálogo.

Cada fila representa un ítem que se incluirá: exigir exactamente el total configurado de nombres no vacíos. Mostrar composición y progreso de selección. Recortar espacios y detectar nombres duplicados sin distinguir mayúsculas/minúsculas; no iniciar hasta corregirlos. No desechar filas vacías silenciosamente.

### Validaciones

- Categoría e ítems activos; no incluir desactivados.
- Capacidad suficiente por tipo en modo automático. Ejemplo: «Necesitas 6 ítems buenos y esta categoría tiene 4. Añade 2 o cambia la composición».
- Cantidad exacta en selección manual/personalizada.
- Ningún ítem repetido en la partida.
- Configuración numérica válida; no aceptar valores negativos, decimales, `NaN` o infinito.
- Si existe una partida activa, confirmar antes de reemplazarla.

## 7. Pantalla del host

Mostrar temática, progreso «Ítem 3 de 8», nombre del ítem actual y tarjetas de ambos jugadores con nombre, saldo y contador `2 / 4`.

**No revelar GOOD/BAD durante el juego.** No filtrar la clasificación mediante color, icono, subtítulo, etiqueta accesible o historial. El host puede conocerla por la preparación; el requisito es que la pantalla de juego no la anuncie. Es información local, no un secreto protegido contra DevTools.

Flujo de asignación:

1. Seleccionar jugador con un botón grande y estado seleccionado claro.
2. Seleccionar precio rápido: $0, $1, $2, $3, $4, $5 o $10; también permitir otro monto entero.
3. Confirmar con «Asignar a Nicolás por $3».
4. Registrar, descontar, actualizar contadores y avanzar al siguiente ítem.

Precio $0 válido. Rechazar un precio mayor al saldo, un jugador lleno y una asignación sin partida activa. Nunca permitir saldo negativo. Un jugador sin dinero puede recibir ítems a $0.

Tras asignar, limpiar jugador/precio de la siguiente decisión para evitar compras accidentales. Evitar duplicar una acción por doble clic. Guardar inmediatamente el nuevo estado.

Mostrar un historial compacto: «Pepperoni → Nicolás · $3». El ítem actual y los controles tienen prioridad visual; el historial no debe empujarlos fuera de alcance.

## 8. Finalización y deshacer

Después de cada asignación manual:

1. Si un jugador alcanza el límite, asignar en el orden guardado todos los ítems sin dueño al otro jugador.
2. Cada asignación automática cuesta $0 y tiene `autoAssigned: true`.
3. Terminar la partida y mostrar «Partida terminada», un breve aviso del reparto automático y «Ver resultados».
4. Si se agotaron todos los ítems antes de que alguien alcance el límite, terminar igualmente.

El reparto automático no requiere decisiones adicionales ni altera el saldo del receptor. La validación previa del límite garantiza que todos caben.

**Deshacer última acción:** almacenar un único snapshot inmediatamente anterior a cada asignación manual. Restaurarlo completo al deshacer: dinero, asignaciones, índice y estado. Si la última compra terminó la partida y provocó reparto automático, deshacer revierte la compra y TODO ese reparto como una sola operación; vuelve a `PLAYING` con el mismo orden.

El snapshot también debe persistirse para que deshacer funcione tras recargar. Tras usarlo, deshabilitar deshacer hasta otra asignación manual. Ofrecerlo en el aviso final y en resultados si existe. No generar una pila de múltiples undo en este MVP.

## 9. Resultados

Mostrar por jugador:

- Ítems obtenidos y clasificación visible «Bueno»/«Malo».
- Precio pagado por cada ítem.
- Marca «Asignado automáticamente» donde corresponda.
- Cantidad de buenos/malos.
- Dinero inicial, total gastado y dinero restante.

No determinar ganador automáticamente. No asumir que gastar menos o tener más buenos define una victoria.

Acciones: Nueva partida, Repetir configuración y Deshacer última acción cuando esté disponible. Repetir configuración conserva nombres, dinero, total, límite, categoría y modo. En modo automático realiza un nuevo sorteo; en manual/personalizado conserva las opciones y vuelve a mezclarlas. Reinicia dinero y progreso, y crea un nuevo ID.

Una partida conserva copias de los nombres y tipos de sus ítems; editar/eliminar el catálogo después no debe cambiar sus resultados. Para repetir una configuración del catálogo, validar nuevamente disponibilidad; si algo ya no existe o está inactivo, informar y volver a preparación.

## 10. Catálogo y administración local

`/categories` muestra categorías activas con emoji, descripción y cantidades de buenos/malos activos. Desde ahí se puede preparar una partida.

`/admin` permite:

- Crear categorías con nombre, emoji y descripción opcional.
- Editar nombre/emoji/descripción.
- Activar/desactivar y buscar.
- Duplicar una categoría con sus ítems, nuevos IDs y nombre editable.
- Eliminar una categoría con confirmación y eliminar sus ítems del catálogo en la misma operación.
- Crear, editar, activar/desactivar, buscar y eliminar ítems buenos/malos.
- Cambiar tipo o mover un ítem a otra categoría existente.

Validar nombres no vacíos y evitar duplicados normalizados dentro de una categoría, incluyendo entre tipos. Mostrar categorías e ítems desactivados dentro de Admin con estado claro. Confirmar eliminaciones; evitar confirmaciones repetidas para ediciones reversibles.

El catálogo debe persistir tras recargar. El seed se aplica solo cuando no hay catálogo previamente guardado; no volver a insertar datos eliminados. Restaurar ejemplos, si se incluye, debe ser una acción explícita con confirmación.

### Acceso del prototipo

Centralizar un mock `useAuth()`/servicio con `isAdmin = true`. No dispersar condiciones hardcodeadas. Añadir una indicación discreta en Admin: «Administración local · acceso de demostración».

No crear un login de mentira ni pedir correos/contraseñas. **El panel local no tiene protección real y no debe publicarse como una administración segura.** El requisito de que solo el usuario administrador pueda entrar corresponde a la siguiente fase con Auth y permisos de servidor.

## 11. Contratos y modelos

Usar IDs estables generados al crear entidades. Mantener tipos separados para entidades del catálogo y snapshots de partida.

```ts
type ItemType = 'GOOD' | 'BAD';
type GameStatus = 'SETUP' | 'PLAYING' | 'FINISHED';
type SelectionMode = 'RANDOM' | 'MANUAL' | 'CUSTOM';

interface Category {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

interface Item {
  id: string;
  categoryId: string;
  name: string;
  type: ItemType;
  active: boolean;
  createdAt: string;
}

interface Player {
  id: string;
  name: string;
  startingMoney: number;
}

interface GameItem {
  id: string;
  sourceItemId?: string;
  categoryId?: string;
  name: string;
  type: ItemType;
  order: number;
  assignedPlayerId: string | null;
  price: number;
  autoAssigned: boolean;
}

interface GameConfig {
  selectionMode: SelectionMode;
  categoryId?: string;
  categoryName: string;
  totalItems: number;
  maxItemsPerPlayer: number;
  startingMoney: number;
  badCount: number;
}

interface Game {
  id: string;
  config: GameConfig;
  players: [Player, Player];
  items: GameItem[];
  currentItemIndex: number;
  status: GameStatus;
  createdAt: string;
}

interface PersistedGameState {
  version: number;
  currentGame: Game | null;
  undoSnapshot: Game | null;
}
```

Derivar saldo e ítems de cada jugador desde las asignaciones para evitar dos fuentes de verdad. `saldo = startingMoney - sum(precios asignados)`. `assignedPlayerId !== null` indica asignación; no almacenar otro boolean redundante.

Contratos del catálogo: `getCategories`, `getCategory`, `createCategory`, `updateCategory`, `deleteCategory`, `duplicateCategory`, `getItemsByCategory`, `createItem`, `updateItem`, `deleteItem`. Usar `Promise` en el contrato y una implementación local encapsulada; no añadir cliente Supabase ni archivos SQL ahora.

Helpers de dominio: validación de configuración, muestreo sin reemplazo, shuffle, creación de partida, asignación, reparto automático, resumen y deshacer.

## 12. Persistencia y recuperación

Usar claves con namespace y versión, por ejemplo:

- `no-escuches:catalog:v1`
- `no-escuches:game:v1`
- `no-escuches:preferences:v1`, solo si hay preferencias reales.

Guardar JSON versionado y validar datos recuperados en tiempo de ejecución; TypeScript no valida JSON. Restaurar antes de renderizar decisiones para evitar sobrescribir una partida con valores iniciales.

No cambiar el orden aleatorio al hidratar. No escribir solo al cerrar la pestaña. Capturar errores de lectura/escritura, datos dañados y almacenamiento no disponible; mostrar un mensaje claro y permitir una recuperación explícita sin borrar otros datos. No fingir que se guardó correctamente si falló.

`localStorage` funciona por navegador y origen: no proporciona sincronización ni copias entre equipos. Este límite es aceptado para el prototipo. No garantizar funcionamiento offline desde una primera visita sin preparar un service worker; no forma parte del alcance.

## 13. Datos iniciales

| Categoría | Buenos | Malos |
| --- | --- | --- |
| 🍕 Ingredientes de pizza | Pepperoni; Mozzarella; Queso cheddar; Jamón; Choclo; Champiñones; Aceitunas; Tocino | Clavos oxidados; Vello púbico; Sudor de axila; Quesillo del pico; Arena; Pasta dental; Aceite de motor; Pelo mojado |
| 🥤 Ingredientes de batido | Leche; Plátano; Frutilla; Yogur; Avena; Cacao; Miel; Mango | Agua de completos; Salsa de soja; Pasta dental; Arena; Cebolla cruda; Aceite de motor; Agua de calcetín; Café con sal |
| 🏝️ Isla desierta | Agua potable; Encendedor; Cuchillo; Botiquín; Cuerda; Linterna; Carpa; Filtro de agua | Televisor; Microondas; Ladrillo; Impresora; Control remoto; Florero; Aspiradora; Calendario vencido |

Todos los ejemplos iniciales deben estar activos y tener IDs. No cambiar ni suavizar automáticamente los nombres aportados por el host.

## 14. Fases posteriores — referencia, no implementación

La arquitectura prevista para después del MVP es React/Vite en Cloudflare Pages y catálogo central en Supabase PostgreSQL, con Supabase Auth y RLS. La partida puede seguir siendo local.

Solo el administrador real podrá escribir en el catálogo. Lectura pública limitada a categorías/ítems activos; CRUD reservado al admin. La categoría personalizada de un visitante seguirá siendo temporal/local. Guardarla en el catálogo central será una acción exclusiva del admin, nunca una escritura pública por marcar un checkbox.

No implementar estas fases, no crear tablas, migraciones, variables de Supabase, credenciales ni hosting en el primer prototipo. No incluir estimaciones de precios de proveedores como parte del requerimiento.

## 15. Criterios de aceptación

1. Crear una partida Pizza, total 8, 2 buenos/6 malos, nombres personalizados y $20 por persona.
2. Crear partidas con 0 buenos/8 malos y 8 buenos/0 malos.
3. Seleccionar manualmente 1 bueno/7 malos y recibir exactamente esos ítems, mezclados.
4. Rechazar cantidades superiores a los ítems activos disponibles con explicación específica.
5. Crear una temática personalizada de 8 ítems sin añadirla al catálogo.
6. Cobrar $3, descontar exactamente $3 y registrar una sola asignación incluso con doble clic.
7. Aceptar $0; rechazar negativos, decimales y precios superiores al saldo.
8. Al alcanzar 4/4, repartir gratis lo restante al otro jugador y finalizar.
9. Deshacer esa última compra revierte también el reparto automático y reabre el ítem anterior.
10. Recargar durante la partida conserva orden, dinero, asignaciones y opción de deshacer.
11. Finalizar por agotamiento de ítems aunque nadie haya alcanzado un límite superior a la mitad.
12. Rechazar total 8/límite 3; aceptar total 8/límite 5 y total 9/límite 5.
13. Mostrar clasificaciones solo en preparación, catálogo/admin y resultados; ocultarlas en juego/historial.
14. Crear/editar/duplicar/desactivar/eliminar categorías e ítems y conservar cambios tras recargar.
15. Usar una categoría recién creada en una partida. No seleccionar ítems inactivos.
16. Editar el catálogo no altera una partida existente.
17. Repetir configuración reinicia saldos/progreso y genera una nueva partida.
18. Navegar a rutas sin partida o con datos inválidos no causa una pantalla rota.
19. Usar la interfaz en móvil, tablet y notebook sin scroll horizontal ni controles ocultos por el teclado.
20. Ejecutar correctamente `npm install`, `npm run dev` y `npm run build`.

Añadir pruebas enfocadas al motor: conservación del total de ítems, no repetición, composición extrema, saldo no negativo, reparto automático, validación de límites y undo completo. Verificar la UI y restauración manualmente o con pruebas de flujo. Documentar qué se verificó y cualquier limitación real.

## 16. Entrega de implementación

Entregar código organizado, README con comandos, explicación breve de persistencia local y acceso admin de demostración, y registro de validación. La aplicación debe poder recorrerse de inicio a resultados y administrarse completamente sin configurar servicios externos.

Leer este archivo y `NO_ESCUCHES_REGLAS_DISENO.md` antes de implementar. En caso de conflicto, las reglas funcionales de este archivo prevalecen sobre decisiones estéticas.
