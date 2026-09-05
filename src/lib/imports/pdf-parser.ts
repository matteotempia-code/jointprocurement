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
  const [{ PDFParse }, { getData: getPdfWorkerData }] = await Promise.all([
    import("pdf-parse"),
    import("pdf-parse/worker"),
  ]);

  // pdfjs-dist defaults to a package-relative worker path in Node. Vercel's
  // traced server bundle can externalize pdf-parse without copying that
  // transitive worker file, so fake-worker setup fails at runtime. pdf-parse
  // ships the matching worker as an embedded data URL specifically for this
  // deployment-safe use case.
  PDFParse.setWorker(getPdfWorkerData());
  const parser = new PDFParse({ data: buffer });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}
