import {jsPDF} from 'jspdf'
import {autoTable} from 'jspdf-autotable'
import {fechaReporte,numeroReporte as n,resumenReporte,resultadoSimulacion,type ReporteOperacion} from './reporteLegible'
import type {VistaSimulacion} from '../api/simulacion'
import {estadoEnEspanol} from './mejorasV9'

type Fila = (string | number | null | undefined)[]
// Helvetica preserves Spanish accents. Replace symbols outside its character set.
const texto=(v:unknown)=>String(v??'Sin registro').replace(/→/g,' a ').replace(/∞/g,'ilimitado').replace(/[–—]/g,'-').replace(/≤/g,'<=')
class Documento {
 readonly doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true})
 y=61
 constructor(readonly titulo:string,readonly referencia:string,subtitulo:string){
  const d=this.doc
  d.setProperties({title:`PaqRap | ${titulo}`,subject:referencia,author:'PaqRap',creator:'PaqRap · Centro de reportes'})
  d.setFillColor(15,23,42);d.rect(0,0,297,49,'F')
  d.setFillColor(29,78,216);d.rect(0,49,297,2,'F')
  d.setTextColor(165,190,240);d.setFont('helvetica','bold');d.setFontSize(9);d.text('PAQRAP / CENTRO DE CONTROL',16,12)
  d.setTextColor(255,255,255);d.setFontSize(24);d.text(titulo,16,27)
  d.setFont('helvetica','normal');d.setFontSize(10);d.setTextColor(203,213,225);d.text(texto(subtitulo),16,39)
 }
 nueva(){this.doc.addPage();this.y=27}
 espacio(alto:number){if(this.y+alto>190)this.nueva()}
 seccion(titulo:string){this.espacio(23);this.doc.setFont('helvetica','bold');this.doc.setFontSize(13);this.doc.setTextColor(15,23,42);this.doc.text(texto(titulo),16,this.y);this.y+=8}
 parrafo(t:string){const d=this.doc;d.setFont('helvetica','normal');d.setFontSize(9);d.setTextColor(71,85,105);const lineas:string[]=d.splitTextToSize(texto(t),265);for(const l of lineas){this.espacio(5);d.text(l,16,this.y);this.y+=4.8}this.y+=3}
 tabla(cabecera:string[],filas:Fila[],anchos?:Record<number,{cellWidth:number}>){
  autoTable(this.doc,{startY:this.y,head:[cabecera],body:filas.length?filas.map(f=>f.map(texto)):[['Sin registros disponibles',...cabecera.slice(1).map(()=>'-')]],margin:{left:16,right:16,top:27,bottom:20},styles:{font:'helvetica',fontSize:8,cellPadding:3,overflow:'linebreak',textColor:[51,65,85],lineColor:[226,232,240],lineWidth:0.1},headStyles:{fillColor:[29,78,216],textColor:255,fontStyle:'bold',fontSize:8},alternateRowStyles:{fillColor:[245,248,252]},columnStyles:anchos,rowPageBreak:'avoid',showHead:'everyPage'})
  this.y=(this.doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+10
 }
 tarjetas(items:[string,string,string][]){this.espacio(31);const d=this.doc,w=(265-9*(items.length-1))/items.length;items.forEach(([label,valor,detalle],i)=>{const x=16+i*(w+9);d.setFillColor(241,246,255);d.roundedRect(x,this.y,w,29,2,2,'F');d.setFont('helvetica','normal');d.setFontSize(8);d.setTextColor(71,85,105);d.text(label,x+4,this.y+6);d.setFont('helvetica','bold');d.setFontSize(18);d.setTextColor(29,78,216);d.text(texto(valor),x+4,this.y+16);d.setFont('helvetica','normal');d.setFontSize(7.5);d.setTextColor(71,85,105);d.text(texto(detalle),x+4,this.y+23)});this.y+=39}
 terminar(){const d=this.doc,total=d.getNumberOfPages();for(let i=1;i<=total;i++){d.setPage(i);if(i>1){d.setTextColor(29,78,216);d.setFont('helvetica','bold');d.setFontSize(9);d.text(`PAQRAP / ${this.titulo}`,16,13);d.setDrawColor(226,232,240);d.line(16,18,281,18)}d.setDrawColor(226,232,240);d.line(16,196,281,196);d.setTextColor(100,116,139);d.setFont('helvetica','normal');d.setFontSize(8);d.text(texto(this.referencia),16,202);d.text(`${i} / ${total}`,281,202,{align:'right'})}return d}
}

