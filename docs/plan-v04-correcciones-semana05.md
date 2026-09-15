# Correcciones Semana 05 — Plan v04 (rama `ivan-correcciones-semana05`)

> Documento fuente a actualizar manualmente: **Definición del Prototipo — v04** (prioridad máxima).
> No Drive-MCP (sin conexión). Este archivo local es la fuente de verdad para luego pegar en el documento oficial.
> Código base: `app/page.tsx` (28.7k chars, componentes `Header, Nav, Registrar, Map, ScenarioSelect, CollapseResults, Operator, Viewer, Home`).

## 0. Cambio conceptual rector (bloquea todo lo demás)

**Operación día a día ≠ Simulación.** No son 3 opciones equivalentes.

- **Operación día a día:** uso normal en tiempo real. Sin “iniciar escenario”, sin fecha de fin. Flujo: Registrar pedido → Mapa en vivo → Panel rendimiento → Incidencias/averías.
- **Simulaciones (solo 2):** `5D` (duración fija 5 días, con fecha-hora inicial + fin automático) y `Colapso` (hasta que capacidad colapse, sin límite predefinido).
- Implicación en doc §5.5: reescribir. No presentar day/five/collapse en una grilla de 3 botones equivalentes. Crear §5.5.1 Flujo operación normal y §5.5.2 Flujo iniciar simulaciones.
- Implicación en código: refactorizar `ScenarioSelect` + `Operator` + `Header` + `stateLabels`. Hoy `scenarioLabels = {day, five, collapse}` y `ScenarioSelect` los muestra como 3 cards iguales. Hay que separar.

## 1. Plan por bloques (10 correcciones pedidas)

### B1 — §5.5 Separación operación vs simulación [CRÍTICO]
**Doc v04:**
- Reescribir §5.5. Título nuevo sugerido: “5.5 Operación y simulación (flujos separados)”.
- Texto propuesto para pegar:
  > “El sistema distingue dos modos excluyentes: (a) Operación día a día: uso normal en tiempo real, sin configuración de periodo; (b) Simulaciones: escenarios 5D (5 días fijos) y Hasta el colapso (duración abierta hasta pérdida de capacidad). Las simulaciones requieren pantalla propia de configuración e inicio; la operación no.”
- Actualizar diagrama de flujo + alcance del curso (aclaración: día a día = real, simulaciones = 5D y colapso).
- Checklist figuras: eliminar captura actual de 3 botones; agregar Fig 5.5-A flujo operación, Fig 5.5-B flujo simulaciones.

**Código (`app/page.tsx`):**
- `ScenarioSelect`: dividir en 2 secciones. Si `mode==='operacion'` → no mostrar selector ni botón “Iniciar escenario”, mostrar “Operación activa 08/09/2026 · 08:35”. Si `mode==='simulacion'` → radio solo `five | collapse` + config fecha inicial (solo five) + botón Iniciar.
- `scenarioLabels`: eliminar `day` como escenario; crear `mode: 'operacion'|'simulacion'` + `simType: 'five'|'collapse'`.
- `Header, Home`: ajustar `day`, `headerScenario`, `headerDate` para no mezclar.
- Verificación: `npm run dev`, probar cambio de pestañas Registrador/Operador/Visualizador sin que “day” aparezca como simulación.

### B2 — Pantalla principal p.13 (mapa) [ALTO]
Defectos: numeración/posición coordenadas, íconos desalineados, líneas con demasiado protagonismo, bajo contraste, faltan destinos/clientes, leyenda no estándar.

**Doc v04:**
- Reemplazar Fig p.13 por nueva captura corregida + leyenda estándar.
- Texto a agregar al pie: “Cuadrícula 70×50 km, paso 1 km, origen (0,0) abajo-izquierda. Leyenda: almacén / vehículo por tipo / cliente destino / ruta vigente / ruta anterior / bloqueo.”

