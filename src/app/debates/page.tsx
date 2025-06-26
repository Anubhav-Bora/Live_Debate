"use client";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface Debate {
  id: string;
  topic: string;
  status: "waiting" | "in-progress" | "completed";
  createdAt: string;
  proUser: { username: string } | null;
  conUser: { username: string } | null;
  _count: { messages: number };
}
interface DebateRoomProps {
  debate: Debate; // Make sure this matches your Debate type
  userId?: string;
  isPro?: boolean;
  isCon?: boolean;
}
export default function DebatesPage() {
  const { isSignedIn } = useUser();
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "waiting" | "in-progress" | "completed">("all");

  useEffect(() => {
    const fetchDebates = async () => {
      try {
        const res = await fetch("/api/debates");
        if (res.ok) {
          const data = await res.json();
          setDebates(data);
        }
      } catch (error) {
        console.error("Error fetching debates:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDebates();
  }, []);

  const filteredDebates = debates.filter(debate => {
    const matchesSearch = debate.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || debate.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting": return "bg-yellow-100 text-yellow-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-64" />
          {isSignedIn && <Skeleton className="h-10 w-40" />}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-4 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold"
        >
          Live Debate Arena
        </motion.h1>
        <div className="flex gap-4 w-full md:w-auto">
          {isSignedIn && (
            <Link href="/debates/create">
              <Button className="whitespace-nowrap">
                Create New Debate
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Search debates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:w-64"
        />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["all", "waiting", "in-progress", "completed"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f as any)}
              className="capitalize"
            >
              {f.replace("-", " ")}
            </Button>
          ))}
        </div>
      </div>

      {filteredDebates.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <h3 className="text-xl font-medium mb-2">No debates found</h3>
          <p className="text-gray-600">
            {filter === "all" 
              ? "Create a new debate to get started" 
              : `No ${filter.replace("-", " ")} debates available`}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDebates.map((debate) => (
            <motion.div
              key={debate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -5 }}
            >
              <Link href={`/debates/${debate.id}`}>
                <Card className="h-full transition-all hover:shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="line-clamp-2 text-lg">
                        {debate.topic}
                      </CardTitle>
                      <Badge className={getStatusColor(debate.status)}>
                        {debate.status.replace("-", " ")}
                      </Badge>
                    </div>
                    <CardDescription>
                      {new Date(debate.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className="font-medium text-blue-600 w-16">Pro:</span>
                        <span className="truncate">
                          {debate.proUser?.username || "Open"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium text-red-600 w-16">Con:</span>
                        <span className="truncate">
                          {debate.conUser?.username || "Open"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="text-sm text-gray-500">
                      {debate._count.messages} messages
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}