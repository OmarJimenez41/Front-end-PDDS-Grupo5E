'use client'
import {PanelTrabajoV9} from './PanelTrabajoV9'
import {useMemo,useState} from 'react'
import type {Incidencia,UnidadOperativa} from '../../lib/api/operacion'
import type {EstadoDetalle} from '../../lib/operacion/lectura'
import {luzOcupacion,claseLuz,estadoEnEspanol,metricasUnidad,unidadCumple,type MetricasUnidad} from '../../lib/operacion/mejorasV9'
import {useV9} from './ContextoV9'
import {Car,Motorbike,Bike,Warehouse,Navigation,PackageCheck,Clock3,Wrench,Ban,Flag,type LucideIcon} from 'lucide-react'
import type {EstadoUnidad,TipoVehiculo} from '../../lib/api/operacion'

// Íconos para que cada unidad ocupe una sola línea (JP 26/11): tipo, estado y distancia sin texto largo.
const ICONO_TIPO:Record<TipoVehiculo,LucideIcon>={AUTO:Car,MOTO:Motorbike,BICICLETA:Bike}
const ICONO_ESTADO:Record<EstadoUnidad,LucideIcon>={EN_BASE:Warehouse,PROGRAMADA:Clock3,EN_RUTA:Navigation,EN_SERVICIO:PackageCheck,AVERIADA:Wrench,EN_MANTENIMIENTO:Wrench,NO_DISPONIBLE:Ban}

type Extendida=UnidadOperativa&Partial<MetricasUnidad>
type Orden='ocupacionPct'|'salidaH'|'llegadaH'|'llegadaDestinoH'|'destinoKm'|'origenKm'|'recorridoKm'|'destinoMin'|'origenMin'
export function ordenarUnidades<T extends Extendida>(unidades:T[],campo:Orden,ascendente:boolean):T[] {
 return [...unidades].sort((a,b)=>{const x=a[campo],y=b[campo];return x==null||y==null?x==null&&y==null?a.codigo.localeCompare(b.codigo):x==null?1:-1:(x-y)*(ascendente?1:-1)||a.codigo.localeCompare(b.codigo)})
}
export const ocupacion=luzOcupacion
export function flotaOficial(unidades:UnidadOperativa[]){return unidades.length===37&&(['AUTO','MOTO','BICICLETA'] as const).every((tipo,i)=>unidades.filter(u=>u.tipo===tipo).length===[10,15,12][i])}
const numero=new Intl.NumberFormat('es-PE',{maximumFractionDigits:1})
const cantidadConUnidad=(valor:number|null|undefined,unidad:string)=>valor==null?'No disponible':`${numero.format(valor)} ${unidad}`

const trayecto=(km:number|null|undefined,min:number|null|undefined)=>[km==null?null:cantidadConUnidad(km,'km'),min==null?null:cantidadConUnidad(min,'min')].filter(Boolean).join(' · ')||'No disponible'

