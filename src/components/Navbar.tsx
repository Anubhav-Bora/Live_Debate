"use client";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const { isSignedIn, user } = useUser();

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">
          Live AI Debate
        </Link>
        
        <div className="flex items-center space-x-6">
          <Link href="/debates" className="hover:text-blue-600">
            Debates
          </Link>
          <Link href="/leaderboard" className="hover:text-blue-600">
            Leaderboard
          </Link>
          
          {isSignedIn ? (
            <div className="flex items-center space-x-4">
              <Link 
                href={`/profile/${user.id}`} 
                className="hover:text-blue-600"
              >
                Profile
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link href="/sign-in" className="hover:text-blue-600">
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}