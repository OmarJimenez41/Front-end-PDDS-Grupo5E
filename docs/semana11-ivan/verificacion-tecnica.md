# Comprobaciones técnicas

El 27 de octubre de 2026 se ejecutaron desde el frontend:

- `npx --yes --package pnpm@10.17.1 pnpm exec tsc --noEmit`: correcto, sin errores de tipos.
- `npx --yes --package pnpm@10.17.1 pnpm build`: correcto. Next indica que omite la validación de tipos durante el build; la comprobación anterior se ejecutó por separado.
- `node tests/lectura-operacion.cjs`: correcto; cubre lectura serializada, respuestas tardías, paginación, asociaciones, semáforos, orden, cámara y geometría certificada. La opción `SEMANA11_API_TEST=1` consulta adicionalmente la base local de prueba.
- Backend: `MotorEscenarioTest`, 19 pruebas correctas. Incluye conservación del diagnóstico `ERROR` en consultas repetidas, reanudación explícita y recuperación de `INTERRUMPIDA` tras reinicio.
- Tras integrar los commits remotos del backend, se ejecutaron `MotorEscenarioTest` y `VentasYRelojTest`: 28 pruebas correctas en total.
- Prueba HTTP adicional en la base aislada `semana11_error`: se fijó un error controlado en el escenario de prueba 1 y se reinició el backend corregido. Dos consultas a `/api/operacion/actual` devolvieron `ERROR`, el mismo diagnóstico y el mismo reloj; el comando explícito de reanudación devolvió `EJECUTANDO` para el mismo escenario. La instancia de prueba adicional se detuvo después.

Se empleó pnpm 10 mediante `npx` porque el ejecutable predeterminado de este entorno usa pnpm 12 y su instalación automática rechazó un script de `msw`. Estas comprobaciones no sustituyen la aceptación con el entorno compartido ni las regresiones completas de simulación.

En la base local aislada se comprobó que dos consultas de recuperación devolvieron el escenario 1. Al pausar deliberadamente la operación de prueba, `/operacion/actual` informó `PAUSADA` y conservó el identificador; se reanudó inmediatamente y el motor volvió a `EJECUTANDO`. También se registró un bloqueo de prueba (incidencia 9) y se observó en el mapa del operador. Una replanificación dejó una entrega en servicio físico aunque el nuevo plan no tuviera rutas: la asociación se conserva desde `fisico.servicios`. La corrida compartida de 5D sigue pendiente.

Desde el formulario local se registró `REG-MVQXGPUY`; permaneció en la cola tras recargar. Una cantidad fuera del rango del backend produjo un rechazo y el formulario conservó los valores sin confirmar el pedido. Al detener temporalmente el backend de prueba, la interfaz conservó el último estado y deshabilitó el registro; una recarga sin conexión mostró datos no disponibles. Tras reiniciar, se recuperó el escenario 1. Durante la revisión se corrigió una duplicación de paneles por claves React repetidas y se comprobó que ya no quedaban controles duplicados al cambiar de vista.

Dos pestañas independientes, ambas conectadas al backend local, conservaron respectivamente las búsquedas `tm01` y `tb01`. Al ampliar el mapa en la segunda, su escala pasó a 1,25 mientras la primera permaneció en 1. Las búsquedas y la cámara son estado local; cambiar de escenario limpia las selecciones y una unidad ausente produce un aviso. Esta prueba local no acredita todavía acceso a la API desde otro equipo o fuera de localhost.

La cámara se revisó en ventanas de escritorio de distintos tamaños, con rueda, arrastre, ajuste por teclado y pruebas matemáticas de anclaje y límites. Se detectó y corrigió un desplazamiento del icono causado por su etiqueta: para el grupo de unidades en (30,15), el centro medido pasó de aproximadamente (587,9; 575,1) a (597,75; 582,57), frente a (597,76; 582,58) esperado; tras ampliar dos veces, la diferencia siguió por debajo de 0,1 píxeles y la selección de TB01 desde el grupo abrió su ficha. La geometría también prueba dimensiones de 360 × 640 y 1000 × 800.

Se revisaron operador y visualizador también en un panel de navegador de aproximadamente 380 píxeles de ancho. Se movieron los controles del mapa para que no queden bajo los botones inferiores y se hizo plegable el estado del visualizador, dejando accesible la búsqueda. Se comprobaron visualmente zoom, leyenda, descripciones accesibles, apertura de un grupo y ficha de TB01; la ficha puede cerrarse para recuperar el mapa. Esta revisión es local y no sustituye pruebas en dispositivos físicos.

