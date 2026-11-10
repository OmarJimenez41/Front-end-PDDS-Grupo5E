/** A simulation draft has no server scenario yet; never fall back to daily operation. */
export function escenarioParaMapa(sim:number|null|undefined,url:number|null,dia:number|null|undefined,borrador:boolean){
 return sim??url??(borrador?null:dia??null)
}
