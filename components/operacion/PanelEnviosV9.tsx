'use client'
import {PanelTrabajoV9} from './PanelTrabajoV9'
import {useEffect,useState,useRef} from 'react'
import type {InstantaneaOperacion,Pedido,UnidadesOperacion} from '../../lib/api/operacion'
import {pedir} from '../../lib/api/simulacion'
import {useV9} from './ContextoV9'
import {luzStock,claseLuz} from '../../lib/operacion/mejorasV9'
import {useContext} from 'react'
import {UmbralesCtx} from './umbrales'
export function entregasRecientes(pedidos:Pedido[],relojH?:number,ventanaH=4){return pedidos.filter(p=>p.estado==='ENTREGADO'&&p.entregadoEnH!=null&&(relojH==null||(p.entregadoEnH>=relojH-ventanaH&&p.entregadoEnH<=relojH))).sort((a,b)=>b.entregadoEnH!-a.entregadoEnH!||a.codigo.localeCompare(b.codigo)||a.id-b.id)}
export function clasificarEnvios(mapa:InstantaneaOperacion|null){const rutas=mapa?.aplicable?mapa.plan?.rutas??[]:[],reloj=mapa?.relojH??0;const asignados=new Set(rutas.flatMap(r=>r.paradas.map(p=>p.pedidoId)));for(const s of mapa?.fisico?.servicios??[])if(!s.confirmada)asignados.add(s.pedidoId);return{futuras:rutas.filter(r=>r.horaInicioH>reloj).sort((a,b)=>a.horaInicioH-b.horaInicioH||a.id-b.id),enRuta:rutas.filter(r=>r.horaInicioH<=reloj&&r.horaFinH>reloj),sinAsignar:mapa?.pedidos.filter(p=>!asignados.has(p.id))??[]}}
import {filtrarEnvios,filtrarPedidosCompletos,contieneProducto,paginaProductos,type CorteEnvios,type EnvioDetalle,type VistaEnvios} from '../../lib/operacion/enviosDetalle'

function ProductosDelEnvio({envio,onElegir}:{envio:EnvioDetalle;onElegir:(codigo:string)=>void}){
 const [pagina,setPagina]=useState(0),paginas=Math.max(1,Math.ceil(envio.cantidad/30)),actual=Math.min(pagina,paginas-1)
 return <div className="mt-2"><div className="flex flex-wrap gap-1">{paginaProductos(envio.productos,actual).map(c=><button key={c} aria-label={`Ver ruta del producto ${c}`} className="rounded border border-blue-200 bg-white px-2 py-1 text-blue-700" onClick={()=>onElegir(c)}>{c}</button>)}</div><div className="mt-2 flex items-center justify-between"><button disabled={actual===0} className="rounded border px-2 py-1 disabled:opacity-40" onClick={()=>setPagina(actual-1)}>Anterior</button><span>Página {actual+1} de {paginas}</span><button disabled={actual+1>=paginas} className="rounded border px-2 py-1 disabled:opacity-40" onClick={()=>setPagina(actual+1)}>Siguiente</button></div></div>
}

