/**
 * What deleting a Capstone Bible account actually does — written once, said in two places.
 *
 * The in-app confirmation (`DeleteAccountControl`) and the public page at /delete-account, which a
 * Google Play reviewer has to be able to read without installing anything, are the same promise made
 * to two audiences. If they drift, one of them is a lie. So the promise lives here, in a module with
 * no imports, and both read it: the app imports it directly, and `scripts/seo/loadData.mjs` bundles
 * this same file for the generator (the same way it bundles the article data).
 *
 * Every line below is a claim about behaviour that `supabase/functions/delete-account/index.ts`
 * implements. Changing what that function does means changing this text in the same commit.
 */

export interface DeletionNoticeLine {
  /** Short label, shown in bold. */
  label: string;
  /** One or two plain sentences. No hedging, no "may" — say what happens. */
  detail: string;
}

/** The address a person can write to if they cannot get into the app at all. Public, not Robbie's. */
export const ACCOUNT_DELETION_CONTACT = "admin@capstonebible.com";

/** Typed by hand into the confirmation box, and checked again server-side. A word, not a tap. */
export const ACCOUNT_DELETION_CONFIRM_WORD = "DELETE";

export const ACCOUNT_DELETION_HEADLINE =
  "Deleting your account is immediate and permanent. There is no waiting period, no recovery window, and no way for anyone — including us — to undo it.";

export const DELETED_FOR_GOOD: DeletionNoticeLine[] = [
  {
    label: "Your account and sign-in",
    detail:
      "The account itself, your email address and your password. You will not be able to sign back in, and nothing carries over if you sign up again later with the same email.",
  },
  {
    label: "Your profile",
    detail:
      "Display name, profile photo, phone number, church, favourite verse, bio, every About Me field and every social link.",
  },
  {
    label: "Your Bible study",
    detail:
      "Every note, highlight, verse tag, sermon note, reading position and reading-plan progress. Sermon-note photographs are deleted from storage, not merely unlinked.",
  },
  {
    label: "Your posts and comments",
    detail:
      "Every post you wrote, every photo and video attached to one, and every comment you left on anybody's post or shared note. Comments other people left on your posts go with the posts.",
  },
  {
    label: "Your direct messages",
    detail:
      "Both halves of every one-to-one conversation you were part of. A two-person conversation has no readable existence with one side missing, and your identity is attached to every line of it — so the thread goes rather than being left as a monologue addressed to nobody.",
  },
  {
    label: "Your group messages",
    detail:
      "Every message you sent inside a group. The group itself stays for the people still in it; your messages do not.",
  },
  {
    label: "Your friends and requests",
    detail: "Every connection and every pending request, in both directions.",
  },
  {
    label: "Your games",
    detail: "High scores, rooms you hosted and rounds you played, in every game in the app.",
  },
  {
    label: "Your name in other people's posts",
    detail:
      "If somebody tagged you in a post of theirs, your identifier is taken out of it. Their post is otherwise left alone — it is theirs, not yours.",
  },
  {
    label: "Any issue reports you filed",
    detail: "The reports you sent us about a mistake in the app, and any votes you cast on other people's reports.",
  },
];

export const KEPT_AND_WHY: DeletionNoticeLine[] = [
  {
    label: "Groups you started",
    detail:
      "A group is a shared room, not one person's property, and deleting it would take other people's history with it. So the group stays. If you were its last owner, ownership passes to the longest-standing member still in it. A group whose only member was you is deleted along with your account.",
  },
  {
    label: "Anonymous usage counts",
    detail:
      "Rows that record only that a screen was opened or a game was played stay, with your account stripped out of them. They no longer point at any person and cannot be traced back to you — removing them outright would put a hole in the site's own usage history for no gain in privacy.",
  },
  {
    label: "Administrator role history",
    detail:
      "If you ever held an administrator role, the security log recording that it was granted or removed keeps the internal identifier it applied to. That log holds no name, no email address and no content of yours, and the identifier no longer belongs to an account.",
  },
  {
    label: "Encrypted database backups",
    detail:
      "Routine encrypted backups taken before your deletion expire on their own schedule and are never used to restore a deleted account.",
  },
  {
    label: "Anything already outside the app",
    detail:
      "A backup you exported yourself, a screenshot somebody took, or anything you sent to another service is beyond our reach.",
  },
];

/** How to get an account deleted, in the order a person should try them. Point 1 is the in-app path;
 * point 2 is what Google Play requires to exist for somebody who has not installed anything. */
export const HOW_TO_DELETE: DeletionNoticeLine[] = [
  {
    label: "In the app, or in a web browser",
    detail:
      "Sign in at capstonebible.com or in the Capstone Bible app, open My Profile, scroll to Delete My Account, type DELETE to confirm, and confirm once more. Your account is gone before the screen finishes closing.",
  },
  {
    label: "By email, if you cannot sign in",
    detail:
      "Write to admin@capstonebible.com from the email address on the account and ask for it to be deleted. We reply to confirm before anything is removed, and we will not act on a request sent from a different address.",
  },
  {
    label: "Take a copy first, if you want one",
    detail:
      "My Profile has a Back Up My Data button that downloads your profile, notes, highlights, tags, sermon notes and reading position as a file you keep. Do that before you delete — afterwards there is nothing left to export.",
  },
];
