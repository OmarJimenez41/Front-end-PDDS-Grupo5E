const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file)
const {luzOcupacion,luzStock,distanciaEntre,metricasUnidad,unidadCumple,resumenGlobal,filtrosIniciales,duracionSimulada,estadoEnEspanol}=require('../lib/operacion/mejorasV9.ts')
assert.equal(luzOcupacion(0,20),'vacío');assert.equal(luzOcupacion(null,20),'no disponible');assert.equal(luzOcupacion(30,20,{verde:20,rojo:60}),'ámbar');assert.equal(luzStock(0),'vacío');assert.equal(luzStock(null),'no disponible')
// La red en L mide 20 km, no la diagonal. Una espera no agrega recorrido.
const trayectoria=[{x1:0,y1:0,x2:10,y2:0,salidaH:0,llegadaH:1},{x1:10,y1:0,x2:10,y2:10,salidaH:2,llegadaH:3}]
assert.equal(distanciaEntre(trayectoria,0,3),20);assert.equal(distanciaEntre(trayectoria,.5,2.5),10);assert.equal(distanciaEntre(trayectoria,1,2),0)
const u={id:1,codigo:'TA01',tipo:'AUTO',ocupacionPct:25,capacidad:20,carga:5,recorridoKm:8,salidaH:0,llegadaH:5,etaDestinoH:3,minutosAlDestino:150,minutosDesdeSalida:30,pedidos:[]}
const mapa={relojH:.5,aplicable:true,plan:{rutas:[{vehiculoId:1,horaInicioH:0,horaFinH:5,trayectoria}]},fisico:{almacenes:[{central:true,stock:null,capacidad:null},{central:false,stock:50,capacidad:100},{central:false,stock:25,capacidad:300}]}}
assert.equal(metricasUnidad(u,mapa).destinoKm,15);assert.equal(metricasUnidad(u,mapa).origenKm,5);assert.equal(metricasUnidad(u,mapa).llegadaDestinoH,3)
assert.equal(metricasUnidad(u,{...mapa,aplicable:false}).destinoKm,15) // Estimación del último plan, indicada como pendiente en la interfaz.
assert.equal(unidadCumple(u,{...filtrosIniciales,distancia:'10:20'},mapa),true);assert.equal(unidadCumple(u,{...filtrosIniciales,tipo:'MOTO'},mapa),false)
const global=resumenGlobal(mapa,{unidades:[u,{...u,id:2,carga:15,capacidad:80}]})
assert.equal(global.ocupacion,20);assert.equal(global.porcentajeStock,18.75);assert.equal(global.capacidadStock,400)
assert.equal(resumenGlobal(mapa,null).ocupacion,null)
assert.equal(duracionSimulada(25.5),'1 d 01:30');assert.equal(estadoEnEspanol('EN_SERVICIO'),'Entregando')
const {inicioMedido,confirmarMapa,confirmarMovimiento,medicion}=require('../lib/operacion/latencia.ts')
inicioMedido(1,100);confirmarMapa(1,350);confirmarMovimiento(1,700);confirmarMapa(1,900)
assert.equal(medicion(1).mapaMs,250);assert.equal(medicion(1).movimientoMs,600)
console.log('V9: semáforos, filtros, distancias certificadas, indicadores ponderados y latencias correctos')
