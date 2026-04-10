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
    description: 'A warm, vibrant VS Code theme designed for comfortable coding. Beautiful peach and coral tones that reduce eye strain while keeping you inspired.',
    tags: ['VS Code', 'Theme', 'UI/UX'],
    link: 'https://marketplace.visualstudio.com/items?itemName=caroljardims.peachy-theme',
    type: 'free',
  },
];
