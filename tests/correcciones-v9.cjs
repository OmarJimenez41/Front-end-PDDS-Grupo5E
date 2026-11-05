const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file)
const {filtrarEnvios,filtrarPedidosCompletos,contieneProducto,paginaProductos}=require('../lib/operacion/enviosDetalle.ts')
const {unidadCumple,filtrosIniciales}=require('../lib/operacion/mejorasV9.ts')
const {rutasExpuestas}=require('../lib/operacion/incidenciasMapa.ts')
const base={entregaId:'e1',pedidoId:1,codigoPedido:'P1',destinoX:5,destinoY:6,rutaId:1,vehiculoId:1,codigoVehiculo:'TA01',origenId:1,origenCodigo:'CENTRAL',salidaH:11,llegadaH:14,retornoH:16,entregaRealH:null,estado:'POR_SALIR',cantidad:2,productos:[{entregaId:'e1',pedidoId:1,primero:1,ultimo:2,rutaId:1,vehiculoId:1}]}
const entregas=[base,{...base,entregaId:'e2',rutaId:2,origenCodigo:'ESTE',estado:'ENTREGADO',entregaRealH:6,productos:[{...base.productos[0],primero:3,ultimo:4,rutaId:2,entregaId:'e2'}]},{...base,entregaId:'e3',estado:'ENTREGADO',entregaRealH:5.99},{...base,entregaId:'e4',estado:'POR_SALIR',salidaH:14.01},{...base,entregaId:'e5',estado:'EN_SERVICIO',llegadaH:10},{...base,entregaId:'e6',estado:'PENDIENTE_REPLANIFICACION'}]
assert.deepEqual(filtrarEnvios(entregas,'entregadas',10,4).map(e=>e.entregaId),['e2'])
assert.deepEqual(filtrarEnvios(entregas,'entregadas',10,4,'CENTRAL'),[])
assert.deepEqual(filtrarEnvios(entregas,'salidas',10,4).map(e=>e.entregaId),['e1'])
assert.deepEqual(filtrarEnvios(entregas,'transito',10,4).map(e=>e.entregaId),['e5'])
assert.deepEqual(filtrarEnvios(entregas,'futuras',10,4).map(e=>e.entregaId),['e1','e4','e5'])
assert.equal(contieneProducto(entregas[1].productos[0],'P1-3'),true)
assert.equal(contieneProducto(entregas[1].productos[0],'P1-2'),false)
const completo=[{...base,estado:'ENTREGADO',entregaRealH:5,estadoPedido:'ENTREGADO',pedidoEntregadoEnH:9,cantidadPedido:4},{...base,entregaId:'segunda',estado:'ENTREGADO',entregaRealH:9,estadoPedido:'ENTREGADO',pedidoEntregadoEnH:9,cantidadPedido:4}]
assert.equal(filtrarPedidosCompletos(completo,'entregadas',10,4).length,2,'El pedido terminado conserva todas sus rutas')
assert.equal(filtrarEnvios(completo,'entregadas',10,4).length,1,'Solo los productos de la segunda parte se entregaron en la ventana')
assert.equal(filtrarPedidosCompletos([{...base,estadoPedido:'PENDIENTE',cantidadPedido:10}],'futuras',10,4).length,0,'No se promete la entrega completa con partes sin asignar')
assert.deepEqual(paginaProductos([{...base.productos[0],primero:1,ultimo:100000}],1,3),['P1-4','P1-5','P1-6'])
const unidad={codigo:'TA01',tipo:'AUTO',ocupacionPct:60,capacidad:10,minutosAlDestino:12,minutosDesdeSalida:8,destino:{codigo:'PED-1'},pedidos:[],salidaH:1}
assert.equal(unidadCumple(unidad,{...filtrosIniciales,medida:'destinoMin',minimo:'10',maximo:'15'},null),true)
assert.equal(unidadCumple(unidad,{...filtrosIniciales,medida:'destinoMin',minimo:'13',maximo:'15'},null),false)
assert.equal(unidadCumple(unidad,{...filtrosIniciales,medida:'destinoMin',minimo:'20',maximo:'10'},null),false)
assert.equal(unidadCumple(unidad,{...filtrosIniciales,destino:'PED-2'},null),false)
assert.equal(unidadCumple(unidad,{...filtrosIniciales,codigo:'TM'},null),false)
assert.equal(unidadCumple({...unidad,minutosAlDestino:0},{...filtrosIniciales,medida:'destinoMin',minimo:'0',maximo:'0'},null),true)
const mapa={aplicable:true,plan:{rutas:[{id:1,trayectoria:[{x1:0,y1:0,x2:10,y2:0,salidaH:10,llegadaH:11}]}]}}
const bloqueo={tipo:'BLOQUEO',activa:true,instanteH:10,finH:11,tramos:[{x1:5,y1:0,x2:6,y2:0}]}
assert.equal(rutasExpuestas(bloqueo,mapa).length,1)
assert.equal(rutasExpuestas({...bloqueo,instanteH:12},mapa).length,0)
assert.equal(rutasExpuestas({...bloqueo,activa:false},mapa).length,0)
assert.equal(rutasExpuestas(bloqueo,{...mapa,aplicable:false}).length,0)
console.log('Correcciones V9: filtros compartidos, límites de 4 h, parciales, productos paginados y exposición horaria correctos')
