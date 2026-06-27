export const metadata = { title: "Goose Almanac", description: "Goose live data & stats" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
