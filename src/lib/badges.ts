interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    debateCount?: number;
    avgPersuasiveness?: number;
    avgLogic?: number;
    avgClarity?: number;
    votesWon?: number;
  };
}

export const BADGES: Badge[] = [
  {
    id: "beginner",
    name: "Beginner",
    description: "Participated in first debate",
    icon: "🎯",
    criteria: { debateCount: 1 },
  },
  {
    id: "seasoned",
    name: "Seasoned Debater",
    description: "Participated in 5 debates",
    icon: "🏆",
    criteria: { debateCount: 5 },
  },
  {
    id: "veteran",
    name: "Veteran Debater",
    description: "Participated in 20 debates",
    icon: "👑",
    criteria: { debateCount: 20 },
  },
  {
    id: "persuasive",
    name: "Persuasive Speaker",
    description: "Achieved average persuasion score of 8+",
    icon: "💬",
    criteria: { avgPersuasiveness: 8 },
  },
  {
    id: "logical",
    name: "Logical Thinker",
    description: "Achieved average logic score of 8+",
    icon: "🧠",
    criteria: { avgLogic: 8 },
  },
  {
    id: "eloquent",
    name: "Eloquent Speaker",
    description: "Achieved average clarity score of 8+",
    icon: "✨",
    criteria: { avgClarity: 8 },
  },
  {
    id: "popular",
    name: "Crowd Favorite",
    description: "Won 5 spectator votes",
    icon: "👏",
    criteria: { votesWon: 5 },
  },
];

interface UserBadge { 
  badgeId: string; 
}

interface Debate { 
  id: string; 
}

interface Score { 
  logic: number; 
  clarity: number; 
  persuasiveness: number; 
}

interface Vote { 
  winner: string; 
  debate: { 
    proUserId: string; 
    conUserId: string; 
  }; 
}

interface User {
  UserBadge: UserBadge[];
  debatesCreated: Debate[];
  debatesPro: Debate[];
  debatesCon: Debate[];
  scores: Score[];
  Vote: Vote[];
}

interface PrismaClient {
  user: {
    findUnique: (params: {
      where: { id: string };
      include: {
        scores: boolean;
        debatesCreated: boolean;
        debatesPro: boolean;
        debatesCon: boolean;
        Vote: boolean;
        UserBadge: boolean;
      };
    }) => Promise<User | null>;
  };
}

export async function checkBadges(userId: string, prisma: PrismaClient): Promise<Badge[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      scores: true,
      debatesCreated: true,
      debatesPro: true,
      debatesCon: true,
      Vote: true,
      UserBadge: true,
    },
  });

  if (!user) return [];

  const earnedBadges: Badge[] = [];
  const currentBadgeIds = user.UserBadge.map((ub) => ub.badgeId);

  // Calculate stats
  const debateCount = [
    ...user.debatesCreated,
    ...user.debatesPro,
    ...user.debatesCon,
  ].filter(
    (v, i, a) => a.findIndex((t) => t.id === v.id) === i
  ).length;

  const totalScores = user.scores.reduce(
    (acc, score) => {
      acc.logic += score.logic;
      acc.clarity += score.clarity;
      acc.persuasiveness += score.persuasiveness;
      return acc;
    },
    { logic: 0, clarity: 0, persuasiveness: 0 }
  );

  const avgLogic = user.scores.length > 0 ? totalScores.logic / user.scores.length : 0;
  const avgClarity = user.scores.length > 0 ? totalScores.clarity / user.scores.length : 0;
  const avgPersuasiveness = user.scores.length > 0 ? totalScores.persuasiveness / user.scores.length : 0;
  const votesWon = user.Vote.filter((vote) => 
    vote.winner === "pro" && vote.debate.proUserId === userId ||
    vote.winner === "con" && vote.debate.conUserId === userId
  ).length;

  // Check each badge
  for (const badge of BADGES) {
    if (currentBadgeIds.includes(badge.id)) continue;

    let earned = false;
    
    if (badge.criteria.debateCount !== undefined && debateCount >= badge.criteria.debateCount) {
      earned = true;
    } else if (badge.criteria.avgLogic !== undefined && avgLogic >= badge.criteria.avgLogic) {
      earned = true;
    } else if (badge.criteria.avgClarity !== undefined && avgClarity >= badge.criteria.avgClarity) {
      earned = true;
    } else if (badge.criteria.avgPersuasiveness !== undefined && avgPersuasiveness >= badge.criteria.avgPersuasiveness) {
      earned = true;
    } else if (badge.criteria.votesWon !== undefined && votesWon >= badge.criteria.votesWon) {
      earned = true;
    }

    if (earned) {
      earnedBadges.push(badge);
    }
  }

  return earnedBadges;
}