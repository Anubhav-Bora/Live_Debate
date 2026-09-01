const ACHIEVEMENTS = [
  {
    id: "first-debate",
    name: "First Decision",
    description: "Completed a first judged debate.",
    icon: "🎯",
    criteria: { debateCount: 1 },
  },
  {
    id: "seasoned-debater",
    name: "Seasoned Debater",
    description: "Completed five judged debates.",
    icon: "🏆",
    criteria: { debateCount: 5 },
  },
  {
    id: "veteran-debater",
    name: "Veteran Debater",
    description: "Completed twenty judged debates.",
    icon: "👑",
    criteria: { debateCount: 20 },
  },
  {
    id: "logical-thinker",
    name: "Logical Thinker",
    description: "Maintained an average logic score of 8 or higher.",
    icon: "🧠",
    criteria: { avgLogic: 8 },
  },
  {
    id: "clear-communicator",
    name: "Clear Communicator",
    description: "Maintained an average clarity score of 8 or higher.",
    icon: "✨",
    criteria: { avgClarity: 8 },
  },
  {
    id: "persuasive-speaker",
    name: "Persuasive Speaker",
    description: "Maintained an average persuasion score of 8 or higher.",
    icon: "💬",
    criteria: { avgPersuasiveness: 8 },
  },
];

async function awardAchievements(database, userIds) {
  for (const achievement of ACHIEVEMENTS) {
    await database.badge.upsert({
      where: { id: achievement.id },
      create: achievement,
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        criteria: achievement.criteria,
      },
    });
  }

  for (const userId of [...new Set(userIds)]) {
    const stats = await database.score.aggregate({
      where: { userId },
      _count: { _all: true },
      _avg: { logic: true, clarity: true, persuasiveness: true },
    });
    const eligible = ACHIEVEMENTS.filter((achievement) => {
      const criteria = achievement.criteria;
      if (criteria.debateCount && stats._count._all >= criteria.debateCount) return true;
      if (criteria.avgLogic && (stats._avg.logic || 0) >= criteria.avgLogic) return true;
      if (criteria.avgClarity && (stats._avg.clarity || 0) >= criteria.avgClarity) return true;
      return Boolean(
        criteria.avgPersuasiveness &&
        (stats._avg.persuasiveness || 0) >= criteria.avgPersuasiveness
      );
    });

    for (const achievement of eligible) {
      await database.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: achievement.id } },
        create: { userId, badgeId: achievement.id },
        update: {},
      });
    }
  }
}

module.exports = { ACHIEVEMENTS, awardAchievements };
