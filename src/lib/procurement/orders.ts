import type { Prisma } from "@prisma/client";
type Tx=Prisma.TransactionClient;
export async function createPurchaseOrders(tx:Tx,requisitionId:string,actorUserId:string){
 const req=await tx.purchaseRequisition.findUniqueOrThrow({where:{id:requisitionId},include:{facility:true,lines:{include:{supplierOffer:true}}}});
 const groups=new Map<string,typeof req.lines>(); for(const line of req.lines){const key=line.supplierOffer.supplierId;groups.set(key,[...(groups.get(key)??[]),line]);}
 const base=await tx.purchaseOrder.count(); const created:string[]=[];
 for(const [supplierId,lines] of groups){const subtotal=lines.reduce((s,l)=>s+Number(l.lineTotal),0),taxTotal=lines.reduce((s,l)=>s+Number(l.lineTotal)*Number(l.taxRate)/100,0),lead=Math.max(...lines.map(l=>l.supplierOffer.leadTimeDays));
  const po=await tx.purchaseOrder.create({data:{poNumber:"PO-"+new Date().getFullYear()+"-"+String(base+created.length+1).padStart(6,"0"),requisitionId:req.id,supplierId,organizationId:req.organizationId,facilityId:req.facilityId,deliveryLocation:req.facility.address??req.facility.name,status:"ISSUED",subtotal,taxTotal,total:subtotal+taxTotal,issuedAt:new Date(),expectedDeliveryDate:new Date(Date.now()+lead*86400000),lines:{create:lines.map(l=>({canonicalProductId:l.canonicalProductId,descriptionSnapshot:l.descriptionSnapshot,supplierSkuSnapshot:l.supplierSkuSnapshot,quantity:l.quantity,unitPrice:l.unitPrice,taxRate:l.taxRate,lineTotal:l.lineTotal}))}}});created.push(po.id);
  await tx.auditEvent.create({data:{actorUserId,entityType:"PURCHASE_ORDER",entityId:po.id,action:"PO_CREATED",metadata:{poNumber:po.poNumber,requisitionId:req.id,supplierId}}});
 }
 return created;
}
