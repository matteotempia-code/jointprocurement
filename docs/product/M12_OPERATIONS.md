# M12 operations

Il Technical Control Center è disponibile in `/technical-documents`. Un lotto accetta fino a 5.000 documenti e conserva ogni sorgente con checksum e locator immutabile. Lo stato mostra avanzamento, revisioni necessarie, elementi `NEEDS_OCR` e fallimenti.

Il workflow tenta automaticamente ogni elemento fino a tre volte. Per un lotto `PARTIAL` o `FAILED`, correggere la causa esterna e usare **Riprova elementi falliti**: soltanto gli elementi falliti tornano in coda; sorgenti, documenti già completati e decisioni umane restano invariati.

Le regole obbligatorie si gestiscono in `/technical-requirements`. Le associazioni e le equivalenze incerte devono essere decise dalle rispettive code. Un prodotto con stato tecnico esplicito diverso da `COMPLETE` non è approvato per nuovi acquisti; i prodotti legacy privi di stato M12 restano consultabili.

OCR non è incluso: immagini e PDF privi di testo restano `NEEDS_OCR`. Non modificare direttamente record di versione, fingerprint o stato; una nuova evidenza deve entrare come nuova sorgente.
