'use client'
import {Clock3,CalendarDays,Gauge,HelpCircle} from 'lucide-react'
import {createPortal} from 'react-dom'
import {useEffect,useState} from 'react'
type Escenario='day'|'five'|'collapse'
const escenarios=[{id:'day',nombre:'Día a día',detalle:'Operación en tiempo real',Icono:Clock3},{id:'five',nombre:'Cinco días',detalle:'Simular un periodo de cinco días',Icono:CalendarDays},{id:'collapse',nombre:'Colapso',detalle:'Simular hasta el primer incumplimiento',Icono:Gauge}] as const
// Con una ejecución en curso solo se muestra el escenario elegido: las otras opciones no aportan (JP 26/11).
export function NavegacionEscenarios({actual,bloqueada,onSeleccion}:{actual:Escenario;bloqueada:boolean;onSeleccion:(id:Escenario)=>void}){
 const [destino,setDestino]=useState<HTMLElement|null>(null)
 useEffect(()=>setDestino(document.getElementById('escenarios-laterales')),[])
 const contenido=<nav className="navegacion-escenarios" aria-label="Escenarios de trabajo"><span className="rotulo-escenarios">Operar</span>{escenarios.filter(e=>!bloqueada||e.id===actual).map(({id,nombre,detalle,Icono})=><button key={id} type="button" aria-current={actual===id?'page':undefined} disabled={bloqueada&&actual!==id} onClick={()=>onSeleccion(id)} title={bloqueada&&actual!==id?'Detén o cierra la simulación actual para cambiar de escenario':detalle}><Icono strokeWidth={1.6} aria-hidden="true"/><span>{nombre}</span></button>)}<details className="ayuda-escenarios"><summary aria-label="Ayuda sobre los escenarios" title="Ayuda sobre los escenarios"><HelpCircle className="size-4"/></summary><div><b>Un escenario, una ejecución</b><p>Día a día sigue la operación real. Cinco días y Colapso crean escenarios independientes.</p><p>Configura los archivos en Preparar → Archivos. Selecciona un escenario para ver sus controles.</p></div></details></nav>
 return destino?createPortal(contenido,destino):null
}
