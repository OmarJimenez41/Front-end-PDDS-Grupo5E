# operacion-diaria-real Specification

## Purpose

Permitir observar y operar Día a Día sobre la operación compartida del servidor, con información real, consistente y recuperable ante fallos de comunicación.

## Requirements

### Requirement: Recuperación de la operación existente
El frontend SHALL recuperar Día a Día mediante `/api/operacion/actual`, utilizar su identificador y fecha base, y presentar fecha-hora y estado provenientes del backend. Entrar, recargar, reintentar explícitamente o volver de una simulación SHALL consultar ese endpoint para resolver la operación vigente, sin ordenar su reinicio, detenerla ni crear otro escenario desde el cliente. Durante una sesión recuperada SHALL poder consultar el estado por identificador sin repetir acciones de recuperación en cada sondeo. La acción explícita de detener una simulación y volver SHALL afectar únicamente a la simulación seleccionada; el cierre de un resultado ya finalizado SHALL recuperar Día a Día sin emitir una detención adicional.

#### Scenario: Recarga y segundo dispositivo
- **WHEN** dos clientes entran sucesivamente a Día a Día con una operación existente
- **THEN** ambos consultan el mismo escenario y muestran su evolución sin reiniciar su reloj, flota o pedidos

#### Scenario: Operación pausada o con error
- **WHEN** el backend informa pausa o error del motor
- **THEN** la interfaz muestra esa condición y el diagnóstico disponible sin afirmar que la operación está ejecutándose normalmente

#### Scenario: Recuperación de una operación en error
- **WHEN** se consulta `/api/operacion/actual` y la operación diaria existente está en `ERROR`
- **THEN** el backend devuelve su identificador, estado y diagnóstico sin reiniciarla ni reanudarla; una reanudación requiere el comando explícito correspondiente

#### Scenario: Recuperación tras interrupción del servidor
- **WHEN** la operación diaria quedó `INTERRUMPIDA` por un reinicio del servidor y se recupera
- **THEN** el backend conserva la recuperación existente del mismo escenario y su reloj, sin crear una operación adicional

#### Scenario: Reintento con identificador previamente conocido
- **WHEN** falla una consulta de la operación conocida y el usuario solicita reintentar
- **THEN** el frontend consulta `/api/operacion/actual`, adopta la identidad y fecha base devueltas y no queda consultando indefinidamente el identificador anterior si el servidor informa otro vigente

#### Scenario: Detener simulación y volver
- **WHEN** el operador elige detener y volver desde una simulación 5D o Colapso activa
- **THEN** se detiene únicamente esa simulación y, tras confirmar la detención, se recupera Día a Día desde `/api/operacion/actual`; si la detención falla, se informa el fallo sin simular éxito

#### Scenario: Cerrar resultado finalizado
- **WHEN** el operador cierra el resultado finalizado de 5D o Colapso
- **THEN** se recupera Día a Día mediante `/api/operacion/actual` sin detener de nuevo la simulación ni reiniciar la operación diaria

### Requirement: Ausencia de datos de demostración en Día a Día
El frontend MUST mostrar exclusivamente datos operativos recibidos del backend en el encabezado, mapa, registro, paneles e indicadores de Día a Día. SHALL distinguir carga inicial, respuesta vacía, error de conexión y último estado conocido. No SHALL confirmar pedidos o incidencias guardados únicamente en memoria local como operaciones reales.

#### Scenario: Backend inaccesible al entrar
- **WHEN** falla la recuperación inicial
- **THEN** se ofrece reintento, no aparecen fechas, pedidos, rutas ni cifras de ejemplo y las acciones que necesitan escenario quedan deshabilitadas

#### Scenario: Fallo después de una lectura válida
- **WHEN** se pierde la comunicación tras recibir un estado válido
- **THEN** se conserva el último estado identificado como desactualizado y al reconectar se reanuda la consulta sin crear otra operación

### Requirement: Lecturas coherentes y aislamiento de escenarios
El frontend SHALL presentar reloj, estado físico, plan, pedidos abiertos e incidencias de una instantánea consistente de `/api/escenarios/{id}/mapa`. SHALL descartar respuestas de escenarios anteriores y lecturas anteriores a la versión ya aceptada. Los detalles operacionales adicionales SHALL corresponder al mismo escenario e indicar si no están sincronizados; no se presentarán como actuales cuando se detecte discrepancia. Un plan marcado no aplicable SHALL distinguirse del plan vigente utilizable. El descubrimiento de simulaciones SHALL distinguir `DIA_A_DIA` de 5D y Colapso, y sus respuestas y las del sondeo de simulación SHALL dejar de alterar la vista después de abandonarla o seleccionar otro escenario.

