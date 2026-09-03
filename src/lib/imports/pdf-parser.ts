let runtimeReady: Promise<void> | undefined;

function preparePdfRuntime() {
  runtimeReady ??= import("@napi-rs/canvas").then((canvas) => {
    // PDF.js expects these graphics primitives even when the application only
    // extracts text. Keep the polyfills isolated to the lazy PDF code path.
    if (!("DOMMatrix" in globalThis)) Reflect.set(globalThis, "DOMMatrix", canvas.DOMMatrix);
    if (!("ImageData" in globalThis)) Reflect.set(globalThis, "ImageData", canvas.ImageData);
    if (!("Path2D" in globalThis)) Reflect.set(globalThis, "Path2D", canvas.Path2D);
  });
  return runtimeReady;
}

export async function extractPdfText(buffer: Buffer) {
  await preparePdfRuntime();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}
