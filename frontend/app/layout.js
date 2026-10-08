import '../styles/globals.css';

export const metadata = { title: 'AI Content Autopilot', description: 'Automated social content platform' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