**Código (`Map` en `app/page.tsx:35`):**
- Coordenadas: mover `text` X a `y=H-7` está bien pero con `preserveAspectRatio="none"` se deforma; evaluar `preserveAspectRatio="xMidYMid meet"` o etiquetas HTML absolutas. Corregir offset `+3` / `-5` y fontSize 13 → 11 con fondo.
- Alineación íconos: almacenes y vehículos usan `left/top %` con `-translate-1/2`; verificar que `style` usa `x/70*100%` y `100-y/50*100%` — hoy clientes `[[19,29]...]` no tienen `style left/top` (bug: `<div>` sin posición, todos apilados). Corregir.
- Jerarquía visual: bajar `strokeWidth 5→3`, colores rutas a paleta con contraste AA, subir vehículos a `size-8` con borde blanco 2px + sombra, almacenes `size-7` → distintivo, clientes a círculos `size-3.5` verdes + etiqueta ID al hover.
- Mostrar destinos/clientes: agregar capa clientes con `PED-xxx` + estado semáforo.
- Leyenda: reemplazar `<div className="absolute bottom-4...">Auto/Moto/...` por leyenda estándar con símbolos (línea continua = vigente, dashed gris = anterior, icono warehouse, círculos, triangulo bloqueo).
- Contraste: fondo `#e9eef0` + grid `#b8c4ca/#d5dde0` → validar contraste texto `#64748b` sobre fondo; oscurecer a slate-600/700.
- Verificación: screenshots 1440px +  mobile 390px, check alineación con regla de cuadrícula.

### B3 — Capturas consecutivas mismo escenario (evolución temporal) [ALTO]
Piden “visualizar de forma más completa el flujo de las simulaciones”.

**Doc v04:**
- Agregar secuencia Fig 5.x-T0, T1, T2, T3 del MISMO escenario 5D (ej: Día 2 14:35 → Día 3 10:20 incidencia → Día 3 replanificado → Día 5 completado). Misma escala/zoom, mismo recorte.
- Tabla de evolución: instante | evento | pedidos entregados/pendientes | km | costo.

**Código:**
- Agregar en `Operator` un `timeStep` demo (`T0..T3`) o reutilizar `state: running → incident → complete` con datos coherentes (hoy son incoherentes: PED counts cambian). Fijar dataset único para capturas.
- Verificación: tomar 3-4 capturas con mismo viewport para pegar en doc.

### B4 — Comportamientos hoy solo en texto → mostrar en UI [MEDIO-ALTO]
hover, selección almacén, stock, porcentaje, semáforo, panel desplegado/cerrado.

**Doc v04:**
- Por cada comportamiento, 1 captura: (a) hover vehículo, (b) almacén seleccionado con stock + %, (c) semáforo verde/ámbar/rojo, (d) panel rendimiento abierto/cerrado.
- Actualizar descripción textual para que coincida 1:1 con lo visible.

**Código (`app/page.tsx:41` Operator):**
- `warehouse` hoy muestra texto hardcodeado distinto para central vs otros; unificar: nombre + coords + stock + % + semáforo + arribos/salidas + botón cerrar (ya existe `X`).
- `performance` toggle con `ChevronDown` ya existe; agregar estado vacío/cargado y % cumplimiento (hoy solo 94% sin contexto).
- Agregar `title`/tooltip + `hover:ring` en vehículos/almacenes/clientes para demo hover.
- Verificación: checklist interactivo antes de capturar.

### B5 — Replicar mejoras en demás vistas + bloqueos en leyenda incidencias [MEDIO]
**Doc v04:** nota “estilo de mapa unificado en todas las vistas” + Fig incidencia con bloqueo en leyenda.

**Código:**
- Extraer `Map` a `components/map.tsx` reutilizable (hoy duplicado en Operator y Viewer con prop `state`).
- Estado `incident`: hoy dibuja reroute + `Incidencia detectada` pero leyenda no incluye “Bloqueo / Ruta anterior / Ruta vigente”. Agregar a leyenda condicional `if incident`.
- `Viewer` usa `<Map state={...}>` — hereda fix automáticamente una vez extraído.
- Verificación: comparar Operador vs Visualizador vs Incidencia lado a lado.

### B6 — Resultados: agregar % y definir si panel único o variantes [ALTO]
Texto dice cantidad + % cumplimiento, mockup solo cantidades.

**Doc v04:**
- Decisión a documentar (pendiente validar): ¿panel único con variantes por tipo, o 3 paneles? Propuesta: **panel base común + fila variante**:
  - Común: entregados dentro/fuera plazo (cant + %), pendientes, en ruta, distancia, costo, desglose por vehículo.
  - Variante 5D: Día inicio/fin, duración 5d, % cumplimiento periodo.
  - Variante Colapso: instante colapso, pedido causante + link a mapa, motivo no entregable.
  - Variante Operación normal: corte del día, sin “estado final”.
- Actualizar tabla indicadores con columna %.

