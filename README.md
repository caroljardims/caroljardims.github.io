# README.md

# 🚀 Carol's Portfolio

A modern, fast, and beautiful portfolio built with **Astro**, **React**, and **Tailwind CSS**.

## Features

- ⚡ **Blazing Fast** - Static site generation
- 🌙 **Dark Mode** - Built-in theme toggle
- 📱 **Fully Responsive** - Mobile-first design
- 💌 **Contact Form** - Get in touch easily
- 🎨 **Beautiful Design** - Smooth interactions and transitions
- 🚀 **GitHub Pages Ready** - One-click deployment

## Tech Stack

- **Astro 4** - Static site framework
- **React 18** - Interactive components
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

The site auto-deploys to GitHub Pages on every push to `main` via GitHub Actions.

### Manual Deployment

```bash
npm run build
# Push dist/ folder to GitHub Pages
```

## Customization

### Update Projects

Edit [src/data/projects.ts](src/data/projects.ts) to add/modify projects:

```ts
export const projects: Project[] = [
  {
    id: '1',
    title: 'Your Project',
    description: 'Description here',
    tags: ['Tag1', 'Tag2'],
    link: 'https://example.com',
    type: 'free', // or 'paid'
  },
];
```

### Update Social Links

Edit social links in [src/pages/index.astro](src/pages/index.astro) (bottom of hero).

### Contact Form

The contact form uses Formspree. Update the form ID:

```tsx
const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
  // ...
});
```

Get your form ID at [formspree.io](https://formspree.io).

## License

MIT
