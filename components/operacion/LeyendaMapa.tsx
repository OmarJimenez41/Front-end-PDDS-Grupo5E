 'use client'
import {useContext,useRef,useState,type ReactNode} from 'react'
import {MapPin,Warehouse,Car,Motorbike,Bike,Package,Route,Wrench,Layers,X,ChevronUp,Info} from 'lucide-react'
import {useV9} from './ContextoV9'
import {UmbralesCtx} from './umbrales'

function Bloque({titulo,icono,children}:{titulo:string;icono:ReactNode;children:ReactNode}){
 return <section className="leyenda-bloque"><h3>{icono}{titulo}</h3>{children}</section>
}
function Nivel({color,nombre,rango}:{color:string;nombre:string;rango:string}){
 return <div className="leyenda-nivel"><i style={{background:color}} aria-hidden="true"/><span>{nombre}</span><b>{rango}</b></div>
}
export function LeyendaMapa({full,real,incident,averia=false,collapse,buscado}:{full:boolean;real:boolean;incident:boolean;averia?:boolean;collapse:boolean;buscado:boolean}){
 const u=useContext(UmbralesCtx),ctx=useV9(),[abierta,setAbierta]=useState(false),abrir=useRef<HTMLButtonElement>(null)
 const cerrar=()=>{setAbierta(false);requestAnimationFrame(()=>abrir.current?.focus())}
 if(!abierta)return <button ref={abrir} type="button" className="leyenda-mapa leyenda-abrir" aria-label="Ver leyenda" aria-expanded={false} aria-controls="leyenda-operativa" onClick={()=>setAbierta(true)}><Layers className="size-4"/><span>Leyenda</span><ChevronUp className="size-3.5"/></button>
 return <section id="leyenda-operativa" aria-label="Leyenda del mapa" className="leyenda-mapa leyenda-panel" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();cerrar()}}}>
  <header className="leyenda-cabecera"><div className="leyenda-emblema"><Layers className="size-5"/></div><div><h2>Leyenda del mapa</h2><p>Identifica cada elemento de la operación.</p></div><button type="button" autoFocus onClick={cerrar} aria-label="Ocultar leyenda" title="Cerrar leyenda"><X className="size-4"/></button></header>
  <div className="leyenda-contenido">
   {full&&<div className="leyenda-escala"><MapPin className="size-4"/><span>Cuadrícula de <b>1 km</b></span><span>70 × 50 km</span><span>Origen (0,0), abajo a la izquierda</span></div>}
   <div className="leyenda-rejilla">
    <Bloque titulo="Almacenes" icono={<Warehouse className="size-4"/>}>
     <div className="leyenda-ejemplo"><span className="simbolo-almacen central"><Warehouse className="size-4"/></span><div><b>Almacén central</b><small>Existencias ilimitadas · ∞</small></div></div>
     <div className="leyenda-ejemplo"><span className="simbolo-almacen intermedio"><Warehouse className="size-4"/></span><div><b>Almacenes intermedios</b><small>El color indica el stock disponible.</small></div></div>
     <div className="leyenda-niveles"><Nivel color="#64748b" nombre="Vacío" rango="0 %"/><Nivel color="#059669" nombre="Disponible" rango={`≥ ${u.stock.verde} %`}/><Nivel color="#d97706" nombre="Stock intermedio" rango={`${u.stock.rojo} a < ${u.stock.verde} %`}/><Nivel color="#dc2626" nombre="Stock bajo" rango={`> 0 a < ${u.stock.rojo} %`}/></div>
     {real&&<p className="leyenda-nota">“Vehículos en base” indica las unidades estacionadas, sin ruta.</p>}
    </Bloque>
    <Bloque titulo="Vehículos · ocupación" icono={<Car className="size-4"/>}>
     <div className="leyenda-tipos"><span><Car/>Auto</span><span><Motorbike/>Moto</span><span><Bike/>Bicicleta</span></div>
     <p className="leyenda-texto">La figura identifica el tipo de unidad; su color indica la carga.</p>
     <div className="leyenda-niveles"><Nivel color="#64748b" nombre="Vacío" rango="0 %"/><Nivel color="#059669" nombre="Ocupación baja" rango={`> 0 a < ${ctx.limites.verde} %`}/><Nivel color="#d97706" nombre="Ocupación media" rango={`${ctx.limites.verde} a < ${ctx.limites.rojo} %`}/><Nivel color="#dc2626" nombre="Ocupación alta" rango={`≥ ${ctx.limites.rojo} %`}/></div>
     <p className="leyenda-nota">Pasa el cursor o selecciona una unidad para consultar su código y carga.</p>
    </Bloque>
    <Bloque titulo="Rutas y recorridos" icono={<Route className="size-4"/>}>
     <p className="leyenda-texto">El color de la línea identifica el tipo de vehículo.</p>
     <div className="leyenda-lineas"><div><i style={{borderColor:'#2563eb'}}/><Car className="size-3.5"/><span>Auto</span></div><div><i style={{borderColor:'#7c3aed'}}/><Motorbike className="size-3.5"/><span>Moto</span></div><div><i style={{borderColor:'#0f9f8d'}}/><Bike className="size-3.5"/><span>Bicicleta</span></div><div><i className="recorrido"/><span>Tramo ya recorrido</span></div><div><i className="pendiente"/><span>Plan pendiente de actualización</span></div></div>
     <p className="leyenda-nota">La ruta seleccionada se destaca; las demás quedan atenuadas.{ctx.rutasConsulta.length>0?' Las rutas consultadas pueden pertenecer a planes anteriores.':''}</p>
    </Bloque>
    <Bloque titulo="Pedidos · margen de entrega" icono={<Package className="size-4"/>}>
     <p className="leyenda-texto">Margen = fecha límite − llegada estimada.</p>
     <div className="leyenda-niveles"><Nivel color="#059669" nombre="Holgado" rango={`≥ ${u.pedido.verde} h`}/><Nivel color="#d97706" nombre="Justo" rango={`${u.pedido.rojo} a < ${u.pedido.verde} h`}/><Nivel color="#dc2626" nombre="Crítico" rango={`< ${u.pedido.rojo} h`}/></div>
     {buscado&&<div className="leyenda-ejemplo"><span className="simbolo-seleccion"/><span>Pedido seleccionado</span></div>}
     <p className="leyenda-nota">Los puntos indican destinos. El código aparece al consultarlos.</p>
    </Bloque>
   </div>
   <section className="leyenda-incidencias"><h3><Wrench className="size-4"/>Incidencias</h3><div className="leyenda-eventos"><span><i className="simbolo-bloqueo"/>Tramo bloqueado</span><span><b className="averia-uno">A1</b>Avería tipo 1</span><span><b className="averia-dos">A2</b>Avería tipo 2</span><span><b className="averia-tres">A3</b>Avería tipo 3</span>{collapse&&<span><i className="punto-colapso"/>Pedido del colapso</span>}</div>{!incident&&!averia&&<p className="leyenda-nota">Estos símbolos aparecen cuando existe una incidencia.</p>}</section>
  </div>
  <footer className="leyenda-pie"><Info className="size-3.5"/><span>Los rangos reflejan la configuración actual de este navegador.</span><kbd>Esc</kbd></footer>
 </section>
}