export function crearReportePdf(r:ReporteOperacion,hora:(h:number)=>string,vista?:VistaSimulacion|null,soloRutas=false){
 const s=resumenReporte(r),res=resultadoSimulacion(vista,hora),plan=r.ultimaPlanificacionEstable
 const titulo=soloRutas?'Rutas y productos':r.cierreDefinitivo?'Reporte de cierre':'Reporte de corte'
 const p=new Documento(titulo,`Escenario ${r.escenarioId} | Versión ${r.versionEstado} | ${r.cierreDefinitivo?'Cierre definitivo':'Corte de operación'}`,`${res?.tipo??'Operación logística'} | ${estadoEnEspanol(r.estado)} | ${hora(r.relojH)}`)
 p.parrafo(`Generado: ${fechaReporte(r.generadoEn)}. Este documento conserva la información de la consulta; los valores no registrados se indican como "Sin registro".`)
 if(!soloRutas){
 p.seccion('01 / Resumen ejecutivo')
 p.tarjetas([['Pedidos entregados',n(s.entregados),`de ${n(s.total)} registrados`],['Avance de entregas',n(s.porcentaje,1)+' %','Pedidos completos al corte'],['Distancia ejecutada',n(r.acumulado?.distanciaKm,1)+' km','Acumulado físico registrado'],['Rutas certificadas',n(s.rutas),`${n(s.unidades)} unidades planificadas`]])
 p.parrafo(`${n(s.pendientes)} pedidos sin entrega completa. ${n(r.acumulado?.entregas)} entregas confirmadas. Una entrega parcial no equivale a un pedido completo.`)
 if(res){p.seccion('Cumplimiento de la simulación');p.tabla(['Pedidos incorporados','Entregados a tiempo','Fuera de plazo','No entregados','Abiertos al corte'],[[res.incorporados,res.aTiempo,res.tarde,res.noEntregados,res.abiertos]])
 if(res.colapsado){p.seccion('Colapso logístico');p.tabla(['Instante','Día simulado','Pedido causante','Destino','Plazo comprometido'],[[res.instante,res.diasHastaColapso,res.causante?.codigo,res.causante?.destino,res.causante?.plazo]])}
 if(res.detalle)p.parrafo(res.detalle)
 p.parrafo(`Periodo consultado: ${res.inicio} a ${res.fin}.`)
 }
 p.seccion('02 / Última planificación estable')
 p.parrafo(`${plan?`Plan #${plan.id} | Distancia planificada: ${n(plan.distanciaTotalKm,1)} km`:'Sin planificación certificada disponible'}. ${r.criterioEstabilidad??''}`)
 p.parrafo(`El último plan publicado ${r.planAplicable?'es aplicable':'no es aplicable'} al corte. Su aplicabilidad se informa por separado de la certificación del último plan estable.`)
 }
 if(!soloRutas)p.nueva();p.seccion(soloRutas?'01 / Rutas y productos':'03 / Rutas y productos')
 p.parrafo('Horarios previstos del último plan certificado. No representan confirmación de ejecución física. Destinos expresados en coordenadas kilométricas.')
 const pedidos=new Map(r.pedidos.map(q=>[q.id,q]))
 const filas=(plan?.rutas??[]).flatMap(ruta=>ruta.paradas.map(q=>{const pedido=pedidos.get(q.pedidoId);const ids=r.paquetes.filter(i=>q.entregaId!=null&&i.entregaId===q.entregaId).map(i=>`P${i.pedidoId}-${i.primero} a P${i.pedidoId}-${i.ultimo}`).join(' / ')||'Sin identificadores conservados';return [q.codigoPedido,pedido?`(${pedido.posX}, ${pedido.posY})`:null,r.fisico?.almacenes.find(a=>a.id===ruta.almacenId)?.codigo??ruta.almacenId,ruta.id,r.fisico?.vehiculos.find(v=>v.id===ruta.vehiculoId)?.codigo??ruta.vehiculoId,q.cantidad,ids,hora(ruta.horaInicioH),hora(q.etaH),hora(ruta.horaFinH)]}))
 p.tabla(['Pedido','Destino','Origen','Ruta','UT','Productos','Identificadores','Salida','Llegada cliente','Retorno'],filas,{0:{cellWidth:25},1:{cellWidth:20},2:{cellWidth:20},3:{cellWidth:13},4:{cellWidth:17},5:{cellWidth:21},6:{cellWidth:59},7:{cellWidth:30},8:{cellWidth:30},9:{cellWidth:30}})
 if(!soloRutas){
 p.seccion('04 / Medición del motor')
 const tiempos=vista?.tiempos
 p.tabla(['Indicador','Significado','Último','Promedio','Muestras'],([['Ta','Búsqueda del algoritmo (ms reales)',tiempos?.taMs],['Sa','Intervalo entre planificaciones (h simuladas)',tiempos?.saH],['Sc','Avance del consumo (h simuladas)',tiempos?.scH]] as const).map(([k,desc,v])=>[k,desc,v?.muestras?n(v.ultimo,3):null,v?.muestras?n(v.promedio,3):null,v?.muestras??0]))
 if(tiempos)p.parrafo(`Configuración: Sa ${tiempos.saConfiguradaH} h; Sc máximo ${tiempos.scConfiguradoH} h. Ta mide la búsqueda y no la duración total de la simulación.`)
 p.seccion('05 / Inventario del corte')
 p.parrafo('Detalle de pedidos, flota, almacenes e incidencias conservado en esta consulta.')
 // Include every scalar field provided by the API without exposing an unreadable JSON dump.
 const inventario=(titulo:string,registros:unknown[])=>{p.seccion(titulo);const objetos=registros as Record<string,unknown>[];const claves=[...new Set(objetos.flatMap(o=>Object.keys(o).filter(k=>o[k]===null||typeof o[k]!=='object')))];if(!objetos.length){p.parrafo('Sin registros disponibles.');return}for(let i=0;i<claves.length;i+=6){const grupo=[...new Set([...(i>0&&claves.includes('id')?['id']:[]),...claves.slice(i,i+6)])];p.tabla(grupo.map(k=>k.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase())),objetos.map(o=>grupo.map(k=>typeof o[k]==='boolean'?(o[k]?'Sí':'No'):o[k] as string|number|null)))}}
 inventario('Pedidos registrados',r.pedidos);inventario('Flota al corte',r.fisico?.vehiculos??[]);inventario('Almacenes al corte',r.fisico?.almacenes??[]);inventario('Incidencias registradas',r.incidencias??[])
 }
 return p.terminar()
}

