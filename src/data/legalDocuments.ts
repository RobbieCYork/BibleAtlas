/**
 * The Terms of Service and Privacy Policy, published at /terms and /privacy.
 *
 * WHERE THESE WORDS COME FROM. Every statement in the Privacy Policy is a claim about what the app
 * and its database actually do, audited from the code on the effective date below: the tables and
 * row-level-security policies in `sql/000_baseline.sql` and the applied migrations, the analytics
 * client in `src/lib/analytics.ts`, the deletion Edge Function in
 * `supabase/functions/delete-account/index.ts`, and the hosts the browser contacts. If one of those
 * changes what it collects, who can see it or how long it is kept, this text changes in the same
 * commit — the same rule `accountDeletionNotice.ts` lives under.
 *
 * This module has no imports on purpose: `scripts/seo/loadData.mjs` bundles it for the public-page
 * generator, exactly as it bundles the deletion notice.
 *
 * Markup: a string in `body` is a paragraph, an array of strings is a bulleted list. Inside either,
 * `[text](href)` is a link (href must start with `/`, `mailto:` or `https://`) and `**text**` is
 * bold. Nothing else is interpreted; everything else is escaped.
 */

// ── THE ONE PLACE THE OPERATOR'S LEGAL IDENTITY GOES ─────────────────────────────────────────────
// When the company that operates Capstone Bible is formed, put its exact registered name (e.g.
// "Example Name LLC, a Washington limited liability company") and its mailing address here. Both
// documents read them from here and nowhere else. Never put a person's own name, home address or
// personal email in this file.
export const LEGAL_ENTITY: { name: string | null; mailingAddress: string | null } = {
  name: null,
  mailingAddress: null,
};

export const LEGAL_CONTACT_EMAIL = "admin@capstonebible.com";
export const LEGAL_EFFECTIVE_DATE = "November 9, 2026";

export interface LegalSection {
  heading: string;
  body: Array<string | string[]>;
}

export interface LegalDocument {
  title: string;
  /** One sentence, used as the page's meta description. */
  description: string;
  intro: string[];
  sections: LegalSection[];
}

const EMAIL = `[${LEGAL_CONTACT_EMAIL}](mailto:${LEGAL_CONTACT_EMAIL})`;

const OPERATOR_SENTENCE = LEGAL_ENTITY.name
  ? `Capstone Bible is operated by ${LEGAL_ENTITY.name}${LEGAL_ENTITY.mailingAddress ? `, ${LEGAL_ENTITY.mailingAddress}` : ""}.`
  : "The legal name and mailing address of the business that operates Capstone Bible will be published here once it has been formed.";

