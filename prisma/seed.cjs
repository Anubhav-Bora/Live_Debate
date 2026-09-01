/* eslint-disable @typescript-eslint/no-require-imports */
const { scrypt: nodeScrypt, randomBytes } = require("node:crypto");
const { promisify } = require("node:util");
const { PrismaClient } = require("@prisma/client");
const { awardAchievements } = require("../lib/achievements");

require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ path: ".env", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed the database.");
}
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DATABASE_SEED !== "true") {
  throw new Error("Set ALLOW_DATABASE_SEED=true explicitly before seeding a production database.");
}
if (process.env.RESET_DATABASE_DATA === "true" && process.env.ALLOW_DATABASE_RESET !== "true") {
  throw new Error("Set ALLOW_DATABASE_RESET=true explicitly before replacing existing database records.");
}

const prisma = new PrismaClient();
const scrypt = promisify(nodeScrypt);
const now = new Date();

const users = [
  { key: "maya", username: "maya_chen", email: "maya@example.test" },
  { key: "arjun", username: "arjun_mehta", email: "arjun@example.test" },
  { key: "sofia", username: "sofia_reyes", email: "sofia@example.test" },
  { key: "daniel", username: "daniel_kim", email: "daniel@example.test" },
  { key: "amara", username: "amara_okafor", email: "amara@example.test" },
  { key: "lucas", username: "lucas_martin", email: "lucas@example.test" },
];

