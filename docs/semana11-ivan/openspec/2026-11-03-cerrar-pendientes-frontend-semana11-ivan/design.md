# Design

## Context

Véase `proposal.md` para la motivación y `specs/operacion-diaria-real/spec.md` para el contrato de comportamiento.

La aplicación activa está en `Front-end-PDDS-Grupo5E/app/page.tsx`. Ya usa `useOperacion`, `useMovimiento`, `PanelFlota`, `PanelEnvios` y `MapaOperativo`; no hace falta reconstruir las tareas 11–17.

Hallazgos de la lectura del código:

- El efecto diario elige `operacionActual()` solo cuando `idDia.current` es nulo; cambiar `reintentoDia` no borra ese identificador. Volver de una simulación tampoco activa una recuperación autoritativa nueva.
- El descubrimiento inicial usa `vs.find(simViva)` sin filtrar tipo. `MotorEscenario.listar` devuelve registros de simulación sin excluir expresamente la operación diaria; esta también usa un registro `DIA_A_DIA`.
- El sondeo de simulación usa `setInterval` y publica con `setSim` sin invalidar promesas pendientes al limpiar el efecto. La lista inicial tampoco descarta su respuesta si el usuario ya cambió de vista.
- `backToOperation` detiene la simulación viva con un botón que expresa esa intención. Después borra `sim`; se conservará esa semántica y se añadirá la recuperación diaria.
- Los tipos y las vistas ya reconocen `MANTENIMIENTO`/`EN_MANTENIMIENTO`; la evidencia histórica no verificó visualmente su finalización. No hay evidencia suficiente para afirmar que esa transición falla.
- La suite `tests/lectura-operacion.cjs` transpila TypeScript en memoria y permite controlar consultas. Pasó durante la exploración, pero no acredita las nuevas regresiones. Next omite errores de tipos durante el build, por lo que se requiere `tsc --noEmit` separado.

La matriz de aceptación y las notas de candidato del 27/10/2026 distinguen comprobaciones locales de aceptación compartida. Las pruebas externas multiusuario y la corrida oficial 5D constan como omitidas, no aprobadas.

## Goals / Non-Goals

**Goals:**

- Hacer deterministas recuperación y transiciones ante consultas demoradas, manteniendo el servidor como fuente de identidad y estado.
- Reutilizar la lectura coherente de mapa/unidades y probar la reincorporación de mantenimiento con estados controlados y evidencia del servidor.
- Producir un candidato frontend reproducible y una matriz que diferencie aprobado localmente, pendiente externo y fallo demostrado.

**Non-Goals:**

- Introducir un almacén global de estado, otra biblioteca de mapas o una plataforma de pruebas de extremo a extremo.
- Cambiar contratos Java, reglas operacionales, reloj del motor, migraciones o datos del entorno compartido.
- Añadir una nueva interfaz de reportes, desplegar, publicar o dar por completadas las pruebas omitidas del equipo.

## Decisions

### 1. Recuperación autoritativa por transición y lectura estable por identificador

Encapsular la recuperación diaria en un hook/controlador pequeño bajo `lib/operacion/`, conectado desde `Home`. Sus entradas serán recuperación inicial, reintento explícito y regreso confirmado de simulación. Cada transición inicia una generación de consultas y llama a `/api/operacion/actual`; tras aceptar la respuesta se permite el sondeo serializado de `/api/simulaciones/{id}` cada dos segundos.

El identificador anterior no sustituye la resolución autoritativa al comenzar una generación. Durante el fallo se conserva el último estado como desactualizado; nunca se confirma una recuperación o mutación fallida. Si cambia la identidad diaria, `escenarioMapa` propaga el cambio y las selecciones por escenario se limpian como hoy.

Alternativas: llamar a `/actual` en cada sondeo simplificaría el cliente pero repetiría un endpoint que también recupera el motor; mantener el efecto actual conservaría el problema del reintento con identidad almacenada. Se elige recuperación por transición y consulta estable para separar ambas operaciones.

### 2. Invalidar trabajo asíncrono en todos los puntos de entrada de simulación

Descubrimiento, sondeo, inicio y comandos deben publicar resultados solo si siguen perteneciendo a la intención vigente del usuario. Usar un token de generación o controlador equivalente, invalidado de forma síncrona al cambiar/cerrar vista y al desmontar; no depender únicamente de que React alcance a ejecutar la limpieza del efecto.

El descubrimiento inicial aceptará solo tipos explícitos `CINCO_DIAS` y `COLAPSO` en estado vivo; no inferirá 5D por ausencia de tipo. Los DTO sin tipo se mantendrán fuera de la conexión automática y se registrarán como incompatibilidad si aparecen en una API real. Las peticiones periódicas serán serializadas para no acumular respuestas fuera de orden; la cancelación de red, cuando se añada, complementa el descarte por generación.

