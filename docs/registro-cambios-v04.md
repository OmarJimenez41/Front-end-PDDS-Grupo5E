# Registro de cambios — v04 (documento de trabajo)

> **Propósito:** registrar cada cambio de código/diseño que hacemos en la rama `ivan-correcciones-semana05` para luego editar el documento oficial **Definición del Prototipo v04** sin olvidar nada.
> **Regla:** todo commit/PR en esta rama debe tener su fila aquí con impacto en documentación.
> **Fuente plan:** `docs/plan-v04-correcciones-semana05.md`. **Destino oficial (manual, sin Drive-MCP):** Definición del Prototipo v04, §5.5 y pantallas.
> **Rama:** `ivan-correcciones-semana05` · **Base:** `main` (`caf3e53`)

## Tabla resumen (1 fila por cambio)

| ID | Fecha | Bloque | Archivos | Cambio código (resumen) | Impacto en Definición v04 (qué editar) | Estado | Verificado |
|----|-------|--------|----------|-------------------------|----------------------------------------|--------|------------|
| C01 | 2026-09-15 | B1 §5.5 separación operación vs simulación | `app/page.tsx` | `ScenarioSelect` dividido en 5.5.1 operación (siempre activa) y 5.5.2 simulaciones (solo 5D/colapso); `simLabels`, `stateLabels` neutros, `Header` distingue día a día; botón `Iniciar simulación` deshabilitado en `day` | Reescribir §5.5, reemplazar Fig 3-botones por Fig 5.5-A y 5.5-B | Mergeado a main (b9c7c37) | build OK |
| C02 | 2026-09-16 | B2 mapa p.13 | `app/page.tsx` (`Map`) | Grid mayor `#9fb0b8`, etiquetas con halo blanco y `#475569`; rutas 5→3, incidentes 7→4.5/5; almacenes/vehículos `size-8` + ring + `title` hover; clientes con IDs PED y posición corregida (bug `style` en div interno); leyenda estándar con símbolos; banner origen aclara abajo-izquierda | Reemplazar Fig p.13 + pie cuadrícula/leyenda | Implementado (commit único pendiente) | build OK |
| C03 | 2026-09-16 | B3 secuencia T0-T3 | `app/page.tsx` (`Operator`) | Barra “Secuencia demo para capturas”: T0 Día2 running / T1 Día3 incident / T2 replanificado / T3 Día5 complete, mismo viewport | Agregar Figs T0-T3 + tabla evolución | Implementado | build OK |
| C04 | 2026-09-16 | B4 comportamientos | `app/page.tsx` (`Operator`, `Map`) | Hover (`title` + `hover:scale`) en almacenes/vehículos/clientes; botones almacén con estado activo; panel rendimiento indica desplegado/cerrado + semáforo; panel almacén unificado stock+%+semáforo | 4 capturas: hover, almacén, semáforo, panel abierto/cerrado | Implementado | build OK |
| C05 | 2026-09-16 | B5 replicar + bloqueos leyenda | `app/page.tsx` (`Map`) | Leyenda condicional: muestra Bloqueo en `incident`/`collapse` y Pedido causante en `collapse`; `Map` ya reutilizado en Operador y Visualizador | Fig incidencia con bloqueo en leyenda + nota mapa unificado | Implementado | build OK |
| C06 | 2026-09-16 | B6 resultados % / variantes | `app/page.tsx` (`CollapseResults`, `Viewer`, `Operator`) | `CollapseResults({variant:'five'|'collapse'|'day', onLocate})` con títulos por variante; indicadores `184·87% / 16·8% / 8·4% / 3·1%`; `Viewer` final unificado a `184·87% / 16·8% / 11·5%`; `Operator` muestra panel en complete/five/collapse | Tabla indicadores cant+%, definir panel único con variantes, capturas por variante | Implementado | build OK |
| C07 | 2026-09-16 | B7 pedido causante en mapa | `app/page.tsx` (`Map`, `CollapseResults`, `Viewer`) | `Map({highlightOrderId})`: PED-137 con halo `animate-ping` + etiqueta roja + callout; botón “Localizar en mapa” hace scroll a `#mapa-operativo`; `Viewer` colapso resalta PED-137; ID unificado (era PED-184) | Fig colapso con PED resaltado + texto localizar | Implementado | build OK |
| C08 | 2026-09-16 | B8 formulario pedido | `app/page.tsx` (`Registrar`) | Validación: X 0-70, Y 0-50, unidades entero >0, Priorizada 4/8/12/18h; mensajes específicos “necesario para planificación” | Tabla campos vs planificación + Fig validación | Implementado | build OK |
| C09 | 2026-09-16 | B9 modal avería | `app/page.tsx` (`Operator` breakdown) | Selects controlados (`faultUnit/faultType` inician `''`), instante sistema readonly `faultTime`, `faultError`, botones Confirmar (valida → `setState('incident')`) / Cancelar | Fig modal 1-5 + flujo avería | Implementado | build OK |
| C10 | 2026-09-16 | B10 alcance visualizador — CONFIRMADO | `app/page.tsx` (`Home`, `Viewer`) | Eliminado selector de históricas (`viewerExecution` con 5D finalizada/colapso finalizado); banner “Ejecución en curso (solo lectura)” con `scenario`/`state` vivos; `Viewer` recibe ejecución viva, sin acceso a históricas | Matriz roles: visualizador = solo lectura de ejecución en curso (día a día o simulación activa) | Confirmado por Iván 16/09, implementado | build OK |