const debates = [
  {
    code: "CITYTRNS",
    daysAgo: 2,
    topic: "Cities should make public transport free for all residents.",
    pro: "maya",
    con: "arjun",
    duration: 360,
    confidence: 0.88,
    summary: "Pro connected affordability with network-wide congestion benefits and answered the funding objection with a concrete tax-and-parking model. Con raised legitimate capacity concerns but offered less evidence that fares are the best rationing mechanism.",
    proTranscript: "Free public transport is not merely a subsidy for riders. It reduces traffic, improves access to work and education, and lowers the administrative cost of collecting fares. Cities can fund the service through congestion pricing and parking levies, making the people who impose the largest road costs contribute more.",
    conTranscript: "Removing fares creates a large permanent expense while doing little for residents whose neighborhoods lack reliable routes. Cities should first improve frequency and coverage, then use targeted discounts for low-income riders. A universal promise can consume the budget without fixing the service people actually receive.",
    proScores: [9.0, 8.7, 8.9, 8.6],
    conScores: [8.1, 8.5, 7.9, 8.8],
    messages: [
      ["pro", "Congestion pricing creates both a funding source and an incentive to shift away from private cars."],
      ["con", "That revenue is volatile, while transit staffing and maintenance are permanent obligations."],
    ],
  },
  {
    code: "PRJCTEXM",
    daysAgo: 4,
    topic: "Universities should replace most closed-book exams with applied projects.",
    pro: "sofia",
    con: "daniel",
    duration: 300,
    confidence: 0.82,
    summary: "Con won narrowly by distinguishing assessment formats by discipline and showing where individual, time-limited verification remains necessary. Pro made a strong case for authentic work but treated project grading consistency too lightly.",
    proTranscript: "Applied projects test research, iteration, communication, and the ability to use knowledge in realistic conditions. Closed-book exams often reward short-term memorization and artificial speed. Universities can use milestones and oral defenses to verify individual contribution while preserving authentic assessment.",
    conTranscript: "Projects are valuable, but replacing most exams creates uneven grading, extensive opportunities for outside assistance, and serious group-work attribution problems. In medicine, engineering, and law, students must also demonstrate individual recall and reasoning under pressure. A mixed assessment system is more reliable than a broad replacement.",
    proScores: [8.2, 8.8, 8.4, 8.7],
    conScores: [8.8, 8.6, 8.7, 8.5],
    messages: [
      ["pro", "Oral defenses make copied work visible and test whether the student understands each decision."],
      ["con", "That approach is useful but far more staff-intensive than a scalable exam."],
    ],
  },
  {
    code: "ALGORTHM",
    daysAgo: 7,
    topic: "Governments should require independent audits of major recommendation algorithms.",
    pro: "amara",
    con: "lucas",
    duration: 420,
    confidence: 0.91,
    summary: "Pro established a proportionate transparency mechanism focused on measurable systemic risk rather than source-code disclosure. Con identified trade-secret and compliance risks, but the proposed certified-auditor model answered most of those concerns.",
    proTranscript: "Recommendation systems influence news exposure, consumer choices, and opportunities at a scale ordinary product rules never anticipated. Independent auditors can test discrimination, manipulation, and safety controls without publishing proprietary code. Financial firms already undergo confidential audits because private systems can create public harm.",
    conTranscript: "Mandatory audits risk freezing a fast-moving field into checklists and give a small group of approved firms access to valuable trade secrets. Regulators may also mistake correlation for algorithmic causation. Clear outcome-based liability and researcher access can provide accountability without a costly universal audit regime.",
    proScores: [9.2, 9.0, 9.1, 8.9],
    conScores: [8.4, 8.5, 8.2, 8.7],
    messages: [
      ["con", "Who decides which platforms are large enough to trigger the audit requirement?"],
      ["pro", "The threshold can combine active users, market reach, and demonstrated risk, as other digital regulations already do."],
    ],
  },
  {
    code: "REMOTWRK",
    daysAgo: 10,
    topic: "Remote-first should be the default policy for knowledge-work organizations.",
    pro: "arjun",
    con: "sofia",
    duration: 300,
    confidence: 0.76,
    summary: "The debate ended in a substantive tie. Pro demonstrated recruitment and focus benefits, while Con persuasively showed that team stage, employee experience, and work type make a universal default too blunt.",
    proTranscript: "Remote-first expands the talent pool, reduces commuting costs, and forces organizations to document decisions instead of relying on hallway access. A default is not a ban on offices; teams can still meet intentionally. The burden should be on managers to explain why physical presence improves a particular role.",
    conTranscript: "Defaults shape behavior, budgets, and mentorship. Early-career employees often learn through observation and quick informal feedback, while new teams build trust faster in person. Organizations should select a model based on tasks and team maturity instead of presuming that one location policy fits knowledge work as a whole.",
    proScores: [8.5, 8.8, 8.5, 8.9],
    conScores: [8.7, 8.6, 8.5, 8.9],
    messages: [],
  },
  {
    code: "NUCLRNRG",
    daysAgo: 15,
    topic: "Nuclear power is essential to a reliable low-carbon electricity grid.",
    pro: "daniel",
    con: "amara",
    duration: 480,
    confidence: 0.84,
    summary: "Pro won by grounding the reliability claim in firm generation and land-use constraints while acknowledging cost overruns. Con presented a credible renewables portfolio but did not fully resolve long-duration storage and seasonal variability.",
    proTranscript: "A low-carbon grid needs dependable generation during long periods of weak wind and sun. Nuclear plants provide firm power with very low lifecycle emissions and modest land use. Construction performance must improve, but abandoning the technology makes decarbonization depend on storage systems that are not yet deployed at seasonal scale.",
    conTranscript: "Calling nuclear essential confuses one available tool with a requirement. New reactors are expensive and slow, while wind, solar, transmission, demand response, geothermal, and multiple storage technologies can be deployed incrementally. Every dollar tied up in an overrun is a dollar unavailable for emissions reductions this decade.",
    proScores: [9.1, 8.6, 8.8, 8.5],
    conScores: [8.5, 8.8, 8.4, 8.7],
    messages: [
      ["con", "The relevant comparison is with a portfolio, not nuclear versus batteries alone."],
      ["pro", "A portfolio still needs a demonstrated source for multi-day and seasonal firmness."],
    ],
  },
  {
    code: "PHONEBAN",
    daysAgo: 20,
    topic: "Secondary schools should prohibit student smartphone use throughout the school day.",
    pro: "lucas",
    con: "maya",
    duration: 300,
    confidence: 0.8,
    summary: "Con won by offering a more targeted policy that preserved the strongest distraction controls without overstating the case for an all-day prohibition. Pro clearly established the attention problem but did not justify the policy during breaks and emergencies.",
    proTranscript: "Smartphones fragment attention even when they are not actively used, and classroom-by-classroom rules are difficult to enforce. An all-day rule creates a clear norm, reduces social pressure, and gives students sustained time for learning and face-to-face interaction. Schools can retain office-based emergency contact procedures.",
    conTranscript: "Phones should be stored during lessons, but an all-day prohibition is unnecessarily rigid. Students use devices for transport changes, family responsibilities, accessibility tools, and supervised learning. Strong classroom enforcement and phone-free common periods address distraction without removing a useful personal tool for seven hours.",
    proScores: [8.2, 8.7, 8.3, 8.5],
    conScores: [8.8, 8.9, 8.8, 8.6],
    messages: [],
  },
  {
    code: "FOURDAYW",
    daysAgo: 27,
    topic: "Large employers should adopt a four-day, 32-hour workweek without reducing pay.",
    pro: "sofia",
    con: "arjun",
    duration: 360,
    confidence: 0.79,
    summary: "Pro won narrowly by defining the policy as an operational redesign rather than simple hour reduction and by addressing coverage through staggered schedules. Con raised sector-specific productivity concerns that limited, but did not defeat, the proposal.",
    proTranscript: "Many organizations measure presence instead of output. A four-day week forces teams to reduce low-value meetings, protect focus time, and improve retention. Trials should preserve service coverage through staggered schedules, with continuation tied to clear productivity and customer metrics rather than ideology.",
    conTranscript: "The proposal assumes that efficiency gains can reliably replace one fifth of labor time. That may work in some offices but not in support, logistics, healthcare, or already-lean teams. Mandating full pay also makes experimentation costly for employers whose output is directly tied to staffed hours.",
    proScores: [8.7, 9.0, 8.8, 8.9],
    conScores: [8.5, 8.4, 8.4, 8.7],
    messages: [
      ["pro", "Adoption can be role-specific while the employer commits to the default wherever metrics remain stable."],
      ["con", "That qualification makes the original large-employer rule far less universal than stated."],
    ],
  },
  {
    code: "DIGTIDEN",
    daysAgo: 35,
    topic: "Large social platforms should offer identity-verified accounts without requiring real names publicly.",
    pro: "maya",
    con: "daniel",
    duration: 420,
    confidence: 0.86,
    summary: "Pro won by separating confidential verification from public identity and linking the proposal to optional trust signals and abuse enforcement. Con's surveillance concerns were serious, but applied more strongly to mandatory universal verification than to the proposed optional tier.",
    proTranscript: "Platforms can verify that an account corresponds to a unique person while allowing a pseudonym in public. An optional verification signal would make coordinated impersonation and repeat abuse more expensive without silencing whistleblowers or vulnerable users. Verification data should be minimized, encrypted, and handled by regulated providers.",
    conTranscript: "Identity databases become targets for hackers, governments, and abusive insiders. Even an optional badge can create a two-tier internet where anonymous speakers are treated as suspicious. Platforms should improve behavioral detection and appeals instead of building infrastructure that connects online speech to legal identity.",
    proScores: [8.9, 8.8, 9.0, 8.7],
    conScores: [8.5, 8.7, 8.3, 8.8],
    messages: [],
  },
];

