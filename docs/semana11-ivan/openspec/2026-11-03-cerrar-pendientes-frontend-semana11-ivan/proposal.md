# Proposal

## Why

Las tareas 11–17 de Iván ya tienen implementación, pero el cambio archivado dejó pendientes de recuperación, mantenimiento y regresión que impiden acreditar su cierre. La recuperación diaria conserva un identificador en memoria incluso al reintentar y el sondeo de simulaciones puede publicar respuestas después de abandonar la vista, por lo que hace falta cerrar estas transiciones y documentar evidencia actual.

## What Changes

- Resolver la operación vigente mediante `/api/operacion/actual` al entrar, reintentar y volver de 5D/Colapso; conservar el sondeo de consulta por identificador durante una sesión recuperada y el estado real de pausa/error.
- Evitar que el descubrimiento inicial trate una operación `DIA_A_DIA` como una simulación 5D; descartar respuestas tardías del descubrimiento y del sondeo cuando ya no correspondan a la vista seleccionada.
- Conservar la acción explícita **Detener y volver al día a día** para una simulación activa: detener únicamente esa simulación y recuperar después la operación diaria. Cerrar resultados finalizados no debe emitir otra detención.
- Verificar y, cuando corresponda, corregir la actualización de ficha, mapa e incidencias al finalizar un mantenimiento según el servidor; no calcular disponibilidad en React.
- Mostrar el estado del escenario seleccionado por URL desde el backend, sin atribuirle el estado de la operación diaria ni inventar ejecución cuando no se conoce.
- Completar regresiones locales de 5D y Colapso: inicio, pausa, reanudación, cierre, consulta del resultado disponible y regreso a Día a Día; comprobar que no se reinicia la operación diaria ni reaparece la simulación por una respuesta tardía.
- Actualizar matriz de aceptación, comprobaciones, guion y notas de candidato con resultados nuevos y referencias de revisión reproducibles.
- Mantener las pruebas externas multiusuario y la corrida oficial completa 5D como pendientes explícitos del equipo: el registro anterior indica que fueron omitidas; este cambio no las considera aprobadas ni las ejecuta como condición de cierre local.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `operacion-diaria-real`: precisar la recuperación autoritativa en cada transición, el aislamiento del descubrimiento/sondeo de simulaciones y la actualización de mantenimiento al recibir su finalización.

Las capacidades existentes `panel-flota-operativa`, `mapa-operativo-interactivo` y `panel-almacenes-envios` conservan sus requisitos; se verifican como regresión de las tareas 12–17.

## Impact

- Implementación objetivo: `Front-end-PDDS-Grupo5E/app/page.tsx`, `lib/api/simulacion.ts` y utilidades/hooks de operación; ajustes acotados a paneles o mapa únicamente si la regresión demuestra un fallo de estos requisitos.
- Pruebas: ampliar el mecanismo existente `tests/lectura-operacion.cjs` para transiciones, respuestas tardías y mantenimiento, aprovechando controladores inyectables sin introducir una plataforma extensa.
- Documentación: `Front-end-PDDS-Grupo5E/docs/semana11-ivan/{aceptacion,verificacion-tecnica,guion-demostracion,notas-candidato,aporte-cierre}.md`.
- Contratos existentes: `/api/operacion/actual`, `/api/simulaciones`, consultas y controles por escenario, mapa, unidades e incidencias. No se prevén nuevos endpoints ni cambios incompatibles.
- Dependencias: backend compatible y BD aislada para las comprobaciones reales; Daniel/Omar atienden fallos del motor, datos o DTO y Brillytd integra/despliega. No incluye algoritmos, migraciones, reglas de mantenimiento Java, publicación ni instrumentos de otros integrantes.
