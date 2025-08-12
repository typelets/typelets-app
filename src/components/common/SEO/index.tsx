import { useHead } from '@unhead/react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  keywords?: string[];
}

export default function Index({
  title,
  description = 'A secure notes app that puts privacy first. Your thoughts are encrypted on your device before they reach our servers.',
  image = '/og-image.jpg',
  url,
  type = 'website',
  keywords = [
    'encrypted notes',
    'secure notes app',
    'privacy',
    'end-to-end encryption',
    'note taking',
    'markdown editor',
    'offline notes',
    'AES-256 encryption',
    'zero-knowledge',
    'private notes',
    'secure writing',
    'encrypted storage',
  ],
}: SEOProps) {
  const siteTitle = 'Typelets - Encrypted notes, simplified';
  const fullTitle = title ? `Typelets | ${title}` : siteTitle;
  const currentUrl =
    url ?? (typeof window !== 'undefined' ? window.location.href : '');

  // Combine default keywords with any additional ones passed in
  const allKeywords = [
    ...new Set([
      ...keywords,
      'encrypted notes',
      'secure notes app',
      'privacy',
      'end-to-end encryption',
      'note taking',
      'markdown editor',
      'offline notes',
      'AES-256 encryption',
      'zero-knowledge',
      'private notes',
    ]),
  ];

  useHead({
    title: fullTitle,
    meta: [
      { name: 'description', content: description },
      { name: 'keywords', content: allKeywords.join(', ') },

      // Open Graph
      { property: 'og:type', content: type },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:url', content: currentUrl },
      { property: 'og:image', content: image },
      { property: 'og:site_name', content: 'Typelets' },

      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },

      // Additional Index
      { name: 'robots', content: 'index, follow' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { name: 'author', content: 'Typelets' },
      { name: 'application-name', content: 'Typelets' },
      { name: 'theme-color', content: '#3b82f6' },

      // Security and privacy focused meta tags
      {
        name: 'security',
        content: 'AES-256 encryption, zero-knowledge architecture',
      },
      { name: 'privacy', content: 'End-to-end encrypted notes app' },
    ],
    link: [
      { rel: 'canonical', href: currentUrl },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    ],
  });

  return null; // This component doesn't render anything
}
