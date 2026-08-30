import type { Prisma, PurchaseOrderStatus } from "@prisma/client";
export type FacilityScope={facilityIds:string[]};
export function overdueWhere(scope:FacilityScope,at=new Date()){return{facilityId:{in:scope.facilityIds},expectedDeliveryDate:{lt:startOfDay(at)},status:{in:["ISSUED","ACKNOWLEDGED","PARTIALLY_RECEIVED"] as PurchaseOrderStatus[]}} satisfies Prisma.PurchaseOrderWhereInput}
export function deliveriesTodayWhere(scope:FacilityScope,at=new Date()){const start=startOfDay(at),end=new Date(start.getTime()+86400000);return{facilityId:{in:scope.facilityIds},expectedDeliveryDate:{gte:start,lt:end},status:{in:["ISSUED","ACKNOWLEDGED","PARTIALLY_RECEIVED"] as PurchaseOrderStatus[]}} satisfies Prisma.PurchaseOrderWhereInput}
export function openOrdersWhere(scope:FacilityScope){return{facilityId:{in:scope.facilityIds},status:{in:["ISSUED","ACKNOWLEDGED","PARTIALLY_RECEIVED","ISSUE"] as PurchaseOrderStatus[]}} satisfies Prisma.PurchaseOrderWhereInput}
export function startOfDay(value:Date){return new Date(value.getFullYear(),value.getMonth(),value.getDate())}
