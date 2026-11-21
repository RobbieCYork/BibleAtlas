// Capstone Plus for Groups — landing page copy.
//
// SOURCE: automation/manager/groups-promo/landing-pages.md (capstone-growth draft, 2026-11-21),
// transcribed as written. Do NOT add claims here. The claim rules are messaging.md section 0:
// never "secure", "encrypted", "compliant", "FERPA", "COPPA", statistics, ratings, testimonials,
// partner names, "trusted by" or "used by". Every statement below is "planned", not shipped: Groups
// is not live.
//
// [COUNSEL] marks a statement that must not be published without counsel's review. Each one is
// flagged at its line. The full list is in the build report; the dictionary here is the master.
//
// Four places where this file deliberately differs from the draft, each marked DEVIATION:
//   1. church FAQ "Do you need to be an official church?" is omitted: the draft says to delete it
//      if setup requires organisation details, and groups-feature-plan.md section 4 says it does.
//   2. the school FAQ question about FERPA/COPPA is retitled so those words never appear on the
//      page (the task bans them); its answer is the draft's holding line, verbatim.
//   3. front-door small print uses the draft's fallback ("Not sure? Pick the closest one.")
//      because the plan says the choice is made once at signup.
//   4. "Plus on its own" line is gated on INDIVIDUAL_PLUS_LIVE (draft instruction) and now also
//      quotes the annual price the task supplied.

import { PRICING, INDIVIDUAL_PLUS_LIVE, fmt, annualSavingPct, seatsCost } from "./config.mjs";

const min = PRICING.minSeats;
const monthly = fmt(PRICING.perSeatMonth);
const yearly = fmt(PRICING.perSeatYear);
const pct = annualSavingPct();

const plusAlone = INDIVIDUAL_PLUS_LIVE
  ? `Plus on its own is ${fmt(PRICING.plusMonth)} a month or ${fmt(PRICING.plusYear)} a year.`
  : null;

