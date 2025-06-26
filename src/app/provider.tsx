"use client";
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "../context/SocketContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <SocketProvider>
        <Toaster position="top-center" />
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">
              DebateArena
            </Link>
            <div className="flex items-center gap-4">
              <SignedIn>
                <div className="flex items-center gap-4">
                  <nav className="hidden md:flex gap-4">
                    <Button variant="ghost" asChild>
                      <Link href="/debates">Debates</Link>
                    </Button>
                    <Button variant="ghost" asChild>
                      <Link href="/leaderboard">Leaderboard</Link>
                    </Button>
                  </nav>
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="outline">Sign In</Button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </SocketProvider>
    </ClerkProvider>
  );
}