import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeObjectKey } from "./keys";
import type { DocumentStorageLocator, DocumentStorageProvider } from "./types";

export class LocalDocumentStorage implements DocumentStorageProvider {
  readonly id = "local" as const;
  constructor(private readonly root = path.join(process.cwd(), "var", "imports")) {}

  private resolve(locator: DocumentStorageLocator, allowFixture = false) {
    if (locator.provider !== this.id || locator.bucket) throw new Error("Locator locale non valido.");
    const objectKey = assertSafeObjectKey(locator.objectKey);
    if (objectKey.startsWith("fixtures/")) {
      if (!allowFixture) throw new Error("Le fixture repository sono in sola lettura.");
      const fixture = path.resolve(process.cwd(), "demo-imports", ...objectKey.slice("fixtures/".length).split("/"));
      const fixturePrefix = path.resolve(process.cwd(), "demo-imports") + path.sep;
      if (!fixture.startsWith(fixturePrefix)) throw new Error("Percorso fixture non valido.");
      return fixture;
    }
    const resolved = path.resolve(this.root, ...objectKey.split("/"));
    const prefix = path.resolve(this.root) + path.sep;
    if (!resolved.startsWith(prefix)) throw new Error("Percorso documento non valido.");
    return resolved;
  }

  async put(locator: DocumentStorageLocator, data: Buffer, _contentType: string) {
    void _contentType;
    const target = this.resolve(locator);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
      const existing = await readFile(target);
      if (!existing.equals(data)) throw new Error("Collisione nello storage locale.");
    });
  }

  get(locator: DocumentStorageLocator) { return readFile(this.resolve(locator, true)); }
  async exists(locator: DocumentStorageLocator) { try { await stat(this.resolve(locator, true)); return true; } catch { return false; } }
  async delete(locator: DocumentStorageLocator) { await rm(this.resolve(locator), { force: true }); }
  async head(locator: DocumentStorageLocator) { try { const value = await stat(this.resolve(locator, true)); return { size: value.size }; } catch { return null; } }
  async createSignedUrl(_locator: DocumentStorageLocator, _expiresInSeconds: number) { void _locator; void _expiresInSeconds; return null; }
}
