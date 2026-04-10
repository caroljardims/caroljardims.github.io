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
];
