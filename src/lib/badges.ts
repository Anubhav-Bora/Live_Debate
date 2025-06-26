export const BADGES = [
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

export async function checkBadges(userId: string, prisma: any) {
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

  const earnedBadges = [];
  const currentBadgeIds = user.UserBadge.map((ub: any) => ub.badgeId);

  // Calculate stats
  const debateCount = [
    ...user.debatesCreated,
    ...user.debatesPro,
    ...user.debatesCon,
  ].filter(
    (v: any, i: any, a: any) => a.findIndex((t: any) => t.id === v.id) === i
  ).length;

  const totalScores = user.scores.reduce(
    (acc: any, score: any) => {
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
  const votesWon = user.Vote.filter((vote: any) => 
    vote.winner === "pro" && vote.debate.proUserId === userId ||
    vote.winner === "con" && vote.debate.conUserId === userId
  ).length;

  // Check each badge
  for (const badge of BADGES) {
    if (currentBadgeIds.includes(badge.id)) continue;

    let earned = false;
    
    if (badge.criteria.debateCount && debateCount >= badge.criteria.debateCount) {
      earned = true;
    } else if (badge.criteria.avgLogic && avgLogic >= badge.criteria.avgLogic) {
      earned = true;
    } else if (badge.criteria.avgClarity && avgClarity >= badge.criteria.avgClarity) {
      earned = true;
    } else if (badge.criteria.avgPersuasiveness && avgPersuasiveness >= badge.criteria.avgPersuasiveness) {
      earned = true;
    } else if (badge.criteria.votesWon && votesWon >= badge.criteria.votesWon) {
      earned = true;
    }

    if (earned) {
      earnedBadges.push(badge);
    }
  }

  return earnedBadges;
}