/** `{{email}}` in an FAQ answer becomes a mailto link at render time. */
export const AUDIENCES = {
  church: {
    slug: "church",
    label: "church group",
    unit: "person",
    seo: {
      title: "Bible Study App for Church Small Groups | Capstone Plus for Groups",
      description:
        "Give your church group full Capstone Plus. Assign readings that open in the app, ask simple questions, and see progress without chasing anyone. Coming soon.",
      ogTitle: "Capstone Plus for Groups: for church groups",
      ogDescription:
        "Get your whole group into the same Scripture before you meet. Readings, questions and progress for small groups and Bible studies.",
    },
    hero: {
      h1: "Get your whole group into the same Scripture before you meet.",
      sub: "Choose the passages. Add a few questions. Everyone in your group gets Capstone Plus, and you can see who has finished. No chasing.",
      small: "For leaders and groups of 13 and older.", // [COUNSEL] 13+ wording
      img: "church-hero-circle-around-table",
      alt: "Five adults of different ages sit around a wooden table with open Bibles, coffee and a laptop.",
    },
    benefits: [
      {
        h: "Readings that open right where you need them",
        p: "Pick a Bible passage, a person, a place, a timeline event or a reading plan day. When a member taps it, Capstone Bible opens at that exact spot.",
        img: "church-feature-1-readings-open-in-app",
        alt: "An open Bible on a small table with a yellow bookmark, joined by dotted lines to a map pin, a scroll and a timeline strip.",
      },
      {
        h: "A few questions, no pressure",
        p: "Add multiple choice, true or false, short answer or a longer reflection. Simple ones are checked for you. Reflections are yours to read and answer. You decide whether anyone sees a number at all.",
        img: "church-feature-2-questions-and-reflection",
        alt: "An open notebook with a pencil and a coffee mug, under a large green check mark and two speech bubbles.",
      },
      {
        h: "See who has finished, kindly",
        p: "The Progress view shows who has completed each study. Scores are hidden by default. Turn numbers on only if your group wants them.",
        img: "church-feature-3-progress-view",
        alt: "A yellow clipboard listing five smiling faces, four with green check marks and one not yet checked.",
      },
      {
        h: "Invite everyone with one link",
        p: "Send a link or a six-character code, or enter email addresses and we will invite them. If someone has not joined yet, we send a few gentle email reminders. You can also text the link yourself.",
        img: null, // text-only block
      },
    ],
    steps: [
      "Set up your group. Name it and choose how many seats you need.",
      "Invite your members by link, code or email.",
      "Add a study: readings and, if you like, a few questions.",
      "Meet. Everyone has read the same passage. See Progress any time.",
    ],
    members: {
      h: "What your members see",
      // [COUNSEL] what the leader can see / what members can see
      p: "They open your link, sign in or create a free account, and join. They see the group name and your name, and exactly what you can see: their answers on this group's studies. They do not see each other's answers or the member list. Your members do not pay; Plus is included while they are in the group.",
    },
    pricing: {
      lead: `About ${monthly} per person, per month.`,
      body: `Or ${yearly} per person per year, which is about ${pct}% less than paying monthly. Minimum ${min} seats. You pay one bill. Your members pay nothing. Your own Plus is free while your group has at least ${min} paid seats.`,
      examples: [5, 10, 20].map(seatsCost),
      notes: [plusAlone].filter(Boolean),
    },
    faq: [
      { q: "Who pays?", a: "You do, as the group leader or your church. Members never pay anything." },
      // DEVIATION 1: "Do you need to be an official church?" omitted (organisation details are required).
      { q: "What can I see about my members?", a: "Their answers and scores on your group's studies. Not their notes, highlights, prayer list or messages.", counsel: true },
      { q: "Can members see each other?", a: "No. Members see their own work only, and not the member list.", counsel: true },
      { q: "Who can join?", a: "People 13 and older. We do not allow younger children to have accounts.", counsel: true },
      { q: "What happens to our data?", a: "Group work is kept while your group runs and for 90 days after it ends, so you can export it. Then it is deleted. Members can delete their account at any time.", counsel: true },
      { q: "Do you show ads or sell our information?", a: "There are no ads in Capstone Bible. We do not sell your group's information or use it for ads, marketing profiles or AI training.", counsel: true },
      { q: "What if we do not want scores?", a: "Scores are hidden by default for church groups. Turn them on if you want them." },
      { q: "Can I cancel?", a: "Yes. You can lower your seats when your plan renews, or stop. We do not refund the part of a paid period you have already used." },
      { q: "Do you send text messages to my people?", a: "No. Invites and reminders are by email only. You are free to text your link yourself." },
      { q: "What does the app teach?", a: "Capstone Bible's articles are written from a Protestant evangelical position, and where other traditions see it differently, we say so fairly. You choose what your group reads." },
      { q: "When does Groups open?", a: "Soon. Leave your email and we will let you know. We will not use it for anything else." },
    ],
    trust: {
      h: "Built for groups that take care of people.",
      bullets: [
        { t: "Members 13 and older only." }, // [COUNSEL] 13+ wording
        { t: "Members see their own work, not each other's.", counsel: true },
        { t: "No ads. We do not sell group information.", counsel: true },
        // NOT in messaging.md section 0's claim list; present in landing-pages.md. Verify the
        // one-click unsubscribe is actually built before publishing.
        { t: "Reminders go by email only, and anyone can unsubscribe in one click.", counsel: true },
        { t: "Everything a member's leader can see is shown to the member before they join.", counsel: true },
      ],
    },
    final: {
      h: "Read the same page together.",
      body: "Leave your email and we will tell you when Groups opens.",
      small: `Launch pricing is about ${monthly} per person per month. Subject to change.`,
    },
  },

  school: {
    slug: "school",
    label: "school or class",
    unit: "student",
    seo: {
      title: "Bible Class Tools for Christian Schools and Co-ops | Capstone Plus for Groups",
      description:
        "Assign Scripture readings, auto-grade simple questions and grade essays in one gradebook. Students get Capstone Plus. Teacher is free. Coming soon.",
      ogTitle: "Capstone Plus for Groups: for schools and classes",
      ogDescription:
        "Assign Scripture and the study tools in one place. Simple questions are graded for you. For Christian schools, co-ops and college ministries.",
    },
    hero: {
      h1: "Assign Scripture and the study tools in one place.",
      sub: "Build an assignment with readings that open at the exact passage. Simple questions are graded for you. You read the essays. Your students get Capstone Plus.",
      small: "For classes of students 13 and older.", // [COUNSEL] 13+ wording
      img: "school-hero-classroom",
      alt: "A teacher holding a Bible points at a whiteboard while five students at desks use tablets and open Bibles.",
    },
    benefits: [
      {
        h: "Readings that open at the exact passage",
        p: "Add Bible passages, articles, people, places, timeline events or a reading plan day to any assignment. Your students tap and land in the right place.",
        img: "school-feature-1-assignment-readings",
        alt: "A desk with an open Bible, a tablet showing a map with an orange pin, a pencil, a coffee mug and a plant.",
      },
      {
        h: "Simple questions graded for you",
        // [COUNSEL?] "Students never see the answer key" is an implementation claim (see FAQ).
        p: "Multiple choice, true or false and short-answer questions are graded automatically. You set the correct answers. Students never see the answer key.",
        img: null,
      },
      {
        h: "A gradebook that stays out of your way",
        p: "See every student and every assignment in one grid. Click any cell to read the work. Late work is flagged. Change any score and the change is logged. Export your grades to CSV.",
        img: "school-feature-2-gradebook",
        alt: "A tablet showing a grid of colored squares, with a hand tapping one and green check marks nearby.",
      },
      {
        h: "Essays, with feedback",
        p: "Read each essay, give a score and write feedback, then return it. One place for everything.",
        img: "school-feature-3-essay-feedback",
        alt: "A teacher at a desk with a red pen, reviewing papers beside an open Bible, a coffee mug and a lamp.",
      },
    ],
    steps: [
      "Set up your class. Name it, pick a start date and an end date if you have one, and choose your seats.",
      "Invite your students by link, code or email.",
      "Build an assignment: readings, then questions. Publish when ready.",
      "Grade. Simple questions are done already. Open the gradebook for the rest.",
    ],
    members: {
      h: "What your students see",
      // [COUNSEL] what students see / do not see
      p: "Their classes, their assignments, due dates and status (not started, in progress, submitted, late, graded, returned). Each reading opens at the right spot. They see their own answers and grades. They do not see other students' work or the class roster. Students do not pay.",
    },
    pricing: {
      lead: `About ${monthly} per student, per month.`,
      body: `Or ${yearly} per student per year (about ${pct}% less than monthly). Minimum ${min} seats. You or your school pays one bill. Students pay nothing. Your own teacher Plus is free while your class has at least ${min} paid seats.`,
      examples: [10, 25].map(seatsCost),
      notes: [
        "Class with an end date: choose monthly and your billing can stop when the class ends. Annual plans are not refunded.",
        "Card payment on the website. Purchase orders and invoices are not available at launch.",
      ],
    },
    faq: [
      { q: "Who pays?", a: "You or your school, as the teacher. Students never pay." },
      { q: "Who can join my class?", a: "Students 13 and older. For students under 18, you confirm that your school has the parental permission our Terms require. We do not support younger students.", counsel: true },
      { q: "What can I see about students?", a: "Their answers, scores and feedback on your class's assignments. Not their notes, highlights, prayer list or messages.", counsel: true },
      { q: "Can students see each other's work or grades?", a: "No.", counsel: true },
      // Implementation claim: confirm server-side checking is how it is built before publishing.
      { q: "Can students see the answer key?", a: "No. Answers are checked on our servers and are not sent to students' devices.", counsel: true },
      { q: "How do you treat student privacy?", a: "There are no ads. We do not sell student information or use it for ads, marketing profiles or AI training. Student work is kept while the class runs and for 90 days after it ends, then deleted.", counsel: true },
      // DEVIATION 2: question retitled; answer is the draft's holding line.
      { q: "What about the legal details for schools?", a: "We are working through the legal details for schools. Questions? {{email}}.", counsel: true },
      { q: "Can I grade essays?", a: "Yes. You give a score and written feedback, then return it." },
      { q: "Can I export grades?", a: "Yes, as a CSV file." },
      { q: "Can I cancel or change my seats?", a: "Yes. Lower your seats when your plan renews, or stop. We do not refund the part of a paid period already used." },
      { q: "Do you connect to Google Classroom or other systems?", a: "Not at launch." },
      { q: "What does the app teach?", a: "Capstone Bible's articles are written from a Protestant evangelical position, and where other traditions see it differently, we say so fairly. You choose the readings." },
      { q: "When does Groups open?", a: "Soon. Leave your email and we will let you know." },
    ],
    trust: {
      h: "Built with students in mind.",
      bullets: [
        { t: "Students 13 and older only." },
        { t: "Students see their own work only. No roster, no peer grades.", counsel: true },
        { t: "Answer keys stay on our side.", counsel: true },
        { t: "No ads. No sale of student information. No AI training on student work.", counsel: true },
        { t: "Student work deleted 90 days after your class ends.", counsel: true },
        { t: "Reminders by email only.", counsel: true },
      ],
    },
    final: {
      h: "Teach the Word. Let us handle the easy grading.",
      body: "Leave your email and we will tell you when Groups opens.",
      small: `Launch pricing is about ${monthly} per student per month. Subject to change.`,
    },
  },

  other: {
    slug: "other",
    label: "group",
    unit: "person",
    seo: {
      title: "Study the Bible Together: Families, Youth Groups, Book Clubs | Capstone Plus for Groups",
      description:
        "One person sets it up and pays, everyone studies Scripture together on Capstone Bible. Shared readings and progress for families, youth groups and more. Coming soon.",
      ogTitle: "Capstone Plus for Groups: for any group",
      ogDescription: "One person sets it up. Everyone reads together. Nobody else has to buy anything.",
    },
    hero: {
      h1: "One person sets it up. Everyone reads together.",
      sub: "Families, youth groups, book clubs and ministries can study the same Scripture in Capstone Bible, with full Plus for everyone and a simple way to see who has finished.",
      small: "For people 13 and older.", // [COUNSEL] 13+ wording
      img: "other-hero-family-sofa",
      alt: "A family of four on a blue sofa under a plaid blanket, reading Bibles and a tablet together.",
    },
    benefits: [
      {
        h: "Choose what to read together",
        p: "Pick passages, people, places or a reading plan day. Everyone who taps lands at the same spot in the app.",
        img: "other-feature-1-shared-readings",
        alt: "Two open Bibles side by side, joined by a dotted orange line to a map pin and a scroll above them.",
      },
      {
        h: "Add questions if you want them",
        p: "Multiple choice, true or false, short answer, or something to think about. Simple ones are checked for you.",
        img: null,
      },
      {
        h: "Together, wherever you are",
        p: "Invite by link or code, so your group can be in one room or in five cities. You see who has finished, and we send a few gentle reminders by email.",
        img: "other-feature-2-together-anywhere",
        alt: "A laptop showing a video call of four smiling people, with an open Bible and a coffee mug beside it.",
      },
      {
        h: "One person pays",
        p: "You cover the seats. Everyone else joins free and gets Plus while they are in the group.",
        img: "other-feature-3-one-person-sets-up",
        alt: "Two friends of different ages talk across a cafe table with an open Bible and two mugs between them.",
      },
    ],
    steps: [
      "Set up your group. Give it a name and choose your seats.",
      "Invite people by link, code or email.",
      "Add readings and, if you like, a few questions.",
      "Read together. Check Progress any time.",
    ],
    members: {
      h: "What your members see",
      // [COUNSEL] what members see about the leader's visibility
      p: "They open your link, sign in or create a free account, and join. They see the group name, who invited them, and what you can see about their work in the group. They do not see each other's answers. They do not pay.",
    },
    pricing: {
      lead: `About ${monthly} per person, per month.`,
      body: `Or ${yearly} per person per year (about ${pct}% less than monthly). Minimum ${min} seats, so a group of three is not a fit yet. You pay. Everyone else joins free. Your own Plus is free while your group has at least ${min} paid seats.`,
      examples: [5, 12].map(seatsCost),
      // FLAG (Rev): the free/Plus split is a proposal (plus-split-proposal.md); confirm it is what ships.
      notes: ["Capstone Bible stays free to read for anyone. Plus is the paid layer."],
    },
    faq: [
      { q: "Who pays?", a: "The person who sets up the group. Everyone else joins free." },
      { q: "What if we are fewer than 5?", a: `Group pricing starts at ${min} seats. Smaller groups can use Capstone Bible free, or individual Plus.` },
      { q: "Can my kids join?", a: "People 13 and older can have accounts. Younger children cannot.", counsel: true },
      { q: "What can I see about the people in my group?", a: "Their answers on the group's questions. Not their notes, highlights, prayer list or messages.", counsel: true },
      { q: "Can members see each other?", a: "No, not their answers and not the member list.", counsel: true },
      { q: "What happens to our data?", a: "Kept while your group runs and 90 days after it ends, then deleted.", counsel: true },
      { q: "Ads?", a: "No ads. We do not sell information or use it for ads, marketing profiles or AI training.", counsel: true },
      { q: "Can I cancel?", a: "Yes. Lower your seats at renewal, or stop. We do not refund the part of a paid period already used." },
      { q: "Do you text my group?", a: "No. Email only. You can text your own link." },
      { q: "Are you a church or part of one?", a: "No. Capstone Bible is a Bible study app. Its articles are written from a Protestant evangelical position, and other traditions' views are described fairly." },
      { q: "When does Groups open?", a: "Soon. Leave your email." },
    ],
    trust: {
      h: "Built for groups that take care of people.", // heading not in the draft for this page; reused from the church page
      bullets: [
        { t: "13 and older only." },
        { t: "Members see their own work, not each other's.", counsel: true },
        { t: "No ads. No sale of your information.", counsel: true },
        { t: "Email reminders only; unsubscribe in one click.", counsel: true },
        { t: "You see only what we tell members you can see.", counsel: true },
      ],
    },
    final: {
      h: "Pick a passage. Invite your people.",
      body: "Leave your email and we will tell you when Groups opens.",
      small: `Launch pricing is about ${monthly} per person per month. Subject to change.`,
    },
  },
};

