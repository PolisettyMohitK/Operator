import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const bodySans = Manrope({
  variable: "--font-body-sans",
  subsets: ["latin"],
});

const displaySerif = Fraunces({
  variable: "--font-display-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Operator",
  description:
    "Operator is a premium closed-alpha operations system for small businesses recovering overdue invoices with approvals and full auditability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodySans.variable} ${displaySerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans text-[color:var(--foreground)]">
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
