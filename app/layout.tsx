import './globals.css';

// The <html> element is rendered by app/[locale]/layout.tsx so that `lang`
// and `dir` match the page language.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
