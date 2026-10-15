/* Portuguese (Brazil) blog post bodies (markdown), keyed by post slug. Tool links are rewritten to /pt/... on render. */
const posts: Record<string, string> = {
  "how-to-compress-images-without-losing-quality": `# Como comprimir imagens sem perder qualidade

Imagens pesadas deixam os sites lentos, lotam o armazenamento e dificultam o compartilhamento. A boa notícia: com o método certo dá para reduzir muito o tamanho sem nenhuma perda de qualidade visível.

## Entendendo a compressão de imagens

Existem dois grandes tipos de compressão:

- **Compressão sem perdas** remove dados redundantes sem descartar informação dos pixels. A imagem descompactada é idêntica à original. O PNG usa compressão sem perdas por padrão.
- **Compressão com perdas** descarta seletivamente dados que o olho humano quase não percebe. JPEG e WebP suportam esse tipo, e por isso geram arquivos bem menores para fotos.

O segredo para comprimir "sem perder qualidade" é ficar na faixa em que os dados descartados são imperceptíveis. Na maioria das fotos, uma qualidade JPEG de 75 a 85 gera arquivos de 60 a 80% menores, sem diferença visível em tamanho normal.

## Técnicas práticas

### 1. Escolha o formato certo

O formato importa mais do que qualquer ajuste:

- **JPEG** é o melhor para fotos e imagens complexas com muitas cores.
- **PNG** é o melhor para gráficos, logos, capturas de tela e imagens com transparência.
- **WebP** atende aos dois casos e costuma gerar arquivos de 25 a 35% menores que o JPEG com a mesma qualidade. A maioria dos navegadores modernos suporta.

Se precisar trocar de formato, [o conversor de imagens do ZapFile](/tools/convert-image) faz isso na hora, no seu navegador.

### 2. Redimensione antes de comprimir

Um erro comum é comprimir uma foto de 4000×3000 que só será exibida em 800×600. Reduzir primeiro para o tamanho real de exibição pode cortar 90% do tamanho antes mesmo da compressão. Use [o redimensionador de imagens do ZapFile](/tools/resize-image) para definir medidas exatas ou escalar por porcentagem.

### 3. Use ajustes de qualidade inteligentes

Ao salvar em JPEG ou WebP, a qualidade define quantos dados serão descartados:

- **90-100**: quase sem perdas, arquivos grandes. Para arquivo ou impressão.
- **75-85**: o ponto ideal para a web. Idêntico ao original em tamanho normal.
- **50-70**: leve perda de nitidez de perto, mas ótimo para miniaturas.

### 4. Remova os metadados

Fotos de câmeras e celulares contêm metadados EXIF: coordenadas GPS, modelo da câmera, velocidade do obturador e mais. Isso pode somar de 50 a 100 KB a cada imagem. Remover reduz o arquivo e protege sua privacidade. Veja quais metadados suas imagens têm com [o visualizador EXIF do ZapFile](/tools/exif-viewer).

## Compressão em lote sem enviar arquivos

Muitas ferramentas online exigem que você envie as imagens para um servidor, o que gera preocupações com privacidade e limites de tamanho. Ferramentas que rodam no navegador, como [o compressor de imagens do ZapFile](/tools/compress-image), processam tudo no seu dispositivo. Suas imagens nunca saem do computador, não há limite de tamanho e o resultado é imediato.

## Checklist rápido

- Escolha o formato certo (JPEG para fotos, PNG para gráficos, WebP para os dois).
- Redimensione para as medidas que você realmente precisa.
- Use qualidade entre 75 e 85 para a web.
- Remova metadados desnecessários.
- Use um compressor no navegador que respeite sua privacidade.

Seguindo esses passos, você terá sempre arquivos menores sem perda de qualidade perceptível.`,

  "jpg-vs-png-vs-webp-which-format-to-use": `# JPG, PNG ou WebP: qual formato de imagem usar?

Escolher o formato errado pode dobrar ou triplicar o tamanho do arquivo sem nenhum ganho visível. Este guia explica os três formatos mais usados para você decidir rápido e bem.

## JPEG (JPG)

O JPEG é o formato padrão de fotos na web desde os anos 1990. Ele usa compressão com perdas, ou seja, descarta alguns dados para sempre para gerar arquivos menores.

**Ideal para:**
- Fotos e imagens com degradês suaves
- Postagens em redes sociais
- Qualquer imagem em que uma pequena perda de qualidade seja aceitável

**Limitações:**
- Não suporta transparência
- Cada novo salvamento com perdas degrada mais a imagem
- Não é ideal para texto, desenhos de linha ou bordas nítidas

Uma foto JPEG de boa qualidade costuma ser de 5 a 10 vezes menor que a mesma imagem em PNG.

## PNG

O PNG usa compressão sem perdas, então a imagem decodificada é uma cópia perfeita da original. Ele também suporta transparência alfa completa, o que o torna essencial para logos, ícones e elementos de interface.

**Ideal para:**
- Logos, ícones e gráficos com bordas nítidas
- Capturas de tela e imagens com texto
- Qualquer imagem que precise de fundo transparente
- Imagens que serão editadas e salvas várias vezes

**Limitações:**
- Arquivos bem maiores para fotos (muitas vezes de 3 a 5 vezes maiores que JPEG)
- Sem animação nativa (esse papel é do GIF e do APNG)

## WebP

Criado pelo Google, o WebP suporta compressão com e sem perdas, além de transparência e animação. Com a mesma qualidade, gera arquivos sempre menores que JPEG e PNG.

**Ideal para:**
- Publicação na web quando você quer o menor arquivo possível
- Imagens que precisam de qualidade e transparência
- Progressive web apps e sites focados em desempenho

**Limitações:**
- Alguns navegadores muito antigos não suportam (mas o suporte global passa de 97%)
- Alguns visualizadores e editores de desktop têm suporte limitado
- Menos aceito em fluxos de impressão

## Comparação lado a lado

| Recurso | JPEG | PNG | WebP |
|---|---|---|---|
| Compressão | Com perdas | Sem perdas | Ambas |
| Transparência | Não | Sim | Sim |
| Animação | Não | Não | Sim |
| Ideal para | Fotos | Gráficos | Ambos |
| Tamanho relativo | Pequeno | Grande | O menor |
| Suporte nos navegadores | Universal | Universal | 97%+ |

## Como escolher

Um processo simples:

1. **É uma foto?** Use JPEG com qualidade 80, ou WebP se seu público suportar.
2. **Precisa de transparência?** PNG para máxima compatibilidade ou WebP para arquivos menores.
3. **É um logo, ícone ou captura de tela?** Use PNG.
4. **Está otimizando o desempenho web?** Use WebP com JPEG como alternativa.

## Convertendo entre formatos

Se suas imagens estão no formato errado, converter é simples. [O conversor de imagens do ZapFile](/tools/convert-image) suporta esses formatos e processa os arquivos inteiramente no navegador. Sem envio, sem espera e sem limite de tamanho.

Você também pode usar [o compressor de imagens do ZapFile](/tools/compress-image) para ajustar a qualidade depois da conversão e achar o melhor equilíbrio entre tamanho e nitidez.

## Resumo

Não existe um único formato "melhor". O JPEG brilha em fotos, o PNG é imbatível em gráficos nítidos ou com transparência e o WebP é o coringa moderno com os menores arquivos. Escolha o formato de acordo com seu conteúdo e seu público e você terá sempre o melhor resultado.`,

  "how-to-merge-pdf-files-online-free": `# Como juntar arquivos PDF online grátis

Juntar notas fiscais, montar um relatório a partir de capítulos separados ou enviar documentos a um cliente em um único pacote: juntar PDFs é uma das tarefas mais comuns com arquivos. Veja como fazer isso rápido, de graça e sem abrir mão da sua privacidade.

## Por que juntar PDFs?

Enviar vários anexos em PDF é bagunçado. Quem recebe precisa baixar e abrir cada arquivo separadamente, e a ordem pode se perder. Um único documento é mais fácil de compartilhar e de ler, e passa uma imagem mais profissional.

Situações comuns:

- Reunir páginas digitalizadas em um único documento
- Juntar partes de um contrato vindas de equipes diferentes
- Montar um portfólio ou uma inscrição com vários anexos
- Criar um único material a partir de várias apresentações exportadas em PDF

## Método 1: ferramentas no navegador (as mais rápidas e privadas)

Ferramentas de PDF que rodam no navegador processam seus arquivos direto no seu dispositivo. Nada é enviado a um servidor, então seus documentos continuam totalmente privados.

[A ferramenta Juntar PDF do ZapFile](/tools/merge-pdf) funciona assim:

1. Abra a ferramenta no navegador.
2. Arraste e solte seus PDFs na área de envio ou clique para escolher.
3. Organize os arquivos na ordem desejada arrastando-os.
4. Baixe o PDF combinado.

Tudo leva segundos, funciona com quantos arquivos você quiser e, como roda localmente, não há limite de tamanho.

## Método 2: programas de desktop

Se você trabalha muito com PDF offline, programas como Adobe Acrobat, PDF-XChange Editor ou o gratuito PDFsam juntam arquivos. A desvantagem é que a maioria dos editores completos é paga, e as alternativas gratuitas podem ser chatas de instalar e configurar.

## Método 3: linha de comando

Usuários técnicos podem juntar PDFs com Ghostscript ou com a biblioteca Python PyPDF2 em scripts. É útil para automação, mas exagerado para tarefas pontuais.

## Privacidade importa

Muitas ferramentas de PDF online populares enviam seus arquivos para servidores remotos. Seus documentos passam por infraestrutura de terceiros, e você precisa confiar que serão apagados depois. Para documentos sensíveis como contratos, declarações de imposto ou prontuários médicos, isso é uma preocupação real.

Ferramentas no navegador eliminam esse risco por completo. Quando você junta PDFs com o [ZapFile](/), seus arquivos nunca saem do seu dispositivo. O processamento é feito com JavaScript e WebAssembly na aba do navegador. Ao fechar a aba, nada fica em nenhum servidor, porque nada foi enviado.

## Dicas para um resultado limpo

- **Confira a orientação das páginas** antes de juntar. Se algumas estiverem na horizontal e outras na vertical, o arquivo final pode parecer irregular.
- **Remova antes as páginas desnecessárias.** Use um [divisor de PDF](/tools/split-pdf) para ficar só com as páginas de que precisa.
- **Revise o documento final** rolando por ele para confirmar a ordem das páginas.

## Resumo

Juntar PDFs não exige software caro nem enviar documentos sensíveis para servidores desconhecidos. Uma ferramenta no navegador como o [Juntar PDF do ZapFile](/tools/merge-pdf) dá resultado na hora, aceita qualquer tamanho e mantém seus documentos privados. Abra a ferramenta, solte os arquivos e pronto, em segundos.`,

  "best-free-online-file-tools-2025": `# As melhores ferramentas de arquivos online grátis em 2025

A web está cheia de ferramentas para arquivos, mas a maioria é lotada de anúncios, limita muito a versão gratuita ou pede que você envie documentos sensíveis a servidores desconhecidos. Este guia destaca as que são de fato grátis, rápidas e respeitam sua privacidade.

## O que procurar em uma ferramenta online

Antes das ferramentas, estes são os critérios que importam:

- **Sem cadastro obrigatório.** Se a ferramenta exige conta só para comprimir uma imagem, procure outra.
- **Sem limite de tamanho.** Limites artificiais existem para empurrar você para um plano pago.
- **Processamento que prioriza a privacidade.** As melhores processam os arquivos no navegador: nada é enviado.
- **Interface limpa.** Você não deveria ter que fechar pop-ups e banners para trabalhar.

## Ferramentas de PDF

### Juntar, dividir e comprimir PDFs

O PDF é o formato universal de documentos, e trabalhar com ele não deveria exigir software caro. O [ZapFile](/tools/merge-pdf) oferece um conjunto completo de ferramentas de PDF que rodam inteiramente no navegador:

- **Juntar PDF** – Combine vários arquivos em um documento, ordenando por arrastar e soltar.
- **Dividir PDF** – Extraia páginas ou intervalos de páginas em arquivos separados.
- **PDF para imagens** – Converta cada página de um PDF em PNG ou JPEG de alta qualidade.

Tudo é processado localmente, então você pode trabalhar com contratos, documentos financeiros e outros arquivos sensíveis com segurança.

## Ferramentas de imagem

### Comprimir e converter imagens

Otimizar imagens é essencial para o desempenho web e para economizar espaço. Prefira ferramentas que deixam você controlar a qualidade em vez de aplicar a mesma compressão para tudo.

[As ferramentas de imagem do ZapFile](/tools/compress-image) incluem:

- **Compressor de imagens** – Reduza JPEG, PNG e WebP com qualidade ajustável.
- **Conversor de imagens** – Troque na hora entre JPG, PNG, WebP e AVIF.
- **Redimensionador** – Defina medidas exatas ou escale por porcentagem.
- **Visualizador EXIF** – Veja, analise e remova os metadados das suas fotos direto no navegador.

### Criar e editar

Além da compressão, estas ferramentas de imagem são úteis:

- **Criador de colagens** – Organize várias fotos em grades.
- **Gerador de memes** – Coloque textos em imagens com fonte e posição personalizáveis.
- **Gerador de favicon** – Crie favicons nos tamanhos certos a partir de qualquer imagem.

O ZapFile oferece tudo isso em [zapfile.xyz/tools](/tools).

## Ferramentas úteis

Algumas das que mais economizam tempo são pequenos utilitários usados de vez em quando:

- **Gerador de QR Code** – Crie QR Codes para links, texto ou contatos. [O gerador de QR Code do ZapFile](/tools/qr-generator) permite personalizar as cores e baixar em vários formatos.
- **Gerador de senhas** – Crie senhas fortes e aleatórias com tamanho e tipos de caracteres configuráveis.
- **Formatador JSON** – Cole um JSON bagunçado e receba-o formatado e validado na hora.
- **Comparador de textos** – Compare dois textos lado a lado para ver as diferenças.
- **Contador de palavras** – Conte palavras, caracteres e frases e estime o tempo de leitura.

## Por que as ferramentas no navegador ganham

Em 2025 a tendência é clara: processar no navegador. Os navegadores modernos fazem tarefas que antes exigiam software de desktop ou servidor. As vantagens são evidentes:

- **Privacidade** – Seus arquivos não saem do dispositivo.
- **Velocidade** – Sem espera de envio ou download.
- **Sem limites** – Sem tetos de tamanho artificiais.
- **Sem instalação** – Funciona em qualquer dispositivo com navegador moderno.

## Resumo

Você não precisa pagar assinaturas nem confiar seus arquivos a servidores aleatórios. Ferramentas como o [ZapFile](/) oferecem um kit completo e focado em privacidade para PDFs, imagens, vídeo, áudio e tarefas do dia a dia. Salve nos favoritos as que você mais usa e pare de perder tempo com alternativas cheias de anúncios.`,

  "why-browser-based-tools-are-more-private": `# Por que ferramentas no navegador são mais privadas que as da nuvem

Quando você usa uma ferramenta online comum para comprimir uma imagem ou juntar um PDF, seu arquivo é enviado a um servidor remoto, processado lá e devolvido. Você confia que esse servidor vai tratar seus dados com responsabilidade, apagá-los logo e protegê-los contra vazamentos. Ferramentas no navegador eliminam totalmente essa necessidade de confiança.

## Como funcionam as ferramentas na nuvem

O modelo tradicional segue estes passos:

1. Você escolhe um arquivo no seu dispositivo.
2. O arquivo é enviado pela internet ao servidor da ferramenta.
3. O servidor processa o arquivo (comprime, converte, junta etc.).
4. O arquivo processado volta ao seu navegador para download.
5. O servidor deveria apagar seu arquivo, mas você não tem como verificar.

Em cada etapa, seu arquivo fica em uma infraestrutura que você não controla. Ele passa por roteadores, balanceadores de carga e sistemas de armazenamento de terceiros. Mesmo com boas intenções do serviço, um vazamento, um servidor mal configurado ou um funcionário mal-intencionado podem expor seus arquivos.

## Como funcionam as ferramentas no navegador

As ferramentas no navegador funcionam de forma bem diferente:

1. Você abre a ferramenta no navegador.
2. O código dela (JavaScript e às vezes WebAssembly) é carregado no seu navegador.
3. Você escolhe um arquivo; ele é lido direto do seu dispositivo para a memória do navegador.
4. O processamento acontece inteiramente na aba.
5. O resultado é gerado localmente e você o baixa do seu próprio dispositivo.

Seu arquivo nunca toca um servidor remoto. Não há nada a interceptar, vazar ou apagar, porque os dados nunca saíram da sua máquina.

## O que torna isso possível

Os navegadores modernos são muito poderosos. Estas tecnologias permitem o processamento local:

- **API Canvas** para editar, redimensionar e converter imagens.
- **API Web Audio** para processar e converter áudio.
- **WebAssembly (WASM)**, que executa código compilado em velocidade quase nativa. É assim que ferramentas como o [ZapFile](/) processam PDFs complexos e imagens inteiramente no navegador.
- **API File e Blobs** para ler e gravar arquivos sem servidor.

Essas APIs amadureceram muito nos últimos anos e fecharam a diferença de desempenho em relação ao processamento no servidor.

## O que isso significa para a privacidade

Pense nos arquivos que as pessoas processam online:

- **Declarações de imposto e extratos bancários** com números de conta e renda.
- **Contratos e documentos jurídicos** com cláusulas confidenciais.
- **Prontuários médicos**, protegidos por lei.
- **Fotos** com metadados EXIF que incluem coordenadas GPS e datas.
- **Documentos de empresa** com informações confidenciais.

Enviar qualquer um deles a uma ferramenta na nuvem cria uma cópia no servidor de outra pessoa. Com uma ferramenta no navegador como o [ZapFile](/), esses arquivos ficam no seu dispositivo do início ao fim. (A única exceção no ZapFile é o modo rápido opcional de Word, Excel, PowerPoint e HTML para PDF, que converte no nosso servidor e apaga o arquivo logo em seguida; o modo privado dessas ferramentas converte no seu navegador.)

## Como verificar se uma ferramenta realmente roda no navegador

Nem toda ferramenta que se diz "privada" processa os arquivos localmente. Veja como conferir:

### Observe a atividade de rede

Abra as ferramentas de desenvolvedor do navegador (F12), vá até a aba Rede e processe um arquivo. Se aparecerem grandes envios para o servidor da ferramenta, seu arquivo está indo para a nuvem.

### Teste offline

Uma ferramenta que realmente roda no navegador continua funcionando mesmo sem internet, depois que a página carrega. Desligue o Wi-Fi e processe um arquivo. Se ainda funcionar, o processamento é local.

### Leia a política de privacidade

Ferramentas legítimas no navegador dizem claramente que os arquivos não são enviados. Desconfie de frases vagas como "levamos sua privacidade a sério" sem detalhes.

## As contrapartidas

Processar no navegador também tem limites:

- **A velocidade** depende do seu dispositivo. Um celular fraco será mais lento que um servidor na nuvem com hardware dedicado.
- **Arquivos muito grandes** podem pesar em dispositivos com pouca memória.
- **Operações pesadas** como OCR ou remoção de fundo com IA baixam um modelo ou mecanismo na primeira vez, o que leva um momento. O ZapFile executa as duas no navegador.

Ainda assim, para a grande maioria das tarefas comuns, as ferramentas no navegador são rápidas o bastante e o ganho de privacidade é enorme.

## Resumo

Escolher ferramentas no navegador em vez das alternativas na nuvem é um dos passos mais simples para proteger seus arquivos. Ferramentas como o [ZapFile](/) mostram que não é preciso abrir mão da conveniência pela privacidade. Da próxima vez que for comprimir uma imagem, juntar um PDF ou converter um vídeo, confira se a ferramenta processa os arquivos localmente. Seus dados merecem.`,

  "how-to-compress-pdf-on-iphone": `# Como comprimir um PDF no iPhone

O iPhone lida com PDFs o tempo todo: anexos de e-mail, downloads e digitalizações. Quando um arquivo é grande demais para enviar ou fazer upload, a solução é comprimir. Veja um caminho prático que respeita sua privacidade.

## Por que o tamanho importa

PDFs grandes esbarram nos limites de e-mail, deixam lentos os envios em formulários e desperdiçam espaço. A compressão reduz o tamanho e mantém o documento legível.

## Compressão no navegador

O Safari abre o **ZapFile** e outras ferramentas que rodam no navegador. Seu PDF fica no aparelho; o processamento é feito localmente em JavaScript. Assim você evita enviar contratos sensíveis para servidores desconhecidos.

## Passo a passo

1. Abra o [Comprimir PDF](/tools/pdf-compress) ou uma ferramenta parecida no Safari.
2. Escolha seu PDF em Arquivos ou Fotos.
3. Baixe o arquivo menor.

## Dicas

- Em digitalizações, reduza a resolução antes de exportar, se o app permitir.
- Se o texto ficar borrado depois da compressão, comprima menos ou divida o documento.

## Resumo

Para **comprimir PDF no iPhone**, prefira ferramentas que digam claramente que os arquivos são processados no navegador. O [ZapFile](/tools) oferece compressão e outras ferramentas sem envio de arquivos.`,

  "jpg-vs-webp-which-is-better": `# JPG ou WebP: qual é melhor?

O **JPEG** é o padrão para fotos há décadas. O **WebP** é o formato moderno do Google, com compressão melhor e transparência opcional.

## Tamanho do arquivo

Com qualidade visual parecida, o WebP costuma gerar arquivos **de 25 a 35% menores** que o JPEG. Isso melhora as Core Web Vitals e o SEO.

## Quando usar JPEG

- Para máxima compatibilidade com sistemas antigos.
- Em câmeras e celulares que salvam em JPEG por padrão.

## Quando usar WebP

- Em sites e apps feitos para navegadores modernos.
- Quando você quer arquivos menores sem perda visível.

## Convertendo

Use [o conversor de imagens do ZapFile](/tools/convert-image) para transformar PNG ou JPEG em WebP no navegador.

## Resumo

Na maioria dos projetos web, **o WebP ganha no tamanho**; o **JPEG** continua sendo a alternativa para compatibilidade universal.`,

  "what-is-qr-code-how-to-create": `# O que é um QR Code?

Um **QR Code** guarda texto – geralmente uma URL, uma configuração de Wi-Fi ou dados de contato – em um padrão quadrado que o celular lê com a câmera.

## Usos comuns

- Cardápios de restaurantes e panfletos
- Links para baixar apps
- Ingressos de eventos

## Criando um QR Code

Use [o gerador de QR Code do ZapFile](/tools/qr-generator): digite sua URL ou texto e baixe a imagem. Não precisa de conta; o código é gerado no navegador.

## Resumo

QR Codes ligam o impresso ao digital. Para criar de graça e com privacidade, use um gerador que não envie seus dados para a nuvem.`,

  "how-to-merge-pdf-files-step-by-step": `# Como juntar arquivos PDF

Juntar combina vários PDFs em um único arquivo – ideal para relatórios, inscrições e arquivamento.

## Passo a passo

1. Reúna todos os PDFs e defina a ordem.
2. Abra o **Juntar PDF** no navegador.
3. Adicione os arquivos em sequência.
4. Baixe o PDF combinado.

## Privacidade

Escolha [ferramentas para juntar PDF](/tools/merge-pdf) que processem os arquivos localmente, para que contratos e documentos de identidade nunca saiam da sua máquina.

## Resumo

Juntar é simples; a escolha que importa é a **confiança**. Prefira o processamento no navegador.`,

  "how-to-split-pdf-extract-pages": `# Como dividir um PDF

Dividir permite tirar páginas ou capítulos sem enviar o arquivo inteiro.

## Usos

- Enviar por e-mail só as páginas relevantes
- Remover páginas em branco ou sensíveis

## Ferramenta

Com o [Dividir PDF](/tools/split-pdf), você escolhe as páginas no navegador e baixa arquivos separados ou um ZIP.

## Resumo

Dividir é essencial em muitos fluxos de trabalho. Mantenha os arquivos locais sempre que possível.`,

  "free-pdf-tools-no-signup": `# Ferramentas de PDF grátis sem cadastro

Muitas ferramentas exigem conta por causa de análises ou vendas. Ferramentas **sem cadastro** evitam esse atrito e costumam combinar com privacidade.

## Sinais de alerta

- Envio obrigatório para a nuvem até em tarefas simples
- Políticas de retenção de dados pouco claras

## Bons sinais

- Processamento no navegador
- Declarações de privacidade claras

## ZapFile

O [ZapFile](/) oferece dezenas de ferramentas de PDF e imagem sem conta. Quase tudo roda no seu navegador; só o modo rápido opcional de Office para PDF converte no nosso servidor e apaga o arquivo logo em seguida.

## Resumo

Você pode juntar, dividir e comprimir PDFs sem criar mais uma senha.`,

  "compress-image-for-web-core-web-vitals": `# Imagens e Core Web Vitals

O **Largest Contentful Paint (LCP)** depende muitas vezes da imagem principal da página. Arquivos pesados atrasam a exibição e prejudicam o ranqueamento.

## Estratégia

1. Escolha o formato certo (WebP/AVIF quando possível).
2. Redimensione para o tamanho de exibição.
3. Comprima com uma qualidade razoável.

## Ferramenta

Use o [Comprimir imagem](/tools/compress-image) com os controles de qualidade e dimensão máxima.

## Resumo

Imagens menores melhoram o SEO e a experiência do usuário. Em sites competitivos, comprimir não é opcional.`,

  "remove-pdf-metadata-privacy": `# Metadados e privacidade

PDFs e imagens podem conter **metadados**: autor, data de criação, coordenadas GPS e modelo da câmera.

## Riscos

Compartilhar arquivos publicamente pode revelar mais do que você imagina.

## Como evitar

- Use um **visualizador EXIF** para conferir os dados.
- Remova os metadados antes de publicar, quando necessário.

## Ferramentas

O [Visualizador EXIF](/tools/exif-viewer) mostra os dados embutidos nas imagens e salva uma cópia limpa sem eles. Recodificar a imagem com o [Comprimir imagem](/tools/compress-image) também remove os dados EXIF.

## Resumo

Metadados são invisíveis, mas reais. Confira antes de compartilhar.`,

  "jwt-tokens-explained-developers": `# JWT explicado

Um **JWT** tem três partes: cabeçalho, conteúdo (payload) e assinatura, codificadas em **base64url**.

## Decodificando

Use o [decodificador JWT](/tools/jwt-decoder) no navegador para ver as claims. **Nunca** confie em um conteúdo decodificado sem verificar a assinatura no servidor.

## Resumo

JWTs são práticos para APIs; decodificar é didático, mas não é autorização.`,

  "uuid-vs-nanoid": `# UUID ou Nanoid?

**UUIDs** são identificadores de 128 bits com formato de texto padronizado. O **Nanoid** gera IDs mais curtos e seguros para URL, com aleatoriedade parecida.

## Gerando

Use o [gerador de UUID](/tools/uuid-generator) para criar rapidamente IDs aleatórios para testes e scripts.

## Resumo

UUID para interoperabilidade; Nanoid quando quiser strings mais curtas.`,

  "qr-code-scanner-vs-generator": `# Leitor ou gerador?

- **Gerador**: cria um QR Code a partir de texto ou URL.
- **Leitor**: lê um QR Code de uma imagem enviada ou da câmera.

O ZapFile oferece um [gerador de QR Code](/tools/qr-generator) e um [leitor de QR Code](/tools/qr-scanner).

## Resumo

Use a ferramenta certa para cada sentido do seu fluxo de trabalho.`,

  "browser-based-vs-cloud-pdf-tools": `# PDF no navegador ou na nuvem?

Ferramentas **na nuvem** enviam seu arquivo para um servidor. Ferramentas **no navegador** processam localmente depois que a página carrega.

## Quando o local ganha

- Documentos jurídicos, médicos ou financeiros
- Internet ruim ou limitada

## Quando a nuvem ganha

- OCR em escala muito grande
- Automação intensa via APIs

## ZapFile

O ZapFile foi feito para que seus arquivos fiquem no seu dispositivo: privacidade desde o projeto. Até o OCR roda no navegador. A única exceção é o modo rápido opcional de Word, Excel, PowerPoint e HTML para PDF, que converte no nosso servidor e apaga o arquivo logo em seguida.

## Resumo

Escolha o método de acordo com a sensibilidade do documento.`,

  "resize-images-for-instagram-and-web": `# Redimensionar imagens para cada plataforma

Cada plataforma tem recomendações próprias de **proporção** e **pixels**.

## Fluxo de trabalho

1. Saiba as medidas de destino.
2. Mantenha a proporção no [Redimensionar imagem](/tools/resize-image).
3. Exporte no formato certo.

## Resumo

As medidas certas evitam cortes estranhos e ampliações borradas.`,

  "json-formatter-why-developers-use-it": `# Formatador JSON

O **JSON** está em todas as APIs. JSON minificado é difícil de ler.

## Formatando

Use o [formatador JSON](/tools/json-formatter) para indentar e encontrar erros no navegador.

## Resumo

Formate localmente quando as respostas tiverem dados sensíveis.`,

  "hash-generator-sha256-md5-explained": `# Noções de hash

Um **hash** transforma dados em uma impressão digital de tamanho fixo. O **SHA-256** é muito usado; o **MD5** é fraco para segurança.

## Usos

- Verificar a integridade de arquivos
- Comparar duplicados

## Ferramenta

O [gerador de hash](/tools/hash-generator) calcula os hashes no navegador.

## Resumo

Use SHA-256 em projetos novos.`,

  "color-palette-from-image": `# Paletas de cores a partir de imagens

Designers costumam **combinar** as cores da interface com as fotos.

## Fluxo de trabalho

Envie uma imagem para a [Paleta de cores](/tools/color-palette) e copie os códigos HEX.

## Resumo

Paletas rápidas e coerentes sem usar o conta-gotas manualmente.`,

  "base-converter-decimal-hex-binary": `# Conversão de bases numéricas

Programadores alternam o tempo todo entre **decimal**, **hexadecimal**, **binário** e **octal**.

## Ferramenta

O [conversor de bases](/tools/base-converter) converte na hora no navegador.

## Resumo

Tenha um conversor à mão ao ler logs e dumps de memória.`,

  "css-minifier-faster-websites": `# Minificar CSS

**CSS minificado** reduz os bytes transferidos. Guarde sempre os originais no controle de versão.

## Ferramenta

O [minificador de CSS](/tools/css-minifier) formata e minifica no navegador.

## Resumo

Combine a minificação com gzip ou Brotli no servidor.`,

  "password-generator-length-and-symbols": `# Senhas fortes em 2026

Comprimento vale mais que complexidade. **16 caracteres ou mais** com tipos variados são uma boa base para contas importantes.

## Aleatória ou frase-senha?

- Strings **aleatórias** resistem a tentativas de adivinhação.
- **Frases-senha** (quatro palavras aleatórias) podem ser mais fáceis de digitar.

## Ferramenta

Use o [gerador de senhas](/tools/password-generator) localmente no navegador.

## Resumo

Use uma senha diferente para cada site e um gerenciador de senhas.`,

  "regex-tester-debugging-patterns": `# Testando regex

Expressões regulares são poderosas e fáceis de errar.

## Privacidade

Use o [testador de regex](/tools/regex-tester) para que logs sensíveis nunca saiam da sua máquina.

## Resumo

Teste localmente e depois cole o padrão final no seu código.`,

  "how-to-convert-png-to-jpg-online-free": `# Como converter PNG para JPG online grátis

Converter imagens entre formatos é uma das tarefas mais comuns. Seja para ter um arquivo menor para enviar por e-mail, um formato aceito por um formulário web ou para padronizar sua biblioteca de imagens, passar de PNG para JPG leva segundos com a ferramenta certa.

## PNG ou JPG: qual usar?

**PNG** (Portable Network Graphics):
- Compressão sem perdas: nenhum dado de pixel é descartado
- Suporta transparência (canal alfa)
- Ideal para logos, capturas de tela, gráficos e ilustrações
- Arquivos maiores que JPG em fotos

**JPG** (JPEG):
- Compressão com perdas: descarta dados para reduzir o tamanho
- Sem transparência
- Ideal para fotos e imagens complexas e coloridas
- Costuma ser de 60 a 80% menor que PNG em fotos

**Quando converter PNG → JPG**: quando seu PNG é uma foto ou imagem complexa e você não precisa de transparência. O tamanho cai bastante, sem diferença visível.

**Quando NÃO converter**: se o PNG tiver áreas transparentes ou for um logo ou desenho de linha. O JPG não suporta transparência e adiciona um fundo branco (ou colorido). A compressão com perdas também estraga as bordas nítidas dos gráficos.

## Como converter PNG para JPG com o ZapFile

1. Abra [o conversor de imagens do ZapFile](/tools/convert-image)
2. Solte seu arquivo PNG na área de envio (ou clique para escolher)
3. Selecione **JPG** como formato de saída
4. Inicie a conversão
5. Baixe seu JPG

A conversão acontece inteiramente no navegador: seu arquivo nunca é enviado a um servidor.

## Escolhendo a qualidade certa

Ao converter para JPG, a qualidade faz diferença:

| Qualidade | Tamanho | Uso |
|---------|-----------|----------|
| 90-100% | Grande | Arquivo, impressão profissional |
| 75-85% | Médio | Web, e-mail, redes sociais |
| 50-70% | Pequeno | Miniaturas, prévias |

Para a maioria dos usos, 80% é o ponto ideal: arquivos de 70 a 80% menores que o PNG original sem perda visível na tela.

## Conversão em lote

Se você tem muitos PNGs, o ZapFile faz processamento em lote. Envie vários arquivos de uma vez e baixe todos os JPGs com um clique.

## Voltando: de JPG para PNG

Se depois precisar da imagem em PNG (por exemplo, para adicionar transparência), use a mesma ferramenta e escolha PNG como saída. A qualidade perdida na conversão PNG→JPG não volta, então guarde seu PNG original se achar que vai precisar.

## Resumo

- Converta PNG para JPG quando precisar de um arquivo menor e não houver transparência
- Mantenha PNG para logos, gráficos e tudo com fundo transparente
- Use qualidade de 75 a 85% para imagens na web
- [O conversor de imagens do ZapFile](/tools/convert-image) converte na hora e com privacidade no navegador`,

  "how-to-add-watermark-to-image-online": `# Como adicionar marca d'água a uma imagem online (grátis)

A marca d'água é a forma padrão de proteger fotos e artes contra uso não autorizado. Seja você fotógrafo, designer ou criador de conteúdo, uma marca d'água desestimula o roubo enquanto você continua compartilhando seu trabalho online.

## Por que colocar marca d'água nas imagens?

- **Direitos autorais**: identifica você claramente como autor
- **Visibilidade da marca**: seu nome ou logo acompanha a imagem quando ela é compartilhada
- **Desestímulo ao roubo**: a maioria dos robôs que copiam imagens ignora conteúdo com marca visível
- **Portfólio**: mostre seu trabalho sem entregar os arquivos em resolução máxima

## Como adicionar marca d'água com o ZapFile

1. Abra [a ferramenta de marca d'água do ZapFile](/tools/watermark-image)
2. Envie sua imagem (JPG, PNG ou WebP)
3. Digite o texto da marca (seu nome, site ou aviso de copyright)
4. Ajuste posição, opacidade, tamanho e cor
5. Baixe o resultado

Não precisa de conta. Sua imagem é processada localmente no navegador e nunca é enviada a nenhum servidor.

## Boas práticas

### Posição
Colocar a marca no **centro** da imagem torna mais difícil cortá-la. O canto inferior direito fica mais limpo, mas é fácil de remover recortando.

### Opacidade
O recomendado é **30 a 50% de opacidade**. Uma marca totalmente opaca estraga a imagem; transparente demais, some. Semitransparente, ela é legível sem cobrir todo o seu trabalho.

### Texto
Inclua:
- Seu nome ou o nome do estúdio
- O endereço do seu site
- O símbolo © e o ano: © 2026 SeuNome

### Cor
Texto branco com uma sombra sutil funciona na maioria das imagens. Evite o preto: ele some nas áreas escuras. Escolha uma cor que contraste com os tons típicos das suas fotos.

## Marca d'água em lote

Se precisar marcar muitas imagens com as mesmas configurações, o ZapFile aceita envio de várias imagens. Processe o ensaio inteiro de uma vez.

## O que a marca d'água não faz

Marcas d'água desestimulam o roubo casual, mas não são infalíveis. Alguém determinado consegue remover uma marca semitransparente. Em imagens valiosas, proteja também seus direitos e entregue só prévias em baixa resolução até o pagamento ser confirmado.

## Resumo

- Coloque marca d'água nas fotos antes de compartilhar para proteger seu trabalho
- Texto semitransparente no centro da imagem oferece a melhor proteção
- [A ferramenta de marca d'água do ZapFile](/tools/watermark-image) é grátis, privada e roda no navegador`,

  "how-to-crop-image-online-free": `# Como recortar uma imagem online grátis

Recortar é uma das edições de foto mais básicas. Seja para tirar bordas que distraem, montar um quadrado perfeito para o Instagram ou cortar um banner 16:9 para o topo de um site, uma boa ferramenta online resolve em segundos.

## Como recortar com o ZapFile

1. Abra [a ferramenta Recortar imagem do ZapFile](/tools/crop-image)
2. Envie sua foto (JPG, PNG ou WebP)
3. Escolha uma proporção pronta ou arraste as alças livremente
4. Baixe a imagem recortada

Tudo acontece no navegador: sem envio e sem cadastro.

## Proporções comuns e quando usar

| Proporção | Uso |
|-------|----------|
| 1:1 (quadrado) | Posts do Instagram, fotos de perfil |
| 16:9 | Miniaturas do YouTube, banners de sites, vídeo widescreen |
| 4:3 | Foto impressa clássica, apresentações |
| 3:2 | Proporção padrão de DSLR, fotos 10×15 |
| 9:16 | Stories do Instagram, TikTok, Reels |
| 2:1 | Capa do X (Twitter), impressões panorâmicas |

## Dicas para recortar melhor

### Regra dos terços
Divida o quadro em uma grade 3×3. Coloque os olhos do seu tema (ou o ponto de interesse) em uma das quatro interseções, em vez de bem no centro. É por isso que a maioria das câmeras mostra uma grade.

### Recorte no que importa
Remova o "espaço morto", áreas vazias sem interesse. Enquadramentos mais fechados ficam mais dinâmicos e intencionais.

### Não exagere no recorte
Recortar reduz a resolução. Se você parte de uma imagem de 2000 px de largura e fica com 20% dela, sobram 400 px. Para a web costuma bastar; para imprimir, cuidado.

### Centralize as fotos de perfil
As redes sociais cortam a foto de perfil em círculo. Garanta que o importante esteja no centro antes de enviar.

## Recortar ou redimensionar?

**Recortar** muda a composição removendo partes da imagem. As medidas mudam, mas os pixels que ficam mantêm a qualidade original.

**Redimensionar** aumenta ou diminui a imagem inteira. Nada é removido, mas a nitidez pode cair se você ampliar muito.

Muitas vezes você precisa das duas coisas: primeiro recortar para a composição certa e depois redimensionar para as medidas finais.

## Resumo

- Use proporções prontas para recortar certo para cada plataforma
- Aplique a regra dos terços para composições mais interessantes
- [A ferramenta de recorte do ZapFile](/tools/crop-image) é grátis e roda inteiramente no navegador`,

  "image-to-pdf-converter-free-online": `# Converter imagem em PDF: ferramenta online grátis

Converter uma imagem em PDF é uma necessidade comum: enviar uma foto como documento formal, juntar várias imagens em um arquivo para o e-mail ou atender a um sistema que só aceita PDF. Com a ferramenta certa, leva segundos.

## Como converter imagem em PDF com o ZapFile

1. Abra [a ferramenta Imagem para PDF do ZapFile](/tools/image-to-pdf)
2. Envie uma ou mais imagens (JPG, PNG ou WebP)
3. Ajuste a ordem se for combinar várias
4. Crie o PDF
5. Baixe seu PDF

Suas imagens nunca saem do navegador: sem envio a servidores e sem conta.

## Várias imagens em um único PDF

Se você tem um documento de várias páginas fotografado em imagens separadas (um contrato digitalizado, uma pilha de recibos, um álbum de fotos), dá para juntar tudo em um PDF em um passo:

1. Envie todas as imagens de uma vez
2. Arraste para reordenar, se necessário
3. Converta: cada imagem vira uma página do PDF

## Qualidade das imagens no PDF

O ZapFile mantém as fotos JPEG como estão sempre que possível e deixa as imagens PNG sem perdas; WebP e AVIF entram como JPEG de alta qualidade. Para PDFs mais nítidos:

- Comece pela versão de maior resolução da imagem
- Use PNG para capturas de tela ou gráficos com texto (sem perdas)
- Use JPG de alta qualidade (80% ou mais) para fotos

## Quando converter imagens em PDF?

- **Anexos de e-mail**: PDFs abrem em qualquer dispositivo com a mesma formatação
- **Documentos oficiais**: muitos formulários e portais exigem PDF
- **Compartilhar uma série de fotos**: um PDF é mais simples de compartilhar que uma pasta de imagens
- **Layouts prontos para impressão**: gráficas preferem PDF

## No sentido contrário: PDF para imagens

Se precisar do inverso – tirar imagens de um PDF –, use [a ferramenta PDF para imagens do ZapFile](/tools/pdf-to-images). Ela converte cada página em PNG ou JPG de alta qualidade.

## Resumo

- Converta imagens avulsas ou junte várias em um PDF
- A qualidade é preservada: fotos JPEG ficam como estão e o PNG continua sem perdas
- [A ferramenta Imagem para PDF do ZapFile](/tools/image-to-pdf) é grátis, privada e roda no navegador`,

  "what-is-base64-encoding-and-how-to-use-it": `# O que é codificação Base64 e como usar

O Base64 aparece o tempo todo no desenvolvimento web: imagens embutidas, tokens JWT, anexos de e-mail, respostas de API. Entendê-lo deixa muitas tarefas mais claras.

## O que é Base64?

Base64 é um esquema que codifica dados binários como texto. Ele representa os bytes usando apenas 64 caracteres ASCII imprimíveis:

\`A–Z\`, \`a–z\`, \`0–9\`, \`+\`, \`/\` (e \`=\` como preenchimento)

O nome "Base64" vem desses 64 caracteres. Cada 3 bytes de dados binários viram 4 caracteres Base64.

## Por que o Base64 existe?

Muitos sistemas foram criados para lidar só com texto: e-mail (SMTP), atributos HTML, campos JSON, URLs. Quando é preciso colocar dados binários (uma imagem, um PDF, bytes brutos) em um sistema de texto, é necessário representá-los como texto com segurança.

O Base64 resolve isso codificando qualquer conteúdo binário como uma sequência de caracteres seguros e imprimíveis, que os analisadores de texto não interpretam errado.

## Usos comuns

### Embutir imagens em HTML/CSS
Em vez de apontar para um arquivo de imagem:
\`\`\`html
<img src="data:image/png;base64,iVBORw0KGgo..." />
\`\`\`
É útil para ícones pequenos em exportações HTML de arquivo único ou em modelos de e-mail em que links externos podem ser bloqueados.

### JSON Web Tokens (JWT)
Um JWT tem três partes codificadas em Base64, separadas por pontos:
\`Header.Payload.Signature\`

O cabeçalho e o conteúdo são objetos JSON codificados em Base64. Atenção: codificados, não criptografados – qualquer um pode decodificar. Use [o decodificador JWT do ZapFile](/tools/jwt-decoder) para ver o conteúdo de um token.

### Anexos de e-mail (MIME)
Anexos de e-mail são arquivos binários codificados em Base64 dentro do protocolo de texto do e-mail. Seu cliente de e-mail cuida disso automaticamente.

### Respostas de API
Algumas APIs devolvem dados binários (imagens, PDFs) como strings Base64 dentro de respostas JSON, já que o JSON não suporta binário nativamente.

### Autenticação HTTP Basic
O cabeçalho \`Authorization: Basic\` codifica \`usuario:senha\` em Base64. Isso não é criptografia, só codificação. Use sempre HTTPS.

## Codificar e decodificar online

Use [o codificador/decodificador Base64 do ZapFile](/tools/base64-encode) para:
- Codificar texto ou arquivos em Base64
- Decodificar Base64 de volta para texto ou arquivos para baixar
- Ver na hora data URLs de imagens embutidas

## O Base64 comprime dados?

Não, é o contrário. O Base64 aumenta o tamanho em cerca de 33%. Três bytes viram quatro caracteres. Ele serve para compatibilidade, não para compressão.

## Base64 ou Base64url?

O Base64 padrão usa \`+\` e \`/\`, que têm significado especial em URLs. O **Base64url** troca esses caracteres por \`-\` e \`_\` para que o resultado seja seguro em parâmetros de URL e tokens JWT.

## Resumo

- O Base64 representa dados binários como texto ASCII imprimível para sistemas baseados em texto
- É comum em imagens embutidas, JWTs, anexos de e-mail e respostas de API
- Aumenta o tamanho em ~33%: é para compatibilidade, não para compressão
- Decodifique um JWT ou uma string Base64 na hora com [as ferramentas do ZapFile](/tools)`,

  "how-to-create-favicon-for-website": `# Como criar um favicon para o seu site (todos os tamanhos)

O favicon é o pequeno ícone que aparece nas abas do navegador, nos favoritos e nos atalhos da tela inicial. Para acertar, é preciso gerar vários tamanhos e vinculá-los corretamente no HTML – algo simples quando você conhece os requisitos.

## O que é um favicon?

"Favicon" vem de "favorites icon". No início era um ícone de 16×16 pixels para os favoritos do Internet Explorer. Navegadores e dispositivos modernos pedem vários tamanhos:

| Arquivo | Tamanho | Uso |
|------|------|----------|
| favicon.ico | 16×16, 32×32 | Abas do navegador, barra de tarefas do Windows |
| favicon-16x16.png | 16×16 | Ícones pequenos de aba |
| favicon-32x32.png | 32×32 | Abas padrão |
| apple-touch-icon.png | 180×180 | Atalho na tela inicial do iOS |
| android-chrome-192x192.png | 192×192 | Tela inicial do Android |
| android-chrome-512x512.png | 512×512 | Tela de abertura do Android, PWA |

## Gerando todos os tamanhos com o ZapFile

1. Abra [o gerador de favicon do ZapFile](/tools/favicon-generator)
2. Envie uma imagem quadrada (de preferência PNG, com pelo menos 512×512 pixels)
3. Gere os tamanhos
4. Baixe o ZIP com todos os tamanhos e o arquivo \`.ico\`

## Adicionando os favicons ao site

Adicione estas tags na seção \`<head>\` do seu HTML:

\`\`\`html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
\`\`\`

Para Progressive Web Apps (PWA), adicione também um arquivo \`site.webmanifest\`:

\`\`\`json
{
  "name": "Your App",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
\`\`\`

## Criando um bom favicon

### Mantenha simples
Em 16×16 pixels, logos complexos ficam irreconhecíveis. Use a inicial da marca, um ícone simplificado ou um bloco de cor sólida.

### Use alto contraste
O favicon aparece em interfaces claras e escuras. Teste as duas. Um fundo sólido na cor da marca com um símbolo branco funciona nos dois modos.

### Comece em 512×512
Gere a partir da fonte de maior resolução. O ZapFile reduz com nitidez a partir de 512 px, mas ampliar a partir de 16 px dá resultado borrado.

### Favicons SVG (navegadores modernos)
Navegadores baseados em Chromium suportam favicons SVG, que ficam perfeitos em qualquer tamanho. Adicione junto aos PNG/ICO:
\`\`\`html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
\`\`\`

## Erros comuns

- **Usar uma imagem de origem em baixa resolução**: comece sempre com 512 px ou mais
- **Oferecer só o \`.ico\`**: dispositivos modernos precisam dos tamanhos PNG; só com ICO, iOS e Android ficam sem um ícone adequado
- **Esquecer o cache**: depois de atualizar o favicon, os navegadores guardam o antigo com insistência. Acrescente um parâmetro de versão (\`favicon.ico?v=2\`) durante o desenvolvimento

## Resumo

- Favicons precisam de vários tamanhos para navegadores, iOS, Android e PWA
- Comece com um PNG quadrado de 512×512 e gere todos os tamanhos de uma vez
- [O gerador de favicon do ZapFile](/tools/favicon-generator) cria todos os tamanhos necessários e o arquivo ICO em segundos`,

  "how-to-convert-webp-to-jpg-or-png": `# Como converter WebP para JPG ou PNG online

O WebP é um formato de imagem moderno do Google que gera arquivos bem menores que JPG ou PNG com a mesma qualidade. Mas nem todo aplicativo aceita: softwares de desktop antigos, alguns serviços de impressão e certos CMS não suportam WebP. Veja como converter rápido.

## Como converter WebP para JPG ou PNG com o ZapFile

1. Abra [o conversor de imagens do ZapFile](/tools/convert-image)
2. Envie seu arquivo WebP
3. Selecione **JPG** ou **PNG** como formato de saída
4. Converta e baixe

Sem envio a servidores: a conversão roda no seu navegador.

## Converter para JPG ou PNG?

Escolha conforme o conteúdo da imagem WebP:

**Converta WebP → JPG quando:**
- A imagem é uma foto ou uma cena complexa com muitas cores
- Você precisa do menor arquivo possível
- Não precisa de transparência

**Converta WebP → PNG quando:**
- A imagem tem fundo transparente
- É um logo, captura de tela ou gráfico com texto
- Você precisa de qualidade sem perdas (nenhum dado de pixel é descartado)

## Converter WebP reduz a qualidade?

**WebP → JPG**: envolve uma nova compressão com perdas. Haverá alguma perda extra em relação ao WebP original, principalmente em qualidades baixas. Use 85% ou mais para minimizar.

**WebP → PNG**: é uma conversão sem perdas. Nenhum dado é descartado. O PNG reproduz fielmente cada pixel do WebP, mas o arquivo fica maior.

## Por que os sites usam WebP

Imagens WebP costumam ser:
- De 25 a 35% menores que JPG com a mesma qualidade
- De 20 a 30% menores que PNG em conteúdo sem perdas

Isso faz diferença mensurável no tempo de carregamento e nas Core Web Vitals. Se você está criando um site, o WebP é a escolha certa para navegadores modernos.

## Convertendo vários WebP de uma vez

O ZapFile converte vários arquivos WebP ao mesmo tempo. Envie os arquivos, escolha o formato de destino e baixe todas as imagens convertidas juntas.

## Resumo

- Converta WebP para JPG em fotos que não precisam de transparência
- Converta WebP para PNG em gráficos, logos ou qualquer coisa com áreas transparentes
- [O conversor de imagens do ZapFile](/tools/convert-image) converte lotes de WebP na hora, no navegador`,

  "pdf-vs-word-which-format-to-use": `# PDF ou Word: qual formato você deve usar?

PDF e Word são os dois formatos de documento mais usados no trabalho, e a escolha certa depende totalmente do que você vai fazer com o arquivo. Veja uma comparação clara.

## Use PDF quando…

### Você quer formatação fixa
Um PDF aparece igual em qualquer dispositivo, sistema e impressora. Fontes, margens e layout ficam travados. Já um documento do Word pode se desarrumar conforme a versão do Word, as fontes instaladas e o tamanho da tela.

### Você está enviando a versão final
Contratos, notas, relatórios, currículos e propostas devem ser PDF. Quem recebe pode ver, imprimir e assinar sem alterar seu conteúdo sem querer.

### Você vai imprimir
O PDF é o padrão da impressão. A maioria das gráficas espera PDF com fontes incorporadas e sangria bem definida.

### Você precisa de ampla compatibilidade
Qualquer sistema, navegador e celular abre um PDF sem instalar nada. Nem todo mundo tem o Microsoft Word.

### Você precisa de assinaturas ou campos de formulário
O PDF suporta nativamente formulários interativos, assinaturas digitais e anotações. O Word até tem campos de formulário, mas a experiência varia de um aplicativo para outro.

## Use Word (.docx) quando…

### Você ou outras pessoas vão editar
Documentos do Word são feitos para ser editados. Se vocês colaboram em um rascunho, se ele passa por revisores ou se você preenche um modelo, o Word é o formato certo.

### Você precisa de controle de alterações e comentários
O controle de alterações e os comentários do Word são muito mais completos que as anotações em PDF para edição colaborativa.

### Você usa um modelo
A maioria dos modelos empresariais (papel timbrado, relatórios, propostas) é distribuída em Word porque foi feita para ser preenchida.

## Convertendo entre formatos

### Word → PDF
Use "Salvar como PDF" no Microsoft Word ou no LibreOffice, ou [a ferramenta Word para PDF do ZapFile](/tools/word-to-pdf) se não tiver o Word instalado. Fontes, tabelas e quebras de página são mantidas.

### PDF → imagens
Precisa de uma página do PDF como imagem? Use [a ferramenta PDF para imagens do ZapFile](/tools/pdf-to-images) para exportar qualquer página em PNG ou JPG.

### PDF → Word
O PDF não foi feito para ser editado, então voltar para o Word é mais difícil. [A ferramenta PDF para Word do ZapFile](/tools/pdf-to-word) transforma documentos comuns em texto editável com títulos, listas e tabelas e mantém o layout exato das páginas com design (folhetos, propostas). Sempre confira o resultado em documentos complexos.

## Referência rápida

| Tarefa | Formato |
|------|-----|
| Relatório final, nota, currículo | PDF |
| Rascunho para revisar e editar | Word |
| Impressão em gráfica | PDF |
| Modelo para outros preencherem | Word |
| Envio para quem não tem Word | PDF |
| Contrato, documento jurídico | PDF |
| Rascunho interno em andamento | Word |

## Protegendo arquivos PDF

Se você vai enviar um PDF que não deve ser encaminhado nem impresso, use [a ferramenta Proteger PDF do ZapFile](/tools/pdf-encrypt) para adicionar uma senha e restringir permissões.

## Juntando vários PDFs

Ao reunir formulários assinados ou montar um relatório com vários PDFs, use [a ferramenta Juntar PDF do ZapFile](/tools/merge-pdf) para combiná-los em um único documento.

## Resumo

- Use PDF para documentos finais formatados que precisam parecer iguais em todo lugar
- Use Word para documentos que precisam ser editados, trabalhados em equipe ou preenchidos
- Converta com a ferramenta certa e confira o resultado ao passar de PDF para Word`,
};

export default posts;
