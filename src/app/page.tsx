"use client";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {useState} from "react";
export default function Home() {
  const [debateId, setDebateId] = useState("");

  const handleJoinDebate = (e: React.FormEvent) => {
    e.preventDefault();
    if (debateId) {
      window.location.href = `/debates/${debateId}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600"
          >
            Master the Art of Debate
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto mb-10"
          >
            Engage in thought-provoking debates, receive AI-powered feedback, and climb the leaderboard.
          </motion.p>
          
          <SignedIn>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex justify-center gap-4"
            >
              <Link href="/debates/create">
                <Button size="lg" className="text-lg">
                  Create a Debate
                </Button>
              </Link>
              <Link href="/debates">
                <Button variant="outline" size="lg" className="text-lg">
                  Browse Debates
                </Button>
              </Link>
            </motion.div>
          </SignedIn>

          <SignedOut>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex justify-center gap-4"
            >
              <SignInButton mode="modal">
                <Button size="lg" className="text-lg">
                  Sign In to Start
                </Button>
              </SignInButton>
              <Link href="/sign-up">
                <Button variant="outline" size="lg" className="text-lg">
                  Create Account
                </Button>
              </Link>
            </motion.div>
          </SignedOut>
        </section>

        {/* Join Debate Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Join a Debate</CardTitle>
              <CardDescription>Enter the debate ID provided by the pro participant</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinDebate} className="flex gap-2">
                <Input
                  placeholder="Debate ID"
                  value={debateId}
                  onChange={(e) => setDebateId(e.target.value)}
                />
                <Button type="submit">Join</Button>
              </form>
            </CardContent>
          </Card>
        </motion.section>

        {/* Features Section */}
        <section className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            {
              title: "Live Debates",
              description: "Engage in real-time debates with participants worldwide",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              ),
              color: "bg-blue-100 text-blue-600"
            },
            {
              title: "AI Analysis",
              description: "Receive detailed feedback on your debate performance",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              ),
              color: "bg-purple-100 text-purple-600"
            },
            {
              title: "Leaderboard",
              description: "Compete and climb the ranks based on your debate skills",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
              color: "bg-green-100 text-green-600"
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`${feature.color} w-12 h-12 rounded-full flex items-center justify-center mb-4`}>
                    {feature.icon}
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </section>

        {/* How It Works */}
        <section className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-3xl font-bold mb-12"
          >
            How It Works
          </motion.h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                title: "Create or Join",
                description: "Start a new debate or join an existing one",
                icon: "➕",
              },
              {
                title: "Get Debate ID",
                description: "As Pro, share your debate ID with Con participants",
                icon: "🔑",
              },
              {
                title: "Debate",
                description: "Engage in a structured debate with time limits",
                icon: "💬",
              },
              {
                title: "Get Feedback",
                description: "Receive AI analysis and audience votes",
                icon: "📊",
              },
            ].map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl mb-4">
                  {step.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold mb-6">Ready to Improve Your Skills?</h2>
          <SignedIn>
            <Link href="/debates/create">
              <Button size="lg" className="text-lg">
                Start Your First Debate
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="lg" className="text-lg">
                Sign Up to Get Started
              </Button>
            </SignInButton>
          </SignedOut>
        </motion.section>
      </main>
    </div>
  );
}