// ================================================================================================
// TERMS OF SERVICE
// ================================================================================================

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service",
  description:
    "The terms for using the Capstone Bible app and website: accounts, what you may post, how moderation and copyright complaints work, and the limits of our responsibility.",
  intro: [
    `These Terms of Service ("Terms") are an agreement between you and the operator of Capstone Bible ("Capstone Bible", "we", "us"). They cover the Capstone Bible app and website at capstonebible.com, including the public library pages (together, the "Service"). ${OPERATOR_SENTENCE}`,
    "By creating an account or using the Service you agree to these Terms and to our [Privacy Policy](/privacy). If you do not agree, please do not use the Service.",
  ],
  sections: [
    {
      heading: "1. Who can use Capstone Bible",
      body: [
        "You must be at least 13 years old to create an account. If you are under 18, you may use the Service only with the permission of a parent or legal guardian, who agrees to these Terms on your behalf and is responsible for your use of the Service.",
        "You may not use the Service if we have previously removed your account for breaking these Terms, or if the law where you live forbids you from using it.",
      ],
    },
    {
      heading: "2. Your account",
      body: [
        "You need an account, with a working email address and a password, to use the app. The public library pages can be read without one.",
        [
          "Give us accurate information when you sign up, and keep your email address current so you can reset your password.",
          "Keep your password private. You are responsible for what happens under your account. Tell us promptly at " +
            EMAIL +
            " if you think someone else has used it.",
          "Your display name must not impersonate another person or organisation, or be offensive.",
          "One person, one account. Do not sell, transfer or share your account.",
        ],
      ],
    },
    {
      heading: "3. What you post",
      body: [
        "The Service lets you write and share things — notes, posts, photos and videos, comments, messages, group messages, profile details and more (\"your content\"). **You keep ownership of your content.**",
        "So that we can run the Service, you give us a worldwide, non-exclusive, royalty-free licence to store, host, copy, display and transmit your content, only as needed to operate and provide the Service and only to the people you have chosen to share it with (for example your friends or a group). This licence ends when your content is deleted, except for copies held for a limited time in routine backups and copies that other people have already received (for example a message you sent).",
        "You are responsible for your content. Only post content you have the right to share, and do not post anything that breaks the rules in section 4.",
      ],
    },
    {
      heading: "4. Acceptable use",
      body: [
        "Capstone Bible is a place for Bible study and Christian community. When you use it, you agree not to:",
        [
          "post or send anything illegal, or anything that encourages illegal activity;",
          "post hateful content, or content that attacks people for their race, ethnicity, national origin, religion, sex, sexual orientation, gender identity, disability or age;",
          "harass, bully, threaten, stalk or intimidate anyone, or share someone else's private information without their permission;",
          "post sexually explicit or pornographic material, or any content that sexualises minors;",
          "post graphic violence, or content that promotes self-harm;",
          "send spam, chain messages, unsolicited advertising, or scams;",
          "impersonate anyone, or misrepresent your connection to any person, church or organisation;",
          "post content that infringes someone else's copyright, trademark or other rights;",
          "upload viruses or other harmful code, or interfere with or disrupt the Service;",
          "try to get into another person's account, or into any part of the Service or its systems you are not authorised to use, or get around any security or access control;",
          "scrape, harvest or bulk-download other people's information, or use automated tools to access the app (the public library pages may be read and indexed in the normal way); or",
          "misuse the reporting tools, for example by filing reports you know to be false.",
        ],
        "Disagreement is welcome; contempt is not. You can discuss and debate Scripture and theology, including with people who see things differently, but do it with respect.",
      ],
    },
    {
      heading: "5. Moderation, reporting and blocking",
      body: [
        "We do not review everything posted on the Service and we are not obliged to. But we may — without notice — remove or hide content, or limit, suspend or close an account, if we believe it breaks these Terms, puts anyone at risk, or exposes us or others to legal liability.",
        "If you see something that breaks these Terms, report it with the Report option on the post, comment, note, message or profile, or use **Report a Problem** in the account menu. You can block another person at any time; blocking hides each of you from the other. The **Safety & Contact** screen in the account menu explains how reporting and blocking work. You can also write to " +
          EMAIL +
          ".",
        "If you report content, the people who review reports will see the report and a short excerpt of the content you reported, so they can decide what to do with it.",
      ],
    },
    {
      heading: "6. Copyright complaints",
      body: [
        "We respect copyright and expect our users to do the same. If you believe content on the Service infringes a copyright you own or are authorised to act for, send a written notice to " +
          EMAIL +
          " with the subject line \"Copyright complaint\" that includes:",
        [
          "your physical or electronic signature;",
          "a description of the copyrighted work you say has been infringed;",
          "where the material you object to is on the Service, in enough detail for us to find it (for example a description of the post and the account that posted it);",
          "your name, mailing address, telephone number and email address;",
          "a statement that you have a good-faith belief that the use is not authorised by the copyright owner, its agent or the law; and",
          "a statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or are authorised to act on the owner's behalf.",
        ],
        "When we receive a complete notice we will remove or disable access to the material and, where we can, tell the person who posted it. If you believe material of yours was removed by mistake or misidentification, you may send us a counter-notice at the same address containing your signature, a description of the material and where it appeared, a statement under penalty of perjury that you have a good-faith belief it was removed by mistake or misidentification, your name, address and telephone number, and your consent to the jurisdiction of the federal courts for your address (or, if you are outside the United States, any judicial district in which we may be found) and to accept service from the person who sent the original notice.",
        "We will close the accounts of people who repeatedly infringe others' copyright.",
      ],
    },
    {
      heading: "7. Our content, and what it is for",
      body: [
        "Capstone Bible's articles, maps, timelines, reading plans and games are for personal study, learning and enjoyment. They are **not professional, pastoral, legal, medical, financial or psychological advice**, and they are no substitute for your own church, pastor or a qualified professional.",
        "Articles are written from a Protestant evangelical position and name other traditions' views where they differ.",
        "We work hard to be accurate: dates, places, citations and attributions are checked against sources, and many entries say how firmly a date or identification is established. But history and archaeology are full of honest disagreement and new discoveries, and we will sometimes be wrong. We do not promise that any content is complete, current or free of error. If you find a mistake, please tell us with Report a Problem.",
        "The Service's design, software, text and graphics that we created belong to us or our licensors. You may use them through the Service for your own personal, non-commercial study, and share links to them. Please do not copy or republish them in bulk without our permission.",
      ],
    },
    {
      heading: "8. Bible text, sources and other people's websites",
      body: [
        "Bible text in the app is provided in translations that are in the public domain in the United States: the World English Bible (WEB), the King James Version (KJV) and the American Standard Version (ASV). Passages are retrieved from the free service bible-api.com, and Bible search results come from bolls.life. Chapter audio of the World English Bible is streamed from the Internet Archive.",
        "Historical source texts reproduced in the app come from public-domain editions, such as those published on Wikisource. Other works are cited and linked, not reproduced. Images are used under the licences stated by their owners, most of them from Wikimedia Commons, and are credited to their sources. Map data is © OpenStreetMap contributors (available under the Open Database License) and © OpenMapTiles, served by OpenFreeMap, with Natural Earth for low-zoom relief; satellite imagery is provided by Esri, Vantor, Earthstar Geographics and the GIS User Community.",
        "The Service links to many websites we do not control — museums, libraries, publishers, reference works and others. Those sites are their owners' responsibility, not ours, and their own terms and privacy policies apply when you visit them.",
      ],
    },
    {
      heading: "9. Ending your account",
      body: [
        "You can stop using the Service at any time. You can delete your account yourself: open **My Profile**, scroll to **Delete My Account**, type DELETE to confirm, and confirm once more. Deletion is immediate and permanent and cannot be undone. [What is deleted and what is kept](/delete-account) is set out in full on its own page. If you cannot sign in, write to " +
          EMAIL +
          " from the email address on the account.",
        "We may suspend or close your account if you break these Terms, if we are required to by law, or if we stop offering the Service. Where it is reasonable and safe to do so, we will tell you first.",
        "Sections 3 (as to content already shared), 6, 7, 10, 11, 12 and 13 continue to apply after your account ends.",
      ],
    },
    {
      heading: "10. Disclaimers",
      body: [
        "The Service is provided free of charge, **\"as is\" and \"as available\"**. To the fullest extent the law allows, we disclaim all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, title, non-infringement and accuracy. We do not promise that the Service will always be available, uninterrupted, secure or free of errors, or that your content will never be lost — please use **Back Up My Data** in My Profile to keep your own copy of your study material.",
        "Content posted by other users is theirs, not ours. We do not endorse it and are not responsible for it.",
      ],
    },
    {
      heading: "11. Limitation of liability",
      body: [
        "To the fullest extent the law allows, Capstone Bible and the people who run it will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of data, profits or goodwill, arising from or related to the Service or these Terms, even if we were told such damages were possible.",
        "To the fullest extent the law allows, our total liability for any claim arising from or related to the Service or these Terms is limited to the greater of the amount you paid us to use the Service in the twelve months before the claim arose and fifty US dollars (US $50).",
        "Some places do not allow some of these exclusions or limits, so they may not all apply to you. Nothing in these Terms limits any liability that cannot be limited by law.",
      ],
    },
    {
      heading: "12. Your responsibility to us",
      body: [
        "To the extent the law allows, you agree to indemnify and hold harmless Capstone Bible and the people who run it from claims, losses and reasonable costs (including legal fees) brought by someone else that arise from your content or from your breach of these Terms.",
      ],
    },
    {
      heading: "13. Governing law",
      body: [
        "These Terms are governed by the laws of the State of Washington, USA, without regard to its conflict-of-laws rules. Unless the law where you live gives you the right to bring a claim somewhere else, any dispute arising from these Terms or the Service will be brought in the state or federal courts located in the State of Washington, and you and we consent to their jurisdiction. Before bringing a claim, please write to us at " +
          EMAIL +
          " — most problems can be solved that way.",
      ],
    },
    {
      heading: "14. Changes to these Terms",
      body: [
        "We may update these Terms as the Service changes. When we do, we will change the effective date at the top of this page, and if the change is significant we will tell you in the app or by email before it takes effect. If you keep using the Service after a change takes effect, you accept the updated Terms; if you do not accept them, you can delete your account.",
      ],
    },
    {
      heading: "15. General",
      body: [
        "These Terms and the Privacy Policy are the whole agreement between you and us about the Service. If any part of these Terms is found to be unenforceable, the rest stays in effect. If we do not enforce a part of these Terms straight away, we have not given up the right to enforce it later. You may not transfer your rights under these Terms; we may transfer ours to a business that takes over the Service.",
      ],
    },
    {
      heading: "16. Contact",
      body: [`Questions about these Terms: ${EMAIL}. ${OPERATOR_SENTENCE}`],
    },
  ],
};

