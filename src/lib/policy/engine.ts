export type PolicyInput={total:number;availableBudget:number;requesterLimit:number;areaManagerLimit:number;justification?:string};
export type PolicyDecision={outcome:"AUTO_APPROVE"|"AREA_MANAGER_APPROVAL"|"PROCUREMENT_APPROVAL";reason:string;requiredApproverRole:"AREA_MANAGER"|"PROCUREMENT_MANAGER"|null;explanation:string;evaluatedRules:string[];requiresJustification:boolean};
export function evaluatePurchasePolicy(input:PolicyInput):PolicyDecision{
 const within=input.total<=input.availableBudget, substantiallyOut=input.total>input.availableBudget*1.25||input.total>input.areaManagerLimit;
 const rules=["CATALOG_ONLY",within?"WITHIN_BUDGET":"OUT_OF_BUDGET",input.total<=input.requesterLimit?"WITHIN_AUTONOMOUS_LIMIT":"ABOVE_AUTONOMOUS_LIMIT"];
 if(substantiallyOut)return{outcome:"PROCUREMENT_APPROVAL",reason:"Material budget or authority exception",requiredApproverRole:"PROCUREMENT_MANAGER",explanation:"The request exceeds the Area Manager authority or is substantially above available budget.",evaluatedRules:[...rules,"PROCUREMENT_EXCEPTION"],requiresJustification:true};
 if(!within)return{outcome:"AREA_MANAGER_APPROVAL",reason:"Request exceeds available budget",requiredApproverRole:"AREA_MANAGER",explanation:"Area Manager approval and a business reason are required because the request exceeds available budget.",evaluatedRules:rules,requiresJustification:true};
 if(input.total>input.requesterLimit)return{outcome:"AREA_MANAGER_APPROVAL",reason:"Above facility autonomous limit",requiredApproverRole:"AREA_MANAGER",explanation:"The request is within budget but exceeds the RSA Director autonomous authority.",evaluatedRules:rules,requiresJustification:false};
 return{outcome:"AUTO_APPROVE",reason:"Within catalog, budget and authority",requiredApproverRole:null,explanation:"The request is from the governed catalog, within available budget and within autonomous authority.",evaluatedRules:rules,requiresJustification:false};
}
