# Matriz de aceptación de la contribución de Iván

Estado al 3 de noviembre de 2026: **en curso**. La base local aislada permite pruebas técnicas, pero no acredita el entorno integrado ni la aceptación del equipo. El estado detallado de implementación se mantiene en [tasks.md](openspec/2026-10-27-completar-frontend-semana11-ivan/tasks.md).

| Tarea del equipo | Criterio | Evidencia y resultado |
| --- | --- | --- |
| 11 | Recuperación y operación diaria real | Parcial: escenario local 1 recuperado antes y después de reiniciar el backend; pausa y reanudación observadas. Regreso local desde 5D (escenario 2) y Colapso (3) verificado; falta aceptación compartida. |
| 12 | Inspección de flota completa | Parcial: 37 UT locales (10/15/12), ficha y estados observados; pruebas de casos nulos y estados en `tests/lectura-operacion.cjs`. Falta aceptación compartida. |
| 13 | Búsqueda y orden | Pruebas locales de `tm01`, coincidencia parcial, resultado vacío, orden numérico y nulos. Falta aceptación compartida. |
| 14 | Flota y rutas en mapa | Parcial: posiciones físicas, grupos, averías y mantenimiento observados localmente. Se observó mantenimiento TB03 y su final en escenario 4; se revisaron iconos y unidad detenida localmente; falta la regresión integrada compartida. |
| 15 | Cámara y movimiento | Parcial: cámara y trayectoria certificada implementadas con pruebas de geometría; rueda, arrastre y ajuste comprobados en escritorio y revisión visual en panel pequeño. Falta aceptación compartida de recorrido real con cambio de plan. |
| 16 | Selección entre mapa y panel | Parcial: selección de UT y almacenes, centrado y asociación de rutas probados localmente; búsquedas y zoom independientes en dos pestañas. Falta prueba con clientes externos y aceptación compartida. |
| 17 | Almacenes y envíos | Parcial: resumen de almacenes e historial paginado; pruebas de 502 pedidos y fallo intermedio mediante fixtures. Se revisaron Nor-Oeste y el panel sin plan aplicable en el escenario 4; falta aceptación con datos compartidos. |
| 23 | Dos clientes independientes | Parcial: dos pestañas locales conservaron búsquedas y zoom independientes. La prueba externa con la API accesible fuera de localhost se omite por indicación del usuario; no está aprobada. |
| 24 | Corrida 5D completa | La corrida integrada con datos oficiales se omite por indicación del usuario; no está aprobada. |
| 25 | Día a Día extremo a extremo | Aprobado localmente: escenario 1, pedido 3, movimiento de TB03, incidencia 10 y versiones 82 → 84 → 86 con planes 5 → 6. Pendiente de repetición en el entorno compartido. |
| 26 | Sustentación | Ensayo local documentado en [guion-demostracion.md](guion-demostracion.md). Pendiente la demostración y evidencia compartidas con el equipo. |

## Dependencias y límites

- Daniel/Omar: compatibilidad y disponibilidad de contratos y datos en el backend compartido; las respuestas locales no demuestran la versión desplegada.
- Brillytd: configuración de la API accesible desde otros clientes, integración y publicación de `sol.integrada.sem11`.
- Equipo: corrida 5D completa, evidencia multiusuario y formatos institucionales para RHA/CGR e ISO/IEC 29110. No se han inferido horas ni adhesión.

Detalles de contratos y verificaciones: [contratos.md](contratos.md) y [verificacion-tecnica.md](verificacion-tecnica.md).

## Trazabilidad de criterios

Los resultados de la tabla son parciales o pendientes cuando falta evidencia; no representan aprobación del equipo. Los enlaces siguientes identifican la especificación y la implementación que sostienen cada grupo de criterios:

| Tareas | Especificación | Implementación y evidencia |
| --- | --- | --- |
| 11, 25 | [Operación diaria real](openspec/specs/operacion-diaria-real/spec.md) | `app/page.tsx`, `lib/api/operacion.ts`, `lib/operacion/useOperacion.ts`; escenario local 1 y pedidos registrados en [verificación técnica](verificacion-tecnica.md). |
| 12, 13 | [Panel de flota operativa](openspec/specs/panel-flota-operativa/spec.md) | `components/operacion/PanelFlota.tsx`; composición oficial del catálogo local y pruebas focalizadas. |
| 14, 15, 16 | [Mapa operativo interactivo](openspec/specs/mapa-operativo-interactivo/spec.md) | `components/operacion/MapaOperativo.tsx`, `lib/operacion/camara.ts`, `lib/operacion/movimiento.ts`; comprobaciones de geometría, selección y clientes locales. |
| 17 | [Panel de almacenes y envíos](openspec/specs/panel-almacenes-envios/spec.md) | `components/operacion/PanelEnvios.tsx`, `lib/api/operacion.ts`; consultas paginadas y almacenes locales. |
| 23 | [Consultas independientes entre clientes](openspec/specs/operacion-diaria-real/spec.md) | Dos pestañas locales verificadas; prueba externa omitida por el usuario. |
| 24 | [Operación diaria y aislamiento de escenarios](openspec/specs/operacion-diaria-real/spec.md) y las demás especificaciones del cambio | La corrida oficial completa sigue pendiente; el entorno aislado actual sí contiene ventas y bloqueos, y la regresión corta de controles no la sustituye. |
| 26 | [Guion de demostración](guion-demostracion.md) | Guion y ensayo local documentados; evidencia compartida pendiente. |

## Evidencia local del 3 de noviembre de 2026

La base aislada contiene 37 UT (10 autos, 15 motos y 12 bicicletas) y los archivos facilitados por el usuario. La API local fue `http://127.0.0.1:18080`; Día a Día conservó el escenario 1 durante las pruebas de controles de 5D (2) y Colapso (3). La ventana de mantenimiento de TB03 se comprobó en el escenario 4 con ficha abierta; la lectura del detalle se sincronizó al pausar esa simulación. La vista por URL del escenario 4 informa ahora «Detenida», como el servidor. Se revisaron parcialmente mapa, búsqueda `tm01`, ficha y selección en escritorio y ancho pequeño; la revisión visual local se resume en [revisión visual](revision-visual-2026-11-03.md). Véase [verificación técnica](verificacion-tecnica.md).

La prueba multiusuario fuera de localhost, la corrida oficial completa de 5D y la aceptación y despliegue compartidos siguen pendientes del equipo; las comprobaciones locales no las aprueban.