**Código:**
- `CollapseResults (app/page.tsx:39)`: hoy `[['Entregados dentro del plazo','184'],...]` sin %. Cambiar a `184 · 89%` (calcular: 184/(184+16+8+3)≈87% — definir fórmula) + agregar % en pendientes/en ruta.
- `Viewer` final ya muestra `178 · 89%` — unificar números con `CollapseResults` (hoy inconsistentes 184 vs 178).
- Crear `ResultsPanel({variant: 'five'|'collapse'|'day'})` reutilizable.
- Verificación: validar que % sumen 100% y fórmula documentada.

### B7 — Colapso: pedido causante localizable en mapa [ALTO]
Espec dice localizable, mockup no lo muestra.

**Doc v04:**
- Fig colapso con pedido causante resaltado (ej: PED-137 con halo rojo + callout + coordenadas).
- Texto: “Al seleccionar el pedido causante se centra el mapa y muestra plazo comprometido vs instante colapso”.

**Código:**
- En `Map` agregar prop `highlightOrderId`. Si `scenario==='collapse' && state==='collapse'`, dibujar marcador pulsante para PED-137 (coords fijas demo) + `onClick` → popup con ID/plazo/estado.
- En `CollapseResults`, convertir “PED-137” en botón “Localizar en mapa” (scroll + highlight).
- `Viewer` colapso ya muestra banner `PED-184` — unificar ID (137 vs 184) a uno solo.
- Verificación: click → highlight visible en captura.

### B8 — Formulario pedido: datos exactamente necesarios para planificación [MEDIO]
**Doc v04:**
- Tabla campo | obligatorio | uso en planificación. Propuesta inicial a validar con backend/planificador:
  `Cliente (ref), X (0-70), Y (0-50), Unidades P, Tipo entrega (Regular=36h / Priorizada=4/8/12/18h), Fecha-hora ingreso (auto sistema), Fecha-hora límite (auto = ingreso+plazo)`.
- Pregunta abierta: ¿falta peso/volumen, ventana horaria, prioridad explícita? ¿Sobra algo? Dejar nota “validado para planificación el [fecha]”.

**Código (`Registrar app/page.tsx:33`):**
- Hoy validación mínima `if (!customer||!x||!y||!units)`. Agregar rangos X/Y, unidades >0 int, plazo coherente con tipo entrega. Mostrar `entered/deadline` auto (ya hace) + mensaje error específico.
- Verificación: probar X=71, Y=-1, units=0 → debe bloquear.

### B9 — Modal Registrar avería incompleto [ALTO]
Mínimo: vehículo inequívoco, tipo avería, instante vigente sistema, validación, confirmar/cancelar.

**Doc v04:**
- Nueva Fig modal completo con anotaciones numeradas 1-5.
- Texto flujo: Operador → Registrar avería → selecciona unidad (ID + tipo + ruta) → tipo (1 Leve/2 Media/3 Grave + descripción) → instante vigente (auto, no editable, ej 11/09/2026 10:20:15) → validación → Confirmar (marca fuera de asignación y dispara replanificación) / Cancelar (cierra sin cambios).

**Código (`Operator breakdown`):**
- Hoy solo `Unidad select (Auto V-014...)`, `Tipo (1·Leve...)`, botón `Marcar fuera de asignación` que solo cierra. Falta: instante sistema (añadir `new Date()` formateado, readonly), validación (unidad y tipo requeridos, mensaje error), confirmar/cancelar separados (Confirmar → setState('incident') + toast; Cancelar → close), accesibilidad (focus trap simple, Esc).
- Verificación: abrir, confirmar sin selección → error; confirmar ok → incidencia activa.

### B10 — Alcance visualizador (duda Marshall) [MEDIO - requiere decisión]
¿Puede consultar simulaciones terminadas/en ejecución además de operación día a día?

**Doc v04:**
- Matriz roles × contenido propuesta (a confirmar con Marshall):
  |  | Op. día a día en vivo | Sim 5D en ejecución | Sim 5D terminada | Colapso en ejecución | Colapso terminado |
  | Visualizador | Sí (solo lectura) | ? | ? | ? | ? |
- Dejar etiqueta `PENDIENTE Marshall` si no se decide antes de v04. No asumir.
- Texto propuesto: “El visualizador es solo consulta, sin edición. El alcance de ejecuciones visibles (actual vs históricas de simulación) queda pendiente de confirmación.”

**Código (`Viewer + Home app/page.tsx:43,45`):**
- Hoy ya existe selector `Ejecución actual / Sim cinco días finalizada / Colapso finalizado` + `disconnected`. Mantener pero marcar como propuesta hasta confirmación. Si Marshall dice “solo día a día”, eliminar selector y fijar `scenario='day'`.
- Verificación: no romper `viewerExecution.includes('Colapso')` logic al decidir.