Ensayo local adicional de Día a Día, 27/10/2026: la operación existente conservó el escenario 1 y el catálogo confirmó 37 UT oficiales. Desde el formulario se registró `REG-MVQYFJ51` (pedido 3), que apareció primero pendiente y después en ruta. La versión del mapa pasó de 82 a 84 con el plan 5; TB03 salió de Central y la API informó una posición residual (27,2;14) hacia (28;14), con carga del pedido 3. Se registró desde la interfaz la avería tipo 1 de TA04 (incidencia 10); el mapa alcanzó la versión 86 con plan aplicable 6 y una ruta. Los identificadores y versiones corresponden exclusivamente a esta base local de prueba, no al entorno integrado.

La incidencia vigente de mantenimiento TM06 se mostró con su ventana y sin acción de reparación. Se corrigió además el selector de averías para que no ofreciera TM06 mientras la incidencia esté vigente; se verificó en el navegador con la respuesta del servidor. La finalización del mantenimiento sigue sin verificarse visualmente: la ventana local termina a las 00:00 del día siguiente.

## Verificación técnica del 3 de noviembre de 2026

En Windows, desde `Front-end-PDDS-Grupo5E`, con Node.js `v24.21.0` y pnpm `10.18.3` mediante Corepack:

- `node tests/lectura-operacion.cjs`: correcto; incluye generaciones de recuperación, descubrimiento tipado, sondeo serial y selección de unidades ante mantenimiento y datos desactualizados.
- `corepack pnpm exec tsc --noEmit`: correcto, sin errores de tipos.
- `corepack pnpm build`: correcto (Next 16.3.0). El build omite la validación de tipos, ejecutada por separado arriba.

Estas pruebas controladas no acreditan la regresión real de simulación, el fin real de mantenimiento ni la aceptación compartida. La API aislada aún no estaba disponible durante estas comprobaciones.

### Entorno aislado levantado el 3 de noviembre de 2026

La API local `http://127.0.0.1:18080` usa exclusivamente MySQL 8.4.6 en `127.0.0.1:13316`, base nueva `paqrap_semana11` y migraciones V1–V8. Los datos y credenciales de esta instancia están en `dp1/tmp/semana11-aislada`; el usuario de la aplicación solo tiene permisos sobre esa base. El backend se compiló desde la revisión `9945a4fc4832437fc8558b99569d22f96e2da1cf`; el frontend parte de `f6f311ea90b85069cf719742cd2c56429ab1654b` y contiene cambios locales sin commit, no incluidos en ese hash. El paquete se construyó con Maven 3.9.9 y Java 25.0.2, con `-DskipTests`; esto no acredita pruebas del backend.

`GET /api/salud` respondió `OPERATIVO` y `baseDeDatos: true`. `GET /api/operacion/actual` creó/recuperó la operación aislada 1, fecha base 2026-11-03, estado `EJECUTANDO`. `GET /api/escenarios/1/unidades` confirmó 37 unidades existentes por migración: 10 autos, 15 motos y 12 bicicletas; no se fabricaron unidades para la prueba. `GET /api/datos` informó 160010 ventas, 21725 bloqueos y 37 registros de mantenimiento, con archivos completos; `mant.preventivo.09.10.txt` contiene 37 registros válidos. La cobertura consultada para 2026-09-10T08:00:00 a 2026-09-15T08:00:00 informó 879 pedidos, 76 bloqueos, cero líneas inválidas y ninguna falta de archivos. Las entradas se copiaron desde el paquete facilitado por el usuario, sin modificar sus originales.

El backend se arrancó con `BD_URL` apuntando a la base anterior, `BD_USUARIO=paqrap_local`, `BD_CLAVE` leído de `tmp/semana11-aislada/backend.secret`, `SIM_DATOS_DIR=tmp/semana11-aislada/entradas` como ruta absoluta, `PUERTO=18080`, y `java -jar target/paqrap-backend-1.0.0.jar --server.address=127.0.0.1`. El proceso y MySQL son locales; las regresiones reales y los escenarios de simulación aún no se han completado.

### Actualización: controles y bloqueo visual

Después de conectar el retorno de simulación al controlador probado, se repitieron `node tests/lectura-operacion.cjs`, `corepack pnpm exec tsc --noEmit` y `corepack pnpm build`: los tres terminaron correctamente. Las pruebas controladas abarcan detención del identificador elegido, doble clic, error de detención, recuperación posterior y cierre de resultados de ambos tipos sin otra detención. Esto no sustituye las comprobaciones visuales ni la regresión real completa.

La revisión visual del 03/11/2026 no se pudo iniciar: tanto el navegador integrado como la inicialización del control de equipo respondieron `failed to write kernel assets: El sistema no puede encontrar la ruta especificada. (os error 3)`. La API y el frontend locales sí estaban disponibles; no se atribuye este fallo al producto ni se registra como aprobación visual.