export interface ManifiestoPdf {carpeta:string;generadoEn:string;huella:string;archivos:{tipo:string;nombre:string;periodo:string;bytes:number;sha256:string;registrosEnArchivo:number;leidos:number;invalidos:number;completo:boolean;vigente:boolean}[];cobertura:Record<string,string[]>;avisos:string[]}
export function crearManifiestoPdf(m:ManifiestoPdf){
 const p=new Documento('Manifiesto de datos','PaqRap | Inventario reproducible de datos',`Generado: ${fechaReporte(m.generadoEn)}`)
 p.seccion('01 / Identidad del conjunto');p.parrafo(`Carpeta: ${m.carpeta}`);p.parrafo(`Huella SHA-256: ${m.huella}`)
 p.tarjetas([['Archivos',n(m.archivos.length),'Disponibles en el catálogo'],['Archivos vigentes',n(m.archivos.filter(a=>a.vigente).length),'Utilizados por la simulación'],['Registros leídos',n(m.archivos.reduce((s,a)=>s+a.leidos,0)),'Total informado por el catálogo']])
 p.seccion('02 / Cobertura temporal');p.tabla(['Datos','Periodos disponibles'],Object.entries(m.cobertura??{}).map(([k,v])=>[({ventas:'Ventas',huecosVentas:'Meses sin ventas',bloqueos:'Bloqueos',mantenimiento:'Mantenimiento'} as Record<string,string>)[k]??k,v.join(', ')||'Sin periodos']))
 p.seccion('03 / Archivos y calidad');p.tabla(['Archivo / periodo','Tipo','Bytes','Registros','Leídos','Inválidos','Completo','Vigente'],m.archivos.map(a=>[`${a.nombre} / ${a.periodo}`,a.tipo,n(a.bytes),n(a.registrosEnArchivo),n(a.leidos),n(a.invalidos),a.completo?'Sí':'No',a.vigente?'Sí':'No']))
 p.seccion('04 / Trazabilidad SHA-256');p.tabla(['Archivo','Huella del contenido'],m.archivos.map(a=>[a.nombre,a.sha256]),{0:{cellWidth:75}})
 p.seccion('05 / Observaciones');for(const aviso of m.avisos??[])p.parrafo(aviso);if(!m.avisos?.length)p.parrafo('Sin observaciones registradas.');p.parrafo('Las huellas permiten comparar conjuntos de datos. No acreditan equivalencia con un archivo oficial sin una referencia proporcionada.')
 return p.terminar()
}
