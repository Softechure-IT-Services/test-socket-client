
// app/login/layout.tsx
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex items-center justify-center min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
