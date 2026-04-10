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
    title: 'Mobile App Store',
    description: 'A beautiful iOS and Android app for discovering and managing apps. Built with React Native.',
    tags: ['React Native', 'iOS', 'Android', 'Firebase'],
    link: 'https://example.com',
    type: 'free',
  },
  {
    id: '2',
    title: 'Premium Task Manager',
    description: 'Professional task management application with real-time sync and collaboration features.',
    tags: ['React', 'Node.js', 'MongoDB'],
    link: 'https://example.com',
    type: 'paid',
  },
  {
    id: '3',
    title: 'Fitness Tracker',
    description: 'Cross-platform fitness tracking app with health data integration and personalized insights.',
    tags: ['React Native', 'Health Kit', 'AWS'],
    link: 'https://example.com',
    type: 'free',
  },
];
