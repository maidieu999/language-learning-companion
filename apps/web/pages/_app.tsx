import type { AppProps } from 'next/app';
import { fontClassName } from '@/lib/fonts';
import '@/app/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${fontClassName} min-h-full font-sans antialiased`}>
      <Component {...pageProps} />
    </div>
  );
}
