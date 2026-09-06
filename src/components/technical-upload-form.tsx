"use client";

import { useRef, useState } from "react";
import {
  createTechnicalBatch,
  getTechnicalBatchProgress,
  startTechnicalBatch,
  stageTechnicalChunk,
} from "@/app/technical-documents/actions";

export function TechnicalUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const aiRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<string>();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const files = Array.from(inputRef.current?.files ?? []);
    if (!files.length) return;
    setPending(true);
    setError(undefined);
    try {
      const batch = await createTechnicalBatch(files.length, aiRef.current?.checked ?? true);
      for (let index = 0; index < files.length; index += 5) {
        const formData = new FormData();
        files.slice(index, index + 5).forEach((file) => formData.append("files", file));
        await stageTechnicalChunk(batch.id, formData);
        setProgress(`Acquisiti ${Math.min(index + 5, files.length)}/${files.length}`);
      }
      await startTechnicalBatch(batch.id);
      let state = await getTechnicalBatchProgress(batch.id);
      while (state.status === "UPLOADED" || state.status === "PROCESSING") {
        setProgress(`Analizzati ${state.completed + state.failed}/${state.total}`);
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        state = await getTechnicalBatchProgress(batch.id);
      }
      setProgress(`Lotto ${batch.id}: ${state.completed} completati, ${state.failed} falliti`);
      inputRef.current?.form?.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Caricamento non riuscito.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="technical-upload">
      <label>
        Documenti tecnici
        <input
          name="files"
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.zip"
          required
        />
      </label>
      <p>
        PDF testuali, DOCX, TXT, immagini e ZIP. Le immagini senza testo vengono
        conservate come “OCR necessario”.
      </p>
      <label><input ref={aiRef} type="checkbox" defaultChecked /> Usa Procurement AI per interpretare i documenti testuali</label>
      {error && (
        <p role="alert" className="warning">
          {error}
        </p>
      )}
      {progress && (
        <p role="status" className="success">
          {progress}
        </p>
      )}
      <button className="primary-cta" disabled={pending}>
        {pending ? "Elaborazione lotto…" : "Carica e analizza"}
      </button>
    </form>
  );
}
