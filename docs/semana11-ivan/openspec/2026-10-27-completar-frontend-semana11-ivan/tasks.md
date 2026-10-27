# Tasks

## 1. Contratos y base de integración — tarea 11

- [x] 1.1 Registrar los contratos reales de `/operacion/actual`, `/escenarios/{id}/mapa`, `/unidades`, pedidos e incidencias en `Front-end-PDDS-Grupo5E/docs/semana11-ivan/contratos.md`; verificar campos, unidades, nulos, versión, aplicabilidad y respuesta del entorno real, dejando explícita cualquier incompatibilidad externa.
- [x] 1.2 Tipar y consumir mapa/unidades en `lib/api/operacion.ts`, incluyendo posiciones residuales, aristas, estados, mantenimiento y `tipoAveria`; verificar normalización con respuestas representativas y detección de contrato inválido sin datos ficticios.
- [x] 1.3 Implementar el hook de consultas serializadas por escenario con cancelación/descarte de respuestas tardías, refresco y control de versiones; verificar con consultas retardadas que no se mezclan escenarios ni retrocede una versión aceptada.
- [x] 1.4 Sincronizar mapa y detalle mediante comprobación de versión/reloj antes y después, con un reintento máximo; verificar que un cambio concurrente deja el detalle pendiente/desactualizado y no bloquea el mapa coherente.

## 2. Día a Día completo — tarea 11

- [x] 2.0 Corregir la recuperación del backend para devolver la operación diaria en `ERROR` con su diagnóstico sin reanudarla; verificar consultas repetidas, reanudación explícita y conservación de la recuperación de `INTERRUMPIDA` tras reinicio.
- [ ] 2.1 Recuperar la operación al entrar, recargar, reintentar y volver de simulación; verificar mismo identificador en la operación existente y ausencia de comandos de reinicio/detención por navegación.
- [x] 2.2 Sustituir todos los ejemplos del flujo Día a Día (encabezado, registro, mapa, búsqueda, paneles e indicadores) por carga/vacío/error/último estado conocido; verificar backend desconectado desde el inicio y pérdida de conexión después de una lectura válida, sin pedidos locales confirmados como reales.
- [x] 2.3 Actualizar fecha base, reloj confirmado y estado/diagnóstico del motor desde el servidor; verificar pausa/error y reanudación sin marcar siempre Día a Día como ejecutándose ni avanzar hechos con el reloj del navegador.
- [x] 2.4 Mantener registro real de pedidos, confirmar solo tras éxito y refrescar tras mutaciones; verificar un pedido persistido al recargar y un rechazo sin confirmación falsa ni limpieza incorrecta del formulario.

## 3. Panel operacional de flota — tarea 12

- [x] 3.1 Crear panel reutilizable para operador y visualizador con todas las UT y conteo por tipo/estado; verificar 37 registros reales (10/15/12) y aviso sin fabricación ni reinicio en una respuesta heredada de 30.
- [x] 3.2 Crear ficha con código, tipo, carga/capacidad, porcentaje, estado, origen/destino, salida/retorno y pedidos con cantidades/ETA; verificar UT en base, programada, en ruta, en servicio, averiada y en mantenimiento, incluyendo campos nulos y etiquetas de viaje futuro.
- [x] 3.3 Centralizar semáforo de ocupación con los valores de presentación del diseño, leyenda y texto/porcentaje; verificar límites de umbral y coincidencia de categoría entre panel y mapa, sin confundirlo con stock/margen.

## 4. Búsqueda y ordenamiento de unidades — tarea 13

- [x] 4.1 Añadir búsqueda por código sin distinguir mayúsculas, conteo de coincidencias, resultado vacío y limpiar; verificar `tm01`, coincidencia parcial y preservación de búsqueda durante polling.
- [x] 4.2 Añadir ocupación, salida y llegada en ambos sentidos con nulos al final y desempate por código; verificar órdenes numéricos 8/50/100, horarios que cruzan medianoche, empates y ausencia de horarios.

## 5. Flota completa en mapa — tarea 14

