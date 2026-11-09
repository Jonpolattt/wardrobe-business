import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { PREFERENCES_KEY } from '@/lib/store/keys';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Wardrobe Business Dashboard',
  description: 'Учёт закупок, партий, продаж и прибыли Wardrobe',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/* Applies the saved theme before the first paint (no flash of the wrong theme). */
const themeScript = `(function(){var r=document.documentElement;try{var s=(JSON.parse(localStorage.getItem('${PREFERENCES_KEY}')||'{}').state)||{};var m=s.modePref;var t=m==='light'||m==='dark'?m:(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');r.dataset.theme=t;r.dataset.palette=s.palette==='default'||s.palette==='lime'?s.palette:'ocean';if(s.locale==='uz')r.lang='uz';}catch(e){r.dataset.theme='dark';r.dataset.palette='ocean';}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" data-palette="ocean" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
