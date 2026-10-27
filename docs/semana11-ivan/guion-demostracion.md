# Guion de demostración

Preparar el frontend y una API con BD de pruebas y la flota oficial. Registrar previamente la URL de API, la revisión del frontend y el identificador del escenario. Confirmar que se dispone de permiso del equipo para crear pedidos e incidencias en el entorno elegido.

1. Abrir Día a Día y señalar el identificador, fecha base, reloj y estado confirmados por el servidor. Recargar y comprobar que se recupera la misma operación.
2. Abrir la flota: mostrar los conteos 10 autos, 15 motos y 12 bicicletas; buscar una unidad y explicar su ficha, ocupación y estado. Si el entorno devuelve otra composición, mostrar el aviso sin completar registros artificialmente.
3. Abrir el mapa, seleccionar una unidad agrupada y localizarla desde el panel. Explicar que la posición representa datos físicos confirmados y que el suavizado se limita a trayectorias certificadas entre lecturas, sin avanzar pedidos, carga ni reloj.
4. Mostrar almacenes, salidas y entregas recientes; distinguir una lista vacía confirmada de información no disponible o desactualizada.
5. Registrar un pedido de prueba y, cuando el servidor responda, observar la actualización. Registrar una avería tipificada solo en el entorno autorizado y consultar la incidencia y el nuevo plan.
6. Explicar que cada cliente consulta su propia selección y cámara. Una prueba de dos clientes y una corrida 5D completa requieren evidencia independiente del equipo.

El frontend consulta y presenta los hechos del servidor. Los indicadores Ta, Sa y Sc, la planificación y sus algoritmos pertenecen al backend; no se atribuye al frontend su implementación ni su validación.

## Ensayo local

El 27/10/2026 se ensayaron los pasos con el escenario local 1 y `http://localhost:8080`. La referencia base del frontend era `864c75bf7a65355cda8c84248c49631836b47a1a` con cambios aún sin commit; no es un identificador de entrega. Se recuperó la operación tras recargar; se observaron las 37 unidades y se abrió la ficha TB01 desde el grupo del mapa; se revisaron Nor-Oeste y los estados de envíos; se registró el pedido 3 y la avería 10, con las versiones y planes documentados en [verificación técnica](verificacion-tecnica.md). Dos pestañas locales mantuvieron búsquedas y cámaras diferentes. El orden de revisión se adaptó al estado local, y la explicación del reloj, sondeo y trayectorias debe acompañar la demostración.

Este ensayo no es una sustentación ante el equipo ni acredita la prueba externa de dos clientes o la corrida 5D. Para la demostración compartida se deben registrar el commit efectivo, URL, escenario y evidencia del entorno de integración.
