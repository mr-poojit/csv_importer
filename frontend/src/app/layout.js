import './globals.css';

export const metadata = {
  title: 'AI CSV Importer',
  description: 'Intelligently extract CRM lead information from any CSV format using AI-powered field mapping.',
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