- [x] 5.1 Extraer y conectar el mapa activo de `app/page.tsx` a un componente operativo compartido sin introducir un segundo motor de sondeo; verificar su uso efectivo en operador y visualizador y conservación de rutas, pedidos y bloqueos reales.
- [x] 5.2 Dibujar toda la flota desde posiciones físicas, incluidos residuales y UT sin ruta, con tres iconos distintos, código, ocupación, estado y tooltip carga/capacidad; verificar unidades detenidas, averiadas y en mantenimiento visibles.
- [x] 5.3 Agrupar UT coincidentes con conteo y selección individual accesible; verificar acceso a cualquiera de las 37 UT estacionadas en Central sin modificar sus coordenadas físicas.
- [x] 5.4 Orientar el indicador según la arista y mantener posición/orientación de espera sin movimiento supuesto; verificar giros, tramo de longitud cero y ausencia de ruta.

## 6. Cámara y movimiento suave — tarea 15

- [x] 6.1 Implementar rueda, controles de zoom, arrastre, límites y ajustar extensión con una transformación común; verificar anclaje al puntero, alineación marcador/ruta/clic y controles con teclado en distintos tamaños de pantalla.
- [x] 6.2 Animar entre lecturas confirmadas sobre aristas certificadas y esperas, respetando movimiento reducido; verificar un recorrido con esquina sin diagonal y que no cambian carga, entregas ni reloj operacional por la animación.
- [x] 6.3 Cancelar/resincronizar animación al pausar, desconectar, invalidar/cambiar plan, finalizar y cambiar escenario; verificar que no continúa el recorrido anterior ni queda un bucle de animación activo tras desmontaje.

## 7. Selección mapa y panel — tarea 16

- [x] 7.1 Unificar selección por identidad y escenario entre paneles y mapa; verificar clic en UT del panel centra/resalta y clic en otra UT del mapa abre su ficha, conservando selección en el polling.
- [x] 7.2 Conectar selección de almacén en ambos sentidos con centrado real de cámara y apertura del detalle; verificar Central, Nor-Oeste y Este con panel abierto/cerrado, sin limitarse a una marca visual.
- [x] 7.3 Representar todas las asociaciones de pedido a rutas/UT y permitir navegar desde ficha/envío al mapa; verificar un pedido distribuido entre dos rutas, pedido sin asignación y pedido entregado sin ruta vigente.
- [x] 7.4 Limpiar o informar selección inexistente al cambiar datos/escenario y conservar preferencias locales entre clientes; verificar que la búsqueda/zoom de un cliente no altera los del segundo ni envía comandos operacionales.

## 8. Almacenes y envíos — tarea 17

- [x] 8.1 Mostrar juntos los almacenes con stock, capacidad, porcentaje y semáforo compartido con mapa; verificar central ilimitado, stock finito, stock cero real y stock ausente sin convertir este último en cero.
- [x] 8.2 Añadir próximas salidas desde viajes futuros del plan aplicable, ordenadas por salida y con navegación a UT/pedidos; verificar separación de programados, ya en ruta y no asignados, así como ausencia de plan aplicable.
- [x] 8.3 Cargar pedidos históricos completos por páginas fuera del ciclo rápido y mostrar hasta diez entregas recientes por instante real; verificar más de 500 registros, empate temporal, entrega parcial no confirmada, error en página intermedia y navegación al pedido cerrado.
- [x] 8.4 Mostrar en envíos estados diferenciados de carga, vacío confirmado, desactualizado y dato no disponible; verificar secciones utilizables sin bloquear mapa/flota cuando falla la consulta histórica.

## 9. Compatibilidad de incidencias — soporte a tareas 11, 12 y 14

- [x] 9.1 Enviar `tipoAveria` numérico 1/2/3, separar descripción y corregir textos que atribuyen comportamientos antiguos; verificar payload y resultado real de cada tipo sin implementar sus reglas en React.
- [ ] 9.2 Reconocer `MANTENIMIENTO` en tipos, listas, fichas y mapa y no ofrecer reparación manual de avería para mantenimiento; verificar ventana informada, salida de disponibilidad y actualización al finalizar mediante datos del servidor.