## 2. Orden de ejecución sugerido (para no retrabajar)

1. B1 (concepto) — bloquea doc y navegación.
2. B10 (decisión visualizador) — preguntar a Marshall ASAP, bloquea B5/B6.
3. B2 mapa base + B5 refactor `Map` — base visual para todo.
4. B7 pedido causante + B6 % resultados — dependen de mapa base.
5. B9 modal avería + B8 formulario pedido — formularios.
6. B4 comportamientos + B3 secuencia capturas — pulido y evidencia para doc.
7. Cierre doc v04: reenumerar figuras, actualizar §5.5, tabla indicadores, matriz roles, pie de figuras con fecha/hora e IDs coherentes (unificar PED-137 vs PED-184, 184 vs 178, 94% vs 89%).

## 3. Para pegar en “Definición del Prototipo v04”

### Portada / Control de cambios (agregar fila)
| Versión | Fecha | Autor | Cambios |
|---|---|---|---|
| v04 | 15/09/2026 | Iván | Separación operación vs simulación (§5.5); corrección mapa p.13 + leyenda estándar; secuencia temporal; % en resultados; pedido causante localizable; modal avería completo; validación formulario pedido; alcance visualizador pendiente Marshall |

### §5.5 reemplazo (copiar)
> **5.5 Operación y simulación (flujos separados)**
> **5.5.1 Operación día a día (tiempo real).** No requiere configuración de periodo. El registrador crea pedidos (ingreso auto). El operador monitorea mapa en vivo, registra averías y consulta rendimiento. El visualizador consulta el estado actual (alcance histórico pendiente §X).
> **5.5.2 Simulaciones (5D y colapso).** Requieren configuración e inicio explícito desde “Iniciar simulación”. 5D: fecha-hora inicial + fin automático a +5 días. Colapso: inicio sin fin predefinido, termina al agotarse capacidad; se registra instante, pedido causante y motivo. Ambas generan panel de resultados con cantidades + porcentajes (ver §Y).
> *Figura 5.5-A: flujo operación. Figura 5.5-B: flujo simulaciones. Figura 5.5-C: secuencia T0-T3 misma simulación 5D.*

### Figuras a reemplazar / agregar (checklist para doc)
- [ ] p.13 mapa: reemplazar (coordenadas corregidas, íconos alineados, líneas sutiles, clientes visibles, leyenda estándar)
- [ ] §5.5: eliminar 3-botones equivalentes; agregar flujo operación + flujo simulaciones
- [ ] Secuencia T0-T3 mismo escenario (mismo viewport)
- [ ] Hover / almacén seleccionado (stock+%)
- [ ] Semáforo verde/ámbar/rojo + panel abierto/cerrado
- [ ] Incidencia con bloqueo en leyenda
- [ ] Resultados con % (cant + %)
- [ ] Colapso con pedido causante resaltado + callout
- [ ] Modal avería completo (vehículo, tipo, instante sistema, validación, confirmar/cancelar)
- [ ] Formulario pedido validado (tabla campos)
- [ ] Matriz visualizador (con marca PENDIENTE si aplica)

### Datos a unificar en doc (hoy inconsistentes en código)
- Pedido causante: elegir **uno** (PED-137 o PED-184) y usar en texto + mapa + resultados.
- Entregados: 184 vs 178; definir totales y fórmula % (dentro / (dentro+fuera+pendientes+en ruta)).
- Fechas: 08/09, 10/09, 11/09, Día 2/3/5, duraciones 00:37:26 vs 42:18 — fijar una línea temporal única para secuencia.

## 4. Criterios de aceptación v04
- [ ] §5.5 no muestra operación y simulaciones como equivalentes.
- [ ] Mapa p.13: cuadrícula legible, íconos alineados, rutas sutiles, clientes visibles, leyenda estándar, contraste AA.
- [ ] ≥3 capturas consecutivas mismo escenario.
- [ ] Resultados muestran cant + % y se define panel único vs variantes.
- [ ] Pedido causante localizable en mapa.
- [ ] Modal avería con los 5 elementos mínimos.
- [ ] Formulario pedido validado campo por campo.
- [ ] Alcance visualizador explícito o marcado PENDIENTE Marshall.
- [ ] `npm run build` pasa en rama `ivan-correcciones-semana05`.

---
*Generado 15/09/2026. Rama: `ivan-correcciones-semana05`. Sin Drive-MCP: pegar manualmente en documento oficial.*
