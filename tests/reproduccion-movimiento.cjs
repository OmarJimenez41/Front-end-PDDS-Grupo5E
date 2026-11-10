const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f)
const {ReproductorMovimiento}=require('../lib/operacion/reproductorMovimiento.ts')
const {prepararTransicion,cuadroFisico}=require('../lib/operacion/transicionMovimiento.ts')
const path=Array.from({length:20},(_,x)=>({x1:x,y1:0,x2:x+1,y2:0,salidaH:x,llegadaH:x+1}))
const map=(h,id=1)=>({escenarioId:id,versionEstado:Math.round(h*100),relojH:h,aplicable:true,plan:{id:1,instanteH:0,rutas:[{id:1,vehiculoId:1,horaInicioH:0,horaFinH:20,trayectoria:path}]},fisico:{vehiculos:[{id:1,x:h,y:0}],servicios:[]}})
let r=new ReproductorMovimiento();r.recibir(map(0),0);r.recibir(map(1),5000);r.leer(7000);const seen=r.actual.posiciones[1].x;r.recibir(map(2),7000);assert.equal(r.actual.posiciones[1].x,seen,'A new packet does not restart or jump the unfinished interval')
assert.equal(r.longitud,2);r.leer(10000);assert.equal(r.actual.posiciones[1].x,1,'The first interval reaches its exact endpoint');r.leer(12000);assert.ok(r.actual.posiciones[1].x>1&&r.actual.posiciones[1].x<2,'A short packet keeps the learned cadence, rather than stopping before a slow next packet')
const before=r.actual.posiciones[1].x;r.recibir(map(3),13000);assert.ok(r.actual.posiciones[1].x>=before&&r.actual.posiciones[1].x<2)
for(let t=13000;t<=23000;t+=16){const q=r.leer(t);assert.ok(q.posiciones[1].x<=3,'Never predicts beyond confirmed data')}
assert.equal(r.pendiente,false);assert.equal(r.actual.posiciones[1].x,3)
r.recibir(map(3),24000);assert.equal(r.longitud,0,'Repeated clock does not create movement')
r.recibir(map(4),26000);r.recibir(map(4),27000,false);assert.equal(r.actual.posiciones[1].x,4);assert.equal(r.pendiente,false,'Pause/reduced motion clears playback')
r.recibir(map(0,2),28000);assert.equal(r.actual.escenarioId,2);assert.equal(r.actual.posiciones[1].x,0);assert.equal(r.longitud,0,'A scenario switch never mixes routes')
r.recibir(map(1,2),30000);r.sincronizar(30500);assert.equal(r.pendiente,false);assert.equal(r.actual.posiciones[1].x,1,'Background tab resumes from current physical facts')
r.recibir(null,31000);assert.equal(r.actual,null)
// A unit without a valid path must not jump ahead of the clock while others interpolate.
const a=map(0),b=map(1);a.fisico.vehiculos.push({id:2,x:0,y:4});b.fisico.vehiculos.push({id:2,x:7,y:4});const tr=prepararTransicion(a,b,cuadroFisico(a));assert.equal(tr.cuadro(0).posiciones[2].x,0);assert.equal(tr.cuadro(.5).posiciones[2].x,0);assert.equal(tr.cuadro(1).posiciones[2].x,7,'Unconfirmed movement is not fabricated')
// Certified stationary services remain stationary throughout playback.
const wait=[{x1:0,y1:0,x2:1,y2:0,salidaH:0,llegadaH:1},{x1:1,y1:0,x2:1,y2:0,salidaH:1,llegadaH:3},{x1:1,y1:0,x2:2,y2:0,salidaH:3,llegadaH:4}]
const wa=map(1),wb=map(3);wb.fisico.vehiculos[0].x=1;for(const m of [wa,wb])m.plan.rutas=[{id:1,vehiculoId:1,horaInicioH:0,horaFinH:4,trayectoria:wait}];r=new ReproductorMovimiento();r.recibir(wa,0);r.recibir(wb,5000);for(let t=5000;t<=10000;t+=100){const p=r.leer(t).posiciones[1];assert.equal(p.x,1,'Does not animate a delivery or wait');assert.equal(p.enMovimiento,false,'A remembered heading does not turn a service into movement')}
console.log('Playback: packet jitter, no restarts, exact endpoints, bounded confirmed motion, services, scenario switch, pause and visibility OK')

// A plan change during queued playback must follow the certified turn, never the diagonal.
const aa=map(0),bb=map(1.5),cc=map(2);const bent=[{x1:0,y1:0,x2:1,y2:0,salidaH:0,llegadaH:1},{x1:1,y1:0,x2:1,y2:1,salidaH:1,llegadaH:2}];
aa.plan.rutas=[{id:1,vehiculoId:1,horaInicioH:0,horaFinH:2,trayectoria:bent}];for(const m of [bb,cc]){m.plan={id:2,instanteH:1,rutas:[{id:2,vehiculoId:1,horaInicioH:1,horaFinH:2,trayectoria:[bent[1]]}]};m.fisico.vehiculos[0]={id:1,x:1,y:m.relojH-1}}
const originales=JSON.stringify([aa,bb,cc]);r=new ReproductorMovimiento();r.recibir(aa,0);r.recibir(bb,4000);r.leer(5000);const punto=r.actual.posiciones[1];r.recibir(cc,5000);assert.deepEqual(r.actual.posiciones[1],punto);for(let t=5000;t<=14000;t+=16){const p=r.leer(t).posiciones[1];assert.ok(p.y===0||Math.abs(p.x-1)<1e-9,'Follows the corner after replanning instead of crossing a blocked grid diagonal')};assert.equal(JSON.stringify([aa,bb,cc]),originales)
console.log('Playback: queued replanning keeps certified turns and immutable physical snapshots')
