import type { Topic } from "./types";

/** Non-place, non-person subjects — practices, doctrines, and people groups — linked from Bible text
 * alongside locations, POIs, and people. See Topic in types.ts for the shape. */
export const topics: Topic[] = [
  {
    id: "israelites",
    name: "Israelites",
    alternateNames: ["children of Israel"],
    category: "people-group",
    role: "God's Covenant People",
    summary:
      "The descendants of Jacob (renamed Israel), organized into twelve tribes, whom God chose as his covenant people through Abraham — the central nation of the Old Testament and the people among whom Jesus himself was born.",
    sections: [
      {
        heading: "Origin and Identity",
        paragraphs: [
          "The Israelites descend from Jacob, grandson of Abraham, whom God renamed 'Israel' after wrestling with him (Genesis 32:24-28). His twelve sons became the ancestors of Israel's twelve tribes, and the whole nation is repeatedly called simply 'the children of Israel' throughout the Old Testament. Their identity rests on God's covenant promises to Abraham (Genesis 12:1-3; 15:18-21), renewed at Sinai through Moses (Exodus 19-24) and centered on the conviction that the LORD alone is God and Israel alone, among the nations, is his chosen covenant people (Deuteronomy 7:6-8).",
        ],
      },
      {
        heading: "The Israelites in the New Testament",
        paragraphs: [
          "Jesus himself was born an Israelite, 'of the house and family of David' (Luke 2:4), and his early ministry was directed first to 'the lost sheep of the house of Israel' (Matthew 15:24) before the gospel's later expansion to the Gentiles. Paul, himself 'an Israelite, of the seed of Abraham' (Romans 11:1), wrestles at length in Romans 9-11 with Israel's place in God's plan after so many rejected their own Messiah, insisting God has not finally cast off his people and anticipating their future restoration (Romans 11:25-29). The apostle Peter applies Israel's own covenant language — 'a chosen race, a royal priesthood, a holy nation' (drawn from Exodus 19:6) — to the church, understood as sharing, through Christ, in Israel's covenant blessings rather than replacing Israel's own ongoing significance.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 32:24-28", note: "Jacob renamed Israel" },
      { reference: "Exodus 19:5-6", note: "Israel called to be God's 'treasured possession... a holy nation'" },
      { reference: "Matthew 15:24", note: "Jesus sent first 'to the lost sheep of the house of Israel'" },
      { reference: "Romans 11:1-29", note: "Paul on Israel's ongoing place in God's plan" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Israelite", url: "https://www.britannica.com/topic/Israelite" }],
  },
  {
    id: "jews",
    name: "Jews",
    alternateNames: ["the Jews", "Jewish"],
    category: "people-group",
    role: "Descendants of Judah; New Testament Term for Israel",
    summary:
      "The New Testament's most common term for the covenant people descended from Israel, derived from the tribe of Judah — the people among whom Jesus, his apostles, and the earliest church were all born.",
    sections: [
      {
        heading: "From Judah's Tribe to a National Name",
        paragraphs: [
          "'Jew' derives from Judah, one of Jacob's twelve sons and the tribe from which David's royal line came. After the northern ten tribes were carried into Assyrian exile (2 Kings 17) and the southern kingdom of Judah persisted (later itself exiled to Babylon and eventually returning), 'Jew' became the standing term for the covenant people descended from Israel generally, not only the tribe of Judah specifically — the term the New Testament uses far more often than 'Israelite.'",
        ],
      },
      {
        heading: "Jews in the New Testament",
        paragraphs: [
          "Every central figure of the New Testament's founding events was Jewish: Jesus himself (John 4:9 has a Samaritan woman address him plainly as 'a Jew'), all twelve apostles, and the entire earliest Jerusalem church. Paul, 'a Jew, from Tarsus in Cilicia' (Acts 21:39), later describes his own credentials as 'circumcised the eighth day, of the stock of Israel, of the tribe of Benjamin, a Hebrew of Hebrews' (Philippians 3:5) even after coming to see all such privilege as nothing compared to knowing Christ. The Gospels record recurring tension between Jesus and certain Jewish religious authorities (particularly some Pharisees and Sadducees, and the Jerusalem leadership that handed him to Rome), but this was conflict within Judaism, not Jesus or his first followers standing outside it — the church's expansion to include Gentiles (Acts 10-15) was itself a major internal Jewish-Christian question the earliest, entirely Jewish church had to work through.",
        ],
      },
    ],
    verses: [
      { reference: "John 4:9", note: "'Jews have no dealings with Samaritans'" },
      { reference: "Acts 21:39", note: "Paul: 'I am a Jew, from Tarsus in Cilicia'" },
      { reference: "Philippians 3:5", note: "Paul's Jewish credentials, 'a Hebrew of Hebrews'" },
      { reference: "Romans 1:16", note: "The gospel 'to the Jew first, and also to the Greek'" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Jew", url: "https://www.britannica.com/topic/Jew" }],
  },
  {
    id: "samaritans",
    name: "Samaritans",
    alternateNames: ["Samaritan"],
    category: "people-group",
    role: "Mixed-Ancestry Rivals of the Jews",
    summary:
      "A people of mixed Israelite and foreign ancestry centered in Samaria, whose rival worship and disputed lineage made them objects of deep mutual hostility with Jews by the New Testament era — and who Jesus repeatedly, pointedly treats with compassion and inclusion.",
    sections: [
      {
        heading: "Origins of the Samaritans",
        paragraphs: [
          "After Assyria conquered the northern kingdom of Israel in 722 BC, it deported much of the Israelite population and resettled the region with foreign peoples 'from Babylon, from Cuthah, from Avva, and from Hamath and Sepharvaim' (2 Kings 17:24), who intermarried with the Israelites left behind and adopted a mixed form of worship, honoring the LORD alongside other gods (2 Kings 17:29-41). Their descendants, centered in Samaria, developed their own version of the Torah and eventually built a rival temple on Mount Gerizim rather than worshiping at Jerusalem — a centuries-deep dispute over both bloodline purity and correct worship that hardened into the mutual hostility the New Testament assumes as background.",
        ],
      },
      {
        heading: "Samaritans in Jesus's Ministry",
        paragraphs: [
          "Jesus repeatedly and deliberately crosses this hostile boundary. He engages a Samaritan woman at Jacob's well in a lengthy theological conversation, offering her 'living water' despite a mutual custom that 'Jews have no dealings with Samaritans' (John 4:1-26), and many Samaritans from that town come to believe in him as a result (John 4:39-42). His most famous parable makes a Samaritan, not a priest or Levite, the story's hero — the one who actually shows mercy to a wounded traveler (Luke 10:25-37), a deliberately provocative choice given his Jewish audience's contempt for Samaritans. Of ten lepers Jesus heals, only one returns to give thanks — 'and he was a Samaritan' (Luke 17:11-19). After the resurrection, Jesus names Samaria specifically as a place the gospel must reach (Acts 1:8), a mission Philip the Evangelist carries out with notable success (Acts 8:4-25).",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 17:24-41", note: "Assyrian resettlement and mixed origin of the Samaritans" },
      { reference: "John 4:1-42", note: "Jesus and the Samaritan woman at the well" },
      { reference: "Luke 10:25-37", note: "The parable of the good Samaritan" },
      { reference: "Acts 8:4-25", note: "Philip the Evangelist preaches successfully in Samaria" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Samaritan", url: "https://www.britannica.com/topic/Samaritan-people" }],
  },
  {
    id: "topic-pharisees",
    name: "Pharisees",
    alternateNames: ["Pharisee"],
    category: "people-group",
    role: "Strict Jewish Sect Emphasizing Law and Oral Tradition",
    summary:
      "An influential Jewish religious and political movement devoted to strict observance of the Mosaic law as expanded by an extensive body of oral tradition — Jesus's most frequent sparring partners in the Gospels, and, before his conversion, Paul's own religious background.",
    sections: [
      {
        heading: "Who the Pharisees Were",
        paragraphs: [
          "The Pharisees emerged as a distinct movement sometime in the 2nd century BC, emphasizing scrupulous obedience to the written Torah alongside an extensive body of oral tradition meant to apply it to daily life in careful detail. Unlike the priestly, aristocratic Sadducees, Pharisees affirmed the resurrection of the dead, the existence of angels and spirits, and divine providence working alongside human free will (Acts 23:8) — theological positions much closer to later Christian belief, and popular enough with ordinary people that Pharisaic teaching, more than Sadducean, shaped the Judaism that survived the temple's destruction in AD 70.",
        ],
      },
      {
        heading: "Origins and the Meaning of the Name",
        paragraphs: [
          "The Pharisees emerge into clear view in the 2nd century BC, during the Hasmonean period, and Josephus is the first writer to describe them as an organised party — his account of their falling-out with the Hasmonean ruler John Hyrcanus (who ruled from about 134 to 104 BC) is the earliest detailed narrative we have about them. Their beginnings before that point are genuinely obscure. A common account links them to the Hasidim, the pious resisters of the Maccabean revolt; this is plausible and often repeated, but the evidence connecting the two groups is thin, and careful historians present it as a reasonable guess rather than an established fact.",
          "Even the name is uncertain. It is usually derived from the Hebrew perushim, 'the separated ones,' which would describe a group setting itself apart for purity — but scholars disagree about what they were separating from, and whether the label began as their own or as a jibe from opponents. An alternative derivation reads the root as 'to interpret,' making them 'the interpreters,' which fits their actual programme rather well. No source from the period settles it.",
        ],
      },
      {
        heading: "What the Ancient Writers Say",
        paragraphs: [
          "Almost everything known about the Pharisees comes from three bodies of writing, and each has a direction of bias worth knowing. Josephus, the Jewish historian writing for a Roman readership late in the 1st century AD, describes them in his Antiquities of the Jews and Jewish War as one of three Jewish 'schools of thought' alongside the Sadducees and Essenes; he reports that they were the most influential with the ordinary population, that they held to fate and human responsibility together, and — in Antiquities — that they numbered more than six thousand in Herod's time. He also states in his Life that he attached himself to the Pharisees as a young man, which makes him a valuable witness and an interested one.",
          "The New Testament is the second body, and it is a polemical source: the Gospels record the Pharisees chiefly where they are in conflict with Jesus, which is a real historical memory but not a rounded portrait of a movement. The third is rabbinic literature, principally the Mishnah and later works, compiled from the 3rd century AD onward by heirs who looked back on Pharisaic teachers with approval. Notably, no document survives that was written by a Pharisee, in the period, identifying itself as Pharisaic. Historians therefore reconstruct the movement from outsiders, opponents and successors, and describe the result with corresponding caution.",
        ],
      },
      {
        heading: "How the Movement Ended, and What Continued",
        paragraphs: [
          "The Pharisees do not so much end as change form. The catastrophe of AD 70 destroyed the temple and with it the institutional base of the priestly Sadducees, but Pharisaic religion — centred on Torah, its interpretation, the synagogue and the home — needed no temple to continue. In the decades after the revolt a rabbinic movement consolidated at Yavneh (Jamnia) on the coastal plain, and the sages of that movement are generally regarded as the principal heirs of the Pharisees. The term 'Pharisee' itself falls out of use; the successors call themselves rabbis.",
          "How direct that succession was is debated. The mainstream position holds a real continuity of people and ideas from the Pharisees to the early rabbis. A more cautious line, argued at length by Jacob Neusner among others, warns that rabbinic sources are late, that they had reasons to claim a Pharisaic pedigree, and that the continuity should not be assumed to be as tidy as the later tradition presents it. Both positions accept that Pharisaic emphases, rather than Sadducean ones, shaped the Judaism that survived.",
          "For how the two parties differed from one another point by point — on Scripture, the resurrection, where their power sat, and why only one of them survived — see Pharisees and Sadducees Compared.",
        ],
      },
      {
        heading: "Pharisees in the Gospels and Acts",
        paragraphs: [
          "The Gospels record repeated conflict between Jesus and the Pharisees, especially over Sabbath observance, ritual purity, and Jesus's willingness to eat with 'sinners' and tax collectors. Jesus's sharpest words are reserved for their hypocrisy — meticulously tithing garden herbs 'and have left undone the weightier matters of the law: justice, mercy, and faith' (Matthew 23:23) — condemning the substance behind the practice, not necessarily every individual Pharisee. Not all Pharisees were hostile: Nicodemus, 'a ruler of the Jews' and Pharisee, comes to Jesus by night with real questions (John 3:1-21) and later helps bury him (John 19:39-40), and the Pharisee Gamaliel counsels the Jewish council toward caution rather than violence against the apostles (Acts 5:34-39). Paul himself was 'a Pharisee, a son of Pharisees' (Acts 23:6), trained under Gamaliel (Acts 22:3), before his conversion turned his zeal toward proclaiming the very faith he had once persecuted.",
        ],
      },
    ],
    verses: [
      { reference: "Matthew 23:1-36", note: "Jesus's extended rebuke of Pharisaic hypocrisy" },
      { reference: "Acts 23:6-8", note: "Pharisees affirm resurrection, angels, and spirits, unlike the Sadducees" },
      { reference: "John 3:1-21", note: "Nicodemus, a Pharisee, comes to Jesus" },
      { reference: "Acts 23:6", note: "Paul identifies himself as 'a Pharisee, a son of Pharisees'" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Pharisee", url: "https://www.britannica.com/topic/Pharisee" }],
  },
  {
    id: "topic-sadducees",
    name: "Sadducees",
    alternateNames: ["Sadducee"],
    category: "people-group",
    role: "Aristocratic Jewish Sect Denying the Resurrection",
    summary:
      "A wealthy, priestly Jewish party centered on the Jerusalem temple establishment, distinguished from the Pharisees chiefly by rejecting belief in the resurrection, angels, and spirits — and by their disappearance from history entirely after the temple's destruction in AD 70.",
    sections: [
      {
        heading: "Who the Sadducees Were",
        paragraphs: [
          "The Sadducees drew their membership largely from the priestly and wealthy aristocratic classes, and their power center was the Jerusalem temple and its associated council (the Sanhedrin), where they held significant influence over the high priesthood in Jesus's day. Acts summarizes their key theological distinctive plainly: 'the Sadducees say that there is no resurrection, nor angel, nor spirit; but the Pharisees confess all of these' (Acts 23:8) — a more conservative reading that recognized only the five books of Moses as fully authoritative, and found no clear resurrection doctrine there.",
        ],
      },
      {
        heading: "Origins, and the Problem of the Sources",
        paragraphs: [
          "The Sadducees appear alongside the Pharisees in the Hasmonean period, and the name is usually derived from Zadok, the priestly line that served under David and Solomon and whose descendants held the high priesthood for centuries — a derivation that fits a party of priestly aristocrats, though the philological route from 'Zadok' to 'Sadducee' is not without difficulties and other explanations have been proposed. Josephus treats them as one of the three Jewish schools of thought alongside the Pharisees and Essenes, describing them as few in number but drawn from the highest ranks, and as having considerably less popular following than their rivals.",
          "One fact governs everything written about them: no Sadducean writing survives. Not a letter, not a treatise, not a legal ruling. Everything known comes from people outside the party and mostly hostile to it — Josephus, the New Testament, and rabbinic literature descended from the Pharisaic side of the argument. The standard portrait is probably sound in outline, because those independent sources agree on the main points. Its sharper details are another matter, and a reader is right to hold them loosely rather than to picture the Sadducees as confidently as the sources' tone invites.",
        ],
      },
      {
        heading: "What They Held",
        paragraphs: [
          "Their best-attested distinctive is the denial of the resurrection, stated flatly in Acts 23:8 and dramatised in the trap they set for Jesus about the woman married successively to seven brothers. Acts adds that they denied angels and spirits as well, which is harder to square with the Torah they accepted, since angels appear there repeatedly. This app treats Luke's report as accurate — he is a careful reporter of first-century Jewish detail elsewhere, and the sentence is offered as plain description of a party his readers could still meet. The most likely sense, and the one most commentators favour, is that the Sadducees rejected the elaborate angelology and speculation about spirits that had developed in the intertestamental literature, rather than denying the existence of the angels who appear in the books of Moses. Some scholars instead read Luke as compressing a broader disagreement into a slogan; a few take the denial at full strength. The first reading is this article's, and the others are not unreasonable.",
          "On Scripture, the ancient sources agree that the Sadducees gave binding authority to the written Law of Moses and rejected the oral tradition the Pharisees maintained. Whether they also rejected the Prophets and the Writings outright — a claim made by some later writers — is disputed; many modern historians think the stronger claim overstates a real difference in emphasis. Josephus adds that they denied fate, holding that human beings choose good and evil freely, in contrast to the Pharisees' pairing of providence and responsibility. Their conservatism was legal and this-worldly rather than pietistic: strict in the letter of the Law, sceptical of the interpretive superstructure built on it.",
        ],
      },
      {
        heading: "Why They Vanished",
        paragraphs: [
          "The Sadducees' standing rested on the temple, the priesthood and a working accommodation with Rome. When the revolt of AD 66-70 ended with the temple burned and the priesthood without a function, the party had nothing left to stand on, and it disappears from the record within a generation. Nothing survived them: no successor movement claimed their name, and no community preserved their books. The contrast with the Pharisees, whose Torah-centred piety travelled perfectly well without a building, is the clearest illustration in Jewish history of how much an institution's survival depends on what it is anchored to.",
          "For a point-by-point comparison of the two parties — Scripture, the resurrection, where their power sat, and how each fared after AD 70 — see Pharisees and Sadducees Compared.",
        ],
      },
      {
        heading: "Sadducees in the Gospels and Acts",
        paragraphs: [
          "The Sadducees appear less often than the Pharisees in the Gospels but in one memorable episode try to trap Jesus with a hypothetical about a woman who outlives seven brothers she successively marries, mocking the idea of resurrection — Jesus answers that they 'know neither the Scriptures, nor the power of God' (Matthew 22:23-33; Mark 12:18-27). It was chiefly the Sadducean-led temple establishment, more than the Pharisees, that moved against Jesus and later against the apostles (Acts 4:1-2; 5:17-18), likely because a popular movement proclaiming resurrection threatened both their theology and their comfortable political arrangement with Rome. Paul, on trial before a mixed council, shrewdly exploits this very division: declaring himself on trial 'concerning the hope and resurrection of the dead' immediately turns the Pharisees and Sadducees present against each other rather than united against him (Acts 23:6-10). Because their power depended entirely on the temple and its priesthood, the Sadducees vanish from history after the temple's destruction in AD 70 — unlike the Pharisees, whose emphasis on Torah and oral tradition, independent of any single building, gave rise to the rabbinic Judaism that has continued ever since.",
        ],
      },
    ],
    verses: [
      { reference: "Matthew 22:23-33", note: "Sadducees questioned about the resurrection" },
      { reference: "Acts 4:1-2", note: "Sadducees 'upset' at the apostles preaching resurrection" },
      { reference: "Acts 23:6-10", note: "Paul divides the council along Pharisee/Sadducee lines" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Sadducee", url: "https://www.britannica.com/topic/Sadducee" }],
  },
  {
    id: "levites",
    name: "Levites",
    alternateNames: ["Levite"],
    category: "people-group",
    role: "Israel's Priestly Tribe",
    summary:
      "The tribe descended from Jacob's son Levi, set apart from Israel's other tribes for temple/tabernacle service and given no territorial inheritance of their own — the priestly and worship-leading tribe throughout the Old Testament.",
    sections: [
      {
        heading: "Israel's Set-Apart Tribe",
        paragraphs: [
          "When Israel's land was divided among the twelve tribes, Levi's descendants received no territory of their own; instead, 'the LORD is their inheritance' (Deuteronomy 18:1-2), and they were assigned forty-eight cities scattered throughout the other tribes' territories (Numbers 35:1-8) so their presence and instruction reached the whole nation rather than being confined to one region. Within the tribe, Aaron's direct descendants alone served as priests offering sacrifices, while the rest of the Levites assisted with the tabernacle's (later temple's) daily operation, music, and teaching (Numbers 3:5-10; 1 Chronicles 23:24-32).",
        ],
      },
      {
        heading: "Levites Elsewhere in Scripture",
        paragraphs: [
          "Jesus's parable of the good Samaritan pointedly includes a Levite among those who pass by a wounded man without helping, alongside a priest (Luke 10:31-32) — a detail that would have stung a Jewish audience familiar with the Levites' supposed role modeling covenant faithfulness. Barnabas, Paul's early missionary companion, is identified as 'a Levite, a man of Cyprus by race' (Acts 4:36), showing Levites still recognized as such generations after the exile and well into the New Testament era, even without the tribal land inheritance the office had originally never included.",
        ],
      },
    ],
    verses: [
      { reference: "Numbers 3:5-10", note: "Levites assigned to assist the priests in tabernacle service" },
      { reference: "Deuteronomy 18:1-8", note: "Levites receive no land inheritance; 'the LORD is their inheritance'" },
      { reference: "Luke 10:31-32", note: "A Levite passes by the wounded man in the parable of the good Samaritan" },
      { reference: "Acts 4:36", note: "Barnabas identified as 'a Levite'" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Levite", url: "https://www.britannica.com/topic/Levite" }],
  },
  {
    id: "canaanites",
    name: "Canaanites",
    alternateNames: ["Canaanite"],
    category: "people-group",
    role: "Pre-Israelite Inhabitants of the Promised Land",
    summary:
      "The peoples inhabiting the land of Canaan before Israel's conquest under Joshua, whose idolatry and religious practices (including child sacrifice) Scripture repeatedly names as the reason for their judgment and displacement.",
    sections: [
      {
        heading: "The Canaanites and the Conquest",
        paragraphs: [
          "God's promise to Abraham named the land already occupied by numerous peoples grouped together as 'Canaanites' (alongside related groups like the Hittites, Amorites, Perizzites, and Jebusites — Genesis 15:19-21). God tells Abraham the promise's fulfillment must wait 'four generations,' because 'the iniquity of the Amorite is not yet full' (Genesis 15:16) — the conquest under Joshua, centuries later, is presented not as opportunistic conquest but as delayed judgment on nations whose idolatry, by that point, included practices Scripture condemns in the strongest terms, particularly child sacrifice to gods like Molech (Leviticus 18:21-25; Deuteronomy 12:31).",
          "Joshua's conquest, though extensive, was not total — pockets of Canaanite peoples remained throughout the period of the Judges, and Israel's persistent failure to fully displace them or resist adopting their religious practices becomes one of the Old Testament's recurring explanations for Israel's own repeated apostasy (Judges 1:27-33; 2:1-3).",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 15:16-21", note: "The land promised to Abraham's descendants, occupied by Canaanite peoples" },
      { reference: "Deuteronomy 12:29-31", note: "Warning against adopting Canaanite religious practices, including child sacrifice" },
      { reference: "Joshua 11:16-23", note: "Summary of the land Joshua conquered" },
      { reference: "Judges 1:27-33", note: "Canaanite peoples remaining after the conquest" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Canaan", url: "https://www.britannica.com/place/Canaan-historical-region-Middle-East" }],
  },
  {
    id: "philistines",
    name: "Philistines",
    alternateNames: ["Philistine"],
    category: "people-group",
    role: "Israel's Perennial Coastal Rivals",
    summary:
      "A seafaring people (likely originating in the Aegean region) who settled Canaan's southern coastal plain around the same time Israel entered the land, becoming Israel's most persistent military rival throughout the periods of the Judges and early monarchy.",
    sections: [
      {
        heading: "Origins and Territory",
        paragraphs: [
          "The Philistines settled a pentapolis of five major cities along the southern Mediterranean coast — Gaza, Ashkelon, Ashdod, Gath, and Ekron — likely arriving as part of the broader 'Sea Peoples' migrations around the 12th century BC, roughly contemporary with Israel's own arrival in Canaan from the opposite direction. Their superior ironworking technology, which Israel lacked for generations (1 Samuel 13:19-22), gave them a significant military advantage that made them Israel's most dangerous and recurring enemy through the period of the Judges and into the early monarchy.",
        ],
      },
      {
        heading: "Philistines in Israel's Story",
        paragraphs: [
          "Samson's entire judgeship plays out in conflict with the Philistines, ending in his own death alongside thousands of them when he pulls down their temple to Dagon (Judges 16:23-30). The Philistines captured the ark of the covenant in battle, only to have it wreak havoc among their own gods and people until they returned it (1 Samuel 4-6). Israel's most famous single combat, David against the giant Philistine champion Goliath of Gath, turned a national military standoff into personal legend (1 Samuel 17), and David's later reign finally subdued Philistine power as a serious military threat, though the cities themselves remained inhabited for centuries afterward and are still named in later prophetic oracles of judgment (Amos 1:6-8; Zephaniah 2:4-7).",
        ],
      },
    ],
    verses: [
      { reference: "Judges 16:23-30", note: "Samson's death among the Philistines at Dagon's temple" },
      { reference: "1 Samuel 4:1-11", note: "The Philistines capture the ark of the covenant" },
      { reference: "1 Samuel 17", note: "David defeats the Philistine champion Goliath" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Philistine", url: "https://www.britannica.com/topic/Philistine" }],
  },
  {
    id: "egyptians",
    name: "Egyptians",
    alternateNames: ["Egyptian"],
    category: "people-group",
    role: "Israel's Enslaver and Occasional Refuge",
    summary:
      "The ancient civilization along the Nile whose pharaoh enslaved Israel for centuries before the Exodus — and which later, ironically, twice provided refuge for God's own chosen family, sheltering both Jacob's household and the infant Jesus.",
    sections: [
      {
        heading: "Egypt as Israel's Enslaver",
        paragraphs: [
          "Egypt's central role in Israel's story is bound up entirely with the book of Exodus: what began as refuge, when Joseph rose to power there and welcomed his father Jacob's family during a famine (Genesis 46-47), turned generations later into brutal slavery once 'there arose a new king over Egypt, who didn't know Joseph' (Exodus 1:8-14). God's deliverance of Israel from Egyptian bondage through Moses, culminating in the ten plagues and the Passover (Exodus 5-14), becomes the Old Testament's defining act of salvation, invoked repeatedly throughout the rest of Scripture as the proof of God's power and covenant faithfulness (Deuteronomy 6:20-23; Psalm 78:12-13).",
        ],
      },
      {
        heading: "Egypt as Refuge",
        paragraphs: [
          "Egypt also repeatedly serves, ironically, as a place of refuge for God's people in crisis — Abraham fled famine to Egypt (Genesis 12:10), as did his grandson Jacob's entire household generations later (Genesis 46:1-7). Most strikingly, Matthew records that Joseph fled with Mary and the infant Jesus to Egypt to escape Herod's massacre of Bethlehem's infants, seeing in it a fulfillment of Hosea's words, 'Out of Egypt I called my son' (Matthew 2:13-15; Hosea 11:1) — the nation once defined by Israel's oppression becoming, one final time, the place where God's own greater Son found safety.",
        ],
      },
    ],
    verses: [
      { reference: "Exodus 1:8-14", note: "A new pharaoh enslaves the Israelites" },
      { reference: "Exodus 12:29-42", note: "The Exodus from Egypt" },
      { reference: "Matthew 2:13-15", note: "The holy family flees to Egypt from Herod" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Ancient Egypt", url: "https://www.britannica.com/place/ancient-Egypt" }],
  },
  {
    id: "edomites",
    name: "Edomites",
    alternateNames: ["Edomite"],
    category: "people-group",
    role: "Descendants of Esau; Israel's Kindred Rivals",
    summary:
      "The nation descended from Jacob's twin brother Esau, settled south of the Dead Sea — related to Israel by blood, yet the subject of some of the Old Testament's harshest prophetic condemnation for hostility shown at Israel's lowest moments.",
    sections: [
      {
        heading: "A Rivalry Rooted in Family",
        paragraphs: [
          "Edom's very name traces to Esau, Jacob's twin brother, who sold his birthright and was nicknamed 'Edom' ('red') after the red stew he traded it for (Genesis 25:29-34; 36:1, 8). This shared ancestry made Edom and Israel kindred nations, which sharpens rather than softens the Old Testament's recurring hostility between them — Edom refused Israel safe passage during the Exodus (Numbers 20:14-21), and centuries later, when Babylon sacked Jerusalem, Edom is repeatedly condemned for gloating over and even assisting in Judah's destruction (Obadiah 1:10-14; Psalm 137:7). Obadiah, the Old Testament's shortest book, is devoted entirely to pronouncing judgment on Edom for exactly this betrayal of a brother nation in its darkest hour.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 25:29-34", note: "Esau (Edom) sells his birthright" },
      { reference: "Numbers 20:14-21", note: "Edom refuses Israel passage during the Exodus" },
      { reference: "Obadiah 1:10-14", note: "Judgment pronounced on Edom for betraying Judah" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Edom", url: "https://www.britannica.com/place/Edom" }],
  },
  {
    id: "moabites-and-ammonites",
    name: "Moabites and Ammonites",
    alternateNames: ["Moabite", "Ammonite", "Moabites", "Ammonites"],
    category: "people-group",
    role: "Descendants of Lot; Israel's Trans-Jordan Neighbors",
    summary:
      "Two related nations descended from Lot, Abraham's nephew, settled east of the Dead Sea — recurring rivals of Israel, yet also the ancestral homeland of Ruth, King David's own great-grandmother.",
    sections: [
      {
        heading: "Origins and Recurring Conflict with Israel",
        paragraphs: [
          "Both nations trace their origin to a troubling episode after the destruction of Sodom and Gomorrah: Lot's two daughters, believing no other men remained alive, made their father drunk and conceived sons by him, naming them Moab and Ben-ammi, ancestors of the Moabites and Ammonites (Genesis 19:30-38). Numbers records the Moabite king Balak hiring the prophet Balaam to curse Israel during the wilderness wandering — a curse God turned into blessing instead (Numbers 22-24) — and both nations appear repeatedly as military opponents throughout Judges and the monarchy (Judges 3:12-30; 11:4-33; 1 Samuel 11).",
        ],
      },
      {
        heading: "Ruth the Moabite",
        paragraphs: [
          "Despite this history of conflict, the book of Ruth tells the story of a Moabite widow who chose loyalty to her Israelite mother-in-law Naomi and to Naomi's God — 'your people shall be my people, and your God my God' (Ruth 1:16) — marrying the Israelite Boaz and becoming great-grandmother to King David himself (Ruth 4:13-17), and so an ancestor of Jesus (Matthew 1:5-6). A foreign Moabite woman occupying such a central place in David's own lineage stands as one of the Old Testament's clearest reminders that God's covenant blessing was never meant to stay narrowly confined to ethnic Israel alone.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 19:30-38", note: "Origin of the Moabites and Ammonites" },
      { reference: "Numbers 22-24", note: "Balak of Moab hires Balaam to curse Israel" },
      { reference: "Ruth 1:16", note: "Ruth the Moabite's loyalty to Naomi and Naomi's God" },
      { reference: "Ruth 4:13-17", note: "Ruth becomes King David's great-grandmother" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Moab", url: "https://www.britannica.com/place/Moab-historical-kingdom-Jordan" },
      { label: "Encyclopaedia Britannica: Ammon", url: "https://www.britannica.com/place/Ammon-ancient-kingdom-Jordan" },
    ],
  },
  {
    id: "assyrians",
    name: "Assyrians",
    alternateNames: ["Assyrian"],
    category: "people-group",
    role: "The Empire That Destroyed the Northern Kingdom",
    summary:
      "A brutal, highly militarized Mesopotamian empire that conquered and deported Israel's northern kingdom in 722 BC — and, in the book of Jonah, the surprising recipient of a reluctant prophet's message and God's mercy.",
    sections: [
      {
        heading: "Assyria's Conquest of Israel",
        paragraphs: [
          "Centered on the Tigris River in what is now northern Iraq, Assyria built the ancient Near East's most feared military machine, known for brutal tactics and mass deportations designed to permanently break conquered peoples' national identity. Assyria conquered and deported the northern kingdom of Israel in 722 BC after a prolonged siege of Samaria, resettling the region with foreign peoples (2 Kings 17:5-6, 24) — the event behind the origin of the Samaritans and the effective end of Israel's ten northern tribes as a distinct nation. Assyria also invaded Judah under Sennacherib and besieged Jerusalem itself, only to have the siege broken when, Scripture records, 'the angel of the LORD went out, and struck one hundred eighty-five thousand men in the camp of the Assyrians' overnight (2 Kings 19:35).",
        ],
      },
      {
        heading: "Assyria in Jonah",
        paragraphs: [
          "The book of Jonah centers entirely on Assyria's capital, Nineveh — the prophet Jonah, sent to warn the city of coming judgment, initially flees in the opposite direction rather than see this hated enemy nation spared (Jonah 1:1-3), but when Nineveh does repent at his eventual preaching, God relents from the destruction he had threatened (Jonah 3:5-10), leaving Jonah bitterly displeased at God's mercy toward Israel's enemies rather than pleased at the outcome (Jonah 4:1-11) — a pointed Old Testament reminder that God's compassion was never meant to be reserved for Israel alone.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 17:5-6", note: "Assyria conquers and deports the northern kingdom of Israel" },
      { reference: "2 Kings 19:35", note: "The angel of the LORD destroys Sennacherib's besieging army" },
      { reference: "Jonah 3:5-10", note: "Nineveh repents; God relents from judgment" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Assyria", url: "https://www.britannica.com/place/Assyria" }],
  },
  {
    id: "babylonians",
    name: "Babylonians",
    alternateNames: ["Babylonian", "Chaldeans", "Chaldean"],
    category: "people-group",
    role: "The Empire That Destroyed Jerusalem and Exiled Judah",
    summary:
      "The Mesopotamian empire under Nebuchadnezzar that destroyed Jerusalem and Solomon's Temple in 586 BC and carried Judah into a seventy-year exile — the setting for Daniel's court service and the fiery furnace.",
    sections: [
      {
        heading: "Babylon's Conquest of Judah",
        paragraphs: [
          "Babylon (also called Chaldea, after the dynasty that ruled it) rose to dominate the ancient Near East after defeating Assyria, and under King Nebuchadnezzar besieged and eventually destroyed Jerusalem in 586 BC, burning Solomon's Temple to the ground and deporting much of Judah's population (2 Kings 25:1-21) — the judgment the prophets, especially Jeremiah, had long warned was coming for the nation's persistent covenant unfaithfulness. Jeremiah nonetheless promised the exile would last a defined seventy years before restoration (Jeremiah 25:11-12; 29:10), a promise later fulfilled almost to the letter when Persia's Cyrus permitted the exiles' return.",
        ],
      },
      {
        heading: "Babylon in Daniel",
        paragraphs: [
          "The book of Daniel is set almost entirely within Nebuchadnezzar's Babylonian court, following Daniel and his three companions as Jewish exiles serving a foreign, pagan empire while maintaining faithfulness to God — most memorably when Shadrach, Meshach, and Abednego are thrown into a fiery furnace for refusing to worship a golden image, and emerge unharmed alongside a mysterious fourth figure 'like a son of the gods' (Daniel 3:19-27). Daniel's own repeated interpretation of Babylonian kings' dreams (Daniel 2, 4) presents Babylon's power, however dominant it appeared, as entirely subject to the sovereignty of Israel's God even at the height of Judah's exile and apparent defeat.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 25:1-21", note: "Nebuchadnezzar destroys Jerusalem and the Temple" },
      { reference: "Jeremiah 25:11-12", note: "The seventy-year exile prophesied" },
      { reference: "Daniel 3", note: "Shadrach, Meshach, and Abednego in the fiery furnace" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Babylonia", url: "https://www.britannica.com/place/Babylonia" }],
  },
  {
    id: "persians",
    name: "Persians",
    alternateNames: ["Persian"],
    category: "people-group",
    role: "The Empire That Ended the Exile",
    summary:
      "The empire under Cyrus the Great that conquered Babylon and permitted Judah's exiles to return home and rebuild the Temple — and, a century later, the setting for Esther's story and Nehemiah's rebuilding of Jerusalem's walls.",
    sections: [
      {
        heading: "Cyrus and the Return from Exile",
        paragraphs: [
          "Persia conquered Babylon in 539 BC, and its first king, Cyrus the Great, issued a decree permitting the exiled Jewish population to return home and rebuild the Jerusalem temple (Ezra 1:1-4; 2 Chronicles 36:22-23) — a policy of restoring displaced peoples and their gods/temples well-attested in Persian records, and which Isaiah had astonishingly named Cyrus by name as God's chosen instrument over a century before he was born (Isaiah 44:28; 45:1). This decree ended Judah's seventy-year exile essentially on Jeremiah's own predicted schedule and set in motion the rebuilding chronicled in Ezra and Nehemiah.",
        ],
      },
      {
        heading: "Persia in Esther and Nehemiah",
        paragraphs: [
          "The book of Esther is set entirely within the Persian court a century or so later, under King Ahasuerus (widely identified with Xerxes I), where a Jewish orphan named Esther becomes queen and, with her cousin Mordecai, foils a plot by the official Haman to exterminate the empire's Jewish population — the origin of the Jewish festival of Purim (Esther 3-9). Nehemiah, cupbearer to the Persian king Artaxerxes, later obtains royal permission and resources to return to Jerusalem and rebuild its ruined walls (Nehemiah 1-2), completing the physical restoration Cyrus's decree had begun generations earlier.",
        ],
      },
    ],
    verses: [
      { reference: "Ezra 1:1-4", note: "Cyrus's decree permits the exiles' return" },
      { reference: "Isaiah 44:28; 45:1", note: "Cyrus named by God over a century before his birth" },
      { reference: "Esther 3-9", note: "Esther and Mordecai save the Jews from Haman's plot" },
      { reference: "Nehemiah 1-2", note: "Nehemiah obtains permission to rebuild Jerusalem's walls" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Achaemenid Dynasty", url: "https://www.britannica.com/topic/Achaemenian-dynasty" }],
  },
  {
    id: "romans",
    name: "Romans",
    alternateNames: ["Roman", "the Romans"],
    category: "people-group",
    role: "The Empire That Ruled Judea in the New Testament",
    summary:
      "The empire that ruled Judea throughout Jesus's life and the apostolic era — executor of the crucifixion, occasional protector of Paul's legal rights as a citizen, and eventual destroyer of the Second Temple in AD 70.",
    sections: [
      {
        heading: "Rome's Rule Over Judea",
        paragraphs: [
          "Rome annexed Judea as a province decades before Jesus's birth, ruling through a mix of client kings (like Herod the Great and his sons) and directly appointed governors (like Pontius Pilate). This is the political backdrop for essentially the entire New Testament: Caesar Augustus's census brings Joseph and Mary to Bethlehem (Luke 2:1-7); Roman soldiers ultimately carry out Jesus's crucifixion, a distinctly Roman method of execution, under the authority of the Roman governor Pilate (John 19:1-16); and the New Testament's own dating markers (Tiberius's regnal years, various emperors and governors named) are all Roman administrative facts Luke uses to anchor Gospel and Acts events in verifiable history (Luke 3:1-2).",
        ],
      },
      {
        heading: "Rome and Paul's Ministry",
        paragraphs: [
          "Paul's Roman citizenship — a privileged status inherited or purchased, not universal even among Jews in the empire — repeatedly protects him from mistreatment: he invokes it to avoid an illegal flogging in Philippi (Acts 16:37-39) and, most consequentially, uses his right as a citizen to appeal his case directly to Caesar rather than face trial before a hostile Jerusalem crowd, a decision that sends him to Rome itself (Acts 25:10-12). Paul's letter to the church at Rome, written to believers already present in the empire's capital before he ever visited, became the New Testament's most systematic single exposition of the gospel. Roman power's limits are also on full display in Scripture: despite ruling for centuries, Rome could not prevent the gospel's spread throughout its own empire, and the same imperial system eventually destroyed the Second Temple in AD 70, ending Jerusalem's sacrificial worship permanently.",
        ],
      },
    ],
    verses: [
      { reference: "Luke 2:1-7", note: "Caesar Augustus's census decree" },
      { reference: "John 19:1-16", note: "Pilate authorizes Jesus's crucifixion" },
      { reference: "Acts 16:37-39", note: "Paul invokes his Roman citizenship in Philippi" },
      { reference: "Acts 25:10-12", note: "Paul appeals to Caesar" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Ancient Rome", url: "https://www.britannica.com/place/ancient-Rome" }],
  },
  {
    id: "greeks",
    name: "Greeks",
    alternateNames: ["Greek", "Hellenists", "Hellenist"],
    category: "people-group",
    role: "The New Testament's Term for the Wider Gentile World",
    summary:
      "In New Testament usage, less an ethnic label than shorthand for the whole non-Jewish, Greek-speaking Mediterranean world — the audience Paul repeatedly names alongside 'the Jew' as together comprising all humanity the gospel addresses.",
    sections: [
      {
        heading: "'Greek' as Shorthand for the Gentile World",
        paragraphs: [
          "By the New Testament era, three centuries after Alexander the Great's conquests spread Greek language and culture across the eastern Mediterranean, 'Greek' had become less a strict ethnicity and more the New Testament's standard shorthand for the whole non-Jewish world that shared this common Hellenistic culture and language. Paul's repeated formula 'to the Jew first, and also to the Greek' (Romans 1:16; 10:12) uses the pairing to mean, in effect, 'to everyone, Jew and Gentile alike' — the entire human race the gospel addresses, not literally only ethnic Greeks.",
        ],
      },
      {
        heading: "Hellenists in Acts",
        paragraphs: [
          "Acts distinguishes 'Hellenists' — Greek-speaking Jews, often from the wider Mediterranean Dispersion — from Aramaic-speaking, more traditionally Judean 'Hebrews' within the earliest Jerusalem church, a distinction that surfaces in a dispute over the fair distribution of food to widows, resolved by appointing seven men (including Stephen and Philip) specifically to oversee it (Acts 6:1-6). Paul's own missionary strategy repeatedly engages the Greek intellectual world directly, most memorably reasoning with Epicurean and Stoic philosophers at Athens's Areopagus, quoting Greek poets to make his case for the God 'in whom we live, and move, and have our being' (Acts 17:16-34).",
        ],
      },
    ],
    verses: [
      { reference: "Romans 1:16", note: "'To the Jew first, and also to the Greek'" },
      { reference: "Acts 6:1-6", note: "Hellenists (Greek-speaking Jews) distinguished from Hebrews in Jerusalem" },
      { reference: "Acts 17:16-34", note: "Paul reasons with Greek philosophers at the Areopagus" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Hellenistic Age", url: "https://www.britannica.com/event/Hellenistic-Age" }],
  },
  {
    id: "the-temple",
    name: "The Temple",
    alternateNames: ["the temple", "Yahweh's temple"],
    category: "concept",
    role: "Israel's Central Sanctuary in Jerusalem",
    summary:
      "The fixed, permanent house of worship in Jerusalem that replaced the portable Tabernacle — built once by Solomon (the First Temple, destroyed by Babylon), rebuilt after the exile and later expanded by Herod (the Second Temple, destroyed by Rome), and reinterpreted by Jesus as ultimately pointing to his own body.",
    sections: [
      {
        heading: "The First Temple (Solomon's Temple)",
        paragraphs: [
          "David wanted to build God a permanent house in Jerusalem, but that task fell to his son Solomon, who began construction 'in the four hundred and eightieth year after the children of Israel had come out of the land of Egypt, in the fourth year of Solomon's reign' — traditionally dated around 966 BC (1 Kings 6:1). Solomon's Temple followed the Tabernacle's basic layout on a grand, permanent scale: an outer porch, the main temple hall, and an inner sanctuary (the Holy of Holies) housing the ark of the covenant (1 Kings 6:3-33). When it was dedicated, 'Yahweh's glory filled Yahweh's house,' so visibly that the priests could not continue ministering (1 Kings 8:10-11) — the same kind of glory-filling that once marked the completed Tabernacle.",
          "This First Temple stood for roughly four centuries before Babylon destroyed it in 586 BC as part of Jerusalem's conquest and Judah's exile (2 Kings 25:8-9) — the judgment the prophets had long warned was coming for the nation's persistent unfaithfulness.",
        ],
      },
      {
        heading: "The Second Temple (Zerubbabel's and Herod's Temple)",
        paragraphs: [
          "When the Persian king Cyrus permitted the Jewish exiles to return roughly seventy years later, rebuilding the temple was among the returning community's first priorities. Ezra records the emotional moment the new foundation was laid: some who remembered Solomon's Temple wept aloud at how much smaller this one appeared, while others shouted for joy that the work had begun again at all (Ezra 3:10-13) — the same site, the same purpose, but a visibly diminished structure compared to what it had replaced. This rebuilt sanctuary, completed around 516 BC (Ezra 6:14-15), is what historians call the Second Temple, and it stood, with substantial later renovation, through the entire New Testament period.",
          "Herod the Great began a massive expansion and rebuilding of this Second Temple around 20 BC, dramatically enlarging the Temple Mount platform and rebuilding the sanctuary itself in far grander style — the temple Jesus is described visiting, teaching in, and cleansing throughout the Gospels (John 2:14-16), and the same temple whose stones the disciples marveled at, prompting Jesus's prediction that 'there will not be left here one stone on another, that will not be thrown down' (Matthew 24:1-2). That prediction was fulfilled in AD 70, when Roman forces under Titus destroyed the Second Temple during the Jewish revolt — a destruction so total that, except for retaining walls like the Western Wall, essentially nothing of the temple structure itself survives today.",
        ],
      },
      {
        heading: "Jesus and the Temple of His Body",
        paragraphs: [
          "Jesus repeatedly reframes what the temple ultimately points to. After overturning the money changers' tables, he tells the Jewish leaders, 'Destroy this temple, and in three days I will raise it up' — words they take as an absurd boast about Herod's forty-six-year building project, but which John clarifies directly: 'he spoke of the temple of his body' (John 2:19-21). In Jesus's own teaching, his body becomes the reality the physical temple had always anticipated — the true meeting place between God and his people. Paul later extends this same logic to believers themselves, calling the church collectively 'God's temple' in whom 'God's Spirit dwells' (1 Corinthians 3:16) — the temple's whole purpose, God dwelling among his people, now fulfilled not in a building of any era, but in Christ and, through him, in his people.",
        ],
      },
    ],
    verses: [
      { reference: "1 Kings 6:1-38", note: "Solomon builds the First Temple" },
      { reference: "1 Kings 8:10-11", note: "God's glory fills the completed First Temple" },
      { reference: "2 Kings 25:8-9", note: "Babylon destroys the First Temple" },
      { reference: "Ezra 3:10-13", note: "The Second Temple's foundation laid; mixed weeping and joy" },
      { reference: "John 2:14-21", note: "Jesus cleanses Herod's Second Temple; speaks of 'the temple of his body'" },
      { reference: "Matthew 24:1-2", note: "Jesus predicts the Second Temple's destruction (fulfilled AD 70)" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Temple of Jerusalem", url: "https://www.britannica.com/topic/Temple-of-Jerusalem" },
      { label: "Bible Odyssey: The Jerusalem Temple", url: "https://www.bibleodyssey.org/places/related-articles/jerusalem-temple/" },
    ],
  },
  {
    id: "demons",
    name: "Demons",
    alternateNames: ["demon", "unclean spirit", "unclean spirits", "evil spirit", "evil spirits"],
    category: "concept",
    role: "Fallen Angels Opposed to God",
    summary:
      "Fallen angelic beings, led by Satan, who oppose God and afflict people through possession and temptation — repeatedly confronted, cast out, and defeated by Jesus and his apostles throughout the Gospels and Acts.",
    sections: [
      {
        heading: "What Demons Are",
        paragraphs: [
          "Scripture presents demons as fallen angels — spiritual beings originally created good who rebelled against God under Satan's leadership (see Jude 1:6's 'angels who didn't keep their first estate'). The Gospels most often call them 'unclean spirits' or simply demons, and consistently show them as real, personal, malevolent beings rather than a metaphor for illness or misfortune: they recognize Jesus's identity instantly and involuntarily ('I know you who you are: the Holy One of God!' Mark 1:24), they speak, they beg (Mark 5:10-12), and James notes flatly that even 'the demons... believe' God is one 'and shudder' (James 2:19) — correct theology without any of the trust or obedience that would make it saving faith.",
          "Paul describes the wider spiritual conflict demons represent in cosmic terms: 'our wrestling is not against flesh and blood, but against the principalities, against the powers, against the world's rulers of the darkness of this age, and against the spiritual forces of wickedness in the heavenly places' (Ephesians 6:12) — framing the church's struggle as ultimately spiritual, with demonic forces organized under Satan's authority rather than acting as isolated, random troublemakers.",
        ],
      },
      {
        heading: "Demons Confronted in the Gospels and Acts",
        paragraphs: [
          "Casting out demons is one of the most frequently recorded acts of Jesus's ministry, presented as clear evidence of his authority over the spiritual realm. His most dramatic exorcism involves a man possessed by a demon who identifies himself, 'My name is Legion, for we are many' — so many that, once cast out at their own request, they enter a herd of about two thousand pigs, which immediately rush into the sea (Mark 5:1-13). Jesus explicitly ties his exorcisms to the arrival of God's kingdom: 'if I by the Spirit of God cast out demons, then God's Kingdom has come upon you' (Matthew 12:28), and he delegates the same authority to his twelve apostles (Matthew 10:1) and, later, to seventy-two other disciples, who return rejoicing that 'even the demons are subject to us in your name' (Luke 10:17). Acts continues this pattern into the early church: Paul casts a divining spirit out of a slave girl in Philippi (Acts 16:16-18), while the itinerant Jewish exorcists known as the sons of Sceva find, to their harm, that invoking Jesus's name without genuine faith in him carries no such authority at all (Acts 19:13-16).",
        ],
      },
    ],
    verses: [
      { reference: "Mark 1:21-27", note: "Jesus casts an unclean spirit out of a man in the Capernaum synagogue" },
      { reference: "Mark 5:1-20", note: "The Legion of demons cast into a herd of pigs" },
      { reference: "Matthew 12:22-28", note: "Casting out demons as evidence God's Kingdom has come" },
      { reference: "Luke 10:17-20", note: "The seventy-two return rejoicing that demons are subject to them" },
      { reference: "Ephesians 6:12", note: "Paul frames the church's struggle as fundamentally spiritual" },
      { reference: "Acts 19:13-16", note: "The sons of Sceva attempt exorcism without genuine faith in Jesus" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Demon", url: "https://www.britannica.com/topic/demon-religion" },
      { label: "Got Questions: What does the Bible say about demons?", url: "https://www.gotquestions.org/demons-Bible.html" },
    ],
  },
  {
    id: "angels",
    name: "Angels",
    alternateNames: ["angel", "an angel", "the angel"],
    category: "concept",
    role: "God's Created Spiritual Messengers",
    summary:
      "Created spiritual beings who serve as God's messengers, worshipers, and agents of protection and judgment throughout Scripture — distinct from humans, and never to be worshiped themselves. Michael and Gabriel, the only two named more than once, each have their own entry.",
    sections: [
      {
        heading: "What Angels Are",
        paragraphs: [
          "The Bible presents angels as created spiritual beings, not humans who died and became angels and not a species that reproduces or evolved — Hebrews calls them 'ministering spirits, sent out to do service for the sake of those who will inherit salvation' (Hebrews 1:14). They appear throughout Scripture delivering messages (the word 'angel' itself comes from the Greek angelos, 'messenger'), protecting God's people, executing judgment, and worshiping God directly around his throne (Isaiah 6:1-3; Revelation 4:8). Scripture consistently depicts angels as genuinely powerful and often terrifying in appearance — the recurring 'do not be afraid' greeting angels give in Luke's nativity accounts (Luke 1:13, 30; 2:10) reflects how overwhelming their sudden appearance actually was, a sharp contrast with later art's gentle, harmless imagery.",
          "Angels are consistently shown as fellow servants of God, never as objects of worship themselves — when the apostle John falls down to worship an angel in Revelation, he is immediately corrected: 'You must not do that! I am a fellow bondservant with you... Worship God' (Revelation 22:8-9). Scripture also describes a group of angels who rebelled against God and 'didn't keep their first estate,' now reserved for judgment (Jude 1:6) — the origin of what later Christian theology calls demons (see Demons), led by Satan.",
        ],
      },
      {
        heading: "Angels at Key Moments in Scripture",
        paragraphs: [
          "Angels appear at pivotal turning points across both testaments: barring the way back to Eden (Genesis 3:24, where the specific angels are cherubim), wrestling with Jacob (Genesis 32:24-30), striking down Sennacherib's besieging army in a single night (2 Kings 19:35), announcing Jesus's birth to shepherds with a multitude 'praising God' (Luke 2:8-14), ministering to Jesus after his wilderness temptation (Matthew 4:11) and again in Gethsemane (Luke 22:43), rolling away the stone at the empty tomb and announcing the resurrection (Matthew 28:2-7), and releasing Peter from prison (Acts 12:6-11). Jesus himself teaches that angels 'in heaven always see the face of my Father' and are specially concerned with 'little ones' (Matthew 18:10), and that there is 'joy in the presence of the angels of God over one sinner who repents' (Luke 15:10) — angels shown throughout as deeply, personally invested in God's redemptive work, not detached cosmic machinery.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 32:24-30", note: "Jacob wrestles with a divine/angelic figure" },
      { reference: "Luke 2:8-14", note: "An angel and heavenly host announce Jesus's birth to shepherds" },
      { reference: "Matthew 28:2-7", note: "An angel rolls away the tomb's stone and announces the resurrection" },
      { reference: "Hebrews 1:14", note: "Angels as 'ministering spirits' serving those who will inherit salvation" },
      { reference: "Revelation 22:8-9", note: "An angel refuses John's worship: 'Worship God'" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Angel", url: "https://www.britannica.com/topic/angel-religion" },
      { label: "Got Questions: What does the Bible say about angels?", url: "https://www.gotquestions.org/angels-Bible.html" },
    ],
  },
  {
    id: "tabernacle",
    name: "Tabernacle",
    alternateNames: ["Tent of Meeting", "tent of meeting"],
    category: "concept",
    role: "Israel's Portable Wilderness Sanctuary",
    summary:
      "The portable tent-sanctuary God had Israel build in the wilderness so he could dwell among his people during their journey to the Promised Land — the pattern behind the later, fixed Temple, and a shape the New Testament reads as pointing forward to Christ and to God's ultimate dwelling with his people.",
    sections: [
      {
        heading: "Purpose and Construction",
        paragraphs: [
          "God gave Moses detailed instructions for the Tabernacle at Sinai, stating the purpose plainly at the outset: 'Let them make me a sanctuary, that I may dwell among them' (Exodus 25:8). Built from materials the people freely gave — gold, silver, bronze, fine linen, and acacia wood — it consisted of an outer courtyard with the bronze altar for sacrifice, and the tent itself divided into the Holy Place and, behind a veil, the Most Holy Place (see the Holy of Holies) containing the ark of the covenant. Its portability was the whole point: unlike a fixed temple, the Tabernacle could be dismantled, carried, and reassembled at each stop on Israel's wilderness journey (Numbers 4).",
          "When construction was complete, 'the cloud covered the Tent of Meeting, and the LORD's glory filled the tabernacle' so completely that 'Moses wasn't able to enter' (Exodus 40:34-35) — visible, tangible confirmation that God himself had come to dwell among the people exactly as promised.",
        ],
      },
      {
        heading: "From Tabernacle to Temple",
        paragraphs: [
          "The Tabernacle served as Israel's central sanctuary through the wilderness wandering, the conquest, and the period of the judges, eventually resting at Shiloh (Joshua 18:1; 1 Samuel 1:3). It was David's ambition, later fulfilled by his son Solomon, to replace this portable tent with a permanent, fixed temple in Jerusalem (2 Samuel 7:1-13; 1 Kings 6) — but the Temple's basic layout (courtyard, Holy Place, Most Holy Place) directly inherited the Tabernacle's own design, making it a grander, stationary version of the same pattern rather than something new.",
        ],
      },
      {
        heading: "The Tabernacle's New Testament Fulfillment",
        paragraphs: [
          "John's Gospel deliberately echoes the Tabernacle's language to describe the incarnation: 'The Word became flesh, and lived among us' (John 1:14) — the underlying Greek verb is built from the same root as 'tabernacle,' so that John is describing Jesus as God quite literally 'pitching his tent' among humanity, exactly as the Tabernacle once let God dwell among Israel in the wilderness. Hebrews extends the comparison at length, describing the earthly Tabernacle's furnishings (Hebrews 9:1-5) as 'a copy and shadow of the heavenly things' (Hebrews 8:5), superseded by Christ's ministry in 'a greater and more perfect tabernacle, not made with hands' (Hebrews 9:11). Revelation closes the whole biblical arc the Tabernacle began: in the new creation, 'God's dwelling is with people, and he will dwell with them' (Revelation 21:3) — the Tabernacle's original promise, finally and permanently fulfilled.",
        ],
      },
    ],
    verses: [
      { reference: "Exodus 25:8-9", note: "God's purpose: 'that I may dwell among them'" },
      { reference: "Exodus 40:34-35", note: "God's glory fills the completed tabernacle" },
      { reference: "1 Kings 6", note: "Solomon's fixed Temple inherits the Tabernacle's pattern" },
      { reference: "John 1:14", note: "'The Word became flesh, and lived [tabernacled] among us'" },
      { reference: "Hebrews 9:1-12", note: "The earthly tabernacle as a shadow of Christ's heavenly ministry" },
      { reference: "Revelation 21:3", note: "God's dwelling with his people, finally and permanently" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Tabernacle", url: "https://www.britannica.com/topic/tabernacle-Judaism" },
      { label: "Got Questions: What was the tabernacle?", url: "https://www.gotquestions.org/tabernacle.html" },
    ],
  },
  {
    id: "cherubim",
    name: "Cherubim",
    alternateNames: ["cherub"],
    category: "concept",
    role: "Angelic Guardians of God's Holiness",
    summary:
      "A distinct class of angelic being — never depicted in Scripture as the soft, winged infants of later art — stationed to guard access to God's holy presence, from the entrance to Eden to the mercy seat of the ark to Ezekiel's overwhelming vision of God's glory.",
    sections: [
      {
        heading: "Guardians, Not Cute Infants",
        paragraphs: [
          "Cherubim first appear immediately after Adam and Eve's expulsion from Eden, when God 'placed cherubim at the east of the garden of Eden, and a flaming sword which turned every way, to guard the way to the tree of life' (Genesis 3:24) — their first biblical role is explicitly guardianship, barring fallen humanity from what it no longer had a right to. Every subsequent biblical description of cherubim (composite, multi-faced, wheeled, wing-covered creatures — see Ezekiel below) confirms this is nothing like the small, chubby-cheeked 'cherub' of later Western art, a much later cultural development with no basis in the biblical text itself.",
        ],
      },
      {
        heading: "Cherubim on the Ark of the Covenant",
        paragraphs: [
          "God commanded two cherubim of hammered gold placed at either end of the ark's mercy seat, wings spread upward to cover it, faces turned toward one another and toward the mercy seat itself (Exodus 25:18-20). This was the specific spot God named as where he would meet with Moses and speak: 'from between the two cherubim' (Exodus 25:22) — cherubim here framing and marking out the very locus of God's presence and speech to his people, an image echoed in titles for God like 'he who sits above the cherubim' (1 Samuel 4:4; Psalm 99:1).",
        ],
      },
      {
        heading: "Ezekiel's Vision",
        paragraphs: [
          "Ezekiel's opening vision describes four composite 'living creatures' — each with four faces (man, lion, ox, eagle) and four wings, moving beneath a fiery, wheeled throne-chariot bearing the glory of God (Ezekiel 1:4-14) — later identified explicitly as cherubim: 'This is the living creature that I saw by the river Chebar... I knew that they were cherubim' (Ezekiel 10:15, 20). In a later vision, Ezekiel watches these same cherubim bear God's glory as it departs the corrupted Jerusalem temple (Ezekiel 10:1-19) — cherubim here marking the presence and, devastatingly, the departure of God's own glory from a temple no longer fit for it.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 3:24", note: "Cherubim guard the way back to the tree of life" },
      { reference: "Exodus 25:18-22", note: "Gold cherubim on the ark's mercy seat, where God speaks with Moses" },
      { reference: "Ezekiel 1:4-14", note: "Four-faced living creatures beneath God's glory-throne" },
      { reference: "Ezekiel 10:1-20", note: "Identified as cherubim; bear God's glory departing the temple" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Cherub", url: "https://www.britannica.com/topic/cherub" },
      { label: "Got Questions: What are cherubim?", url: "https://www.gotquestions.org/cherubim.html" },
    ],
  },
  {
    id: "holy-of-holies",
    name: "Holy of Holies",
    alternateNames: ["the most holy place", "Most Holy Place"],
    category: "concept",
    role: "The Innermost Sanctuary",
    summary:
      "The innermost, most sacred chamber of the Tabernacle and later the Temple, housing the ark of the covenant and entered by only the high priest, only once a year — until the veil guarding it tore in two at the moment of Jesus's death.",
    sections: [
      {
        heading: "The Holy of Holies in the Tabernacle and Temple",
        paragraphs: [
          "God's instructions for the Tabernacle specified a veil separating two chambers: the outer Holy Place, and behind a second, thicker veil, 'the most holy place' — housing the ark of the covenant with its golden mercy seat (Exodus 26:33-34). Solomon's Temple preserved the same basic arrangement on a grander scale, building an inner sanctuary, 'the most holy place,' behind cedar walls twenty cubits deep (1 Kings 6:16). Access was severely restricted: only the high priest could enter, and only once a year, on the Day of Atonement, bringing sacrificial blood to make atonement for the nation's sin (Leviticus 16:2, 34) — a vivid, repeated picture of just how serious a barrier sin created between a holy God and his people.",
        ],
      },
      {
        heading: "The Torn Veil",
        paragraphs: [
          "At the moment Jesus died on the cross, all three Synoptic Gospels record that 'the veil of the temple was torn in two from the top to the bottom' (Matthew 27:51; Mark 15:38; Luke 23:45) — torn top to bottom, not bottom to top, a detail long read as signaling that this was God's own act, opening the way from his side rather than any human effort tearing through from the outside. The barrier that had stood, in one form or another, since the Tabernacle's construction centuries earlier, was removed at the exact moment of Christ's sacrifice.",
        ],
      },
      {
        heading: "Hebrews' Interpretation",
        paragraphs: [
          "Hebrews devotes sustained attention to the Holy of Holies as a physical picture of a greater spiritual reality. It describes the earthly tabernacle's two chambers directly, naming the inner one 'the Holy of Holies' (Hebrews 9:2-3), and argues that the Holy Spirit was 'indicating... that the way into the Holy Place wasn't yet revealed while the first tabernacle was still standing' (Hebrews 9:8) — the restricted, repeated, blood-dependent access under the old system was itself a signpost pointing forward, not the final arrangement. Christ, by contrast, 'entered in once for all into the Holy Place... through his own blood, having obtained eternal redemption' (Hebrews 9:12), entering not an earthly copy but 'heaven itself, now to appear in the presence of God for us' (Hebrews 9:24). Because of this, believers are told they now have 'boldness to enter into the holy place by the blood of Jesus,' through 'a new and living way' Christ opened 'through the veil, that is to say, his flesh' (Hebrews 10:19-20) — the torn temple veil and Christ's own crucified body drawn together as the same opened door into God's presence.",
        ],
      },
    ],
    verses: [
      { reference: "Exodus 26:33-34", note: "The veil separates the Holy Place from the most holy place" },
      { reference: "Leviticus 16:2, 34", note: "Only the high priest enters, only once a year, with blood" },
      { reference: "1 Kings 6:16", note: "Solomon's Temple's inner sanctuary" },
      { reference: "Matthew 27:51", note: "The temple veil torn in two at Jesus's death" },
      { reference: "Hebrews 9:1-12", note: "The Holy of Holies described; Christ's greater, once-for-all entry" },
      { reference: "Hebrews 10:19-20", note: "Believers' new access 'through the veil, that is to say, his flesh'" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Holy of Holies", url: "https://www.britannica.com/topic/Holy-of-Holies" },
      { label: "Got Questions: What was the Holy of Holies?", url: "https://www.gotquestions.org/Holy-of-Holies.html" },
    ],
  },
  {
    id: "gentiles",
    name: "Gentiles",
    alternateNames: ["Gentile"],
    category: "people-group",
    role: "All Non-Jewish Peoples",
    summary:
      "The biblical term for every people group outside ethnic Israel — a barrier the Old Testament anticipated God would one day remove and the New Testament records being torn down through Christ, opening the gospel to the whole world.",
    sections: [
      {
        heading: "Israel and the Nations in the Old Testament",
        paragraphs: [
          "'Gentile' translates Hebrew and Greek words simply meaning 'nations' — everyone who is not part of Israel, God's covenant people. The Old Testament holds two threads together about them: real separation (Israel was called out from the nations and warned against adopting their idolatry) and a real, standing promise that blessing would eventually reach them too. God's original call to Abram already contained this — 'in you all the families of the earth will be blessed' (Genesis 12:3) — and the prophets repeatedly envisioned a day when the nations would come to worship the God of Israel (Isaiah 49:6; 60:3), even while most of the Old Testament's own narrative focuses on Israel alone.",
        ],
      },
      {
        heading: "The Gospel Opens to the Gentiles",
        paragraphs: [
          "Acts records this promise beginning to unfold as a genuine turning point for the early, entirely Jewish church. Peter's vision and subsequent visit to Cornelius, a Roman centurion, results in Gentiles receiving the Holy Spirit the same way Jewish believers had at Pentecost — astonishing 'those of the circumcision who believed,' since 'the gift of the Holy Spirit was also poured out on the Gentiles' (Acts 10:44-45). This event became the case study the Jerusalem church had to reckon with: was God really including Gentiles as full, equal members of his people, without first requiring them to become Jewish through circumcision and law-keeping?",
          "The Jerusalem Council (Acts 15) settled the question decisively. After hearing Peter, Paul, and Barnabas testify to God's work among Gentile believers, James cites the prophets' own promise that 'all the Gentiles who are called by my name' would seek the Lord (Acts 15:17, quoting Amos 9:11-12), and the council concludes 'we don't trouble those from among the Gentiles who turn to God' with the burden of the full Mosaic law (Acts 15:19). Paul's letter to the Ephesians describes the result theologically: Gentile believers, once 'far off,' 'strangers from the covenants of promise,' are now brought near by Christ's blood, who 'made both one, and broke down the middle wall of separation' — abolishing in his own flesh the hostility between Jew and Gentile, creating 'one new man' out of the two (Ephesians 2:11-16).",
        ],
      },
      {
        heading: "Paul, Apostle to the Gentiles",
        paragraphs: [
          "Paul repeatedly identifies his own calling specifically as apostleship 'to the Gentiles' (Romans 11:13), and Romans 9-11 wrestles at length with how Gentile inclusion relates to Israel's own place in God's plan: Israel's partial, temporary hardening became the occasion for 'salvation' to reach the Gentiles (Romans 11:11), while Paul insists this is not God's final or complete rejection of Israel, anticipating that 'all Israel will be saved' in God's own timing (Romans 11:25-26). Paul's missionary strategy of going 'to the Jew first, and also to the Greek' in city after city (Romans 1:16) reflects this same conviction: the gospel is for Gentiles too, without in any sense abandoning God's ongoing purposes for the Jewish people.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 12:3", note: "Abram's call promises blessing to 'all the families of the earth'" },
      { reference: "Isaiah 49:6", note: "The Servant to be 'a light to the Gentiles'" },
      { reference: "Acts 10:44-45", note: "Cornelius's household receives the Spirit; Jewish believers astonished" },
      { reference: "Acts 15:1-29", note: "The Jerusalem Council: Gentile believers not bound by the law of Moses" },
      { reference: "Ephesians 2:11-16", note: "Christ breaks down the 'middle wall of separation' between Jew and Gentile" },
      { reference: "Romans 11:11-26", note: "Gentile inclusion and Israel's place in God's ongoing plan" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Gentile", url: "https://www.britannica.com/topic/Gentile" },
      { label: "Got Questions: Who are the Gentiles?", url: "https://www.gotquestions.org/Gentiles-Bible.html" },
    ],
  },
  {
    id: "new-covenant",
    name: "New Covenant",
    alternateNames: ["new covenant"],
    category: "doctrine",
    role: "Jeremiah's Prophesied Covenant, Instituted by Christ",
    summary:
      "A covenant God promised through Jeremiah centuries before Christ, in which he would write his law on his people's hearts and forgive their sin completely — which Jesus declared instituted in his own blood at the Last Supper, and which Hebrews presents as replacing the old Mosaic covenant entirely.",
    sections: [
      {
        heading: "Jeremiah's Prophecy",
        paragraphs: [
          "Writing as Judah's kingdom collapsed toward exile, Jeremiah delivered one of the Old Testament's most striking promises of hope: 'the days come,' says the LORD, 'that I will make a new covenant with the house of Israel and with the house of Judah' — one 'not... according to the covenant that I made with their fathers' at the Exodus, which Israel broke despite God's faithfulness to it. This new covenant would be different in kind, not just content: God would 'put my law in their inward parts, and… write it in their heart,' rather than on stone tablets, and would 'forgive their iniquity' and 'remember their sin no more' (Jeremiah 31:31-34). Where the old covenant depended on external law and ongoing sacrifice, this one promised internal transformation and permanent forgiveness.",
        ],
      },
      {
        heading: "Instituted by Christ",
        paragraphs: [
          "At his final Passover meal with the Twelve, Jesus took the cup and declared, 'This cup is the new covenant in my blood, which is poured out for you' (Luke 22:20) — directly claiming Jeremiah's promised covenant as his own, sealed not with an animal's blood as at Sinai (Exodus 24:8) but with his own. Paul repeats the same words in his account of the Lord's Supper, instructing the church to keep doing this 'in memory of me' (1 Corinthians 11:25) — meaning the church's ongoing practice of communion is itself a continual proclamation that the new covenant Jeremiah foresaw has arrived in Christ.",
        ],
      },
      {
        heading: "Hebrews' Extended Argument",
        paragraphs: [
          "The book of Hebrews quotes Jeremiah's prophecy at length (Hebrews 8:8-12) and draws out its full implication: 'In that he says, \"A new covenant,\" he has made the first old. But that which is becoming old and grows aged is near to vanishing away' (Hebrews 8:13) — the very existence of a promised new covenant means the old Mosaic covenant, with its repeated animal sacrifices, was always meant to be temporary. Hebrews goes on to call Jesus 'the mediator of a new covenant,' explaining that his death provides redemption from transgressions committed even 'under the first covenant' (Hebrews 9:15) — his one sacrifice retroactively covering what the old system's sacrifices could only ever symbolically, repeatedly gesture toward, never actually remove (Hebrews 10:1-4, 10-14).",
        ],
      },
    ],
    verses: [
      { reference: "Jeremiah 31:31-34", note: "The new covenant promised centuries before Christ" },
      { reference: "Luke 22:20", note: "Jesus institutes it at the Last Supper" },
      { reference: "1 Corinthians 11:25", note: "Paul's account of the Lord's Supper" },
      { reference: "Hebrews 8:8-13", note: "Jeremiah's prophecy quoted; the old covenant declared obsolete" },
      { reference: "Hebrews 9:15", note: "Christ as mediator of the new covenant" },
    ],
    sources: [
      { label: "Got Questions: What is the New Covenant?", url: "https://www.gotquestions.org/new-covenant.html" },
      { label: "Encyclopaedia Britannica: Covenant (religion)", url: "https://www.britannica.com/topic/covenant-religion" },
    ],
  },
  {
    id: "torah",
    name: "Torah",
    // WEB (this app's default translation) never uses the transliterated word "Torah" itself — it
    // renders the Hebrew term as "law." Bare "law"/"the law" is deliberately NOT linked here: it's
    // an extremely common word used dozens of ways that aren't the Mosaic Torah (Roman law, "the law
    // of sin," abstract legal argument in Romans/Galatians, etc.), so linking it bare would mislink
    // far more often than it would help — the same "least wrong move" reasoning as BOOK_NAME_ALLOWLIST
    // in verseAnnotations.ts. These specific multi-word phrases are distinctive enough to link safely.
    alternateNames: ["the Law of Moses", "the law of Moses", "the Law and the Prophets", "the law and the prophets"],
    category: "concept",
    role: "The Five Books of Moses",
    summary:
      "The five books of Moses — Genesis through Deuteronomy — given to Israel at Sinai as God's covenant instruction, and which Jesus said he came not to destroy but to fulfill.",
    sections: [
      {
        heading: "What the Torah Is",
        paragraphs: [
          "'Torah' (Hebrew for 'instruction' or 'teaching,' commonly translated 'law' in English Bibles) refers most precisely to the five books of Moses — Genesis, Exodus, Leviticus, Numbers, and Deuteronomy — and by extension to the covenant instruction God gave Israel through Moses at Mount Sinai, recorded across those books. It is far broader than a list of rules: alongside legal instruction (like the Ten Commandments, Exodus 20:1-17) it contains Israel's origin story, its covenant history with God, and extensive instructions for worship, holiness, and communal life. Jewish tradition and the New Testament alike often refer to the whole Hebrew Scriptures shorthand as 'the Law and the Prophets' (Matthew 7:12; 22:40; Luke 24:44), naming the Torah as the first and foundational section of a larger, three-part canon.",
        ],
      },
      {
        heading: "The Torah in Jesus's Teaching",
        paragraphs: [
          "Jesus addresses the Torah's ongoing authority directly in the Sermon on the Mount: 'Don't think that I came to destroy the law or the prophets. I didn't come to destroy, but to fulfill' (Matthew 5:17) — followed by teaching that repeatedly intensifies the law's demands ('You have heard... but I tell you,' Matthew 5:21-48) rather than setting them aside. He summarized 'the whole law and the prophets' as depending on loving God and loving one's neighbor (Matthew 22:37-40), and Luke records the risen Jesus explaining to his disciples 'that all things which are written in the law of Moses, the prophets, and the psalms' concerning himself had to be fulfilled (Luke 24:44) — reading the entire Torah as ultimately pointing toward himself.",
          "As an infant, Jesus himself was presented at the temple 'according to the law of Moses' (Luke 2:22-24), and throughout his ministry he observed Jewish practice while repeatedly clashing with the religious leaders' additional oral traditions built up around the written Torah, which he distinguished sharply from the law itself (Mark 7:8-13).",
        ],
      },
      {
        heading: "The Torah and the New Testament Church",
        paragraphs: [
          "The relationship between the Torah and Gentile believers became the early church's first major theological controversy. Paul, a former Pharisee trained rigorously in the law, argues extensively in Romans and Galatians that no one is justified before God by keeping the law's works, but by faith in Christ — the law itself, in his reading, was never meant as a path to righteousness but rather to reveal sin and point toward the need for a savior (Romans 3:20; Galatians 3:19-24). Acts 15's Jerusalem Council took up the practical version of this question directly — whether Gentile converts needed to be circumcised and keep the law of Moses to be saved — and concluded they did not (Acts 15:1-29), a foundational decision for the gospel's spread beyond Judaism. Protestant tradition has generally read the Torah's civil and ceremonial commands (sacrifices, dietary laws, and the like) as fulfilled and set aside in Christ, while its moral commands remain a true and abiding reflection of God's character.",
        ],
      },
    ],
    verses: [
      { reference: "Exodus 20:1-17", note: "The Ten Commandments given at Sinai" },
      { reference: "Matthew 5:17-20", note: "Jesus: 'I didn't come to destroy, but to fulfill'" },
      { reference: "Luke 24:44", note: "The risen Jesus explains the Law, Prophets, and Psalms point to him" },
      { reference: "Romans 3:20", note: "\"By the works of the law, no flesh will be justified\"" },
      { reference: "Galatians 3:19-24", note: "The law as a 'tutor' pointing toward Christ" },
      { reference: "Acts 15:1-29", note: "The Jerusalem Council: Gentile believers not required to keep the law of Moses" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Torah", url: "https://www.britannica.com/topic/Torah" },
      { label: "Got Questions: What is the Torah?", url: "https://www.gotquestions.org/what-is-the-Torah.html" },
    ],
  },
  {
    id: "day-of-preparation",
    name: "Day of Preparation",
    alternateNames: ["Preparation Day", "the Preparation"],
    category: "concept",
    role: "The Day Before the Sabbath",
    summary:
      "The ordinary Jewish term for the day before the Sabbath (or, in John's usage, before Passover itself), spent readying food and household tasks since none could be done once the Sabbath began at sundown — the day, all four Gospels note, on which Jesus was crucified.",
    sections: [
      {
        heading: "What the Day of Preparation Was",
        paragraphs: [
          "Because Jewish law forbade nearly all work once the Sabbath began at sundown Friday, every household needed a day to finish cooking, draw water, and settle whatever chores the coming rest day would make impossible — Friday itself, known simply as 'the Preparation' or 'the Preparation Day.' Mark defines the term directly for his non-Jewish readers: 'it was the Preparation Day, that is, the day before the Sabbath' (Mark 15:42). Luke uses the same term just as plainly: 'It was the day of the Preparation, and the Sabbath was drawing near' (Luke 23:54).",
        ],
      },
      {
        heading: "The Day of Preparation and Jesus's Crucifixion",
        paragraphs: [
          "All four Gospels place Jesus's crucifixion and burial on this day, which is precisely why his body had to be taken down and buried in haste before sundown — Joseph of Arimathea's rock-cut tomb was chosen largely 'because of the Jews' Preparation Day (for the tomb was near at hand)' (John 19:42), not because it was necessarily his intended resting place. John notes the urgency drove the request to break the crucified men's legs (hastening death) so the bodies wouldn't remain exposed 'on the cross on the Sabbath (for that Sabbath was a special one)' — a double solemnity, since that particular Sabbath coincided with a Passover-related festival day (John 19:31). By the time the soldiers reached Jesus he was already dead, so his legs were left unbroken, which John connects to the Passover lamb's own unbroken bones (John 19:33-36; compare Exodus 12:46).",
          "John's Gospel adds one further wrinkle worth noting carefully: he calls the day of the trial itself 'the Preparation Day of the Passover' (John 19:14), which some readers take as evidence John dates the crucifixion to the day before Passover began (differing from the Synoptic Gospels' apparent placement of the Last Supper as the Passover meal itself). Various harmonizations have been proposed — differing calendars in use among different Jewish groups at the time, or 'Preparation Day of the Passover' meaning simply 'the Friday during Passover week' rather than 'the day before Passover starts' — and the question remains genuinely debated among careful readers rather than a settled contradiction.",
        ],
      },
    ],
    verses: [
      { reference: "Mark 15:42", note: "Defines the term: 'the day before the Sabbath'" },
      { reference: "Luke 23:54", note: "The Sabbath drawing near as Jesus is buried" },
      { reference: "John 19:14", note: "'The Preparation Day of the Passover' — the trial before Pilate" },
      { reference: "John 19:31-37", note: "Urgency to remove the bodies before the Sabbath; Jesus's legs left unbroken" },
      { reference: "John 19:42", note: "Jesus laid in a nearby tomb because of the Preparation Day" },
    ],
    sources: [
      { label: "Bible Odyssey: Passover and the Date of Jesus's Death", url: "https://www.bibleodyssey.org/tools/ask-a-scholar/passover-and-the-date-of-jesus-death/" },
    ],
  },
  {
    id: "synagogue",
    name: "Synagogue",
    alternateNames: ["synagogues"],
    category: "practice",
    role: "Jewish House of Worship and Assembly",
    summary:
      "The local Jewish assembly hall for weekly Scripture reading, prayer, and teaching that developed after the Babylonian exile, and which became the regular starting point for Jesus's own ministry and Paul's missionary preaching in city after city.",
    sections: [
      {
        heading: "Origins and Purpose",
        paragraphs: [
          "The synagogue isn't commanded or described in the Old Testament's law itself — it emerged sometime during or after the Babylonian exile (6th century BC onward), when Jewish communities scattered far from a now-destroyed Jerusalem temple needed a local place to gather, pray, and hear Scripture read and explained without any altar or sacrifice, which the Torah restricted to the one central temple. By Jesus's day, synagogues existed in essentially every town with a Jewish population, in Galilee and Judea as well as throughout the wider Mediterranean world (the 'Dispersion'), giving Judaism a portable, local institution the temple itself could never be.",
          "A typical synagogue gathering centered on reading a passage from the Law and the Prophets, followed by a teaching or exposition of the text (as in Acts 13:15's 'if you have any word of exhortation for the people, say on') — the same basic pattern Jesus follows in Luke 4 and the same pattern Paul repeatedly uses as his first stop in a new city.",
        ],
      },
      {
        heading: "The Synagogue in Jesus's Ministry",
        paragraphs: [
          "The synagogue was Jesus's regular platform. Luke summarizes his early Galilean ministry simply: 'He taught in their synagogues, being glorified by all' (Luke 4:15), and Matthew notes he went 'about in all Galilee, teaching in their synagogues' as a matter of course (Matthew 4:23). His most detailed synagogue scene comes at his hometown of Nazareth, where he stood to read from Isaiah and declared the prophecy fulfilled 'in your hearing' (Luke 4:16-21) — a claim that turned the crowd's admiration into fury by the end of the same passage (Luke 4:28-30). Mark records Jesus teaching 'with authority, and not as the scribes' in the Capernaum synagogue, where he also cast an unclean spirit out of a man in the middle of the service (Mark 1:21-27) — the synagogue setting for one of his most public early miracles.",
        ],
      },
      {
        heading: "The Synagogue in the Early Church's Spread",
        paragraphs: [
          "Acts shows Paul following the same pattern city after city: arriving, finding the local synagogue, and reasoning from the Scriptures there first before turning to Gentiles (Acts 13:5, 14; 17:1-2, 10, 17; 18:4, 19). This wasn't incidental — the synagogue gave Paul an audience already familiar with the Hebrew Scriptures and the hope of a coming Messiah, the natural starting point for arguing that Jesus fulfilled it. Results were mixed: at Pisidian Antioch, many Jews and 'devout proselytes' (Gentile converts to Judaism attached to the synagogue) followed Paul and Barnabas, but opposition from other synagogue leaders soon followed too (Acts 13:42-45). James's letter, written to Jewish Christians, even uses 'your synagogue' as the ordinary word for a Christian gathering (James 2:2), a reminder of how thoroughly the early Jewish church's meeting life still used the same word and shape as the institution it grew out of.",
        ],
      },
    ],
    verses: [
      { reference: "Luke 4:16-21", note: "Jesus reads Isaiah and declares it fulfilled in the Nazareth synagogue" },
      { reference: "Mark 1:21-27", note: "Teaches with authority and casts out an unclean spirit in Capernaum's synagogue" },
      { reference: "Acts 13:14-15", note: "Paul and Barnabas invited to speak after the Scripture reading" },
      { reference: "Acts 13:42-45", note: "Mixed response to Paul's preaching in the Pisidian Antioch synagogue" },
      { reference: "James 2:2", note: "'Your synagogue' used for the early Jewish-Christian assembly" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Synagogue", url: "https://www.britannica.com/topic/synagogue" },
      { label: "Bible Odyssey: Synagogues in the New Testament", url: "https://www.bibleodyssey.org/articles/synagogues-in-the-new-testament/" },
    ],
  },
  {
    id: "casting-lots",
    name: "Casting Lots",
    alternateNames: ["cast lots", "the lot"],
    category: "practice",
    role: "Method of Discerning God's Will",
    summary:
      "The ancient practice of throwing marked objects (likely stones or sticks) to make a decision, used throughout Scripture on the conviction that the outcome, though it looked like chance, was actually directed by God — most memorably when Roman soldiers cast lots for Jesus's clothing at the cross.",
    sections: [
      {
        heading: "Casting Lots in the Old Testament",
        paragraphs: [
          "Israel used lots for decisions considered too important, or too liable to human favoritism, to leave to ordinary judgment. On the Day of Atonement, Aaron cast lots over two goats — one 'for the LORD,' sacrificed as a sin offering, and the other the scapegoat sent into the wilderness bearing the people's sin (Leviticus 16:8-10) — letting the lot itself, not the priest's preference, decide which goat played which role. When Israel divided the Promised Land, Joshua 'cast lots for them in Shiloh before the LORD,' assigning each tribe's territory this way rather than by negotiation or seniority (Joshua 18:6-10). Proverbs states the underlying conviction plainly: 'The lot is cast into the lap, but its every decision is from the LORD' (Proverbs 16:33) — what looked like chance was, in Israel's own understanding, God's own hidden direction.",
          "The practice wasn't unique to Israel — the pagan sailors on Jonah's ship also cast lots to identify who had brought disaster on their voyage, and the lot correctly fell on Jonah (Jonah 1:7), showing the same basic mechanism recognized even outside Israel's faith, though Scripture credits the true God, not chance, with the actual result.",
        ],
      },
      {
        heading: "Casting Lots at the Cross",
        paragraphs: [
          "All four Gospels record that the Roman soldiers who crucified Jesus 'divided his clothing among them, casting lots' for at least one piece (Matthew 27:35; Mark 15:24; Luke 23:34; John 19:23-24) — an ordinary bit of soldiers' business, dividing up a condemned man's few possessions, that John explicitly ties to prophecy: 'that the Scripture might be fulfilled, which says, \"They divided my garments among them. They cast lots for my clothing\"' (John 19:24, quoting Psalm 22:18). Psalm 22 was written centuries before crucifixion existed as a Roman practice, yet describes both the piercing of hands and feet (Psalm 22:16) and this exact detail of soldiers gambling over a dying man's clothes — read by the New Testament as a striking advance confirmation that this suffering king was the one the psalm anticipated.",
        ],
      },
      {
        heading: "Casting Lots in the Early Church",
        paragraphs: [
          "After Judas's betrayal and death, the remaining apostles wanted to restore the Twelve's full number before Pentecost. Having narrowed the field to two qualified candidates by prayer, 'they drew lots for them, and the lot fell on Matthias, and he was counted with the eleven apostles' (Acts 1:26) — the last recorded instance of casting lots in Scripture, and notably the last time the church is shown using this Old Testament-style method to discern God's choice; after Pentecost and the coming of the Spirit, the book of Acts moves instead toward decisions made through prayer, apostolic authority, and the Spirit's leading (as in Acts 13:2 and Acts 15:28) rather than lots.",
        ],
      },
    ],
    verses: [
      { reference: "Leviticus 16:8-10", note: "Lots cast over the two Day of Atonement goats" },
      { reference: "Joshua 18:6-10", note: "The Promised Land divided among the tribes by lot" },
      { reference: "Proverbs 16:33", note: "'The lot is cast into the lap, but its every decision is from the LORD'" },
      { reference: "Psalm 22:18", note: "Prophesied centuries before crucifixion existed" },
      { reference: "John 19:23-24", note: "Soldiers cast lots for Jesus's clothing, fulfilling Psalm 22:18" },
      { reference: "Acts 1:26", note: "Matthias chosen by lot to replace Judas among the Twelve" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Divination (casting lots)", url: "https://www.britannica.com/topic/divination" },
      { label: "Got Questions: What does the Bible say about casting lots?", url: "https://www.gotquestions.org/casting-lots.html" },
    ],
  },
  {
    id: "the-trinity",
    name: "The Trinity",
    alternateNames: ["Trinity", "Trinitarian"],
    category: "doctrine",
    role: "Core Christian Doctrine of God",
    summary:
      "The historic Christian teaching that the one true God eternally exists as three distinct persons — the Father, the Son, and the Holy Spirit — each fully God, not three gods and not merely three roles or masks worn by one person.",
    sections: [
      {
        heading: "What the Doctrine Affirms",
        paragraphs: [
          "The word 'Trinity' never appears in Scripture — it's a theological term the church settled on to summarize what Scripture teaches across its whole sweep, not a single verse's own vocabulary. Stated carefully, the doctrine holds three things together: there is only one God (Deuteronomy 6:4, 'the LORD is one'); the Father, the Son, and the Holy Spirit are each fully and truly God; and yet the Father, Son, and Spirit are genuinely distinct persons, not simply the same person appearing under three different names or at three different times. Protestant confessions have historically insisted all three claims must be held at once — dropping any one of them lands in a historic error the church has long rejected: tritheism (three separate gods) if you deny the unity, or modalism (one person wearing three masks) if you deny the real distinction of persons.",
        ],
      },
      {
        heading: "What the Old Testament Alludes To",
        paragraphs: [
          "The Old Testament is emphatically monotheistic and does not teach the Trinity outright, but Christians have long read it as containing real hints later revelation clarifies. Genesis opens with plural language for God's own decision — 'Let us make man in our image, after our likeness' (Genesis 1:26) — while insisting immediately after that it is the one God who does the creating (Genesis 1:27). Genesis 1:1-2 itself pairs 'God' creating the heavens and earth with 'God's Spirit... hovering over the surface of the waters,' distinguishing God and his Spirit within the same creation account without explaining how. Isaiah's prophecies repeatedly distinguish 'the Lord GOD' who sends both 'me' (a messianic speaker) and 'his Spirit' in the same verse (Isaiah 48:16), and later Christian readers have long heard messianic overtones in passages like Psalm 110:1, where 'the LORD' addresses David's own 'Lord' as a distinct figure sharing in divine authority. None of this amounts to an explicit doctrine of the Trinity in the Old Testament itself — Israel's own emphasis remained squarely on God's oneness against the polytheism surrounding it — but Christians read these texts as the seedbed the New Testament's fuller revelation grows out of, not a contradiction of it.",
        ],
      },
      {
        heading: "What the New Testament Reveals",
        paragraphs: [
          "The New Testament is where the doctrine's real weight sits, though even here it's shown more often than formally defined in one sentence. At Jesus's baptism, all three persons appear together in a single scene: the Son is baptized, the Spirit descends on him 'as a dove,' and the Father's voice from heaven declares him his beloved Son (Matthew 3:16-17). John's Gospel opens by identifying Jesus as 'the Word' who 'was with God, and the Word was God' (John 1:1) — distinct from the Father ('with God') yet fully divine ('was God') in the same breath. Jesus promises to send 'another Counselor' after he departs — the Spirit of truth, distinct from himself and from the Father who sends him at Jesus's request (John 14:16-17, 26). Paul closes 2 Corinthians with a three-part benediction naming all three together as a single source of blessing: 'The grace of the Lord Jesus Christ, God's love, and the fellowship of the Holy Spirit, be with you all' (2 Corinthians 13:14). And Jesus's own closing instruction to the church names all three under one singular 'name': 'baptizing them in the name of the Father and of the Son and of the Holy Spirit' (Matthew 28:19) — one name, three persons.",
        ],
      },
      {
        heading: "The Doctrine's Historical Development",
        paragraphs: [
          "The early church did not invent the Trinity at a council; it worked out, over several centuries of controversy, the most faithful way to hold together everything Scripture already said about the Father, Son, and Spirit without collapsing into tritheism or modalism. The most consequential early dispute was with Arianism, the view (associated with the presbyter Arius, early 4th century) that the Son was God's first and greatest creation — divine in an honorary sense, but not eternally, fully God as the Father is. The Council of Nicaea (AD 325) rejected this, affirming the Son as 'begotten, not made... of one substance (homoousios) with the Father' — the origin of the Nicene Creed's core Christological language still recited in many churches today.",
          "Nicaea's creed said comparatively little about the Holy Spirit's full deity, a question the Council of Constantinople (AD 381) took up directly, expanding the creed to confess the Spirit as 'the Lord and Giver of Life... who together with the Father and the Son is worshiped and glorified.' Together, these two councils gave the church the developed Nicene Creed's Trinitarian shape: one God in three co-equal, co-eternal persons — not a new doctrine invented in the 4th century, but the church's most careful, battle-tested articulation of what the apostolic writings had already presented in narrative and doxology (like the Matthew 28:19 and 2 Corinthians 13:14 texts above) well before anyone needed a single technical word for it.",
        ],
      },
    ],
    verses: [
      { reference: "Deuteronomy 6:4", note: "The Shema: 'the LORD is one'" },
      { reference: "Genesis 1:1-2, 26-27", note: "God, God's Spirit, and plural self-address in creation" },
      { reference: "Matthew 3:16-17", note: "Father, Son, and Spirit together at Jesus's baptism" },
      { reference: "Matthew 28:19", note: "Baptism 'in the name of the Father and of the Son and of the Holy Spirit'" },
      { reference: "John 1:1", note: "The Word both 'with God' and 'was God'" },
      { reference: "John 14:16-17, 26", note: "Jesus promises the Father will send the Spirit at his request" },
      { reference: "2 Corinthians 13:14", note: "Three-part benediction naming Christ, God, and the Spirit together" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Trinity", url: "https://www.britannica.com/topic/Trinity-Christianity" },
      { label: "Got Questions: What is the Trinity?", url: "https://www.gotquestions.org/Trinity-Bible.html" },
      { label: "Nicene Creed (325/381) — full text", url: "https://www.ccel.org/creeds/nicene.creed.html" },
    ],
  },
  {
    id: "passover",
    name: "Passover",
    alternateNames: ["the Passover"],
    category: "practice",
    role: "Old Testament Feast, Fulfilled in Christ",
    summary:
      "The annual Jewish feast commemorating God's deliverance of Israel from slavery in Egypt, when the blood of a lamb on the doorposts caused the LORD to 'pass over' Israelite homes — and which the New Testament presents as fulfilled in Christ, the true Passover Lamb.",
    sections: [
      {
        heading: "The First Passover in Egypt",
        paragraphs: [
          "The Passover was instituted on the night of Israel's final, decisive plague in Egypt. God instructed Moses and Aaron that each household was to take a year-old male lamb without defect, keep it until the fourteenth day of the month, then kill it at twilight and put some of its blood on the two doorposts and lintel of the house (Exodus 12:1-7). The meat was to be roasted with fire and eaten that same night with unleavened bread and bitter herbs, the household dressed and ready to travel — 'in haste,' since deliverance was coming immediately (Exodus 12:8-11).",
          "That night the LORD passed through Egypt and struck down every firstborn, from Pharaoh's own son to the firstborn of livestock — judgment on 'all the gods of Egypt' (Exodus 12:12). But wherever he saw the blood on the doorframe, he passed over that house and no plague touched it (Exodus 12:13). This is the origin of the feast's name: God himself, not the Israelites' own merit, made the distinction between judgment and deliverance, and the sign of that deliverance was the blood of a substitute already shed.",
          "God commanded that the day be kept as a permanent memorial, 'a feast to the LORD... throughout your generations... by an ordinance forever' (Exodus 12:14, 17), and it became the first of Israel's great annual pilgrimage feasts, still combined in Jewish practice with the week-long Feast of Unleavened Bread that followed immediately after it.",
        ],
      },
      {
        heading: "Observance Through the Old Testament",
        paragraphs: [
          "Passover recurs across Israel's history as a marker of covenant faithfulness (or its absence). Israel kept it at Sinai a year after the Exodus (Numbers 9:1-5), and again upon first entering the Promised Land at Gilgal, where the manna stopped the very next day (Joshua 5:10-12) — the wilderness provision ending exactly as the land's own produce began. Centuries later, King Hezekiah's Passover (2 Chronicles 30) and King Josiah's Passover (2 Kings 23:21-23; 2 Chronicles 35:1-19) both mark major religious reforms, each explicitly noted as unlike anything kept 'since the days of Samuel' or 'since the days of the judges' — a sign of how far Israel's worship had drifted, and how central Passover was meant to remain to national identity.",
        ],
      },
      {
        heading: "Fulfillment in Jesus Christ",
        paragraphs: [
          "The Gospels place Jesus's death at Passover deliberately. His final meal with his disciples was itself a Passover meal (Luke 22:7-15), during which he took the bread and cup and reinterpreted them around his own body and blood, given 'for you' — instituting what the church now keeps as the Lord's Supper directly out of the Passover meal's own elements (Luke 22:19-20). John's Gospel underscores the connection further: Jesus is crucified on the very day the Passover lambs were being slaughtered for that evening's meal, and John notes that none of his bones were broken (John 19:31-36) — fulfilling the instruction that the Passover lamb's bones must not be broken (Exodus 12:46). John the Baptist had already pointed toward this at the very start of Jesus's ministry, calling him 'the Lamb of God, who takes away the sin of the world' (John 1:29).",
          "Paul makes the identification explicit: 'Christ, our Passover, has been sacrificed in our place' (1 Corinthians 5:7). Just as the blood of the Passover lamb turned aside God's judgment from Israel's households, the New Testament presents Christ's shed blood as turning aside God's judgment from all who trust him — the true and final Passover Lamb, of whom every Passover lamb since Egypt was a foreshadowing.",
        ],
      },
    ],
    verses: [
      { reference: "Exodus 12:1-14", note: "The first Passover instituted in Egypt" },
      { reference: "Exodus 12:21-27", note: "Moses instructs the elders; the meaning explained to future generations" },
      { reference: "Joshua 5:10-12", note: "First Passover kept in the Promised Land" },
      { reference: "2 Chronicles 30", note: "Hezekiah's Passover reform" },
      { reference: "Luke 22:7-20", note: "The Last Supper as a Passover meal; the Lord's Supper instituted" },
      { reference: "John 19:31-36", note: "Jesus's bones unbroken, fulfilling the Passover lamb's pattern" },
      { reference: "1 Corinthians 5:7", note: "\"Christ, our Passover, has been sacrificed in our place\"" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Passover", url: "https://www.britannica.com/topic/Passover" },
      { label: "Got Questions: What is the meaning of Passover?", url: "https://www.gotquestions.org/Passover-meaning.html" },
    ],
  },
  {
    id: "young-earth-old-earth-creationism",
    name: "Young Earth and Old Earth Creationism",
    alternateNames: ["young-earth creationism", "old-earth creationism", "young earth creationism", "old earth creationism"],
    category: "doctrine",
    role: "A Debate Among Bible-Believing Christians Over the Age of Creation",
    summary:
      "Two positions held by Christians who both affirm Genesis 1-2 as real history, a real Adam and Eve, and God as sole Creator — differing only on how old the earth and universe are and how the six creation days relate to that age.",
    sections: [
      {
        heading: "What Both Views Share",
        paragraphs: [
          "Before the disagreement, the common ground matters: young-earth and old-earth evangelicals both affirm that Genesis 1-2 is real, historical divine revelation rather than borrowed myth or poetry, that God created the universe, the earth, and every living thing by his direct word and will rather than by unguided natural process, and that Adam and Eve were real historical individuals whose fall into sin brought death and corruption into a world God had made good. Both camps therefore reject theistic evolution's account of unguided common descent producing humanity, even though old-earth creationists accept an ancient universe. The disagreement between them is narrower than it can first appear: not whether God created, but how the six days of Genesis 1 and the genealogies that follow relate to the calendar age of the earth and universe.",
        ],
      },
      {
        heading: "The Case for a Young Earth",
        paragraphs: [
          "Young-earth creationists read Genesis 1's six days as ordinary, consecutive 24-hour days, pointing to the repeated Hebrew formula 'and there was evening and there was morning' attached to each one — a phrase used nowhere else in the Old Testament to describe anything but a literal day. Exodus 20:11 grounds the Sabbath commandment directly in this reading: Israel is to rest on the seventh day 'for in six days the LORD made heaven and earth... and rested the seventh day,' treating the creation week as a real six-day pattern worth imitating, not a loose figure of speech. Young-earth advocates also read the genealogies of Genesis 5 and 11 as a fairly tight, connected chronology — the method Archbishop Ussher used to calculate his famous 4004 BC date — yielding an earth some thousands, not billions, of years old. A further theological concern drives much young-earth conviction: Romans 5:12 ties death's entry into the world to Adam's sin, which young-earth writers argue is hard to square with millions of years of animal death, disease, and predation before Adam ever existed, since Genesis 1:31 calls the finished, pre-fall creation 'very good.' Organizations such as Answers in Genesis and the Institute for Creation Research are the best-known contemporary defenders of this view, which was also the overwhelming consensus of the church for most of its history, before 19th-century geology raised the alternative.",
        ],
      },
      {
        heading: "The Case for an Old Earth",
        paragraphs: [
          "Old-earth creationists (including day-age and framework views) argue the Hebrew word for 'day' (yom) is not always a strict 24-hour period even within Genesis itself — Genesis 2:4 uses 'day' to summarize the entire creation week, and yom elsewhere in the Old Testament can denote an extended era ('the day of the LORD'). Some point to 2 Peter 3:8 and Psalm 90:4 ('a thousand years in your sight are like a day') as evidence Scripture itself treats God's relationship to time as different from a strict human calendar, though critics note neither passage is actually about Genesis 1. Old-earth advocates also argue the Genesis 5 and 11 genealogies may contain real gaps, as Hebrew genealogies demonstrably do elsewhere (Matthew 1's genealogy openly skips generations to structure itself in three sets of fourteen), making Ussher-style arithmetic less secure than it looks. Framework-view proponents go further, reading the six days as a literary structure — three days of forming (light, sky/sea, land) matched by three days of filling (sun/moon/stars, sea/sky creatures, land creatures/man) — meant to teach that God ordered and filled his world, not to fix a scientific timescale. Most old-earth evangelicals also hold that the scientific case for an ancient universe and earth (starlight travel time, radiometric dating, geological strata) is strong enough that Scripture, properly interpreted, should be read in a way that doesn't require rejecting it — a hermeneutical move young-earth writers view as letting outside science dictate the reading of the text. Hugh Ross and the organization Reasons to Believe are the best-known contemporary defenders of this view; the Princeton theologian B.B. Warfield held a similar position over a century ago.",
        ],
      },
      {
        heading: "A Secondary Issue Among Believers",
        paragraphs: [
          "Both sides typically treat this as an in-house disagreement among Christians who share the same confidence in Scripture's authority and the same core convictions about a real Creator, a real Adam and Eve, and a real Fall — not a test of orthodoxy the way the deity of Christ or the physical resurrection would be. Believers on both sides can and do accuse the other of letting an outside pressure (either a scientific consensus or a rigid arithmetic reading) distort the text, so the debate is argued with real conviction — but it is a debate about the timing and mechanics of creation, not about whether God created.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 1:1-2:3", note: "The six days of creation" },
      { reference: "Genesis 2:4", note: "'Day' used to summarize the whole creation week" },
      { reference: "Exodus 20:11", note: "The Sabbath grounded in a six-day creation week" },
      { reference: "Genesis 5:1-32", note: "The genealogy from Adam to Noah, central to young-earth chronology" },
      { reference: "Romans 5:12", note: "Death entering the world through Adam's sin" },
      { reference: "2 Peter 3:8", note: "'With the Lord a day is as a thousand years'" },
    ],
    sources: [
      { label: "Got Questions: What is the day-age theory?", url: "https://www.gotquestions.org/day-age-theory.html" },
      { label: "Encyclopaedia Britannica: Creationism", url: "https://www.britannica.com/topic/creationism" },
    ],
  },
  /* Gehenna is deliberately a Topic and not a Location, even though it names a real, mappable ravine.
   * The Location type is built around a map pin — it requires `coordinates` and a `modernMapUrl`, its
   * category union has no "valley" member (city/region/province/nation/sea/river/mountain/island), and
   * its body is a `history.notableFacts` bullet list with no place to put discursive prose. The
   * substance of this article — how a valley became a word, and what English Bibles do with that word —
   * needs Topic's heading + paragraphs `sections`. The valley itself is described in the first section
   * and cross-links to Jerusalem, so nothing is lost by leaving it off the map. */
  {
    id: "gehenna",
    name: "Gehenna",
    // NOT registered: "hell". The auto-linker matches whole words case-insensitively with no
    // translation awareness, and the KJV (offered alongside the WEB in the Bible panel) renders
    // Sheol, Hades AND Gehenna all as "hell" — so the alternate name would mislink dozens of Old
    // Testament grave/realm-of-the-dead verses to this article, which is precisely the confusion the
    // article exists to undo. The WEB, this app's default, prints "Gehenna" outright, so Matthew
    // 5:22 and Mark 9:43-48 link here on the primary name with no help needed.
    alternateNames: ["Valley of Hinnom", "valley of the son of Hinnom", "Ge-Hinnom", "Hinnom", "Topheth"],
    category: "concept",
    role: "A Real Valley Outside Jerusalem, and the New Testament's Word for Final Judgment",
    summary:
      "A steep ravine on the south and west side of Jerusalem where two of Judah's kings burned their own children in sacrifice — desecrated by Josiah, cursed by Jeremiah, and by Jesus's day the standard image for God's final judgment. Most English Bibles simply print \"hell.\"",
    sections: [
      {
        heading: "A Real Valley Outside Jerusalem",
        paragraphs: [
          "Gehenna is a place before it is an idea. The Greek word geenna transliterates an Aramaic form of the Hebrew ge ben-hinnom, \"the valley of the son of Hinnom\" — a steep ravine running along the western and southern edge of ancient Jerusalem before it bends east to meet the Kidron Valley just below the City of David. It is still there, and anyone standing on the southern wall of the Old City today is looking down into it. Scripture introduces it not as a symbol of anything but as a surveyor's landmark: the valley of the son of Hinnom marks the boundary between the tribal allotments of Judah and Benjamin (Joshua 15:8; 18:16). That ordinariness is worth holding onto, because the English translations that print \"hell\" wherever the Greek says Gehenna are not so much wrong as compressed — they hand the reader an abstraction where the first hearers heard the name of a specific ditch a short walk from where Jesus was standing.",
        ],
      },
      {
        heading: "What Happened in the Valley",
        paragraphs: [
          "The valley acquired its reputation under two of Judah's worst kings. Ahaz \"made his son to pass through the fire, according to the abominations of the nations\" (2 Kings 16:3), and 2 Chronicles 28:3 names the site: \"he burnt incense in the valley of the son of Hinnom, and burnt his children in the fire.\" Three generations later Manasseh did the same (2 Kings 21:6; 2 Chronicles 33:6). The particular installation used for this was called Topheth, and the god invoked was Molech. Scripture never explains the practice sympathetically or treats it as a regrettable cultural difference; the historian of Kings names it as the specific thing that finally exhausted God's patience with Jerusalem (2 Kings 21:11-15). Whatever else Gehenna would come to mean, it began as the place where God's own covenant people did the worst thing in the book, within sight of the temple.",
        ],
      },
      {
        heading: "Josiah's Desecration and Jeremiah's Valley of Slaughter",
        paragraphs: [
          "Josiah, Manasseh's grandson and the last good king of Judah, went through the valley as part of his reform: \"He defiled Topheth, which is in the valley of the children of Hinnom, that no man might make his son or his daughter to pass through the fire to Molech\" (2 Kings 23:10). \"Defiled\" is a technical term — he deliberately made the site ritually unclean, filling it with human bones and refuse, so that it could never be used for worship again. That is why the valley ends up associated with corpses and burning: not as an accident of municipal history but as a king's calculated act of desecration.",
          "Jeremiah, who preached in Josiah's lifetime and long after, gave the valley the name it kept. God tells him the people \"have built the high places of Topheth, which is in the valley of the son of Hinnom, to burn their sons and their daughters in the fire; which I didn't command, nor did it come into my mind\" (Jeremiah 7:31) — and then declares that the place will be renamed \"the valley of Slaughter,\" heaped with the unburied bodies of the very people who built it, with no one to drive the birds away (Jeremiah 7:32-33). In Jeremiah 19 the prophet is sent to buy a potter's earthen jar, carry it out to that valley by the Potsherd Gate, announce the coming judgment, and smash the jar in front of the elders: \"Even so will I break this people and this city, as one breaks a potter's vessel, that can't be made whole again.\" Jeremiah 32:35 repeats the horrified refrain that this was something God never asked for and that never entered his mind. By the exile, then, the valley already carried a fixed set of associations — fire, dead children, unburied corpses, and the judgment of God falling on his own city — and later writers had to invent none of it.",
        ],
      },
      {
        heading: "From a Valley to an Image of Judgment",
        paragraphs: [
          "In the centuries between the Old and New Testaments, Jewish writers began using the valley's name for the place of final judgment itself. Works such as 1 Enoch describe an accursed valley where the wicked are gathered for judgment, and later rabbinic literature speaks routinely of Gehinnom as the destiny of the unrighteous, over against Paradise. By the first century the word needed no explanation: when Jesus said \"Gehenna,\" his hearers understood a theological term, not a set of directions, in much the way \"Auschwitz\" now names something larger than a Polish town.",
          "One popular explanation is worth flagging. Many sermons and study Bibles say that in Jesus's day the valley served as Jerusalem's perpetually smoldering garbage dump, and that this is where the imagery of unquenchable fire comes from. It is a vivid story, and it may even be true, but it cannot be traced back any further than the medieval Jewish commentator Rabbi Kimhi (Radak) around AD 1200, and no ancient writer and no excavation has yet confirmed it. Nothing in the biblical picture depends on it: Jeremiah supplied the fire, the corpses, and the judgment six hundred years earlier, and Isaiah 66:24 — \"their worm won't die, neither will their fire be quenched\" — supplied the exact line Jesus quotes.",
        ],
      },
      {
        heading: "How Jesus Uses the Word",
        paragraphs: [
          "Gehenna appears twelve times in the New Testament. Eleven of them are on the lips of Jesus; the twelfth is James 3:6, where the tongue is \"set on fire by Gehenna.\" Jesus warns that contemptuous anger puts a person \"in danger of the fire of Gehenna\" (Matthew 5:22), that it is better to lose an eye or a hand than for the whole body to be thrown into it (Matthew 5:29-30; 18:9; Mark 9:43-48, where he quotes Isaiah 66:24 directly), and that the one to fear is not whoever can kill the body but \"him who is able to destroy both soul and body in Gehenna\" (Matthew 10:28; Luke 12:5). Two of the sharpest uses are aimed squarely at religious professionals: a convert made twice as much \"a son of Gehenna\" as those who made him, and \"How will you escape the judgment of Gehenna?\" (Matthew 23:15, 33).",
          "Two things are striking about that list. First, nearly every warning is addressed to insiders — to disciples and to the religiously scrupulous — rather than to the pagans, tax collectors, and prostitutes Jesus is elsewhere accused of being too friendly with. Second, Jesus never describes Gehenna. He names it, quotes one line of Isaiah about it, and moves immediately to what his hearers should do about it. The New Testament's most detailed pictures of the next world are parables and visions; the word itself is deployed as a warning, not as a travel guide.",
        ],
      },
      {
        heading: "Gehenna, Hades, Sheol, Tartarus — and the English Word \"Hell\"",
        paragraphs: [
          "This is where translation matters. Scripture uses four different words that English versions have variously rendered \"hell.\" Sheol is the Old Testament's Hebrew word for the realm of the dead, where righteous and wicked alike are said to go (Jacob expects to join Joseph there in Genesis 37:35); Hades is the New Testament's Greek equivalent, the intermediate state of the dead before judgment (Luke 16:23; Revelation 20:13-14); Gehenna is the final judgment described above; and Tartarus appears once, as a verb, for the confinement of fallen angels (2 Peter 2:4). The King James Version translated Sheol as \"hell,\" \"grave,\" and \"pit\" more or less interchangeably, and rendered both Hades and Gehenna \"hell\" as well — one English word doing the work of four originals. Modern translations diverge: many keep \"hell\" for Gehenna while transliterating Sheol and Hades, and the World English Bible, this app's default text, simply prints Gehenna, Hades, and Sheol as they stand, which is why Matthew 5:22 here reads \"the fire of Gehenna\" rather than \"hell fire.\"",
          "Christians who take all these texts with equal seriousness have long disagreed about what the judgment Gehenna names actually involves. The historic and majority position across Catholic, Orthodox, and Protestant traditions is conscious, unending punishment. A minority within evangelicalism, appealing to language like \"destroy both soul and body\" (Matthew 10:28) and \"the wages of sin is death\" (Romans 6:23), holds instead to conditional immortality or annihilationism — that the unrepentant finally perish rather than suffer endlessly. A smaller strand, drawing on texts about God reconciling all things (Colossians 1:20), has hoped for an ultimate restoration. That debate is not settled by the vocabulary, and this article does not try to settle it. What the vocabulary does settle is a narrower and more practical question: knowing that a given verse says Gehenna and not Sheol tells the reader which subject is even under discussion — final judgment, or simply the state of the dead — and that distinction alone clears up a great deal of confusion that the single English word \"hell\" creates.",
        ],
      },
    ],
    verses: [
      { reference: "Joshua 15:8", note: "The valley of the son of Hinnom as a tribal boundary marker" },
      { reference: "2 Kings 16:3", note: "Ahaz makes his son \"pass through the fire\"" },
      { reference: "2 Chronicles 33:6", note: "Manasseh burns his children in the valley of the son of Hinnom" },
      { reference: "2 Kings 23:10", note: "Josiah defiles Topheth so it can never be used for worship again" },
      { reference: "Jeremiah 7:31-33", note: "Renamed \"the valley of Slaughter\"; \"nor did it come into my mind\"" },
      { reference: "Jeremiah 19:1-15", note: "The smashed potter's jar, prophesied in the valley itself" },
      { reference: "Isaiah 66:24", note: "\"Their worm won't die, neither will their fire be quenched\" — the line Jesus quotes" },
      { reference: "Matthew 5:22", note: "\"In danger of the fire of Gehenna\"" },
      { reference: "Matthew 10:28", note: "\"Him who is able to destroy both soul and body in Gehenna\"" },
      { reference: "Mark 9:43-48", note: "Jesus quoting Isaiah 66:24" },
      { reference: "Luke 12:5", note: "\"Fear him who... has power to cast into Gehenna\"" },
      { reference: "James 3:6", note: "The tongue \"set on fire by Gehenna\" — the one use not on Jesus's lips" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Gehenna", url: "https://www.britannica.com/topic/Gehenna" },
      { label: "Encyclopaedia Britannica: Sheol", url: "https://www.britannica.com/topic/sheol" },
      { label: "Got Questions: What is Gehenna?", url: "https://www.gotquestions.org/Gehenna.html" },
    ],
  },
  /* The Nicene Creed is a Topic rather than something added to the existing timeline events, which
   * already cover the two councils as events (bib-ac-council-of-nicaea, AD 325; and
   * council-of-constantinople-381) and should stay focused on what happened when. The creed itself
   * outlives both meetings — it is recited weekly, sixteen centuries later — so it belongs where a
   * reader can look it up as a subject rather than as a date. Both event articles already say
   * "Nicene Creed" verbatim in their prose, so this entry makes those mentions live links from the
   * timeline panel without either article being edited. */
  {
    id: "nicene-creed",
    name: "Nicene Creed",
    alternateNames: ["Creed of Nicaea", "Nicene-Constantinopolitan Creed", "Niceno-Constantinopolitan Creed"],
    category: "doctrine",
    role: "The Church's Most Widely Shared Confession of Faith",
    summary:
      "The statement of faith drawn up at the Council of Nicaea in AD 325 and expanded at Constantinople in AD 381 — the closest thing Christianity has to a common confession, recited weekly in Catholic, Orthodox, Anglican, Lutheran and many other churches, and the place where the church settled that Jesus Christ is fully and eternally God.",
    sections: [
      {
        heading: "The Crisis That Produced It",
        paragraphs: [
          "Early in the fourth century a presbyter of Alexandria named Arius began teaching that the Son of God, however exalted, was not eternal. His reasoning was simple enough to fit on a banner, and in fact circulated as popular songs: if the Son is begotten, then there was a moment before he was begotten, so \"there was when he was not.\" On this view Christ was the first and greatest of all creatures, the one through whom everything else was made, worthy of enormous honor — but a creature nonetheless, not God in the way the Father is God. The argument had real appeal. It protected the oneness of God against any suspicion of two gods, and it could point to verses like \"the Father is greater than I\" (John 14:28) and the Greek text of Proverbs 8:22, where Wisdom says the Lord \"created\" her.",
          "The dispute tore through the eastern churches, and Constantine the Great, who had only recently ended the persecutions and had no wish to preside over a fractured church, summoned bishops from across the empire to the city of Nicaea in AD 325. Somewhere between 250 and 318 bishops came — many of them, within living memory of the persecutions, missing eyes or hands. The council rejected Arius's teaching almost unanimously; only two bishops refused to sign. What they produced was a short baptismal-style confession with one contested word at its center.",
        ],
      },
      {
        heading: "One Word: Homoousios",
        paragraphs: [
          "The hinge of the whole controversy was the Greek word homoousios — \"of one substance,\" or in older English translations \"consubstantial\" with the Father. The council declared the Son \"begotten, not made, of one substance with the Father,\" and added \"true God from true God\" and \"light from light\" to make the point unmistakable. Begetting, in this account, is what God eternally is rather than something God once did: the Son is not a product of the Father's will at a point in time, the way creation is, but is what the Father is, eternally.",
          "The obvious objection, raised at the time and repeated ever since, is that homoousios is not a biblical word. Nobody at Nicaea denied that. The council's defenders — Athanasius of Alexandria most tenaciously — argued that this was exactly the point. Every scriptural phrase they proposed, the Arian party was willing to sign, because each could be given a reading in which the Son was still a creature: \"of God,\" \"the image of God,\" even \"the Word was God\" could be softened. Homoousios could not be softened. It was chosen not because it was found in Scripture but because it was the one formula that could not be signed in bad faith by someone who believed Christ was made.",
          "What was actually at stake was less abstract than the vocabulary suggests. Christians prayed to Christ, were baptized into his name, and believed he had saved them — and if only God can save, and only God may be worshiped, then the question of whether the Son is God is not a technicality about metaphysics but a question about whether Christian worship is idolatry and whether the cross accomplished anything. That is why a single word could hold a council for weeks.",
        ],
      },
      {
        heading: "The Revision at Constantinople (AD 381)",
        paragraphs: [
          "The creed of 325 gave the Son several careful lines and then stopped almost immediately: \"And in the Holy Spirit.\" That silence became the next battleground, as a group later nicknamed the Pneumatomachians (\"Spirit-fighters\") argued that the Spirit, whatever else he was, was not fully divine. More than half a century of contested imperial policy later, the emperor Theodosius I convened a second council at Constantinople in AD 381, which reaffirmed Nicaea on the Son and greatly expanded the article on the Spirit: \"the Lord and Giver of Life, who proceeds from the Father, who with the Father and the Son together is worshiped and glorified, who spoke by the prophets.\" It also added the clauses on the church, baptism, the resurrection of the dead, and the life of the world to come, and appended \"whose kingdom shall have no end.\"",
          "The result is what scholars call the Niceno-Constantinopolitan Creed, and it is what almost every church that recites \"the Nicene Creed\" is actually reciting. Nicaea gets the name; Constantinople wrote most of the text now in use.",
        ],
      },
      {
        heading: "What the Creed Actually Says",
        paragraphs: [
          "The creed has three movements, one for each person of the Trinity, and then a short fourth on the church and the age to come. It opens with \"We believe in one God, the Father Almighty, maker of heaven and earth, and of all things visible and invisible\" — a deliberate refusal of any view in which the material world is the work of a lesser or hostile power.",
          "The longest section is on the Son: \"one Lord Jesus Christ, the only-begotten Son of God, begotten of the Father before all worlds, God of God, Light of Light, very God of very God, begotten, not made, being of one substance with the Father, by whom all things were made; who for us men and for our salvation came down from heaven, and was incarnate by the Holy Spirit of the Virgin Mary, and was made man; and was crucified also for us under Pontius Pilate; he suffered and was buried; and the third day he rose again according to the Scriptures, and ascended into heaven, and sits on the right hand of the Father; and he shall come again, with glory, to judge both the living and the dead; whose kingdom shall have no end.\" It is worth noticing how much of that is plain narrative. The creed's answer to a metaphysical controversy is largely a story with a date in it — the reference to Pontius Pilate pins the whole confession to a particular Friday under a particular Roman governor.",
          "Then the Spirit, in the expanded 381 form quoted above, and finally: \"one holy catholic and apostolic Church; one baptism for the remission of sins; and we look for the resurrection of the dead, and the life of the world to come.\" One point regularly trips up modern readers: \"catholic\" here is the ordinary Greek word for \"universal,\" not a reference to the Roman Catholic Church as a denomination, which is why Protestant congregations can and do recite the line unchanged. Some print \"christian\" or \"universal\" in its place to avoid the confusion.",
        ],
      },
      {
        heading: "The Filioque and the Split Between East and West",
        paragraphs: [
          "One clause divides the churches that otherwise share this creed. Where Constantinople said the Spirit \"proceeds from the Father,\" Latin-speaking churches came to say \"proceeds from the Father and the Son\" — in Latin, filioque, \"and the Son.\" The phrase appears in Spain by the late sixth century, spread through the Frankish churches under Charlemagne, and was accepted at Rome by the early eleventh. Today it is retained by the Catholic Church and by most Protestant churches that use the creed at all; the Orthodox churches have never accepted it.",
          "The Western case is both scriptural and theological. Jesus says he will send the Spirit (John 15:26; 16:7), Paul calls him \"the Spirit of his Son\" (Galatians 4:6), and Augustine's account of the Trinity understands the Spirit as the bond of love between Father and Son. On this reading the clause does not add a new doctrine but makes explicit the relation the New Testament already describes, guarding against any picture in which the Spirit's work is detached from Christ's.",
          "The Eastern objection has two parts, and it is important that they are distinct. The first is procedural, and many Eastern theologians consider it the weightier of the two: the creed is the text of an ecumenical council, agreed by the whole church, and no local church — not even Rome — has the authority to amend it unilaterally. Whatever the merits of the theology, altering a conciliar text by regional custom was, on this view, a breach of how the church decides things. The second is theological: Eastern tradition holds that the Father alone is the single source or \"origin\" within the Godhead, and that having the Spirit proceed from the Father and the Son either introduces two sources into God or quietly subordinates the Spirit to the other two persons. Photius of Constantinople pressed this case most forcefully in the ninth century.",
          "The filioque was one of the standing grievances in the estrangement that culminated in the Great Schism between East and West in AD 1054, though historians generally regard the political, jurisdictional, and cultural causes of that break as at least as weighty as this clause. Modern dialogue has narrowed the theological distance considerably — a 1995 Vatican clarification distinguished the Greek and Latin senses of \"procession\" and acknowledged the Father as sole origin, and popes have on occasion recited the creed in Greek without the clause — but whether the addition was ever legitimate remains a genuinely open question between the traditions, and this app does not attempt to settle it.",
        ],
      },
      {
        heading: "The Creed in Worship Today",
        paragraphs: [
          "Sixteen centuries on, the creed is recited at every Catholic Mass on Sundays and feast days, at every Orthodox Divine Liturgy, and regularly in Anglican, Lutheran, Methodist, Presbyterian and Reformed services. Many evangelical, Baptist, and nondenominational churches do not recite creeds at all, usually out of the conviction that Scripture alone is the church's rule of faith and that no human summary should compete with it — but the overwhelming majority of them affirm what the creed teaches, and it is not unusual to find its language quoted in a doctrinal statement by a congregation that would never read it aloud.",
          "That near-universal reach is the creed's real significance for an ordinary churchgoer. Christians disagree about a great many things — baptism, church government, the end times, the filioque itself — but a Catholic in Manila, an Orthodox believer in Athens, and a Presbyterian in Idaho can say almost all of these same sentences and mean the same thing by them. It also functions as a check: the creed is not a set of extra rules added to Scripture but a compressed summary of what the church, under pressure and after long argument, concluded that Scripture had been saying all along about who God is. See the Trinity for how that conclusion developed, and Arius and Athanasius of Alexandria for the two men whose argument forced the question.",
        ],
      },
    ],
    verses: [
      { reference: "John 1:1-3", note: "\"The Word was God... all things were made through him\"" },
      { reference: "John 1:14", note: "\"The Word became flesh\" — the creed's \"was made man\"" },
      { reference: "John 14:28", note: "\"The Father is greater than I\" — a text the Arian party leaned on" },
      { reference: "Colossians 1:15-20", note: "Christ as image of the invisible God, in whom all things were created" },
      { reference: "Philippians 2:5-11", note: "The pre-existent Son who \"emptied himself\" — an early confession in hymn form" },
      { reference: "Hebrews 1:3", note: "\"The very image of his substance\" — language close to the creed's own" },
      { reference: "John 15:26", note: "\"The Spirit of truth, who proceeds from the Father\" — the disputed clause's source text" },
      { reference: "Galatians 4:6", note: "\"The Spirit of his Son\" — a key text in the Western case for the filioque" },
      { reference: "Matthew 28:19", note: "Baptism in the one name of Father, Son, and Holy Spirit" },
    ],
    sources: [
      { label: "Nicene Creed (325 and 381) — full text at CCEL", url: "https://www.ccel.org/creeds/nicene.creed.html" },
      { label: "Encyclopaedia Britannica: Nicene Creed", url: "https://www.britannica.com/topic/Nicene-Creed" },
      { label: "Encyclopaedia Britannica: Filioque", url: "https://www.britannica.com/topic/Filioque" },
      { label: "Got Questions: What is the Nicene Creed?", url: "https://www.gotquestions.org/Nicene-creed.html" },
    ],
  },
  /* ---------------------------------------------------------------------------------------------
   * Archaeological finds — the inscriptions, papyri and manuscripts already named in locations' and
   * POIs' `archaeology` prose and in people's `extraBiblicalReferences`, which until now were dead
   * text. Each is a Topic rather than a Location or a POI, on one consistent rule:
   *
   *   A PLACE you can stand in gets a POI. A PORTABLE OBJECT gets a Topic.
   *
   * Every entry below is an object that has been moved: the Mesha Stele is in Paris, the Cyrus
   * Cylinder and the Black Obelisk in London, the Siloam Inscription in Istanbul, Codex Sinaiticus
   * in four countries at once. A map pin at the findspot would point at a hole in the ground, and
   * the findspot itself is usually already a Location or POI here (Dan, Caesarea Maritima, Qumran).
   * What a reader actually wants is discursive — what it says, how it surfaced, and what it does and
   * does not prove — which is exactly what `Location`/`PointOfInterest` have nowhere to put and what
   * `Topic.sections` is for. This is the same reasoning that made Gehenna a Topic (see above).
   *
   * The two inscriptions that already exist as POIs (erastus-inscription-corinth,
   * gallio-inscription-delphi) are not exceptions to the rule and are deliberately not duplicated
   * here: both are entries for a spot inside an already-mapped excavation you can visit.
   *
   * `category` is "concept" throughout — the four TopicCategory values are practice/doctrine/
   * people-group/concept, and an artefact is none of the first three. The descriptive `role` field
   * carries the real label ("Ninth-Century BC Aramaic Victory Inscription"), which is what the panel
   * renders as the badge; `category` only drives the small tier tag.
   *
   * On evidential weight: these are the app's apologetic-adjacent articles, and overclaiming here
   * would cost more credibility than it buys. Every entry states plainly what its find does not
   * establish, and names the scholars who dissent where there is a real dissent — the same standard
   * `ExtraBiblicalReference.reliability` already enforces on person articles.
   * ------------------------------------------------------------------------------------------- */
  {
    id: "pilate-stone",
    name: "Pilate Stone",
    // NOT registered: "Pilate" — that is Pontius Pilate the person, who already owns it.
    alternateNames: ["Pilate Inscription", "Caesarea Pilate Inscription"],
    category: "discovery",
    role: "First-Century Latin Dedication Naming Pontius Pilate",
    summary:
      "A reused block of limestone found in the theatre at Caesarea Maritima in 1961, carrying the only inscription ever found from Pilate's own lifetime — and the one that settles what his job title actually was.",
    sections: [
      {
        heading: "Found in a Staircase",
        paragraphs: [
          "In June 1961, in its third season, the Italian Archaeological Mission under Antonio Frova was clearing the Roman theatre at Caesarea Maritima, the harbour city Herod the Great built on the Judean coast and the seat of the Roman governor. In a fourth-century rebuilding of the theatre steps the masons had done what masons everywhere have always done: they took a handy piece of dressed stone from an older, ruined building and set it into the staircase face-down. When it was turned over it carried four lines of Latin, badly worn on the left where the block had been trimmed to fit.",
          "What survives reads, in the standard reconstruction, something like: \"...Tiberieum ... [Pont]ius Pilatus ... [praef]ectus Iuda[ea]e ... [ded]it\" — Pontius Pilate, prefect of Judea, gave or dedicated a building called a Tiberieum, presumably something named in honour of the emperor Tiberius. The stone is now in the Israel Museum in Jerusalem; a replica stands in the theatre at Caesarea where visitors see it today.",
        ],
      },
      {
        heading: "Why the Title Matters",
        paragraphs: [
          "The Gospels never give Pilate a formal Latin title; Luke calls him the one \"governing Judea\" (Luke 3:1), and John simply calls him the governor. The Roman historian Tacitus, writing around AD 116, calls him a procurator (Annals 15.44). For a long time that was the only label available, and it was slightly wrong: procurator was the title used for governors of Judea from the reign of Claudius onward, roughly a decade after Pilate left. The stone says praefectus — prefect — the earlier, more military title, exactly what a governor of Judea in the AD 20s and 30s should have been called.",
          "That is a small thing, and it is worth being precise about how much it carries. It does not prove any event in the Gospels happened. What it does is place a man named Pontius Pilatus in Judea, in the right office, under Tiberius, in a document cut while he held the job — and quietly correct a later Roman historian in the direction of the earlier evidence. Josephus and Philo both write about Pilate at length, and the Gospels assume him without explaining him; the stone is the one witness that is not a narrative about him but a leftover from his administration.",
        ],
      },
      {
        heading: "What Is Actually Legible, and What Is Restored",
        paragraphs: [
          "Honesty about this inscription means being clear which letters are on the stone and which are scholars' reconstructions. \"NTIVS PILATVS\" is plainly there and is not seriously disputed by anyone; the reading of the name is secure. \"ECTVS IVDA E\" is likewise on the stone, and \"[praef]ectus\" is the overwhelmingly favoured restoration, though it is a restoration. The first line, \"TIBERIEVM,\" is the genuinely contested part: no other example of the word is known, and what kind of structure a Tiberieum was — a temple, a lighthouse, a hall for the imperial cult — has been argued over ever since, with several competing reconstructions of the whole text proposed over the decades.",
          "The stone's authenticity, by contrast, is not in question. It came out of a controlled excavation, in situ in a datable rebuild, and no serious scholar has challenged it. That is a useful distinction to hold on to: an object can be entirely genuine and still have lines in it that nobody can read with confidence.",
        ],
      },
    ],
    verses: [
      { reference: "Luke 3:1", note: "\"Pontius Pilate being governor of Judea\" — Luke's dating of John the Baptist's ministry" },
      { reference: "Matthew 27:11-26", note: "Pilate at the trial of Jesus" },
      { reference: "John 18:28-19:16", note: "The longest Gospel account of Pilate's questioning" },
      { reference: "Acts 23:23-35", note: "Paul sent under guard to the governor's headquarters at Caesarea" },
    ],
    sources: [
      { label: "Bible Odyssey (SBL): Pontius Pilate", url: "https://www.bibleodyssey.org/articles/pontius-pilate/" },
      { label: "Wikipedia: Pilate stone", url: "https://en.wikipedia.org/wiki/Pilate_stone" },
    ],
    discovery: {
      objectType: "Inscribed limestone block, 82 x 65 x 20 cm, carrying four worn lines of Latin",
      findSite: "The Roman theatre at Caesarea Maritima, reused face-down as a step in a fourth-century rebuild",
      findSiteId: "caesarea-maritima",
      findSiteKind: "poi",
      foundYear: "June 1961",
      foundBy: "The Italian Archaeological Mission at Caesarea, directed by Antonio Frova, in its third season. The published excavation report names no individual finder, and no reliable source does — a name circulating online for the discoverer traces only to an encyclopedia entry with no citation behind it",
      objectDate: "AD 26-36, the years of Pilate's prefecture",
      objectDateCertainty: "firm",
      currentLocation: "Israel Museum, Jerusalem (IAA 1961-529); a replica stands in the theatre at Caesarea",
    },
    citations: [
      {
        tier: "scholarly",
        label: "Judaism and Rome: Dedication of Pontius Pilate, Judaea (CIIP II, 1277)",
        url: "https://www.judaism-and-rome.org/dedication-pontius-pilate-judea-ciip-ii-1277",
        credit: "Judaism and Rome (ERC-funded research project), citing Corpus Inscriptionum Iudaeae/Palaestinae II, 1277",
        detail: "Gives material (limestone), measurements, date 26-36 CE, and \"Actual Location: Israel Museum. Inv. no.: IAA 1961-529\"",
        supports: "Material, dimensions, object date, current location and inventory number",
      },
      {
        tier: "institution",
        label: "Excavation report: Antonio Frova, \"L'iscrizione di Ponzio Pilato a Caesarea\"",
        credit: "Italian Archaeological Mission at Caesarea (Università di Milano)",
        detail: "Rendiconti dell'Istituto Lombardo 95 (1961), 419-434 — the excavating body's own first publication of the inscription; also catalogued as AE 1963, 104. Print only",
        supports: "The 1961 find and the reading of the text",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Pontius Pilate",
        url: "https://www.bibleodyssey.org/articles/pontius-pilate/",
        credit: "Society of Biblical Literature",
        supports: "The prefect/procurator distinction discussed in section two",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Pilate stone",
        url: "https://en.wikipedia.org/wiki/Pilate_stone",
      },
    ],
  },
  {
    id: "tel-dan-stele",
    name: "Tel Dan Stele",
    // NOT registered: "Tel Dan" alone — that is the modern name of the city of Dan, which already
    // owns it. Every alias below is longer than "Tel Dan", and NAME_ENTRIES is sorted longest-first,
    // so a mention of the stele wins over the city and a bare "Tel Dan" still goes to the city.
    alternateNames: ["Tel Dan Stela", "Tel Dan Inscription", "House of David Inscription"],
    category: "discovery",
    role: "Ninth-Century BC Aramaic Victory Inscription",
    summary:
      "Three fragments of a smashed basalt monument found at Tel Dan in 1993 and 1994, carrying what most scholars read as the earliest mention of David anywhere outside the Bible.",
    sections: [
      {
        heading: "A Broken Monument in a City Wall",
        paragraphs: [
          "On 21 July 1993, Gila Cook — the surveyor on Avraham Biran's long-running excavation at Tel Dan — noticed writing on a stone built into a wall beside the Iron Age gate. It turned out to be part of a black basalt victory stele that had been deliberately smashed and its pieces reused as ordinary building material — which is itself a clue, since that is what a conquering army did to a rival's monuments. Two more fragments, which join each other, were found in June 1994. Biran directed the dig and published all three with the epigrapher J. Naveh, in 1993 and 1995; the gap between finding and publishing is why the second pair is often misdated to 1995. Together the fragments preserve thirteen broken lines of Old Aramaic from the ninth century BC. The stele is on permanent display in the Israel Museum in Jerusalem.",
          "The text is a boast. An Aramean king — most scholars think Hazael of Damascus, or possibly his son — describes how his father died, how the king of Israel had invaded his land, and how the god Hadad went before him and gave him victory. He then names two men he says he killed: a king of Israel and a king of \"the house of David.\"",
        ],
      },
      {
        heading: "The Line Everyone Argues About",
        paragraphs: [
          "The phrase is written BYTDWD, and the argument turns on it. Ancient Aramaic scribes used a small mark to separate words, and there is no separator inside BYTDWD — so, strictly, the stone says one continuous string of consonants. The large majority of epigraphers read it as bet-David, \"house of David,\" the standard ancient Near Eastern way of naming a dynasty by its founder, exactly as the same stele names Israel by the dynastic label the Assyrians used. If that reading is right, this is a hostile foreign king in roughly 840 BC referring to the ruling family of Judah as David's house — the earliest surviving reference to David outside the Bible.",
          "A minority has pushed back. Philip Davies and others proposed that BYTDWD might be a place name (\"Bethdod\") or a phrase such as \"house of the beloved\" or \"house of the kettle,\" and argued that a dynastic reading assumes what it sets out to prove. That case has not persuaded most specialists — no such place is otherwise known, and the parallel dynastic usage in the same inscription tells against it — but it is a real scholarly position held by credentialed people, not a fringe stunt, and it deserves to be named rather than waved away. A separate accusation of forgery made shortly after the discovery has, by contrast, found essentially no support; the fragments came out of a controlled dig in datable stratigraphy.",
        ],
      },
      {
        heading: "What It Establishes, and What It Doesn't",
        paragraphs: [
          "Taken at the majority reading, the stele establishes something narrow and genuinely important: that within roughly a century and a half of David's traditional lifetime, a neighbouring state referred to the kingdom of Judah as \"the house of David\" — which is hard to explain unless there had been a David. That is a real answer to a real argument; a generation of scholars had proposed that David was a literary invention of much later writers, and this find made that position considerably harder to hold.",
          "It establishes nothing about the David of the biblical narrative — not his psalms, his kingdom's size, his character, or any episode of his life. And the stele's own account sits in some tension with Scripture: the Aramean king claims to have killed the kings of Israel and Judah, while 2 Kings 9 credits those two deaths to Jehu's coup. Historians reconcile this in various ways — Hazael claiming credit for deaths that happened during his campaign, or Jehu acting as his client — and none of the reconciliations is certain. A find that corroborates one thing is not obliged to corroborate everything, and pretending otherwise is how good evidence gets spent badly.",
        ],
      },
    ],
    verses: [
      { reference: "2 Samuel 7:16", note: "The promise to David of an enduring house" },
      { reference: "1 Kings 12:19", note: "\"Israel rebelled against David's house\" — the dynastic phrase in Scripture's own mouth" },
      { reference: "2 Kings 8:7-15", note: "Hazael takes the throne of Aram-Damascus" },
      { reference: "2 Kings 9:14-28", note: "Jehu kills Joram of Israel and Ahaziah of Judah — the deaths the stele's author also claims" },
      { reference: "Judges 18:27-29", note: "The city of Dan itself, where the stele was found" },
    ],
    sources: [
      { label: "Bible Odyssey (SBL): The Tel Dan Inscription", url: "https://www.bibleodyssey.org/articles/the-tel-dan-inscription/" },
      { label: "Wikipedia: Tel Dan stele", url: "https://en.wikipedia.org/wiki/Tel_Dan_stele" },
    ],
    discovery: {
      objectType: "Black basalt victory stele, deliberately smashed; three fragments preserving thirteen broken lines of Old Aramaic",
      findSite: "Tel Dan, upper Galilee — in secondary use in a wall beside the Iron Age gate",
      findSiteId: "dan",
      findSiteKind: "location",
      foundYear: "Fragment A on 21 July 1993; Fragments B1 and B2 in June 1994",
      foundBy: "Gila Cook, surveyor on Avraham Biran's expedition, spotted Fragment A. Biran directed the excavation and published the fragments with Joseph Naveh",
      objectDate: "c. 840-835 BC",
      objectDateCertainty: "traditional",
      currentLocation: "Israel Museum, Jerusalem",
    },
    citations: [
      {
        tier: "institution",
        label: "Excavation report: Avraham Biran and Joseph Naveh, \"An Aramaic Stele Fragment from Tel Dan\"",
        credit: "The Tel Dan excavation (Nelson Glueck School of Biblical Archaeology), Avraham Biran and Joseph Naveh",
        detail: "Israel Exploration Journal 43 (1993), 81-98 — the excavating body's own first publication, of Fragment A",
        supports: "The 1993 find and the reading of the inscription",
        paywalled: true,
      },
      {
        tier: "scholarly",
        label: "Avraham Biran and Joseph Naveh, \"The Tel Dan Inscription: A New Fragment\"",
        credit: "Avraham Biran and Joseph Naveh",
        detail: "Israel Exploration Journal 45 (1995), 1-18 — the publication of Fragments B1 and B2, found in June 1994",
        supports: "That the second and third fragments were found in 1994 and published in 1995",
        paywalled: true,
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): The Tel Dan Inscription",
        url: "https://www.bibleodyssey.org/articles/the-tel-dan-inscription/",
        credit: "Society of Biblical Literature",
        supports: "The majority reading of BYTDWD as \"house of David\", and the minority case against it",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Tel Dan stele",
        url: "https://en.wikipedia.org/wiki/Tel_Dan_stele",
      },
    ],
  },
  {
    id: "mesha-stele",
    name: "Mesha Stele",
    // NOT registered: "Mesha" alone. There is no person entry for King Mesha of Moab, so a bare
    // mention has nowhere better to go, but "Mesha" is also a personal and place name elsewhere in
    // Genesis 10:30 and 1 Chronicles 2:42/8:9, and the whole-word case-insensitive matcher cannot
    // tell those apart from the king.
    alternateNames: ["Mesha Stela", "Moabite Stone", "Mesha Inscription"],
    category: "discovery",
    role: "Ninth-Century BC Moabite Royal Inscription",
    summary:
      "A basalt monument set up by King Mesha of Moab in the ninth century BC, brought to European attention in Jordan in 1868 and then broken apart by the villagers who owned it — the only substantial text we have telling an Old Testament episode from the other side.",
    sections: [
      {
        heading: "Discovered, Then Destroyed",
        paragraphs: [
          "On the afternoon of 19 August 1868, the sheikh of the Banî Hamîdi told Frederick Augustus Klein — a German missionary working in Jordan for the British Church Missionary Society — about a large inscribed slab of basalt lying on the mound of Dhiban, biblical Dibon, the Moabite capital. Klein was shown it; he did not stumble on it. Word of the find set off a bidding contest between European consulates, and shortly afterwards, with the local Bedouin caught in the middle of an argument about who owned it and what the Ottoman authorities would do, the villagers heated the stone in a fire, poured cold water on it, and broke it into pieces.",
          "It could have ended there. Before the stone was destroyed, Charles Clermont-Ganneau had arranged for a squeeze to be taken — a wet paper impression pressed onto the surface, which comes away carrying the shape of every letter. The squeeze was itself torn off the stone in haste and survives only in pieces, but between it and the recovered fragments — collected independently by Clermont-Ganneau and by the British officer Charles Warren, whose share of the credit is usually left out — most of the thirty-four lines are readable. Clermont-Ganneau reassembled the stone, and the Louvre bought it from him in 1873. It is on display there today.",
        ],
      },
      {
        heading: "What Mesha Says",
        paragraphs: [
          "The inscription is a king's account of his own reign, written in Moabite — a language so close to biblical Hebrew that a reader of one can largely read the other. Mesha says that Omri, king of Israel, oppressed Moab for many years \"because Chemosh was angry with his land,\" that Omri's son continued it, and that Chemosh then gave Moab its freedom back. He lists the towns he took, the fortifications and cisterns he built, and the Israelite sanctuaries he destroyed — including a line describing how he dragged \"the vessels of YHWH\" before his own god Chemosh.",
          "Two things in that are remarkable. The first is Omri: this is a foreign king naming an Israelite king known from 1 Kings 16, on stone, within living memory of his reign. The second is the theology. Mesha explains his nation's defeat as its god's anger with his own people, and its recovery as that god's favour returning — precisely the logic the books of Kings apply to Israel. Whatever else the stele shows, it shows that the way the Old Testament reads history was not a peculiarity of Israel but the shared idiom of the region, which is worth knowing before deciding what is distinctive about Scripture and what is not.",
        ],
      },
      {
        heading: "Where It Meets, and Where It Contradicts, 2 Kings 3",
        paragraphs: [
          "2 Kings 3 tells of Mesha's rebellion after Ahab's death, of a joint campaign by Israel, Judah, and Edom that devastated Moab, and of Mesha sacrificing his own eldest son on the city wall, after which the coalition withdrew. Mesha's stele describes the same era and claims unambiguous victory. Both cannot be straightforwardly true as told, and the honest thing to say is that these are two royal accounts of the same conflict, each shaped by the interests of its author, and that neither is a neutral report. Historians generally take the stele as evidence that Moab's rebellion succeeded in the long run, and 2 Kings as evidence that a punishing campaign preceded that success — but the reconciliation is an inference, not a reading either text supplies.",
          "One more line is genuinely disputed. In 1994 André Lemaire proposed that a damaged section near line 31 reads \"house of David,\" which would make the Mesha Stele a second ninth-century witness to David's dynasty alongside the Tel Dan Stele. Later imaging work, including a 2022 study using the surviving squeeze, has been argued both for and against the reading, and specialists remain split. Unlike Tel Dan, where the majority reading is secure, this one should be described as possible and contested — not as a second proof.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 3:4-27", note: "Mesha's rebellion and the campaign against Moab — the biblical side of the same events" },
      { reference: "1 Kings 16:21-28", note: "Omri, the Israelite king Mesha names on the stone" },
      { reference: "Numbers 21:29", note: "Chemosh, the god of Moab, named in an early Hebrew poem" },
      { reference: "Jeremiah 48:1-13", note: "Dibon and the Moabite towns the stele lists, in a later oracle" },
    ],
    sources: [
      { label: "Bible Odyssey (SBL): The Mesha Stela", url: "https://www.bibleodyssey.org/articles/the-mesha-stela/" },
      { label: "Wikipedia: Mesha Stele", url: "https://en.wikipedia.org/wiki/Mesha_Stele" },
    ],
    discovery: {
      objectType: "Basalt victory stele with a rounded top, 125 cm high, carrying 34 lines of Moabite",
      findSite: "Dhiban (ancient Dibon), Jordan",
      foundYear: "19 August 1868; broken up soon afterwards, and the fragments recovered over the following years",
      foundBy: "Shown to Frederick Augustus Klein, a German missionary working for the British Church Missionary Society, by the sheikh of the Banî Hamîdi. Charles Clermont-Ganneau had a squeeze taken in 1869, before the stone was destroyed, and he and Charles Warren independently recovered the fragments; the Louvre bought them from Clermont-Ganneau in 1873",
      objectDate: "c. 840 BC; the Louvre's own record dates it c. 830-805 BC",
      objectDateCertainty: "disputed",
      currentLocation: "Musée du Louvre, Paris (AO 5066)",
    },
    citations: [
      {
        tier: "institution",
        label: "Louvre collections: Stèle de Mesha (AO 5066)",
        url: "https://collections.louvre.fr/en/ark:/53355/cl010120339",
        credit: "Musée du Louvre, Département des Antiquités orientales",
        detail: "Basalt; H. 125 cm, W. 69 cm, D. 37 cm; place of discovery Diban; purchased 1873 from Charles Clermont-Ganneau",
        supports: "Material, dimensions, findspot, inventory number and the route by which the Louvre acquired it",
      },
      {
        tier: "scholarly",
        label: "André Lemaire, \"'House of David' Restored in Moabite Inscription\"",
        credit: "André Lemaire",
        detail: "Biblical Archaeology Review 20:3 (May/June 1994), 30-37 — the proposed reading of line 31. Print-only here: the BAS library copy sits behind a members' wall",
        supports: "The contested \"house of David\" reading discussed in section three",
        paywalled: true,
      },
      {
        tier: "reference",
        label: "Biblical Archaeology Society: The Mesha Stele and the House of David",
        url: "https://www.biblicalarchaeology.org/daily/biblical-artifacts/inscriptions/mesha-stele/mesha-stele-and-the-house-of-david/",
        credit: "Biblical Archaeology Society",
        supports: "The state of the line 31 argument, including the imaging work since Lemaire",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): The Mesha Stela",
        url: "https://www.bibleodyssey.org/articles/the-mesha-stela/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Mesha Stele",
        url: "https://en.wikipedia.org/wiki/Mesha_Stele",
      },
    ],
  },
  {
    id: "merneptah-stele",
    name: "Merneptah Stele",
    alternateNames: ["Merneptah Stela", "Israel Stele", "Merneptah Inscription", "Victory Stele of Merneptah"],
    category: "discovery",
    role: "Egyptian Victory Monument, c. 1208 BC — the Earliest Mention of Israel",
    summary:
      "A ten-foot granite slab from a pharaoh's mortuary temple at Thebes, found by Flinders Petrie in 1896, whose last three lines contain the oldest known appearance of the name \"Israel\" outside the Bible.",
    sections: [
      {
        heading: "The Find",
        paragraphs: [
          "Flinders Petrie uncovered the stele in 1896 in the ruins of the mortuary temple of Merneptah, son and successor of Ramesses II, on the west bank at Thebes. Like a great deal of Egyptian monumental stone it was second-hand: the back carries an earlier inscription of Amenhotep III, and Merneptah's masons simply turned it round. It stands about three metres high and is now in the Egyptian Museum in Cairo. Petrie is said to have grasped its importance at once and remarked that this stone would be better known than anything else he ever dug up. He was right.",
          "The bulk of the text is a triumph poem about a campaign against the Libyans in the fifth year of Merneptah's reign, around 1208 BC. Only the closing stanza turns east, to a sweep through Canaan, and it is there — in a list of defeated enemies including Ashkelon, Gezer, and Yanoam — that the line appears: \"Israel is laid waste, his seed is not.\"",
        ],
      },
      {
        heading: "A People, Not a Place",
        paragraphs: [
          "Egyptian hieroglyphic writing attaches a small silent sign, called a determinative, to a word to say what kind of thing it is. The other names in this list carry the determinative for a city or a territory. Israel does not; it carries the determinative used for a people. Egyptologists have taken that seriously for well over a century, and the standard conclusion is that around 1208 BC an Egyptian scribe knew of a group in Canaan called Israel who were identified as a people rather than as the inhabitants of a particular walled city — which fits a population not yet organised into a state.",
          "It should be said that the determinative reading, while standard, is not unanimous; a minority of scholars have argued the sign is a scribal slip or that the name refers to something else, and one much-discussed proposal reads a different name entirely. The mainstream view has held up well, but a reader is better served knowing that the argument turns on a single small sign than being told the matter is beyond question.",
        ],
      },
      {
        heading: "What It Does Not Say",
        paragraphs: [
          "The stele is often introduced as evidence for the exodus or the conquest. It is not, and claiming so wastes it. It says nothing about Egypt having enslaved these people, nothing about their leaving, nothing about their religion, and nothing about how they came to be in Canaan. It also does not tell us that Israel was destroyed: \"his seed is not\" is stock pharaonic boasting, and every campaign inscription in Egypt annihilates its enemies whether or not anything much happened.",
          "What it gives is a fixed point, and fixed points are scarce. Whatever a reader concludes about the dating of the exodus — and the early date around 1446 BC and the late date around 1260 BC are both seriously defended — a people called Israel was in Canaan, and known to Egypt by name, by roughly 1208 BC. Every reconstruction has to fit under that ceiling. That is a genuine and durable contribution, and it is smaller and harder than the claim usually made for it.",
        ],
      },
    ],
    verses: [
      { reference: "Exodus 1:8-14", note: "Israel in Egypt, before the exodus" },
      { reference: "Joshua 10:33", note: "Gezer, one of the Canaanite cities named alongside Israel on the stele" },
      { reference: "Judges 1:18", note: "Ashkelon, also named on the stele" },
      { reference: "Judges 2:16-19", note: "Israel in Canaan as a loose people under judges rather than a state" },
    ],
    sources: [
      { label: "Wikipedia: Merneptah Stele", url: "https://en.wikipedia.org/wiki/Merneptah_Stele" },
      { label: "Bible Odyssey (SBL): Pharaoh", url: "https://www.bibleodyssey.org/articles/pharaoh/" },
    ],
    discovery: {
      objectType: "Granite victory stele over 3 m high, reused from an earlier monument of Amenhotep III",
      findSite: "The mortuary temple of Merneptah, western Thebes, Egypt",
      foundYear: "1896",
      foundBy: "Flinders Petrie's excavation of the temple; the hieroglyphic text was read for Petrie by Wilhelm Spiegelberg",
      objectDate: "c. 1208 BC (year 5 of Merneptah)",
      objectDateCertainty: "firm",
      currentLocation: "Egyptian Museum, Cairo (JE 31408)",
    },
    citations: [
      {
        tier: "institution",
        label: "Excavation report: W. M. Flinders Petrie, Six Temples at Thebes, 1896 (London, 1897)",
        url: "https://archive.org/details/sixtemplesatthe00petrgoog",
        credit: "W. M. Flinders Petrie, with a chapter by Wilhelm Spiegelberg",
        detail: "The excavation report in which the stele was first published; public domain, full text at the Internet Archive",
        supports: "The find year, the findspot in Merneptah's mortuary temple, and the first publication of the Israel line",
      },
      {
        tier: "scholarly",
        label: "Michael G. Hasel, \"Israel in the Merneptah Stela\"",
        credit: "Michael G. Hasel",
        detail: "Bulletin of the American Schools of Oriental Research 296 (November 1994) — on the determinative and what it does and does not establish",
        supports: "The people-determinative argument in section two",
        paywalled: true,
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Pharaoh",
        url: "https://www.bibleodyssey.org/articles/pharaoh/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Merneptah Stele",
        url: "https://en.wikipedia.org/wiki/Merneptah_Stele",
      },
    ],
  },
  {
    id: "cyrus-cylinder",
    name: "Cyrus Cylinder",
    alternateNames: ["Cyrus Cylinder inscription"],
    category: "discovery",
    role: "Babylonian Foundation Inscription of Cyrus the Great, 539 BC",
    summary:
      "A barrel-shaped baked clay cylinder covered in Akkadian cuneiform, found in the ruins of Babylon in 1879, in which the Persian conqueror announces that he has restored displaced gods and peoples to their homes.",
    sections: [
      {
        heading: "A Building Inscription, Not a Proclamation",
        paragraphs: [
          "The cylinder was found at Babylon in 1879, during Hormuzd Rassam's excavations there for the British Museum, where it has been ever since. Exactly where in Babylon is less certain than the popular accounts suggest — the standard cuneiform catalogues record no findspot for it at all, so the frequently repeated claim that it came out of the foundations of the Esagila temple precinct should be treated as a reconstruction rather than a record. What is not in doubt is the kind of text it is: a very well-attested Mesopotamian genre, buried in the fabric of a building by the king who repaired it, addressed less to the public than to posterity and to the gods. It was never a decree posted for citizens to read, and it was never meant to be read at all until someone dug up the wall.",
          "The text tells the story of Babylon's fall in 539 BC entirely from the winner's side. Nabonidus, the last Babylonian king, is described as neglecting the god Marduk and imposing improper worship; Marduk therefore looked for a righteous ruler, chose Cyrus of Anshan, and delivered Babylon into his hands without a battle. Cyrus then presents himself restoring the sanctuaries, returning the divine images Nabonidus had gathered into the capital, and sending home the peoples who had been settled there.",
        ],
      },
      {
        heading: "Why Christians and Jews Care",
        paragraphs: [
          "Ezra 1:1-4 and 2 Chronicles 36:22-23 record a decree of Cyrus in his first year permitting the Jewish exiles to return to Jerusalem and rebuild the temple, and Ezra 6:3-5 records a memorandum in Aramaic ordering the temple rebuilt at royal expense and the confiscated temple vessels returned. Isaiah 44:28 and 45:1 go further, naming Cyrus as the LORD's shepherd and anointed, appointed to say of Jerusalem that it shall be built.",
          "The cylinder shows that returning gods and peoples to their sanctuaries was a policy Cyrus himself advertised — that the biblical decree fits the way this king actually governed and presented himself, rather than being an isolated favour invented after the fact. Persian administrative practice elsewhere backs the same picture. That is a real and useful corroboration of the kind of thing the Bible reports.",
        ],
      },
      {
        heading: "Two Overclaims Worth Refusing",
        paragraphs: [
          "The first is the one made in sermons: that the Cyrus Cylinder is the decree of Ezra 1, or that it mentions the Jews. It does not. The cylinder never names Judah, Jerusalem, the temple, or the Jewish exiles; the sanctuaries and peoples it describes restoring are Mesopotamian. It corroborates a pattern of policy, not a specific event, and the difference matters. Ezra's decree, if it existed in written form, would have been a separate document in a different language — which is roughly what Ezra 6 claims to be quoting from the Persian archives.",
          "The second overclaim comes from the other direction. In the 1970s the cylinder was widely promoted as \"the first charter of human rights,\" and a replica was presented to the United Nations on that basis. Historians of the ancient Near East have consistently rejected the description: the text is a conventional royal building inscription of a type known from centuries earlier, it grants no rights to anyone, and reading modern political categories into it flatters the object at the cost of understanding it. A find is best defended by describing it accurately.",
        ],
      },
    ],
    verses: [
      { reference: "2 Chronicles 36:22-23", note: "The decree of Cyrus closing the Hebrew Bible" },
      { reference: "Ezra 1:1-4", note: "Cyrus permits the exiles to return and rebuild" },
      { reference: "Ezra 6:3-5", note: "The Aramaic memorandum ordering the temple rebuilt and the vessels returned" },
      { reference: "Isaiah 44:28", note: "\"He is my shepherd, and shall perform all my pleasure\"" },
      { reference: "Isaiah 45:1", note: "Cyrus called the LORD's anointed" },
      { reference: "Daniel 5:30-31", note: "The night Babylon changes hands" },
    ],
    sources: [
      { label: "Bible Odyssey (SBL): Cyrus the Messiah", url: "https://www.bibleodyssey.org/articles/cyrus-the-messiah/" },
      { label: "Wikipedia: Cyrus Cylinder", url: "https://en.wikipedia.org/wiki/Cyrus_Cylinder" },
    ],
    discovery: {
      objectType: "Barrel-shaped baked clay foundation cylinder, about 22.5 cm long, in Akkadian cuneiform",
      findSite: "Babylon, Iraq. The precise findspot within the city is not recorded in the standard catalogues",
      findSiteId: "babylon",
      findSiteKind: "location",
      foundYear: "1879",
      foundBy: "Found during Hormuzd Rassam's excavations at Babylon for the British Museum. Rassam directed the dig; the individual who lifted it is not recorded",
      objectDate: "After 539 BC",
      objectDateCertainty: "firm",
      currentLocation: "British Museum, London (BM 90920)",
    },
    citations: [
      {
        tier: "institution",
        label: "Cuneiform Digital Library Initiative: artifact P386349 (BM 090920)",
        url: "https://cdli.mpiwg-berlin.mpg.de/artifacts/386349",
        credit: "Cuneiform Digital Library Initiative, Max Planck Institute for the History of Science",
        detail: "Records the object as a clay barrel, 225 x 100 x 100 mm, British Museum BM 090920, with the provenience field left blank",
        supports: "Material, form, dimensions, museum number — and that no findspot within Babylon is on record",
      },
      {
        tier: "reference",
        label: "The Getty: The Cyrus Cylinder and Ancient Persia",
        url: "https://www.getty.edu/art/exhibitions/cyrus_cylinder/",
        credit: "The J. Paul Getty Museum",
        detail: "Exhibition record: \"Terracotta, 22.9 x 10 cm\", \"Found at Babylon in 1879\", dated \"after 539 B.C.\"",
        supports: "The find year, the object's date and its dimensions",
      },
      {
        tier: "scholarly",
        label: "Irving Finkel (ed.), The Cyrus Cylinder: The King of Persia's Proclamation from Ancient Babylon",
        credit: "Irving Finkel, Keeper of Cuneiform Collections at the British Museum",
        detail: "London: I.B. Tauris, 2013 - the standard scholarly treatment, with a full translation and the case against the \"first charter of human rights\" label. Print only",
        supports: "The reading of the text, and the refusal of the human-rights framing in section three",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Cyrus the Messiah",
        url: "https://www.bibleodyssey.org/articles/cyrus-the-messiah/",
        credit: "Society of Biblical Literature",
        supports: "The relationship between the cylinder's policy and the decree of Ezra 1",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Cyrus Cylinder",
        url: "https://en.wikipedia.org/wiki/Cyrus_Cylinder",
      },
    ],
  },
  {
    id: "sennacherib-prism",
    name: "Sennacherib's Prism",
    // NOT registered: "the Prism" or bare "Sennacherib" (a person entry already owns the latter).
    alternateNames: [
      "Sennacherib Prism",
      "Taylor Prism",
      "Sennacherib's Annals",
      "Oriental Institute Prism",
      "Chicago Prism",
    ],
    category: "discovery",
    role: "Assyrian Royal Annals of the 701 BC Campaign Against Judah",
    summary:
      "A six-sided clay prism, surviving in three near-identical copies, on which Sennacherib of Assyria records shutting King Hezekiah up in Jerusalem \"like a bird in a cage\" — and conspicuously does not record taking the city.",
    sections: [
      {
        heading: "Three Copies of the Same Boast",
        paragraphs: [
          "Assyrian kings kept annals, and the grandest were inscribed on six-sided baked-clay prisms roughly 37 to 38 centimetres tall, buried in the foundations of palaces. Three substantially complete copies of Sennacherib's survive, and not one of them was excavated: every one reached its museum through the antiquities market. The Taylor Prism, named for Colonel Robert Taylor, the British Resident at Baghdad who acquired it, was the first known; the British Museum bought it in 1855 from Sir Henry Rawlinson, who had himself bought it from Taylor's widow. The Chicago Prism was purchased in Baghdad in 1919 and is at the Institute for the Study of Ancient Cultures at the University of Chicago. The third, the Jerusalem Prism, came through Sotheby's and was given to the Israel Museum from the Kevorkian Collection. The Taylor and Jerusalem prisms are dated to 691 BC and the Chicago Prism to 689 BC, and their accounts of the western campaign agree closely — which is itself informative, since this was an official version, copied and distributed.",
          "The section that concerns the Bible describes the third campaign, in 701 BC, against the west. Sennacherib says he took forty-six walled cities of Judah along with countless smaller settlements, deported a very large number of people, stripped Hezekiah of territory and handed it to Philistine rulers, and confined Hezekiah himself \"like a bird in a cage\" in Jerusalem, his royal city, throwing up earthworks against it. He then lists the tribute Hezekiah sent after him to Nineveh.",
        ],
      },
      {
        heading: "Reading It Alongside 2 Kings 18-19",
        paragraphs: [
          "The overlap with Scripture is unusually detailed. 2 Kings 18:13 reports that Sennacherib took all the fortified cities of Judah; the prism counts forty-six. 2 Kings 18:14-16 reports Hezekiah paying tribute, stripping the temple doors to do it; the prism lists the tribute. The two accounts agree on thirty talents of gold. They differ on the silver — 2 Kings says three hundred talents, the prism eight hundred — and the usual explanations are a different talent standard or a scribe's inflation, neither of which is provable.",
          "The most discussed feature of the prism is what is absent. Assyrian annals do not understate. When Sennacherib takes a city he says so, in detail, and burns it in the telling. Here he describes the siege works and the caged bird and then moves to the tribute, never claiming to have entered Jerusalem — which is exactly the outcome 2 Kings 19:32-36 describes, with the Assyrian army withdrawing without shooting an arrow into the city. That silence is a real point and worth making.",
        ],
      },
      {
        heading: "How Much Weight the Silence Carries",
        paragraphs: [
          "It carries some, and less than is usually claimed. The prism does not corroborate 2 Kings 19:35, the angel of the LORD striking the Assyrian camp; no Assyrian record would ever have said such a thing, and its absence is therefore not evidence either way. Nor is confinement without capture unusual: kings broke off sieges for supply, season, or a rebellion at home, and Sennacherib presents the tribute as the campaign's successful conclusion, which from his side it was. Herodotus preserves a separate and much later Egyptian story of Sennacherib's army being disabled by mice, which some historians take as a garbled memory of plague; it is late and secondhand and cannot bear much.",
          "What can be said plainly is this: two independent accounts, one Judean and one Assyrian, agree that in 701 BC Sennacherib devastated Judah, besieged Hezekiah in Jerusalem, took heavy tribute — and did not take the city. They disagree about why. That is a substantial and unusual convergence, and it is stronger stated at that size than stretched. Sennacherib's own palace at Nineveh, incidentally, carried a room-sized carved relief of his siege of Lachish, the Judean city named in 2 Kings 18:14 and 2 Chronicles 32:9; the reliefs are in the British Museum and show the assault in extraordinary detail.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 18:13-16", note: "Forty-six cities taken; Hezekiah's tribute, including the temple doors" },
      { reference: "2 Kings 18:17-37", note: "The Assyrian officers at the wall of Jerusalem" },
      { reference: "2 Kings 19:32-36", note: "The siege lifted; Sennacherib returns to Nineveh" },
      { reference: "2 Chronicles 32:1-23", note: "The Chronicler's account, naming the siege of Lachish" },
      { reference: "Isaiah 36:1-37:38", note: "Isaiah's parallel narrative of the same campaign" },
    ],
    sources: [
      { label: "Bible Odyssey (SBL): Babylonian Accounts of the Invasion of Judah", url: "https://www.bibleodyssey.org/articles/babylonian-accounts-of-the-invasion-of-judah/" },
      { label: "Wikipedia: Sennacherib's Annals", url: "https://en.wikipedia.org/wiki/Sennacherib%27s_Annals" },
    ],
    discovery: {
      objectType: "Six-sided baked clay prisms — the Taylor Prism 368 mm high, the Chicago Prism 380 mm",
      findSite: "Nineveh, northern Iraq. The catalogues give the findspot only as probable, and none of the three prisms has an excavation record",
      findSiteId: "nineveh",
      findSiteKind: "location",
      foundYear: "Not excavated. The Taylor Prism was in Colonel Robert Taylor's hands before 1855; the Chicago Prism was purchased in Baghdad in 1919",
      foundBy: "No finder is recorded for any of the three. The Taylor Prism is named for its owner, not its discoverer: the British Museum bought it in 1855 from Sir Henry Rawlinson, who had bought it from Taylor's widow. He ran no excavation",
      objectDate: "691 BC (Taylor and Jerusalem prisms); 689 BC (Chicago Prism)",
      objectDateCertainty: "firm",
      currentLocation: "British Museum, London (BM 91032); ISAC, University of Chicago (A2793); Israel Museum, Jerusalem (IMJ 71.72.249)",
      unprovenanced: true,
    },
    citations: [
      {
        tier: "institution",
        label: "ISAC, University of Chicago: 100 Highlights of the Collection — the Sennacherib Prism (A2793)",
        url: "https://isac-idb-static.uchicago.edu/multimedia/326167/MISC_100museumhighlights.pdf",
        credit: "Institute for the Study of Ancient Cultures, University of Chicago",
        detail: "The museum's own label: \"Baked clay\", \"Neo-Assyrian period, reign of Sennacherib, ca. 689 bc\", \"Purchased in Baghdad, 1919\", object number A2793",
        supports: "That the Chicago Prism was purchased rather than excavated, its date and its accession number",
      },
      {
        tier: "scholarly",
        label: "\"Who Owns the Octagonal Prism of Sennacherib, BM 103000? A Dealer's Dispute\"",
        url: "https://www.cambridge.org/core/journals/iraq/article/making-of-a-collection/3EC89827B527628B62F1DC2808B8BEF5",
        credit: "Reem Ait Said-Ghanem, in Iraq 85 (2023), British Institute for the Study of Iraq / Cambridge University Press",
        detail: "On the Sennacherib prisms and the market they came through. States that in 1855 the Taylor Prism (BM 91032) \"was purchased by the British Museum from Sir Henry Rawlinson\", who \"had himself bought it from Mrs Taylor, the widow of Colonel R. Taylor\" — correcting the common claim that the Museum bought it from the widow directly",
        supports: "The acquisition chain in section one, and that Taylor acquired rather than excavated the prism",
      },
      {
        tier: "primary",
        label: "Daniel David Luckenbill, The Annals of Sennacherib (Oriental Institute Publications 2, 1924)",
        url: "https://isac.uchicago.edu/sites/default/files/uploads/shared/docs/oip2.pdf",
        credit: "University of Chicago Oriental Institute",
        detail: "The standard edition and translation, freely downloadable; dates the Taylor Prism to the limmu of Bel-emuranni (691 BC) and the Oriental Institute Prism to the limmu of Gahilu (689 BC)",
        supports: "The text of the third campaign, and the dates of the two prisms",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Babylonian Accounts of the Invasion of Judah",
        url: "https://www.bibleodyssey.org/articles/babylonian-accounts-of-the-invasion-of-judah/",
        credit: "Society of Biblical Literature",
      },
    ],
  },
  {
    id: "black-obelisk",
    name: "Black Obelisk",
    alternateNames: ["Black Obelisk of Shalmaneser III", "Black Obelisk of Shalmaneser"],
    category: "discovery",
    role: "Assyrian Tribute Monument, c. 825 BC",
    summary:
      "A two-metre limestone pillar from Nimrud carrying five bands of carved tribute scenes — one of which is captioned with the name of an Israelite king, and is the only image we have of one.",
    sections: [
      {
        heading: "Layard's Obelisk",
        paragraphs: [
          "Austen Henry Layard's excavators uncovered the obelisk in 1846 at Nimrud, the Assyrian city the Bible calls Calah, during the digs that first brought Assyria back into European view. By Layard's own account he had just left the mound when a corner of dark stone appeared and the superintendent of the digging party ordered the spot opened up — so the moment of discovery, strictly, belongs to his workmen rather than to him. It is a slim four-sided pillar of black limestone, just under two metres tall and 45 centimetres to a face, with a stepped top, carved on all four faces with five registers of relief, each register running round the monument as a single scene of foreigners bringing tribute to Shalmaneser III. A cuneiform caption above each register says who is paying. It reached the British Museum in October 1848 and is there still.",
          "The second register from the top shows a man prostrate on the ground before the Assyrian king, with a line of bearers behind him carrying metal vessels and bars. The caption reads: \"Tribute of Jehu, son of Omri: I received from him silver, gold, a golden bowl, a golden vase with pointed bottom, golden tumblers, golden buckets, tin, a staff for a king, and wooden puruhtu.\"",
        ],
      },
      {
        heading: "Jehu, Son of Omri",
        paragraphs: [
          "Jehu is the army commander who, in 2 Kings 9-10, is anointed to destroy the house of Ahab, kills two kings in a single day, and wipes out Omri's dynasty root and branch. So \"son of Omri\" looks like a mistake — Jehu was emphatically not Omri's son, and had killed the last of his line. It is not a mistake. Assyrian scribes routinely named a kingdom after the dynasty that founded it and kept the label long after the dynasty was gone; Israel appears in Assyrian records as \"the house of Omri\" for over a century. The caption means roughly \"Jehu of the land of Omri.\"",
          "The date is around 841 BC, early in Jehu's reign, and the payment fits a moment when Assyria was pressing hard on Damascus and a new king in Samaria had every reason to buy protection. The Bible does not mention this tribute at all — 2 Kings simply does not record it, which is a useful reminder that the biblical historians were selecting, not transcribing.",
        ],
      },
      {
        heading: "Is That Actually Jehu?",
        paragraphs: [
          "The figure on the ground is often described as the only surviving picture of a named king of Israel, and that is probably right, but it is worth stating the caveat that specialists state. Assyrian tribute reliefs frequently depict a delegation rather than the ruler in person, and it is entirely possible that the prostrate figure is Jehu's envoy delivering Jehu's tribute. The caption names the tribute, not the man's face. Most scholars still take the figure as Jehu himself, and the register is fairly described that way, but with \"probably\" in the sentence rather than left out of it.",
          "What is not in doubt is the name. A contemporary Assyrian monument, cut within a few years of the events of 2 Kings 9-10, names a king of Israel called Jehu and locates him in the land of Omri. Alongside the Mesha Stele's Omri and the Tel Dan Stele's kings, it puts the ninth-century royal houses of Israel and Judah firmly into the documented history of the ancient Near East.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 9:1-13", note: "Jehu anointed king over Israel" },
      { reference: "2 Kings 10:28-36", note: "Jehu's reign, and Hazael's pressure on Israel's borders" },
      { reference: "1 Kings 16:21-28", note: "Omri, whose dynastic name Assyria kept using" },
      { reference: "Genesis 10:11-12", note: "Calah, the Assyrian city where the obelisk was found" },
    ],
    sources: [
      { label: "Wikipedia: Black Obelisk of Shalmaneser III", url: "https://en.wikipedia.org/wiki/Black_Obelisk_of_Shalmaneser_III" },
      { label: "Bible Odyssey (SBL): Kingdom of Israel", url: "https://www.bibleodyssey.org/articles/kingdom-of-israel/" },
    ],
    discovery: {
      objectType: "Four-sided black limestone obelisk with a stepped top, just under 2 m tall and 45 cm to a face, carved with five registers of tribute reliefs",
      findSite: "The centre of the citadel mound at Nimrud (ancient Kalhu), northern Iraq",
      foundYear: "1846",
      foundBy: "Austen Henry Layard's excavators. Layard had left the mound when the stone was struck; the superintendent of the digging party ordered it uncovered",
      objectDate: "Erected 825 BC",
      objectDateCertainty: "firm",
      currentLocation: "British Museum, London (BM 118885), where it arrived in October 1848",
    },
    citations: [
      {
        tier: "institution",
        label: "Nimrud: Materialities of Assyrian Knowledge Production — the Black Obelisk",
        url: "https://oracc.museum.upenn.edu/nimrud/livesofobjects/blackobelisk/index.html",
        credit: "The Nimrud Project (University College London), published on Oracc",
        detail: "\"a monument (or stela) carved from black limestone, which stands just under two metres high. It has four sides, each 45 cm wide\"; erected 825 BC; arrived at the British Museum in October 1848 as ME 118885",
        supports: "The material, dimensions, erection date, museum number and arrival date",
      },
      {
        tier: "institution",
        label: "The Nimrud Project: the discovery of the Black Obelisk",
        url: "https://oracc.museum.upenn.edu/nimrud/livesofobjects/blackobelisk/obeliskdiscovery/index.html",
        credit: "The Nimrud Project (University College London), published on Oracc",
        detail: "Quotes Layard's own account: he \"had scarcely left the mound, when a corner of black marble was uncovered\", noticed by \"the superintendent of the party digging\"",
        supports: "That the find belongs to Layard's workmen, and that Layard's own word for the stone was marble",
      },
      {
        tier: "primary",
        label: "Austen Henry Layard, Nineveh and Its Remains (1849)",
        url: "https://archive.org/details/ninevehanditsre05layagoog",
        credit: "Austen Henry Layard",
        detail: "The excavator's own published account of the Nimrud digs, including the discovery of the obelisk. Public domain, full text at the Internet Archive",
        supports: "Layard's first-hand account of how the obelisk came to light",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Kingdom of Israel",
        url: "https://www.bibleodyssey.org/articles/kingdom-of-israel/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Black Obelisk of Shalmaneser III",
        url: "https://en.wikipedia.org/wiki/Black_Obelisk_of_Shalmaneser_III",
      },
    ],
  },
  {
    id: "siloam-inscription",
    name: "Siloam Inscription",
    // NOT registered: "Siloam" alone — the Pool of Siloam POI already owns that name, and every
    // alias here is longer, so the specific inscription still wins where it is named in full.
    alternateNames: ["Siloam Tunnel Inscription", "Shiloah Inscription"],
    category: "discovery",
    role: "Paleo-Hebrew Engineering Inscription, c. 700 BC",
    summary:
      "Six lines carved into the wall of Hezekiah's Tunnel under Jerusalem, describing the moment two teams of quarrymen digging from opposite ends heard each other's voices through the rock.",
    sections: [
      {
        heading: "Found by a Boy in the Water",
        paragraphs: [
          "Hezekiah's Tunnel runs about 533 metres under the City of David, cut through solid limestone to carry water from the Gihon Spring, outside the wall, to the Pool of Siloam inside it. People have waded it for centuries. In 1880 a schoolboy exploring the tunnel with a friend slipped in the water a few metres from the Siloam end and, getting up, noticed cut letters on the wall below the waterline. They turned out to be six lines of paleo-Hebrew — the older script Israel used before the exile — in a smoothed panel prepared for the purpose.",
          "Credit for the find is worth handling carefully, because the version usually printed is tidier than the record. The boy told his teacher, the architect and surveyor Conrad Schick, who went back with him, documented the inscription properly, and published it — and it was Schick who became known as its discoverer while the boy stayed anonymous. The name now attached to the boy, Jacob Eliyahu, comes from a claim made years afterwards by Bertha Spafford Vester of the American Colony, who said the finder was her adopted brother. That is the basis for the name, and it is a later recollection rather than a contemporary record.",
          "The text is not a royal proclamation. It is the workmen's account of their own job: while three cubits still remained to be cut through, each man's voice could be heard calling to his fellow through the rock; on the day of the breakthrough the quarrymen struck each toward the other, pick against pick; and the water flowed from the spring to the pool, twelve hundred cubits, with a hundred cubits of rock above the workers' heads. It is one of the longest monumental Hebrew inscriptions known, and among the most human.",
        ],
      },
      {
        heading: "Hezekiah's Water Project",
        paragraphs: [
          "2 Kings 20:20 says Hezekiah made the pool and the conduit and brought water into the city; 2 Chronicles 32:30 says he stopped the upper spring of Gihon and brought it straight down on the west side of the City of David, and that he did it because Sennacherib was coming. The tunnel matches that description well — it takes an oddly winding S-shaped course, it was cut from both ends at once, which is what you do when you are in a hurry, and it moves the city's water supply out of an attacker's reach.",
          "The inscription itself, though, names nobody. There is no king in it, no date, no dedication — which is unusual enough that scholars have suggested the workmen cut it themselves rather than an official ordering it. So the connection to Hezekiah rests on the tunnel's identification, the script's date, and the biblical notice, not on the stone saying so.",
        ],
      },
      {
        heading: "The Dating Challenge, and How It Was Settled",
        paragraphs: [
          "In 1996 John Rogerson and Philip Davies argued that the letter forms fit the Hasmonean period, some five centuries later than Hezekiah, and that the tunnel had been misdated. Almost every specialist in Hebrew epigraphy rejected the proposal — the script is a good fit for the late eighth century and a poor one for the second — but it was a serious challenge that had to be answered on more than authority. It was: in 2003 a team led by Amos Frumkin radiocarbon-dated organic material in the tunnel's original plaster and uranium-thorium-dated stalactites formed in it, and both methods placed the cutting around 700 BC. The traditional dating is now unusually well anchored for an ancient inscription.",
          "The stone did not fare so well. About ten years after it was found, an antiquities dealer cut it out of the tunnel wall to sell it, breaking it into several pieces in the process; the Ottoman authorities tracked him down, confiscated the fragments, and sent them to Istanbul, where the inscription has been ever since. Israel has repeatedly asked for its return. What visitors see in the tunnel today is the empty scar where it was.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 20:20", note: "\"He made the pool, and the conduit, and brought water into the city\"" },
      { reference: "2 Chronicles 32:2-4", note: "Stopping the springs so the Assyrians would find no water" },
      { reference: "2 Chronicles 32:30", note: "Gihon's waters brought down to the west side of the City of David" },
      { reference: "Isaiah 22:9-11", note: "Isaiah on Jerusalem's water works, and on trusting the engineering rather than its Maker" },
      { reference: "John 9:1-11", note: "The Pool of Siloam, the tunnel's outlet, centuries later" },
    ],
    sources: [
      { label: "Wikipedia: Siloam inscription", url: "https://en.wikipedia.org/wiki/Siloam_inscription" },
      { label: "Bible Odyssey (SBL): Jerusalem", url: "https://www.bibleodyssey.org/articles/jerusalem/" },
    ],
    discovery: {
      objectType: "Six lines of paleo-Hebrew cut into a smoothed limestone panel in the tunnel wall",
      findSite: "Hezekiah's Tunnel, City of David, Jerusalem — about six metres from the Pool of Siloam end",
      findSiteId: "city-of-david",
      findSiteKind: "poi",
      foundYear: "1880",
      foundBy: "A schoolboy, whose teacher Conrad Schick documented and published the find and was long credited with it. The boy is identified as Jacob Eliyahu on the later testimony of Bertha Spafford Vester, not on a contemporary record",
      objectDate: "c. 700 BC",
      objectDateCertainty: "firm",
      currentLocation: "Istanbul Archaeological Museums",
    },
    citations: [
      {
        tier: "institution",
        label: "City of David: The Siloam Inscription",
        url: "https://cityofdavid.org.il/en/the-siloam-inscription-eng/",
        credit: "Ir David Foundation, which operates the City of David archaeological site",
        detail: "Gives the 1880 discovery by a schoolboy, Schick's role and fame, Bertha Spafford Vester's later identification of the boy, and the removal and transfer to Istanbul",
        supports: "The find story, the contested credit and the inscription's present home",
      },
      {
        tier: "scholarly",
        label: "Amos Frumkin, Aryeh Shimron and Jeff Rosenbaum, \"Radiometric dating of the Siloam Tunnel, Jerusalem\"",
        url: "https://doi.org/10.1038/nature01875",
        credit: "Amos Frumkin, Aryeh Shimron and Jeff Rosenbaum",
        detail: "Nature 425:6954 (2003), 169-171 — radiocarbon on plaster organics and uranium-thorium on speleothems, both giving an Iron Age II date",
        supports: "That the tunnel dates to around 700 BC, against the proposed Hasmonean date",
        paywalled: true,
      },
      {
        tier: "scholarly",
        label: "J. W. Rogerson and P. R. Davies, \"Was the Siloam Tunnel Built by Hezekiah?\"",
        credit: "J. W. Rogerson and P. R. Davies",
        detail: "The Biblical Archaeologist 59:3 (1996) — the Hasmonean redating this section describes and answers. A rejoinder by Ronald S. Hendel followed in the same journal, 59:4",
        supports: "The dating challenge named in section three, cited to the scholarship that actually made it",
        paywalled: true,
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Siloam inscription",
        url: "https://en.wikipedia.org/wiki/Siloam_inscription",
      },
    ],
  },
  {
    id: "dead-sea-scrolls",
    name: "Dead Sea Scrolls",
    // NOT registered: "the Scrolls", "Qumran" (a POI owns that). "Isaiah Scroll" is registered even
    // though "Isaiah" is a person entry — the two-word alias is longer, and NAME_ENTRIES is sorted
    // longest-first, so a bare "Isaiah" still resolves to the prophet.
    alternateNames: ["Qumran Scrolls", "Great Isaiah Scroll", "Isaiah Scroll"],
    category: "manuscript",
    role: "Jewish Manuscripts from the Judean Desert, c. 250 BC - AD 70",
    summary:
      "Roughly a thousand manuscripts recovered from eleven caves near the Dead Sea between 1947 and 1956, including copies of almost every Old Testament book a thousand years older than anything previously known.",
    sections: [
      {
        heading: "What Was Found",
        paragraphs: [
          "The first scrolls came to light in 1947, when Bedouin shepherds found jars in a cave in the cliffs above Qumran, near the northwest corner of the Dead Sea. Over the next nine years ten more caves were emptied, some by archaeologists and some by the Bedouin, producing the remains of perhaps 900 to 1,000 manuscripts — a handful nearly complete, the vast majority in tens of thousands of fragments, some no larger than a fingernail. Related finds came from Masada, Wadi Murabba'at, and Nahal Hever nearby.",
          "About a quarter are copies of books of the Hebrew Bible; every book except Esther is represented. The rest are other Jewish writings of the period: commentaries, psalms and hymns outside the Psalter, calendars, the community's own rule books, and works such as Jubilees and 1 Enoch. The best-preserved is the Great Isaiah Scroll, a complete copy of Isaiah on seventeen sheets of leather, dated to about 125 BC and now in the Shrine of the Book at the Israel Museum.",
        ],
      },
      {
        heading: "Why They Changed the Picture",
        paragraphs: [
          "Before 1947, the oldest substantially complete Hebrew Bible manuscripts were medieval — the Aleppo Codex and the Leningrad Codex, from the tenth and eleventh centuries AD. The Isaiah Scroll is roughly a thousand years older. That leap is the single most important thing about the discovery: for the first time it was possible to test whether the text Jews and Christians had been reading matched what was actually circulating in the Second Temple period, rather than assuming it.",
          "The scrolls also transformed the study of the world Jesus was born into. They give a Jewish community's own words about scripture, purity, priesthood, the calendar, and the expectation of God's decisive intervention — not filtered through a later writer's summary. Understanding first-century Judaism as a set of arguments rather than a single settled system owes a great deal to these texts.",
        ],
      },
      {
        heading: "Being Careful About What They Prove",
        paragraphs: [
          "The claim heard most often is that the Isaiah Scroll is word-for-word identical to the Bible we read, proving the text was transmitted perfectly. That overstates it, and the true version is more interesting. The Great Isaiah Scroll agrees with the medieval Masoretic text to a remarkable degree, but it carries something on the order of 1,300 differences — overwhelmingly spelling, word order, and grammatical forms, of the kind that do not change meaning, plus a small number of genuine variants that translators note. The honest summary is that a thousand years of copying introduced far less change than anyone had a right to expect, and that this is a strong result rather than a perfect one.",
          "Two other cautions. First, the scrolls do not show one fixed text; some biblical books circulated in more than one edition. The Jeremiah copies from Cave 4 include a substantially shorter form of the book matching the Greek Septuagint — evidence that the differences between the Hebrew and Greek Bibles go back to real ancient Hebrew editions rather than to careless Greek translators. Second, there is no New Testament among the scrolls. A proposal in the 1970s that a scrap from Cave 7 preserved a few letters of Mark's Gospel attracted headlines and has been rejected by nearly all specialists. And the identification of the Qumran community with the Essenes described by Josephus and Pliny, though still the majority view, is genuinely contested.",
        ],
      },
    ],
    verses: [
      { reference: "Isaiah 53:1-12", note: "The Suffering Servant, preserved complete in a copy from c. 125 BC" },
      { reference: "Jeremiah 36:1-32", note: "Jeremiah's scroll — a book the caves preserve in two different lengths" },
      { reference: "Psalms 119:105", note: "The Psalms are among the most-copied books in the caves" },
      { reference: "Luke 4:16-21", note: "Jesus reading Isaiah aloud in the synagogue, a century after the Isaiah Scroll was copied" },
    ],
    sources: [
      { label: "Text & Canon Institute: How Much Can the Most Famous Dead Sea Scroll Prove?", url: "https://textandcanon.org/how-much-can-the-most-famous-dead-sea-scroll-prove/" },
      { label: "Text & Canon Institute: Appreciating the Diverse Evidence from the Dead Sea Scrolls", url: "https://textandcanon.org/appreciating-the-diverse-evidence-from-the-dead-sea-scrolls/" },
      { label: "The Israel Museum: The Shrine of the Book", url: "https://www.imj.org.il/en/wings/shrine-book/dead-sea-scrolls" },
      { label: "The Leon Levy Dead Sea Scrolls Digital Library", url: "https://www.deadseascrolls.org.il/" },
    ],
    manuscript: {
      manuscriptType: "Leather and papyrus scrolls, a handful nearly complete and the rest in tens of thousands of fragments",
      language: "Hebrew, Aramaic and Greek",
      contents:
        "The remains of roughly 900 to 1,000 manuscripts. About a quarter are copies of books of the Hebrew Bible, with every book except Esther represented; the rest are other Jewish writings of the period. The best preserved is the Great Isaiah Scroll, 54 columns carrying all 66 chapters of Isaiah — the only biblical scroll from the caves that is almost complete",
      origin: "Copied in Judea; some scrolls were probably brought to the caves from elsewhere",
      findSite: "Eleven caves in the cliffs near Qumran, above the north-west shore of the Dead Sea",
      foundYear: "1947-1956",
      foundBy:
        "Bedouin shepherds of the Ta'amireh tribe found the first cave in 1947; the other ten caves were emptied over the next nine years by Bedouin and archaeologists alike. The name usually given for the first finder is traditional and is not documented by either holding institution",
      dateAssigned: "c. 250 BC - AD 68",
      dateCertainty: "traditional",
      currentLocation:
        "The Shrine of the Book at the Israel Museum, Jerusalem, and the Israel Antiquities Authority; some material is held outside Israel",
      facsimileUrl: "https://www.deadseascrolls.org.il/",
    },
    citations: [
      {
        tier: "institution",
        label: "Israel Antiquities Authority, Leon Levy Digital Library: Discovery and Publication",
        url: "https://www.deadseascrolls.org.il/learn-about-the-scrolls/discovery-and-publication",
        credit: "Israel Antiquities Authority",
        detail: "Gives the 1947 find by a Bedouin shepherd, ten further caves over the following nine years, and the remains of over 900 manuscripts",
        supports: "The discovery years, the number of caves and the size of the corpus",
      },
      {
        tier: "institution",
        label: "Israel Museum, The Digital Dead Sea Scrolls: The Great Isaiah Scroll",
        url: "http://dss.collections.imj.org.il/isaiah",
        credit: "The Israel Museum, Jerusalem — Shrine of the Book",
        detail: "The museum's own object label: Qumran Cave 1, 1st century BCE, parchment, H 22-25 cm, L 734 cm, accession HU 95.57/27. Note that this site is served over http only",
        supports: "The Great Isaiah Scroll's dimensions, findspot, date and accession number",
      },
      {
        tier: "scholarly",
        label: "Discoveries in the Judaean Desert, 40 volumes",
        credit: "Oxford: Clarendon Press, 1955-2009",
        detail: "The official edition of the scrolls, volume by volume - the publication record behind every claim made about their contents. Print only",
        supports: "The contents of the corpus, including the two editions of Jeremiah discussed in section three",
      },
      {
        tier: "reference",
        label: "Text & Canon Institute: How Much Can the Most Famous Dead Sea Scroll Prove?",
        url: "https://textandcanon.org/how-much-can-the-most-famous-dead-sea-scroll-prove/",
        credit: "Text & Canon Institute, Phoenix Seminary",
        supports: "The count of differences between the Great Isaiah Scroll and the Masoretic text in section three",
      },
      {
        tier: "reference",
        label: "Text & Canon Institute: Appreciating the Diverse Evidence from the Dead Sea Scrolls",
        url: "https://textandcanon.org/appreciating-the-diverse-evidence-from-the-dead-sea-scrolls/",
        credit: "Text & Canon Institute, Phoenix Seminary",
        supports: "That some biblical books circulated at Qumran in more than one edition",
      },
    ],
  },
  {
    id: "rylands-papyrus-p52",
    name: "Rylands Papyrus P52",
    // "P52" is registered deliberately, and required a one-line fix in verseAnnotations.ts: any match
    // containing a digit was previously assumed to be a Bible verse reference. NOT registered:
    // "Rylands" alone (a library and a person), "P45"/"P46"/"P47" (too short and generic to match
    // safely on whole words).
    alternateNames: [
      "John Rylands Library Papyrus P52",
      "Rylands Library Papyrus P52",
      "John Rylands Papyrus",
      "Rylands Papyrus",
      "Rylands Fragment",
      "P52",
    ],
    category: "manuscript",
    role: "Second-Century Greek Fragment of John's Gospel",
    summary:
      "A scrap of papyrus the size of a credit card, carrying a few lines of John 18 on both sides — for ninety years the earliest identified piece of any New Testament book.",
    sections: [
      {
        heading: "A Scrap in a Drawer",
        paragraphs: [
          "On the standard account, Bernard Grenfell bought a batch of papyri in Egypt for the John Rylands Library in Manchester in 1920, and they sat unsorted for over a decade until Colin H. Roberts, working through them, recognised Greek text on a fragment 8.9 centimetres by 6.0. Roberts published it in 1935. The library's own catalogue record is more cautious than the retellings and credits only \"the first editor,\" without naming him or dating the purchase — a small reminder that even a famous find's backstory can be thinner than it sounds. What is on the fragment is not in doubt: on one side parts of John 18:31-33, Pilate's exchange with the Jewish leaders and his question \"Are you the King of the Jews?\"; on the other, parts of John 18:37-38, ending near \"What is truth?\"",
          "That it is written on both sides matters as much as what it says. A scroll is written on one side; a codex — a book with leaves — is written on both. So this fragment is a leaf from a bound book, in provincial Egypt, of a Gospel. Christians adopted the codex for their scriptures far earlier and far more completely than the surrounding literary culture did, and P52 is one of the pieces of evidence for how early that habit began.",
        ],
      },
      {
        heading: "The Date, and the Argument About It",
        paragraphs: [
          "Roberts dated the hand to the first half of the second century, around AD 125, comparing the letter forms to dated documentary papyri. That figure has been repeated in study Bibles and apologetics ever since, usually with the conclusion that John's Gospel must have been written and circulating well before AD 100 — which was a genuinely useful point when the fashionable scholarly dating put John in the mid-second century.",
          "Since then the confidence has been trimmed, and by textual scholars rather than by sceptics of Christianity. In 2005 Brent Nongbri argued in detail that palaeography — dating a manuscript by the shape of its handwriting — simply cannot narrow an undated literary hand to a twenty-five-year window, and that the comparanda Roberts used are consistent with a range running from the early second century into the early third. The John Rylands Library's own record now says the first editor's date was 100-150 CE and that \"recent research points to a date nearer to 200 CE.\" It remains among the earliest identified New Testament fragments; it is no longer safe to treat it as a precisely dated one, and the holding library has stopped doing so.",
        ],
      },
      {
        heading: "What It Is Good For",
        paragraphs: [
          "A reader could be forgiven for asking what is left. Quite a lot, provided the claim is sized correctly. A copy of John's Gospel — not the original, but a copy, in codex form, made by someone who was not a professional scribe — was in circulation in a provincial town far up the Nile, hundreds of miles from Ephesus, at a date almost certainly within the second century and possibly early in it. Copies take time to travel and time to be made. That is real evidence about how early and how widely this Gospel spread, and it does not depend on pinning a year.",
          "It is also worth noticing what the fragment does not do. It preserves a few dozen legible letters; it tells us nothing about the rest of John's text, and it cannot by itself establish that the Gospel we read is what was written. The case for the New Testament's textual reliability rests on the sheer number and spread of manuscripts, of which this is one very early and very small piece. The fragment is on display at the John Rylands Library in Manchester.",
        ],
      },
    ],
    verses: [
      { reference: "John 18:31-33", note: "The recto: \"Are you the King of the Jews?\"" },
      { reference: "John 18:37-38", note: "The verso: \"What is truth?\"" },
      { reference: "John 21:24-25", note: "The Gospel's own closing claim about its writing" },
    ],
    sources: [
      { label: "Text & Canon Institute: Dating Ancient Greek Manuscripts with the Help of Modern Software", url: "https://textandcanon.org/dating-ancient-greek-manuscripts-with-the-help-of-modern-software/" },
      { label: "The John Rylands Research Institute and Library, Manchester", url: "https://www.library.manchester.ac.uk/rylands/" },
      { label: "Wikipedia: Rylands Library Papyrus P52", url: "https://en.wikipedia.org/wiki/Rylands_Library_Papyrus_P52" },
    ],
    manuscript: {
      siglum: "P52 (P.Ryl. III 457)",
      manuscriptType: "Papyrus codex leaf, 8.9 x 6.0 cm, written on both sides",
      language: "Koine Greek",
      contents:
        "Parts of John 18:31-33 on one side and John 18:37-38 on the other — a few dozen legible letters in all, from a page that would have held about eighteen lines",
      origin: "Unknown; Egypt on general grounds, but the library's record names no place of production",
      findSite: "Not recorded. The fragment came to Manchester in a purchased batch of papyri, not from an excavation",
      foundYear: "Acquired in Egypt about 1920 and identified in the library's holdings in the 1930s, on the standard account; the library's own record dates neither",
      foundBy: "Recognised by Colin H. Roberts, who published it in 1935. The library's catalogue credits only \"the first editor\"",
      dateAssigned: "Conventionally c. AD 125, from the first editor's range of AD 100-150. Manchester's own record now says recent research points to a date nearer AD 200",
      dateCertainty: "disputed",
      currentLocation: "The John Rylands Library, University of Manchester",
      shelfmark: "Greek P 457",
      facsimileUrl: "https://www.digitalcollections.manchester.ac.uk/view/MS-GREEK-P-00457/1",
    },
    citations: [
      {
        tier: "institution",
        label: "The University of Manchester Library: Papyri, Greek P 457",
        url: "https://www.digitalcollections.manchester.ac.uk/view/MS-GREEK-P-00457/1",
        credit: "The John Rylands Library, University of Manchester",
        detail:
          "The holding library's own record and images: \"John, Chapter 18, verses 31-33 (recto) and 37-38 (verso)\", \"only measures 8.9 x 6.0 cm\", \"would have been part of a codex\", and \"Recent research points to a date nearer to 200 CE\"",
        supports: "The contents, dimensions, codex format, shelfmark and the library's current dating",
      },
      {
        tier: "scholarly",
        label: "Brent Nongbri, \"The Use and Abuse of P52: Papyrological Pitfalls in the Dating of the Fourth Gospel\"",
        url: "https://www.cambridge.org/core/journals/harvard-theological-review/article/abs/use-and-abuse-of-p52-papyrological-pitfalls-in-the-dating-of-the-fourth-gospel/676A4EA909EB03046F89DB8CE1F050BE",
        credit: "Brent Nongbri",
        detail: "Harvard Theological Review 98:1 (2005), 23-48; DOI 10.1017/S0017816005000842",
        supports: "The argument in section two that palaeography cannot narrow this hand to a twenty-five-year window",
        paywalled: true,
      },
      {
        tier: "reference",
        label: "Text & Canon Institute: Dating Ancient Greek Manuscripts with the Help of Modern Software",
        url: "https://textandcanon.org/dating-ancient-greek-manuscripts-with-the-help-of-modern-software/",
        credit: "Text & Canon Institute, Phoenix Seminary",
        supports: "How manuscripts of this kind are dated, and how uncertain the method is",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Rylands Library Papyrus P52",
        url: "https://en.wikipedia.org/wiki/Rylands_Library_Papyrus_P52",
      },
    ],
  },
  {
    id: "chester-beatty-papyri",
    name: "Chester Beatty Papyri",
    alternateNames: ["Chester Beatty Biblical Papyri"],
    category: "manuscript",
    role: "Third-Century Greek Biblical Codices",
    summary:
      "Eleven papyrus codices bought on the Egyptian antiquities market in the 1930s, which pushed the surviving manuscript evidence for the New Testament back by well over a century in a single stroke.",
    sections: [
      {
        heading: "A Mining Magnate's Purchase",
        paragraphs: [
          "Alfred Chester Beatty was an American-born mining engineer who made a fortune in copper and spent a great deal of it collecting manuscripts. In the early 1930s, with further leaves following in the middle of the decade, he acquired the remains of eleven papyrus codices containing Greek biblical texts. The library's own records say only that he acquired them; the widely repeated account that they came through Cairo dealers is secondary. What is not in dispute is that no excavation produced them and their scribes and place of production are recorded as unknown, which is a real limitation on what can be said about where and how they were used. Most are in the Chester Beatty in Dublin; some leaves from the same codices ended up at the University of Michigan.",
          "Three matter most for the New Testament, and the honest way to describe them is by what survives rather than by what they once were. P45 held all four Gospels and Acts, and 30 of its original 112 leaves survive — the earliest undeniable four-gospel codex. P46 is the oldest substantially complete copy of Paul's letters: 86 of its original 112 folios survive, 56 in Dublin and 30 at Michigan. P47 preserves a continuous run of Revelation 9:10 to 17:2, and is the earliest substantial papyrus of that book. All three are dated to the third century AD. Others in the group preserve Old Testament books in Greek, including Genesis, Numbers, Deuteronomy, Isaiah, Jeremiah, Ezekiel, Daniel, and Esther.",
        ],
      },
      {
        heading: "What They Changed",
        paragraphs: [
          "Until these codices appeared, the earliest substantial New Testament manuscripts were the great fourth-century parchment Bibles, Codex Sinaiticus and Codex Vaticanus. The Chester Beatty papyri are roughly 150 years older, and they are not scraps — P46 alone preserves eighty-six leaves. For the first time scholars could see what the text looked like well before the fourth century, and the answer was reassuring in the way that matters: substantially the same text, with the same kinds of ordinary copying variations already present.",
          "P46 also shows something about the shape of the collection. It is a single codex gathering Paul's letters together as a set, around AD 200 — evidence that the letters were being read and copied as a body long before any church council pronounced on a canon. In P46 Hebrews follows Romans, an arrangement not used later, which is a small window onto how fluid the ordering still was.",
        ],
      },
      {
        heading: "One Argument to Handle Carefully",
        paragraphs: [
          "P46's surviving leaves do not include 1 and 2 Timothy or Titus, and this is sometimes presented as evidence that those letters were not yet regarded as Paul's, or not yet written. The inference is weaker than it sounds. The codex is incomplete at both ends, and the argument depends on reconstructing how many leaves are missing and how much text would have fitted on them — a calculation scholars have run to opposite conclusions, since the scribe's handwriting shrinks as he goes, apparently realising he was running out of room. Some conclude there was no space for the Pastorals; others that there may have been. It is a genuinely open question and should be described as one.",
          "More generally, these codices are working copies, not showpieces: they have corrections, they have mistakes, and their scribes vary in skill. That is what makes them valuable. A manuscript tradition that shows its own ordinary human wear is a tradition that can be studied and reconstructed, and the discipline of textual criticism exists precisely to do that work in the open.",
        ],
      },
    ],
    verses: [
      { reference: "Romans 1:1-7", note: "P46 opens Paul's collected letters with Romans" },
      { reference: "Hebrews 1:1-4", note: "In P46, Hebrews follows immediately after Romans" },
      { reference: "Revelation 1:1-8", note: "Preserved in part by P47" },
      { reference: "2 Timothy 3:16-17", note: "From the Pastoral Epistles, whose absence from P46's surviving leaves is debated" },
    ],
    sources: [
      { label: "Text & Canon Institute: Lessons from the \"First-Century Mark\" Saga", url: "https://textandcanon.org/lessons-from-the-first-century-mark-saga/" },
      { label: "The Chester Beatty, Dublin", url: "https://chesterbeatty.ie/" },
      { label: "Wikipedia: Chester Beatty Papyri", url: "https://en.wikipedia.org/wiki/Chester_Beatty_Papyri" },
    ],
    manuscript: {
      siglum: "P45, P46, P47 (Chester Beatty Biblical Papyri I, II and III)",
      manuscriptType: "Papyrus codices, written in an uncial hand",
      language: "Koine Greek",
      contents:
        "Eleven codices in all. P45: the four Gospels and Acts, of which 30 of the original 112 leaves survive. P46: the Pauline letters, of which 86 of the original 112 folios survive — 56 in Dublin and 30 at the University of Michigan; the surviving leaves do not include 1-2 Timothy or Titus. P47: a continuous run of Revelation 9:10-17:2. The rest preserve Old Testament books in Greek",
      origin: "Unknown — the Chester Beatty records the scribe and place of production as unknown; the codices are generally taken to be Egyptian",
      findSite: "Not excavated. No findspot is recorded",
      foundYear: "Acquired in the early 1930s, with further leaves of P46 in the mid-1930s",
      foundBy: "Alfred Chester Beatty, by purchase. No finder or excavator is on record",
      dateAssigned: "Third century AD",
      dateCertainty: "traditional",
      currentLocation: "The Chester Beatty, Dublin (CBL BP I, II and III), with 30 leaves of P46 at the University of Michigan",
    },
    citations: [
      {
        tier: "institution",
        label: "The Chester Beatty, Dublin: catalogue records for BP I, BP II and BP III",
        url: "https://chesterbeatty.ie/",
        credit: "The Chester Beatty, Dublin",
        detail: "The library's own catalogue descriptions give the third-century date, the surviving leaf counts (30 of 112 for P45; 86 of 112 for P46, split 56 Dublin / 30 Michigan), the extent of P47 as Revelation 9:10-17:2, and scribe and production place as \"Unknown\". Its online viewer was returning errors when this article was checked",
        supports: "The contents, the honest surviving extents, the date and the split with Michigan",
      },
      {
        tier: "scholarly",
        label: "Frederic G. Kenyon, The Chester Beatty Biblical Papyri: Descriptions and Texts",
        credit: "Frederic G. Kenyon",
        detail: "London: Emery Walker, 1933-1941 — the first edition of the whole group, in eight fascicles. Print only",
        supports: "The identification and first publication of the codices",
      },
      {
        tier: "reference",
        label: "Text & Canon Institute: Lessons from the \"First-Century Mark\" Saga",
        url: "https://textandcanon.org/lessons-from-the-first-century-mark-saga/",
        credit: "Text & Canon Institute, Phoenix Seminary",
        supports: "Why the dating of early papyri needs to be stated carefully",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Chester Beatty Papyri",
        url: "https://en.wikipedia.org/wiki/Chester_Beatty_Papyri",
      },
    ],
  },
  {
    id: "codex-sinaiticus",
    name: "Codex Sinaiticus",
    alternateNames: ["Sinaiticus"],
    category: "manuscript",
    role: "Fourth-Century Greek Bible",
    summary:
      "A parchment Bible written around the middle of the AD 300s at St Catherine's Monastery on Mount Sinai, containing the oldest surviving complete copy of the New Testament — and now divided between four institutions in four countries.",
    sections: [
      {
        heading: "Tischendorf at Sinai",
        paragraphs: [
          "Constantin von Tischendorf, a German scholar hunting for early biblical manuscripts, visited St Catherine's Monastery at the foot of Mount Sinai in 1844 and left with forty-three leaves of a very old Greek Bible, which he deposited at Leipzig. He returned in 1853 and found nothing more. On a third visit in 1859, backed by the Russian tsar, he was shown the bulk of the manuscript, and it travelled to St Petersburg. In December 1933 the Soviet government sold the Russian portion to the British Museum, the purchase completed in 1934 with help from the British government and a national subscription; it is now in the British Library. The price is usually given as £100,000, a figure that comes from press reports of the sale rather than from either institution's own account of it.",
          "The codex is written on fine parchment in a formal script by three or four scribes, with corrections added by later hands over centuries, and it is famous for its four narrow columns to the page — though not uniformly so: the poetic books from Psalms to Job are laid out in two wider columns instead. It originally ran to something like 730 leaves. What survives is split four ways: 347 leaves in London as British Library Add MS 43725, the 1844 leaves at Leipzig University Library as MS gr. 1, four separate shelfmarks in the National Library of Russia, and further leaves and fragments found at the monastery itself in 1975 — the British Library and the Codex Sinaiticus project give slightly different counts for that last group. All four holdings have been photographed and reunited digitally, so the whole book can now be read online in one place for the first time since the nineteenth century.",
        ],
      },
      {
        heading: "What Is In It",
        paragraphs: [
          "Sinaiticus contains the Greek Old Testament, incomplete, and the complete New Testament — the earliest complete New Testament we have. After Revelation it continues with two more works: the Epistle of Barnabas and part of the Shepherd of Hermas. That is worth pausing on. It is not evidence that the fourth-century church regarded those books as scripture on a par with the Gospels, since a codex could gather useful reading beyond the canon; but it is evidence that the edges of the collection were still being worked out in a way the printed table of contents of a modern Bible conceals.",
          "The manuscript also lacks two familiar passages: the longer ending of Mark (Mark 16:9-20) and the account of the woman caught in adultery (John 7:53-8:11). This is not a suppression and not a discovery of the modern era — it is simply what the early manuscript evidence shows, which is why most modern Bibles mark both passages with a note. Vaticanus, of roughly the same date, agrees on Mark. A translation that tells the reader this is being honest with them, not undermining them.",
        ],
      },
      {
        heading: "How It Left the Monastery",
        paragraphs: [
          "The circumstances of Tischendorf's acquisition are genuinely disputed, and the dispute is not settled by evidence available to outsiders. Tischendorf's published accounts, which vary between tellings, describe leaves about to be used as kindling in 1844 and a gift of the remainder to the tsar in 1859. St Catherine's Monastery has maintained for well over a century that the manuscript was lent for copying and not given, and points to a receipt in which Tischendorf undertook to return it. Historians assess the story differently depending on which documents they weight. The fair statement is that a Western scholar removed a monastery's most valuable book, that the monastery says it did not consent, and that his own narrative of how it happened changed over time.",
          "One further controversy can be closed. In the 1860s a Greek named Constantine Simonides claimed he had written the codex himself as a young man. Palaeographers dismissed the claim at the time, and nothing since has supported it; the manuscript's script, materials, corrections, and textual character are all consistent with the fourth century and inconsistent with a nineteenth-century forgery. It resurfaces occasionally online and can be set aside.",
        ],
      },
    ],
    verses: [
      { reference: "Mark 16:9-20", note: "The longer ending of Mark, absent from Sinaiticus" },
      { reference: "John 7:53-8:11", note: "The woman caught in adultery, also absent" },
      { reference: "John 1:1-5", note: "One of the passages where the fourth-century text can be read directly" },
      { reference: "Revelation 22:18-21", note: "After which Sinaiticus continues with the Epistle of Barnabas" },
    ],
    sources: [
      { label: "Codex Sinaiticus Project: read the manuscript online", url: "https://www.codexsinaiticus.org/en/" },
      { label: "Bible Odyssey (SBL): What Is the Oldest Bible?", url: "https://www.bibleodyssey.org/articles/what-is-the-oldest-bible/" },
      { label: "Wikipedia: Codex Sinaiticus", url: "https://en.wikipedia.org/wiki/Codex_Sinaiticus" },
    ],
    manuscript: {
      siglum: "Codex Sinaiticus (Gregory-Aland 01; von Soden δ 2)",
      manuscriptType: "Parchment uncial codex, 380 x 345 mm, in four columns to the page except Psalms-Job, which are in two",
      language: "Koine Greek",
      contents:
        "Around half of the Greek Old Testament and Apocrypha, heavily incomplete, and the complete New Testament — the earliest complete Greek New Testament there is. After Revelation it continues with the Epistle of Barnabas and part of the Shepherd of Hermas (1:1-27:6, 28:5-30:3). Mark 16:9-20 and John 7:53-8:11 are absent",
      origin: "Eastern Mediterranean, possibly Palestine. The often-repeated attribution to Caesarea is not what the British Library's record says",
      findSite: "St Catherine's Monastery, Mount Sinai, Egypt",
      foundYear: "1844 and 1859, with further leaves and fragments found at the monastery in 1975",
      foundBy:
        "Constantin von Tischendorf took leaves from the monastery on three visits, in 1844, 1853 and 1859. The monastery has maintained ever since that the manuscript was lent rather than given",
      dateAssigned: "Second to third quarter of the fourth century AD",
      dateCertainty: "traditional",
      currentLocation:
        "Divided between the British Library (347 leaves), Leipzig University Library (43 leaves), the National Library of Russia and St Catherine's Monastery",
      shelfmark: "London, British Library, Add MS 43725; Leipzig, Universitätsbibliothek, MS gr. 1",
      facsimileUrl: "https://www.codexsinaiticus.org/en/manuscript.aspx",
    },
    citations: [
      {
        tier: "institution",
        label: "British Library Archives and Manuscripts Catalogue: Add MS 43725",
        url: "https://searcharchives.bl.uk/catalog/032-002169711",
        credit: "The British Library",
        detail:
          "Gives the shelfmark, 347 folios, 380 x 345 mm, \"written in 4 cols (50-54 mm), except Psalms-Job (2 cols, 115-120 mm)\", origin \"Eastern Mediterranean (Palestine?)\", the Leipzig and St Petersburg shelfmarks, and the December 1933 purchase from the Soviet government",
        supports: "The shelfmarks, the column layout, the origin, the extent and the sale",
      },
      {
        tier: "institution",
        label: "The Codex Sinaiticus Project: read the manuscript online",
        url: "https://www.codexsinaiticus.org/en/manuscript.aspx",
        credit: "A joint project of the British Library, Leipzig University Library, the National Library of Russia and St Catherine's Monastery",
        detail: "The full digital facsimile with transcription and translation, free to use, reuniting all four holdings",
        supports: "That the reader can look at the manuscript itself, and the three Tischendorf visits of 1844, 1853 and 1859",
      },
      {
        tier: "scholarly",
        label: "H. J. M. Milne and T. C. Skeat, Scribes and Correctors of the Codex Sinaiticus",
        credit: "H. J. M. Milne and T. C. Skeat, Department of Manuscripts, British Museum",
        detail: "London: British Museum, 1938 - the standard study of the codex's scribes and correctors, and the source the British Library's own record cites for the manuscript's origin. Print only",
        supports: "The number of scribes, the later correcting hands, and the \"Eastern Mediterranean (Palestine?)\" origin",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): What Is the Oldest Bible?",
        url: "https://www.bibleodyssey.org/articles/what-is-the-oldest-bible/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Codex Sinaiticus",
        url: "https://en.wikipedia.org/wiki/Codex_Sinaiticus",
      },
    ],
  },
  /* Batch two of the archaeological-finds cluster — see the rule and the reasoning in the comment
   * above the Pilate Stone. These are the texts rather than the monuments: the versions and codices
   * behind the Bible in a reader's hands, and the Mesopotamian and Egyptian archives the Old
   * Testament's world produced. Same standard on evidential weight; two of them (the Nuzi tablets
   * and the Amarna letters' Habiru) are cases where an older generation of scholarship overclaimed
   * and has since walked the claim back, and the articles say so. */
  {
    id: "septuagint",
    name: "Septuagint",
    alternateNames: ["LXX", "Greek Old Testament"],
    category: "manuscript",
    role: "The Greek Old Testament, Third Century BC Onward",
    summary:
      "The translation of the Hebrew scriptures into Greek, begun in Alexandria around 250 BC — the version most New Testament writers quote, and the reason Catholic and Protestant Bibles have different tables of contents.",
    sections: [
      {
        heading: "Seventy Translators, or Seventy-Two",
        paragraphs: [
          "The name comes from the Latin for seventy, and behind it is a story. The Letter of Aristeas, a Greek document written in Alexandria some time in the second century BC, tells how Ptolemy II Philadelphus wanted a copy of the Jewish law for his great library, sent to Jerusalem for scholars, and received seventy-two elders who completed a translation of the Torah in seventy-two days. Later retellings improved on it: Philo has the translators working in separate cells and emerging with word-for-word identical texts, a miracle guaranteeing the Greek's authority.",
          "Historians treat the letter as a piece of advocacy rather than a report — it is written to commend the Greek translation to Greek-speaking Jews, and it postdates the events it describes. What is not in doubt is the plain fact underneath it: the five books of Moses were translated into Greek in Alexandria in the third century BC, and over the next two centuries the rest of the Hebrew scriptures followed, in a series of separate efforts by different translators of very different skill. Some books are rendered almost word for word; others, notably Job and Proverbs, are freely paraphrased and considerably shorter.",
        ],
      },
      {
        heading: "The Bible the Apostles Quoted",
        paragraphs: [
          "By the first century, Greek was the working language of Jews across the Mediterranean, and the Septuagint was simply their Bible. When the New Testament writers quote the Old Testament, they most often follow the Greek — including at points where the Greek differs from the Hebrew we have. The most discussed example is Isaiah 7:14: the Hebrew says almah, a young woman of marriageable age; the Septuagint's translators, two centuries before Christ and with no Christian argument to make, chose parthenos, virgin. Matthew 1:23 quotes the Greek.",
          "That pattern has a practical consequence for anyone comparing an Old Testament passage with its New Testament quotation and finding they do not match. Usually nothing has gone wrong: the writer is quoting a Greek Bible, and modern Old Testaments translate the Hebrew. The Septuagint's own vocabulary also shaped Christian language permanently — christos for messiah, kyrios for the divine name, diatheke for covenant, ekklesia for assembly. The theological vocabulary of the New Testament was largely built in Alexandria before the New Testament was written.",
        ],
      },
      {
        heading: "Why It Has More Books",
        paragraphs: [
          "Greek manuscripts of the Old Testament also carry books not in the Hebrew Bible: Tobit, Judith, Wisdom, Sirach, Baruch, 1 and 2 Maccabees, and additions to Esther and Daniel. Because the early church read the Old Testament in Greek, these came along with it. At the Reformation, Protestants returned to the Hebrew canon and set those books apart as the Apocrypha; the Council of Trent affirmed them as scripture for Catholics; Orthodox churches include these and a few more. The disagreement is old, real, and entirely traceable to which collection a tradition inherited.",
          "One thing the Dead Sea Scrolls settled is worth knowing here. Before 1947 it was often assumed that where the Greek differed from the Hebrew, the Greek translators had been careless. Some of the Hebrew manuscripts from the caves turned out to match the Greek where it differs from the traditional Hebrew — including a copy of Jeremiah in the shorter form the Septuagint has. So a good number of the Septuagint's differences are not translation errors at all; they faithfully render a Hebrew text that really existed. That makes the Greek Old Testament a witness to the Hebrew Bible's own history rather than a distortion of it, and it complicates any simple account of which version is the original.",
        ],
      },
    ],
    verses: [
      { reference: "Isaiah 7:14", note: "\"A young woman\" in Hebrew; \"a virgin\" in the Greek" },
      { reference: "Matthew 1:22-23", note: "Matthew quoting the Greek form" },
      { reference: "Hebrews 10:5-7", note: "\"A body you prepared for me\" — a quotation of Psalm 40 that follows the Greek, not the Hebrew" },
      { reference: "Acts 8:26-35", note: "The Ethiopian official reading Isaiah in Greek on a desert road" },
    ],
    sources: [
      { label: "Bible Odyssey (SBL): What Is the Septuagint?", url: "https://www.bibleodyssey.org/articles/what-is-the-septuagint/" },
      { label: "Text & Canon Institute: The Bible Jesus Read", url: "https://textandcanon.org/bible-jesus-read/" },
      { label: "Wikipedia: Septuagint", url: "https://en.wikipedia.org/wiki/Septuagint" },
    ],
    manuscript: {
      siglum: "LXX",
      manuscriptType:
        "A translation tradition rather than a single object. It survives in hundreds of manuscripts, from second-century BC papyrus scraps and Judean Desert fragments to the great fourth-century parchment codices",
      language: "Koine Greek, translated from Hebrew and Aramaic",
      contents:
        "The Hebrew scriptures in Greek, translated over roughly two centuries by many hands of very different skill — some books rendered almost word for word, others, notably Job and Proverbs, freely paraphrased and considerably shorter. Greek manuscripts also carry books not in the Hebrew Bible: Tobit, Judith, Wisdom, Sirach, Baruch, 1 and 2 Maccabees, and additions to Esther and Daniel",
      origin: "Alexandria for the Torah; the later books were translated elsewhere by different translators over the following two centuries",
      findSite: "Not applicable. The Septuagint was never lost and never found — it was transmitted continuously, first by Greek-speaking Jews and then by the church",
      foundYear: "Not applicable",
      foundBy: "Not applicable",
      dateAssigned: "The Torah c. 250 BC; the remaining books over the following two centuries",
      dateCertainty: "traditional",
      currentLocation:
        "No single object. The fullest early witnesses are Codex Vaticanus in the Vatican Library and Codex Sinaiticus in the British Library",
      facsimileUrl: "https://digi.vatlib.it/view/MSS_Vat.gr.1209",
    },
    citations: [
      {
        tier: "institution",
        label: "Biblioteca Apostolica Vaticana, DigiVatLib: Codex Vaticanus (Vat.gr.1209)",
        url: "https://digi.vatlib.it/view/MSS_Vat.gr.1209",
        credit: "Biblioteca Apostolica Vaticana",
        detail: "One of the two fullest early witnesses to the Greek Old Testament, free to page through in full",
        supports: "That the Septuagint can be read in a fourth-century manuscript, not only in modern editions",
      },
      {
        tier: "primary",
        label: "The Letter of Aristeas, translated by H. St. J. Thackeray",
        url: "https://archive.org/details/letterofaristeas00thac",
        credit: "H. St. J. Thackeray",
        detail: "The founding legend of the translation, in a public-domain English version at the Internet Archive",
        supports: "The Aristeas story described in section one, so a reader can weigh it themselves",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): What Is the Septuagint?",
        url: "https://www.bibleodyssey.org/articles/what-is-the-septuagint/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "reference",
        label: "Text & Canon Institute: The Bible Jesus Read",
        url: "https://textandcanon.org/bible-jesus-read/",
        credit: "Text & Canon Institute, Phoenix Seminary",
        supports: "The New Testament's use of the Greek Old Testament",
      },
    ],
  },
  {
    id: "masoretic-text",
    name: "Masoretic Text",
    alternateNames: ["Aleppo Codex", "Leningrad Codex"],
    category: "manuscript",
    role: "The Standard Hebrew Bible, Fixed c. AD 600-1000",
    summary:
      "The Hebrew text produced by generations of Jewish scribes at Tiberias and in Babylonia, who added vowels, accents, and an elaborate apparatus of counting-notes to a consonantal text they had inherited — and which almost every modern Old Testament translates.",
    sections: [
      {
        heading: "Who the Masoretes Were",
        paragraphs: [
          "Hebrew was written with consonants only. A reader supplied the vowels from knowledge of the language and the tradition of how a passage was read aloud, which works well until the language stops being spoken daily. Between roughly AD 600 and 1000, scribal families — the best known being the ben Asher family of Tiberias, on the Sea of Galilee — developed systems of small marks above and below the consonants to fix the pronunciation, and a second set of marks to fix the chanting and phrasing.",
          "They also compiled the masorah, the notes that give the tradition its name: marginal annotations recording how many times a given word occurs, which spelling is used where, and where an unusual form is genuine rather than a slip. It is essentially a checksum system, designed so that a copyist's error would show up against the count. The consonants themselves the Masoretes did not touch; where they judged the written text wrong, they left it written and noted the reading in the margin instead.",
        ],
      },
      {
        heading: "Two Manuscripts Almost Everything Rests On",
        paragraphs: [
          "The Aleppo Codex, written around AD 930 and vocalised by Aaron ben Asher himself, was regarded as the finest copy in existence; Maimonides used it. It was kept for centuries in the synagogue at Aleppo, and in riots there in 1947 a large part of it was lost, including almost all of the Torah. What survives is in Jerusalem.",
          "The Leningrad Codex, copied in Cairo in AD 1008 and now in the National Library of Russia in St Petersburg, is therefore the oldest complete Masoretic Bible. It is the base text of the standard scholarly edition, Biblia Hebraica Stuttgartensia, which means it stands behind the Old Testament of nearly every English Bible on a modern shelf. A reader opening Genesis in almost any translation is reading, at one remove, a manuscript finished in Egypt in the eleventh century.",
        ],
      },
      {
        heading: "How Good Is It?",
        paragraphs: [
          "Very good, and it is worth saying exactly what that means. When the Dead Sea Scrolls appeared, the obvious test was to set the Masoretic consonants against Hebrew copies a thousand years older. A large proportion of the biblical scrolls are of a type essentially identical to the later Masoretic consonantal text — evidence that the Masoretes were preserving something already ancient and already stable, not inventing it.",
          "The caution is that the scrolls also show other Hebrew text forms circulating at the same time, some agreeing with the Septuagint and some with the Samaritan Pentateuch. The Masoretic Text is the survivor of a family that already existed in the Second Temple period and became the standard; it is not the only Hebrew text there ever was, and modern translators consult the alternatives at points where the Masoretic reading is hard. Nor is it an autograph — it is a superb medieval edition of an ancient text, and describing it accurately is a stronger position than describing it as untouched.",
        ],
      },
    ],
    verses: [
      { reference: "Deuteronomy 4:2", note: "\"You shall not add to the word... neither shall you take away from it\" — the conviction the masorah was built to serve" },
      { reference: "Psalms 119:89", note: "\"Your word is settled in heaven forever\"" },
      { reference: "Isaiah 40:8", note: "\"The word of our God stands forever\"" },
    ],
    sources: [
      { label: "Text & Canon Institute: articles on the Masoretic Text", url: "https://textandcanon.org/tag/masoretic-text/" },
      { label: "Bible Odyssey (SBL): The Samaritan Pentateuch", url: "https://www.bibleodyssey.org/articles/the-samaritan-pentateuch/" },
      { label: "Wikipedia: Masoretic Text", url: "https://en.wikipedia.org/wiki/Masoretic_Text" },
    ],
    manuscript: {
      manuscriptType:
        "A textual tradition rather than a single object, carried by parchment codices — above all the Aleppo Codex and the Leningrad Codex",
      language: "Hebrew, with Aramaic in parts of Daniel and Ezra",
      contents:
        "The Hebrew Bible, with the vowel points, cantillation accents and marginal masorah the Masoretes added to an inherited consonantal text. The Aleppo Codex is no longer complete — a large part of it, including almost all of the Torah, was lost in 1947 — so the Leningrad Codex is the oldest complete Masoretic Bible",
      origin: "Tiberias, on the Sea of Galilee, and Babylonia; the Leningrad Codex itself was copied in Cairo",
      findSite: "Not applicable. The Masoretic tradition was never lost and never found — it was copied continuously by Jewish scribes",
      foundYear: "Not applicable",
      foundBy: "Not applicable",
      dateAssigned:
        "The consonantal text is ancient; the vocalisation, accents and masorah were developed c. AD 600-1000. The Aleppo Codex was written c. AD 930 and the Leningrad Codex in AD 1008",
      dateCertainty: "traditional",
      currentLocation:
        "The Aleppo Codex, incomplete, is in Jerusalem; the Leningrad Codex is in the National Library of Russia, St Petersburg",
      shelfmark: "Leningrad Codex: National Library of Russia, Firkovich B 19 A",
    },
    citations: [
      {
        tier: "institution",
        label: "National Library of Russia, St Petersburg: the Leningrad Codex, Firkovich B 19 A",
        credit: "National Library of Russia",
        detail: "The holding library for the oldest complete Masoretic Bible, and the manuscript behind Biblia Hebraica Stuttgartensia. No URL is given here because the library's own site was not reachable when this article was checked",
        supports: "Where the Leningrad Codex is held, and under what shelfmark",
      },
      {
        tier: "primary",
        label: "The Unicode/XML Leningrad Codex",
        url: "https://tanach.us/Tanach.xml",
        credit: "The Westminster Leningrad Codex project",
        detail: "A freely available transcription of the Leningrad Codex itself, pointing, accents and all",
        supports: "That the base text behind modern Old Testament translations can be inspected directly",
      },
      {
        tier: "scholarly",
        label: "Emanuel Tov, Textual Criticism of the Hebrew Bible",
        credit: "Emanuel Tov",
        detail: "Minneapolis: Fortress Press, 4th edition 2022 — the standard handbook on the Masoretic tradition and its rivals. Print only",
        supports: "The relationship between the Masoretic Text, the Septuagint's Hebrew source and the Samaritan Pentateuch in section three",
      },
      {
        tier: "reference",
        label: "Text & Canon Institute: articles on the Masoretic Text",
        url: "https://textandcanon.org/tag/masoretic-text/",
        credit: "Text & Canon Institute, Phoenix Seminary",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): The Samaritan Pentateuch",
        url: "https://www.bibleodyssey.org/articles/the-samaritan-pentateuch/",
        credit: "Society of Biblical Literature",
        supports: "The other Hebrew text forms that circulated alongside the proto-Masoretic one",
      },
    ],
  },
  {
    id: "codex-vaticanus",
    name: "Codex Vaticanus",
    alternateNames: ["Vaticanus"],
    category: "manuscript",
    role: "Fourth-Century Greek Bible in the Vatican Library",
    summary:
      "A mid-fourth-century Greek Bible that has been in the Vatican Library since at least its first catalogue in 1475 — with Codex Sinaiticus, one of the two most important manuscripts of the New Testament.",
    sections: [
      {
        heading: "A Book with No Discovery Story",
        paragraphs: [
          "Unlike Codex Sinaiticus, which has a nineteenth-century adventure attached to it, Vaticanus was never found. It is generally said to appear in the Vatican Library's earliest surviving catalogue, drawn up in 1475 — an identification argued by T. C. Skeat in 1984 and listed in the library's own bibliography for the manuscript, rather than a fact the library states on its record — and nobody knows where the book was before that. It is written on fine parchment in a small, plain, unadorned hand, three narrow columns to the page, an austere and very early layout. The library dates it to the fourth century, which makes it a near-contemporary of Sinaiticus and possibly a little earlier.",
          "For centuries the library guarded it closely, and access was the subject of long frustration among textual scholars; Tischendorf, permitted a few days with it in 1866, was reprimanded for copying too much. That era is over. The manuscript has been photographed in full and can be paged through online, and a facsimile edition put it into libraries worldwide.",
        ],
      },
      {
        heading: "What Survives, and What Is Missing",
        paragraphs: [
          "Leaves have been lost at both ends and in places in between. The Old Testament lacks most of Genesis and a stretch of Psalms; the New Testament breaks off in Hebrews at chapter 9 verse 14, so 1 and 2 Timothy, Titus, Philemon, and Revelation are absent. That absence is physical damage, not a canonical statement — the missing leaves are simply gone.",
          "More interesting is where the scribe wrote nothing. Mark ends at 16:8, and after it the scribe left a conspicuous blank column before beginning Luke — the only such blank in the New Testament portion. Scholars read this as a copyist who knew of the longer ending, did not find it in the exemplar he was copying, and left room in case. John 7:53-8:11, the woman caught in adultery, is likewise absent, as it is in Sinaiticus. Two independent fourth-century Bibles agreeing on these gaps is why translators add the notes they do.",
        ],
      },
      {
        heading: "Why Two Manuscripts Matter So Much",
        paragraphs: [
          "Sinaiticus and Vaticanus are the earliest substantially complete Greek Bibles, and where they agree against the mass of later medieval copies, most textual scholars follow them — the basis of the modern critical editions behind almost every twentieth-century translation. The King James Version, by contrast, rests on a text compiled in the sixteenth century from a handful of late manuscripts, which is why it includes readings the modern versions footnote.",
          "It is worth stating what is and is not at stake. The differences between these text traditions are real, are documented in the footnotes of any decent study Bible, and are argued about openly by people who care about scripture. They are also, taken together, small: no Christian doctrine rests on a disputed reading. A tradition confident enough to print its variants in the margin is not one that has something to hide, and Vaticanus is one of the two manuscripts that made printing them possible.",
        ],
      },
    ],
    verses: [
      { reference: "Mark 16:8", note: "Where Vaticanus ends Mark, followed by a blank column" },
      { reference: "John 7:53-8:11", note: "Absent from Vaticanus and Sinaiticus alike" },
      { reference: "Hebrews 9:14", note: "The verse at which the surviving text breaks off" },
    ],
    sources: [
      { label: "Vatican Library: Codex Vaticanus (Vat. gr. 1209) digitised", url: "https://digi.vatlib.it/view/MSS_Vat.gr.1209" },
      { label: "Bible Odyssey (SBL): What Is the Oldest Bible?", url: "https://www.bibleodyssey.org/articles/what-is-the-oldest-bible/" },
      { label: "Wikipedia: Codex Vaticanus", url: "https://en.wikipedia.org/wiki/Codex_Vaticanus" },
    ],
    manuscript: {
      siglum: "Codex Vaticanus (Gregory-Aland 03 / B)",
      manuscriptType: "Parchment uncial codex, three columns to the page",
      language: "Koine Greek",
      contents:
        "The Greek Old Testament and New Testament, imperfect at both ends. Most of Genesis and a stretch of Psalms are lost; the New Testament breaks off in Hebrews at 9:14, so 1-2 Timothy, Titus, Philemon and Revelation are absent, and the leaves that follow are a much later minuscule supplement. Mark ends at 16:8, followed by a blank column; John 7:53-8:11 is absent",
      origin: "Unknown",
      findSite: "Not applicable — the codex was never lost and never found. It has been in the Vatican Library for as long as its records reach",
      foundYear: "Not applicable",
      foundBy: "Not applicable",
      dateAssigned: "Fourth century AD",
      dateCertainty: "traditional",
      currentLocation: "Biblioteca Apostolica Vaticana, Vatican City",
      shelfmark: "Vat.gr.1209",
      facsimileUrl: "https://digi.vatlib.it/view/MSS_Vat.gr.1209",
    },
    citations: [
      {
        tier: "institution",
        label: "Biblioteca Apostolica Vaticana, DigiVatLib: Vat.gr.1209 in full",
        url: "https://digi.vatlib.it/view/MSS_Vat.gr.1209",
        credit: "Biblioteca Apostolica Vaticana",
        detail: "The complete digital facsimile, 1,555 images, free to page through. The blank column after Mark 16:8 and the break in Hebrews 9:14 can both be seen directly",
        supports: "The shelfmark, the three-column layout, the ending of Mark and the break at Hebrews 9:14",
      },
      {
        tier: "institution",
        label: "Vatican Library catalogue record for Vat.gr.1209",
        url: "https://opac.vatlib.it/mss/detail/Vat.gr.1209",
        credit: "Biblioteca Apostolica Vaticana",
        detail: "Dates the manuscript \"sec. IV\", lists its contents book by book, and includes T. C. Skeat, \"The Codex Vaticanus in the 15th Century,\" Journal of Theological Studies (1984) in its bibliography",
        supports: "The fourth-century date, the absent Pastorals and Revelation, and the source of the 1475 catalogue claim",
      },
      {
        tier: "scholarly",
        label: "T. C. Skeat, \"The Codex Vaticanus in the 15th Century\"",
        credit: "T. C. Skeat",
        detail: "Journal of Theological Studies n.s. 35 (1984), 454-465 - the argument that the codex is the manuscript listed in the Vatican Library's 1475 catalogue. Print only",
        supports: "The 1475 catalogue identification described in section one",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): What Is the Oldest Bible?",
        url: "https://www.bibleodyssey.org/articles/what-is-the-oldest-bible/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Codex Vaticanus",
        url: "https://en.wikipedia.org/wiki/Codex_Vaticanus",
      },
    ],
  },
  {
    id: "muratorian-fragment",
    name: "Muratorian Fragment",
    alternateNames: ["Muratorian Canon", "Canon Muratori"],
    category: "manuscript",
    role: "The Earliest Known List of New Testament Books",
    summary:
      "Eighty-five lines of bad Latin in an eighth-century manuscript at Milan, preserving what is most likely a list of accepted Christian writings drawn up in Rome around AD 180 — the oldest such list we have.",
    sections: [
      {
        heading: "Found in a Milan Library",
        paragraphs: [
          "Ludovico Antonio Muratori, an Italian priest and historian, published the text in 1740 from a seventh- or eighth-century codex in the Ambrosian Library in Milan. The manuscript is a scrappy thing — the Latin is clumsy and full of errors, and most scholars think it is a rough translation of a Greek original. It begins in mid-sentence, so the opening is lost, and it breaks off at the end.",
          "What survives is a survey of Christian writings with comments on each. Luke is named as the third Gospel and John as the fourth, which implies Matthew and Mark stood in the missing opening. Acts is there, thirteen letters of Paul, Jude, two letters of John, Revelation, and the Wisdom of Solomon. The writer discusses Paul's letters to seven churches as a deliberate pattern, dismisses letters forged in Paul's name to the Laodiceans and Alexandrians as Marcionite fabrications, and says the Shepherd of Hermas may be read privately but not read out in church, because it was written recently, in his own time, by the brother of Bishop Pius of Rome.",
        ],
      },
      {
        heading: "Why It Matters",
        paragraphs: [
          "It is often assumed that the New Testament was assembled by a church council centuries after the fact. This list is one of the plainest pieces of evidence against that picture. Long before any council pronounced on the subject, a Christian writer is simply describing which books the churches read publicly and which they do not, giving reasons, and treating the question as largely settled for the Gospels and for Paul.",
          "It is equally plain that the edges were not settled. Hebrews, James, and 1-2 Peter are not in the surviving text; the Apocalypse of Peter is listed as accepted by some and rejected by others; Wisdom is included. A reader who wants the honest shape of the evidence should notice both halves: a firm core, agreed early and without central decision, and a fringe that took generations to resolve.",
        ],
      },
      {
        heading: "The Date Is Disputed",
        paragraphs: [
          "The traditional dating, around AD 170-200, rests on the writer's remark that the Shepherd of Hermas was composed \"very recently, in our own times,\" during his brother's episcopate — which places the author within a generation of the 140s or 150s. That reading has been standard since the nineteenth century.",
          "It is not unanimous. Albert Sundberg in 1973 and Geoffrey Hahneman in 1992 argued that the fragment fits far better among fourth-century Eastern canon lists, and that the Hermas remark could have been copied from an earlier source. Most specialists have not been persuaded and the second-century Roman dating remains the majority view, but the alternative is a serious scholarly position, and an argument that leans hard on this document as second-century evidence should acknowledge that it is doing so."
        ],
      },
    ],
    verses: [
      { reference: "Luke 1:1-4", note: "The Gospel the fragment describes as third in order" },
      { reference: "2 Peter 3:15-16", note: "Paul's letters already spoken of alongside \"the other Scriptures\"" },
      { reference: "Colossians 4:16", note: "Letters circulated and exchanged between churches from the beginning" },
    ],
    sources: [
      { label: "Wikipedia: Muratorian fragment", url: "https://en.wikipedia.org/wiki/Muratorian_fragment" },
      { label: "Text & Canon Institute: How the Two Testaments Became One Bible", url: "https://textandcanon.org/how-the-two-testaments-became-one-bible/" },
    ],
    manuscript: {
      manuscriptType: "Eighty-five lines of Latin on two leaves of a parchment codex of 76 leaves — folio 10 recto to folio 11 recto, line 23",
      language: "Latin, and poor Latin at that; scholars generally agree it is a translation from a Greek original",
      contents:
        "A survey of Christian writings with comments on each. It begins mid-sentence, so the opening is lost, and it breaks off at the end. Luke is named third and John fourth; Acts, thirteen letters of Paul, Jude, two letters of John, Revelation and the Wisdom of Solomon are included. Hebrews, James and 1-2 Peter do not appear in what survives",
      origin: "The list itself is generally placed in Rome; the manuscript that preserves it belonged to the monastery at Bobbio",
      findSite: "The Biblioteca Ambrosiana, Milan",
      foundYear: "Found by Ludovico Antonio Muratori in 1700 and published by him in 1740",
      foundBy: "Ludovico Antonio Muratori, in the third volume of his Antiquitates Italicae Medii Aevi",
      dateAssigned:
        "The list itself is conventionally dated c. AD 170-200, which a serious minority disputes; the manuscript that carries it is dated 676-750 by the Ambrosiana's own catalogue",
      dateCertainty: "disputed",
      currentLocation: "Biblioteca Ambrosiana, Milan",
      shelfmark: "Cod. Ambrosianus I 101 sup.",
    },
    citations: [
      {
        tier: "scholarly",
        label: "Eckhard J. Schnabel, \"The Muratorian Fragment: The State of Research\"",
        url: "https://etsjets.org/wp-content/uploads/2014/06/files_JETS-PDFs_57_57-2_JETS_57-2_231-64_Schnabel.pdf",
        credit: "Eckhard J. Schnabel",
        detail:
          "Journal of the Evangelical Theological Society 57:2 (2014), 231-264 — freely available. Gives the shelfmark, the 85 lines, the exact folios, the Bobbio provenance, Muratori's 1740 publication, and a survey of who has and has not accepted the fourth-century redating",
        supports: "The manuscript's shelfmark and extent, and the state of the dating debate in section three",
      },
      {
        tier: "institution",
        label: "Biblioteca Ambrosiana digital library: I 101 sup.",
        url: "https://ambrosiana.comperio.it/biblioteca-digitale/search/lst?q=I+101+sup",
        credit: "Veneranda Biblioteca Ambrosiana, Milan",
        detail: "The holding library's catalogue record, dating the codex 676-750. No public digital facsimile of the manuscript was found",
        supports: "The shelfmark and the date of the manuscript itself",
      },
      {
        tier: "scholarly",
        label: "Albert C. Sundberg, \"Canon Muratori: A Fourth Century List\"",
        credit: "Albert C. Sundberg Jr.",
        detail:
          "Harvard Theological Review 66 (1973), 1-41, developed at book length by Geoffrey M. Hahneman, The Muratorian Fragment and the Development of the Canon (Oxford University Press, 1992). Print only",
        supports: "The fourth-century redating named in section three, cited to the scholarship that argued it",
      },
      {
        tier: "reference",
        label: "Text & Canon Institute: How the Two Testaments Became One Bible",
        url: "https://textandcanon.org/how-the-two-testaments-became-one-bible/",
        credit: "Text & Canon Institute, Phoenix Seminary",
      },
    ],
  },
  {
    id: "babylonian-chronicles",
    name: "Babylonian Chronicles",
    // "Nabonidus Chronicle" is one tablet within this series and is registered here. The Nabonidus
    // CYLINDER is deliberately not aliased to this entry — it is a building inscription, a different
    // genre, and has its own article below.
    alternateNames: ["Babylonian Chronicle", "Jerusalem Chronicle", "Nabonidus Chronicle"],
    category: "discovery",
    role: "Neo-Babylonian Year-by-Year Records on Clay",
    summary:
      "A series of terse cuneiform tablets logging what happened in each year of a Babylonian king's reign — including the exact date, to the day, on which Nebuchadnezzar took Jerusalem.",
    sections: [
      {
        heading: "Accounts, Not Propaganda",
        paragraphs: [
          "Most royal inscriptions from the ancient Near East are boasts. The Babylonian Chronicles are not. They are a genre of their own: flat, year-by-year entries recording who campaigned where, who died, who took the throne, and occasionally an omen or an eclipse, in a style closer to a ledger than a monument. They record defeats as well as victories, which is precisely what makes historians value them. Most of the surviving tablets came into the British Museum in the nineteenth century through the antiquities trade rather than from controlled excavation.",
          "The most important for Bible readers is the tablet catalogued BM 21946, covering the years 605 to 594 BC, published by Donald Wiseman in 1956. Its entry for the seventh year of Nebuchadnezzar records that the king of Akkad marched on the land of Hatti, besieged the city of Judah, and on the second day of the month Adar captured the city and seized its king — then appointed a king of his own choosing and took heavy tribute back to Babylon.",
        ],
      },
      {
        heading: "A Biblical Event with a Calendar Date",
        paragraphs: [
          "2 Kings 24:10-17 describes the same event from inside the city: Jerusalem besieged, King Jehoiachin surrendering, the treasury and temple stripped, the leading citizens deported, and Nebuchadnezzar installing Jehoiachin's uncle Mattaniah as king under the new name Zedekiah. The chronicle's \"a king of his own choice\" and the Bible's Zedekiah are the same appointment.",
          "The chronicle's date converts to 15 or 16 March 597 BC. Very few events in the Old Testament can be dated to a particular day, and this is one of them — a rare, precise convergence between an Israelite narrative and a foreign administrative record with no interest in Israel's story. Separate Babylonian ration tablets, found at Babylon and published in the 1930s, list provisions issued to \"Ya'ukinu, king of the land of Yahudu\" and his sons — Jehoiachin, still alive and drawing a royal allowance in exile, which is where 2 Kings 25:27-30 leaves him.",
        ],
      },
      {
        heading: "What the Chronicles Do Not Cover",
        paragraphs: [
          "The destruction of Jerusalem and the burning of the temple in 587 or 586 BC is the event most often attributed to these tablets, and it is not in them. The tablet covering Nebuchadnezzar's later years is lost; the surviving chronicle text breaks off in 594 BC. The 597 deportation is documented; the final destruction a decade later is not, and saying otherwise misrepresents the evidence.",
          "One other tablet in the series matters here. The Nabonidus Chronicle records the fall of Babylon to Cyrus in 539 BC — the army of Persia entering the city without a battle, and Cyrus arriving to acclamation shortly after. That is the night behind Daniel 5, though the chronicle itself is brief and says nothing of a feast, a hand, or a wall.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 24:10-17", note: "The siege and surrender of 597 BC, and Zedekiah's installation" },
      { reference: "2 Kings 25:27-30", note: "Jehoiachin released and given an allowance at the Babylonian court" },
      { reference: "Jeremiah 52:28-30", note: "The deportations counted year by year" },
      { reference: "Daniel 5:30-31", note: "The night Babylon fell to the Persians" },
    ],
    sources: [
      { label: "Bible Odyssey (SBL): Babylonian Accounts of the Invasion of Judah", url: "https://www.bibleodyssey.org/articles/babylonian-accounts-of-the-invasion-of-judah/" },
      { label: "Wikipedia: Babylonian Chronicles", url: "https://en.wikipedia.org/wiki/Babylonian_Chronicles" },
      { label: "Wikipedia: Nabonidus Chronicle", url: "https://en.wikipedia.org/wiki/Nabonidus_Chronicle" },
    ],
    discovery: {
      objectType: "Clay tablets in Akkadian cuneiform; the tablet covering 605-594 BC is BM 21946",
      findSite: "Babylon, on the internal evidence of the texts and of tablets acquired alongside them. No findspot is recorded",
      findSiteId: "babylon",
      findSiteKind: "location",
      foundYear: "Not recorded. The tablets reached the British Museum in the nineteenth century through the antiquities trade",
      foundBy: "No finder and no excavator is recorded for any of them",
      objectDate: "Later Babylonian period. Wiseman's edition is explicit that the script \"does not of itself allow any precise dating\", so no date should be put on the copy itself; the events recorded on BM 21946 run from 605 to 594 BC",
      objectDateCertainty: "disputed",
      currentLocation: "British Museum, London (BM 21946)",
      unprovenanced: true,
    },
    citations: [
      {
        tier: "primary",
        label: "D. J. Wiseman, Chronicles of Chaldaean Kings (626-556 B.C.) in the British Museum (1956)",
        url: "https://etana.org/sites/default/files/coretexts/20337.pdf",
        credit: "D. J. Wiseman, published by the Trustees of the British Museum; scan hosted by ETANA",
        detail: "The first publication of BM 21946, with the year-by-year summary running 605 to 594 BC, and the statement that the script permits no precise dating of the tablets themselves",
        supports: "The tablet's contents and date range, its first publication, and the absence of a findspot",
      },
      {
        tier: "institution",
        label: "Cuneiform Digital Library Initiative: artifact P555785 (BM 021946)",
        url: "https://cdli.mpiwg-berlin.mpg.de/artifacts/555785",
        credit: "Cuneiform Digital Library Initiative, Max Planck Institute for the History of Science",
        detail: "Clay tablet, British Museum BM 021946, Neo-Babylonian — with no provenience, excavation number or findspot recorded",
        supports: "That the tablet is unprovenanced, and its museum number",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Babylonian Accounts of the Invasion of Judah",
        url: "https://www.bibleodyssey.org/articles/babylonian-accounts-of-the-invasion-of-judah/",
        credit: "Society of Biblical Literature",
        supports: "The convergence between the chronicle's 597 BC entry and 2 Kings 24",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Babylonian Chronicles",
        url: "https://en.wikipedia.org/wiki/Babylonian_Chronicles",
      },
    ],
  },
  {
    id: "nabonidus-cylinder",
    name: "Nabonidus Cylinder",
    alternateNames: ["Nabonidus Cylinders", "Cylinder of Nabonidus"],
    category: "discovery",
    role: "Sixth-Century BC Babylonian Building Inscription Naming Belshazzar",
    summary:
      "A clay foundation cylinder from the ziggurat at Ur in which the last king of Babylon prays for himself and for \"Belshazzar, my firstborn son\" — the man who, until the nineteenth century, was known only from the book of Daniel.",
    sections: [
      {
        heading: "The Problem Daniel 5 Used to Have",
        paragraphs: [
          "Daniel 5 tells of a feast held by Belshazzar, king of Babylon, interrupted by a hand writing on the wall, and ending that same night with the king dead and the city in Persian hands. For a long time this was one of the standard examples of the Bible getting history wrong. Greek and Roman historians named the last king of Babylon as Nabonidus, and none of them had ever heard of a Belshazzar. Daniel also has Belshazzar offer Daniel \"the third ruler in the kingdom\" as a reward, which looked like an odd way to describe second place.",
          "Then the cuneiform record began to be read. Clay cylinders inscribed for Nabonidus, buried in the fabric of temples he restored, turned up at Ur and elsewhere from the 1850s onward. The one that matters here came out of the ziggurat at Ur in 1854, recovered by J. G. Taylor, the British vice-consul at Basra — the same man who later found the Kurkh Monolith, and one whose initials are very often miscited as J. E. — and it closes with a prayer asking the moon god to preserve the king, and then, in the same breath: \"as for Belshazzar, my first-born son, my own offspring, have the fear of your great divinity placed in his heart.\" Belshazzar was real, and he was Nabonidus's son. It is worth being precise about which cylinder this is, because popular accounts often attach the Belshazzar prayer to Nabonidus's better-known cylinder from Sippar; that one is a different inscription and does not mention him."
        ],
      },
      {
        heading: "Regent While the King Was Away",
        paragraphs: [
          "Other Babylonian documents filled in the rest. Nabonidus spent roughly a decade of his reign at Tayma in Arabia, far from his capital, and administrative texts show that he entrusted the kingship — the practical government of Babylon — to his son during that absence. That accounts for the detail that looked like a mistake: with Nabonidus first and Belshazzar acting second, the highest honour actually in Belshazzar's gift was third place.",
          "This is a genuinely strong case, and it is stronger for being stated exactly. A book that could name a co-regent no classical historian remembered, and get the peculiar rank right, is showing knowledge of Babylonian court arrangements that had been lost for two thousand years and were recovered only from clay."
        ],
      },
      {
        heading: "What It Still Does Not Settle",
        paragraphs: [
          "Two caveats belong in the same paragraph as the case. First, the Babylonian texts never call Belshazzar \"king\"; he is the king's son exercising kingship, which is not quite the same thing, and Daniel's usage is best read as reflecting practical reality rather than Babylonian protocol. Second, Daniel 5 repeatedly calls Nebuchadnezzar Belshazzar's \"father.\" Nabonidus was not descended from Nebuchadnezzar. The usual explanation — that Aramaic and Hebrew use father and son for predecessor and successor, as Assyrian scribes did for Jehu \"son of Omri\" — is reasonable and widely accepted, and it is still an explanation rather than a confirmation.",
          "The wider question of when the book of Daniel was written is not settled by any of this, and readers should not be told that it is. Scholars who date the book to the second century BC and scholars who date it to the sixth both have to account for the Belshazzar material, and they do so differently. What the cylinders establish is narrower and quite solid: a figure the book names, whom no other surviving ancient historian remembered, existed exactly as it says.",
        ],
      },
    ],
    verses: [
      { reference: "Daniel 5:1-4", note: "Belshazzar's feast" },
      { reference: "Daniel 5:7", note: "\"Third ruler in the kingdom\" — the offer that fits a co-regency" },
      { reference: "Daniel 5:29-31", note: "The night the kingdom passed to the Medes and Persians" },
      { reference: "Daniel 7:1", note: "\"In the first year of Belshazzar king of Babylon\"" },
    ],
    sources: [
      { label: "Wikipedia: Nabonidus Chronicle", url: "https://en.wikipedia.org/wiki/Nabonidus_Chronicle" },
      { label: "Bible Odyssey (SBL): Cyrus the Messiah", url: "https://www.bibleodyssey.org/articles/cyrus-the-messiah/" },
    ],
    discovery: {
      objectType: "Clay foundation cylinder inscribed in Akkadian cuneiform",
      findSite: "The ziggurat at Ur (Tell el-Muqayyar), southern Iraq",
      findSiteId: "ur",
      findSiteKind: "location",
      foundYear: "1854",
      foundBy: "John George Taylor, British vice-consul at Basra, excavating for the British Museum. He is frequently miscited as \"J. E. Taylor\"",
      objectDate: "Reign of Nabonidus, 556-539 BC",
      objectDateCertainty: "firm",
      currentLocation: "British Museum, London (BM 91125)",
    },
    citations: [
      {
        tier: "primary",
        label: "Royal Inscriptions of Babylonia online: Nabonidus 32 (the Ur cylinder)",
        url: "https://oracc.museum.upenn.edu/ribo/babylon7/Q005429/html",
        credit: "RIBo / RINBE 2, published on Oracc (University of Pennsylvania, LMU Munich)",
        detail: "The scholarly edition, with transliteration and translation. Column ii 23-24: \"Moreover, with regard to Belshazzar, (my) first-born son, my own offspring, have the fear of your great divinity placed in his heart\"",
        supports: "The wording of the Belshazzar prayer, and that it stands on the Ur cylinder specifically",
      },
      {
        tier: "institution",
        label: "Cuneiform Digital Library Initiative: artifact P393977 (BM 091125)",
        url: "https://cdli.mpiwg-berlin.mpg.de/artifacts/393977",
        credit: "Cuneiform Digital Library Initiative, Max Planck Institute for the History of Science",
        detail: "Clay cylinder, provenience Ur (mod. Tell Muqayyar), British Museum BM 091125, Neo-Babylonian, dates referenced Nabonidus",
        supports: "The object's material, findspot, museum and museum number",
      },
      {
        tier: "primary",
        label: "Royal Inscriptions of Babylonia online: Nabonidus 28 (the Sippar Ehulhul cylinder)",
        url: "https://oracc.museum.upenn.edu/ribo/babylon7/Q005425/html",
        credit: "RIBo / RINBE 2, published on Oracc",
        detail: "The full edition of the Sippar cylinder, in which Belshazzar is not named — the check behind this article's warning about the two cylinders being confused",
        supports: "That the Sippar cylinder does not carry the Belshazzar prayer",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Cyrus the Messiah",
        url: "https://www.bibleodyssey.org/articles/cyrus-the-messiah/",
        credit: "Society of Biblical Literature",
      },
    ],
  },
  {
    id: "behistun-inscription",
    name: "Behistun Inscription",
    alternateNames: ["Bisitun Inscription", "Behistun relief", "Bisotun Inscription"],
    category: "discovery",
    role: "Trilingual Cliff Inscription of Darius I, c. 520 BC",
    summary:
      "A vast relief and inscription cut into a limestone cliff in western Iran, in three languages and three scripts — the text that let scholars read cuneiform, and so the reason every other Mesopotamian document in this atlas can be read at all.",
    sections: [
      {
        heading: "Darius Explains Himself",
        paragraphs: [
          "About sixty metres up a cliff face on the old road between Babylon and Ecbatana, Darius I had his account of his accession carved where nobody could reach it to deface it. A relief shows the king with his foot on a fallen rival and a line of nine captive kings roped at the neck; around and below it, the same text runs in Old Persian, Elamite, and Babylonian. It describes how Darius came to the throne, how he put down rebellion after rebellion in the first year, and how the god Ahura Mazda gave him the kingdom.",
          "As history it must be read with care. Darius was not the obvious heir, and his account — that the man he killed was an impostor magus named Gaumata impersonating Cyrus's son Bardiya, who had already been secretly murdered — is a very convenient story for a usurper to tell. Herodotus repeats a version of it, having probably got it from Persian sources downstream of this very inscription. Historians have debated the truth of it for a century and a half without resolution. This is royal self-justification carved a hundred feet above the road.",
        ],
      },
      {
        heading: "The Key That Opened Cuneiform",
        paragraphs: [
          "Its importance for the Bible is indirect and enormous. In the 1830s and 1840s Henry Rawlinson, a British officer in Persia, had himself lowered on ropes and stood on ladders to copy the inscription. Because the Old Persian script was alphabetic and partly guessable, and because the three versions say the same thing, the trilingual text gave scholars the leverage to work outward into Elamite and then into Akkadian — the language of Assyria and Babylon, written in the cuneiform used across Mesopotamia for three thousand years.",
          "Without that, the Cyrus Cylinder, Sennacherib's Prism, the Babylonian Chronicles, the Amarna letters, the Code of Hammurabi, and the Epic of Gilgamesh would all be handsome, mute objects. Behistun did for cuneiform what the Rosetta Stone did for hieroglyphs. Nearly everything the last two centuries have added to the historical setting of the Old Testament traces back through this cliff."
        ],
      },
      {
        heading: "Darius in Scripture",
        paragraphs: [
          "Darius I appears in the Bible in his own right. Ezra 5-6 has the rebuilding of the temple stalled by local opposition and referred to Darius, who orders a search of the royal archives at Ecbatana, finds Cyrus's original authorisation, and rules in the Jews' favour with funding attached. Haggai and Zechariah both date their preaching by his regnal years.",
          "It is worth distinguishing him from the Darius of Daniel 6, called Darius the Mede, who is a separate and much-debated figure — the identification of that Darius with any known Persian or Median ruler remains an unsolved problem, and this inscription does not solve it.",
        ],
      },
    ],
    verses: [
      { reference: "Ezra 5:6-17", note: "The provincial governor's letter referring the temple question to Darius" },
      { reference: "Ezra 6:1-12", note: "Darius searches the archives and confirms Cyrus's decree" },
      { reference: "Haggai 1:1", note: "\"In the second year of Darius the king\"" },
      { reference: "Zechariah 1:1", note: "Zechariah dated by the same reign" },
    ],
    sources: [
      { label: "Wikipedia: Behistun Inscription", url: "https://en.wikipedia.org/wiki/Behistun_Inscription" },
      { label: "Bible Odyssey (SBL): Cyrus the Messiah", url: "https://www.bibleodyssey.org/articles/cyrus-the-messiah/" },
    ],
    discovery: {
      objectType: "Bas-relief and trilingual cuneiform inscription — Old Persian, Elamite and Babylonian — cut into a limestone cliff about 60 m above the road",
      findSite: "Mount Bisotun, Kermanshah Province, Iran, on the old route between the Iranian plateau and Mesopotamia",
      foundYear: "Never lost and never found — the monument has been visible on the cliff since it was cut. It was first copied in full by Henry Creswicke Rawlinson in campaigns beginning in 1835",
      foundBy: "Not applicable. Rawlinson, a British officer in Persia, had himself lowered on ropes to copy it; he sent a complete copy to Europe by 1847 and published his decipherment from 1846",
      objectDate: "c. 520 BC — UNESCO dates the commission to 521 BC, and the campaigns it recounts ran through 522-520 BC",
      objectDateCertainty: "firm",
      currentLocation: "In situ on the cliff at the Bisotun archaeological site, Iran — a UNESCO World Heritage Site since 2006",
    },
    citations: [
      {
        tier: "institution",
        label: "L. W. King and R. C. Thompson, The Sculptures and Inscription of Darius the Great on the Rock of Behistûn in Persia (1907)",
        url: "https://en.wikisource.org/wiki/The_Sculptures_and_Inscription_of_Darius_the_Great_on_the_Rock_of_Behist%C3%BBn_in_Persia",
        credit: "The British Museum expedition that made the squeezes and casts, published by L. W. King and R. C. Thompson",
        detail: "The standard early edition and English translation, public domain, hosted in full on Wikisource",
        supports: "The content of the inscription and Darius's account of his accession",
      },
      {
        tier: "scholarly",
        label: "H. C. Rawlinson, The Persian Cuneiform Inscription at Behistun, Decyphered and Translated (1846)",
        credit: "Henry Creswicke Rawlinson, Royal Asiatic Society",
        detail: "The publication that broke Old Persian open, with continuations in 1848 and 1849. Public domain and catalogued at the Internet Archive",
        supports: "That Rawlinson's copying and decipherment is what made cuneiform readable",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Cyrus the Messiah",
        url: "https://www.bibleodyssey.org/articles/cyrus-the-messiah/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Behistun Inscription",
        url: "https://en.wikipedia.org/wiki/Behistun_Inscription",
      },
    ],
  },
  {
    id: "kurkh-monolith",
    name: "Kurkh Monolith",
    alternateNames: ["Kurkh Monoliths", "Kurkh Stele"],
    category: "discovery",
    role: "Assyrian Campaign Stele Naming Ahab of Israel, 853 BC",
    summary:
      "A carved stone slab from southeastern Turkey on which Shalmaneser III lists the kings who fought him at Qarqar — among them \"Ahab the Israelite,\" the earliest Assyrian mention of an Israelite king by name.",
    sections: [
      {
        heading: "The Battle of Qarqar",
        paragraphs: [
          "J. G. Taylor — a British consular officer excavating for the British Museum, and the son of the Colonel Taylor whose name is on Sennacherib's prism — found the monolith in October 1861 at Kurkh, near Diyarbakır in what is now southeastern Turkey, along with a companion stele of Ashurnasirpal II. He gave both to the British Museum in 1863. It is a round-topped stone stele about 2.2 metres tall showing Shalmaneser III in relief with the emblems of his gods, and it carries a long account of his campaigns. The section on his sixth year describes a battle at Qarqar on the Orontes in 853 BC against a coalition of a dozen western kings who had combined to stop the Assyrian advance.",
          "The list of the coalition names Hadadezer of Damascus, Irhuleni of Hamath, and third among them \"Ahab the Israelite,\" credited with two thousand chariots and ten thousand foot soldiers. It is the first appearance of an Israelite king by name in an Assyrian record, and it places Ahab in a specific battle in a specific year.",
        ],
      },
      {
        heading: "Why the Date Matters More Than the Battle",
        paragraphs: [
          "Qarqar is one of the anchor points of Old Testament chronology. Assyrian records are dated by an annual official whose name marks the year, and one such year-list is fixed absolutely by a solar eclipse recorded in it, which astronomers can date to 15 June 763 BC. Counting from there fixes Qarqar to 853 BC. Because Ahab was at Qarqar, and because Shalmaneser's Black Obelisk records tribute from Jehu about twelve years later, the reigns of the Israelite kings between them can be pinned to an absolute calendar rather than floating on internal biblical arithmetic alone.",
          "The Bible, for its part, never mentions Qarqar or the coalition. 1 Kings has Ahab fighting Ben-Hadad of Damascus, not allied with him. There is no contradiction — alliances shifted, and 1 Kings 22:1 notes three years without war between Israel and Aram, which is where the joint campaign fits — but it is another reminder that the biblical historians were writing a theological account of the kings of Israel, not a complete military record.",
        ],
      },
      {
        heading: "Two Thousand Chariots?",
        paragraphs: [
          "The chariot figure is the disputed part. Two thousand chariots would make Ahab by far the largest chariot power in the coalition, larger than Damascus, which is difficult to credit for a kingdom of Israel's size and resources. Proposals have included a scribal exaggeration, a cuneiform sign misread and a much smaller number originally intended, chariots contributed by allied states and counted under Ahab, or — a minority view — that the name should be read as a different king altogether.",
          "None of this touches the main point, which is that Ahab is named. It is simply an example of a real feature of these sources: Assyrian scribes inflated enemy numbers to magnify the victory, and Shalmaneser claims a crushing win at Qarqar and then went home and had to campaign in the same region repeatedly for years afterward, which is not what a decisive victory looks like. Historians generally treat Qarqar as, at best, a draw.",
        ],
      },
    ],
    verses: [
      { reference: "1 Kings 16:29-33", note: "Ahab's reign over Israel" },
      { reference: "1 Kings 20:1-34", note: "Ahab at war with Ben-Hadad of Aram — a different season of the same relationship" },
      { reference: "1 Kings 22:1-4", note: "\"Three years without war between Syria and Israel\" — the window Qarqar fits into" },
      { reference: "1 Kings 22:29-40", note: "Ahab's death at Ramoth Gilead" },
    ],
    sources: [
      { label: "Wikipedia: Kurkh Monoliths", url: "https://en.wikipedia.org/wiki/Kurkh_Monoliths" },
      { label: "Bible Odyssey (SBL): Kingdom of Israel", url: "https://www.bibleodyssey.org/articles/kingdom-of-israel/" },
    ],
    discovery: {
      objectType: "Round-topped stone stele about 2.2 m tall, carved in relief and inscribed with Shalmaneser III's annals",
      findSite: "Kurkh, near Diyarbakır, southeastern Turkey",
      foundYear: "October 1861; given to the British Museum in 1863",
      foundBy: "John George Taylor, British consular officer, excavating on commission for the British Museum",
      objectDate: "c. 853-852 BC",
      objectDateCertainty: "firm",
      currentLocation: "British Museum, London (BM 118884)",
    },
    citations: [
      {
        tier: "institution",
        label: "Cuneiform Digital Library Initiative: artifact P465006 (BM 118884)",
        url: "https://cdli.mpiwg-berlin.mpg.de/artifacts/465006",
        credit: "Cuneiform Digital Library Initiative, Max Planck Institute for the History of Science",
        detail: "\"Found by John George Taylor in October 1861; Donated by John George Taylor in 1863\"; British Museum BM 118884",
        supports: "The finder, the month and year of the find, the donation year and the museum number",
      },
      {
        tier: "institution",
        label: "Royal Asiatic Society archives: John George Taylor",
        url: "https://royalasiaticarchives.org/index.php/taylor-john-george",
        credit: "Royal Asiatic Society of Great Britain and Ireland",
        detail: "\"In 1861 he recovered stelae of Ashurnasirpal II and Shalmaneser III at Kurkh near Diyarbekir, and he was commissioned to excavate in this region on behalf of the British Museum\"; also records him as the son of Colonel R. Taylor",
        supports: "Who Taylor was, what he was doing at Kurkh, and his relation to the Taylor of the Sennacherib prism",
      },
      {
        tier: "scholarly",
        label: "A. K. Grayson, Assyrian Rulers of the Early First Millennium BC II (858-745 BC)",
        credit: "A. Kirk Grayson",
        detail: "Royal Inscriptions of Mesopotamia, Assyrian Periods 3 (Toronto: University of Toronto Press, 1996). The Kurkh text is RIMA 3 A.0.102.2. Print only",
        supports: "The standard edition of the inscription, including the Qarqar coalition list and Ahab's chariot figure",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Kingdom of Israel",
        url: "https://www.bibleodyssey.org/articles/kingdom-of-israel/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Kurkh Monoliths",
        url: "https://en.wikipedia.org/wiki/Kurkh_Monoliths",
      },
    ],
  },
  {
    id: "nuzi-tablets",
    name: "Nuzi Tablets",
    alternateNames: ["Nuzi texts", "Nuzi archives", "Nuzi tablet"],
    category: "discovery",
    role: "Hurrian Family and Legal Archives, Fifteenth-Fourteenth Century BC",
    summary:
      "Some five thousand cuneiform tablets from a provincial town near modern Kirkuk, once presented as decisive proof that Genesis preserves authentic second-millennium customs — a claim later scholarship has substantially withdrawn.",
    sections: [
      {
        heading: "The Archive",
        paragraphs: [
          "Between 1925 and 1931, excavations at Yorghan Tepe in northern Iraq — ancient Nuzi — recovered roughly five thousand clay tablets from private houses and public buildings. The town was Hurrian, under the kingdom of Mitanni, in the fifteenth and fourteenth centuries BC. The tablets are almost entirely everyday documents: adoptions, marriage contracts, wills, loans, lawsuits, land sales, inventories. It is one of the fullest pictures we have of ordinary family and property law anywhere in the ancient Near East.",
          "The excavators and the scholars who first published them noticed that some of these arrangements looked strikingly like customs in the patriarchal narratives — and for about forty years, that observation became one of the best-known arguments for the historical setting of Genesis.",
        ],
      },
      {
        heading: "The Parallels, as They Were Argued",
        paragraphs: [
          "The case, developed above all by Ephraim Speiser and Cyrus Gordon in the mid-twentieth century, ran roughly like this. Abraham, childless, expects his servant Eliezer to inherit (Genesis 15:2-3), and Nuzi has adoptions of a servant as heir, voided by the later birth of a natural son. Sarah, barren, gives Hagar to Abraham to bear a child on her behalf (Genesis 16:1-4), and Nuzi marriage contracts require a barren wife to provide a servant woman for exactly that purpose. Esau sells his birthright for a meal (Genesis 25:29-34), and Nuzi records a man selling an inheritance share to his brother for three sheep. Rachel steals her father's household gods (Genesis 31:19), and Nuzi documents were read as making possession of the household gods a claim on the estate.",
          "The conclusion drawn was that the patriarchal stories reflect a genuine second-millennium legal world that a much later writer could not have invented — a strong argument, widely repeated in study Bibles and pulpits, and still repeated today.",
        ],
      },
      {
        heading: "Why Specialists Walked It Back",
        paragraphs: [
          "From the 1970s onward the case was taken apart, largely by scholars working directly with the tablets. Thomas Thompson and John Van Seters, among others, showed that several of the celebrated parallels rested on misreadings. The Nuzi household-gods texts do not in fact make possession of the figures a title to inheritance; that reading was imported into them. The servant-heir adoptions are not as close a match as claimed. And crucially, most of the practices that do genuinely parallel Genesis — surrogate childbearing by a servant, adoption, transfers of inheritance — are attested widely across the ancient Near East and across many centuries, including the first millennium BC. A custom found in every period cannot date a story to one of them.",
          "That leaves an honest and less dramatic position, which is roughly where the field now sits. The Nuzi tablets are a superb source for Hurrian family law and for the texture of ordinary life in the ancient Near East. They show that the social world Genesis describes is a plausible one. They do not date the patriarchal narratives, and the confident mid-century claim that they proved a second-millennium origin has not survived scrutiny. This atlas includes the article partly because that overreach is itself worth knowing about: evidence pressed harder than it will bear tends, eventually, to be pressed back."
        ],
      },
    ],
    verses: [
      { reference: "Genesis 15:2-3", note: "Abram expects a servant of his household to be his heir" },
      { reference: "Genesis 16:1-4", note: "Sarai gives Hagar to Abram" },
      { reference: "Genesis 25:29-34", note: "Esau sells his birthright" },
      { reference: "Genesis 31:19-35", note: "Rachel takes her father's household idols" },
    ],
    sources: [
      { label: "Wikipedia: Nuzi", url: "https://en.wikipedia.org/wiki/Nuzi" },
      { label: "Bible Odyssey (SBL): Abraham", url: "https://www.bibleodyssey.org/articles/abraham/" },
    ],
    discovery: {
      objectType: "Roughly five thousand clay tablets in Akkadian cuneiform — adoptions, marriage contracts, wills, loans, lawsuits, land sales and inventories",
      findSite: "Yorghan Tepe (ancient Nuzi), near Kirkuk, northern Iraq",
      foundYear: "1925-1931",
      foundBy: "Successive excavation seasons directed by Edward Chiera, Robert H. Pfeiffer and Richard F. S. Starr, under the Baghdad School of the American Schools of Oriental Research and later Harvard University and the Fogg Art Museum, with the Iraq Museum",
      objectDate: "Fifteenth and fourteenth centuries BC",
      objectDateCertainty: "traditional",
      currentLocation: "Divided chiefly between the Harvard Museum of the Ancient Near East, the Institute for the Study of Ancient Cultures at Chicago, and the Iraq Museum in Baghdad",
    },
    citations: [
      {
        tier: "institution",
        label: "Richard F. S. Starr, Nuzi: Report on the Excavations at Yorgan Tepa near Kirkuk, Iraq (Harvard University Press, 1937-1939)",
        url: "https://commons.library.stonybrook.edu/amar/350/",
        credit: "Richard F. S. Starr, for Harvard University and the American Schools of Oriental Research",
        detail: "The excavating body's own final report, digitised in the Ancient Middle Archaeological Reports collection",
        supports: "The excavation years, the site and who dug it",
      },
      {
        tier: "scholarly",
        label: "Thomas L. Thompson, The Historicity of the Patriarchal Narratives",
        credit: "Thomas L. Thompson",
        detail: "BZAW 133, Berlin: de Gruyter, 1974 — with John Van Seters's Abraham in History and Tradition (Yale, 1975), the pair of studies that dismantled the mid-century Nuzi parallels. Print only",
        supports: "The walking-back described in section three, cited to the scholarship that actually did it",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Abraham",
        url: "https://www.bibleodyssey.org/articles/abraham/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Nuzi",
        url: "https://en.wikipedia.org/wiki/Nuzi",
      },
    ],
  },
  {
    id: "amarna-letters",
    name: "Amarna Letters",
    alternateNames: ["Amarna tablets", "Tell el-Amarna letters", "el-Amarna letters"],
    category: "discovery",
    role: "Egyptian Diplomatic Archive, Fourteenth Century BC",
    summary:
      "Around 380 clay tablets from the abandoned Egyptian capital at Amarna — the incoming diplomatic mail of two pharaohs, and the closest thing we have to a live picture of Canaan in the century or so before Israel appears there.",
    sections: [
      {
        heading: "A Pharaoh's In-Tray",
        paragraphs: [
          "Around 1887 local villagers digging in the ruins of Akhetaten — the short-lived capital built by Akhenaten in Middle Egypt, now Tell el-Amarna — turned up inscribed clay tablets. The story usually told, of a single peasant woman digging for fertiliser who stumbled on the pharaoh's archive, is traditional rather than documented: every version of it is secondhand and they contradict one another. What is certain is that the tablets surfaced through villagers and passed into the hands of dealers, so that the archive was scattered and some of it destroyed before scholars reached it. Nearly four hundred were eventually recovered, most of them letters received by the Egyptian court under Amenhotep III and his son Akhenaten in the fourteenth century BC. They are written not in Egyptian but in Akkadian, the diplomatic language of the whole Near East at the time, on clay, in cuneiform, by scribes in Canaan and Syria writing to Egypt in a language native to neither.",
          "Some are correspondence between great kings — Babylon, Assyria, Mitanni, the Hittites — trading gold, marriage alliances, and elaborate courtesy. The larger group is from the rulers of the small city-states of Canaan, who were Egyptian vassals. These are less dignified. They plead for troops, denounce their neighbours as traitors, complain that previous letters have gone unanswered, and protest their own loyalty at length.",
        ],
      },
      {
        heading: "Canaan Before Israel",
        paragraphs: [
          "This is the archive's real value for Bible readers. It shows Canaan as a patchwork of small, fortified, quarrelsome city-states — Jerusalem, Shechem, Megiddo, Gezer, Lachish, Hazor and dozens more — under loose Egyptian overlordship, each with its own ruler, none able to dominate the others, all of them appealing to a distant pharaoh who mostly did nothing. That is recognisably the political landscape the books of Joshua and Judges describe, minus Israel.",
          "The letters from Abdi-Heba, the ruler of Jerusalem, are among the earliest written references to the city — six letters begging Egypt for archers and warning that the land is being lost. Shechem appears under a ruler named Labaya, who is repeatedly accused of carving out territory for himself. A reader who wants a sense of what a Canaanite city-state was and how it behaved will find it here rather than in any monument.",
        ],
      },
      {
        heading: "The Habiru Question",
        paragraphs: [
          "Many of the letters complain about the 'Apiru or Habiru, groups outside the settled order who raid, take service as mercenaries, and shelter runaways. When the tablets were first read, the resemblance between Habiru and Hebrew was electrifying, and for decades the Amarna letters were presented as an outside witness to Israel's arrival in Canaan.",
          "That identification has largely been abandoned, and for good reasons. Habiru turns up across the Near East for the better part of a thousand years, from Mesopotamia to Anatolia to Egypt, referring to people of varied origins; it describes a social and legal status — displaced, stateless, outside the city system — rather than an ethnic group. The Amarna Habiru are used by Canaanite rulers as an insult for rivals as much as a description of outsiders. A linguistic relationship between the words is possible and is still argued by some scholars; an equation between the Habiru of these letters and the Israelites of the Bible is not supportable, and should not be offered as though it were.",
        ],
      },
    ],
    verses: [
      { reference: "Joshua 10:1-5", note: "A coalition of Canaanite city-state kings, including Jerusalem" },
      { reference: "Joshua 12:7-24", note: "The list of defeated kings — one per city, exactly the Amarna pattern" },
      { reference: "Judges 1:27-36", note: "Canaanite cities Israel did not take" },
      { reference: "Genesis 34:1-31", note: "Shechem, whose Amarna-era ruler Labaya troubled his neighbours" },
    ],
    sources: [
      { label: "Bible Odyssey (SBL): Jerusalem in the Amarna Letters", url: "https://www.bibleodyssey.org/articles/jerusalem-in-the-amarna-letters/" },
      { label: "Wikipedia: Amarna letters", url: "https://en.wikipedia.org/wiki/Amarna_letters" },
    ],
    discovery: {
      objectType: "Around 380 clay tablets in Akkadian cuneiform — an archive of incoming diplomatic correspondence",
      findSite: "Tell el-Amarna (ancient Akhetaten), Middle Egypt",
      foundYear: "c. 1887",
      foundBy: "Local villagers, who sold the tablets on to dealers. The familiar story of a single peasant woman digging for fertiliser is traditional and unverifiable — every account of it is secondhand and they contradict one another",
      objectDate: "Fourteenth century BC, in the reigns of Amenhotep III and Akhenaten",
      objectDateCertainty: "firm",
      currentLocation: "Divided between the Vorderasiatisches Museum in Berlin, the British Museum, the Egyptian Museum in Cairo, the Louvre and other collections",
      unprovenanced: true,
    },
    citations: [
      {
        tier: "institution",
        label: "Staatliche Museen zu Berlin: Vorderasiatisches Museum",
        url: "https://www.smb.museum/en/museums-institutions/vorderasiatisches-museum/home/",
        credit: "Staatliche Museen zu Berlin",
        detail: "The museum holding the largest share of the Amarna correspondence",
        supports: "Where the bulk of the archive is held today",
      },
      {
        tier: "scholarly",
        label: "William L. Moran, The Amarna Letters",
        credit: "William L. Moran",
        detail: "Johns Hopkins University Press, 1992 — the standard English edition and translation of the whole corpus. Print only",
        supports: "The content of the letters, including Abdi-Heba's letters from Jerusalem and the 'Apiru complaints",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Jerusalem in the Amarna Letters",
        url: "https://www.bibleodyssey.org/articles/jerusalem-in-the-amarna-letters/",
        credit: "Society of Biblical Literature",
        supports: "Abdi-Heba's letters and what they show about fourteenth-century Jerusalem",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Amarna letters",
        url: "https://en.wikipedia.org/wiki/Amarna_letters",
      },
    ],
  },
  {
    id: "epic-of-gilgamesh",
    name: "Epic of Gilgamesh",
    // NOT registered: bare "Gilgamesh" — in this dataset it is used for the king as a character as
    // often as for the poem, and the two-word forms below cover every mention that means the text.
    alternateNames: ["Gilgamesh Epic"],
    category: "discovery",
    role: "Akkadian Poem, Standard Version c. 1200 BC",
    summary:
      "The great Mesopotamian poem about a king's search for immortality — whose eleventh tablet tells a flood story so close to Genesis 6-9 that its decipherment in 1872 caused a public sensation.",
    sections: [
      {
        heading: "George Smith's Announcement",
        paragraphs: [
          "The tablets came from the library Ashurbanipal assembled at Nineveh in the seventh century BC. Austen Henry Layard dug the first large group out of the South-West Palace at Kuyunjik in the spring of 1850, and Hormuzd Rassam found a second group in the North Palace in late 1853; both were shipped in fragments to the British Museum, where some thirty thousand of them still are. In 1872 George Smith, a former banknote engraver who had taught himself cuneiform while working as a museum assistant, was sorting fragments when he read an account of a flood, a ship, and a bird sent out to find land. He is said to have run about the room in his excitement. His lecture announcing it, to the Society of Biblical Archaeology on 3 December 1872, made the front pages.",
          "The poem itself is much larger than the flood episode. It follows Gilgamesh, king of Uruk, and his friend Enkidu through adventure and then through Enkidu's death, after which Gilgamesh — undone by the fact of mortality — sets out to find the one man who survived the flood and was granted unending life. The standard twelve-tablet version was compiled around 1200 BC from older Sumerian and Akkadian material going back centuries further.",
        ],
      },
      {
        heading: "Tablet XI and Genesis",
        paragraphs: [
          "In Tablet XI, Utnapishtim tells Gilgamesh how the gods decided to destroy humanity, how the god Ea warned him, how he built and sealed a great vessel and loaded it with his family, craftsmen, and animals, how the storm raged for days, how the boat grounded on a mountain, how he released birds — a dove, a swallow, a raven — until one did not return, and how he then offered a sacrifice on the mountaintop around which the gods gathered.",
          "The overlap with Genesis 6-9 is not vague, and it is not honest to minimise it. The warning, the vessel, the animals, the duration, the mountain landing, the birds, the sacrifice on emerging, and even a rainbow-like token all appear in both. Anyone who has read the two will notice, and a reader who is told there is no resemblance will rightly stop trusting whoever told them.",
        ],
      },
      {
        heading: "What the Resemblance Means",
        paragraphs: [
          "Here scholars and Christians divide, and the divisions do not fall neatly along belief. Some hold that both accounts remember a real catastrophic flood, preserved in two traditions from a common source. Some hold that Israel knew the Mesopotamian story — Abraham came from Ur, after all — and retold it deliberately. Some hold that the Genesis account was composed in conscious argument with a story its first readers already knew, especially during the Babylonian exile. Each position has serious defenders, and the evidence does not force a choice.",
          "What the comparison does show plainly is how differently the two tell it. In Gilgamesh, the gods send the flood because humanity has grown too numerous and too noisy for them to sleep; they quarrel about it; when it comes they are terrified of their own storm and cower like dogs against a wall; and when the sacrifice is offered they swarm around it like flies, because they have not eaten. In Genesis, one God acts alone, for a stated moral reason, grieved rather than annoyed, and afterward binds himself by a covenant never to do it again. The shared furniture makes the difference in the theology impossible to miss — which may be exactly the point.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 6:5-8", note: "The flood as a moral judgment, and Noah finding favour" },
      { reference: "Genesis 7:11-24", note: "The flood itself" },
      { reference: "Genesis 8:6-12", note: "The raven and the dove" },
      { reference: "Genesis 8:20-22", note: "The sacrifice on leaving the ark" },
      { reference: "Genesis 9:8-17", note: "The covenant and the bow in the cloud" },
    ],
    sources: [
      { label: "Bible Odyssey (SBL): Gilgamesh and the Bible", url: "https://www.bibleodyssey.org/articles/gilgamesh-and-the-bible/" },
      { label: "Wikipedia: Epic of Gilgamesh", url: "https://en.wikipedia.org/wiki/Epic_of_Gilgamesh" },
    ],
    discovery: {
      objectType: "Baked clay tablets in Akkadian cuneiform; the flood account is Tablet XI",
      findSite: "Kuyunjik (Nineveh), in the library of Ashurbanipal",
      findSiteId: "nineveh",
      findSiteKind: "location",
      foundYear: "Excavated from 1850 onward; the flood account recognised among the fragments in 1872",
      foundBy: "Austen Henry Layard, who found the first large group of library tablets in spring 1850, and Hormuzd Rassam, who found a second group in late 1853. George Smith identified and translated the flood account in London in 1872 — he did not excavate it",
      objectDate: "The Nineveh copies were written in the seventh century BC; the standard version was compiled c. 1200 BC",
      objectDateCertainty: "traditional",
      currentLocation: "British Museum, London (the flood tablet is K.3375, from the Kuyunjik collection)",
    },
    citations: [
      {
        tier: "institution",
        label: "The Ashurbanipal Library Project: excavating the library",
        url: "https://oracc.museum.upenn.edu/asbp/archaeologyofthelibrary/excavations/",
        credit: "The British Museum's Ashurbanipal Library Project, published on Oracc (University of Pennsylvania)",
        detail: "Dates Layard's find of the first large tablet group to March-May 1850 and Rassam's second group to late 1853; puts the library at around 32,000 tablets and fragments",
        supports: "Who excavated the tablets, when, and how they reached London",
      },
      {
        tier: "primary",
        label: "George Smith, The Chaldean Account of Genesis",
        url: "https://www.gutenberg.org/files/60559/60559-h/60559-h.htm",
        credit: "George Smith; this full text is the 1880 edition revised by A. H. Sayce, of a work first published in 1876",
        detail: "Smith's own account, including his record of the lecture \"a meeting of the Society of Biblical Archaeology, December 3rd, 1872\". Public domain",
        supports: "The date and venue of Smith's announcement, and his own description of the flood text",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Gilgamesh and the Bible",
        url: "https://www.bibleodyssey.org/articles/gilgamesh-and-the-bible/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Epic of Gilgamesh",
        url: "https://en.wikipedia.org/wiki/Epic_of_Gilgamesh",
      },
    ],
  },
  {
    id: "enuma-elish",
    name: "Enuma Elish",
    alternateNames: ["Enûma Eliš", "Babylonian creation epic"],
    category: "discovery",
    role: "Babylonian Creation Poem, Seven Tablets",
    summary:
      "The Babylonian account of how the world was made — Marduk killing the sea-goddess Tiamat and building the cosmos from her body — read alongside Genesis 1 ever since its publication in 1876.",
    sections: [
      {
        heading: "\"When On High\"",
        paragraphs: [
          "The poem is named for its opening words, enuma elish, \"when on high.\" It survives on seven clay tablets, mostly from Ashurbanipal's library at Nineveh, and was published by George Smith in 1876, four years after his flood discovery. Smith, working from what he had, wrote only that the series ran to \"at least seven tablets\"; the seven-tablet shape now taken as standard was an inference before it was a count. A ritual text describes the poem being recited before Marduk's statue at the New Year festival, which tells you what it was for — a civic liturgy exalting Babylon and its god as much as a story about origins. That ritual text is itself very late, from the Parthian period, so the recitation is well attested for the end of Babylonian religion and inferred backwards for its beginning.",
          "It begins before anything is named, with only the mingled fresh and salt waters, Apsu and Tiamat. Younger gods are born, are noisy, and are resented; Apsu plots to destroy them and is killed first. Tiamat responds by breeding monsters and making war, and the terrified gods can find no champion until Marduk agrees — on condition that they make him supreme over all of them. He kills Tiamat, splits her body like a shellfish, and makes the sky from one half and the earth from the other; he sets the stars in their courses and fixes the calendar; and finally, so that the gods need not labour, humanity is made from the blood of the slain god who led Tiamat's revolt.",
        ],
      },
      {
        heading: "Set Beside Genesis 1",
        paragraphs: [
          "The similarities that struck early readers are structural. Both begin with a watery, formless state; both proceed by separation — waters above from waters below, sky from earth; both set the lights in the heavens to mark seasons and days; both culminate in humanity; and the Hebrew word for the deep in Genesis 1:2, tehom, is linguistically related to the name Tiamat. In the late nineteenth and early twentieth centuries this was widely taken as evidence that Genesis was a sanitised Babylonian myth, an argument pressed hard in what became known as the Babel-Bible controversy.",
          "The differences are at least as striking, and current scholarship weights them more heavily. Genesis has no theogony — God is not born and has no rivals. There is no combat: the deep is simply there and is simply divided, and the great sea creatures of Genesis 1:21, which in the Babylonian frame would be monsters of chaos, are listed among the things God made and called good. The sun and moon are not deities but lamps, and Genesis pointedly declines to name them. And humanity is not slave labour made from a rebel's blood but is made in God's image and blessed. Where the two overlap in idiom, Genesis reads less like a copy than like a rebuttal.",
        ],
      },
      {
        heading: "Holding It Honestly",
        paragraphs: [
          "Two claims should be resisted. The first is that Genesis simply borrowed from Enuma Elish; the direct-dependence case, popular a century ago, is not the mainstream position now, and the differences are too systematic to be accidental tidying. The second is that there is no relationship at all; the shared vocabulary, sequence, and imagery are real, and Israel plainly wrote within a world that told this kind of story.",
          "The position most scholars hold, and the one this atlas takes, is in between: Genesis 1 speaks the cosmological language of its neighbours and uses it to say something they did not say. Knowing the neighbours' version makes the biblical text sharper, not weaker — you cannot hear an argument if you have never heard the position it is arguing against.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 1:1-2", note: "The formless deep — tehom, the word related to Tiamat" },
      { reference: "Genesis 1:6-10", note: "Separating the waters and the dry land" },
      { reference: "Genesis 1:14-19", note: "The sun and moon as lamps, unnamed and undeified" },
      { reference: "Genesis 1:21", note: "The great sea creatures, made and called good" },
      { reference: "Genesis 1:26-28", note: "Humanity in God's image, not as the gods' labour force" },
    ],
    sources: [
      { label: "Wikipedia: Enûma Eliš", url: "https://en.wikipedia.org/wiki/En%C3%BBma_Eli%C5%A1" },
      { label: "Bible Odyssey (SBL): Gilgamesh and the Bible", url: "https://www.bibleodyssey.org/articles/gilgamesh-and-the-bible/" },
    ],
    discovery: {
      objectType: "Baked clay tablets in Akkadian cuneiform, the poem running to seven tablets",
      findSite: "Kuyunjik (Nineveh), in the library of Ashurbanipal; further copies later at Ashur, Kish and Sultantepe",
      findSiteId: "nineveh",
      findSiteKind: "location",
      foundYear: "Excavated in the Nineveh campaigns from 1850 onward; identified and published in 1876",
      foundBy: "Excavated by Austen Henry Layard and Hormuzd Rassam for the British Museum; the creation text was identified and published by George Smith",
      objectDate: "The Nineveh copies were written in the seventh century BC; when the poem itself was composed is genuinely disputed, with proposals spread across the second millennium BC",
      objectDateCertainty: "disputed",
      currentLocation: "British Museum, London, with further copies elsewhere",
    },
    citations: [
      {
        tier: "institution",
        label: "Ancient Mesopotamian Gods and Goddesses: Marduk",
        url: "https://oracc.museum.upenn.edu/amgg/listofdeities/marduk/",
        credit: "Oracc (University of Pennsylvania), a peer-reviewed academic corpus project",
        detail: "\"A ritual text dating to the Parthian period describes how Enuma elish was recited in front of Marduk's statue during the New Year's festival\"",
        supports: "The akitu recitation, and the fact that the evidence for it is a very late text",
      },
      {
        tier: "primary",
        label: "George Smith, The Chaldean Account of Genesis (first published 1876)",
        url: "https://www.gutenberg.org/files/60559/60559-h/60559-h.htm",
        credit: "George Smith; this full text is the 1880 edition revised by A. H. Sayce",
        detail: "Smith's own publication of the creation series, including his note that it ran to \"at least seven tablets\" and the Ashurbanipal colophon tying it to the Nineveh library. Public domain",
        supports: "The 1876 publication, the seven-tablet structure and the Nineveh provenance",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): Gilgamesh and the Bible",
        url: "https://www.bibleodyssey.org/articles/gilgamesh-and-the-bible/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Enûma Eliš",
        url: "https://en.wikipedia.org/wiki/En%C3%BBma_Eli%C5%A1",
      },
    ],
  },
  {
    id: "code-of-hammurabi",
    name: "Code of Hammurabi",
    // NOT registered: bare "Hammurabi" — that is the king, who is the subject of timeline events in
    // his own right ("Hammurabi and the Rise of Babylon"), and linking every mention of the man to
    // his law code would be wrong more often than right.
    alternateNames: ["Hammurabi's Code", "Laws of Hammurabi", "Hammurabi Code", "Hammurabi stele"],
    category: "discovery",
    role: "Babylonian Law Collection, c. 1750 BC",
    summary:
      "A seven-foot pillar of black stone carrying nearly three hundred laws and the king's account of why he made them — the closest and most instructive ancient parallel to the laws of Exodus.",
    sections: [
      {
        heading: "Carried Off as Loot, and Found at Susa",
        paragraphs: [
          "The stele was set up in Babylon in the eighteenth century BC. Around 1150 BC an Elamite king raided Babylonia and carried it home as plunder, which is why a French expedition under Jacques de Morgan dug it up at Susa, in southwestern Iran, in the winter of 1901-02. It is now in the Louvre. At the top, a relief shows Hammurabi standing before the seated sun god Shamash, god of justice, receiving the rod and ring of authority; below, in tight columns of archaic cuneiform, run the laws.",
          "They are not a code in the modern sense of a comprehensive statute book. They are a collection of rulings in the form \"if a man does X, then Y,\" framed by a prologue in which Hammurabi says the gods called him to make justice appear in the land and to keep the strong from oppressing the weak, and an epilogue heaping curses on any later king who alters them. Whether they were actually applied in court, or functioned mainly as a monument advertising the king's righteousness, is genuinely debated — surviving Babylonian court records rarely cite them.",
        ],
      },
      {
        heading: "Alongside the Book of the Covenant",
        paragraphs: [
          "The parallels with Exodus 21-23 are close enough to be worth reading side by side. Both are cast in the same conditional form. Both handle the goring ox, and in remarkably similar terms: an ox that has gored before, whose owner was warned and did nothing, brings the owner into liability, where a first offence does not. Both address injury to a pregnant woman, a slave's status and release, theft and restitution, deposits left with a neighbour, and the negligent builder. And both use the talion formula — an eye for an eye, a tooth for a tooth.",
          "That is a shared legal tradition, not a borrowing. Hammurabi's laws are some five centuries older than any date proposed for Moses, and there is no evidence of direct literary dependence; what the resemblance shows is that Israel's law was written in the legal language of its world, in forms any ancient Near Eastern reader would have recognised. It is the same point as Gilgamesh and Enuma Elish, in a different register.",
        ],
      },
      {
        heading: "Where They Differ",
        paragraphs: [
          "The differences are where the comparison earns its keep. Hammurabi's penalties are explicitly graded by social class: the same injury costs a different amount depending on whether the victim is a free man, a commoner, or a slave, and an offence against a superior is punished far more severely than the reverse. Israel's law applies one standard and famously insists on it — \"you shall have one kind of law, for the foreigner as well as for the native-born.\" Hammurabi makes a long list of property offences capital, including theft and receiving stolen goods; the Torah does not execute for property crimes, and the balance it strikes between life and property runs consistently the other way.",
          "The framing differs too. Hammurabi presents the laws as his own achievement, and the epilogue is largely about his reputation. The Torah presents its laws as the terms of a covenant between God and a whole people, addressed to that people in the second person — \"you shall,\" not \"if a man\" — and grounded repeatedly in a shared memory: you were slaves in Egypt, therefore do not do this to the vulnerable among you. The talion formula reads differently inside that frame, as a limit on vengeance rather than a licence for it, which is how Jesus takes it up in the Sermon on the Mount."
        ],
      },
    ],
    verses: [
      { reference: "Exodus 21:28-32", note: "The goring ox — the closest single parallel" },
      { reference: "Exodus 21:23-25", note: "\"Eye for eye, tooth for tooth\"" },
      { reference: "Exodus 22:21-27", note: "The stranger, the widow, the orphan, and the poor man's cloak" },
      { reference: "Leviticus 24:22", note: "\"One kind of law for the foreigner as well as the native-born\"" },
      { reference: "Matthew 5:38-42", note: "Jesus on \"an eye for an eye\"" },
    ],
    sources: [
      { label: "Wikipedia: Code of Hammurabi", url: "https://en.wikipedia.org/wiki/Code_of_Hammurabi" },
      { label: "Louvre: the Code of Hammurabi stele", url: "https://collections.louvre.fr/en/ark:/53355/cl010174436" },
      { label: "Bible Odyssey (SBL): The Ten Commandments", url: "https://www.bibleodyssey.org/articles/the-ten-commandments/" },
    ],
    discovery: {
      objectType: "Basalt stele, 2.25 m high, carved with a relief and c. 282 laws in archaic cuneiform",
      findSite: "Susa, southwestern Iran — where it had been carried as Elamite plunder from Babylon",
      findSiteId: "susa",
      findSiteKind: "location",
      foundYear: "1901-1902",
      foundBy: "The French archaeological mission at Susa under Jacques de Morgan; first published by Jean-Vincent Scheil in 1902",
      objectDate: "c. 1750 BC",
      objectDateCertainty: "traditional",
      currentLocation: "Musée du Louvre, Paris (Sb 8)",
    },
    citations: [
      {
        tier: "institution",
        label: "Louvre collections: Code de Hammurabi, roi de Babylone (Sb 8)",
        url: "https://collections.louvre.fr/en/ark:/53355/cl010174436",
        credit: "Musée du Louvre, Département des Antiquités orientales",
        detail: "Material basalt; H. 225 cm, W. 79 cm, D. 47 cm; found at Susa 1901-1902, mission de Morgan",
        supports: "Material, dimensions, findspot, excavator and inventory number",
      },
      {
        tier: "primary",
        label: "The Code of Hammurabi, translated by Robert Francis Harper (1904)",
        url: "https://en.wikisource.org/wiki/The_Code_of_Hammurabi_(Harper_translation)",
        credit: "Robert Francis Harper, University of Chicago Press",
        detail: "Public domain; prologue, 282 laws and epilogue in full",
        supports: "The text of the prologue, the talion formula and the graded penalties described in section three",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): The Ten Commandments",
        url: "https://www.bibleodyssey.org/articles/the-ten-commandments/",
        credit: "Society of Biblical Literature",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Code of Hammurabi",
        url: "https://en.wikipedia.org/wiki/Code_of_Hammurabi",
      },
    ],
  },
  /* ---------------------------------------------------------------------------------------------
   * ARCHAEOLOGY — BATCH 2: core inscriptions, royal records and background archives.
   *
   * Fourteen new `discovery` records. Two candidates from the batch list are deliberately absent —
   * the Erastus and Gallio inscriptions already exist as POI records with map pins and public
   * /site/ pages, and a Topic of the same name would both duplicate the page and steal the linker
   * key (topics are pushed after pois, so the later entry wins the lowercase name). Those two were
   * corrected in place in `pois.ts` instead. See the handoff note in the manager inbox.
   *
   * Every attribution below was re-checked against the verification dossier in
   * automation/manager/archaeology-scope.md §2.5b-d rather than written from the candidate table.
   * Six of them changed as a result, and each carries a comment saying so.
   *
   * Naming rule, as elsewhere in this block: never register a bare place name. "Lachish Reliefs" is
   * safe; "Lachish" belongs to the city. And never write a modern scholar's biblical first name in
   * prose — "David Ussishkin" links "David" to the king, which is how "John George Taylor" came to
   * point at John the Baptist on the live site. Initials, or the surname alone.
   * ------------------------------------------------------------------------------------------- */
  {
    id: "lachish-reliefs",
    name: "Lachish Reliefs",
    // NOT registered: "Lachish" — that is the city, which owns it in locations.ts.
    alternateNames: ["Siege of Lachish Reliefs", "Lachish Relief"],
    category: "discovery",
    role: "Assyrian Palace Reliefs of the Siege of Lachish, 701 BC",
    summary:
      "A room-sized panorama of an Assyrian army taking a Judahite city, carved for the king who took it — the only siege in the Old Testament that anybody drew.",
    sections: [
      {
        heading: "Cut Out of a Palace Wall at Nineveh",
        paragraphs: [
          "In 1847, in the last months of his first Nineveh campaign, Austen Henry Layard was working through the South-West Palace of Sennacherib on the mound of Kouyunjik when he opened a room since catalogued as Room XXXVI. Its walls were lined with carved gypsum panels, and unlike most Assyrian palace reliefs these did not show a generic enemy in a generic landscape. They showed one siege, in sequence, around a single room, with an epigraph naming the city.",
          "No individual finder is recorded, and none should be invented. The digging was done by local labourers under Layard and his foreman Hormuzd Rassam, and the excavation records name nobody for this room. Rassam is often credited with the Lachish reliefs and should not be: his own celebrated discoveries at Nineveh — the North Palace, the library of Ashurbanipal — belong to 1853 and later. The panels were shipped to London and are in the British Museum, registered in the 1856,0909 series; the best known of them is BM 124911. A full inclusive range of registration numbers circulates online and could not be confirmed, so it is not repeated here.",
        ],
      },
      {
        heading: "The Siege, Drawn by the Besiegers",
        paragraphs: [
          "The panels run from the Assyrian camp through the assault to the aftermath. Archers and slingers advance behind wicker screens; siege engines with battering rams climb a ramp built against the city wall while defenders drop torches on them; the wall is defended and then breached. Below, a column of prisoners files out with bundles, ox-carts and children, and three men are shown impaled outside the gate. At the right end the king sits on a throne in a hilly landscape, and a cuneiform epigraph beside him reads, in the standard translation, that Sennacherib, king of the world, king of Assyria, sat on a throne while the booty of Lachish passed before him.",
          "That is 2 Kings 18:14 from the other side of the wall. Scripture places Sennacherib at Lachish twice — Hezekiah sends his surrender payment there, and the Assyrian delegation that goes up to Jerusalem is dispatched from there — and 2 Chronicles 32:9 says plainly that the king was before Lachish with all his forces. The excavated city agrees with the picture: the siege ramp shown on the panels is a real feature at Tel Lachish, the earliest siege ramp known anywhere, and the destruction layer above it is thick with Assyrian arrowheads, sling stones and scale armour. It is very rare to have a biblical event, a contemporary enemy account, a contemporary enemy picture and the ruined site itself, and this is the clearest case of all four.",
        ],
      },
      {
        heading: "What Fixed the Date, and What the Room Does Not Say",
        paragraphs: [
          "All of that depends on one argument that took fifty years to settle. The destruction layer at Lachish is Level III, and the excavator J. L. Starkey, following W. F. Albright, assigned it to Nebuchadnezzar's campaign of 597 BC — more than a century after Sennacherib. Olga Tufnell, who published Starkey's material after his murder, argued for 701 BC instead, and D. Ussishkin's renewed excavations from the 1970s onward made that case decisively: the pottery of Level III belongs with the eighth century, the siege ramp is Assyrian in construction, and Level II is the layer Nebuchadnezzar burned. Ussishkin's dating is now the consensus. It is worth naming the argument rather than skipping to the answer, because until it was settled the reliefs could not be tied to any particular biblical moment at all.",
          "Two limits on what the room proves. It is royal propaganda, commissioned by the king it flatters, and it says what he wanted said — which is why the impaled prisoners are there and why nothing in it goes wrong for Assyria. And there is a silence in it. Sennacherib decorated an entire room of his palace with the fall of Lachish and did not decorate one with the fall of Jerusalem, which his own annals never claim to have taken; his boast there is that he shut Hezekiah up like a bird in a cage. That absence fits 2 Kings 19's account of a siege that lifted, and it is a fair thing to notice. It is not the same as evidence for how the siege lifted, and an argument from what a propagandist left out will only ever be suggestive.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 18:13-14", note: "Sennacherib takes the fortified cities of Judah; Hezekiah sends tribute to him at Lachish" },
      { reference: "2 Kings 18:17", note: "The Assyrian delegation to Jerusalem is sent from Lachish" },
      { reference: "2 Chronicles 32:9", note: "\"He was before Lachish, and all his power with him\"" },
      { reference: "Jeremiah 34:7", note: "Lachish still standing, and nearly alone, in Judah's last war" },
    ],
    sources: [
      { label: "Wikipedia: Lachish reliefs", url: "https://en.wikipedia.org/wiki/Lachish_reliefs" },
    ],
    discovery: {
      objectType: "Carved gypsum wall panels lining a single room, showing one siege in continuous sequence",
      findSite: "Room XXXVI of the South-West Palace of Sennacherib at Kouyunjik, Nineveh",
      findSiteId: "nineveh",
      findSiteKind: "location",
      // CORRECTED (scope §2.5b): the candidate table said "1840s, Layard". Layard's first Nineveh
      // campaign ran 1845-1847 and the Lachish room is consistently dated 1847.
      foundYear: "1847",
      foundBy: "Austen Henry Layard's first Nineveh excavation. No individual finder is recorded — the work was done by local labour under Layard and his foreman Hormuzd Rassam. Rassam is often credited with these panels and should not be; his own major Nineveh discoveries begin in 1853",
      objectDate: "c. 700-692 BC, within a decade of the campaign they depict",
      objectDateCertainty: "traditional",
      currentLocation: "British Museum, London — registered in the 1856,0909 series; BM 124911 is the best-known panel",
    },
    citations: [
      {
        tier: "institution",
        label: "RINAP 3: The Royal Inscriptions of Sennacherib, King of Assyria (Oracc)",
        url: "http://oracc.museum.upenn.edu/rinap/rinap3/",
        credit: "Royal Inscriptions of the Neo-Assyrian Period project, University of Pennsylvania Museum",
        detail: "The open online edition of Sennacherib's own inscriptions, including the third-campaign account of 701 BC in which Hezekiah is shut up like a bird in a cage",
        supports: "The Assyrian account of the 701 BC campaign, and what it does and does not claim about Jerusalem",
      },
      {
        tier: "institution",
        label: "British Museum, Lachish relief panels (1856,0909 series; BM 124911)",
        credit: "The British Museum",
        detail: "The panels' registration series and the individual number BM 124911 are confirmed. The museum's collection database refuses automated requests, so it was not fetched for this article; a full inclusive range of panel numbers circulates online and is not repeated here because it could not be confirmed",
        supports: "Current location and registration",
      },
      {
        tier: "scholarly",
        label: "D. Ussishkin, The Renewed Archaeological Excavations at Lachish (1973-1994)",
        credit: "David Ussishkin, Institute of Archaeology, Tel Aviv University",
        detail: "Monograph Series of the Institute of Archaeology 22, Tel Aviv, 2004 — the excavation report that settled the Level III dating on the 701 BC side. Print only",
        supports: "The Level III dating dispute and the archaeology of the siege ramp",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Lachish reliefs",
        url: "https://en.wikipedia.org/wiki/Lachish_reliefs",
      },
    ],
    reflectionPrompt:
      "The Assyrians carved their victory at Lachish and said nothing about Jerusalem. Where in your own life are you tempted to display only the room that flatters you?",
  },
  {
    id: "jehoiachin-ration-tablets",
    name: "Jehoiachin's Ration Tablets",
    // NOT registered: "Jehoiachin" — that is the king, who owns it in people.ts. Every alias below
    // is longer, so a mention of the tablets still wins over a mention of the man.
    alternateNames: ["Jehoiachin Ration Tablets", "Weidner Tablets", "Jehoiachin's Rations Tablets"],
    category: "discovery",
    role: "Babylonian Palace Ration Lists Naming a Captive King of Judah",
    summary:
      "Clay food-issue dockets from Nebuchadnezzar's palace, listing oil for a deported king of Judah and his sons — dug up around 1900, and not read for forty years.",
    sections: [
      {
        heading: "Dug Up in Babylon, Read Forty Years Later",
        paragraphs: [
          "Robert Koldewey's German Oriental Society expedition worked at Babylon from 1899 to 1917, and somewhere in those eighteen seasons — the exact one is not recoverable from the records — it cleared a barrel-vaulted underground building of parallel rooms near the Ishtar Gate, within the Southern Palace complex of Nebuchadnezzar II. In it was a cache of roughly three hundred administrative tablets recording issues of oil, barley and other rations to people the palace was feeding. No individual finder is named. The tablets went to Berlin with everything else and sat there.",
          "They were identified and published in 1939 by Ernst F. Weidner, in a study contributed to a festschrift for René Dussaud, and that gap of two to four decades between the digging and the reading is the most instructive thing about them. Nothing about the find was dramatic; nobody knew what was in the box. The tablet on display in the Vorderasiatisches Museum in Berlin is VAT 16378. Excavation numbers for the other tablets are widely quoted online, could not be confirmed against any published source, and are deliberately not given here.",
        ],
      },
      {
        heading: "Rations for the King of the Land of Yahudu",
        paragraphs: [
          "Several of the tablets list issues to Ya'u-kinu, king of the land of Yahudu — Jehoiachin, king of Judah — together with his sons and a number of other Judeans, alongside deportees and hostages from Egypt, Elam, Persia, Philistia and elsewhere. It is a palace ledger, not a chronicle. Nobody was making a point; a clerk was recording how much oil went out.",
          "2 Kings 24 has Jehoiachin surrendering to Nebuchadnezzar in the king of Babylon's eighth year and being carried to Babylon with his mother, his wives and his officers. Ezekiel dates his own visions by the years of Jehoiachin's captivity, which tells you the exiles reckoned time by their king rather than by the man ruling in Jerusalem after him. And 2 Kings 25:27-30 — repeated with one small difference of date in Jeremiah 52:31-34, the twenty-seventh of the month against the twenty-fifth — records that after thirty-seven years Evil-Merodach lifted up his head, gave him a seat above the other captive kings, and provided him a daily allowance for the rest of his life. The tablets are from the early part of that captivity, around Nebuchadnezzar's years ten to thirteen, roughly 595 to 592 BC. They show the ledger the last verses of 2 Kings describe the improvement of.",
        ],
      },
      {
        heading: "The Real Argument, and the One Not to Manufacture",
        paragraphs: [
          "It would be easy, and wrong, to write this article as a contested identification bravely defended. The identification of Ya'u-kinu of Yahudu with Jehoiachin is close to universally accepted and is not seriously disputed; there is no debate there to report. The genuine disagreements are narrower and less exciting. Was his status that of an honoured royal hostage drawing generous royal rations, or a detainee being kept alive? Are the \"five sons\" literally his sons or a household? How wide is the span of the tablets, and how much of the captivity do they cover? Specialists differ on all three, and none of them changes what the tablets show.",
          "The honest limit is about reach rather than authenticity. These dockets place a Judean king in Babylon on palace rations in the 590s. They say nothing about the release under Evil-Merodach more than thirty years later, which remains attested only in Scripture. And one caution for readers following this up: a great many websites conflate these tablets with the so-called Nebo-Sarsekim tablet, a different object identified in the British Museum in 2007 and bearing on a different verse in Jeremiah. The two are unrelated finds and neither corroborates the other.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 24:12-15", note: "Jehoiachin surrenders and is carried to Babylon with his household" },
      { reference: "2 Kings 25:27-30", note: "Thirty-seven years later, a daily allowance from the king of Babylon" },
      { reference: "Jeremiah 52:31-34", note: "The same release, dated two days differently" },
      { reference: "Ezekiel 1:2", note: "The exiles date their years by Jehoiachin's captivity, not by the king in Jerusalem" },
    ],
    sources: [
      { label: "Wikipedia: Jehoiachin's Rations Tablets", url: "https://en.wikipedia.org/wiki/Jehoiachin%27s_Rations_Tablets" },
    ],
    discovery: {
      objectType: "Clay administrative tablets in Akkadian cuneiform, from a cache of roughly 300 ration texts",
      findSite: "A barrel-vaulted underground building of parallel rooms near the Ishtar Gate, in the Southern Palace complex of Nebuchadnezzar II at Babylon",
      findSiteId: "babylon",
      findSiteKind: "location",
      foundYear: "During Robert Koldewey's excavations at Babylon, 1899-1917; the season is not recoverable",
      foundBy: "Robert Koldewey's German Oriental Society expedition. No individual finder is recorded. The tablets were identified and published by Ernst F. Weidner in 1939",
      objectDate: "c. 595-592 BC — Nebuchadnezzar II's years 10 to 13",
      objectDateCertainty: "traditional",
      currentLocation: "Vorderasiatisches Museum, Berlin. The displayed tablet is VAT 16378; the excavation numbers commonly quoted for the others are unverified and are not given here",
    },
    citations: [
      {
        tier: "institution",
        label: "Vorderasiatisches Museum, Staatliche Museen zu Berlin — collection",
        url: "https://www.smb.museum/en/museums-institutions/vorderasiatisches-museum/collection-research/",
        credit: "Staatliche Museen zu Berlin",
        detail: "The holding institution for the Babylon material from Koldewey's excavations, including VAT 16378",
        supports: "Current location",
      },
      {
        tier: "scholarly",
        label: "E. F. Weidner, \"Jojachin, Konig von Juda, in babylonischen Keilschrifttexten\"",
        credit: "Ernst F. Weidner",
        detail: "In Melanges syriens offerts a Monsieur Rene Dussaud II (Bibliotheque archeologique et historique 30.2), Paris, 1939, 923-935 — the first identification and publication of the tablets, forty years after they were excavated. Print only",
        supports: "The identification of Ya'u-kinu with Jehoiachin, and the 1939 publication date",
      },
      {
        tier: "reference",
        label: "Bible Odyssey (SBL): The Babylonian Exile",
        url: "https://www.bibleodyssey.org/articles/babylonian-exile/",
        credit: "Society of Biblical Literature",
        supports: "The 597 BC deportation that put Jehoiachin and his household in Babylon",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Jehoiachin's Rations Tablets",
        url: "https://en.wikipedia.org/wiki/Jehoiachin%27s_Rations_Tablets",
      },
    ],
    reflectionPrompt:
      "A clerk in Babylon wrote down an oil ration and preserved a king's name for 2,500 years. What small, unremarkable faithfulness are you being asked for today?",
  },
  {
    id: "deir-alla-inscription",
    name: "Deir Alla Inscription",
    alternateNames: ["Deir 'Alla Inscription", "Balaam Son of Beor Inscription", "Tell Deir Alla Plaster Texts"],
    category: "discovery",
    role: "Plaster Wall Text Naming Balaam Son of Beor, c. 800 BC",
    summary:
      "Ink on fallen plaster from a building in the Jordan Valley, telling of a night vision given to Balaam son of Beor — the one figure the Bible names who also turns up in somebody else's scripture.",
    sections: [
      {
        heading: "Letters on Fallen Plaster",
        paragraphs: [
          "On 17 March 1967, in the fifth season of the Leiden University excavations at Tell Deir Alla in the Jordan Valley, a Jordanian member of the excavation team named Ali Abdul-Rasul noticed traces of writing on small fragments of plaster coming out of a destruction layer. The dig was directed by Henk J. Franken; the find belongs to Abdul-Rasul, and this section of the app exists partly to keep that distinction visible, because it is exactly the sort of credit that gets absorbed into a director's name within a generation.",
          "There were 119 fragments in the end, red and black ink on wall plaster that had fallen from a building and shattered. Reassembling them is still not finished: the surviving text is conventionally arranged into two \"combinations\", and even those have gaps that change the sense of whole lines. The fragments are in the Jordan Archaeological Museum in Amman, catalogued as KAI 312, and were published by the excavating team as Aramaic Texts from Deir 'Alla in 1976.",
        ],
      },
      {
        heading: "A Seer the Bible Also Knows",
        paragraphs: [
          "The first combination opens by announcing itself as the writing of Balaam son of Beor, a seer of the gods. The gods come to him in the night; he sees a vision and weeps in the morning, and when his people ask him why, he tells them what he has been shown — a council of gods, a decree, and a coming reversal in which the natural order runs backwards and birds and beasts change places. The second combination is more fragmentary and appears to concern death and the underworld.",
          "This is not a copy of anything in the Bible, and it does not retell Numbers 22-24. What it does is name the same man, with the same patronymic, in the same role, in roughly the same country — the Transjordan, where Numbers places him — several centuries after the events Numbers describes. He is remembered there as a legitimate seer of the gods, with no hint of the Israelite tradition's ambivalence about him, and the text is not Israelite. The settled view among specialists is that both the Deir Alla text and the biblical narratives draw on a regional Balaam tradition rather than one depending on the other, and that is a more interesting result than a confirmation would have been: it means the Bible is naming a figure its neighbours also knew, in a story its neighbours would have recognised.",
        ],
      },
      {
        heading: "Nobody Can Agree What Language It Is",
        paragraphs: [
          "Fifty years on, the classification of the dialect is genuinely unresolved, and it is not a technicality — the language tells you whose tradition the text belongs to. The editors, Hoftijzer and van der Kooij, published it as Aramaic and the title of the editio princeps still says so, though one of their arguments rested on an identification of the Aramaic definite article that has since been questioned. Klaus Beyer classified it as a separate dialect he called South Gileadite; Holger Gzella reads it as an Aramaic grammatical core carrying Canaanite vocabulary and narrative style, in effect a translation. On the other side, Jo Ann Hackett argued in 1980 that it is Canaanite, on the strength of the N-stem and other features unattested in Aramaic, and Na'ama Pat-El and Aren Wilson-Wright defended a Canaanite classification again in 2015.",
          "The reason the argument will not end is that the text really does have both. It uses suffixed nun for masculine plurals and qof where Hebrew has tsade, which look Aramaic; it also uses the waw-consecutive, which looks Canaanite. The honest report is that this is unsettled among the people best equipped to settle it, and a reader who is told otherwise has been told something the specialists do not know. A second, smaller question sits alongside it: whether the Balaam of the plaster is the same figure as the Balaam of Numbers or a parallel development of one tradition. Most would say a shared tradition; nobody can demonstrate more than that from 119 broken pieces.",
        ],
      },
    ],
    verses: [
      { reference: "Numbers 22:5", note: "Balak sends for \"Balaam the son of Beor\" — the same name and patronymic as the plaster text" },
      { reference: "Numbers 24:15-17", note: "Balaam's oracle: the man whose eyes are open, who sees the vision of the Almighty" },
      { reference: "Numbers 31:8", note: "Balaam killed with the kings of Midian" },
      { reference: "Joshua 13:22", note: "Balaam remembered as \"the soothsayer\"" },
      { reference: "Micah 6:5", note: "Balak and Balaam invoked centuries later as something Israel is to remember" },
    ],
    sources: [
      { label: "Livius: Deir 'Alla Inscription", url: "https://www.livius.org/sources/content/deir-alla-inscription/" },
      { label: "Wikipedia: Deir Alla inscription", url: "https://en.wikipedia.org/wiki/Deir_Alla_inscription" },
    ],
    discovery: {
      objectType: "119 fragments of wall plaster written in red and black ink, fallen from a building into a destruction layer",
      findSite: "Tell Deir Alla, in the Jordan Valley east of the river",
      // CORRECTED (scope §2.5f): the finder is named. Franken directed; Abdul-Rasul found it.
      foundYear: "17 March 1967",
      foundBy: "The Leiden University excavation directed by Henk J. Franken, in its fifth season. The inscribed fragments were physically spotted by Ali Abdul-Rasul, a Jordanian excavator on the team",
      objectDate: "c. 800 BC — the date of the destruction layer the plaster fell into",
      objectDateCertainty: "traditional",
      currentLocation: "Jordan Archaeological Museum, Amman (KAI 312)",
    },
    citations: [
      {
        tier: "institution",
        label: "J. Hoftijzer and G. van der Kooij, Aramaic Texts from Deir 'Alla",
        credit: "The Leiden University excavation at Tell Deir 'Alla — the excavating body's own publication",
        detail: "Documenta et Monumenta Orientis Antiqui 19, Brill, Leiden, 1976. The editio princeps. Cited here in place of a museum object page: the Jordan Archaeological Museum publishes none that could be fetched. Print only",
        supports: "The find, the reconstruction of the text, and the original Aramaic classification",
      },
      {
        tier: "scholarly",
        label: "N. Pat-El and A. Wilson-Wright, \"Deir 'Alla as a Canaanite Dialect: A Vindication of Hackett\"",
        url: "https://sites.utexas.edu/scripts/wp-content/uploads/sites/3428/2020/10/2015-AWWwPat-El-Deir...pdf",
        credit: "Na'ama Pat-El and Aren Wilson-Wright, University of Texas at Austin",
        detail: "In Epigraphy, Philology and the Hebrew Bible (SBL Press, 2015). Open PDF hosted by UT Austin",
        supports: "The Canaanite side of the language dispute, and Hackett's 1980 argument",
      },
      {
        tier: "reference",
        label: "Livius: Deir 'Alla Inscription",
        url: "https://www.livius.org/sources/content/deir-alla-inscription/",
        credit: "Livius.org",
        supports: "A translation of Combination I and the find circumstances",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Deir Alla inscription",
        url: "https://en.wikipedia.org/wiki/Deir_Alla_inscription",
      },
    ],
    reflectionPrompt:
      "Israel's neighbours remembered Balaam as a genuine seer; Scripture remembers him as a man who knew the truth and sold it. What is the difference between hearing from God and belonging to him?",
  },
  {
    id: "ekron-royal-dedicatory-inscription",
    name: "Ekron Royal Dedicatory Inscription",
    // NOT registered: "Ekron" — that is the Philistine city, which owns it in locations.ts.
    alternateNames: ["Ekron Inscription", "Ekron Royal Inscription", "Tel Miqne-Ekron Inscription"],
    category: "discovery",
    role: "Seventh-Century BC Philistine Temple Dedication",
    summary:
      "Five lines cut into a limestone block, naming the city, its ruler and four generations of his fathers — and settling, in one stroke, which mound in the Shephelah was Ekron.",
    sections: [
      {
        heading: "In Situ, in the Fourteenth and Final Season",
        paragraphs: [
          "The Tel Miqne-Ekron Excavation ran for fourteen seasons, from 1981 to 1996, directed jointly by Trude Dothan of the Hebrew University and Seymour Gitin of the W. F. Albright Institute of Archaeological Research. In the summer of the last season the dig produced a rectangular limestone block with five incised lines on it, lying in the destruction debris of the sanctuary of the building the excavators call Temple Complex 650. Press accounts at the time describe Gitin himself turning the dirt-covered stone over and seeing the writing; that detail comes from journalism rather than from the excavation report, which names no individual finder, and it is given here on that footing. Sources say only \"summer 1996\" — a month is often printed and could not be sourced.",
          "What matters more than the finder is where it lay. The block was found in situ, in a datable destruction layer, inside the building it was cut for. Almost nothing else in this section of the app has that. An inscription bought on a market can be genuine and still be nearly weightless, because nobody can say what it was next to; this one comes with its room, its floor and its date attached. It was published the following year by Gitin, Dothan and J. Naveh in the Israel Exploration Journal, and is in the Israel Museum as IAA 1997-2912, catalogued epigraphically as KAI 286.",
        ],
      },
      {
        heading: "It Names the City, and Five of Its Kings",
        paragraphs: [
          "The text is a building dedication: the temple which Akhayus, son of Padi, son of Ysd, son of Ada, son of Ya'ir, ruler of Ekron, built for his lady — followed by a request that she bless him, guard him, and lengthen his days. Five rulers in a single line of descent, and the name of the city itself. Padi and Akhayus are not only known from this stone: Padi appears in Sennacherib's account of the 701 BC campaign as the king of Ekron whom the citizens handed over to Hezekiah and whom Sennacherib restored, and a ruler of Ekron with the same name as Akhayus appears in the annals of Esarhaddon and Ashurbanipal in the 670s and 660s. The stone slots into an Assyrian record that already existed.",
          "For a Bible reader the identification is the payoff. Ekron is one of the five Philistine cities — the last stop on the ark's grim tour in 1 Samuel 5-6, the city whose god Baal-zebub Ahaziah consulted, the city Amos names in judgement. Which mound in the Shephelah it was had been argued over for a century. This inscription ended the argument by naming the place in a text found on it, which is as clean as site identification ever gets in this field.",
        ],
      },
      {
        heading: "The Third Letter of the Goddess's Name",
        paragraphs: [
          "The name of the deity the temple was built for is written with letters that can be read more than one way, and the reading is not settled. The editors read Ptgyh, a goddess otherwise unknown. A. Demsky proposed Ptnyh, connecting the name to the Greek potnia, \"Lady\" or \"Mistress\". Others have suggested Ptryh, which would make her Pidray, a goddess already known from the Ugaritic texts. Each reading depends on how one worn letter is taken.",
          "That sounds like a small thing and is not, because the Greek reading is a plank in a much larger argument: that the Philistines arrived in Canaan from the Aegean world and kept something of it for centuries. If the goddess is a potnia, the stone is evidence of Aegean religion surviving in Philistia into the seventh century. If she is Pidray, it is evidence of thorough absorption into local Canaanite religion instead. The app takes no side, because the specialists have not taken one either; what a reader should carry away is that the identification of the city is secure and the identification of its goddess is not, and that those are two different kinds of claim resting on two different amounts of evidence. A smaller question runs alongside: whether the Akhayus of this stone is the same man as the Ikausu of the Assyrian annals. Most say yes; it is an inference from name and date, not a demonstration.",
        ],
      },
    ],
    verses: [
      { reference: "Joshua 13:3", note: "Ekron listed among the five Philistine lordships" },
      { reference: "1 Samuel 5:10", note: "The ark sent to Ekron, and the Ekronites' reaction" },
      { reference: "1 Samuel 6:16-17", note: "One golden tumour for each of the five cities, Ekron among them" },
      { reference: "2 Kings 1:2", note: "Ahaziah sends to \"Baal Zebub, the god of Ekron\"" },
      { reference: "Amos 1:8", note: "\"I will turn my hand against Ekron\"" },
    ],
    sources: [
      { label: "ASOR: Ekron Royal Dedicatory Inscription", url: "https://www.asor.org/resources/photo-collection/pid000287" },
      { label: "Wikipedia: Ekron Royal Dedicatory Inscription", url: "https://en.wikipedia.org/wiki/Ekron_Royal_Dedicatory_Inscription" },
    ],
    discovery: {
      objectType: "Rectangular limestone block with five incised lines in the local Canaanite script",
      findSite: "The sanctuary of Temple Complex 650 at Tel Miqne, found in situ in the destruction debris",
      findSiteId: "ekron",
      findSiteKind: "location",
      // §2.5d: "July 1996" is unsourced. Sources say only "summer 1996".
      foundYear: "Summer 1996, the fourteenth and final season",
      foundBy: "The Tel Miqne-Ekron Excavation, directed jointly by Trude Dothan (Hebrew University) and Seymour Gitin (W. F. Albright Institute). Press accounts have Gitin himself turning the stone; the excavation report names no individual finder",
      objectDate: "Early seventh century BC, before the city's destruction c. 604 BC",
      objectDateCertainty: "firm",
      currentLocation: "Israel Museum, Jerusalem (IAA 1997-2912); KAI 286",
    },
    citations: [
      {
        tier: "institution",
        label: "ASOR photo collection: Ekron Royal Dedicatory Inscription, Tel Miqne-Ekron",
        url: "https://www.asor.org/resources/photo-collection/pid000287",
        credit: "American Society of Overseas Research, the parent body of the W. F. Albright Institute that co-directed the excavation",
        supports: "The object, the excavation and the find context",
      },
      {
        tier: "scholarly",
        label: "S. Gitin, T. Dothan and J. Naveh, \"A Royal Dedicatory Inscription from Ekron\"",
        credit: "Seymour Gitin, Trude Dothan and Joseph Naveh",
        detail: "Israel Exploration Journal 47/1-2 (1997), 1-16. The editio princeps, including the Ptgyh reading. Print only",
        supports: "The text, the reading of the goddess's name, and the identification of Tel Miqne as Ekron",
      },
      {
        tier: "reference",
        label: "Archaeology Magazine: \"Ekron Identity Confirmed\"",
        url: "https://archive.archaeology.org/9801/abstracts/ekron.html",
        credit: "Archaeological Institute of America, Archaeology 51/1 (1998)",
        supports: "The site identification and the 1996 find, as reported at the time",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Ekron Royal Dedicatory Inscription",
        url: "https://en.wikipedia.org/wiki/Ekron_Royal_Dedicatory_Inscription",
      },
    ],
    reflectionPrompt:
      "A Philistine ruler carved four generations of his fathers into a temple wall so a goddess would lengthen his days. What are you building to be remembered by?",
  },
  {
    id: "ugarit-tablets",
    name: "Ugarit Tablets",
    // NOT registered: bare "Ugarit". Every alias is longer than the site name, and NAME_ENTRIES is
    // sorted longest-first, so a mention of the tablets wins and a bare "Ugarit" is left alone.
    alternateNames: ["Ras Shamra Tablets", "Ugaritic Tablets", "Ugaritic Texts"],
    category: "discovery",
    role: "Late Bronze Age Canaanite Archives in Alphabetic Cuneiform",
    summary:
      "Thousands of tablets from a Syrian port city, written in a language a cousin of Hebrew — the only place Canaanite religion speaks for itself instead of through the Old Testament's account of it.",
    sections: [
      {
        heading: "A Ploughshare, and Four Men Before the Archaeologist",
        paragraphs: [
          "In the spring of 1928, a local farmer ploughing near Minet el-Beida on the Syrian coast struck a slab that turned out to be the roof of a vaulted tomb, and removed what could be sold from it. He is the first finder. His name is given confidently all over the internet and in popular books; it traces to no academic source — the scholarly accounts say only that a peasant opened a tomb — and it is not printed here. Charles Virolleaud, director of the Antiquities Service under the French Mandate, sent his colleague Leon Albanese to look; Albanese examined the plundered tomb, reported Cypriot pottery from it in the journal Syria, and went on to inspect the large mound inland called Ras Shamra. Rene Dussaud at the Louvre, reading those reports, arranged for a mission. Claude F.-A. Schaeffer of Strasbourg, with Georges Chenet, opened the first campaign at Minet el-Beida in April 1929 and moved to the tell in May, where inscribed tablets began to appear. Campaigns ran until 1939 and resumed after the war.",
          "The tablets were written in a script nobody had seen: cuneiform wedges, but only about thirty signs, which meant an alphabet rather than a syllabary. Cracking it took months and the credit is a genuine three-way tangle. Hans Bauer in Halle received Virolleaud's published photographs on 22 April 1930 and believed he had the language by the 27th; his first public sign values appeared in a Berlin newspaper on 4 June. Edouard Dhorme, director of the Ecole Biblique in Jerusalem, was working independently, was stuck until a colleague showed him Bauer's newspaper piece in mid-June, and published in the Revue Biblique that October the first list complete enough to actually read texts with, correcting several of Bauer's readings in the process; Bauer's own full alphabet appeared at almost the same moment with a note acknowledging Dhorme's corrections. Virolleaud excavated the tablets, published them, and contributed values of his own from a tablet of written-out numerals. In 1936 he published an account implying he had reached the solution first and independently; Bauer denied it, and Peggy L. Day's detailed reconstruction of the sequence concludes that Virolleaud's recollections are not trustworthy. Name all three. Nobody who has looked closely awards it to one.",
        ],
      },
      {
        heading: "Canaanite Religion in Its Own Words",
        paragraphs: [
          "What came out of the tell was not one text but libraries: a high priest's collection beside the temples of Baal and Dagan, palace archives, private houses. Alongside Akkadian diplomatic correspondence there are long poetic narratives in Ugaritic — the Baal Cycle, the Kirta epic, the tale of Aqhat — and ritual and offering lists that record which god got what. El is the aged head of the pantheon; Baal is the storm god who rides the clouds, dies at the hands of Mot and returns; Athirat, whose name is the same word as the Bible's Asherah, is El's consort; Anat is the violent goddess who avenges Baal.",
          "The Old Testament argues with these gods constantly, and until 1929 it argued with them alone. Judges 2 says Israel served the Baals; Elijah's contest on Carmel is a straight confrontation between Yahweh and Baal; Josiah's reform burns the vessels made for Baal and for the Asherah. Before Ras Shamra, everything known about what those names meant to their own worshippers came through the polemic of their opponents. Now there is a body of Canaanite religious poetry, from the right region, in a language close enough to Hebrew that a student of one can work through the other, and the picture it gives is fuller and stranger than the Bible's summaries — which is what one would expect, since the Bible was not trying to describe Baal fairly. The overlaps of imagery are striking too: Yahweh in Psalm 29 thunders over the waters in language a Ugaritic poet would have recognised at once.",
        ],
      },
      {
        heading: "How Much It Explains — and Where That Argument Runs",
        paragraphs: [
          "That last point is where the real disagreement lives. One school reads the continuities as deep: that Israelite religion emerged out of the Canaanite world it shares a vocabulary with, that El and Yahweh were once distinguishable, and that the Asherah of the biblical texts was for many Israelites a goddess rather than a pole. M. S. Smith and Frank Moore Cross are the names to know here, and their case is built on the texts, not on hostility to them. Others urge caution about how much can be carried across a gap of four centuries and a different society, and point out that shared poetic furniture is exactly what neighbouring cultures have.",
          "The app's position, and its reasons. The parallels are real and should be faced rather than minimised: a Bible study that pretends Psalm 29 and the Baal Cycle sound nothing alike is a study that will not survive a first-year course. But shared vocabulary is not shared theology, and the direction of the Old Testament's use of that vocabulary is consistently subversive — it takes the storm-rider imagery and gives it to Yahweh precisely to say that Baal is not the one who does this. Evangelicals themselves differ on how far to press this. Some read the shared language as deliberate polemical appropriation from the start; others accept a longer and messier history in which Israelite religion had more to unlearn than the finished text lets on, and take the prophets' furious opposition to Asherah worship as evidence that plenty of Israelites were doing it. Both readings are held by people who take Scripture as trustworthy, and the difference between them is a real one worth knowing about rather than a boundary marker.",
        ],
      },
    ],
    verses: [
      { reference: "Judges 2:11-13", note: "Israel serves \"Baal and the Ashtaroth\" — the gods the Ugaritic texts describe from the inside" },
      { reference: "1 Kings 18:21", note: "Elijah on Carmel: \"If Yahweh is God, follow him; but if Baal, then follow him\"" },
      { reference: "2 Kings 23:4", note: "Josiah burns the vessels made for Baal and for the Asherah" },
      { reference: "Psalms 29:1-3", note: "Yahweh's voice on the waters — storm-god imagery a Ugaritic poet would have recognised" },
      { reference: "Deuteronomy 32:8-9", note: "The nations divided and Yahweh's portion, a passage read against Ugaritic parallels" },
    ],
    sources: [
      { label: "Wikipedia: Ugarit", url: "https://en.wikipedia.org/wiki/Ugarit" },
    ],
    discovery: {
      objectType: "Clay tablets in alphabetic cuneiform (Ugaritic) and in Akkadian — myth, ritual, administration and diplomatic correspondence",
      findSite: "Ras Shamra and its harbour at Minet el-Beida, on the Syrian coast north of Latakia",
      // CORRECTED (scope §2.5b): the candidate table said "1928-29 onward, Schaeffer". The tomb was
      // opened in spring 1928 by a farmer; Schaeffer's first campaign was April 1929.
      foundYear: "Tomb opened spring 1928; excavation from April 1929, with inscribed tablets appearing in May",
      foundBy: "A local farmer near Minet el-Beida, spring 1928; then Leon Albanese for the French Antiquities Service; the mission was arranged by Rene Dussaud at the Louvre and directed from April 1929 by Claude F.-A. Schaeffer with Georges Chenet. A name for the farmer circulates widely and traces to no academic source; it is not repeated",
      objectDate: "c. 1400-1190 BC, down to the city's destruction",
      objectDateCertainty: "traditional",
      currentLocation: "Divided between the Louvre, Paris, and Syrian collections including Damascus, Aleppo and Latakia. The condition and whereabouts of the material held in Syria since 2011 cannot be stated with confidence",
    },
    citations: [
      {
        tier: "institution",
        label: "C. F.-A. Schaeffer, \"Les fouilles de Minet-El-Beida et de Ras Shamra (campagnes du printemps 1929)\"",
        url: "https://www.persee.fr/doc/syria_0039-7946_1929_num_10_4_3407",
        credit: "Claude F.-A. Schaeffer, Mission de Ras Shamra — the excavating body's own first campaign report",
        detail: "Syria 10 (1929), 285-297. Open access at Persee",
        supports: "The 1929 excavation, the sequence from Minet el-Beida to the tell, and the find of the first tablets",
      },
      {
        tier: "primary",
        label: "C. Virolleaud, \"Les inscriptions cuneiformes de Ras Shamra\"",
        url: "https://www.persee.fr/doc/syria_0039-7946_1929_num_10_4_3411",
        credit: "Charles Virolleaud",
        detail: "Syria 10 (1929), 304-310 — the editio princeps of the first alphabetic tablets, the publication Bauer and Dhorme worked from. Open access at Persee",
        supports: "The texts that were published for decipherment, and Virolleaud's role",
      },
      {
        tier: "scholarly",
        label: "P. L. Day, \"Dies Diem Docet: The Decipherment of Ugaritic\"",
        url: "http://www.proyectos.cchs.csic.es/SEL/sites/default/files/06day_2a4aeb99.pdf",
        credit: "Peggy L. Day",
        detail: "Studi Epigrafici e Linguistici 19 (2002), 37-57. Reconstructs the decipherment week by week from the correspondence, and assesses the competing priority claims",
        supports: "The decipherment dates and the Bauer / Dhorme / Virolleaud credit dispute",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Ugarit",
        url: "https://en.wikipedia.org/wiki/Ugarit",
      },
    ],
    reflectionPrompt:
      "Psalm 29 uses a storm-god's vocabulary to say something a storm god could never say. Where has God taken something borrowed in your life and turned it to his own purpose?",
  },
  {
    id: "mari-tablets",
    name: "Mari Tablets",
    // NOT registered: bare "Mari".
    alternateNames: ["Mari Archives", "Mari Letters", "Tell Hariri Tablets"],
    category: "discovery",
    role: "Eighteenth-Century BC Royal Archive from the Middle Euphrates",
    summary:
      "More than 25,000 tablets from a palace on the Euphrates — including prophets delivering messages to a king who had not asked for them. The archaeologist usually credited with finding it did not find it.",
    sections: [
      {
        heading: "A Grave, a Statue, and an Officer on an Inspection Tour",
        paragraphs: [
          "Andre Parrot's own first-campaign report tells the story, and it is not the one usually told. In the first days of August 1933, Lieutenant Cabane, an officer of the French Services speciaux and deputy inspector for the districts of Abu Kemal and Mayadin, was on an inspection tour near his station on the Euphrates when he came across a group of Bedouin on a mound. They were burying one of their own and were busy prising up stones to ornament the grave. A few days later a local man arrived at Cabane's office asking what should be done about \"the man they had found\". Cabane understood at once, went out to Tell Hariri, and found a mutilated headless statue with its hands joined on its chest. With three colleagues he got the thing — he estimated its weight at over three hundred kilograms — down to Abu Kemal, and reported it.",
          "A report from the inspector of antiquities for northern Syria followed, Rene Dussaud immediately proposed a season of excavation, the Musees Nationaux were granted the concession, and the Louvre sent Andre Parrot, who was free because work at Larsa had stopped. The mission reached Abu Kemal in early December 1933 and began digging at the tell on 14 December, working through to the following March. In January it turned up an inscribed statue of a ruler whose name was first read Lamgi-Mari and is now read Ishqi-Mari, and that identified the site: this was Mari. Parrot dug there across twenty-one campaigns down to 1974, and his name is the one attached to the discovery. The find itself belongs to a burial party and an officer on his rounds.",
        ],
      },
      {
        heading: "A King's Post-Bag from the Age of the Patriarchs",
        paragraphs: [
          "The palace of Zimri-Lim yielded over twenty-five thousand cuneiform tablets, roughly three thousand of them letters and the rest administrative, economic and legal. It is one of the richest single archives ever recovered from the ancient Near East, and it lights up a world — tribal confederations moving between pasture and town on the middle Euphrates, treaties, dowries, lawsuits, a king writing to his officials about grain and about his daughters' marriages, all around 1800 to 1760 BC.",
          "The detail with the sharpest biblical edge is prophecy. Mari's letters record men and women going to the king with messages they say a god gave them — unsolicited, sometimes unwelcome, sometimes warnings about his conduct — and officials writing anxiously to pass the message on. That is recognisably the shape of the thing 1 Kings 22 describes, where Micaiah tells Ahab what he does not want to hear and pays for it. The parallel is a shape, not a doctrine: Mari's prophets speak for gods within a court system that expects them, while the Hebrew prophets stand against the whole apparatus. But it does establish that a prophet confronting a king was a familiar feature of the region long before Israel had kings of its own.",
        ],
      },
      {
        heading: "The Claim That Mari Proved the Patriarchs",
        paragraphs: [
          "For about thirty years in the middle of the twentieth century, Mari was the centrepiece of an argument that archaeology had vindicated Genesis. W. F. Albright, Nelson Glueck and E. A. Speiser pointed to nomadic social patterns, personal names of the same formation as Abraham's, and customs of adoption and inheritance that seemed to explain otherwise puzzling episodes in the patriarchal narratives — and concluded that Genesis fits a real second-millennium setting so precisely that it must preserve second-millennium memory.",
          "That argument was dismantled, and it is worth saying so plainly. T. L. Thompson's The Historicity of the Patriarchal Narratives (1974) and J. Van Seters's Abraham in History and Tradition (1975) showed that the parallels were generic rather than specific — the customs are attested across many centuries and many places, so they date nothing — and that the chronological fit had been assumed rather than demonstrated. They carried the field, and the Mari argument for the patriarchs is no longer made by specialists. The old equation of Mari's DUMU.MES-yamina, \"sons of the south\", with the biblical Benjamin has likewise been dropped as a coincidence of a common West Semitic word-formation.",
          "Two things follow, and they point in different directions. The first is that the collapse of a bad argument for the patriarchs is not an argument against them; Thompson and Van Seters went on to draw much wider conclusions about the historicity of Genesis that this app does not share, and those conclusions do not follow from the Mari point either. The second is that something real survives: Mari does not corroborate Abraham, but it does demonstrate that the world Genesis places him in — tribal, mobile, treaty-bound, literate, full of gods speaking to kings — existed and looked broadly as Genesis assumes. That is a smaller claim than the one made in 1955, and it has the advantage of being true.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 11:31", note: "Terah's household moves from Ur and settles at Haran, in the world these archives document" },
      { reference: "Genesis 24:10", note: "Abraham's servant sent to Mesopotamia, to the city of Nahor" },
      { reference: "1 Kings 22:6-8", note: "A prophet with an unwelcome message for a king — the pattern Mari's letters also record" },
      { reference: "Amos 3:7", note: "\"He reveals his secret to his servants the prophets\"" },
    ],
    sources: [
      { label: "College de France: 1933, the discovery of Mari", url: "https://www.college-de-france.fr/en/agenda/lecture/elements-for-history-of-assyriology/1933-the-discovery-of-mari" },
      { label: "Wikipedia: Mari, Syria", url: "https://en.wikipedia.org/wiki/Mari,_Syria" },
    ],
    discovery: {
      objectType: "Over 25,000 clay tablets in Akkadian cuneiform — about 3,000 letters, the rest administrative, economic and legal",
      findSite: "Tell Hariri, on the middle Euphrates near Abu Kemal in eastern Syria",
      // CORRECTED (scope §2.5b): the candidate table said "1933 onward, Andre Parrot". Parrot did
      // not find it, and his own report says so. Chain restored from that report.
      foundYear: "Statue found in the first days of August 1933; excavation began 14 December 1933",
      foundBy: "Not Andre Parrot. A Bedouin burial party on Tell Hariri turned up a headless statue; Lieutenant Cabane of the French Services speciaux secured it and reported it; a report from the inspector of antiquities for northern Syria brought in Rene Dussaud, and the Louvre sent Parrot, whose team began digging on 14 December 1933",
      objectDate: "c. 1800-1760 BC, chiefly from the reign of Zimri-Lim",
      objectDateCertainty: "traditional",
      currentLocation: "Louvre, Paris, and Syrian collections including Aleppo, Damascus and Deir ez-Zor. Mari was heavily looted after 2011 and the status of the material held in Syria cannot be stated with confidence",
    },
    citations: [
      {
        tier: "institution",
        label: "A. Parrot, \"Les fouilles de Mari (Premiere campagne)\"",
        url: "https://www.persee.fr/doc/syria_0039-7946_1935_num_16_1_8338",
        credit: "Andre Parrot, for the Musees Nationaux / Louvre mission",
        detail: "Syria 16 (1935), 1-28. The excavation's own preliminary report, whose opening page gives the Cabane narrative and the 14 December 1933 start date used above. Open access at Persee",
        supports: "The discovery narrative, Lieutenant Cabane's part in it, and the excavation dates",
      },
      {
        tier: "reference",
        label: "College de France: \"1933: the discovery of Mari\"",
        url: "https://www.college-de-france.fr/en/agenda/lecture/elements-for-history-of-assyriology/1933-the-discovery-of-mari",
        credit: "College de France, Elements for a History of Assyriology",
        supports: "The Bedouin discovery, Parrot's availability after Larsa, and the Ishqi-Mari statue that identified the site",
      },
      {
        tier: "scholarly",
        label: "T. L. Thompson, The Historicity of the Patriarchal Narratives (1974); J. Van Seters, Abraham in History and Tradition (1975)",
        credit: "Thomas L. Thompson and John Van Seters",
        detail: "The two monographs that dismantled the mid-century argument from Mari and Nuzi to the patriarchal narratives. Print only",
        supports: "The refutation of the \"Mari corroborates the patriarchs\" claim in the third section",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Mari, Syria",
        url: "https://en.wikipedia.org/wiki/Mari,_Syria",
      },
    ],
    reflectionPrompt:
      "A burial party found Mari and an archaeologist got the credit. Whose work in your life has been absorbed into someone else's name?",
  },
  {
    id: "ebla-tablets",
    name: "Ebla Tablets",
    // NOT registered: bare "Ebla".
    alternateNames: ["Ebla Archives", "Tell Mardikh Tablets"],
    category: "discovery",
    role: "Third-Millennium BC Palace Archive from Northern Syria",
    summary:
      "A vast Syrian archive from a thousand years before Abraham — and the site of the most spectacular biblical-archaeology claim of the twentieth century, which collapsed completely.",
    sections: [
      {
        heading: "Shelves That Collapsed and Kept Their Order",
        paragraphs: [
          "Paolo Matthiae of the University of Rome began digging at Tell Mardikh, about fifty-five kilometres south-west of Aleppo, in 1964, and in 1968 an inscribed statue identified the mound as Ebla, a city known previously only from mentions in other people's records. The archives came later: forty-two tablets in 1974, and then in 1975 the main find in the rooms of Palace G — roughly 1,800 complete tablets, 4,700 fragments and thousands of smaller chips, lying where they had fallen when the wooden shelving that held them burned and gave way. Because they fell in order, the shelving's arrangement could be reconstructed from the floor.",
          "The texts are administrative, lexical and diplomatic, in Sumerian and in a previously unknown East Semitic language now called Eblaite; they run from around 2400 BC to the destruction of the palace a century or so later. The mission's epigrapher was Giovanni Pettinato. He and Matthiae fell out, and Alfonso Archi succeeded him. The material is held in Syrian collections, chiefly the Idlib, Aleppo and Damascus museums, and their condition since 2011 cannot be stated with confidence.",
        ],
      },
      {
        heading: "What Ebla Actually Gives a Bible Reader",
        paragraphs: [
          "Set the famous claim aside and Ebla is still one of the great finds of the century, for reasons that have nothing to do with Genesis. It showed that a large, literate, bureaucratically organised Semitic kingdom existed in inland Syria in the middle of the third millennium BC, some seven or eight centuries before the earliest date anyone assigns to Abraham. It produced the oldest known bilingual vocabulary lists in the world. It documents treaties, international trade, and a royal administration keeping records of textiles and metals on an industrial scale.",
          "For a reader of the Bible, the value is context and depth of field. The world of Genesis is not a world of empty land and wandering families with nothing around them; it is a world with old cities, established scribal traditions and long memories, and Ebla is a hard-edged demonstration of that. What Ebla does not do is mention any person or place from the biblical narratives. That needs saying because of what follows.",
        ],
      },
      {
        heading: "The Sodom and Gomorrah Claim Is Dead",
        paragraphs: [
          "On 29 October 1976, at a Society of Biblical Literature meeting in St Louis, Pettinato announced that he had found Sodom and Gomorrah in the Ebla tablets, reading si-da-mu as Sodom and i-ma-ar as Gomorrah, and — more sensationally still — that all five Cities of the Plain from Genesis 14:2 appeared in the same order the Bible gives them. D. N. Freedman amplified the claim in American scholarship and in the press, and it went round the world.",
          "It did not survive. Alfonso Archi, Pettinato's successor as the mission's epigrapher, refuted it in print in 1979 and again in 1981. The decisive point is simple: i-mar is Emar, a well-known Syrian city on the Euphrates that turns up constantly in these archives, and has nothing to do with Gomorrah. The claimed sequence of five cities does not hold up. And the readings had been made from facsimiles that were never published, so no other scholar could check them — which is why the claim could circulate for years before it could be tested. Pettinato withdrew the Zoar reading and the supposed \"Birsha, king of Gomorrah\", and retreated from a related claim that a theophoric element at Ebla reflected an early form of the divine name Yahweh; other Assyriologists proposed the Akkadian god Ea instead, and the Yahweh reading has no standing today.",
          "This is not a live debate with two sides, and it should not be written as one. Ebla has no bearing on Sodom and Gomorrah. Two things are worth adding rather than hiding. The affair was inflamed by the personal rupture between Matthiae and Pettinato and by Syrian government sensitivity about biblical claims made on a Syrian site, and accusations of political interference flew in both directions; none of that changes the philology. And the reason this article exists at all is that apologetics sites still cite the claim, sometimes hedged, sometimes not. A reader who meets it here should meet the correction rather than a shrug. The lesson underneath is the useful part, and it cuts every way: a reading announced from a conference platform on the basis of material nobody else can examine is not yet evidence, however welcome its conclusion.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 14:2-3", note: "The five kings of the plain — the sequence Pettinato claimed to have found at Ebla" },
      { reference: "Genesis 19:24-25", note: "The overthrow of Sodom and Gomorrah" },
      { reference: "Genesis 10:19", note: "The Canaanite border traced past Sodom, Gomorrah, Admah and Zeboiim" },
    ],
    sources: [
      { label: "Wikipedia: Ebla-biblical controversy", url: "https://en.wikipedia.org/wiki/Ebla%E2%80%93biblical_controversy" },
      { label: "Wikipedia: Ebla tablets", url: "https://en.wikipedia.org/wiki/Ebla_tablets" },
    ],
    discovery: {
      objectType: "Roughly 1,800 complete clay tablets, 4,700 fragments and thousands of chips, in Sumerian and Eblaite",
      findSite: "Palace G at Tell Mardikh, about 55 km south-west of Aleppo",
      foundYear: "42 tablets in 1974; the main archive in 1975",
      foundBy: "The Italian expedition of the University of Rome under Paolo Matthiae, digging at Tell Mardikh since 1964. The tablets were read by the mission's epigrapher Giovanni Pettinato and, after he and Matthiae fell out, by his successor Alfonso Archi",
      objectDate: "c. 2400-2300 BC, down to the destruction of Palace G",
      objectDateCertainty: "traditional",
      currentLocation: "Syrian national collections, chiefly the Idlib, Aleppo and Damascus museums. Their condition and whereabouts since 2011 cannot be stated with confidence",
    },
    citations: [
      {
        tier: "institution",
        label: "P. Matthiae, Ebla: An Empire Rediscovered",
        credit: "Paolo Matthiae, University of Rome — the excavation director's own account",
        detail: "Doubleday, 1981 (English translation of Ebla: un impero ritrovato, 1977), with later editions. Cited in place of a museum object page: the Syrian holding institutions publish none. Print only",
        supports: "The excavation from 1964, the 1968 identification of the site, and the 1974-75 archive finds",
      },
      {
        tier: "scholarly",
        label: "A. Archi, \"Are the Cities of the Plain Mentioned in the Ebla Tablets?\" and \"Ancora su Ebla e la Bibbia\"",
        credit: "Alfonso Archi, epigrapher of the Italian mission at Ebla",
        detail: "Biblical Archaeology Review 7/6 (1981) and Studi Eblaiti (1979-1981) — the refutation of the Cities of the Plain reading, including the identification of i-mar as Emar. Print only; the Biblical Archaeology Society's online library refuses automated requests and was not fetched",
        supports: "The refutation of the Sodom and Gomorrah claim",
        paywalled: true,
      },
      {
        tier: "reference",
        label: "Christianity Today (1981): \"Unearthing Ebla's Ancient Secrets\"",
        url: "https://www.christianitytoday.com/1981/05/unearthing-eblas-ancient-secrets/",
        credit: "Christianity Today, 8 May 1981",
        detail: "A contemporary evangelical report of the affair as it unravelled, recording that on rechecking Pettinato found no Birsha king of Gomorrah, and that Matthiae and Archi denied the Sodom reading",
        supports: "Pettinato's retraction and the state of the argument in 1981",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Ebla-biblical controversy",
        url: "https://en.wikipedia.org/wiki/Ebla%E2%80%93biblical_controversy",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Ebla tablets",
        url: "https://en.wikipedia.org/wiki/Ebla_tablets",
      },
    ],
    reflectionPrompt:
      "The Ebla claim was believed because people wanted it to be true. What do you currently believe mainly because you would like it to be so?",
  },
  {
    id: "bubastite-portal",
    name: "Bubastite Portal",
    // NOT registered: "Shishak" — that is the pharaoh, who owns the name in people.ts.
    alternateNames: ["Shishak Relief", "Shoshenq Relief", "Bubastite Portal at Karnak"],
    category: "discovery",
    role: "Egyptian Campaign Relief at Karnak, c. 925 BC",
    summary:
      "A pharaoh's list of the towns he claimed to have taken in Canaan, carved on a gate at Karnak — the one place where an Egyptian king's campaign and a chapter of Kings line up. Jerusalem is not on it.",
    sections: [
      {
        heading: "Champollion Reads a Wall",
        paragraphs: [
          "Nobody discovered the Bubastite Portal. It is a gateway in the Precinct of Amun-Re at Karnak, between the temple of Ramesses III and the second pylon, and it has stood above ground and visible since the Twenty-Second Dynasty put it there. What has a date is the reading. In 1828, six years after the Rosetta breakthrough, Jean-Francois Champollion visited Karnak on his Egyptian expedition and connected the Sheshonq of the relief with the Sesonchis of the Egyptian historian Manetho and with the Shishak of 1 Kings 14 — and wrote, in the account published the following year, that the identity was confirmed.",
          "That connection has held for nearly two centuries and is the mainstream position of Egyptology. A second reading of Champollion's has not held, and it matters more than it looks; it is dealt with in the third section below. The standard modern record of the relief is not Champollion's but the Epigraphic Survey's, published as Reliefs and Inscriptions at Karnak, Volume III: The Bubastite Portal in 1954 — a full set of measured line drawings that anyone can consult, free, today.",
        ],
      },
      {
        heading: "The One Place a Pharaoh and 1 Kings Line Up",
        paragraphs: [
          "The relief shows Sheshonq I before Amun, who holds ropes attached to rows of name-rings — about a hundred and fifty of them, each an oval containing a place name and topped with a bound captive's head. It is the standard Egyptian way of saying \"these places are mine\". The towns named cluster in the Negev, the Shephelah and the coastal plain, the Jezreel valley and the north.",
          "1 Kings 14:25-26 says that in Rehoboam's fifth year Shishak king of Egypt came up against Jerusalem and took away the treasures of the temple and the palace, including Solomon's gold shields; 2 Chronicles 12 tells the same story at more length, with chariots and horsemen and the fortified cities of Judah taken first. Shishak is in Kings before that, too: he is the pharaoh who gives Jeroboam asylum when Solomon tries to kill him. So there is an Egyptian king campaigning in the land in the right generation, from both sides. One further piece of evidence anchors the campaign archaeologically: a fragment of a victory stele of Sheshonq I was picked up at Megiddo in 1925, on a spoil heap left by the earlier German excavation. It is a surface find with no stratigraphy, so it shows that a monument of this king once stood at Megiddo — not that any particular destruction layer there is his.",
        ],
      },
      {
        heading: "Jerusalem Is Not on the List, and Ring 29 Is Not Judah",
        paragraphs: [
          "Champollion read name-ring 29 as \"Judah the Kingdom\", and that reading is rejected. The letters are now read as a place name — commonly Yad hammelek, \"Hand of the King\", or Juttah of the King — and the ring is one town among many, not a nation. More importantly, Jerusalem does not appear anywhere in the preserved list. The rings run through the lowlands and the north and pass over the central hill country of Judah as though it were not there. This is stated the wrong way round in a great deal of popular writing, and a reader who has been told that Karnak mentions Jerusalem has been told something false.",
          "Four explanations are on offer and all four deserve naming. Kenneth Kitchen and others point out that the list is damaged and parts of it are lost, so Jerusalem may have stood in a missing section. A second explanation takes the biblical account at its word: 1 Kings 14 has Rehoboam buying the city off with the temple treasure, so Jerusalem submitted rather than being stormed, and a town that paid would not appear in a list of towns taken. Finkelstein argues that the omission is real and telling, and that Judah at this date was a marginal highland chiefdom not worth a pharaoh's detour. Frank Clancy has argued that the route simply avoided the hill country and Transjordan altogether. None of these has carried the field.",
          "Where the app stands. The relief and 1 Kings agree that a pharaoh whose name is Sheshonq campaigned in the land in Rehoboam's generation, and that agreement is worth something: two independent sources, one Egyptian and monumental, one Judean and literary, converging on one event. They do not confirm each other's details, and the absence of Jerusalem from the list is a real fact that needs an explanation rather than a fact to be explained away — the tribute reading is a good explanation, but it is a reading, and it should be offered as one. One thing that is not a live alternative: the New Chronology associated with D. M. Rohl, which identifies the biblical Shishak with Ramesses II instead. It is rejected by Egyptology, and presenting the Sheshonq identification as contested would misrepresent the state of the field.",
        ],
      },
    ],
    verses: [
      { reference: "1 Kings 14:25-26", note: "Shishak takes the treasures of the temple and the palace in Rehoboam's fifth year" },
      { reference: "2 Chronicles 12:2-4", note: "The same campaign at length — the fortified cities of Judah taken first" },
      { reference: "2 Chronicles 12:9", note: "The gold shields Solomon made, carried off" },
      { reference: "1 Kings 11:40", note: "Jeroboam flees to Shishak and stays until Solomon dies" },
    ],
    sources: [
      { label: "Wikipedia: Bubastite Portal", url: "https://en.wikipedia.org/wiki/Bubastite_Portal" },
    ],
    discovery: {
      objectType: "A carved temple gateway with a triumphal relief and a topographical list of about 150 name-rings, in situ",
      findSite: "The Precinct of Amun-Re at Karnak, Thebes, between the temple of Ramesses III and the second pylon",
      // CORRECTED (scope §2.5b): Champollion's connection is datable to 1828 (published 1829). His
      // ring-29 "Judah the Kingdom" reading is rejected — see section three.
      foundYear: "Never buried. Connected with the biblical Shishak by Champollion in 1828, published 1829",
      foundBy: "No discoverer — the gate has always stood above ground. Jean-Francois Champollion made the biblical identification during his Egyptian expedition",
      objectDate: "c. 925 BC, the reign of Sheshonq I",
      objectDateCertainty: "traditional",
      currentLocation: "In situ at Karnak, Luxor, Egypt",
    },
    citations: [
      {
        tier: "institution",
        label: "Reliefs and Inscriptions at Karnak, Volume III: The Bubastite Portal (OIP 74)",
        url: "https://isac.uchicago.edu/research/publications/oip/reliefs-and-inscriptions-karnak-volume-iii-bubastite-portal",
        credit: "The Epigraphic Survey, Institute for the Study of Ancient Cultures (formerly the Oriental Institute), University of Chicago",
        detail: "Oriental Institute Publications 74, Chicago, 1954. The standard measured record of the relief and the name-rings, available as a free PDF",
        supports: "The content of the relief and the topographical list",
      },
      {
        tier: "scholarly",
        label: "I. Finkelstein, \"The Campaign of Shoshenq I to Palestine: A Guide to the 10th Century BCE Polity\"",
        credit: "Israel Finkelstein, Tel Aviv University",
        detail: "Zeitschrift des Deutschen Palastina-Vereins 118 (2002), 109-135. Print only",
        supports: "The reading of the omission of Jerusalem as historically significant",
      },
      {
        tier: "reference",
        label: "Bible and Interpretation: \"The Campaign of Pharaoh Shoshenq I in Palestine\"",
        url: "https://bibleinterp.arizona.edu/articles/Wilson-Campaign_of_Shoshenq_I_1",
        credit: "Bible and Interpretation, University of Arizona",
        supports: "The route of the campaign and the contents of the name-ring list",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Bubastite Portal",
        url: "https://en.wikipedia.org/wiki/Bubastite_Portal",
      },
    ],
    reflectionPrompt:
      "Rehoboam kept his city by emptying the temple. What have you paid out of something holy to keep something safe?",
  },
  {
    id: "elephantine-papyri",
    name: "Elephantine Papyri",
    alternateNames: ["Elephantine Papyri and Ostraca", "Assuan Papyri", "Yeb Papyri"],
    category: "discovery",
    role: "Fifth-Century BC Archive of a Judean Garrison Colony in Egypt",
    summary:
      "Letters, contracts and petitions from a Jewish military colony on an island in the Nile — which had its own temple, offered its own sacrifices, and wrote to Jerusalem for permission to rebuild it.",
    sections: [
      {
        heading: "Bought Before It Was Dug",
        paragraphs: [
          "There is no discovery date for the Elephantine papyri, and the reason is the story. The corpus surfaced piecemeal on the antiquities market at Aswan before any scientific excavation happened. In 1893 the American collector Charles Edwin Wilbour bought papyri there, including what turned out to be the complete family archive of a Judean named Ananiah, covering roughly half a century; they stayed in his trunks unpublished for sixty years, reached the Brooklyn Museum, and were finally edited in 1953. Other early buyers included A. H. Sayce, W. Spiegelberg, Lady William Cecil and Robert Mond, and Sayce with A. E. Cowley published the first substantial group, the \"Assuan papyri\", in 1906.",
          "Excavation followed the market rather than leading it. A German expedition under Otto Rubensohn and Friedrich Zucker dug the western mound of the island in 1906-1908, published by Eduard Sachau in 1911; French work under Charles Clermont-Ganneau on the eastern side between 1906 and 1911 produced hundreds of ostraca. The result is an archive scattered across the Staatliche Museen zu Berlin, the Brooklyn Museum, Cairo, the Bodleian and collections in London, Munich and Paris, with a large proportion of it carrying no findspot at all. That is a real limitation and it should be said before anything else: for much of this material the edition is the only context there is.",
        ],
      },
      {
        heading: "A Jewish Temple in Egypt",
        paragraphs: [
          "The colony was a Judean military garrison at Yeb — Elephantine, the island at the first cataract — serving under Persian rule in the fifth century BC. Its people spoke and wrote Aramaic, married, divorced, lent money, sued each other and left wills, all of which the papyri record in ordinary legal detail. They also had a temple. Not a synagogue: a temple to YHW, with an altar, at which they offered animal sacrifice, meal offerings and incense, and which by their own account had stood there before the Persian conquest of Egypt in 525 BC.",
          "In 410 BC that temple was destroyed. The priests of Khnum, whose ram-god had a cult next door and who are usually thought to have objected to the Judeans slaughtering sheep, especially at Passover, acted in collusion with the Persian governor Vidranga, and the building was demolished. Three years later the community wrote to Bagavahya, the governor of Judah, and to the sons of Sanballat, the governor of Samaria — the same Sanballat family that opposed Nehemiah — asking for support in rebuilding. A reply appears to have authorised meal offerings and incense but not animal sacrifice. The archive also preserves the so-called Passover Papyrus of 419 BC, giving instructions about the festival."
        ],
      },
      {
        heading: "The Awkward Part, Said Plainly",
        paragraphs: [
          "A functioning Yahwistic sacrificial temple outside Jerusalem, run by Judeans who evidently saw nothing wrong with it and who wrote to the authorities in Jerusalem and Samaria as fellow believers, sits awkwardly beside Deuteronomy 12's insistence that sacrifice belongs at the one place God chooses. It is worth stating the awkwardness rather than managing it, and then stating the options fairly. Some hold that the colony predated the reform, or was too remote to know of it, or understood the centralisation law as applying within the land. Much critical scholarship reads it the other way: that centralisation was later, or narrower, or far less universally observed than a tidy account assumes. And Jeremiah 44 shows Judeans in Egypt doing things Jeremiah regarded as flat apostasy, so a diaspora community out of step with the law is not a new datum in Scripture's own account of itself.",
          "Where the app stands: a command is not a report of compliance. Deuteronomy tells Israel what to do; it does not claim that every Judean in every century did it, and the prophets exist largely because they did not. A document showing disobedience is evidence about the people, not about the law. That said, the harder version of the question — whether Deuteronomy's centralisation was in force at all in the fifth century in the form the finished text gives it — is a real scholarly question and is not settled by pointing this out.",
          "A second dispute runs alongside. Some texts name Anat-Yahu alongside YHW, and two more name deities built on the element byt'l — a Northwest Semitic god, not the town in Ephraim — and it is argued whether this shows real polytheistic syncretism in the colony, or hypostatised attributes of the one God, or simply the names of contributing sub-groups in a collection list. B. Porten, the leading editor of the corpus, takes the more conservative line; others read straightforward syncretism. Nobody has settled it, and the honest position is that the colony's theology is only partly recoverable from what happen to be, in the main, tax lists and legal contracts.",
        ],
      },
    ],
    verses: [
      { reference: "Deuteronomy 12:5-6", note: "Sacrifice at the one place God chooses — the law Elephantine's temple sits awkwardly beside" },
      { reference: "Isaiah 19:19", note: "\"In that day, there will be an altar to Yahweh in the middle of the land of Egypt\"" },
      { reference: "Jeremiah 44:1", note: "Judeans settled across Egypt, in Jeremiah's own generation" },
      { reference: "Nehemiah 2:10", note: "Sanballat the Horonite — whose sons the colony wrote to seventy years later" },
    ],
    sources: [
      { label: "Texts and Scripts from Elephantine (Staatliche Museen zu Berlin)", url: "https://elephantine.smb.museum/" },
      { label: "Wikipedia: Elephantine papyri and ostraca", url: "https://en.wikipedia.org/wiki/Elephantine_papyri_and_ostraca" },
    ],
    discovery: {
      objectType: "Aramaic papyri and ostraca — letters, contracts, deeds, petitions, lists and one festival instruction",
      findSite: "Elephantine island (ancient Yeb) at Aswan, Egypt — and, for much of the corpus, the Aswan antiquities market",
      foundYear: "Market purchases from 1893; excavations 1906-1911",
      foundBy: "No single discovery. Charles Edwin Wilbour bought papyri at Aswan in 1893; Sayce and Cowley published the Assuan papyri in 1906; the German expedition of Otto Rubensohn and Friedrich Zucker excavated the western mound 1906-1908 (published by Eduard Sachau, 1911); French work under Charles Clermont-Ganneau on the eastern side, 1906-1911, produced hundreds of ostraca",
      objectDate: "Fifth century BC, chiefly c. 495-399 BC",
      objectDateCertainty: "firm",
      currentLocation: "Divided — Staatliche Museen zu Berlin (the largest holding), Brooklyn Museum, Egyptian Museum in Cairo, the Bodleian Library, and collections in London, Munich and Paris",
    },
    citations: [
      {
        tier: "institution",
        label: "Elephantine: Texts and Scripts from the Egyptian Border Town",
        url: "https://elephantine.smb.museum/",
        credit: "Agyptisches Museum und Papyrussammlung, Staatliche Museen zu Berlin",
        detail: "The holding institution's own project portal, publishing the objects and their editions",
        supports: "The corpus, its holdings and the Berlin material",
      },
      {
        tier: "scholarly",
        label: "B. Porten, Archives from Elephantine: The Life of an Ancient Jewish Military Colony",
        credit: "Bezalel Porten, Hebrew University of Jerusalem",
        detail: "University of California Press, 1968, and the Textbook of Aramaic Documents from Ancient Egypt (with A. Yardeni, 1986-1999). The standard edition and study. Print only",
        supports: "The temple, the 410 BC destruction, the 407 BC petition, and the reading of the syncretism question",
      },
      {
        tier: "reference",
        label: "Jewish Women's Archive: Elephantine",
        url: "https://jwa.org/encyclopedia/article/elephantine",
        credit: "Jewish Women's Archive encyclopedia",
        supports: "The colony's legal and social life as the contracts record it",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Elephantine papyri and ostraca",
        url: "https://en.wikipedia.org/wiki/Elephantine_papyri_and_ostraca",
      },
    ],
    reflectionPrompt:
      "A community far from Jerusalem built what it could and wrote home for permission. Where are you improvising in faith, and who should you be asking?",
  },
  {
    id: "temple-warning-inscription",
    name: "Temple Warning Inscription",
    alternateNames: ["Soreg Inscription", "Temple Balustrade Inscription"],
    category: "discovery",
    role: "First-Century Greek Notice Barring Gentiles from the Inner Temple Courts",
    summary:
      "A block of limestone carrying the death-penalty notice that stood on the barrier around the Temple's inner courts — a sentence Paul's accusers in Acts 21 had read.",
    sections: [
      {
        heading: "Found in a School Wall, and Sent to Istanbul",
        paragraphs: [
          "In 1871 Charles Clermont-Ganneau, working in Jerusalem for the Palestine Exploration Fund, noticed a block built into the wall of the ad-Dawadariya school, a madrasa just outside the Bab al-Atim gate on the north side of the Temple Mount. It carried seven lines of Greek. He recognised it at once as the notice Josephus describes as standing on the soreg, the low balustrade that marked the boundary of the Temple's inner courts, and published it through the Fund.",
          "Where it went next is the detail almost everyone gets wrong. The complete tablet passed to the Ottoman authorities and is in the Istanbul Archaeological Museums, inventory 2196 T. It is not in the Israel Museum, though a great many books, websites and museum captions say so. What is in the Israel Museum is a second, fragmentary stone bearing the same text, found by J. H. Iliffe in 1936 during excavation for a road outside the Lions' Gate and published by him that year in the Quarterly of the Department of Antiquities of Palestine; it is IAA 1936-989. Some accounts give 1935 as the find year with 1936 as publication, and that is not settled.",
        ],
      },
      {
        heading: "The Dividing Wall",
        paragraphs: [
          "The text, in the usual translation, reads: no foreigner is to enter within the balustrade and enclosure around the Temple; whoever is caught will have himself to blame for the death that follows. Josephus says such notices stood at intervals in Greek and in Latin. The theology behind them is not a Roman invention — Ezekiel 44:9 forbids the uncircumcised foreigner entry to the sanctuary — but the stone is the sign as a first-century visitor actually met it, in the trade language of the eastern Mediterranean, at eye level.",
          "Two New Testament passages sit directly on it. In Acts 21 the crowd that seizes Paul in the Temple accuses him of bringing Greeks past the barrier, having seen him in the city with Trophimus of Ephesus; the charge is capital, and the riot that follows is what sends Paul to Caesarea and eventually to Rome. And Ephesians 2:14 says that Christ has broken down the middle wall of partition — a phrase whose force is hard to feel until you have read a stone that made the partition explicit and attached a death sentence to crossing it.",
        ],
      },
      {
        heading: "How Much Weight the Stone Bears",
        paragraphs: [
          "Three honest limits. The first is the scope of the ban. Some read it as excluding all non-Jews without qualification; others argue it applied only to unconverted Gentiles, on the reasonable ground that Herod, an Idumean convert, built the thing and would hardly have barred himself and his descendants from the courts of his own Temple. The Greek word translated \"foreigner\" does not settle it, and the question is open.",
          "The second is legal. It is debated how far Rome genuinely delegated capital jurisdiction for violations of this notice — whether a Gentile caught inside would actually have been executed by Jewish authorities with Roman blessing, or whether the sign states a threat that Rome tolerated without formally authorising. The stone asserts the penalty; it cannot tell us how it was enforced.",
          "The third is exegetical, and the mildest. Most commentators think Ephesians 2:14 alludes to this barrier. Some read the image as purely metaphorical, drawn from a general vocabulary of walls rather than from this specific one, and note that Ephesians never mentions the Temple. That is a minority reading but not a foolish one, and it is worth knowing it exists. What the stone does not do, in any case, is prove that the events of Acts 21 happened; it shows that the accusation made there was a real accusation with a real penalty behind it, which is a different and more modest thing.",
        ],
      },
    ],
    verses: [
      { reference: "Acts 21:27-29", note: "Paul accused of bringing Trophimus past the barrier this stone stood on" },
      { reference: "Ephesians 2:14", note: "\"Broke down the middle wall of partition\"" },
      { reference: "Acts 24:5-6", note: "The charge repeated before the governor: \"He even tried to profane the temple\"" },
      { reference: "Ezekiel 44:9", note: "The older rule the notice enforced" },
    ],
    sources: [
      { label: "Wikipedia: Temple Warning inscription", url: "https://en.wikipedia.org/wiki/Temple_Warning_inscription" },
    ],
    discovery: {
      objectType: "Limestone block with seven incised lines of Greek",
      findSite: "Built into the wall of the ad-Dawadariya school, just outside the Bab al-Atim gate of the Temple Mount, Jerusalem",
      findSiteId: "jerusalem",
      findSiteKind: "location",
      foundYear: "1871 (the complete tablet); 1936 (a second, fragmentary stone)",
      foundBy: "Charles Clermont-Ganneau, publishing through the Palestine Exploration Fund, found the complete tablet in 1871. The fragment was found by J. H. Iliffe in 1936 during road excavation outside the Lions' Gate; some accounts give 1935 for the find and 1936 for the publication",
      objectDate: "Before AD 70 — from Herod's Temple",
      objectDateCertainty: "traditional",
      // CORRECTED (scope §2.5b, §2.5c #11): the complete tablet is in ISTANBUL, not the Israel
      // Museum. Only the 1936 Iliffe fragment is in Jerusalem.
      currentLocation: "The complete tablet is in the Istanbul Archaeological Museums, inv. 2196 T — not, as is very commonly stated, the Israel Museum. Only the 1936 fragment is in the Israel Museum (IAA 1936-989)",
    },
    citations: [
      {
        tier: "institution",
        label: "Istanbul Archaeological Museums, inv. 2196 T",
        credit: "Istanbul Archaeological Museums",
        detail: "The complete tablet has been in the Ottoman and then Turkish state collection since it left Jerusalem in the 1870s. The museum publishes no English object page that could be fetched and confirmed, so no URL is given rather than a guessed one",
        supports: "Current location and inventory number of the complete tablet",
      },
      {
        tier: "scholarly",
        label: "J. H. Iliffe, \"The Thanatos Inscription from Herod's Temple\"",
        credit: "John Henry Iliffe, Palestine Archaeological Museum",
        detail: "Quarterly of the Department of Antiquities of Palestine 6 (1936), 1-3 — publication of the second, fragmentary stone found outside the Lions' Gate. Print only",
        supports: "The 1936 fragment, its find and its publication",
      },
      {
        tier: "institution",
        label: "Palestine Exploration Fund",
        url: "https://www.pef.org.uk/",
        credit: "The Palestine Exploration Fund",
        detail: "The body through which Clermont-Ganneau published the 1871 find, in its Quarterly Statement. The Quarterly Statement itself is print",
        supports: "The 1871 find and its first publication",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Temple Warning inscription",
        url: "https://en.wikipedia.org/wiki/Temple_Warning_inscription",
      },
    ],
    reflectionPrompt:
      "Someone cut a death sentence into stone to keep people out of God's presence, and Christ took the wall down. Who are you still keeping on the far side of a barrier?",
  },
  {
    id: "theodotus-inscription",
    name: "Theodotus Inscription",
    alternateNames: ["Theodotos Inscription", "Theodotus Synagogue Inscription"],
    category: "discovery",
    role: "Pre-70 Greek Synagogue Dedication from Jerusalem",
    summary:
      "Ten lines of Greek recording that a priest built a synagogue in Jerusalem for reading the Law, with a guest house attached — the closest thing there is to a description of a first-century synagogue by the man who paid for it.",
    sections: [
      {
        heading: "Out of a Cistern, in Fill",
        paragraphs: [
          "In December 1913, Raymond Weill was conducting the first excavation of the southeastern hill of Jerusalem — the ridge below the Temple Mount now called the City of David, or Wadi Hilweh — when a limestone block with ten lines of incised Greek came out of a cistern. It was in fill, not in place: nobody found a synagogue attached to it, and nobody has since. That single fact about the find is what makes the third section of this article necessary, so it is worth stating first rather than last.",
          "The stone is in the Israel Museum in Jerusalem and is catalogued in the standard corpus of Jewish inscriptions as CIJ II 1404. No published Israel Antiquities Authority inventory number could be found for it, and none is invented here.",
        ],
      },
      {
        heading: "Built for Reading the Law",
        paragraphs: [
          "The text names Theodotos son of Vettenos, priest and archisynagogos — ruler of the synagogue — son of an archisynagogos and grandson of an archisynagogos, and says that he built the synagogue for the reading of the Law and the teaching of the commandments, together with a guest house, rooms, and water installations for the lodging of those from abroad who need them.",
          "Almost every phrase is worth something. Three generations of synagogue rulers means an established institution, not an improvisation. The stated purpose — reading the Law, teaching the commandments — is precisely what the Gospels show happening in synagogues: Jesus stands up to read in Nazareth, teaches on the Sabbath in Capernaum, and tells the high priest that he always taught in synagogues and in the Temple and said nothing in secret. And the guest house for visitors from abroad fits a pilgrimage city. The family name Vettenos is Latin, which has suggested to many that this was a family of freedmen descended from Jewish captives taken to Rome, and hence a possible link to the synagogue of the Freedmen named in Acts 6:9. That is a suggestion, made often and confirmed by nothing; the stone does not say it.",
        ],
      },
      {
        heading: "Kee's Challenge, and Why the Field Did Not Follow",
        paragraphs: [
          "Howard Clark Kee argued in New Testament Studies in 1990, and in later essays, that the inscription is not first-century at all but second or third and possibly as late as the fourth. This was not a stray suggestion: it was load-bearing for a larger thesis of his that purpose-built synagogue buildings did not exist before AD 70, and that the Gospels' synagogue scenes are therefore anachronisms projected back by later writers. If Kee were right, a good deal of how the Gospels describe Jesus's public ministry would have to be re-read.",
          "He was answered thoroughly. J. S. Kloppenborg Verbin's \"Dating Theodotos\" in the Journal of Jewish Studies in 2000 went through the paleography, the onomastics and the archaeological context and concluded for a date before 70; Rainer Riesner argued along similar lines. Kee replied, and the field did not follow him. The current position is that the inscription is pre-70, most placing it in the late first century BC or the first century AD. The wider thesis has fared no better: first-century synagogue buildings have since been excavated at Gamla, Masada, Herodium and Magdala, which is a harder kind of answer than an argument about letter forms.",
          "The honest note to end on is not about who won but about why the argument was possible. The stone came out of fill in a cistern with no building attached, so its date rests on letter forms, name types and the material found around it rather than on where it sat. That is a real weakness, and Kee was entitled to press it. What makes the question settled is not that his opponents shouted louder but that the paleographic case converged with the excavation of actual first-century synagogues elsewhere — two independent lines arriving at the same answer. An article that skipped straight to \"pre-70\" would have hidden the only interesting part.",
        ],
      },
    ],
    verses: [
      { reference: "Luke 4:16-17", note: "Jesus stands up to read in the synagogue at Nazareth, \"as was his custom\"" },
      { reference: "Mark 1:21", note: "Teaching in the synagogue at Capernaum on the Sabbath" },
      { reference: "John 18:20", note: "\"I always taught in synagogues, and in the temple\"" },
      { reference: "Acts 6:9", note: "The synagogue of the Freedmen — sometimes linked to Theodotos's Latin family name, though the stone does not say so" },
    ],
    sources: [
      { label: "Brown University: Inscriptions of Israel/Palestine — the Theodotus dialogue", url: "https://library.brown.edu/iip/stories/theodotus/" },
      { label: "Wikipedia: Theodotos inscription", url: "https://en.wikipedia.org/wiki/Theodotos_inscription" },
    ],
    discovery: {
      objectType: "Limestone block with ten incised lines of Greek",
      findSite: "A cistern on the southeastern hill of Jerusalem — the City of David / Wadi Hilweh — found in fill, not in architectural context",
      findSiteId: "city-of-david",
      findSiteKind: "poi",
      foundYear: "December 1913",
      foundBy: "Raymond Weill, in the first excavation of the southeastern hill",
      objectDate: "Late first century BC or first century AD, before AD 70",
      objectDateCertainty: "traditional",
      currentLocation: "Israel Museum, Jerusalem; catalogued as CIJ II 1404. No published IAA inventory number was found and none is given",
    },
    citations: [
      {
        tier: "institution",
        label: "Inscriptions of Israel/Palestine: the Theodotus dialogue",
        url: "https://library.brown.edu/iip/stories/theodotus/",
        credit: "Brown University Library, Inscriptions of Israel/Palestine project",
        detail: "A scholarly edition and discussion of the inscription, including the dating argument",
        supports: "The text, the translation and the state of the dating question",
      },
      {
        tier: "scholarly",
        label: "J. S. Kloppenborg Verbin, \"Dating Theodotos (CIJ II 1404)\"",
        credit: "John S. Kloppenborg Verbin, University of Toronto",
        detail: "Journal of Jewish Studies 51/2 (2000), 243-280. The detailed rebuttal of Kee's late dating. Print only",
        supports: "The refutation of the second-to-fourth-century dating",
      },
      {
        tier: "scholarly",
        label: "R. Riesner, \"Synagogues in Jerusalem\" and the NTS exchange with H. C. Kee",
        url: "https://www.cambridge.org/core/journals/new-testament-studies/article/abs/on-further-defining-the-firstcentury-ce-synagogue-fact-or-fiction-a-rejoinder-to-h-c-kee/EEF0F79A1BE17E80AB7D85A725B16DAC",
        credit: "New Testament Studies, Cambridge University Press",
        detail: "The published rejoinder to Kee's thesis that purpose-built synagogues did not exist before AD 70",
        supports: "The wider dispute about first-century synagogue buildings",
        paywalled: true,
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Theodotos inscription",
        url: "https://en.wikipedia.org/wiki/Theodotos_inscription",
      },
    ],
    reflectionPrompt:
      "Theodotos built a place for reading Scripture and a guest room for strangers, and thought of them as one project. What would it look like for your hospitality and your Bible reading to belong to each other?",
  },
  {
    id: "crucified-man-givat-hamivtar",
    name: "Crucified Man of Giv'at ha-Mivtar",
    alternateNames: ["Yehohanan son of Hagqol", "Giv'at ha-Mivtar Crucifixion"],
    category: "discovery",
    role: "The Only Skeletal Evidence of Crucifixion Ever Found",
    summary:
      "A heel bone with an iron nail still through it, from a tomb north of Jerusalem — and a reconstruction of how he died that was overturned in 1985 and is still repeated almost everywhere.",
    sections: [
      {
        heading: "A Salvage Dig Ahead of the Bulldozers",
        paragraphs: [
          "In June 1968, construction work in the Giv'at ha-Mivtar neighbourhood north of Jerusalem — the area also called Ras el-Masaref — broke into ancient tombs, and the Israel Department of Antiquities sent Vassilios Tzaferis, a former Greek Orthodox monk turned archaeologist, to excavate them before they were lost. In Tomb I was an ossuary inscribed with the name Yehohanan son of Hagqol; the transliterations of the father's name vary between publications. The bones inside were of a man of roughly twenty-four to twenty-eight, about five foot six, and through his right heel bone was an iron nail, bent over so that it could not be pulled out, still carrying with it a fragment of the wooden upright it had been driven into.",
          "That bent nail is the reason this find exists at all. The Romans crucified people by the thousand across four centuries, and this is the only skeleton ever recovered that shows it. Iron was worth money and nails were routinely pulled out and reused; this one had hit a knot in the wood, curled, and stayed. The ossuary and a replica of the heel bone with its nail are displayed in the Israel Museum in Jerusalem. The remains themselves were reburied, as Israeli practice requires — and the haste of that requirement matters for what follows, because the anatomist who examined them was working against a clock set by the religious authorities.",
        ],
      },
      {
        heading: "What the Bone Establishes",
        paragraphs: [
          "It establishes that a man was crucified in Judea in the first century, and that at least in his case a nail was driven through the heel. It also, quietly, establishes something about burial. Under Roman practice the crucified were commonly left to rot or thrown into a common pit; the shocking thing about Yehohanan is not the nail but the ossuary. Somebody claimed the body, and it went into a family tomb and eventually into an inscribed limestone box like anyone else's.",
          "That is because of Deuteronomy 21:22-23, which requires that a man hanged on a tree be buried the same day and not left overnight, on the ground that a hanged man is under God's curse and defiles the land. John 19:31 has the Judean leadership asking Pilate to break the legs of the crucified so the bodies would not remain over the Sabbath. Yehohanan is physical evidence that this concession was made and this custom kept, which is the background against which the Gospels' account of Jesus's burial in a tomb belonging to a member of the council should be read. Paul reaches for the same verse from Deuteronomy in Galatians 3:13 and turns it inside out: the curse is the point.",
        ],
      },
      {
        heading: "The Version Almost Everyone Still Repeats Was Retracted in 1985",
        paragraphs: [
          "This is the most important thing on this page. The reconstruction published by the anatomist Nicu Haas in 1970 said that the man's heels had been nailed together sideways with a single nail, that his forearms had been pierced, and that his legs had been deliberately broken. That reconstruction is in a great many books, in a great many sermon illustrations, and on the overwhelming majority of websites that discuss this find. It was overturned forty years ago.",
          "J. Zias and E. Sekeles published \"The Crucified Man from Giv'at ha-Mivtar: A Reappraisal\" in the Israel Exploration Journal in 1985, and it dismantled the earlier account point by point. The nail is about 11.5 centimetres long — earlier reports of seventeen or eighteen centimetres were simply wrong — which is far too short to have passed through two heel bones and a plaque. So the feet were not nailed together: each foot was nailed separately, one to either side of the upright, with the man straddling the post. The mark on the forearm bone is non-traumatic and is not evidence of nailing; the arms were most likely tied. The break in the leg bones is post-mortem, and the evidence for deliberate leg-breaking is inconclusive. A talus bone in the assemblage probably belongs to a third individual entirely. Haas suffered a stroke in 1975 and never replied to any of it.",
          "Two things follow, and both are worth being blunt about. The first is that if you have read a description of this find anywhere else, it is more likely than not to be the retracted version, and it is not a matter of scholarly taste — it is a measurement. The second is a limit on what the corrected version proves. This is one skeleton. It shows that heel-nailing happened; it does not show that heel-nailing was standard, or that every crucifixion looked like this one, and it cannot settle the question of where the nails went in Jesus's own case. Thomas asks to see the print of the nails in Jesus's hands, and this bone has nothing to say about that either way. An article that used Yehohanan to reconstruct Good Friday in detail would be doing exactly what Haas did — building more on one body than one body can carry.",
        ],
      },
    ],
    verses: [
      { reference: "John 19:31-33", note: "The request that the legs be broken so the bodies would not remain on the Sabbath" },
      { reference: "Deuteronomy 21:22-23", note: "Same-day burial for a man hanged on a tree — why a crucified man got a tomb at all" },
      { reference: "Galatians 3:13", note: "Paul turns the curse of Deuteronomy 21 inside out" },
      { reference: "John 20:25", note: "\"The print of the nails\" — a detail this bone cannot speak to" },
    ],
    sources: [
      { label: "Associates for Biblical Research: Rethinking the Crucified Man from Giv'at ha-Mivtar", url: "https://biblearchaeology.org/research/new-testament-era/4185-rethinking-the-crucified-man-from-givat-hamivtar" },
      { label: "Wikipedia: Jehohanan", url: "https://en.wikipedia.org/wiki/Jehohanan" },
    ],
    discovery: {
      objectType: "A right heel bone with an iron nail of about 11.5 cm through it, and the inscribed limestone ossuary that held the remains",
      findSite: "Tomb I at Giv'at ha-Mivtar (Ras el-Masaref), north of Jerusalem — a salvage excavation ahead of construction",
      findSiteId: "jerusalem",
      findSiteKind: "location",
      foundYear: "June 1968",
      foundBy: "Vassilios Tzaferis, for the Israel Department of Antiquities",
      objectDate: "First century AD, before AD 70",
      objectDateCertainty: "traditional",
      currentLocation: "The ossuary and a replica of the heel bone with its nail are displayed in the Israel Museum, Jerusalem; the skeletal remains themselves were reburied in accordance with Israeli practice",
    },
    citations: [
      {
        tier: "scholarly",
        label: "J. Zias and E. Sekeles, \"The Crucified Man from Giv'at ha-Mivtar: A Reappraisal\"",
        credit: "Joseph Zias and Eliezer Sekeles, Israel Antiquities Authority / Hebrew University",
        detail: "Israel Exploration Journal 35 (1985), 22-27. The reappraisal that overturned the 1970 reconstruction. Print only",
        supports: "The 11.5 cm nail, the separate nailing of each foot, the non-traumatic forearm mark, and the post-mortem leg break",
      },
      {
        tier: "scholarly",
        label: "N. Haas, \"Anthropological Observations on the Skeletal Remains from Giv'at ha-Mivtar\"",
        credit: "Nicu Haas, Hebrew University",
        detail: "Israel Exploration Journal 20 (1970), 38-59. The original reconstruction, superseded in 1985 and cited here as the source of the version still in general circulation. Print only",
        supports: "The retracted reconstruction, and its provenance",
      },
      {
        tier: "reference",
        label: "Associates for Biblical Research: \"Rethinking the Crucified Man from Giv'at ha-Mivtar\"",
        url: "https://biblearchaeology.org/research/new-testament-era/4185-rethinking-the-crucified-man-from-givat-hamivtar",
        credit: "Associates for Biblical Research",
        supports: "A point-by-point comparison of the 1970 and 1985 readings",
      },
      {
        tier: "institution",
        label: "Israel Museum, Jerusalem — the Yehohanan ossuary and heel-bone replica",
        credit: "The Israel Museum, Jerusalem",
        detail: "The museum's online collection is served as a JavaScript application and could not be fetched and confirmed for this article, so no object URL is given rather than an unverified one",
        supports: "Current location of the ossuary and the displayed replica",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Jehohanan",
        url: "https://en.wikipedia.org/wiki/Jehohanan",
      },
    ],
    reflectionPrompt:
      "A wrong account of this man's death has been repeated for fifty years because it was vivid and nobody checked. What have you passed on because it moved you rather than because you knew it was true?",
  },
  {
    id: "nazareth-inscription",
    name: "Nazareth Inscription",
    // NOT registered: "Nazareth" — that is the town, which owns it in locations.ts.
    alternateNames: ["Nazareth Decree", "Edict of Caesar Concerning Graves"],
    category: "discovery",
    role: "Greek Imperial Edict Against Grave Robbery, of Unknown Provenance",
    summary:
      "A marble slab ordering that tombs be left undisturbed, on pain of death — bought from a dealer in 1878 and endlessly presented as a Roman reaction to the empty tomb. It is nothing of the kind.",
    sections: [
      {
        heading: "Sent From Nazareth, Not Found At It",
        paragraphs: [
          "There is no excavation behind this stone. In 1878 the collector Wilhelm Frohner acquired a white marble slab carrying about twenty-two lines of Greek, and his own catalogue note describes it as a marble slab sent from Nazareth in 1878. Sent from, not found at. Nazareth in the late nineteenth century was a collecting point on an antiquities route, and a shipping label establishes where a dealer posted something, not where it came out of the ground. Frohner never published it. It sat unnoticed for fifty-two years until Franz Cumont edited it in 1930, by which time Frohner was long dead and no further information about its origin could be recovered.",
          "It has been in the Bibliotheque nationale de France, in the Cabinet des Medailles in Paris, on display since 1925. No shelfmark for it could be verified, and none is invented here. This is the badge at the top of this page in practice: an object with no excavation context can be entirely genuine and still carry far less weight than a stone dug out of a dated floor, because there is no floor to argue from.",
        ],
      },
      {
        heading: "What the Stone Says",
        paragraphs: [
          "The text is a diatagma Kaisaros, an edict of an emperor. It orders that tombs and graves made for the worship of ancestors or family remain undisturbed in perpetuity; that anyone who destroys them, or removes the buried, or moves the sealing stones with malicious intent, be tried; and it prescribes a capital penalty for violating a tomb. It does not say which emperor issued it, and it carries no date.",
          "Edicts of this general kind are not unusual. Grave robbery was a real and recurring problem across the Roman world, tomb violation was already a crime, and inscriptions cursing or threatening those who disturb a burial are common. What made this one famous is the combination of a capital penalty, a mention of moving stones, and a note saying it came from Nazareth — which invited the reading that a Roman emperor had heard the story in Matthew 28 of a body removed from a sealed tomb and legislated against it.",
        ],
      },
      {
        heading: "The Resurrection Claim Is Dead, and the 2020 Study Did Not Revive It",
        paragraphs: [
          "That reading has never had a foundation, and it is worth being precise about why rather than merely dismissing it. There is no provenance, so the Nazareth connection rests entirely on a dealer's note about a shipping point. There is no date on the stone, so the palaeographic range spans emperors on either side of the relevant decades. And the edict type is attested independently of Judea, so nothing in its content requires a Judean occasion. Three independent gaps, each fatal on its own.",
          "In 2020 a team led by Kyle Harper and M. McCormick published a stable-isotope study of the marble in the Journal of Archaeological Science: Reports. Laser-ablation analysis found enriched carbon-13 and depleted oxygen-18, a signature matching the upper quarry on the Greek island of Kos, and from that provenance the authors proposed that the edict was issued by Augustus in response to the desecration of the tomb of Nikias, a Koan tyrant who died around 20 BC. The precise limit is this: isotopes identify the quarry the stone was cut from. They do not identify where the text was carved, where the stele stood, or when it was inscribed. Marble travelled. The Nikias identification is a plausibility argument built on the quarry result, not a demonstration, and the authors present it as a proposal.",
          "What the study does do decisively is remove the claim's only Galilean foothold: the marble is not local stone. The apologetic claim was weak before 2020 and is weaker now, and this app states that plainly for a reason that has nothing to do with scepticism. The resurrection is not held up by this stone, and it never was. An argument that leans on it is an argument a reader will one day have taken away from them by someone better informed — and the damage that does is worse than the help the argument was ever giving.",
        ],
      },
    ],
    verses: [
      { reference: "Matthew 27:62-66", note: "The guard at the tomb and the sealed stone" },
      { reference: "Matthew 28:11-15", note: "The story that the disciples stole the body, \"spread abroad among the Jews\"" },
      { reference: "John 20:25", note: "The disciples' own claim was not that the tomb was legally protected but that they had seen him" },
    ],
    sources: [
      { label: "Wikipedia: Nazareth Inscription", url: "https://en.wikipedia.org/wiki/Nazareth_Inscription" },
      { label: "Associates for Biblical Research: New study questions context of the Nazareth Inscription", url: "https://biblearchaeology.org/new-study-questions-context-of-nazareth-inscription/" },
    ],
    discovery: {
      objectType: "White marble slab with about twenty-two lines of Greek — a diatagma Kaisaros, an edict of Caesar",
      findSite: "Unknown. It has no excavation context and was acquired on the antiquities market",
      foundYear: "Acquired 1878; first published 1930",
      foundBy: "No excavator. The collector Wilhelm Frohner acquired it in 1878; his own catalogue note reads \"marble slab sent from Nazareth in 1878\" — sent from, not found at. It was published only in 1930, by Franz Cumont",
      objectDate: "Uncertain. The stone carries no date and palaeography allows a wide range across the early empire",
      objectDateCertainty: "disputed",
      currentLocation: "Bibliotheque nationale de France, Cabinet des Medailles, Paris, on display since 1925. No shelfmark could be verified and none is given",
      unprovenanced: true,
    },
    citations: [
      {
        tier: "scholarly",
        label: "K. Harper, M. McCormick et al., \"Establishing the provenance of the Nazareth Inscription\"",
        credit: "Kyle Harper, Michael McCormick, Matthew Hamilton, Chantal Peiffert, Raymond Michels and colleagues",
        detail: "Journal of Archaeological Science: Reports 30 (2020), 102228. Laser-ablation stable-isotope analysis matching the marble to the upper quarry on Kos. The publisher's page refuses automated requests, so no URL is given; the DOI is 10.1016/j.jasrep.2020.102228",
        supports: "The isotope result, the Kos quarry match, and the proposed Nikias occasion",
        paywalled: true,
      },
      {
        tier: "institution",
        label: "Bibliotheque nationale de France, Cabinet des Medailles",
        credit: "Bibliotheque nationale de France",
        detail: "The holding institution since 1925. No object page or shelfmark could be verified, so neither is given rather than a guessed one",
        supports: "Current location",
      },
      {
        tier: "reference",
        label: "Associates for Biblical Research: \"New Study Questions Context of Nazareth Inscription\"",
        url: "https://biblearchaeology.org/new-study-questions-context-of-nazareth-inscription/",
        credit: "Associates for Biblical Research",
        detail: "An evangelical archaeology organisation's own assessment, reaching the same conclusion about the resurrection claim",
        supports: "The collapse of the Nazareth provenance and the limits of the 2020 study",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Nazareth Inscription",
        url: "https://en.wikipedia.org/wiki/Nazareth_Inscription",
      },
    ],
    reflectionPrompt:
      "The resurrection was never resting on this stone. What is your own confidence actually resting on?",
  },
  {
    id: "arad-ostraca",
    name: "Arad Ostraca",
    alternateNames: ["Arad Inscriptions", "Arad Letters"],
    category: "discovery",
    role: "Hebrew Military Correspondence from a Judahite Desert Fort",
    summary:
      "More than a hundred inked potsherds from a small fort in the Negev — ration orders, troop movements, and a mention of the house of YHWH — written in Judah's last years.",
    sections: [
      {
        heading: "A Fort's Filing System",
        paragraphs: [
          "Tel Arad in the eastern Negev was excavated between 1962 and 1967 in two halves: Yohanan Aharoni directed the upper mound with its Iron Age citadel, and R. Amiran directed the much older Early Bronze city on the lower slope. Aharoni's half produced something a small border fort has no business producing — more than a hundred Hebrew inscriptions written in ink on broken pottery, the ancient equivalent of scrap paper.",
          "The best known group is the archive of Eliashib son of Eshyahu, the man in charge of stores in Stratum VI, around 600 BC. His correspondence is entirely unglamorous and that is why it is valuable: issue so much wine to the Kittim, so much flour, so much oil; send men to Ramat-Negev; do this quickly. Aharoni published the corpus as Arad Inscriptions, in Hebrew in 1975 and in English in 1981, and the material is held by the Israel Antiquities Authority and displayed in the Israel Museum.",
        ],
      },
      {
        heading: "The House of YHWH, and the Last Weeks",
        paragraphs: [
          "Two things in the archive reach directly into the biblical text. One is a reference to the house of YHWH — a fort clerk writing about the temple as an ordinary point of reference, in Hebrew, in Judah, before the exile. The other is the tone of the latest letters, which are the correspondence of a garrison under increasing pressure as the Babylonian advance closes in. Jeremiah 34:7 describes exactly this moment from the other end of the country, with the army of Babylon fighting against Jerusalem, against Lachish and against Azekah, and those alone left of the fortified cities of Judah. Arad is the southern edge of the same emergency.",
          "Arad itself is in Scripture from much earlier: the Canaanite king of Arad fights Israel in Numbers 21, and Judges places the Kenites settling in the wilderness south of Arad. The citadel also contained a small sanctuary with two altars, which was dismantled and buried at some point in the fort's life — a fact often connected to the reforms of Hezekiah or Josiah described in 2 Kings, and which belongs to its own article rather than this one.",
        ],
      },
      {
        heading: "Six Writers, Twelve Authors, and What Literacy Means",
        paragraphs: [
          "In 2016 a Tel Aviv University group published a study in the Proceedings of the National Academy of Sciences applying image processing and machine learning to the handwriting on sixteen of the Arad ostraca. Their conclusion was that at least six distinct writers were at work, ranging from the fort commander down to a deputy quartermaster, and that all of them wrote with competent spelling and syntax. From this they argued for a relatively widespread literacy in Judah around 600 BC, and further, that a substantial amount of biblical literature could therefore have been compiled before the destruction of 586 BC rather than during or after the exile.",
          "Christopher Rollston praised the method and rejected the sociological conclusion, and his objection is the one to weigh. The ostraca do not all come from a single moment: they span different strata across the seventh century and earlier, so six writers over decades is a thinner result than six writers at one desk. And six literate men at a military installation shows that the military-administrative apparatus of Judah could read and write, which nobody doubted. Literacy in an administrative elite is not literacy in the population, and the leap from one to the other is where the argument becomes an argument rather than a measurement.",
          "One thing readers should not conflate. The same group published a follow-up in PLOS ONE in 2020 combining forensic document examination with the algorithms, after which Tel Aviv University publicised a figure of twelve authors for the Arad corpus. \"Six writers\" and \"twelve authors\" are different studies, on differently defined bodies of material, and quoting them interchangeably — as many summaries do — misrepresents both. Where the app stands: the ostraca are strong evidence that writing was an ordinary working tool of Judah's administration well before the exile, which is genuinely relevant to how the biblical books could have been written, copied and kept. They are not evidence about who could read in a village, and the more ambitious version of the claim outruns what sixteen potsherds can carry.",
        ],
      },
    ],
    verses: [
      { reference: "Numbers 21:1", note: "The Canaanite king of Arad attacks Israel" },
      { reference: "Judges 1:16", note: "The Kenites settle in the wilderness of Judah, south of Arad" },
      { reference: "Jeremiah 34:7", note: "Lachish and Azekah alone left — the emergency the last Arad letters belong to" },
      { reference: "2 Kings 23:8", note: "Josiah defiles the high places from Geba to Beersheba — the reform often connected with the Arad sanctuary" },
    ],
    sources: [
      { label: "Rollston Epigraphy: methodological musings on the PNAS study", url: "http://www.rollstonepigraphy.com/?p=708" },
      { label: "Tel Aviv University: the Arad texts and the twelve-author study", url: "https://english.tau.ac.il/news/Literacy-in-the-biblic-times" },
    ],
    discovery: {
      objectType: "Over a hundred ostraca — Hebrew letters and lists written in ink on potsherds",
      findSite: "The Iron Age citadel on the upper mound at Tel Arad, in the eastern Negev",
      foundYear: "1962-1967",
      foundBy: "Yohanan Aharoni, who directed the upper mound and the Iron Age citadel. Ruth Amiran directed the Early Bronze lower city in the same seasons",
      objectDate: "Chiefly late seventh to early sixth century BC; the Eliashib archive is Stratum VI, c. 600 BC",
      objectDateCertainty: "traditional",
      currentLocation: "Israel Antiquities Authority collection; displayed at the Israel Museum, Jerusalem",
    },
    citations: [
      {
        tier: "institution",
        label: "Y. Aharoni, Arad Inscriptions",
        credit: "Yohanan Aharoni, for the Tel Arad excavation — the excavating body's own publication",
        detail: "Hebrew edition 1975; English edition, Israel Exploration Society, 1981. Cited in place of a museum object page: the Israel Museum's online collection could not be fetched. Print only",
        supports: "The corpus, the Eliashib archive and the stratigraphy",
      },
      {
        tier: "scholarly",
        label: "S. Faigenbaum-Golovin et al., \"Algorithmic handwriting analysis of Judah's military correspondence sheds light on composition of biblical texts\"",
        credit: "Shira Faigenbaum-Golovin, Arie Shaus and colleagues, Tel Aviv University",
        detail: "Proceedings of the National Academy of Sciences 113/17 (2016), 4664-4669; DOI 10.1073/pnas.1522200113. The publisher's site refuses automated requests, so no URL is given",
        supports: "The six-writer result and the argument from it to pre-exilic composition",
      },
      {
        tier: "scholarly",
        label: "C. Rollston, \"The Tel Aviv University PNAS Study: Some Methodological Musings\"",
        url: "http://www.rollstonepigraphy.com/?p=708",
        credit: "Christopher Rollston, George Washington University",
        detail: "Rollston Epigraphy, April 2016",
        supports: "The objection to the leap from six writers to widespread literacy",
      },
      {
        tier: "scholarly",
        label: "Forensic document examination and algorithmic handwriting analysis of Judahite biblical period inscriptions",
        url: "https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0237962",
        credit: "Faigenbaum-Golovin and colleagues, Tel Aviv University",
        detail: "PLOS ONE 15/9 (2020), e0237962 — the follow-up study behind the later \"twelve authors\" figure. Open access",
        supports: "The distinction between the 2016 six-writer result and the later twelve-author figure",
      },
      {
        tier: "reference",
        label: "Tel Aviv University: \"The texts from the biblical-period fortress at Tel Arad were written by 12 different authors\"",
        url: "https://english.tau.ac.il/news/Literacy-in-the-biblic-times",
        credit: "Tel Aviv University",
        supports: "The twelve-author figure as the university itself publicised it",
      },
    ],
    reflectionPrompt:
      "The most valuable thing Eliashib left behind was a stack of routine supply orders he never expected anyone to read. What ordinary faithfulness of yours is worth more than you think?",
  },
  {
    id: "hezekiah-bulla",
    name: "Hezekiah Bulla",
    alternateNames: ["Bulla of King Hezekiah", "Hezekiah Seal Impression"],
    category: "discovery",
    role: "The Seal Impression of a King of Judah, from a Controlled Excavation",
    summary:
      "A lump of clay the size of a fingernail, stamped \"Belonging to Hezekiah, [son of] Ahaz, king of Judah\" — the first seal impression of a king of Israel or Judah ever recovered from a scientific excavation rather than bought from a dealer.",
    sections: [
      {
        heading: "Found Twice — Once in the Ground, Once in a Sieve",
        paragraphs: [
          "The bulla came out of Area A of the Ophel excavations in 2009, in a season directed by E. Mazar at the foot of the southern wall of Temple Mount. Its immediate context was an ancient refuse dump beside a royal building that had been used for storing food — not a treasury, not an archive, a rubbish tip. Nobody saw it in the trench. It surfaced later at the Emek Tzurim wet-sifting facility run by G. Barkay and Zachi Dvira, where the excavation's earth is washed through screens, and the person who actually recovered it was Efrat Greenwald, a member of the Ophel expedition supervising the sifting.",
          "Then it sat unrecognised for years. Reut Ben-Aryeh, preparing the Hebrew bullae from the Ophel for publication, was the first to read it as the seal of a king of Judah. The find was announced in December 2015 alongside the first volume of the Ophel final reports — six years after the clay left the ground. The object itself is tiny: a clay lump about 13 by 12 millimetres and 3 millimetres thick, carrying an oval impression of roughly 9.7 by 8.6 millimetres. Above the writing is a winged sun disk with its wings turned downward, flanked by two ankh signs.",
        ],
      },
      {
        heading: "A Name, a Father, and a Title",
        paragraphs: [
          "The inscription is not a name on its own. In Old Hebrew it reads lḥzqyhw ʾḥz mlk yhdh — \"belonging to Hezekiah, [son of] Ahaz, king of Judah.\" Three separate identifiers are stamped into the clay: the personal name, the father's name, and the office. That combination is what makes this find different from most of the seals and bullae in this section, where the argument has to be built out of a single common name. Hezekiah son of Ahaz who ruled Judah is one man. He is the king of 2 Kings 18-20, of Isaiah 36-39, and of 2 Chronicles 29-32, and 2 Kings 16:20 names his father exactly as the seal does.",
          "The imagery is worth a second look, because it is Egyptian. The winged sun disk and the ankh — the sign of life — are borrowed motifs, and they sit on the personal seal of a king whose court was being lectured by an Assyrian officer for leaning on Egypt as on \"the staff of this bruised reed\" (2 Kings 18:21). The excavators suggested the winged sun replaced an earlier winged-scarab device later in the reign; that is a reading of the iconography rather than a dated fact, and it is offered here as theirs. What is not in doubt is that a Judean king's own chancery used symbols the wider Near East would have recognised at a glance.",
        ],
      },
      {
        heading: "What It Anchors, and Where It Stops",
        paragraphs: [
          "This one is worth stating at full strength, because most of the articles in this section have to spend their third paragraph pulling a claim back. The Hezekiah bulla puts a specific king of Judah, named with his father and his title, in his own capital, in the right century, in the debris of a royal building — and it does so from a controlled excavation with a recorded findspot. As anchors for a biblical person go, this is about as good as the material record gets outside the great royal inscriptions.",
          "The reason it matters that it was dug rather than bought is not squeamishness. Seal impressions carrying Hezekiah's name had been circulating on the antiquities market since the middle of the 1990s, some with a winged scarab and some with a winged sun. Those objects could not settle anything, because an unprovenanced bulla has no findspot, no stratum and no chain of custody, and the market has a long record of supplying exactly what buyers of biblical antiquities want to find. E. Mazar's own framing of the 2015 announcement was precise on this point: seal impressions bearing the name were already known, and this was the first to come to light in a scientific archaeological excavation.",
          "And here is the limit. The bulla establishes the man and his office. It corroborates no event narrated about him — not the tunnel of 2 Kings 20:20, not the wall of 2 Chronicles 32:5, not the reform, not the siege of 701 BC, not a word of what he prayed. Those stand or fall on other evidence and on other grounds. A find that fixes a person is not a find that confirms a story about that person, and collapsing the two is the most common error in popular writing about biblical archaeology. What this clay says is that Hezekiah of Judah sealed documents in Jerusalem. It says it with unusual clarity, and it says nothing else.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 16:20", note: "Ahaz dies and Hezekiah his son reigns — the father named on the seal" },
      { reference: "2 Kings 18:5", note: "The estimate of Hezekiah the biblical writers give" },
      { reference: "2 Kings 18:13", note: "Sennacherib takes the fortified cities of Judah in Hezekiah's fourteenth year" },
      { reference: "2 Kings 18:21", note: "Egypt as a bruised reed — the alliance behind the Egyptian motifs on the seal" },
      { reference: "2 Kings 20:20", note: "The pool and the conduit, one of the things this bulla does not corroborate" },
    ],
    sources: [
      { label: "Biblical Archaeology Society: the royal seal of Hezekiah comes to light", url: "https://www.biblicalarchaeology.org/daily/news/king-hezekiah-in-the-bible-royal-seal-of-hezekiah-comes-to-light/" },
    ],
    discovery: {
      objectType: "Clay bulla, c. 13 x 12 mm, carrying an oval seal impression of c. 9.7 x 8.6 mm",
      findSite: "Area A of the Ophel excavations, in a refuse dump beside a royal building south of Temple Mount, Jerusalem",
      findSiteId: "jerusalem",
      findSiteKind: "location",
      foundYear: "2009; identified 2015, announced December 2015",
      foundBy: "Excavated by the Ophel expedition under E. Mazar. Recovered from wet-sifted earth at Emek Tzurim by Efrat Greenwald, and first identified as Hezekiah's by Reut Ben-Aryeh",
      objectDate: "The reign of Hezekiah, conventionally c. 715-686 BC; regnal dates for Judah vary between reconstructions",
      objectDateCertainty: "traditional",
      currentLocation: "Ophel excavation material, Israel Antiquities Authority; published in the Ophel final reports",
    },
    citations: [
      {
        tier: "institution",
        label: "E. Mazar (ed.), The Ophel Excavations to the South of the Temple Mount 2009-2013: Final Reports Volume I",
        credit: "Eilat Mazar and the Ophel expedition, Hebrew University of Jerusalem — the excavating body's own report",
        detail: "Jerusalem, 2015. The volume with which the bulla was announced. Print only",
        supports: "The findspot, the reading and the excavation context",
      },
      {
        tier: "reference",
        label: "Hebrew University press release: first seal impression of an Israelite or Judean king exposed in situ in a scientific excavation",
        url: "https://phys.org/news/2015-12-israelite-judean-king-exposed-situ.html",
        credit: "Hebrew University of Jerusalem",
        detail: "December 2015",
        supports: "Efrat Greenwald's recovery of the bulla in the sifting, Reut Ben-Aryeh's identification, the measurements and the iconography",
      },
      {
        tier: "reference",
        label: "\"King Hezekiah in the Bible: Royal Seal of Hezekiah Comes to Light\"",
        url: "https://www.biblicalarchaeology.org/daily/news/king-hezekiah-in-the-bible-royal-seal-of-hezekiah-comes-to-light/",
        credit: "Biblical Archaeology Society",
        supports: "The find, the reading, and the unprovenanced Hezekiah bullae known from the market since the 1990s",
      },
      {
        tier: "encyclopedic",
        label: "King Hezekiah bulla",
        url: "https://en.wikipedia.org/wiki/King_Hezekiah_bulla",
        credit: "Wikipedia",
        supports: "General orientation and the transliteration of the inscription",
      },
    ],
    reflectionPrompt:
      "This scrap of clay was thrown out with the kitchen rubbish and found in a sieve two and a half thousand years later. What have you treated as disposable that God has not?",
  },
  {
    id: "isaiah-bulla",
    name: "Isaiah Bulla",
    alternateNames: ["Yesha'yahu Bulla"],
    category: "discovery",
    role: "A Damaged Eighth-Century Seal Impression, and What It Does Not Quite Say",
    summary:
      "An Ophel bulla reading \"belonging to Yesha'yahu\" and then three letters, nby. Add one more letter and it would read \"prophet\" — but that letter is not there, and whether it ever was is the whole argument.",
    sections: [
      {
        heading: "Ten Feet from a King",
        paragraphs: [
          "The bulla was excavated in 2009 by E. Mazar's Ophel expedition, from Iron Age material the excavators describe as undisturbed, outside the south-eastern wall of a structure they call the royal bakery, at the foot of the southern wall of Temple Mount. Like the Hezekiah bulla it was not spotted in the trench; it came out of wet-sifted earth. And it was found roughly three metres from where the Hezekiah bulla had come out of the same operation — close enough that the two objects plausibly belonged to the same administrative rubbish.",
          "Nine years passed before it was published. The editio princeps was an article by E. Mazar, released online on 21 February 2018 and printed in a special double issue of Biblical Archaeology Review (March/April-May/June 2018) at pages 65-73; its title asked whether the bulla carried the prophet's signature, with a question mark. The press coverage the following morning was, with few exceptions, considerably more confident than the article it was reporting.",
        ],
      },
      {
        heading: "What Is Legible, and What Is Restored",
        paragraphs: [
          "The bulla has three registers and the top of it is broken away. The first register preserves no letters at all, only part of an image, which Mazar identifies as a grazing doe — a motif of blessing on seals of this period, and a sign that the owner was somebody of standing. The second register reads L-yšʿyh[w] — \"belonging to Yeshaʿyahu,\" the Hebrew name rendered in English as Isaiah, with the final letter of the divine element restored. The third register preserves three letters and no more: nun, bet, yod. That is nby.",
          "In Hebrew the word for prophet is nbʾ — nun, bet, aleph. Restore an aleph at the end of nby and you have a spelling of \"prophet.\" Restore nothing, and you have a three-letter sequence that could be a personal name, a place of origin, or something else again. The left edge of the bulla is damaged exactly there. And reading \"prophet\" needs two things to be true at once, not one: that the yod is an internal vowel letter, which is rare this early, and that there was room after it for a fourth letter at all. That is why this is an argument and not a reading. E. Mazar's own words in the announcement were careful: \"Because the bulla has been slightly damaged at end of the word nvy, it is not known if it originally ended with the Hebrew letter aleph,\" and she allowed that without it the word could simply be the name Navi. What she did claim without hedging is the first name: \"The name of Isaiah, however, is clear.\"",
          "So the honest statement of what is on this object is short. A man whose name was Yeshaʿyahu sealed something in Jerusalem in the late eighth or early seventh century BC, and after his name stood a word beginning nby. Everything past that sentence is reconstruction, and reconstruction is not evidence.",
        ],
      },
      {
        heading: "Why This App Does Not Call It Isaiah's Seal",
        paragraphs: [
          "The most sustained objection came from C. Rollston of George Washington University, who published it within a day of the announcement and expanded it twice that week. His case has four legs. First, the name: the Hebrew root behind \"Isaiah\" produced names for something like twenty different people in the Bible alone, so a great many men in eighth- and seventh-century Judah were called Yeshaʿyahu or something built on the same root. Second, the missing letter: without an aleph, \"prophet\" cannot be confirmed, and Rollston does not accept the argument that the letter was simply not written. Third, the article: in the overwhelming majority of biblical occurrences the word \"prophet\" is definite — \"the prophet\" — and there is no definite article here. Mazar's drawing proposed restoring one at the end of the previous line; Rollston finds no room for it, and the epigrapher Anat Mendel-Geberovich told him she agrees there is not.",
          "Fourth, and most awkwardly, the yod. If nby is \"prophet,\" the yod is an internal vowel letter, and those are rare in Old Hebrew of this period. The only fully preserved occurrence of the word \"prophet\" in the Hebrew epigraphic record is Lachish Letter 3, line 20 — and there it is written without the yod and with the definite article, in a letter a century later than this bulla, by which time internal vowel letters were commoner rather than rarer. The single closest comparison we have is spelled the other way, and it is spelled that way at a date when the bulla's spelling should have been easier, not harder. Rollston also lays out several ordinary readings that fit nby perfectly well, in which case the owner would not be a prophet at all.",
          "And the objection is not one man's. Within days, N. Na'aman, P. K. McCarter, K. L. Younger and N. Greene had each independently told Rollston they favoured reading nby as a name or a gentilic — \"Nobay,\" or \"the Nobite,\" from the town of Nob. McCarter's own preference is to take it as a gentilic that had hardened into a personal name, giving the ordinary shape \"Isaiah (son of) Nobay\" — and since the prophet's father was Amoz, that reading rules him out. The decisive detail is that this reading is not a guess: it is attested on a seal from an excavation at Lachish, catalogued as number 530 in the standard corpus of West Semitic stamp seals, which Rollston singles out as the one parallel that can carry weight because it was dug rather than bought. L. Mykytiuk, separately, is not convinced there is room for a fourth letter after the yod at all. So what faces Mazar's reading is not a single sceptic but a convergence, and it has an excavated object behind it.",
          "Mazar's case for the restoration was not merely hopeful, and this app has an obligation to say what it was. She published the bulla with an interpretive drawing prepared with Reut Livyatan Ben-Arieh, reconstructing the object from its surviving border and proposing that the definite article stood at the end of the register above. She argued from the image: a grazing doe is a blessing motif and marks a seal of consequence. And she argued from context — the bulla lay about three metres from the seal impression of Hezekiah, and Scripture places a prophet named Isaiah at that king's side through the crisis of 701 BC. One further point genuinely helps her, and Rollston himself flags it: there is no bn, \"son of,\" before nby. The word after a name on a seal is normally a patronymic, a gentilic or a title, and the missing bn is what makes a title readable at all. His answer is that bn is sometimes left out before patronymics in the epigraphic record.",
          "Two things should be said in fairness on the other side. The first is that Mazar did not overclaim. Rollston went out of his way to applaud her for it — the operative word in her article, as he put it, is \"may\" — and her caution is on the record in her own quoted words. The dispute is not about her honesty; it is about whether a restoration can carry a sentence, and it cannot. The second is that nobody disputes that the object is genuine and ancient. It was excavated. The argument here is about reading, not authenticity, and those are different problems with different consequences.",
          "Where this app stands: this is a real eighth- or seventh-century bulla belonging to a man named Yeshaʿyahu, found metres from the seal impression of Hezekiah, in a period when Scripture places a prophet named Isaiah in that king's court. That is a genuinely interesting coincidence and it is worth telling a reader about. It is not proof, it is not a signature, and it is not \"Isaiah's seal.\" A believer's confidence that Isaiah lived and served in Hezekiah's Jerusalem rests on Scripture, not on three surviving letters and a fourth that may never have existed — and pretending otherwise would put the reader's trust on a foundation that a single sentence from an epigrapher can knock over.",
        ],
      },
    ],
    verses: [
      { reference: "Isaiah 1:1", note: "Isaiah son of Amoz, in the days of Uzziah, Jotham, Ahaz and Hezekiah — note the patronymic the bulla does not have" },
      { reference: "Isaiah 37:2", note: "Hezekiah sends to Isaiah the prophet, the son of Amoz — the phrase with its definite article" },
      { reference: "2 Kings 19:2", note: "The same embassy in Kings, placing prophet and king together in Jerusalem" },
      { reference: "2 Kings 20:1", note: "Isaiah in the palace during Hezekiah's illness" },
    ],
    sources: [
      { label: "Rollston Epigraphy: \"The Putative Bulla of Isaiah the Prophet: Not so Fast\"", url: "http://www.rollstonepigraphy.com/?p=796" },
      { label: "Biblical Archaeology Society: Isaiah's signature uncovered in Jerusalem", url: "https://www.biblicalarchaeology.org/daily/news/prophet-isaiah-signature-jerusalem/" },
    ],
    discovery: {
      objectType: "Clay bulla in three registers, the upper part broken away; oval seal impression c. 13 mm across",
      findSite: "Iron Age material outside the south-eastern wall of the royal bakery, Ophel excavations, Jerusalem",
      findSiteId: "jerusalem",
      findSiteKind: "location",
      foundYear: "2009; published February 2018",
      foundBy: "Excavated by the Ophel expedition under E. Mazar and recovered from wet-sifted earth; no individual finder is recorded in the publication",
      objectDate: "Late eighth or early seventh century BC on the script; C. Rollston states the palaeography cannot be narrowed further than that",
      objectDateCertainty: "disputed",
      currentLocation: "Ophel excavation material. Present custody is not stated in the publication and could not be confirmed",
    },
    citations: [
      {
        tier: "institution",
        label: "E. Mazar, \"Is This the Prophet Isaiah's Signature?\"",
        credit: "Eilat Mazar, Hebrew University of Jerusalem — the editio princeps",
        detail: "Biblical Archaeology Review, special double issue March/April-May/June 2018, pages 65-73, notes page 92. Published online 21 February 2018. Behind the BAS Library paywall, so no link is given",
        paywalled: true,
        supports: "The reading, the find context and Mazar's own statement of the uncertainty",
      },
      {
        tier: "scholarly",
        label: "C. Rollston, \"The Putative Bulla of Isaiah the Prophet: Not so Fast\"",
        url: "http://www.rollstonepigraphy.com/?p=796",
        credit: "Christopher Rollston, George Washington University",
        detail: "Rollston Epigraphy, 22 February 2018. Served over plain http",
        supports: "The four epigraphic objections: the commonness of the name, the missing aleph, the absent article and the anomalous yod",
      },
      {
        tier: "scholarly",
        label: "C. Rollston, \"The 'Isaiah Bulla' and the Putative Connection with Biblical Isaiah: 3.0\"",
        url: "http://www.rollstonepigraphy.com/?p=833",
        credit: "Christopher Rollston, George Washington University",
        detail: "Rollston Epigraphy, 26 February 2018 — the fullest version, and the basis of a subsequent print article",
        supports: "The palaeographic date, Anat Mendel-Geberovich on the space for the article, and the alternative readings of nby",
      },
      {
        tier: "reference",
        label: "\"An Unprecedented Find: Prophet Isaiah's Seal Mark Possibly Discovered in Jerusalem\"",
        url: "https://www.biblicalarchaeology.org/press-release/an-unprecedented-find-prophet-isaiahs-seal-mark-possibly-discovered-in-jerusalem/",
        credit: "Biblical Archaeology Society",
        supports: "Mazar's quoted caution about the missing aleph and the possibility of the name Navi",
      },
      {
        tier: "encyclopedic",
        label: "Isaiah bulla",
        url: "https://en.wikipedia.org/wiki/Isaiah_bulla",
        credit: "Wikipedia",
        supports: "General orientation and the summary of the objections",
      },
    ],
    reflectionPrompt:
      "One missing letter is the difference between a curiosity and a headline. Where have you wanted a piece of evidence to say more than it actually says?",
  },
  {
    id: "baruch-bullae",
    name: "Baruch Bullae",
    alternateNames: ["Berekhyahu Bullae", "Bullae of Berekhyahu son of Neriyahu"],
    category: "discovery",
    role: "Two Unprovenanced Seal Impressions, and a Lesson in Why Provenance Matters",
    summary:
      "Two clay bullae reading \"belonging to Berekhyahu son of Neriyahu the scribe\" — the most-quoted archaeological witness to a named figure of Jeremiah's story, bought on the antiquities market, and judged modern by the laboratory study that examined them — a verdict three other scholars have published a rebuttal against.",
    sections: [
      {
        heading: "A Hoard Nobody Excavated",
        paragraphs: [
          "In October 1975 four inscribed Hebrew bullae appeared in the shop of an antiquities dealer in East Jerusalem. They were bought by a collector, who took them to N. Avigad of the Hebrew University, then the leading Israeli authority on ancient seals. Over the following years more collectors arrived at Avigad's door with more bullae, bought from dealers in Jerusalem, in Bethlehem and in the village of Beit Sahour, and it became clear that they all came from a single hoard — pieces from different lots physically joined. The hoard eventually numbered more than 250 bullae. One collector, Yoav Sasson, ended up with nearly 200; another, Reuben Hecht, acquired 49 and gave them to the Israel Museum.",
          "One of them read, in three lines of Old Hebrew, lbrkyhw / bn nryhw / hspr — \"belonging to Berekhyahu, son of Neriyahu, the scribe.\" Avigad published it in 1978, and the identification proposed itself immediately: Baruch son of Neriah is Jeremiah's secretary, the man who wrote the prophet's scroll at his dictation in Jeremiah 36:4, and Berekhyahu is simply the fuller Yahwistic form of the name Baruch. A second bulla stamped from the same seal had surfaced in Jerusalem in the same decade, by a different route. It was bought by Rafi Brown, a former collector, dealer and restorer at the Israel Museum, sold on to the collector Shlomo Moussaieff in 1991, and published by R. Deutsch and M. Heltzer in 1994; Avigad never knew it existed. It carries a fingerprint, and in 1996 the suggestion was floated in print that the fingerprint might be Baruch's own.",
          "Notice what is missing from all of that. No excavation. No findspot. No stratum. No layer of destruction debris around it, no pottery beside it, no record of who dug it or where. The corpus was found by villagers — accidentally or by illicit digging, and nobody knows which — then divided up and sold. There was one lead and it went nowhere. The dealers said the hoard had come from about forty-four miles south-east of Jerusalem, near Tell Beit Mirsim; several archaeologists including Avigad went and looked, found traces of recent illegal digging on a hill there but nothing deep enough to be the findspot, and Avigad himself admitted the search was brief and not very thorough. He thought the corpus looked like a royal archive from Jerusalem, but he rejected the City of David as its source, on the grounds that diggers there would have been noticed. Nothing was ever confirmed, and nothing can be now.",
        ],
      },
      {
        heading: "Why the Identification Was So Attractive",
        paragraphs: [
          "It is worth being clear about why this object became one of the most cited bullae in popular Christian writing, because the reasoning was not stupid. The match looks unusually tight on paper. The patronymic is exact: nryhw is Neriyahu, the full form of Neriah, the father named in Jeremiah 36:4. The title is exact: hspr, \"the scribe,\" is what Scripture says Baruch did for a living. Name, father's name and occupation, all three. Set against the seals in this section that carry a bare personal name and nothing else, that looks decisive.",
          "The given name needs one qualification, because it is where the argument actually sits. The bulla does not say Baruch. It says Berekhyahu, \"Yahweh has blessed\" — and Berekhyahu is the name the English Bible renders Berechiah, borne by several other men in Scripture. The identification depends on the standard philological view that Baruch is the shortened form of Berekhyahu, the divine element dropped, the way many Judahite names appear in both a long and a short version. That view is mainstream and it is probably right. It is also worth noticing what it means: before this bulla surfaced, nobody knew that Baruch's full name was Berekhyahu. An unexcavated object that supplies a previously unknown and biblically satisfying fact is exactly the kind of object that has to be checked hardest, whichever way the check comes out.",
          "And the underlying picture is real enough. Judah at the end of the seventh century was a state that ran on sealed documents, and Jeremiah 32 describes the practice in unusual detail: a deed of purchase in two copies, one sealed and one open, witnessed, and handed to Baruch for safekeeping in an earthenware jar. Bullae are the physical residue of exactly that world. Whatever is true of these two pieces of clay, scribes like Baruch existed, sealed things, and left bullae behind.",
        ],
      },
      {
        heading: "What the Laboratory Found, and What an Unprovenanced Object Can Carry",
        paragraphs: [
          "In 2014 Y. Goren and E. Arie published a materials study of both bullae in the Bulletin of the American Schools of Oriental Research. Their conclusion was blunt: the two bullae are modern creations, exhibiting a series of technological misconceptions, anachronisms and outright technological errors — that is, the clay and the manufacture do not behave the way genuine Iron Age bullae behave. C. Rollston, who had argued on epigraphic grounds since the early 2000s that a group of celebrated unprovenanced Northwest Semitic pieces were twentieth-century forgeries, treats the Baruch bullae in that company alongside the Ma'adanah seal.",
          "The question is not closed by acclamation, and the case on the other side deserves to be stated rather than merely mentioned. In 2016 P. van der Veen, R. Deutsch and G. Barkay published a long rejoinder in the journal Antiguo Oriente. Their central argument is about the backs of the bullae. Re-examining Bulla 1 in particular, they conclude that the reverses were not impressed on papyrus at all but on wooden objects, plausibly on wooden writing boards — a use whose significance, they point out, has only become widely understood since 1992, long after the bullae surfaced. A forger working in the 1970s, on that reasoning, would have had no motive to fake a feature nobody had yet learned to look for. On the clay they are more cautious than their opponents: chemical analysis, they say, can establish which geological formation a clay came from, and cannot by itself prove or disprove authenticity either way. And they are careful about what their own case does. In their own words it does not prove the bullae authentic; what it claims is that the last word has not been spoken.",
          "Both sides of this have history, and a reader weighing it should have both halves. Y. Goren gave expert evidence about Bulla 2 during the Israeli antiquities forgery trial. R. Deutsch, one of the rejoinder's three authors, is an antiquities dealer who published Bulla 2 himself and was a defendant in that same trial, of which he was acquitted. Neither fact settles anything about the clay. Both are the kind of thing an article about why provenance matters has no business leaving out.",
          "So the accurate statement is that the authenticity of these two bullae is contested, with a published laboratory study against them and a published rebuttal in their defence, and that this app has found no survey establishing where the field as a whole has landed and does not claim one. What nobody can do is settle it by examining the findspot, because there is no findspot.",
          "That is the point of this article, and it is the reason it is here rather than quietly dropped. An unprovenanced object cannot bear the weight that popular treatments put on the Baruch bullae. Even in the best case — even if a future study vindicates them completely — an object with no excavation context has to earn on its own everything a findspot would have given it for nothing. Unprovenanced objects can still matter enormously; the Amarna Letters and the first Dead Sea Scrolls reached scholarship the same way. But in a contested case like this one the findspot is precisely what would have settled the argument, and it was destroyed the day the hoard was dug up and divided. The antiquities market does not merely risk supplying fakes. It systematically destroys the information that would let anyone tell. A reader who has been told that archaeology has produced Baruch's own signature deserves three facts rather than one: that the object was bought in a shop, that the laboratory which examined it concluded it was made in the twentieth century, and that three epigraphers have published a detailed rebuttal arguing that conclusion is not established. All three, or none of them.",
          "None of that touches Baruch himself. Jeremiah 36, 43 and 45 describe a man who wrote the prophet's words, read them in the temple court, was hunted for it, and was told plainly by God that he would not get the great things he was seeking. That account stands on the text of Jeremiah. It never stood on two lumps of clay from a dealer's shop, and it does not fall with them.",
        ],
      },
    ],
    verses: [
      { reference: "Jeremiah 36:4", note: "Jeremiah calls Baruch son of Neriah, who writes the scroll at his dictation" },
      { reference: "Jeremiah 36:10", note: "Baruch reads the scroll in the temple, in Gemariah's room" },
      { reference: "Jeremiah 32:12", note: "The sealed and open deeds handed to Baruch — sealing practice described from the inside" },
      { reference: "Jeremiah 45:5", note: "God's word to Baruch: do not seek great things for yourself" },
    ],
    sources: [
      { label: "Center for Online Judaic Studies: Jeremiah's scribe and the hoard of clay bullae", url: "https://cojs.org/jeremiahs-scribe-and-confidant-speaks-from-a-hoard-of-clay-bullae/" },
    ],
    discovery: {
      objectType: "Two clay bullae stamped from the same seal, each roughly the size of a thumbnail",
      findSite: "None recorded. The hoard surfaced through antiquities dealers in East Jerusalem, Bethlehem and Beit Sahour",
      foundYear: "Both surfaced in Jerusalem in the 1970s. Bulla 1 came to light in October 1975 and was published in 1978; Bulla 2 was published in 1994",
      foundBy: "Unknown. Found by villagers, accidentally or by illicit digging, and sold through dealers; Bulla 1 was first published by N. Avigad in 1978",
      objectDate: "Claimed late seventh to early sixth century BC by N. Avigad; a 2014 laboratory study concluded both are modern",
      objectDateCertainty: "disputed",
      currentLocation: "Bulla 1: Israel Museum, Jerusalem (Hecht collection), with a replica in the Hecht Museum. Bulla 2: the private S. Moussaieff collection",
      authenticityDisputed: true,
      unprovenanced: true,
    },
    citations: [
      {
        tier: "scholarly",
        label: "Y. Goren and E. Arie, \"The Authenticity of the Bullae of Berekhyahu Son of Neriyahu the Scribe\"",
        credit: "Yuval Goren and Eran Arie, Tel Aviv University and the Israel Museum",
        detail: "Bulletin of the American Schools of Oriental Research 372 (2014), 147-158. Hosted only on repositories that refuse automated requests, so no link is given",
        supports: "The conclusion that both bullae are modern creations showing technological anachronisms",
      },
      {
        tier: "scholarly",
        label: "P. van der Veen, R. Deutsch and G. Barkay, \"Reconsidering the Authenticity of the Berekhyahu Bullae: A Rejoinder\"",
        credit: "Pieter van der Veen, Robert Deutsch and Gabriel Barkay",
        url: "https://repositorio.uca.edu.ar/bitstream/123456789/7509/4/authenticity-berekhyahu-bullae.pdf",
        detail: "Antiguo Oriente 14 (2016), 99-136. Open access through the Universidad Catolica Argentina repository",
        supports: "The argument from the imprints on the reverses, the caution about what clay analysis can show, the history of Bulla 2, and the authors' own statement that their case does not prove the bullae authentic",
      },
      {
        tier: "scholarly",
        label: "C. Rollston, \"The Forger Among Us: The Museum of the Bible Dead Sea Scrolls and the Recent History of Epigraphic Forgeries\"",
        url: "http://www.rollstonepigraphy.com/?p=884",
        credit: "Christopher Rollston, George Washington University",
        detail: "Rollston Epigraphy, 15 March 2020. Served over plain http. Note that this post names the Baruch bullae in a list rather than arguing the case; the argument itself is the Eretz-Israel paper below",
        supports: "The placing of the Baruch bullae in a wider list of twentieth-century Northwest Semitic market forgeries",
      },
      {
        tier: "institution",
        label: "The Israel Museum, Jerusalem, and the S. Moussaieff collection",
        credit: "The Israel Museum, Jerusalem (Bulla 1, Hecht collection); S. Moussaieff (Bulla 2, privately held)",
        detail: "No object page is cited because there is none to cite: the Israel Museum's collection site returns a bot-challenge page rather than a record to any automated request, and a private collection publishes nothing at all. The custody itself is documented in the 2016 rejoinder's figure credits. That an article about provenance cannot produce an institutional object record is part of the article's own point",
        supports: "Where each of the two bullae is held",
      },
      {
        tier: "scholarly",
        label: "C. Rollston, \"The Bullae of Baruch Ben Neriah the Scribe and the Seal of Ma'adanah Daughter of the King: Epigraphic Forgeries of the 20th Century\"",
        credit: "Christopher Rollston, George Washington University",
        detail: "Eretz-Israel 32 (the Joseph Naveh volume), pages 79*-90*. The paper the blog post above points to. Hosted only on repositories that refuse automated requests, so no link is given",
        supports: "The epigraphic case that the Baruch bullae and the Ma'adanah seal are twentieth-century forgeries",
      },
      {
        tier: "reference",
        label: "H. Shanks, \"Jeremiah's Scribe and Confidant Speaks from a Hoard of Clay Bullae\"",
        url: "https://cojs.org/jeremiahs-scribe-and-confidant-speaks-from-a-hoard-of-clay-bullae/",
        credit: "Hershel Shanks, Biblical Archaeology Review 13:05 (September/October 1987), reproduced by the Center for Online Judaic Studies",
        detail: "The contemporary account of how the hoard surfaced: October 1975, an East Jerusalem dealer, more than 250 bullae divided among collectors",
        supports: "The market history, the collectors, the Tell Beit Mirsim claim and the failed search for a findspot, and Avigad's rejection of the City of David",
      },
      {
        tier: "scholarly",
        label: "N. Avigad, \"Baruch the Scribe and Jerahmeel the King's Son\"",
        credit: "Nahman Avigad, Hebrew University of Jerusalem — the first publication",
        detail: "Israel Exploration Journal 28 (1978), 52-56; restated in The Biblical Archaeologist 42/2 (1979), 114-118. Print only",
        supports: "The reading of the inscription and the original identification with Jeremiah's scribe",
      },
    ],
    reflectionPrompt:
      "Baruch was told not to seek great things for himself, and the object that made him famous may be a fake. What would be left of your faith if the evidence you lean on hardest turned out to be worth less than you thought?",
  },
  {
    id: "nathan-melech-bulla",
    name: "Nathan-Melech Bulla",
    // "Nathan-Melech" is registered as a matchName so the linker resolves the whole hyphenated
    // name here rather than matching bare "Nathan" inside it and sending the reader to Nathan the
    // prophet — which is what it does without this entry. The SPACED form "Nathan Melech", which is
    // how the WEB renders 2 Kings 23:11, is deliberately NOT registered: that verse currently
    // mislinks to the prophet, the fault predates this batch, and fixing it here would move the
    // Bible snapshot on a commit that has no business touching it.
    matchNames: ["Nathan-Melech"],
    alternateNames: ["Eved Hamelech Bulla"],
    category: "discovery",
    role: "A Seventh-Century Bulla Naming an Official of Josiah's Court",
    summary:
      "A clay seal impression from the City of David reading \"belonging to Nathan-Melech, servant of the king\" — a rare name, the right century, and a royal title, held together without a patronymic on either side.",
    sections: [
      {
        heading: "An Administrative Building, and a Careful Announcement",
        paragraphs: [
          "The bulla was found in October 2018 in the Givati Parking Lot excavation in the City of David, a dig run jointly by Tel Aviv University and the Israel Antiquities Authority under Yuval Gadot and Yiftah Shalev. Its context is a large public building of the First Temple period, built of finely cut ashlar with a polished plaster floor, and buried under stone debris, burnt beams and charred pottery from the Babylonian destruction of 586 BC. Press coverage of two long-serving team members, Sveta Pnik and Ayyala Rodan, credits them with the find of the bulla and of a companion agate seal, though the accounts differ on which of them found which. The epigrapher who read and published it is Anat Mendel-Geberovich.",
          "The reading is not in dispute, which in this section is worth saying out loud. Two registers, every letter clear: lntnmlk, \"belonging to Nathan-Melech,\" and ʿbd hmlk, \"servant of the king.\" There is no imagery — an aniconic seal, the normal Judahite style after the eighth century. C. Rollston, who dates the script to roughly 675-625 BC on the shapes of the nun, lamed and kaf, went out of his way to praise the excavators and the epigrapher for the sobriety of their public statements, calling it a model for the field.",
        ],
      },
      {
        heading: "Servant of the King",
        paragraphs: [
          "The title is the interesting half. ʿbd hmlk does not mean \"slave of the king\" in this usage; it is the designation of a senior royal official, and it is well attested. A seal from Tomb 19 at Tell en-Nasbeh reads \"belonging to Yaʾazanyahu, servant of the king.\" Lachish Ostracon 3 refers to a Tobiyahu, servant of the king. The Megiddo seal in this section names Shema as servant of Jeroboam, using the same formula with the king's own name in place of the title. So the bulla is not a private signet; it is the working seal of a man near the top of Judah's administration, found in the building where such men worked.",
          "The name itself is the rarest thing about it. Nathan-Melech means \"the King has given,\" with \"King\" functioning as a way of referring to God, exactly as other Judahite names of the same shape use El or the divine name instead. In the whole Hebrew Bible it belongs to exactly one person: the official at whose chamber Josiah found the horses that the kings of Judah had dedicated to the sun, in 2 Kings 23:11. That is a single attestation, in the reign of a king whose dates sit squarely inside the palaeographic range of the script.",
        ],
      },
      {
        heading: "How Much Weight the Match Will Take",
        paragraphs: [
          "Four things converge here and it is worth naming them separately, because the strength of the case is exactly the sum of them and no more. The name is rare rather than common. The date of the script matches the reign of Josiah. The archaeological context is a royal administrative building in Jerusalem. And both the biblical figure and the seal's owner carry a royal title. Rollston's own assessment is that this makes it probable, indeed most likely, that they are the same man — and that is the assessment this app follows.",
          "But the identification is not certain, and Rollston says why in the same breath. Neither the Bible nor the bulla supplies a patronymic, which is the ordinary way an ancient identification is nailed down. And the two titles are not actually the same word: 2 Kings 23:11 calls the biblical Nathan-Melech a saris — a royal attendant, or possibly a eunuch — while the bulla says servant of the king. It is entirely reasonable that one man held or rose to both, and equally possible that the seal belonged to a son or grandson of the same name, since Judahite families reused names across generations. Certitude, as Rollston puts it, remains just beyond reach.",
          "The people who found it said the same thing in their own words at the time. Mendel-Geberovich's published statement was that it is not possible to determine with complete certainty that the Nathan-Melech of the Bible owned the seal, and that it is equally impossible to ignore the details linking them. She also made an argument in the object's favour that is easy to miss: the man is named without any lineage at all, which suggests he was well enough known that nobody needed it.",
          "The honest form of the claim, then, is this: a high official of Josiah's Jerusalem, bearing a name attested only once in Scripture, sealed documents in a building that burned when the city fell — and he is very probably the man of 2 Kings 23:11. Not certainly. Very probably. That distinction is not pedantry; it is the difference between a claim that survives contact with an epigrapher and one that does not.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 23:11", note: "Josiah removes the horses of the sun by the room of Nathan Melech the officer" },
      { reference: "2 Kings 22:12", note: "Another royal servant of the same court, in the same reform narrative" },
      { reference: "2 Kings 23:4", note: "The scope of Josiah's purge of the temple" },
      { reference: "2 Kings 25:9", note: "The burning of Jerusalem in 586 BC — the destruction layer this bulla was found in" },
    ],
    sources: [
      { label: "Rollston Epigraphy: the Bible, a new Hebrew inscription from Jerusalem, and a high official of Judah", url: "http://www.rollstonepigraphy.com/?p=870" },
    ],
    discovery: {
      objectType: "Aniconic clay bulla in two registers",
      findSite: "A First Temple period administrative building in the Givati Parking Lot excavation, City of David, Jerusalem",
      findSiteId: "city-of-david",
      findSiteKind: "poi",
      foundYear: "October 2018; announced March 2019",
      foundBy: "The Givati Parking Lot excavation, directed by Yuval Gadot (Tel Aviv University) and Yiftah Shalev (Israel Antiquities Authority); read and published by Anat Mendel-Geberovich. No individual finder is recorded",
      objectDate: "Mid-seventh to early sixth century BC per the excavation's epigrapher; C. Rollston narrows it to c. 675-625 BC and doubts the later end. The building was destroyed in 586 BC",
      objectDateCertainty: "firm",
      currentLocation: "Israel Antiquities Authority",
    },
    citations: [
      {
        tier: "scholarly",
        label: "C. Rollston, \"The Bible, a New Hebrew Inscription from Jerusalem, and a High Official of Judah\"",
        url: "http://www.rollstonepigraphy.com/?p=870",
        credit: "Christopher Rollston, George Washington University",
        detail: "Rollston Epigraphy, 1 April 2019. Served over plain http",
        supports: "The reading, the palaeographic date, the meaning of the title, and the careful statement of how probable the identification is",
      },
      {
        tier: "institution",
        label: "\"Who Was 'Natan-Melech' the King's Servant?\"",
        url: "https://cityofdavid.org.il/en/who-was-natan-melech-the-kings-servant-eng/",
        credit: "The City of David, reporting the Israel Antiquities Authority and Tel Aviv University excavation",
        detail: "Names Yuval Gadot and Yiftah Shalev as directors and Anat Mendel-Geberovich as the epigrapher, describes the building and its destruction debris, and carries her statement of the uncertainty in full",
        supports: "The excavation, the building, the reading, and the excavators' own hedge about the identification",
      },
      {
        tier: "scholarly",
        label: "A. Mendel-Geberovich, Y. Shalev, E. Bocher, N. Shalom and Y. Gadot, \"A Newly Discovered Personal Seal and Bulla from the Excavations of the Giv'ati Parking Lot, Jerusalem\"",
        credit: "Anat Mendel-Geberovich and colleagues, Hebrew University, the Israel Antiquities Authority and Tel Aviv University",
        detail: "Israel Exploration Journal 69/2 (2019), 154-174 — the formal publication. Available only through hosts that refuse automated requests, so no link is given, and the page range is as cited in the secondary literature",
        paywalled: true,
        supports: "The formal publication of the bulla and the companion seal",
      },
      {
        tier: "reference",
        label: "\"Two tiny First Temple inscriptions vastly enlarge picture of ancient Jerusalem\"",
        url: "https://www.timesofisrael.com/two-tiny-first-temple-inscriptions-vastly-enlarge-picture-of-ancient-jerusalem/",
        credit: "The Times of Israel, March 2019",
        detail: "The only traced source naming individual team members in connection with the find",
        supports: "The names Sveta Pnik and Ayyala Rodan",
      },
    ],
    reflectionPrompt:
      "Nathan-Melech appears in one verse of the Bible, as a room next to a gate. What would it mean to be faithful in a role nobody will remember the details of?",
  },
  {
    id: "gemariah-bulla",
    name: "Gemariah Bulla",
    alternateNames: ["Bulla of Gemaryahu son of Shaphan"],
    category: "discovery",
    role: "A Named Official of Jeremiah's Jerusalem, from a Sealed Destruction Layer",
    summary:
      "One of fifty-one seal impressions found in a burnt room in the City of David, reading \"belonging to Gemaryahu son of Shaphan\" — name and father's name both matching the official in whose chamber Baruch read Jeremiah's scroll.",
    sections: [
      {
        heading: "The House of the Bullae",
        paragraphs: [
          "In the 1982 season of the City of David excavations, part of the campaign that ran from 1978 to 1985, a room in Area G produced fifty-one clay bullae under a thick layer of burning. The archive they had sealed was gone: the papyrus documents burned in the destruction of Jerusalem, and the fire that destroyed them baked the clay tags hard enough to survive. The room has been called the House of the Bullae ever since. No individual finder is recorded — the credit in the literature belongs to the excavation.",
          "This is the best-stratified object in this whole group of articles, and that matters more than any single reading on it. The bullae lay beneath the debris of the Babylonian sack of 587 or 586 BC, in the administrative quarter of the city, in the layer that event created. Nobody has to argue about where they came from or when they were sealed, because the fire dated them. The group was first published by the excavation's own director in the Israel Exploration Journal in 1986, and given its final publication by Y. Shoham in the dig's Qedem volume in 2000; both are credited in full in the sources below.",
        ],
      },
      {
        heading: "Two Names, and Both of Them Fit",
        paragraphs: [
          "The bulla reads, in two registers: lgmryhw / bn spn — \"belonging to Gemaryahu, son of Shaphan.\" There is no title. Jeremiah 36:10 places Gemariah son of Shaphan the scribe in the temple in the fifth year of Jehoiakim, with a room in the upper court, and it is from that room that Baruch reads Jeremiah's scroll aloud to all the people. Jeremiah 36:12 has him sitting with the other officials when the scroll is reported to the king, and Jeremiah 36:25 has him among the three who beg Jehoiakim not to burn it. He is one of the prophet's protectors.",
          "The shorter biblical form and the longer epigraphic form are the same name: Gemaryahu contracts to Gemariah exactly as Neriyahu contracts to Neriah. So the match here has both halves — the personal name and the patronymic — plus a findspot in the right quarter of the right city in the right decade. That is the shape of a strong ancient identification, and it is the standard against which the weaker claims in this section should be measured.",
        ],
      },
      {
        heading: "Why This One Is Allowed to Stand",
        paragraphs: [
          "This app spends a good deal of this section pulling claims back, so it is worth being clear where the pulling stops. Nobody serious disputes that this bulla is genuine, and it is regularly cited as one of the firm identifications of a biblical person in the epigraphic record. Excavated, stratified, published twice, and matching Scripture on both the name and the father's name: there is nothing here to argue about. The Center for Online Judaic Studies puts it bluntly by contrast — unlike the Baruch and Jerahmeel bullae bought from dealers, no doubt exists as to the authenticity of this one.",
          "The honest limit is a different kind. What the bulla establishes is that a man called Gemaryahu son of Shaphan sealed documents in Jerusalem shortly before the city fell. It does not corroborate the scene in Jeremiah 36 — not the reading in the upper court, not the plea to Jehoiakim, not the king cutting the scroll with a penknife and feeding it to the brazier. It puts a name from that chapter into the physical record of that city at that moment, and it leaves the narrative exactly where it was. That is genuinely something. It is also less than \"archaeology confirms Jeremiah 36,\" and the difference is worth keeping.",
          "One further caution, and it applies to every article in this section. It would be good to be able to say how common the names Gemaryahu and Shaphan were in seventh-century Judah, because the strength of any name match depends on it. No published count was traced for this pair, so this app does not assert that they were rare. What carries the identification here is the combination of two matching names with a sealed archaeological context — not a claim about frequency that nobody has checked.",
        ],
      },
    ],
    verses: [
      { reference: "Jeremiah 36:10", note: "Baruch reads the scroll in the room of Gemariah the son of Shaphan" },
      { reference: "Jeremiah 36:12", note: "Gemariah among the officials in the scribe's chamber of the king's house" },
      { reference: "Jeremiah 36:25", note: "Gemariah begs the king not to burn the scroll" },
      { reference: "2 Kings 25:9", note: "The fire that destroyed the documents and preserved their seals" },
    ],
    sources: [
      { label: "City of David: the seal impression of Gemaryahu son of Shaphan", url: "https://timeline.cityofdavid.org.il/event/the-seal-of-gemaryhau-son-of-shaphan/" },
    ],
    discovery: {
      objectType: "Clay bulla in two registers, aniconic, in Old Hebrew script",
      findSite: "The House of the Bullae, Area G, City of David, Jerusalem — beneath the destruction debris of 587/586 BC",
      findSiteId: "city-of-david",
      findSiteKind: "poi",
      foundYear: "1982",
      foundBy: "The City of David excavations directed by Y. Shiloh, 1978-1985. No individual finder is recorded",
      objectDate: "Late seventh to early sixth century BC; sealed by the Babylonian destruction of 587/586 BC",
      objectDateCertainty: "firm",
      currentLocation: "Israel Antiquities Authority. No inventory number has been traced",
    },
    citations: [
      {
        tier: "scholarly",
        label: "Y. Shiloh, \"A Group of Hebrew Bullae from the City of David\"",
        credit: "Yigal Shiloh, director of the City of David excavations",
        detail: "Israel Exploration Journal 36/1-2 (1986), 16-38. The first publication of the hoard. Print only",
        supports: "The find, the hoard of fifty-one bullae and the stratigraphy",
      },
      {
        tier: "institution",
        label: "Y. Shoham, \"Hebrew Bullae,\" in Excavations at the City of David 1978-1985 Directed by Yigal Shiloh, Final Report VI: Inscriptions",
        credit: "Yair Shoham, in the volume edited by D. T. Ariel — the excavation's own final report",
        detail: "Qedem 41, Institute of Archaeology, Hebrew University of Jerusalem, 2000, pages 29-57. Print only",
        supports: "The final publication of the bulla and its reading",
      },
      {
        tier: "institution",
        label: "\"The Seal Impression of Gemaryhau Son of Shaphan\"",
        url: "https://timeline.cityofdavid.org.il/event/the-seal-of-gemaryhau-son-of-shaphan/",
        credit: "The Megalim Institute and the City of David; photograph by Clara Amit, courtesy of the Israel Antiquities Authority",
        detail: "Confirms the 1982 season, the fifty-one bullae, and the House of the Bullae",
        supports: "The find year, the excavation and the hoard",
      },
      {
        tier: "reference",
        label: "\"Gemaryahu Son of Shaphan Bulla\"",
        url: "https://cojs.org/gemaryahu_son_of_shaphan_bulla-_586_bce/",
        credit: "Center for Online Judaic Studies, drawing on T. Schneider, \"Six Biblical Signatures,\" Biblical Archaeology Review 17/4 (1991)",
        detail: "States that, unlike the Baruch and Jerahmeel bullae, no doubt exists as to this one's authenticity, and gives the Gemaryahu/Gemariah contraction",
        supports: "The reading, the secure stratum, and the contrast with the market bullae",
      },
    ],
    reflectionPrompt:
      "Gemariah tried to stop a king from burning a prophet's words, and failed. What has God asked you to do that you may not get to see succeed?",
  },
  {
    id: "jehucal-gedaliah-bullae",
    name: "Jehucal and Gedaliah Bullae",
    alternateNames: ["Bullae of Yehuchal son of Shelemyahu and Gedalyahu son of Pashhur"],
    category: "discovery",
    role: "Two Seal Impressions Naming Two Men Who Appear in the Same Verse",
    summary:
      "Two bullae found three years and a few metres apart in the City of David, naming Jehucal son of Shelemiah and Gedaliah son of Pashhur — two of the four officials who ask King Zedekiah to have Jeremiah put to death.",
    sections: [
      {
        heading: "Two Finds, Three Years Apart",
        paragraphs: [
          "The first bulla came out of E. Mazar's City of David excavation in 2005, at the summit of the ridge, in the area of the structure she identified as a royal building. It reads \"belonging to Yehuchal son of Shelemyahu.\" The second was found in August 2008, in First Temple period strata beneath the northern tower, a few metres away from the first. It reads \"belonging to Gedalyahu son of Pashhur.\" Neither publication records an individual finder.",
          "What makes the pair unusual is not either bulla on its own but the fact that there are two of them. Mazar's own comment at the time was that finding the second was in one sense unexpected — a fragile piece of clay surviving hard excavation conditions — and in another sense entirely logical, because the two men are named side by side in Scripture as officials serving together under Zedekiah. Two names from one verse, in one administrative quarter, within a few metres of each other, is a harder coincidence to shrug off than either would be alone.",
        ],
      },
      {
        heading: "The Men Who Wanted Jeremiah Dead",
        paragraphs: [
          "Jeremiah 38:1 lists four men who heard what the prophet was telling the people: Shephatiah son of Mattan, Gedaliah son of Pashhur, Jucal son of Shelemiah, and Pashhur son of Malchijah. Two of those four are on these bullae, with their fathers' names matching. Jehucal appears again in Jeremiah 37:3, this time sent by Zedekiah to ask the prophet to pray for the city — the same man, on a different errand, before the mood turned.",
          "What they wanted is in the next verses. They tell the king that Jeremiah weakens the hands of the soldiers and of all the people, that he does not seek the welfare of the nation, and that he should be put to death. Zedekiah gives way, and Jeremiah is lowered into a cistern to sink in the mud. These are not incidental names. They belong to the men who nearly killed the prophet, and two of them sealed documents in the quarter of the city where those documents were kept.",
        ],
      },
      {
        heading: "Firm, With Two Things Worth Saying Out Loud",
        paragraphs: [
          "Each identification rests on a name plus a patronymic — the same shape as the Gemariah bulla, and a much stronger shape than a bare name. No named scholar has published an argument against either. But the language used by the people closest to the finds is careful rather than flat: Mazar called the identification very reasonable rather than certain, and L. Mykytiuk, who maintains the standard list of biblical figures identified in inscriptions, was initially cautious about these two and moved to affirming them later. An identification that a specialist had to be talked into is worth more than one nobody examined, and the sequence is worth reporting rather than smoothing over.",
          "The second thing is a distinction that popular coverage routinely loses. There is a genuine, sharp and continuing scholarly argument about E. Mazar's excavations at the summit of the City of David — specifically about whether the Large Stone Structure is what she called it, and about how the whole area is dated. Israel Finkelstein and others have contested it in print for years. That argument is about a building, not about these two lumps of clay, and importing it into an article about the bullae would misrepresent both. The bullae come from First Temple period strata in a destroyed city, and their late-seventh or early-sixth-century date is not what anyone is fighting about.",
          "The limit is the familiar one. Two officials named in Jeremiah's prison narrative left their seals in the city that narrative describes. The bullae do not corroborate the conversation with Zedekiah, the accusation, the cistern, or the Ethiopian who pulled Jeremiah out of it. They put the men in the room. The story is still the text's to tell.",
        ],
      },
    ],
    verses: [
      { reference: "Jeremiah 38:1", note: "Gedaliah the son of Pashhur and Jucal the son of Shelemiah, named in one verse" },
      { reference: "Jeremiah 37:3", note: "Jehucal the son of Shelemiah sent by Zedekiah to ask Jeremiah to pray" },
      { reference: "Jeremiah 38:4", note: "The officials tell the king that Jeremiah weakens the hands of the men of war" },
      { reference: "Jeremiah 38:6", note: "Jeremiah lowered into the cistern to sink in the mire" },
    ],
    sources: [
      { label: "Biblical Archaeology Society: Jeremiah, prophet of the Bible, brought back to life", url: "https://www.biblicalarchaeology.org/daily/biblical-artifacts/artifacts-and-the-bible/jeremiah-prophet-of-the-bible-brought-back-to-life/" },
    ],
    discovery: {
      objectType: "Two clay bullae in Old Hebrew script, each about a centimetre across",
      findSite: "The summit of the City of David, Jerusalem — the second beneath the northern tower, a few metres from the first",
      findSiteId: "city-of-david",
      findSiteKind: "poi",
      foundYear: "2005 (Jehucal) and August 2008 (Gedaliah)",
      foundBy: "The City of David excavations directed by E. Mazar. No individual finder is recorded for either bulla",
      objectDate: "Late seventh to early sixth century BC — the reign of Zedekiah, c. 597-586 BC",
      objectDateCertainty: "traditional",
      currentLocation: "Israel Antiquities Authority. No inventory number has been traced for either bulla",
    },
    citations: [
      {
        tier: "institution",
        label: "E. Mazar, Preliminary Report on the City of David Excavations 2005 at the Visitors Center Area",
        credit: "Eilat Mazar, Hebrew University of Jerusalem — the excavator's own report",
        detail: "Shalem Press, Jerusalem and New York, 2007. The publication of the 2005 season, including the Jehucal bulla. Print only",
        supports: "The 2005 find and its context",
      },
      {
        tier: "institution",
        label: "E. Mazar, The Palace of King David: Excavations at the Summit of the City of David, Preliminary Report of Seasons 2005-2007",
        credit: "Eilat Mazar — the excavator's own report",
        detail: "Shoham Academic Research and Publication, Jerusalem, 2009. Print only. Note that the volume's title claim about the building is itself contested; the bullae are not",
        supports: "The Gedaliah bulla and the excavation context",
      },
      {
        tier: "reference",
        label: "\"Jeremiah, Prophet of the Bible, Brought Back to Life\"",
        url: "https://www.biblicalarchaeology.org/daily/biblical-artifacts/artifacts-and-the-bible/jeremiah-prophet-of-the-bible-brought-back-to-life/",
        credit: "Biblical Archaeology Society",
        detail: "Gives both readings, both findspots, and the note that the two men are named together as ministers of Zedekiah",
        supports: "The readings and the relationship of the two findspots",
      },
      {
        tier: "encyclopedic",
        label: "Gedaliah, son of Pashhur",
        url: "https://en.wikipedia.org/wiki/Gedaliah,_son_of_Pashhur",
        credit: "Wikipedia, quoting E. Mazar in the Jerusalem Post, 31 July 2008",
        detail: "Carries Mazar's own quoted comment on finding the second bulla metres from the first, and the August 2008 date",
        supports: "The August 2008 date and Mazar's own framing of the pair",
      },
    ],
    reflectionPrompt:
      "Two of the men who tried to have Jeremiah killed are known to us only because they sealed some letters. What will outlast you, and will it be the part of you that you would choose?",
  },
  {
    id: "bethlehem-bulla",
    name: "Bethlehem Bulla",
    alternateNames: ["Bethlehem Fiscal Bulla"],
    category: "discovery",
    role: "A Tax Docket That May Carry the Oldest Extra-Biblical Mention of Bethlehem",
    summary:
      "A clay seal from a shipment of tax sent to the king of Judah, reading \"in the seventh — Bethlehem — for the king.\" Recovered from sifted soil, with two of its three lines partly restored.",
    sections: [
      {
        heading: "Sifted, Not Stratified",
        paragraphs: [
          "The Israel Antiquities Authority announced the bulla on 23 May 2012. It had come out of the sifting of soil removed from the IAA excavation on the eastern slope of the City of David, south of the Gihon Spring, directed by R. Reich and E. Shukron; the sifting operation itself runs in Emek Tzurim National Park. It is about 1.5 centimetres across, and R. Reich, publishing it in the Israel Exploration Journal later that year, measured it at 13 by 14 millimetres. No individual finder is recorded.",
          "That word \"sifting\" carries the whole first half of this article. The bulla is a loose object recovered from a batch of earth. It has no locus, no floor and no sealed layer, and Reich's own published wording is precise about this: it was found in association with pottery sherds of the eighth to seventh centuries BC — which dates the soil, not the object. What the sifting does give it is provenance in the narrower sense. It came out of a licensed excavation at a known site, so unlike more than twenty comparable fiscal bullae, it is not a piece of the antiquities market. Reich says exactly that is the point of it: almost the whole known corpus of these tax dockets is unprovenanced, and this one and one other are not.",
        ],
      },
      {
        heading: "A Shipment to the King",
        paragraphs: [
          "This is not a personal seal. It is a fiscal bulla — an administrative tag sealing goods sent to the crown — and it carries three lines rather than a name and patronymic. The reading published by the excavators is bshbʿt, \"in the seventh\"; bt lhm, Bethlehem; and lmlk, \"for the king,\" of which only the final letter actually survives and the rest is restored. E. Shukron's reconstruction is that in the seventh year of some king's reign a shipment went from Bethlehem to Jerusalem, in silver or in produce, and that this docket travelled with it.",
          "Which king is not recoverable from the object. Shukron himself named Hezekiah, Manasseh or Josiah and said it is unclear which. G. Barkay has argued that the whole corpus of fiscal bullae belongs to the reign of Manasseh. Either way the object sits in the late eighth or seventh century BC, which puts it in the world of the prophet Micah — the man who said that out of Bethlehem Ephrathah, small among the clans of Judah, would come a ruler in Israel.",
          "The reader who arrives here from Christmas should know what the object is and is not. It is a tax receipt. It says nothing about David, nothing about Micah's prophecy, and nothing about the birth of Christ seven centuries later. What it does is put the town's name in the administrative paperwork of the kingdom of Judah, which is a small and genuine thing.",
        ],
      },
      {
        heading: "The Reading Was Challenged, and Two Words Are Restored",
        paragraphs: [
          "Within a day of the announcement, G. Athas of Moore Theological College published a letter-by-letter objection from the published photograph. The fourth letter of the second line looked to him like a he rather than the het that Bethlehem requires; the first letter looked more like a resh than a bet; and the first line's second letter did not look like an ayin. On that reading the bulla would not mention Bethlehem at all.",
          "The next day he reported that S. Ahituv had examined the actual object rather than the photograph and read the first surviving letter of the second line as a yod, giving the fuller spelling byt lhm, with traces of a left vertical stroke on the last letter making it a het. Athas said he was more than happy to retract his preliminary conclusion — while adding that he would like one or two further epigraphers to inspect the bulla itself, and making the wider point that an epigraphic announcement ought to carry two independent readings from the start. No further published examination has been traced. So the accurate description is that the reading was challenged from a photograph and confirmed on direct inspection by a specialist, and that the challenge was withdrawn conditionally rather than abandoned.",
          "Two further cautions belong here. First, restoration: the third line's \"for the king\" is mostly reconstructed, and the town name as published required a restored letter too. A reader should know how much of a three-line inscription is actually on the clay. Second, the headline claim. \"The first mention of Bethlehem outside the Bible\" was the framing of the announcement, and it may well be right — but Bethlehem has long been proposed as the Bit-Ninurta of one of the fourteenth-century Amarna letters from the king of Jerusalem, and that reading is argued rather than dead. Several rival readings of the same sign have been proposed. This app therefore says the bulla may carry the earliest extra-biblical mention of Bethlehem, and does not say that it certainly does.",
        ],
      },
    ],
    verses: [
      { reference: "Micah 5:2", note: "Bethlehem Ephrathah, small among the clans of Judah — written in this bulla's own century" },
      { reference: "1 Samuel 16:1", note: "Samuel sent to Jesse the Bethlehemite" },
      { reference: "Ruth 1:1", note: "The famine that sends a Bethlehem family to Moab" },
      { reference: "Matthew 2:1", note: "Jesus born in Bethlehem of Judea — seven centuries after this tax docket" },
    ],
    sources: [
      { label: "BiblePlaces: the Israel Antiquities Authority announcement in full", url: "https://www.bibleplaces.com/blog/2012/05/seal-impression-from-bethlehem/" },
      { label: "G. Athas: more on the so-called Bethlehem bulla", url: "https://withmeagrepowers.wordpress.com/2012/05/25/more-on-the-so-called-bethlehem-bulla/" },
    ],
    discovery: {
      objectType: "Clay fiscal bulla, 13 x 14 mm, three registers in palaeo-Hebrew script",
      findSite: "Sifted soil from the City of David excavation on the eastern slope, south of the Gihon Spring, Jerusalem",
      findSiteId: "city-of-david",
      findSiteKind: "poi",
      foundYear: "Announced 23 May 2012; the excavation date is not published",
      foundBy: "Recovered in the sifting of soil from the excavation directed by R. Reich and E. Shukron for the Israel Antiquities Authority. No individual finder is recorded",
      objectDate: "Late eighth or seventh century BC on script and type; the regnal year on it cannot be tied to a named king",
      objectDateCertainty: "disputed",
      currentLocation: "Israel Antiquities Authority. No inventory number has been traced",
    },
    citations: [
      {
        tier: "scholarly",
        label: "R. Reich, \"A fiscal bulla from the City of David, Jerusalem\"",
        url: "https://cris.haifa.ac.il/en/publications/a-fiscal-bulla-from-the-city-of-david-jerusalem/",
        credit: "Ronny Reich, University of Haifa — the excavator's own publication",
        detail: "Israel Exploration Journal 62/2 (2012), 200-205. The linked page is the university's own record and carries the full abstract; the article itself is print only",
        supports: "The measurements, the find circumstances, the wording \"in association with pottery sherds of the eighth-seventh centuries BCE,\" and the point that almost all comparable fiscal bullae are unprovenanced",
      },
      {
        tier: "institution",
        label: "Israel Antiquities Authority announcement of the Bethlehem bulla, 23 May 2012",
        url: "https://www.bibleplaces.com/blog/2012/05/seal-impression-from-bethlehem/",
        credit: "Israel Antiquities Authority, reproduced in full by T. Bolen at BiblePlaces",
        detail: "Carries the three-line reading with the Hebrew, E. Shukron's quoted interpretation, and Bolen's own caution that too much can be made of the discovery",
        supports: "The reading, the sifting, and Shukron's list of possible kings",
      },
      {
        tier: "scholarly",
        label: "G. Athas, \"A New Seal that DOES NOT refer to Bethlehem\"",
        url: "https://withmeagrepowers.wordpress.com/2012/05/24/a-new-seal-that-does-not-refer-to-bethlehem/",
        credit: "George Athas, Moore Theological College, Sydney",
        detail: "24 May 2012 — the letter-by-letter objection from the published photograph",
        supports: "The palaeographic challenge to the reading of the second register",
      },
      {
        tier: "scholarly",
        label: "G. Athas, \"More on the so-called 'Bethlehem' Bulla\"",
        url: "https://withmeagrepowers.wordpress.com/2012/05/25/more-on-the-so-called-bethlehem-bulla/",
        credit: "George Athas, reporting S. Ahituv's direct examination",
        detail: "25 May 2012 — Ahituv reads yod rather than bet and het rather than he, giving byt lhm; Athas offers to retract, subject to further independent inspection",
        supports: "The confirmation of the reading on autopsy and the conditional nature of the withdrawal",
      },
    ],
    reflectionPrompt:
      "The first time Bethlehem's name shows up outside the Bible, it is on a tax receipt. What ordinary paperwork of your life is quietly the setting for something you cannot see yet?",
  },
  {
    id: "shema-seal",
    name: "Shema Seal",
    alternateNames: ["Seal of Shema, Servant of Jeroboam", "Megiddo Lion Seal"],
    category: "discovery",
    role: "A Lost Royal Official's Seal, Known Only From Casts and Photographs",
    summary:
      "A large jasper seal from Megiddo carved with a roaring lion and the words \"belonging to Shema, servant of Jeroboam\" — given to the Ottoman Sultan not long after it was found, and never seen again. Everything written about it since has been written from copies.",
    sections: [
      {
        heading: "Found at Megiddo, Sent to Istanbul, Gone",
        paragraphs: [
          "G. Schumacher, a German-American engineer and architect working for the Deutscher Palästina-Verein, dug at Tell el-Mutesellim — Megiddo — between 1903 and 1905. In 1904 the excavation produced an unpierced scaraboid seal of jasper, about 37 by 27 by 17 millimetres, which is unusually large for an Israelite seal. On it a lion roars, and around it runs a two-part inscription: lšmʿ / ʿbd yrbʿm, \"belonging to Shema, servant of Jeroboam.\"",
          "Then it disappeared. Schumacher gave the seal to the Ottoman Sultan and it went to Istanbul, and it is no longer in the Topkapi collection. A family tradition, recorded when Schumacher's daughter spoke to an Israeli archaeologist in 1966, says her father was told it had been removed from the museum and placed in Abdul Hamid II's tomb among objects representing the provinces of the empire — but that is second-hand testimony taken down more than sixty years after the fact, and no documentary record of the disposition has been traced. What is certain is that the original is lost. Every study of it since has worked from photographs, plaster casts and a bronze replica Schumacher had made before he sent it away.",
          "The findspot is not secure either. Different accounts place it in a courtyard near the northern wall, near the southern gatehouse, or in an excavation dump, and D. Ussishkin, who restudied the object and its context, called the stratigraphic situation ambiguous. Recording standards in 1904 were not what they later became. The date of the seal rests on the shapes of its letters and on the style of the lion, not on the layer it came out of.",
        ],
      },
      {
        heading: "Whose Servant, and Which Jeroboam",
        paragraphs: [
          "The title is the same formula that turns up on the Nathan-Melech bulla in this section: ʿbd, servant, used not of a slave but of a senior official, with the king's own name in place of the generic \"the king.\" Shema was somebody's minister. He is also, and this is worth stating plainly because popular lists get it wrong, not a figure in the Bible. No Shema servant of Jeroboam appears in Scripture. So this object does not identify a biblical person. What it does is attest a biblical king, indirectly, by naming the man who worked for him.",
          "Which king is a real question. The great majority read it as Jeroboam II, who ruled the northern kingdom in the first half of the eighth century BC — the reign Amos and Hosea prophesied into, and a period of northern wealth that a seal this fine would suit. The dating is palaeographic and iconographic. A minority have argued for Jeroboam I, the king who split the kingdom after Solomon; S. Yeivin and G. W. Ahlström are named in the literature as holding that view, though their arguments have not been read for this article and are reported here rather than assessed. Ussishkin's own contribution complicates it from another direction: he associated the seal with a gatehouse of a stratum conventionally dated earlier than the eighth century, which is precisely why he called the context ambiguous and why the palaeography, not the stratum, carries the consensus.",
        ],
      },
      {
        heading: "The Seal Is Fine. The Other Object Is Not.",
        paragraphs: [
          "There is no dispute about the authenticity of the Megiddo seal. It was excavated, drawn, cast and published in 1904 and after, and nobody has argued it was faked. Its honest limit is simply that the thing itself is gone: an object studied only through copies cannot be re-examined, cannot be tested, and cannot answer a new question. That is a permanent loss, and it is a reminder of what changed in archaeology between 1904 and now.",
          "The more important warning concerns a second object that shares the same inscription and is constantly confused with the first. Around 1980 a scholar bought a small clay bulla — roughly 23 by 19 millimetres — at a Bedouin market in Beersheba for the price of a coffee. It bears the same words and the same lion. He assumed at the time that it was a modern forgery copied from the famous seal, which by then was on an Israeli coin. In 2023 a team led by S. Ahituv published laboratory work in the journal Tel Aviv arguing for authenticity: petrography pointing to Galilee and Golan clays, electron microscopy finding no modern materials, and isotopic analysis of the patina consistent with natural formation. Y. Goren's summary was that you cannot prove authenticity, only forgery, and that this passes the tests.",
          "It has not settled. S. Munger noticed that the seal and the bulla share an identical small chip beneath the lion — which could be an ancient defect faithfully reproduced, or could be exactly what a forger copying a published photograph would reproduce. C. Rollston's objection is more general and applies to the whole method: laboratory testing cannot demonstrate authenticity, since a sufficiently good forgery would pass, and the inscription here is too poorly preserved for the palaeographic analysis where forgers usually give themselves away. In 2024 R. Deutsch, A. Lemaire, G. Barkay, P. van der Veen and D. Itzhak published an argument that the bulla is a forgery outright.",
          "The rule this app follows is simple. The Megiddo seal is excavated and usable. The Beersheba bulla is unprovenanced, actively disputed as of 2024, and is not used here as evidence of anything. Where a popular article cites \"the Shema bulla\" for the reign of Jeroboam II, check which object it means.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 14:23", note: "Jeroboam son of Joash reigns in Samaria forty-one years — the king most read on this seal" },
      { reference: "Amos 7:10", note: "Amaziah of Bethel reports Amos to Jeroboam king of Israel" },
      { reference: "1 Kings 12:20", note: "The other Jeroboam, made king over all Israel after the split" },
      { reference: "2 Kings 22:12", note: "\"The king's servant\" as a court title in Judah, the same formula this seal uses" },
    ],
    sources: [
      { label: "Biblical Archaeology Society: the bulla of the servant of Jeroboam", url: "https://www.biblicalarchaeology.org/daily/ancient-cultures/ancient-israel/bulla-of-servant-of-jeroboam/" },
    ],
    discovery: {
      objectType: "Unpierced scaraboid stamp seal of jasper, c. 37 x 27 x 17 mm, carved with a roaring lion and a two-part inscription",
      findSite: "Tell el-Mutesellim (Megiddo). The precise findspot is reported three different ways and cannot be settled from the 1904 records",
      findSiteId: "megiddo",
      findSiteKind: "poi",
      foundYear: "1904",
      foundBy: "The 1903-1905 Megiddo excavation directed by G. Schumacher for the Deutscher Palastina-Verein. No individual finder is recorded",
      objectDate: "Eighth century BC on palaeography and iconography, if the king is Jeroboam II; a minority argue for Jeroboam I in the late tenth century",
      objectDateCertainty: "disputed",
      currentLocation: "Lost. Given to the Ottoman Sultan and no longer in the Topkapi collection; known from photographs, plaster casts and a bronze replica",
    },
    citations: [
      {
        tier: "scholarly",
        label: "D. Ussishkin, \"Gate 1567 at Megiddo and the Seal of Shema, Servant of Jeroboam\"",
        credit: "David Ussishkin, Tel Aviv University",
        detail: "In M. D. Coogan et al. (eds.), Scripture and Other Artifacts: Essays on the Bible and Archaeology in Honor of Philip J. King (Louisville, 1994), pages 410-428. Print only; the page range is as cited in the secondary literature",
        supports: "The physical description of the seal and the judgement that its stratigraphic context is ambiguous",
      },
      {
        tier: "institution",
        label: "G. Schumacher, Tell el-Mutesellim I: Fundbericht",
        credit: "Gottlieb Schumacher for the Deutscher Palastina-Verein - the excavating body's own report",
        detail: "Leipzig, 1908. The excavation report of the 1903-1905 campaign that produced the seal, published four years after the original had left the country. Print only",
        supports: "The 1904 find and the excavation that produced it",
      },
      {
        tier: "reference",
        label: "\"Bulla of 'Servant of Jeroboam'\"",
        url: "https://www.biblicalarchaeology.org/daily/ancient-cultures/ancient-israel/bulla-of-servant-of-jeroboam/",
        credit: "Biblical Archaeology Society",
        detail: "Covers the 1904 seal, its loss, the Beersheba bulla, the 2023 laboratory study and C. Rollston's objection that such tests cannot demonstrate authenticity",
        supports: "The loss of the original, the surviving replica, and Rollston's methodological objection",
      },
      {
        tier: "reference",
        label: "\"Fake seal impression of biblical king Jeroboam is authentic, new study says\"",
        url: "https://www.haaretz.com/archaeology/2023-12-18/ty-article/fake-seal-impression-of-biblical-king-jeroboam-is-authentic-new-study-says/0000018c-7853-d98c-abef-fed7f4370000",
        credit: "Haaretz, 18 December 2023, reporting the study by S. Ahituv and colleagues",
        detail: "Gives the Topkapi disappearance, the surviving photographs, plaster casts and bronze replica, the bulla's 23 x 19 mm size, the battery of tests, Y. Goren's summary and S. Munger's identical-chip objection",
        supports: "The fate of the original and the state of the argument over the Beersheba bulla",
      },
      {
        tier: "scholarly",
        label: "S. Ahituv, Y. Goren and colleagues, on the authenticity of the Shema bulla",
        credit: "Shmuel Ahituv, Ben-Gurion University of the Negev, and Yuval Goren",
        detail: "Tel Aviv: Journal of the Institute of Archaeology of Tel Aviv University (2023). The publisher refuses automated requests, so no link is given",
        paywalled: true,
        supports: "The 2023 petrographic, microscopic and isotopic case for the bulla's authenticity",
      },
      {
        tier: "encyclopedic",
        label: "Shema seal",
        url: "https://en.wikipedia.org/wiki/Shema_seal",
        credit: "Wikipedia",
        detail: "Records the original's location as unknown and the Beersheba bulla as held at the Rockefeller Museum, Jerusalem",
        supports: "General orientation and the present whereabouts of the disputed bulla",
      },
    ],
    reflectionPrompt:
      "The most famous Israelite seal ever found was given away as a gift and lost within a lifetime. What are you holding that you assume will still be there?",
  },
  {
    id: "mesad-hashavyahu-ostracon",
    name: "Mesad Hashavyahu Ostracon",
    alternateNames: ["Yavne-Yam Ostracon", "The Reaper's Petition"],
    category: "discovery",
    role: "A Seventh-Century Labourer's Written Complaint About a Confiscated Cloak",
    summary:
      "Fourteen lines of ink on a potsherd, in which a farm worker at a small coastal fort asks the commander to get his garment back. It is the only surviving legal complaint by an ordinary labourer from the kingdom of Judah.",
    sections: [
      {
        heading: "A Fort With No Ancient Name",
        paragraphs: [
          "Mesad Hashavyahu is a small Iron Age fortress of about an acre and a half on the Mediterranean coast, a little south of the harbour of Yavne-Yam and north-west of Yavne. J. Naveh excavated it in 1960 for the Israel Department of Antiquities, and the sherd came out from under the floor of a room next to the gate complex. No individual finder is recorded; the credit in the literature belongs to the excavation.",
          "The site's ancient name is not known. \"Hashavyahu\" is a modern label, taken from a personal name that appears on one of the other ostraca found there — a small thing, but a good illustration of how much of the vocabulary of biblical archaeology is scaffolding put up by moderns rather than something the ancients wrote down. The fort was in use for only a few decades in the last third of the seventh century BC, dated by its pottery: ordinary late pre-exilic Judahite ware, mixed with East Greek pottery, which is where the argument in the third section starts.",
        ],
      },
      {
        heading: "\"Let My Lord Hear the Plea of His Servant\"",
        paragraphs: [
          "The letter is a petition, and the voice is the thing. A reaper says that he was working the harvest at a place called Hasar-Asam, that he finished his reaping and stored the grain, and that a supervisor then came and took his garment. He has been without it for days. His defence is that he did the work: all the men reaping beside him in the heat will vouch for him, and he is guiltless of any wrong. The end of the sherd is broken, but enough survives to show him asking for the cloak back and asking the official to see that it happens.",
          "The name of the man who took the cloak is on the sherd, and here the published editions genuinely differ. The Israel Museum, which holds the ostracon, prints Hoshayahu ben Shabay. Older translations following W. F. Albright and J. Gibson print Hoshabyahu ben Shobi. Others render the patronymic Shobai — a name the Bible gives to a family of gatekeepers in Ezra 2:42. The petitioner himself is anonymous, and so is the official: the letter carries no address formula and no signature, which has led some to suggest it was dictated to a scribe at the door of the governor's office as a record of the plea, where the names were already known to everyone present.",
          "What the complaint reaches for is one of the most concrete social laws in the Torah. Exodus 22:26-27 forbids keeping a neighbour's garment taken in pledge past sundown, because it is the only covering he has to sleep in, and it adds that God hears him when he cries out. Deuteronomy 24:12-13 repeats it and calls returning the pledge righteousness. Amos 2:8 indicts Israel for lying down beside altars on clothes taken in pledge. Here is a man in the seventh century BC, on the coast, crying out about exactly that.",
        ],
      },
      {
        heading: "Three Things This Sherd Is Regularly Made to Say",
        paragraphs: [
          "First, and most importantly: the reaper does not quote the law. He never mentions Exodus or Deuteronomy, never appeals to a commandment, and never says a garment must be returned by sundown. He argues that he does not owe anything — that he met his quota — which is a factual defence, not a legal-theological one. And the biblical law is about a garment taken as security for a loan, while this man's cloak was taken over an alleged shortfall in work. So the honest statement is that the ostracon shows the same moral world as the biblical law, and that a Judahite labourer expected an official to care about his cloak. It is not a citation of Scripture and it does not demonstrate that the written law was in his hands.",
          "Second, the Sabbath. Line 5 is often translated \"before the Sabbath,\" and on that reading this is the earliest mention of the Sabbath outside the Bible — a claim that turns up constantly in popular writing. But the Israel Museum's own published translation of its own object renders the same words \"before stopping (work),\" with no Sabbath in it at all. The Hebrew root behind the word means to cease, and whether it is the noun for the day or a verb for knocking off is genuinely argued. This app does not print the Sabbath claim as a fact.",
          "Third, whose fort it was. This is a real dispute among named scholars and it is not settled. J. Naveh, who dug it, held that the Hebrew inscriptions show the place was under Judahite control and suggested Josiah installed a military governor there. S. Ahituv agrees on epigraphic grounds, pointing to a trained scribal hand writing clear Hebrew. Y. Aharoni read the East Greek pottery as Greek mercenaries serving under Judean command. Israel Finkelstein, with N. A. Silberman, argues the opposite: the fort was Egyptian, garrisoned by mercenaries who may well have included Judahites, and Egypt was strong enough in those years to prevent Josiah from planting an isolated fort on the coast. A 2024 study by Q. Daniels argues along similar lines. A. Fantalkin's study of the site's material culture is the fullest treatment and is generally reported as supporting Egyptian service.",
          "The stake is worth naming plainly, because it is why the argument is heated. If Naveh is right, Josiah's Judah reached the Mediterranean and the little kingdom was substantially larger than its critics allow. If Finkelstein is right, it did not, and a Judahite reaper on this coast was working for somebody else's empire. This app's own view is that the concentration of Hebrew ostraca and Yahwistic names at the site is a real argument for Judahite administration and that Naveh's reading remains reasonable — but the pottery is genuinely there, Finkelstein's reading of the regional balance of power is not a fringe position, and a reader who is told the question is closed has been misinformed.",
        ],
      },
    ],
    verses: [
      { reference: "Exodus 22:26", note: "A garment taken in pledge must be returned before sundown" },
      { reference: "Exodus 22:27", note: "It is his only covering — and God hears him when he cries out" },
      { reference: "Deuteronomy 24:13", note: "Restore the pledge at sunset; it shall be righteousness to you" },
      { reference: "Amos 2:8", note: "Israel indicted for lying down on clothes taken in pledge" },
      { reference: "Ruth 2:3", note: "A gleaner in someone else's harvest field — the same world of dependent labour" },
    ],
    sources: [
      { label: "Israel Museum: \"A reaper's plea\"", url: "https://artsandculture.google.com/asset/a-reaper-s-plea-unknown/zgGVcOCoV9eRzA" },
      { label: "K. C. Hanson: the Yavneh-Yam ostracon, with Hebrew text and notes", url: "http://www.kchanson.com/ANCDOCS/westsem/yavneh.html" },
    ],
    discovery: {
      objectType: "Ostracon — a large potsherd carrying a fourteen-line Hebrew letter written in ink",
      findSite: "Mesad Hashavyahu, a small Iron Age fort on the Mediterranean coast south of Yavne-Yam",
      foundYear: "1960",
      foundBy: "The 1960 excavation directed by J. Naveh for the Israel Department of Antiquities. No individual finder is recorded",
      objectDate: "Late seventh century BC, c. 630 BC; the fort's dating rests on pottery and historical inference, not on any date in the text",
      objectDateCertainty: "traditional",
      currentLocation: "Israel Museum, Jerusalem; the object is Israel Antiquities Authority property. No inventory number is published",
    },
    citations: [
      {
        tier: "institution",
        label: "\"A reaper's plea\" — the Israel Museum's own record of the ostracon",
        url: "https://artsandculture.google.com/asset/a-reaper-s-plea-unknown/zgGVcOCoV9eRzA",
        credit: "The Israel Museum, Jerusalem; Israel Antiquities Authority",
        detail: "Gives the museum's own English translation, the medium (ink on pottery), the dimensions (21 x 16 cm) and the find site. The museum's own website returns a bot-challenge page to automated requests, so this is the readable form of the same record",
        supports: "The translation, the reading Hoshayahu ben Shabay, the holding institution, and the rendering of line 5 as \"before stopping (work)\" rather than \"before the Sabbath\"",
      },
      {
        tier: "scholarly",
        label: "J. Naveh, \"A Hebrew Letter from the Seventh Century B.C.\"",
        credit: "Joseph Naveh, the excavator — the first publication",
        detail: "Israel Exploration Journal 10/3 (1960), 129-139, with follow-ups in IEJ 12 (1962), 27-32 and IEJ 14 (1964), 158-159. Print only",
        supports: "The find, the reading, and Naveh's own argument that the fort was under Judahite control",
      },
      {
        tier: "reference",
        label: "The Yavneh-Yam ostracon: Hebrew text, translation and philological notes",
        url: "http://www.kchanson.com/ANCDOCS/westsem/yavneh.html",
        credit: "K. C. Hanson, adapting the translations of W. F. Albright and J. Gibson",
        detail: "Gives the excavation data, a line-by-line Hebrew text, and the older rendering of the offender's name",
        supports: "The excavator and date of discovery, the alternative name readings, and the note that a reaper was typically a day-labourer",
      },
      {
        tier: "reference",
        label: "Mezad Hashavyahu Ostracon, c. 630 BCE",
        url: "https://cojs.org/mezad_hashavyahu_ostracon-_c-_630_bce/",
        credit: "Center for Online Judaic Studies",
        detail: "Notes that seven inscribed items were found in 1960, that the site's ancient name is unknown, and that the petition never invokes the biblical law explicitly",
        supports: "The absence of an address formula, the quota dispute behind the confiscation, and the Judahite-versus-Egyptian question",
      },
      {
        tier: "scholarly",
        label: "A. Fantalkin, \"Mezad Hashavyahu: Its Material Culture and Historical Background\"",
        credit: "Alexander Fantalkin, Tel Aviv University",
        detail: "Tel Aviv 28/1 (2001), 3-165 — the fullest study of the site. Available only through hosts that refuse automated requests, so it is cited here as reported in the secondary literature rather than quoted",
        paywalled: true,
        supports: "The reading of the East Greek pottery as evidence of mercenaries in Egyptian service",
      },
    ],
    reflectionPrompt:
      "A day-labourer with no name assumed that someone in authority would care that his coat had been taken, and someone wrote it down. Who is asking you for something small that matters enormously to them?",
  },
  {
    id: "tell-es-safi-ostracon",
    name: "Tell es-Safi Ostracon",
    alternateNames: ["The Gath Ostracon", "The Alwt-Wlt Inscription"],
    category: "discovery",
    role: "The Earliest Deciphered Philistine Inscription, and the Headline It Never Deserved",
    summary:
      "Seven letters scratched on a bowl fragment at Philistine Gath, giving two non-Semitic personal names in an alphabet borrowed from the Canaanites. Reported worldwide as \"the Goliath inscription\" — a framing the excavator has publicly dropped.",
    sections: [
      {
        heading: "Seven Letters on a Bowl",
        paragraphs: [
          "The sherd was found in the 2005 season of the Tell es-Safi/Gath Archaeological Project, directed by A. Maeir of Bar-Ilan University. The site is Tel Zafit in the Judean Shephelah, identified with Philistine Gath. No individual finder is recorded — the project runs on students and volunteers, and the person who lifted this piece out of a bucket is not named in the publication.",
          "It is a body sherd from a ceramic bowl, and unlike the ink letters elsewhere in this section the writing here is scratched into the surface with something needle-like. Seven letters in Old Canaanite — the early alphabetic script — make two words: ALWT and WLT. Maeir dates it to the tenth to early ninth century BC on two independent grounds, the stratigraphy of the layer it came from and the typology of the bowl itself, and it lies below the destruction of Gath attributed to Hazael of Aram. It was published in 2008 by A. Maeir, S. Wimmer, A. Zukerman and A. Demsky in the Bulletin of the American Schools of Oriental Research.",
        ],
      },
      {
        heading: "What Two Names Are Worth",
        paragraphs: [
          "The genuine significance of this sherd has nothing to do with any individual. Both names are non-Semitic, of Indo-European type — the sort of names a population with Aegean or Anatolian roots would carry. They are written in the local Canaanite alphabet. That combination is the whole point: at Gath, in the tenth or ninth century BC, Philistines were keeping their own names and using their neighbours' writing system. It is a snapshot of a people in the middle of assimilating, taken from the century the Bible places David and the Philistine wars in.",
          "It is also, as Maeir has stressed, one of the earliest early-alphabetic inscriptions that is both securely dated and from a clear archaeological context rather than the antiquities market — which, after the article on the Baruch bullae in this section, is a distinction a reader will recognise the value of. For the Bible's purposes it fills in background: Gath was a real Philistine city with a literate administration, and the men in it had names that did not sound Hebrew.",
        ],
      },
      {
        heading: "It Does Not Say Goliath, and the Excavator Went Further Than That",
        paragraphs: [
          "In 2005 and 2006 this sherd was reported around the world as the \"Goliath inscription.\" It is not. The Hebrew name Goliath is spelled glyt; neither word on the sherd is that name, or anything close to it as a spelling. The connection that was originally proposed was purely etymological: that ALWT might belong to the same family as the Lydian royal name Alyattes, which scholars going back to the 1920s had suggested as a background for the name Goliath.",
          "That was the claim in 2006, and Maeir's own corrections at the time were already firmer than the coverage. The important development came later. In 2010, answering a proposed alternative reading, he wrote that his team had looked into the etymology themselves and found it did not hold — in his words, \"the onomastic similarity of alwt/alyattes/goliath was dropped.\" He has also stated plainly that they never claimed the sherd belonged to Goliath. He refers to it in his own writing as the so-called Goliath inscription, with the quotation marks doing exactly the work quotation marks do.",
          "So the position is stronger than \"the link is only etymological.\" The excavator who found the object, and who first floated the etymology, has since withdrawn it. Any article that tells a reader these names are linguistically related to Goliath is repeating a claim the man best placed to test it has publicly abandoned. This app does not repeat it, and the entry in this project's own scoping document that described the link as etymological has been corrected accordingly.",
          "There is a separate live disagreement about the reading itself, and it is a normal one. G. Hamilton proposed an additional letter, a gimel raised above the line, giving algwt — which would make the name Semitic rather than Indo-European. Maeir's published response is that the mark is not a letter but the trace left on the sherd by a plant root, a common enough thing that volunteers bring him supposed inscriptions of the same kind during pottery washing. F. M. Cross and L. E. Stager also disputed the reading and the dating in an excursus published before the inscription itself had appeared in print, and Maeir objected sharply to being criticised in advance of publication.",
          "What is left when the headline is removed is still worth a reader's time. A Philistine at Gath, in roughly the century of David, wrote two Philistine names using Canaanite letters on a broken bowl. The Bible's picture of Philistine cities as organised, literate neighbours with foreign names is exactly what that sherd shows — which is a smaller claim than the one the newspapers ran, and unlike that one, it is true.",
        ],
      },
    ],
    verses: [
      { reference: "1 Samuel 17:4", note: "Goliath of Gath, the champion whose name the sherd was said to carry" },
      { reference: "Joshua 11:22", note: "Gath as one of the cities where the Anakim remained" },
      { reference: "1 Samuel 5:8", note: "The ark carried to Gath — the city as a real administrative centre" },
      { reference: "2 Samuel 21:19", note: "Goliath the Gittite again, in a passage with its own textual puzzle" },
    ],
    sources: [
      { label: "A. Maeir: comment on Hamilton's reading of the Safi sherd", url: "https://gath.wordpress.com/2010/03/16/comment-on-hamiltons-reading-of-the-safi-sherd/" },
      { label: "A. Maeir: comment on the news item in BAR on the \"Goliath Inscription\"", url: "https://gath.wordpress.com/2006/02/16/comment-on-the-news-item-in-bar-on-the-goliath-inscription/" },
    ],
    discovery: {
      objectType: "Ostracon — a body sherd of a ceramic bowl, incised with seven letters in the Old Canaanite alphabet",
      findSite: "Tell es-Safi (Tel Zafit), identified with Philistine Gath, in the Judean Shephelah",
      findSiteId: "gath",
      findSiteKind: "location",
      foundYear: "2005; published 2008",
      foundBy: "The Tell es-Safi/Gath Archaeological Project, directed by A. Maeir, Bar-Ilan University. No individual finder is recorded",
      objectDate: "Tenth to early ninth century BC, dated by the stratigraphy of the layer and by the type of the bowl",
      objectDateCertainty: "firm",
      currentLocation: "Not published. Excavated material in Israel vests in the Israel Antiquities Authority, but no museum, storeroom or inventory number has been traced for this sherd",
    },
    citations: [
      {
        tier: "scholarly",
        label: "A. Maeir, S. Wimmer, A. Zukerman and A. Demsky, \"A Late Iron Age I/Early Iron Age II Old Canaanite Inscription from Tell es-Safi/Gath, Israel\"",
        credit: "Aren Maeir, Stefan Wimmer, Alexander Zukerman and Aaron Demsky",
        detail: "Bulletin of the American Schools of Oriental Research 351 (August 2008), 39-71; DOI 10.1086/basor25609285. The publisher's site returns a challenge page rather than the article to automated requests, so no link is given",
        paywalled: true,
        supports: "The editio princeps: the reading, the palaeography, the dating and the historical interpretation",
      },
      {
        tier: "institution",
        label: "A. Maeir, \"Comment on Hamilton's reading of the Safi sherd\"",
        url: "https://gath.wordpress.com/2010/03/16/comment-on-hamiltons-reading-of-the-safi-sherd/",
        credit: "Aren M. Maeir, director of the Tell es-Safi/Gath Archaeological Project — the excavating body's own statement",
        detail: "16 March 2010",
        supports: "The withdrawal of the Goliath etymology, the statement that no claim was ever made about Goliath himself, and the plant-root answer to Hamilton's proposed gimel",
      },
      {
        tier: "institution",
        label: "A. Maeir, \"Comment on the news item in BAR on the 'Goliath Inscription'\"",
        url: "https://gath.wordpress.com/2006/02/16/comment-on-the-news-item-in-bar-on-the-goliath-inscription/",
        credit: "Aren M. Maeir, Tell es-Safi/Gath Archaeological Project",
        detail: "16 February 2006 — the excavator's numbered corrections to the magazine report that created the popular framing",
        supports: "The stratigraphic and typological dating, and the original form of the etymological suggestion before it was dropped",
      },
      {
        tier: "institution",
        label: "A. Maeir, \"re: nasty comments in IEJ from Cross and Stager\"",
        url: "https://gath.wordpress.com/2007/01/09/re-nasty-comments-in-iej-from-cross-and-stager/",
        credit: "Aren M. Maeir, Tell es-Safi/Gath Archaeological Project",
        detail: "9 January 2007. Records the Cross and Stager excursus and Maeir's objection to being answered before publication",
        supports: "The existence and character of the Cross and Stager dispute over the reading and dating",
      },
    ],
    reflectionPrompt:
      "The true story here is smaller than the headline and better attested. When have you preferred the bigger version of a story to the one you could actually stand behind?",
  },
  {
    id: "lachish-letters",
    name: "Lachish Letters",
    alternateNames: ["Lachish Ostraca"],
    category: "discovery",
    role: "Military Correspondence From Judah's Last Weeks",
    summary:
      "Twenty-one inked potsherds from the gate of a Judahite fortress, most of them found in the ash of its final destruction. One of them is watching for the fire signals of Lachish because Azekah has gone dark.",
    sections: [
      {
        heading: "A Guardroom Full of Ash",
        paragraphs: [
          "On 29 January 1935, the third season of the Wellcome-Marston expedition at Tell ed-Duweir turned up inscribed potsherds in a small room in the eastern tower of the city's outer gateway. Sixteen came out of that guardroom, lying in the upper part of a burnt ash horizon against the room's east wall, soot-blackened and mostly broken. Two more came from elsewhere in the gate approach that season: one from ballast under a later Persian roadway, one from sieving the dump heap. Three more turned up in the final season of 1938, at three separate points on the mound. Twenty-one in all.",
          "The dig was directed by J. L. Starkey. The sherds were first spotted, according to the account drawn from the expedition's own archive, by Hasan 'Awad al-Qatshan, a Negev Bedouin excavator who had trained on Petrie's digs as a teenager and worked at Tell ed-Duweir through the 1930s; he was assistant to the expedition's G. Lankester Harding, who with O. Tufnell then went back through all the sherds from the area and found two more fragments. It is worth noting that the fullest technical study of the corpus names no individual finder at all, so the credit rests on the archival and popular record rather than on the excavation report.",
          "The excavation did not end well. On 10 January 1938 Starkey was murdered by bandits near Beit Jibrin, on his way to the opening of the new Palestine Archaeological Museum in Jerusalem. He is buried on Mount Zion. No expedition followed. The corpus was passed to H. Torczyner, later known as N. H. Tur-Sinai, who published the first edition in 1938.",
        ],
      },
      {
        heading: "\"We Cannot See Azekah\"",
        paragraphs: [
          "The best-known passage is on Lachish 4, near the end of the reverse. A subordinate reports to his superior that he is doing what he was told: watching the fire signals of Lachish, according to all the signs the commander has given, because they cannot see Azekah. In the fuller readings the clause about the signs is explicit, and it matters — this is a man confirming he is following a signalling protocol, not simply staring at a horizon.",
          "Jeremiah 34:7 describes the identical moment from the capital's end: Nebuchadnezzar's army was fighting against Jerusalem and against all the cities of Judah that were left, against Lachish and against Azekah, for these alone remained of the fortified cities of Judah. Jeremiah 6:1 has the prophet telling Benjamin to raise a signal on Beth Haccherem as the evil looks out from the north. The ostracon is the same system, in operation, written by the men operating it.",
          "The corpus is not all letters, despite the name. Lachish 1 is a bare list of personal names. Lachish 20 is a storage-jar label with a date formula. Several are too fragmentary to classify, and five of the guardroom pieces turned out to be fragments of the same broken vessel. One piece, Lachish 19, is roughly a century older than the rest — its script is late eighth century and its layer belongs to the Assyrian destruction of 701 BC, the campaign Micah 1:13 and 2 Kings 18:14 have in view. Calling Lachish 19 one of the last letters of Judah would be wrong.",
        ],
      },
      {
        heading: "\"The Prophet\" — and Why the App Will Not Name Him",
        paragraphs: [
          "Lachish 3 carries a line near its end about a letter that reached one Shallum son of Yada from the prophet, saying Beware. The Hebrew is hnb', \"the prophet,\" with the definite article. It is the only certain occurrence of the word in the Hebrew epigraphic record — and it is why the word matters in the article on the Isaiah bulla, where a comparable word is spelled differently and without the article. A second alleged occurrence on Lachish 16 is widely printed but rejected in the fullest modern study of the corpus, which reads the crucial letter differently.",
          "The prophet is not named, and the identification of him has been argued since the day the ostraca were published. Torczyner proposed Uriah son of Shemaiah, the prophet of Kiriath-jearim whom Jehoiakim had extradited from Egypt and executed in Jeremiah 26:20-23, and read the whole cache as the dossier of a court-martial arising from that affair. J. W. Jack and R. Dussaud, in the same year, proposed Jeremiah himself. S. Birnbaum objected that the Uriah reconstruction makes no sense — the danger to Uriah came from the king, so trying a subordinate for acting in line with royal policy is incoherent. M. Burrows dismissed it too.",
          "The argument that settled the field was methodological. A 1946 review of the whole question held that nothing in the ostraca approaches proof for Jeremiah, that the prophet could be any of the other named prophets of the period or one of the many anonymous ones Scripture mentions, and that the real fault was treating twenty-one unrelated scraps as a single interrelated dossier by one sender about one theme. The fullest modern study agrees, and describes what we have as a fleeting glimpse of a shadowy figure.",
          "So: the Lachish letters do not mention Jeremiah. An article that says they do is repeating a 1938 proposal that did not survive. What they do give a reader is better than a name — they show that in Judah's last months an army officer could write \"the prophet\" to a superior and expect to be understood, which is a great deal of context for the book of the prophet who was there.",
          "One further live disagreement, on the famous line itself. Y. Yadin argued that the writer was tending the beacon of Lachish rather than watching for it, which would place him at Lachish and dismantle the standard reconstruction of letters sent to Lachish from an outpost. A. F. Rainey rebutted him in 1987 on the Hebrew idiom, and J. A. Emerton agreed with Rainey. The standard reading holds, but it was tested.",
        ],
      },
    ],
    verses: [
      { reference: "Jeremiah 34:7", note: "Lachish and Azekah alone left of the fortified cities of Judah" },
      { reference: "Jeremiah 6:1", note: "Raise a signal on Beth Haccherem — the same signalling system" },
      { reference: "Jeremiah 26:20", note: "Uriah son of Shemaiah, the prophet Torczyner proposed and the field did not follow" },
      { reference: "2 Kings 18:14", note: "Sennacherib at Lachish in 701 BC — the earlier destruction Lachish 19 belongs to" },
      { reference: "Micah 1:13", note: "Lachish addressed by the prophet in the eighth century" },
    ],
    sources: [
      { label: "A. Zammit, The Lachish Letters: A Reappraisal of the Ostraca (Oxford DPhil, 2016)", url: "https://ora.ox.ac.uk/objects/uuid:db71cf81-ba6c-4a91-8e51-3c694993ebfe" },
      { label: "Biblical Archaeology Society: Eyewitness to Discovery", url: "https://www.biblicalarchaeology.org/reviews/eyewitness-to-discovery/" },
    ],
    discovery: {
      objectType: "Twenty-one inscribed potsherds — fragments of storage jars and other vessels, written in ink in cursive palaeo-Hebrew",
      findSite: "Tell ed-Duweir (Lachish), Judaean Shephelah — sixteen from the guardroom in the eastern tower of the outer gate",
      findSiteId: "lachish",
      findSiteKind: "location",
      foundYear: "1935 (eighteen) and 1938 (three)",
      foundBy: "The Wellcome-Marston expedition under J. L. Starkey. The sherds were first spotted by Hasan 'Awad al-Qatshan, assistant to G. Lankester Harding, per the account drawn from the expedition archive; the technical publication records no individual finder",
      objectDate: "Late seventh to early sixth century BC, ending with the Babylonian destruction of c. 588/587 BC. Lachish 19 is an exception, belonging to the Assyrian destruction of c. 701 BC",
      objectDateCertainty: "firm",
      currentLocation: "Seventeen in the British Museum, London; four registered to the Israel Antiquities Authority, of which Lachish 3, 4 and 6 are at the Israel Museum and Lachish 19 at the Rockefeller Museum",
    },
    citations: [
      {
        tier: "scholarly",
        label: "A. Zammit, The Lachish Letters: A Reappraisal of the Ostraca Discovered in 1935 and 1938 at Tell ed-Duweir",
        url: "https://ora.ox.ac.uk/objects/uuid:db71cf81-ba6c-4a91-8e51-3c694993ebfe",
        credit: "Abigail Zammit, University of Oxford",
        detail: "DPhil thesis, 2016, in two volumes, freely downloadable from the Oxford University Research Archive. The fullest modern treatment, worked from Starkey's own unpublished reports and from physical examination of the objects",
        supports: "The find counts and findspots, the registration numbers and museum split, the date of Lachish 19, the translation of Lachish 4, the rejection of the second \"prophet\" on Lachish 16, and the history of the identification debate",
      },
      {
        tier: "scholarly",
        label: "H. Torczyner (N. H. Tur-Sinai), Lachish I: The Lachish Letters",
        credit: "Harry Torczyner, later Naftali Herz Tur-Sinai — the editio princeps",
        detail: "Oxford University Press, 1938. Print only",
        supports: "The first edition of the corpus and the proposed identification of the prophet with Uriah son of Shemaiah",
      },
      {
        tier: "scholarly",
        label: "D. Winton Thomas, on the identification of the prophet of the Lachish ostraca",
        credit: "D. Winton Thomas, University of Cambridge",
        detail: "1946. The argument that no identification is possible and that treating the ostraca as one interrelated dossier is methodologically unsound. Print only. His surname is given here rather than in the article text because the app's automatic name-linking would otherwise send it to Thomas the apostle",
        supports: "The refusal to identify the prophet, and the methodological objection to Torczyner, Jack and Dussaud",
      },
      {
        tier: "reference",
        label: "\"Eyewitness to Discovery\"",
        url: "https://www.biblicalarchaeology.org/reviews/eyewitness-to-discovery/",
        credit: "J. D. M. Green, Bible History Daily, 26 April 2021 — a review of Olga Tufnell's 'Perfect Journey', which he co-edited",
        detail: "Names Hasan 'Awad al-Qatshan as the man who first spotted the inscribed sherds",
        supports: "The individual finder credit",
      },
      {
        tier: "institution",
        label: "The British Museum, London - Lachish ostraca, registration numbers BM 125701-125715 and BM 16707",
        credit: "The British Museum, which holds seventeen of the twenty-one",
        detail: "No link is given because britishmuseum.org refuses every automated request; the collection database opens normally in a browser, and the registration numbers above are the ones A. Zammit records from physical examination of the objects. The remaining four are registered to the Israel Antiquities Authority",
        supports: "The whereabouts of the corpus and its registration numbers",
      },
      {
        tier: "scholarly",
        label: "A. F. Rainey, \"Watching out for the signal fires of Lachish\"",
        credit: "Anson F. Rainey",
        detail: "Palestine Exploration Quarterly 119/2 (1987), 149-151. Print only",
        supports: "The rebuttal of Y. Yadin's \"tending the beacon\" reading",
      },
      {
        tier: "reference",
        label: "Lachish Ostraca",
        url: "https://www.encyclopedia.com/religion/encyclopedias-almanacs-transcripts-and-maps/lachish-ostraca",
        credit: "Encyclopaedia Judaica, via Encyclopedia.com",
        detail: "Independent confirmation of the 1935 and 1938 counts and of the gate-room findspot, with translations of Lachish 3 and 4",
        supports: "The find counts and the room adjacent to the city gate",
      },
    ],
    reflectionPrompt:
      "A soldier at a dark outpost wrote that he was still watching for the signals, exactly as instructed, while the towns around him went out one by one. What has God told you to keep doing while the news gets worse?",
  },
  {
    id: "ketef-hinnom-amulets",
    name: "Ketef Hinnom Silver Amulets",
    alternateNames: ["Ketef Hinnom Scrolls", "The Silver Scrolls"],
    category: "discovery",
    role: "Two Rolled Silver Plaques Carrying the Oldest Known Copy of a Biblical Text",
    summary:
      "Two tiny sheets of silver foil, incised and worn on a cord, from a burial cave above the Hinnom Valley. One of them carries a form of the priestly blessing of Numbers 6 — most probably written around 600 BC, four centuries before the oldest Dead Sea Scroll.",
    sections: [
      {
        heading: "A Collapsed Ceiling, and a Bored Thirteen-Year-Old",
        paragraphs: [
          "Ketef Hinnom means the shoulder of Hinnom — the rocky spur above the bend of the Hinnom valley, southwest of the Old City, in the grounds of a Scottish church. G. Barkay excavated a First Temple period family tomb there in 1979: five chambers around a central hall, benches with carved stone headrests, and under three of the benches a repository where bones and grave goods were swept once the flesh had gone. The tomb had been used to store rifles in Ottoman times and looked archaeologically hopeless.",
          "The reason it was not hopeless is that the ceiling of one chamber had partly collapsed in antiquity, sealing what lay beneath. Barkay's own account of how that was discovered is disarming: the volunteers included twelve- and thirteen-year-olds from a Tel Aviv youth archaeology club, and one of them, bored with being parked in a corner, banged on the floor with a hammer and came up holding almost complete pottery vessels. That was the repository, sixty centimetres deep and holding over a thousand objects — pottery, arrowheads, needles and pins, bone and ivory, glass, gold and silver. The boy was sent home with the rest of the youngsters and the repository was excavated by students and adult volunteers. He did not find the silver plaques, and the popular version of the story in which he did is wrong.",
          "No individual finder is recorded for the plaques themselves, but the circumstances are: the larger came from the middle of the repository, seven centimetres above the floor, and the smaller was recovered while sifting dirt from the lower half of the deposit at the innermost end. Both were rolled tight. It took about three years of experimentation to unroll them without destroying them.",
        ],
      },
      {
        heading: "What Is Actually Written On Them",
        paragraphs: [
          "This needs to be said precisely, because the popular summary is looser than the objects. The smaller plaque, about eleven by thirty-nine millimetres with twelve surviving lines, is the one carrying the priestly blessing. It preserves the whole of Numbers 6:24 — may Yahweh bless you and keep you. From 6:25 it preserves only the first half, make his face shine upon you; the words \"and be gracious to you\" are not on the silver. From 6:26 it preserves only the second half, and give you peace; the words \"Yahweh lift up his countenance upon you\" are not on the silver either. Its opening lines also carry a phrase with no parallel in Numbers at all, calling God the one who helps and who rebukes evil — which is why these are read as protective amulets rather than as a scripture portion.",
          "The larger plaque, about twenty-seven by ninety-seven millimetres, is not primarily a Numbers text. Its legible lines parallel the covenant formula of Exodus 20:6 and Deuteronomy 7:9 — the great God who keeps the covenant and lovingkindness towards those who love him and keep his commandments — before turning to redemption and to God as restorer and rock. Its blessing then begins, may Yahweh bless you and keep you, may Yahweh make his face shine, and the plaque disintegrates. Whether more of the blessing followed is a reconstruction, not a reading.",
          "So what these objects show is that the language of the priestly blessing was in circulation, in writing, in Judah, before the exile. That is a genuinely large thing. It is not the same as saying that the book of Numbers existed in its present form, and it is not the same as saying anyone at Ketef Hinnom was copying Scripture.",
        ],
      },
      {
        heading: "The Date Has Been Fought Over Twice",
        paragraphs: [
          "Barkay dated the plaques palaeographically to the late seventh or early sixth century BC, later revising towards the early sixth. J. Renz, in the standard German handbook of ancient Hebrew epigraphy with W. Rollig, argued the script was too poorly preserved to date with confidence and that a Hellenistic date, third or second century BC, could not be excluded — the repository had functioned as a sort of bin over centuries and did contain later material.",
          "That challenge was answered. Between 1994 and 2004 the West Semitic Research Project at the University of Southern California re-imaged both plaques with advanced photographic techniques, and G. Barkay, A. G. Vaughn, M. J. Lundberg and B. Zuckerman published a new edition in the Bulletin of the American Schools of Oriental Research in 2004. Their conclusion was that the late pre-exilic period is the proper context: only eight late-Hellenistic vessels came from the repository and all from its uppermost layer, no letter form points to a Hellenistic date, and both plaques were separated from the Hellenistic material by three metres horizontally and twenty-five centimetres vertically. P. K. McCarter said the study should settle the controversy, and for most of the field it did.",
          "The live challenge today is different and it is not resolved. N. Na'aman argued in the Israel Exploration Journal in 2011 for a new decipherment of the missing section of the larger plaque and, on that basis, for an early Second Temple date — not long after the rebuilding of the temple — reading the texts as expressing hopes pinned on the new temple and the return to the land. S. Ahituv published a rejoinder the following year. If Na'aman is right, the headline claim about these objects collapses. He has not persuaded the majority, and this app follows the late pre-exilic dating, but a reader should know that a serious scholar has argued otherwise in a peer-reviewed journal within the last fifteen years.",
          "One overclaim to refuse in passing. Because the plaques carry a text also found in the Pentateuch, they are sometimes cited as proof that the five books of Moses existed in the First Temple period. That is more than the silver can carry, and specialists said so at the time — the amulets show that material also found in the Pentateuch was written down before the exile, which is a claim about a blessing, not about a book.",
        ],
      },
    ],
    verses: [
      { reference: "Numbers 6:24", note: "Yahweh bless you and keep you — preserved in full on the smaller plaque" },
      { reference: "Numbers 6:25", note: "Only the first half of this verse is on the silver" },
      { reference: "Numbers 6:26", note: "Only the second half of this verse is on the silver" },
      { reference: "Deuteronomy 7:9", note: "The covenant-and-lovingkindness formula paralleled on the larger plaque" },
      { reference: "2 Kings 23:10", note: "Topheth in the valley of Hinnom — the ravine these tombs look down into" },
    ],
    sources: [
      { label: "G. Barkay's own account of the excavation, in interview", url: "https://www.itsgila.com/highlightspriestly.htm" },
      { label: "N. Na'aman, \"A New Appraisal of the Silver Amulets from Ketef Hinnom\" (abstract)", url: "https://cris.tau.ac.il/en/publications/a-new-appraisal-of-the-silver-amulets-from-ketef-hinnom/" },
    ],
    discovery: {
      objectType: "Two rolled strips of thin beaten silver foil, incised with palaeo-Hebrew letters and worn as amulets; unrolled, c. 27 x 97 mm and c. 11 x 39 mm",
      findSite: "The repository beneath Chamber 25 of burial Cave 24, Ketef Hinnom, above the Hinnom valley southwest of the Old City of Jerusalem",
      findSiteId: "jerusalem",
      findSiteKind: "location",
      foundYear: "1979",
      foundBy: "The Tel Aviv University excavation directed by G. Barkay. The repository was broken into by a thirteen-year-old volunteer, recorded by Barkay only as Nathan; no individual finder is recorded for the plaques themselves",
      objectDate: "Late seventh to early sixth century BC, c. 600 BC. A Hellenistic date proposed in 1995 was answered in 2004; an early Second Temple date proposed by N. Na'aman in 2011 remains a minority view",
      objectDateCertainty: "disputed",
      currentLocation: "Israel Museum, Jerusalem; Israel Antiquities Authority, IAA 1980-1495 and IAA 1980-1496",
    },
    citations: [
      {
        tier: "scholarly",
        label: "G. Barkay, A. G. Vaughn, M. J. Lundberg and B. Zuckerman, \"The Amulets from Ketef Hinnom: A New Edition and Evaluation\"",
        credit: "Gabriel Barkay, Andrew G. Vaughn, Marilyn J. Lundberg and Bruce Zuckerman, West Semitic Research Project, University of Southern California",
        detail: "Bulletin of the American Schools of Oriental Research 334 (2004), 41-71. The standard edition, based on new imaging. Paywalled and not reachable by automated request, so no link is given",
        paywalled: true,
        supports: "The readings of both plaques, and the answer to the proposed Hellenistic date",
      },
      {
        tier: "scholarly",
        label: "N. Na'aman, \"A New Appraisal of the Silver Amulets from Ketef Hinnom\"",
        url: "https://cris.tau.ac.il/en/publications/a-new-appraisal-of-the-silver-amulets-from-ketef-hinnom/",
        credit: "Nadav Na'aman, Tel Aviv University",
        detail: "Israel Exploration Journal 61/2 (2011), 184-195. The linked page is the university's own record and carries the full abstract; the article is print only. S. Ahituv replied in IEJ 62 (2012), 223-232",
        supports: "The proposed early Second Temple dating and its reasoning",
      },
      {
        tier: "scholarly",
        label: "J. D. Smoak, \"From Temple to Text: Text as Ritual Space and the Composition of Numbers 6:24-26\"",
        url: "https://jhsonline.org/index.php/jhs/article/download/29365/21383/77617",
        credit: "Jeremy D. Smoak, University of California, Los Angeles",
        detail: "Journal of Hebrew Scriptures 17, article 2 (2017). Open access. Its first footnote is the cleanest bibliography of the whole dating dispute",
        supports: "The state of scholarship on the amulets and on the blessing's composition",
      },
      {
        tier: "institution",
        label: "\"Amulets with a blessing formula from Ketef Hinnom\"",
        url: "https://web.archive.org/web/2020id_/http://jerusalem.nottingham.ac.uk/items/show/114",
        credit: "University of Nottingham, Jerusalem: Fall of a City - Rise of a Vision; objects courtesy of the Israel Antiquities Authority, photograph by Nachum Slapak, Israel Museum",
        detail: "Gives the inventory numbers IAA 1980-1495 and IAA 1980-1496 and the dimensions. Cited via the Internet Archive because the exhibition site no longer accepts connections",
        supports: "The inventory numbers, the holding institution and the dimensions",
      },
      {
        tier: "reference",
        label: "G. Barkay on the excavation of Ketef Hinnom, in interview",
        url: "https://www.itsgila.com/highlightspriestly.htm",
        credit: "Gabriel Barkay, interviewed by Gila Yudkin",
        detail: "The excavator's own first-person account of the youth volunteers, the hammer, and the sequence of events at the repository",
        supports: "The correction to the popular story that a thirteen-year-old found the silver plaques",
      },
    ],
    reflectionPrompt:
      "Someone in Jerusalem, six centuries before Christ, wore the words \"Yahweh bless you and keep you\" against their skin. What words would you want that close?",
  },
  {
    id: "samaria-ostraca",
    name: "Samaria Ostraca",
    alternateNames: ["Samaria Ostraka"],
    category: "discovery",
    role: "Wine and Oil Dockets From the Court of the Northern Kingdom",
    summary:
      "A hundred and two inked potsherds from the royal acropolis of Samaria, recording deliveries of wine and oil to the palace. They were found in builders' rubble, and the king whose regnal years they date by has never been settled.",
    sections: [
      {
        heading: "Found in the Fill",
        paragraphs: [
          "Harvard University excavated Samaria — the capital Omri bought and built, and the modern village of Sebastia — from 1908, and in the third season of 1910 the dig produced 102 inscribed potsherds. G. A. Reisner directed the 1909 and 1910 seasons with C. S. Fisher as his architect; D. G. Lyon reported the find publicly in 1911, and the three of them published the excavation in 1924. No individual finder is recorded.",
          "Where they were found matters more than most things in this article. They were not lying on a floor. They were in a fill laid down to level the ground before a large building went up — building rubble, in other words, into which somebody had swept the palace's discarded paperwork. The excavators named the structure the Ostraca House after them. The consequence is blunt: the sherds are out of primary context, they cannot be tied to the room they were used in, and the archaeology cannot date them beyond saying they were already rubbish when the fill was laid.",
          "Only 63 of the 102 are legible enough to be useful. Reisner published about sixty; I. T. Kaufman substantially enlarged the readable corpus in 1966 by working from the expedition's original glass negatives, and M. Richelle re-edited the whole set from photographs in 2022. One charming detail of the original filing system survived: oil deliveries were written on grey ware and wine deliveries on reddish sherds.",
        ],
      },
      {
        heading: "What a Docket Says",
        paragraphs: [
          "These are not letters. They are administrative notes of a few words: a year, a place or a clan, a name, and a commodity. Two distinct formats appear. In one, the year is spelled out in Hebrew words — the ninth year, the tenth year — and the note gives a district, a recipient and the goods, aged wine or fine oil. In the other the year is written with Egyptian hieratic numerals, and the note gives a clan, a recipient with his father's name, a second personal name, and the town within the clan, and the commodity is always wine.",
          "The Hebrew is northern, and that is one of the corpus's quiet contributions. It shows diphthong contraction, a different spelling of the word for \"year,\" and — most diagnostically — the Yahwistic element in personal names written -yw, where Judah writes -yhw or -yh. This is the dialect of the kingdom Amos and Hosea preached into, in its own administrative hand.",
          "The names themselves are the part readers usually hear about. Of roughly fifty-one distinct personal names in the corpus, about eleven are built on the divine name and about five on Baal, with three built on El and a further twenty-three carrying no divine element at all. Yahwistic and Baal-bearing names sat side by side in one royal bureaucracy. Given 1 Kings 16:31 and the northern kingdom's history, that is worth seeing.",
        ],
      },
      {
        heading: "Two Things the Corpus Will Not Tell You",
        paragraphs: [
          "The first is which king. The securely attested regnal years are the ninth, the tenth and the fifteenth — and no others. One damaged sherd, number 63, carries a hieratic numeral that has been read as 12, 14, 16 and 17 by different scholars, which means it cannot be used to narrow the field, and it is why the frequently printed claim that the ostraca date to \"years nine, ten, fifteen and seventeen\" should not be repeated. Reisner and Lyon in 1910 assigned them to Ahab, on the level at which they were found relative to an alabaster vase of Osorkon II of Egypt; that attribution has been abandoned on pottery, on stratigraphy and on script. The two live options are a single king, in which case Jeroboam II, which C. Rollston calls compelling; or two kings, most often Joash and his son Jeroboam II with the year-15 group belonging to the father, which turns on a possible co-regency. A 2020 handwriting study concluded that the most likely number of writers behind the whole corpus is two, and that the days of Joash and Jeroboam II are the most likely setting. It is not settled, and the fill context means the archaeology cannot settle it.",
          "The second is anything about the religion of the northern kingdom as a whole. This is the point at which a reader is usually handed more than the sherds contain. Fifty-one names from the men who supplied or received wine and oil at one royal court, over about two decades, drawn from clans within a few kilometres, is an elite sample from one place — not a census. The element bʿl can be the divine name, but it can also be the ordinary Hebrew word for lord or owner, and it was sometimes applied to Israel's own God, so a count of Baal names is not a count of Baal worshippers. And Lyon's original move — reading the Baal names as evidence for Ahab's reign because Kings associates Ahab with Baal, while simultaneously using the reign to interpret the names — is circular, and should not be reproduced.",
          "What is left is still substantial. A working northern administration, writing competently in its own dialect, moving wine and oil into a royal storehouse from named estates, in the century Amos walked into to say woe to those who are at ease in Zion and secure on the mountain of Samaria. The ostraca do not confirm a biblical episode. They furnish the room the prophets were shouting in.",
        ],
      },
    ],
    verses: [
      { reference: "1 Kings 16:24", note: "Omri buys the hill of Samaria and builds the city" },
      { reference: "1 Kings 16:31", note: "Ahab marries Jezebel and serves Baal — the background to the Baal-bearing names" },
      { reference: "2 Kings 14:23", note: "Jeroboam son of Joash reigns in Samaria forty-one years" },
      { reference: "Amos 6:1", note: "Woe to those secure on the mountain of Samaria — the world these dockets belong to" },
    ],
    sources: [
      { label: "M. Suriano, \"The Samaria Ostraca\" (Bible Odyssey, Society of Biblical Literature)", url: "https://www.bibleodyssey.org/articles/the-samaria-ostraca/" },
      { label: "M. Richelle, \"Old and New Readings in the Samaria Ostraca\"", url: "https://ojs.uclouvain.be/index.php/babelao/article/download/65023/61353/120603" },
    ],
    discovery: {
      objectType: "102 inscribed potsherds — administrative dockets written in carbon ink with a reed pen in cursive palaeo-Hebrew; 63 legible",
      findSite: "The royal acropolis of Samaria (Sebastia) — in a levelling fill beneath a building the excavators named the Ostraca House",
      findSiteId: "samaria",
      findSiteKind: "location",
      foundYear: "1910",
      foundBy: "The Harvard expedition directed by G. A. Reisner, with C. S. Fisher; reported by D. G. Lyon. No individual finder is recorded",
      objectDate: "First half of the eighth century BC, most narrowly its second quarter. The regnal years on them cannot be tied to a single named king",
      objectDateCertainty: "disputed",
      currentLocation: "Reported to be in the Istanbul Archaeology Museums, under Ottoman antiquities law. No museum catalogue entry or inventory number could be verified; the research photographs are held at Harvard",
    },
    citations: [
      {
        tier: "institution",
        label: "D. G. Lyon, \"Hebrew Ostraca from Samaria\"",
        url: "https://archive.org/stream/jstor-1507545/1507545_djvu.txt",
        credit: "David Gordon Lyon, Harvard University, expressly based on a special report from G. A. Reisner",
        detail: "Harvard Theological Review, 1911. Free worldwide through JSTOR Early Journal Content. The contemporary account by the expedition itself",
        supports: "The 1909-1910 direction of the dig, the original attribution to Ahab, the first year-readings, and the observation about Baal and Yahwistic names",
      },
      {
        tier: "scholarly",
        label: "S. B. Noegel, \"The Samaria Ostraca\"",
        url: "https://faculty.washington.edu/snoegel/PDFs/articles/Noegel%2048%20-%20ANEHST%202006c.pdf",
        credit: "Scott B. Noegel, University of Washington, in M. W. Chavalas (ed.), The Ancient Near East: Historical Sources in Translation (Blackwell, 2006), 396-399",
        detail: "The author's own copy of the chapter",
        supports: "The 102/63 counts, the two document formats, the reading of ostracon 63 as variously 12, 14, 16 or 17, and the co-regency question",
      },
      {
        tier: "scholarly",
        label: "M. Richelle, \"Old and New Readings in the Samaria Ostraca\"",
        url: "https://ojs.uclouvain.be/index.php/babelao/article/download/65023/61353/120603",
        credit: "Matthieu Richelle",
        detail: "BABELAO 10-11 (2022), 379-413. Open access. A re-edition of the whole Reisner corpus with a full table of the personal names",
        supports: "The count of distinct personal names and their classification, and the statement that only years 9, 10 and 15 are securely attested",
      },
      {
        tier: "scholarly",
        label: "S. Faigenbaum-Golovin et al., algorithmic handwriting analysis of the Samaria ostraca",
        url: "https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0227452",
        credit: "Shira Faigenbaum-Golovin and colleagues, Tel Aviv University",
        detail: "PLOS ONE 15/1 (2020), e0227452. Open access",
        supports: "The finding that two writers are most likely, and the narrowing of candidate kings to Joash and Jeroboam II",
      },
      {
        tier: "reference",
        label: "M. Suriano, \"The Samaria Ostraca\"",
        url: "https://www.bibleodyssey.org/articles/the-samaria-ostraca/",
        credit: "Matthew J. Suriano, University of Maryland, for Bible Odyssey (Society of Biblical Literature)",
        detail: "20 June 2017",
        supports: "The single-king versus co-regency alternatives and the northern -yw spelling of the divine element",
      },
      {
        tier: "institution",
        label: "Harvard Expedition to Samaria, 1908-1910",
        url: "https://web.archive.org/web/2023id_/https://curiosity.lib.harvard.edu/expeditions-and-discoveries/feature/harvard-expedition-to-samaria-1908-1910",
        credit: "Harvard Library",
        detail: "Cited via the Internet Archive because the live page refuses automated requests. Confirms that Harvard designated Reisner to direct the expedition and records the 1924 Reisner, Fisher and Lyon publication",
        supports: "The direction of the expedition and its final publication",
      },
    ],
    reflectionPrompt:
      "These sherds are somebody's discarded delivery notes, swept into a builder's fill. What in your ordinary week would tell the truth about you if it were all that survived?",
  },
  {
    id: "lmlk-seal-impressions",
    name: "LMLK Seal Impressions",
    alternateNames: ["Lmlk Stamped Jar Handles", "Royal Judahite Jar Handles"],
    category: "discovery",
    role: "Two Thousand Stamped Jar Handles From the Kingdom of Judah",
    summary:
      "Storage jars stamped on the handle, before firing, with the words \"belonging to the king,\" a winged emblem and one of four place-words. More than two thousand are known, most of them from the last decades of the eighth century BC.",
    sections: [
      {
        heading: "A Stamp, Not a Seal",
        paragraphs: [
          "These are impressions, not seals. Somebody pressed a stamp into the wet clay of a large storage jar's handle before it was fired, and the stamp itself has never been found — the entire corpus is the marks it left. The layout is consistent: the word lmlk, \"belonging to the king,\" across the top; below it a winged emblem, either two-winged or four-winged; below that one of four words. The types are distinguished by the wing count, the place-word and the layout of the registers, and a small minority carry only the word lmlk or only a place-word.",
          "The first was sighted by C. Warren in Jerusalem in 1868 and published by him two years later, and they have been turning up ever since, at seventy-odd sites spread across Judah, Benjamin and the southern tribal lands. More than two thousand are known, of which roughly fifteen hundred come from controlled excavation and survey rather than from the market — a count published by O. Lipschits, O. Sergi and I. Koch. The largest concentrations are at Khirbet Qeiyafa, Lachish, Jerusalem, Ramat Rahel and southern Jerusalem, with Gibeon, Mizpah and Beth Shemesh behind them. Complete jars were found in place at Lachish beneath the destruction layer, which is what makes the whole class datable at all. Found in the same contexts are several hundred so-called private stamps carrying a personal name and a patronymic — sometimes on a different handle of the very same jar.",
        ],
      },
      {
        heading: "Hebron, Ziph, Socoh, and a Word Nobody Can Read",
        paragraphs: [
          "Three of the four words below the emblem are Judahite towns: Hebron, Ziph and Socoh — the Socoh northwest of Hebron, not the one to its southwest. The fourth, mmst, has resisted identification since 1868. About a dozen sites have been proposed for it and none is etymologically satisfying. One older proposal took it as an abbreviation for \"government,\" meaning Jerusalem. A 2024 study by D. Vainstub argues it is not a place name at all but an expression meaning \"from the mas'et\" — a single extraordinary collection of agricultural produce which, on his reading, Hezekiah raised in preparation for the Assyrian invasion, distributed in jars stamped \"belonging to the king, from the mas'et.\" That is a proposal, not a consensus.",
          "The connection to Scripture is administrative rather than narrative, and it is strong. 2 Chronicles 32 describes Hezekiah building up walls and towers, making weapons in abundance, and providing storehouses for grain, wine and oil. 2 Kings 18:13-14 and Isaiah 22 describe the campaign these preparations were for. The lmlk jars are what a royal supply system of exactly that kind leaves behind: standardised vessels, produced at a single centre, filled at estates, distributed to fortified towns, and marked with the king's own word.",
        ],
      },
      {
        heading: "Whose System, and For How Long",
        paragraphs: [
          "The version a reader usually meets is that the lmlk jars were Hezekiah's emergency war supplies for the Assyrian invasion of 701 BC. There is a great deal in that, and it is close to the majority position, but stated flatly it goes past the evidence — and the disagreement is worth a reader's time because it is a good example of a live archaeological argument being conducted in public.",
          "What is not in dispute is the end date. The largest single group came from the destruction layer of Lachish Level III, which D. Ussishkin's renewed excavations assigned firmly to Sennacherib's campaign of 701 BC. That is a hard limit, and it also destroyed an older theory: both the two-winged and the four-winged types were found together in that layer, so one did not replace the other over time. N. Na'aman observed that the stamps cluster in exactly the regions the Assyrian assault was aimed at, and read the system as Hezekiah's preparations in the years before 701.",
          "The disagreement is about when the system started and whether it stopped. Ussishkin holds that all of them date to shortly before 701 — one short horizon, one king. A. G. Vaughn argued that jars of this type were already in use before Hezekiah came to the throne, that stamps occur at fortified sites the Assyrians never attacked and at unfortified ones, and that the system is better read as an administrative and economic reorganisation running across Hezekiah's whole reign rather than as war preparation; most scholars followed him. O. Lipschits, O. Sergi and I. Koch then argued that the types split chronologically — some appear under the 701 destruction and some only at sites that survived it and in seventh-century layers — and that the system began when Judah became an Assyrian vassal in the last quarter of the eighth century, as a way of meeting the tax quotas the empire imposed, and continued in modified form until 586 BC. Their sharpest practical point is hard to dismiss: a system of central manufacture, distribution for filling, and redistribution to royal hubs, on this scale, is not something a small kingdom improvises in the three or four years between a rebellion and an invasion.",
          "Ussishkin answered them, Lipschits answered back, and Ussishkin answered again; the exchange ran through four journals between 2010 and 2012. Where the field sits now is that the Hezekiah-centred reading remains the majority, with an acknowledgement that some stamping preceded the revolt, and that the Lipschits scheme is a serious and unsettled challenge. The honest sentence for a Bible reader is that these jars are the physical trace of a Judahite royal economy that was mobilised for the Assyrian crisis — and that whether the system was built for that crisis, or existed before it and was pressed into service, is exactly what specialists are still arguing about.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 18:13", note: "Sennacherib takes the fortified cities of Judah in Hezekiah's fourteenth year" },
      { reference: "2 Kings 18:14", note: "Hezekiah sends to the king of Assyria at Lachish" },
      { reference: "2 Chronicles 32:5", note: "Hezekiah repairs the wall, raises towers and makes weapons in abundance" },
      { reference: "2 Chronicles 32:28", note: "Storehouses for grain, new wine and oil — the system these jars belong to" },
      { reference: "Isaiah 22:10", note: "Houses broken down to fortify the wall, in the same emergency" },
    ],
    sources: [
      { label: "O. Lipschits, O. Sergi and I. Koch, \"Royal Judahite Jar Handles: Reconsidering the Chronology of the lmlk Stamp Impressions\"", url: "https://humanities.tau.ac.il/sites/personal.tau.ac.il/files/media_server/1304/untitled%20folder/n.pdf" },
      { label: "D. Vainstub, \"The Enigmatic mmst in the lmlk Stamps\"", url: "https://web.archive.org/web/20241225195440/https://jjar.huji.ac.il/sites/default/files/jjar/files/vol6-art01_lmlk_05062024_-2.pdf" },
    ],
    discovery: {
      objectType: "Oval stamp impressions pressed into the handles of large storage jars before firing. No stamp seal itself has ever been found",
      findSite: "Some seventy sites across Judah, Benjamin and Simeon, concentrated at Khirbet Qeiyafa, Lachish, Jerusalem, Ramat Rahel and southern Jerusalem",
      findSiteId: "lachish",
      findSiteKind: "location",
      foundYear: "First sighted 1868; found continuously ever since",
      foundBy: "The first was sighted by C. Warren in Jerusalem in 1868 and published by him in 1870. The corpus accumulated across a century and a half of excavation, and no individual finder attaches to it",
      objectDate: "Chiefly the last decades of the eighth century BC, with the destruction of Lachish Level III in 701 BC as a fixed point. Whether the system began earlier, and whether it continued into the seventh century, is disputed",
      objectDateCertainty: "disputed",
      currentLocation: "Dispersed across many collections. Complete jars of the Hebron type are displayed at the Israel Museum, Jerusalem, and a group of impressions at the Hecht Museum, Haifa",
    },
    citations: [
      {
        tier: "scholarly",
        label: "O. Lipschits, O. Sergi and I. Koch, \"Royal Judahite Jar Handles: Reconsidering the Chronology of the lmlk Stamp Impressions\"",
        url: "https://humanities.tau.ac.il/sites/personal.tau.ac.il/files/media_server/1304/untitled%20folder/n.pdf",
        credit: "Oded Lipschits, Omer Sergi and Ido Koch, Tel Aviv University",
        detail: "Tel Aviv 37 (2010), 3-32. The author copy on the university's own server",
        supports: "The corpus counts, the early/late type split, the Assyrian-vassal reading, and the summary of A. G. Vaughn's position",
      },
      {
        tier: "scholarly",
        label: "D. Ussishkin, \"Lmlk Seal Impressions Once Again: A Second Rejoinder to Oded Lipschits\"",
        url: "https://repositorio.uca.edu.ar/bitstream/123456789/6574/1/lmlk-seal-impressions-rejoinder-lipschits.pdf",
        credit: "David Ussishkin, Tel Aviv University",
        detail: "Antiguo Oriente 10 (2012), 13-23. Open access through the Universidad Catolica Argentina repository",
        supports: "Ussishkin's own statement that all the lmlk jars date to shortly before 701 BC",
      },
      {
        tier: "scholarly",
        label: "O. Lipschits, \"Archaeological Facts, Historical Speculations and the Date of the LMLK Storage Jars: A Rejoinder to David Ussishkin\"",
        url: "https://jhsonline.org/index.php/jhs/article/view/18386",
        credit: "Oded Lipschits, Tel Aviv University",
        detail: "Journal of Hebrew Scriptures 12, article 4 (2012). Open access",
        supports: "The chronological split of the stamp types and the objection to dating the lmlk corpus from the private-stamp contexts",
      },
      {
        tier: "institution",
        label: "D. Ussishkin, The Renewed Archaeological Excavations at Lachish (1973-1994)",
        credit: "David Ussishkin and the Institute of Archaeology, Tel Aviv University - the excavating body's own final report",
        detail: "Monograph Series of the Institute of Archaeology 22, Tel Aviv, 2004, in five volumes. The excavation that fixed the destruction of Level III to Sennacherib's campaign of 701 BC, which is the anchor for the whole lmlk chronology. Print only",
        supports: "The dating of Lachish Level III to 701 BC and the stratified lmlk jars beneath it",
      },
      {
        tier: "scholarly",
        label: "D. Vainstub, \"The Enigmatic mmst in the lmlk Stamps\"",
        url: "https://web.archive.org/web/20241225195440/https://jjar.huji.ac.il/sites/default/files/jjar/files/vol6-art01_lmlk_05062024_-2.pdf",
        credit: "Daniel Vainstub, independent researcher",
        detail: "Jerusalem Journal of Archaeology 6 (2024), 1-31; DOI 10.52486/01.00006.1. Open access, but the journal's own server and the DOI both return an error page to automated requests, so the Internet Archive copy is linked instead",
        supports: "The 1868 first sighting by C. Warren and its publication in 1870, the four words below the emblem, the proposed reading of mmst, the rejection of Ginsberg's abbreviation proposal, and the state of the dating debate in 2024",
      },
      {
        tier: "scholarly",
        label: "A. G. Vaughn, Theology, History, and Archaeology in the Chronicler's Account of Hezekiah",
        credit: "Andrew G. Vaughn",
        detail: "Scholars Press, 1999. Print only",
        supports: "The argument that the stamping system spans Hezekiah's whole reign as administrative reorganisation rather than as war preparation",
      },
    ],
    reflectionPrompt:
      "A king stamped his own word onto thousands of ordinary jars so that everyone would know whose they were. What in your life carries that mark?",
  },
  {
    id: "sabbath",
    name: "Sabbath",
    // "the Sabbath" is deliberately NOT registered: it ties with "Sabbath day" on length, and at
    // Exodus 20:8 ("Remember the Sabbath day") the tie was being won by the article form, leaving
    // "day" outside the link. Dropping it lets the fuller phrase match, and bare "Sabbath" still
    // covers everywhere else.
    alternateNames: ["Sabbath day"],
    category: "practice",
    role: "The Seventh-Day Rest Commanded in the Law",
    summary:
      "The seventh-day rest commanded in the Ten Commandments and kept as a sign of God's covenant with Israel — the setting of several of Jesus's sharpest conflicts with the religious authorities, and the subject of a long-running and still-unsettled disagreement among Christians about what it asks of them now.",
    sections: [
      {
        heading: "The Command and Its Two Reasons",
        paragraphs: [
          "The Sabbath command appears twice in the Law, and the two versions ground it in two different things. Exodus 20:8-11 ties it to creation: 'Remember the Sabbath day, to keep it holy... for in six days Yahweh made heaven and earth, the sea, and all that is in them, and rested the seventh day.' Deuteronomy 5:12-15 repeats the command almost word for word but gives a different reason — 'You shall remember that you were a servant in the land of Egypt, and Yahweh your God brought you out of there by a mighty hand' — grounding the rest in the exodus, and extending it pointedly to servants and livestock so that 'your male servant and your female servant may rest as well as you.' The two reasons are usually read as complementary rather than competing: the day recalls both a God who rested and a God who freed slaves.",
          "Behind both stands Genesis 2:2-3, where God 'rested on the seventh day from all his work' and 'blessed the seventh day, and made it holy' — before any command is given to anyone. Exodus 31:13-17 then makes Sabbath-keeping a covenant sign specifically between God and Israel, 'a sign between me and you throughout your generations,' and attaches severe penalties to profaning it. Isaiah 58:13-14 frames it less as restriction than as gift, calling Israel to 'call the Sabbath a delight.'",
        ],
      },
      {
        heading: "Sabbath in Jesus's Ministry",
        paragraphs: [
          "The Gospels place several of Jesus's confrontations with the Pharisees and synagogue authorities on the Sabbath, and the dispute is consistently about what the day permits rather than whether it should be kept. Jesus is portrayed attending synagogue on the Sabbath as his custom, and the arguments arise when he heals there. When a synagogue ruler objects that there are six other days for healing, Jesus answers by pointing to the accepted practice of watering an ox or donkey on the Sabbath: 'Ought not this woman, being a daughter of Abraham, whom Satan had bound eighteen long years, be freed from this bondage on the Sabbath day?' (Luke 13:14-16).",
          "Two sayings carry most of the weight in later Christian discussion. 'The Sabbath was made for man, not man for the Sabbath' (Mark 2:27) sets the day's purpose as human good rather than as an end in itself. 'The Son of Man is lord even of the Sabbath' (Mark 2:28; also Matthew 12:8 and Luke 6:5) claims an authority over the day itself. Readers across the traditions below agree these sayings are central and disagree about how far they reach — whether they interpret the commandment or transcend it is precisely the question the next section describes.",
        ],
      },
      {
        heading: "What the Sabbath Asks of Christians",
        paragraphs: [
          "This app writes from a Protestant evangelical position, and on the Sabbath that position rests on a distinction: the fourth commandment's abiding substance is not the same thing as the Mosaic Sabbath's ceremonial form. The substance — that time belongs to God, that human beings are made to rest as well as work, and that rest is a gift rather than a grudging allowance — stands, and it is grounded in creation itself, before Sinai and before Israel (Genesis 2:2-3). The form — the seventh day kept on pain of death as the covenant sign between God and Israel (Exodus 31:13-17) — belonged to that covenant, and the New Testament treats it as fulfilled in Christ. Colossians 2:16-17 is the load-bearing text: Sabbath days are 'a shadow of the things to come; but the body is Christ's.' Hebrews 4:9-10 completes the thought by making the rest itself the destination — 'There remains therefore a Sabbath rest for the people of God.' Christ does not abolish the Sabbath; he is what it was pointing at.",
          "Two conclusions follow. First, no particular day binds the Christian conscience, because Paul says so directly and declines to arbitrate: 'One man esteems one day as more important. Another esteems every day alike. Let each man be fully assured in his own mind' (Romans 14:5-6). Second, Christians nevertheless gather, and they have gathered on the first day of the week since the apostolic period, in commemoration of the resurrection — the disciples breaking bread 'on the first day of the week' (Acts 20:7), and John 'in the Spirit on the Lord's day' (Revelation 1:10). Sunday is therefore kept as the Lord's Day, joyfully and by long practice, rather than as a Sabbath transferred by command.",
          "What that asks of a Christian is not less than the commandment but something different in kind from a rule about a date: that work be laid down often enough and deliberately enough to be a standing admission that the world is upheld by God and not by us, and that the day the church gathers be given to worship rather than absorbed into everything else.",
        ],
      },
      {
        heading: "Where Evangelicals Disagree",
        paragraphs: [
          "The position above is this article's, and it is the majority evangelical one — but it is not the only view held by evangelicals, and the disagreement is old and serious. Both alternatives below are held by people with the same confidence in Scripture's authority, argued from the same texts, and neither is a boundary of orthodoxy. Christians on each side regard the others as brothers who have read a hard question differently, not as unbelievers.",
          "The confessional Reformed view holds that the fourth commandment is moral law, binding on all people in every age, and that its observance was moved by apostolic authority to the first day. This is the position of the Westminster Confession, which calls the Lord's Day 'the Christian Sabbath' and asks for a day set apart from ordinary work and recreation. It is the historic Puritan and Presbyterian position and remains confessionally binding in a number of denominations. Its case against the article's position is direct: the ten commandments are given as a unit and summarise moral law, so singling out the fourth as ceremonial and expired leaves the Decalogue with a hole in it, and treats as temporary a command God grounded in creation itself.",
          "The seventh-day view holds that the commandment was never repealed and that the day was never changed. Its argument deserves to be stated at full strength rather than summarised away. Exodus 20:8-11 grounds the Sabbath in creation, before Israel existed and before any ceremonial system was given, which tells against classing it with the shadows that passed; Exodus 31:16 calls Sabbath-keeping 'a perpetual covenant'; and the New Testament records no command anywhere transferring the day, which is a striking silence if such a change actually occurred. On Colossians 2:16-17, seventh-day interpreters answer that the 'sabbath days' in view there are the annual ceremonial sabbaths of the festival calendar listed alongside feast days and new moons, not the weekly Sabbath of the Decalogue — a reading the article above does not accept, but which is exegetical rather than evasive.",
          "It matters to say plainly who holds this. Seventh Day Baptists have held it since the seventeenth century, and Seventh-day Adventists — who affirm the authority of Scripture, the Trinity, and salvation by grace through faith in Christ — are the largest body holding it today. It is not a sectarian curiosity outside the evangelical world but a minority position within it, and a reader should not come away from this article thinking otherwise.",
          "One fact belongs to the disagreement rather than to either side, because all three positions use it: the New Testament contains no passage that explicitly commands a change of day. Those who keep Sunday read the transfer out of apostolic practice, and those who keep Saturday read the same silence as decisive the other way. The argument turns on inference from practice, not on an explicit instruction, and a reader deserves to know that before being told the question is easy.",
        ],
      },
      {
        heading: "How Other Traditions Read It",
        paragraphs: [
          "Roman Catholic teaching is frequently misrepresented on this point by Protestants, so it is worth quoting rather than characterising. The Catechism of the Catholic Church distinguishes Sunday from the sabbath 'which it follows chronologically every week,' and says that 'for Christians its ceremonial observance replaces that of the sabbath,' while also holding that 'in Christ's Passover, Sunday fulfills the spiritual truth of the Jewish sabbath and announces man's eternal rest in God' (CCC 2175). The ground given is the resurrection — Sunday as the 'first day,' which the Catechism says 'recalls the first creation,' and as the 'eighth day' following the sabbath, which 'symbolizes the new creation ushered in by Christ's Resurrection' (CCC 2174) — and the continuing moral obligation is described as one 'inscribed by nature in the human heart to render to God an outward, visible, public, and regular worship' (CCC 2176). Catholics are bound to attend Mass on Sundays and holy days. Evangelicals will disagree with the weight this places on the Church's authority to bind the practice; they should not repeat the old claim that Rome simply invented the change and admits it, because that is not what the Catechism says.",
          "Eastern Orthodox Christianity centres its worship on Sunday as the day of the Resurrection, and has never developed a Sabbatarian doctrine transferring the fourth commandment to it. Saturday retains a real liturgical place in the Orthodox week — it is not treated as an ordinary day, and the ancient canons treat it differently from other days with respect to fasting — so the Orthodox pattern is less a transfer than a retention of both days with different meanings.",
          "Judaism keeps Shabbat from sunset on Friday to nightfall on Saturday, and it is the only one of the appointed times written into the Ten Commandments. The rabbinic tradition defines the prohibited work through thirty-nine categories of creative labour derived from the construction of the tabernacle, and suspends them where life or health is at risk. It is worth evangelical readers understanding that observant Jews do not experience this as a burden lifted from Christians: the day is received as delight and as covenant privilege, in the sense Isaiah 58:13-14 gives it, and the home ritual of candles, blessing and meal is the centre of it. Observance varies considerably between Orthodox, Conservative and Reform communities.",
          "Critical scholarship approaches the question differently again, treating the two versions of the commandment — Exodus 20:8-11 grounding it in creation, Deuteronomy 5:12-15 in the exodus — as evidence of distinct sources and traditions rather than two complementary reasons given by one lawgiver, and debating whether the institution has older Near Eastern antecedents. Evangelical scholarship generally reads the doublet as Moses himself supplying a second, pastoral rationale to a new generation, which is how Deuteronomy presents it.",
        ],
      },
    ],
    verses: [
      { reference: "Genesis 2:2-3", note: "God rests on the seventh day and makes it holy" },
      { reference: "Exodus 20:8-11", note: "The Sabbath command, grounded in creation" },
      { reference: "Deuteronomy 5:12-15", note: "The same command, grounded in the exodus from Egypt" },
      { reference: "Exodus 31:13-17", note: "The Sabbath as a covenant sign for Israel" },
      { reference: "Mark 2:23-28", note: "'The Sabbath was made for man, not man for the Sabbath'" },
      { reference: "Luke 13:10-17", note: "Jesus heals a woman on the Sabbath and answers the synagogue ruler" },
      { reference: "Romans 14:5-6", note: "Paul declines to bind consciences over particular days" },
      { reference: "Colossians 2:16-17", note: "Sabbath days as 'a shadow of the things to come'" },
      { reference: "Hebrews 4:9-10", note: "'There remains therefore a Sabbath rest for the people of God'" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Sabbath", url: "https://www.britannica.com/topic/Sabbath-Judaism" },
      { label: "Bible Odyssey (SBL): Sabbath", url: "https://www.bibleodyssey.org/articles/sabbath/" },
      { label: "Catechism of the Catholic Church: The Lord's Day (CCC 2174-2176)", url: "https://www.vatican.va/content/catechism/en/part_three/section_two/chapter_one/article_3/ii_the_lords_day.html" },
      { label: "Catechism of the Catholic Church: The Sabbath Day (CCC 2168-2173)", url: "https://www.vatican.va/content/catechism/en/part_three/section_two/chapter_one/article_3/i_the_sabbath_day.html" },
      { label: "Wikipedia: Westminster Confession of Faith", url: "https://en.wikipedia.org/wiki/Westminster_Confession_of_Faith" },
      { label: "Wikipedia: Sabbatarianism", url: "https://en.wikipedia.org/wiki/Sabbatarianism" },
      { label: "Wikipedia: Seventh Day Baptist", url: "https://en.wikipedia.org/wiki/Seventh_Day_Baptist" },
      { label: "Wikipedia: Seventh-day Adventist Church", url: "https://en.wikipedia.org/wiki/Seventh-day_Adventist_Church" },
      { label: "Wikipedia: Sabbath in Christianity", url: "https://en.wikipedia.org/wiki/Sabbath_in_Christianity" },
      { label: "Wikipedia: Shabbat", url: "https://en.wikipedia.org/wiki/Shabbat" },
    ],
  },
  {
    id: "the-christ",
    name: "the Christ",
    alternateNames: ["Messiah"],
    category: "doctrine",
    role: "The Title 'Anointed One' — Israel's Awaited Deliverer",
    summary:
      "Not a surname but a title: Greek Christos translates Hebrew mashiach, 'anointed one.' Used absolutely — 'the Christ' — it names the deliverer Israel awaited, and the Gospels are built around the question of whether Jesus is he.",
    sections: [
      {
        heading: "A Title, Not a Name",
        paragraphs: [
          "'Christ' is a translation before it is anything else. The Greek Christos renders the Hebrew mashiach, 'anointed one,' and the Gospel of John twice stops to say so for readers who would not have known: Andrew tells Simon 'We have found the Messiah!' and the text adds the gloss '(which is, being interpreted, Christ)' (John 1:41), and the Samaritan woman says 'I know that Messiah comes, he who is called Christ' (John 4:25). These two verses are the only places the World English Bible keeps the Hebrew-derived word rather than translating it.",
          "Anointing with oil marked a person as set apart for an office. Kings were anointed, and so 'Yahweh's anointed' is used repeatedly of a reigning king — David refuses to harm Saul precisely because Saul is 'Yahweh's anointed' (1 Samuel 24:6). Priests were anointed; so, occasionally, were prophets. The word therefore carries no automatic sense of a final or singular figure. When the New Testament uses it absolutely, with the article — 'the Christ' — it is drawing on a narrower and later usage, in which the title had come to name one awaited deliverer in particular.",
        ],
      },
      {
        heading: "What Was Expected",
        paragraphs: [
          "Second Temple Jewish expectation was not uniform, and this is worth stating carefully, because Christian retellings have often flattened it. The surviving sources describe a range of hopes rather than a single agreed programme: a Davidic king who would restore Israel's throne and drive out foreign rule; in some Qumran texts, two anointed figures, one priestly and one royal; in others, a heavenly or pre-existent figure; and in some strands of the literature, deliverance without any messianic person at all. Sources including the Psalms of Solomon, several Dead Sea Scrolls, and later rabbinic material each point in somewhat different directions.",
          "The Gospels reflect this unsettledness in their own way. The crowd at John 12:34 objects that 'we have heard out of the law that the Christ remains forever' and cannot square that with talk of the Son of Man being lifted up. Saying the expectation was varied is not the same as saying it was empty: this app writes from a Protestant evangelical position, and holds that the Old Testament genuinely anticipates a coming deliverer and that Jesus is he. What the variety establishes is that no single tidy checklist was sitting there waiting to be ticked off, which is part of why the identification was contested at the time and why the apostles argued for it from the Scriptures rather than simply pointing.",
        ],
      },
      {
        heading: "The Question the Gospels Are Built Around",
        paragraphs: [
          "'The Christ' functions in the Gospels less as a description than as a question put to the reader. Jesus asks the disciples directly who they say he is, and Peter answers 'You are the Christ' (Mark 8:29) — 'the Christ, the Son of the living God' in Matthew 16:16 — and is immediately told to say nothing about it. At his trial the high priest asks 'Are you the Christ, the Son of the Blessed?' (Mark 14:61), and the answer becomes the ground of the charge against him. John states the purpose of his whole book in these terms: 'these are written, that you may believe that Jesus is the Christ, the Son of God' (John 20:31). After the resurrection Peter's Pentecost sermon puts it as a divine verdict rather than a human recognition: 'God has made him both Lord and Christ, this Jesus whom you crucified' (Acts 2:36).",
          "One reason the identification was contested at the time is that the expectations sketched above ran mostly toward a victorious king, and a crucified claimant fit none of them. Paul says as much when he calls the message 'a stumbling block to Jews, and foolishness to Greeks.' Over the following decades the title attached to Jesus so firmly that it began to function as a name — 'Jesus Christ,' 'Christ Jesus' — which is how most English readers first meet the word, and why its force as a title has to be recovered deliberately.",
        ],
      },
      {
        heading: "How Others Read the Same Texts",
        paragraphs: [
          "On this article's central claim there is no Protestant distinctive to defend: Roman Catholic and Eastern Orthodox Christians confess that Jesus is the Christ in exactly the terms the creeds use, and the disagreements between those traditions and evangelicals lie elsewhere — authority, sacraments, justification — not here. The two readings that genuinely differ from this article's are Jewish interpretation and critical scholarship, and both deserve to be represented as their own adherents would recognise them.",
          "Judaism does not accept the identification, and the reasons are principled rather than perverse. The messianic hope in Jewish tradition is tied to visible, unrealised outcomes — the ingathering of the exiles, a rebuilt temple, universal peace and knowledge of God — and on that reading a claimant who died without those things having happened has not fulfilled the office, whatever else may be said about him. Particular texts are read differently as a matter of course: the servant of Isaiah 53 is widely read in Jewish interpretation as Israel itself rather than an individual. Daniel 9:25-26's 'anointed one' is referred elsewhere too, though the strands should not be run together: candidates proposed for the prince of verse 25 include Cyrus, while the anointed one 'cut off' in verse 26 is, in mainstream critical scholarship rather than specifically Jewish tradition, generally identified with the high priest Onias III, murdered in 171/170 BC. Evangelicals disagree with these readings and argue against them from the texts; they should not describe them as evasions, and should be aware that supersessionist caricature has a long and ugly history behind it.",
          "Critical scholarship, for its part, tends to emphasise the diversity of Second Temple expectation described above, and to treat the early church's messianic reading of the Old Testament as a retrospective interpretation developed to make sense of a crucified leader. Evangelical scholarship answers that the apostolic reading is continuous with how the texts were already being read, that Jesus himself taught it (Luke 24:27, 24:44-46), and that the resurrection is the event that makes the reading possible rather than a decoration added to it.",
          "A note on linking, since it is visible in the app: this article deliberately does not attach itself to Daniel 9:25-26. Evangelicals overwhelmingly read that passage as messianic, but they differ sharply among themselves over the seventy weeks — how the weeks are counted, whether the seventieth is continuous with the rest or still future, and what the 'cut off' of the Anointed One dates. Linking the verses here would imply the app had settled a scheme it has not. The passage is discussed above instead.",
        ],
      },
    ],
    verses: [
      { reference: "1 Samuel 24:6", note: "Saul as 'Yahweh's anointed' — the title used of a reigning king" },
      { reference: "John 1:41", note: "'We have found the Messiah!' glossed as 'Christ'" },
      { reference: "John 4:25-26", note: "The Samaritan woman on the coming Messiah" },
      { reference: "Mark 8:29-30", note: "Peter's confession, followed by a command to silence" },
      { reference: "Matthew 16:16", note: "'You are the Christ, the Son of the living God'" },
      { reference: "Mark 14:61-62", note: "The high priest's question at the trial" },
      { reference: "John 12:34", note: "The crowd's objection that 'the Christ remains forever'" },
      { reference: "John 20:31", note: "John states the purpose of his Gospel in these terms" },
      { reference: "Acts 2:36", note: "'God has made him both Lord and Christ'" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Messiah", url: "https://www.britannica.com/topic/messiah-religion" },
      { label: "Wikipedia: Messiah", url: "https://en.wikipedia.org/wiki/Messiah" },
      { label: "Wikipedia: Jewish messianism", url: "https://en.wikipedia.org/wiki/Jewish_messianism" },
      { label: "Wikipedia: Prophecy of Seventy Weeks", url: "https://en.wikipedia.org/wiki/Prophecy_of_Seventy_Weeks" },
    ],
  },
  {
    id: "son-of-man",
    name: "Son of Man",
    category: "doctrine",
    role: "The Title Jesus Most Often Uses of Himself",
    summary:
      "The phrase Jesus uses of himself more than any other in the Gospels — and one whose force is genuinely disputed, because in the Old Testament the same words can mean simply 'a human being,' while Daniel 7 gives them to a figure who comes with the clouds and receives an everlasting kingdom.",
    sections: [
      {
        heading: "The Phrase Before the Gospels",
        paragraphs: [
          "In the Old Testament the phrase most often means, plainly, a human being. Psalms 8:4 sets it in poetic parallel with 'man': 'what is man, that you think of him? What is the son of man, that you care for him?' Ezekiel uses it more than ninety times, and always as God's form of address to the prophet himself — 'Son of man, stand on your feet, and I will speak with you' (Ezekiel 2:1) — where it marks Ezekiel's creatureliness over against the God who is speaking. Neither usage is a title, and neither is about Jesus — Ezekiel is being reminded that he is a man. The app does not link those occurrences here.",
          "Daniel 7:13-14 is the exception that generates the whole discussion. In a night vision 'there came with the clouds of the sky one like a son of man,' who is brought before the Ancient of Days and given 'dominion, and glory, and a kingdom, that all the peoples, nations, and languages should serve him.' The wording is careful — 'one like a son of man,' a figure in human form rather than a man simply — and the dominion given him is everlasting. Evangelical interpretation has consistently understood this figure as the Messiah, and understood Jesus to be claiming to be him; that is the reading this article works from, and the trial scene below is the strongest reason for it. What a first-century hearer would have made of the passage, and whether Daniel's figure is an individual or a symbol, are discussed further down.",
        ],
      },
      {
        heading: "How Jesus Uses It",
        paragraphs: [
          "In the Gospels the phrase appears roughly eighty times and, with very few exceptions, on Jesus's own lips. No one addresses him by it, and no one else applies it to him: when the crowd uses it at John 12:34 they are repeating his words back to him and asking what he means — 'Who is this Son of Man?' Outside the Gospels it is rare; the one clear instance of someone else using it of Jesus is Stephen's dying vision, 'I see the heavens opened, and the Son of Man standing at the right hand of God' (Acts 7:56).",
          "Interpreters commonly sort the sayings into three groups. Some concern authority in the present ministry — 'the Son of Man has authority on earth to forgive sins' (Mark 2:10), and 'the Son of Man is lord even of the Sabbath' (Mark 2:28). Some predict suffering and vindication — 'the Son of Man must suffer many things, and be rejected by the elders, the chief priests, and the scribes, and be killed, and after three days rise again' (Mark 8:31), and 'the Son of Man also came not to be served, but to serve, and to give his life as a ransom for many' (Mark 10:45). Some describe a future coming in glory — 'when the Son of Man comes in his glory, and all the holy angels with him' (Matthew 25:31).",
          "The trial scene brings the strands together. Asked directly whether he is the Christ, Jesus answers 'I am. You will see the Son of Man sitting at the right hand of Power, and coming with the clouds of the sky' (Mark 14:62) — language drawn from Daniel 7:13 and Psalms 110:1 together. Whatever else is disputed, the narrative presents the high priest as hearing that answer as a claim serious enough to end the questioning.",
        ],
      },
      {
        heading: "What the Title Claims",
        paragraphs: [
          "Read from an evangelical position, 'the Son of Man' is a title and a deliberate one. The definite article is doing work — Jesus says 'the Son of Man,' not 'a son of man' — and the sayings cluster around exactly the three things Daniel 7 and the rest of Scripture would lead a reader to expect of the figure who receives an everlasting kingdom: present authority that belongs properly to God (forgiving sins, Mark 2:10; lordship over the Sabbath, Mark 2:28), a path to that kingdom through suffering and resurrection (Mark 8:31; Mark 10:45), and a return in glory to judge (Matthew 25:31).",
          "The trial is where the claim becomes unmistakable. Asked directly whether he is the Christ, Jesus answers 'I am' and then adds Daniel 7:13 and Psalms 110:1 together: 'You will see the Son of Man sitting at the right hand of Power, and coming with the clouds of the sky' (Mark 14:62). The high priest's reaction — tearing his clothes and calling it blasphemy — is the best available evidence of how the words landed on a hostile first-century expert. A modest, self-effacing turn of phrase does not produce that response. It is also striking that the title is almost exclusively on Jesus's own lips: no one addresses him by it, and outside the Gospels only Stephen uses it of him (Acts 7:56). That distribution is itself an argument, because a title invented by the later church would be expected to show up in the letters, where it is essentially absent.",
        ],
      },
      {
        heading: "Other Readings, and an Open Question Among Evangelicals",
        paragraphs: [
          "A large body of critical scholarship reads the phrase differently, and the case deserves to be stated properly rather than waved at. In Aramaic, bar nasha could function as an ordinary expression for 'a human being,' or as an oblique way of saying 'someone in my position,' or possibly simply 'I.' Geza Vermes argued this case at length, and on that reading Jesus was speaking idiomatically or modestly and the titular, Danielic sense was supplied afterwards by Greek-speaking churches. Others, following a line associated with Rudolf Bultmann, divide the sayings and treat only some as authentic — commonly holding that Jesus spoke of a coming Son of Man he did not identify with himself, and that the identification came later.",
          "The evangelical reply is not that these scholars are careless but that the evidence runs the other way. The consistent definite article tells against a generic idiom. The title's near-absence from the epistles tells against a church invention. The trial charge makes sense only if the words carried a claim — Darrell Bock's 'Blasphemy and Exaltation in Judaism: The Charge against Jesus in Mark 14:53-65' is the standard evangelical treatment, and argues the scene is historically credible in its Jewish setting. And the specific weak point in the idiom case is worth naming: the claim that the emphatic Aramaic form was used in the first century simply to mean 'I' has never been supported by an actual example in a relevant text, which is a criticism made well beyond evangelical circles.",
          "One question inside this article is genuinely open among evangelicals, and it should not be flattened. Daniel 7:18 and 7:27 give the everlasting kingdom to 'the saints of the Most High' and to 'the people of the saints of the Most High,' which is corporate language about faithful Israel. Some evangelical interpreters read the 'one like a son of man' as an individual figure straightforwardly, with the corporate verses describing those who reign with him. Others read him representatively — an individual precisely as the head and representative of his people, so that what is given to him is given to them in him, on the pattern of Adam and of the Davidic king. A minority read the figure as primarily a corporate symbol that Jesus then takes onto himself. All three affirm that Jesus is the one Daniel saw; they differ on how the individual and corporate strands in Daniel 7 relate. This article does not choose between them.",
        ],
      },
    ],
    verses: [
      { reference: "Psalms 8:4", note: "'Son of man' in poetic parallel with 'man' — a human being" },
      { reference: "Ezekiel 2:1", note: "God's habitual form of address to the prophet Ezekiel" },
      { reference: "Daniel 7:13-14", note: "'One like a son of man' given everlasting dominion" },
      { reference: "Mark 2:10", note: "Authority on earth to forgive sins" },
      { reference: "Mark 2:28", note: "'Lord even of the Sabbath'" },
      { reference: "Mark 8:31", note: "The first prediction of suffering, rejection and rising" },
      { reference: "Mark 10:45", note: "'To give his life as a ransom for many'" },
      { reference: "Matthew 25:31", note: "The Son of Man coming in glory to judge" },
      { reference: "Mark 14:61-62", note: "The trial answer, joining Daniel 7 and Psalms 110" },
      { reference: "John 12:34", note: "The crowd asks 'Who is this Son of Man?'" },
      { reference: "Acts 7:56", note: "Stephen's vision — the one clear use by someone other than Jesus" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Son of Man", url: "https://www.britannica.com/topic/Son-of-Man-Christianity" },
      { label: "Wikipedia: Son of man (Christianity)", url: "https://en.wikipedia.org/wiki/Son_of_man_(Christianity)" },
      { label: "Wikipedia: Son of man (the phrase across the traditions)", url: "https://en.wikipedia.org/wiki/Son_of_man" },
      { label: "Darrell L. Bock, Blasphemy and Exaltation in Judaism (Internet Archive)", url: "https://archive.org/details/blasphemyexaltat0000darr" },
    ],
  },
  {
    id: "jewish-elders",
    name: "elders",
    category: "people-group",
    role: "The Lay Senior Men of Israel's Leadership",
    summary:
      "The senior laymen who shared Israel's leadership from the wilderness onward, and who in the Gospels form one of the three groups — with the chief priests and the scribes — named again and again as the body that moved against Jesus.",
    sections: [
      {
        heading: "Elders in Israel",
        paragraphs: [
          "Long before there were kings or a temple establishment, Israel had elders. Moses is told to 'gather the elders of Israel together' to hear that God has seen the affliction in Egypt (Exodus 3:16), and later to gather 'seventy men of the elders of Israel' to share the burden of leading the people (Numbers 11:16-17). Through Deuteronomy, Joshua, Judges and Ruth they appear as the settled local authority of a town — hearing disputes at the gate, witnessing legal transactions, and representing the community. The office is not priestly and not prophetic; it is the standing of senior men whose age, family and reputation gave them a recognised say.",
        ],
      },
      {
        heading: "The Elders in the Gospels",
        paragraphs: [
          "By the first century 'the elders' in Jerusalem denotes the lay aristocracy who sat in the council alongside the priestly leadership, and the Gospels almost always name them as part of a group rather than alone. The formula recurs with slight variations: Jesus 'must go to Jerusalem and suffer many things from the elders, chief priests, and scribes' (Matthew 16:21); he 'must suffer many things, and be rejected by the elders, the chief priests, and the scribes' (Mark 8:31). Luke 22:66 describes the body plainly — 'the assembly of the elders of the people was gathered together, both chief priests and scribes' — and it is this assembly that hands Jesus to Pilate.",
          "The elders also stand behind the phrase 'the tradition of the elders,' the accumulated body of oral interpretation that governed matters such as ritual handwashing, and which is the point at issue when the Pharisees challenge Jesus's disciples (Matthew 15:2; Mark 7:3-5). In Acts they appear in the same coalition opposing the apostles — 'their rulers, elders, and scribes were gathered together in Jerusalem' (Acts 4:5).",
        ],
      },
      {
        heading: "A Note on the Word",
        paragraphs: [
          "The same English word does duty for two quite different things in the New Testament, and this article is only about the first. Alongside the Jewish elders above, the letters and the later chapters of Acts use 'elders' for an office in the Christian congregations — Paul and Barnabas 'appointed elders for them in every assembly' (Acts 14:23), Titus is told to 'appoint elders in every city' (Titus 1:5), and 1 Timothy 5:17 describes elders who 'rule well.' Revelation's twenty-four elders around the throne are a third thing again. Those senses are not covered here, and the app does not link them to this page.",
        ],
      },
    ],
    verses: [
      { reference: "Exodus 3:16", note: "Moses told to gather the elders of Israel" },
      { reference: "Numbers 11:16-17", note: "Seventy elders share the burden of leadership" },
      { reference: "Matthew 15:2", note: "'The tradition of the elders'" },
      { reference: "Matthew 16:21", note: "Elders, chief priests and scribes named together" },
      { reference: "Mark 8:31", note: "The Son of Man rejected by the elders, chief priests and scribes" },
      { reference: "Luke 22:66", note: "The assembly of the elders gathers at daybreak" },
      { reference: "Acts 4:5", note: "Rulers, elders and scribes gathered against the apostles" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Sanhedrin", url: "https://www.britannica.com/topic/sanhedrin" }],
  },
  {
    id: "chief-priests",
    name: "chief priests",
    // Plural only, deliberately. The plural occurs exclusively in Matthew, Mark, Luke, John and
    // Acts, and always means this collective. The SINGULAR "chief priest" is a different thing —
    // it names the high priest as an individual office at 2 Kings 25:18, 2 Chronicles 19:11,
    // 24:11, 26:20, 31:10, Ezra 7:5 and Jeremiah 52:24 — so registering it would point seven Old
    // Testament mentions of one man at an article about a first-century group.
    category: "people-group",
    role: "The Senior Temple Priesthood in Jerusalem",
    summary:
      "The senior priestly officials of the Jerusalem temple — the serving high priest, those who had held the office before him, and the heads of the priestly families — who controlled the temple and led the proceedings against Jesus and, later, the apostles.",
    sections: [
      {
        heading: "Who They Were",
        paragraphs: [
          "'Chief priests' is a collective term rather than a single office. It covers the reigning high priest, former high priests still alive and influential (Annas, deposed by Rome but still powerful while his son-in-law Caiaphas served, is the clearest case), and the heads of the twenty-four priestly courses along with senior temple officers such as the captain of the temple. Under Roman rule the high priesthood was in the governor's gift, which tied the group's standing directly to keeping order — a pressure the Gospels show operating.",
          "Their base was the temple and their interests were bound up with it. In Jesus's day the leading priestly families were largely Sadducean in outlook, which is why the chief priests and the Sadducees often appear together in Acts, and why the group disappears from history with the temple's destruction in AD 70.",
        ],
      },
      {
        heading: "In the Gospels and Acts",
        paragraphs: [
          "The chief priests appear at almost every stage of the passion narrative: taking counsel against Jesus (Matthew 27:1), receiving Judas and paying him, sending the armed party to arrest him, presenting the case before Pilate, and persuading the crowd to ask for Barabbas (Matthew 27:20). They are named with the elders and the scribes in the recurring formula for the body that rejected him (Mark 8:31).",
          "In Acts they continue as the principal opposition to the apostles, and the reason given is specific: the priestly leadership was 'upset because they taught the people and proclaimed in Jesus the resurrection from the dead' (Acts 4:1-2), a doctrine the Sadducean party denied. Paul is brought before them, and it is the high priest Ananias who comes down to Caesarea with elders to press the charge against him (Acts 24:1).",
        ],
      },
    ],
    verses: [
      { reference: "Matthew 26:3-4", note: "The chief priests, scribes and elders take counsel" },
      { reference: "Matthew 27:1", note: "The chief priests and elders take counsel to put Jesus to death" },
      { reference: "Matthew 27:20", note: "The chief priests persuade the crowd to ask for Barabbas" },
      { reference: "Mark 14:53", note: "All the chief priests, elders and scribes assemble at the high priest's house" },
      { reference: "Acts 4:1-2", note: "The priestly leadership annoyed at the preaching of the resurrection" },
      { reference: "Acts 24:1", note: "The high priest Ananias brings the charge against Paul" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: High Priest", url: "https://www.britannica.com/topic/high-priest" }],
  },
  {
    id: "scribes",
    name: "scribes",
    category: "people-group",
    role: "Professional Experts in the Law",
    summary:
      "The trained writers and legal specialists of Israel — royal secretaries and copyists in the Old Testament, and by the first century the professional interpreters of the Law whose expertise made them a standing presence in the councils that opposed Jesus.",
    sections: [
      {
        heading: "From Secretaries to Scholars",
        paragraphs: [
          "In the Old Testament a scribe is first of all someone who writes: a royal secretary keeping the king's records, an officer mustering an army, a copyist. Baruch writes Jeremiah's dictated scroll; scribes appear in the administrations of David, Hezekiah and Josiah. The pivot toward scholarship is associated above all with Ezra, described as 'a skilled scribe in the law of Moses,' who had 'set his heart to seek Yahweh's law, and to do it, and to teach statutes and ordinances in Israel' (Ezra 7:6, 7:10).",
          "By the New Testament period the word denotes a profession of learned interpreters of the Law — men who knew the text, its precedents and its applications, and were consulted accordingly. When Herod wants to know where the Messiah is to be born, it is 'all the chief priests and scribes of the people' he assembles to ask (Matthew 2:4), and they answer from Micah. Scribes were not a sect: they are frequently associated with the Pharisees, whose programme their expertise served, but the Gospels also speak of scribes attached to the chief priests, and the two groupings should not be collapsed into one.",
        ],
      },
      {
        heading: "In the Gospels",
        paragraphs: [
          "Scribes appear constantly as Jesus's questioners and critics, and they are named in the standard triad of the body that rejects him (Mark 8:31; Matthew 16:21). Mark notes at the end of the Sermon-like teaching in Capernaum that the crowds were astonished because Jesus 'taught them as having authority, and not as the scribes' — a contrast between a teacher who spoke on his own authority and a profession whose method was to cite precedent.",
          "The Gospels' portrait is not uniformly hostile. One scribe asks which commandment is greatest, agrees warmly with the answer, and is told he is 'not far from God's Kingdom' (Mark 12:28-34). But the sustained critique in Matthew 23, delivered against 'scribes and Pharisees,' is severe, and it is directed at a gap between the meticulous knowledge of the Law and the practice of justice and mercy.",
        ],
      },
    ],
    verses: [
      { reference: "Ezra 7:6-10", note: "Ezra, 'a skilled scribe in the law of Moses'" },
      { reference: "Matthew 2:4", note: "Herod assembles the chief priests and scribes" },
      { reference: "Mark 1:22", note: "Jesus taught 'as having authority, and not as the scribes'" },
      { reference: "Mark 8:31", note: "Scribes named in the triad that rejects the Son of Man" },
      { reference: "Mark 12:28-34", note: "A scribe told he is 'not far from God's Kingdom'" },
      { reference: "Matthew 23:1-36", note: "The sustained rebuke of 'scribes and Pharisees'" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Scribe", url: "https://www.britannica.com/topic/scribe" }],
  },
  {
    id: "pharisees-and-sadducees-compared",
    name: "Pharisees and Sadducees Compared",
    // No alternateNames. Registering "Pharisees and Sadducees" would match Matthew 3:7, 16:1, 16:6,
    // 16:11, 16:12 and Acts 23:7 and — being the longer name — would win over "Pharisees" and
    // "Sadducees" there, collapsing two sect links into one comparison link in the Bible reader.
    // That is a reader-facing change to Scripture links nobody asked for. This article is reached
    // from the two sect articles, which name it in full.
    category: "people-group",
    role: "The Two Great Jewish Parties Side by Side",
    summary:
      "The two parties are named together so often that they can blur into a single opposition bloc. They were not. They differed on what counts as Scripture, on the resurrection, on where authority sits, on who belonged to them — and only one of them survived the year 70.",
    sections: [
      {
        heading: "Why They Get Confused",
        paragraphs: [
          "Matthew in particular pairs them — 'Pharisees and Sadducees' come together to test Jesus, and he warns the disciples against 'the yeast of the Pharisees and Sadducees' (Matthew 16:1-12) — and a reader can come away with the impression of one hostile establishment with two names. The Gospels themselves supply the correction in Acts 23, where Paul, on trial before a council containing both, says he is on trial 'concerning the hope and resurrection of the dead,' and the room divides against itself: 'an argument arose between the Pharisees and Sadducees, and the crowd was divided' (Acts 23:7). The two groups had a real and bitter quarrel, and Paul knew exactly where the fault line ran.",
        ],
      },
      {
        heading: "Where They Differed",
        paragraphs: [
          "Scripture. The Sadducees, by the consistent report of ancient sources, accorded full authority to the written Law of Moses and rejected the binding force of the oral tradition. The Pharisees held that an oral tradition, transmitted alongside the written Law and applying it to daily life, was authoritative too — the 'tradition of the elders' the Gospels mention (Matthew 15:2; Mark 7:3). Whether the Sadducees rejected the Prophets and Writings outright, or merely denied them the Law's authority, is disputed; the ancient testimony on the point comes largely from their opponents and from Josephus, and modern scholars read it in more than one way.",
          "The resurrection, angels and spirits. Acts states the difference in a single sentence: 'the Sadducees say that there is no resurrection, nor angel, nor spirit; but the Pharisees confess all of these' (Acts 23:8). This is the fault line Paul exploits, and it explains why the priestly leadership was 'upset' at apostles preaching resurrection (Acts 4:1-2) in a way the Pharisees were not — Gamaliel, a Pharisee, counsels the council toward restraint instead (Acts 5:34-39).",
          "Where their power sat. The Sadducees were an aristocratic, priestly party whose base was the temple and its administration, and whose position depended on a working arrangement with Rome. The Pharisees were a largely lay movement, closer to the synagogue and the study of the Law than to the altar, and considerably more popular with ordinary people. That difference decided their futures.",
          "Fate after AD 70. When the temple was destroyed, the Sadducees lost the institution their identity and influence rested on, and they disappear from history. Pharisaic emphases — Torah study, oral tradition, a piety that needed no single building — carried on and are generally regarded as a principal root of the rabbinic Judaism that followed. This is the single most important thing to know about the pair, and it is invisible if they are treated as interchangeable.",
        ],
      },
      {
        heading: "Where They Overlapped",
        paragraphs: [
          "Both sat in the council, both belonged to the Jerusalem leadership, and both are shown opposing Jesus, though the Gospels weight them differently: the Pharisees dominate the disputes over Sabbath, purity and table fellowship during the ministry, while the Sadducean temple establishment is more prominent in the arrest and trial. Neither group was monolithic. Nicodemus and Gamaliel are Pharisees who come off well in the New Testament's own telling, and the movement Paul belonged to before his conversion was the Pharisees, not their rivals (Acts 23:6).",
          "A caution about sources belongs here, and it cuts a particular way. Nearly everything known about the Sadducees comes from people who were not Sadducees — the New Testament, Josephus, and later rabbinic literature descended from their opponents. No Sadducean writing survives. This app takes the New Testament's account as accurate, and it is worth noting that it is corroborated at the decisive point by Josephus, who was not a Christian and had no stake in Luke's argument: he too reports the Sadducees denying the survival of the soul and rejecting the oral tradition. What the thinness of the sources should make a reader cautious about is not the main outline but the sharper characterisations — the Sadducees' inner motives, their private convictions, and how far any individual matched the party description.",
        ],
      },
    ],
    verses: [
      { reference: "Matthew 16:1-12", note: "The two parties paired, and 'the yeast of the Pharisees and Sadducees'" },
      { reference: "Acts 23:6-10", note: "Paul divides the council along the resurrection fault line" },
      { reference: "Acts 23:8", note: "The doctrinal difference stated in one sentence" },
      { reference: "Acts 4:1-2", note: "The Sadducean temple leadership annoyed at resurrection preaching" },
      { reference: "Acts 5:34-39", note: "Gamaliel the Pharisee counsels restraint" },
      { reference: "Matthew 15:1-9", note: "The dispute over the tradition of the elders" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Pharisee", url: "https://www.britannica.com/topic/Pharisee" },
      { label: "Encyclopaedia Britannica: Sadducee", url: "https://www.britannica.com/topic/Sadducee" },
    ],
  },
  {
    id: "caiaphas-ossuary",
    name: "Caiaphas Ossuary",
    // NOT registered: "Caiaphas" — that is the high priest, who already owns it in people.ts.
    alternateNames: ["Joseph son of Caiaphas Ossuary"],
    category: "discovery",
    role: "An Inscribed Limestone Bone Box from a First-Century Jerusalem Tomb",
    summary:
      "A carved ossuary from a tomb a bulldozer opened in 1990, inscribed twice with the family name of the high priest who handed Jesus to Pilate. Whose bones it held is a better question than most retellings allow.",
    sections: [
      {
        heading: "A Bulldozer Opened It",
        paragraphs: [
          "In November 1990 a bulldozer cutting a road for a recreation park in the Peace Forest, on the southern edge of Jerusalem near North Talpiot, broke through the roof of a rock-cut burial cave. The construction superintendent stopped work and reported it, and the Israel Antiquities Authority sent Z. Greenhut to excavate what was left. What was left was already disturbed: twelve limestone ossuaries lay in four burial niches, six of them displaced, some by robbers in antiquity and some by the machine. A good deal of the archaeology of Jerusalem happens exactly this way, because the living city is built on top of its own cemeteries and the archaeologist arrives after the digger.",
          "Greenhut published the tomb in the journal 'Atiqot in 1992, and R. Reich published its inscriptions in the same volume. The most elaborate of the boxes was carved with rosettes and carried a name scratched into the stone twice, once on a plain long side and once on the decorated narrow end. Inside were the remains of six people: two infants, a young child, a teenage boy, an adult woman, and a man of about sixty. The ossuary is in the Israel Museum in Jerusalem today. The bones were reburied on the Mount of Olives, as Israeli practice requires.",
        ],
      },
      {
        heading: "The Name Cut Twice",
        paragraphs: [
          "The two inscriptions do not spell the name the same way. One reads Yehosef bar Qafa; the other gives a fuller form of the family name, Qayafa. Both are Aramaic forms of the name that reaches the New Testament in Greek as Kaiaphas; Josephus, writing in Greek, calls the high priest of those years Ioseph, also known as Kaiaphas. Before 1990 the family was known only from texts. It is now known from a tomb as well, and the tomb is in the right city, in the right century, in the burial style the priestly families of Jerusalem used — a body left in a niche for a year, then the bones gathered into a limestone box and the niche reused.",
          "A second object has since filled in the family picture without settling anything about this box. In 2011 the Israel Antiquities Authority authenticated an ossuary seized from antiquities robbers in the Elah Valley, inscribed for a woman named as the daughter of a son of Qayafa, and describing the family as priests of the course of Maaziah from Beth Imri. That is a priestly course, one of the twenty-four rotations that served in the temple, and it attaches the family to the temple establishment independently of the Gospels. It is also unprovenanced — taken from thieves, not from a floor — which limits what can be built on it.",
        ],
      },
      {
        heading: "Whose Bones?",
        paragraphs: [
          "This is where the popular retelling stops and the scholarship starts. Nothing on the box says high priest. The phrase Yehosef bar Qafa need not even mean that Qafa was his father: R. Reich has pointed out that it reads just as naturally as Yehosef of the Qafa family, a family nickname rather than a patronymic. And the high priest of the Gospels was one man in a priestly dynasty in which that first name recurs. A grandfather and a grandson would each have been a Yehosef of the Qafa family too.",
          "E. Puech has argued against the identification on two grounds: the Aramaic word for the priest is missing from an inscription where a high priest's family might be expected to use it, and the tomb as a whole is plainer than a high-priestly family tomb ought to be. Others have questioned the reading itself, since the letters are lightly and informally cut — probably by relatives rather than by the workshop — and in a name this rare it is genuinely hard to tell a yod from a waw. On the other side, C. A. Evans, who thinks the identification likely, still writes that it could be the ossuary of the high priest, and the word carrying that sentence is could. H. K. Bond's book-length study of Caiaphas is where the whole question is set out at length rather than asserted in a line.",
          "Here is the app's own position, and the two halves of it are not the same size. The family identification is strong and should be stated plainly: this is a burial cave of the Qafa family, and that family is the one the Gospels and Josephus name. Whether the sixty-year-old man in the decorated box is the high priest who questioned Jesus is a further step, and it is a step the evidence permits rather than compels. It is worth noticing how much the careful version still gives a reader. The Gospels put a named, datable, locatable human being at the head of the temple establishment in Jerusalem, and the ground under a public park in the same city gave up his family's bone boxes. That does not establish that anything the Gospels narrate took place. It is the ordinary texture of a real place in a real century — which is what a document telling the truth about the world it describes tends to leave lying around.",
        ],
      },
    ],
    verses: [
      { reference: "Luke 3:2", note: "Dating the start of John's ministry by the high priesthood of Annas and Caiaphas" },
      { reference: "Matthew 26:3", note: "The chief priests gather in the court of the high priest" },
      { reference: "Matthew 26:57", note: "Jesus taken to Caiaphas" },
      { reference: "John 11:49-50", note: "Better that one man die for the people" },
      { reference: "John 18:13-14", note: "Annas as father-in-law of Caiaphas — the family, not just the man" },
      { reference: "Acts 4:6", note: "The high-priestly family named together after the resurrection" },
    ],
    sources: [
      { label: "Wikipedia: Caiaphas ossuary", url: "https://en.wikipedia.org/wiki/Caiaphas_ossuary" },
      { label: "Israel Museum, Jerusalem: Ossuary of Caiaphas", url: "https://www.imj.org.il/en/exhibitions/ossuary-caiaphas-high-priest-18-36-ce" },
    ],
    discovery: {
      objectType: "An ornately carved limestone ossuary, about 75 cm long, inscribed twice with a form of the family name Qafa / Qayafa",
      findSite: "A rock-cut family burial cave in the Peace Forest, North Talpiot, southern Jerusalem",
      findSiteId: "jerusalem",
      findSiteKind: "location",
      foundYear: "November 1990",
      foundBy: "No archaeologist found it. A bulldozer cutting a park road broke into the tomb; the Israel Antiquities Authority then sent Z. Greenhut to excavate it",
      objectDate: "First century AD — within the roughly ninety years when Jerusalem buried its dead in ossuaries, c. 20 BC to AD 70",
      objectDateCertainty: "traditional",
      currentLocation: "Israel Museum, Jerusalem. The bones it held were reburied on the Mount of Olives",
    },
    citations: [
      {
        tier: "institution",
        label: "Israel Museum, Jerusalem — Ossuary of Caiaphas the High Priest",
        url: "https://www.imj.org.il/en/exhibitions/ossuary-caiaphas-high-priest-18-36-ce",
        credit: "The Israel Museum, Jerusalem",
        detail: "The holding institution's own page, describing the object as coming from a family burial cave in southern Jerusalem bearing the name Joseph bar Caiaphas",
        supports: "Current location and the museum's own description of the object",
      },
      {
        tier: "scholarly",
        label: "Z. Greenhut, \"The 'Caiaphas' Tomb in North Talpiyot, Jerusalem\"",
        credit: "Zvi Greenhut, Israel Antiquities Authority",
        detail: "'Atiqot 21 (1992), 63-71 — the excavation report. The IAA's free online 'Atiqot archive begins at much later volumes, so no URL is given rather than a guessed one",
        supports: "Discovery circumstances, the tomb plan, the twelve ossuaries and their contents",
      },
      {
        tier: "scholarly",
        label: "R. Reich, \"Ossuary Inscriptions from the 'Caiaphas' Tomb\"",
        credit: "Ronny Reich",
        detail: "'Atiqot 21 (1992), 72-77 — the epigraphic publication, including the reading of the name as a family name rather than necessarily a patronymic",
        supports: "The two spellings of the name and how the phrase should be construed",
      },
      {
        tier: "scholarly",
        label: "H. K. Bond, Caiaphas: Friend of Rome and Judge of Jesus?",
        credit: "Helen K. Bond",
        detail: "Westminster John Knox Press, 2004 — the standard book-length treatment, where the objections to the identification are laid out in full",
        supports: "That the identification is treated as an open question in the scholarship, not a settled one",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Caiaphas ossuary",
        url: "https://en.wikipedia.org/wiki/Caiaphas_ossuary",
      },
    ],
    reflectionPrompt:
      "The man who said it was better for one man to die for the people was more right than he knew. Where has God used a decision made for entirely the wrong reasons?",
  },
  {
    id: "pilate-ring",
    name: "Pilate Ring",
    // NOT registered: "Pilate" — that is Pontius Pilate the person, who already owns it.
    category: "discovery",
    role: "A Copper-Alloy Sealing Ring with a Contested Greek Inscription",
    summary:
      "A cheap ring dug at Herodium in 1968, cleaned and read fifty years later as \"of Pilate\" — a reading one team of specialists rejected outright in 2023 and another defended in 2026. Even the people who published it never claimed it was Pilate's own.",
    sections: [
      {
        heading: "Fifty Years in a Storeroom",
        paragraphs: [
          "The ring came out of the ground at Herodium in the 1968-69 season, in the excavation directed by G. Foerster, and then did what most small metal finds do: it went into a box. It was cleaned and examined only decades later, and published in the Israel Exploration Journal in 2018 by S. Amorai-Stark, M. Hershkovitz, G. Foerster, Y. Kalman, R. Chachy and R. Porat. Their title tells you what they thought the object was — an inscribed copper-alloy finger ring depicting a krater. It is small, about 1.3 cm high, made of a cheap alloy, and engraved with a two-handled vessel framed by Greek letters. L. Di Segni read the letters as Pilato, which in that form would mean of Pilate.",
          "The press reported that Pontius Pilate's ring had been found. The excavation report said something close to the opposite. Its authors noted that it is unlikely the powerful and wealthy prefect of Judea would have worn a thin, all copper-alloy sealing ring, and that the material and the findspot fit a Jewish owner better than a Roman one. That gap between the report and the headline is worth keeping in view for the rest of this article, because almost every popular account of the ring is downstream of the headline.",
        ],
      },
      {
        heading: "What It Would Mean If the Reading Holds",
        paragraphs: [
          "A sealing ring is an administrative tool, not a status symbol, and it did not have to belong to the person whose name it carried. Its purpose is to press a name into wax or soft clay closing a jar, a bag or a document. A ring reading of Pilate, or for Pilate, is what a clerk, a steward or a slave in the orbit of the governor's administration would use to mark material moving to or from him. That is the reading C. E. Bonesho argued for in the Palestine Exploration Quarterly in 2026: she takes the omicron not as a misspelled Greek genitive but as the Latin dative PILATO transliterated into Greek letters by an engraver whose Latin was elementary, the Latin O and the Greek omicron being easy to confuse. On that reading the wearer was most likely an enslaved or formerly enslaved person in the household of a local Judean notable who had some part in the administrative work of Roman Judea.",
          "It is worth being clear what this would and would not add. Pontius Pilate is not a figure whose existence depends on the ring. He is named on a limestone block found at Caesarea Maritima in 1961 that gives his office in his own lifetime, and he is described by Tacitus, Josephus and Philo. A sealing ring would add texture to that picture — an administration with paperwork, staff and seals, reaching out to a fortress-palace in the Judean desert — rather than adding a person to history. Texture is a real thing to gain. It is simply a much smaller thing than the headline promised.",
        ],
      },
      {
        heading: "The Reading Is Contested, and That Is the Story",
        paragraphs: [
          "In 2023 W. Eck and A. Ecker published a paper in 'Atiqot with a title that leaves nothing to interpretation: not a signet ring of Pontius Pilatus. Their objections stack. Several of the letters are of uncertain identity, so the reading Pilato is possible but not secure. The text sits in two lines around the vessel, and it is not clear the two lines form a single word at all — they suggest the possibility of two separate words, at least one of them an abbreviation. Beyond the letters, they argue that everything known about Roman provincial administration in the first half of the first century tells against a governor's name appearing in Greek in an administrative context: the Caesarea block naming Pilate is in Latin, which is what a Roman official's own inscription looks like. They add that the krater was at that period a Jewish rather than a Roman symbol, and that the workmanship is poor. They are candid that they cannot supply a better reading of their own.",
          "Bonesho's 2026 article is a direct reply. She argues that the letter placement is a consequence of engraving around the vessel rather than evidence of two separate words, and that the spelling anomaly which looks like an error in Greek is exactly what a Latin dative rendered by a learner would look like. So the position as this is written is a live disagreement between named specialists, published in two peer-reviewed journals three years apart, over an object with no comparable parallel to settle it.",
          "Where the app stands. This article is not going to adjudicate an epigraphic dispute between W. Eck and C. E. Bonesho, and it would be dishonest to pretend it could. What it can do is refuse to spend the ring's credibility in advance. Any page that tells you a ring belonging to Pontius Pilate has been found is telling you something its own publishers explicitly declined to say, on a reading that a serious scholar has rejected in print. The trustworthiness of Scripture is not resting on this object and never was; treating a contested reading as though it were is the kind of borrowing that has to be paid back later, usually in front of a reader who has just discovered the 2023 article.",
        ],
      },
    ],
    verses: [
      { reference: "Luke 3:1", note: "Pilate named as governor of Judea, dating the ministry of John" },
      { reference: "Matthew 27:1-2", note: "Jesus delivered to Pilate the governor" },
      { reference: "John 19:19-22", note: "Pilate's own written notice, and his refusal to change it" },
    ],
    sources: [
      { label: "Biblical Archaeology Society: Pontius Pilate's Ring Reexamined", url: "https://www.biblicalarchaeology.org/daily/ancient-cultures/ancient-israel/pontius-pilates-ring-reexamined/" },
      { label: "Inscriptions of Israel/Palestine (Brown University): the Herodium ring", url: "https://search.inscriptionsisraelpalestine.org/inscriptions/hero0005" },
    ],
    discovery: {
      objectType: "A small copper-alloy sealing ring, about 1.3 cm high, engraved with a two-handled vessel (a krater) framed by Greek letters",
      findSite: "Herodium, the fortress-palace Herod built in the desert south of Bethlehem",
      findSiteId: "herodium",
      findSiteKind: "poi",
      foundYear: "Excavated 1968-69; the inscription was cleaned, read and published only in 2018",
      foundBy: "Excavated in the Herodium campaign directed by G. Foerster. Published by S. Amorai-Stark, M. Hershkovitz, G. Foerster, Y. Kalman, R. Chachy and R. Porat, with the inscription read by L. Di Segni",
      objectDate: "First century AD; the Brown University epigraphic database dates it AD 1-50",
      objectDateCertainty: "traditional",
      currentLocation: "With the Herodium excavation finds. No public object number or display location could be verified, and none is invented here",
    },
    citations: [
      {
        tier: "institution",
        label: "Inscriptions of Israel/Palestine — HERO0005, the Herodium ring",
        url: "https://search.inscriptionsisraelpalestine.org/inscriptions/hero0005",
        credit: "Brown University Center for Digital Scholarship; project directed by Michael L. Satlow",
        detail: "The epigraphic database record: copper-alloy ring, Herodion, dated AD 1-50, diplomatic reading PI LATO, editorial reading Pilatou",
        supports: "The object's dimensions, date range, and the reading as the database records it",
      },
      {
        tier: "scholarly",
        label: "S. Amorai-Stark et al., \"An Inscribed Copper-Alloy Finger Ring from Herodium Depicting a Krater\"",
        credit: "Shua Amorai-Stark, Malka Hershkovitz, G. Foerster, Yakov Kalman, Rachel Chachy and Roi Porat",
        detail: "Israel Exploration Journal 68/2 (2018), 208-220 — the editio princeps. It is the publication that reads the letters as Pilato and, in the same breath, judges it unlikely that the prefect himself wore a thin copper-alloy ring",
        supports: "Excavation date, material, the reading, and what the publishers did and did not claim",
        paywalled: true,
      },
      {
        tier: "scholarly",
        label: "W. Eck and A. Ecker, \"Not a 'Signet Ring' of Pontius Pilatus\"",
        url: "https://publications.iaa.org.il/atiqot/vol110/iss1/8/",
        credit: "Werner Eck (University of Cologne) and Avner Ecker (Bar-Ilan University)",
        detail: "'Atiqot 110 (2023), article 8, published by the Israel Antiquities Authority. Argues that the reading is insecure, that the two lines may not form one word, and that Greek in a first-half-of-the-first-century provincial administrative context tells against any link to Pilate",
        supports: "The 2023 rejection of the reading and the reasons given for it",
      },
      {
        tier: "scholarly",
        label: "C. E. Bonesho, \"The Pilate Ring: A Reconsideration\"",
        credit: "Catherine E. Bonesho, University of California, Los Angeles",
        detail: "Palestine Exploration Quarterly (2026), DOI 10.1080/00310328.2026.2695544. The publisher refuses automated requests, so no URL is given. Argues PILATO is a Latin dative transliterated into Greek and that the wearer was an enslaved or formerly enslaved administrative worker",
        supports: "The 2026 defence of the reading and the dative argument",
        paywalled: true,
      },
      {
        tier: "reference",
        label: "University of California, Los Angeles: \"What's in an 'O'?\"",
        url: "https://phys.org/news/2026-09-unusual-greek-mystery-pontius-pilate.html",
        credit: "University of California, Los Angeles, via Phys.org, 2 September 2026",
        detail: "The university's own account of Bonesho's article, including her reply to the 2023 objection",
        supports: "The omicron-for-omega argument and the proposed identity of the wearer",
      },
      {
        tier: "reference",
        label: "Biblical Archaeology Society: \"Pontius Pilate's Ring Reexamined\"",
        url: "https://www.biblicalarchaeology.org/daily/ancient-cultures/ancient-israel/pontius-pilates-ring-reexamined/",
        credit: "Biblical Archaeology Society",
        detail: "A popular summary of the Eck and Ecker objections, including the Latin-versus-Greek point and the krater as a Jewish symbol",
        supports: "The substance of the 2023 objections in accessible form",
      },
    ],
    reflectionPrompt:
      "Pilate asked what truth was and did not wait for an answer. Where are you asking a real question, and where are you asking one you would rather not have answered?",
  },
  {
    id: "galilee-boat",
    name: "Galilee Boat",
    alternateNames: ["Ancient Galilee Boat", "Jesus Boat", "Kinneret Boat"],
    category: "discovery",
    role: "A First-Century Fishing Boat from the Sea of Galilee",
    summary:
      "A working boat from the lake Jesus taught beside, uncovered by a drought in 1986 — and given a name by the press that its excavators never used.",
    sections: [
      {
        heading: "A Drought, Two Brothers and a Race Against the Water",
        paragraphs: [
          "The winter of 1985-86 was dry, and the Sea of Galilee fell far enough to expose stretches of lakebed that had been under water for two thousand years. In January 1986, M. and Y. Lufan, two brothers from Kibbutz Ginosar who fished the lake and hunted the shore for antiquities, saw the outline of a hull in the mud near Magdala and reported it. The Israel Department of Antiquities sent S. Wachsmann, its inspector of underwater antiquities. What followed was a rescue excavation carried out around the clock over roughly a fortnight, with the water expected back and news of the find already out; the accounts differ on whether it took ten, eleven or twelve days, which tells you something about the conditions.",
          "Waterlogged ancient wood has the consistency of wet cardboard and disintegrates as it dries. The crew dug the hull free by hand, wrapped it in fibreglass and polyurethane foam so that the whole shell became buoyant, and floated it along the shore to Kibbutz Ginosar. It then sat in a chemical bath for over a decade while polyethylene glycol, a synthetic wax, slowly replaced the water in the cell walls. It went on permanent display in 2000 in the Yigal Allon Museum at Ginosar, under the name the museum gave it: the Ancient Galilee Boat. The full excavation report fills a whole volume of the journal 'Atiqot.",
        ],
      },
      {
        heading: "What a Hull Tells You That a Text Cannot",
        paragraphs: [
          "The boat is about 8.2 m long and 2.3 m wide, built shell-first with mortise-and-tenon joinery in the Mediterranean manner, and patched together from several different species of timber — a sign of scarce or salvaged wood, and of a hull repaired over a long working life. Radiocarbon puts it at about 40 BC give or take eighty years. Pottery found with it, the nails, and the construction technique point to somewhere in the range 50 BC to AD 50, and the wear suggests it stayed in service for decades before it was stripped of anything reusable and left in the shallows.",
          "That is the kind of boat the Gospels are describing. It carried a crew of perhaps five, with room for a dozen or so people; it could be worked with oars and carried a sail; and it had a small raised stern deck, which is the detail readers reach for, because Mark 4:38 puts Jesus asleep in the stern on a cushion while the storm fills the boat. The value of the find is that it converts a set of scenes people picture vaguely into an object with dimensions. When Mark 1 has two pairs of brothers leave their nets and their father in the boat with the hired men, this is roughly the vessel and roughly the size of operation being abandoned.",
        ],
      },
      {
        heading: "It Is Not the Jesus Boat",
        paragraphs: [
          "The name almost everyone knows it by was not chosen by anyone who excavated it. Once word spread that a first-century boat had surfaced on the shore where Jesus taught, the international press dubbed it the Jesus Boat, and the label stuck to guidebooks, tour signage and a good deal of merchandise. The excavation report calls it an ancient boat from the Sea of Galilee. The museum that owns it calls it the Ancient Galilee Boat. This article uses those names for the same reason they do.",
          "Nothing ties this hull to Jesus or to any person named in the Gospels. There is no inscription, no cargo, no wreck event, nothing that connects it to a narrated moment. The lake supported a substantial fishing industry with a fleet of such boats, of which this is the one that happened to be buried in mud rather than rotting away. The odds against any single surviving hull being one named in a text are enormous, and no one involved in the excavation has ever claimed otherwise. What the boat establishes is a type, not an incident.",
          "One smaller caution, since the app cites the museum's own page. That page says the boat is made of twelve kinds of wood, all of them mentioned in the Bible. Published counts of the species differ between accounts, and the second half of the sentence is a devotional gloss rather than a finding: the woods are what a Galilean boatwright could get hold of, and the Bible mentions a great many trees. None of this touches the boat's real interest, which does not need the help.",
        ],
      },
    ],
    verses: [
      { reference: "Mark 1:16-20", note: "Two pairs of fishing brothers, their nets, and the boat they leave behind" },
      { reference: "Mark 4:35-41", note: "The storm, and Jesus asleep in the stern" },
      { reference: "Luke 5:1-11", note: "Teaching from a boat pushed out from shore, and the catch that nearly sinks two of them" },
      { reference: "John 21:3", note: "Peter goes fishing again after the resurrection" },
    ],
    sources: [
      { label: "Yigal Allon Museum, Kibbutz Ginosar: The Ancient Boat", url: "https://yigal-allon-centre.org.il/en/the-museum/the-ancient-boat/" },
      { label: "Wikipedia: Sea of Galilee Boat", url: "https://en.wikipedia.org/wiki/Sea_of_Galilee_Boat" },
    ],
    discovery: {
      objectType: "A wooden fishing boat about 8.2 m long and 2.3 m wide, shell-first mortise-and-tenon construction, built and repaired from several different timbers",
      findSite: "The exposed mud of the north-western shore of the Sea of Galilee, near Kibbutz Ginosar",
      findSiteId: "sea-of-galilee",
      findSiteKind: "location",
      foundYear: "January 1986; excavated the following month",
      foundBy: "Spotted by M. and Y. Lufan, two brothers from Kibbutz Ginosar. Excavated for the Israel Department of Antiquities under S. Wachsmann",
      objectDate: "Radiocarbon gives c. 40 BC give or take 80 years; pottery, nails and hull construction indicate roughly 50 BC to AD 50, with decades of use before it was abandoned",
      objectDateCertainty: "traditional",
      currentLocation: "Yigal Allon Museum, Kibbutz Ginosar, on permanent display since 2000",
    },
    citations: [
      {
        tier: "institution",
        label: "Yigal Allon Museum, Kibbutz Ginosar — The Ancient Boat",
        url: "https://yigal-allon-centre.org.il/en/the-museum/the-ancient-boat/",
        credit: "Beit Yigal Allon, Kibbutz Ginosar",
        detail: "The holding museum's own page: found January 1986 by the Lufan brothers after the drought, excavated by the antiquities authority, conserved on site and moved to the display gallery in 2000",
        supports: "Discovery, conservation, current location, and the museum's own name for the object",
      },
      {
        tier: "scholarly",
        label: "S. Wachsmann (ed.), The Excavations of an Ancient Boat from the Sea of Galilee (Lake Kinneret)",
        credit: "Shelley Wachsmann and colleagues",
        detail: "'Atiqot 19 (Israel Antiquities Authority, 1990) — an entire volume of the excavation journal given over to the boat. Print-only; no free URL exists",
        supports: "The excavation, construction, dating evidence and the report's own naming of the object",
      },
      {
        tier: "scholarly",
        label: "S. Wachsmann, The Sea of Galilee Boat",
        credit: "Shelley Wachsmann, Texas A&M University",
        detail: "Ed Rachal Foundation Nautical Archaeology Series, Texas A&M University Press, 2009 (first published 1995) — the excavator's book-length account, including the press reaction during the dig",
        supports: "The circumstances of the excavation and the origin of the popular nickname",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Sea of Galilee Boat",
        url: "https://en.wikipedia.org/wiki/Sea_of_Galilee_Boat",
      },
    ],
    reflectionPrompt:
      "This is roughly the boat four fishermen walked away from. What would it cost you to leave your own livelihood on the shore?",
  },
  {
    id: "politarch-inscriptions",
    name: "Politarch Inscriptions",
    alternateNames: ["Vardar Gate Inscription"],
    category: "discovery",
    role: "Greek Civic Inscriptions Naming an Office Known Otherwise Only from Acts",
    summary:
      "Luke calls the magistrates of Thessalonica politarchai, a word that survives in no other work of Greek literature at all. Dozens of inscriptions show it is exactly the right title in exactly that city.",
    sections: [
      {
        heading: "A Word With No Literature Behind It",
        paragraphs: [
          "When the mob at Thessalonica cannot find Paul and Silas, it drags their host Jason before the city's magistrates instead. English versions render the officials plainly — the World English Bible has rulers of the city — but the Greek word in Acts 17:6 and 17:8 is politarchas, and that word occurs in no surviving work of Greek literature outside Acts. Its only other witnesses are inscriptions cut in stone.",
          "In 1898 E. D. Burton collected everything then known in the American Journal of Theology, and his complaint about the state of the field is instructive: the standard commentaries and lexicons of his day cited a single inscription, often in a corrupt text, and drew wrong conclusions from the bad copy. His own catalogue ran to seventeen inscriptions attesting the office, nineteen if two probable restorations are allowed. By 1994, when G. H. R. Horsley wrote on the subject in The Book of Acts in Its Graeco-Roman Setting, the count had risen to possibly as many as seventy non-literary attestations, more than eighty per cent of them from Macedonia and something in the region of twenty-eight from Thessalonica alone.",
          "The best known of them is a marble block from the arch that spanned the Via Egnatia at the western entrance to the city, known locally as the Vardar Gate. The arch was demolished in 1876 in the name of civic improvement. Through the efforts of P. Crosbie, a Scottish minister living in the city, and the British consul, the inscribed block was rescued from the rubble — all but five letters of it, which Burton records as lost — passed to the British consulate, and eventually to the British Museum, where it is object 1877,0511.1. It names six politarchs together with the city treasurer and the director of the gymnasium.",
        ],
      },
      {
        heading: "Stated at Full Strength",
        paragraphs: [
          "This one deserves to be put plainly rather than hedged, because understating a genuine find is its own kind of dishonesty. The title is right. The city is right. The number is right: Luke has a board of magistrates rather than a single official, and a plurality of politarchs is precisely what the Macedonian inscriptions show. He also gets the shape of the proceeding right — Jason is not tried but bound over, made to give security and released, which is a magistrate's action, not a governor's.",
          "It does not stand alone either. Across the same journey Luke uses a different and correct title in each place: a proconsul in Cyprus and a proconsul in Achaia, both senatorial provinces; magistrates at the Roman colony of Philippi; the council of the Areopagus at Athens; Asiarchs at Ephesus. Roman provincial administration was not uniform, and these titles were not interchangeable. Getting them right city by city, in a narrative written for readers who mostly could not check, is the behaviour of a writer working from good information about the world he is describing.",
        ],
      },
      {
        heading: "What Getting the Title Right Does and Does Not Show",
        paragraphs: [
          "Two cautions, and the first is about how this story is usually told rather than about Luke. The familiar version runs: critics called this an error, and archaeology proved them wrong. That version almost never names a critic, and this article could not find one either. What the record actually shows is less dramatic and more interesting. Nineteenth-century scholarship had one badly transcribed inscription to work from, and it handled a rare word poorly; the documentation then improved enormously. Nobody needs the invented martyrdom of a nameless sceptic, because the underlying fact is strong enough standing up on its own.",
          "The second caution matters more. Knowing what a city called its magistrates is not the same as reporting truly what happened in front of them. Accuracy about titles establishes that an author had good information about the setting — a real and substantial thing, and a reason to take his account of events seriously — but it does not by itself establish any event in Acts 17. The case for Luke as a historian is cumulative: many such details, plus the internal character of the work, plus the company he keeps with contemporary sources where they overlap. That is a durable case, and it is worth more than the shortcut version.",
          "Where the app stands. Scripture is trustworthy, and that conviction is a theological commitment rather than a conclusion the stones force. This inscription does not create the app's confidence in Luke; it is a place where a reader can watch that confidence being independently corroborated on a point that could, in principle, have gone the other way. That is worth a great deal, and it is a different claim from saying archaeology has proved anything.",
        ],
      },
    ],
    verses: [
      { reference: "Acts 17:5-9", note: "Jason dragged before the politarchs and bound over" },
      { reference: "Acts 17:6", note: "The word politarchas, rendered \"rulers of the city\"" },
      { reference: "Acts 13:7", note: "A proconsul in Cyprus — a different province, a different and correct title" },
      { reference: "Acts 18:12", note: "Gallio as proconsul of Achaia" },
      { reference: "Acts 19:31", note: "The Asiarchs at Ephesus" },
    ],
    sources: [
      { label: "E. D. Burton, \"The Politarchs\" (1898), full text at the Internet Archive", url: "https://archive.org/details/jstor-3153438" },
      { label: "Wikipedia: Politarch", url: "https://en.wikipedia.org/wiki/Politarch" },
    ],
    discovery: {
      objectType: "Stone inscriptions — civic dedications, honorific decrees and building texts — naming magistrates called politarchai",
      findSite: "Thessalonica above all, and across Macedonia, with a handful from beyond it",
      findSiteId: "thessalonica",
      findSiteKind: "location",
      foundYear: "Recorded from the early modern period onward; the Vardar Gate block was rescued when the arch was demolished in 1876",
      foundBy: "No single finder — the corpus is cumulative. The Vardar Gate block was saved by P. Crosbie, a Scottish minister resident in the city, together with the British consul",
      objectDate: "Second century BC to the third century AD; the Vardar Gate text is usually dated to the second century AD",
      objectDateCertainty: "traditional",
      currentLocation: "Scattered across Greek museums and collections. The Vardar Gate block is in the British Museum, object 1877,0511.1",
    },
    citations: [
      {
        tier: "primary",
        label: "E. D. Burton, \"The Politarchs\"",
        url: "https://archive.org/details/jstor-3153438",
        credit: "Ernest DeWitt Burton",
        detail: "The American Journal of Theology 2/3 (July 1898), 598-632. Public domain and freely readable. The first full catalogue: seventeen inscriptions attesting the office, nineteen with two probable restorations, plus the history of the Vardar Gate stone and the loss of five letters when the arch came down",
        supports: "The count as of 1898, the state of nineteenth-century scholarship, and the Vardar Gate stone's journey to the British Museum",
      },
      {
        tier: "scholarly",
        label: "G. H. R. Horsley, \"The Politarchs\"",
        credit: "G. H. R. Horsley",
        detail: "In D. W. J. Gill and C. Gempf (eds), The Book of Acts in Its Graeco-Roman Setting (The Book of Acts in Its First Century Setting 2, Eerdmans, 1994), 419-431. Counts possibly as many as seventy non-literary attestations, over eighty per cent Macedonian and some twenty-eight from Thessalonica",
        supports: "The modern count of attestations and their distribution",
      },
      {
        tier: "institution",
        label: "British Museum, object 1877,0511.1 — the Vardar Gate block",
        credit: "The British Museum, London",
        detail: "The marble building block from the Thessalonica gateway, listing six politarchs with the city treasurer and gymnasiarch. No URL is given because britishmuseum.org refuses automated requests, so its object page could not be fetched and read; the museum number is given instead so a reader can look it up directly",
        supports: "Current location of the best-known politarch inscription and the officials it names",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Politarch",
        url: "https://en.wikipedia.org/wiki/Politarch",
      },
    ],
    reflectionPrompt:
      "Luke troubled to get a provincial job title right. What does that suggest about how he handled the parts of his account you cannot check?",
  },
  {
    id: "sergius-paulus-inscriptions",
    name: "Sergius Paulus Inscriptions",
    // NOT registered: "Sergius Paulus" — that is the proconsul, who already owns it in people.ts.
    category: "discovery",
    role: "Four Roman Inscriptions, and the Question of Which One Is the Proconsul of Acts 13",
    summary:
      "Acts names the Roman governor of Cyprus who sent for Paul and Barnabas. Several inscriptions have been proposed as his over the last century and a half. Which one is his, if any, is genuinely unsettled.",
    sections: [
      {
        heading: "Four Candidates",
        paragraphs: [
          "Acts 13:7 places the apostles at Paphos before the proconsul of Cyprus, whom it names Sergius Paulus. The word proconsul is itself correct and worth noting in passing: Cyprus was a senatorial province in this period, and senatorial provinces were governed by proconsuls. Four inscriptions have been put forward at one time or another as naming the man himself.",
          "The first comes from Soloi on the north coast of Cyprus, catalogued as IGR III 930, a text dated by a regnal year of Claudius that mentions a proconsul Paulus. D. G. Hogarth, who published it after his archaeological survey of the island, saw no good reason to doubt the identification with the figure in Acts. T. B. Mitford, the authority on Roman Cyprus, judged on epigraphic grounds that the stone cannot be earlier than the middle of the first century and is probably considerably later. Accounts even disagree about when it was found, giving the year variously as 1877 and 1887.",
          "The second is a boundary marker of the Tiber from Rome, CIL VI 31545, recording the commissioners appointed in AD 47 to oversee the banks and channel of the river under Claudius. One of the named commissioners is L. Sergius Paullus. This is the only one of the four whose date is secure. B. Windle argued in the Near East Archaeological Society Bulletin in 2022 that the ordinary Roman career ladder makes it entirely plausible that the same man held a river commissionership at Rome and a proconsulship in Cyprus within a few years — and he is careful to call it plausible rather than demonstrated.",
          "The third is a pair of texts from the territory of Pisidian Antioch naming senators called L. Sergius Paullus, one of them explicitly the younger; the second was copied in 1912 by W. Ramsay and J. G. C. Anderson. Ramsay proposed from them that the family held estates in the region, and the popular inference followed that the proconsul sent Paul and Barnabas on to his relatives' home town, which is where Acts 13:13 takes them next. That is a hypothesis about a family's landholdings, not an identification of a man. The fourth, IGR III 935 from Kythrea in Cyprus, is the weakest: it preserves the name Quintus Ser[gius], which is the wrong first name, has lost the part where a cognomen would sit, and probably belongs to a different emperor's reign altogether.",
        ],
      },
      {
        heading: "Why Anyone Cares",
        paragraphs: [
          "The interest is not that a Roman official's existence needs propping up. It is that Acts 13 is the moment the mission turns outward, and it turns on a named Roman with a named office in a named city — the kind of claim that is checkable in principle. Luke does this constantly, and it is why his book invites this sort of scrutiny in the first place. An author who wrote only in generalities would be safe from it.",
          "There is a second, quieter reason. The Sergii Paulli were a real senatorial family with a documented presence in exactly the eastern provinces Acts moves through. Even without a one-to-one match, the inscriptions place families of that name and rank in Cyprus and in the Anatolian interior in the middle of the first century — which is the world Acts describes, populated by the kind of people Acts says were in it.",
        ],
      },
      {
        heading: "Nobody Has Closed This",
        paragraphs: [
          "What the four candidates have in common is that each preserves a Sergius or a Paulus, and none of them names the proconsul of Acts in a way that settles the matter. Sergius Paulus was not a rare combination in a family that produced senators for generations. Mitford's assessment of the best-known Cyprus candidate was that identifying him with the proconsul of Cyprus is at best a conjecture, and one weakened by a later reading of the related text. T. Kennedy, writing from within evangelical archaeology, reaches the same verdict from the other direction: possible, unconfirmed, a hypothesis resting on circumstantial evidence.",
          "Where the app stands. The honest statement is short, and it is not a retreat. Acts names a proconsul of Cyprus called Sergius Paulus and describes the province's government correctly for the period. Roman Cyprus was governed by proconsuls of that kind, from families of that kind, and one of them may well be standing on one of these stones. But this app is not going to tell a reader that Sergius Paulus has been found, because he has not been. What has been found is a family, a plausible career pattern, and a set of texts that fit without fastening.",
          "It is worth saying what refusing the overclaim costs, because the answer is nothing. No one's faith is resting on a proconsul's career. A reader who is told unsettled loses an argument they never needed, and gains the ability to believe the next sentence this app writes about a stone. A reader who is told confirmed and then finds Mitford loses considerably more than that.",
        ],
      },
    ],
    verses: [
      { reference: "Acts 13:6-12", note: "Paphos, the proconsul, and the confrontation with Elymas" },
      { reference: "Acts 13:7", note: "The proconsul named, with the correct title for a senatorial province" },
      { reference: "Acts 13:13", note: "The next leg of the journey, which the Pisidian Antioch hypothesis tries to explain" },
    ],
    sources: [
      { label: "Wikipedia: Sergius Paulus", url: "https://en.wikipedia.org/wiki/Sergius_Paulus" },
      { label: "Associates for Biblical Research: the Roman Tiber inscription and the Cypriot proconsul", url: "https://biblearchaeology.org/research-articles/the-roman-tiber-river-inscription-and-the-cypriot-proconsul-sergius-paulus/" },
    ],
    discovery: {
      objectType: "Four Greek and Latin inscriptions proposed at various times as naming the proconsul of Acts 13:7",
      findSite: "Soloi and Kythrea on Cyprus; Rome; the territory of Pisidian Antioch",
      findSiteId: "cyprus",
      findSiteKind: "location",
      foundYear: "Nineteenth and early twentieth centuries. The Soloi text is dated 1877 in some accounts and 1887 in others; the second Pisidian Antioch text was copied in 1912",
      foundBy: "Credit is contested and differs by inscription. The Soloi text is associated with D. G. Hogarth's survey of Cyprus, published in 1889; the Pisidian Antioch pair with W. Ramsay and J. G. C. Anderson",
      objectDate: "First century AD — except that the date of the Soloi text is itself part of the dispute, and the Kythrea fragment may belong to a different reign",
      objectDateCertainty: "disputed",
      currentLocation: "Various, and not all of them established. No single institution holds the group; the texts are catalogued as IGR III 930 and 935 and CIL VI 31545",
    },
    citations: [
      {
        tier: "institution",
        label: "Ohio State University Center for Epigraphical and Palaeographical Studies — CIL VI photographic collection",
        url: "https://epigraphy.osu.edu/collections/latin-photo/cil-vi-20000-40807",
        credit: "The Ohio State University Center for Epigraphical and Palaeographical Studies",
        detail: "Catalogue entry for CIL VI 31545: boundary marker of the Tiber set up by the curatores riparum et alvei Tiberis, reign of Claudius, with cross-reference to the Epigraphic Database Roma",
        supports: "The identity, character and date of the Tiber inscription",
      },
      {
        tier: "scholarly",
        label: "T. B. Mitford, \"Roman Cyprus\"",
        credit: "Terence B. Mitford",
        detail: "In Aufstieg und Niedergang der romischen Welt II.7.2 (1980) — the standard survey of the island's Roman epigraphy, and the source of the judgement that identifying the Soloi proconsul with the Acts figure is at best a conjecture",
        supports: "The epigraphic dating objection and the assessment of the identification",
      },
      {
        tier: "scholarly",
        label: "B. Windle, \"The Roman Tiber River Inscription and the Cypriote Proconsul Sergius Paulus\"",
        url: "https://biblearchaeology.org/research-articles/the-roman-tiber-river-inscription-and-the-cypriot-proconsul-sergius-paulus/",
        credit: "Bryan Windle",
        detail: "Near East Archaeological Society Bulletin 67 (2022). Argues from the cursus honorum that the Tiber commissioner and the Cyprus proconsul plausibly are the same man, in explicitly provisional terms",
        supports: "The case for the Tiber inscription and the careful language in which it is made",
      },
      {
        tier: "reference",
        label: "Bible Archaeology Report: Sergius Paulus, an archaeological biography",
        url: "https://biblearchaeologyreport.com/2019/11/15/sergius-paulus-an-archaeological-biography/",
        credit: "Bryan Windle",
        detail: "A survey of all four inscriptions with the assessments of D. G. Hogarth, W. Ramsay, B. Witherington and T. Kennedy, and an explicit statement that the argument is a connect-the-dots one built on indirect evidence",
        supports: "The inventory of candidate inscriptions and the range of scholarly verdicts",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Sergius Paulus",
        url: "https://en.wikipedia.org/wiki/Sergius_Paulus",
      },
    ],
    reflectionPrompt:
      "A Roman governor sent for two travelling preachers because he wanted to hear what they had to say. When did you last go looking for something you had not been told to want?",
  },
  {
    id: "alexamenos-graffito",
    name: "Alexamenos Graffito",
    category: "discovery",
    role: "A Scratched Wall Drawing of a Crucifixion, Made to Mock a Christian",
    summary:
      "On a plastered wall in the servants' quarters of the imperial palace in Rome, somebody drew a man worshipping a crucified figure with the head of a donkey, and wrote underneath: Alexamenos worships his god. It is the earliest surviving picture of the crucifixion, and it is an insult.",
    sections: [
      {
        heading: "A Wall in the Palace Servants' Quarters",
        paragraphs: [
          "In the mid-1850s — accounts give 1856 and 1857 — excavation on the south-western slope of the Palatine Hill in Rome uncovered a building known as the domus Gelotiana. It had been absorbed into the imperial palace and was later used as a paedagogium, a training house for the boys who served in it. When the palace was extended, the street beside it was walled up and filled, which is the only reason the plaster survived at all. The graffito was cut into the wall of one of its rooms. The Palatine graffiti were published as a full corpus in 1966 by H. Solin and M. Itkonen-Kaila, under the direction of V. Vaananen, in the Acta Instituti Romani Finlandiae.",
          "The plaster was cut from the wall and moved more than once before ending up in the Palatine Museum, part of the Parco archeologico del Colosseo, where it is displayed at eye level. One practical warning from B. Nongbri, who has photographed it: most of the images reproduced in books and on websites have been retouched to darken the lines. The actual scratches are much fainter than the pictures suggest, and a reader who arrives expecting the textbook version will be surprised.",
        ],
      },
      {
        heading: "The Shape of the Insult",
        paragraphs: [
          "The drawing is crude and entirely legible. A figure hangs on a cross, seen from behind, with the head of a donkey or mule. To the left a smaller figure stands with one arm raised in a gesture of worship. Between them, in irregular Greek, runs the line ALEXAMENOS SEBETE THEON — Alexamenos worships god, with the verb spelled the way it was drifting in ordinary speech rather than the way a schoolmaster would have wanted it.",
          "Both halves of the joke need explaining now, because neither is obvious to a modern reader. Crucifixion was the death Rome kept for slaves and rebels, deliberately public and deliberately degrading; to a Roman, being told that somebody's god had been crucified was an absurdity before it was an offence. And there was a standing slander, aimed first at Jews and then at Christians, that they worshipped a donkey. Tertullian describes a caricature of a Christian with a donkey's ears being paraded around Carthage, and the same accusation is answered in the second-century Octavius. The drawing simply stacks the two insults on top of each other.",
          "In a nearby room a second graffito was found reading Alexamenos fidelis — Alexamenos is faithful. It reads like a reply, and it may be one, though nothing establishes that it is by the same hand or from the same season.",
        ],
      },
      {
        heading: "What It Can and Cannot Carry",
        paragraphs: [
          "The date is not fixed. Proposals run from the late first century to the late third, and the range narrows to the late second or early third on the basis of the wall's construction phases, the painting styles around it and the letter forms. So the customary description — the earliest known depiction of the crucifixion — is accurate, provided the word known is doing its work. It is a statement about what has survived, not about what once existed.",
          "The interpretation is not unanimous either. Nineteenth-century writers, J. P. Lundy among them, read the animal head as Anubis and the whole scene as Egyptian. More recently I. Soon has argued that it could be Christian self-parody rather than mockery from outside, and J. E. Taylor has suggested the crucified figure is being cast as a kind of demigod. The mainstream reading remains that this is a jeer, and the second graffito supports it, but a reader should know that specialists have proposed otherwise.",
          "What it does establish is not small, and it is worth stating precisely. Within roughly a century and a half of the crucifixion, somebody attached to the household of the Roman emperor knew a man by name who worshipped a crucified god, knew it well enough to mock him for it, and expected the joke to land with whoever else read that wall. Christianity was inside the palace, and it was known for the one thing about it that made it ridiculous. Paul had said as much in advance — a stumbling block to Jews and folly to Greeks — and the peculiar value of this drawing is that it is the folly seen from the far side, by someone who found it funny. It is not evidence that the crucifixion happened; the case for that runs through the sources, not through a scratch on plaster. It is evidence of how the claim looked to people who heard it and did not believe a word of it.",
        ],
      },
    ],
    verses: [
      { reference: "1 Corinthians 1:23", note: "A stumbling block to Jews and folly to Greeks — the reaction, described from inside" },
      { reference: "Galatians 3:13", note: "Cursed is everyone who hangs on a tree" },
      { reference: "Hebrews 12:2", note: "He endured the cross, despising its shame" },
      { reference: "1 Peter 4:14", note: "Insulted for the name of Christ" },
    ],
    sources: [
      { label: "Wikipedia: Alexamenos graffito", url: "https://en.wikipedia.org/wiki/Alexamenos_graffito" },
      { label: "B. Nongbri, \"The Palatine Alexamenos Graffito\"", url: "https://brentnongbri.com/2018/06/25/the-palatine-alexamenos-graffito/" },
    ],
    discovery: {
      objectType: "A graffito scratched into wall plaster — a drawing with a three-word Greek caption",
      findSite: "A room of the paedagogium in the domus Gelotiana, south-western slope of the Palatine Hill, Rome",
      findSiteId: "rome",
      findSiteKind: "location",
      foundYear: "1856 or 1857 — accounts differ, and neither is preferred here",
      foundBy: "The excavation of the domus Gelotiana on the Palatine. No individual finder is recorded",
      objectDate: "Proposals run from the late first century to the late third century AD; late second or early third century is the most commonly held",
      objectDateCertainty: "disputed",
      currentLocation: "Palatine Museum (Antiquarium del Palatino), Parco archeologico del Colosseo, Rome, on display",
    },
    citations: [
      {
        tier: "institution",
        label: "Palatine Museum, Parco archeologico del Colosseo",
        url: "https://colosseo.it/en/area/museums/the-museo-palatino/",
        credit: "Parco archeologico del Colosseo, Rome",
        detail: "The holding institution's page for the museum. It gives the museum's history and collection overview but does not itemise the graffito, so it is cited for the location only",
        supports: "Current location",
      },
      {
        tier: "scholarly",
        label: "H. Solin and M. Itkonen-Kaila, Graffiti del Palatino I: Paedagogium",
        credit: "Heikki Solin and Marja Itkonen-Kaila, under the direction of Veikko Vaananen",
        detail: "Acta Instituti Romani Finlandiae III (Helsinki, 1966) — the critical publication of the graffiti scratched on the walls of the paedagogium, of which this is one. Print-only",
        supports: "The corpus publication of the Palatine graffiti",
      },
      {
        tier: "reference",
        label: "B. Nongbri, \"The Palatine Alexamenos Graffito\"",
        url: "https://brentnongbri.com/2018/06/25/the-palatine-alexamenos-graffito/",
        credit: "Brent Nongbri, historian of early Christianity",
        detail: "Includes an undoctored photograph and the warning that the images usually reproduced have been retouched; notes the customary third-century dating and the 1966 corpus publication",
        supports: "The state of the actual plaster, the retouched-image problem, and the publication history",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Alexamenos graffito",
        url: "https://en.wikipedia.org/wiki/Alexamenos_graffito",
      },
    ],
    reflectionPrompt:
      "Somebody drew this to make a Christian look ridiculous, and it survived precisely because it was scratched on a wall nobody thought mattered. What are you willing to be laughed at for?",
  },
  {
    id: "hezekiahs-tunnel",
    name: "Hezekiah's Tunnel",
    alternateNames: ["Siloam Tunnel"],
    category: "discovery",
    role: "Eighth-Century BC Rock-Cut Water Conduit Beneath the City of David",
    summary:
      "Five hundred and thirty-three metres of limestone cut through by hand from both ends at once, still carrying water, and still walkable end to end in about half an hour.",
    sections: [
      {
        heading: "Never Lost, Only Measured",
        paragraphs: [
          "Most of the objects in this section had to be found. This one was never missing. The tunnel runs from the Gihon Spring, in the Kidron Valley outside the ancient wall, to the Pool of Siloam inside it, and people have waded through it for as long as there have been people in Jerusalem. What the nineteenth century added was measurement. E. Robinson traversed it in 1838 and published a description; C. Warren surveyed it for the Palestine Exploration Fund in 1867, during the same campaign that produced the shaft named after him. The tunnel is about 533 metres long. The difference in height between its two ends is roughly 30 centimetres — a gradient of about 0.06 per cent, which is to say almost nothing, and enough.",
          "The detail that has fascinated engineers ever since is that it was cut from both ends at the same time. The two teams met in the middle, and the joint is visible: the chisel marks change direction, and there is a short section of false starts where the crews were hunting for each other through the rock. In 1880 a boy exploring the tunnel noticed six lines of paleo-Hebrew cut into a smoothed panel a few metres from the Siloam end. That is the Siloam Inscription, which this app treats in its own article, and it is the tunnellers' own account of the moment the two crews broke through.",
        ],
      },
      {
        heading: "Water Inside the Wall",
        paragraphs: [
          "2 Kings 20:20 credits Hezekiah with making the pool and the conduit and bringing water into the city. 2 Chronicles 32:30 is more specific: he stopped the upper spring of the waters of Gihon and brought them straight down on the west side of David's city. And 2 Chronicles 32:2-4 gives the reason — Sennacherib was coming, and the springs outside the walls were stopped so that the Assyrians would not find abundant water. Isaiah, writing at the time and not approving, describes a reservoir made between the two walls for the water of the old pool, and complains that the men who built it did not look to the one who purposed it long ago.",
          "The tunnel matches that description at every point a description can be matched. It moves the water supply from outside the defensive line to inside it. Its course is an odd, wandering S rather than a straight line, which is what you get when speed matters more than elegance. It was cut from two directions at once, which is what you do when you are in a hurry. It is not a small work: it is among the largest engineering works surviving from the Judahite monarchy, and it still functions.",
          "One consequence is worth naming for a reader who knows the Gospels better than the Iron Age. The pool at the tunnel's outlet is the Pool of Siloam, and the pool Jesus sends a blind man to wash in, in John 9:7, is fed by this conduit. The Second Temple pool excavated in 2004 is not the same basin Hezekiah's men filled — seven centuries lie between them — but the water arriving in it came down this tunnel.",
        ],
      },
      {
        heading: "How the Date Was Settled, and What Is Still Argued",
        paragraphs: [
          "The Hezekiah attribution was challenged directly. J. Rogerson and P. Davies argued in 1996 that the tunnel and its inscription were Hasmonean, some five centuries later than the usual date, chiefly on the letter forms. That proposal was answered by physical evidence rather than by argument. A. Frumkin, A. Shimron and J. Rosenbaum dated organic material sealed inside the tunnel's original plaster by radiocarbon, and the speleothems that grew on the plaster afterwards by uranium-thorium, and published the result in Nature in 2003: an Iron Age II date, around 700 BC. It was the first securely identified structure named in the Hebrew Bible to be dated radiometrically, and it is why the date can be stated at full strength here.",
          "Two arguments remain genuinely open. The first is about a few decades. R. Reich and E. Shukron, from their long excavation at the Gihon Spring, have argued for a date somewhat earlier than Hezekiah's reign — the end of the ninth century or the first part of the eighth. That is a real disagreement between specialists, and it is a disagreement about which Judahite king, not about whether the tunnel is Iron Age. The second is about method: A. Sneh, R. Weinberger and E. Shalev argued in the Bulletin of the American Schools of Oriental Research in 2010 that the tunnellers largely followed and widened an existing natural karstic fissure, which would make the achievement a different kind of achievement. A. Shimron and A. Frumkin replied in the same journal the following year, defending the tunnel as an artificial cut. That exchange is unresolved in the sense that both papers are on the shelf; most subsequent work has followed the artificial reading.",
          "The limit worth stating plainly is smaller than the tunnel. Nothing in it names a king. The inscription at the Siloam end describes the breakthrough and does not say who commissioned the work. The link to Hezekiah rests on the radiometric date landing in his reign, on the tunnel doing exactly what 2 Chronicles 32 says he did, and on the absence of any other candidate — a strong convergence, and still a convergence rather than a signature.",
        ],
      },
    ],
    verses: [
      { reference: "2 Kings 20:20", note: "Hezekiah made the pool and the conduit and brought water into the city" },
      { reference: "2 Chronicles 32:30", note: "The upper spring of Gihon stopped and brought down on the west side" },
      { reference: "2 Chronicles 32:2-4", note: "The reason: Sennacherib coming, and the springs outside the city stopped" },
      { reference: "Isaiah 22:11", note: "\"You also made a reservoir between the two walls for the water of the old pool\"" },
      { reference: "John 9:6-7", note: "The pool at the tunnel's outlet, seven centuries later" },
    ],
    sources: [
      { label: "Wikipedia: Siloam tunnel", url: "https://en.wikipedia.org/wiki/Siloam_tunnel" },
      { label: "Palestine Exploration Fund", url: "https://www.pef.org.uk/history/" },
    ],
    discovery: {
      objectType: "Rock-cut water conduit, about 533 m long, hand-cut through limestone from both ends",
      findSite: "Beneath the City of David ridge, from the Gihon Spring to the Pool of Siloam, Jerusalem",
      findSiteId: "city-of-david",
      findSiteKind: "poi",
      foundYear: "Never lost. Described by E. Robinson in 1838; surveyed by C. Warren in 1867",
      foundBy: "No discoverer — the tunnel was in continuous use. Its modern survey belongs to E. Robinson (1838) and C. Warren, for the Palestine Exploration Fund (1867)",
      objectDate: "c. 700 BC, by radiocarbon and uranium-thorium dating (Nature, 2003); some specialists argue for the late ninth or early eighth century BC",
      objectDateCertainty: "firm",
      currentLocation: "In situ beneath the City of David, Jerusalem. Still carries water and is open to visitors, who wade it",
    },
    citations: [
      {
        tier: "institution",
        label: "Palestine Exploration Fund",
        url: "https://www.pef.org.uk/history/",
        credit: "The Palestine Exploration Fund, founded 1865",
        detail: "The body that sponsored C. Warren's Jerusalem excavations of 1867-1870, which produced the first careful survey of the tunnel and of the shaft named after him",
        supports: "The nineteenth-century survey history",
      },
      {
        tier: "scholarly",
        label: "A. Frumkin, A. Shimron and J. Rosenbaum, \"Radiometric dating of the Siloam Tunnel, Jerusalem\"",
        credit: "Amos Frumkin (Hebrew University), Aryeh Shimron, Jeff Rosenbaum",
        detail: "Nature 425 (September 2003), 169-171, doi:10.1038/nature01875. Radiocarbon on plant material in the original plaster and uranium-thorium on the overlying speleothems. Behind a publisher paywall; the bibliographic record was confirmed through Crossref",
        supports: "The c. 700 BC date, and the refutation of a Hasmonean dating",
        paywalled: true,
      },
      {
        tier: "scholarly",
        label: "A. Sneh, R. Weinberger and E. Shalev, \"The Why, How, and When of the Siloam Tunnel Reevaluated\", with the reply by A. Shimron and A. Frumkin",
        credit: "Bulletin of the American Schools of Oriental Research",
        detail: "BASOR 359 (2010), 57-65, and the reply at BASOR 364 (2011), 53-60. The exchange over whether the tunnellers followed a natural karstic fissure",
        supports: "The live methodological dispute in the third section",
        paywalled: true,
      },
      {
        tier: "scholarly",
        label: "J. Rogerson and P. Davies, \"Was the Siloam Tunnel Built by Hezekiah?\", and R. Reich and E. Shukron, \"The Date of the Siloam Tunnel Reconsidered\"",
        credit: "John Rogerson and Philip R. Davies; Ronny Reich and Eli Shukron",
        detail: "The Biblical Archaeologist 59:3 (1996), 138-149, and Tel Aviv 38:2 (2011), 147-157. The Hasmonean proposal that the radiocarbon answered, and the excavators\u2019 case for a date somewhat earlier than Hezekiah. Both records confirmed through Crossref",
        supports: "Both dating challenges named in the third section",
        paywalled: true,
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Siloam tunnel",
        url: "https://en.wikipedia.org/wiki/Siloam_tunnel",
      },
    ],
    reflectionPrompt:
      "Two crews cut toward each other for months through solid rock, unable to see or hear the far end, trusting they would meet. Where are you working toward someone you cannot yet hear?",
  },
  {
    id: "broad-wall-jerusalem",
    name: "Broad Wall",
    alternateNames: ["Hezekiah's Wall"],
    category: "discovery",
    role: "Eighth-Century BC Fortification Wall in Jerusalem's Upper City",
    summary:
      "Seven metres of wall thickness laid straight across the foundations of the houses it demolished — and a fortification that has just been redated out from under the king it is named for.",
    sections: [
      {
        heading: "Found Under the Jewish Quarter",
        paragraphs: [
          "After 1967 the Jewish Quarter of the Old City was rebuilt, and N. Avigad was invited to excavate ahead of the builders. His dig ran from 1969 into the early 1980s and produced a series of finds that between them rewrote how big Iron Age Jerusalem was: the Israelite Tower, the Burnt House, the Herodian mansions, the Byzantine Cardo. The wall came out in 1970.",
          "It is about seven metres thick. Roughly 65 metres of it are exposed, standing up to about 3.3 metres high, built of large roughly dressed stones, and it runs across the western hill — ground that, on the older reconstruction of the city, was supposed to be empty countryside in the Iron Age. It was not. The wall proves a fortified western quarter, and with it a city several times larger than the narrow ridge of the City of David.",
          "The detail that made the find famous is what lies beneath it. The builders did not clear a line and start; they drove the foundation straight across houses that were already standing, cutting through them and building over their walls. Those cut-off house foundations are still visible under the wall's course.",
        ],
      },
      {
        heading: "The Houses They Broke Down",
        paragraphs: [
          "Isaiah 22:9-11 describes a fortification panic in Jerusalem in almost these terms: the breaches of David's city were many, the waters of the lower pool were gathered, a reservoir was made between the two walls — and, in verse 10, \"You counted the houses of Jerusalem, and you broke down the houses to fortify the wall.\" N. Avigad read the demolished foundations under his wall against that sentence, and it is a genuinely close fit: a specific, slightly odd, easily-checkable detail of construction practice, described in a text and then found in the ground.",
          "The wall is also a strong candidate for the fortification Nehemiah's rebuilders reached three centuries later. The World English Bible renders it \"the wide wall\" rather than \"the broad wall\" at Nehemiah 3:8 and 12:38, but it is the same Hebrew phrase, and the traditional English name of this excavated wall comes from it. If the identification holds, the wall was still standing, and still a landmark, when the returned exiles built along its line.",
          "What the wall carries at full strength, independent of any king's name, is the scale of the city. A seven-metre wall enclosing the western hill is a state project, and the Judah that built it was not a village.",
        ],
      },
      {
        heading: "Whose Wall? The 2024 Redating, Stated Carefully",
        paragraphs: [
          "For fifty years this was Hezekiah's wall: built in the late eighth century BC, in the emergency that produced the tunnel, against Sennacherib. In 2024 that attribution was unsettled. J. Regev, E. Boaretto and colleagues published a radiocarbon chronology of Iron Age Jerusalem in the Proceedings of the National Academy of Sciences — 103 measurements, using a calibration correction the paper itself establishes — and concluded that the city's major eighth-century fortification programme belongs to the later years of Uzziah, in the middle of the century, rather than to Hezekiah at its end. Uzziah is credited in 2 Chronicles 26:9 with building towers in Jerusalem and fortifying them, and a devastating earthquake around 760 BC, remembered in Amos 1:1 and Zechariah 14:5, gives a reason to rebuild.",
          "Now the caution, because the popular reporting has run ahead of the paper. That study did not date the Broad Wall. Its samples come from excavation areas on the south-eastern ridge and the Giv'ati parking lot — the City of David — and neither the Jewish Quarter nor the western hill was sampled. The wall's redating is an inference: if the city's eighth-century fortification effort as a whole sits a few decades earlier than assumed, the wall built in that effort moves with it. That is a reasonable inference from good data. It is not the same thing as a date measured on this wall, and an article that reported it as one would be overstating a real result.",
          "So the honest position is that the wall's attribution is currently open between two Judahite kings roughly forty years apart, that the case for Uzziah rests on radiocarbon from elsewhere in the city and the case for Hezekiah on the fit with Isaiah 22 and 2 Chronicles 32:5, and that neither is presently decisive. Nothing in the dispute touches the two things the wall actually demonstrates: that Jerusalem's western hill was fortified in the eighth century BC, and that houses were demolished to do it.",
        ],
      },
    ],
    verses: [
      { reference: "Isaiah 22:10", note: "\"You broke down the houses to fortify the wall\" — the demolished foundations under the wall's course" },
      { reference: "Nehemiah 3:8", note: "The rebuilders fortify Jerusalem \"even to the wide wall\"" },
      { reference: "Nehemiah 12:38", note: "The wall named again as a landmark on the procession route" },
      { reference: "2 Chronicles 32:5", note: "Hezekiah builds up the broken wall and raises towers" },
      { reference: "2 Chronicles 26:9", note: "Uzziah builds and fortifies towers in Jerusalem — the alternative attribution" },
      { reference: "Amos 1:1", note: "\"Two years before the earthquake\" — the mid-eighth-century event now proposed as the trigger" },
    ],
    sources: [
      { label: "Wikipedia: Broad Wall (Jerusalem)", url: "https://en.wikipedia.org/wiki/Broad_Wall_(Jerusalem)" },
      { label: "Regev et al., Radiocarbon chronology of Iron Age Jerusalem (PNAS 2024, open access)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11087761/" },
    ],
    discovery: {
      objectType: "Fortification wall about 7 m thick, 65 m exposed, of large roughly dressed limestone blocks",
      findSite: "Jewish Quarter of the Old City, on Jerusalem's western hill",
      findSiteId: "jerusalem",
      findSiteKind: "location",
      foundYear: "1970",
      foundBy: "N. Avigad, in the Jewish Quarter excavations he directed from 1969 for the Hebrew University, the Israel Exploration Society and the Department of Antiquities",
      objectDate: "Eighth century BC. Traditionally Hezekiah, late in the century; a 2024 radiocarbon study reassigns the city's eighth-century fortification programme to Uzziah, mid-century",
      objectDateCertainty: "disputed",
      currentLocation: "In situ and open to the public in the Jewish Quarter, Jerusalem",
    },
    citations: [
      {
        tier: "institution",
        label: "Israel Exploration Society",
        url: "https://israelexplorationsociety.com/",
        credit: "The Israel Exploration Society, Jerusalem",
        detail: "One of the three bodies under which N. Avigad's Jewish Quarter excavation ran, and the publisher of its final reports in the Qedem series",
        supports: "The excavating body and the publication of the dig",
      },
      {
        tier: "scholarly",
        label: "J. Regev et al., \"Radiocarbon chronology of Iron Age Jerusalem reveals calibration offsets and architectural developments\"",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11087761/",
        credit: "Johanna Regev, Yuval Gadot, Joe Uziel, Elisabetta Boaretto and colleagues",
        detail: "PNAS 121:19 (29 April 2024), e2321024121, doi:10.1073/pnas.2321024121. Open access. Note that its sampled areas are on the south-eastern ridge, not the Jewish Quarter",
        supports: "The redating of the eighth-century fortification programme to Uzziah, and the limit of what the study sampled",
      },
      {
        tier: "scholarly",
        label: "N. Avigad, Discovering Jerusalem",
        credit: "Nahman Avigad, Hebrew University of Jerusalem",
        detail: "Nashville, 1983 — the excavator's own account of the Jewish Quarter dig, including the wall and the demolished house foundations beneath it. Print only",
        supports: "The find, the dimensions and the demolished houses",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Broad Wall (Jerusalem)",
        url: "https://en.wikipedia.org/wiki/Broad_Wall_(Jerusalem)",
      },
    ],
    reflectionPrompt:
      "Someone's house was pulled down so the city could survive. What have you been asked to give up for something larger than your own plans?",
  },
  {
    id: "pilgrimage-road-jerusalem",
    name: "Pilgrimage Road",
    // NOT registered: "Herodian Street". It is a real name for this road and far too generic to
    // register — every paved first-century street in Jerusalem is called one, and the two the
    // Robinson's Arch and Trumpeting articles describe are a different street at the south-west
    // corner. Registering it put three wrong links on those two articles.
    alternateNames: ["Stepped Street"],
    category: "discovery",
    role: "First-Century Monumental Street from the Pool of Siloam to the Temple Mount",
    summary:
      "Six hundred metres of paved, stepped street running uphill from the Pool of Siloam to the Temple — the road pilgrims actually walked, dated by the coins sealed beneath its slabs.",
    sections: [
      {
        heading: "Dug Sideways, Under a Living Neighbourhood",
        paragraphs: [
          "Sections of a monumental Herodian street had been glimpsed for well over a century — C. Warren in the 1880s, F. Bliss and A. Dickey in the 1890s, K. Kenyon in the 1960s — and each time reburied. The systematic excavation of its full run began under the Israel Antiquities Authority in the 2000s and continued through the 2010s and into the 2020s, with R. Reich, E. Shukron, Y. Billig, J. Uziel, N. Szanton, M. Hagbi and A. Levy among the directors across its phases.",
          "The street is about 600 metres long and about eight metres wide, paved with large flagstones and rising in a repeated rhythm of two steps and a long landing, two steps and a landing — the profile of a road built for crowds moving uphill rather than for carts. It runs from the Pool of Siloam, at the bottom of the City of David ridge, to the southern end of the Temple Mount. Drainage channels run beneath it, and shops opened onto it.",
          "It could not be excavated from above. The modern neighbourhood of Silwan sits directly over it, so the dig proceeded horizontally, tunnelling along the line of the road under the houses, shoring the ceiling with steel and concrete as it went. That method is why the road exists to be walked today and is also the substance of the argument about it, which the last section takes up.",
        ],
      },
      {
        heading: "The Road in the Gospels' Background",
        paragraphs: [
          "Nothing in the New Testament names this street, and it should not be presented as though something did. What it supplies is the physical setting of a great deal that the Gospels take for granted. Luke 2:41-42 has Jesus's family going up to Jerusalem every year for Passover; John 5:1 and repeatedly elsewhere has him going up for a feast; the Songs of Ascents in Psalms 122 are pilgrimage songs about arriving at the gates. Pilgrims arriving from the south reached the city at the pool, washed, and climbed. This is the climb.",
          "The connection to John 9 is more direct. The man born blind is sent to wash in the pool of Siloam and comes back seeing; the pool is at the foot of this road, and the way back into the city from it is this pavement.",
          "One object found on this same ridge belongs beside the street. The Theodotus Inscription, recovered from a cistern in the City of David, records a priest who built a synagogue for the reading of the Law together with a guest house and water installations for visitors from abroad. That is the other half of what a pilgrimage city needed: a road to arrive on, and somewhere to sleep at the end of it.",
          "The dating is the other thing the excavation supplies, and it is unusually tight. More than a hundred coins were recovered from the sealed fills directly beneath the paving. N. Szanton, M. Hagbi, J. Uziel and D. Ariel published the analysis in Tel Aviv in 2019: the latest coins under the slabs are of the year 30/31 AD, struck under Pontius Pilate, and none later appears. Since a coin cannot get under a stone laid before it was minted, the street cannot have been finished before about AD 31 — placing its completion inside Pilate's prefecture, which is to say within a few years of the ministry of Jesus.",
        ],
      },
      {
        heading: "What the Coins Prove, and What the Tunnel Costs",
        paragraphs: [
          "Two claims travel with this find, and they need separating. The first is the one the coins support: the street was completed no earlier than about AD 31. That is a hard result and a valuable one. The second is the headline the first became — \"Pontius Pilate built the Pilgrimage Road\" — and it goes further than the evidence. Coins sealed under a pavement give the earliest date the pavement can have been laid; they do not name a builder, do not show that construction was a single campaign, and do not rule out that most of the work was done earlier and the last slabs laid late. The excavators themselves describe a project begun around AD 20 and completed under Pilate. Pilate is the prefect in whose term the road was finished; calling him its builder is an inference, and one that has been printed far more confidently than it was argued.",
          "The method is disputed by serious people. J. Magness has objected that horizontal excavation divorces remains from what lies above and around them, which is the information stratigraphy exists to preserve; Y. Mizrachi, of the organisation Emek Shaveh, has argued that the technique cannot generate enough data to establish securely when the road was built or how it fitted into the city, and has criticised the pace of scientific publication. The excavators answer that the tunnelling is conducted stratigraphically, section by section, and documented in three dimensions as it proceeds; A. Maeir, who directs an unrelated excavation, has publicly described the IAA team's work here as properly stratigraphic. A reader is entitled to know that this is an open methodological argument among archaeologists rather than a settled point.",
          "There is a further dispute that is not archaeological and that this article does not adjudicate. The excavation runs beneath an inhabited Palestinian neighbourhood, within a national park operated by Elad, a private organisation that also promotes Jewish settlement in Silwan, and residents and several NGOs oppose it. Those objections are about property, planning and politics rather than about pottery, and they are a real part of this site's story even though they bear on the dating of the road not at all.",
        ],
      },
    ],
    verses: [
      { reference: "John 9:6-7", note: "Sent to wash at the pool at the foot of this road" },
      { reference: "Luke 2:41-42", note: "Going up to Jerusalem for Passover, every year" },
      { reference: "Psalms 122:1-4", note: "A Song of Ascents — the tribes going up" },
      { reference: "John 5:1", note: "Jesus goes up to Jerusalem for a feast" },
      { reference: "Luke 13:4", note: "\"The tower in Siloam\" — the same corner of the city in Jesus's speech" },
    ],
    sources: [
      { label: "Wikipedia: Stepped street (Jerusalem)", url: "https://en.wikipedia.org/wiki/Stepped_street_(Jerusalem)" },
      { label: "The Times of Israel: on the road, the method and the dispute", url: "https://www.timesofisrael.com/on-an-ancient-road-to-the-temple-archaeological-innovation-mystery-and-dispute/" },
    ],
    discovery: {
      objectType: "Paved stepped street about 600 m long and 8 m wide, with drainage channels and shops beneath and beside it",
      findSite: "From the Pool of Siloam to the southern Temple Mount, beneath the Silwan neighbourhood, Jerusalem",
      findSiteId: "pool-of-siloam",
      findSiteKind: "poi",
      foundYear: "Sections seen from the 1880s onward; systematically excavated from the 2000s through the 2020s",
      foundBy: "Israel Antiquities Authority, across several directorships — R. Reich and E. Shukron, then Y. Billig, J. Uziel, N. Szanton, M. Hagbi and A. Levy",
      objectDate: "Completed no earlier than AD 31, by the latest coins sealed beneath the paving; construction thought to have begun around AD 20",
      objectDateCertainty: "firm",
      currentLocation: "In situ beneath Silwan, Jerusalem; sections open to visitors",
    },
    citations: [
      {
        tier: "scholarly",
        label: "N. Szanton, M. Hagbi, J. Uziel and D. Ariel, \"Pontius Pilate in Jerusalem: The Monumental Street from the Siloam Pool to the Temple Mount\"",
        credit: "Nahshon Szanton, Moran Hagbi, Joe Uziel and Donald T. Ariel",
        detail: "Tel Aviv 46:2 (2019), 147-166, doi:10.1080/03344355.2019.1650491. The coin analysis that dates the pavement. Publisher paywall; bibliographic record confirmed through Crossref",
        supports: "The AD 31 terminus and the number of coins",
        paywalled: true,
      },
      {
        tier: "institution",
        label: "Israel Antiquities Authority — the Pilgrimage Road excavation",
        credit: "Israel Antiquities Authority",
        detail: "The licensing and excavating body for the road from the 2000s onward. The Authority's own site refused automated retrieval, so no URL is given rather than an unchecked one",
        supports: "Who is excavating, and under what authority",
      },
      {
        tier: "reference",
        label: "The Times of Israel: \"On an ancient road to the Temple, archaeological innovation, mystery and dispute\"",
        url: "https://www.timesofisrael.com/on-an-ancient-road-to-the-temple-archaeological-innovation-mystery-and-dispute/",
        credit: "The Times of Israel",
        detail: "Reporting that quotes J. Magness and Y. Mizrachi against the method and A. Levy and A. Maeir for it",
        supports: "The methodological dispute, stated on both sides",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Stepped street (Jerusalem)",
        url: "https://en.wikipedia.org/wiki/Stepped_street_(Jerusalem)",
      },
    ],
    reflectionPrompt:
      "Pilgrims sang the Songs of Ascents on a climb that took real effort, at the end of a long journey. What in your own life is worth arriving at slowly?",
  },
  {
    id: "robinsons-arch",
    name: "Robinson's Arch",
    category: "discovery",
    role: "Herodian Monumental Staircase at the South-West Corner of the Temple Mount",
    summary:
      "The springing of a vast arch still projecting from Herod's retaining wall, and beneath it the street where the platform's own stones landed when the city fell.",
    sections: [
      {
        heading: "A Bridge That Turned Out to Be a Staircase",
        paragraphs: [
          "In 1838 E. Robinson, an American biblical scholar walking the walls of Jerusalem, noticed three courses of large stones projecting from the western retaining wall of the Temple Mount, a little north of its south-west corner. He recognised them as the springing of an arch, and published the observation in Biblical Researches in Palestine in 1841. Reading Josephus, he took it for the remains of a bridge carrying a roadway across the central valley to the Upper City. The feature has carried his name ever since.",
          "C. Warren dug at the foot of the wall for the Palestine Exploration Fund between 1867 and 1870 and found a great pier standing some thirteen metres out from the wall, which he took to support a series of arches. The question was settled by B. Mazar, whose excavation at the southern and south-western foot of the Temple Mount ran from 1968 to 1978 on behalf of the Hebrew University, the Israel Exploration Society and the Department of Antiquities. The pier was not one of a row: it was the western support of a single enormous arch, about 15 metres across, and the arch did not carry a bridge across the valley at all. It carried a monumental staircase that rose from the Herodian street below, turned, and entered the Royal Stoa on top of the platform. R. Reich and Y. Billig excavated the collapse debris and the street beneath in the 1990s.",
        ],
      },
      {
        heading: "Where the Stones Landed",
        paragraphs: [
          "The best-known thing at this corner is not the arch but what lies under it. The Herodian street that ran along the base of the western wall was found buried under a mass of fallen ashlars — large dressed blocks levered off the top of the platform and thrown down, some of which struck the pavement hard enough to shatter it. They are still lying where they fell, and the visitor walks past them.",
          "This is the physical residue of AD 70. The Synoptic Gospels record Jesus, days before his arrest, being shown the buildings of the temple by his disciples and answering that not one stone would be left on another that would not be thrown down. Luke's version of the same week widens it to the city: the enemy will throw up a barricade, hem it in, and not leave one stone on another. Standing over that pile of blocks is the closest a reader gets to the sentence in physical form.",
          "The arch itself carries a different and quieter interest. Herod's platform was designed for volume — for pilgrim crowds arriving in their tens of thousands at the festivals — and this staircase is part of the engineering that handled them. It also fixes the Royal Stoa, the great colonnaded hall along the platform's southern edge, at the top of a public approach. That hall is the most likely setting for a good deal of the temple activity the Gospels describe.",
        ],
      },
      {
        heading: "Two Things the Fallen Stones Do Not Say",
        paragraphs: [
          "The first is a matter of reading. It is often written that the collapse at this corner fulfils Matthew 24:2 exactly. It does not, quite, and the difference is instructive. The wall these stones fell from is still standing — that is the Western Wall, and it is the most visited structure in Jerusalem. What was thrown down was the superstructure on top of the platform, not the platform's retaining walls. In the Gospels the disciples are pointing at the temple buildings, not at the substructure, so the saying and the rubble line up better than a careless reading suggests and worse than a triumphant one claims. Say what is there: the temple's own buildings were demolished and their stones pushed off the platform, and these are those stones.",
          "The second is about dating. The destruction layer at the foot of the wall is securely first century — a Roman milestone cut down from one of the staircase's handrails puts the demolition no later than AD 79, and the coins and pottery in the collapse are of the revolt. That establishes when the arch fell. It says nothing about when any Gospel was written, and the fallen stones therefore cannot be used to show that a prediction preceded its fulfilment. That question belongs to the study of the texts, not to this corner of the wall, and an article that borrowed the stones to settle it would be borrowing evidence that does not reach.",
          "A third and smaller correction is owed to E. Robinson himself. He found the arch and he misread it, and the reading stood for 130 years until an excavation went underneath it. It is a useful reminder about identifications made from the surface, including confident ones made by careful people.",
        ],
      },
    ],
    verses: [
      { reference: "Matthew 24:1-2", note: "\"Not one stone on another, that will not be thrown down\"" },
      { reference: "Mark 13:1-2", note: "\"See what kind of stones and what kind of buildings!\"" },
      { reference: "Luke 21:5-6", note: "The temple's beautiful stones and the same answer" },
      { reference: "Luke 19:41-44", note: "The wider warning over the city, wept before it was given" },
    ],
    sources: [
      { label: "Wikipedia: Robinson's Arch", url: "https://en.wikipedia.org/wiki/Robinson%27s_Arch" },
      { label: "BiblePlaces: the southern Temple Mount excavations", url: "https://www.bibleplaces.com/southerntm/" },
    ],
    discovery: {
      objectType: "Springing of a stone arch about 15 m in span, projecting from the Herodian retaining wall, with its pier and the collapsed street below",
      findSite: "South-west corner of the Temple Mount, at the foot of the western retaining wall, Jerusalem",
      findSiteId: "western-wall",
      findSiteKind: "poi",
      foundYear: "Identified 1838; pier found 1867-1870; excavated 1968-1978; collapse debris 1994-1996",
      foundBy: "E. Robinson identified it in 1838. C. Warren found the pier for the Palestine Exploration Fund. B. Mazar's excavation of 1968-1978 established that it carried a staircase, not a bridge; R. Reich and Y. Billig dug the collapse",
      objectDate: "Herodian — the Temple Mount expansion from about 20 BC; destroyed AD 70",
      objectDateCertainty: "firm",
      currentLocation: "In situ in the Jerusalem Archaeological Park, at the south-west corner of the Temple Mount",
    },
    citations: [
      {
        tier: "institution",
        label: "Palestine Exploration Fund",
        url: "https://www.pef.org.uk/history/",
        credit: "The Palestine Exploration Fund",
        detail: "The body that sponsored C. Warren's Jerusalem excavations of 1867-1870, which first exposed the pier at the foot of the wall",
        supports: "Warren's work and its sponsor",
      },
      {
        tier: "scholarly",
        label: "B. Mazar, The Temple Mount Excavations in Jerusalem 1968-1978: Final Reports",
        credit: "Benjamin Mazar, Hebrew University of Jerusalem; series continued by others",
        detail: "Qedem monograph series, Institute of Archaeology, Hebrew University. The excavation that showed the arch carried a monumental staircase rather than a bridge. Print only",
        supports: "The reinterpretation of the arch and the excavation dates",
      },
      {
        tier: "reference",
        label: "BiblePlaces: Southern Temple Mount Excavations",
        url: "https://www.bibleplaces.com/southerntm/",
        credit: "Todd Bolen",
        detail: "A photographic and descriptive survey of the excavated area, including the first-century street covered by stones pushed down from the platform",
        supports: "The fallen ashlars on the Herodian street",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Robinson's Arch",
        url: "https://en.wikipedia.org/wiki/Robinson%27s_Arch",
      },
    ],
    reflectionPrompt:
      "The stones at the bottom of this wall were the pride of a generation, and they were pushed off a ledge. What are you building that will not last, and is that a reason to stop or a reason to build it well?",
  },
  {
    id: "place-of-trumpeting-inscription",
    name: "Place of Trumpeting Inscription",
    alternateNames: ["Trumpeting Place Inscription"],
    category: "discovery",
    role: "First-Century Hebrew Signpost from the Top of the Temple Wall",
    summary:
      "A signpost from the parapet at the highest corner of Herod's Temple Mount, telling a priest where to stand to blow the trumpet — found in the rubble at the bottom of the wall it fell from.",
    sections: [
      {
        heading: "Found at the Foot of the Corner It Fell From",
        paragraphs: [
          "In 1968, in the first season of the great excavation at the southern and south-western foot of the Temple Mount, B. Mazar's team recovered a large inscribed block from the debris beside the south-west corner. It is about 84 by 31 by 26 centimetres. Published descriptions of the stone differ on whether it is limestone or basalt, and this article does not pick between them. Its shape is the interesting part: the inscription is cut above a wide hollow worked into one face, which indicates the block was part of a parapet — a railing along the top of a wall — rather than a free-standing sign.",
          "It carries two complete words in square Hebrew script, l-beit ha-teqi'ah, \"to the place of trumpeting\", and the beginning of a third word that is broken away. The two commonest restorations are lehakhriz, \"to announce\", and lehavdil, \"to separate\" or \"to distinguish\" — the second reading pointing to the Sabbath's boundary between holy time and ordinary time. Neither can be established from what survives, and the article names both rather than choosing.",
          "The block was lying in the collapse layer on the Herodian street, together with the other stones levered off the platform when the city fell in AD 70. It had been at the top of the wall and it ended up at the bottom, where it stayed for nineteen centuries.",
        ],
      },
      {
        heading: "The Trumpet That Started the Sabbath",
        paragraphs: [
          "Josephus, writing about the temple in The Jewish War, describes the point at the corner of the roof where a priest stood to give notice by trumpet of the approach of the seventh day on the afternoon before it, and of its close on the following evening. The stone is a label for that spot. It is one of the very few objects from the Second Temple that is not a fragment of decoration or a coin but a piece of the building's working signage — the ancient equivalent of a sign on a door.",
          "Behind it lies a long biblical practice. Numbers 10:1-10 establishes two silver trumpets, made of beaten work, blown by the sons of Aaron, to gather the congregation, to move the camp, to sound the alarm in war, and to mark the festivals and new moons. Psalms 81:3 calls for the trumpet at the new moon and the full moon on the feast day. Nehemiah, four centuries before Herod, describes ordering Jerusalem's gates shut as the Sabbath began, which is the same problem — a city needs to know, at a specific moment, that the day has changed.",
          "This is not the only surviving piece of the temple\u2019s public signage. One other stone survives: a notice in Greek that stood on the soreg, the low balustrade around the inner courts, warning Gentiles not to pass it. That is the Soreg Inscription, treated in its own article here. Between them the two stones mark the enclosure\u2019s outer limit and its highest point, and both were meant to be read by people arriving rather than by people already inside.",
          "There is also a small and human detail. The corner of the Temple Mount this stone stood on is the highest point of the whole enclosure, standing above the meeting of two valleys. A priest sent up there twice a week was climbing to the most exposed place in Jerusalem to be heard.",
        ],
      },
      {
        heading: "What Is Broken Off, and What Is Only Likely",
        paragraphs: [
          "The honest limit here is a missing word and an unfixed position. The inscription is incomplete, and its final word — the one that would say what the trumpeting was for — is exactly the part that did not survive. Everything a reader is told about the Sabbath announcement comes from Josephus and from the restoration, not from the stone, which says only \"to the place of trumpeting\" and then stops.",
          "The stone's original location is likewise an inference. It was found in secondary position, in a collapse heap, and heaps move: it is very probable that it fell from the south-west corner directly above, since that is the nearest high point and the debris there is the platform's own, but nothing in the excavation pins it to a particular metre of parapet. Some scholars have connected the corner with the \"pinnacle of the temple\" of the temptation narrative; that connection is a guess about a Greek word, and this article does not make it.",
          "One further piece of housekeeping. The inventory number given for the stone in many popular accounts could not be confirmed against any published museum record that would open to a check, so no number is printed here. The stone is in the Israel Museum in Jerusalem. That much is not in doubt, and a plausible catalogue number is not worth the risk of printing a wrong one.",
        ],
      },
    ],
    verses: [
      { reference: "Numbers 10:1-10", note: "The two silver trumpets, blown by the priests for the assembly, the journey and the feasts" },
      { reference: "Psalms 81:3", note: "\"Blow the trumpet at the New Moon, at the full moon, on our feast day\"" },
      { reference: "Nehemiah 13:19-22", note: "The gates shut as the Sabbath begins — the same need for a public signal" },
      { reference: "Matthew 24:1-2", note: "The buildings this parapet belonged to, and what was said about them" },
    ],
    sources: [
      { label: "Wikipedia: Trumpeting Place inscription", url: "https://en.wikipedia.org/wiki/Trumpeting_Place_inscription" },
      { label: "BiblePlaces: the southern Temple Mount excavations", url: "https://www.bibleplaces.com/southerntm/" },
    ],
    discovery: {
      objectType: "Inscribed parapet block, about 84 x 31 x 26 cm, with two and a fragment of a third word in square Hebrew script; sources differ on whether the stone is limestone or basalt",
      findSite: "Collapse debris on the Herodian street beside the south-west corner of the Temple Mount, Jerusalem",
      findSiteId: "western-wall",
      findSiteKind: "poi",
      foundYear: "1968",
      foundBy: "B. Mazar's Temple Mount excavation, for the Hebrew University, the Israel Exploration Society and the Department of Antiquities",
      objectDate: "First century AD, before the destruction of AD 70",
      objectDateCertainty: "firm",
      currentLocation: "Israel Museum, Jerusalem. The inventory number given in popular accounts could not be confirmed against a published museum record and is therefore not printed here",
    },
    citations: [
      {
        tier: "institution",
        label: "Israel Museum, Jerusalem",
        credit: "The Israel Museum, Jerusalem",
        detail: "The holding institution. Its online collection pages are rendered by script and returned no readable object record to an automated check, so no URL is given rather than an unverified one",
        supports: "Current location",
      },
      {
        tier: "scholarly",
        label: "B. Mazar, The Temple Mount Excavations in Jerusalem 1968-1978: Final Reports",
        credit: "Benjamin Mazar, Hebrew University of Jerusalem; series continued by others",
        detail: "Qedem monograph series, Institute of Archaeology, Hebrew University. The excavation that recovered the block from the collapse layer. Print only",
        supports: "The find, its context and its date",
      },
      {
        tier: "primary",
        label: "Josephus, The Jewish War IV.ix.12",
        credit: "Flavius Josephus",
        detail: "The passage describing the place on the temple where a priest signalled the beginning and end of the Sabbath by trumpet — the practice the stone labels",
        supports: "What the sign was for",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Trumpeting Place inscription",
        url: "https://en.wikipedia.org/wiki/Trumpeting_Place_inscription",
      },
    ],
    reflectionPrompt:
      "Someone had to climb to the highest, coldest corner of the city twice a week so that everyone else would know the Sabbath had begun. Whose rest depends on work you do that nobody sees?",
  },
  {
    id: "stepped-stone-structure",
    name: "Stepped Stone Structure",
    category: "discovery",
    role: "The Largest Iron Age Structure Standing in Jerusalem",
    summary:
      "An eighteen-metre wall of stepped stone terracing on the eastern slope of the City of David, dug in pieces across sixty years by three excavators who did not agree about when it was built.",
    sections: [
      {
        heading: "Three Excavations, Sixty Years Apart",
        paragraphs: [
          "The structure is a mantle of stones laid in courses down the steep eastern slope of the City of David ridge, rising about eighteen metres, supported by a substructure of stone-filled terraces. It is the largest Iron Age construction still standing anywhere in Jerusalem, and no one has excavated all of it.",
          "R. Macalister and J. Duncan dug the top of it in the 1920s for the Palestine Exploration Fund, called it a ramp, and assigned it to the Jebusites — the pre-Israelite inhabitants — on the assumption that anything that massive on that ridge must be the citadel David captured. K. Kenyon dug a deep trench through the slope in the 1960s and reached a different answer: the structure belonged to the beginning of Iron Age II, around 1000 to 900 BC, which put it in the era of David and Solomon rather than before it. Y. Shiloh's excavation between 1978 and 1985 worked the largest exposure yet and distinguished two things that had been treated as one — an earlier system of stone-filled terraces, and a later stone mantle laid over them — with the terracing older than the mantle.",
          "That layered picture is the reason the argument has lasted. It is not one wall of one date. It is a slope engineered repeatedly over centuries, with each phase using and burying the last, and the deep cuts needed to date the bottom were made before modern sampling methods existed.",
        ],
      },
      {
        heading: "The Millo Question",
        paragraphs: [
          "The Hebrew Bible has a word for a construction in this part of Jerusalem whose meaning nobody is certain of: ha-Millo, from a root meaning \"to fill\". 2 Samuel 5:9 says David lived in the stronghold, called it David's city, and built \"around from Millo and inward\". Solomon builds the Millo in 1 Kings 9:15 and again in 1 Kings 11:27, where the same verse says he repaired the breach of his father's city. Hezekiah strengthens the Millo in 2 Chronicles 32:5 as part of the same emergency that produced the tunnel.",
          "A stone-filled terrace system supporting a slope is a good candidate for something called \"the fill\", and the identification has been made by the excavators themselves — K. Kenyon and Y. Shiloh both proposed it, and E. Mazar worked with it. It fits the word, it fits the location, and it fits a structure that was evidently built up and repaired more than once. It is not proven and it cannot be: the biblical texts give no dimensions and no location precise enough to test, and no inscription attaches the name to these stones. The app therefore states it as a proposal made by the people who dug the structure, and not as a finding.",
          "Whatever it is called, the structure carries one thing on its own. Terracing and mantling a slope on this scale requires organised labour, planning, and a reason. Somebody in Iron Age Jerusalem could command that, which is a statement about the city's political weight and is independent of every argument about which century it happened in.",
        ],
      },
      {
        heading: "Where the Readings Disagree",
        paragraphs: [
          "The disagreement is real and it is not between believers and sceptics. R. Macalister put it before David; K. Kenyon put it at the start of the tenth century; Y. Shiloh separated an earlier terrace system, which he took back into the Late Bronze or early Iron Age, from a mantle he placed in Iron I or early Iron II. E. Mazar, excavating above it after 2005, treated the mantle as the support of a tenth-century royal building and read the whole as one complex.",
          "Against that stands the Tel Aviv University reading. I. Finkelstein, L. Singer-Avitz, Z. Herzog and D. Ussishkin argued in 2007 that most of the walls in this area belong not to the Iron Age at all but to Hellenistic buildings that R. Macalister and J. Duncan had already uncovered in the 1920s and misdated. If they are right, part of what is shown to visitors as tenth-century Jerusalem is centuries younger than the label. M. Steiner, who published K. Kenyon's Jerusalem material, reports that argument and adds one of her own that bears on it: most of this ground had been dug before, by Macalister and Duncan and then by Kenyon, which she says makes it almost impossible to establish how the walls connect or to date them. Her own position on this structure follows Kenyon rather than Finkelstein — the credit belongs where it is put here, because handing one scholar another's argument is a factual error about a living person's views and the app treats it as one.",
          "The honest summary is this. That there is monumental Iron Age engineering on this slope is not in dispute by anyone. Its earliest phase is probably pre-monarchic or early monarchic. Its latest phase may be very much later. Which courses belong to which phase cannot presently be settled, because the excavations that would settle it were dug in the 1920s and 1960s to standards that did not record what would now be needed, and the structure cannot be dismantled to check. A reader should hold the phrase \"the largest Iron Age structure in Jerusalem\" firmly and the phrase \"David's citadel\" loosely.",
        ],
      },
    ],
    verses: [
      { reference: "2 Samuel 5:6-9", note: "David takes the stronghold of Zion and builds \"around from Millo and inward\"" },
      { reference: "1 Kings 9:15", note: "Solomon's levy builds the Millo and Jerusalem's wall" },
      { reference: "1 Kings 11:27", note: "Solomon builds Millo and repairs the breach of his father's city" },
      { reference: "2 Chronicles 32:5", note: "Hezekiah strengthens Millo in David's city" },
    ],
    sources: [
      { label: "Wikipedia: Stepped Stone Structure", url: "https://en.wikipedia.org/wiki/Stepped_Stone_Structure" },
      { label: "M. Steiner, \"The 'Palace of David' Reconsidered in the Light of Earlier Excavations\" (Bible and Interpretation)", url: "https://bibleinterp.arizona.edu/articles/palace_2468" },
    ],
    discovery: {
      objectType: "Stepped stone mantle about 18 m high over a substructure of stone-filled terraces, on a steep slope",
      findSite: "Eastern slope of the City of David ridge, Jerusalem",
      findSiteId: "city-of-david",
      findSiteKind: "poi",
      foundYear: "1923-1925, 1961-1967, 1978-1985 — three separate excavations",
      foundBy: "R. Macalister and J. Duncan in the 1920s; K. Kenyon in the 1960s; Y. Shiloh from 1978 to 1985",
      objectDate: "Disputed. The terrace substructure is placed by most excavators in the Late Bronze or early Iron Age; the mantle in Iron I or Iron II; and the uppermost portion is argued by some to be Hellenistic",
      objectDateCertainty: "disputed",
      currentLocation: "In situ in the City of David archaeological park, Jerusalem",
    },
    citations: [
      {
        tier: "institution",
        label: "Palestine Exploration Fund",
        url: "https://www.pef.org.uk/history/",
        credit: "The Palestine Exploration Fund",
        detail: "Sponsor of the 1920s Ophel excavation by R. Macalister and J. Duncan, the first to expose the top of the structure",
        supports: "The first excavation and its sponsor",
      },
      {
        tier: "scholarly",
        label: "M. Steiner, \"The 'Palace of David' Reconsidered in the Light of Earlier Excavations\"",
        url: "https://bibleinterp.arizona.edu/articles/palace_2468",
        credit: "Margreet L. Steiner, publisher of K. Kenyon's Jerusalem excavation material",
        detail: "The Bible and Interpretation, University of Arizona, September 2009. Freely readable. Reports the Tel Aviv 2007 argument and sets out the difficulty created by the earlier excavations on the same ground",
        supports: "That the ground was dug before, and who originated the Hellenistic reading",
      },
      {
        tier: "scholarly",
        label: "I. Finkelstein, L. Singer-Avitz, Z. Herzog and D. Ussishkin, \"Has King David's Palace in Jerusalem been Found?\"",
        credit: "Israel Finkelstein, Lily Singer-Avitz, Ze'ev Herzog and David Ussishkin, Tel Aviv University",
        detail: "Tel Aviv 34:2 (2007), 142-164, doi:10.1179/tav.2007.2007.2.142. The paper that argues most of the walls here are Hellenistic. Publisher paywall; record confirmed through Crossref",
        supports: "The Hellenistic reading of the upper walls, credited to the people who made it",
        paywalled: true,
      },
      {
        tier: "scholarly",
        label: "Y. Shiloh, Excavations at the City of David I: 1978-1982",
        credit: "Yigal Shiloh, Institute of Archaeology, Hebrew University of Jerusalem",
        detail: "Qedem 19, Jerusalem, 1984 — the interim report distinguishing the terrace substructure from the stone mantle above it. The Area G pottery on which its dating rests is being published by J. Cahill West, who supervised the excavation of the structure. Print only",
        supports: "The two-element reading of the structure, and the Millo proposal",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Stepped Stone Structure",
        url: "https://en.wikipedia.org/wiki/Stepped_Stone_Structure",
      },
    ],
    reflectionPrompt:
      "Three careful people looked at the same stones and read three different centuries in them. Where have you mistaken a strong conviction for a settled fact?",
  },
  {
    id: "large-stone-structure",
    name: "Large Stone Structure",
    category: "discovery",
    role: "Monumental Walls in the City of David, Claimed as David's Palace",
    summary:
      "Massive undressed walls at the top of the City of David ridge, announced in 2005 as the palace built for David — and disputed since, over whether they are even one building.",
    sections: [
      {
        heading: "A Building Looked for Before It Was Found",
        paragraphs: [
          "This excavation is unusual in that the interpretation preceded the dig. E. Mazar had argued in print, years earlier, that David's palace should lie at the northern top of the City of David ridge, and her reason was a verse. 2 Samuel 5:17 says that when the Philistines came up after David's anointing, David \"went down to the stronghold\" — down, she reasoned, from a residence that must therefore have stood above the fortified ridge, north of the Stepped Stone Structure. She went to that spot to look, and in February 2005, with sponsorship from the Shalem Center, she began digging on land held by Elad, the private foundation that runs the City of David site. She announced the find on 4 August 2005.",
          "What came out were walls of large undressed stones. The first, in 2005, ran about thirty metres east to west and was up to three metres wide; a north-south wall exposed the following season was about six metres wide, and by 2007 walls up to seven metres thick had been reported. Pottery in the fills beneath was Iron Age I; pottery in the deposits above and against was Iron Age II. On that stratigraphic sandwich E. Mazar placed the construction at the transition between them — the eleventh or tenth century BC. A bone from the complex was radiocarbon dated by E. Boaretto at the Weizmann Institute to somewhere between about 1050 and 780 BC — a range of nearly three centuries, and worth pausing on, because it reaches down into the ninth and is therefore as consistent with the date the critics propose as with hers. It rules some things out; it does not settle this. Two Phoenician-style ivory inlays were also recovered, and a Black-on-Red vessel usually dated to the later tenth century, though Black-on-Red ware is itself one of the disputed hinges of the chronology this article is about.",
          "Later material from the same area is not in dispute and is worth its own sentence. Two clay bullae found here name Jehucal son of Shelemiah and Gedaliah son of Pashhur — two royal officials whom Jeremiah 38:1 names together, as men who heard Jeremiah's words and moved against him. Whoever built the walls, the ground they stand on was in official use in Jerusalem's last generation before 586 BC.",
        ],
      },
      {
        heading: "What Would Have to Be True",
        paragraphs: [
          "2 Samuel 5:11 and 1 Chronicles 14:1 both report that Hiram of Tyre sent David cedar, carpenters and masons, and that they built David a house. Phoenician craftsmen building for a king in Jerusalem is precisely what those verses describe, and Phoenician-style ivories in a monumental building on the ridge are the kind of object those verses would predict. That is a real and interesting convergence, and it is why the claim was taken seriously rather than dismissed.",
          "Four separate things have to hold before \"David's palace\" is established, and the clearest statement of them is M. Steiner's — one of the excavation's critics — who lists the evidence that would have to be provided: that the walls belong to one and the same building; that the building dates to the tenth century BC; that it functioned as a palace; and that it was David who put his throne there. It is a fair test, it is hers rather than this app's, and the argument turns on which of the four are in evidence.",
          "E. Mazar's strongest argument is architectural rather than scriptural, and it belongs here because the rest of this article turns on it: she held that the Large Stone Structure and the Stepped Stone Structure below it are one integrated complex, the stepped terracing serving as the retaining substructure that carries the building above. That is a claim about stones, testable against stones, and it is the claim her critics and her defenders have actually argued about.",
          "What the excavation did not produce is a name. Nothing found there names David, names a king, or says \"palace\" — no inscription, no throne room identified as such, no royal seal from the building phase. Beyond the structural argument, the identification rests on location, on date, on scale, and on a reading of 2 Samuel 5:17 that has to carry a great deal of weight for a single preposition.",
        ],
      },
      {
        heading: "The Case Against, Stated by the People Who Make It",
        paragraphs: [
          "I. Finkelstein, L. Singer-Avitz, Z. Herzog and D. Ussishkin published a joint response in Tel Aviv in 2007 under the title \"Has King David's Palace in Jerusalem been Found?\" Their answer is no, and their argument is mostly about the first of the four conditions above. They contend that the walls do not form a single structure; that the western walls align with later remains including a ritual bath they date to the Hasmonean period; and that on the published evidence \"all one can safely say is that its various elements post-date the late Iron I/early Iron IIA and predate the Roman period\" — a window of roughly eight hundred years. They also argue, in as many words, that the biblical text rather than the stratigraphy drove the field operation.",
          "M. Steiner, who published K. Kenyon's Jerusalem material and knows the earlier digs on this exact ground, made a related case in 2009. Her point is partly about the site's history: most of the area E. Mazar excavated had been dug before, by R. Macalister and J. Duncan in the 1920s and by K. Kenyon in the 1960s, which she argues makes it \"almost impossible to establish a connection between the walls and to date the walls\". She reads three separate wall complexes, assigns some of the northern remains to the Middle Bronze Age, and concludes: \"Did Eilat Mazar find king David's palace? I would say not.\"",
          "The case is not one-sided and should not be reported as if it were — but the support must not be overstated either, and its shape is easy to get wrong. A. Mazar, a leading Iron Age archaeologist, accepted a monumental Iron Age building here and offered a different identification: the Jebusite fortress of Zion, the stronghold David took rather than the palace he built. A. Faust arrived at much the same place from the other direction. In the Zeitschrift des Deutschen Palästina-Vereins in 2010 he defended the structural half of E. Mazar's case — the Large Stone Structure and the Stepped Stone Structure are one complex, and the most impressive building of its period in the region — while dating that complex to Iron Age I and reading it as the Jebusite fortress rather than as David's palace. He agrees with her about the stones and disagrees with her about whose they were, and it would be a misuse of his paper to file him among her supporters. I. Finkelstein answered him in the same journal the following year. W. Dever has accepted a tenth-century date; J. Magness has argued the structure was built earlier still, in the twelfth century, and remained in use into the ninth.",
          "Here is where the app stands. There is monumental construction of the Iron Age on the summit of the City of David; that much survives every critic. Whether the excavated walls are one building is genuinely unresolved and cannot be resolved from the published sections. And even the scholars most willing to accept a tenth-century date mostly do not accept \"David's palace\" — because a date is not an owner. The claim was announced with more confidence than the evidence carried, and repeating that confidence would be a disservice to a reader who will meet the Tel Aviv article sooner or later. The stones are real, the argument is live, and the honest sentence is that a monumental Iron Age building stood here and we do not know whose it was.",
        ],
      },
    ],
    verses: [
      { reference: "2 Samuel 5:11", note: "Hiram of Tyre sends carpenters and masons, \"and they built David a house\"" },
      { reference: "1 Chronicles 14:1", note: "The same report, with cedar, masons and carpenters" },
      { reference: "2 Samuel 5:17", note: "David \"went down to the stronghold\" — the verse the excavation was planned around" },
      { reference: "Jeremiah 38:1", note: "Gedaliah son of Pashhur and Jucal son of Shelemiah — both named on bullae found here" },
      { reference: "Jeremiah 37:3", note: "The same official, spelled Jehucal, sent by Zedekiah to Jeremiah" },
    ],
    sources: [
      { label: "Wikipedia: Large Stone Structure", url: "https://en.wikipedia.org/wiki/Large_Stone_Structure" },
      { label: "M. Steiner, \"The 'Palace of David' Reconsidered in the Light of Earlier Excavations\" (Bible and Interpretation)", url: "https://bibleinterp.arizona.edu/articles/palace_2468" },
    ],
    discovery: {
      objectType: "Walls of large undressed stones. The first, found in 2005, runs about 30 m east to west and is up to 3 m wide; a north-south wall exposed in 2006 is about 6 m wide, and walls up to about 7 m thick were reported by 2007",
      findSite: "Summit of the City of David ridge, north of the Stepped Stone Structure, Jerusalem",
      findSiteId: "city-of-david",
      findSiteKind: "poi",
      foundYear: "2005",
      foundBy: "E. Mazar, sponsored by the Shalem Center, on land held by Elad, the foundation that operates the City of David site",
      objectDate: "Contested. The excavator placed the construction in the eleventh or tenth century BC; critics argue the exposed elements can only be said to post-date late Iron I / early Iron IIA and pre-date the Roman period",
      objectDateCertainty: "disputed",
      currentLocation: "In situ in the City of David archaeological park, Jerusalem",
    },
    citations: [
      {
        tier: "scholarly",
        label: "I. Finkelstein, L. Singer-Avitz, Z. Herzog and D. Ussishkin, \"Has King David's Palace in Jerusalem been Found?\"",
        credit: "Israel Finkelstein, Lily Singer-Avitz, Ze'ev Herzog and David Ussishkin, Tel Aviv University",
        detail: "Tel Aviv 34:2 (September 2007), 142-164, doi:10.1179/tav.2007.2007.2.142. The principal published objection. Publisher paywall; the bibliographic record was confirmed through Crossref",
        supports: "The argument that the walls are not one building, and the eight-hundred-year date window",
        paywalled: true,
      },
      {
        tier: "scholarly",
        label: "M. Steiner, \"The 'Palace of David' Reconsidered in the Light of Earlier Excavations\"",
        url: "https://bibleinterp.arizona.edu/articles/palace_2468",
        credit: "Margreet L. Steiner, publisher of K. Kenyon's Jerusalem excavation material",
        detail: "The Bible and Interpretation, University of Arizona, September 2009. Freely readable, and the source of the quotations in the third section",
        supports: "The three-complexes reading and the difficulty created by the earlier excavations on the same ground",
      },
      {
        tier: "scholarly",
        label: "E. Mazar, The Palace of King David: Excavations at the Summit of the City of David",
        credit: "Eilat Mazar, Institute of Archaeology, Hebrew University of Jerusalem",
        detail: "Preliminary report of the 2005-2007 seasons, Shoham Academic Research and Publication, Jerusalem and New York, 2009; her proposal was first put in Biblical Archaeology Review in 1997 and the find reported there in 2006. This is the excavator's own account, and it is the source of the pottery sequence, the wall dimensions, the radiocarbon result and the argument that the two structures are one complex. Print only",
        supports: "The excavator's case, in her own publication",
      },
      {
        tier: "scholarly",
        label: "A. Faust, \"The Large Stone Structure in the City of David: A Reexamination\", with I. Finkelstein's reply",
        credit: "Avraham Faust, Bar-Ilan University; Israel Finkelstein, Tel Aviv University",
        detail: "Zeitschrift des Deutschen Palästina-Vereins 126 (2010), 116-130, and Finkelstein, \"The 'Large Stone Structure' in Jerusalem: Reality versus Yearning\", ZDPV 127 (2011), 1-10. Faust reads the two structures as one Iron Age I complex and identifies it as the Jebusite fortress, not David's palace. Print and subscription only; the article body could not be opened to a check, and the conclusion here is taken from the published abstract and the author's institutional record",
        supports: "What A. Faust actually concluded, and that it is not an endorsement of the palace identification",
        paywalled: true,
      },
      {
        tier: "institution",
        label: "Israel Antiquities Authority — excavation licence and the City of David excavations",
        credit: "Israel Antiquities Authority",
        detail: "The licensing authority for excavation in the City of David. The Authority's own site refused automated retrieval, so no URL is given rather than an unchecked one",
        supports: "The regulatory context of the excavation",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Large Stone Structure",
        url: "https://en.wikipedia.org/wiki/Large_Stone_Structure",
      },
    ],
    reflectionPrompt:
      "An archaeologist read a verse, decided where to dig, and found something. That is either faith rewarded or a conclusion assumed — and telling the two apart is hard from the inside. Where might you be finding what you went looking for?",
  },
  {
    id: "warrens-shaft",
    name: "Warren's Shaft",
    alternateNames: ["Warren's Shaft System"],
    category: "discovery",
    role: "Natural Rock Chimney Beneath the City of David, Long Read as Joab's Way In",
    summary:
      "A vertical shaft above the Gihon Spring that generations were taught was how Joab took Jerusalem — a reading the excavators who dug it have since withdrawn.",
    sections: [
      {
        heading: "Warren Goes Down, and a Theory Goes Up",
        paragraphs: [
          "C. Warren, a Royal Engineers officer digging in Jerusalem for the Palestine Exploration Fund, found the shaft in 1867 and reported it to the Fund by letter that December. It is a vertical hole about thirteen metres deep, reached from inside the ridge by a sloping stepped tunnel and a curving horizontal passage, dropping to a point near the water of the Gihon Spring. The obvious reading was that the inhabitants of the city could stand at the top and lower buckets, drawing water without leaving the walls.",
          "From that reading a second one followed almost at once. 2 Samuel 5:8 has David, before the Jebusite stronghold, saying that whoever strikes the Jebusites should go up by the tsinnor — a Hebrew word of uncertain meaning, which the World English Bible renders \"the watercourse\". 1 Chronicles 11:6 adds that Joab went up first and was made chief. If the tsinnor was Warren's Shaft, the story becomes vivid and specific: Joab climbed the water shaft in the dark and opened the city from inside. It appeared in commentaries, study Bibles, tour guides and sermons for a hundred years.",
        ],
      },
      {
        heading: "What Is Actually Down There",
        paragraphs: [
          "The first of the two findings that undid the tidy reading is not the excavators' at all, and the credit is worth putting where it belongs. D. Gill, a geologist with the Geological Survey of Israel, showed in Science in 1991 that the shaft is not cut. It is a natural karstic chimney — a flaw dissolved in the limestone by water over a very long time — and the whole underground system is a set of natural karst channels that people adapted rather than quarried. Gill's own conclusion was that the adaptation produced a working water supply; the second finding is what disputes that.",
          "R. Reich and E. Shukron excavated the Gihon Spring and its surroundings from 1995 for fifteen years, and their reading of the cutting is that the tunnel now leading to the chimney's head was not driven to reach it at all: the passage was going somewhere else and broke into the chimney by accident, around the eighth century BC, some three centuries after David. On their account the shaft was never used to draw water — its walls are too irregular for a rope and bucket, and the water at the bottom too shallow.",
          "In place of the shaft they exposed something more impressive. Massive fortifications stand around the spring itself: a Spring Tower of very large stones enclosing the water, a second tower at the pool, and a fortified passage running from inside the city down to the protected spring. On the excavators' reading, that rather than a bucket on a rope is how the city drank under siege, and it is a far better piece of engineering than the shaft ever was. Note the qualifier: as the next section says, the date of those fortifications is itself now argued over, so which centuries this arrangement served is not a settled matter.",
          "So the corrected picture is: a fortified spring with a defended approach; and a natural chimney which, on the excavators' reading, was found by accident and never used to draw water at all — a reading that is itself disputed, as the next section says.",
        ],
      },
      {
        heading: "A Reading Its Own Excavators Retired",
        paragraphs: [
          "R. Reich and E. Shukron published their conclusion in Biblical Archaeology Review in 1999, and the magazine announced on its own account that the shaft theory of David's conquest had been shattered. That headline phrasing is the editors' rather than the authors', but the substance is the excavators' own. That is a strong thing to state about a popular reading, and this app states it, because the people who dug the site are the ones who withdrew it. An article that kept Joab climbing the shaft would be teaching a reading the excavators themselves abandoned, and a reader who later opened their report would rightly wonder what else had been left in place because it made a better story.",
          "It is not unanimous, and there are two dissents rather than one. A. Faust replied in the same magazine in 2003, arguing that the shaft was used to draw water after all: the Parker Mission of 1909-1911 demonstrably drew water up it, a tunnel was cut to bring water to its base, and cutting that tunnel required hauling the spoil out by exactly the means R. Reich and E. Shukron say was impractical. D. Gill, whose work established the karst in the first place, has likewise continued to read the shaft as part of a functioning water system, arguing that it served as a well in the Middle Bronze Age. Neither is a rehabilitation of Joab: on both readings the shaft's use is a matter of water supply, and even A. Faust accepts that it was not exposed until around 800 BC, long after David's conquest.",
          "The date of the spring fortifications is itself now in play, and this is a live argument between named specialists. J. Regev, J. Uziel, N. Szanton and E. Boaretto radiocarbon-dated the Spring Tower and concluded that it was built in the ninth century BC — not, as had been assumed for two decades, in the Middle Bronze Age. That would make the tower Judahite work rather than Canaanite, and it would mean it was not standing when David arrived. R. Reich answered them in Tel Aviv in 2018 with three arguments, and all three deserve stating rather than the easiest one: that the dated samples could have been carried in by flooding from the Kidron Valley; that the spot sampled may be an Iron Age repair to an older structure rather than the original build; and — the substantive one — that the tower's cyclopean masonry matches Middle Bronze fortifications at Gezer, Hebron and Shechem and looks nothing like Iron Age II fortification in Judah. That argument is open, and this article does not close it.",
          "And the word itself is unsettled. Tsinnor occurs twice in the Hebrew Bible and has been read as a shaft, a water channel, a fortified passage, a hook, a grappling iron and — on one proposal — a windpipe, making the line an instruction about throats rather than tunnels. The honest position is that nobody knows what David told his men to go up, that the shaft is not a good candidate for it, and that the fortified passage beside the spring is a better one without being a proven one.",
        ],
      },
    ],
    verses: [
      { reference: "2 Samuel 5:6-8", note: "The tsinnor, rendered \"the watercourse\" — the verse the whole theory hangs on" },
      { reference: "1 Chronicles 11:4-6", note: "Joab goes up first and is made chief" },
      { reference: "1 Kings 1:33", note: "Solomon brought down to Gihon to be anointed — the same spring" },
      { reference: "2 Chronicles 32:2-4", note: "Stopping the springs outside the city, the later solution to the same problem" },
    ],
    sources: [
      { label: "Wikipedia: Warren's Shaft", url: "https://en.wikipedia.org/wiki/Warren%27s_Shaft" },
      { label: "A. Faust, \"Warren's Shaft: Yes, It Was Used to Draw Water\" (summary, Center for Online Judaic Studies)", url: "https://cojs.org/warren-s_shaft-_avraham_faust-_bar_29-05-_sep-oct_2003/" },
    ],
    discovery: {
      objectType: "Natural karstic chimney about 13 m deep, reached by a cut stepped tunnel and horizontal passage",
      findSite: "Inside the City of David ridge above the Gihon Spring, Jerusalem",
      findSiteId: "city-of-david",
      findSiteKind: "poi",
      foundYear: "1867",
      foundBy: "C. Warren, for the Palestine Exploration Fund. Its natural karstic origin was established by D. Gill of the Geological Survey of Israel in 1991; R. Reich and E. Shukron re-excavated the spring area from 1995",
      objectDate: "The chimney is a natural feature. The tunnel system reaching it was cut in the Iron Age; the excavators date the accidental breach into the chimney to about the eighth century BC",
      objectDateCertainty: "disputed",
      currentLocation: "In situ in the City of David archaeological park, Jerusalem",
    },
    citations: [
      {
        tier: "institution",
        label: "Palestine Exploration Fund",
        url: "https://www.pef.org.uk/history/",
        credit: "The Palestine Exploration Fund",
        detail: "The body that sponsored C. Warren's Jerusalem excavations of 1867-1870 and published his first report of the shaft in its Quarterly Statement",
        supports: "The discovery, its date and its sponsor",
      },
      {
        tier: "scholarly",
        label: "R. Reich and E. Shukron, \"Light at the End of the Tunnel\"",
        credit: "Ronny Reich, University of Haifa, and Eli Shukron, Israel Antiquities Authority",
        detail: "Biblical Archaeology Review 25:1 (January/February 1999) — the excavators' own withdrawal of the shaft-and-conquest reading. Their full report is Excavations in the City of David, Jerusalem (1995-2010), Penn State University Press, 2021. Print and subscription only",
        supports: "The natural origin of the shaft, the accidental breach, and the retirement of the Joab reading",
        paywalled: true,
      },
      {
        tier: "reference",
        label: "A. Faust, \"Warren's Shaft: Yes, It Was Used to Draw Water\"",
        url: "https://cojs.org/warren-s_shaft-_avraham_faust-_bar_29-05-_sep-oct_2003/",
        credit: "Avraham Faust, Bar-Ilan University; summarised by the Center for Online Judaic Studies",
        detail: "Biblical Archaeology Review 29:5 (September/October 2003) — the published dissent from R. Reich and E. Shukron's conclusion that the shaft was never a water shaft",
        supports: "The dissenting case in the third section",
      },
      {
        tier: "scholarly",
        label: "D. Gill, \"Subterranean Waterworks of Biblical Jerusalem: Adaptation of a Karst System\"",
        credit: "Dan Gill, Geological Survey of Israel",
        detail: "Science 254 (6 December 1991), 1467-1471, doi:10.1126/science.254.5037.1467. The paper that established that the shaft and the passages around it are natural karst features adapted by people rather than quarried. Publisher paywall; record confirmed through Crossref",
        supports: "The natural origin of the shaft, credited to the geologist who established it",
        paywalled: true,
      },
      {
        tier: "scholarly",
        label: "J. Regev, J. Uziel, N. Szanton and E. Boaretto, \"Absolute Dating of the Gihon Spring Fortifications, Jerusalem\", and R. Reich's reply",
        credit: "Johanna Regev, Joe Uziel, Nahshon Szanton and Elisabetta Boaretto; Ronny Reich, University of Haifa",
        detail: "Radiocarbon 59:5 (2017), 1171-1193, doi:10.1017/rdc.2017.37 — the ninth-century redating of the Spring Tower. Answered by R. Reich, \"The Date of the Gihon Spring Tower in Jerusalem\", Tel Aviv 45:1 (2018), 114-119, doi:10.1080/03344355.2018.1412056. Both paywalled; both records confirmed through Crossref, and R. Reich's three arguments are summarised here from the published abstract rather than the article body",
        supports: "Both sides of the dispute over the date of the spring fortifications",
        paywalled: true,
      },
      {
        tier: "scholarly",
        label: "J. Regev et al., \"Radiocarbon chronology of Iron Age Jerusalem\"",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11087761/",
        credit: "Johanna Regev, Elisabetta Boaretto and colleagues",
        detail: "PNAS 121:19 (2024), e2321024121. Open access. Its Area C results place the Spring Tower in the tenth to ninth centuries BC rather than the Middle Bronze Age",
        supports: "The later radiocarbon work on the spring fortifications",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Warren's Shaft",
        url: "https://en.wikipedia.org/wiki/Warren%27s_Shaft",
      },
    ],
    reflectionPrompt:
      "A story everyone repeated turned out not to be true, and the people best placed to know were the ones who said so. What would it cost you to correct something you have taught for years?",
  },
  {
    id: "burnt-house-jerusalem",
    name: "Burnt House",
    alternateNames: ["House of Bar Kathros"],
    category: "discovery",
    role: "A Priestly Family's House in Jerusalem, Burned in AD 70",
    summary:
      "A basement in Jerusalem's Upper City left exactly as the fire finished with it — ash, a spear leaning in a corner, a stone weight naming a priestly family, and a young woman's forearm on the kitchen floor.",
    sections: [
      {
        heading: "One Basement, Untouched",
        paragraphs: [
          "N. Avigad's excavation of the Jewish Quarter, which ran from 1969 into the early 1980s, found the house in 1970 under a thick layer of ash. What survives is the basement level of a larger building: a small courtyard, four rooms, a kitchen and a stepped ritual bath, together covering about fifty-five square metres. The upper storeys are gone.",
          "The contents were left where the fire dropped them. Stone tables and vessels, cooking pots, a set of stone weights, a stone sundial, blackened beams, and an iron spear leaning against the corner of a room. The coins in the debris were struck by Roman governors of Judea and by the Jewish rebels in the years 67 to 69, and nothing later than that turned up anywhere in the house — which brackets the destruction closely.",
          "In the kitchen doorway lay the forearm bones of a woman in her twenties, from the fingertips to the elbow. Nothing else of her was found.",
        ],
      },
      {
        heading: "A House With a Name On It",
        paragraphs: [
          "Among the stone weights was a round one, about ten centimetres across, inscribed in Aramaic script: \"[of] Bar Kathros\" — son of Kathros. Kathros is a known name. The Babylonian Talmud, at Pesachim 57a, preserves a bitter lament in the name of two sages of the generation after the temple's fall, listing four high-priestly houses and what each was resented for. Of one of them it says: \"Woe is me due to the High Priests of the house of Katros; woe is me due to their pens that they use to write lies.\" The same passage names the house of Ḥanin — the family of the high priest called Annas in the Gospels, who appears with Caiaphas in Acts 4:6 — for their whispers.",
          "So the weight ties this burnt basement to one of the priestly dynasties that ran the temple in the first century, and it does so through a source that was no friend of them. It is one of the very few points where an object from a Jerusalem house, a rabbinic complaint about temple corruption, and the Gospels' account of a high-priestly establishment all touch the same set of families.",
          "The house also sits in the right part of the city for that. This is the Upper City, the wealthy western hill, and the neighbouring excavations produced mansions with frescoes, mosaic floors, imported tableware and multiple ritual baths. Whoever lived here was rich, observant of purity law, and — on the weight's evidence — connected to the priesthood.",
        ],
      },
      {
        heading: "How Much of the Story the Objects Carry",
        paragraphs: [
          "The dating is the strongest part and can be stated plainly. Coins running to the fourth year of the revolt and none after it, a destruction by intense fire, and a location in the Upper City together fit the Roman capture of the western hill in the late summer of AD 70, about a month after the temple fell, as Josephus describes it. This is physical evidence of that destruction, and it is exactly what Jesus is recorded as warning about — not a temple prophecy only, but a city surrounded, hemmed in, and thrown down.",
          "The name is weaker than it is usually made to sound, and the difference matters. A stone weight is portable. It names a family, not an owner, and it establishes that an object belonging to the house of Kathros ended up in this basement. That is very likely because the family lived or worked there; it is not the same as a deed. Careful excavation reports say the house is associated with the family. Popular accounts say it was their house. The first is what the object supports.",
          "The forearm has attracted the most retelling and deserves the most restraint. What the excavation found is the bones of a woman's forearm near a doorway, in a burnt building. Everything else — that she was reaching for the door, that she was trapped by falling debris, that she was young and afraid — is reconstruction. Some of it is likely. None of it is excavated. The bones are enough to make the point without embellishment: this was somebody's kitchen, and somebody died in it.",
          "The site is preserved as a small museum in the Jewish Quarter, which shows the rooms as found and adds an audio-visual reconstruction of the family's last hours. That reconstruction is a presentation, not a finding, and a visitor is entitled to know which is which.",
        ],
      },
    ],
    verses: [
      { reference: "Luke 21:20-24", note: "\"When you see Jerusalem surrounded by armies\" — the destruction this ash layer belongs to" },
      { reference: "Luke 19:41-44", note: "Wept over the city: hemmed in, and not one stone left on another" },
      { reference: "Mark 13:1-2", note: "The buildings, and what would happen to them" },
      { reference: "Acts 4:6", note: "Annas and Caiaphas — the house the same rabbinic lament names beside Kathros" },
    ],
    sources: [
      { label: "Wikipedia: Burnt House", url: "https://en.wikipedia.org/wiki/Burnt_House" },
      { label: "Sefaria: Babylonian Talmud, Pesachim 57a", url: "https://www.sefaria.org/Pesachim.57a?lang=en" },
    ],
    discovery: {
      objectType: "Burnt basement of a first-century house — courtyard, four rooms, kitchen and ritual bath — with its contents in place",
      findSite: "Jewish Quarter, the Upper City of Jerusalem",
      findSiteId: "jerusalem",
      findSiteKind: "location",
      foundYear: "1970",
      foundBy: "N. Avigad, in the Jewish Quarter excavations he directed from 1969 for the Hebrew University, the Israel Exploration Society and the Department of Antiquities",
      objectDate: "Destroyed by fire in AD 70; latest coins in the debris are of AD 69",
      objectDateCertainty: "firm",
      currentLocation: "Preserved in situ as a museum in the Jewish Quarter, Jerusalem",
    },
    citations: [
      {
        tier: "institution",
        label: "Israel Exploration Society",
        url: "https://israelexplorationsociety.com/",
        credit: "The Israel Exploration Society, Jerusalem",
        detail: "One of the bodies under which the Jewish Quarter excavation ran, and publisher of its final reports in the Qedem series",
        supports: "The excavating body and where the dig is published",
      },
      {
        tier: "scholarly",
        label: "N. Avigad, Discovering Jerusalem",
        credit: "Nahman Avigad, Hebrew University of Jerusalem",
        detail: "Nashville, 1983 — the excavator's account of the Jewish Quarter dig, including the Burnt House, the weight and the skeletal remains. Print only",
        supports: "The find, its contents and its interpretation",
      },
      {
        tier: "primary",
        label: "Babylonian Talmud, Pesachim 57a",
        url: "https://www.sefaria.org/Pesachim.57a?lang=en",
        credit: "Sefaria, William Davidson digital edition (CC licence)",
        detail: "The lament naming the houses of Baitos, Ḥanin, Katros and Yishmael ben Piakhi, quoted here from the Sefaria text",
        supports: "The Kathros family and the complaint against them",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Burnt House",
        url: "https://en.wikipedia.org/wiki/Burnt_House",
      },
    ],
    reflectionPrompt:
      "A wealthy, religious, well-connected household burned down with everything in it. What are you counting on that a single bad year could take?",
  },
  {
    id: "temple-mount-sifting-project",
    name: "Temple Mount Sifting Project",
    category: "discovery",
    role: "Wet-Sifting of Bulldozed Debris from the Temple Mount",
    summary:
      "Nine thousand tons of earth were scraped off the Temple Mount by machine in 1999 and dumped in a valley. A project has been washing it through screens ever since — recovering real objects that will never have a layer to belong to.",
    sections: [
      {
        heading: "Nine Thousand Tons, and No Record",
        paragraphs: [
          "In November 1999 the Islamic religious trust that administers the Temple Mount carried out works to open a new entrance to the underground space known as Solomon's Stables, converting it into the el-Marwani Mosque. The work was done with heavy earth-moving machinery, without a preceding salvage excavation and without archaeological supervision. Something on the order of nine thousand tons of earth were removed and trucked away — an estimated 350 lorry-loads — and dumped in the Kidron Valley near the north-eastern corner of the Old City.",
          "In 2004 G. Barkay and Z. Dvira were licensed to recover it, under Bar-Ilan University auspices and with funding raised through the Israel Exploration Society. The debris was hauled to Emek Tzurim, dry-sifted into buckets, soaked, and then washed over screens by hand — a wet-sifting method the project adapted and scaled for this material, and which other excavations in Israel have since taken up. Finds are sorted into pottery, glass, bone and shell, mosaic tesserae, metal, and worked stone and plaster, then classified in the project's laboratory.",
          "The funding history matters, because it is the ground of one of the objections below. In 2005, in financial difficulty, the project accepted Elad — the foundation that runs the City of David site and also promotes Jewish settlement in Silwan — as administrator of the sifting site, with G. Barkay and Z. Dvira keeping scientific control. That arrangement ended in 2017; sifting stopped, Elad kept the Emek Tzurim site, and the project resumed at Mount Scopus in June 2019. G. Barkay has said plainly that nobody told him what to find or what to ignore.",
          "Volunteers do most of the washing, which is unusual and deliberate: the project has run on public participation from the start, and members of the public rather than staff have handled the great majority of the material.",
        ],
      },
      {
        heading: "What Has Come Out",
        paragraphs: [
          "The material is genuine and some of it is important. More than five hundred coins of the Second Temple period. About a hundred and thirty fragments of Iron Age Judahite clay figurines — human, animal and horse-and-rider types, the small figures that turn up all over Iron Age Judah. A further thirty came not from the platform debris but from an ancient rubbish dump on the eastern slope below it, and the two groups should not be added together, as they often are. A clay sealing — a bulla — of the seventh or sixth century BC bearing the name of the priestly family of Immer, a family named at Jeremiah 20:1 as holding office in the temple. Opus sectile floor tile fragments that have allowed a reconstruction of the paving patterns of the Herodian courts. Crusader armour scales, silver coins, Byzantine tesserae, arrowheads, weights, and a very large quantity of pottery running from the Bronze Age to the Ottoman period.",
          "This is very nearly the only sample of material from the Temple Mount platform there is. Not quite the only one: R. W. Hamilton, director of the Mandate antiquities department, cut trenches under the Aqsa Mosque during the repairs of 1938-1942 and found a mosaic floor and a third-century relief of a centaur, most of which he never published. But no systematic excavation of the platform has ever been made, and none is going to be — the reasons are religious and political and they are not going to change. Everything else the app can say about the Temple Mount comes from digging around its base: the southern wall, the Ophel, the western wall tunnels, never the surface itself.",
          "That scarcity is exactly why the caveat below is not a footnote to the article. It is the article.",
        ],
      },
      {
        heading: "Objects Without a Layer",
        paragraphs: [
          "Archaeology's evidence is not really objects; it is objects in relationships. A cooking pot means little on its own and a great deal if it lies on a floor, under a collapse, above a coin. Those relationships — stratigraphy — are how anything gets dated and how one find is connected to another. The 1999 works destroyed every relationship in nine thousand tons of earth in a matter of days. Nothing sifted from it can be dated by its context, assigned to a building, or connected to any other find, because it no longer has a context to be dated by.",
          "That limit has been pressed hard, by three critics who press it in three different ways. I. Finkelstein doubts the premise that the debris all came from the platform's own deposits, and holds that only an extraordinary find — an inscription — could carry weight from material like this. M. Abu-Khalaf, of Al-Quds University, points out that the area worked in 1999 was itself a dump used to build up the platform, so some of the earth may have come from the surrounding valleys rather than from the Mount. Y. Mizrachi, of the organisation Emek Shaveh, argues the project has no archaeological value at all — and his objection has a second half that ought to be reported with the first, because leaving it out makes his position look merely dismissive: he holds that a project with little scientific value nonetheless has a large public effect on how the Mount is understood, and that Elad's long involvement is why that matters. None of the three is a fringe voice, and this article does not brush them aside.",
          "The project's own answer is worth stating in its own terms rather than in a caricature. G. Barkay compares the work to an archaeological surface survey, a long-accepted method in which unstratified surface material is treated as a statistical sample of what lies below. The project argues that out-of-context finds still carry typological and quantitative information; that comparison with parallel objects from well-dated contexts elsewhere in Jerusalem lets much of the material be dated typologically; and that because the bulldozers created discrete heaps rather than mixing everything uniformly, statistical clustering within heaps may partly recover which finds came from the same original deposit. That last claim is the project's own proposal and, by its own account, awaits full classification before it can be tested.",
          "So the balance. This material can support statements of the form \"objects of this kind and this period were present on the Temple Mount, in roughly these proportions.\" That is real knowledge and it is not nothing. It cannot support statements of the form \"this object came from this building, in this year, and therefore that event happened.\" Any claim of the second kind made from sifted material — and such claims have been made, in headlines, about several of these finds — is claiming more than the method can deliver. The badge on this article says \"no excavation context\", and it means it.",
        ],
      },
    ],
    verses: [
      { reference: "Mark 13:1-2", note: "The buildings whose debris this is, and what was said of them" },
      { reference: "Micah 3:12", note: "\"Zion for your sake will be plowed like a field\" — a prophet's image, and in 1999 a literal one" },
      { reference: "Jeremiah 26:18", note: "The same oracle quoted back a century later in Jeremiah's defence" },
      { reference: "Matthew 24:1-2", note: "Stones thrown down — the destruction layer this debris partly represents" },
    ],
    sources: [
      { label: "Temple Mount Sifting Project: about the project", url: "https://tmsifting.org/en/brief-introduction-to-the-project/" },
      { label: "Wikipedia: Temple Mount Sifting Project", url: "https://en.wikipedia.org/wiki/Temple_Mount_Sifting_Project" },
    ],
    discovery: {
      objectType: "Recovered artefacts — coins, figurine fragments, bullae, floor tile, pottery, glass, metal — wet-sifted from bulldozed fill",
      findSite: "Debris removed from the Temple Mount in 1999 and dumped in the Kidron Valley; sifted at Emek Tzurim and, since 2019, at Mount Scopus, Jerusalem",
      findSiteId: "mount-moriah",
      findSiteKind: "location",
      foundYear: "2004 onward",
      foundBy: "G. Barkay and Z. Dvira, under Bar-Ilan University auspices with Israel Exploration Society funding, and many thousands of volunteers",
      objectDate: "Mixed. Finds run from the Bronze Age to the Ottoman period, with no stratigraphic date available for any of them individually",
      objectDateCertainty: "disputed",
      currentLocation: "Held by the Temple Mount Sifting Project; selected finds published and exhibited",
      unprovenanced: true,
    },
    citations: [
      {
        tier: "institution",
        label: "Temple Mount Sifting Project — about the project",
        url: "https://tmsifting.org/en/brief-introduction-to-the-project/",
        credit: "Gabriel Barkay and Zachi Dvira, Temple Mount Sifting Project",
        detail: "The project's own account of the 1999 works, the tonnage removed, and the sifting operation",
        supports: "The founding, the directors and the quantity of debris",
      },
      {
        tier: "institution",
        label: "Temple Mount Sifting Project — methodology",
        url: "https://tmsifting.org/en/methodology/",
        credit: "Temple Mount Sifting Project",
        detail: "The project's statement of its own method, including its acknowledgement that major archaeological data was lost and its case that unstratified finds retain typological and statistical value",
        supports: "The project's answer to the stratigraphy objection, in its own words",
      },
      {
        tier: "reference",
        label: "The Times of Israel: \"Temple Mount archaeological project yields treasure, unearths conflict\"",
        url: "https://www.timesofisrael.com/temple-mount-project-yields-treasure-but-unearths-conflict/",
        credit: "The Times of Israel",
        detail: "Reporting that quotes I. Finkelstein, M. Abu-Khalaf and Y. Mizrachi against the project and G. Barkay in reply, and sets out Elad's adoption of the sifting site in 2005",
        supports: "The three criticisms in the third section, G. Barkay's answer, and the funding history",
      },
      {
        tier: "encyclopedic",
        label: "Wikipedia: Temple Mount Sifting Project",
        url: "https://en.wikipedia.org/wiki/Temple_Mount_Sifting_Project",
        credit: "Wikipedia",
        detail: "The find counts and the project's history. Note that this article carries no criticism section — the objections in the third section here are cited to the Times of Israel report above, not to it",
        supports: "The find counts and the operational history",
      },
      {
        tier: "scholarly",
        label: "G. Barkay and Z. Dvira, reports of the Temple Mount Sifting Project",
        credit: "Gabriel Barkay and Zachi Dvira, Bar-Ilan University",
        detail: "Published across New Studies on Jerusalem and related conference volumes from 2006 onward. Print only",
        supports: "The published finds",
      },
    ],
    reflectionPrompt:
      "Somebody's careless afternoon destroyed information nobody can ever recover, and other people have spent twenty years salvaging what they can. Which of those two are you being asked to be this week?",
  },
];
