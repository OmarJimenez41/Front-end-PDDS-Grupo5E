// Reporte de cierre de la simulación hasta el colapso: instante, pedido causante, plazo y cumplimiento.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f)
const {reporteHtml,resultadoSimulacion}=require('../lib/operacion/reporteLegible.ts')
const hora=h=>`h${h}`
const reporte={escenarioId:9,versionEstado:4,relojH:70,estado:'COLAPSADO',generadoEn:'2026-11-05T20:00:00Z',planAplicable:false,cierreDefinitivo:true,criterioEstabilidad:'Certificado',pedidos:[{id:1,estado:'ENTREGADO'},{id:2,estado:'NO_ENTREGADO'}],paquetes:[],fisico:{vehiculos:[],almacenes:[]},acumulado:null,ultimaPlanificacionEstable:{id:3,distanciaTotalKm:12,rutas:[]}}
const vista=(colapso,cierre)=>({simulacion:{tipo:'COLAPSO',inicioH:8,relojH:70,ultimoError:null},pedidos:{incorporados:40,entregados:30,entregadosATiempo:28,noEntregados:1,abiertos:9},colapso,cierre})
const colapso={instanteH:70,fecha:'2026-09-10T22:00:00',pedido:{id:2,codigo:'<b>PED-2</b>',posX:48,posY:34,fechaLimiteH:69.5}}

const r=resultadoSimulacion(vista(colapso,{motivo:'COLAPSO_OPERATIVO',detalle:'El pedido venció'}),hora)
assert.equal(r.colapsado,true);assert.equal(r.instante,'h70');assert.equal(r.diasHastaColapso,3);assert.equal(r.causante.plazo,'h69.5');assert.equal(r.tarde,2)
const html=reporteHtml(reporte,hora,vista(colapso,{motivo:'COLAPSO_OPERATIVO',detalle:'El pedido venció'}))
assert.match(html,/Reporte de cierre · Simulación hasta el colapso/)
assert.match(html,/Colapso logístico/);assert.match(html,/Instante del colapso<\/small>h70/);assert.match(html,/Plazo comprometido<\/small>h69.5/)
assert.match(html,/&lt;b&gt;PED-2&lt;\/b&gt; · destino \(48, 34\)/);assert.doesNotMatch(html,/<b>PED-2<\/b>/)
assert.match(html,/Entregados a tiempo/);assert.match(html,/70 %/)

const sin=reporteHtml(reporte,hora,vista(null,{motivo:'FIN_DE_DATOS',detalle:'Sin colapso hasta el fin de los datos'}))
assert.match(sin,/Finalizó sin colapso/);assert.match(sin,/Sin colapso hasta el fin de los datos/);assert.doesNotMatch(sin,/Colapso logístico/)
// Sin vista de simulación (p. ej. operación día a día) el reporte sigue como antes
assert.doesNotMatch(reporteHtml(reporte,hora),/Colapso logístico|Cumplimiento de la simulación/)
console.log('Reporte de colapso: instante, pedido causante, plazo, cumplimiento y caso sin colapso correctos')
