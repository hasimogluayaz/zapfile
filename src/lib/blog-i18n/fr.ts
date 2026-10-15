/* French blog post bodies (markdown), keyed by post slug. Tool links are rewritten to /fr/... on render. */
const posts: Record<string, string> = {
  "how-to-compress-images-without-losing-quality": `# Compresser des images sans perte de qualité

Les images lourdes ralentissent les sites, remplissent le stockage et compliquent le partage. Bonne nouvelle : avec la bonne méthode, vous pouvez réduire fortement la taille des fichiers sans perte de qualité visible.

## Comprendre la compression d'images

Il existe deux grandes familles de compression :

- **La compression sans perte** supprime les données redondantes sans rien retirer des pixels. L'image décompressée est identique à l'originale. Le PNG utilise ce type de compression par défaut.
- **La compression avec perte** élimine sélectivement des données que l'œil humain remarque à peine. Le JPEG et le WebP la prennent en charge, ce qui leur permet d'obtenir des fichiers bien plus légers pour les photos.

L'astuce pour compresser « sans perte de qualité » consiste à rester dans la plage où les données supprimées sont imperceptibles. Pour la plupart des photos, une qualité JPEG de 75 à 85 donne des fichiers 60 à 80 % plus légers, sans différence visible à taille normale.

## Techniques pratiques

### 1. Choisir le bon format

Le format compte plus que n'importe quel curseur :

- **Le JPEG** convient le mieux aux photos et aux images complexes aux nombreuses couleurs.
- **Le PNG** convient le mieux aux graphismes, logos, captures d'écran et images avec transparence.
- **Le WebP** gère bien les deux cas et produit en général des fichiers 25 à 35 % plus légers que le JPEG à qualité égale. La plupart des navigateurs modernes le prennent en charge.

Pour passer d'un format à l'autre, [le convertisseur d'images de ZapFile](/tools/convert-image) s'en charge instantanément dans votre navigateur.

### 2. Redimensionner avant de compresser

Erreur fréquente : compresser une photo de 4000×3000 qui ne sera affichée qu'en 800×600. Redimensionner d'abord à la taille d'affichage réelle peut réduire le poids de 90 % avant même la compression. Utilisez [le redimensionneur d'images de ZapFile](/tools/resize-image) pour fixer des dimensions exactes ou réduire en pourcentage.

### 3. Choisir une qualité adaptée

En JPEG ou WebP, le réglage de qualité détermine la quantité de données supprimées :

- **90-100** : quasiment sans perte, fichiers lourds. Pour l'archivage ou l'impression.
- **75-85** : l'idéal pour le web. Identique à l'original à taille normale.
- **50-70** : léger flou visible de près, mais parfait pour les miniatures.

### 4. Supprimer les métadonnées

Les photos d'appareils et de smartphones contiennent des métadonnées EXIF : coordonnées GPS, modèle d'appareil, vitesse d'obturation, etc. Elles peuvent ajouter 50 à 100 Ko à chaque image. Les supprimer allège le fichier et protège votre vie privée. Vous pouvez voir les métadonnées de vos images avec [le lecteur EXIF de ZapFile](/tools/exif-viewer).

## Compression par lots sans envoi

Beaucoup d'outils en ligne vous obligent à envoyer vos images sur un serveur, ce qui pose des questions de confidentialité et impose des limites de taille. Les outils qui fonctionnent dans le navigateur, comme [le compresseur d'images de ZapFile](/tools/compress-image), traitent tout localement sur votre appareil. Vos images ne quittent jamais votre ordinateur, il n'y a pas de limite de taille et le résultat est immédiat.

## Liste rapide

- Choisir le bon format (JPEG pour les photos, PNG pour les graphismes, WebP pour les deux).
- Redimensionner aux dimensions réellement nécessaires.
- Régler la qualité entre 75 et 85 pour le web.
- Supprimer les métadonnées inutiles.
- Utiliser un compresseur respectueux de la vie privée, qui fonctionne dans le navigateur.

En suivant ces étapes, vous obtiendrez systématiquement des fichiers plus légers sans perte de qualité perceptible.`,

  "jpg-vs-png-vs-webp-which-format-to-use": `# JPG, PNG ou WebP : quel format d'image choisir ?

Choisir le mauvais format peut doubler ou tripler la taille d'un fichier sans aucun bénéfice visible. Ce guide présente les trois formats les plus utilisés pour vous permettre de décider vite et bien.

## JPEG (JPG)

Le JPEG est le format par défaut des photos sur le web depuis les années 1990. Il utilise une compression avec perte : il supprime définitivement certaines données pour obtenir des fichiers plus légers.

**Idéal pour :**
- Les photos et images aux dégradés doux
- Les publications sur les réseaux sociaux
- Toute image où une légère perte de qualité est acceptable

**Limites :**
- Pas de transparence
- Chaque nouvel enregistrement avec perte dégrade encore l'image
- Peu adapté au texte, aux dessins au trait et aux contours nets

Une photo JPEG de bonne qualité est généralement 5 à 10 fois plus légère que la même image en PNG.

## PNG

Le PNG utilise une compression sans perte : l'image décodée est une copie parfaite de l'originale. Il gère aussi la transparence alpha complète, indispensable pour les logos, icônes et éléments d'interface.

**Idéal pour :**
- Logos, icônes et graphismes aux contours nets
- Captures d'écran et images contenant du texte
- Toute image nécessitant un fond transparent
- Les images modifiées et réenregistrées plusieurs fois

**Limites :**
- Fichiers bien plus lourds pour les photos (souvent 3 à 5 fois plus que le JPEG)
- Pas d'animation native (c'est le rôle du GIF et de l'APNG)

## WebP

Développé par Google, le WebP prend en charge la compression avec et sans perte, ainsi que la transparence et l'animation. À qualité égale, il produit des fichiers systématiquement plus légers que le JPEG et le PNG.

**Idéal pour :**
- La publication web quand le fichier doit être le plus léger possible
- Les images qui demandent qualité et transparence
- Les applications web progressives et les sites axés sur la performance

**Limites :**
- Non pris en charge par certains très vieux navigateurs (la prise en charge dépasse toutefois 97 % dans le monde)
- Certains visionneuses et éditeurs de bureau le gèrent mal
- Moins accepté dans les flux d'impression

## Comparaison côte à côte

| Critère | JPEG | PNG | WebP |
|---|---|---|---|
| Compression | Avec perte | Sans perte | Les deux |
| Transparence | Non | Oui | Oui |
| Animation | Non | Non | Oui |
| Idéal pour | Photos | Graphismes | Les deux |
| Taille relative | Petite | Grande | La plus petite |
| Prise en charge | Universelle | Universelle | 97 %+ |

## Comment choisir

Une méthode simple :

1. **C'est une photo ?** JPEG en qualité 80, ou WebP si votre public le prend en charge.
2. **Besoin de transparence ?** PNG pour une compatibilité maximale, WebP pour des fichiers plus légers.
3. **Un logo, une icône ou une capture d'écran ?** PNG.
4. **Vous optimisez les performances web ?** WebP avec un JPEG en solution de repli.

## Convertir d'un format à l'autre

Si vos images ne sont pas dans le bon format, la conversion est simple. [Le convertisseur d'images de ZapFile](/tools/convert-image) prend en charge ces formats et traite les fichiers entièrement dans votre navigateur. Pas d'envoi, pas d'attente, pas de limite de taille.

Vous pouvez aussi utiliser [le compresseur d'images de ZapFile](/tools/compress-image) pour affiner la qualité après conversion et trouver le meilleur équilibre entre poids et netteté.

## En résumé

Il n'existe pas de format « meilleur » dans l'absolu. Le JPEG excelle pour les photos, le PNG est imbattable pour les graphismes nets ou transparents, et le WebP est le polyvalent moderne qui offre les fichiers les plus légers. Choisissez le format adapté à votre contenu et à votre public, et vous obtiendrez toujours le meilleur résultat.`,

  "how-to-merge-pdf-files-online-free": `# Fusionner des PDF gratuitement en ligne

Regrouper des factures, assembler un rapport à partir de chapitres séparés, envoyer un dossier complet à un client : fusionner des PDF fait partie des tâches les plus courantes. Voici comment le faire rapidement, gratuitement et sans sacrifier votre confidentialité.

## Pourquoi fusionner des PDF ?

Envoyer plusieurs pièces jointes PDF, c'est brouillon. Le destinataire doit télécharger et ouvrir chaque fichier, et l'ordre peut se mélanger. Un document unique est plus simple à partager et à lire, et il fait plus professionnel.

Cas fréquents :

- Rassembler des pages scannées en un seul document
- Assembler les sections d'un contrat venant de plusieurs équipes
- Constituer un portfolio ou une candidature avec plusieurs pièces jointes
- Créer un seul support à partir de plusieurs présentations exportées en PDF

## Méthode 1 : les outils dans le navigateur (les plus rapides et les plus privés)

Les outils PDF qui fonctionnent dans le navigateur traitent vos fichiers directement sur votre appareil. Rien n'est envoyé sur un serveur : vos documents restent totalement privés.

[L'outil Fusionner PDF de ZapFile](/tools/merge-pdf) fonctionne ainsi :

1. Ouvrez l'outil dans votre navigateur.
2. Glissez-déposez vos fichiers PDF dans la zone prévue, ou cliquez pour les choisir.
3. Réorganisez les fichiers dans l'ordre voulu en les faisant glisser.
4. Téléchargez le PDF fusionné.

Tout prend quelques secondes, fonctionne avec autant de fichiers que nécessaire, et comme tout se fait localement, il n'y a aucune limite de taille.

## Méthode 2 : les logiciels de bureau

Si vous travaillez souvent hors ligne, des logiciels comme Adobe Acrobat, PDF-XChange Editor ou le gratuit PDFsam savent fusionner des fichiers. Inconvénient : la plupart des éditeurs PDF complets sont payants, et les alternatives gratuites peuvent être pénibles à installer et à configurer.

## Méthode 3 : la ligne de commande

Les utilisateurs techniques peuvent fusionner des PDF avec Ghostscript ou la bibliothèque Python PyPDF2. Pratique pour automatiser, mais excessif pour une tâche ponctuelle.

## La confidentialité compte

Beaucoup d'outils PDF en ligne populaires envoient vos fichiers sur des serveurs distants pour les traiter. Vos documents transitent donc par une infrastructure tierce, et vous devez croire qu'ils sont supprimés ensuite. Pour des documents sensibles comme des contrats, des déclarations d'impôts ou des dossiers médicaux, c'est un vrai problème.

Les outils qui fonctionnent dans le navigateur éliminent complètement ce risque. Quand vous fusionnez des PDF avec [ZapFile](/), vos fichiers ne quittent jamais votre appareil. Le traitement se fait en JavaScript et en WebAssembly dans votre onglet. Une fois l'onglet fermé, rien ne reste sur aucun serveur, puisque rien n'a jamais été envoyé.

## Conseils pour une fusion propre

- **Vérifiez l'orientation des pages** avant de fusionner. Si certaines sont en paysage et d'autres en portrait, le fichier final peut sembler incohérent.
- **Retirez d'abord les pages inutiles.** Utilisez un [outil de division de PDF](/tools/split-pdf) pour ne garder que les pages nécessaires.
- **Vérifiez le document final** en le parcourant pour confirmer l'ordre des pages.

## En résumé

Fusionner des PDF ne nécessite ni logiciel coûteux ni envoi de documents sensibles sur des serveurs inconnus. Un outil dans le navigateur comme [Fusionner PDF de ZapFile](/tools/merge-pdf) donne des résultats immédiats, accepte toutes les tailles de fichiers et garde vos documents privés. Ouvrez l'outil, déposez vos fichiers : c'est fait en quelques secondes.`,

  "best-free-online-file-tools-2025": `# Les meilleurs outils de fichiers gratuits en ligne en 2025

Le web regorge d'outils de fichiers, mais la plupart sont truffés de publicités, limitent fortement leur version gratuite ou exigent d'envoyer des documents sensibles sur des serveurs inconnus. Ce guide met en avant des outils réellement gratuits, rapides et respectueux de votre vie privée.

## Les critères d'un bon outil en ligne

Avant de passer aux outils, voici ce qui compte :

- **Pas de compte obligatoire.** Si un outil vous impose une inscription pour compresser une image, passez votre chemin.
- **Pas de limite de taille.** Les plafonds artificiels servent à vous pousser vers une offre payante.
- **Un traitement respectueux de la vie privée.** Les meilleurs outils traitent les fichiers dans votre navigateur : rien n'est envoyé.
- **Une interface claire.** Vous ne devriez pas avoir à franchir des pop-ups et des bannières pour travailler.

## Outils PDF

### Fusionner, diviser et compresser des PDF

Le PDF est le format universel des documents, et le manipuler ne devrait pas exiger de logiciel coûteux. [ZapFile](/tools/merge-pdf) propose une suite complète d'outils PDF qui fonctionnent entièrement dans le navigateur :

- **Fusionner PDF** – Combinez plusieurs fichiers en un document, avec réorganisation par glisser-déposer.
- **Diviser PDF** – Extrayez des pages ou des plages de pages dans des fichiers séparés.
- **PDF en images** – Convertissez chaque page d'un PDF en PNG ou JPEG de haute qualité.

Tout est traité localement : vous pouvez travailler en toute sécurité sur des contrats, des documents financiers et d'autres fichiers sensibles.

## Outils d'image

### Compresser et convertir des images

L'optimisation des images est essentielle pour la performance web et le gain de place. Privilégiez les outils qui vous laissent régler la qualité plutôt qu'une compression unique pour tous.

[Les outils d'image de ZapFile](/tools/compress-image) comprennent :

- **Compresseur d'images** – Réduisez les JPEG, PNG et WebP avec une qualité réglable.
- **Convertisseur d'images** – Passez instantanément entre JPG, PNG, WebP et AVIF.
- **Redimensionneur** – Fixez des dimensions exactes ou réduisez en pourcentage.
- **Lecteur EXIF** – Affichez, analysez et supprimez les métadonnées de vos photos directement dans le navigateur.

### Créer et modifier

Au-delà de la compression, ces outils d'image sont utiles :

- **Créateur de collages** – Disposez plusieurs photos en grille.
- **Générateur de mèmes** – Ajoutez du texte sur des images avec police et position personnalisables.
- **Générateur de favicon** – Créez des favicons aux bonnes dimensions à partir de n'importe quelle image.

ZapFile propose tout cela sur [zapfile.xyz/tools](/tools).

## Outils pratiques

Parmi les plus grands gains de temps, il y a les petits utilitaires dont on se sert de temps en temps :

- **Générateur de QR code** – Créez des QR codes pour des liens, du texte ou des coordonnées. [Le générateur de QR code de ZapFile](/tools/qr-generator) permet de choisir les couleurs et de télécharger dans plusieurs formats.
- **Générateur de mots de passe** – Créez des mots de passe forts et aléatoires, avec longueur et types de caractères réglables.
- **Formateur JSON** – Collez un JSON désordonné et récupérez-le formaté et validé instantanément.
- **Comparateur de textes** – Comparez deux textes côte à côte pour repérer les différences.
- **Compteur de mots** – Comptez mots, caractères et phrases et estimez le temps de lecture.

## Pourquoi les outils dans le navigateur l'emportent

En 2025, la tendance va clairement vers le traitement dans le navigateur. Les navigateurs modernes gèrent des tâches qui exigeaient autrefois un logiciel de bureau ou un serveur. Les avantages sont nets :

- **Confidentialité** – Vos fichiers ne quittent pas votre appareil.
- **Rapidité** – Pas d'attente d'envoi ni de téléchargement.
- **Aucune limite** – Pas de plafond de taille artificiel.
- **Aucune installation** – Fonctionne sur tout appareil doté d'un navigateur moderne.

## En résumé

Inutile de payer des abonnements ou de confier vos fichiers à des serveurs au hasard. Des outils comme [ZapFile](/) offrent une boîte à outils complète et respectueuse de la vie privée pour les PDF, les images, la vidéo, l'audio et les tâches du quotidien. Ajoutez vos préférés à vos favoris et arrêtez de perdre du temps avec des alternatives bourrées de publicités.`,

  "why-browser-based-tools-are-more-private": `# Pourquoi les outils dans le navigateur sont plus privés que le cloud

Quand vous utilisez un outil en ligne classique pour compresser une image ou fusionner des PDF, votre fichier est envoyé sur un serveur distant, traité, puis renvoyé. Vous faites confiance à ce serveur pour gérer vos données correctement, les supprimer rapidement et les protéger des fuites. Les outils qui fonctionnent dans le navigateur rendent cette confiance inutile.

## Comment fonctionnent les outils dans le cloud

Le modèle traditionnel suit ces étapes :

1. Vous choisissez un fichier sur votre appareil.
2. Le fichier est envoyé par Internet sur le serveur de l'outil.
3. Le serveur le traite (compression, conversion, fusion, etc.).
4. Le fichier traité est renvoyé à votre navigateur pour téléchargement.
5. Le serveur est censé supprimer votre fichier, mais vous n'avez aucun moyen de le vérifier.

À chaque étape, votre fichier se trouve sur une infrastructure que vous ne contrôlez pas. Il passe par des routeurs, des répartiteurs de charge et des systèmes de stockage gérés par des tiers. Même avec de bonnes intentions, une fuite de données, un serveur mal configuré ou un employé malveillant peut exposer vos fichiers.

## Comment fonctionnent les outils dans le navigateur

Les outils dans le navigateur procèdent tout autrement :

1. Vous ouvrez l'outil dans votre navigateur.
2. Le code de l'outil (JavaScript, parfois WebAssembly) se charge dans votre navigateur.
3. Vous choisissez un fichier ; il est lu directement depuis votre appareil dans la mémoire du navigateur.
4. Le traitement se fait entièrement dans votre onglet.
5. Le résultat est créé localement et vous le téléchargez depuis votre propre appareil.

Votre fichier ne touche jamais un serveur distant. Rien à intercepter, rien à faire fuiter, rien à supprimer : les données n'ont jamais quitté votre machine.

## Ce qui rend cela possible

Les navigateurs modernes sont remarquablement puissants. Les technologies du traitement local incluent :

- **L'API Canvas** pour retoucher, redimensionner et convertir les images.
- **L'API Web Audio** pour traiter et convertir l'audio.
- **WebAssembly (WASM)**, qui exécute du code compilé à une vitesse proche du natif. C'est ainsi que des outils comme [ZapFile](/) traitent des PDF complexes et des images entièrement dans le navigateur.
- **L'API File et les Blobs** pour lire et écrire des fichiers sans serveur.

Ces API ont beaucoup mûri ces dernières années et ont comblé l'écart de performance avec le traitement côté serveur.

## Ce que cela change pour la vie privée

Pensez aux fichiers que l'on traite couramment en ligne :

- **Déclarations d'impôts et relevés bancaires** avec numéros de compte et revenus.
- **Contrats et documents juridiques** aux clauses confidentielles.
- **Dossiers médicaux**, protégés par la réglementation.
- **Photos** contenant des métadonnées EXIF avec coordonnées GPS et horodatage.
- **Documents professionnels** contenant des informations confidentielles.

Envoyer l'un d'eux à un outil dans le cloud crée une copie sur le serveur de quelqu'un d'autre. Avec un outil dans le navigateur comme [ZapFile](/), ces fichiers restent sur votre appareil du début à la fin. (La seule exception sur ZapFile est le mode rapide facultatif de Word, Excel, PowerPoint et HTML en PDF : il convertit sur notre serveur et supprime le fichier aussitôt. Le mode privé de ces outils convertit au contraire dans votre navigateur.)

## Comment vérifier qu'un outil travaille vraiment dans le navigateur

Tous les outils qui se disent « privés » ne traitent pas réellement les fichiers en local. Voici comment vérifier :

### Observer l'activité réseau

Ouvrez les outils de développement du navigateur (F12), passez à l'onglet Réseau et traitez un fichier. Si vous voyez de gros envois vers le serveur de l'outil, votre fichier part dans le cloud.

### Tester hors ligne

Un véritable outil dans le navigateur fonctionne même après déconnexion d'Internet, une fois la page chargée. Coupez le Wi-Fi et traitez un fichier. Si cela marche encore, le traitement est bien local.

### Lire la politique de confidentialité

Les vrais outils dans le navigateur indiquent clairement que les fichiers ne sont pas envoyés. Méfiez-vous des formules vagues comme « nous prenons votre vie privée au sérieux » sans détails.

## Les compromis

Le traitement dans le navigateur a aussi ses limites :

- **La vitesse** dépend de votre appareil. Un téléphone peu puissant sera plus lent qu'un serveur cloud dédié.
- **Les très gros fichiers** peuvent mettre à rude épreuve les appareils avec peu de mémoire.
- **Les opérations lourdes** comme l'OCR ou la suppression d'arrière-plan par IA téléchargent un modèle ou un moteur la première fois, ce qui prend un moment. ZapFile exécute les deux dans le navigateur.

Pour l'immense majorité des tâches courantes, les outils dans le navigateur sont toutefois assez rapides, et le gain en confidentialité est considérable.

## En résumé

Préférer les outils dans le navigateur au cloud est l'un des gestes les plus simples pour protéger vos fichiers. Des outils comme [ZapFile](/) montrent qu'il n'est pas nécessaire de sacrifier le confort à la confidentialité. La prochaine fois que vous compressez une image, fusionnez des PDF ou convertissez une vidéo, vérifiez que l'outil traite les fichiers localement. Vos données le valent bien.`,

  "how-to-compress-pdf-on-iphone": `# Compresser un PDF sur iPhone

L'iPhone manipule des PDF partout : pièces jointes, téléchargements, numérisations. Quand un fichier est trop lourd pour être envoyé par e-mail ou téléversé, la compression est la solution. Voici une méthode pratique et respectueuse de la vie privée.

## Pourquoi la taille compte

Les PDF lourds dépassent les limites des e-mails, ralentissent les envois dans les formulaires et gaspillent du stockage. La compression réduit le poids tout en gardant le document lisible.

## Compresser dans le navigateur

Safari peut ouvrir **ZapFile** et d'autres outils qui fonctionnent dans le navigateur. Votre PDF reste sur l'appareil ; le traitement se fait localement en JavaScript. Vous évitez ainsi d'envoyer des contrats sensibles sur des serveurs inconnus.

## Étapes

1. Ouvrez [Compresser PDF](/tools/pdf-compress) ou un outil équivalent dans Safari.
2. Choisissez votre PDF dans Fichiers ou Photos.
3. Téléchargez le fichier allégé.

## Conseils

- Pour les numérisations, baissez la résolution avant l'export si l'application le permet.
- Si le texte devient flou après compression, compressez moins fort ou divisez plutôt le document.

## En résumé

Pour **compresser un PDF sur iPhone**, privilégiez les outils qui indiquent clairement que les fichiers sont traités dans le navigateur. [ZapFile](/tools) propose la compression et d'autres outils sans envoi de fichiers.`,

  "jpg-vs-webp-which-is-better": `# JPG ou WebP : lequel est le meilleur ?

Le **JPEG** est le format par défaut des photos depuis des décennies. Le **WebP** est le format moderne de Google, avec une meilleure compression et une transparence optionnelle.

## Taille des fichiers

À qualité visuelle comparable, le WebP produit souvent des fichiers **25 à 35 % plus légers** que le JPEG. Cela améliore les Core Web Vitals et le référencement.

## Quand utiliser le JPEG

- Pour une compatibilité maximale avec les systèmes anciens.
- Avec les appareils photo et smartphones qui enregistrent en JPEG par défaut.

## Quand utiliser le WebP

- Pour les sites et applications destinés aux navigateurs modernes.
- Quand vous voulez des fichiers plus légers sans perte visible.

## Convertir

Utilisez [le convertisseur d'images de ZapFile](/tools/convert-image) pour transformer un PNG ou un JPEG en WebP dans votre navigateur.

## En résumé

Pour la plupart des projets web, **le WebP l'emporte** sur la taille ; **le JPEG** reste la solution de repli pour une compatibilité universelle.`,

  "what-is-qr-code-how-to-create": `# Qu'est-ce qu'un QR code ?

Un **QR code** stocke du texte – souvent une URL, une configuration Wi-Fi ou des coordonnées – dans un motif carré que les téléphones lisent avec l'appareil photo.

## Usages courants

- Menus de restaurant et flyers
- Liens de téléchargement d'applications
- Billets d'événements

## Créer un QR code

Utilisez [le générateur de QR code de ZapFile](/tools/qr-generator) : saisissez votre URL ou votre texte, puis téléchargez l'image. Aucun compte requis ; le code est généré dans le navigateur.

## En résumé

Les QR codes relient l'imprimé et le numérique. Pour les créer gratuitement et en toute confidentialité, utilisez un générateur qui n'envoie pas vos données dans le cloud.`,

  "how-to-merge-pdf-files-step-by-step": `# Fusionner des fichiers PDF

La fusion réunit plusieurs PDF en un seul fichier – idéal pour les rapports, les candidatures et l'archivage.

## Étapes

1. Rassemblez tous les PDF et décidez de l'ordre.
2. Ouvrez **Fusionner PDF** dans votre navigateur.
3. Ajoutez les fichiers dans l'ordre.
4. Téléchargez le PDF fusionné.

## Confidentialité

Choisissez des [outils de fusion](/tools/merge-pdf) qui traitent les fichiers localement, pour que contrats et pièces d'identité ne quittent jamais votre machine.

## En résumé

Fusionner est simple ; le vrai choix, c'est la **confiance**. Préférez le traitement dans le navigateur.`,

  "how-to-split-pdf-extract-pages": `# Diviser un PDF

La division permet d'extraire des pages ou des chapitres sans envoyer tout le fichier.

## Cas d'usage

- N'envoyer par e-mail que les pages utiles
- Retirer des pages blanches ou sensibles

## Outil

Avec [Diviser PDF](/tools/split-pdf), sélectionnez les pages dans votre navigateur et téléchargez des fichiers séparés ou un ZIP.

## En résumé

La division est indispensable dans de nombreux flux de travail. Gardez vos fichiers en local autant que possible.`,

  "free-pdf-tools-no-signup": `# Outils PDF gratuits sans inscription

Beaucoup d'outils imposent un compte pour l'analyse ou la vente. Les outils **sans inscription** évitent ces frictions et vont souvent de pair avec le respect de la vie privée.

## Signaux d'alerte

- Envoi obligatoire dans le cloud même pour des tâches simples
- Règles de conservation des données floues

## Bons signes

- Traitement dans le navigateur
- Déclarations de confidentialité claires

## ZapFile

[ZapFile](/) propose des dizaines d'outils PDF et image sans compte. Presque tout fonctionne dans votre navigateur ; seul le mode rapide facultatif d'Office en PDF convertit sur notre serveur et supprime le fichier aussitôt.

## En résumé

Vous pouvez fusionner, diviser et compresser des PDF sans créer un énième mot de passe.`,

  "compress-image-for-web-core-web-vitals": `# Les images et les Core Web Vitals

Le **Largest Contentful Paint (LCP)** dépend souvent de l'image principale d'une page. Les fichiers lourds retardent l'affichage et pénalisent le classement.

## Stratégie

1. Choisir le bon format (WebP/AVIF si possible).
2. Redimensionner à la taille d'affichage.
3. Compresser avec une qualité raisonnable.

## Outil

Utilisez [Compresser une image](/tools/compress-image) avec ses curseurs de qualité et de dimension maximale.

## En résumé

Des images plus légères améliorent le référencement et l'expérience utilisateur. Pour un site compétitif, la compression n'est pas optionnelle.`,

  "remove-pdf-metadata-privacy": `# Métadonnées et vie privée

Les PDF et les images peuvent contenir des **métadonnées** : auteur, date de création, coordonnées GPS et modèle d'appareil.

## Risques

Partager des fichiers publiquement peut révéler plus que prévu.

## Parades

- Inspectez les données avec un **lecteur EXIF**.
- Supprimez les métadonnées avant publication si nécessaire.

## Outils

Le [lecteur EXIF](/tools/exif-viewer) affiche les données intégrées aux images et enregistre une copie propre sans elles. Réencoder une image avec [Compresser une image](/tools/compress-image) supprime aussi les données EXIF.

## En résumé

Les métadonnées sont invisibles mais bien réelles. Vérifiez avant de partager.`,

  "jwt-tokens-explained-developers": `# Les JWT expliqués

Un **JWT** comporte trois parties : en-tête, contenu (payload) et signature, chacune encodée en **base64url**.

## Décoder

Utilisez le [décodeur JWT](/tools/jwt-decoder) dans le navigateur pour inspecter les claims. Ne faites **jamais** confiance à un contenu décodé sans vérifier la signature côté serveur.

## En résumé

Les JWT sont pratiques pour les API ; les décoder est instructif, mais ce n'est pas une autorisation.`,

  "uuid-vs-nanoid": `# UUID ou Nanoid ?

Les **UUID** sont des identifiants de 128 bits au format texte normalisé. **Nanoid** produit des identifiants plus courts, sûrs dans les URL, avec une entropie comparable.

## Génération

Utilisez le [générateur UUID](/tools/uuid-generator) pour obtenir rapidement des identifiants aléatoires pour vos tests et scripts.

## En résumé

UUID pour l'interopérabilité, Nanoid pour des chaînes plus courtes.`,

  "qr-code-scanner-vs-generator": `# Lecteur ou générateur ?

- **Générateur** : crée un QR code à partir d'un texte ou d'une URL.
- **Lecteur** : lit un QR code depuis une image envoyée ou la caméra.

ZapFile propose un [générateur de QR code](/tools/qr-generator) et un [lecteur de QR code](/tools/qr-scanner).

## En résumé

Utilisez le bon outil pour chaque sens de votre flux de travail.`,

  "browser-based-vs-cloud-pdf-tools": `# PDF dans le navigateur ou dans le cloud ?

Les outils **cloud** envoient votre fichier sur un serveur. Les outils **dans le navigateur** le traitent localement une fois la page chargée.

## Quand le local l'emporte

- Documents juridiques, médicaux ou financiers
- Connexion Internet faible ou limitée

## Quand le cloud l'emporte

- OCR à très grande échelle
- Automatisation intensive via des API

## ZapFile

ZapFile est conçu pour que vos fichiers restent sur votre appareil : la confidentialité dès la conception. Même l'OCR fonctionne dans le navigateur. Seule exception : le mode rapide facultatif de Word, Excel, PowerPoint et HTML en PDF, qui convertit sur notre serveur et supprime le fichier aussitôt.

## En résumé

Adaptez la méthode à la sensibilité du document.`,

  "resize-images-for-instagram-and-web": `# Redimensionner des images pour chaque plateforme

Chaque plateforme a ses propres recommandations de **format d'image** et de **dimensions en pixels**.

## Méthode

1. Connaître les dimensions cibles.
2. Verrouiller les proportions dans [Redimensionner une image](/tools/resize-image).
3. Exporter dans le bon format.

## En résumé

Les bonnes dimensions évitent les recadrages maladroits et les agrandissements flous.`,

  "json-formatter-why-developers-use-it": `# Formateur JSON

Le **JSON** est omniprésent dans les API. Un JSON minifié est difficile à lire.

## Formater

Utilisez le [formateur JSON](/tools/json-formatter) pour indenter le JSON et repérer les erreurs dans votre navigateur.

## En résumé

Formatez en local quand les réponses contiennent des données sensibles.`,

  "hash-generator-sha256-md5-explained": `# Les bases du hachage

Un **hash** transforme des données en une empreinte de longueur fixe. **SHA-256** est très répandu ; **MD5** est faible pour la sécurité.

## Cas d'usage

- Vérifier l'intégrité d'un fichier
- Comparer des doublons

## Outil

Le [générateur de hash](/tools/hash-generator) calcule les empreintes dans le navigateur.

## En résumé

Utilisez SHA-256 pour les nouveaux projets.`,

  "color-palette-from-image": `# Des palettes de couleurs à partir d'images

Les designers **accordent** souvent les couleurs d'une interface à des photos.

## Méthode

Envoyez une image dans [Palette de couleurs](/tools/color-palette) et copiez les codes HEX.

## En résumé

Des palettes rapides et cohérentes, sans pipette manuelle.`,

  "base-converter-decimal-hex-binary": `# Conversion de bases

Les programmeurs jonglent sans cesse entre **décimal**, **hexadécimal**, **binaire** et **octal**.

## Outil

Le [convertisseur de bases](/tools/base-converter) convertit instantanément dans votre navigateur.

## En résumé

Gardez un convertisseur sous la main pour lire les journaux et les vidages mémoire.`,

  "css-minifier-faster-websites": `# Minifier le CSS

Un **CSS minifié** réduit le volume transféré. Conservez toujours les originaux dans votre gestion de versions.

## Outil

Le [minificateur CSS](/tools/css-minifier) formate et minifie dans le navigateur.

## En résumé

Associez la minification à gzip ou Brotli côté serveur.`,

  "password-generator-length-and-symbols": `# Des mots de passe solides en 2026

La longueur prime sur la complexité. **16 caractères ou plus** avec des types variés constituent une bonne base pour les comptes importants.

## Aléatoire ou phrase de passe ?

- Les chaînes **aléatoires** résistent aux devinettes.
- Les **phrases de passe** (quatre mots au hasard) sont plus faciles à taper.

## Outil

Utilisez le [générateur de mots de passe](/tools/password-generator) en local dans votre navigateur.

## En résumé

Un mot de passe unique par site, et un gestionnaire de mots de passe.`,

  "regex-tester-debugging-patterns": `# Tester des regex

Les expressions régulières sont puissantes et faciles à rater.

## Confidentialité

Utilisez le [testeur de regex](/tools/regex-tester) pour que vos journaux sensibles ne quittent jamais votre machine.

## En résumé

Testez en local, puis collez le motif final dans votre code.`,

  "how-to-convert-png-to-jpg-online-free": `# Convertir un PNG en JPG gratuitement en ligne

Convertir des images d'un format à l'autre est l'une des tâches les plus courantes. Fichier plus léger à envoyer, format exigé par un formulaire web ou bibliothèque d'images à harmoniser : avec le bon outil, passer du PNG au JPG prend quelques secondes.

## PNG ou JPG ?

**PNG** (Portable Network Graphics) :
- Compression sans perte : aucune donnée de pixel n'est supprimée
- Prend en charge la transparence (canal alpha)
- Idéal pour les logos, captures d'écran, graphismes et illustrations
- Fichiers plus lourds que le JPG pour les photos

**JPG** (JPEG) :
- Compression avec perte : supprime des données pour réduire la taille
- Pas de transparence
- Idéal pour les photos et les images complexes et colorées
- En général 60 à 80 % plus léger que le PNG pour les photos

**Quand convertir PNG → JPG ?** Quand votre PNG est une photo ou une image complexe et que vous n'avez pas besoin de transparence. Le poids baisse nettement, sans différence visible.

**Quand ne pas convertir ?** Si votre PNG comporte des zones transparentes, ou s'il s'agit d'un logo ou d'un dessin au trait. Le JPG ne gère pas la transparence et ajoute un fond blanc (ou coloré). La compression avec perte dégrade aussi les contours nets des graphismes.

## Convertir un PNG en JPG avec ZapFile

1. Ouvrez [le convertisseur d'images de ZapFile](/tools/convert-image)
2. Déposez votre fichier PNG dans la zone prévue (ou cliquez pour le choisir)
3. Choisissez **JPG** comme format de sortie
4. Lancez la conversion
5. Téléchargez votre JPG

La conversion se fait entièrement dans votre navigateur : votre fichier n'est jamais envoyé sur un serveur.

## Choisir la bonne qualité

En JPG, le réglage de qualité compte :

| Qualité | Taille | Usage |
|---------|-----------|----------|
| 90-100 % | Grande | Archivage, impression professionnelle |
| 75-85 % | Moyenne | Web, e-mail, réseaux sociaux |
| 50-70 % | Petite | Miniatures, aperçus |

Pour la plupart des usages, 80 % est idéal : les fichiers sont 70 à 80 % plus légers que le PNG d'origine, sans perte visible à l'écran.

## Conversion par lots

Si vous avez beaucoup de PNG, ZapFile gère le traitement par lots. Envoyez plusieurs fichiers d'un coup et téléchargez tous les JPG en un clic.

## Revenir en arrière : JPG en PNG

Si vous avez plus tard besoin de l'image en PNG (par exemple pour ajouter de la transparence), utilisez le même outil avec PNG en sortie. La qualité perdue lors de la conversion PNG→JPG ne se récupère pas : gardez votre PNG d'origine si vous pensez en avoir besoin.

## En résumé

- Convertissez en JPG quand il vous faut un fichier plus léger sans transparence
- Gardez le PNG pour les logos, graphismes et tout ce qui a un fond transparent
- Utilisez une qualité de 75 à 85 % pour les images web
- [Le convertisseur d'images de ZapFile](/tools/convert-image) convertit instantanément et en toute confidentialité dans votre navigateur`,

  "how-to-add-watermark-to-image-online": `# Ajouter un filigrane à une image en ligne (gratuit)

Le filigrane est le moyen classique de protéger photos et visuels contre une utilisation non autorisée. Photographe, designer ou créateur de contenu : un filigrane décourage le vol tout en vous permettant de partager votre travail en ligne.

## Pourquoi filigraner vos images ?

- **Droit d'auteur** : il vous identifie clairement comme créateur
- **Visibilité de marque** : votre nom ou logo suit l'image quand elle est partagée
- **Dissuasion** : la plupart des robots qui aspirent des images ignorent les contenus clairement filigranés
- **Portfolio** : montrez votre travail sans céder les fichiers en pleine résolution

## Ajouter un filigrane avec ZapFile

1. Ouvrez [l'outil de filigrane de ZapFile](/tools/watermark-image)
2. Importez votre image (JPG, PNG ou WebP)
3. Saisissez le texte du filigrane (votre nom, votre site ou une mention de droits)
4. Réglez la position, l'opacité, la taille et la couleur
5. Téléchargez le résultat

Aucun compte requis. Votre image est traitée localement dans votre navigateur et n'est envoyée à aucun serveur.

## Bonnes pratiques

### Position
Placer le filigrane au **centre** le rend le plus difficile à recadrer. Le coin inférieur droit est plus discret mais facile à couper.

### Opacité
Une opacité de **30 à 50 %** est recommandée. Un filigrane totalement opaque gâche l'image ; trop transparent, il est invisible. Semi-transparent, il reste lisible sans masquer votre travail.

### Texte
Indiquez :
- Votre nom ou celui de votre studio
- L'adresse de votre site
- Le symbole © et l'année : © 2026 VotreNom

### Couleur
Un texte blanc avec une ombre légère convient à la plupart des images. Évitez le noir, qui disparaît dans les zones sombres. Choisissez une couleur qui contraste avec les tons habituels de vos photos.

## Filigrane par lots

Si vous devez filigraner beaucoup d'images avec les mêmes réglages, ZapFile accepte l'import de plusieurs images. Traitez toute votre séance en une fois.

## Ce qu'un filigrane ne peut pas faire

Les filigranes découragent le vol occasionnel mais ne sont pas infaillibles. Une personne déterminée peut effacer un filigrane semi-transparent. Pour les images de valeur, protégez aussi vos droits et ne livrez que des aperçus basse résolution jusqu'au paiement.

## En résumé

- Filigranez vos photos avant de les partager pour protéger votre travail
- Un texte semi-transparent au centre offre la meilleure protection
- [L'outil de filigrane de ZapFile](/tools/watermark-image) est gratuit, privé et fonctionne dans votre navigateur`,

  "how-to-crop-image-online-free": `# Recadrer une image gratuitement en ligne

Le recadrage est l'une des retouches photo les plus fondamentales. Supprimer des bords gênants, composer un carré parfait pour Instagram ou découper une bannière 16:9 pour un en-tête de site : un bon outil en ligne s'en charge en quelques secondes.

## Recadrer avec ZapFile

1. Ouvrez [l'outil Recadrer une image de ZapFile](/tools/crop-image)
2. Importez votre photo (JPG, PNG ou WebP)
3. Choisissez un format prédéfini ou faites glisser les poignées librement
4. Téléchargez l'image recadrée

Tout se passe dans votre navigateur : pas d'envoi, pas d'inscription.

## Formats courants et leurs usages

| Format | Usage |
|-------|----------|
| 1:1 (carré) | Publications Instagram, photos de profil |
| 16:9 | Miniatures YouTube, bannières web, vidéo grand écran |
| 4:3 | Tirage photo classique, présentations |
| 3:2 | Format reflex standard, tirages 10×15 |
| 9:16 | Stories Instagram, TikTok, Reels |
| 2:1 | Bannière X (Twitter), tirages panoramiques |

## Conseils pour de meilleurs recadrages

### Règle des tiers
Divisez l'image en une grille de 3×3. Placez les yeux de votre sujet (ou le point d'intérêt) sur l'une des quatre intersections plutôt qu'au centre. C'est pour cela que la plupart des appareils affichent une grille.

### Recadrer sur l'essentiel
Supprimez « l'espace mort », les zones vides sans intérêt. Un cadrage serré paraît plus dynamique et plus intentionnel.

### Ne pas trop recadrer
Recadrer réduit la résolution. Si vous gardez 20 % d'une image de 2000 px de large, il vous reste 400 px. Souvent suffisant pour le web ; prudence pour l'impression.

### Centrer les photos de profil
Les réseaux sociaux recadrent les photos de profil en cercle. Assurez-vous que l'essentiel est centré avant l'envoi.

## Recadrer ou redimensionner ?

**Recadrer** modifie la composition en retirant des parties de l'image. Les dimensions changent, mais les pixels restants gardent leur qualité.

**Redimensionner** agrandit ou réduit toute l'image. Rien n'est retiré, mais la netteté peut baisser en cas de fort agrandissement.

Souvent, il faut les deux : recadrer pour la bonne composition, puis redimensionner aux dimensions finales.

## En résumé

- Utilisez les formats prédéfinis pour recadrer correctement pour chaque plateforme
- Appliquez la règle des tiers pour des compositions plus fortes
- [L'outil de recadrage de ZapFile](/tools/crop-image) est gratuit et fonctionne entièrement dans votre navigateur`,

  "image-to-pdf-converter-free-online": `# Convertir une image en PDF : outil gratuit en ligne

Convertir une image en PDF est un besoin fréquent : envoyer une photo comme document officiel, regrouper plusieurs images en un seul fichier pour un e-mail ou répondre à un système qui n'accepte que les PDF. Avec le bon outil, cela prend quelques secondes.

## Convertir une image en PDF avec ZapFile

1. Ouvrez [l'outil Image en PDF de ZapFile](/tools/image-to-pdf)
2. Importez une ou plusieurs images (JPG, PNG ou WebP)
3. Réglez l'ordre si vous combinez plusieurs images
4. Créez le PDF
5. Téléchargez votre PDF

Vos images ne quittent jamais votre navigateur : pas d'envoi sur un serveur, pas de compte.

## Plusieurs images dans un seul PDF

Si vous avez un document de plusieurs pages photographié en images séparées (un contrat scanné, une pile de reçus, un album photo), vous pouvez tout regrouper en un PDF en une seule étape :

1. Importez toutes vos images en même temps
2. Faites-les glisser pour les réordonner si besoin
3. Convertissez : chaque image devient une page du PDF

## Qualité des images dans le PDF

ZapFile conserve les photos JPEG telles quelles dès que possible et garde les images PNG sans perte ; le WebP et l'AVIF sont intégrés en JPEG haute qualité. Pour des PDF les plus nets possible :

- Partez de la version la plus haute résolution de votre image
- Utilisez le PNG pour les captures d'écran et les graphismes avec du texte (sans perte)
- Utilisez un JPG de haute qualité (80 % et plus) pour les photos

## Quand convertir des images en PDF ?

- **Pièces jointes** : un PDF s'ouvre sur tout appareil avec une mise en page identique
- **Documents officiels** : beaucoup de formulaires et de portails exigent le PDF
- **Séries de photos** : un PDF se partage plus facilement qu'un dossier d'images
- **Mise en page pour l'impression** : le PDF est le format préféré des imprimeurs

## Dans l'autre sens : PDF en images

Pour l'inverse – extraire des images d'un PDF –, utilisez [l'outil PDF en images de ZapFile](/tools/pdf-to-images). Il convertit chaque page en PNG ou JPG de haute qualité.

## En résumé

- Convertissez une image seule ou combinez-en plusieurs dans un PDF
- La qualité est préservée : les photos JPEG restent intactes et le PNG reste sans perte
- [L'outil Image en PDF de ZapFile](/tools/image-to-pdf) est gratuit, privé et fonctionne dans votre navigateur`,

  "what-is-base64-encoding-and-how-to-use-it": `# Qu'est-ce que l'encodage Base64 et comment l'utiliser ?

Le Base64 est partout dans le développement web : images intégrées, jetons JWT, pièces jointes d'e-mail, réponses d'API. Le comprendre éclaire de nombreuses tâches.

## Qu'est-ce que le Base64 ?

Le Base64 est un procédé d'encodage qui représente des données binaires sous forme de texte, avec seulement 64 caractères ASCII imprimables :

\`A–Z\`, \`a–z\`, \`0–9\`, \`+\`, \`/\` (et \`=\` pour le remplissage)

Le nom « Base64 » vient de ces 64 caractères. Chaque groupe de 3 octets binaires devient 4 caractères Base64.

## Pourquoi le Base64 existe-t-il ?

Beaucoup de systèmes ont été conçus à l'origine pour le texte uniquement : e-mail (SMTP), attributs HTML, champs JSON, URL. Pour y insérer des données binaires (une image, un PDF, des octets bruts), il faut un moyen sûr de les représenter en texte.

Le Base64 résout ce problème en encodant n'importe quel contenu binaire en une chaîne de caractères imprimables et sûrs, que les analyseurs de texte n'interprètent pas de travers.

## Usages courants

### Intégrer des images en HTML/CSS
Au lieu de pointer vers un fichier image :
\`\`\`html
<img src="data:image/png;base64,iVBORw0KGgo..." />
\`\`\`
Utile pour de petites icônes dans des exports HTML en un seul fichier ou des modèles d'e-mail où les liens externes peuvent être bloqués.

### JSON Web Tokens (JWT)
Un JWT se compose de trois parties encodées en Base64, séparées par des points :
\`Header.Payload.Signature\`

L'en-tête et le contenu sont des objets JSON encodés en Base64. Attention : encodés, pas chiffrés – n'importe qui peut les décoder. Utilisez [le décodeur JWT de ZapFile](/tools/jwt-decoder) pour inspecter un jeton.

### Pièces jointes d'e-mail (MIME)
Les pièces jointes sont des fichiers binaires encodés en Base64 et insérés dans le protocole texte de l'e-mail. Votre messagerie s'en charge automatiquement.

### Réponses d'API
Certaines API renvoient des données binaires (images, PDF) sous forme de chaînes Base64 dans des réponses JSON, car le JSON ne gère pas nativement le binaire.

### Authentification HTTP Basic
L'en-tête \`Authorization: Basic\` encode \`utilisateur:motdepasse\` en Base64. Ce n'est pas du chiffrement, seulement de l'encodage. Utilisez toujours HTTPS.

## Encoder et décoder en ligne

Utilisez [l'encodeur/décodeur Base64 de ZapFile](/tools/base64-encode) pour :
- Encoder du texte ou des fichiers en Base64
- Décoder du Base64 en texte ou en fichiers téléchargeables
- Prévisualiser instantanément des data URL d'images

## Le Base64 compresse-t-il les données ?

Non, c'est l'inverse. Le Base64 augmente la taille d'environ 33 %. Trois octets deviennent quatre caractères. Il sert la compatibilité, pas la compression.

## Base64 ou Base64url ?

Le Base64 standard utilise \`+\` et \`/\`, qui ont un sens particulier dans les URL. Le **Base64url** les remplace par \`-\` et \`_\` pour un résultat sûr dans les paramètres d'URL et les JWT.

## En résumé

- Le Base64 représente des données binaires en texte ASCII imprimable pour les systèmes textuels
- Courant dans les images intégrées, les JWT, les pièces jointes et les réponses d'API
- Il augmente la taille d'environ 33 % : pour la compatibilité, pas pour compresser
- Décodez un JWT ou une chaîne Base64 instantanément avec [les outils de ZapFile](/tools)`,

  "how-to-create-favicon-for-website": `# Créer un favicon pour votre site (toutes les tailles)

Le favicon est la petite icône affichée dans les onglets, les favoris et les raccourcis d'écran d'accueil. Pour bien faire, il faut générer plusieurs tailles et les déclarer correctement dans le HTML – simple une fois les exigences connues.

## Qu'est-ce qu'un favicon ?

« Favicon » vient de « favorites icon ». C'était à l'origine une icône de 16×16 pixels pour les favoris d'Internet Explorer. Les navigateurs et appareils modernes demandent de nombreuses tailles :

| Fichier | Taille | Usage |
|------|------|----------|
| favicon.ico | 16×16, 32×32 | Onglets, barre des tâches Windows |
| favicon-16x16.png | 16×16 | Petites icônes d'onglet |
| favicon-32x32.png | 32×32 | Onglets standard |
| apple-touch-icon.png | 180×180 | Raccourci sur l'écran d'accueil iOS |
| android-chrome-192x192.png | 192×192 | Écran d'accueil Android |
| android-chrome-512x512.png | 512×512 | Écran de démarrage Android, PWA |

## Générer toutes les tailles avec ZapFile

1. Ouvrez [le générateur de favicon de ZapFile](/tools/favicon-generator)
2. Importez une image carrée (PNG recommandé, au moins 512×512 pixels)
3. Générez les tailles
4. Téléchargez le ZIP contenant toutes les tailles et le fichier \`.ico\`

## Ajouter les favicons à votre site

Ajoutez ces balises dans la section \`<head>\` de votre HTML :

\`\`\`html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
\`\`\`

Pour les applications web progressives (PWA), ajoutez aussi un fichier \`site.webmanifest\` :

\`\`\`json
{
  "name": "Your App",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
\`\`\`

## Concevoir un bon favicon

### Rester simple
À 16×16 pixels, un logo complexe devient illisible. Utilisez l'initiale de votre marque, une icône simplifiée ou un aplat de couleur.

### Contraste élevé
Le favicon s'affiche sur des interfaces claires et sombres. Testez les deux. Un fond uni à la couleur de votre marque avec un symbole blanc fonctionne dans les deux modes.

### Partir de 512×512
Générez depuis la source la plus haute résolution. ZapFile réduit proprement depuis 512 px, alors qu'agrandir depuis 16 px donne un résultat flou.

### Favicons SVG (navigateurs modernes)
Les navigateurs basés sur Chromium prennent en charge les favicons SVG, parfaits à toutes les tailles. Ajoutez-le en plus de vos PNG/ICO :
\`\`\`html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
\`\`\`

## Erreurs fréquentes

- **Image source en basse résolution** : partez toujours de 512 px ou plus
- **Fournir uniquement le \`.ico\`** : les appareils modernes ont besoin des tailles PNG ; seul, l'ICO prive iOS et Android d'une vraie icône
- **Oublier le cache** : après une mise à jour, les navigateurs gardent l'ancien favicon en cache. Ajoutez un paramètre de version (\`favicon.ico?v=2\`) pendant le développement

## En résumé

- Les favicons demandent plusieurs tailles pour les navigateurs, iOS, Android et les PWA
- Partez d'un PNG carré de 512×512 et générez toutes les tailles d'un coup
- [Le générateur de favicon de ZapFile](/tools/favicon-generator) produit toutes les tailles nécessaires et le fichier ICO en quelques secondes`,

  "how-to-convert-webp-to-jpg-or-png": `# Convertir un WebP en JPG ou PNG en ligne

Le WebP est un format d'image moderne de Google qui produit des fichiers nettement plus légers que le JPG ou le PNG à qualité égale. Mais toutes les applications ne l'acceptent pas : anciens logiciels de bureau, certains services d'impression et certains CMS ne le gèrent pas. Voici comment le convertir rapidement.

## Convertir un WebP en JPG ou PNG avec ZapFile

1. Ouvrez [le convertisseur d'images de ZapFile](/tools/convert-image)
2. Importez votre fichier WebP
3. Choisissez **JPG** ou **PNG** comme format de sortie
4. Convertissez et téléchargez

Aucun envoi sur un serveur : la conversion se fait dans votre navigateur.

## JPG ou PNG ?

Choisissez selon le contenu de l'image WebP :

**WebP → JPG quand :**
- L'image est une photo ou une scène complexe aux nombreuses couleurs
- Vous voulez le fichier le plus léger possible
- La transparence n'est pas nécessaire

**WebP → PNG quand :**
- L'image a un fond transparent
- C'est un logo, une capture d'écran ou un graphisme avec du texte
- Vous voulez une qualité sans perte (aucune donnée de pixel supprimée)

## La conversion fait-elle perdre en qualité ?

**WebP → JPG** : il y a une nouvelle compression avec perte. Une petite perte supplémentaire par rapport au WebP d'origine est possible, surtout avec une qualité basse. Utilisez 85 % ou plus pour la limiter.

**WebP → PNG** : conversion sans perte. Aucune donnée n'est supprimée. Le PNG reproduit fidèlement chaque pixel du WebP, mais le fichier est plus lourd.

## Pourquoi les sites utilisent le WebP

Les images WebP sont généralement :
- 25 à 35 % plus légères que le JPG à qualité égale
- 20 à 30 % plus légères que le PNG pour les contenus sans perte

Cela fait une différence mesurable sur le temps de chargement et les Core Web Vitals. Pour un site web, le WebP est le bon choix sur les navigateurs modernes.

## Convertir plusieurs WebP à la fois

ZapFile convertit plusieurs fichiers WebP en même temps. Importez vos fichiers, choisissez le format cible et téléchargez toutes les images converties ensemble.

## En résumé

- Convertissez le WebP en JPG pour les photos sans transparence
- Convertissez le WebP en PNG pour les graphismes, logos ou tout ce qui a des zones transparentes
- [Le convertisseur d'images de ZapFile](/tools/convert-image) convertit des lots de WebP instantanément dans votre navigateur`,

  "pdf-vs-word-which-format-to-use": `# PDF ou Word : quel format utiliser ?

Le PDF et le Word sont les deux formats de documents les plus utilisés au travail, et le bon choix dépend entièrement de ce que vous faites du fichier. Voici un point clair.

## Utilisez le PDF quand…

### Vous voulez une mise en forme figée
Un PDF s'affiche de façon identique sur tout appareil, système et imprimante. Polices, marges et mise en page sont verrouillées. Un document Word, lui, peut se réorganiser selon la version de Word, les polices installées et la taille d'écran.

### Vous envoyez une version finale
Contrats, factures, rapports, CV et propositions devraient être en PDF. Le destinataire peut les lire, les imprimer et les signer sans modifier votre contenu par erreur.

### Vous imprimez
Le PDF est la norme de l'impression. La plupart des imprimeurs attendent un PDF avec polices incorporées et fonds perdus correctement définis.

### Vous avez besoin d'une large compatibilité
Tout système, navigateur et appareil mobile ouvre un PDF sans logiciel supplémentaire. Tout le monde n'a pas Microsoft Word.

### Vous avez besoin de signatures ou de champs de formulaire
Le PDF gère nativement les formulaires interactifs, les signatures numériques et les annotations. Word propose des champs de formulaire, mais le comportement varie d'une application à l'autre.

## Utilisez Word (.docx) quand…

### Vous ou d'autres devez le modifier
Les documents Word sont faits pour être modifiés. Brouillon collaboratif, document qui circule entre relecteurs, modèle à remplir : Word est le bon format.

### Vous avez besoin du suivi des modifications et des commentaires
Le suivi des modifications et les commentaires de Word sont bien plus puissants que les annotations PDF pour l'édition collaborative.

### Vous utilisez un modèle
La plupart des modèles professionnels (papier à en-tête, rapports, propositions) sont diffusés en Word, car ils sont faits pour être remplis.

## Convertir d'un format à l'autre

### Word → PDF
Utilisez « Enregistrer en PDF » dans Microsoft Word ou LibreOffice, ou [l'outil Word en PDF de ZapFile](/tools/word-to-pdf) si Word n'est pas installé. Polices, tableaux et sauts de page sont conservés.

### PDF → images
Besoin d'une page PDF en image ? Utilisez [l'outil PDF en images de ZapFile](/tools/pdf-to-images) pour exporter n'importe quelle page en PNG ou JPG.

### PDF → Word
Le PDF n'a pas été conçu pour être modifié, le retour vers Word est donc plus délicat. [L'outil PDF en Word de ZapFile](/tools/pdf-to-word) transforme les documents ordinaires en texte modifiable avec titres, listes et tableaux, et conserve la mise en page exacte des pages graphiques (brochures, offres). Vérifiez toujours le résultat sur les documents complexes.

## Aide-mémoire

| Tâche | Format |
|------|-----|
| Rapport final, facture, CV | PDF |
| Brouillon à relire et modifier | Word |
| Impression chez un imprimeur | PDF |
| Modèle à remplir par d'autres | Word |
| Envoi à quelqu'un sans Word | PDF |
| Contrat, document juridique | PDF |
| Brouillon interne en cours | Word |

## Protéger un PDF

Si un PDF ne doit pas être transféré ni imprimé, ajoutez un mot de passe et limitez les droits avec [l'outil Protéger un PDF de ZapFile](/tools/pdf-encrypt).

## Fusionner plusieurs PDF

Pour rassembler des formulaires signés ou compiler un rapport à partir de plusieurs PDF, réunissez-les avec [l'outil Fusionner PDF de ZapFile](/tools/merge-pdf).

## En résumé

- PDF pour les documents finaux mis en forme qui doivent s'afficher partout pareil
- Word pour les documents à modifier, à travailler à plusieurs ou à remplir
- Convertissez avec le bon outil et vérifiez le résultat quand vous repassez du PDF au Word`,
};

export default posts;
