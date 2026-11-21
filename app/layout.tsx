// Pass-through root layout. The real <html> shell is EditionShell, rendered by
// app/edition/[experience]/layout.tsx (pages) and app/not-found.tsx (404s).
// Without a layout here, Next serves its built-in 404 instead of ours.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
