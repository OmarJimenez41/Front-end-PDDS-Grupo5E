const fs=require('node:fs'),ts=require('typescript'),{performance}=require('node:perf_hooks')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f)
const {prepararRutas,rutasEnHora}=require('../lib/operacion/escenaMapa.ts'),{agruparCercanas}=require('../lib/operacion/agrupacionMapa.ts')
const n=2000,rutas=Array.from({length:37},(_,v)=>({id:v+1,vehiculoId:v+1,tipoVehiculo:'AUTO',horaInicioH:0,horaFinH:n/60,trazado:Array.from({length:n+1},(_,i)=>({x:i%138<=69?i%138:138-i%138,y:v+1,instanteH:i/60}))}))
const inicio=performance.now(),preparadas=prepararRutas({rutas}),preparacionMs=performance.now()-inicio,medidas=[]
let caracteres=0
for(let f=-20;f<120;f++){
 const t=performance.now(),visibles=rutasEnHora(preparadas,n/60*Math.max(0,f)/120,true)
 for(const r of visibles){caracteres+=r.porRecorrer.map(p=>p.join(',')).join(' ').length;caracteres+=r.recorrido.map(p=>p.join(',')).join(' ').length}
 agruparCercanas(visibles.map(r=>({id:r.vehiculoId,x:r.porRecorrer[0][0],y:r.porRecorrer[0][1]})),1000,520,1,null)
 if(f>=0)medidas.push(performance.now()-t)
}
medidas.sort((a,b)=>a-b)
const resultado={tipo:'Carga sintética local; cálculo geométrico, agrupación y cadenas SVG. No mide React, DOM, GPU ni FPS reales.',unidades:37,tramosPorRuta:n,verticesFuente:37*(n+1),verticesDibujo:preparadas.reduce((n,r)=>n+r.puntos.length,0),cuadrosMedidos:medidas.length,preparacionMs,medianaMs:medidas[60],p95Ms:medidas[Math.floor(medidas.length*.95)],maximoMs:medidas.at(-1),caracteresProcesados:caracteres}
fs.writeFileSync('docs/PERFIL-MAPA.json',JSON.stringify(resultado,null,2)+'\n');console.log(JSON.stringify(resultado,null,2))
