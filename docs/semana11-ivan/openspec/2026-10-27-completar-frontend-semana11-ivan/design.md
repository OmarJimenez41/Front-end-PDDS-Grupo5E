# Design

## Context

Ver `proposal.md` para la motivación y el alcance. La raíz de planificación es `dp1`; el producto se implementa en el repositorio hijo `Front-end-PDDS-Grupo5E`. No se trasladan artefactos a la raíz OpenSpec independiente del backend.

Hechos observados en la inspección:

- `app/page.tsx` concentra registro, operación, visualizador y el componente `Map` realmente usado. Los ejemplos se activan cuando faltan datos; la operación se recupera una vez al montar y se sondea el mapa cada 2 s.
- `lib/api/operacion.ts` reúne cuatro consultas independientes, reconstruye parte del estado visible, dibuja solo viajes en curso y reduce la asociación pedido-ruta a una unidad. No consume `/mapa` ni `/unidades`.
- `components/simulacion/MapaSimulacion.tsx`, `lib/simulacion/mapa.ts`, `reloj.ts` y `useMotorSimulacion.ts` contienen piezas reutilizables, pero la página no usa ese motor/mapa alternativo. Mejorar solo esos archivos no resolvería la entrega.
- `ServicioOperacion.Mapa` incluye versión de contrato/estado, reloj, aplicabilidad, estado físico, plan, acumulados, pedidos abiertos e incidencias dentro de una transacción. `Unidades` devuelve escenario y reloj, pero no `versionEstado`; cada ficha contiene ocupación, estado, posición, lugares, horarios, pedidos y avería.
- `salidaH` y `llegadaH` son los extremos del viaje; `pedidos[].etaH` es la llegada al cliente. Las rutas incluyen `trayectoria` con aristas y esperas, además de `trazado`. Las posiciones físicas pueden estar entre nodos mediante `residual`.
- Los pedidos se consultan por páginas de hasta 500. `/mapa` devuelve solo abiertos; no sirve como fuente de entregas recientes.
- El tipo de avería ya existe como campo numérico de entrada, y mantenimiento como categoría del backend. El frontend todavía usa texto para el tipo y trata toda incidencia no avería como bloqueo.
- No hay suite frontend configurada en `package.json`. `next.config.mjs` ignora errores TypeScript durante build: se necesita ejecutar el comprobador por separado.
- Las especificaciones backend `estado-operativo-versionado` y `api-planificacion-operativa` exigen estado consistente, identidad estable y consultas sin mutación operacional. Se respetan como contrato; no se modifican aquí. La excepción explícita es `/operacion/actual`, cuyo código crea o recupera la operación del servidor.

## Goals / Non-Goals

**Goals:** separar adquisición de datos, presentación y geometría; mantener una identidad de escenario en toda consulta; compartir componentes entre operador y visualizador sin compartir preferencias entre dispositivos; permitir aceptar cada tarea con evidencia reproducible.

**Non-Goals:** rehacer toda la aplicación, adoptar un proveedor cartográfico, modificar reglas de planificación Java/SQL, sincronizar selecciones entre usuarios, desarrollar un backend paralelo ni automatizar publicaciones, mensajes o instrumentos institucionales. Se autoriza una corrección acotada del backend para preservar el diagnóstico de la operación diaria en error.

## Decisions

### 1. Contratos tipados y controlador de consulta compartido

Extender `lib/api/operacion.ts` para tipar `/mapa`, `/unidades`, `residual`, `trayectoria`, aplicabilidad, tipos de avería y mantenimiento. Un hook operativo nuevo, propuesto como `lib/operacion/useOperacion.ts`, mantendrá identificación, instantánea, detalle, estado de conexión, fecha de recepción y refresco. `lib/api/simulacion.ts` seguirá siendo el cliente de ciclo de vida de simulaciones y de recuperación de Día a Día.

El hook serializará los ciclos, cancelará o descartará respuestas mediante generación de escenario y no aceptará versiones anteriores. Sondeo base de 2 s como hoy, sin solicitudes superpuestas; los comandos exitosos invalidan y refrescan. El estado del motor se refresca también, no solo el mapa. Día a Día se vuelve a resolver al entrar/reintentar/volver, sin detener una operación para ajustar catálogos. Cambiar de escenario limpia datos anteriores antes de mostrar el nuevo.

La recuperación inicial por `/operacion/actual` conservará una ejecución diaria en `ERROR` y devolverá su diagnóstico sin reconstruir el motor. Una reanudación explícita seguirá usando el comando de reanudación; la recuperación existente de `INTERRUMPIDA` tras reinicio permanece. Una vez identificado el escenario, el frontend consultará su estado de motor por el endpoint de simulación de solo lectura para que el sondeo no reanude una operación que falle después.

