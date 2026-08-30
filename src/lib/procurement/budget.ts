import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateBudget } from "@/lib/procurement/calculations";
export async function getFacilityBudget(facilityId:string){
 const current=new Date(); const budgets=await prisma.budget.findMany({where:{facilityId,status:"ACTIVE",periodStart:{lte:current},periodEnd:{gte:current}},include:{category:true,costCenter:true}});
 const [orders,pending]=await Promise.all([
  prisma.purchaseOrder.aggregate({_sum:{total:true},where:{facilityId,status:{notIn:["CANCELLED"]},issuedAt:{gte:new Date(current.getFullYear(),0,1)}}}),
  prisma.purchaseRequisition.aggregate({_sum:{total:true},where:{facilityId,status:"PENDING_APPROVAL"}})
 ]);
 const approved=budgets.reduce((s,b)=>s+Number(b.approvedAmount),0),actual=budgets.reduce((s,b)=>s+Number(b.actualAmount),0),committed=Number(orders._sum.total??0),reserved=Number(pending._sum.total??0);
 return{...calculateBudget(approved,committed,actual,reserved),budgets};
}
