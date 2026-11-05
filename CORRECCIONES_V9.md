## Presentación de reportes — 5 de noviembre de 2026

Centro de reportes rediseñado con resumen ejecutivo, indicadores físicos y del plan diferenciados, progreso de pedidos completos, pestañas accesibles por teclado y búsqueda de rutas por UT/pedido. Documento HTML con identidad visual PaqRap, secciones numeradas, tablas legibles, vista móvil y estilos de impresión A4 horizontal; botón para imprimir o guardar como PDF. Fechas de generación presentadas en hora de Lima.

Verificado mediante compilación TypeScript, cuatro guiones de frontend y navegador de escritorio/móvil sobre un escenario ya finalizado. Búsqueda, navegación por teclado, diagramas y descarga HTML aprobados sin peticiones de modificación ni ejecución de simulaciones. Alcance: local.

# Revisión vigente — 5 de noviembre de 2026

Esta sección y REVISION_2026_11_05.md describen la entrega vigente. Las secciones siguientes conservan el historial; sus puertos, estado de servicios y recuentos de pruebas corresponden a revisiones anteriores.

- Lectura atómica de mapa y flota, cancelación de consultas bloqueadas y recuperación automática.
- Marcadores con identidad estable e interpolación únicamente sobre trayectorias confirmadas; rutas pendientes, recorridas y restantes diferenciadas.
- Paneles accesibles de flota, almacenes, envíos/productos, incidencias, datos, indicadores y reportes. Paneles móviles con altura útil independiente de la barra superior; barra completamente plegable.
- Carga múltiple de ventas mensuales y archivos de incidencias, con resultados por archivo y control de cobertura entre meses.
- Filtros compartidos entre mapa y listas, búsqueda numérica y ordenamientos comprobables; almacenes con existencias, semáforo, movimientos y filtros.
- Alta y edición de almacenes y UT bajo mantenimiento; preservación de los parámetros configurados.
- Reporte legible HTML imprimible, además de JSON/CSV, última planificación estable y dos diagramas de secuencia dentro del panel Reportes.
- Averías A1/A2/A3 con texto e icono además del color, vigentes en el intervalo [inicio, fin).

Validación de esta revisión: 15 pruebas focalizadas de backend aprobadas, cuatro guiones de pruebas de frontend aprobados, compilación de producción con TypeScript y comprobaciones de navegador. Se consultó un escenario ya finalizado y se inyectaron respuestas de prueba para movimiento, filtros y cargas. No se inició ninguna simulación ni se modificó PUCP. Dos sesiones de navegador verificadas; falta aceptación en dos dispositivos físicos y ejecución completa a cargo del usuario.

---

# PaqRap — Versión 9

## Correcciones de la revisión funcional — 3 de noviembre de 2026

Se consideran los criterios funcionales; se excluyen las filas «Futuro», «Protegido», títulos, separadores y filas vacías.

- Los filtros por código de UT, rango de kilómetros/minutos y destino inmediato ahora se comparten entre lista y mapa. La lista muestra la métrica filtrada y advierte sobre datos no disponibles y rangos inválidos.
- El origen del envío filtra por almacén de salida de la ruta y se refleja en el mapa. La selección de almacenes se indica en las listas y en el mapa.
- Nuevo `GET /api/escenarios/{id}/envios`: corte por entrega parcial con pedido, destino, almacén, UT, horarios, estado físico, identificadores y ruta registrada. Conserva las rutas de parciales entregados después de replanificar.
- El panel distingue **pedidos completos**, **envíos por parcial** y **productos identificados**. La ventana, de cuatro horas por defecto, usa la última entrega para un pedido completo y la entrega específica para sus productos. La vista futura de pedidos completos requiere que todas las cantidades estén asignadas.
- Cada parcial presenta sus productos con paginación. Se puede seleccionar un producto para consultar su ruta o un pedido para consultar todas sus rutas registradas; los trazados consultados pueden ser históricos y se distinguen del plan aplicable.
- Las averías muestran insignias con herramienta y texto A1, A2 o A3, también cuando varias UT coinciden. El panel de incidencias permite enfocar una UT o un bloqueo, consultar una ventana horaria y ver rutas del plan actual con exposición geométrica y temporal. Esa exposición no significa que el plan autorice cruzar el bloqueo.
- Nuevo `GET /api/escenarios/{id}/incidencias/ventana?desdeH=...&hastaH=...` para consultar incidencias por horario sin truncar a las últimas cincuenta.
- Nuevo `GET /api/escenarios/{id}/reporte-final`: disponible solo tras el cierre. El reporte identifica `ultimaPlanificacionEstable`, definida como el último plan publicado factible con certificado, y distingue esa condición de su aplicabilidad al reloj final. El reporte de corte conserva también el último plan publicado. El CSV exporta la planificación certificada identificada.
- Las comprobaciones de esta revisión incluyen ocho pruebas de backend en una base aislada, las pruebas focalizadas del frontend, la compilación con TypeScript y comprobaciones de navegador sobre un escenario ya finalizado. No se inició una simulación para esta revisión. Las comprobaciones visuales de averías agrupadas usaron respuestas de prueba en el navegador, sin modificar la base.

