# Revisión visual local — 3 de noviembre de 2026

Entorno: frontend local conectado a `http://127.0.0.1:18080`; operación diaria 1 y escenario de prueba 4 detenido. Revisión base del frontend `f6f311ea90b85069cf719742cd2c56429ab1654b`, con cambios locales sin commit; backend `9945a4fc4832437fc8558b99569d22f96e2da1cf`. Los resultados siguientes son observaciones locales, no aceptación compartida.

| Criterio | Resultado observado |
| --- | --- |
| 12, flota y ficha | El panel mostró 37 unidades (10 autos, 15 motos, 12 bicicletas). La ficha TM01 mostró tipo, estado y carga. TB03 mostró su ventana de mantenimiento y, tras lectura coherente, EN BASE con la ficha aún abierta. |
| 13, búsqueda y orden | `tm01` produjo una coincidencia. En escenario 4, al seleccionar orden descendente por ocupación, TA02 con 20,8% apareció antes de las unidades al 0%. La suite focalizada comprueba también orden por salida, llegada, empates y valores ausentes. |
| 14, mapa y unidades | Se observaron el grupo de unidades, la incidencia de mantenimiento y el icono de TA02 EN_SERVICIO en la posición del escenario 4 detenido. Dos lecturas separadas de `/unidades` conservaron reloj 24,5931 y posición (16,28); no se infirió avance mientras estaba detenido. |
| 15, cámara y movimiento | Los botones de zoom y ajuste se observaron en escritorio y en un viewport de 390 × 844. El arrastre desplazó el mapa en escritorio. Las pruebas focalizadas cubren límites, anclaje y movimiento entre trayectorias certificadas; el ensayo anterior de recorrido real está documentado en `verificacion-tecnica.md`. |
| 16, selección | Desde el grupo del mapa en ancho pequeño se seleccionó TM01 y se abrió su ficha correspondiente. La selección también se comprobó desde la lista de flota en escritorio. |
| 17, almacenes y envíos | Nor-Oeste abrió su panel con 1000/1000 y coordenadas (12,38). En Día a Día el panel indicó que no había plan aplicable ni entregas confirmadas; en escenario 4 detenido también mostró esos estados. La paginación y asociaciones adicionales se verifican en la suite y en la evidencia local anterior, sin atribuir campos no expuestos a la API. |

En ancho pequeño se revisaron operador y visualizador: navegación, flota, ficha, mapa, búsqueda, zoom y selección. Durante la simulación rápida, el detalle de flota se identificó como desactualizado hasta obtener una lectura coherente tras pausar el escenario de prueba. La prueba externa multiusuario, la corrida oficial completa y la aceptación compartida permanecen pendientes.
