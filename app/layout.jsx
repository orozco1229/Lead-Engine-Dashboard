import './globals.css';

export const metadata = {
  title: 'LeadEngine Dashboard',
  description: 'Cold lead revenue generation for local businesses',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