Alternativa descartada: seguir combinando estado, plan e incidencias independientes e inferir estados de negocio en React. La instantánea del backend ya resuelve consistencia y aplicabilidad.

### 2. Coherencia del detalle sin exigir un cambio de API

El mapa es la fuente canónica. Para aceptar fichas como sincronizadas: leer mapa A, consultar unidades y verificar mapa B; aceptar el lote si A/B mantienen `escenarioId`, `versionEstado` y reloj y el detalle coincide en escenario/reloj. Si la versión cambia, hacer como máximo un reintento; después mostrar el último detalle identificado como desactualizado o pendiente. Reutilizar B como siguiente instantánea cuando sea válido. No bloquear el mapa por una falla de `/unidades` ni completar fichas con datos inventados.

Esta comprobación depende de la versión monotónica del backend; una discrepancia aun con versión estable se reportará a Daniel. Añadir `versionEstado` a `/unidades` permitiría optimizarlo, pero es una mejora externa y no una dependencia obligatoria para empezar este cambio.

### 3. Paneles y selección por identidad

Extraer componentes propuestos `components/operacion/{PanelFlota,FichaUnidad,PanelAlmacenes,PanelEnvios}.tsx`. Mantener una selección discriminada por escenario y entidad (UT, almacén, pedido) en el contenedor operativo, consumida por mapa y paneles. Búsqueda y orden permanecen locales. La ocupación se ordena numéricamente; horarios por sus horas del escenario, nulos siempre al final y código como desempate. Los pedidos se indexan a listas de rutas/paradas para preservar entregas parciales.

La ficha usará exclusivamente los estados de `/unidades`. Los viajes futuros se etiquetan programados, no transportados actualmente; `llegadaH` se presenta como retorno/fin de ruta y cada ETA como llegada al pedido. La lista contiene la flota real: una diferencia frente a 37 es diagnóstico de datos/escenario heredado, no motivo para generar UT desde React.

### 4. Un solo mapa activo con cámara y capas comunes

Extraer el `Map` activo hacia `components/operacion/MapaOperativo.tsx` y utilidades puras de cámara/geometría. Reutilizar selectivamente lo útil de `lib/simulacion`, comprobando contratos; no conectar dos motores de polling ni sustituir toda la página por el componente alternativo.

La cuadrícula, rutas y marcadores usarán la misma transformación mundo-pantalla. Rueda anclada al puntero, botones de zoom, arrastre, ajustar extensión y centrar elemento. Zoom propuesto de 1x a 8x; controles accesibles por teclado y cancelación de arrastre antes de un clic. Paneles y leyenda permanecen fuera de la transformación. Mantener el dominio 70 × 50 km.

Tres siluetas distintas (auto, moto y bicicleta) con indicador direccional; tipo mediante silueta y color de ruta, ocupación mediante borde/insignia y estado mediante texto/símbolo. Agrupar marcadores coincidentes con conteo y selector accesible; abrir el grupo o seleccionar desde la lista localiza la UT sin falsear su posición física.

Alternativa descartada: añadir una biblioteca de mapas geográficos para una cuadrícula cartesiana; implica dependencia y conversión innecesarias.

### 5. Semáforos explícitos y separados

Conservar el semáforo existente de margen de pedidos y de stock. Para ocupación se propone por defecto verde por debajo de 50 %, ámbar desde 50 % hasta menos de 80 %, rojo desde 80 %. Son valores iniciales de visualización, no umbrales atribuidos al documento del curso; centralizarlos y mostrarlos en leyenda. Capacidad ausente/no válida produce ocupación no disponible, nunca porcentaje inventado. El dato `ocupacionPct` del DTO es la fuente del panel; mapa y panel comparten la misma categoría.

Los filtros por tipo y semáforo son una mejora posterior a la aceptación obligatoria. No se incluirán como casillas requeridas que impidan cerrar tareas 11–17.

### 6. Animación de presentación sobre hechos confirmados

Interpolar con un pequeño retraso entre dos lecturas confirmadas, usando aristas certificadas (`trayectoria`) para respetar giros y esperas. `requestAnimationFrame` anima marcadores; no hace evolucionar inventario, pedidos o reloj operacional. El encabezado y las fichas usan el reloj confirmado; la presentación suavizada se identifica como visualización del último intervalo recibido.

