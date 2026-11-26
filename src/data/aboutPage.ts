/**
 * The "About Capstone Bible" page, shown in the app (AboutView) and published at /about.
 *
 * THESE ARE ROBBIE'S OWN WORDS, SIGNED WITH HIS NAME. Do not rewrite, shorten, soften, add to or
 * "tidy" them, including punctuation, without his say-so.
 *
 * This module has no imports on purpose: `scripts/seo/loadData.mjs` bundles it for the public-page
 * generator, exactly as it bundles the legal documents, so there is one copy of the words.
 */

export const ABOUT_TITLE = "About Capstone Bible";

export const ABOUT_PULL_QUOTE =
  "“My hope and prayer is to help the Bible become more understandable, tangible and usable for the average person. “";

export interface AboutSection {
  /** null for the opening letter, which has no heading of its own. */
  heading: string | null;
  paragraphs: string[];
}

export const ABOUT_SECTIONS: AboutSection[] = [
  {
    heading: null,
    paragraphs: [
      "To whom it may concern:",
      "My name is Robbie and I am so glad you’ve come to Capstone Bible.",
      "Over nearly 20 years of full-time ministry in nearly every position possible (Children’s pastor, youth pastor, Director of Hospitality, Director of Life Groups, Executive Pastor and Lead Pastor) I used lots of resources meant to help folks go deeper into their understanding of the Bible. What I could not find anywhere was a simple Bible app that would help me better understand where cities, towns, villages and different places in the Bible were actually located on a map. Sure – I knew where Jerusalem was, the Jordan River, the Sea of Galilee etc. But when Jesus traveled from Judea to Galilee through Samaria…how far was that? How difficult of a trip? Was this like walking from Portland, OR to Seattle, WA? Or more like walking San Francisco to Sacramento? And when he stops in Sychar to chat with the woman at the well…where is that and how can I find that out without having to spend a bunch of time searching through websites or other resources? And how many people lived there? When was it founded? What archaeological discoveries have been made there?",
      "The above questions always frustrated me and better understanding the locations of various towns and events in the Bible are what began the journey that has resulted in Capstone Bible. I wanted an easier way to better understand the context of the stories in the Bible. And now I have one and so do you.",
    ],
  },
  {
    heading: "On the use of AI",
    paragraphs: [
      "Unless you’ve lived in a cave the last few years, you are well aware that artificial intelligence is impacting nearly every aspect of life from the classroom to the office to the church.",
      "The truth is with artificial intelligence is coming an enormous amount of uncertainty. For some it will make life easier, for some it will make it harder. Some folks will use it for evil and some for incredible good.",
      "For me, I spent a fair amount of time trying to better understand how artificial intelligence can be utilized to do great things…even Gospel things. How can it be used to further God’s Kingdom, how can it make starting and building churches more affordable and effective, how can it be utilized to help us translate the Bible into languages that do not yet have it, how can we utilize it to help develop discipleship material and better equip pastors to lead churches.",
      "I understand that for some, simply asking these questions may be upsetting…from my perspective artificial intelligence is here to stay and these questions require consideration.",
      "Artificial intelligence is also what made Capstone Bible possible. I’m not a coder…and while I graduated from a Bible college and spent nearly two decades in ministry, I would not call myself an expert in many aspects of Biblical study. For that reason I’ve utilized artificial intelligence to both build Capstone Bible and the 1000+ articles within it. I have also spent countless hours working through those articles to check for theological and historical accuracy to the best of my ability. In full transparency, I have not yet read all of the articles and it is quite possible that I will not catch all errors made…especially those in the areas of geography and history. For that reason, I have made it simple for users to flag and report any errors that may be found.",
      "While the final product will continue to need checking and tweaking, I believe Capstone Bible to be greatly useful to make the Bible understandable, tangible and usable.",
      "May God bless you as you seek to more intimately follow Jesus in part by better knowing and following His word.",
    ],
  },
];
