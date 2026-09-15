# Registro de cambios — v04 (documento de trabajo)

> **Propósito:** registrar cada cambio de código/diseño que hacemos en la rama `ivan-correcciones-semana05` para luego editar el documento oficial **Definición del Prototipo v04** sin olvidar nada.
> **Regla:** todo commit/PR en esta rama debe tener su fila aquí con impacto en documentación.
> **Fuente plan:** `docs/plan-v04-correcciones-semana05.md`. **Destino oficial (manual, sin Drive-MCP):** Definición del Prototipo v04, §5.5 y pantallas.
> **Rama:** `ivan-correcciones-semana05` · **Base:** `main` (`caf3e53`)

## Tabla resumen (1 fila por cambio)

| ID | Fecha | Bloque | Archivos | Cambio código (resumen) | Impacto en Definición v04 (qué editar) | Estado | Verificado |
|----|-------|--------|----------|-------------------------|----------------------------------------|--------|------------|
| C01 | 2026-09-15 | B1 §5.5 separación operación vs simulación | `app/page.tsx` | `ScenarioSelect` dividido en 5.5.1 operación (siempre activa) y 5.5.2 simulaciones (solo 5D/colapso); `simLabels`, `stateLabels` neutros, `Header` distingue día a día; botón `Iniciar simulación` deshabilitado en `day` | Reescribir §5.5 (ver detalle abajo), reemplazar Fig 3-botones por Fig 5.5-A y 5.5-B, actualizar pie p.13 | Implementado, sin commit | `npm run build` OK (Next 16.3.0) |
| C02 | — | B2 mapa p.13 | — | Pendiente | Reemplazar Fig p.13, leyenda estándar | Pendiente | — |
| C03 | — | B3 secuencia T0-T3 | — | Pendiente | Agregar Figs secuencia mismo escenario | Pendiente | — |
| C04 | — | B4 comportamientos | — | Pendiente | 4 capturas hover/almacén/semáforo/panel | Pendiente | — |
| C05 | — | B5 replicar + bloqueos leyenda | — | Pendiente | Fig incidencia con bloqueo en leyenda | Pendiente | — |
| C06 | — | B6 resultados % / variantes | — | Pendiente | Tabla indicadores cant+%, definir panel único vs variantes | Pendiente | — |
| C07 | — | B7 pedido causante en mapa | — | Pendiente | Fig colapso con PED resaltado | Pendiente | — |
| C08 | — | B8 formulario pedido | — | Pendiente | Tabla campos vs planificación | Pendiente | — |
| C09 | — | B9 modal avería | — | Pendiente | Fig modal completo 1-5 | Pendiente | — |
| C10 | — | B10 alcance visualizador | — | Pendiente (requiere Marshall) | Matriz roles, nota PENDIENTE | Pendiente decisión | — |

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