export function PanelFlota({unidades,detalle,hora,seleccion,onSeleccion,incidencias,onPedido}:{unidades:UnidadOperativa[]|null;detalle:EstadoDetalle;hora:(h:number)=>string;seleccion:number|null;onSeleccion:(id:number|null)=>void;incidencias:Incidencia[];onPedido:(codigo:string)=>void}){
 const ctx=useV9(),[campo,setCampo]=useState<Orden>('ocupacionPct'),[ascendente,setAscendente]=useState(true)
 const busqueda=ctx.filtros.codigo??'',medida=ctx.filtros.medida??'destinoKm',minimo=ctx.filtros.minimo??'',maximo=ctx.filtros.maximo??''
 const setBusqueda=(codigo:string)=>ctx.setFiltros({...ctx.filtros,codigo})
 const setMedida=(medida:'destinoKm'|'origenKm'|'destinoMin'|'origenMin')=>ctx.setFiltros({...ctx.filtros,medida})
 const setMinimo=(minimo:string)=>ctx.setFiltros({...ctx.filtros,minimo})
 const setMaximo=(maximo:string)=>ctx.setFiltros({...ctx.filtros,maximo})
 const lista=useMemo(()=>ordenarUnidades((unidades??[]).filter(u=>u.codigo.toLowerCase().includes(busqueda.trim().toLowerCase())&&unidadCumple(u,ctx.filtros,ctx.mapa,ctx.limites)).map(u=>({...u,...metricasUnidad(u,ctx.mapa)})).filter(u=>{
  if(minimo===''&&maximo==='')return true;const valor=u[medida];return valor!=null&&(minimo===''||valor>=Number(minimo))&&(maximo===''||valor<=Number(maximo))
 }),campo,ascendente),[unidades,busqueda,ctx,medida,minimo,maximo,campo,ascendente])
 const ficha=unidades?.find(u=>u.id===seleccion),metricas=ficha?metricasUnidad(ficha,ctx.mapa):null
 const valorOrden=(u:Extendida)=>{const v=u[campo];return v==null?'No disponible':campo.endsWith('H')?hora(v):cantidadConUnidad(v,campo==='ocupacionPct'?'%':campo.endsWith('Min')?'min':'km')}
 const opciones:[Orden,string][]=[['ocupacionPct','Ocupación'],['salidaH','Salida del origen'],['llegadaDestinoH','Llegada al próximo destino'],['llegadaH','Retorno de ruta'],['destinoKm','Km hasta destino'],['origenKm','Km desde origen'],['recorridoKm','Km recorridos acumulados'],['destinoMin','Min hasta destino'],['origenMin','Min desde salida']]
 const rangoActivo=minimo!==''||maximo!==''
 const limpiarBusqueda=()=>ctx.setFiltros({...ctx.filtros,codigo:'',minimo:'',maximo:'',destino:'todos'})
 if(ctx.panelActivo!=='flota')return null
 return <PanelTrabajoV9 className="panel-flota" titulo={`Flota operativa (${unidades?.length??0})`} descripcion="Ocupación, trayectos y productos de cada unidad." onCerrar={()=>onSeleccion(null)}>
  <div className="flota-contenido">
   {detalle!=='actual'&&<p role="status" className="flota-aviso">Detalle {detalle==='pendiente'?'pendiente de sincronización':'desactualizado'}. Los filtros conservan el último dato recibido.</p>}
   {unidades&&!flotaOficial(unidades)&&<p className="flota-aviso">Composición distinta de la flota oficial 37 (10 autos, 15 motos, 12 bicicletas).</p>}
   {ctx.mapa?.plan&&!ctx.mapa.aplicable&&<p className="flota-aviso">Ruta en actualización. Posición y carga confirmadas.</p>}
   <div className="flota-filtros-principales">
    <label>Unidad<input aria-label="Buscar unidad por código" placeholder="TA01" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></label>
    <label>Destino<select aria-label="Filtrar UT por destino" value={ctx.filtros.destino??'todos'} onChange={e=>ctx.setFiltros({...ctx.filtros,destino:e.target.value})}><option value="todos">Todos</option>{[...new Set((unidades??[]).flatMap(u=>u.destino?[u.destino.codigo]:[]))].sort().map(c=><option key={c}>{c}</option>)}</select></label>
   </div>
   <details className="filtros-avanzados"><summary>Filtrar por distancia o tiempo</summary>
    <div className="flota-rango"><label className="flota-magnitud">Magnitud<select value={medida} onChange={e=>setMedida(e.target.value as typeof medida)}>{opciones.filter(x=>['destinoKm','origenKm','destinoMin','origenMin'].includes(x[0])).map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label><label>Mínimo<input type="number" min="0" value={minimo} onChange={e=>setMinimo(e.target.value)}/></label><label>Máximo<input type="number" min="0" value={maximo} onChange={e=>setMaximo(e.target.value)}/></label></div>
    {(Number(minimo)<0||Number(maximo)<0||(minimo!==''&&maximo!==''&&Number(minimo)>Number(maximo)))&&<p role="alert" className="text-red-700">Rango inválido: usa valores positivos y mínimo ≤ máximo.</p>}
   </details>
   <div className="flota-orden"><label>Ordenar<select value={campo} onChange={e=>setCampo(e.target.value as Orden)}>{opciones.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label><span className="orden-flechas"><button type="button" aria-label="Orden ascendente" title="Ascendente" aria-pressed={ascendente} onClick={()=>setAscendente(true)}>↑</button><button type="button" aria-label="Orden descendente" title="Descendente" aria-pressed={!ascendente} onClick={()=>setAscendente(false)}>↓</button></span></div>
   <div className="flota-resultados"><p role="status">{lista.length} de {unidades?.length??0} unidades</p><button className="flota-limpiar" onClick={limpiarBusqueda}>Limpiar</button></div>
   {rangoActivo&&<p className="flota-nota">{unidades?.filter(u=>metricasUnidad(u,ctx.mapa)[medida]==null).length??0} unidades sin esta métrica; quedan fuera del rango.</p>}
   <details open className="flota-listado-desplegable"><summary>Ver unidades ({lista.length})</summary><ul className="flota-lista" aria-label="Unidades de la flota">{lista.map(u=><li key={u.id}><button aria-pressed={u.id===seleccion} className="flota-unidad" onClick={()=>onSeleccion(u.id)}>
    {(()=>{const T=ICONO_TIPO[u.tipo]??Car,E=ICONO_ESTADO[u.estado]??Ban,v=u[medida],unidad=medida.endsWith('Min')?'min':'km',nombreMedida=opciones.find(o=>o[0]===medida)?.[1]??'';return <span className="flota-fila">
     <T className="flota-icono" aria-label={estadoEnEspanol(u.tipo)}><title>{estadoEnEspanol(u.tipo)}</title></T>
     <strong>{u.codigo}</strong>
     <E className="flota-icono flota-estado" aria-label={estadoEnEspanol(u.estado)}><title>{estadoEnEspanol(u.estado)}</title></E>
     <span className="flota-distancia" title={nombreMedida}><Flag className="flota-icono" aria-hidden="true"/>{v==null?'—':`${numero.format(v)} ${unidad}`}</span>
     {campo!=='ocupacionPct'&&campo!==medida&&<span className="flota-unidad-orden" title={opciones.find(o=>o[0]===campo)?.[1]}>{valorOrden(u)}</span>}
     <b className={`flota-pct ${claseLuz[luzOcupacion(u.ocupacionPct,u.capacidad,ctx.limites)]}`} title="Ocupación">{u.ocupacionPct==null?'—':`${numero.format(u.ocupacionPct)} %`}</b>
    </span>})()}
</button></li>)}</ul>
   {lista.length===0&&<p className="flota-vacia">{unidades?'No hay unidades que coincidan con los filtros.':'Cargando flota…'}</p>}</details>
   {ficha&&<section className="flota-ficha" aria-label={`Detalle de ${ficha.codigo}`}>
    <h3>{ficha.codigo} · {estadoEnEspanol(ficha.tipo)}</h3><p>{estadoEnEspanol(ficha.estado)} · {numero.format(ficha.carga)} / {numero.format(ficha.capacidad)} unidades</p>
    <dl className="flota-ficha-datos"><div><dt>Ocupación</dt><dd className={claseLuz[luzOcupacion(ficha.ocupacionPct,ficha.capacidad,ctx.limites)]}>{cantidadConUnidad(ficha.ocupacionPct,'%')}</dd></div><div><dt>Origen</dt><dd>{ficha.origen?.codigo??'Sin asignación'}</dd></div><div><dt>Destino</dt><dd>{ficha.destino?.codigo??'Sin asignación'}</dd></div><div><dt>Salida</dt><dd>{ficha.salidaH==null?'No disponible':hora(ficha.salidaH)}</dd></div><div><dt>Próxima llegada</dt><dd>{metricas?.llegadaDestinoH==null?'No disponible':hora(metricas.llegadaDestinoH)}</dd></div><div><dt>Retorno</dt><dd>{ficha.llegadaH==null?'No disponible':hora(ficha.llegadaH)}</dd></div><div><dt>Hasta destino</dt><dd>{trayecto(metricas?.destinoKm,metricas?.destinoMin)}</dd></div><div><dt>Desde salida</dt><dd>{trayecto(metricas?.origenKm,metricas?.origenMin)}</dd></div><div><dt>Recorrido acumulado</dt><dd>{cantidadConUnidad(ficha.recorridoKm,'km')}</dd></div></dl>
    <button className="flota-ver-envios" onClick={()=>{ctx.setConsultaEnvios({vehiculoId:ficha.id});ctx.setPanelActivo('envios')}}>Ver envíos y productos de esta unidad</button>
    <h4>{ficha.estado==='PROGRAMADA'?'Pedidos programados':'Pedidos y parciales asociados'}</h4>{ficha.pedidos.length===0&&<p>Sin pedidos asociados.</p>}{ficha.pedidos.map((p,i)=><p key={`${p.id}-${i}`}><button className="text-blue-700 underline" onClick={()=>onPedido(p.codigo)}>{p.codigo}</button> · {numero.format(p.cantidad)} unidades · ETA {p.etaH==null?'Sin asignación':hora(p.etaH)}</p>)}
    {ficha.averia&&<p>Avería tipo {ficha.averia.tipo} desde {hora(ficha.averia.desdeH)} hasta {ficha.averia.hastaH==null?'Sin fin':hora(ficha.averia.hastaH)}</p>}{incidencias.filter(i=>i.tipo==='MANTENIMIENTO'&&i.vehiculoId===ficha.id).map(i=><p key={i.id}>Mantenimiento desde {hora(i.instanteH)} hasta {i.finH==null?'Sin fin':hora(i.finH)}</p>)}
   </section>}
   {seleccion!=null&&unidades&&!ficha&&<p>La unidad seleccionada ya no está disponible.</p>}
  </div>
 </PanelTrabajoV9>
}