export function PanelEnvios({mapa,unidades,historial,estadoHistorial,estadoMapa,hora,onPedido,onUnidad,onAlmacen}:{mapa:InstantaneaOperacion|null;unidades:UnidadesOperacion|null;historial:Pedido[]|null;estadoHistorial:'cargando'|'actual'|'desactualizado'|'error';estadoMapa:'cargando'|'actual'|'desactualizado'|'error';hora:(h:number)=>string;onPedido:(codigo:string)=>void;onUnidad:(id:number)=>void;onAlmacen?:(codigo:string)=>void}){
 const [ventana,setVentana]=useState(4),[vista,setVista]=useState<VistaEnvios>('transito'),[modo,setModo]=useState<'pedidos'|'envios'|'productos'>('envios'),[datos,setDatos]=useState<CorteEnvios|null>(null),[error,setError]=useState(''),[busqueda,setBusqueda]=useState(''),[producto,setProducto]=useState(''),[pedidoElegido,setPedidoElegido]=useState<number|null>(null)
 const ctx=useV9(),u=useContext(UmbralesCtx),id=mapa?.escenarioId,almacen=ctx.filtros.almacen??'todos'
 useEffect(()=>{if(ctx.consultaEnvios){setVista('todos');setModo('productos');setBusqueda('')}},[ctx.consultaEnvios])
 const abierto=ctx.panelActivo==='envios',setAbierto=(v:boolean)=>ctx.setPanelActivo(v?'envios':null)
 useEffect(()=>{if(!abierto||id==null)return;let activo=true;const abort=new AbortController();let timer:ReturnType<typeof setTimeout>;const cargar=async()=>{try{const v=await pedir<CorteEnvios>(`/api/escenarios/${id}/envios`,{signal:abort.signal});if(activo&&v.escenarioId===id){setDatos(v);setError('')}}catch(e){if(activo)setError(String(e))}if(activo)timer=setTimeout(cargar,2000)};setDatos(null);void cargar();return()=>{activo=false;abort.abort();clearTimeout(timer)}},[abierto,id])
 useEffect(()=>{setPedidoElegido(null);setProducto('');setBusqueda('')},[id])
 const seleccionar=(e:EnvioDetalle,todas=false)=>{onPedido(e.codigoPedido);setPedidoElegido(e.pedidoId);const rutas=(todas?datos?.envios.filter(v=>v.pedidoId===e.pedidoId)??[]:[e]).map(v=>v.ruta);ctx.setRutasConsulta([...new Map(rutas.map(r=>[r.id,r])).values()]);ctx.setRutaProducto(todas?null:e.rutaId);if(!todas)onUnidad(e.vehiculoId)}
 const buscarProducto=(codigo=producto)=>{const e=datos?.envios.find(e=>e.productos.some(p=>contieneProducto(p,codigo)));if(e){seleccionar(e);setError('')}else setError('Producto sin asignación registrada en este escenario. Usa el formato Ppedido-ordinal.')}
 const corte=datos?.relojH??mapa?.relojH??0
 const envios=(modo==='pedidos'?filtrarPedidosCompletos:filtrarEnvios)(datos?.envios??[],vista,corte,ventana,almacen).filter(e=>!ctx.consultaEnvios||(e.vehiculoId===ctx.consultaEnvios.vehiculoId&&e.estado!=='ENTREGADO')).filter(e=>{const q=busqueda.trim().toLowerCase();return !q||e.codigoPedido.toLowerCase().includes(q)||e.productos.some(p=>contieneProducto(p,q))})
 const almacenes=(mapa?.fisico?.almacenes??[]).filter(a=>(almacen==='todos'||a.codigo===almacen)&&(ctx.filtros.luzAlmacen==='todos'||luzStock(a.central?null:a.capacidad&&a.stock!=null?100*a.stock/a.capacidad:null,u.stock)===ctx.filtros.luzAlmacen))
 const estados:Record<string,string>={ENTREGADO:'Entregado',EN_SERVICIO:'En entrega',EN_TRANSITO:'En tránsito',POR_SALIR:'Por salir',PENDIENTE_REPLANIFICACION:'Pendiente de replanificar'}
 if(!abierto)return null
 return <PanelTrabajoV9 className="panel-envios" titulo={'Envíos, productos y almacenes'} descripcion="Seguimiento de pedidos, parciales y movimientos.">
<p className="text-slate-500">Corte: {hora(corte)}</p><p role="status" className="text-amber-900">{error}</p>
 {datos&&!datos.planAplicable&&<p className="my-1 rounded bg-amber-50 px-2 py-1 text-amber-900">Plan en actualización: se distinguen asignaciones previstas de entregas confirmadas.</p>}
 {ctx.consultaEnvios&&<p className="mt-1 rounded bg-blue-50 px-2 py-1 text-blue-800">Pendientes de {unidades?.unidades.find(u=>u.id===ctx.consultaEnvios?.vehiculoId)?.codigo??`UT ${ctx.consultaEnvios.vehiculoId}`} · <button className="underline" onClick={()=>ctx.setConsultaEnvios(null)}>Ver todas</button></p>}
 {/* Filtros compactos (JP 26/11): menos desplegables y todo a la vista */}
 <div className="filtros-compactos mt-2"><label>Buscar<input aria-label="Filtrar pedido o producto" placeholder="Pedido o P123-1" value={busqueda} onChange={e=>setBusqueda(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&busqueda.trim()){setProducto(busqueda.trim());buscarProducto(busqueda.trim())}}}/></label><button type="button" className="boton-mini" title="Localizar el producto en todos los movimientos, sin importar la ventana" onClick={()=>{if(busqueda.trim()){setProducto(busqueda.trim());buscarProducto(busqueda.trim())}}}>Localizar</button>
 <label>Ver<select aria-label="Mostrar envíos o productos" value={modo} onChange={e=>setModo(e.target.value as typeof modo)}><option value="pedidos">Pedidos</option><option value="envios">Parciales</option><option value="productos">Productos</option></select></label>
 <label>Estado<select aria-label="Ventana de envíos" value={vista} onChange={e=>setVista(e.target.value as VistaEnvios)}><option value="todos">Todos</option><option value="transito">En tránsito</option><option value="salidas">Por salir</option><option value="entregadas">Entregados</option><option value="futuras">A entregar</option></select></label>
 <label title="Horas antes o después del corte">±<input aria-label="Ventana de horas" className="!w-14" type="number" min="0.25" max="48" step="0.25" value={ventana} onChange={e=>{const v=Number(e.target.value);if(v>0&&v<=48)setVentana(v)}}/>h</label>
 <label>Origen<select aria-label="Origen del envío" value={almacen} onChange={e=>{ctx.setFiltros({...ctx.filtros,almacen:e.target.value});if(e.target.value!=='todos')onAlmacen?.(e.target.value)}}><option value="todos">Todos</option>{mapa?.fisico?.almacenes.map(a=><option key={a.codigo}>{a.codigo}</option>)}</select></label></div>
 <p className="envios-resumen">{new Set(envios.map(e=>e.pedidoId)).size} pedidos · {envios.length} parciales · {envios.reduce((s,e)=>s+e.cantidad,0)} productos</p>
 <div className="envios-listado">
 {!envios.length&&<p className="rounded bg-slate-50 p-3 text-slate-500">No hay movimientos que cumplan estos filtros.</p>}
 {envios.map(e=><article key={e.entregaId} className={`envio-fila ${pedidoElegido===e.pedidoId?'envio-elegido':''}`}>
 <div className="envio-linea"><button className="font-bold text-blue-700 underline" onClick={()=>seleccionar(e,true)} aria-label={`Ver todas las rutas del pedido ${e.codigoPedido}`}>{e.codigoPedido}</button><span className="envio-estado">{estados[e.estado]??e.estado}</span><span>{e.cantidad} prod.</span><button className="text-blue-700 underline" onClick={()=>onUnidad(e.vehiculoId)}>{e.codigoVehiculo??`UT ${e.vehiculoId}`}</button><button className="text-blue-700 underline" onClick={()=>seleccionar(e)} aria-label={`Ver ruta ${e.rutaId} del envío ${e.entregaId}`}>Ruta {e.rutaId}</button></div>
 <div className="envio-linea text-slate-600"><span title="Almacén de origen → destino">{e.origenCodigo??'—'} → ({e.destinoX}, {e.destinoY})</span><span title="Salida del almacén → llegada al cliente">{hora(e.salidaH)} → {hora(e.llegadaH)}</span>{e.entregaRealH!=null&&<span title="Entrega confirmada">✓ {hora(e.entregaRealH)}</span>}</div>
 <details open={modo==='productos'}><summary className="cursor-pointer text-slate-500">Productos ({e.cantidad})</summary>{e.productos.map((p,i)=><div key={i} className="mt-1"><button onClick={()=>seleccionar(e)} className="text-left text-blue-700 underline" aria-label={`Ver ruta de productos P${p.pedidoId}-${p.primero} a P${p.pedidoId}-${p.ultimo}`}>P{p.pedidoId}-{p.primero} a P{p.pedidoId}-{p.ultimo}</button><span> · {p.ultimo-p.primero+1}</span></div>)}<ProductosDelEnvio envio={e} onElegir={codigo=>{setProducto(codigo);seleccionar(e)}}/></details>
 </article>)}</div>
 </PanelTrabajoV9>
}
