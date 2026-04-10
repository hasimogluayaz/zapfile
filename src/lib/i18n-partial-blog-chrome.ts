/** Blog article chrome (breadcrumb, related, read time) for merge locales. */
export const partialBlogChromeLocales: Record<
  "es" | "pt" | "it" | "ja",
  Record<string, string>
> = {
  es: {
    "blog.breadcrumbHome": "Inicio",
    "blog.breadcrumbBlog": "Blog",
    "blog.relatedPosts": "Artículos relacionados",
    "blog.backToBlog": "Volver al blog",
    "blog.readMinutes": "{count} min de lectura",
  },
  pt: {
    "blog.breadcrumbHome": "Início",
    "blog.breadcrumbBlog": "Blog",
    "blog.relatedPosts": "Artigos relacionados",
    "blog.backToBlog": "Voltar ao blog",
    "blog.readMinutes": "{count} min de leitura",
  },
  it: {
    "blog.breadcrumbHome": "Home",
    "blog.breadcrumbBlog": "Blog",
    "blog.relatedPosts": "Articoli correlati",
    "blog.backToBlog": "Torna al blog",
    "blog.readMinutes": "{count} min di lettura",
  },
  ja: {
    "blog.breadcrumbHome": "ホーム",
    "blog.breadcrumbBlog": "ブログ",
    "blog.relatedPosts": "関連記事",
    "blog.backToBlog": "ブログ一覧へ",
    "blog.readMinutes": "読了 {count} 分",
  },
};
