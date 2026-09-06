import mammoth from "mammoth";

export const supportedTechnicalExtensions = new Set(["pdf","docx","txt","png","jpg","jpeg"]);
export function technicalExtension(filename:string){return filename.toLocaleLowerCase("it-IT").split(".").pop()??"";}
export async function extractTechnicalText(buffer:Buffer,filename:string){
  const ext=technicalExtension(filename);
  if(!supportedTechnicalExtensions.has(ext))throw new Error("Formato tecnico non supportato.");
  if(["png","jpg","jpeg"].includes(ext))return {text:"",needsOcr:true,parserType:"IMAGE_NEEDS_OCR"};
  if(ext==="txt")return {text:buffer.toString("utf8"),needsOcr:false,parserType:"TEXT_DETERMINISTIC"};
  if(ext==="docx"){const result=await mammoth.extractRawText({buffer});return {text:result.value,needsOcr:!result.value.trim(),parserType:"DOCX_TEXT_DETERMINISTIC"};}
  const {extractPdfText}=await import("@/lib/imports/pdf-parser");const text=await extractPdfText(buffer);return {text,needsOcr:!text.trim(),parserType:"PDF_TEXT_DETERMINISTIC"};
}
