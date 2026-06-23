import './globals.css';

export const metadata = {
  title: 'Banner Constructor',
  description: 'Banner editor with Konva canvas',
};

export default function RootLayout({ children }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
