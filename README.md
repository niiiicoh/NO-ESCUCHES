# NO ESCUCHES

Prototipo funcional para administrar un juego presencial entre dos jugadores. Solo el host utiliza la aplicación. Las pujas y conversaciones ocurren en la mesa; el dinero es ficticio.

## Ejecutar

Requiere Node.js 22.12 o superior (verificado con Node 24.18) y npm.

```powershell
git clone https://github.com/niiiicoh/NO-ESCUCHES.git
cd NO-ESCUCHES
npm install
npm run dev
```

Si ya tienes el proyecto, ejecuta los comandos npm desde su carpeta. La copia de trabajo original está en `F:\Proyectos WEB\Proyectos\NO ESCUCHES`.

Abre `http://127.0.0.1:5198`. El puerto es exclusivo y estricto para evitar abrir por accidente otra aplicación local. Si está ocupado, cierra la instancia anterior de este proyecto o utiliza `npm run dev -- --port 5200`. Cambiar el puerto cambia el origen y, por tanto, los datos visibles.

```powershell
npm run build       # TypeScript estricto + distribución en dist/
npm run preview     # Revisar la compilación
npm test            # Motor, repetición y persistencia
npm run test:e2e    # Flujos en Microsoft Edge
```

Las pruebas de navegador usan Edge instalado en Windows. En otro sistema, cambia `channel` en `playwright.config.ts` por tu navegador o elimina esa opción e instala Chromium con `npx playwright install chromium`. Las capturas se generan en `validation/`.

## Qué puedes hacer

- Configurar nombres, dinero inicial, total y límite entre `ceil(total / 2)` y el total.
- Elegir una categoría con composición aleatoria libre, selección manual exacta o temática personalizada.
- Añadir opciones temporales sin modificar el catálogo.
- Asignar el ítem actual por un precio entero, incluido $0, respetando saldo y límite.
- Terminar por agotamiento o por alcanzar el límite, con reparto restante gratuito.
- Deshacer una única decisión, incluyendo todo su reparto automático, también tras recargar.
- Revelar clasificaciones en resultados y repetir la configuración con otra mezcla.
- Crear, editar, duplicar, activar, buscar y eliminar categorías e ítems; cambiar clasificación y mover ítems entre categorías.

La pantalla del host no anuncia clasificaciones ni opciones futuras. Los resultados no determinan un ganador. Los nombres originales del seed se conservan.

## Persistencia y recuperación

Solo se utiliza `localStorage` con JSON versionado:

- `no-escuches:catalog:v1`: categorías e ítems.
- `no-escuches:game:v1`: partida actual y snapshot de deshacer.

La recuperación ocurre antes de mostrar decisiones. Zod valida estructuras e invariantes: IDs, referencias, composición, índices, asignaciones, saldos y compatibilidad exacta del snapshot con la última transición. El orden aleatorio se guarda y no se sortea al recargar.

Una escritura fallida mantiene el estado anterior y deja un mensaje persistente. Los datos dañados permiten restablecer únicamente catálogo o partida mediante una confirmación explícita. El seed se escribe solo si no hay catálogo guardado; un catálogo vacío sigue vacío. No se borran datos de otras aplicaciones.

Los datos pertenecen a este navegador y origen. No hay sincronización, archivo global de partidas ni copias entre dispositivos. No se promete una primera visita offline; no hay service worker. El catálogo se copia en la partida, por lo que una edición posterior no altera sus resultados.

## Administración de demostración

`/admin` utiliza el servicio centralizado `useAuth()` con `isAdmin: true`. No hay autenticación ni protección real. El prototipo no debe presentarse como una administración segura. No pide credenciales ni requiere configuración externa.

## Organización

| Carpeta                                  | Responsabilidad                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/app`, `src/pages`, `src/components` | Router e interfaz; componentes base adaptados del patrón shadcn/ui con Radix, Slot y CVA |
| `src/features/game`                      | Reglas puras, selección Fisher–Yates, resúmenes, repetición y store Zustand              |
| `src/features/admin`                     | Editor reutilizable de ítems                                                             |
| `src/repositories`                       | Contratos asíncronos del catálogo y partida; implementaciones locales                    |
| `src/lib`                                | Adaptador de almacenamiento, validación y utilidades                                     |
| `src/types`, `src/data`                  | Entidades separadas de snapshots y datos iniciales                                       |
| `src/services`                           | Acceso de demostración centralizado                                                      |

La UI no accede directamente al almacenamiento ni importa los datos iniciales. Los repositorios pueden sustituirse por implementaciones remotas manteniendo sus contratos. No se incluyen backend, bases de datos, login, API externa ni despliegue.

## Diseño y habilidades utilizadas

Se leyeron las instrucciones completas de **UI/UX Pro Max**, **gpt-taste** y **agency-accessibility** del entorno. Se ejecutó la búsqueda de sistema de diseño de UI/UX Pro Max y una consulta de formularios/diálogos para shadcn; se revisaron sus reglas de UX y checklist.

- UI/UX Pro Max: jerarquía de acción, controles táctiles, etiquetas, feedback, diálogos controlados, foco y adaptación por ancho. Su sugerencia genérica de marketing se adaptó al contexto de herramienta de juego.
- gpt-taste: selección Python determinista con semilla 48: Editorial Split, Outfit, Horizontal Accordions / Infinite Marquee / Feedback Carousel, Image Scale / Text Reveal. Se aplicaron composición editorial, tipografía ancha, grid denso completo, contraste y revelado GSAP de 180 ms. Carruseles, marquee, scroll fijado, AIDA extenso y recursos remotos se omitieron por conflicto con las prioridades funcionales y los límites visuales de la especificación del proyecto. No se añadió GSAP ScrollTrigger a una mesa que debe mantenerse estable.
- agency-accessibility: HTML semántico, navegación por teclado, foco visible, controles grandes, `aria-live`, diálogos Radix con foco contenido y retorno al disparador, movimiento reducido y pruebas responsive.

Outfit se sirve desde archivos locales del paquete `@fontsource`; la UI usa Segoe UI/system-ui. Los colores se centralizan en variables CSS y se exponen a Tailwind. Los emojis se reservan para categorías, tal como solicita la especificación. No hay descargas externas de fuentes o imágenes durante el uso.

Fuentes técnicas consultadas: [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite), [componentes Radix de shadcn/ui](https://ui.shadcn.com/docs/changelog/2025-06-radix-ui).

Consulta [VALIDACION.md](VALIDACION.md) para las verificaciones realizadas y límites de la revisión.
