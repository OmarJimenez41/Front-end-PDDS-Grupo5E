/** A simulation draft has no server scenario yet; never fall back to daily operation. */
export function escenarioParaMapa(sim:number|null|undefined,url:number|null,dia:number|null|undefined,borrador:boolean){
 return sim??url??(borrador?null:dia??null)
}

/** Navigation follows the server scenario, including shared historical links. */
export function escenarioPorTipo(tipo:string|null|undefined,actual:'day'|'five'|'collapse'){
 return tipo==='DIA_A_DIA'?'day':tipo==='CINCO_DIAS'?'five':tipo==='COLAPSO'?'collapse':actual
}
