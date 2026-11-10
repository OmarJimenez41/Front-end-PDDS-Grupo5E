const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f)
const {trayectoriaConfirmada,puntoCertificado,crearEvaluador}=require('../lib/operacion/movimiento.ts')
const {cuadroFisico,prepararTransicion}=require('../lib/operacion/transicionMovimiento.ts')
const arista=(x,t)=>({x1:x,y1:0,x2:x+1,y2:0,salidaH:t,llegadaH:t+1})
const ruta=(id,inicio,aristas)=>({id,vehiculoId:1,horaInicioH:inicio,horaFinH:aristas.at(-1).llegadaH,trayectoria:aristas})
const rutas=[ruta(1,0,[arista(0,0)]),ruta(2,1.5,[arista(1,1.5)])]
const mapa=(h,x,version=1,viajes=rutas)=>({escenarioId:1,relojH:h,versionEstado:version,aplicable:true,plan:{id:1,instanteH:0,rutas:viajes},fisico:{vehiculos:[{id:1,x,y:0}]}})
let a=mapa(.75,.75),b=mapa(1.25,1)
const fin=trayectoriaConfirmada(a,b,1)
assert.ok(fin,'Anima el fin de la ruta y la espera posterior')
assert.deepEqual(puntoCertificado(fin,1.1),{x:1,y:0})
b=mapa(1.75,1.25)
const consecutivos=trayectoriaConfirmada(a,b,1)
assert.ok(consecutivos,'Enlaza dos viajes del mismo vehículo con una espera')
assert.deepEqual(puntoCertificado(consecutivos,1.4),{x:1,y:0})
assert.deepEqual(puntoCertificado(consecutivos,1.6),{x:1.1,y:0})
assert.equal(trayectoriaConfirmada(a,mapa(1.75,8),1),null,'Rechaza posiciones que el recorrido no confirma')
assert.equal(crearEvaluador([arista(0,0),arista(5,1)]),null,'Rechaza atajos/discontinuidades')
const tramo=[ruta(1,0,[arista(0,0),arista(1,1),arista(2,2)])]
a=mapa(.25,.25,1,tramo);b=mapa(1,1,1,tramo)
const primera=prepararTransicion(a,b,cuadroFisico(a)),mitad=primera.cuadro(.5)
assert.equal(mitad.posiciones[1].x,.625)
const siguiente=prepararTransicion(b,mapa(1.5,1.5,1,tramo),mitad)
assert.equal(siguiente.cuadro(0).posiciones[1].x,.625,'Una nueva lectura conserva exactamente la posición que ya se veía')
assert.equal(siguiente.cuadro(1).posiciones[1].x,1.5)
// El mismo tramo residual debe mantenerse durante una replanificación.
const residual=x=>({id:1,x,y:0,residual:{x,y:0,destinoX:1,destinoY:0,finH:1}})
a=mapa(.25,.25,1,[]);b=mapa(.75,.75,1,[]);a.fisico.vehiculos=[residual(.25)];b.fisico.vehiculos=[residual(.75)];b.plan.id=2
assert.ok(trayectoriaConfirmada(a,b,1))
// Prueba del ciclo: lecturas repetidas no reinician; desmontar cancela el RAF.
let refs=[],cursor=0,deps,unmount,state,now=0,frames=new Map(),seq=0
const react={useRef:v=>refs[cursor++]??(refs[cursor-1]={current:v}),useState:()=>[state,v=>state=v],useEffect:f=>{unmount??=f()},useLayoutEffect:(f,d)=>{if(!deps||d.some((v,i)=>!Object.is(v,deps[i]))){deps=d;f()}}}
const original=Module._load;Module._load=function(id,...args){return id==='react'?react:original.call(this,id,...args)}
global.document={visibilityState:'visible',addEventListener(){},removeEventListener(){}}
global.window={matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})}
global.performance={now:()=>now};global.requestAnimationFrame=f=>{frames.set(++seq,f);return seq};global.cancelAnimationFrame=id=>frames.delete(id)
const {useCuadroMovimiento}=require('../lib/operacion/useMovimiento.ts');Module._load=original
const render=m=>{cursor=0;useCuadroMovimiento(m,true)}
const cuadro=t=>{now=t;const pendientes=[...frames.values()];frames.clear();pendientes.forEach(f=>f(t))}
render(mapa(0,0,1,tramo));now=60000;render(mapa(1,1,1,tramo));cuadro(60000);cuadro(90000)
assert.equal(state.posiciones[1].x,.5)
const pendientes=frames.size;render(mapa(1,1,2,tramo));assert.equal(frames.size,pendientes)
cuadro(105000);assert.equal(state.posiciones[1].x,.75)
unmount();assert.equal(frames.size,0)
console.log('Movimiento: llegadas, esperas, viajes consecutivos, replanificación residual, continuidad interrumpida y desmontaje correctos')

const {resumenGlobal}=require('../lib/operacion/mejorasV9.ts')
const fisico={fisico:{vehiculos:[{carga:3,capacidad:8},{carga:2,capacidad:4}],almacenes:[]}}
assert.ok(Math.abs(resumenGlobal(fisico,null).ocupacion-5/12*100)<1e-10,'Conserva el agregado del mapa aunque no lleguen las fichas')
assert.equal(resumenGlobal(fisico,{unidades:[{carga:0,capacidad:1}]}).capacidad,12,'No mezcla cifras físicas con fichas de otro corte')