Conservar los endpoints de control. En **Detener y volver**, bloquear doble ejecución, esperar confirmación y recuperar Día a Día; ante error, mantener la simulación y su diagnóstico. Para resultados finalizados, invalidar el sondeo y recuperar sin llamar a detener. No se agrega una acción que abandone silenciosamente una simulación activa.

Alternativas: confiar en limpiar `setInterval` no cancela promesas ya iniciadas; abortar solicitudes sin validar generación tampoco cubre operaciones ya resueltas. El descarte por identidad/generación cubre ambos casos y encaja con el controlador de lectura existente.

### 3. Mantenimiento cambia solo con información confirmada

Mantener los datos normalizados de mapa, unidades e incidencias como fuente del estado de la UT. Probar una secuencia de lecturas coherentes antes, durante y después de la ventana, con la misma ficha abierta. Recalcular su elegibilidad en el formulario con la información vigente; conservar las restricciones de averías u otras causas aunque termine el mantenimiento.

Si la implementación ya satisface la secuencia, bastan las pruebas y evidencia. Si se demuestra estado obsoleto, corregir exclusivamente la derivación o actualización responsable. No crear temporizadores que cambien disponibilidad al llegar `finH`, ni modificar la regla del backend para hacer pasar una prueba visual.

La prueba real se hará en una BD/escenario aislado con un archivo de mantenimiento compatible y una simulación cuyo periodo cruce la ventana. Se documentarán entradas, identidad, reloj y lecturas; si el motor no emite la transición, se registrará el bloqueo externo con respuestas, sin atribuir al frontend una aprobación.

### 4. Separar regresión local, corrida oficial y entrega

Extender la suite existente con promesas controladas para recuperación, descubrimiento, cierre y rechazo de respuestas tardías; verificar llamadas y resultados observables del controlador, no búsquedas de texto en el código.

Realizar regresiones de control de 5D y Colapso en entorno aislado, sin presentarlas como la corrida oficial completa 5D. Registrar inicio, pausa, reanudación, detención/cierre y recuperación diaria; consultar el estado/plan disponible por los endpoints existentes y la vista por escenario sin crear una funcionalidad de reportes. Revisar flota, búsqueda, mapa, selección y envíos para detectar daños en tareas 12–17.

Actualizar la documentación viva del frontend, manteniendo inmutables los artefactos archivados. Las notas de candidato deben incluir `git rev-parse HEAD` de frontend y backend, API usada, comandos, resultados y estado de cambios locales; si la revisión tiene cambios sin commit, identificarlos y no afirmar que el hash los contiene. No requieren publicar ni enviar mensajes al responsable de integración.

Alternativa: marcar el cambio anterior como completo ocultaría sus pendientes; duplicar sus siete capacidades crearía requisitos paralelos. Se crea un delta de una capacidad y se verifica el resto como regresión.

### 5. Estado de un escenario abierto por URL

Consultar el estado de simulación del identificador abierto mediante la ruta existente de simulación y asociar cada respuesta a ese identificador. El encabezado y el visualizador mostrarán el estado confirmado, sin reutilizar el de Día a Día; ante ausencia, fallo o respuesta obsoleta mostrarán estado no disponible. Mantener lectura y controles separados de la operación diaria. Verificar estados vivos, pausados y detenidos, error de consulta y respuestas tardías, además del escenario 4 detenido observado en la regresión local.

## Risks / Trade-offs

- [Respuesta resuelta entre un clic y la limpieza de un efecto] --> Invalidar la generación en el manejador de la transición y probar ese orden concreto.
- [Backend inaccesible o datos oficiales ausentes] --> Completar pruebas deterministas; registrar cada comprobación real como bloqueada con evidencia, sin sustituirla por fixtures aprobados como integración.
- [Mantenimiento real requiere cruzar un día simulado] --> Preparar una ventana reproducible en una simulación aislada usando parámetros admitidos por el servidor; no adelantar el reloj diario ni escribir directamente en la BD compartida.
- [Finalizar una simulación modifica estado compartido] --> Usar escenarios aislados creados para la regresión; conservar identificadores y entradas en la evidencia.
- [API antigua sin tipo de simulación] --> No conectarla automáticamente como 5D; documentar la incompatibilidad y exigir el contrato actual, sin adivinar el tipo.
- [Confundir avance local con aceptación del equipo] --> Mantener pruebas externas y corrida oficial como pendientes separados en matriz y notas de candidato.

## Migration Plan

No hay migraciones de datos ni cambios de API. Tras implementar, ejecutar pruebas focalizadas, comprobación de tipos y build; después realizar la regresión integrada local y actualizar evidencia. Preparar notas de candidato para que integración use la URL efectiva de API antes de construir. La publicación sigue fuera de este cambio.

Para revertir, restaurar exclusivamente los commits frontend de este cambio y conservar las evidencias fechadas de lo ejecutado. No modificar datos ni reabrir el cambio archivado para efectuar el rollback.