## 10. Verificación técnica y regresiones

- [x] 10.1 Añadir una ejecución mínima de pruebas focalizadas de comportamiento, aprovechando herramientas disponibles sin implantar una plataforma extensa; verificar casos de versiones/respuestas tardías, orden numérico/nulos, umbrales, cámara/giros y selección con múltiples rutas descritos en las especificaciones.
- [x] 10.2 Ejecutar comprobación TypeScript explícita (`pnpm exec tsc --noEmit`) y build (`pnpm build`) desde el frontend, resolviendo errores atribuibles al cambio; verificar resultados registrados sin tratar `ignoreBuildErrors` como validación de tipos.
- [x] 10.3 Revisar visualmente operador y visualizador en escritorio y pantalla pequeña; verificar accesibilidad de controles, tooltips, agrupaciones y fichas, sin paneles que impidan localizar/seleccionar UT.
- [ ] 10.4 Verificar regresión de iniciar/pausar/reanudar/finalizar 5D y Colapso y volver a Día a Día; registrar escenarios y resultados y comprobar que se conserva el último resultado consultable al cierre existente, sin reiniciar la operación diaria.

## 11. Aceptación integrada y evidencia — tareas compartidas 23–26

- [x] 11.1 Ejecutar Día a Día extremo a extremo contra backend/BD reales: recuperar operación, confirmar flota oficial, registrar pedido, observar planificación/movimiento, registrar incidencia y observar nuevo plan; verificar IDs/versiones y guardar evidencia que cubra tareas 11–17 y 25.
- [ ] 11.2 Realizar prueba con dos clientes independientes, el segundo entrando después, y API accesible fuera de localhost; verificar mismo escenario/reloj/estado confirmado con tolerancia al intervalo de consulta, y búsquedas/paneles/zoom independientes; guardar evidencia de tarea 23.
- [ ] 11.3 Participar en una corrida completa 5D desde carga hasta cierre con datos reales, comprobando bloqueos, pedidos, rutas, indicadores y planificaciones; guardar resultado de tarea 24 o el bloqueo externo preciso, sin marcar aprobado un recorrido incompleto.

  Las pruebas externas de 11.2 y la corrida con datos oficiales de 11.3 se omiten por indicación del usuario; permanecen sin marcar porque no fueron ejecutadas ni aprobadas.
- [x] 11.4 Crear matriz `docs/semana11-ivan/aceptacion.md` que vincule tareas 11–17 y 23–26 con especificaciones, cambios y evidencia; verificar que cada criterio obligatorio tiene resultado y que los bloqueos de Daniel/Omar/Brillytd no figuran como resueltos sin prueba.
- [x] 11.5 Preparar y ensayar guion de demostración de la contribución de Iván, con explicación de reloj, polling, trayectorias, selección y límites de responsabilidad sobre Ta/Sa/Sc/algoritmo; verificar una secuencia reproducible y documentada para tarea 26.
- [x] 11.6 Documentar actividades y evidencias reales para actualizar el RHA de Iván y aportar al CGR/evaluación ISO/IEC 29110; verificar referencias y resultados sin inventar horas o adhesión, e identificar formatos/datos que deba completar el equipo cuando no estén disponibles.
- [ ] 11.7 Preparar notas del candidato frontend para Brillytd con versión/commit verificado, API configurada, contratos necesarios, comprobaciones y limitaciones; verificar checklist de integración y entrega de evidencia para `sol.integrada.sem11`, dejando el despliegue y publicación bajo responsabilidad de integración.

## 12. Mejoras opcionales posteriores

Los filtros por tipo de UT y semáforo de ocupación pueden añadirse después de los criterios obligatorios si queda tiempo, como permite la tarea 13. No son tareas requeridas para completar este cambio y no deben retrasar la aceptación; cualquier implementación debe conservar búsqueda, selección y conteo coherentes.
