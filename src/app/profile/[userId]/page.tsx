"use client";
import { useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  scores: Array<{
    logic: number;
    clarity: number;
    persuasiveness: number;
    tone: number;
    debate: { topic: string; id: string };
  }>;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  totalScore: number;
  debateCount: number;
}

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-6 mb-8">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-medium mb-4">Profile not found</h2>
        <Link href="/leaderboard">
          <Button variant="outline">View Leaderboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8"
      >
        <Avatar className="w-20 h-20">
          <AvatarImage src="" />
          <AvatarFallback className="text-2xl">
            {profile.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{profile.username}</h1>
          <p className="text-gray-600">
            Member since {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>
        {currentUser?.id === userId && (
          <Button variant="outline" className="ml-auto">
            Edit Profile
          </Button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-4xl font-bold text-center"
            >
              {profile.totalScore.toFixed(1)}
            </motion.p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Debates</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-4xl font-bold text-center"
            >
              {profile.debateCount}
            </motion.p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-4xl font-bold text-center"
            >
              {profile.badges.length}
            </motion.p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.scores.length > 0 ? (
              <div className="space-y-4">
                {profile.scores.slice(0, 5).map((score, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b pb-4 last:border-b-0 last:pb-0"
                  >
                    <Link
                      href={`/debates/${score.debate.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {score.debate.topic}
                    </Link>
                    <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-gray-500">Logic:</span>{" "}
                        <Badge variant="outline" className="px-2 py-0.5">
                          {score.logic.toFixed(1)}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-500">Clarity:</span>{" "}
                        <Badge variant="outline" className="px-2 py-0.5">
                          {score.clarity.toFixed(1)}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-500">Persuasion:</span>{" "}
                        <Badge variant="outline" className="px-2 py-0.5">
                          {score.persuasiveness.toFixed(1)}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-500">Tone:</span>{" "}
                        <Badge variant="outline" className="px-2 py-0.5">
                          {score.tone.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No debate history yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.badges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {profile.badges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center text-2xl mb-2">
                      {badge.icon || "🏆"}
                    </div>
                    <h3 className="font-medium">{badge.name}</h3>
                    <p className="text-xs text-gray-500">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No badges earned yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}