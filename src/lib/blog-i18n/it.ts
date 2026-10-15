/* Italian blog post bodies (markdown), keyed by post slug. Tool links are rewritten to /it/... on render. */
const posts: Record<string, string> = {
  "how-to-compress-images-without-losing-quality": `# Come comprimere le immagini senza perdere qualità

Le immagini pesanti rallentano i siti, riempiono lo spazio di archiviazione e rendono scomoda la condivisione. La buona notizia: con il metodo giusto puoi ridurre molto le dimensioni senza alcuna perdita di qualità visibile.

## Capire la compressione delle immagini

Esistono due grandi tipi di compressione:

- **La compressione senza perdita** elimina i dati ridondanti senza scartare informazioni sui pixel. L'immagine decompressa è identica all'originale. Il PNG usa la compressione senza perdita per impostazione predefinita.
- **La compressione con perdita** scarta in modo selettivo i dati che l'occhio umano nota a malapena. JPEG e WebP la supportano, ed è per questo che ottengono file molto più piccoli per le foto.

Il trucco per comprimere "senza perdere qualità" è restare nell'intervallo in cui i dati scartati non si percepiscono. Per la maggior parte delle foto, una qualità JPEG tra 75 e 85 produce file più piccoli del 60-80% rispetto all'originale, senza differenze visibili alle dimensioni normali.

## Tecniche pratiche

### 1. Scegli il formato giusto

Il formato conta più di qualsiasi cursore:

- **JPEG** è il migliore per foto e immagini complesse con molti colori.
- **PNG** è il migliore per grafiche, loghi, screenshot e immagini con trasparenza.
- **WebP** gestisce bene entrambi i casi e di solito produce file più piccoli del 25-35% rispetto al JPEG a parità di qualità. La maggior parte dei browser moderni lo supporta.

Se devi passare da un formato all'altro, [il convertitore di immagini di ZapFile](/tools/convert-image) lo fa all'istante nel browser.

### 2. Ridimensiona prima di comprimere

Un errore comune è comprimere una foto 4000×3000 che verrà mostrata solo a 800×600. Ridimensionare prima alle dimensioni reali di visualizzazione può ridurre il peso del 90% ancora prima della compressione. Usa [il ridimensionatore di immagini di ZapFile](/tools/resize-image) per impostare misure esatte o scalare in percentuale.

### 3. Usa impostazioni di qualità sensate

Quando salvi in JPEG o WebP, la qualità decide quanti dati vengono scartati:

- **90-100**: quasi senza perdita, file grandi. Per archivio o stampa.
- **75-85**: il punto ideale per il web. Indistinguibile dall'originale alle dimensioni normali.
- **50-70**: leggera morbidezza da vicino, ma va bene per le miniature.

### 4. Elimina i metadati

Le foto di fotocamere e smartphone contengono metadati EXIF: coordinate GPS, modello della fotocamera, tempo di esposizione e altro. Possono aggiungere 50-100 KB a ogni immagine. Eliminarli riduce il file e protegge la tua privacy. Puoi vedere quali metadati contengono le tue immagini con [il visualizzatore EXIF di ZapFile](/tools/exif-viewer).

## Compressione in blocco senza upload

Molti strumenti online ti chiedono di caricare le immagini su un server, con problemi di privacy e limiti di dimensione. Gli strumenti che funzionano nel browser, come [il compressore di immagini di ZapFile](/tools/compress-image), elaborano tutto sul tuo dispositivo. Le immagini non lasciano mai il computer, non ci sono limiti di dimensione e il risultato è immediato.

## Checklist rapida

- Scegli il formato giusto (JPEG per le foto, PNG per le grafiche, WebP per entrambi).
- Ridimensiona alle misure che ti servono davvero.
- Imposta una qualità tra 75 e 85 per il web.
- Elimina i metadati inutili.
- Usa un compressore nel browser che rispetti la privacy.

Seguendo questi passaggi otterrai sempre file più piccoli senza perdite di qualità percepibili.`,

  "jpg-vs-png-vs-webp-which-format-to-use": `# JPG, PNG o WebP: quale formato di immagine usare?

Scegliere il formato sbagliato può raddoppiare o triplicare le dimensioni di un file senza alcun vantaggio visibile. Questa guida spiega i tre formati più usati per aiutarti a decidere in fretta e bene.

## JPEG (JPG)

Il JPEG è il formato predefinito per le foto sul web dagli anni '90. Usa una compressione con perdita: scarta per sempre alcuni dati per ottenere file più piccoli.

**Ideale per:**
- Foto e immagini con sfumature morbide
- Pubblicazioni sui social
- Qualsiasi immagine in cui una piccola perdita di qualità sia accettabile

**Limiti:**
- Non supporta la trasparenza
- Ogni nuovo salvataggio con perdita peggiora l'immagine
- Non è ideale per testo, disegni al tratto o bordi netti

Una foto JPEG di buona qualità è in genere da 5 a 10 volte più piccola della stessa immagine in PNG.

## PNG

Il PNG usa una compressione senza perdita, quindi l'immagine decodificata è una copia perfetta dell'originale. Supporta anche la trasparenza alfa completa, indispensabile per loghi, icone ed elementi d'interfaccia.

**Ideale per:**
- Loghi, icone e grafiche con bordi netti
- Screenshot e immagini con testo
- Qualsiasi immagine che richieda uno sfondo trasparente
- Immagini da modificare e salvare più volte

**Limiti:**
- File molto più grandi per le foto (spesso da 3 a 5 volte più del JPEG)
- Nessuna animazione nativa (quel ruolo spetta a GIF e APNG)

## WebP

Sviluppato da Google, il WebP supporta compressione con e senza perdita, oltre a trasparenza e animazione. A parità di qualità produce sempre file più piccoli di JPEG e PNG.

**Ideale per:**
- Pubblicazioni web in cui il file deve essere il più leggero possibile
- Immagini che richiedono qualità e trasparenza
- Progressive web app e siti orientati alle prestazioni

**Limiti:**
- Alcuni browser molto vecchi non lo supportano (il supporto globale supera comunque il 97%)
- Alcuni visualizzatori ed editor desktop lo supportano in modo limitato
- Meno accettato nei flussi di stampa

## Confronto diretto

| Caratteristica | JPEG | PNG | WebP |
|---|---|---|---|
| Compressione | Con perdita | Senza perdita | Entrambe |
| Trasparenza | No | Sì | Sì |
| Animazione | No | No | Sì |
| Ideale per | Foto | Grafiche | Entrambi |
| Dimensione relativa | Piccola | Grande | La più piccola |
| Supporto browser | Universale | Universale | 97%+ |

## Come scegliere

Un processo semplice:

1. **È una foto?** Usa JPEG con qualità 80, oppure WebP se il tuo pubblico lo supporta.
2. **Serve la trasparenza?** PNG per la massima compatibilità, WebP per file più piccoli.
3. **È un logo, un'icona o uno screenshot?** Usa PNG.
4. **Stai ottimizzando le prestazioni web?** Usa WebP con il JPEG come alternativa.

## Convertire tra formati

Se le tue immagini sono nel formato sbagliato, convertirle è semplice. [Il convertitore di immagini di ZapFile](/tools/convert-image) supporta questi formati ed elabora i file interamente nel browser. Nessun upload, nessuna attesa, nessun limite di dimensione.

Puoi anche usare [il compressore di immagini di ZapFile](/tools/compress-image) per regolare la qualità dopo la conversione e trovare il miglior equilibrio tra peso e nitidezza.

## Riepilogo

Non esiste un unico formato "migliore". Il JPEG eccelle nelle foto, il PNG è imbattibile per le grafiche nette o trasparenti e il WebP è il tuttofare moderno con i file più leggeri. Scegli il formato in base al contenuto e al pubblico e otterrai sempre il risultato migliore.`,

  "how-to-merge-pdf-files-online-free": `# Come unire file PDF online gratis

Raggruppare fatture, assemblare un report da capitoli separati o inviare documenti a un cliente in un unico pacchetto: unire PDF è una delle operazioni sui file più comuni. Ecco come farlo in fretta, gratis e senza rinunciare alla privacy.

## Perché unire i PDF?

Inviare più allegati PDF è scomodo. Chi li riceve deve scaricare e aprire ogni file separatamente e l'ordine può confondersi. Un unico documento è più facile da condividere e da leggere, e appare più professionale.

Situazioni tipiche:

- Raccogliere pagine scansionate in un unico documento
- Unire sezioni di un contratto provenienti da team diversi
- Preparare un portfolio o una candidatura con più allegati
- Creare un'unica dispensa da più presentazioni esportate in PDF

## Metodo 1: strumenti nel browser (i più veloci e riservati)

Gli strumenti PDF che funzionano nel browser elaborano i file direttamente sul tuo dispositivo. Niente viene caricato su un server, quindi i tuoi documenti restano completamente privati.

[Lo strumento Unisci PDF di ZapFile](/tools/merge-pdf) funziona così:

1. Apri lo strumento nel browser.
2. Trascina i file PDF nell'area di caricamento o fai clic per sceglierli.
3. Ordina i file trascinandoli.
4. Scarica il PDF unito.

L'intera operazione richiede pochi secondi, funziona con qualsiasi numero di file e, poiché tutto avviene in locale, non ci sono limiti di dimensione.

## Metodo 2: software desktop

Se lavori spesso offline, programmi come Adobe Acrobat, PDF-XChange Editor o il gratuito PDFsam possono unire i file. Lo svantaggio è che quasi tutti gli editor PDF completi sono a pagamento e le alternative gratuite possono essere scomode da installare e configurare.

## Metodo 3: riga di comando

Gli utenti tecnici possono unire PDF con Ghostscript o con la libreria Python PyPDF2 tramite script. Utile per l'automazione, ma eccessivo per un'operazione occasionale.

## La privacy conta

Molti strumenti PDF online famosi caricano i tuoi file su server remoti per elaborarli. I documenti passano quindi per infrastrutture di terzi e devi fidarti che vengano cancellati. Per documenti sensibili come contratti, dichiarazioni dei redditi o cartelle cliniche, è un problema concreto.

Gli strumenti nel browser eliminano del tutto questo rischio. Quando unisci PDF con [ZapFile](/), i tuoi file non lasciano mai il dispositivo. L'elaborazione avviene con JavaScript e WebAssembly nella scheda del browser. Chiusa la scheda, su nessun server resta nulla, perché nulla è mai stato inviato.

## Consigli per un'unione pulita

- **Controlla l'orientamento delle pagine** prima di unire. Se alcune sono orizzontali e altre verticali, il file finale può sembrare disordinato.
- **Elimina prima le pagine inutili.** Usa uno [strumento per dividere PDF](/tools/split-pdf) per tenere solo le pagine che ti servono.
- **Controlla il documento finale** scorrendolo per verificare l'ordine delle pagine.

## Riepilogo

Unire PDF non richiede software costosi né il caricamento di documenti sensibili su server sconosciuti. Uno strumento nel browser come [Unisci PDF di ZapFile](/tools/merge-pdf) dà risultati immediati, gestisce qualsiasi dimensione e mantiene privati i tuoi documenti. Apri lo strumento, trascina i file ed è fatta in pochi secondi.`,

  "best-free-online-file-tools-2025": `# I migliori strumenti online gratuiti per i file nel 2025

Il web è pieno di strumenti per i file, ma molti sono pieni di pubblicità, limitano molto la versione gratuita o chiedono di caricare documenti sensibili su server sconosciuti. Questa guida segnala gli strumenti davvero gratuiti, veloci e rispettosi della privacy.

## Cosa cercare in uno strumento online

Prima degli strumenti, ecco i criteri che contano:

- **Nessun account obbligatorio.** Se uno strumento ti costringe a registrarti per comprimere un'immagine, lascia perdere.
- **Nessun limite di dimensione.** I limiti artificiali servono a spingerti verso un piano a pagamento.
- **Elaborazione attenta alla privacy.** I migliori strumenti elaborano i file nel browser: non viene caricato nulla.
- **Interfaccia pulita.** Non dovresti dover superare pop-up e banner per lavorare.

## Strumenti PDF

### Unire, dividere e comprimere PDF

Il PDF è il formato universale dei documenti e lavorarci non dovrebbe richiedere software costosi. [ZapFile](/tools/merge-pdf) offre una suite completa di strumenti PDF che funzionano interamente nel browser:

- **Unisci PDF** – Combina più file in un documento, riordinandoli con il trascinamento.
- **Dividi PDF** – Estrai pagine o intervalli di pagine in file separati.
- **PDF in immagini** – Converti ogni pagina di un PDF in PNG o JPEG di alta qualità.

Tutto viene elaborato in locale, quindi puoi lavorare in sicurezza con contratti, documenti finanziari e altri file sensibili.

## Strumenti per le immagini

### Comprimere e convertire immagini

Ottimizzare le immagini è fondamentale per le prestazioni web e per risparmiare spazio. Cerca strumenti che ti lascino controllare la qualità invece di applicare una compressione uguale per tutto.

[Gli strumenti per immagini di ZapFile](/tools/compress-image) includono:

- **Compressore di immagini** – Riduci JPEG, PNG e WebP con qualità regolabile.
- **Convertitore di immagini** – Passa all'istante tra JPG, PNG, WebP e AVIF.
- **Ridimensionatore** – Imposta misure esatte o scala in percentuale.
- **Visualizzatore EXIF** – Visualizza, analizza e rimuovi i metadati delle foto direttamente nel browser.

### Creare e modificare

Oltre alla compressione, questi strumenti per immagini sono utili:

- **Creatore di collage** – Disponi più foto in griglie.
- **Generatore di meme** – Aggiungi testi alle immagini con carattere e posizione personalizzabili.
- **Generatore di favicon** – Crea favicon delle dimensioni corrette da qualsiasi immagine.

ZapFile offre tutto questo su [zapfile.xyz/tools](/tools).

## Strumenti di utilità

Tra quelli che fanno risparmiare più tempo ci sono le piccole utilità che si usano ogni tanto:

- **Generatore di codici QR** – Crea codici QR per link, testo o contatti. [Il generatore QR di ZapFile](/tools/qr-generator) ti permette di scegliere i colori e scaricare in più formati.
- **Generatore di password** – Crea password forti e casuali con lunghezza e tipi di caratteri configurabili.
- **Formattatore JSON** – Incolla un JSON disordinato e ottienilo formattato e validato all'istante.
- **Confronto testi** – Confronta due testi affiancati per individuare le differenze.
- **Contaparole** – Conta parole, caratteri e frasi e stima il tempo di lettura.

## Perché vincono gli strumenti nel browser

Nel 2025 la tendenza è chiara: elaborare nel browser. I browser moderni gestiscono compiti che prima richiedevano software desktop o server. I vantaggi sono evidenti:

- **Privacy** – I tuoi file non lasciano il dispositivo.
- **Velocità** – Nessuna attesa per upload e download.
- **Nessun limite** – Nessun tetto artificiale alle dimensioni.
- **Nessuna installazione** – Funziona su qualsiasi dispositivo con un browser moderno.

## Riepilogo

Non devi pagare abbonamenti né affidare i tuoi file a server qualsiasi. Strumenti come [ZapFile](/) offrono un kit completo e attento alla privacy per PDF, immagini, video, audio e utilità quotidiane. Aggiungi ai preferiti quelli che usi di più e smetti di perdere tempo con alternative piene di pubblicità.`,

  "why-browser-based-tools-are-more-private": `# Perché gli strumenti nel browser sono più riservati di quelli nel cloud

Quando usi un tipico strumento online per comprimere un'immagine o unire un PDF, il file viene caricato su un server remoto, elaborato lì e rimandato a te. Ti fidi che quel server tratti i tuoi dati con responsabilità, li cancelli subito e li protegga da violazioni. Gli strumenti nel browser eliminano del tutto questa necessità di fiducia.

## Come funzionano gli strumenti nel cloud

Il modello tradizionale segue questi passaggi:

1. Scegli un file sul tuo dispositivo.
2. Il file viene caricato via Internet sul server dello strumento.
3. Il server lo elabora (comprime, converte, unisce ecc.).
4. Il file elaborato torna al tuo browser per il download.
5. Il server dovrebbe cancellare il file, ma non hai modo di verificarlo.

In ogni fase il file si trova su un'infrastruttura che non controlli. Passa per router, bilanciatori di carico e sistemi di archiviazione gestiti da terzi. Anche con le migliori intenzioni, una violazione, un server configurato male o un dipendente scorretto potrebbero esporre i tuoi file.

## Come funzionano gli strumenti nel browser

Gli strumenti nel browser seguono un approccio completamente diverso:

1. Apri lo strumento nel browser.
2. Il suo codice (JavaScript e a volte WebAssembly) viene caricato nel browser.
3. Scegli un file; viene letto direttamente dal dispositivo nella memoria del browser.
4. L'elaborazione avviene interamente nella scheda.
5. Il risultato viene generato in locale e lo scarichi dal tuo dispositivo.

Il tuo file non tocca mai un server remoto. Non c'è nulla da intercettare, divulgare o cancellare, perché i dati non hanno mai lasciato il tuo computer.

## Cosa lo rende possibile

I browser moderni sono molto potenti. Le tecnologie che permettono l'elaborazione locale includono:

- **API Canvas** per modificare, ridimensionare e convertire immagini.
- **API Web Audio** per elaborare e convertire l'audio.
- **WebAssembly (WASM)**, che esegue codice compilato a una velocità quasi nativa. È così che strumenti come [ZapFile](/) elaborano PDF complessi e immagini interamente nel browser.
- **API File e Blob** per leggere e scrivere file senza server.

Queste API sono maturate molto negli ultimi anni e hanno colmato il divario di prestazioni con l'elaborazione lato server.

## Cosa significa per la privacy

Pensa ai file che si elaborano più spesso online:

- **Dichiarazioni dei redditi ed estratti conto** con numeri di conto e redditi.
- **Contratti e documenti legali** con clausole riservate.
- **Cartelle cliniche**, tutelate dalla legge.
- **Foto** con metadati EXIF che includono coordinate GPS e date.
- **Documenti aziendali** con informazioni riservate.

Caricare uno di questi in uno strumento cloud crea una copia sul server di qualcun altro. Con uno strumento nel browser come [ZapFile](/), questi file restano sul tuo dispositivo per tutto il processo. (L'unica eccezione su ZapFile è la modalità veloce facoltativa di Word, Excel, PowerPoint e HTML in PDF: converte sul nostro server ed elimina il file subito dopo. La modalità privata di questi strumenti converte invece nel tuo browser.)

## Come verificare che uno strumento lavori davvero nel browser

Non tutti gli strumenti che si dicono "privati" elaborano i file in locale. Ecco come verificarlo:

### Controlla l'attività di rete

Apri gli strumenti per sviluppatori del browser (F12), passa alla scheda Rete ed elabora un file. Se vedi grandi caricamenti verso il server dello strumento, il tuo file sta andando nel cloud.

### Prova offline

Uno strumento che lavora davvero nel browser funziona anche dopo aver tolto la connessione, una volta caricata la pagina. Disattiva il Wi-Fi ed elabora un file. Se funziona ancora, l'elaborazione è davvero locale.

### Leggi l'informativa sulla privacy

Gli strumenti legittimi nel browser dichiarano chiaramente che i file non vengono caricati. Diffida di frasi vaghe come "prendiamo sul serio la tua privacy" senza dettagli.

## I compromessi

Anche l'elaborazione nel browser ha i suoi limiti:

- **La velocità** dipende dal dispositivo. Uno smartphone poco potente sarà più lento di un server cloud con hardware dedicato.
- **I file molto grandi** possono mettere in difficoltà i dispositivi con poca memoria.
- **Le operazioni pesanti** come l'OCR o la rimozione dello sfondo con l'IA scaricano un modello o un motore la prima volta, e serve un momento. ZapFile esegue entrambe nel browser.

Per la grande maggioranza delle operazioni comuni, comunque, gli strumenti nel browser sono abbastanza veloci e il vantaggio per la privacy è notevole.

## Riepilogo

Scegliere strumenti nel browser invece di alternative nel cloud è uno dei passi più semplici per proteggere i tuoi file. Strumenti come [ZapFile](/) dimostrano che non serve sacrificare la comodità alla privacy. La prossima volta che comprimi un'immagine, unisci un PDF o converti un video, verifica se lo strumento elabora i file in locale. I tuoi dati lo meritano.`,

  "how-to-compress-pdf-on-iphone": `# Come comprimere un PDF su iPhone

L'iPhone gestisce PDF ovunque: allegati, download e scansioni. Quando un file è troppo grande da inviare o caricare, la soluzione è comprimerlo. Ecco un metodo pratico che rispetta la privacy.

## Perché le dimensioni contano

I PDF pesanti superano i limiti delle email, rallentano i caricamenti nei moduli e occupano spazio. La compressione riduce il peso mantenendo il documento leggibile.

## Comprimere nel browser

Safari può aprire **ZapFile** e altri strumenti che funzionano nel browser. Il tuo PDF resta sul dispositivo; l'elaborazione avviene in locale con JavaScript. Così eviti di caricare contratti sensibili su server sconosciuti.

## Passaggi

1. Apri [Comprimi PDF](/tools/pdf-compress) o uno strumento simile in Safari.
2. Scegli il PDF da File o da Foto.
3. Scarica il file più leggero.

## Consigli

- Per le scansioni, abbassa la risoluzione prima di esportare, se l'app lo consente.
- Se dopo la compressione il testo è sfocato, comprimi meno o dividi il documento.

## Riepilogo

Per **comprimere un PDF su iPhone**, preferisci strumenti che dichiarano chiaramente di elaborare i file nel browser. [ZapFile](/tools) offre la compressione e altri strumenti senza upload.`,

  "jpg-vs-webp-which-is-better": `# JPG o WebP: quale è meglio?

Il **JPEG** è da decenni il formato predefinito per le foto. Il **WebP** è il formato moderno di Google, con una compressione migliore e trasparenza facoltativa.

## Dimensione dei file

A parità di qualità visiva, il WebP produce spesso file **più piccoli del 25-35%** rispetto al JPEG. Questo migliora i Core Web Vitals e la SEO.

## Quando usare il JPEG

- Per la massima compatibilità con i sistemi più vecchi.
- Con fotocamere e smartphone che salvano in JPEG per impostazione predefinita.

## Quando usare il WebP

- Per siti e app destinati ai browser moderni.
- Quando vuoi file più leggeri senza perdite visibili.

## Convertire

Usa [il convertitore di immagini di ZapFile](/tools/convert-image) per trasformare PNG o JPEG in WebP nel browser.

## Riepilogo

Per la maggior parte dei progetti web **il WebP vince sulle dimensioni**; il **JPEG** resta l'alternativa per la compatibilità universale.`,

  "what-is-qr-code-how-to-create": `# Che cos'è un codice QR?

Un **codice QR** memorizza un testo – spesso un URL, una configurazione Wi-Fi o un contatto – in un motivo quadrato che i telefoni leggono con la fotocamera.

## Usi comuni

- Menu dei ristoranti e volantini
- Link per scaricare app
- Biglietti per eventi

## Creare un codice QR

Usa [il generatore di codici QR di ZapFile](/tools/qr-generator): scrivi l'URL o il testo e scarica l'immagine. Non serve un account; il codice viene generato nel browser.

## Riepilogo

I codici QR collegano carta e digitale. Per crearli gratis e in modo riservato, usa un generatore che non carichi i tuoi dati nel cloud.`,

  "how-to-merge-pdf-files-step-by-step": `# Come unire file PDF

L'unione raccoglie più PDF in un unico file: ideale per report, candidature e archivi.

## Passaggi

1. Raccogli tutti i PDF e decidi l'ordine.
2. Apri **Unisci PDF** nel browser.
3. Aggiungi i file in sequenza.
4. Scarica il PDF unito.

## Privacy

Scegli [strumenti per unire PDF](/tools/merge-pdf) che elaborano i file in locale, così contratti e documenti d'identità non lasciano mai il tuo computer.

## Riepilogo

Unire è semplice; la vera scelta riguarda la **fiducia**. Preferisci l'elaborazione nel browser.`,

  "how-to-split-pdf-extract-pages": `# Come dividere un PDF

Dividere ti permette di estrarre pagine o capitoli senza inviare l'intero file.

## Casi d'uso

- Inviare per email solo le pagine utili
- Rimuovere pagine vuote o sensibili

## Strumento

Con [Dividi PDF](/tools/split-pdf) scegli le pagine nel browser e scarichi file separati o uno ZIP.

## Riepilogo

Dividere è indispensabile in molti flussi di lavoro. Tieni i file in locale quando puoi.`,

  "free-pdf-tools-no-signup": `# Strumenti PDF gratuiti senza registrazione

Molti strumenti impongono un account per analisi o vendite. Gli strumenti **senza registrazione** evitano questi ostacoli e spesso vanno d'accordo con la privacy.

## Campanelli d'allarme

- Caricamento obbligatorio nel cloud anche per operazioni semplici
- Regole poco chiare sulla conservazione dei dati

## Buoni segnali

- Elaborazione nel browser
- Dichiarazioni sulla privacy chiare

## ZapFile

[ZapFile](/) offre decine di strumenti PDF e per immagini senza account. Quasi tutto funziona nel browser; solo la modalità veloce facoltativa da Office a PDF converte sul nostro server ed elimina il file subito dopo.

## Riepilogo

Puoi unire, dividere e comprimere PDF senza creare l'ennesima password.`,

  "compress-image-for-web-core-web-vitals": `# Immagini e Core Web Vitals

Il **Largest Contentful Paint (LCP)** dipende spesso dall'immagine principale della pagina. I file pesanti ritardano la visualizzazione e penalizzano il posizionamento.

## Strategia

1. Scegli il formato giusto (WebP/AVIF quando possibile).
2. Ridimensiona alle dimensioni di visualizzazione.
3. Comprimi con una qualità ragionevole.

## Strumento

Usa [Comprimi immagine](/tools/compress-image) con i cursori di qualità e dimensione massima.

## Riepilogo

Immagini più leggere migliorano SEO ed esperienza utente. Per i siti competitivi, comprimere non è facoltativo.`,

  "remove-pdf-metadata-privacy": `# Metadati e privacy

PDF e immagini possono contenere **metadati**: autore, data di creazione, coordinate GPS e modello della fotocamera.

## Rischi

Condividere file pubblicamente può rivelare più di quanto vorresti.

## Come difendersi

- Usa un **visualizzatore EXIF** per controllare i dati.
- Rimuovi i metadati prima di pubblicare, quando serve.

## Strumenti

Il [visualizzatore EXIF](/tools/exif-viewer) mostra i dati incorporati nelle immagini e salva una copia pulita senza di essi. Anche ricodificare un'immagine con [Comprimi immagine](/tools/compress-image) elimina i dati EXIF.

## Riepilogo

I metadati sono invisibili ma reali. Controllali prima di condividere.`,

  "jwt-tokens-explained-developers": `# JWT spiegato

Un **JWT** ha tre parti: intestazione, payload e firma, codificate in **base64url**.

## Decodifica

Usa il [decodificatore JWT](/tools/jwt-decoder) nel browser per controllare i claim. **Non** fidarti mai di un payload decodificato senza verificare la firma sul server.

## Riepilogo

I JWT sono comodi per le API; decodificarli è istruttivo, ma non è un'autorizzazione.`,

  "uuid-vs-nanoid": `# UUID o Nanoid?

Gli **UUID** sono identificatori a 128 bit con un formato testuale standard. **Nanoid** genera ID più corti e sicuri per gli URL, con una casualità simile.

## Generazione

Usa il [generatore UUID](/tools/uuid-generator) per creare rapidamente ID casuali per test e script.

## Riepilogo

UUID per l'interoperabilità, Nanoid quando vuoi stringhe più corte.`,

  "qr-code-scanner-vs-generator": `# Lettore o generatore?

- **Generatore**: crea un QR da un testo o da un URL.
- **Lettore**: legge un QR da un'immagine caricata o dalla fotocamera.

ZapFile offre un [generatore di codici QR](/tools/qr-generator) e un [lettore di codici QR](/tools/qr-scanner).

## Riepilogo

Usa lo strumento giusto per ogni direzione del tuo flusso di lavoro.`,

  "browser-based-vs-cloud-pdf-tools": `# PDF nel browser o nel cloud?

Gli strumenti **cloud** caricano il file su un server. Gli strumenti **nel browser** lo elaborano in locale dopo il caricamento della pagina.

## Quando vince il locale

- Documenti legali, medici o finanziari
- Connessione Internet scarsa o a consumo

## Quando vince il cloud

- OCR su larghissima scala
- Automazione intensa tramite API

## ZapFile

ZapFile è progettato perché i tuoi file restino sul tuo dispositivo: privacy fin dalla progettazione. Perfino l'OCR funziona nel browser. L'unica eccezione è la modalità veloce facoltativa di Word, Excel, PowerPoint e HTML in PDF, che converte sul nostro server ed elimina il file subito dopo.

## Riepilogo

Scegli il metodo in base alla riservatezza del documento.`,

  "resize-images-for-instagram-and-web": `# Ridimensionare le immagini per ogni piattaforma

Ogni piattaforma ha le sue raccomandazioni su **proporzioni** e **pixel**.

## Procedura

1. Conosci le misure di destinazione.
2. Blocca le proporzioni in [Ridimensiona immagine](/tools/resize-image).
3. Esporta nel formato giusto.

## Riepilogo

Le misure corrette evitano ritagli goffi e ingrandimenti sfocati.`,

  "json-formatter-why-developers-use-it": `# Formattatore JSON

Il **JSON** è ovunque nelle API. Il JSON minimizzato è difficile da leggere.

## Formattazione

Usa il [formattatore JSON](/tools/json-formatter) per indentare e trovare errori nel browser.

## Riepilogo

Formatta in locale quando le risposte contengono dati sensibili.`,

  "hash-generator-sha256-md5-explained": `# Basi dell'hashing

Un **hash** trasforma i dati in un'impronta di lunghezza fissa. **SHA-256** è molto diffuso; **MD5** è debole per la sicurezza.

## Casi d'uso

- Verificare l'integrità dei file
- Confrontare duplicati

## Strumento

Il [generatore di hash](/tools/hash-generator) calcola gli hash nel browser.

## Riepilogo

Usa SHA-256 per i nuovi progetti.`,

  "color-palette-from-image": `# Palette di colori dalle immagini

I designer spesso **abbinano** i colori dell'interfaccia alle fotografie.

## Procedura

Carica un'immagine in [Palette di colori](/tools/color-palette) e copia i codici HEX.

## Riepilogo

Palette rapide e coerenti senza contagocce manuale.`,

  "base-converter-decimal-hex-binary": `# Conversione tra basi numeriche

I programmatori passano di continuo tra **decimale**, **esadecimale**, **binario** e **ottale**.

## Strumento

Il [convertitore di basi](/tools/base-converter) converte all'istante nel browser.

## Riepilogo

Tieni a portata di mano un convertitore quando leggi log e dump di memoria.`,

  "css-minifier-faster-websites": `# Minimizzare il CSS

Il **CSS minimizzato** riduce i byte trasferiti. Conserva sempre gli originali nel controllo di versione.

## Strumento

Il [minimizzatore CSS](/tools/css-minifier) formatta e minimizza nel browser.

## Riepilogo

Abbina la minimizzazione a gzip o Brotli sul server.`,

  "password-generator-length-and-symbols": `# Password robuste nel 2026

La lunghezza conta più della complessità. **16 caratteri o più** con tipi diversi sono una buona base per gli account importanti.

## Casuale o passphrase?

- Le stringhe **casuali** resistono ai tentativi di indovinarle.
- Le **passphrase** (quattro parole a caso) possono essere più facili da digitare.

## Strumento

Usa il [generatore di password](/tools/password-generator) in locale nel browser.

## Riepilogo

Usa una password diversa per ogni sito e un gestore di password.`,

  "regex-tester-debugging-patterns": `# Testare le regex

Le espressioni regolari sono potenti e facili da sbagliare.

## Privacy

Usa il [tester regex](/tools/regex-tester) perché i log sensibili non lascino mai il tuo computer.

## Riepilogo

Prova in locale, poi incolla il pattern finale nel codice.`,

  "how-to-convert-png-to-jpg-online-free": `# Come convertire PNG in JPG online gratis

Convertire immagini tra formati è una delle operazioni più comuni. Che ti serva un file più piccolo da inviare per email, un formato accettato da un modulo web o semplicemente uniformare la tua raccolta di immagini, passare da PNG a JPG richiede pochi secondi con lo strumento giusto.

## PNG o JPG: quale usare?

**PNG** (Portable Network Graphics):
- Compressione senza perdita: nessun dato dei pixel viene scartato
- Supporta la trasparenza (canale alfa)
- Ideale per loghi, screenshot, grafiche e illustrazioni
- File più grandi del JPG per le foto

**JPG** (JPEG):
- Compressione con perdita: scarta alcuni dati per ridurre le dimensioni
- Nessuna trasparenza
- Ideale per foto e immagini complesse e colorate
- In genere più piccolo del 60-80% rispetto al PNG per le foto

**Quando convertire PNG → JPG**: quando il PNG è una foto o un'immagine complessa e non ti serve la trasparenza. Le dimensioni calano molto senza differenze visibili.

**Quando NON convertire**: se il PNG ha aree trasparenti o è un logo o un disegno al tratto. Il JPG non supporta la trasparenza e aggiunge uno sfondo bianco (o colorato). La compressione con perdita rovina anche i bordi netti delle grafiche.

## Come convertire PNG in JPG con ZapFile

1. Apri [il convertitore di immagini di ZapFile](/tools/convert-image)
2. Trascina il file PNG nell'area di caricamento (o fai clic per sceglierlo)
3. Seleziona **JPG** come formato di uscita
4. Avvia la conversione
5. Scarica il JPG

La conversione avviene interamente nel browser: il file non viene mai caricato su un server.

## Scegliere la qualità giusta

Quando converti in JPG, la qualità conta:

| Qualità | Dimensione | Uso |
|---------|-----------|----------|
| 90-100% | Grande | Archivio, stampa professionale |
| 75-85% | Media | Web, email, social |
| 50-70% | Piccola | Miniature, anteprime |

Per la maggior parte degli usi l'80% è ideale: file più piccoli del 70-80% rispetto al PNG originale, senza perdite visibili sullo schermo.

## Conversione in blocco

Se hai molti PNG, ZapFile supporta l'elaborazione in blocco. Carica più file insieme e scarica tutti i JPG con un clic.

## Tornare indietro: da JPG a PNG

Se in seguito ti serve di nuovo l'immagine in PNG (per esempio per aggiungere la trasparenza), usa lo stesso strumento e scegli PNG come uscita. La qualità persa nella conversione PNG→JPG non si recupera, quindi conserva il PNG originale se pensi di averne bisogno.

## Riepilogo

- Converti PNG in JPG quando ti serve un file più piccolo e non ti serve la trasparenza
- Mantieni il PNG per loghi, grafiche e tutto ciò che ha sfondo trasparente
- Usa una qualità del 75-85% per le immagini web
- [Il convertitore di immagini di ZapFile](/tools/convert-image) converte all'istante e in modo riservato nel browser`,

  "how-to-add-watermark-to-image-online": `# Come aggiungere una filigrana a un'immagine online (gratis)

La filigrana è il modo classico per proteggere foto e grafiche dall'uso non autorizzato. Che tu sia fotografo, designer o creator, aggiungere una filigrana scoraggia il furto e ti permette di continuare a condividere il tuo lavoro online.

## Perché mettere una filigrana alle immagini?

- **Diritto d'autore**: ti identifica chiaramente come autore
- **Visibilità del marchio**: il tuo nome o logo accompagna l'immagine quando viene condivisa
- **Deterrente**: la maggior parte dei bot che copiano immagini ignora i contenuti con filigrana evidente
- **Portfolio**: mostri il tuo lavoro senza cedere i file in piena risoluzione

## Come aggiungere una filigrana con ZapFile

1. Apri [lo strumento filigrana di ZapFile](/tools/watermark-image)
2. Carica l'immagine (JPG, PNG o WebP)
3. Scrivi il testo della filigrana (il tuo nome, il sito o una nota di copyright)
4. Regola posizione, opacità, dimensione e colore
5. Scarica il risultato

Nessun account richiesto. L'immagine viene elaborata in locale nel browser e non viene mai inviata a un server.

## Buone pratiche

### Posizione
Mettere la filigrana al **centro** dell'immagine la rende più difficile da ritagliare. L'angolo in basso a destra è più pulito, ma si elimina facilmente con un ritaglio.

### Opacità
È consigliata un'opacità del **30-50%**. Una filigrana totalmente opaca rovina l'immagine; troppo trasparente non si vede. Semitrasparente è leggibile senza coprire del tutto il tuo lavoro.

### Testo
Includi:
- Il tuo nome o quello dello studio
- L'indirizzo del sito
- Il simbolo © e l'anno: © 2026 TuoNome

### Colore
Un testo bianco con un'ombra leggera funziona sulla maggior parte delle immagini. Evita il nero: sparisce nelle zone scure. Scegli un colore che contrasti con i toni abituali delle tue foto.

## Filigrana in blocco

Se devi applicare la filigrana a molte immagini con le stesse impostazioni, ZapFile permette di caricarne più di una. Elabora l'intero servizio fotografico in un colpo solo.

## Cosa non può fare una filigrana

Le filigrane scoraggiano il furto occasionale ma non sono infallibili. Chi è determinato può rimuovere una filigrana semitrasparente. Per le immagini di valore, tutela anche i tuoi diritti e consegna solo anteprime a bassa risoluzione fino alla conferma del pagamento.

## Riepilogo

- Applica la filigrana alle foto prima di condividerle per proteggere il tuo lavoro
- Un testo semitrasparente al centro offre la protezione migliore
- [Lo strumento filigrana di ZapFile](/tools/watermark-image) è gratuito, riservato e funziona nel browser`,

  "how-to-crop-image-online-free": `# Come ritagliare un'immagine online gratis

Il ritaglio è uno dei ritocchi fotografici più basilari. Che tu voglia eliminare bordi che distraggono, comporre un quadrato perfetto per Instagram o ricavare un banner 16:9 per l'intestazione di un sito, un buono strumento online lo fa in pochi secondi.

## Come ritagliare con ZapFile

1. Apri [lo strumento Ritaglia immagine di ZapFile](/tools/crop-image)
2. Carica la foto (JPG, PNG o WebP)
3. Scegli una proporzione predefinita o trascina liberamente le maniglie
4. Scarica l'immagine ritagliata

Tutto avviene nel browser: nessun upload, nessuna registrazione.

## Proporzioni comuni e quando usarle

| Proporzione | Uso |
|-------|----------|
| 1:1 (quadrato) | Post di Instagram, foto profilo |
| 16:9 | Miniature YouTube, banner web, video widescreen |
| 4:3 | Stampa fotografica classica, presentazioni |
| 3:2 | Formato standard delle reflex, stampe 10×15 |
| 9:16 | Storie di Instagram, TikTok, Reels |
| 2:1 | Copertina di X (Twitter), stampe panoramiche |

## Consigli per ritagli migliori

### Regola dei terzi
Dividi l'inquadratura in una griglia 3×3. Posiziona gli occhi del soggetto (o il punto d'interesse) su una delle quattro intersezioni invece che al centro esatto. È per questo che quasi tutte le fotocamere mostrano una griglia.

### Ritaglia sull'azione
Elimina lo "spazio morto", le zone vuote senza interesse. Le inquadrature più strette risultano più dinamiche e intenzionali.

### Non esagerare
Ritagliare riduce la risoluzione. Se parti da un'immagine larga 2000 px e ne tieni il 20%, restano 400 px. Per il web spesso basta; per la stampa, attenzione.

### Centra le foto profilo
I social ritagliano la foto profilo a cerchio. Assicurati che la parte importante sia al centro prima di caricarla.

## Ritagliare o ridimensionare?

**Ritagliare** cambia la composizione eliminando parti dell'immagine. Le misure cambiano, ma i pixel rimasti mantengono la qualità originale.

**Ridimensionare** ingrandisce o riduce l'intera immagine. Non si elimina nulla, ma la nitidezza può calare se ingrandisci molto.

Spesso servono entrambi: prima ritagliare per la composizione giusta, poi ridimensionare alle misure finali.

## Riepilogo

- Usa le proporzioni predefinite per ritagliare bene per ogni piattaforma
- Applica la regola dei terzi per composizioni più efficaci
- [Lo strumento di ritaglio di ZapFile](/tools/crop-image) è gratuito e funziona interamente nel browser`,

  "image-to-pdf-converter-free-online": `# Convertire immagini in PDF: strumento online gratuito

Convertire un'immagine in PDF è un'esigenza frequente: inviare una foto come documento formale, raccogliere più immagini in un file per un'email o soddisfare un sistema che accetta solo PDF. Con lo strumento giusto bastano pochi secondi.

## Come convertire un'immagine in PDF con ZapFile

1. Apri [lo strumento Immagine in PDF di ZapFile](/tools/image-to-pdf)
2. Carica una o più immagini (JPG, PNG o WebP)
3. Regola l'ordine se ne unisci più di una
4. Crea il PDF
5. Scarica il PDF

Le immagini non lasciano mai il browser: nessun caricamento su server e nessun account.

## Più immagini in un solo PDF

Se hai un documento di più pagine fotografato in immagini separate (un contratto scansionato, una pila di scontrini, un album fotografico), puoi riunire tutto in un unico PDF in un solo passaggio:

1. Carica tutte le immagini insieme
2. Trascinale per riordinarle se serve
3. Converti: ogni immagine diventa una pagina del PDF

## Qualità delle immagini nel PDF

ZapFile mantiene le foto JPEG così come sono quando possibile e conserva le immagini PNG senza perdita; WebP e AVIF vengono inseriti come JPEG di alta qualità. Per PDF il più nitidi possibile:

- Parti dalla versione a risoluzione più alta dell'immagine
- Usa il PNG per screenshot o grafiche con testo (senza perdita)
- Usa un JPG di alta qualità (80% o più) per le foto

## Quando conviene convertire immagini in PDF?

- **Allegati email**: i PDF si aprono su qualsiasi dispositivo con la stessa impaginazione
- **Documenti ufficiali**: molti moduli e portali richiedono il PDF
- **Condividere una serie di foto**: un PDF è più semplice da condividere di una cartella di immagini
- **Impaginazioni pronte per la stampa**: il PDF è il formato preferito dalle tipografie

## Al contrario: da PDF a immagini

Se ti serve l'inverso – estrarre immagini da un PDF –, usa [lo strumento PDF in immagini di ZapFile](/tools/pdf-to-images). Converte ogni pagina in PNG o JPG di alta qualità.

## Riepilogo

- Converti singole immagini o uniscine diverse in un PDF
- La qualità si conserva: le foto JPEG restano intatte e il PNG resta senza perdita
- [Lo strumento Immagine in PDF di ZapFile](/tools/image-to-pdf) è gratuito, riservato e funziona nel browser`,

  "what-is-base64-encoding-and-how-to-use-it": `# Cos'è la codifica Base64 e come si usa

Il Base64 compare di continuo nello sviluppo web: immagini incorporate, token JWT, allegati email, risposte delle API. Capirlo rende più chiare molte attività.

## Cos'è il Base64?

Il Base64 è uno schema che codifica dati binari come testo. Rappresenta i byte usando solo 64 caratteri ASCII stampabili:

\`A–Z\`, \`a–z\`, \`0–9\`, \`+\`, \`/\` (e \`=\` come riempimento)

Il nome "Base64" deriva da questi 64 caratteri. Ogni 3 byte di dati binari diventano 4 caratteri Base64.

## Perché esiste il Base64?

Molti sistemi sono nati per gestire solo testo: email (SMTP), attributi HTML, campi JSON, URL. Quando bisogna inserire dati binari (un'immagine, un PDF, byte grezzi) in un sistema testuale, serve un modo sicuro di rappresentarli come testo.

Il Base64 risolve il problema codificando qualsiasi contenuto binario come una stringa di caratteri sicuri e stampabili, che i parser di testo non interpretano male.

## Usi comuni

### Incorporare immagini in HTML/CSS
Invece di collegare un file immagine:
\`\`\`html
<img src="data:image/png;base64,iVBORw0KGgo..." />
\`\`\`
È utile per piccole icone in esportazioni HTML a file singolo o nei modelli email in cui i link esterni possono essere bloccati.

### JSON Web Token (JWT)
Un JWT è formato da tre parti codificate in Base64, separate da punti:
\`Header.Payload.Signature\`

Intestazione e payload sono oggetti JSON codificati in Base64. Attenzione: codificati, non cifrati – chiunque può decodificarli. Usa [il decodificatore JWT di ZapFile](/tools/jwt-decoder) per esaminare un token.

### Allegati email (MIME)
Gli allegati sono file binari codificati in Base64 all'interno del protocollo testuale dell'email. Il client di posta se ne occupa automaticamente.

### Risposte delle API
Alcune API restituiscono dati binari (immagini, PDF) come stringhe Base64 dentro risposte JSON, perché il JSON non supporta nativamente i dati binari.

### Autenticazione HTTP Basic
L'intestazione \`Authorization: Basic\` codifica \`utente:password\` in Base64. Non è cifratura, solo codifica. Usa sempre HTTPS.

## Codificare e decodificare online

Usa [il codificatore/decodificatore Base64 di ZapFile](/tools/base64-encode) per:
- Codificare testo o file in Base64
- Decodificare il Base64 in testo o file da scaricare
- Visualizzare subito le data URL delle immagini incorporate

## Il Base64 comprime i dati?

No, il contrario. Il Base64 aumenta le dimensioni di circa il 33%. Tre byte diventano quattro caratteri. Serve alla compatibilità, non alla compressione.

## Base64 o Base64url?

Il Base64 standard usa \`+\` e \`/\`, che negli URL hanno un significato speciale. Il **Base64url** li sostituisce con \`-\` e \`_\` per rendere il risultato sicuro nei parametri URL e nei token JWT.

## Riepilogo

- Il Base64 rappresenta dati binari come testo ASCII stampabile per i sistemi testuali
- È comune in immagini incorporate, JWT, allegati email e risposte delle API
- Aumenta le dimensioni di circa il 33%: serve alla compatibilità, non alla compressione
- Decodifica subito un JWT o una stringa Base64 con [gli strumenti di ZapFile](/tools)`,

  "how-to-create-favicon-for-website": `# Come creare una favicon per il tuo sito (tutte le dimensioni)

La favicon è la piccola icona che compare nelle schede del browser, nei preferiti e nelle scorciatoie della schermata Home. Per farla bene servono più dimensioni collegate correttamente nell'HTML, ma il procedimento è semplice una volta noti i requisiti.

## Che cos'è una favicon?

"Favicon" sta per "favorites icon". In origine era un'icona di 16×16 pixel per i preferiti di Internet Explorer. Browser e dispositivi moderni richiedono molte dimensioni:

| File | Dimensione | Uso |
|------|------|----------|
| favicon.ico | 16×16, 32×32 | Schede del browser, barra delle applicazioni di Windows |
| favicon-16x16.png | 16×16 | Icone piccole delle schede |
| favicon-32x32.png | 32×32 | Schede standard |
| apple-touch-icon.png | 180×180 | Scorciatoia nella Home di iOS |
| android-chrome-192x192.png | 192×192 | Schermata Home di Android |
| android-chrome-512x512.png | 512×512 | Schermata di avvio Android, PWA |

## Generare tutte le dimensioni con ZapFile

1. Apri [il generatore di favicon di ZapFile](/tools/favicon-generator)
2. Carica un'immagine quadrata (meglio PNG, almeno 512×512 pixel)
3. Genera le dimensioni
4. Scarica lo ZIP con tutte le dimensioni e il file \`.ico\`

## Aggiungere le favicon al sito

Aggiungi questi tag nella sezione \`<head>\` del tuo HTML:

\`\`\`html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
\`\`\`

Per le Progressive Web App (PWA) aggiungi anche un file \`site.webmanifest\`:

\`\`\`json
{
  "name": "Your App",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
\`\`\`

## Progettare una buona favicon

### Mantienila semplice
A 16×16 pixel i loghi complessi diventano irriconoscibili. Usa l'iniziale del marchio, un'icona semplificata o un blocco di colore pieno.

### Contrasto elevato
La favicon appare su interfacce chiare e scure. Provale entrambe. Uno sfondo pieno nel colore del marchio con un simbolo bianco funziona in entrambe le modalità.

### Parti da 512×512
Genera dalla sorgente a risoluzione più alta. ZapFile riduce in modo pulito da 512 px, mentre ingrandire da 16 px dà risultati sfocati.

### Favicon SVG (browser moderni)
I browser basati su Chromium supportano le favicon SVG, perfette a qualsiasi dimensione. Aggiungila insieme alle versioni PNG/ICO:
\`\`\`html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
\`\`\`

## Errori comuni

- **Usare un'immagine sorgente a bassa risoluzione**: parti sempre da 512 px o più
- **Fornire solo il \`.ico\`**: i dispositivi moderni hanno bisogno delle dimensioni PNG; con il solo ICO, iOS e Android restano senza un'icona adeguata
- **Dimenticare la cache**: dopo un aggiornamento, i browser tengono in cache la vecchia favicon con insistenza. Aggiungi un parametro di versione (\`favicon.ico?v=2\`) durante lo sviluppo

## Riepilogo

- Le favicon richiedono più dimensioni per browser, iOS, Android e PWA
- Parti da un PNG quadrato 512×512 e genera tutte le dimensioni in una volta
- [Il generatore di favicon di ZapFile](/tools/favicon-generator) crea tutte le dimensioni necessarie e il file ICO in pochi secondi`,

  "how-to-convert-webp-to-jpg-or-png": `# Come convertire WebP in JPG o PNG online

Il WebP è un formato d'immagine moderno di Google che produce file molto più piccoli di JPG o PNG a parità di qualità. Non tutte le applicazioni però lo accettano: vecchi software desktop, alcuni servizi di stampa e certi CMS non lo supportano. Ecco come convertirlo in fretta.

## Come convertire WebP in JPG o PNG con ZapFile

1. Apri [il convertitore di immagini di ZapFile](/tools/convert-image)
2. Carica il file WebP
3. Seleziona **JPG** o **PNG** come formato di uscita
4. Converti e scarica

Nessun caricamento su server: la conversione avviene nel browser.

## Meglio JPG o PNG?

Scegli in base al contenuto dell'immagine WebP:

**Converti WebP → JPG quando:**
- L'immagine è una foto o una scena complessa con molti colori
- Ti serve il file più piccolo possibile
- Non serve la trasparenza

**Converti WebP → PNG quando:**
- L'immagine ha uno sfondo trasparente
- È un logo, uno screenshot o una grafica con testo
- Ti serve una qualità senza perdita (nessun dato scartato)

## Convertire il WebP riduce la qualità?

**WebP → JPG**: comporta una nuova compressione con perdita. Ci sarà una piccola perdita aggiuntiva rispetto al WebP originale, soprattutto con qualità basse. Usa l'85% o più per ridurla al minimo.

**WebP → PNG**: è una conversione senza perdita. Nessun dato viene scartato. Il PNG riproduce fedelmente ogni pixel del WebP, ma il file sarà più grande.

## Perché i siti usano il WebP

Le immagini WebP sono in genere:
- Più piccole del 25-35% rispetto al JPG a parità di qualità
- Più piccole del 20-30% rispetto al PNG per contenuti senza perdita

Questo fa una differenza misurabile su tempi di caricamento e Core Web Vitals. Se stai creando un sito, il WebP è la scelta giusta per i browser moderni.

## Convertire più WebP insieme

ZapFile converte più file WebP contemporaneamente. Carica i file, scegli il formato di destinazione e scarica tutte le immagini convertite insieme.

## Riepilogo

- Converti WebP in JPG per le foto che non richiedono trasparenza
- Converti WebP in PNG per grafiche, loghi o qualsiasi cosa con aree trasparenti
- [Il convertitore di immagini di ZapFile](/tools/convert-image) converte lotti di WebP all'istante nel browser`,

  "pdf-vs-word-which-format-to-use": `# PDF o Word: quale formato usare?

PDF e Word sono i due formati di documento più usati al lavoro e la scelta giusta dipende interamente da cosa devi fare con il file. Ecco un confronto chiaro.

## Usa il PDF quando…

### Vuoi una formattazione fissa
Un PDF appare identico su ogni dispositivo, sistema operativo e stampante. Caratteri, margini e impaginazione sono bloccati. Un documento Word, invece, può impaginarsi in modo diverso a seconda della versione di Word, dei caratteri installati e delle dimensioni dello schermo.

### Invii un documento definitivo
Contratti, fatture, report, curriculum e proposte dovrebbero essere PDF. Il destinatario può leggerli, stamparli e firmarli senza modificare per sbaglio il contenuto.

### Devi stampare
Il PDF è lo standard della stampa. La maggior parte delle tipografie si aspetta PDF con caratteri incorporati e abbondanze definite correttamente.

### Ti serve un'ampia compatibilità
Ogni sistema, browser e dispositivo mobile apre un PDF senza installare nulla. Non tutti hanno Microsoft Word.

### Ti servono firme o campi modulo
Il PDF supporta nativamente moduli interattivi, firme digitali e annotazioni. Anche Word ha campi modulo, ma il comportamento cambia da un'applicazione all'altra.

## Usa Word (.docx) quando…

### Tu o altri dovete modificarlo
I documenti Word sono fatti per essere modificati. Se collaborate a una bozza, se passa tra più revisori o se compili un modello, Word è il formato giusto.

### Ti servono revisioni e commenti
Le funzioni Revisioni e Commenti di Word sono molto più complete delle annotazioni PDF per la modifica collaborativa.

### Usi un modello
La maggior parte dei modelli aziendali (carta intestata, report, proposte) viene distribuita in Word perché pensata per essere compilata.

## Convertire tra formati

### Word → PDF
Usa "Salva come PDF" in Microsoft Word o LibreOffice, oppure [lo strumento Word in PDF di ZapFile](/tools/word-to-pdf) se non hai Word installato. Caratteri, tabelle e interruzioni di pagina vengono mantenuti.

### PDF → immagini
Ti serve una pagina PDF come immagine? Usa [lo strumento PDF in immagini di ZapFile](/tools/pdf-to-images) per esportare qualsiasi pagina in PNG o JPG.

### PDF → Word
Il PDF non è stato pensato per essere modificato, quindi tornare a Word è più difficile. [Lo strumento PDF in Word di ZapFile](/tools/pdf-to-word) trasforma i documenti normali in testo modificabile con titoli, elenchi e tabelle e mantiene l'impaginazione esatta delle pagine grafiche (brochure, offerte). Controlla sempre il risultato nei documenti complessi.

## Promemoria rapido

| Attività | Formato |
|------|-----|
| Report finale, fattura, curriculum | PDF |
| Bozza da rivedere e modificare | Word |
| Stampa in tipografia | PDF |
| Modello da far compilare ad altri | Word |
| Invio a chi non ha Word | PDF |
| Contratto, documento legale | PDF |
| Bozza interna in lavorazione | Word |

## Proteggere i file PDF

Se invii un PDF che non deve essere inoltrato o stampato, usa [lo strumento Proteggi PDF di ZapFile](/tools/pdf-encrypt) per aggiungere una password e limitare i permessi.

## Unire più PDF

Quando raccogli moduli firmati o componi un report da più PDF, usa [lo strumento Unisci PDF di ZapFile](/tools/merge-pdf) per riunirli in un unico documento.

## Riepilogo

- Usa il PDF per documenti finali formattati che devono apparire uguali ovunque
- Usa Word per documenti da modificare, lavorare in gruppo o compilare
- Converti con lo strumento giusto e controlla il risultato quando passi dal PDF a Word`,
};

export default posts;