export const FRONT = {
  seo: {
    title: "Capstone Plus for Groups | Capstone Bible",
    description:
      "Study Scripture together. Set up a group or class on Capstone Bible with shared readings, simple questions and a progress view. Coming soon.",
    ogTitle: "Capstone Plus for Groups",
    ogDescription:
      "Shared Scripture readings, simple questions and a progress view for your church group, class or study. Get notified when Groups opens.",
  },
  h1: "Study Scripture together.",
  sub: "Capstone Plus for Groups gives everyone in your group full Plus, and gives you simple tools to assign readings and see how everyone is doing.",
  question: "Who are you setting this up for?",
  cards: [
    {
      slug: "church",
      h: "Church group",
      p: "Small groups, Sunday school, Bible studies.",
      button: "This is for a church group",
      img: "church-hero-circle-around-table",
      alt: "Five adults around a table with open Bibles and a laptop.",
    },
    {
      slug: "school",
      h: "School or class",
      p: "Christian schools, homeschool co-ops, college ministries.",
      button: "This is for a school or class",
      img: "school-hero-classroom",
      alt: "A teacher at a whiteboard with students holding tablets and open Bibles.",
    },
    {
      slug: "other",
      h: "Something else",
      p: "Families, youth groups, book clubs, ministries.",
      button: "This is for something else",
      img: "other-hero-family-sofa",
      alt: "A family on a sofa reading the Bible together with a tablet.",
    },
  ],
  // DEVIATION 3: fallback wording (choice is made once at signup).
  notSure: "Not sure? Pick the closest one.",
  comingSoon: "Groups is coming soon. Choose a path and we will tell you when it opens.",
  footNote: "For people 13 and older. Launch pricing, subject to change.", // [COUNSEL] 13+ wording
  ogAlt: "Three smiling young people behind a large open Bible, with a map pin, a scroll and green check marks above.",
};

// Section headings shared by all three pages (not part of the draft's per-page copy).
export const HEADINGS = {
  how: "How it works",
  pricing: "Pricing",
  faq: "Questions and answers",
};

export const LAUNCH_PRICING = "Launch pricing. Subject to change.";
