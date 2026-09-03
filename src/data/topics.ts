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
        heading: "Sadducees in the Gospels and Acts",
        paragraphs: [
          "The Sadducees appear less often than the Pharisees in the Gospels but in one memorable episode try to trap Jesus with a hypothetical about a woman who outlives seven brothers she successively marries, mocking the idea of resurrection — Jesus answers that they 'know neither the Scriptures, nor the power of God' (Matthew 22:23-33; Mark 12:18-27). It was chiefly the Sadducean-led temple establishment, more than the Pharisees, that moved against Jesus and later against the apostles (Acts 4:1-2; 5:17-18), likely because a popular movement proclaiming resurrection threatened both their theology and their comfortable political arrangement with Rome. Paul, on trial before a mixed council, shrewdly exploits this very division: declaring himself on trial 'concerning the hope and resurrection of the dead' immediately turns the Pharisees and Sadducees present against each other rather than united against him (Acts 23:6-10). Because their power depended entirely on the temple and its priesthood, the Sadducees vanish from history after the temple's destruction in AD 70 — unlike the Pharisees, whose emphasis on Torah and oral tradition, independent of any single building, gave rise to the rabbinic Judaism that has continued ever since.",
        ],
      },
    ],
    verses: [
      { reference: "Matthew 22:23-33", note: "Sadducees questioned about the resurrection" },
      { reference: "Acts 4:1-2", note: "Sadducees, 'greatly annoyed' at the apostles preaching resurrection" },
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
    category: "concept",
    role: "First-Century Latin Dedication Naming Pontius Pilate",
    summary:
      "A reused block of limestone found in the theatre at Caesarea Maritima in 1961, carrying the only inscription ever found from Pilate's own lifetime — and the one that settles what his job title actually was.",
    sections: [
      {
        heading: "Found in a Staircase",
        paragraphs: [
          "In the summer of 1961 an Italian expedition under Antonio Frova was clearing the Roman theatre at Caesarea Maritima, the harbour city Herod the Great built on the Judean coast and the seat of the Roman governor. In a fourth-century rebuilding of the theatre steps the masons had done what masons everywhere have always done: they took a handy piece of dressed stone from an older, ruined building and set it into the staircase face-down. When it was turned over it carried four lines of Latin, badly worn on the left where the block had been trimmed to fit.",
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
  },
  {
    id: "tel-dan-stele",
    name: "Tel Dan Stele",
    // NOT registered: "Tel Dan" alone — that is the modern name of the city of Dan, which already
    // owns it. Every alias below is longer than "Tel Dan", and NAME_ENTRIES is sorted longest-first,
    // so a mention of the stele wins over the city and a bare "Tel Dan" still goes to the city.
    alternateNames: ["Tel Dan Stela", "Tel Dan Inscription", "House of David Inscription"],
    category: "concept",
    role: "Ninth-Century BC Aramaic Victory Inscription",
    summary:
      "Three fragments of a smashed basalt monument found at Tel Dan in 1993 and 1995, carrying what most scholars read as the earliest mention of David anywhere outside the Bible.",
    sections: [
      {
        heading: "A Broken Monument in a City Wall",
        paragraphs: [
          "In July 1993, a surveyor working with Avraham Biran's long-running excavation at Tel Dan noticed writing on a stone built into a wall beside the Iron Age gate. It turned out to be part of a black basalt victory stele that had been deliberately smashed and its pieces reused as ordinary building material — which is itself a clue, since that is what a conquering army did to a rival's monuments. Two more fragments surfaced in 1995. Together they preserve thirteen broken lines of Old Aramaic from the ninth century BC. The stele is on permanent display in the Israel Museum in Jerusalem.",
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
      { reference: "1 Kings 12:19", note: "\"Israel rebelled against the house of David\" — the phrase in Scripture's own mouth" },
      { reference: "2 Kings 8:7-15", note: "Hazael takes the throne of Aram-Damascus" },
      { reference: "2 Kings 9:14-28", note: "Jehu kills Joram of Israel and Ahaziah of Judah — the deaths the stele's author also claims" },
      { reference: "Judges 18:27-29", note: "The city of Dan itself, where the stele was found" },
    ],
    sources: [
      { label: "Bible Odyssey (SBL): The Tel Dan Inscription", url: "https://www.bibleodyssey.org/articles/the-tel-dan-inscription/" },
      { label: "Wikipedia: Tel Dan stele", url: "https://en.wikipedia.org/wiki/Tel_Dan_stele" },
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
    category: "concept",
    role: "Ninth-Century BC Moabite Royal Inscription",
    summary:
      "A basalt monument set up by King Mesha of Moab around 840 BC, recovered from Jordan in 1868 and then blown apart by the villagers who owned it — the only substantial text we have telling an Old Testament episode from the other side.",
    sections: [
      {
        heading: "Discovered, Then Destroyed",
        paragraphs: [
          "In 1868 a missionary named Frederick Augustus Klein was shown a large inscribed slab of black basalt lying on the mound of Dhiban in Jordan — biblical Dibon, the Moabite capital. Word of the find set off a bidding contest between European consulates, and in 1869, with the local Bedouin caught in the middle of an argument about who owned it and what the Ottoman authorities would do, the villagers heated the stone in a fire, poured cold water on it, and broke it into pieces.",
          "It could have ended there. Before the stone was destroyed, Charles Clermont-Ganneau had arranged for a squeeze to be taken — a wet paper impression pressed onto the surface, which comes away carrying the shape of every letter. The squeeze was itself torn off the stone in haste and survives only in pieces, but between it and the recovered fragments, which were eventually bought and reassembled, most of the thirty-four lines are readable. The reconstructed stele is in the Louvre.",
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
  },
  {
    id: "merneptah-stele",
    name: "Merneptah Stele",
    alternateNames: ["Merneptah Stela", "Israel Stele", "Merneptah Inscription", "Victory Stele of Merneptah"],
    category: "concept",
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
  },
  {
    id: "cyrus-cylinder",
    name: "Cyrus Cylinder",
    alternateNames: ["Cyrus Cylinder inscription"],
    category: "concept",
    role: "Babylonian Foundation Inscription of Cyrus the Great, 539 BC",
    summary:
      "A barrel-shaped clay cylinder covered in Akkadian cuneiform, found in the ruins of Babylon in 1879, in which the Persian conqueror announces that he has restored displaced gods and peoples to their homes.",
    sections: [
      {
        heading: "A Building Inscription, Not a Proclamation",
        paragraphs: [
          "Hormuzd Rassam recovered the cylinder in 1879 from the foundations of the Esagila temple precinct at Babylon; it is in the British Museum. It belongs to a very well-attested Mesopotamian genre: a text buried in the fabric of a building by the king who repaired it, addressed less to the public than to posterity and to the gods. It was never a decree posted for citizens to read, and it was never meant to be read at all until someone dug up the wall.",
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
    category: "concept",
    role: "Assyrian Royal Annals of the 701 BC Campaign Against Judah",
    summary:
      "A six-sided clay prism, surviving in three near-identical copies, on which Sennacherib of Assyria records shutting King Hezekiah up in Jerusalem \"like a bird in a cage\" — and conspicuously does not record taking the city.",
    sections: [
      {
        heading: "Three Copies of the Same Boast",
        paragraphs: [
          "Assyrian kings kept annals, and the grandest were inscribed on hexagonal baked-clay prisms about the size of a large jar, buried in the foundations of palaces. Three substantially complete copies of Sennacherib's survive. The Taylor Prism, acquired in 1830 and now in the British Museum, was the first known; the Oriental Institute Prism, sometimes called the Chicago Prism, was bought in 1919 and is in Chicago; a third is in the Israel Museum in Jerusalem. Their texts agree closely, which is itself informative — this was an official account, copied and distributed.",
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
  },
  {
    id: "black-obelisk",
    name: "Black Obelisk",
    alternateNames: ["Black Obelisk of Shalmaneser III", "Black Obelisk of Shalmaneser"],
    category: "concept",
    role: "Assyrian Tribute Monument, c. 825 BC",
    summary:
      "A two-metre limestone pillar from Nimrud carrying five bands of carved tribute scenes — one of which is captioned with the name of an Israelite king, and is the only image we have of one.",
    sections: [
      {
        heading: "Layard's Obelisk",
        paragraphs: [
          "Austen Henry Layard found the obelisk in 1846 at Nimrud, the Assyrian city the Bible calls Calah, during the excavations that first brought Assyria back into European view. It is a slim four-sided pillar of black limestone with a stepped top, carved on all four faces with five registers of relief, each register running round the monument as a single scene of foreigners bringing tribute to Shalmaneser III. A cuneiform caption above each register says who is paying. It is in the British Museum.",
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
  },
  {
    id: "siloam-inscription",
    name: "Siloam Inscription",
    // NOT registered: "Siloam" alone — the Pool of Siloam POI already owns that name, and every
    // alias here is longer, so the specific inscription still wins where it is named in full.
    alternateNames: ["Siloam Tunnel Inscription", "Shiloah Inscription"],
    category: "concept",
    role: "Paleo-Hebrew Engineering Inscription, c. 700 BC",
    summary:
      "Six lines carved into the wall of Hezekiah's Tunnel under Jerusalem, describing the moment two teams of quarrymen digging from opposite ends heard each other's voices through the rock.",
    sections: [
      {
        heading: "Found by a Boy in the Water",
        paragraphs: [
          "Hezekiah's Tunnel runs about 533 metres under the City of David, cut through solid limestone to carry water from the Gihon Spring, outside the wall, to the Pool of Siloam inside it. People have waded it for centuries. In 1880 a boy named Jacob Eliyahu, exploring the tunnel, noticed cut letters on the wall a few metres from the Siloam end, below the waterline. They turned out to be six lines of paleo-Hebrew — the older script Israel used before the exile — in a smoothed panel prepared for the purpose.",
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
          "The stone did not fare so well. In 1890 someone cut it out of the tunnel wall to sell it, breaking it in the process; the Ottoman authorities confiscated the pieces, and the inscription has been in the Istanbul Archaeology Museums ever since. Israel has repeatedly asked for its return. What visitors see in the tunnel today is the empty scar where it was.",
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
  },
  {
    id: "dead-sea-scrolls",
    name: "Dead Sea Scrolls",
    // NOT registered: "the Scrolls", "Qumran" (a POI owns that). "Isaiah Scroll" is registered even
    // though "Isaiah" is a person entry — the two-word alias is longer, and NAME_ENTRIES is sorted
    // longest-first, so a bare "Isaiah" still resolves to the prophet.
    alternateNames: ["Qumran Scrolls", "Great Isaiah Scroll", "Isaiah Scroll"],
    category: "concept",
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
    category: "concept",
    role: "Second-Century Greek Fragment of John's Gospel",
    summary:
      "A scrap of papyrus the size of a credit card, carrying a few lines of John 18 on both sides — for ninety years the earliest identified piece of any New Testament book.",
    sections: [
      {
        heading: "A Scrap in a Drawer",
        paragraphs: [
          "In 1920 Bernard Grenfell bought a batch of papyri in Egypt for the John Rylands Library in Manchester. They sat unsorted for over a decade. In 1934 a young scholar named Colin H. Roberts, working through the batch, recognised Greek text on a fragment about nine centimetres by six: on one side parts of John 18:31-33, Pilate's exchange with the Jewish leaders and his question \"Are you the King of the Jews?\"; on the other, parts of John 18:37-38, ending near \"What is truth?\"",
          "That it is written on both sides matters as much as what it says. A scroll is written on one side; a codex — a book with leaves — is written on both. So this fragment is a leaf from a bound book, in provincial Egypt, of a Gospel. Christians adopted the codex for their scriptures far earlier and far more completely than the surrounding literary culture did, and P52 is one of the pieces of evidence for how early that habit began.",
        ],
      },
      {
        heading: "The Date, and the Argument About It",
        paragraphs: [
          "Roberts dated the hand to the first half of the second century, around AD 125, comparing the letter forms to dated documentary papyri. That figure has been repeated in study Bibles and apologetics ever since, usually with the conclusion that John's Gospel must have been written and circulating well before AD 100 — which was a genuinely useful point when the fashionable scholarly dating put John in the mid-second century.",
          "Since then the confidence has been trimmed, and by textual scholars rather than by sceptics of Christianity. In 2005 Brent Nongbri argued in detail that palaeography — dating a manuscript by the shape of its handwriting — simply cannot narrow an undated literary hand to a twenty-five-year window, and that the comparanda Roberts used are consistent with a range running from the early second century into the early third. Most specialists now cite P52 with a wider bracket than \"AD 125,\" and some are more cautious still. It remains among the earliest identified New Testament fragments; it is no longer safe to treat it as a precisely dated one.",
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
  },
  {
    id: "chester-beatty-papyri",
    name: "Chester Beatty Papyri",
    alternateNames: ["Chester Beatty Biblical Papyri"],
    category: "concept",
    role: "Third-Century Greek Biblical Codices",
    summary:
      "Eleven papyrus codices bought on the Egyptian antiquities market in the 1930s, which pushed the surviving manuscript evidence for the New Testament back by well over a century in a single stroke.",
    sections: [
      {
        heading: "A Mining Magnate's Purchase",
        paragraphs: [
          "Alfred Chester Beatty was an American-born mining engineer who made a fortune in copper and spent a great deal of it collecting manuscripts. In the early 1930s he acquired, through Cairo dealers, the remains of eleven papyrus codices containing Greek biblical texts. Their exact provenance was never established — they were purchased, not excavated, which is a real limitation on what can be said about where and how they were used. Most are in the Chester Beatty Library in Dublin; some leaves from the same codices ended up at the University of Michigan and elsewhere.",
          "Three matter most for the New Testament. P45 contains portions of all four Gospels and Acts. P46 contains most of Paul's letters and is usually dated around AD 200. P47 contains part of Revelation. Others in the group preserve Old Testament books in Greek, including Genesis, Numbers, Deuteronomy, Isaiah, Jeremiah, Ezekiel, Daniel, and Esther.",
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
  },
  {
    id: "codex-sinaiticus",
    name: "Codex Sinaiticus",
    alternateNames: ["Sinaiticus"],
    category: "concept",
    role: "Fourth-Century Greek Bible",
    summary:
      "A parchment Bible written around the middle of the AD 300s at St Catherine's Monastery on Mount Sinai, containing the oldest surviving complete copy of the New Testament — and now divided between four institutions in four countries.",
    sections: [
      {
        heading: "Tischendorf at Sinai",
        paragraphs: [
          "Constantin von Tischendorf, a German scholar hunting for early biblical manuscripts, visited St Catherine's Monastery at the foot of Mount Sinai in 1844 and left with forty-three leaves of a very old Greek Bible, which he deposited at Leipzig. He returned in 1853 and found nothing more. On a third visit in 1859, backed by the Russian tsar, he was shown the bulk of the manuscript, and it travelled to St Petersburg. In 1933 the Soviet government sold the Russian portion to the British Museum for £100,000, raised partly by public subscription; it is now in the British Library.",
          "The codex is written on fine parchment in four narrow columns to the page, in a formal script, by three or four scribes, with corrections added by later hands over centuries. It originally ran to something like 730 leaves. What survives is split: the largest part in London, the 1844 leaves in Leipzig, a portion in the National Library of Russia, and further leaves and fragments found at the monastery itself in 1975. All four holdings have been photographed and reunited digitally, so the whole book can now be read online in one place for the first time since the nineteenth century.",
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
    category: "concept",
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
  },
  {
    id: "masoretic-text",
    name: "Masoretic Text",
    alternateNames: ["Aleppo Codex", "Leningrad Codex"],
    category: "concept",
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
      { reference: "Psalms 119:89", note: "\"Forever, LORD, your word is settled in heaven\"" },
      { reference: "Isaiah 40:8", note: "\"The word of our God stands forever\"" },
    ],
    sources: [
      { label: "Text & Canon Institute: articles on the Masoretic Text", url: "https://textandcanon.org/tag/masoretic-text/" },
      { label: "Bible Odyssey (SBL): The Samaritan Pentateuch", url: "https://www.bibleodyssey.org/articles/the-samaritan-pentateuch/" },
      { label: "Wikipedia: Masoretic Text", url: "https://en.wikipedia.org/wiki/Masoretic_Text" },
    ],
  },
  {
    id: "codex-vaticanus",
    name: "Codex Vaticanus",
    alternateNames: ["Vaticanus"],
    category: "concept",
    role: "Fourth-Century Greek Bible in the Vatican Library",
    summary:
      "A mid-fourth-century Greek Bible that has been in the Vatican Library since at least its first catalogue in 1475 — with Codex Sinaiticus, one of the two most important manuscripts of the New Testament.",
    sections: [
      {
        heading: "A Book with No Discovery Story",
        paragraphs: [
          "Unlike Codex Sinaiticus, which has a nineteenth-century adventure attached to it, Vaticanus was never found. It appears in the Vatican Library's earliest surviving catalogue, drawn up in 1475, and nobody knows where it was before that. It is written on fine parchment in a small, plain, unadorned hand, three narrow columns to the page — an austere and very early layout. Scholars date it to the middle of the fourth century, making it a near-contemporary of Sinaiticus and possibly a little earlier.",
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
  },
  {
    id: "muratorian-fragment",
    name: "Muratorian Fragment",
    alternateNames: ["Muratorian Canon", "Canon Muratori"],
    category: "concept",
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
  },
  {
    id: "babylonian-chronicles",
    name: "Babylonian Chronicles",
    // "Nabonidus Chronicle" is one tablet within this series and is registered here. The Nabonidus
    // CYLINDER is deliberately not aliased to this entry — it is a building inscription, a different
    // genre, and has its own article below.
    alternateNames: ["Babylonian Chronicle", "Jerusalem Chronicle", "Nabonidus Chronicle"],
    category: "concept",
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
  },
  {
    id: "nabonidus-cylinder",
    name: "Nabonidus Cylinder",
    alternateNames: ["Nabonidus Cylinders", "Cylinder of Nabonidus"],
    category: "concept",
    role: "Sixth-Century BC Babylonian Building Inscription Naming Belshazzar",
    summary:
      "Clay foundation cylinders from Ur and Sippar in which the last king of Babylon prays for himself and for \"Belshazzar, my firstborn son\" — the man who, until the nineteenth century, was known only from the book of Daniel.",
    sections: [
      {
        heading: "The Problem Daniel 5 Used to Have",
        paragraphs: [
          "Daniel 5 tells of a feast held by Belshazzar, king of Babylon, interrupted by a hand writing on the wall, and ending that same night with the king dead and the city in Persian hands. For a long time this was one of the standard examples of the Bible getting history wrong. Greek and Roman historians named the last king of Babylon as Nabonidus, and none of them had ever heard of a Belshazzar. Daniel also has Belshazzar offer Daniel \"the third ruler in the kingdom\" as a reward, which looked like an odd way to describe second place.",
          "Then the cuneiform record began to be read. Clay cylinders inscribed for Nabonidus, buried in the foundations of temples he restored, turned up at Ur and elsewhere from the 1850s onward. One from Ur, recovered by J. G. Taylor, closes with a prayer asking the moon god to preserve the king — and then, in the same breath, \"and as for Belshazzar, my firstborn son, my own offspring, set the fear of your great godhead in his heart.\" Belshazzar was real, and he was Nabonidus's son."
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
  },
  {
    id: "behistun-inscription",
    name: "Behistun Inscription",
    alternateNames: ["Bisitun Inscription", "Behistun relief", "Bisotun Inscription"],
    category: "concept",
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
  },
  {
    id: "kurkh-monolith",
    name: "Kurkh Monolith",
    alternateNames: ["Kurkh Monoliths", "Kurkh Stele"],
    category: "concept",
    role: "Assyrian Campaign Stele Naming Ahab of Israel, 853 BC",
    summary:
      "A carved stone slab from southeastern Turkey on which Shalmaneser III lists the kings who fought him at Qarqar — among them \"Ahab the Israelite,\" the earliest Assyrian mention of an Israelite king by name.",
    sections: [
      {
        heading: "The Battle of Qarqar",
        paragraphs: [
          "John George Taylor found the monolith in 1861 at Kurkh, in what is now southeastern Turkey; it is in the British Museum. It shows Shalmaneser III in relief with the emblems of his gods, and carries a long account of his campaigns. The section on his sixth year describes a battle at Qarqar on the Orontes in 853 BC against a coalition of a dozen western kings who had combined to stop the Assyrian advance.",
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
  },
  {
    id: "nuzi-tablets",
    name: "Nuzi Tablets",
    alternateNames: ["Nuzi texts", "Nuzi archives", "Nuzi tablet"],
    category: "concept",
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
  },
  {
    id: "amarna-letters",
    name: "Amarna Letters",
    alternateNames: ["Amarna tablets", "Tell el-Amarna letters", "el-Amarna letters"],
    category: "concept",
    role: "Egyptian Diplomatic Archive, Fourteenth Century BC",
    summary:
      "Around 380 clay tablets from the abandoned Egyptian capital at Amarna — the incoming diplomatic mail of two pharaohs, and the closest thing we have to a live picture of Canaan in the century or so before Israel appears there.",
    sections: [
      {
        heading: "A Pharaoh's In-Tray",
        paragraphs: [
          "In 1887 a woman digging for fertiliser in the ruins of Akhetaten — the short-lived capital built by Akhenaten in Middle Egypt, now Tell el-Amarna — turned up inscribed clay tablets. Nearly four hundred were eventually recovered, most of them letters received by the Egyptian court under Amenhotep III and his son Akhenaten in the fourteenth century BC. They are written not in Egyptian but in Akkadian, the diplomatic language of the whole Near East at the time, on clay, in cuneiform, by scribes in Canaan and Syria writing to Egypt in a language native to neither.",
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
  },
  {
    id: "epic-of-gilgamesh",
    name: "Epic of Gilgamesh",
    // NOT registered: bare "Gilgamesh" — in this dataset it is used for the king as a character as
    // often as for the poem, and the two-word forms below cover every mention that means the text.
    alternateNames: ["Gilgamesh Epic"],
    category: "concept",
    role: "Akkadian Poem, Standard Version c. 1200 BC",
    summary:
      "The great Mesopotamian poem about a king's search for immortality — whose eleventh tablet tells a flood story so close to Genesis 6-9 that its decipherment in 1872 caused a public sensation.",
    sections: [
      {
        heading: "George Smith's Announcement",
        paragraphs: [
          "The tablets came from the library Ashurbanipal assembled at Nineveh in the seventh century BC, excavated by Austen Henry Layard and Hormuzd Rassam and shipped in fragments to the British Museum. In 1872 George Smith, a former banknote engraver who had taught himself cuneiform while working as a museum assistant, was sorting fragments when he read an account of a flood, a ship, and a bird sent out to find land. He is said to have run about the room in his excitement. His lecture announcing it, in December 1872, made the front pages.",
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
  },
  {
    id: "enuma-elish",
    name: "Enuma Elish",
    alternateNames: ["Enûma Eliš", "Babylonian creation epic"],
    category: "concept",
    role: "Babylonian Creation Poem, Seven Tablets",
    summary:
      "The Babylonian account of how the world was made — Marduk killing the sea-goddess Tiamat and building the cosmos from her body — read alongside Genesis 1 ever since its publication in 1876.",
    sections: [
      {
        heading: "\"When On High\"",
        paragraphs: [
          "The poem is named for its opening words, enuma elish, \"when on high.\" It survives on seven clay tablets, mostly from Ashurbanipal's library at Nineveh, and was published by George Smith in 1876, four years after his flood discovery. It was recited annually at the Babylonian new year festival, which tells you what it was for: it is as much a civic liturgy exalting Babylon and its god as it is a story about origins.",
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
  },
  {
    id: "code-of-hammurabi",
    name: "Code of Hammurabi",
    // NOT registered: bare "Hammurabi" — that is the king, who is the subject of timeline events in
    // his own right ("Hammurabi and the Rise of Babylon"), and linking every mention of the man to
    // his law code would be wrong more often than right.
    alternateNames: ["Hammurabi's Code", "Laws of Hammurabi", "Hammurabi Code", "Hammurabi stele"],
    category: "concept",
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
  },
];