## Detalle C01 — B1 (ya implementado, pendiente documentar en oficial)

**Fecha:** 2026-09-15 · **Autor:** Iván · **Commit:** pendiente · **Diff:** `app/page.tsx | 8 insertions, 5 deletions`

**Cambios exactos (`git diff app/page.tsx`):**
1. `type OpMode = 'operacion' | 'simulacion'` + `type SimType = 'five' | 'collapse'` agregados (compat con `Scenario` existente).
2. `scenarioLabels.day`: `'Operación día a día'` → `'Operación día a día · tiempo real'`.
3. Nuevo `simLabels` (solo five/collapse) para que la UI de simulaciones no liste `day`.
4. `stateLabels`: `idle 'Configuración lista'` → `'Lista · sin iniciar'`; `running 'Simulación en ejecución'` → `'En ejecución'` (neutro para día a día y sims).
5. `Header.headerScenario/headerDate`: si `state==='incident'` y `scenario==='day'` muestra `Operación día a día · tiempo real / 08/09/2026 · 10:20 · incidencia activa` (antes decía 5D siempre).
6. `ScenarioSelect` reescrito:
   - Título: `Operador · Selección de escenario / Iniciar una ejecución` → `Operador · Modo de trabajo / Operación y simulaciones — flujos separados`.
   - Bloque nuevo `5.5.1 Operación día a día · tiempo real (no es simulación)` con texto “sin configuración ni inicio manual” + botón `Ver operación en vivo / Operación activa · ver mapa en vivo` (`setScenario('day') + setState('running')`).
   - Bloque `5.5.2 Iniciar simulaciones (5D y colapso)` con grid 2 cols (antes 3 con `scenarioLabels`), descripciones “requiere fecha-hora inicial” / “sin fin predefinido”, fecha inicial + fin automático solo si `five`.
   - Botón: `Iniciar escenario` → `Iniciar simulación`, `disabled` si `day` + nota “La operación siempre está activa”.