function dateDaysAgo(days, minutes = 0) {
  return new Date(now.getTime() - days * 86_400_000 + minutes * 60_000);
}

async function optionalPasswordHash() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password) return null;
  if (password.length < 10 || password.length > 128 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error("SEED_DEMO_PASSWORD must be 10-128 characters and include a letter and number.");
  }
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${Buffer.from(key).toString("base64url")}`;
}

async function clearExistingData() {
  if (process.env.RESET_DATABASE_DATA !== "true") return;

  await prisma.$transaction([
    prisma.userBadge.deleteMany(),
    prisma.session.deleteMany(),
    prisma.message.deleteMany(),
    prisma.score.deleteMany(),
    prisma.debate.deleteMany(),
    prisma.badge.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  console.log("Removed existing application records before seeding.");
}

function participant(scores, feedback, mistakes, improvements) {
  const [logic, clarity, persuasiveness, tone] = scores;
  const score = Math.round(((logic + clarity + persuasiveness + tone) / 4) * 10) / 10;
  return { score, logic, clarity, persuasiveness, tone, feedback, mistakes, improvements };
}

async function main() {
  await clearExistingData();
  const passwordHash = await optionalPasswordHash();
  const userByKey = new Map();

  for (const seedUser of users) {
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      create: {
        username: seedUser.username,
        email: seedUser.email,
        passwordHash,
        createdAt: dateDaysAgo(90),
      },
      update: {
        username: seedUser.username,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: { id: true, username: true },
    });
    userByKey.set(seedUser.key, user);
  }

  for (const seedDebate of debates) {
    const proUser = userByKey.get(seedDebate.pro);
    const conUser = userByKey.get(seedDebate.con);
    const startTime = dateDaysAgo(seedDebate.daysAgo);
    const endTime = new Date(startTime.getTime() + seedDebate.duration * 1_000);
    const pro = participant(
      seedDebate.proScores,
      "A well-structured case with concrete causal reasoning and direct engagement with the opposing position.",
      ["One supporting claim could have used a more explicit source or numerical benchmark."],
      ["State the decisive comparison earlier and quantify the largest claimed effect."],
    );
    const con = participant(
      seedDebate.conScores,
      "A substantive response that identified real trade-offs and challenged the scope of the motion.",
      ["The alternative policy was not always developed to the same level as the criticism."],
      ["Turn the strongest objection into a clearly specified counterproposal."],
    );
    const difference = Math.round((pro.score - con.score) * 10) / 10;
    const winner = Math.abs(difference) < 0.25 ? "tie" : difference > 0 ? "pro" : "con";
    const feedback = {
      status: "completed",
      winner,
      summary: seedDebate.summary,
      confidence: seedDebate.confidence,
      pro,
      con,
      generatedAt: endTime.toISOString(),
      model: "seeded-example",
    };

    const debate = await prisma.debate.upsert({
      where: { joinCodeCon: seedDebate.code },
      create: {
        topic: seedDebate.topic,
        duration: seedDebate.duration,
        status: "completed",
        startTime,
        endTime,
        createdAt: new Date(startTime.getTime() - 30 * 60_000),
        aiFeedback: feedback,
        analysisStatus: "completed",
        analysisStartedAt: null,
        winner,
        proTranscript: seedDebate.proTranscript,
        conTranscript: seedDebate.conTranscript,
        joinCodeCon: seedDebate.code,
        isPublic: true,
        proDisplayName: proUser.username,
        creatorId: proUser.id,
        proUserId: proUser.id,
        conUserId: conUser.id,
      },
      update: {
        topic: seedDebate.topic,
        duration: seedDebate.duration,
        status: "completed",
        startTime,
        endTime,
        aiFeedback: feedback,
        analysisStatus: "completed",
        analysisStartedAt: null,
        winner,
        proTranscript: seedDebate.proTranscript,
        conTranscript: seedDebate.conTranscript,
        isPublic: true,
        proDisplayName: proUser.username,
        creatorId: proUser.id,
        proUserId: proUser.id,
        conUserId: conUser.id,
      },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { debateId: debate.id } }),
      prisma.score.upsert({
        where: { userId_debateId: { userId: proUser.id, debateId: debate.id } },
        create: {
          logic: pro.logic,
          clarity: pro.clarity,
          persuasiveness: pro.persuasiveness,
          tone: pro.tone,
          createdAt: endTime,
          userId: proUser.id,
          debateId: debate.id,
        },
        update: {
          logic: pro.logic,
          clarity: pro.clarity,
          persuasiveness: pro.persuasiveness,
          tone: pro.tone,
          createdAt: endTime,
        },
      }),
      prisma.score.upsert({
        where: { userId_debateId: { userId: conUser.id, debateId: debate.id } },
        create: {
          logic: con.logic,
          clarity: con.clarity,
          persuasiveness: con.persuasiveness,
          tone: con.tone,
          createdAt: endTime,
          userId: conUser.id,
          debateId: debate.id,
        },
        update: {
          logic: con.logic,
          clarity: con.clarity,
          persuasiveness: con.persuasiveness,
          tone: con.tone,
          createdAt: endTime,
        },
      }),
    ]);

    if (seedDebate.messages.length) {
      await prisma.message.createMany({
        data: seedDebate.messages.map(([role, content], index) => ({
          role,
          content,
          createdAt: new Date(startTime.getTime() + (index + 1) * 60_000),
          senderId: role === "pro" ? proUser.id : conUser.id,
          debateId: debate.id,
        })),
      });
    }
  }

  await awardAchievements(prisma, [...userByKey.values()].map((user) => user.id));
  console.log(`Seeded ${users.length} profiles and ${debates.length} completed debates.`);
  if (passwordHash) console.log("Demo sign-in was enabled with SEED_DEMO_PASSWORD.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