Estas correcciones se entregan en **local**; no se han actualizado en PUCP durante esta revisión. Siguen pendientes la aceptación con dos dispositivos físicos y la evaluación de plazo académico. El dominio contempla tres tipos de avería; no se inventa un cuarto tipo ni reglas aeroportuarias.

Esta entrega parte de la versión 8. La evaluación anterior de las columnas G–I se conserva como historial; las observaciones de L–N guían estas correcciones.

## Cambios implementados

- **Lectura por bloques Sc:** índice temporal de los archivos de ventas y lectura del intervalo requerido por el motor, sin conservar todo el mes como objetos de pedidos. Se consideran archivos desordenados, cambios de archivo y límites de mes.
- **Catálogo:** edición de almacenes y vehículos, importación y exportación JSON y consulta del manifiesto de datos. El modo de mantenimiento cierra la operación diaria y rechaza su activación mientras existen simulaciones de periodo activas. La importación informa el resultado por registro; no es una transacción de todo el archivo.
- **Mapa:** filtros compartidos por tipo, ocupación, distancia y stock; iconos orientados según el desplazamiento, zoom con transición, leyenda inicialmente plegada y colores para vacío y averías.
- **Flota:** búsqueda y ordenamiento por métricas de tiempo, distancia y ocupación; estados en español y umbrales configurables. Los recorridos usan la trayectoria de la red.
- **Envíos y almacenes:** ventanas temporales de cuatro horas, filtros por origen, cantidades de entregas parciales y consulta de sus rutas.
- **Productos unitarios:** identificadores internos `P<pedido>-<ordinal>`, asignación por intervalos a entregas parciales y consulta del producto y su ruta. No representan códigos de barras externos.
- **Indicadores:** ocupación ponderada por capacidad de flota; stock ponderado de almacenes con capacidad finita, excluyendo el almacén central ilimitado; fecha y duración simuladas, hora y duración reales, y medición local de latencia visual.
- **Reportes:** descarga JSON y CSV del último plan publicado y su estado de aplicabilidad; consulta de paquetes y manifiesto de datos.
- **Compilación:** comprobación de tipos de TypeScript habilitada en la compilación de producción.

## Backend y base de datos

El proyecto se encuentra en `Back-end-PDDS-Grupo5E/paqrap-backend`. Requiere Java 21, Maven y MySQL. Consultar su README y `.env.ejemplo` para configurar las variables de conexión y el directorio de datos. No se incluyen las credenciales temporales de las pruebas.

La migración incremental `V9__paquetes_identificados.sql` añade la persistencia de intervalos de productos. En una instalación existente, respaldar la base antes de aplicar migraciones; mantener las migraciones anteriores y la base inicial indicadas por el proyecto.

Nuevos puntos de acceso:

- `GET/POST /api/catalogo/mantenimiento` (POST con `activar=true` o `false`).
- `PUT /api/almacenes/{id}` y `PUT /api/vehiculos/{id}`.
- `GET /api/escenarios/{id}/reporte` y `/reporte.csv`.
- `GET /api/escenarios/{id}/paquetes?pedidoId=...`.
- `GET /api/escenarios/{id}/productos/{codigo}`.

## Frontend

En `Front-end-PDDS-Grupo5E`, ejecutar `npm install`. Configurar `NEXT_PUBLIC_API_URL` con la dirección del backend antes de compilar. Para desarrollo: `npm run dev`; para producción: `npm run build -- --webpack` y `npm run start`. La compilación final con webpack y la comprobación de tipos finalizaron correctamente; Turbopack presentó un fallo interno al iniciar su proceso auxiliar de CSS en este equipo.

El panel de herramientas reúne filtros, indicadores, reportes y catálogo. Para editar el catálogo, activar mantenimiento y finalizarlo al terminar. Las sesiones de los navegadores mantienen su búsqueda y cámara independientes.

## Verificación y límites

La compilación Maven terminó correctamente con 182 pruebas, sin fallos, errores ni omisiones, sobre una base MySQL local aislada. Se verificaron también tipos y utilidades de frontend. No se necesita iniciar una simulación para compilar estos proyectos.

Antes de la indicación de detener las simulaciones se realizó una prueba local con datos completos; no se volvió a iniciar ninguna después de esa indicación. Se detuvieron el backend, frontend y MySQL de prueba. El guion del navegador encontró una ambigüedad al pulsar dos botones llamados «Cerrar», por lo que la comprobación automatizada final de edición del catálogo quedó incompleta.

Esta entrega no se ha desplegado en producción. Quedan pendientes la aceptación visual del usuario, pruebas en dispositivos físicos y la certificación del rendimiento bajo carga real. Las evidencias académicas, asistencia a videos, calificaciones individuales y plazos no se pueden corregir modificando código. El espacio disponible del servidor debe revisarse antes de un despliegue.
