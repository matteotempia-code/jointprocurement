# Asset storage inventory

Audit date: 1 September 2026. Counts refer to the seeded shared Supabase environment after the live XLSX/PDF storage proof.

| Asset class | Example | Current physical location | DB model / field | Current object count | Static vs operational | Cross-machine? | Canonical target | Migration required? | Risk / notes |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| Smart Import source documents | uploaded XLSX/PDF | private `source-documents` bucket; `demo-imports/` remains the reproducible input source | `SourceDocument.storageProvider/storageBucket/storageObjectKey` | 7 records, all cloud-backed; 3 originated from Git fixtures | mixed | yes for uploads | Supabase Storage for DB records; Git for immutable fixture inputs | complete | Five valid referenced local/fixture records were migrated; 53 stale unreferenced runtime files were intentionally ignored. |
| Product images rendered by the app | catalog packshot sprite | `public/products/catalog-packshots-v2.png` | rendering derives a sprite cell from name/category; legacy `CanonicalProduct.imagePath` is not read | 1 active sprite, 156 products/12 cells | static demo | fresh clone only | Git | no | `imagePath` contains 12 legacy paths, four without files; it is dead seed metadata and must not be treated as an upload locator. No image editor exists. |
| Historical product image assets | category SVGs, v1 sprite | `public/products/` | none at runtime | 9 files (8 SVG + v1 sprite) | static/unused compatibility | no | Git or remove in a future cleanup | no cloud migration | Do not turn unused demo artwork into operational media. |
| Product technical documents | technical sheet, SDS, CE declaration, certification | four synthetic PDFs in `public/documents/` | `CanonicalProduct.datasheetPath/safetySheetPath/certificationPath/declarationPath` | 4 files; 84/7/14/60 field references | static demo fixture | fresh clone only | Git | no | Shared facsimiles, intentionally immutable, no upload/edit workflow. |
| Supplier assets | certificates, commercial and quality documents | same synthetic PDFs in `public/documents/` | `Supplier.certificationPath/commercialDocumentPath/qualityDocumentPath` | 3 logical classes; 25 references each | static demo fixture | fresh clone only | Git | no | No supplier logo or supplier-document upload workflow exists. |
| Price-list provenance label | `listino-01-2026.xlsx` | metadata only; no byte lookup | `PriceList.sourceFile`, optional `sourceDocumentId` | 30 seeded labels | static metadata | no | PostgreSQL; operational bytes through linked `SourceDocument` | no | Never present `sourceFile` alone as proof that an original is downloadable. |
| Purchase-order PDF | generated PO | generated in memory by `/orders/[id]/pdf` | order rows in PostgreSQL | 0 persisted files | generated | yes through DB | temporary/generated | no | Deterministic response; no local persistence. |
| Order attachments / delivery notes | packing slip, signed acceptance | not implemented | no locator model or route | 0 | future | yes when added | future private Storage | future feature | Do not report as migrated. |
| Receiving attachments | receipt photo | not implemented | no locator model or route | 0 | future | yes when added | future private Storage | future feature | Receipt records are structured DB data only. |
| Nonconformity evidence | damage photo | not implemented | `QualityIssue.attachmentPath` exists but is unused | 0 non-null | future | yes when added | future private Storage | future schema/workflow | Replace the path field with an authorized asset relation when implemented. |
| Out-of-catalog attachment | requester specification | not implemented | `OutOfCatalogRequest.attachmentPath` exists but is unused | 0 non-null | future | yes when added | future private Storage | future schema/workflow | Current form does not accept a file. |
| Demo import fixtures | two XLSX, CSV, native PDF | `demo-imports/` | three seed `SourceDocument.storagePath` values | 4 files | static deterministic fixture | fresh clone only | Git | no | `npm run demo:imports` generates files; it is not a live upload proof. |
| Branding and framework assets | logos/icons | `public/` | none | 5 root files | static application asset | fresh clone only | Git | no | Immutable application chrome. |
| Local storage adapter data | isolated test uploads | ignored `var/imports/` | only records explicitly using provider `local` | 53 stale local files; 0 current DB locators | temporary/local-only | no | temporary/generated | no | Dispensable; the proof removed the directory while cloud documents were read. Never copy it between PCs. |
| Storage proof manifest | IDs and non-secret measurements | ignored `var/storage-proof/` | none | 1 transient JSON file | temporary | no | temporary/generated | no | Contains no signed URL or credential; excluded from Git. |
| Browser/video output | screenshots, clips, audio, MP4 | ignored artifact and `.next-video-demo` folders | none | variable | generated | no | temporary/generated | no | Recreate on demand; never canonical business content. |

## Classification

- **Category A — must be cloud-safe now:** operational Smart Import uploads. Complete: new uploads use the private bucket and explicit PostgreSQL locators.
- **Category B — keep in Git:** branding, packshot sprite, synthetic PDFs and deterministic import fixtures.
- **Category C — future feature:** mutable product media, supplier uploads, order/delivery attachments, receiving photos, nonconformity evidence and out-of-catalog attachments. Their upload/edit workflows do not exist.
- **Category D — temporary only:** local adapter data, processing probes, build caches, QA screenshots and generated video/audio.

## Cloud blocker verdict

No currently implemented user-generated asset flow remains dependent on persistent local storage. A fresh clone receives every Category B asset from Git; all operational Smart Import bytes are stored in Supabase. Multiple app instances can read the same object after authorization. The unused attachment fields are future-feature debt, not hidden working upload flows.
