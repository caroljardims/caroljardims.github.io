export interface Texto {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  notionUrl: string;
}

export const textos: Texto[] = [
  {
    slug: "primeiro-texto",
    title: "Primeiro texto",
    date: "2026-04-21",
    excerpt: "Um textinho de exemplo pra começar.",
    notionUrl: "https://fearless-azimuth-8e7.notion.site/ebd//3490709ee5458057979bd48f8524fd17",
  },
];
