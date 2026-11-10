# Revisión de movimiento y UX — 9 de noviembre de 2026

## Alcance y preferencias conservadas

- El encabezado, las tarjetas de tiempo y las herramientas conservan su diseño anterior por indicación del usuario.
- Las etiquetas de vehículos se ocultan por defecto: aparecen al pasar el cursor, enfocar con teclado o seleccionar. Los almacenes mantienen sus etiquetas.
- No se añade un control de duración de 45 minutos. El servidor administra el ritmo de la simulación.
- No se cambian las reglas del algoritmo, los datos oficiales, la velocidad física ni los tipos de avería del backend.

## Correcciones

1. Se unen los viajes consecutivos de la misma unidad y las esperas verificadas entre ellos. Cruzar el fin de una ruta ya no descarta por sí solo la animación.
2. Se conserva el tramo pendiente de reproducir al recibir otra lectura; la nueva interpolación comienza desde la posición que ya estaba en pantalla.
3. Una nueva versión sin avance de reloj no interrumpe la interpolación.
4. Se elimina el desplazamiento condicional de 44 píxeles del vehículo sobre un almacén. Los grupos estacionados usan una insignia de cantidad; no desplazan la coordenada física de una unidad en movimiento.
5. La animación se ejecuta dentro del mapa, sin actualizar Home y todos los paneles en cada cuadro. Las trayectorias se validan al recibirlas y se evalúan con búsqueda binaria durante la animación. La cuadrícula se memoriza.
6. Se recorta el trazado recorrido y por recorrer con el reloj de reproducción. Los íconos se orientan con la dirección certificada, conservándola durante las esperas de la transición.
7. Se mantiene el rechazo de recorridos incompatibles o no comprobados: no se crean diagonales ni atajos para esconder errores de datos.
8. El zoom de rueda responde proporcionalmente a la magnitud del gesto. La preferencia de movimiento reducido desactiva animaciones.
9. Los paneles de consulta reservan espacio para el mapa en escritorio y se disponen debajo en pantallas estrechas. Los contenedores cerrados no interceptan la interacción con el mapa.
10. La ocupación global usa la misma instantánea física del mapa, sin desaparecer cuando las fichas se retrasan. Se retiran indicadores ficticios del fallback del visualizador.

## Correspondencia con la rúbrica

| Requisito | Tratamiento | Evidencia / límite |
|---|---|---|
| Movimiento fluido y coherente | Continuidad entre rutas, esperas y lecturas; coordenadas estables y orientación | Pruebas automáticas de movimiento. El rendimiento con cada volumen de datos requiere medición de corrida. |
| Recorrido pendiente y recorrido realizado | Corte visual sincronizado y distinta intensidad de línea | Lógica de proyección y revisión del mapa en ejecución. |
| Zoom continuo | Factor proporcional al gesto; límites de cámara conservados | Comprobaciones de cámara y revisión adaptable. |
| Semáforo y ocupación | Íconos y datos conservados; porcentajes legibles y etiquetas bajo demanda | La ocupación exacta también se consulta en título y ficha. |
| Paneles inicialmente contraídos | Estado inicial sin panel; apertura a demanda y espacio reservado | Revisión de paneles en navegador. |
| Consultas independientes | Estado de cámara, filtros y selección local al navegador, sin agregar motores | Se conserva la arquitectura. No equivale a haber ensayado dos dispositivos físicos. |
| Ta, Sa y Sc | Tarjetas con última muestra, promedio, máximo y cantidad de muestras; unidades explícitas | Valores del endpoint del servidor, no números inventados ni el presupuesto confundido con Ta. |
| Diagramas de consumo y navegadores | Diagramas disponibles desde Indicadores → Ritmo y ejecución | Se reutilizan los diagramas existentes de la arquitectura. |
| Configuración, datos, filtros y vinculación | Se conservan catálogos, cargas, selección mapa-panel y filtros existentes | Suite de regresión operativa. |
| Cierres | Se conservan reportes de periodo, colapso y día a día | Pruebas existentes de reporte. No se ejecutan cierres sobre los escenarios del usuario para verificar diseño. |
| Despliegue en V | Fuera del despliegue local solicitado | No se acredita un despliegue externo con pruebas locales. |
| Vuelos, cancelaciones y maletas | No se inventan funciones ajenas a PaqRap | Confirmar aplicabilidad con el enunciado del caso. |
| Avería tipo 4 | No se incorpora un tipo sin regla de negocio definida | El backend revisado admite tipos 1–3; requiere definición si el caso exige el cuarto. |
| Integridad de datos oficiales | Se conserva el manifiesto con conteos y hashes | Solo una comparación con los originales puede acreditar ausencia de reducción. |

## Verificación reproducible

- `npm run test:revision`: lecturas, filtros, métricas, recuperación, envíos y reportes.
- `npm run test:movimiento`: llegada, espera, viajes consecutivos, nueva lectura durante reproducción, residual en replanificación, rechazo de saltos y cancelación al desmontar.
- `npx tsc --noEmit`: comprobación de tipos.
- PowerShell: `$env:NEXT_DIST_DIR='.next-verificacion'; npm run build -- --webpack` para compilar sin sobrescribir el servidor de desarrollo.

Las pruebas no garantizan 60 FPS en todo equipo. Cuando falta un camino verificable se conserva el estado físico confirmado en vez de animar un recorrido ficticio.


## Segunda revisión de UX y rendimiento

- Los símbolos cercanos se agrupan según distancia en pantalla y nivel de zoom; la unidad seleccionada queda individual. No se promedian ni modifican coordenadas.
- El selector del grupo mantiene una posición fija durante la consulta y permite elegir una unidad o ampliar la zona.
- Flota, envíos e incidencias comparten el encabezado, cierre y cuerpo desplazable de PanelTrabajoV9.
- La consulta tiene una barra compacta: Ver estado, búsqueda principal y herramientas secundarias. El buscador permite flechas, Enter y Escape y muestra estados y destinos reales.
- Se simplifican solo vértices de dibujo colineales, conservando giros, esperas, cambios de sentido y tiempos originales. No se reducen registros de ventas ni datos oficiales.
- `npm run test:mapa` verifica agrupación, selección, zoom y geometría. `node tests/perfil-mapa.cjs` genera `PERFIL-MAPA.json`: es una carga sintética de cálculo, no una certificación de FPS ni una prueba desde dos dispositivos físicos.
- No se modificaron los endpoints ni el acceso de red. La propuesta de proxy no se aplicó.


## Preferencia final de representación

Por indicación del usuario, se retiraron los contadores de vehículos del mapa. Cada unidad se dibuja con su propia figura y coordenada física. La cercanía solo se usa al pulsar figuras superpuestas para ofrecer una lista de selección; no reemplaza ni mueve los íconos. La leyenda se rediseñó como panel opaco, con secciones y rangos configurados alineados.
