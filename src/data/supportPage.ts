/**
 * The public Support page, published at /support (the "Support URL" both app stores require).
 *
 * Same rules as legalDocuments.ts: no imports (scripts/seo/loadData.mjs bundles this file for the
 * page generator), and every sentence is a claim about the app as it behaves, so it changes in the
 * same commit as the behaviour. It points at the Terms, the Privacy Policy and /delete-account for
 * the full wording instead of restating it, so there is one copy of each promise.
 *
 * Markup, as in legalDocuments.ts: a string is a paragraph, an array of strings is a bulleted list;
 * `[text](href)` is a link (href must start with `/`, `mailto:` or `https://`), `**text**` is bold.
 */

/** The public support address. Switch to the new domain's address here when it exists. */
export const SUPPORT_EMAIL = "admin@capstonebible.com";

export interface SupportSection {
  heading: string;
  body: (string | string[])[];
}

export const SUPPORT_PAGE = {
  title: "Support",
  description:
    "Get help with Capstone Bible: contact us, delete your account, report content or a person, and find out what we do with your information.",
  intro: [
    `Questions, a bug, or something that does not look right? Write to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) and a person will answer. Please write from the email address on your account so we can find it.`,
  ],
  sections: [
    {
      heading: "Frequently asked questions",
      body: [
        "**How do I delete my account?** Open **My Profile**, scroll to **Delete My Account**, type DELETE to confirm, and confirm once more. Deletion is immediate and permanent. [What is deleted and what is kept](/delete-account) is set out in full on its own page. If you cannot sign in, write to " +
          `[${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) from the address on the account and we will delete it for you once we have confirmed the request came from you.`,
        "**How do I report a post, a note or a comment?** Use the options menu on the item and choose **Report**. Pick a reason and, if you like, add a few words. The people who review reports see the report and a short excerpt of what you reported. Reports are reviewed within 24 hours.",
        "**How do I block someone?** Use the same options menu and choose **Block**. Blocking hides each of you from the other. If you want to report first and block afterwards, report before you block, because once someone is blocked their content disappears from your screen and cannot be reported from it. You can do both in one step from the report dialog.",
        "**How do I report a mistake or a bug?** Use **Report a Problem** in the account menu. It sends us the screen you were on and some technical details to help us fix it. Dates, places and sources in the app are checked against sources, and we want to hear when one is wrong.",
        "**I forgot my password.** On the sign-in screen choose **Forgot password?** and we will email you a link to set a new one.",
        "**I did not get my confirmation email.** Check your spam folder, then use the resend option on the sign-in screen. If it still does not arrive, write to us.",
        "**What do you do with my information?** We collect what you give us to make the app work (your email address, display name, and the notes, posts and other things you create) and a small amount of usage information about which features are used. We do not sell your personal information, we do not show ads, and we do not use advertising or third-party analytics trackers. Your notes, highlights, sermon notes and prayer list are private to your account unless you choose to share something. Read the full [Privacy Policy](/privacy).",
        "**Who can use Capstone Bible?** You must be at least 13 years old to create an account. The full rules are in the [Terms of Service](/terms).",
      ],
    },
    {
      heading: "Rules and your rights",
      body: [
        [
          "[Terms of Service](/terms)",
          "[Privacy Policy](/privacy)",
          "[Delete your account](/delete-account)",
        ],
      ],
    },
  ] as SupportSection[],
};
