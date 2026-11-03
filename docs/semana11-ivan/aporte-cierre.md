# Aporte de Iván para el cierre de Semana 11

Este documento reúne evidencia técnica disponible para que el equipo la contraste y la incorpore en sus formatos. No asigna horas, calificaciones ni conformidad institucional.

## Actividades verificables

- Inspección del contrato local de operación, mapa, unidades, pedidos e incidencias; ver [contratos.md](contratos.md).
- Implementación frontend en `lib/api/operacion.ts`, `lib/operacion/`, `components/operacion/` y `app/page.tsx`: consultas, presentación de flota, mapa, selección, almacenes y envíos. La finalización de cada requisito se controla en el archivo OpenSpec de tareas, no se deduce de esta lista.
- Pruebas técnicas y comprobación explícita de tipos; ver [verificacion-tecnica.md](verificacion-tecnica.md) y `tests/lectura-operacion.cjs`.
- Pruebas en la base aislada: escenario 1, pedido `PED-SEM11`, averías locales 6–8 y bloqueo local 9. La prueba mostró recuperación, pausado/reanudación y conservación de un servicio durante replanificación. Son datos de prueba, no evidencia de producción.
- Preparación de la [matriz de aceptación](aceptacion.md) y del [guion de demostración](guion-demostracion.md), ambos con pendientes explícitos.

## Datos que debe completar o validar el equipo

- Formato RHA vigente, fechas, horas reales, responsables y firmas o aprobaciones correspondientes.
- Formatos del CGR y de evaluación ISO/IEC 29110, criterios aplicables, evidencias y responsables de verificación.
- Versión integrada, capturas y resultados de las pruebas conjuntas, incluida la corrida completa 5D y la prueba con dos clientes.
- Confirmación de Daniel/Omar sobre contratos y datos en el backend compartido y de Brillytd sobre integración y despliegue.

No se han inventado horas ni se ha afirmado cumplimiento de los instrumentos externos. Los registros y capturas definitivos deben vincularse al formato oficial que facilite el equipo.

## Evidencia adicional del 3 de noviembre de 2026

- Recuperación diaria y aislamiento de respuestas tardías con pruebas controladas; regresión local de pausa, reanudación y detención de escenarios 5D 2 y Colapso 3.
- Mantenimiento real de TB03 en escenario 4, con ficha abierta antes y después; detalle sincronizado tras pausar el escenario de prueba. Consulta histórica corregida para mostrar el estado del escenario seleccionado.
- Preparación de datos y base locales aislados, verificación de 37 UT y actualización de la matriz, notas y guion. Los resultados y sus límites están en [verificacion-tecnica.md](verificacion-tecnica.md).

No se atribuyen horas, aprobación del equipo ni publicación a estas actividades.
