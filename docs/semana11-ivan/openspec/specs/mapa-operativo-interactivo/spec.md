# mapa-operativo-interactivo Specification

## Purpose

Ofrecer un mapa navegable que represente la flota completa y permita relacionar unidades, almacenes, pedidos y rutas con sus fichas operativas.

## Requirements

### Requirement: Representación de todas las unidades
El mapa SHALL representar todas las UT físicas del escenario aunque no tengan ruta. SHALL distinguir auto, moto y bicicleta con iconos diferentes, incluir código y tooltip con carga/capacidad, ocupación y estado, y conservar acceso individual a unidades superpuestas sin cambiar sus coordenadas operacionales.

#### Scenario: Flota detenida en Central
- **WHEN** las 37 UT comparten la ubicación del almacén central
- **THEN** su presencia y cantidad son visibles y se puede seleccionar individualmente cualquiera mediante el grupo o el panel

### Requirement: Orientación según el tramo
Los marcadores SHALL orientar su indicador de dirección según el tramo certificado recorrido. Las unidades detenidas o sin tramo conocido SHALL conservar una orientación neutral o la última conocida sin sugerir movimiento inexistente.

#### Scenario: Cambio de dirección
- **WHEN** una UT pasa de un tramo horizontal a uno vertical
- **THEN** su indicador gira de acuerdo con el nuevo tramo y el tooltip conserva su identidad

### Requirement: Zoom y desplazamiento
El mapa SHALL permitir zoom continuo mediante rueda y controles, desplazamiento, ajuste al área completa y centrado del elemento elegido. Los marcadores, rutas y zonas de clic SHALL permanecer alineados tras estas transformaciones; los paneles superpuestos no SHALL desplazarse con la cuadrícula.

#### Scenario: Zoom y selección
- **WHEN** se amplía el mapa, se desplaza y se selecciona una UT
- **THEN** se selecciona el elemento dibujado bajo el puntero y puede recuperarse la vista completa mediante un control

### Requirement: Movimiento visual continuo y limitado
El mapa SHALL suavizar el movimiento entre lecturas usando la trayectoria certificada, respetando esquinas y esperas sin atravesar calles en diagonal. La animación no SHALL modificar reloj persistido, carga, entregas ni disponibilidad. Ante pausa, desconexión, plan invalidado o cambio de escenario SHALL detener o resincronizar el movimiento sin continuar un recorrido supuesto.

#### Scenario: Lecturas separadas por una esquina
- **WHEN** dos posiciones confirmadas están separadas por un giro del recorrido
- **THEN** la animación recorre los tramos intermedios y no conecta los extremos por una diagonal

#### Scenario: Pausa o pérdida de conexión
- **WHEN** se informa pausa o los datos dejan de actualizarse
- **THEN** no se extrapola indefinidamente y la interfaz identifica el último estado conocido

### Requirement: Navegación bidireccional con paneles
Seleccionar una UT en el panel SHALL centrarla y resaltarla; seleccionarla en el mapa SHALL abrir su ficha. La selección de almacén SHALL operar en ambos sentidos. Seleccionar un pedido SHALL mostrar sus rutas asociadas y permitir localizarlo; si está repartido entre varias UT SHALL conservar todas las asociaciones. La selección SHALL conservarse por identidad durante el polling y limpiarse o avisarse cuando el elemento deja de existir.

#### Scenario: De unidad a ficha y vuelta
- **WHEN** se selecciona TA01 en el panel y después TM01 en el mapa
- **THEN** primero se centra TA01 y después el panel abre la ficha de TM01 con el resaltado correspondiente

#### Scenario: Pedido con entrega parcial
- **WHEN** un pedido tiene cantidades asignadas a dos rutas
- **THEN** su ficha permite identificar y resaltar ambas rutas sin reducir la asociación a la última unidad encontrada

#### Scenario: Almacén desde ambos sentidos
- **WHEN** se selecciona un almacén desde el resumen o su marcador
- **THEN** se centra o abre su detalle respectivamente y ambos mantienen la misma selección
