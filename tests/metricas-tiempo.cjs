const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f)
const {serieMedida,formatoTiempo,definicionesTiempo}=require('../lib/operacion/metricasTiempo.ts')
const s={muestras:2,ultimo:12,promedio:10,minimo:8,maximo:12}
assert.equal(serieMedida(s),true)
for(const x of [null,undefined,{...s,muestras:0},{...s,ultimo:NaN},{...s,promedio:Infinity},{...s,minimo:-1},{...s,ultimo:20},{...s,promedio:20}])assert.equal(serieMedida(x),false)
assert.equal(serieMedida({muestras:1,ultimo:0,promedio:0,minimo:0,maximo:0}),true,'A measured zero is different from no samples')
assert.equal(formatoTiempo(.5,true),'30','Simulated hours convert to minutes once')
assert.equal(formatoTiempo(23,false),'23','Real milliseconds are never replaced with configuration')
assert.deepEqual(definicionesTiempo.map(d=>d.campo),['taMs','saH','scH','planificacionMs'])
console.log('Métricas: ausencia, cero real, valores inválidos, unidades y separación del total correctos')

const {llenarCamara}=require('../lib/operacion/camara.ts')
for(const [w,h,vw,vh] of [[700,500,1400,500],[420,300,420,800],[700,500,700,500]]){
 const c=llenarCamara(w,h,vw,vh)
 assert.ok(w*c.escala>=vw&&h*c.escala>=vh,'Uniform geographic scale fills both viewport dimensions')
 assert.ok(Math.abs(c.x+w*c.escala/2-w/2)<1e-9,'Keeps the geographic center horizontally')
 assert.ok(Math.abs(c.y+h*c.escala/2-h/2)<1e-9,'Keeps the geographic center vertically')
}
console.log('Encuadre: llena escritorio y móvil sin deformar ni desplazar el centro geográfico')

assert.equal(serieMedida({muestras:3,ultimo:.2,promedio:.20000000000000004,minimo:.2,maximo:.2}),true,'Floating-point rounding must not hide genuine measurements')

const {estadisticaProgramada}=require('../lib/operacion/metricasTiempo.ts')
assert.equal(estadisticaProgramada({muestras:0,suma:0,minimo:0,maximo:0,ultimo:0}),null)
assert.deepEqual(estadisticaProgramada({muestras:2,suma:7000,minimo:3000,maximo:4000,ultimo:4000}),{muestras:2,suma:7000,minimo:3000,maximo:4000,ultimo:4000,promedio:3500})
assert.equal(estadisticaProgramada({muestras:2,suma:NaN,minimo:3,maximo:4,ultimo:4}),null)
console.log('Cadencia programada: promedio derivado de muestras reales y ausencia sin inventar ceros')
