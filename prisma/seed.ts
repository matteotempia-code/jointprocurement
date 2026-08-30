import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // --- Cleanup demo data ---
  await prisma.supplierOffer.deleteMany();
  await prisma.priceList.deleteMany();
  await prisma.canonicalProduct.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.userAssignment.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.area.deleteMany();
  await prisma.legalEntity.deleteMany();
  await prisma.organization.deleteMany();

  // --- Organizations ---
  const anteo = await prisma.organization.create({
    data: {
      name: "Anteo Demo",
    },
  });

  const coopselios = await prisma.organization.create({
    data: {
      name: "Coopselios Demo",
    },
  });

  // --- Legal Entities ---
  const anteoEntity = await prisma.legalEntity.create({
    data: {
      name: "Anteo Impresa Sociale Demo",
      organizationId: anteo.id,
    },
  });

  const coopEntity = await prisma.legalEntity.create({
    data: {
      name: "Coopselios Demo Entity",
      organizationId: coopselios.id,
    },
  });

  // --- Areas ---
  const piemonte = await prisma.area.create({
    data: {
      name: "Area Piemonte",
      legalEntityId: anteoEntity.id,
    },
  });

  const lombardia = await prisma.area.create({
    data: {
      name: "Area Lombardia",
      legalEntityId: anteoEntity.id,
    },
  });

  const emilia = await prisma.area.create({
    data: {
      name: "Area Emilia-Romagna",
      legalEntityId: coopEntity.id,
    },
  });

  // --- Facilities ---
  const rsaAurora = await prisma.facility.create({
    data: {
      name: "RSA Aurora",
      areaId: piemonte.id,
    },
  });

  const sanMichele = await prisma.facility.create({
    data: {
      name: "Residenza San Michele",
      areaId: piemonte.id,
    },
  });

  const villaSerena = await prisma.facility.create({
    data: {
      name: "Villa Serena",
      areaId: lombardia.id,
    },
  });

  const rsaGiardini = await prisma.facility.create({
    data: {
      name: "RSA Giardini",
      areaId: emilia.id,
    },
  });

  // --- Cost Centers ---
  await prisma.costCenter.createMany({
    data: [
      {
        code: "AUR-001",
        name: "Assistenza",
        facilityId: rsaAurora.id,
      },
      {
        code: "AUR-002",
        name: "Servizi generali",
        facilityId: rsaAurora.id,
      },
      {
        code: "SM-001",
        name: "Assistenza",
        facilityId: sanMichele.id,
      },
      {
        code: "VS-001",
        name: "Assistenza",
        facilityId: villaSerena.id,
      },
      {
        code: "RG-001",
        name: "Assistenza",
        facilityId: rsaGiardini.id,
      },
    ],
  });

  // --- Roles ---
  const roleRsaDirector = await prisma.role.create({
    data: {
      code: "RSA_DIRECTOR",
      name: "RSA Director",
      description: "Responsabile operativo della struttura",
    },
  });

  const roleAreaManager = await prisma.role.create({
    data: {
      code: "AREA_MANAGER",
      name: "Area Manager",
      description: "Responsabile di area e approvatore",
    },
  });

  const roleProcurement = await prisma.role.create({
    data: {
      code: "PROCUREMENT_MANAGER",
      name: "Joint Procurement Manager",
      description: "Responsabile procurement comune",
    },
  });

  const roleAdmin = await prisma.role.create({
    data: {
      code: "PROCUREMENT_ADMIN",
      name: "Procurement Administrator",
      description: "Amministratore della piattaforma",
    },
  });

  const roleFinance = await prisma.role.create({
    data: {
      code: "FINANCE_CONTROLLER",
      name: "Finance Controller",
      description: "Controllo fatture e budget",
    },
  });

  const roleExecutive = await prisma.role.create({
    data: {
      code: "EXECUTIVE_SPONSOR",
      name: "Executive Sponsor",
      description: "Vista executive e controllo sintetico",
    },
  });

  // --- Users ---
  const lucia = await prisma.user.create({
    data: {
      email: "lucia.ferri@demo.local",
      name: "Lucia Ferri",
    },
  });

  const andrea = await prisma.user.create({
    data: {
      email: "andrea.riva@demo.local",
      name: "Andrea Riva",
    },
  });

  const giulia = await prisma.user.create({
    data: {
      email: "giulia.bianchi@demo.local",
      name: "Giulia Bianchi",
    },
  });

  const marco = await prisma.user.create({
    data: {
      email: "marco.villa@demo.local",
      name: "Marco Villa",
    },
  });

  const elena = await prisma.user.create({
    data: {
      email: "elena.conti@demo.local",
      name: "Elena Conti",
    },
  });

  const davide = await prisma.user.create({
    data: {
      email: "davide.romano@demo.local",
      name: "Davide Romano",
    },
  });

  // --- Assignments ---
  await prisma.userAssignment.createMany({
    data: [
      {
        userId: lucia.id,
        roleId: roleRsaDirector.id,
        organizationId: anteo.id,
        scopeType: "FACILITY",
        scopeId: rsaAurora.id,
        approvalLimit: 5000,
      },
      {
        userId: andrea.id,
        roleId: roleAreaManager.id,
        organizationId: anteo.id,
        scopeType: "AREA",
        scopeId: piemonte.id,
        approvalLimit: 20000,
      },
      {
        userId: giulia.id,
        roleId: roleProcurement.id,
        organizationId: anteo.id,
        scopeType: "ORGANIZATION",
        scopeId: anteo.id,
        approvalLimit: 50000,
      },
      {
        userId: marco.id,
        roleId: roleAdmin.id,
        organizationId: anteo.id,
        scopeType: "ORGANIZATION",
        scopeId: anteo.id,
      },
      {
        userId: elena.id,
        roleId: roleFinance.id,
        organizationId: anteo.id,
        scopeType: "ORGANIZATION",
        scopeId: anteo.id,
      },
      {
        userId: davide.id,
        roleId: roleExecutive.id,
        organizationId: anteo.id,
        scopeType: "ORGANIZATION",
        scopeId: anteo.id,
      },
    ],
  });

  // --- Suppliers ---
  const alfaMedical = await prisma.supplier.create({
    data: {
      name: "Alfa Medical",
      vatNumber: "IT10000000001",
    },
  });

  const careSupply = await prisma.supplier.create({
    data: {
      name: "CareSupply",
      vatNumber: "IT10000000002",
    },
  });

  const cleanPro = await prisma.supplier.create({
    data: {
      name: "CleanPro Italia",
      vatNumber: "IT10000000003",
    },
  });

  // --- Categories ---
  const medical = await prisma.category.create({
    data: {
      code: "MEDICAL",
      name: "Medical disposables",
    },
  });

  const cleaning = await prisma.category.create({
    data: {
      code: "CLEANING",
      name: "Cleaning",
    },
  });

  // --- Products ---
  const gloveM = await prisma.canonicalProduct.create({
    data: {
      name: "Guanto nitrile senza polvere - M - 100 pezzi",
      description: "Guanto monouso nitrile, taglia M",
      brand: "DemoCare",
      ean: "8000000000011",
      uom: "BOX",
      categoryId: medical.id,
    },
  });

  const gloveL = await prisma.canonicalProduct.create({
    data: {
      name: "Guanto nitrile senza polvere - L - 100 pezzi",
      description: "Guanto monouso nitrile, taglia L",
      brand: "DemoCare",
      ean: "8000000000012",
      uom: "BOX",
      categoryId: medical.id,
    },
  });

  const detergent5L = await prisma.canonicalProduct.create({
    data: {
      name: "Detergente professionale superfici - 5L",
      description: "Detergente concentrato per superfici",
      brand: "CleanDemo",
      ean: "8000000000021",
      uom: "TANICA",
      categoryId: cleaning.id,
    },
  });

  // --- Price Lists ---
  const alfaList = await prisma.priceList.create({
    data: {
      name: "Alfa Medical - Listino 2027",
      supplierId: alfaMedical.id,
      validFrom: new Date("2027-01-01"),
      validUntil: new Date("2027-12-31"),
      active: true,
      sourceFile: "AlfaMedical_Listino_2027.pdf",
    },
  });

  const careList = await prisma.priceList.create({
    data: {
      name: "CareSupply - Listino 2027",
      supplierId: careSupply.id,
      validFrom: new Date("2027-01-01"),
      validUntil: new Date("2027-12-31"),
      active: true,
      sourceFile: "CareSupply_Listino_2027.xlsx",
    },
  });

  const cleanList = await prisma.priceList.create({
    data: {
      name: "CleanPro - Listino 2027",
      supplierId: cleanPro.id,
      validFrom: new Date("2027-01-01"),
      validUntil: new Date("2027-12-31"),
      active: true,
      sourceFile: "CleanPro_Listino_2027.xlsx",
    },
  });

  // --- Offers ---
  await prisma.supplierOffer.createMany({
    data: [
      {
        supplierId: alfaMedical.id,
        canonicalProductId: gloveM.id,
        priceListId: alfaList.id,
        supplierSku: "AM-GNM-100",
        packageSize: 100,
        unitPrice: 3.72,
        normalizedUnitPrice: 0.0372,
        preferred: true,
      },
      {
        supplierId: careSupply.id,
        canonicalProductId: gloveM.id,
        priceListId: careList.id,
        supplierSku: "CS-NIT-M",
        packageSize: 100,
        unitPrice: 4.18,
        normalizedUnitPrice: 0.0418,
        preferred: false,
      },
      {
        supplierId: alfaMedical.id,
        canonicalProductId: gloveL.id,
        priceListId: alfaList.id,
        supplierSku: "AM-GNL-100",
        packageSize: 100,
        unitPrice: 3.78,
        normalizedUnitPrice: 0.0378,
        preferred: true,
      },
      {
        supplierId: careSupply.id,
        canonicalProductId: gloveL.id,
        priceListId: careList.id,
        supplierSku: "CS-NIT-L",
        packageSize: 100,
        unitPrice: 4.24,
        normalizedUnitPrice: 0.0424,
        preferred: false,
      },
      {
        supplierId: cleanPro.id,
        canonicalProductId: detergent5L.id,
        priceListId: cleanList.id,
        supplierSku: "CP-SURF-5L",
        packageSize: 5,
        unitPrice: 10.90,
        normalizedUnitPrice: 2.18,
        preferred: true,
      },
    ],
  });

  console.log("Seed completato.");
  console.log("Organizations:", 2);
  console.log("Facilities:", 4);
  console.log("Users:", 6);
  console.log("Suppliers:", 3);
  console.log("Products:", 3);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

