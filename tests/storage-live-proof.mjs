import { access, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const port = process.env.STORAGE_PROOF_PORT ?? "3107", base = `http://localhost:${port}`;
const runtimeDirectory = path.join(process.cwd(), "var", "imports"), disabledDirectory = path.join(process.cwd(), "var", "storage-proof", "local-runtime-disabled");
let runtimeDisabled = false, server, browser, serverOutput = "";
const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
async function exists(target) { try { await access(target); return true; } catch { return false; } }
async function ready() { try { const response=await fetch(base, { redirect: "manual" }); return response.status < 500; } catch { return false; } }
async function switchTo(page, name) { await page.goto(base, { waitUntil: "networkidle" }); const select=page.getByLabel("Persona demo", { exact: true }); const value=await select.locator("option").evaluateAll((options, expected)=>options.find((option)=>option.textContent?.includes(expected))?.value,name); if(!value)throw new Error(`Persona non disponibile: ${name}`); await page.context().addCookies([{name:"jpo-demo-user",value,url:base,sameSite:"Lax"}]); await page.goto(base,{waitUntil:"networkidle"}); }

try {
  if (await exists(runtimeDirectory)) { if (await exists(disabledDirectory)) throw new Error("Directory di prova locale già presente."); await rename(runtimeDirectory, disabledDirectory); runtimeDisabled = true; }
  const command=process.platform==="win32"?(process.env.ComSpec??"cmd.exe"):"npm",args=process.platform==="win32"?["/d","/s","/c",`npx next dev -p ${port}`]:["run","dev","--","-p",port];
  if (!(await ready())) {
    server=spawn(command,args,{cwd:process.cwd(),stdio:["ignore","pipe","pipe"],windowsHide:true,env:{...process.env,DEMO_MODE:"true",DOCUMENT_STORAGE_PROVIDER:"supabase"}});
    server.stdout.on("data",(chunk)=>{serverOutput+=chunk.toString();}); server.stderr.on("data",(chunk)=>{serverOutput+=chunk.toString();});
  }
  for(let attempt=0;attempt<120&&!(await ready())&&server.exitCode===null;attempt+=1)await new Promise(resolve=>setTimeout(resolve,500));
  if(!(await ready()))throw new Error(`Applicazione di prova non disponibile. ${serverOutput.slice(-1200)}`);
  browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1366,height:768}});
  await switchTo(page,"Giulia Bianchi");
  const manager=await prisma.user.findUniqueOrThrow({where:{email:"giulia.bianchi@demo.local"},select:{assignments:{where:{active:true},take:1,select:{organizationId:true}}}}),organizationId=manager.assignments[0]?.organizationId;
  if(!organizationId)throw new Error("Organizzazione Procurement non disponibile.");
  const documents=await prisma.sourceDocument.findMany({where:{organizationId,storageProvider:"supabase",OR:[{mimeType:"application/pdf"},{mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]},include:{importJobs:{take:1,orderBy:{createdAt:"desc"}}},orderBy:{createdAt:"desc"}});
  const results=[];
  for(const document of documents){
    const proof=document.mimeType==="application/pdf"?"pdf":"xlsx",route=`/imports/documents/${document.id}`;
    if(results.some((item)=>item.proof===proof))continue;
    const redirect=await page.request.get(new URL(route,base).toString(),{maxRedirects:0});
    if(![302,303,307,308].includes(redirect.status())||!redirect.headers().location?.includes("/storage/v1/object/sign/"))throw new Error(`URL firmato non restituito per ${proof}: HTTP ${redirect.status()}, location=${Boolean(redirect.headers().location)}.`);
    const content=await page.request.get(new URL(route,base).toString()); const bytes=(await content.body()).length; if(!content.ok()||bytes!==document.fileSize)throw new Error(`Readback autorizzato fallito per ${proof}.`);
    const importJob=document.importJobs[0]; if(!importJob)throw new Error(`Import Job assente per ${proof}.`);
    const review=await page.goto(new URL(`/imports/${importJob.id}`,base).toString(),{waitUntil:"networkidle"}); if(!review?.ok())throw new Error(`Review import non accessibile per ${proof}.`);
    results.push({proof,route,bytes});
  }
  if(!results.length)throw new Error(`Nessun SourceDocument cloud corrente verificabile; MIME trovati: ${documents.map((item)=>item.mimeType).join(", ")||"nessuno"}.`);
  await switchTo(page,"Lucia Ferri");
  for(const result of results){const denied=await page.request.get(new URL(result.route,base).toString(),{maxRedirects:0});if(denied.status()!==404||denied.headers().location)throw new Error(`Denial non sicuro per ${result.proof}.`);}
  const guessed=await page.request.get(new URL("/imports/documents/00000000-0000-4000-8000-000000000000",base).toString(),{maxRedirects:0}); if(guessed.status()!==404||guessed.headers().location)throw new Error("ID guessing non negato.");
  console.log(`BROWSER STORAGE PROOF PASS: ${results.length} tipi di documento cloud correnti (${results.map((item)=>item.proof.toUpperCase()).join(" + ")}) leggibili da Procurement, negati a ruolo non autorizzato, var/imports indisponibile.`);
} finally {
  await browser?.close(); server?.kill();
  if(runtimeDisabled)await rename(disabledDirectory,runtimeDirectory);
  await prisma.$disconnect();
}
