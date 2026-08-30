function buildPdf(title:string){
 const safe=title.replaceAll(/[()\\]/g," ");
 const stream="BT /F1 18 Tf 50 770 Td ("+safe+") Tj 0 -35 Td /F1 10 Tf (Joint Procurement OS - fictional demo document) Tj 0 -25 Td (For workflow demonstration only. No third-party or production data.) Tj ET";
 const objects=["1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj","2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj","3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj","4 0 obj << /Length "+stream.length+" >> stream\n"+stream+"\nendstream endobj","5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"];
 let out="%PDF-1.4\n";const offsets=[0];for(const obj of objects){offsets.push(out.length);out+=obj+"\n"}const pos=out.length;
 out+="xref\n0 6\n0000000000 65535 f \n"+offsets.slice(1).map(x=>String(x).padStart(10,"0")+" 00000 n ").join("\n")+"\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n"+pos+"\n%%EOF";
 return new TextEncoder().encode(out);
}
export async function GET(_:Request,{params}:{params:Promise<{file:string}>}){const {file}=await params;const title=file.replace(".pdf","").replaceAll("-"," ").toUpperCase();return new Response(buildPdf(title),{headers:{"content-type":"application/pdf","content-disposition":'inline; filename="'+file+'"'}})}
