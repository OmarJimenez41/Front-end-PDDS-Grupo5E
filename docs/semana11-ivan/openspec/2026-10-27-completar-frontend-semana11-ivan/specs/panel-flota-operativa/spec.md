# Spec Delta

## Purpose

Permitir inspeccionar toda la flota real desde un panel operativo, con información suficiente para evaluar cada unidad sin depender del mapa.

## ADDED Requirements

### Requirement: Inventario completo y estados reales
El panel SHALL listar todas las UT del escenario, incluidas las detenidas, programadas, en ruta, en servicio, averiadas, en mantenimiento y no disponibles, usando los estados del backend. SHALL mostrar el conteo real y advertir una discrepancia con la flota oficial de 37 UT (10 autos, 15 motos, 12 bicicletas), sin añadir registros ficticios ni reiniciar el escenario para corregirla.

#### Scenario: Flota oficial disponible
- **WHEN** el backend entrega las 37 UT oficiales
- **THEN** todas son inspeccionables y el conteo incluye tanto las activas como las detenidas

#### Scenario: Escenario heredado con menos unidades
- **WHEN** un escenario conserva una flota de 30 UT
- **THEN** se muestran sus 30 registros y la discrepancia, sin fingir cumplimiento de las 37 ni alterar su estado

### Requirement: Ficha operacional de unidad
El panel SHALL mostrar código, tipo, carga/capacidad, ocupación porcentual, semáforo, estado, origen, destino, hora de salida, llegada y pedidos asociados al viaje actual o próximo. SHALL distinguir llegada de la ruta de ETA de cada pedido y pedidos programados de transportados en curso. Los campos sin ruta o no informados SHALL mostrarse como no aplicables o no disponibles, sin inventar ceros, horas o destinos.

#### Scenario: Unidad en ruta con varios pedidos
- **WHEN** se inspecciona una UT cuyo detalle contiene ruta y pedidos
- **THEN** se muestran las cantidades y ETA recibidas de cada pedido y los horarios del viaje con fecha base del escenario

#### Scenario: Unidad sin ruta
- **WHEN** se inspecciona una UT en base sin viaje asignado
- **THEN** se muestran su carga, capacidad y estado, y los campos de viaje se identifican como sin asignación

### Requirement: Búsqueda y ordenamientos principales
El panel SHALL buscar por código sin distinguir mayúsculas y ordenar ascendente o descendentemente por ocupación, salida y llegada con valores numéricos/temporales. SHALL colocar valores ausentes al final en ambos sentidos, resolver empates por código y conservar la consulta al actualizar datos del mismo escenario. SHALL indicar resultados vacíos y permitir limpiar la búsqueda.

#### Scenario: Orden por ocupación
- **WHEN** se ordenan UT con ocupaciones 8, 50 y 100 por ciento
- **THEN** el orden ascendente es 8, 50, 100 y el descendente es 100, 50, 8

#### Scenario: Búsqueda y actualización
- **WHEN** se busca `tm01` y llega una nueva lectura de la flota
- **THEN** continúa visible TM01 con datos actualizados y se conserva el criterio de orden seleccionado

### Requirement: Semáforo de ocupación interpretable
El panel y el mapa SHALL usar los mismos umbrales de ocupación y explicar sus rangos en una leyenda. El semáforo SHALL basarse en carga/capacidad y distinguirse de los colores de tipo de vehículo, del margen de pedidos y del stock de almacenes. SHALL acompañarse de porcentaje o texto para no depender solo del color.

#### Scenario: Unidad con carga actualizada
- **WHEN** cambia la ocupación recibida y cruza un umbral
- **THEN** el panel y el mapa muestran el mismo porcentaje y categoría de ocupación para esa lectura