// ================================================================================================
// PRIVACY POLICY
// ================================================================================================

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  description:
    "What Capstone Bible collects, who can see it, which services process it, how long it is kept, and how to get a copy or delete it.",
  intro: [
    `This Privacy Policy explains what information Capstone Bible ("we", "us") collects when you use the Capstone Bible app and website at capstonebible.com (the "Service"), what we do with it, who can see it, and the choices you have. ${OPERATOR_SENTENCE} You can reach us at ${EMAIL}.`,
    "Capstone Bible is a place for Bible study, and a lot of what people keep here — prayer requests, sermon notes, private notes, messages to friends — is personal and can reveal religious beliefs. We have tried to describe exactly what happens to it, without overstating how private anything is.",
  ],
  sections: [
    {
      heading: "1. The short version",
      body: [
        [
          "We collect what you give us to make the app work — your email address, display name, and the notes, posts, messages and other things you create — plus a small amount of usage information about which features are used.",
          "**We do not sell your personal information, we do not show ads, and we do not use advertising or third-party analytics trackers.**",
          "Your private notes, sermon notes, prayer list, highlights and tags are visible only to you in the app. Things you share go to the people you share them with: friends, a group, or the people in a game.",
          "Your data is not end-to-end encrypted. The people who run Capstone Bible can technically access what is stored in its database, as described in section 5.",
          "You can download a copy of your study material and delete your account yourself, at any time, from My Profile.",
        ],
      ],
    },
    {
      heading: "2. What we collect",
      body: [
        "**Account information.** Your email address and password when you sign up, and the display name you choose. Your password is handled by our authentication provider (Supabase) and stored only in hashed form — we never see it. We also keep the date your account was created and when you last signed in.",
        "**Profile information — all optional.** A profile photo, phone number, church and church website, favourite verse, bio, city, birthday, relationship status, hobbies, work experience, education, favourite music, TV shows, films and sports teams, and links to your social-media accounts.",
        "**Your Bible study.** Notes on passages (including the verses and text you quoted), highlights, tags, sermon notes (title, speaker, Scripture reference, your notes, and any photographs you add), prayer-list items and whether you have marked them answered, your reading position, the chapters you mark as read, your reading-plan progress, and how many seconds you spend reading each day.",
        "**Social activity.** Friend requests and friendships; posts (text, photos, videos, and friends you tag); comments; direct messages to friends (including when they were read, and messages you pin); groups you create or join, join requests, and group messages; the people you block and the content you hide.",
        "**Games.** The game rooms you host or join, your answers and scores, and your high scores (stored with your display name). In multiplayer games you can turn on your camera and microphone: see section 6.",
        "**Reports.** If you use Report a Problem, the report itself plus technical details to help us fix it: the page and screen you were on, any text you selected, the app version, your browser's user-agent string, your screen size and platform. If you report a person's content, the reason, any details you add, and a short excerpt (up to 1,000 characters) of the content you reported.",
        "**Usage information.** The app records which features are used — for example that the app was opened, a panel was opened, a chapter was read, a note or post was created, a search was run (whether in places or in Scripture — never what you searched for), a game was played or a reading plan was opened. Each event is a name from a fixed list the app chose, sometimes with a fixed label such as which panel or game, and never anything you typed: no note, message or post text, no search words, no verse text. Events are grouped into a visit using a random identifier held in your browser tab, with the visit's start and last-active times, so we can see how long the app is used. When you are signed in, these records are linked to your account. Visits to the sign-in screen are recorded without an account.",
        "**Technical information.** Like any website, the services that host the app automatically receive your IP address, browser and device type, and the time of each request, and keep them in their server logs.",
        "We do not collect payment information, precise location, or your contacts.",
      ],
    },
    {
      heading: "3. Why we use it",
      body: [
        [
          "**To provide the Service:** to create and secure your account, save your study material, show your content to the people you share it with, deliver messages, and run games.",
          "**To communicate with you:** to send account emails — confirming your address and resetting your password — and to answer you when you write to us. We do not send marketing email.",
          "**To keep people safe:** to review reports, remove content that breaks our [Terms of Service](/terms), and enforce blocks.",
          "**To improve the Service:** to understand which features are used, find and fix problems, and decide what to build next.",
          "**To meet legal obligations:** to respond to lawful requests and protect our rights and the rights and safety of others.",
        ],
        "We do not use your information to build advertising profiles, and we do not sell it or share it with anyone for their own marketing.",
      ],
    },
    {
      heading: "4. Who can see what",
      body: [
        "**Only you** (in the app): your private notes, sermon notes and their photographs, prayer list, highlights, tags, reading position, reading-plan progress, the people you have blocked, and posts you have not marked Public.",
        "**Your friends:** notes and posts you mark **Public** (despite the label, these go to your accepted friends, not to the whole internet), and comments on them; the chapters you have marked as read and your daily reading time; and social links you set to **My friends**.",
        "**Your profile details.** The privacy switches on your profile decide which details the app displays to your friends. They are a display setting: your profile record, including your email address and the optional details you have filled in, is sent to the devices of people connected to you by a friend request in either direction — including a request that is still pending — even if the app does not display those details. Only fill in details you are comfortable sharing with those people.",
        "**Groups:** the members of a group can see its name, description, members and messages. A group marked Public can be found by its name and description by anyone signed in to the app.",
        "**Direct messages** can only be sent between friends and are visible to the two people in the conversation.",
        "**Finding you.** Someone who already knows your exact email address or phone number can find your account to send you a friend request. Searching for you by name only works if you turn on **Let people find me by searching my name** in My Profile.",
        "**Games:** the other players in a room see your display name, answers and score. High-score boards show your display name and score to all users.",
        "**Everyone:** social links you set to **Everyone**.",
        "**Anyone with the link:** profile photos and the photos and videos attached to posts are stored as files that can be opened by anyone who has their web address, without signing in. The app only shows them to the people described above, but a copied link works for anyone.",
        "Blocking someone hides your profile, posts, notes, comments and messages from them, and theirs from you.",
      ],
    },
    {
      heading: "5. Administrators and the people who run Capstone Bible",
      body: [
        "A small number of people we appoint as administrators can use an in-app console that shows: the list of accounts, with each account's email address, display name, sign-up date, last sign-in, last activity, number of visits and total time in the app; usage statistics; recent posts that are shared with friends and recent comments; problem reports; and reports about content, including the reported excerpt. Administrators can remove posts and comments that break the rules, and can send an account a password-reset email (they never see or set your password).",
        "Beyond that console, the people who operate the Service have administrative access to its database and file storage, which means they can technically access everything stored there — including private notes, sermon notes, prayer-list items and messages. **Nothing in Capstone Bible is end-to-end encrypted.** We do not look at private content, except where it is needed to keep the Service running or secure, to investigate a report or a suspected breach of our Terms, or where the law requires it.",
      ],
    },
    {
      heading: "6. Multiplayer video and audio",
      body: [
        "If you turn on your camera or microphone in a multiplayer game, your video and audio are sent directly between your device and the other players' devices. We do not record or store them. To connect the players' devices, each device learns the others' network addresses (IP addresses), and uses a public Google server to work out its own. You can play with your camera and microphone off.",
      ],
    },
    {
      heading: "7. Services we use",
      body: [
        "We use the following service providers. They process information on our behalf, or — for the content services — receive a request from your browser when you use the feature:",
        [
          "**Supabase** — our database, user accounts and sign-in, file storage, real-time updates and server functions. Almost everything described in this policy is stored here.",
          "**Vercel** — hosts the app and website.",
          "**Resend** — delivers account emails (sign-up confirmation and password reset) from noreply@capstonebible.com.",
          "**Microsoft 365** — receives email you send to " + EMAIL + ".",
          "**Google Fonts** — supplies the typefaces the app and website use; your browser downloads them from Google.",
          "**OpenFreeMap** and **Esri** — supply map tiles and satellite imagery for the map.",
          "**bible-api.com** — supplies Bible text. Your browser asks it for the passage you are reading.",
          "**bolls.life** — supplies Bible search. When you search the Bible text, the words you search for are sent to it.",
          "**Internet Archive** — streams chapter audio.",
          "**Wikimedia Commons** — supplies many of the images in articles and games.",
          "**Google** — a public Google server helps connect devices for multiplayer video (section 6).",
        ],
        "Each of these services sees your IP address when your browser contacts it, and handles it under its own privacy policy. We may also disclose information if the law requires it, to protect anyone's safety, or to a business that takes over the Service (in which case this policy, or one at least as protective, will continue to apply to your information).",
      ],
    },
    {
      heading: "8. Cookies and storage on your device",
      body: [
        "Capstone Bible does not use advertising or tracking cookies. The app stores a few things in your browser's own storage so it works properly: your sign-in session, your preferences (theme, text size, which tabs and timeline lanes you show, sort orders, \"Remember me\"), a pending friend or group invitation while you sign up, the random visit identifier used for usage information (cleared when you close the tab), and — if you use the photo-to-text feature in sermon notes — the text-recognition model, which runs on your device rather than on a server.",
        "Clearing your browser's storage signs you out and resets these preferences.",
      ],
    },
    {
      heading: "9. How long we keep it",
      body: [
        "We keep your account information and content for as long as your account exists, or until you delete the item yourself.",
        "When you delete your account, it and the content listed on our [account-deletion page](/delete-account) are deleted immediately. Some things are kept, as that page explains: groups you started (if other members remain), usage records with your account removed from them so they no longer identify you, and routine backups, which expire on their own schedule. Records of moderation decisions, and reports other people made about your content (including the reported excerpt), are also kept so that we can keep the community safe.",
        "Usage records do not currently expire on a schedule while your account exists. Our hosting providers keep their server logs for their own limited periods.",
      ],
    },
    {
      heading: "10. Your choices and rights",
      body: [
        [
          "**See and download your data.** My Profile has a **Back Up My Data** button that downloads your profile, notes, highlights, tags, sermon notes and reading position as a file. For a copy of anything else we hold about you, email us.",
          "**Correct it.** You can edit your profile and your content in the app at any time.",
          "**Delete it.** You can delete individual items in the app, or [delete your whole account](/delete-account) from My Profile.",
          "**Control who sees it.** Use the visibility settings on your posts, notes, profile details and social links, the name-search setting in My Profile, and blocking.",
        ],
        "Depending on where you live, you may have further legal rights over your personal information — for example to object to or restrict how we use it, or to complain to a data-protection authority. To make any request, email " +
          EMAIL +
          " from the address on your account. We may need to confirm it is you before acting, and we aim to respond within 30 days. We will not treat you differently for exercising your rights.",
      ],
    },
    {
      heading: "11. Sensitive information",
      body: [
        "Your notes, sermon notes, prayer list and messages may reveal your religious beliefs, your health, or other sensitive things about you or about people you pray for. Please think about what you write about others. This information is used only to provide the Service to you: it is not used for advertising, profiling or any purpose other than those in section 3. Prayer-list items, sermon notes and private notes are visible only to you in the app; messages are visible to the people in the conversation. The limits described in section 5 apply.",
      ],
    },
    {
      heading: "12. Security",
      body: [
        "Information travels between your device and our services over encrypted (HTTPS) connections. Passwords are stored only in hashed form by our authentication provider. Rules in our database restrict each person to the data they are allowed to see, administrative functions are checked on the server, and an account can only be deleted by its own signed-in owner. Our database provider states that it encrypts stored data and backups.",
        "No system is perfectly secure, and we cannot promise that your information will never be accessed without permission. Use a strong password that you do not use anywhere else. If we learn of a breach affecting your personal information, we will notify you as the law requires.",
      ],
    },
    {
      heading: "13. Children",
      body: [
        "The Service is not directed to children under 13, and our [Terms of Service](/terms) do not allow anyone under 13 to create an account. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has given us personal information, email " +
          EMAIL +
          " and we will delete the account and its information. Users aged 13 to 17 need a parent's or guardian's permission to use the Service.",
      ],
    },
    {
      heading: "14. Users outside the United States",
      body: [
        "Our service providers are based mainly in the United States, and your information may be stored and processed in the United States or in other countries where they operate, whose data-protection laws may differ from those where you live. By using the Service you understand that your information will be transferred to and processed in those places.",
      ],
    },
    {
      heading: "15. Changes to this policy",
      body: [
        "We will update this policy when what we collect or how we use it changes. We will change the effective date at the top, and if a change is significant we will tell you in the app or by email before it takes effect.",
      ],
    },
    {
      heading: "16. Contact",
      body: [`Questions or requests about your privacy: ${EMAIL}. ${OPERATOR_SENTENCE}`],
    },
  ],
};
