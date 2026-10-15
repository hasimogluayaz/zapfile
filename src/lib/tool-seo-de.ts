/**
 * Search titles and descriptions for the German tool pages (`/de/...`).
 * Same rules as `tool-seo-tr.ts`: titles under ~60 characters, descriptions
 * under ~160, and Office → PDF pages never promise "no upload".
 */
export const toolSeoDe: Record<string, { title: string; description: string }> = {
  "merge-pdf": {
    title: "PDF zusammenfügen – kostenlos online",
    description:
      "Mehrere PDF-Dateien in Sekunden zu einem Dokument zusammenfügen. Per Drag & Drop sortieren. Kostenlos, ohne Anmeldung, Ihre Dateien bleiben auf Ihrem Gerät.",
  },
  "split-pdf": {
    title: "PDF teilen – Seiten kostenlos trennen",
    description:
      "PDF in einzelne Seiten aufteilen oder ausgewählte Seiten extrahieren, als separate Dateien oder ZIP. Kostenlos, ohne Anmeldung, direkt im Browser.",
  },
  "pdf-to-images": {
    title: "PDF in JPG umwandeln – kostenlos online",
    description:
      "PDF-Seiten in hochwertige JPG- oder PNG-Bilder umwandeln und alle als ZIP herunterladen. Kostenlos, schnell und ohne Upload.",
  },
  "organize-pdf": {
    title: "PDF-Seiten sortieren, löschen und drehen",
    description:
      "PDF-Seiten per Drag & Drop neu anordnen, löschen, drehen, leere Seiten einfügen oder Seiten aus mehreren PDFs kombinieren. Kostenlos und ohne Upload.",
  },
  "rotate-pdf": {
    title: "PDF drehen – Seiten kostenlos rotieren",
    description:
      "PDF-Seiten um 90°, 180° oder 270° drehen, einzeln oder alle auf einmal, und dauerhaft speichern. Kostenlos und direkt im Browser.",
  },
  "fill-pdf": {
    title: "PDF-Formular ausfüllen – online & kostenlos",
    description:
      "Ausfüllbare PDF-Formulare im Browser ausfüllen: Textfelder, Kontrollkästchen, Auswahllisten. Optional reduziert speichern. Kostenlos, ohne Upload.",
  },
  "sign-pdf": {
    title: "PDF unterschreiben – kostenlos online",
    description:
      "Unterschrift zeichnen, tippen oder als Bild einfügen, an die richtige Stelle ziehen, Name und Datum ergänzen. Kostenlos, ohne Anmeldung, ohne Upload.",
  },
  "watermark-pdf": {
    title: "Wasserzeichen in PDF einfügen – Text oder Logo",
    description:
      "Text- oder Bild-Wasserzeichen in PDF-Seiten einfügen: VERTRAULICH-Stempel, Logos, Kachelmuster, beliebiger Winkel und Deckkraft. Kostenlos, ohne Upload.",
  },
  "crop-pdf": {
    title: "PDF zuschneiden – Ränder entfernen",
    description:
      "PDF-Seiten zuschneiden: Bereich wählen, auf alle oder einzelne Seiten anwenden oder weiße Ränder automatisch entfernen. Kostenlos, ohne Upload.",
  },
  "compare-pdf": {
    title: "PDF vergleichen – Unterschiede finden",
    description:
      "Zwei PDF-Versionen vergleichen: geänderte, hinzugefügte und gelöschte Wörter werden nebeneinander markiert, mit Liste aller Änderungen. Kostenlos.",
  },
  "pdf-page-numbers": {
    title: "Seitenzahlen in PDF einfügen – kostenlos",
    description:
      "Seitenzahlen in PDF-Dokumente einfügen, Position und Format wählen. Kostenlos, ohne Anmeldung und direkt im Browser.",
  },
  "compress-image": {
    title: "Bild komprimieren – Dateigröße verkleinern",
    description:
      "JPG-, PNG- und WebP-Bilder mit einstellbarer Qualität verkleinern, auch mehrere auf einmal. Kostenlos, Ihre Bilder werden nicht hochgeladen.",
  },
  "resize-image": {
    title: "Bildgröße ändern – Pixel anpassen",
    description:
      "Bilder auf jede gewünschte Pixelgröße skalieren, Seitenverhältnis sperren. Kostenlos, privat und direkt im Browser.",
  },
  "convert-image": {
    title: "Bildformat umwandeln – JPG, PNG, WebP, AVIF",
    description:
      "Bilder zwischen JPG, PNG, WebP und AVIF umwandeln, auch mehrere auf einmal. Kostenlos, schnell, Ihre Dateien bleiben auf Ihrem Gerät.",
  },
  "crop-image": {
    title: "Bild zuschneiden – online & kostenlos",
    description:
      "Fotos frei oder mit Seitenverhältnissen wie 1:1, 16:9 und 4:3 zuschneiden. Kostenlos, ohne Anmeldung, direkt im Browser.",
  },
  "rotate-image": {
    title: "Bild drehen und spiegeln – online",
    description:
      "Bilder um 90°, 180° oder 270° drehen oder horizontal und vertikal spiegeln. Kostenlos, Ihr Bild wird nicht hochgeladen.",
  },
  "watermark-image": {
    title: "Wasserzeichen auf Bild – kostenlos online",
    description:
      "Text-Wasserzeichen auf Fotos setzen, Position, Deckkraft, Größe und Farbe einstellen. Kostenlos, Ihre Bilder werden nicht hochgeladen.",
  },
  "image-to-pdf": {
    title: "JPG in PDF umwandeln – Bilder zu PDF",
    description:
      "JPG-, PNG- oder WebP-Bilder in ein PDF umwandeln und mehrere Bilder zu einer Datei kombinieren. Kostenlos, ohne Anmeldung, ohne Upload.",
  },
  "blur-image": {
    title: "Bild verpixeln – Gesichter unkenntlich machen",
    description:
      "Bereiche in Fotos verpixeln oder weichzeichnen, um Gesichter, Kennzeichen und persönliche Daten zu verbergen. Kostenlos und privat.",
  },
  "favicon-generator": {
    title: "Favicon Generator – aus einem Bild",
    description:
      "Alle Favicon-Größen (16×16 bis 512×512) aus einem Bild erstellen und als ZIP herunterladen. Kostenlos und direkt im Browser.",
  },
  "exif-viewer": {
    title: "EXIF-Daten anzeigen und entfernen",
    description:
      "EXIF-Metadaten von Fotos anzeigen und entfernen: Kamera, Aufnahmeeinstellungen und GPS-Standort. Kostenlos, Ihr Foto wird nicht hochgeladen.",
  },
  "image-collage": {
    title: "Collage erstellen – kostenlos online",
    description:
      "Fotocollagen mit Raster- und Mosaik-Layouts in 1:1, 4:5 und 9:16 erstellen, bis 4096 px. Kostenlos, Ihre Fotos werden nicht hochgeladen.",
  },
  "meme-generator": {
    title: "Meme Generator – eigene Memes erstellen",
    description:
      "Memes aus eigenen Bildern erstellen: klassischer Meme-Text, Bildunterschriften, Schatten. In voller Auflösung herunterladen, ohne Wasserzeichen.",
  },
  "image-to-base64": {
    title: "Bild in Base64 umwandeln – Data-URI",
    description:
      "Bilder in Base64-Strings oder Data-URIs zum Einbetten in HTML und CSS umwandeln. Kostenlos, privat und direkt im Browser.",
  },
  "qr-generator": {
    title: "QR-Code Generator – kostenlos & unbegrenzt",
    description:
      "QR-Codes für Links, Text oder Telefonnummern erstellen, mit Farben und Logo, als PNG oder SVG herunterladen. Kostenlos und ohne Ablaufdatum.",
  },
  "svg-to-png": {
    title: "SVG in PNG umwandeln – kostenlos",
    description:
      "SVG-Dateien in jeder gewünschten Größe in hochwertige PNG-Bilder umwandeln. Kostenlos, Ihre Datei wird nicht hochgeladen.",
  },
  "base64-encode": {
    title: "Base64 kodieren und dekodieren – online",
    description:
      "Text oder Dateien in Base64 kodieren oder Base64 dekodieren. Kostenlos, schnell und vollständig im Browser.",
  },
  "color-picker": {
    title: "Farbwähler – HEX, RGB, HSL, CMYK",
    description:
      "Farben vom Bildschirm oder aus Bildern wählen, in HEX, RGB, HSL, OKLCH und CMYK umrechnen und WCAG-Kontrast prüfen. Kostenlos.",
  },
  "json-formatter": {
    title: "JSON formatieren und validieren – online",
    description:
      "JSON lesbar formatieren, minifizieren und auf Fehler prüfen. Kostenlos, Ihre Daten verlassen den Browser nicht.",
  },
  "hash-generator": {
    title: "Hash Generator – SHA-256, SHA-512, SHA-1",
    description:
      "SHA-1-, SHA-256-, SHA-384- und SHA-512-Hashes aus Text oder Dateien erzeugen und Dateien prüfen. Kostenlos und privat.",
  },
  "word-counter": {
    title: "Wörter zählen – Zeichenzähler online",
    description:
      "Wörter, Zeichen, Sätze und Absätze zählen, mit Limits für X, Instagram, LinkedIn und SMS sowie Lesezeit. Kostenlos und privat.",
  },
  "password-generator": {
    title: "Passwort Generator – sicher & zufällig",
    description:
      "Starke, zufällige Passwörter erzeugen und die Stärke eigener Passwörter prüfen. Alles läuft lokal im Browser, nichts wird gesendet.",
  },
  "diff-checker": {
    title: "Texte vergleichen – Unterschiede finden",
    description:
      "Zwei Texte nebeneinander vergleichen, hinzugefügte und gelöschte Stellen werden markiert. Kostenloses Online-Tool für Text und Code.",
  },
  "markdown-editor": {
    title: "Markdown Editor mit Live-Vorschau",
    description:
      "Markdown schreiben, Live-Vorschau sehen und als HTML exportieren. Kostenloser Online-Editor, Ihr Text wird nicht hochgeladen.",
  },
  "url-encoder": {
    title: "URL kodieren und dekodieren – online",
    description:
      "URLs und URL-Komponenten sofort kodieren oder dekodieren. Kostenlos und direkt im Browser.",
  },
  "timestamp-converter": {
    title: "Unix-Zeitstempel umrechnen – Datum",
    description:
      "Unix-Zeitstempel in lesbare Daten umrechnen und umgekehrt, in mehreren Formaten. Kostenloses Online-Tool für Entwickler.",
  },
  "lorem-ipsum": {
    title: "Lorem Ipsum Generator – Blindtext",
    description:
      "Lorem-Ipsum-Blindtext erzeugen: Absätze, Sätze oder Wörter wählen und sofort kopieren. Kostenlos.",
  },
  "regex-tester": {
    title: "Regex Tester – reguläre Ausdrücke testen",
    description:
      "Reguläre Ausdrücke live testen, mit Hervorhebung der Treffer und Unterstützung für Flags. Kostenloses Online-Regex-Tool.",
  },
  "csv-json": {
    title: "CSV in JSON umwandeln – und zurück",
    description:
      "CSV in JSON und JSON in CSV umwandeln, CSV als sortierbare Tabelle ansehen. Kostenlos, Ihre Daten werden nicht hochgeladen.",
  },
  "xml-formatter": {
    title: "XML formatieren und validieren – online",
    description:
      "XML lesbar formatieren und auf Fehler prüfen. Kostenlos, privat und direkt im Browser.",
  },
  "yaml-formatter": {
    title: "YAML formatieren und in JSON umwandeln",
    description:
      "YAML formatieren, validieren und in JSON umwandeln. Kostenloses Online-Tool, Ihre Daten werden nicht hochgeladen.",
  },
  "unit-converter": {
    title: "Einheiten umrechnen – px, rem, cm, Zoll",
    description:
      "CSS-Einheiten (px, rem, em, vw) und Längen (cm, mm, Zoll) sofort umrechnen. Kostenloser Online-Einheitenrechner.",
  },
  "qr-scanner": {
    title: "QR-Code Scanner – aus Bild oder Kamera",
    description:
      "QR-Codes mit der Kamera oder aus einem Bild auslesen und den Inhalt kopieren. Kostenlos, ohne App, ohne Upload.",
  },
  "jwt-decoder": {
    title: "JWT Decoder – Token-Inhalt anzeigen",
    description:
      "JWT-Token dekodieren und Header, Payload und Signatur prüfen. Ihr Token verlässt den Browser nicht. Kostenlos.",
  },
  "uuid-generator": {
    title: "UUID Generator – v4 und Nano ID",
    description:
      "UUID v4 (GUID) und Nano IDs in großen Mengen erzeugen, einzeln oder alle kopieren. Kostenlos und vollständig im Browser.",
  },
  "css-minifier": {
    title: "CSS minifizieren – online & kostenlos",
    description:
      "CSS minifizieren, um die Dateigröße zu verringern, oder CSS lesbar formatieren. Kostenlos, Ihr Code wird nicht hochgeladen.",
  },
  "base-converter": {
    title: "Zahlensysteme umrechnen – Binär, Hex",
    description:
      "Zahlen zwischen Dezimal-, Hexadezimal-, Binär- und Oktalsystem sofort umrechnen. Kostenlos und direkt im Browser.",
  },
  "color-palette": {
    title: "Farbpalette erstellen – aus Bild",
    description:
      "Dominante Farben aus einem Bild extrahieren oder harmonische Farbpaletten erzeugen und HEX-Codes kopieren. Kostenlos.",
  },
  "color-contrast": {
    title: "Farbkontrast prüfen – WCAG AA & AAA",
    description:
      "Vorder- und Hintergrundfarben auf WCAG-AA- und AAA-Konformität prüfen. Sofortiges Ergebnis im Browser, kostenlos.",
  },
  "text-case": {
    title: "Groß- und Kleinschreibung umwandeln",
    description:
      "Text in GROSSBUCHSTABEN, kleinbuchstaben, Title Case, camelCase, snake_case und mehr umwandeln. Kostenlos und sofort.",
  },
  "background-remover": {
    title: "Hintergrund entfernen – kostenlos mit KI",
    description:
      "Bildhintergrund mit KI automatisch entfernen, saubere Haarkanten, transparentes PNG in voller Auflösung. Kostenlos, ohne Upload.",
  },
  "color-dropper": {
    title: "Farbe aus Bild auslesen – Pipette",
    description:
      "Ein Bild öffnen, auf einen Pixel klicken und die Farbe als HEX, RGB oder HSL kopieren. Kostenlos, Ihr Bild wird nicht hochgeladen.",
  },
  "photo-filter": {
    title: "Foto-Filter – online Effekte anwenden",
    description:
      "Vintage-, Schwarzweiß-, Sepia- und weitere Filter auf Fotos anwenden. Kostenlos, Ihr Foto wird nicht hochgeladen.",
  },
  "redact-pdf": {
    title: "PDF schwärzen – Daten dauerhaft entfernen",
    description:
      "Persönliche Daten in PDFs dauerhaft schwärzen: Wörter, E-Mails, Telefonnummern, IBANs suchen oder Bereiche markieren. Text wird wirklich entfernt.",
  },
  "pdf-encrypt": {
    title: "PDF mit Passwort schützen – AES-256",
    description:
      "PDF mit AES-256 verschlüsseln, Drucken und Kopieren einschränken oder ein bekanntes Passwort entfernen. Kostenlos, ohne Upload.",
  },
  "html-to-pdf": {
    title: "HTML in PDF umwandeln – kostenlos",
    description:
      "Gespeicherte Webseiten und HTML-Dateien in Sekunden in PDF umwandeln. Dateien werden direkt danach gelöscht oder privat im Browser umgewandelt.",
  },
  "pdf-to-word": {
    title: "PDF in Word umwandeln – kostenlos (DOCX)",
    description:
      "PDF in bearbeitbares Word (DOCX) umwandeln: Überschriften, Listen, Tabellen, Bilder und Layout bleiben erhalten. Kostenlos, ohne Upload.",
  },
  "pdf-to-excel": {
    title: "PDF in Excel umwandeln – Tabellen (XLSX)",
    description:
      "PDF-Tabellen in Excel (XLSX) umwandeln, mit echten Zahlen und verbundenen Zellen. Kostenlos, privat, ohne Upload.",
  },
  "pdf-to-markdown": {
    title: "PDF in Markdown umwandeln – kostenlos",
    description:
      "PDF in Markdown umwandeln: Überschriften, Listen, Tabellen und Bilder bleiben erhalten. Ideal für Dokus, Notizen und KI-Prompts. Ohne Upload.",
  },
  "pdf-to-powerpoint": {
    title: "PDF in PowerPoint umwandeln – PPTX",
    description:
      "Jede PDF-Seite wird eine Folie mit bearbeitbaren Textfeldern, Bildern und Formen. Kostenlos, ohne Upload, ohne Wasserzeichen.",
  },
  "word-to-pdf": {
    title: "Word in PDF umwandeln – kostenlos online",
    description:
      "DOCX, DOC, ODT und RTF in Sekunden in PDF umwandeln, Schriften, Tabellen und Bilder bleiben erhalten. Dateien werden direkt danach gelöscht.",
  },
  "excel-to-pdf": {
    title: "Excel in PDF umwandeln – XLSX zu PDF",
    description:
      "XLSX, XLS, ODS und CSV in PDF umwandeln: alle Blätter, berechnete Formeln, Zahlenformate und Druckbereiche. Dateien werden direkt danach gelöscht.",
  },
  "powerpoint-to-pdf": {
    title: "PowerPoint in PDF umwandeln – PPTX",
    description:
      "PPTX, PPT und ODP in PDF umwandeln, eine Seite pro Folie mit Formen, Bildern und Designs. Ohne Wasserzeichen; Dateien werden direkt danach gelöscht.",
  },
  "ocr-pdf": {
    title: "PDF OCR – gescanntes PDF durchsuchbar",
    description:
      "Gescannte PDFs und Fotos in durchsuchbare PDFs umwandeln, mit unsichtbarer Textebene, auf Deutsch, Englisch und vielen weiteren Sprachen. Ohne Upload.",
  },
  "pdf-text-extractor": {
    title: "Text aus PDF extrahieren – kostenlos",
    description:
      "Den gesamten Text aus PDFs extrahieren und kopieren, Spalten und Lesereihenfolge bleiben erhalten. Kostenlos, ohne Upload.",
  },
  "repair-pdf": {
    title: "PDF reparieren – beschädigte Datei retten",
    description:
      "Beschädigte oder defekte PDFs reparieren: Die Dateistruktur wird neu aufgebaut, nicht rettbare Seiten als Bilder wiederhergestellt. Ohne Upload.",
  },
  "pdf-compress": {
    title: "PDF verkleinern – Dateigröße reduzieren",
    description:
      "PDF-Dateigröße durch Neukomprimierung der eingebetteten Bilder verringern, ideal für E-Mail-Anhänge. Kostenlos, ohne Upload.",
  },
  "video-to-gif": {
    title: "Video in GIF umwandeln – kostenlos",
    description:
      "Kurze Videoclips (MP4, WebM, MOV) in animierte GIFs umwandeln. Kostenlos, ohne Wasserzeichen, direkt im Browser.",
  },
  "audio-recorder": {
    title: "Audio aufnehmen – online Sprachrekorder",
    description:
      "Mit dem Mikrofon im Browser aufnehmen und als MP3 oder WAV herunterladen. Kostenlos, ohne Anmeldung und ohne Installation.",
  },
  "text-to-speech": {
    title: "Text vorlesen lassen – Sprachausgabe",
    description:
      "Text mit natürlicher Stimme vorlesen lassen, auf Deutsch, Englisch und vielen weiteren Sprachen. Kostenlos, ohne Anmeldung.",
  },
};
