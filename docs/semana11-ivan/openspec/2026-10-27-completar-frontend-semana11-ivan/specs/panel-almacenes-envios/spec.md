# Spec Delta

## Purpose

Permitir consultar juntos los almacenes y los envíos relevantes del escenario, mostrando inventario y actividad respaldados por datos operacionales reales.

## ADDED Requirements

### Requirement: Resumen conjunto de almacenes
El panel SHALL presentar juntos los almacenes del escenario con código/nombre, stock, capacidad, porcentaje disponible y semáforo cuando tengan capacidad finita. El central ilimitado SHALL identificarse como tal sin convertirlo en cero stock o asignarle un porcentaje ficticio. Los umbrales SHALL coincidir con los del mapa y el detalle.

#### Scenario: Almacenes oficiales
- **WHEN** el backend informa Central, Nor-Oeste y Este
- **THEN** los tres se consultan en el mismo panel y cada uno permite localizarse en el mapa

#### Scenario: Stock no informado
- **WHEN** falta el stock de un almacén de capacidad finita
- **THEN** se indica que el stock no está disponible en lugar de mostrar cero o un semáforo calculado con un valor inventado

### Requirement: Próximos envíos programados
El panel SHALL mostrar los próximos viajes aún no iniciados y sus pedidos cuando el plan y el detalle operacional los expongan, ordenados por salida. SHALL diferenciarlos de UT ya en ruta y de pedidos sin asignación; los horarios SHALL usar la fecha base y reloj del escenario.

#### Scenario: Viaje por iniciar
- **WHEN** existe un viaje programado con salida posterior al reloj actual
- **THEN** aparecen unidad, salida y pedidos asociados disponibles y se puede navegar a sus fichas o rutas

### Requirement: Entregas recientes y disponibilidad de datos
El panel SHALL mostrar hasta diez pedidos entregados más recientemente según su instante real de entrega, cuando el backend los informe. SHALL distinguir una lista vacía confirmada de una consulta fallida o campos no disponibles. Los datos históricos SHALL quedar separados del conjunto de pedidos abiertos del mapa y de las cantidades parciales no confirmadas.

#### Scenario: Pedidos recién entregados
- **WHEN** se reciben pedidos ENTREGADO con instante de entrega
- **THEN** se muestran en orden temporal descendente con código e instante y conservan acceso a su ficha

#### Scenario: Información de envíos no disponible
- **WHEN** la API no entrega los datos necesarios o falla su consulta
- **THEN** la sección explica esa limitación sin inventar envíos, entregas ni afirmar que no existen
