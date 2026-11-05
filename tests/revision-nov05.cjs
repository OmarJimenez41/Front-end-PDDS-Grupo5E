const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f)
const {trayectoriaConfirmada,puntoCertificado,animarIntervalo}=require('../lib/operacion/movimiento.ts')
const {datosMapa}=require('../lib/api/operacion.ts')
const {almacenCumple,zonaAlmacen,filtrosIniciales}=require('../lib/operacion/mejorasV9.ts')
const {leerOperacion}=require('../lib/operacion/lectura.ts')
const {iniciarControlador}=require('../lib/operacion/controlador.ts')
const {reporteHtml,resumenReporte,numeroReporte}=require('../lib/operacion/reporteLegible.ts')
;(async()=>{
 const v=(x)=>({id:1,x,y:0,residual:{x,y:0,destinoX:1,destinoY:0,finH:2,distanciaKm:1-x}})
 const a={escenarioId:1,relojH:1.25,plan:{id:1,rutas:[]},fisico:{vehiculos:[v(.25)]}},b={...a,relojH:1.75,plan:{id:2,rutas:[]},fisico:{vehiculos:[v(.75)]}}
 const aristas=trayectoriaConfirmada(a,b,1)
 assert.ok(aristas);assert.deepEqual(puntoCertificado(aristas,1.5),{x:.5,y:0})
 assert.equal(trayectoriaConfirmada(a,{...b,fisico:{vehiculos:[v(4)]}},1),null,'Nunca interpola un salto no confirmado')
 assert.equal(trayectoriaConfirmada(a,{...b,relojH:3},1),null,'Nunca extrapola más allá de la arista residual')
 let callback,fracciones=[];animarIntervalo(f=>fracciones.push(f),f=>(callback=f,1),()=>{},2000);callback(0);callback(500);callback(1000);callback(2000)
 assert.deepEqual(fracciones,[0,.25,.5,1])
 const ruta={id:1,vehiculoId:1,tipoVehiculo:'AUTO',horaInicioH:0,horaFinH:2,trazado:[{x:0,y:0,instanteH:0},{x:1,y:0,instanteH:1},{x:1,y:1,instanteH:2}],paradas:[]}
 const mapa=datosMapa({relojH:.5,fisico:{relojH:.5,vehiculos:[],almacenes:[],servicios:[]}}, {rutas:[ruta]}, [],[],false)
 assert.deepEqual(mapa.rutas[0].porRecorrer,[[.5,0],[1,0],[1,1]])
 assert.deepEqual(mapa.rutas[0].recorrido,[[0,0],[.5,0]])
 assert.equal(mapa.rutas[0].pendientePlan,true)
 const almacen={codigo:'ALM-NOROESTE',x:12,y:38,central:false,stock:0,capacidad:1000}
 assert.equal(zonaAlmacen(almacen),'Noroeste')
 assert.equal(almacenCumple(almacen,{...filtrosIniciales,patronAlmacen:'ALM-NOR*',zonaAlmacen:'Noroeste',luzAlmacen:'vacío'}),true)
 assert.equal(almacenCumple(almacen,{...filtrosIniciales,zonaAlmacen:'Sureste'}),false)
 let llamadas=0,publicados=0
 const lectura=await leerOperacion(1,new AbortController().signal,()=>{publicados++;return true},null,{vista:async()=>{llamadas++;return{mapa:{escenarioId:1,versionEstado:1,relojH:10},unidades:{escenarioId:1,relojH:10,unidades:[]}}},mapa:()=>{throw Error('No debe cruzar consultas')},unidades:()=>{throw Error('No debe cruzar consultas')}})
 assert.equal(llamadas,1);assert.equal(publicados,1);assert.equal(lectura.estadoDetalle,'actual')
 let intentos=0,recuperado=false,errores=0
 const controlador=iniciarControlador(1,{mapa:()=>{recuperado=true},detalle:()=>{},error:()=>errores++},{mapa:()=>{},unidades:()=>{},vista:async(id,signal)=>{intentos++;if(intentos===1)return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));return{mapa:{escenarioId:1,versionEstado:1,relojH:1},unidades:{escenarioId:1,relojH:1,unidades:[]}}}},5,15)
 await new Promise(r=>setTimeout(r,100));controlador.cerrar();assert.ok(errores>=1);assert.ok(recuperado,'Se recupera de una petición bloqueada sin refrescar')
 const reporte={escenarioId:1,versionEstado:1,relojH:2,estado:'FINALIZADO',generadoEn:'2026-11-05',planAplicable:false,cierreDefinitivo:true,criterioEstabilidad:'Certificado',pedidos:[],paquetes:[],fisico:{vehiculos:[],almacenes:[]},ultimaPlanificacionEstable:{id:1,rutas:[{...ruta,paradas:[{pedidoId:1,codigoPedido:'<script>alert(1)</script>',cantidad:1,etaH:2}]}]}}
 assert.deepEqual(resumenReporte({...reporte,pedidos:[{estado:'ENTREGADO'},{estado:'EN_RUTA'}],ultimaPlanificacionEstable:{rutas:[{vehiculoId:1},{vehiculoId:1},{vehiculoId:2}]}}),{total:2,entregados:1,pendientes:1,porcentaje:50,rutas:3,unidades:2});assert.equal(numeroReporte(null),'—');assert.equal(resumenReporte({...reporte,pedidos:[]}).porcentaje,0);const html=reporteHtml(reporte,h=>String(h));assert.ok(html.includes('Reporte de cierre'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'))
 console.log('Revisión 05/11: lectura atómica, recuperación automática, movimiento residual, rutas pendientes/recorridas, filtros de almacén y reporte legible correctos')
})().catch(e=>{console.error(e);process.exitCode=1})