**Qué editar en Definición del Prototipo v04 (copiar al oficial):**
- [ ] §5.5: eliminar presentación de 3 opciones equivalentes. Pegar:
> **5.5 Operación y simulación (flujos separados). 5.5.1 Operación día a día (tiempo real):** uso normal, sin periodo ni inicio; registrador crea pedidos (ingreso auto), operador monitorea en vivo. **5.5.2 Simulaciones (5D y colapso):** requieren “Iniciar simulación”; 5D pide fecha-hora inicial y calcula fin +5d; colapso sin fin, termina al agotarse capacidad (registra instante, pedido causante, motivo).
- [ ] Figuras: eliminar captura 3-botones; agregar Fig 5.5-A (bloque operación verde activo) y Fig 5.5-B (bloque simulaciones con 2 cards + Iniciar simulación deshabilitado en day).
- [ ] Texto p.13/Header: actualizar “Simulación en ejecución” → “En ejecución” donde aplique a día a día.
- [ ] Capturas pendientes para doc: (1) `day` seleccionado + botón deshabilitado + nota visible; (2) `five` seleccionado + fecha inicial + fin 13/09; (3) Header en `day/running` vs `five/running`.

**Verificación:** `npm run build` OK 15/09 (Next 16.3.0 Turbopack, 3/3 static). **Falta:** `npm run dev` manual + screenshots mismo viewport para oficial.

**Decisiones abiertas que afecta C01:** B10 (si visualizador solo ve día a día, el selector de ejecuciones se elimina).

## Plantilla para próximos cambios (copiar por cada C02…C10)

```md
### CXX — Bx título (fecha)
- Archivos:
- Cambio código (qué + por qué):
- Diff/commits:
- Impacto doc oficial (§, figura, texto a pegar):
- Capturas para doc (viewport + estado):
- Verificación (build/dev/tests):
- Pendientes/abiertas:
```

## Control para cierre v04 (no olvidar al pasar al oficial)
- [ ] Unificar PED causante (hoy PED-137 en `CollapseResults` vs PED-184 en `Viewer`).
- [ ] Unificar conteos (184 vs 178) y fórmula % documentada.
- [ ] Unificar línea temporal (08/09, 10/09, 11/09, Día 2/3/5, 00:37:26 vs 42:18).
- [ ] Reenumerar figuras y actualizar tabla control de cambios v04 en oficial.
- [ ] Marcar explícito o PENDIENTE Marshall el alcance visualizador.

---
*Actualizado 2026-09-15. Este archivo SÍ se commitea en la rama; el documento oficial se edita a mano después.*

## Detalle C02-C10 — implementado 2026-09-16 (commit único pendiente)

**Fórmula % (documentar en oficial):** total 211 = 184 dentro (87%) + 16 fuera (8%) + 8 pendientes (4%) + 3 en ruta (1%). Viewer agrupa pendientes/en ruta = 11 (5%).

**IDs unificados:** pedido causante = PED-137 (48,34) en Operator, Viewer y Map (antes PED-184 en Viewer). Instante colapso = 11/09/2026 16:42 en ambos.

**Capturas pendientes para oficial (mismo viewport 1440px):** (1) p.13 mapa corregido; (2) T0-T3 secuencia; (3) hover + almacén seleccionado + semáforo + panel abierto/cerrado; (4) incidencia con Bloqueo en leyenda; (5) resultados collapse/five/day con %; (6) colapso con PED-137 resaltado + Localizar; (7) modal avería con instante + error + Confirmar/Cancelar; (8) formulario con errores X/Y/unidades; (9) visualizador con nota Marshall.

**B10 abierto:** si Marshall dice solo día a día, eliminar selector viewerExecution y fijar scenario day en Viewer.

## C11 — B10 confirmado 2026-09-16 (visualizador solo ejecución en curso)

**Decisión:** el visualizador solo ve lo que está en ejecución actual, sea día a día o simulación activa. Sin históricas (no lista 5D finalizada ni colapso finalizado).

**Código:** eliminado iewerExecution de Home; banner vivo con scenarioLabels[scenario] + stateLabels[effectiveState]; Viewer recibe scenario/effectiveState directos.

**Para el oficial v04:** matriz roles — Visualizador: día a día en vivo SÍ, sim en ejecución SÍ (solo lectura), sims terminadas/históricas NO. Figura: banner ejecución en curso en lugar del selector.