### Regresión local de controles, 3 de noviembre de 2026

Después del reinicio, el control visual funcionó y se recuperó el entorno aislado documentado arriba. Desde `http://localhost:3000`, conectado a `http://127.0.0.1:18080`, se inició 5D con inicio 2026-09-08 08:00 (escenario 2), se pausó (`PAUSADA`, reloj 8.5014 h), reanudó y detuvo (`DETENIDA`, reloj 10.0119 h). Se inició Colapso con la misma fecha (escenario 3), se pausó (`PAUSADA`, reloj 8.3061 h), reanudó y detuvo (`DETENIDA`, reloj 8.3956 h). En ambos casos la interfaz regresó a Día a Día. La operación diaria conservó el escenario 1, `EJECUTANDO`, inicio real `2026-11-03T16:19:22Z`, y reloj de 11.5828 h antes a 11.5997 h después; no se reinició. Tras cerrar, `/api/escenarios/2/estado` y `/plan` respondieron 200; para el escenario 3, `/estado` respondió 200 y `/plan` 404, sin plan publicado disponible. Las respuestas tardías se comprueban de forma controlada en la suite; no se observó reapertura durante la regresión visual. La prueba no es la corrida oficial completa 5D ni la aceptación compartida.

Para mantenimiento se creó el escenario 4, 5D desde 2026-09-08 23:00, con ventas y bloqueos del paquete suministrado y `mant.preventivo.09.10.txt`. La unidad TB03 (id 17) se observó con ficha abierta, `EN_MANTENIMIENTO`, incidencia 893 activa, ventana 23–24 h y mapa versión 249 a reloj 23.4661 h. La transición al fin queda sujeta a la observación posterior y no se da por aprobada solo con este estado inicial.

La ventana anterior sí llegó a su fin: a reloj 24.3031 h el mapa ya no incluía la incidencia de TB03 y su estado físico indicaba `disponible: true`; `/unidades` devolvía `EN_BASE` con un reloj ligeramente posterior. Durante el avance rápido la ficha permaneció con el último detalle señalado como desactualizado. Se pausó únicamente el escenario de prueba 4, no el diario: a reloj 24.5931 h mapa versión 677 y unidades coincidieron, `/incidencias/vigentes` no contenía TB03, y la ficha que seguía abierta y el mapa mostraron `EN BASE`. El selector de averías volvió a ofrecer TB03 y mantuvo excluida TM09, cuyo mantenimiento estaba vigente. Se detuvo después el escenario 4 y se volvió al escenario diario 1. La actualización visual coherente se observó tras pausar el escenario; no se afirma que el detalle se sincronice continuamente bajo avance rápido.

### Hallazgo durante la revisión histórica

Al abrir `http://localhost:3000/?escenario=4`, el encabezado mostró «Escenario 4 del back-end» y «En ejecución». Sin embargo, `GET /api/simulaciones/4` informó `DETENIDA`, reloj 24.5931 h; la operación diaria 1 sí estaba `EJECUTANDO`. La página estaba mostrando el estado diario para un escenario histórico distinto. Se conserva la tarea 4.3 pendiente hasta resolver y volver a verificar esta discrepancia en la vista por escenario. La revisión visual 4.5 también queda pendiente: se comprobó búsqueda `tm01`, ficha, zoom y selección del mapa en escritorio y 390 × 844, pero no se han completado todos sus criterios ni guardado todas las evidencias visuales requeridas.

Tras añadir las pruebas controladas de descubrimiento, comandos y transiciones de mantenimiento, volvieron a pasar por separado `node tests/lectura-operacion.cjs`, `corepack pnpm exec tsc --noEmit` y `corepack pnpm build`.

La corrección autorizada se verificó de nuevo el 03/11/2026 con `?escenario=4`: la API y el encabezado muestran `DETENIDA`/«Detenida» y el visualizador también muestra «Detenida», mientras la operación diaria 1 permanece `EJECUTANDO`. La suite prueba ejecución, pausa, detención, finalización, fallo de consulta, identidad incorrecta y respuesta tras abandonar el escenario. Con esta corrección se completa la revisión del estado histórico de la regresión local; las pruebas compartidas siguen pendientes.

El cambio OpenSpec se archivó como `2026-11-03-cerrar-pendientes-frontend-semana11-ivan` y su especificación principal se sincronizó. La raíz de planificación está fuera de ambos repositorios Git; para conservar la trazabilidad en el frontend se incluye una copia del [archivo](openspec/2026-11-03-cerrar-pendientes-frontend-semana11-ivan/) y de la [especificación sincronizada](openspec/specs/operacion-diaria-real/spec.md).
