const assert=require('node:assert/strict')
const fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f)
const {origenParaAnimacion}=require('../lib/operacion/movimiento.ts')
const {leerOperacion}=require('../lib/operacion/lectura.ts')
const {iniciarControlador}=require('../lib/operacion/controlador.ts')
const {tiemposReporteHtml}=require('../lib/operacion/reporteLegible.ts')
async function main(){
 const origen={escenarioId:1,relojH:1},ultimo={escenarioId:1,relojH:2}
 assert.equal(origenParaAnimacion(ultimo,{...ultimo,versionEstado:8},origen),origen)
 assert.equal(origenParaAnimacion(ultimo,{escenarioId:2,relojH:2},origen),ultimo)
 assert.equal(origenParaAnimacion(ultimo,{escenarioId:1,relojH:3},origen),ultimo)
 await assert.rejects(()=>leerOperacion(1,new AbortController().signal,()=>true,null,{vista:async()=>({mapa:{escenarioId:2,relojH:1},unidades:{escenarioId:2,relojH:1}})}),/incoherente/)
 const muestras=[{escenarioId:1,versionEstado:1,relojH:10},{escenarioId:1,versionEstado:2,relojH:9}]
 const publicados=[];let resolve
 const terminado=new Promise(r=>resolve=r)
 const control=iniciarControlador(1,{mapa:m=>publicados.push(m),detalle:()=>{},error:()=>resolve()}, {vista:async()=>{const mapa=muestras.shift();return {mapa,unidades:{escenarioId:1,relojH:mapa.relojH}}}},1)
 const limite=setTimeout(()=>resolve(),1000)
 try{await terminado;assert.deepEqual(publicados.map(m=>m.relojH),[10])}finally{clearTimeout(limite);control.cerrar()}
 const serie={muestras:2,ultimo:5,promedio:4,minimo:3,maximo:5}
 const html=tiemposReporteHtml({simulacion:{factor:0,segundosEjecutados:12},tiempos:{taMs:serie,planificacionMs:{...serie,ultimo:50},saConfiguradaH:0,scConfiguradoH:1}})
 assert.match(html,/sin duración real objetivo/);assert.match(html,/Ta · búsqueda aislada/);assert.match(html,/Planificación total/);assert.match(html,/Sin muestras registradas/)
 console.log('Cierre JP: refresco sin retroceso, escenario correcto, continuidad de animación y tiempos de reporte correctos')
}
main().catch(e=>{console.error(e);process.exitCode=1})
