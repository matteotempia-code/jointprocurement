import "server-only";
import { prisma } from "@/lib/prisma";
export async function getSupplierMetrics(supplierId:string){
 const orders=await prisma.purchaseOrder.findMany({where:{supplierId},include:{receipts:{include:{lines:true}},lines:true}});
 const delivered=orders.filter(o=>o.receipts.length),onTime=delivered.filter(o=>o.receipts[0].receivedAt<=o.expectedDeliveryDate).length;
 const complete=delivered.filter(o=>o.lines.every(l=>o.receipts.flatMap(r=>r.lines).filter(x=>x.purchaseOrderLineId===l.id).reduce((s,x)=>s+Number(x.quantityAccepted),0)>=Number(l.quantity))).length;
 const issues=await prisma.qualityIssue.count({where:{purchaseOrderLine:{purchaseOrder:{supplierId}}}});
 return{orders:orders.length,delivered:delivered.length,onTimeRate:delivered.length?onTime/delivered.length*100:0,completeRate:delivered.length?complete/delivered.length*100:0,issueRate:delivered.length?issues/delivered.length*100:0,issues,spend:orders.reduce((s,o)=>s+Number(o.total),0)};
}
