import type {RutaPlan} from '../api/operacion'
export interface ProductosEntrega {entregaId:string;pedidoId:number;primero:number;ultimo:number;rutaId:number|null;vehiculoId:number|null}
export interface EnvioDetalle {entregaId:string;pedidoId:number;codigoPedido:string;destinoX:number;destinoY:number;rutaId:number;vehiculoId:number;codigoVehiculo:string|null;origenId:number|null;origenCodigo:string|null;salidaH:number;llegadaH:number;retornoH:number;entregaRealH:number|null;estado:string;cantidad:number;productos:ProductosEntrega[];ruta:RutaPlan;estadoPedido:string;pedidoEntregadoEnH:number|null;cantidadPedido:number}
export interface CorteEnvios {escenarioId:number;versionEstado:number;relojH:number;planAplicable:boolean;envios:EnvioDetalle[]}
export type VistaEnvios='todos'|'transito'|'salidas'|'entregadas'|'futuras'
export function filtrarEnvios(envios:EnvioDetalle[],vista:VistaEnvios,reloj:number,horas:number,origen='todos') {
 return envios.filter(e=>(origen==='todos'||e.origenCodigo===origen)&&(
  vista==='todos'||vista==='entregadas'?(vista==='todos'||(e.estado==='ENTREGADO'&&e.entregaRealH!=null&&e.entregaRealH>=reloj-horas&&e.entregaRealH<=reloj)):
  vista==='transito'?['EN_TRANSITO','EN_SERVICIO'].includes(e.estado):
  vista==='salidas'?e.estado==='POR_SALIR'&&e.salidaH>reloj&&e.salidaH<=reloj+horas:
  e.estado!=='ENTREGADO'&&e.estado!=='PENDIENTE_REPLANIFICACION'&&e.llegadaH>=reloj&&e.llegadaH<=reloj+horas))
}
export const contieneProducto=(p:ProductosEntrega,codigo:string)=>{
 const m=/^P(\d+)-(\d+)$/i.exec(codigo.trim())
 return !!m&&p.pedidoId===Number(m[1])&&p.primero<=Number(m[2])&&Number(m[2])<=p.ultimo
}
export function paginaProductos(rangos:ProductosEntrega[],pagina:number,tamano=30){
 const inicio=Math.max(0,pagina)*tamano,fin=inicio+tamano,ids:string[]=[];let base=0
 for(const r of rangos){const cantidad=r.ultimo-r.primero+1;for(let i=Math.max(0,inicio-base);i<Math.min(cantidad,fin-base);i++)ids.push(`P${r.pedidoId}-${r.primero+i}`);base+=cantidad;if(base>=fin)break}
 return ids
}
export function filtrarPedidosCompletos(envios:EnvioDetalle[],vista:VistaEnvios,reloj:number,horas:number,origen='todos'){
 if(vista!=='entregadas'&&vista!=='futuras')return filtrarEnvios(envios,vista,reloj,horas,origen)
 const grupos=new Map<number,EnvioDetalle[]>();for(const e of envios)grupos.set(e.pedidoId,[...(grupos.get(e.pedidoId)??[]),e])
 const ids=new Set<number>()
 for(const [id,partes] of grupos){const p=partes[0],fin=p.pedidoEntregadoEnH
  if(vista==='entregadas'){if(p.estadoPedido==='ENTREGADO'&&fin!=null&&fin>=reloj-horas&&fin<=reloj)ids.add(id)}
  else {const eta=Math.max(...partes.map(p=>p.entregaRealH??p.llegadaH));if(!['ENTREGADO','NO_ENTREGADO'].includes(p.estadoPedido)&&partes.every(p=>p.estado!=='PENDIENTE_REPLANIFICACION')&&partes.reduce((n,p)=>n+p.cantidad,0)>=p.cantidadPedido&&eta>=reloj&&eta<=reloj+horas)ids.add(id)}
 }
 return envios.filter(e=>ids.has(e.pedidoId)&&(origen==='todos'||e.origenCodigo===origen))
}
