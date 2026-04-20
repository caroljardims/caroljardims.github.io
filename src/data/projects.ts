// src/data/projects.ts
export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link: string;
  type: 'free' | 'paid';
}

export const projects: Project[] = [
  {
    id: '1',
    title: 'Peachy Theme',
    description: 'A VS Code theme that feels like a slow morning — warm light through sheer curtains, the scent of a cup of coffee, nowhere to be. Built on natural beiges and linen tones, with blush pink that shows up only when it has something to say. ✨\n\nBecause your workspace should feel as considered as your code.',
    tags: ['VS Code', 'Theme', 'UI/UX'],
    link: 'https://marketplace.visualstudio.com/items?itemName=caroljardims.peachy-theme',
    type: 'free',
  },
  {
    id: '2',
    title: 'Sips',
    description: 'Um drinking game de cartas pra jogar com os amigos. Saque uma carta, siga a regra, beba com responsabilidade.',
    tags: ['Web', 'Game', 'React'],
    link: '/sips',
    type: 'free',
  },
  {
    id: '4',
    title: 'Decifragem',
    description: 'Party game inspirado em Imagem & Ação: um jogador encena, os outros tentam adivinhar. Sem papel, sem caneta, sem desculpa — só o celular, o grupo e muita cara de pau. 🎭',
    tags: ['Web', 'Game', 'Party', 'React'],
    link: '/decifragem',
    type: 'free',
  },
  {
    id: '3',
    title: 'Chaveio',
    description: 'Monte seu campeonato do zero: cadastre os times, defina grupos e deixe o sorteio montar as chaves. Clique nos vencedores e acompanhe até a final.',
    tags: ['Web', 'Esportes', 'React'],
    link: '/chaveio',
    type: 'free',
  },
];
