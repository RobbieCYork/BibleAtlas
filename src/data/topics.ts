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
];
