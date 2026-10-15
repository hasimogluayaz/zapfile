/**
 * Search titles and descriptions for the French tool pages (`/fr/...`).
 * Same rules as `tool-seo-tr.ts`: titles under ~60 characters, descriptions
 * under ~160, and Office → PDF pages never promise "no upload".
 */
export const toolSeoFr: Record<string, { title: string; description: string }> = {
  "merge-pdf": {
    title: "Fusionner PDF – gratuit en ligne",
    description:
      "Fusionnez plusieurs fichiers PDF en un seul document en quelques secondes. Glissez-déposez pour réordonner. Gratuit, sans inscription, sans envoi de fichiers.",
  },
  "split-pdf": {
    title: "Diviser PDF – séparer les pages gratuitement",
    description:
      "Divisez un PDF en pages ou extrayez les pages choisies, en fichiers séparés ou en ZIP. Gratuit, sans inscription, directement dans le navigateur.",
  },
  "pdf-to-images": {
    title: "PDF en JPG – convertir gratuitement",
    description:
      "Convertissez les pages PDF en images JPG ou PNG de haute qualité et téléchargez-les en ZIP. Gratuit, rapide, sans envoi.",
  },
  "organize-pdf": {
    title: "Organiser PDF – trier, supprimer, pivoter",
    description:
      "Réordonnez les pages PDF par glisser-déposer, supprimez-les, pivotez-les, insérez des pages blanches ou combinez plusieurs PDF. Gratuit, sans envoi.",
  },
  "rotate-pdf": {
    title: "Pivoter PDF – faire tourner les pages",
    description:
      "Faites pivoter les pages PDF de 90°, 180° ou 270°, une par une ou toutes ensemble, et enregistrez. Gratuit, dans votre navigateur.",
  },
  "fill-pdf": {
    title: "Remplir un formulaire PDF – gratuit",
    description:
      "Remplissez les formulaires PDF dans votre navigateur : champs de texte, cases à cocher, listes. Aplatissement en option. Gratuit, sans envoi.",
  },
  "sign-pdf": {
    title: "Signer PDF – signature en ligne gratuite",
    description:
      "Dessinez, tapez ou importez votre signature, placez-la sur la page, ajoutez nom et date. Gratuit, sans inscription, sans envoi de fichier.",
  },
  "watermark-pdf": {
    title: "Ajouter un filigrane à un PDF – texte ou logo",
    description:
      "Ajoutez un filigrane texte ou image aux pages PDF : tampon CONFIDENTIEL, logo, motif répété, angle et opacité au choix. Gratuit, sans envoi.",
  },
  "crop-pdf": {
    title: "Rogner PDF – couper les marges",
    description:
      "Rognez les pages PDF : tracez une zone, appliquez-la à toutes ou certaines pages, ou supprimez automatiquement les marges blanches. Gratuit.",
  },
  "compare-pdf": {
    title: "Comparer PDF – trouver les différences",
    description:
      "Comparez deux versions d'un PDF : mots modifiés, ajoutés et supprimés surlignés côte à côte, avec la liste des changements. Gratuit, sans envoi.",
  },
  "pdf-page-numbers": {
    title: "Numéroter les pages d'un PDF – gratuit",
    description:
      "Ajoutez des numéros de page à vos PDF en choisissant la position et le format. Gratuit, sans inscription, dans votre navigateur.",
  },
  "compress-image": {
    title: "Compresser une image – réduire le poids",
    description:
      "Réduisez le poids des images JPG, PNG et WebP avec une qualité réglable, en lot. Gratuit, vos images ne sont pas envoyées.",
  },
  "resize-image": {
    title: "Redimensionner une image – en pixels",
    description:
      "Redimensionnez vos images à n'importe quelle taille en pixels, avec verrouillage des proportions. Gratuit, privé, dans le navigateur.",
  },
  "convert-image": {
    title: "Convertir une image – JPG, PNG, WebP, AVIF",
    description:
      "Convertissez vos images entre JPG, PNG, WebP et AVIF, en lot. Gratuit, rapide, vos fichiers restent sur votre appareil.",
  },
  "crop-image": {
    title: "Recadrer une image – gratuit en ligne",
    description:
      "Recadrez vos photos librement ou avec des formats 1:1, 16:9 et 4:3. Gratuit, sans inscription, dans votre navigateur.",
  },
  "rotate-image": {
    title: "Pivoter une image – rotation et miroir",
    description:
      "Faites pivoter vos images de 90°, 180° ou 270°, ou retournez-les horizontalement ou verticalement. Gratuit, sans envoi.",
  },
  "watermark-image": {
    title: "Ajouter un filigrane à une image – gratuit",
    description:
      "Ajoutez un filigrane texte à vos photos en réglant position, opacité, taille et couleur. Gratuit, vos images ne sont pas envoyées.",
  },
  "image-to-pdf": {
    title: "JPG en PDF – convertir des images en PDF",
    description:
      "Convertissez des images JPG, PNG ou WebP en PDF et combinez-en plusieurs dans un seul fichier. Gratuit, sans inscription, sans envoi.",
  },
  "blur-image": {
    title: "Flouter une image – masquer visages et plaques",
    description:
      "Floutez ou pixelisez des zones de vos photos pour masquer visages, plaques et informations sensibles. Gratuit et privé.",
  },
  "favicon-generator": {
    title: "Générateur de favicon – depuis une image",
    description:
      "Créez toutes les tailles de favicon (16×16 à 512×512) à partir d'une image et téléchargez-les en ZIP. Gratuit, dans le navigateur.",
  },
  "exif-viewer": {
    title: "Lecteur EXIF – voir et supprimer les métadonnées",
    description:
      "Affichez et supprimez les métadonnées EXIF de vos photos : appareil, réglages, position GPS. Gratuit, votre photo n'est pas envoyée.",
  },
  "image-collage": {
    title: "Créer un collage photo – gratuit en ligne",
    description:
      "Créez des collages en grille ou mosaïque, aux formats 1:1, 4:5 et 9:16, jusqu'à 4096 px. Gratuit, vos photos ne sont pas envoyées.",
  },
  "meme-generator": {
    title: "Générateur de mèmes – créer un mème",
    description:
      "Créez des mèmes avec vos images : texte classique, légendes, ombres. Téléchargez en pleine résolution, sans filigrane ni envoi.",
  },
  "image-to-base64": {
    title: "Image en Base64 – data URI",
    description:
      "Convertissez des images en chaînes Base64 ou data URI à intégrer dans HTML et CSS. Gratuit, privé, dans le navigateur.",
  },
  "qr-generator": {
    title: "Générateur de QR code – gratuit et illimité",
    description:
      "Créez des QR codes pour liens, texte ou numéros de téléphone, avec couleurs et logo, en PNG ou SVG. Gratuit et sans expiration.",
  },
  "svg-to-png": {
    title: "SVG en PNG – convertir gratuitement",
    description:
      "Convertissez des fichiers SVG en PNG de haute qualité à la taille voulue. Gratuit, votre fichier n'est pas envoyé.",
  },
  "base64-encode": {
    title: "Encodeur Base64 – encoder et décoder",
    description:
      "Encodez du texte ou des fichiers en Base64 ou décodez du Base64. Gratuit, rapide, entièrement dans le navigateur.",
  },
  "color-picker": {
    title: "Sélecteur de couleur – HEX, RGB, HSL, CMJN",
    description:
      "Choisissez une couleur à l'écran ou dans une image, convertissez en HEX, RGB, HSL, OKLCH et CMJN, vérifiez le contraste WCAG. Gratuit.",
  },
  "json-formatter": {
    title: "Formateur JSON – formater et valider",
    description:
      "Formatez, minifiez et validez vos données JSON. Gratuit, vos données ne quittent pas votre navigateur.",
  },
  "hash-generator": {
    title: "Générateur de hash – SHA-256, SHA-512",
    description:
      "Générez des hash SHA-1, SHA-256, SHA-384 et SHA-512 à partir de texte ou de fichiers. Gratuit et privé.",
  },
  "word-counter": {
    title: "Compteur de mots et de caractères",
    description:
      "Comptez mots, caractères, phrases et paragraphes, avec les limites X, Instagram, LinkedIn et SMS et le temps de lecture. Gratuit.",
  },
  "password-generator": {
    title: "Générateur de mot de passe sécurisé",
    description:
      "Générez des mots de passe forts et aléatoires et testez la robustesse des vôtres. Tout se fait localement, rien n'est envoyé.",
  },
  "diff-checker": {
    title: "Comparer deux textes – différences",
    description:
      "Comparez deux textes côte à côte, ajouts et suppressions surlignés. Outil gratuit pour textes et code.",
  },
  "markdown-editor": {
    title: "Éditeur Markdown avec aperçu en direct",
    description:
      "Écrivez en Markdown avec aperçu en direct et exportez en HTML. Éditeur gratuit, votre texte n'est pas envoyé.",
  },
  "url-encoder": {
    title: "Encodeur URL – encoder et décoder",
    description:
      "Encodez ou décodez instantanément des URL et des composants d'URL. Gratuit, dans votre navigateur.",
  },
  "timestamp-converter": {
    title: "Convertisseur timestamp Unix – date",
    description:
      "Convertissez des timestamps Unix en dates lisibles et inversement, dans plusieurs formats. Outil gratuit pour développeurs.",
  },
  "lorem-ipsum": {
    title: "Générateur Lorem Ipsum – faux texte",
    description:
      "Générez du faux texte Lorem Ipsum : paragraphes, phrases ou mots, copiés en un clic. Gratuit.",
  },
  "regex-tester": {
    title: "Testeur regex – expressions régulières",
    description:
      "Testez vos expressions régulières en direct avec surlignage des correspondances et prise en charge des flags. Gratuit.",
  },
  "csv-json": {
    title: "CSV en JSON – et JSON en CSV",
    description:
      "Convertissez CSV en JSON et inversement, et affichez un CSV en tableau triable. Gratuit, vos données ne sont pas envoyées.",
  },
  "xml-formatter": {
    title: "Formateur XML – formater et valider",
    description:
      "Formatez et validez vos données XML. Gratuit, privé, dans votre navigateur.",
  },
  "yaml-formatter": {
    title: "Formateur YAML – valider et convertir en JSON",
    description:
      "Formatez, validez et convertissez du YAML en JSON. Outil gratuit, vos données ne sont pas envoyées.",
  },
  "unit-converter": {
    title: "Convertisseur d'unités – px, rem, cm, pouces",
    description:
      "Convertissez les unités CSS (px, rem, em, vw) et de longueur (cm, mm, pouces) instantanément. Gratuit.",
  },
  "qr-scanner": {
    title: "Lecteur de QR code – image ou caméra",
    description:
      "Lisez les QR codes avec votre caméra ou depuis une image et copiez leur contenu. Gratuit, sans application, sans envoi.",
  },
  "jwt-decoder": {
    title: "Décodeur JWT – voir le contenu du token",
    description:
      "Décodez un token JWT pour inspecter en-tête, contenu et signature. Votre token ne quitte pas le navigateur. Gratuit.",
  },
  "uuid-generator": {
    title: "Générateur UUID – v4 et Nano ID",
    description:
      "Générez des UUID v4 (GUID) et des Nano ID en masse, copiez-les un par un ou tous ensemble. Gratuit, dans le navigateur.",
  },
  "css-minifier": {
    title: "Minifier CSS – gratuit en ligne",
    description:
      "Minifiez votre CSS pour réduire sa taille ou reformatez-le pour le rendre lisible. Gratuit, votre code n'est pas envoyé.",
  },
  "base-converter": {
    title: "Convertisseur de base – binaire, hexadécimal",
    description:
      "Convertissez des nombres entre décimal, hexadécimal, binaire et octal instantanément. Gratuit, dans le navigateur.",
  },
  "color-palette": {
    title: "Générateur de palette de couleurs",
    description:
      "Extrayez les couleurs dominantes d'une image ou générez des palettes harmonieuses et copiez les codes HEX. Gratuit.",
  },
  "color-contrast": {
    title: "Vérifier le contraste des couleurs – WCAG",
    description:
      "Testez le contraste entre texte et arrière-plan selon les niveaux WCAG AA et AAA. Résultat instantané, gratuit.",
  },
  "text-case": {
    title: "Convertir majuscules et minuscules",
    description:
      "Convertissez un texte en MAJUSCULES, minuscules, Title Case, camelCase, snake_case et plus. Gratuit et instantané.",
  },
  "background-remover": {
    title: "Supprimer l'arrière-plan d'une image – gratuit",
    description:
      "Supprimez l'arrière-plan d'une photo avec l'IA, contours de cheveux nets, PNG transparent en pleine résolution. Gratuit, sans envoi.",
  },
  "color-dropper": {
    title: "Pipette – trouver la couleur d'une image",
    description:
      "Ouvrez une image, cliquez sur un pixel et copiez sa couleur en HEX, RGB ou HSL. Gratuit, votre image n'est pas envoyée.",
  },
  "photo-filter": {
    title: "Filtre photo – effets en ligne",
    description:
      "Appliquez des filtres vintage, noir et blanc, sépia et d'autres à vos photos. Gratuit, votre photo n'est pas envoyée.",
  },
  "redact-pdf": {
    title: "Caviarder un PDF – supprimer les données",
    description:
      "Caviardez les données personnelles d'un PDF : mots, e-mails, numéros, IBAN ou zones dessinées. Le texte est vraiment supprimé, pas masqué.",
  },
  "pdf-encrypt": {
    title: "Protéger un PDF par mot de passe – AES-256",
    description:
      "Chiffrez un PDF en AES-256, limitez l'impression et la copie, ou retirez un mot de passe que vous connaissez. Gratuit, sans envoi.",
  },
  "html-to-pdf": {
    title: "HTML en PDF – convertir gratuitement",
    description:
      "Convertissez pages web enregistrées et fichiers HTML en PDF en quelques secondes. Fichiers supprimés juste après, ou conversion privée dans le navigateur.",
  },
  "pdf-to-word": {
    title: "PDF en Word – convertir gratuitement (DOCX)",
    description:
      "Convertissez un PDF en Word (DOCX) modifiable : titres, listes, tableaux, images et mise en page conservés. Gratuit, sans envoi.",
  },
  "pdf-to-excel": {
    title: "PDF en Excel – convertir les tableaux (XLSX)",
    description:
      "Convertissez les tableaux PDF en Excel (XLSX) avec de vrais nombres et cellules fusionnées. Gratuit, privé, sans envoi.",
  },
  "pdf-to-markdown": {
    title: "PDF en Markdown – convertir gratuitement",
    description:
      "Convertissez un PDF en Markdown avec titres, listes, tableaux et images. Idéal pour docs, notes et prompts d'IA. Sans envoi.",
  },
  "pdf-to-powerpoint": {
    title: "PDF en PowerPoint – convertir en PPTX",
    description:
      "Chaque page PDF devient une diapositive avec zones de texte, images et formes modifiables. Gratuit, sans envoi, sans filigrane.",
  },
  "word-to-pdf": {
    title: "Word en PDF – convertir gratuitement",
    description:
      "Convertissez DOCX, DOC, ODT et RTF en PDF en quelques secondes : polices, tableaux et images conservés. Fichiers supprimés juste après.",
  },
  "excel-to-pdf": {
    title: "Excel en PDF – convertir XLSX en PDF",
    description:
      "Convertissez XLSX, XLS, ODS et CSV en PDF : toutes les feuilles, formules calculées, formats et zones d'impression. Fichiers supprimés juste après.",
  },
  "powerpoint-to-pdf": {
    title: "PowerPoint en PDF – convertir PPTX",
    description:
      "Convertissez PPTX, PPT et ODP en PDF, une page par diapositive avec formes, images et thèmes. Sans filigrane ; fichiers supprimés juste après.",
  },
  "ocr-pdf": {
    title: "OCR PDF – rendre un PDF scanné cherchable",
    description:
      "Transformez PDF scannés et photos en PDF cherchables grâce à une couche de texte invisible, en français, anglais et d'autres langues. Sans envoi.",
  },
  "pdf-text-extractor": {
    title: "Extraire le texte d'un PDF – gratuit",
    description:
      "Extrayez et copiez tout le texte d'un PDF en conservant colonnes et ordre de lecture. Gratuit, sans envoi.",
  },
  "repair-pdf": {
    title: "Réparer un PDF endommagé – gratuit",
    description:
      "Réparez les PDF endommagés : la structure est reconstruite et les pages irrécupérables sont restaurées en images. Gratuit, sans envoi.",
  },
  "pdf-compress": {
    title: "Compresser PDF – réduire la taille",
    description:
      "Réduisez la taille d'un PDF en recompressant ses images, idéal pour les e-mails. Gratuit, privé, entièrement dans le navigateur.",
  },
  "video-to-gif": {
    title: "Vidéo en GIF – convertir gratuitement",
    description:
      "Convertissez de courts clips vidéo (MP4, WebM, MOV) en GIF animés. Gratuit, sans filigrane, dans votre navigateur.",
  },
  "audio-recorder": {
    title: "Enregistreur audio en ligne – gratuit",
    description:
      "Enregistrez avec votre micro dans le navigateur et téléchargez en MP3 ou WAV. Gratuit, sans inscription ni installation.",
  },
  "text-to-speech": {
    title: "Synthèse vocale – lire un texte à voix haute",
    description:
      "Faites lire votre texte avec une voix naturelle, en français, anglais et de nombreuses autres langues. Gratuit, sans inscription.",
  },
};