#### Scenario: Estado de escenario seleccionado por URL
- **WHEN** se abre un escenario por identificador, incluido uno detenido o finalizado
- **THEN** la interfaz muestra su propio estado confirmado por el servidor y nunca el estado de la operación diaria; si no puede consultarlo, informa que no está disponible sin afirmar que está en ejecución

#### Scenario: Replanificación durante la consulta
- **WHEN** el estado cambia entre la lectura del mapa y la del detalle de unidades
- **THEN** el mapa conserva su instantánea coherente y el detalle discrepante se reintenta o se marca pendiente de actualización

#### Scenario: Respuesta tardía tras cambiar de escenario
- **WHEN** termina una consulta de 5D después de volver a Día a Día
- **THEN** no reemplaza ni contamina el estado de la operación diaria

#### Scenario: Descubrimiento con operación diaria activa
- **WHEN** la lista de simulaciones contiene una operación `DIA_A_DIA` activa y ninguna 5D o Colapso activa
- **THEN** el cliente permanece en Día a Día y no presenta esa operación como una simulación 5D

#### Scenario: Descubrimiento tardío tras elección del usuario
- **WHEN** llega la respuesta del descubrimiento inicial después de que el usuario eligió explícitamente otra vista o escenario
- **THEN** no reemplaza su elección ni cambia el escenario consultado

#### Scenario: Sondeo pendiente al cerrar simulación
- **WHEN** una consulta iniciada antes del cierre de una simulación responde después de recuperar Día a Día
- **THEN** la simulación cerrada no reaparece y no modifica reloj, estado de ejecución ni selección de la operación diaria

### Requirement: Compatibilidad de pedidos e incidencias
El frontend SHALL registrar pedidos en la operación diaria seleccionada y averías con `tipoAveria` numérico 1, 2 o 3. SHALL representar mantenimiento como categoría propia y usar los estados, ventanas y recuperación que informe el servidor, sin calcular reglas de avería en el navegador. Solo SHALL confirmar éxito tras la respuesta exitosa del backend. Al recibir una lectura actualizada que confirme la finalización de mantenimiento, SHALL reflejar el estado informado en ficha, mapa y opciones de avería; no SHALL mantener la indisponibilidad anterior ni declarar disponibilidad solo porque el reloj del navegador alcanzó la hora final.

#### Scenario: Avería tipificada
- **WHEN** el operador confirma una avería de tipo 2
- **THEN** se envía `tipoAveria: 2`, se informa el resultado real y se actualizan las consultas del escenario

#### Scenario: Mantenimiento vigente
- **WHEN** una UT aparece en mantenimiento
- **THEN** su ficha y las incidencias muestran mantenimiento sin etiquetarlo como bloqueo ni ofrecer una reparación de avería para él

#### Scenario: Finalización confirmada de mantenimiento
- **WHEN** el servidor entrega una lectura coherente donde finalizó el mantenimiento de una UT
- **THEN** ficha y mapa muestran el nuevo estado y el selector de averías vuelve a evaluar esa UT según las restricciones actuales del servidor, aunque su ficha permaneciera abierta

#### Scenario: Fin horario sin confirmación del servidor
- **WHEN** vence la hora prevista de mantenimiento pero se pierde la conexión o el detalle sigue desactualizado
- **THEN** la interfaz identifica el último estado conocido y no declara la reincorporación de la UT por cálculo local

### Requirement: Consultas independientes entre clientes
El frontend SHALL mantener búsqueda, orden, selección, zoom y apertura de paneles como preferencias locales de cada cliente. Estas consultas no SHALL modificar el reloj, plan ni selección de otros observadores. Las mejoras compartidas SHALL conservar el control existente de 5D y Colapso y permitir volver a Día a Día.

#### Scenario: Inspecciones paralelas
- **WHEN** un cliente inspecciona una UT y otro un almacén del mismo escenario
- **THEN** cada uno conserva su consulta y ambos reciben los cambios operacionales confirmados por el servidor
