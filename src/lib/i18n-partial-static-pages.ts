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
      "ZapFile es una colección de herramientas de archivos gratuitas, rápidas y privadas que se ejecutan por completo en tu navegador. Sin subidas a servidores, sin cuentas. Abre una herramienta y empieza.",
    "about.missionTitle": "Nuestra misión",
    "about.missionBody":
      "Creemos que todos deberían tener acceso a herramientas potentes sin sacrificar la privacidad ni pagar suscripciones. ZapFile ofrece un conjunto completo para PDF, imágenes, audio y más — totalmente gratis y accesible.",
    "about.howTitle": "Cómo funciona",
    "about.howBody":
      "Todo se procesa en tu navegador con tecnologías web modernas. Al comprimir una imagen o fusionar PDF, tus archivos no salen de tu dispositivo. No hay subidas a servidores remotos. Tus archivos permanecen privados; tras cargar la página, muchas herramientas funcionan incluso sin conexión.",
    "about.privacyTitle": "Privacidad primero",
    "about.privacyBody":
      "La privacidad no es solo una función: es la base de ZapFile. No recopilamos tus datos, no procesamos tus archivos en nuestros servidores y no exigimos cuenta. Tus archivos son tuyos y se quedan en tu dispositivo.",
    "about.builtTitle": "Tecnología",
    "about.builtBody":
      "ZapFile está hecho con Next.js y aprovecha APIs del navegador como Canvas, Web Audio y WebAssembly. Así podemos realizar operaciones complejas — de imágenes a PDF — enteramente en el cliente.",
    "about.opensourceTitle": "Código abierto",
    "about.opensourceBody":
      "ZapFile es un proyecto de código abierto. Creemos en la transparencia y el desarrollo comunitario. Puedes revisar el código, proponer mejoras o contribuir. El desarrollo abierto hace verificables nuestras promesas de privacidad.",

    "blog.subtitle":
      "Guías, comparaciones y consejos para trabajar con archivos en línea: compresión de imágenes, fusión de PDF y privacidad en la web.",
    "blog.backHome": "Volver al inicio",

    "terms.title": "Términos del servicio",
    "terms.updated": "Última actualización: enero de 2025",
    "terms.acceptanceTitle": "Aceptación de los términos",
    "terms.acceptanceBody":
      "Al acceder y usar ZapFile (zapfile.xyz), aceptas estos términos de servicio.",
    "terms.serviceTitle": "Descripción del servicio",
    "terms.serviceBody":
      "ZapFile ofrece herramientas gratuitas de procesamiento de archivos en el navegador. Todo el procesamiento ocurre localmente en tu navegador web. No se suben archivos a nuestros servidores.",
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
    "privacy.updated": "Última actualización: enero de 2025",
    "privacy.mattersTitle": "Tu privacidad importa",
    "privacy.mattersBody":
      "ZapFile está diseñado con la privacidad como principio. Todo el procesamiento ocurre en tu navegador web. Tus archivos nunca se suben a ningún servidor.",
    "privacy.noCollectTitle": "Datos que no recopilamos",
    "privacy.noCollect1": "No subimos, almacenamos ni accedemos a tus archivos",
    "privacy.noCollect2": "No rastreamos el contenido de los archivos que procesas",
    "privacy.noCollect3": "No exigimos crear cuenta ni datos personales",
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
      "Si tienes preguntas sobre esta política, escríbenos a privacy@zapfile.xyz.",
  },

  pt: {
    "about.title": "Sobre o ZapFile",
    "about.intro":
      "O ZapFile é uma coleção de ferramentas de arquivos gratuitas, rápidas e privadas que rodam inteiramente no seu navegador. Sem envios a servidores, sem contas. Abra uma ferramenta e comece.",
    "about.missionTitle": "Nossa missão",
    "about.missionBody":
      "Acreditamos que todos devem ter acesso a ferramentas poderosas sem abrir mão da privacidade ou pagar assinaturas. O ZapFile oferece um conjunto completo para PDF, imagens, áudio e mais — totalmente grátis e acessível.",
    "about.howTitle": "Como funciona",
    "about.howBody":
      "Tudo é processado no seu navegador com tecnologias web modernas. Ao comprimir uma imagem ou mesclar PDFs, seus arquivos não saem do seu dispositivo. Não há envio a servidores remotos. Seus arquivos permanecem privados; após carregar a página, muitas ferramentas funcionam até sem internet.",
    "about.privacyTitle": "Privacidade em primeiro lugar",
    "about.privacyBody":
      "Privacidade não é só um recurso — é a base do ZapFile. Não coletamos seus dados, não processamos seus arquivos em nossos servidores e não exigimos conta. Seus arquivos são seus e ficam no seu dispositivo.",
    "about.builtTitle": "Tecnologia",
    "about.builtBody":
      "O ZapFile é feito com Next.js e usa APIs do navegador como Canvas, Web Audio e WebAssembly. Assim realizamos operações complexas — de imagens a PDF — totalmente no cliente.",
    "about.opensourceTitle": "Código aberto",
    "about.opensourceBody":
      "O ZapFile é um projeto de código aberto. Acreditamos em transparência e desenvolvimento comunitário. Você pode revisar o código, sugerir melhorias ou contribuir. O código aberto torna verificáveis nossas promessas de privacidade.",

    "blog.subtitle":
      "Guias, comparações e dicas para trabalhar com arquivos online — da compressão de imagens à mesclagem de PDF e privacidade na web.",
    "blog.backHome": "Voltar ao início",

    "terms.title": "Termos de serviço",
    "terms.updated": "Última atualização: janeiro de 2025",
    "terms.acceptanceTitle": "Aceitação dos termos",
    "terms.acceptanceBody":
      "Ao acessar e usar o ZapFile (zapfile.xyz), você aceita estes termos de serviço.",
    "terms.serviceTitle": "Descrição do serviço",
    "terms.serviceBody":
      "O ZapFile oferece ferramentas gratuitas de processamento de arquivos no navegador. Todo o processamento ocorre localmente no seu navegador. Nenhum arquivo é enviado aos nossos servidores.",
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
    "privacy.updated": "Última atualização: janeiro de 2025",
    "privacy.mattersTitle": "Sua privacidade importa",
    "privacy.mattersBody":
      "O ZapFile foi projetado com privacidade como princípio. Todo o processamento ocorre no seu navegador. Seus arquivos nunca são enviados a servidores.",
    "privacy.noCollectTitle": "Dados que não coletamos",
    "privacy.noCollect1": "Não enviamos, armazenamos nem acessamos seus arquivos",
    "privacy.noCollect2": "Não rastreamos o conteúdo dos arquivos que você processa",
    "privacy.noCollect3": "Não exigimos criação de conta nem dados pessoais",
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
      "Dúvidas sobre esta política: privacy@zapfile.xyz.",
  },

  it: {
    "about.title": "Informazioni su ZapFile",
    "about.intro":
      "ZapFile è una raccolta di strumenti per file gratuiti, veloci e riservati che funzionano interamente nel browser. Nessun caricamento su server, nessun account. Apri uno strumento e inizia.",
    "about.missionTitle": "La nostra missione",
    "about.missionBody":
      "Crediamo che tutti debbano avere accesso a strumenti potenti senza sacrificare la privacy o pagare abbonamenti. ZapFile offre una suite completa per PDF, immagini, audio e altro — del tutto gratuita e accessibile.",
    "about.howTitle": "Come funziona",
    "about.howBody":
      "Tutto viene elaborato nel browser con tecnologie web moderne. Quando comprimi un'immagine o unisci PDF, i file non lasciano il dispositivo. Nessun invio a server remoti. I file restano privati; dopo il caricamento della pagina molti strumenti funzionano anche offline.",
    "about.privacyTitle": "La privacy prima di tutto",
    "about.privacyBody":
      "La privacy non è solo una funzione: è alla base di ZapFile. Non raccogliamo i tuoi dati, non elaboriamo i file sui nostri server e non richiediamo account. I file sono tuoi e restano sul tuo dispositivo.",
    "about.builtTitle": "Tecnologie",
    "about.builtBody":
      "ZapFile è costruito con Next.js e sfrutta API del browser come Canvas, Web Audio e WebAssembly. Così possiamo eseguire operazioni complesse — da immagini a PDF — interamente lato client.",
    "about.opensourceTitle": "Open source",
    "about.opensourceBody":
      "ZapFile è un progetto open source. Crediamo nella trasparenza e nello sviluppo comunitario. Puoi esaminare il codice, proporre miglioramenti o contribuire. Lo sviluppo aperto rende verificabili le nostre promesse sulla privacy.",

    "blog.subtitle":
      "Guide, confronti e suggerimenti per lavorare con i file online: compressione immagini, unione PDF e privacy sul web.",
    "blog.backHome": "Torna alla home",

    "terms.title": "Termini di servizio",
    "terms.updated": "Ultimo aggiornamento: gennaio 2025",
    "terms.acceptanceTitle": "Accettazione dei termini",
    "terms.acceptanceBody":
      "Accedendo e utilizzando ZapFile (zapfile.xyz), accetti questi termini di servizio.",
    "terms.serviceTitle": "Descrizione del servizio",
    "terms.serviceBody":
      "ZapFile fornisce strumenti gratuiti di elaborazione file nel browser. Tutta l'elaborazione avviene localmente nel browser. Nessun file viene caricato sui nostri server.",
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
    "privacy.updated": "Ultimo aggiornamento: gennaio 2025",
    "privacy.mattersTitle": "La tua privacy conta",
    "privacy.mattersBody":
      "ZapFile è progettato con la privacy come principio. Tutta l'elaborazione avviene nel browser. I tuoi file non vengono mai caricati su server.",
    "privacy.noCollectTitle": "Dati che non raccogliamo",
    "privacy.noCollect1": "Non carichiamo, archiviamo né accediamo ai tuoi file",
    "privacy.noCollect2": "Non tracciamo il contenuto dei file che elabori",
    "privacy.noCollect3": "Non richiediamo creazione account né dati personali",
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
      "Per domande su questa informativa: privacy@zapfile.xyz.",
  },

  ja: {
    "about.title": "ZapFile について",
    "about.intro":
      "ZapFile は、ブラウザ内だけで動く無料・高速・プライバシー重視のファイルツール集です。サーバーへのアップロードもアカウントも不要です。ツールを開いてすぐ使えます。",
    "about.missionTitle": "ミッション",
    "about.missionBody":
      "誰もがプライバシーを犠牲にしたり有料契約を強いられたりせず、強力なファイルツールを使えるべきだと考えています。ZapFile は PDF・画像・音声など幅広いツールを無料で提供します。",
    "about.howTitle": "仕組み",
    "about.howBody":
      "処理はすべて最新の Web 技術を使い、ブラウザ内で直接行われます。画像の圧縮や PDF の結合時も、ファイルはあなたの端末から出ません。リモートサーバーへのアップロードはありません。ページ読み込み後はオフラインでも使えるツールもあります。",
    "about.privacyTitle": "プライバシー第一",
    "about.privacyBody":
      "プライバシーは機能の一つではなく、ZapFile の根幹です。データを収集せず、サーバー上でファイルを処理せず、アカウントも不要です。ファイルはあなたのものであり端末に留まります。",
    "about.builtTitle": "技術スタック",
    "about.builtBody":
      "ZapFile は Next.js で構築し、Canvas、Web Audio、WebAssembly などのブラウザ API を活用しています。画像処理から PDF 操作まで、複雑な処理もクライアント側だけで完結します。",
    "about.opensourceTitle": "オープンソース",
    "about.opensourceBody":
      "ZapFile はオープンソースです。透明性とコミュニティ主導の開発を大切にしています。コードを確認し、改善提案や新ツールへの貢献が可能です。",

    "blog.subtitle":
      "オンラインでファイルを扱うためのガイド、比較、ヒント。画像圧縮、PDF 結合、ウェブ上のプライバシーまで。",
    "blog.backHome": "ホームに戻る",

    "terms.title": "利用規約",
    "terms.updated": "最終更新：2025年1月",
    "terms.acceptanceTitle": "規約の承認",
    "terms.acceptanceBody":
      "ZapFile（zapfile.xyz）にアクセスし利用することで、本利用規約に同意したものとみなされます。",
    "terms.serviceTitle": "サービス内容",
    "terms.serviceBody":
      "ZapFile はブラウザ上で無料のファイル処理ツールを提供します。処理はすべてお使いのブラウザ内でローカルに行われ、ファイルは当社サーバーにアップロードされません。",
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
    "privacy.updated": "最終更新：2025年1月",
    "privacy.mattersTitle": "プライバシーの重要性",
    "privacy.mattersBody":
      "ZapFile はプライバシーを最優先に設計されています。処理はすべてブラウザ内で行われ、ファイルがサーバーにアップロードされることはありません。",
    "privacy.noCollectTitle": "収集しないデータ",
    "privacy.noCollect1": "ファイルをアップロード・保存・閲覧しません",
    "privacy.noCollect2": "処理したファイルの内容を追跡しません",
    "privacy.noCollect3": "アカウント作成や個人情報の提出を求めません",
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
      "本ポリシーに関するご質問は privacy@zapfile.xyz までご連絡ください。",
  },

  ar: {
    "about.title": "عن ZapFile",
    "about.intro":
      "ZapFile مجموعة من أدوات الملفات المجانية والسريعة والخاصة التي تعمل بالكامل في متصفحك. بلا رفع إلى خوادم وبلا حسابات. افتح أداة وابدأ.",
    "about.missionTitle": "مهمتنا",
    "about.missionBody":
      "نؤمن بأن الجميع يستحق أدواتاً قوية دون التنازل عن الخصوصية أو دفع اشتراكات. يقدّم ZapFile مجموعة كاملة لملفات PDF والصور والصوت وأكثر — مجاناً بالكامل ومتاح للجميع.",
    "about.howTitle": "كيف يعمل",
    "about.howBody":
      "يُعالَج كل شيء في متصفحك بتقنيات الويب الحديثة. عند ضغط صورة أو دمج ملفات PDF، تبقى ملفاتك على جهازك. لا يُرفع شيء إلى خوادم بعيدة. تبقى ملفاتك خاصة؛ وبعد تحميل الصفحة تعمل كثير من الأدوات حتى دون اتصال.",
    "about.privacyTitle": "الخصوصية أولاً",
    "about.privacyBody":
      "الخصوصية ليست مجرد ميزة — إنها أساس ZapFile. لا نجمع بياناتك، ولا نعالج ملفاتك على خوادمنا، ولا نطلب حساباً. ملفاتك ملكك وتبقى على جهازك.",
    "about.builtTitle": "التقنيات",
    "about.builtBody":
      "يُبنى ZapFile باستخدام Next.js ويستفيد من واجهات المتصفح: Canvas وWeb Audio وWebAssembly. هكذا ننفّذ عمليات معقدة — من الصور إلى PDF — بالكامل على جهازك.",
    "about.opensourceTitle": "مفتوح المصدر",
    "about.opensourceBody":
      "ZapFile مشروع مفتوح المصدر. نؤمن بالشفافية والتطوير المجتمعي. يمكنك مراجعة الشفرة أو اقتراح تحسينات أو المساهمة. التطوير المفتوح يجعل وعود الخصوصية قابلة للتحقق.",

    "blog.subtitle":
      "أدلة ومقارنات ونصائح للعمل مع الملفات عبر الإنترنت — من ضغط الصور إلى دمج PDF والخصوصية على الويب.",
    "blog.backHome": "العودة إلى الرئيسية",

    "terms.title": "شروط الخدمة",
    "terms.updated": "آخر تحديث: يناير 2025",
    "terms.acceptanceTitle": "قبول الشروط",
    "terms.acceptanceBody":
      "باستخدامك ZapFile (zapfile.xyz) فإنك توافق على شروط الخدمة هذه.",
    "terms.serviceTitle": "وصف الخدمة",
    "terms.serviceBody":
      "يقدّم ZapFile أدوات معالجة ملفات مجانية داخل المتصفح. تتم كل المعالجة محلياً في متصفحك. لا تُرفع ملفاتك إلى خوادمنا.",
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
    "privacy.updated": "آخر تحديث: يناير 2025",
    "privacy.mattersTitle": "خصوصيتك تهمنا",
    "privacy.mattersBody":
      "صُمم ZapFile ليكون الخصوصية في صميمه. تتم كل المعالجة في متصفحك. لا تُرفع ملفاتك إلى أي خادم.",
    "privacy.noCollectTitle": "بيانات لا نجمعها",
    "privacy.noCollect1": "لا نرفع ملفاتك ولا نخزنها ولا نصل إليها",
    "privacy.noCollect2": "لا نتتبع محتوى الملفات التي تعالجها",
    "privacy.noCollect3": "لا نطلب إنشاء حساب أو معلومات شخصية",
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
      "للأسئلة حول هذه السياسة: privacy@zapfile.xyz.",
  },
};