Sin aristas suficientes, conservar la última posición confirmada y actualizarla al recibir otra, sin inventar una diagonal. En replanificación, descartar la trayectoria anterior y resincronizar con la nueva posición; ante pausa, desconexión, fin, plan no aplicable o cambio de escenario, cancelar extrapolación/animación y limpiar el intervalo. Respetar preferencia de movimiento reducido.

Alternativa descartada: avanzar indefinidamente un reloj del navegador o animar líneas rectas entre posiciones. Ambas pueden mostrar recorridos o entregas que el backend nunca confirmó.

### 7. Almacenes y pedidos históricos con actualización independiente

Panel conjunto para los almacenes retornados, central ilimitado explícito y porcentajes solo cuando stock/capacidad finita estén informados. Próximas salidas: viajes futuros del plan aplicable con sus UT/pedidos; no convertir saldo pendiente en salida programada.

Entregas recientes: conservar consulta paginada real de pedidos para registro/rastreo, refrescarla con menor frecuencia (propuesta 10 s y tras comandos), no en cada cuadro ni sustituyendo pedidos abiertos de `/mapa`. Elegir hasta diez ENTREGADO con `entregadoEnH`, orden descendente y desempate estable. Carga de todas las páginas puede crecer en Día a Día; conservar la vista previa y señalar actualización hasta terminar. Ante fallo de cualquier página, no publicar un conjunto parcial como completo. Optimización por endpoint de recientes queda como coordinación futura si el volumen lo exige.

### 8. Compatibilidad de incidencias y cierre verificable

El formulario envía `tipoAveria` numérico y una descripción independiente, con mensajes ajustados al resultado del servidor. Mantenimiento se presenta como categoría/estado propio sin ofrecer el flujo de reparación de avería. No reinterpretar ventanas o regenerar reglas de recuperación en el frontend.

Crear evidencia de implementación en `Front-end-PDDS-Grupo5E/docs/semana11-ivan/`: matriz de tareas 11–17 y 23–26, resultados con identificador de escenario, datos oficiales verificados, pruebas, capturas y guion breve de sustentación. Incluir información para actualizar el RHA de Iván y aportar al CGR/evaluación ISO/IEC 29110; no inventar horas, estados de adhesión ni completar formatos externos sin sus datos. El despliegue y la corrida completa compartida dependen de Brillytd/equipo; sus bloqueos se registran y no se marcan aprobados por inferencia.

## Risks / Trade-offs

- [DTO presente solo en código local o API desplegada antigua] → verificar respuestas reales de mapa/unidades antes de aceptar integración y registrar faltantes para Daniel.
- [Consultas de detalle no atómicas con el mapa] → comprobación de versión antes/después, reintento acotado y detalle desactualizado explícito; más peticiones a cambio de consistencia.
- [Flota heredada de 30 UT o migraciones sin aplicar] → mostrar el estado real y escalar la preparación del entorno a Omar/Brillytd; no parar automáticamente operaciones.
- [37 UT superpuestas ocultan unidades] → agrupación con selector individual y acceso desde panel.
- [Animación contradice replanificación o espera] → usar aristas y posiciones confirmadas, cancelar por invalidación y probar cambios de plan.
- [Historia diaria creciente] → separar su frecuencia del mapa, paginar sin truncar silenciosamente y documentar rendimiento; un endpoint optimizado pertenece al backend.
- [Refactor afecta 5D/Colapso] → migración incremental del mapa compartido y prueba de controles, pausa, final y regreso a Día a Día.
- [Build exitoso oculta errores de tipos] → `tsc --noEmit` explícito además del build.
- [Prueba contra datos sintéticos se confunde con aceptación] → separar pruebas automatizadas con fixtures de la evidencia E2E contra backend/BD real.

## Migration Plan

1. Implementar contratos y hook sin cambiar APIs del servidor; conectar Día a Día eliminando sus fallbacks de ejemplo.
2. Añadir paneles y selección, luego migrar el mapa activo manteniendo controles de simulación existentes.
3. Incorporar cámara, agrupación, animación y envíos; ejecutar comprobación de tipos, build y pruebas focalizadas.
4. Verificar entorno con APIs de mapa/unidades y datos oficiales. No se necesitan migraciones nuevas de BD por este cambio frontend.
5. Ejecutar pruebas reales de Día a Día, 5D y dos clientes; documentar evidencia y dependencias pendientes antes de entregar candidato a Brillytd. Verificar `NEXT_PUBLIC_API_URL` para acceso desde otros dispositivos.
6. Reversión: restaurar la versión frontend anterior si falla el candidato; no revertir ni limpiar operaciones, planes, pedidos o migraciones del backend. La reversión no acredita cumplimiento de Semana 11.
