import { Providers } from "@/app/provider";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "DebateArena", template: "%s · DebateArena" },
  description: "Live video debates with reliable transcription, structured AI judging, and performance rankings.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
