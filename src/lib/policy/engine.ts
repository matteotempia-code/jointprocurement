export type PolicyInput={total:number;availableBudget:number;approvedBudget?:number;requesterLimit:number;areaManagerLimit:number;justification?:string};
export type PolicyDecision={outcome:"AUTO_APPROVE"|"AREA_MANAGER_APPROVAL"|"PROCUREMENT_APPROVAL";reason:string;requiredApproverRole:"AREA_MANAGER"|"PROCUREMENT_MANAGER"|null;explanation:string;evaluatedRules:string[];requiresJustification:boolean};
export function evaluatePurchasePolicy(input:PolicyInput):PolicyDecision{
 const within=input.total<=input.availableBudget, substantiallyOut=input.total>input.availableBudget*1.25||input.total>input.areaManagerLimit;
 const utilizationAfter=input.approvedBudget&&input.approvedBudget>0?1-(input.availableBudget-input.total)/input.approvedBudget:null;
 const budgetRule=!within?"OUT_OF_BUDGET":utilizationAfter!==null&&utilizationAfter>=.8?"BUDGET_WARNING":"WITHIN_BUDGET";
 const rules=["CATALOG_ONLY",budgetRule,input.total<=input.requesterLimit?"WITHIN_AUTONOMOUS_LIMIT":"ABOVE_AUTONOMOUS_LIMIT"];
 if(substantiallyOut)return{outcome:"PROCUREMENT_APPROVAL",reason:"Eccezione rilevante di budget o autorità",requiredApproverRole:"PROCUREMENT_MANAGER",explanation:"La richiesta supera il limite dell’Area Manager oppure eccede in modo rilevante il budget disponibile.",evaluatedRules:[...rules,"PROCUREMENT_EXCEPTION"],requiresJustification:true};
 if(!within)return{outcome:"AREA_MANAGER_APPROVAL",reason:"La richiesta supera il budget disponibile",requiredApproverRole:"AREA_MANAGER",explanation:"Servono l’approvazione dell’Area Manager e una motivazione perché la richiesta supera il budget disponibile.",evaluatedRules:rules,requiresJustification:true};
 if(input.total>input.requesterLimit)return{outcome:"AREA_MANAGER_APPROVAL",reason:"Importo superiore al limite autonomo della struttura",requiredApproverRole:"AREA_MANAGER",explanation:"La richiesta rientra nel budget, ma supera l’autonomia di spesa del Direttore RSA.",evaluatedRules:rules,requiresJustification:false};
 return{outcome:"AUTO_APPROVE",reason:"Acquisto entro catalogo, budget e autonomia",requiredApproverRole:null,explanation:"La richiesta usa il catalogo governato, rientra nel budget disponibile e nell’autonomia di spesa.",evaluatedRules:rules,requiresJustification:false};
}
