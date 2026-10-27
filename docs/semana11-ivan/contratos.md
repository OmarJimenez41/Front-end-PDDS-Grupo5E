# Contratos de integración: inspección preliminar

Estado: **verificado parcialmente en un entorno local aislado; pendiente de integración del equipo**. El 27 de octubre de 2026 se inició MySQL 8.4.6 en `127.0.0.1:13316`, con una base nueva `semana11`, y el backend local compilado en `127.0.0.1:8080`. La salud de BD respondió `sano: true`. La comprobación inicial antes de iniciar el entorno había devuelto conexión rechazada. El frontend usa el puerto 8080 por defecto y no se encontró un archivo `.env` local.

La siguiente información procede del código fuente local del backend; no demuestra que esté desplegado ni que sus datos sean oficiales. Fuentes principales: `ControladorOperacion`, `ControladorEscenario`, `ServicioOperacion`, `EstadoOperativo`, `ControladorPedido`, `ControladorIncidencia` y `Solicitudes` en `Back-end-PDDS-Grupo5E/paqrap-backend/src/main/java/pe/pucp/paqrap/`.

### Respuestas observadas en la base de prueba

- `/operacion/actual` creó el escenario 1, con fecha base `2026-10-27`, estado `EN_EJECUCION`, motor `EJECUTANDO` y `ultimoError: null`.
- `/mapa` devolvió `versionContrato: 1`, `versionEstado: 2`, `aplicable: false`, estado físico presente y plan nulo. El central tenía capacidad y stock nulos; los otros dos almacenes tenían capacidad y stock 1000.
- `/unidades` devolvió versión de contrato 1 y 37 unidades: 10 autos, 15 motos y 12 bicicletas. TA01 tenía estado `EN_BASE`, carga 0 y origen, destino, horarios y avería nulos. El mantenimiento se observó como `MANTENIMIENTO` en incidencias.
- Se creó un cliente y pedido de prueba en la base aislada. El pedido respondió `PENDIENTE` y `entregadoEnH: null`; posteriormente el mapa informó versión 5, plan 1 aplicable y una ruta. Estas observaciones no acreditan la instalación compartida ni todos los estados o casos nulos.
- El cliente frontend registró averías de tipo numérico 1, 2 y 3 en unidades TA01, TA02 y TA03 de la base aislada. El servidor respondió con incidencias 6, 7 y 8 respectivamente y devolvió el mismo `tipoAveria`. La descripción se envió como campo separado. Son operaciones de prueba, no evidencia del despliegue compartido.

## Operación actual

`GET /api/operacion/actual` crea o recupera la operación diaria. El DTO `Actual` declara `escenarioId`, `fechaBase`, `relojH`, `fechaHora`, `estado`, `estadoMotor`, `inicioReal`, `ultimoError` y `pedidos`. `ultimoError` puede ser nulo. El reloj se expresa en horas del escenario desde la fecha base; `inicioReal` es un instante real. Comprobar identidad estable y valores de estado en el entorno disponible.

**Corrección local de recuperación:** la versión anterior podía reanudar una operación en `ERROR` al recibir `GET /actual`, ocultando el diagnóstico. El código local del backend conserva ahora ese estado y su mensaje hasta una reanudación explícita; mantiene la recuperación de `INTERRUMPIDA` tras reinicio. Las pruebas unitarias y una prueba HTTP con un error controlado en una base aislada verificaron consultas repetidas y reanudación explícita. Tras obtener el identificador, el frontend consulta `GET /api/simulaciones/{id}` para observar el motor sin reanudarlo. La corrección local aún debe integrarse y verificarse en el backend compartido.

## Mapa y unidades

`GET /api/escenarios/{id}/mapa` retorna `versionContrato`, `escenarioId`, `versionEstado`, `relojH`, `aplicable`, `fisico`, `acumulado`, `plan`, `pedidos` e `incidencias`. La lectura se obtiene en una transacción; `fisico` y `plan` pueden ser nulos. `aplicable` indica si el plan vigente puede utilizarse. Los pedidos del mapa son únicamente abiertos. Confirmar versión y nulabilidad con una respuesta real antes de aceptar el contrato.

El estado físico incluye almacenes con `capacidad` y `stock` anulables, vehículos y servicios. Una posición residual puede contener `x`, `y`, `destinoX`, `destinoY`, `finH` y `distanciaKm`; sin residual se usan las coordenadas físicas de la unidad. Las coordenadas corresponden a la cuadrícula y las distancias a kilómetros. El plan contiene rutas, paradas, trazado y trayectoria; sus instantes `H` son horas del escenario.

`GET /api/escenarios/{id}/unidades` declara `versionContrato`, `escenarioId`, `relojH` y `unidades`, pero no `versionEstado`. Cada unidad contiene identidad, tipo, capacidad, carga, `ocupacionPct`, estado, posición, base, origen, destino, `salidaH`, `llegadaH`, pedidos, avería y `recorridoKm`. Base, lugares, horarios y avería pueden ser nulos. Los estados declarados son `EN_BASE`, `PROGRAMADA`, `EN_RUTA`, `EN_SERVICIO`, `AVERIADA`, `EN_MANTENIMIENTO` y `NO_DISPONIBLE`. El detalle de pedido incluye `id`, `codigo`, `cantidad`, `etaH` anulable y `enServicio`. La llegada de ruta es su fin o retorno; ETA es la llegada al pedido. Para coherencia se requiere comparar mapa antes y después del detalle, incluyendo versión y reloj.

## Pedidos e incidencias

`GET /api/escenarios/{id}/pedidos` devuelve pedidos paginados; el controlador acepta `limite`, `desplazamiento`, `desdeId`, `estado` y `soloAbiertos`. Los pedidos incluyen `entregadoEnH` anulable. El registro por `POST` exige código, cliente, posición, cantidad, tipo y hora de ingreso; el plazo regular es 36 h y el priorizado 4, 8, 12 o 18 h. Las entregas recientes requieren el histórico, no solo los pedidos abiertos del mapa.

Las incidencias son `BLOQUEO`, `AVERIA` o `MANTENIMIENTO`; incluyen ventana, unidad anulable, descripción y tramos. El backend expone `tipoAveria` y `trasladoH` anulables. `POST /api/escenarios/{id}/incidencias/averias` recibe `vehiculoId`, `instanteH`, `descripcion` y `tipoAveria` numérico 1–3. El DTO permite omitir el tipo, pero el frontend ahora lo envía explícitamente y reconoce mantenimiento. Se verificaron localmente los tres tipos de avería y una ventana de mantenimiento; queda pendiente confirmar su finalización en la interfaz con datos del servidor.

## Verificación pendiente

- Comprobar la URL y versión del backend compartido y su BD; comparar sus respuestas con las observadas localmente.
- Verificar los demás estados, errores, posiciones residuales y trayectorias contra respuestas representativas, sin registrar datos sensibles.
- Confirmar flota oficial y comportamiento de los tres tipos de avería con el equipo responsable. No considerar una respuesta derivada del código fuente como evidencia de ejecución.
