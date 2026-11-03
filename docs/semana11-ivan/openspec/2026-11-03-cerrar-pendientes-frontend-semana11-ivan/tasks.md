# Tasks

## 1. Recuperación diaria — tarea 11

- [x] 1.1 Encapsular la recuperación diaria y su sondeo serializado en un hook/controlador pequeño de `lib/operacion/`, conectado a `Home`; verificar con dependencias controladas que entrada y reintento consultan `/api/operacion/actual`, y las lecturas posteriores consultan únicamente el identificador aceptado.
- [x] 1.2 Conectar el reintento y el regreso desde simulación a una nueva generación de recuperación; verificar que una identidad diaria anterior no se reutiliza como sustituto de `/actual`, se adopta una nueva identidad si el servidor la devuelve y una respuesta anterior no reemplaza la recuperación vigente.
- [x] 1.3 Conservar pausa, error, diagnóstico y último estado desactualizado durante la recuperación; verificar fallos iniciales y posteriores, ausencia de datos ficticios y ausencia de comandos de reinicio/detención/reanudación sobre la operación diaria por navegar o reintentar.

## 2. Aislamiento y controles de simulación — tareas 11 y 16

- [x] 2.1 Filtrar el descubrimiento automático por tipo explícito 5D/Colapso y estado vivo; verificar listas que contengan solo Día a Día, mezcla de tipos y tipo ausente, conservando Día a Día cuando no existe una simulación elegible.
- [x] 2.2 Invalidar de forma síncrona respuestas de descubrimiento, sondeo y comandos al cerrar/cambiar vista o desmontar, y serializar el sondeo de simulación; verificar con promesas demoradas que no se acumulan lecturas y que una simulación abandonada no reaparece ni cambia reloj, escenario o selección.
- [x] 2.3 Conectar **Detener y volver al día a día** a la detención confirmada de la simulación seleccionada y posterior recuperación diaria, bloqueando ejecuciones duplicadas; verificar identificador destinatario, orden de llamadas, doble clic y fallo de detención sin confirmar un regreso exitoso.
- [x] 2.4 Conectar el cierre de resultados finalizados a la recuperación diaria sin nueva detención; verificar ambos tipos de simulación y una respuesta pendiente resuelta entre el clic de cierre y la limpieza del efecto.

- [x] 2.5 Mostrar en la vista por URL el estado confirmado del escenario seleccionado, con estado no disponible ante fallo; verificar estados detenido, pausado y en ejecución, identidad y rechazo de respuestas tardías, y repetir la revisión del escenario 4.

## 3. Finalización de mantenimiento — soporte a tareas 11, 12 y 14

- [x] 3.1 Añadir pruebas de transición antes/durante/después de mantenimiento con ficha abierta, mapa y selector de averías; verificar el estado recibido, la ventana y que terminar mantenimiento no elimina restricciones simultáneas de avería u otra indisponibilidad.
- [x] 3.2 Corregir únicamente las derivaciones o actualizaciones de frontend que fallen en 3.1, o registrar que el comportamiento existente ya cumple; verificar paso de la suite y que ni avance del reloj del navegador ni detalle desactualizado declaran disponibilidad sin confirmación del servidor.

## 4. Validación técnica e integrada local — tareas 11–17 y regresión de simulación

- [x] 4.1 Ejecutar `node tests/lectura-operacion.cjs`, `pnpm exec tsc --noEmit` y `pnpm build` desde el frontend usando una versión compatible de pnpm; verificar los tres resultados por separado y registrar versión de herramientas y comandos exactos en `docs/semana11-ivan/verificacion-tecnica.md`.
- [x] 4.2 Preparar y documentar un entorno de regresión aislado con API, revisiones, entradas y escenarios de prueba identificados; verificar salud del backend, recuperación diaria, composición de flota real y cobertura de entradas necesaria, sin modificar la BD compartida ni fabricar unidades para alcanzar 37.
- [x] 4.3 Ejecutar la regresión local de controles para 5D y Colapso: inicio, pausa, reanudación, detención/cierre y regreso a Día a Día; verificar identificadores, estados y reloj de la operación diaria antes/después, ausencia de respuestas tardías aceptadas y consulta del estado/último plan disponible del escenario cerrado mediante las rutas existentes. Registrar cada resultado y cualquier bloqueo externo; no marcar esta tarea completa con una regresión incompleta.
- [x] 4.4 Ejecutar una ventana real de mantenimiento que llegue a su final en un escenario aislado, con la ficha de la UT abierta; verificar respuestas de mapa/unidades/incidencias y actualización visual antes y después, sin alterar el reloj diario ni simular disponibilidad. Si el motor no emite la transición, guardar evidencia del bloqueo y mantener esta comprobación pendiente.
- [x] 4.5 Revisar operador y visualizador en escritorio y ancho pequeño usando datos reales: flota y fichas, búsqueda `tm01`, ordenamientos, iconos/unidades detenidas, zoom/movimiento, selección mapa-panel, almacenes y envíos; verificar criterios 12–17 y guardar resultados visuales sin atribuir aprobación a campos no expuestos por la API.

## 5. Evidencia y candidato de Iván — tareas 23–26 y cierre

- [x] 5.1 Actualizar `docs/semana11-ivan/aceptacion.md` y `verificacion-tecnica.md` con fecha, identidades, revisiones, comandos y evidencia nueva por criterio; verificar que cada pendiente del cambio anterior tiene resultado local o bloqueo explícito, conservando los artefactos archivados sin reescribirlos.
- [x] 5.2 Actualizar `docs/semana11-ivan/notas-candidato.md` con revisión frontend/backend verificadas, URL de API utilizada, estado del árbol de trabajo, contratos, comprobaciones y limitaciones; verificar que los hashes no se presentan como contenedores de cambios sin commit y que el documento permite a integración reproducir la preparación sin implicar publicación.
- [x] 5.3 Actualizar y ensayar `guion-demostracion.md` con recuperación diaria, inspección de UT, mapa-panel, mantenimiento y regreso desde simulación; verificar una secuencia reproducible y actualizar `aporte-cierre.md` con actividades/evidencias reales, sin inventar horas ni aprobación del equipo.
- [x] 5.4 Mantener en la matriz y notas de candidato los pendientes externos de prueba multiusuario fuera de localhost, corrida oficial completa 5D y aceptación/despliegue compartidos; verificar que no figuran como aprobados por las pruebas locales ni se exige ejecutarlos para este cierre local.

Las tareas 4.3 y 4.4 son comprobaciones reales locales, distintas de las pruebas externas omitidas. Un bloqueo debe quedar documentado y no equivale a una prueba aprobada. Este cambio prepara el candidato y su evidencia; no publica ni envía mensajes al equipo.
