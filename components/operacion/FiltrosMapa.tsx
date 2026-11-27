'use client'
import {useRef,useState} from 'react'
import {Car,Motorbike,Bike,SlidersHorizontal,X,RotateCcw,GripVertical} from 'lucide-react'
import {useV9} from './ContextoV9'
import {filtrosIniciales,type FiltrosV9} from '../../lib/operacion/mejorasV9'
export function FiltrosMapa({onCerrar,editable}:{onCerrar:()=>void;editable:boolean}){
 const ctx=useV9(),f=ctx.filtros,[verde,setVerde]=useState(String(ctx.limites.verde)),[rojo,setRojo]=useState(String(ctx.limites.rojo)),[error,setError]=useState('')
 const cambiar=(k:keyof FiltrosV9,v:string)=>ctx.setFiltros({...f,[k]:v})
 const activos=Object.entries(f).filter(([k,v])=>v!=null&&v!==''&&v!=='todos'&&v!==(filtrosIniciales as unknown as Record<string,string>)[k]).length
 const aplicar=()=>{const v=Number(verde),r=Number(rojo);if(!Number.isFinite(v)||!Number.isFinite(r)||v<=0||v>=r||r>100){setError('Usa valores entre 0 y 100, de menor a mayor.');return}ctx.setLimites({verde:v,rojo:r});setError('Colores actualizados.')}
 return <section id="filtros-v9" className="panel-filtros-amigable" aria-label="Filtros del mapa"><header><div><h2><SlidersHorizontal className="size-4"/>Filtrar mapa</h2><p>{activos?`${activos} ${activos===1?'filtro activo':'filtros activos'}`:'Mostrando todo'}</p></div><button type="button" onClick={onCerrar} aria-label="Cerrar filtros"><X className="size-4"/></button></header>
 <label className="campo-filtro">Almacén de origen<select value={f.almacen??'todos'} onChange={e=>cambiar('almacen',e.target.value)}><option value="todos">Todos los almacenes</option>{ctx.mapa?.fisico?.almacenes.map(a=><option key={a.codigo} value={a.codigo}>{a.codigo}</option>)}</select></label>
 <details className="filtros-avanzados"><summary>Más opciones</summary><label className="campo-filtro">Distancia al próximo destino<select value={f.distancia} onChange={e=>cambiar('distancia',e.target.value)}>{[['todos','Cualquier distancia'],['0:10','Menos de 10 km'],['10:20','De 10 a 20 km'],['20:40','De 20 a 40 km'],['40:200','De 40 a 200 km'],['200:Infinity','200 km o más']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label><label className="campo-filtro">Stock de almacenes<select value={f.luzAlmacen} onChange={e=>cambiar('luzAlmacen',e.target.value)}>{[['todos','Todas'],['vacío','Sin stock'],['verde','Disponibles'],['ámbar','Nivel intermedio'],['rojo','Nivel bajo'],['no disponible','Sin información']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
 {editable&&<details><summary>Personalizar colores</summary><div className="umbrales-filtro"><label>Baja hasta (%)<input type="number" min="1" max="99" value={verde} onChange={e=>setVerde(e.target.value)}/></label><label>Alta desde (%)<input type="number" min="2" max="100" value={rojo} onChange={e=>setRojo(e.target.value)}/></label><button type="button" onClick={aplicar}>Aplicar</button></div><p role="status">{error}</p></details>}</details>
 <footer><button type="button" onClick={()=>ctx.setFiltros({...filtrosIniciales})}><RotateCcw className="size-3.5"/>Restablecer</button><span>Se aplica al mapa y las listas</span></footer></section>
}

/** Filtros rápidos como botonera compacta y flotante (JP 26/11): solo íconos y colores, se arrastra desde el asa. */
export function FiltrosRapidosMapa(){
 const ctx = useV9(), f = ctx.filtros
 const [visible,setVisible]=useState(true),[pos,setPos]=useState({x:0,y:0}),arrastre=useRef<{x:number;y:number;px:number;py:number}|null>(null)
 const cambiar = (k: keyof FiltrosV9, v: string) => ctx.setFiltros({...f, [k]: v})
 if(!visible)return <button type="button" className="filtros-rapidos-mapa filtros-rapidos-abrir" aria-label="Mostrar filtros rápidos" title="Mostrar filtros rápidos" aria-expanded={false} onClick={()=>setVisible(true)}><SlidersHorizontal className="size-4"/></button>
 const tipos=[['todos','Todos los vehículos',null],['AUTO','Autos',Car],['MOTO','Motos',Motorbike],['BICICLETA','Bicicletas',Bike]] as const
 const ocupacion=[['todos','Todas las ocupaciones','∗',''],['vacío','Sin carga (0 %)','V','#64748b'],['verde',`Baja: menos de ${ctx.limites.verde} %`,'B','#059669'],['ámbar',`Media: ${ctx.limites.verde} % a menos de ${ctx.limites.rojo} %`,'M','#d97706'],['rojo',`Alta: desde ${ctx.limites.rojo} %`,'A','#dc2626']] as const
 return <section className="filtros-rapidos-mapa filtros-botonera" aria-label="Filtros rápidos del mapa" style={{transform:`translate(${pos.x}px,${pos.y}px)`}} onPointerDown={e=>e.stopPropagation()}>
 <button type="button" className="filtros-asa" aria-label="Mover filtros" title="Arrastra para mover" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);arrastre.current={x:e.clientX,y:e.clientY,px:pos.x,py:pos.y}}} onPointerMove={e=>{const a=arrastre.current;if(a)setPos({x:a.px+e.clientX-a.x,y:a.py+e.clientY-a.y})}} onPointerUp={()=>{arrastre.current=null}}><GripVertical className="size-3.5"/></button>
 <div className="opciones-filtro" role="group" aria-label="Tipo de vehículo">{tipos.map(([v,t,Icono])=><button key={v} type="button" title={t} aria-label={t} aria-pressed={f.tipo===v} onClick={()=>cambiar('tipo',v)}>{Icono?<Icono className="size-4"/>:'Todo'}</button>)}</div>
 <span className="filtros-separador" aria-hidden="true"/>
 <div className="opciones-filtro" role="group" aria-label="Ocupación">{ocupacion.map(([v,t,letra,color])=><button key={v} type="button" title={t} aria-label={t} aria-pressed={f.luzUnidad===v} onClick={()=>cambiar('luzUnidad',v)} style={color?{color,borderColor:color}:undefined}><b>{letra}</b></button>)}</div>
 <span className="filtros-separador" aria-hidden="true"/>
 <button type="button" title="Restablecer filtros" aria-label="Restablecer filtros" onClick={() => ctx.setFiltros({...filtrosIniciales})}><RotateCcw className="size-3.5"/></button>
 <button type="button" title="Ocultar filtros rápidos" aria-label="Cerrar filtros rápidos" onClick={()=>setVisible(false)}><X className="size-3.5"/></button>
 </section>
}
