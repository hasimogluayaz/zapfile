/**
 * Static page strings (About, Blog index, Terms, Privacy) for merge locales.
 * Layered on top of `localeOverrides` so UI matches the selected language, not English.
 */
export const partialStaticPageLocales: Record<
  "es" | "pt" | "it" | "ja" | "ar",
  Record<string, string>
> = {
  es: {
    "about.title": "Acerca de ZapFile",
    "about.intro":
      "ZapFile es una colección de herramientas de archivos gratuitas, rápidas y privadas. Casi todas funcionan por completo en tu navegador y ninguna pide cuenta. Abre una herramienta y empieza.",
    "about.missionTitle": "Nuestra misión",
    "about.missionBody":
      "Creemos que todos deberían tener acceso a herramientas potentes sin sacrificar la privacidad ni pagar suscripciones. ZapFile ofrece un conjunto completo para PDF, imágenes, audio y más — totalmente gratis y accesible.",
    "about.howTitle": "Cómo funciona",
    "about.howBody":
      "La mayoría de las herramientas procesan los archivos directamente en tu navegador. Cuando comprimes una imagen o unes PDF, tus archivos no salen de tu dispositivo, y esas herramientas funcionan sin conexión una vez cargada la página. Word, Excel, PowerPoint y HTML a PDF son la excepción: por defecto usan nuestro propio servidor de conversión, porque un motor de oficina completo es demasiado pesado para descargarlo en cada navegador. Tu archivo se convierte y se borra al instante, y siempre puedes elegir el modo privado, que funciona en el navegador.",
    "about.privacyTitle": "Privacidad primero",
    "about.privacyBody":
      "La privacidad es la base de ZapFile. No recopilamos ni vendemos tus datos, no guardamos tus archivos y no pedimos cuenta. Los únicos archivos que llegan a nuestro servidor son los documentos que conviertes en el modo rápido de las herramientas de Office a PDF, y se borran en cuanto el PDF está listo.",
    "about.builtTitle": "Tecnología",
    "about.builtBody":
      "ZapFile está hecho con Next.js y usa API del navegador como Canvas, Web Audio y WebAssembly para realizar operaciones complejas, desde procesar imágenes hasta editar PDF, en tu dispositivo. Los documentos de Office se convierten con LibreOffice en nuestro propio servidor.",
    "about.opensourceTitle": "Código abierto",
    "about.opensourceBody":
      "ZapFile es un proyecto de código abierto. Creemos en la transparencia y el desarrollo comunitario. Puedes revisar el código, proponer mejoras o contribuir. El desarrollo abierto hace verificables nuestras promesas de privacidad.",

    "blog.subtitle":
      "Guías, comparaciones y consejos para trabajar con archivos en línea: compresión de imágenes, fusión de PDF y privacidad en la web.",
    "blog.backHome": "Volver al inicio",

    "terms.title": "Términos del servicio",
    "terms.updated": "Última actualización: octubre de 2026",
    "terms.acceptanceTitle": "Aceptación de los términos",
    "terms.acceptanceBody":
      "Al acceder y usar ZapFile (zapfile.xyz), aceptas estos términos de servicio.",
    "terms.serviceTitle": "Descripción del servicio",
    "terms.serviceBody":
      "ZapFile ofrece herramientas gratuitas para procesar archivos. La mayoría funcionan localmente en tu navegador y nunca suben tus archivos. En modo rápido, las herramientas de Word, Excel, PowerPoint y HTML a PDF envían el documento a nuestro servidor de conversión y lo borran justo después, como se describe en la Política de privacidad.",
    "terms.disclaimerTitle": "Descargo de responsabilidad",
    "terms.disclaimerBody":
      'El servicio se ofrece "tal cual" sin garantías de ningún tipo. No garantizamos la exactitud de los resultados. Conserva siempre copias de seguridad de tus archivos originales.',
    "terms.liabilityTitle": "Limitación de responsabilidad",
    "terms.liabilityBody":
      "ZapFile no será responsable de daños derivados del uso del servicio, incluida la pérdida o corrupción de datos.",
    "terms.changesTitle": "Cambios",
    "terms.changesBody":
      "Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado implica la aceptación de los términos actualizados.",

    "privacy.title": "Política de privacidad",
    "privacy.updated": "Última actualización: octubre de 2026",
    "privacy.mattersTitle": "Tu privacidad importa",
    "privacy.mattersBody":
      "ZapFile está diseñado con la privacidad como principio. Casi todo el procesamiento ocurre en tu navegador y esos archivos nunca se suben. La única excepción es el modo rápido de las herramientas de Office a PDF, explicado abajo.",
    "privacy.noCollectTitle": "Datos que no recopilamos",
    "privacy.noCollect1": "No guardamos ni miramos tus archivos",
    "privacy.noCollect2": "No rastreamos el contenido de los archivos que procesas",
    "privacy.noCollect3": "No exigimos crear cuenta ni datos personales",
    "privacy.officeTitle": "Word, Excel, PowerPoint y HTML a PDF",
    "privacy.officeBody": "Estas cuatro herramientas tienen un modo rápido (el predeterminado): el documento se envía por una conexión cifrada (HTTPS) a nuestro servidor de conversión en Alemania, se convierte a PDF y se borra al instante junto con el resultado. No se guarda, registra ni revisa nada, y el servidor no tiene acceso propio a internet. Si lo prefieres, elige el modo privado en la página de la herramienta y la conversión se hará por completo en tu navegador. Todas las demás herramientas de ZapFile funcionan siempre solo en tu dispositivo.",
    "privacy.mayCollectTitle": "Datos que podemos recopilar",
    "privacy.mayCollect1":
      "Analítica de uso anónima (páginas vistas, uso de herramientas) para mejorar el servicio",
    "privacy.mayCollect2":
      "Registros estándar del servidor web (IP, tipo de navegador) por seguridad",
    "privacy.thirdPartyTitle": "Servicios de terceros",
    "privacy.thirdPartyBody":
      "Podemos usar Google AdSense para publicidad; las cookies pueden mostrar anuncios relevantes. Puedes gestionar preferencias en la configuración de anuncios de Google.",
    "privacy.contactTitle": "Contacto",
    "privacy.contactBody":
      "Si tienes preguntas sobre esta política, escríbenos a ayvexdevelopment@gmail.com.",
  },

  pt: {
    "about.title": "Sobre o ZapFile",
    "about.intro":
      "ZapFile é uma coleção de ferramentas de arquivos gratuitas, rápidas e privadas. Quase todas funcionam inteiramente no seu navegador e nenhuma exige conta. Abra uma ferramenta e comece.",
    "about.missionTitle": "Nossa missão",
    "about.missionBody":
      "Acreditamos que todos devem ter acesso a ferramentas poderosas sem abrir mão da privacidade ou pagar assinaturas. O ZapFile oferece um conjunto completo para PDF, imagens, áudio e mais — totalmente grátis e acessível.",
    "about.howTitle": "Como funciona",
    "about.howBody":
      "A maioria das ferramentas processa os arquivos diretamente no seu navegador. Quando você comprime uma imagem ou junta PDFs, seus arquivos não saem do dispositivo, e essas ferramentas funcionam offline depois que a página carrega. Word, Excel, PowerPoint e HTML para PDF são a exceção: por padrão usam nosso próprio servidor de conversão, porque um motor de escritório completo é pesado demais para baixar em cada navegador. O arquivo é convertido e apagado na hora, e o modo privado, que roda no navegador, está sempre disponível.",
    "about.privacyTitle": "Privacidade em primeiro lugar",
    "about.privacyBody":
      "A privacidade é a base do ZapFile. Não coletamos nem vendemos seus dados, não guardamos seus arquivos e não exigimos conta. Os únicos arquivos que chegam ao nosso servidor são os documentos convertidos no modo rápido das ferramentas de Office para PDF, e eles são apagados assim que o PDF fica pronto.",
    "about.builtTitle": "Tecnologia",
    "about.builtBody":
      "ZapFile é feito com Next.js e usa APIs do navegador como Canvas, Web Audio e WebAssembly para fazer operações complexas, do processamento de imagens à edição de PDF, no seu dispositivo. Documentos do Office são convertidos com LibreOffice em nosso próprio servidor.",
    "about.opensourceTitle": "Código aberto",
    "about.opensourceBody":
      "O ZapFile é um projeto de código aberto. Acreditamos em transparência e desenvolvimento comunitário. Você pode revisar o código, sugerir melhorias ou contribuir. O código aberto torna verificáveis nossas promessas de privacidade.",

    "blog.subtitle":
      "Guias, comparações e dicas para trabalhar com arquivos online — da compressão de imagens à mesclagem de PDF e privacidade na web.",
    "blog.backHome": "Voltar ao início",

    "terms.title": "Termos de serviço",
    "terms.updated": "Última atualização: outubro de 2026",
    "terms.acceptanceTitle": "Aceitação dos termos",
    "terms.acceptanceBody":
      "Ao acessar e usar o ZapFile (zapfile.xyz), você aceita estes termos de serviço.",
    "terms.serviceTitle": "Descrição do serviço",
    "terms.serviceBody":
      "ZapFile oferece ferramentas gratuitas para processar arquivos. A maioria funciona localmente no seu navegador e nunca envia seus arquivos. No modo rápido, as ferramentas de Word, Excel, PowerPoint e HTML para PDF enviam o documento ao nosso servidor de conversão e o apagam logo depois, como descrito na Política de privacidade.",
    "terms.disclaimerTitle": "Isenção de garantias",
    "terms.disclaimerBody":
      'O serviço é fornecido "como está", sem garantias. Não garantimos a exatidão dos resultados. Mantenha sempre backup dos arquivos originais.',
    "terms.liabilityTitle": "Limitação de responsabilidade",
    "terms.liabilityBody":
      "O ZapFile não se responsabiliza por danos decorrentes do uso do serviço, incluindo perda ou corrupção de dados.",
    "terms.changesTitle": "Alterações",
    "terms.changesBody":
      "Reservamo-nos o direito de modificar estes termos a qualquer momento. O uso continuado implica aceitação dos termos atualizados.",

    "privacy.title": "Política de privacidade",
    "privacy.updated": "Última atualização: outubro de 2026",
    "privacy.mattersTitle": "Sua privacidade importa",
    "privacy.mattersBody":
      "ZapFile foi criado com a privacidade como princípio. Quase todo o processamento acontece no seu navegador e esses arquivos nunca são enviados. A única exceção é o modo rápido das ferramentas de Office para PDF, explicado abaixo.",
    "privacy.noCollectTitle": "Dados que não coletamos",
    "privacy.noCollect1": "Não guardamos nem olhamos seus arquivos",
    "privacy.noCollect2": "Não rastreamos o conteúdo dos arquivos que você processa",
    "privacy.noCollect3": "Não exigimos criação de conta nem dados pessoais",
    "privacy.officeTitle": "Word, Excel, PowerPoint e HTML para PDF",
    "privacy.officeBody": "Essas quatro ferramentas têm um modo rápido (o padrão): o documento é enviado por uma conexão criptografada (HTTPS) ao nosso servidor de conversão na Alemanha, convertido em PDF e apagado na hora junto com o resultado. Nada é guardado, registrado ou examinado, e o servidor não tem acesso próprio à internet. Se preferir, escolha o modo privado na página da ferramenta e a conversão roda inteiramente no seu navegador. Todas as outras ferramentas do ZapFile funcionam sempre só no seu dispositivo.",
    "privacy.mayCollectTitle": "Dados que podemos coletar",
    "privacy.mayCollect1":
      "Estatísticas de uso anônimas (visualizações, uso de ferramentas) para melhorar o serviço",
    "privacy.mayCollect2":
      "Logs padrão do servidor web (IP, tipo de navegador) por segurança",
    "privacy.thirdPartyTitle": "Serviços de terceiros",
    "privacy.thirdPartyBody":
      "Podemos usar o Google AdSense para anúncios; cookies podem exibir anúncios relevantes. Gerencie preferências nas configurações de anúncios do Google.",
    "privacy.contactTitle": "Contato",
    "privacy.contactBody":
      "Dúvidas sobre esta política: ayvexdevelopment@gmail.com.",
  },

  it: {
    "about.title": "Informazioni su ZapFile",
    "about.intro":
      "ZapFile è una raccolta di strumenti per file gratuiti, veloci e privati. Quasi tutti funzionano interamente nel tuo browser e nessuno richiede un account. Apri uno strumento e inizia.",
    "about.missionTitle": "La nostra missione",
    "about.missionBody":
      "Crediamo che tutti debbano avere accesso a strumenti potenti senza sacrificare la privacy o pagare abbonamenti. ZapFile offre una suite completa per PDF, immagini, audio e altro — del tutto gratuita e accessibile.",
    "about.howTitle": "Come funziona",
    "about.howBody":
      "La maggior parte degli strumenti elabora i file direttamente nel browser. Quando comprimi un'immagine o unisci PDF, i file non lasciano il dispositivo, e quegli strumenti funzionano anche offline una volta caricata la pagina. Word, Excel, PowerPoint e HTML in PDF sono l'eccezione: per impostazione predefinita usano il nostro server di conversione, perché un motore per ufficio completo è troppo pesante da scaricare in ogni browser. Il file viene convertito ed eliminato subito, ed è sempre disponibile una modalità privata che funziona nel browser.",
    "about.privacyTitle": "La privacy prima di tutto",
    "about.privacyBody":
      "La privacy è il fondamento di ZapFile. Non raccogliamo né vendiamo i tuoi dati, non conserviamo i tuoi file e non chiediamo un account. Gli unici file che raggiungono il nostro server sono i documenti convertiti in modalità veloce dagli strumenti da Office a PDF, ed eliminati appena il PDF è pronto.",
    "about.builtTitle": "Tecnologie",
    "about.builtBody":
      "ZapFile è realizzato con Next.js e usa API del browser come Canvas, Web Audio e WebAssembly per eseguire operazioni complesse, dall'elaborazione di immagini alla modifica di PDF, sul tuo dispositivo. I documenti Office vengono convertiti con LibreOffice sul nostro server.",
    "about.opensourceTitle": "Open source",
    "about.opensourceBody":
      "ZapFile è un progetto open source. Crediamo nella trasparenza e nello sviluppo comunitario. Puoi esaminare il codice, proporre miglioramenti o contribuire. Lo sviluppo aperto rende verificabili le nostre promesse sulla privacy.",

    "blog.subtitle":
      "Guide, confronti e suggerimenti per lavorare con i file online: compressione immagini, unione PDF e privacy sul web.",
    "blog.backHome": "Torna alla home",

    "terms.title": "Termini di servizio",
    "terms.updated": "Ultimo aggiornamento: ottobre 2026",
    "terms.acceptanceTitle": "Accettazione dei termini",
    "terms.acceptanceBody":
      "Accedendo e utilizzando ZapFile (zapfile.xyz), accetti questi termini di servizio.",
    "terms.serviceTitle": "Descrizione del servizio",
    "terms.serviceBody":
      "ZapFile offre strumenti gratuiti per elaborare file. La maggior parte funziona in locale nel tuo browser e non carica mai i file. In modalità veloce, gli strumenti Word, Excel, PowerPoint e HTML in PDF inviano il documento al nostro server di conversione e lo eliminano subito dopo, come descritto nell'Informativa sulla privacy.",
    "terms.disclaimerTitle": "Esclusione di garanzie",
    "terms.disclaimerBody":
      'Il servizio è fornito "così com\'è" senza garanzie. Non garantiamo l\'accuratezza dei risultati. Conserva sempre i backup dei file originali.',
    "terms.liabilityTitle": "Limitazione di responsabilità",
    "terms.liabilityBody":
      "ZapFile non è responsabile per danni derivanti dall'uso del servizio, inclusa perdita o corruzione dei dati.",
    "terms.changesTitle": "Modifiche",
    "terms.changesBody":
      "Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. L'uso continuato implica l'accettazione dei termini aggiornati.",

    "privacy.title": "Informativa sulla privacy",
    "privacy.updated": "Ultimo aggiornamento: ottobre 2026",
    "privacy.mattersTitle": "La tua privacy conta",
    "privacy.mattersBody":
      "ZapFile è progettato con la privacy come principio. Quasi tutta l'elaborazione avviene nel tuo browser e quei file non vengono mai caricati. L'unica eccezione è la modalità veloce degli strumenti da Office a PDF, spiegata qui sotto.",
    "privacy.noCollectTitle": "Dati che non raccogliamo",
    "privacy.noCollect1": "Non conserviamo né guardiamo i tuoi file",
    "privacy.noCollect2": "Non tracciamo il contenuto dei file che elabori",
    "privacy.noCollect3": "Non richiediamo creazione account né dati personali",
    "privacy.officeTitle": "Word, Excel, PowerPoint e HTML in PDF",
    "privacy.officeBody": "Questi quattro strumenti hanno una modalità veloce (predefinita): il documento viene inviato tramite connessione cifrata (HTTPS) al nostro server di conversione in Germania, convertito in PDF ed eliminato subito insieme al risultato. Nulla viene conservato, registrato o esaminato, e il server non ha accesso a internet. Se preferisci, scegli la modalità privata nella pagina dello strumento e la conversione avviene interamente nel browser. Tutti gli altri strumenti di ZapFile funzionano sempre solo sul tuo dispositivo.",
    "privacy.mayCollectTitle": "Dati che potremmo raccogliere",
    "privacy.mayCollect1":
      "Statistiche di utilizzo anonime (visualizzazioni, uso degli strumenti) per migliorare il servizio",
    "privacy.mayCollect2":
      "Log standard del server web (IP, tipo di browser) per sicurezza",
    "privacy.thirdPartyTitle": "Servizi di terze parti",
    "privacy.thirdPartyBody":
      "Possiamo usare Google AdSense per la pubblicità; i cookie possono mostrare annunci pertinenti. Gestisci le preferenze nelle impostazioni annunci di Google.",
    "privacy.contactTitle": "Contatto",
    "privacy.contactBody":
      "Per domande su questa informativa: ayvexdevelopment@gmail.com.",
  },

  ja: {
    "about.title": "ZapFile について",
    "about.intro":
      "ZapFileは無料・高速・プライベートなファイルツール集です。ほぼすべてがブラウザ内だけで動作し、アカウントも不要。ツールを開いてすぐに使えます。",
    "about.missionTitle": "ミッション",
    "about.missionBody":
      "誰もがプライバシーを犠牲にしたり有料契約を強いられたりせず、強力なファイルツールを使えるべきだと考えています。ZapFile は PDF・画像・音声など幅広いツールを無料で提供します。",
    "about.howTitle": "仕組み",
    "about.howBody":
      "ほとんどのツールはブラウザ内で直接ファイルを処理します。画像の圧縮やPDFの結合では、ファイルが端末の外に出ることはなく、ページ読み込み後はオフラインでも動作します。例外はWord・Excel・PowerPoint・HTML→PDFです。完全なオフィスエンジンを各ブラウザにダウンロードするのは重すぎるため、既定では自社の変換サーバーを使います。ファイルは変換後すぐに削除され、ブラウザ内で動くプライベートモードもいつでも選べます。",
    "about.privacyTitle": "プライバシー第一",
    "about.privacyBody":
      "プライバシーはZapFileの土台です。データの収集や販売はせず、ファイルを保存せず、アカウントも求めません。サーバーに届くのはOffice→PDFツールの高速モードで変換する文書だけで、PDFができ次第すぐに削除されます。",
    "about.builtTitle": "技術スタック",
    "about.builtBody":
      "ZapFileはNext.jsで作られ、Canvas、Web Audio、WebAssemblyなどのブラウザAPIを使って、画像処理からPDF編集まで複雑な処理を端末上で行います。Office文書は自社サーバー上のLibreOfficeで変換します。",
    "about.opensourceTitle": "オープンソース",
    "about.opensourceBody":
      "ZapFile はオープンソースです。透明性とコミュニティ主導の開発を大切にしています。コードを確認し、改善提案や新ツールへの貢献が可能です。",

    "blog.subtitle":
      "オンラインでファイルを扱うためのガイド、比較、ヒント。画像圧縮、PDF 結合、ウェブ上のプライバシーまで。",
    "blog.backHome": "ホームに戻る",

    "terms.title": "利用規約",
    "terms.updated": "最終更新：2026年10月",
    "terms.acceptanceTitle": "規約の承認",
    "terms.acceptanceBody":
      "ZapFile（zapfile.xyz）にアクセスし利用することで、本利用規約に同意したものとみなされます。",
    "terms.serviceTitle": "サービス内容",
    "terms.serviceBody":
      "ZapFileは無料のファイル処理ツールを提供します。ほとんどのツールはブラウザ内でローカルに動作し、ファイルをアップロードしません。高速モードのWord・Excel・PowerPoint・HTML→PDFツールは、プライバシーポリシーに記載のとおり、文書を変換サーバーに送信し、変換後すぐに削除します。",
    "terms.disclaimerTitle": "免責事項",
    "terms.disclaimerBody":
      "本サービスは「現状有姿」で提供され、いかなる保証もありません。処理結果の正確性は保証しません。必ず元ファイルのバックアップを取ってください。",
    "terms.liabilityTitle": "責任の制限",
    "terms.liabilityBody":
      "ZapFile は本サービスの利用に起因する損害（データ消失・破損を含む）について責任を負いません。",
    "terms.changesTitle": "変更",
    "terms.changesBody":
      "本規約は予告なく変更される場合があります。継続利用は更新後の規約への同意とみなされます。",

    "privacy.title": "プライバシーポリシー",
    "privacy.updated": "最終更新：2026年10月",
    "privacy.mattersTitle": "プライバシーの重要性",
    "privacy.mattersBody":
      "ZapFileはプライバシーを基本原則として設計されています。ほぼすべての処理はブラウザ内で行われ、ファイルはアップロードされません。唯一の例外は、下記のOffice→PDFツールの高速モードです。",
    "privacy.noCollectTitle": "収集しないデータ",
    "privacy.noCollect1": "ファイルを保存したり閲覧したりしません",
    "privacy.noCollect2": "処理したファイルの内容を追跡しません",
    "privacy.noCollect3": "アカウント作成や個人情報の提出を求めません",
    "privacy.officeTitle": "Word・Excel・PowerPoint・HTML→PDF",
    "privacy.officeBody": "この4つのツールには高速モード（既定）があります。文書は暗号化された接続（HTTPS）でドイツの変換サーバーに送られ、PDFに変換された後、結果とともにすぐ削除されます。保存・記録・閲覧は一切行わず、サーバー自体もインターネットに接続できません。ご希望なら、ツールのページでプライベートモードを選ぶと、変換はすべてブラウザ内で行われます。ZapFileのその他のツールは、常に端末上だけで動作します。",
    "privacy.mayCollectTitle": "収集する場合があるデータ",
    "privacy.mayCollect1":
      "サービス改善のための匿名の利用統計（ページビュー、ツール利用回数など）",
    "privacy.mayCollect2":
      "セキュリティのための標準的な Web サーバーログ（IP アドレス、ブラウザ種別など）",
    "privacy.thirdPartyTitle": "第三者サービス",
    "privacy.thirdPartyBody":
      "広告に Google AdSense を利用する場合、関連広告配信のため Cookie が使われることがあります。Google の広告設定で管理できます。",
    "privacy.contactTitle": "お問い合わせ",
    "privacy.contactBody":
      "本ポリシーに関するご質問は ayvexdevelopment@gmail.com までご連絡ください。",
  },

  ar: {
    "about.title": "عن ZapFile",
    "about.intro":
      "ZapFile مجموعة من أدوات الملفات المجانية والسريعة والخاصة. تعمل كلها تقريباً داخل متصفحك بالكامل، ولا تحتاج أي منها إلى حساب. افتح أداة وابدأ العمل.",
    "about.missionTitle": "مهمتنا",
    "about.missionBody":
      "نؤمن بأن الجميع يستحق أدواتاً قوية دون التنازل عن الخصوصية أو دفع اشتراكات. يقدّم ZapFile مجموعة كاملة لملفات PDF والصور والصوت وأكثر — مجاناً بالكامل ومتاح للجميع.",
    "about.howTitle": "كيف يعمل",
    "about.howBody":
      "تعالج معظم الأدوات الملفات مباشرة في متصفحك. عندما تضغط صورة أو تدمج ملفات PDF لا تغادر ملفاتك جهازك، وتعمل هذه الأدوات دون اتصال بعد تحميل الصفحة. الاستثناء هو تحويل Word وExcel وPowerPoint وHTML إلى PDF: فهي تستخدم افتراضياً خادم التحويل الخاص بنا، لأن محرك المكتب الكامل أثقل من أن يُنزَّل في كل متصفح. يُحوَّل ملفك ويُحذف فوراً، ويتوفر دائماً وضع خاص يعمل داخل المتصفح.",
    "about.privacyTitle": "الخصوصية أولاً",
    "about.privacyBody":
      "الخصوصية هي أساس ZapFile. لا نجمع بياناتك ولا نبيعها، ولا نحتفظ بملفاتك، ولا نطلب حساباً. الملفات الوحيدة التي تصل إلى خادمنا هي المستندات التي تحوّلها في الوضع السريع لأدوات تحويل Office إلى PDF، وتُحذف فور جاهزية ملف PDF.",
    "about.builtTitle": "التقنيات",
    "about.builtBody":
      "بُني ZapFile باستخدام Next.js ويستعمل واجهات المتصفح مثل Canvas وWeb Audio وWebAssembly لتنفيذ عمليات معقدة، من معالجة الصور إلى تحرير PDF، على جهازك. تُحوَّل مستندات Office باستخدام LibreOffice على خادمنا الخاص.",
    "about.opensourceTitle": "مفتوح المصدر",
    "about.opensourceBody":
      "ZapFile مشروع مفتوح المصدر. نؤمن بالشفافية والتطوير المجتمعي. يمكنك مراجعة الشفرة أو اقتراح تحسينات أو المساهمة. التطوير المفتوح يجعل وعود الخصوصية قابلة للتحقق.",

    "blog.subtitle":
      "أدلة ومقارنات ونصائح للعمل مع الملفات عبر الإنترنت — من ضغط الصور إلى دمج PDF والخصوصية على الويب.",
    "blog.backHome": "العودة إلى الرئيسية",

    "terms.title": "شروط الخدمة",
    "terms.updated": "آخر تحديث: أكتوبر 2026",
    "terms.acceptanceTitle": "قبول الشروط",
    "terms.acceptanceBody":
      "باستخدامك ZapFile (zapfile.xyz) فإنك توافق على شروط الخدمة هذه.",
    "terms.serviceTitle": "وصف الخدمة",
    "terms.serviceBody":
      "يقدّم ZapFile أدوات مجانية لمعالجة الملفات. تعمل معظم الأدوات محلياً في متصفحك ولا ترفع ملفاتك أبداً. في الوضع السريع، ترسل أدوات تحويل Word وExcel وPowerPoint وHTML إلى PDF المستند إلى خادم التحويل لدينا وتحذفه مباشرة بعد التحويل، كما هو موضح في سياسة الخصوصية.",
    "terms.disclaimerTitle": "إخلاء المسؤولية",
    "terms.disclaimerBody":
      "تُقدَّم الخدمة «كما هي» دون أي ضمانات. لا نضمن دقة النتائج. احتفظ دائماً بنسخ احتياطية من ملفاتك الأصلية.",
    "terms.liabilityTitle": "تحديد المسؤولية",
    "terms.liabilityBody":
      "لا يتحمل ZapFile المسؤولية عن أي أضرار ناتجة عن استخدام الخدمة، بما في ذلك فقدان البيانات أو تلفها.",
    "terms.changesTitle": "التغييرات",
    "terms.changesBody":
      "نحتفظ بالحق في تعديل هذه الشروط في أي وقت. الاستمرار في الاستخدام يعني قبول الشروط المحدثة.",

    "privacy.title": "سياسة الخصوصية",
    "privacy.updated": "آخر تحديث: أكتوبر 2026",
    "privacy.mattersTitle": "خصوصيتك تهمنا",
    "privacy.mattersBody":
      "صُمِّم ZapFile على أساس الخصوصية. تتم معالجة الملفات كلها تقريباً في متصفحك ولا تُرفع أبداً. الاستثناء الوحيد هو الوضع السريع لأدوات تحويل Office إلى PDF، الموضح أدناه.",
    "privacy.noCollectTitle": "بيانات لا نجمعها",
    "privacy.noCollect1": "لا نحتفظ بملفاتك ولا نطّلع عليها",
    "privacy.noCollect2": "لا نتتبع محتوى الملفات التي تعالجها",
    "privacy.noCollect3": "لا نطلب إنشاء حساب أو معلومات شخصية",
    "privacy.officeTitle": "تحويل Word وExcel وPowerPoint وHTML إلى PDF",
    "privacy.officeBody": "لهذه الأدوات الأربع وضع سريع (افتراضي): يُرسل المستند عبر اتصال مشفّر (HTTPS) إلى خادم التحويل لدينا في ألمانيا، ويُحوَّل إلى PDF ثم يُحذف فوراً مع النتيجة. لا يُخزَّن شيء ولا يُسجَّل ولا يُطّلع عليه، وليس للخادم اتصال بالإنترنت. إن شئت، اختر الوضع الخاص في صفحة الأداة لتتم عملية التحويل بالكامل في متصفحك. أما بقية أدوات ZapFile فتعمل دائماً على جهازك فقط.",
    "privacy.mayCollectTitle": "بيانات قد نجمعها",
    "privacy.mayCollect1":
      "إحصاءات استخدام مجهولة (مشاهدات الصفحات، استخدام الأدوات) لتحسين الخدمة",
    "privacy.mayCollect2":
      "سجلات خادم ويب قياسية (عنوان IP، نوع المتصفح) لأغراض أمنية",
    "privacy.thirdPartyTitle": "خدمات الطرف الثالث",
    "privacy.thirdPartyBody":
      "قد نستخدم Google AdSense للإعلانات، مع ملفات تعريف لعرض إعلانات مناسبة. يمكنك إدارة التفضيلات في إعدادات إعلانات Google.",
    "privacy.contactTitle": "تواصل",
    "privacy.contactBody":
      "للأسئلة حول هذه السياسة: ayvexdevelopment@gmail.com.",
  },
};
