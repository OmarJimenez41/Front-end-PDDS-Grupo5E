# Proposal

## Why

Iván debe completar las tareas 11–17 del Plan de Tareas Semana 11 del Equipo 5E: demostrar Día a Día con datos reales, inspeccionar las 37 unidades y navegar entre paneles y mapa. La integración actual conserva ejemplos ante fallos, no presenta el panel operacional de flota y omite las unidades detenidas del mapa activo, por lo que todavía no cumple los criterios de terminado.

## What Changes

- Completar Día a Día mediante `/api/operacion/actual`, recuperar la operación existente y sustituir los fallbacks de demostración por estados explícitos de carga, error, reintento y datos desactualizados.
- Corregir la recuperación del backend para que consultar una operación diaria en `ERROR` conserve el escenario y su diagnóstico sin reanudar el motor; mantener la recuperación prevista tras una interrupción de servidor y la reanudación explícita.
- Consumir `/api/escenarios/{id}/mapa` como instantánea coherente y `/unidades` como fuente de las fichas operacionales; conservar el reloj del backend y evitar respuestas tardías de otro escenario.
- Construir el panel de toda la flota real con ficha completa, búsqueda por código y orden ascendente/descendente por ocupación, salida y llegada. La aceptación oficial exige 37 UT: 10 autos, 15 motos y 12 bicicletas; no se fabricarán registros para completar el conteo.
- Mostrar todas las UT en el mapa, también detenidas, averiadas y en mantenimiento, con tres iconos diferenciados, ocupación, tooltip, orientación y acceso individual cuando comparten posición.
- Añadir zoom continuo, desplazamiento, centrado y movimiento suave sobre trayectorias certificadas, sin avanzar hechos operacionales en el navegador.
- Unificar selección de unidades, almacenes y pedidos entre mapa y panel; admitir varias rutas o UT para un pedido con entregas parciales.
- Presentar juntos los almacenes con stock y semáforo, y secciones de próximas salidas y entregas recientes a partir de información real disponible.
- Alinear el formulario de averías con `tipoAveria` numérico y reconocer `MANTENIMIENTO` y sus estados en la interfaz.
- Preparar la contribución de Iván a las pruebas multiusuario (23), 5D (24), Día a Día (25), sustentación (26) y cierre de Semana 11: trazabilidad, evidencia y registro de su aporte para los instrumentos del equipo.
- Mantener los filtros por tipo/semáforo como mejora opcional posterior a los criterios obligatorios. No condicionan la aceptación.

## Capabilities

### New Capabilities

- `operacion-diaria-real`: recuperación de Día a Día, consultas consistentes, estados de conexión, comandos compatibles e independencia entre clientes.
- `panel-flota-operativa`: listado y ficha de las UT reales, estados operacionales, búsqueda, ordenamientos y semáforo de ocupación.
- `mapa-operativo-interactivo`: representación de toda la flota, zoom, orientación, animación y vinculación bidireccional con paneles y pedidos.
- `panel-almacenes-envios`: almacenes en conjunto, stock real, próximas salidas y entregas recientes con disponibilidad explícita.

### Modified Capabilities

Ninguna en la raíz OpenSpec de `dp1`, que todavía no tiene especificaciones principales. Las especificaciones del repositorio backend son referencia de integración; este cambio no modifica sus requisitos ni duplica su planificación operacional.

## Impact

- Proyectos de implementación: `Front-end-PDDS-Grupo5E/` (Next.js, React y TypeScript) y corrección acotada de recuperación en `Back-end-PDDS-Grupo5E/paqrap-backend/`; planificación en `dp1/openspec/changes/completar-frontend-semana11-ivan/`.
- Áreas: `app/page.tsx`, `lib/api/{operacion,simulacion}.ts`, utilidades de mapa/reloj y componentes/hooks operativos a extraer. Debe modificarse el mapa realmente usado por la página; el componente alternativo y `useMotorSimulacion` no están conectados a ella.
- APIs existentes: operación actual, mapa, unidades, pedidos e incidencias. No se prevén rutas nuevas ni dependencias de mapas externas.
- Dependencias externas: Daniel/Omar deben servir los DTO observados y preparar datos oficiales/motor operativo; Brillytd integra y despliega. Las carencias detectadas se documentan con evidencia, sin trasladar reglas de negocio a React.
- Fuera de alcance: cambiar algoritmos, migraciones, mantenimiento o recuperación de averías en Java; operar la VM; elaborar o presentar instrumentos institucionales por otros integrantes. La evidencia de Iván para estos cierres sí está incluida.
- Verificación: pruebas focalizadas de sincronización, búsqueda/ordenamiento, geometría y selección; comprobación TypeScript independiente del build (la configuración actual ignora sus errores); validación integrada y visual con backend real. La presencia de código backend no acredita su ejecución contra BD ni despliegue.
