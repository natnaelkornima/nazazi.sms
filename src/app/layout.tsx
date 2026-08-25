import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'Nazazi sms',
  description: 'A Beacon of Hope for Times of Spiritual Weariness.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="am" className="lang-am" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Stack+Sans+Headline:wght@200..700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="https://www.geezarchive.com/css2?family=Shiromeda%2BSemBd&display=swap" />
        <link rel="stylesheet" href="https://www.geezarchive.com/css2?family=Habesha%2BSerif&display=swap" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="antialiased lang-am">{children}</body>
    </html>
  );
}
