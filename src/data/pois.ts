import type { PointOfInterest } from "./types";

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export const pois: PointOfInterest[] = [
  {
    id: "caesarea-maritima",
    name: "Caesarea Maritima",
    alternateNames: ["Caesarea"],
    tag: "Roman Port City",
    modernName: "Caesarea, Israel",
    coordinates: [34.8917, 32.5],
    description:
      "Caesarea Maritima was a monumental Roman port city built by Herod the Great (c. 22–10/9 BC) and later served as the administrative capital of Roman Judea, home to the Roman prefects including Pontius Pilate. Paul was imprisoned here for two years and stood trial before the Roman governors Felix and Festus (Acts 23–26), and it was here that Peter first baptized the Gentile centurion Cornelius (Acts 10).",
    archaeology: {
      note: "Excavations since the 1950s–60s have uncovered a well-preserved Roman theater, a hippodrome, remains of Herod's seaside palace, the Sebastos harbor complex, and a monumental aqueduct. Most famously, in 1961 an Italian excavation team discovered the \"Pilate Stone\" — a limestone block bearing a partial inscription naming \"[Pont]ius Pilatus\" as prefect of Judea — the only known contemporary archaeological artifact confirming Pontius Pilate's name and title. Its authenticity is firmly accepted by scholars, though some reconstructed letters in the damaged inscription remain debated.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Caesarea_maritima_BW_4.JPG",
          caption: "The restored seating tiers of the Roman theater at Caesarea Maritima, built under Herod the Great and later expanded by the Romans.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Caesarea_maritima_BW_4.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/5e/The_high_level_aqueduct_of_Caesarea_built_by_Herod_%2837BC_to_4BC%29%2C_Caesarea_Maritima%2C_Israel_%2815588710799%29.jpg",
          caption: "Arched remains of the high-level Roman aqueduct that carried water to Caesarea, running along the Mediterranean beach.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_high_level_aqueduct_of_Caesarea_built_by_Herod_(37BC_to_4BC),_Caesarea_Maritima,_Israel_(15588710799).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.5, 34.8917),
    sources: [
      { label: "Caesarea Maritima - Wikipedia", url: "https://en.wikipedia.org/wiki/Caesarea_Maritima" },
      { label: "Pilate Stone - Wikipedia", url: "https://en.wikipedia.org/wiki/Pilate_Stone" },
      { label: "Acts 24 (Paul before Felix), Bible Gateway NIV", url: "https://www.biblegateway.com/passage/?search=Acts%2024&version=NIV" },
      { label: "Acts 10 (Cornelius), Bible Gateway NIV", url: "https://www.biblegateway.com/passage/?search=Acts%2010&version=NIV" },
    ],
  },
  {
    id: "masada",
    name: "Masada",
    tag: "Fortress",
    modernName: "Masada, Israel",
    coordinates: [35.35389, 31.31556],
    description:
      "Masada was a mountaintop palace-fortress built by Herod the Great atop an isolated plateau above the Dead Sea. During the First Jewish-Roman War it became the last stronghold of Jewish rebels, who held out there until AD 73/74. According to the historian Josephus, when Roman forces finally breached the walls, the defenders chose mass suicide rather than surrender — an episode that has made Masada an enduring symbol of resistance.",
    archaeology: {
      note: "Yigael Yadin's landmark 1963–1965 excavations uncovered Herod's Northern and Western Palaces, a casemate wall, Roman-style bathhouses, ritual baths, and a synagogue among the best-preserved from the Second Temple period. Excavators found eleven inscribed ostraca, one bearing the name \"ben Ya'ir\" matching the rebel commander named by Josephus, though the connection between the ostraca and Josephus's mass-suicide account remains scholarly debated. The massive Roman siege ramp built by the Tenth Legion is still visible on the western side.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/1/14/Israel-2013-Aerial_21-Masada.jpg",
          caption: "Aerial view of the Masada plateau and fortress ruins in the Judaean Desert, with the Dead Sea visible in the distance.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Israel-2013-Aerial_21-Masada.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Herod%27s_large_bathhouse%2C_Masada_%2815526161908%29.jpg",
          caption: "Ruins of Herod's large Roman-style bathhouse at Masada, part of the palace-fortress complex.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Herod's_large_bathhouse,_Masada_(15526161908).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.31556, 35.35389),
    sources: [
      { label: "Masada - Wikipedia", url: "https://en.wikipedia.org/wiki/Masada" },
      { label: "Masada - UNESCO World Heritage listing", url: "https://whc.unesco.org/en/list/1040/" },
      { label: "Masada ostraca and Yadin excavations, Biblical Archaeology Society", url: "https://www.biblicalarchaeology.org/daily/biblical-sites-places/biblical-archaeology-sites/masada-the-dead-sea-fortress-that-still-inspires-controversy/" },
    ],
  },
  {
    id: "herodium",
    name: "Herodium",
    tag: "Fortress",
    modernName: "Herodium, West Bank",
    coordinates: [35.241389, 31.665806],
    description:
      "Herodium was a palace-fortress built by Herod the Great starting around 23 BC, chosen by him as the site of his own tomb — contemporary with his reign at the time of Jesus's birth (Matthew 2). The site is instantly recognizable by its distinctive truncated-cone, volcano-like shape, artificially raised by Herod's engineers and visible from both Jerusalem and Bethlehem.",
    archaeology: {
      note: "Early excavations led by Virgilio Corbo (Studium Biblicum Franciscanum) from 1962–1967 uncovered the hilltop palace-fortress and defensive towers, with a follow-up 1968–1969 excavation by Gideon Foerster; Ehud Netzer then directed Hebrew University excavations from 1972 onward. In 2007, archaeologist Ehud Netzer discovered the remains of a monumental tomb and mausoleum on the mountain's slope along with fragments of broken sarcophagi. Whether the tomb is definitively Herod's own remains scholarly debated — some archaeologists argue it is too modest to be his, while Netzer's identification remains widely accepted by others.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Herodium_from_above_2.jpg",
          caption: "Aerial view of Herodium showing its distinctive volcano-like conical mound with excavated palace ruins at the summit.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Herodium_from_above_2.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Herodium_Ruins_%282861373210%29.jpg",
          caption: "Ground-level view of excavated palace ruins at Herodium, showing stone walls and structural remains of Herod's fortress complex.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Herodium_Ruins_(2861373210).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.665806, 35.241389),
    sources: [
      { label: "Herodium - Wikipedia", url: "https://en.wikipedia.org/wiki/Herodium" },
      { label: "Virgilio Canio Corbo - Wikipedia", url: "https://en.wikipedia.org/wiki/Virgilio_Canio_Corbo" },
      { label: "Finding King Herod's Tomb - Smithsonian Magazine", url: "https://www.smithsonianmag.com/history/finding-king-herods-tomb-34296862/" },
      { label: "Matthew 2, Bible Gateway NIV", url: "https://www.biblegateway.com/passage/?search=Matthew%202&version=NIV" },
    ],
  },
  {
    id: "qumran",
    name: "Qumran",
    tag: "Ancient Settlement",
    modernName: "Qumran, West Bank",
    coordinates: [35.45861, 31.74083],
    description:
      "Qumran is the archaeological site near the northwestern shore of the Dead Sea where the Dead Sea Scrolls were discovered beginning in 1947. The settlement is commonly associated with the Essenes, a Jewish sectarian community, though this identification is debated. The scrolls include the oldest known manuscripts of the Hebrew Bible, offering a window into Jewish religious life just before and during the emergence of Christianity.",
    archaeology: {
      note: "Roland de Vaux led the principal excavations across six seasons from 1951–1956, uncovering a communal complex including a possible scriptorium with inkwells and writing benches, multiple ritual baths, and coin hoards. Eleven nearby caves yielded scroll deposits dated between the 3rd century BC and 1st century AD. De Vaux's interpretation of Qumran as an Essene settlement remains the dominant view but is actively contested — some scholars argue instead for a fortress, a villa, or a commercial trading post.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Khirbet_Qumr%C4%81n_7.jpg",
          caption: "View of the steep marl cliffs and slopes at Khirbet Qumran, showing the terrain and cave locations where the Dead Sea Scrolls were found.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Khirbet_Qumrān_7.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Qumran.jpeg",
          caption: "One of the Qumran caves in the West Bank where the Dead Sea Scrolls were discovered.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Qumran.jpeg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.74083, 35.45861),
    sources: [
      { label: "Qumran - Wikipedia", url: "https://en.wikipedia.org/wiki/Qumran" },
      { label: "Roland de Vaux's Qumran excavations, Orion Center bibliography", url: "https://orion-bibliography.huji.ac.il/node/81730" },
      { label: "Dead Sea Scrolls - Wikipedia", url: "https://en.wikipedia.org/wiki/Dead_Sea_Scrolls" },
    ],
  },
  {
    id: "bethsaida",
    name: "Bethsaida",
    tag: "Fishing Village",
    modernName: "Tel Bethsaida (et-Tell), Israel",
    coordinates: [35.6306, 32.9103],
    description:
      "Bethsaida was a fishing village on the north shore of the Sea of Galilee named in the Gospels as the hometown of the apostles Peter, Andrew, and Philip (John 1:44). It is associated with the feeding of the 5,000 (Luke 9:10) and the healing of a blind man (Mark 8:22-26), yet Jesus also rebuked it, along with Chorazin and Capernaum, for unbelief despite witnessing his miracles.",
    archaeology: {
      note: "The Bethsaida Excavations Project, led by Rami Arav since 1987, has excavated et-Tell and uncovered a monumental Iron Age city gate linked to the Aramean kingdom of Geshur, along with Roman-era fishing implements. Et-Tell's identification as biblical Bethsaida is genuinely contested, since the site sits roughly 1.5 km from the modern shoreline. Since 2016, a rival excavation at el-Araj, much closer to the ancient shore, has uncovered Roman-period remains leading a number of scholars to now favor it as the more likely site — the debate remains unresolved.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/50/Ruins_of_Bethsaida_village_in_summer_2011_%286%29.JPG",
          caption: "Ruins of the ancient fishing village of Bethsaida at et-Tell, north of the Sea of Galilee, Israel.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ruins_of_Bethsaida_village_in_summer_2011_(6).JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/20/Tel-Beit-Tsaida-226.jpg",
          caption: "Archaeological remains and signage at Tel Beit Tsaida (Bethsaida) in the Golan Heights region, Israel.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Tel-Beit-Tsaida-226.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.9103, 35.6306),
    sources: [
      { label: "Bethsaida - Wikipedia", url: "https://en.wikipedia.org/wiki/Bethsaida" },
      { label: "Bethsaida Excavations Project, University of Nebraska Omaha", url: "https://www.unomaha.edu/international-studies-and-programs/bethsaida/" },
      { label: "John 1, Bible Gateway NIV", url: "https://www.biblegateway.com/passage/?search=John%201&version=NIV" },
      { label: "Mark 8, Bible Gateway NIV", url: "https://www.biblegateway.com/passage/?search=Mark%208&version=NIV" },
    ],
  },
  {
    id: "chorazin",
    name: "Chorazin",
    tag: "Ancient Town",
    modernName: "Korazim National Park, Israel",
    coordinates: [35.56278, 32.91111],
    description:
      "Chorazin (Korazim) was a Jewish town on a plateau in the Upper Galilee, about 2.5 miles north of Capernaum above the Sea of Galilee. It is one of three towns — with Bethsaida and Capernaum — that Jesus denounced for failing to repent despite witnessing his miracles there (Matthew 11:20-24; Luke 10:13-15).",
    archaeology: {
      note: "Excavations beginning in 1905 uncovered a town built almost entirely of local black basalt, including a monumental synagogue with carved stone benches decorated with lions and vines. In 1926 excavators found a basalt \"Seat of Moses\" chair, widely connected to Jesus's reference to scribes and Pharisees who \"sit in Moses' seat\" (Matthew 23:2-3). The synagogue's precise date is scholarly-debated, with proposals ranging from the 2nd-3rd century (Kohl and Watzinger's original excavation and stylistic dating) to the late 3rd-4th century (the long-standing consensus view) to as late as the 5th century AD (per Jodi Magness's stratigraphic and numismatic re-dating).",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Khorazim-synagoge-giebel.JPG",
          caption: "Gable and stonework of the ancient basalt synagogue at Chorazin (Korazim).",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Khorazim-synagoge-giebel.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Korazim_building.jpg",
          caption: "Ancient basalt building ruins at Korazim National Park, Israel.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Korazim_building.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.91111, 35.56278),
    sources: [
      { label: "Chorazin - Wikipedia", url: "https://en.wikipedia.org/wiki/Chorazin" },
      { label: "Matthew 23, Bible Gateway NIV", url: "https://www.biblegateway.com/passage/?search=Matthew%2023&version=NIV" },
      { label: "Digging Through Time at Chorazin, Biblical Archaeology Society", url: "https://www.biblicalarchaeology.org/daily/biblical-sites-places/biblical-archaeology-sites/digging-through-time-at-chorazin/" },
    ],
  },
  {
    id: "sepphoris",
    name: "Sepphoris",
    tag: "Roman City",
    modernName: "Tzippori National Park, Israel",
    coordinates: [35.27861, 32.74556],
    description:
      "Sepphoris (Tzippori) served as the administrative capital of the Galilee under Herod Antipas, about 4 miles north-northwest of Nazareth. Given this proximity, some scholars suggest Joseph and the young Jesus, as a craftsman, may have found work in the city during its Herodian building boom, though the New Testament never mentions Jesus visiting Sepphoris directly.",
    archaeology: {
      note: "Excavations since the 1980s have uncovered streets, bathhouses, a 4,500-seat Roman theater, and more than 40 mosaic floors, making Sepphoris one of the most extensively excavated sites in Israel. The 3rd-century Dionysus mosaic includes a striking face nicknamed the \"Mona Lisa of the Galilee.\" Scholarly debate continues over the precise dating of some mosaics and the extent to which the city's Roman-era culture reflects on Jesus's upbringing nearby, since no ancient source places him there.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/5a/The_%22Mona_Lisa_of_the_Galilee%22_%28possibly_Venus%29%2C_part_of_the_Dionysus_mosaic_floor_in_Sepphoris_%28Diocaesarea%29%2C_Israel_%2815004387483%29.jpg",
          caption: "The \"Mona Lisa of the Galilee,\" a detail from the 3rd-century Dionysus mosaic floor in a Roman villa at Sepphoris.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_%22Mona_Lisa_of_the_Galilee%22_(possibly_Venus),_part_of_the_Dionysus_mosaic_floor_in_Sepphoris_(Diocaesarea),_Israel_(15004387483).jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/08/Ancient_Roman_theatre_%28Tzippori%29.jpg",
          caption: "The ruins of the ancient Roman theater at Sepphoris/Tzippori, seating roughly 4,500 spectators.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ancient_Roman_theatre_(Tzippori).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.74556, 35.27861),
    sources: [
      { label: "Sepphoris - Wikipedia", url: "https://en.wikipedia.org/wiki/Sepphoris" },
      { label: "Tzippori National Park, Israel Nature and Parks Authority", url: "https://en.parks.org.il/reserve-park/zippori-national-park/" },
    ],
  },
  {
    id: "beth-shean",
    name: "Beth Shean",
    tag: "Decapolis City",
    modernName: "Beit She'an National Park, Israel",
    coordinates: [35.5008, 32.5008],
    description:
      "Beth Shean was the site where, after the Israelites' defeat at Mount Gilboa, the Philistines fastened the bodies of King Saul and his sons to the city wall (1 Samuel 31:8-13). In the Hellenistic and Roman periods the city was renamed Scythopolis and became the leading member of the Decapolis, the only one of the ten cities located west of the Jordan River.",
    archaeology: {
      note: "The site comprises Tel Beth Shean, a mound with roughly 18 occupation layers spanning the Chalcolithic through Iron Age, and the adjacent Roman-Byzantine city of Scythopolis at its base. Visible remains include a well-preserved Roman theater seating roughly 7,000 and the colonnaded Palladius Street. A layer of toppled columns, all fallen in the same direction, documents the catastrophic earthquake of AD 749, after which the city was largely abandoned.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Overview_of_Theater_Beit_Shean_Israel.jpg",
          caption: "Wide view of the well-preserved Roman theater at Beit She'an, one of the largest and best-preserved in Israel.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Overview_of_Theater_Beit_Shean_Israel.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/06/Looking_north_along_Palladius_street_at_Roman_Scythopolis_%2820532930189%29.jpg",
          caption: "Looking north along the colonnaded Palladius Street of Roman Scythopolis, with Tel Beth Shean rising in the background.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Looking_north_along_Palladius_street_at_Roman_Scythopolis_(20532930189).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.5008, 35.5008),
    sources: [
      { label: "Beit She'an - Wikipedia", url: "https://en.wikipedia.org/wiki/Beit_She%27an" },
      { label: "1 Samuel 31, Bible Gateway NIV", url: "https://www.biblegateway.com/passage/?search=1%20Samuel%2031&version=NIV" },
      { label: "Decapolis - Wikipedia", url: "https://en.wikipedia.org/wiki/Decapolis" },
    ],
  },
  {
    id: "caesarea-philippi",
    name: "Caesarea Philippi",
    tag: "Pagan Cult Site",
    modernName: "Banias Nature Reserve, Golan Heights",
    coordinates: [35.69444, 33.24861],
    description:
      "Caesarea Philippi, known in antiquity as Panias after the Greek god Pan, was a city at the base of Mount Hermon built up by Herod Philip the Tetrarch. It is best known as the site where, according to Matthew 16:13-20, Peter confessed Jesus as \"the Christ, the Son of the living God,\" a confession made near a pagan cult center dedicated to Pan carved into the cliff face beside a spring.",
    archaeology: {
      note: "Excavations at the base of the cliff uncovered the Paneion: a natural cave shrine to Pan fronted by Hellenistic-to-Roman era temples and rock-cut niches that once held votive statues. Herod the Great built a temple to Augustus near the site around 20 BC, but its exact location remains scholarly debated — some archaeologists propose structures at or near the cave itself, while excavators at nearby Omrit argue that site is the true location.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Banias_Spring_Cliff_Pan%27s_Cave.JPG",
          caption: "The Banias spring, a main tributary of the Jordan River, with the cliff face and Pan's cave visible above the waterfall.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Banias_Spring_Cliff_Pan's_Cave.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Banias_-_Temple_of_Pan_001.jpg",
          caption: "Excavated ruins of the temple terrace before the Pan grotto at Banias, showing carved cliff-face niches and a standing column.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Banias_-_Temple_of_Pan_001.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(33.24861, 35.69444),
    sources: [
      { label: "Banias - Wikipedia", url: "https://en.wikipedia.org/wiki/Banias" },
      { label: "Matthew 16, Bible Gateway NIV", url: "https://www.biblegateway.com/passage/?search=Matthew%2016&version=NIV" },
      { label: "Omrit Excavation Project", url: "https://www.omritexcavations.org/" },
    ],
  },
  {
    id: "jericho",
    name: "Jericho",
    tag: "Ancient City",
    modernName: "Tell es-Sultan, Jericho, West Bank",
    coordinates: [35.44389, 31.87111],
    description:
      "Jericho is described in Joshua 6 as the first Canaanite city conquered by the Israelites, its walls said to have collapsed after they marched around it for seven days. In the New Testament, Jericho is the setting for the healing of the blind beggar Bartimaeus (Mark 10:46-52) and Jesus's encounter with the tax collector Zacchaeus (Luke 19:1-10).",
    archaeology: {
      note: "Kathleen Kenyon's landmark 1952–1958 excavations uncovered a massive stone tower and wall from c. 8000 BC — among the oldest known monumental structures in the world. Kenyon also identified a Middle Bronze Age fortification destroyed around 1550 BC, significantly earlier than the window most scholars associate with a Joshua-led conquest, with little evidence of a substantial walled city standing at that later time — making Jericho one of the most debated sites in biblical archaeology.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/03/Tower_of_Jericho.jpg",
          caption: "The Neolithic Tower of Jericho at Tell es-Sultan, built c. 8000 BC — one of the oldest known monumental structures in the world.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Tower_of_Jericho.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/25/Jericho_Tell_es_Sultan_P1190730.JPG",
          caption: "View of the Tell es-Sultan archaeological mound, the site of ancient Jericho, in the West Bank.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Jericho_Tell_es_Sultan_P1190730.JPG",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.87111, 35.44389),
    sources: [
      { label: "Jericho - Wikipedia", url: "https://en.wikipedia.org/wiki/Jericho" },
      { label: "Joshua 6, Bible Gateway NIV", url: "https://www.biblegateway.com/passage/?search=Joshua%206&version=NIV" },
      { label: "Kathleen Kenyon - Britannica", url: "https://www.britannica.com/biography/Kathleen-Kenyon" },
    ],
  },
  {
    id: "bethel",
    name: "Bethel",
    tag: "Patriarchal Site",
    modernName: "Beitin, West Bank",
    coordinates: [35.23833, 31.92833],
    description:
      "Bethel (\"House of God\") is where the patriarch Jacob dreamed of a ladder reaching to heaven with angels ascending and descending, after which he set up a stone pillar and renamed the site (Genesis 28:10-19). It later became a major Israelite religious center, and after the kingdom split, Jeroboam I installed one of his golden calf shrines there to rival Jerusalem (1 Kings 12:29).",
    archaeology: {
      note: "William F. Albright first tested the site in 1927, with major excavations across 1934–1960 identifying Bronze and Iron Age occupation layers, including possible Middle Bronze Age cultic installations. The identification of Beitin with biblical Bethel is widely accepted but not undisputed — a minority of scholars have proposed nearby sites instead, and the location of neighboring \"Ai\" remains actively debated.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Remains_of_a_church_at_Beit%C3%AEn%2C_said_to_have_been_erected_as_a_memorial_of_Jacob%27s_dream_at_Bethel_%28NYPL_b10607452-80396%29.jpg",
          caption: "1881 photograph of the ruins of a Byzantine-era church at Beitin, traditionally said to commemorate Jacob's dream at Bethel.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Remains_of_a_church_at_Beitîn,_said_to_have_been_erected_as_a_memorial_of_Jacob's_dream_at_Bethel_(NYPL_b10607452-80396).jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Northern_views._Bethel_%28Betin%29_LOC_matpc.01049.jpg",
          caption: "Circa-1900 photograph of Bethel (Betin), from the Matson Photograph Collection, Library of Congress.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Northern_views._Bethel_(Betin)_LOC_matpc.01049.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.92833, 35.23833),
    sources: [
      { label: "Genesis 28 (Jacob's ladder) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Genesis%2028%3A10-19" },
      { label: "1 Kings 12 (Jeroboam's golden calf at Bethel) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=1%20Kings%2012%3A29" },
      { label: "Bethel - Wikipedia", url: "https://en.wikipedia.org/wiki/Bethel" },
      { label: "The Excavation of Bethel (1934-1960), Albright/Kelso - Google Books", url: "https://books.google.com/books/about/The_Excavation_of_Bethel_1934_1960.html?id=a7VVAAAAYAAJ" },
    ],
  },
  {
    id: "shiloh",
    name: "Shiloh",
    tag: "Tabernacle Site",
    modernName: "Tel Shiloh (Khirbet Seilun), West Bank",
    coordinates: [35.289528, 32.055556],
    description:
      "Shiloh served as Israel's central worship site and home of the Tabernacle for roughly 300 years before the Jerusalem Temple was built, housing the Ark of the Covenant (Joshua 18:1; 1 Samuel 1-4). It is where the priest Eli raised the boy Samuel and where Hannah prayed for a son, a pivotal site in Israel's transition from the judges to the united monarchy.",
    archaeology: {
      note: "Danish excavations in the 1920s-30s were followed by Israel Finkelstein's major dig (1981–1984), which defined eight strata from the Middle Bronze Age through the Byzantine period, including a pillared Iron Age public building and more than 20 grain silos. Scholars broadly agree the site was destroyed or abandoned around 1050 BC, consistent with a Philistine attack implied in the biblical text, though the evidence for a violent destruction versus gradual abandonment remains debated.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Entrance_to_Tel_Shilo.JPG",
          caption: "Entrance to the Tel Shiloh archaeological site.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Entrance_to_Tel_Shilo.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/70/Ancient_Shilo_02.jpg",
          caption: "View of excavated remains at the ancient Tel Shiloh site.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ancient_Shilo_02.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.055556, 35.289528),
    sources: [
      { label: "1 Samuel 1-4 (Eli, Hannah, Ark at Shiloh) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=1%20Samuel%201-4" },
      { label: "Shiloh (biblical city) - Wikipedia", url: "https://en.wikipedia.org/wiki/Shiloh_(biblical_city)" },
      { label: "Finkelstein, Excavations at Shiloh 1981-1984: Preliminary Report, Tel Aviv 12(2)", url: "https://www.academia.edu/40779456/I_Finkelstein_ed_Excavations_at_Shiloh_1981_1984_Preliminary_Report_Tel_Aviv_12_1985_pp_123_180" },
      { label: "Associates for Biblical Research - The Shiloh Excavations", url: "https://biblearchaeology.org/staffdig/50-the-shiloh-excavations" },
    ],
  },
  {
    id: "hebron",
    name: "Hebron",
    tag: "Patriarchal Site",
    modernName: "Tel Rumeida, Hebron, West Bank",
    coordinates: [35.104, 31.524],
    description:
      "Hebron is where Abraham purchased the Cave of Machpelah as a burial site for Sarah, and where Abraham, Isaac, Jacob, and their wives were later buried (Genesis 23, 49:29-32). It also served as King David's first capital, where he reigned over Judah for seven years before conquering Jerusalem (2 Samuel 5:5).",
    archaeology: {
      note: "Excavations at Tel Rumeida spanning the 1960s through renewed digs since 2014 span the Chalcolithic through Byzantine periods, including Middle Bronze Age cyclopean fortification walls, cuneiform tablets pointing to a Hurrian-Amorite population, and Iron Age four-room houses with royal seal impressions. Scholars continue to debate the intensity and continuity of Late Bronze Age occupation at the site.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/6/6f/PikiWiki_Israel_43155_Tel_Rumeida_in_Hebron.JPG",
          caption: "View of the Tel Rumeida archaeological area in Hebron, identified with ancient Hebron.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:PikiWiki_Israel_43155_Tel_Rumeida_in_Hebron.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f8/Ancient_walls_near_olive_trees_in_Hebron%27s_Tel_Hevron_-_Admot_Yishai_neighborhood.jpg",
          caption: "Ancient excavated stone walls among olive trees at Tel Hevron (Tel Rumeida), Hebron.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ancient_walls_near_olive_trees_in_Hebron's_Tel_Hevron_-_Admot_Yishai_neighborhood.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.524, 35.104),
    sources: [
      { label: "Genesis 23 (Cave of Machpelah purchase) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Genesis%2023" },
      { label: "2 Samuel 5 (David's seven years in Hebron) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=2%20Samuel%205%3A5" },
      { label: "Tel Rumeida - Wikipedia", url: "https://en.wikipedia.org/wiki/Tel_Rumeida" },
      { label: "Emek Shaveh - Tel Rumeida, Hebron's Archaeological Park", url: "https://emekshaveh.org/en/tel-rumeida-hebrons-archaeological-park/" },
    ],
  },
  {
    id: "beersheba",
    name: "Beersheba",
    tag: "Patriarchal Site",
    modernName: "Tel Be'er Sheva, Israel",
    coordinates: [34.84083, 31.24472],
    description:
      "Beersheba (\"Well of the Oath/Seven\") marks the traditional southern boundary of Israel in the phrase \"from Dan to Beersheba,\" and is where Abraham dug a well and made a covenant with Abimelech (Genesis 21:22-34), and where Isaac and Jacob later encountered God (Genesis 26, 46:1-5).",
    archaeology: {
      note: "Excavations from 1969–1976 and later work on the water system uncovered a planned Iron Age fortified city with a casemate wall, four-chamber gate, and elaborate underground water system. A dismantled four-horned stone altar found reused in a later wall is the best-preserved cultic altar yet found in Israel; scholars debate whether its dismantling relates to King Hezekiah's religious reforms or a later Babylonian-era destruction.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Tel_Be%27er_Sheva%2C_Altar_01.jpg",
          caption: "Reconstructed four-horned Israelite altar from Tel Be'er Sheva, based on stones found reused in a later wall.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Tel_Be'er_Sheva,_Altar_01.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/6/62/Tel_Be%27er_Sheva_Overview_2007041.JPG",
          caption: "View across the Tel Be'er Sheva excavation area, looking south.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Tel_Be'er_Sheva_Overview_2007041.JPG",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.24472, 34.84083),
    sources: [
      { label: "Genesis 21 (Abraham's well and covenant with Abimelech) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Genesis%2021%3A22-34" },
      { label: "Beersheba - Wikipedia", url: "https://en.wikipedia.org/wiki/Beersheba" },
      { label: "Tel Be'er Sheva - UNESCO / Biblical Tels excavation summary", url: "https://whc.unesco.org/en/list/1108/" },
      { label: "Tel Be'er Sheva altar - Israel Museum / archaeology overview", url: "https://en.wikipedia.org/wiki/Tel_Be%27er_Sheva" },
    ],
  },
  {
    id: "megiddo",
    name: "Megiddo",
    alternateNames: ["Armageddon"],
    tag: "Fortress City",
    modernName: "Tel Megiddo, Israel",
    coordinates: [35.18444, 32.58528],
    description:
      "Megiddo is the site referenced as \"Armageddon\" (Har Megiddo, \"Mount of Megiddo\") in Revelation 16:16 as the gathering place for the final apocalyptic battle. For millennia it was a strategic fortress city controlling the trade route between Egypt and Mesopotamia, and the Bible credits Solomon with fortifying it (1 Kings 9:15).",
    archaeology: {
      note: "Excavations beginning in 1903 have uncovered roughly twenty occupation strata, monumental gates, palaces, and two large stable/storehouse complexes. The famous \"Solomonic gate\" was long attributed to Solomon's 10th-century BC building program, but recent radiocarbon dating places it in the 9th-century Omride period instead — a chronology that remains actively contested among archaeologists.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/8/83/Outer_opening_of_the_chambered_gate_at_Megiddo_%2820531458520%29.jpg",
          caption: "Outer opening of the ancient chambered gate at Tel Megiddo.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Outer_opening_of_the_chambered_gate_at_Megiddo_(20531458520).jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/6/69/20191028_122343_Tel_Megiddo_Israel_Granary_anagoria.jpg",
          caption: "Excavated granary structure at the Tel Megiddo archaeological site, a UNESCO World Heritage Site.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:20191028_122343_Tel_Megiddo_Israel_Granary_anagoria.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.58528, 35.18444),
    sources: [
      { label: "Revelation 16:16 (Armageddon) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Revelation%2016%3A16" },
      { label: "1 Kings 9:15 (Solomon fortifies Megiddo) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=1%20Kings%209%3A15" },
      { label: "Tel Megiddo - Wikipedia", url: "https://en.wikipedia.org/wiki/Tel_Megiddo" },
      { label: "Tel Aviv University - The Megiddo Expedition, Past Excavations", url: "https://www.themegiddoexpedition.com/past-excavations" },
    ],
  },
  {
    id: "mount-sinai",
    name: "Mount Sinai",
    tag: "Sacred Mountain",
    modernName: "Jebel Musa (St. Catherine), South Sinai, Egypt",
    coordinates: [33.9752, 28.5391],
    description:
      "Traditionally identified since the Byzantine era as the mountain where Moses received the Ten Commandments and the Law (Exodus 19-31). The identification of Jebel Musa as the biblical Mount Sinai/Horeb is a matter of ancient Christian tradition dating to at least the 4th century AD, not certain historical proof — several other peaks have also been proposed by scholars.",
    archaeology: {
      note: "At the summit, excavations in 1998, 1999, and 2008 uncovered the foundations of a Justinianic basilica dated to roughly AD 560–565 beneath a later chapel. At the mountain's foot, Saint Catherine's Monastery — founded in the 6th century under Emperor Justinian and still in continuous use — preserves its original Byzantine basilica and fortification walls largely intact, making it one of the oldest functioning Christian monasteries in the world.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/01/Mount_Sinai_from_the_Plain_Er-Rahah.jpg",
          caption: "Mount Sinai (Jebel Musa) viewed from the Plain of Er-Rahah.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Mount_Sinai_from_the_Plain_Er-Rahah.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/4/48/Saint_Catherine_Monastry_-_panoramio.jpg",
          caption: "Saint Catherine's Monastery at the foot of Mount Sinai.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Catherine_Monastry_-_panoramio.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(28.5391, 33.9752),
    sources: [
      { label: "Exodus 19-31 (Moses receives the Law at Sinai) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Exodus%2019-31" },
      { label: "Mount Sinai - Wikipedia", url: "https://en.wikipedia.org/wiki/Mount_Sinai" },
      { label: "Saint Catherine's Monastery - Wikipedia", url: "https://en.wikipedia.org/wiki/Saint_Catherine%27s_Monastery" },
      { label: "Kalopissi-Verti & Panayotidi, Excavations on the Holy Summit (Jebel Musa) at Mount Sinai", url: "https://www.academia.edu/5275614/S_Kalopissi_Verti_M_Panayotidi_Excavations_on_the_Holy_Summit_Jebel_Musa_at_Mount_Sinai_Preliminary_remarks_on_the_Justinianic_Basilica_" },
    ],
  },
  {
    id: "shechem",
    name: "Shechem",
    alternateNames: ["Sychem"],
    tag: "Patriarchal Site",
    modernName: "Tell Balata, Nablus, West Bank",
    coordinates: [35.2814, 32.2136],
    description:
      "Shechem was a major Canaanite and early Israelite city where Abraham first built an altar (Genesis 12:6-7), Jacob purchased land and dug a well (Genesis 33:18-20; John 4:5-6), and Joshua led Israel in a covenant-renewal ceremony (Joshua 24). It also appears in the New Testament as the region of Jacob's Well, where Jesus met the Samaritan woman.",
    archaeology: {
      note: "Excavations from the early 20th century through the 1950s–60s and a 2010s project revealed a Middle-to-Late Bronze Age Canaanite city with massive fortification walls and a fortress-temple some identify with the \"temple of Baal-berith\" mentioned in Judges 9. The identification of Tell Balata with biblical Shechem is widely accepted, though the attribution of individual structures to specific biblical events remains debated among scholars.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/71/Tell_Balata.jpg",
          caption: "City wall and gate remains at Tell Balata, ancient Shechem.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Tell_Balata.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Shechem.jpg",
          caption: "Excavated ruins of ancient Shechem at Tell Balata, near Nablus.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Shechem.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.2136, 35.2814),
    sources: [
      { label: "Joshua 24 (covenant renewal at Shechem) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Joshua%2024" },
      { label: "John 4:5-6 (Jacob's Well) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=John%204%3A5-6" },
      { label: "Shechem - Wikipedia", url: "https://en.wikipedia.org/wiki/Shechem" },
      { label: "Tell Balata Archaeological Park - UNESCO/Palestinian Dept. of Antiquities project page", url: "https://en.unesco.org/silkroad/content/tell-balata-archaeological-park" },
    ],
  },
  {
    id: "gethsemane",
    name: "Gethsemane",
    tag: "Religious Site",
    modernName: "Church of All Nations, Mount of Olives, Jerusalem",
    coordinates: [35.2396, 31.7792],
    description:
      "Gethsemane is the garden at the foot of the Mount of Olives where Jesus prayed in agony the night before his crucifixion and was betrayed by Judas and arrested (Matthew 26:36-56; Mark 14:32-52; Luke 22:39-53; John 18:1-12). Its name derives from the Hebrew/Aramaic for \"oil press,\" consistent with its traditional identification as an olive grove.",
    archaeology: {
      note: "Excavations beginning in 1956 found evidence the site served as a Second Temple-period olive oil production facility. A 2014–2020 survey beneath the Church of All Nations uncovered a Second Temple-era ritual bath and remains of a 1,500-year-old Byzantine church predating the current 1924 structure. A 2012 radiocarbon study successfully dated three of the garden's oldest olive trees, with results ranging from 1092 to 1198 AD (11th-12th century, the Crusader period) — venerable, but not literally from the 1st century, though they may be descended from the same rootstock.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/08/Church_of_All_Nations_at_Gethsemane_%283937882797%29.jpg",
          caption: "Doorway of the Church of All Nations (Basilica of the Agony) in the Garden of Gethsemane.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_All_Nations_at_Gethsemane_(3937882797).jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/50/3500_year_old_Olive_tree_2235_%28508056917%29.jpg",
          caption: "One of the ancient gnarled olive trees in the Garden of Gethsemane, Mount of Olives.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:3500_year_old_Olive_tree_2235_(508056917).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7792, 35.2396),
    sources: [
      { label: "Matthew 26:36-56 (Gethsemane, agony and arrest) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Matthew%2026%3A36-56" },
      { label: "Gethsemane - Wikipedia", url: "https://en.wikipedia.org/wiki/Gethsemane" },
      { label: "Cherubini et al., \"The age of the olive trees in the Garden of Gethsemane\" (Journal of Archaeological Science, 2014) - ResearchGate", url: "https://www.researchgate.net/publication/268752097_The_age_of_the_olive_trees_in_the_Garden_of_Gethsemane" },
      { label: "BiblePlaces.com summary of the 2012 olive tree dating study", url: "https://www.bibleplaces.com/blog/2012/10/the-date-of-olive-trees-in-garden-of/" },
    ],
  },
  {
    id: "golgotha",
    name: "Golgotha",
    tag: "Religious Site",
    modernName: "Church of the Holy Sepulchre, Old City, Jerusalem",
    coordinates: [35.2295, 31.7784],
    description:
      "Golgotha (\"place of the skull\") is where the Gospels record Jesus was crucified, and the adjacent rock-cut tomb is where he was buried (Matthew 27:33-60; Mark 15:22-46; Luke 23:33-53; John 19:17-42). The Church of the Holy Sepulchre, built by Constantine in the 4th century, has been the traditional location since antiquity, though the Garden Tomb north of the Old City is promoted by some traditions as an alternative candidate.",
    archaeology: {
      note: "Excavations established that the site lay outside the Second Temple-period city walls at the time of the crucifixion — consistent with Gospel accounts — and had been a quarry later used as a cemetery, matching the description of a garden tomb setting. Ongoing conservation excavations since 2016, including a 2022 discovery of ancient garden soil layers beneath the church floor, have added physical support for elements of the traditional account, though the exact identification of the tomb as Jesus's specific burial site remains a matter of religious tradition rather than verifiable proof.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Aedicule%2C_2019_%2802%29.jpg",
          caption: "The Aedicule, the shrine built over the traditional tomb of Christ, inside the Church of the Holy Sepulchre.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Aedicule,_2019_(02).jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/6/60/Church_of_the_Holy_Sepulcher_-_top_of_the_aedicule_inside_the_rotunda.jpg",
          caption: "The onion dome atop the Aedicule, seen within the church's rotunda.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_the_Holy_Sepulcher_-_top_of_the_aedicule_inside_the_rotunda.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7784, 35.2295),
    sources: [
      { label: "John 19:17-42 (crucifixion and burial) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=John%2019%3A17-42" },
      { label: "Church of the Holy Sepulchre - Wikipedia", url: "https://en.wikipedia.org/wiki/Church_of_the_Holy_Sepulchre" },
      { label: "Times of Israel - Traces of ancient garden found under Church of Holy Sepulchre (Sapienza University excavation)", url: "https://www.timesofisrael.com/echoing-gospel-account-traces-of-ancient-garden-found-under-church-of-holy-sepulchre/" },
      { label: "Garden Tomb - Wikipedia", url: "https://en.wikipedia.org/wiki/Garden_Tomb" },
    ],
  },
  {
    id: "emmaus",
    name: "Emmaus",
    tag: "Religious Site",
    modernName: "Emmaus Nicopolis, Canada Park, Israel",
    coordinates: [34.987, 31.8369],
    description:
      "Emmaus is the village where, according to Luke 24:13-35, the resurrected Jesus appeared to two disciples on the road and was recognized \"in the breaking of the bread.\" The exact location of the biblical Emmaus is genuinely uncertain and debated — Emmaus Nicopolis was the traditional site favored by early Church Fathers, but other closer candidates have also been proposed based on the distance given in Luke's manuscripts.",
    archaeology: {
      note: "Excavations at Emmaus Nicopolis uncovered a 5th-century Byzantine basilica with mosaic floors and a baptismal font, built atop earlier Roman-period remains, as well as a separate 3rd-century Roman bathhouse. The site's identification with the New Testament Emmaus rests on Byzantine-era Christian tradition rather than a physical inscription, and its distance from Jerusalem conflicts with the shorter figure in most Greek manuscripts of Luke — a discrepancy central to ongoing scholarly debate over the correct site.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Emmaus_Nicopolis_basilica.JPG",
          caption: "Remains of the Byzantine basilica at Emmaus Nicopolis.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Emmaus_Nicopolis_basilica.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/PikiWiki_Israel_65149_emmaus_nicopolis.jpg",
          caption: "Archaeological ruins at the Emmaus Nicopolis site.",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:PikiWiki_Israel_65149_emmaus_nicopolis.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.8369, 34.987),
    sources: [
      { label: "Luke 24:13-35 (Road to Emmaus) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Luke%2024%3A13-35" },
      { label: "Emmaus - Wikipedia", url: "https://en.wikipedia.org/wiki/Emmaus" },
      { label: "Emmaus-Nicopolis official project site - Rediscovery of Emmaus / FAQ on manuscript distance variants", url: "https://www.emmaus-nicopolis.org/english/rediscovery-of-emmaus" },
      { label: "The Text of the Gospels - Luke 24:13 manuscript variant (60 vs 160 stadia)", url: "https://www.thetextofthegospels.com/2018/08/luke-2413-do-you-know-way-to-emmaus.html" },
    ],
  },
  {
    id: "city-of-david",
    name: "City of David",
    tag: "Ancient Settlement",
    modernName: "City of David, Jerusalem, Israel",
    coordinates: [35.2356, 31.7736],
    description:
      "The City of David is the oldest inhabited core of ancient Jerusalem, on the ridge south of the Temple Mount. Biblical tradition identifies it as the Jebusite stronghold King David conquered around 1000 BC and made his capital, and it remained the heart of Jerusalem through the era Jesus and his disciples would have known.",
    archaeology: {
      note: "Excavations spanning over 150 years have uncovered the Gihon Spring fortifications, the Stepped Stone Structure, a \"Large Stone Structure\" some archaeologists identify as David's palace, and the Second Temple-period Pool of Siloam and pilgrim road. The identification and dating of the Large Stone Structure with a Davidic palace is genuinely contested among scholars.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/6/61/City_of_David_-_The_Stepped_Pilgrims_Road_IMG_5939.JPG",
          caption: "The excavated Stepped (Pilgrims') Road in the City of David, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:City_of_David_-_The_Stepped_Pilgrims_Road_IMG_5939.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/1/19/Aerial_view_of_the_Temple_Mount_and_City_of_David.JPG",
          caption: "Aerial view of the Temple Mount and City of David, southeast corner of Jerusalem's Old City",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Aerial_view_of_the_Temple_Mount_and_City_of_David.JPG",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7736, 35.2356),
    sources: [
      { label: "City of David (archaeological site) - Wikipedia", url: "https://en.wikipedia.org/wiki/City_of_David_(archaeological_site)" },
      { label: "Large Stone Structure (Alleged Palace of David) - Wikipedia", url: "https://en.wikipedia.org/wiki/Alleged_Palace_of_David_site" },
      { label: "Eilat Mazar - Wikipedia", url: "https://en.wikipedia.org/wiki/Eilat_Mazar" },
      { label: "2 Samuel 5:6-9 (David captures Jerusalem) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=2+Samuel+5%3A6-9" },
    ],
  },
  {
    id: "machaerus",
    name: "Machaerus",
    tag: "Fortress",
    modernName: "Mukawir, Madaba Governorate, Jordan",
    coordinates: [35.6242, 31.5672],
    description:
      "Machaerus was a Hasmonean-built, Herod-rebuilt hilltop fortress-palace east of the Dead Sea. In the Gospel account, Herod Antipas imprisoned and later executed John the Baptist there at the request of Herodias and Salome (Matthew 14:1-12; Mark 6:14-29).",
    archaeology: {
      note: "Excavations from 1968 and expanded 2009-2018 uncovered the Herodian royal palace, courtyards, a bath complex, and cisterns. The site's identification as the location of John the Baptist's execution rests on the 1st-century historian Josephus, who explicitly names Machaerus as John's prison — the Gospels narrate the beheading but do not name the fortress, so this is extra-biblical historical corroboration, broadly accepted by scholars.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/09/Ruins_of_the_archaeological_site_of_Machaerus_01.jpg",
          caption: "Ruins of the Herodian fortress-palace of Machaerus, overlooking the Dead Sea",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ruins_of_the_archaeological_site_of_Machaerus_01.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Machaerus_Panorama.jpg",
          caption: "Panoramic view of the Machaerus hilltop site, Jordan",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Machaerus_Panorama.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.5672, 35.6242),
    sources: [
      { label: "Machaerus - Wikipedia", url: "https://en.wikipedia.org/wiki/Machaerus" },
      { label: "Excavations of the Royal Palace of Machaerus - Győző Vörös, ACOR Jordan", url: "https://publications.acorjordan.org/2015/12/16/excavations-of-the-royal-palace-of-machaerus-by-dr-gyozo-voros/" },
      { label: "Mark 6:14-29 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Mark+6%3A14-29" },
      { label: "Matthew 14:1-12 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Matthew+14%3A1-12" },
    ],
  },
  {
    id: "mount-precipice",
    name: "Mount Precipice",
    tag: "Traditional Site",
    modernName: "Mount Precipice, Nazareth, Israel",
    coordinates: [35.2986, 32.6828],
    description:
      "Mount Precipice, on Nazareth's southern edge, is traditionally identified as the site where, after Jesus preached in the synagogue and declared himself the fulfillment of Isaiah's prophecy, an enraged crowd tried to hurl him off the cliff, only for him to pass through them unharmed (Luke 4:16-30).",
    archaeology: {
      note: "The identification of this cliff with the Luke 4:29 event is a longstanding pilgrim tradition rather than one fixed by archaeological proof, and some scholars note the site sits roughly 2 km from ancient Nazareth's town center. Separately, on the same mountain, the Qafzeh Cave has yielded anatomically modern human remains roughly 90,000-120,000 years old — an important find unrelated to the New Testament tradition.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/1/1b/PikiWiki_Israel_28734_Mount_of_Precipice.JPG",
          caption: "View of Mount Precipice near Nazareth, Israel",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:PikiWiki_Israel_28734_Mount_of_Precipice.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/53/PikiWiki_Israel_30995_Mount_Precipice.JPG",
          caption: "Mount Precipice overlooking the Jezreel Valley near Nazareth",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:PikiWiki_Israel_30995_Mount_Precipice.JPG",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.6828, 35.2986),
    sources: [
      { label: "Skhul and Qafzeh hominins - Wikipedia", url: "https://en.wikipedia.org/wiki/Skhul_and_Qafzeh_hominins" },
      { label: "Qafzeh Cave - Wikipedia", url: "https://en.wikipedia.org/wiki/Qafzeh_Cave" },
      { label: "Qafzeh - Britannica", url: "https://www.britannica.com/place/Qafzeh" },
      { label: "Luke 4:16-30 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Luke+4%3A16-30" },
    ],
  },
  {
    id: "kursi",
    name: "Kursi",
    tag: "Traditional Site",
    modernName: "Kursi National Park, Golan Heights",
    coordinates: [35.6504, 32.8261],
    description:
      "Kursi, on the eastern shore of the Sea of Galilee, is traditionally identified as the \"country of the Gerasenes/Gadarenes\" where Jesus cast demons into a herd of pigs (Mark 5:1-20 and parallels). By the Byzantine period the site had become a major pilgrimage destination marked by a large monastery and church.",
    archaeology: {
      note: "Excavations in 1971-1974 revealed the largest Byzantine-period monastery complex yet found in Israel — a 5th-century basilica church with mosaic floors, a baptistry, and monks' quarters. The identification of Kursi with the Gospel's \"country of the Gadarenes/Gerasenes/Gergesenes\" is scholarly-debated: the Gospel manuscripts themselves disagree on the place name, and \"Gergesa\"/Kursi became the favored harmonizing identification only from the Byzantine period onward.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Kursi_Church.JPG",
          caption: "Ruins of the 5th-century Byzantine monastery church at Kursi, eastern shore of the Sea of Galilee",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Kursi_Church.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Byzantine_Arch_with_Golan_Hills_at_Rear_-_Kursi_National_Park_-_Galilee_-_%285710819104%29.jpg",
          caption: "Byzantine arch at Kursi National Park with the Golan Hills behind",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Byzantine_Arch_with_Golan_Hills_at_Rear_-_Kursi_National_Park_-_Galilee_-_(5710819104).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.8261, 35.6504),
    sources: [
      { label: "Kursi, Sea of Galilee - Wikipedia", url: "https://en.wikipedia.org/wiki/Kursi,_Sea_of_Galilee" },
      { label: "New Archaeological Finds from Kursi-Gergesa (Tzaferis 2014), Atiqot", url: "https://publications.iaa.org.il/atiqot/vol79/iss1/9/" },
      { label: "Mark 5:1-20 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Mark+5%3A1-20" },
    ],
  },
  {
    id: "tabgha",
    name: "Tabgha",
    tag: "Traditional Site",
    modernName: "Tabgha, Sea of Galilee, Israel",
    coordinates: [35.5436, 32.8694],
    description:
      "Tabgha, near Capernaum, is the traditional site of Jesus's miracle of feeding the 5,000 with five loaves and two fish (Matthew 14:13-21 and parallels). It has been venerated as such since at least the 4th century, when the pilgrim Egeria described a church there.",
    archaeology: {
      note: "Excavations in 1932 uncovered the mosaic pavements of a 5th-century basilica built over a smaller 4th-century chapel, matching Egeria's earlier description. The best-known find is the mosaic before the altar depicting a basket of loaves flanked by two fish, preserved today in the modern Church of the Multiplication; the site's identification with the feeding miracle is a strong, continuous tradition rather than one fixed by inscriptional proof.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/90/Church_of_the_Multiplication_in_Tabgha_by_David_Shankbone.jpg",
          caption: "The Church of the Multiplication at Tabgha, Sea of Galilee",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_the_Multiplication_in_Tabgha_by_David_Shankbone.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/d6/Tabgha_Church_Mosaic_Israel.jpg",
          caption: "The famous 5th-century loaves and fishes mosaic in the Church of the Multiplication, Tabgha",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Tabgha_Church_Mosaic_Israel.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.8694, 35.5436),
    sources: [
      { label: "Tabgha - Wikipedia", url: "https://en.wikipedia.org/wiki/Tabgha" },
      { label: "Church of the Multiplication - Wikipedia", url: "https://en.wikipedia.org/wiki/Church_of_the_Multiplication" },
      { label: "The Rediscovered Byzantine Church at Tabgha - Biblical Archaeology Society", url: "https://library.biblicalarchaeology.org/sidebar/the-rediscovered-byzantine-church-at-tabgha/" },
      { label: "Matthew 14:13-21 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Matthew+14%3A13-21" },
    ],
  },
  {
    id: "mount-of-beatitudes",
    name: "Mount of Beatitudes",
    tag: "Traditional Site",
    modernName: "Mount of Beatitudes, Israel",
    coordinates: [35.5552, 32.8822],
    description:
      "A hill on the northwestern shore of the Sea of Galilee, between Capernaum and Tiberias, traditionally venerated as the site where Jesus delivered the Sermon on the Mount, including the Beatitudes (Matthew 5-7). It has been commemorated by pilgrims for over 1,600 years.",
    archaeology: {
      note: "Remains of a 4th-7th century Byzantine church and monastery, along with a cistern, have been found lower on the slope, confirming very early Christian veneration of the hill. The specific identification of this hill, rather than nearby alternatives, as the actual sermon location is a matter of long-standing tradition, not archaeological or textual proof. The current chapel was built in 1936-38 by architect Antonio Barluzzi.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/8/81/Church_of_beatitudes_israel.jpg",
          caption: "The Church of the Beatitudes on the traditional Mount of Beatitudes overlooking the Sea of Galilee",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_beatitudes_israel.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/1/1b/View_of_Capernaum_from_the_Mount_of_Beatitudes%2C_2019_%2801%29.jpg",
          caption: "View of Capernaum and the Sea of Galilee from the Mount of Beatitudes",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:View_of_Capernaum_from_the_Mount_of_Beatitudes,_2019_(01).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.8822, 35.5552),
    sources: [
      { label: "Church of the Beatitudes - Wikipedia", url: "https://en.wikipedia.org/wiki/Church_of_the_Beatitudes" },
      { label: "Mount of Beatitudes - seetheholyland.net", url: "https://www.seetheholyland.net/mount-of-beatitudes/" },
      { label: "Matthew 5-7 (Sermon on the Mount) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Matthew+5-7" },
    ],
  },
  {
    id: "al-maghtas",
    name: "Bethany Beyond the Jordan",
    alternateNames: ["Bethabara"],
    tag: "Traditional Site",
    modernName: "Al-Maghtas, Balqa Governorate, Jordan",
    coordinates: [35.5503, 31.8372],
    description:
      "An archaeological site on the eastern bank of the Jordan River, traditionally identified as \"Bethany beyond the Jordan\" (John 1:28) where John the Baptist carried out his ministry and baptized Jesus — distinct from the general Jordan River entry, this is the specific excavated site with Byzantine churches.",
    archaeology: {
      note: "Excavation beginning in the 1990s uncovered a 5th-century Byzantine monastery, the Church of St. John the Baptist built under Emperor Anastasius I, and baptismal pools fed by ceramic pipes from a nearby spring. UNESCO inscribed the site in 2015, citing strong early Christian tradition — though, as with all Gospel sites, there is no archaeological proof Jesus was baptized at this exact spot, only that it was venerated as such since at least the Byzantine period.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/1/14/Al-Maghtas_05.jpg",
          caption: "Pilgrims being baptized at Al-Maghtas (Bethany Beyond the Jordan), the traditional baptism site of Jesus",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Al-Maghtas_05.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Baptism_Site_of_Jesus_Christ_JO.jpg",
          caption: "The Baptism Site of Jesus Christ on the Jordan River, Al-Maghtas, Jordan",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Baptism_Site_of_Jesus_Christ_JO.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.8372, 35.5503),
    sources: [
      { label: "Bethany Beyond the Jordan (Al-Maghtas) - Wikipedia", url: "https://en.wikipedia.org/wiki/Bethany_Beyond_the_Jordan" },
      { label: "Al-Maghtas - UNESCO World Heritage Centre", url: "https://whc.unesco.org/en/list/1446/" },
      { label: "John 1:28 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=John+1%3A28" },
    ],
  },
  {
    id: "ein-karem",
    name: "Ein Karem",
    tag: "Traditional Site",
    modernName: "Ein Karem, Jerusalem, Israel",
    coordinates: [35.1622, 31.7681],
    description:
      "A former village, now a Jerusalem neighborhood, traditionally identified since the Byzantine period as the birthplace of John the Baptist and hometown of his parents Elizabeth and Zechariah — venerated as the site of the Visitation, when the pregnant Mary visited Elizabeth (Luke 1:39-56).",
    archaeology: {
      note: "Excavations have uncovered a Second Temple-period ritual bath, first-century rock-cut chambers, Byzantine-era chapel remains beneath the modern Church of St. John the Baptist, and a Roman-era marble statue of Aphrodite. The identification of Ein Karem as Elizabeth's town rests on tradition dating to at least the 6th century rather than direct proof.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/58/Church_of_Saint_John_the_Baptist%2C_Ein_Karem%2C_Jerusalem_33.jpg",
          caption: "The Church of Saint John the Baptist in Ein Karem, built over the cave traditionally venerated as his birthplace",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_Saint_John_the_Baptist,_Ein_Karem,_Jerusalem_33.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/3/35/Church_of_the_Visitation_IMG_0637.JPG",
          caption: "Statue of the Visitation at the Church of the Visitation, Ein Karem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_the_Visitation_IMG_0637.JPG",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7681, 35.1622),
    sources: [
      { label: "Ein Karem - Wikipedia", url: "https://en.wikipedia.org/wiki/Ein_Karem" },
      { label: "Church of Saint John the Baptist, Ein Karem - Custodia di Terra Santa", url: "https://www.custodia.org/en/sanctuaries/ain-karem-saint-john-the-baptist/" },
      { label: "Luke 1:39-56 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Luke+1%3A39-56" },
    ],
  },
  {
    id: "shepherds-field",
    name: "Shepherds' Field",
    tag: "Traditional Site",
    modernName: "Shepherds' Field, Beit Sahour, West Bank",
    coordinates: [35.2301, 31.7073],
    description:
      "A site in the fields southeast of Bethlehem, in the town of Beit Sahour, traditionally venerated as the location where an angel announced the birth of Jesus to shepherds \"keeping watch over their flock by night\" (Luke 2:8-20).",
    archaeology: {
      note: "Excavations have revealed caves showing evidence of habitation during the Herodian and Roman periods, ancient oil presses, and a Byzantine monastery built around AD 400. These finds confirm the area's long use for shepherding and its veneration since the Byzantine era, but there is no archaeological way to confirm the precise field where the angelic announcement occurred.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/da/Ronnie_Macdonald%2C_Chapel_of_the_Shepherds%27_Field%2C_Bethlehem_5D4_9943.jpg",
          caption: "The Chapel of the Shepherds' Field near Bethlehem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ronnie_Macdonald,_Chapel_of_the_Shepherds'_Field,_Bethlehem_5D4_9943.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/05/%22Gloria_in_Excelsis_Deo%22_Chapel.JPG",
          caption: "The \"Gloria in Excelsis Deo\" Chapel at the Catholic Shepherds' Field sanctuary",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:%22Gloria_in_Excelsis_Deo%22_Chapel.JPG",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7073, 35.2301),
    sources: [
      { label: "Chapel of the Shepherds' Field - Wikipedia", url: "https://en.wikipedia.org/wiki/Chapel_of_the_Shepherds'_Field" },
      { label: "Bethlehem - The Shepherds' Field and Grotto - Custodia di Terra Santa", url: "https://www.custodia.org/en/sanctuaries/bethlehem-the-shepherds-field-and-grotto/" },
      { label: "Luke 2:8-20 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Luke+2%3A8-20" },
    ],
  },
  {
    id: "perga",
    name: "Perga",
    tag: "Ancient City",
    modernName: "Perge (Aksu), Antalya Province, Turkey",
    coordinates: [30.8539, 36.9614],
    description:
      "A major city of Pamphylia, Perga was the first stop for Paul and Barnabas in Asia Minor after sailing from Cyprus (Acts 13:13-14), and Paul preached there again on his return journey (Acts 14:25). It was here that John Mark left the missionary party to return to Jerusalem.",
    archaeology: {
      note: "Excavations since 1946 have uncovered extensive remains including a large theatre, a well-preserved stadium, monumental Hellenistic and Roman city gates, and Roman baths. Unlike the traditional Gospel sites, Perga's identification is geographically certain — a well-documented, continuously identified ancient city — though no artifact directly attests to Paul's specific visit; that comes solely from the Acts narrative.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Perge_Roman_Gate_to_Hellenistic_Gate_in_2013_2967.jpg",
          caption: "View toward the Roman Gate and Hellenistic Gate at the ancient city of Perge (Perga), Turkey",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Perge_Roman_Gate_to_Hellenistic_Gate_in_2013_2967.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f9/PERGE_T%C4%B0YATRO.jpg",
          caption: "The ancient Roman theatre at Perge (Perga), Antalya Province, Turkey",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:PERGE_TİYATRO.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(36.9614, 30.8539),
    sources: [
      { label: "Perga - Wikipedia", url: "https://en.wikipedia.org/wiki/Perga" },
      { label: "Perge | Turkish Archaeological News", url: "https://turkisharchaeonews.net/site/perge" },
      { label: "Acts 13:13-14 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts+13%3A13-14" },
      { label: "Acts 14:25 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts+14%3A25" },
    ],
  },
  {
    id: "magdala",
    name: "Magdala",
    tag: "Ancient Town",
    modernName: "Migdal, Israel",
    coordinates: [35.5156, 32.825],
    description:
      "Magdala was a prosperous Jewish fishing town on the western shore of the Sea of Galilee in the 1st century AD, traditionally identified as the hometown of Mary Magdalene, one of Jesus's most prominent followers and the first witness to the resurrection.",
    archaeology: {
      note: "Excavations from 2009-2013 uncovered a 1st-century synagogue in active use before the destruction of the Second Temple in AD 70, complete with frescoed walls. Inside it, archaeologists found the \"Magdala Stone,\" a carved limestone block bearing the earliest known depiction of a seven-branched menorah outside Jerusalem. The town's identification with biblical Magdala is well supported, though the specific link to Mary Magdalene rests on the shared place-name rather than a direct find naming her.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/3/38/Ancient_Synagogue_of_Magdala.jpg",
          caption: "Remains of the 1st-century synagogue excavated at Magdala",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ancient_Synagogue_of_Magdala.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/51/Magdala_Stone.jpg",
          caption: "The Magdala Stone, carved with the earliest known menorah depiction outside Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Magdala_Stone.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.825, 35.5156),
    sources: [
      { label: "Wikipedia - Migdal Synagogue", url: "https://en.wikipedia.org/wiki/Migdal_Synagogue" },
      { label: "Biblical Archaeology Society - New First-Century Synagogue in Magdala", url: "https://www.biblicalarchaeology.org/daily/new-first-century-synagogue/" },
      { label: "Biblical Archaeology Society - The Magdala Stone", url: "https://www.biblicalarchaeology.org/daily/ancient-cultures/ancient-israel/the-magdala-stone/" },
      { label: "Bible Gateway - John 20 (Mary Magdalene at the tomb)", url: "https://www.biblegateway.com/passage/?search=John+20&version=NIV" },
    ],
  },
  {
    id: "pool-of-bethesda",
    name: "Pool of Bethesda",
    alternateNames: ["Bethesda"],
    tag: "Religious Site",
    modernName: "Church of St. Anne, Jerusalem, Israel",
    coordinates: [35.2358, 31.7814],
    description:
      "The Pool of Bethesda, near the Sheep Gate in Jerusalem, is the setting of John 5, where Jesus heals a paralyzed man who had waited by the water for 38 years.",
    archaeology: {
      note: "Excavations exposed a large twin-pool complex, Byzantine and Crusader church remains, and a Hadrianic-era pagan healing sanctuary layered atop the site. Before these excavations, some scholars had doubted the pool's existence altogether since it was known only from John's Gospel; the finds are generally accepted as confirming a real five-porticoed pool complex matching John 5:2's description.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/91/Ruins_%40_Pool_of_Bethesda_2264_%28516875824%29.jpg",
          caption: "Excavated ruins at the Pool of Bethesda site, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ruins_@_Pool_of_Bethesda_2264_(516875824).jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/4/4f/Bethesda_Pool_ruins_2265_%28516907989%29.jpg",
          caption: "Ruins of the Pool of Bethesda, associated with the healing account in John 5",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Bethesda_Pool_ruins_2265_(516907989).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7814, 35.2358),
    sources: [
      { label: "Wikipedia - Pool of Bethesda", url: "https://en.wikipedia.org/wiki/Pool_of_Bethesda" },
      { label: "Bible Gateway - John 5", url: "https://www.biblegateway.com/passage/?search=John+5&version=NIV" },
      { label: "Biblical Archaeology Society - The Bethesda Pool, Site of One of Jesus' Miracles", url: "https://www.biblicalarchaeology.org/daily/biblical-sites-places/jerusalem/the-bethesda-pool-site-of-one-of-jesus-miracles/" },
    ],
  },
  {
    id: "pool-of-siloam",
    name: "Pool of Siloam",
    alternateNames: ["Siloam"],
    tag: "Religious Site",
    modernName: "City of David / Silwan, Jerusalem, Israel",
    coordinates: [35.235, 31.7706],
    description:
      "The Pool of Siloam, fed by the Gihon Spring, is where in John 9 Jesus sends a man born blind to wash and receive his sight.",
    archaeology: {
      note: "The Second Temple-period pool was rediscovered by accident in 2004 during sewer repair, and excavation uncovered a large stepped stone pool dated by coins to the 1st century BC-1st century AD — squarely in Jesus's lifetime. The smaller pool long shown to pilgrims is actually a 5th-century Byzantine construction roughly 70 yards away, meaning that site was misidentified as \"the\" biblical pool for centuries before the 2004 find. Full excavation of the newly found pool is still ongoing.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/53/Steps_of_the_Pool_of_Siloam_%2830259%29.jpg",
          caption: "Stone steps of the Second Temple-period Pool of Siloam, City of David",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Steps_of_the_Pool_of_Siloam_(30259).jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f4/The_Second_Temple_Pool_of_Siloam.jpg",
          caption: "Remains of the Second Temple Pool of Siloam in the City of David, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Second_Temple_Pool_of_Siloam.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7706, 35.235),
    sources: [
      { label: "Wikipedia - Pool of Siloam", url: "https://en.wikipedia.org/wiki/Pool_of_Siloam" },
      { label: "Bible Gateway - John 9", url: "https://www.biblegateway.com/passage/?search=John+9&version=NIV" },
      { label: "Biblical Archaeology Society - The Siloam Pool: Where Jesus Healed the Blind Man", url: "https://www.biblicalarchaeology.org/daily/biblical-sites-places/biblical-archaeology-sites/the-siloam-pool-where-jesus-healed-the-blind-man/" },
    ],
  },
  {
    id: "garden-tomb",
    name: "Garden Tomb",
    tag: "Religious Site",
    modernName: "Garden Tomb, East Jerusalem",
    coordinates: [35.23, 31.7839],
    description:
      "The Garden Tomb is a rock-cut tomb near a skull-shaped rocky outcropping outside Jerusalem's Damascus Gate, promoted since the 19th century as an alternative site to the Church of the Holy Sepulchre for Jesus's burial and resurrection — especially popular with Protestant and evangelical pilgrims.",
    archaeology: {
      note: "Archaeological study concluded the tomb's architectural style is characteristic of the Iron Age, roughly the 8th-7th centuries BC — several centuries too early to be a \"new tomb\" from Jesus's time as described in the Gospels. By contrast, the Church of the Holy Sepulchre has a continuous veneration tradition dating to the 4th century and sits on a site archaeologists agree was outside the city walls in Jesus's time, which is why most archaeologists and mainstream churches favor it instead. The Garden Tomb's identification remains a minority, largely devotional tradition.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/54/Entrance_to_the_Garden_Tomb_1_%284015106152%29.jpg",
          caption: "Entrance to the Garden Tomb, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Entrance_to_the_Garden_Tomb_1_(4015106152).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7839, 35.23),
    sources: [
      { label: "BAS Library - The Garden Tomb: Was Jesus Buried Here?", url: "https://library.biblicalarchaeology.org/article/the-garden-tomb-was-jesus-buried-here/" },
      { label: "Wikipedia - Church of the Holy Sepulchre", url: "https://en.wikipedia.org/wiki/Church_of_the_Holy_Sepulchre" },
      { label: "RSC BYU - Revisiting Golgotha and the Garden Tomb", url: "https://rsc.byu.edu/vol-4-no-1-2003/revisiting-golgotha-garden-tomb" },
    ],
  },
  {
    id: "western-wall",
    name: "Western Wall",
    tag: "Religious Site",
    modernName: "Western Wall, Old City, Jerusalem, Israel",
    coordinates: [35.2345, 31.7767],
    description:
      "The Western Wall is the surviving section of the massive retaining wall Herod the Great built around 19 BC to expand the Temple Mount platform for the Second Temple — the temple Jesus is described as visiting and teaching at throughout the Gospels. It remains the holiest site accessible to Jews today.",
    archaeology: {
      note: "The lower seven courses of large, precisely dressed ashlar stones with distinctive chiseled margins are original Herodian masonry; one stone, the \"Western Stone,\" is estimated to weigh 250-300 tons. Excavations along the wall's base have uncovered a Herodian-period street, and coins found beneath foundation stones suggest construction continued after Herod's death into the reign of Agrippa II. Later courses above the Herodian layer date to the Umayyad and Mamluk periods.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Jerusalem_Western_Wall_BW_3.JPG",
          caption: "The Western Wall, Jerusalem's Old City",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Jerusalem_Western_Wall_BW_3.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Kotel01.jpg",
          caption: "Worshippers at the Western Wall (Kotel), Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Kotel01.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7767, 35.2345),
    sources: [
      { label: "Wikipedia - Western Stone", url: "https://en.wikipedia.org/wiki/Western_Stone" },
      { label: "Biblical Archaeology Society - Jerusalem's Temple Mount Not Completed by King Herod", url: "https://www.biblicalarchaeology.org/daily/news/jerusalems-temple-mount-not-completed-by-king-herod/" },
      { label: "Wikipedia - Western Wall Tunnel", url: "https://en.wikipedia.org/wiki/Western_Wall_Tunnel" },
    ],
  },
  {
    id: "salamis",
    name: "Salamis",
    tag: "Ancient City",
    modernName: "Salamis, near Famagusta, Cyprus",
    coordinates: [33.9, 35.183],
    description:
      "Salamis was the first stop of Paul and Barnabas's first missionary journey, where Acts 13:5 records they \"proclaimed the word of God in the synagogues of the Jews\" upon landing in Cyprus. Barnabas, a native Cypriot, is traditionally said to have returned here and been martyred near the city.",
    archaeology: {
      note: "Excavations uncovered an extensively restored Roman theatre (seating up to 15,000) and a large gymnasium/palaestra complex with marble statuary. Excavation has been suspended since the 1974 division of Cyprus, so large parts of the site — including possible levels contemporary with Paul's visit — remain unexcavated or only partially studied.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/6/62/Roman_Theatre%2C_Salamis_%2846121539812%29.jpg",
          caption: "The restored Roman theatre at Salamis, built under Augustus and enlarged under Trajan and Hadrian",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Roman_Theatre,_Salamis_(46121539812).jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Statue_of_Aphrodite%2C_from_the_Gymnasium_of_Salamis%2C_2nd_century_AD%2C_Cyprus_Museum%2C_Nicosia%2C_Cyprus_%2821875062714%29.jpg",
          caption: "2nd-century statue of Aphrodite excavated from the Gymnasium of Salamis, now in the Cyprus Museum",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Statue_of_Aphrodite,_from_the_Gymnasium_of_Salamis,_2nd_century_AD,_Cyprus_Museum,_Nicosia,_Cyprus_(21875062714).jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(35.183, 33.9),
    sources: [
      { label: "Bible Gateway - Acts 13", url: "https://www.biblegateway.com/passage/?search=Acts+13&version=NIV" },
      { label: "Wikipedia - Salamis, Cyprus", url: "https://en.wikipedia.org/wiki/Salamis,_Cyprus" },
      { label: "World History Encyclopedia - Roman Theatre of Salamis", url: "https://www.worldhistory.org/image/4383/roman-theatre-of-salamis-cyprus/" },
    ],
  },
  {
    id: "paphos",
    name: "Paphos",
    tag: "Ancient City",
    modernName: "Kato Paphos Archaeological Park, Cyprus",
    coordinates: [32.4061, 34.7582],
    description:
      "Paphos was the Roman capital of Cyprus and, per Acts 13:6-12, the city where Paul and Barnabas confronted the sorcerer Elymas, who was struck temporarily blind, leading the Roman proconsul Sergius Paulus to believe.",
    archaeology: {
      note: "Excavation since 1965 uncovered four grand Roman villas — most famously the House of Dionysos, whose 556 m² of mosaic floors depict mythological, hunting, and vintage scenes. A Latin inscription found nearby names a 1st-century proconsul some scholars link to a Sergius Paulus family, though this identification with the Sergius Paulus of Acts remains debated among historians.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/de/Paphos_House-of-Dionysos_Dionysos-Akme-Ikarios-mosaic.jpg",
          caption: "Mosaic of Dionysos, Acme, and Icarius from the House of Dionysos, Paphos Archaeological Park",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Paphos_House-of-Dionysos_Dionysos-Akme-Ikarios-mosaic.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(34.7582, 32.4061),
    sources: [
      { label: "Bible Gateway - Acts 13:6-12", url: "https://www.biblegateway.com/passage/?search=Acts+13%3A6-12&version=NIV" },
      { label: "Wikipedia - Paphos Archaeological Park", url: "https://en.wikipedia.org/wiki/Paphos_Archaeological_Park" },
      { label: "Wikipedia - Sergius Paulus (Soloi inscription)", url: "https://en.wikipedia.org/wiki/Sergius_Paulus" },
      { label: "Getty Conservation Institute - Paphos Mosaics Project", url: "https://www.getty.edu/conservation/our_projects/field_projects/paphos/overview.html" },
    ],
  },
  {
    id: "basilica-st-john",
    name: "Basilica of St. John",
    tag: "Religious Site",
    modernName: "Ayasuluk Hill, Selçuk, Turkey",
    coordinates: [27.3678, 37.9525],
    description:
      "This monumental Byzantine basilica sits atop Ayasuluk Hill in Selçuk, near ancient Ephesus, and marks the traditional burial site of the Apostle John, who Christian tradition holds spent his final years in Ephesus.",
    archaeology: {
      note: "The current basilica was constructed AD 548-565 under Justinian I, replacing an earlier 4th-century church itself built over what tradition identifies as John's tomb. The identification of the tomb beneath the basilica's nave as the actual burial place of the Apostle John rests on continuous local tradition rather than inscriptional or forensic proof.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/72/Basilica_of_St._John_in_Ephesus_01.jpg",
          caption: "Panoramic view of the ruins of the Basilica of St. John on Ayasuluk Hill, Selçuk, Turkey",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Basilica_of_St._John_in_Ephesus_01.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/74/Tomb_of_Saint_John_the_Apostle.jpg",
          caption: "The traditional tomb of St. John the Apostle beneath the basilica's central dome",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Tomb_of_Saint_John_the_Apostle.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(37.9525, 27.3678),
    sources: [
      { label: "Wikipedia - Basilica of St. John", url: "https://en.wikipedia.org/wiki/Basilica_of_St._John" },
      { label: "Lonely Planet - Basilica of St John", url: "https://www.lonelyplanet.com/turkey/aegean-coast/selcuk/attractions/basilica-of-st-john/a/poi-sig/470874/360869" },
    ],
  },
  {
    id: "patara",
    name: "Patara",
    tag: "Ancient City",
    modernName: "Patara, near Gelemiş, Antalya Province, Turkey",
    coordinates: [29.3172, 36.2662],
    description:
      "Patara was the chief port of Lycia. Acts 21:1-2 records that Paul changed ships here at the end of his third missionary journey, boarding a Phoenician vessel bound for Tyre.",
    archaeology: {
      note: "Excavations since 1988 uncovered a well-preserved bouleuterion (assembly hall of the Lycian League), a colonnaded main street, and a theatre. The Patara lighthouse, built under Nero in AD 64, is considered the oldest known surviving lighthouse in the world and has been restored; excavation of the harbor and residential quarters continues.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/70/Patara_-_the_lighthouse_-_panoramio.jpg",
          caption: "The restored Roman lighthouse at Patara, built under Emperor Nero in AD 64",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Patara_-_the_lighthouse_-_panoramio.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Patara_Assembly_Hall_of_the_Lycian_Laegue_exterior_in_2013_4604.jpg",
          caption: "Exterior of the restored Bouleuterion (Assembly Hall of the Lycian League) at Patara",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Patara_Assembly_Hall_of_the_Lycian_Laegue_exterior_in_2013_4604.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(36.2662, 29.3172),
    sources: [
      { label: "Bible Gateway - Acts 21:1-2", url: "https://www.biblegateway.com/passage/?search=Acts+21%3A1-2&version=NIV" },
      { label: "Ancient Pages - Patara Lighthouse Built By Emperor Nero In 64 AD", url: "https://www.ancientpages.com/2020/03/05/patara-lighthouse-built-by-emperor-nero-in-64-ad-will-shine-again/" },
      { label: "Patara Excavations project - Lighthouse", url: "https://pataraexcavations.org/lighthouse.html" },
      { label: "Jerusalem Post - Nero's 2,000-year-old Patara lighthouse to shine again", url: "https://www.jpost.com/archaeology/archaeology-around-the-world/article-844316" },
    ],
  },
  {
    id: "assos",
    name: "Assos",
    tag: "Ancient City",
    modernName: "Assos (Behramkale), Çanakkale Province, Turkey",
    coordinates: [26.3369, 39.4878],
    description:
      "Assos was a fortified Aeolian port city on the Gulf of Adramyttium. Acts 20:13-14 records that Paul chose to travel the road from Troas to Assos on foot alone while his companions sailed, rejoining the ship there.",
    archaeology: {
      note: "The dominant landmark is the Doric Temple of Athena (c. 530 BC) crowning the acropolis, one of the few Doric temples in Asia Minor. Excavations have also revealed the city walls, a well-preserved harbor, a theatre, and a Hellenistic agora, with ongoing digs still refining the site's Hellenistic-to-Byzantine occupation phasing.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Temple_of_Athena%2C_Assos_1.jpg",
          caption: "Ruins of the Doric Temple of Athena on the acropolis of Assos, Turkey",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Temple_of_Athena,_Assos_1.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/4/40/Assos_Hafen.JPG",
          caption: "The ancient harbor at Assos, from which Paul's companions sailed to meet him",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Assos_Hafen.JPG",
        },
      ],
    },
    modernMapUrl: mapsUrl(39.4878, 26.3369),
    sources: [
      { label: "Bible Gateway - Acts 20:13-14", url: "https://www.biblegateway.com/passage/?search=Acts+20%3A13-14&version=NIV" },
      { label: "Wikipedia - Assos", url: "https://en.wikipedia.org/wiki/Assos" },
      { label: "UNESCO Tentative List - Archaeological Site of Assos", url: "https://whc.unesco.org/en/tentativelists/6242/" },
    ],
  },
  {
    id: "hierapolis",
    name: "Hierapolis",
    tag: "Ancient City",
    modernName: "Pamukkale, Denizli Province, Turkey",
    coordinates: [29.1258, 37.925],
    description:
      "Hierapolis was a Hellenistic-Roman city in Phrygia near Colossae and Laodicea, part of the cluster of Lycus Valley churches named in Colossians 4:13. By tradition the Apostle Philip was martyred here in the late 1st century AD.",
    archaeology: {
      note: "Italian missions have excavated Hierapolis since 1957, uncovering the theater, baths, agora, and a vast necropolis of roughly 1,200 tombs. A large 5th-century octagonal martyrium honoring Philip stands northeast of the city walls; a 2011 proposal for Philip's actual tomb nearby remains debated and unconfirmed rather than certain.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Hierapolis_-_Pamukkale.jpg",
          caption: "The white travertine terraces of Pamukkale beneath the ruins of ancient Hierapolis",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Hierapolis_-_Pamukkale.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Necropolis_of_Hierapolis.jpg",
          caption: "Tombs and sarcophagi in the necropolis of Hierapolis, one of the best-preserved ancient cemeteries in Turkey",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Necropolis_of_Hierapolis.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(37.925, 29.1258),
    sources: [
      { label: "Hierapolis - Wikipedia", url: "https://en.wikipedia.org/wiki/Hierapolis" },
      { label: "Excavations at Hierapolis in Phrygia, Turkey - University of Oslo", url: "https://www.hf.uio.no/iakh/english/research/projects/hierapolis/" },
      { label: "Colossians 4:13 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Colossians%204%3A13" },
      { label: "Tomb of Apostle Philip Found - Biblical Archaeology Society", url: "https://www.biblicalarchaeology.org/daily/biblical-sites-places/biblical-archaeology-sites/tomb-of-apostle-philip-found/" },
    ],
  },
  {
    id: "acrocorinth",
    name: "Acrocorinth",
    tag: "Ancient City",
    modernName: "Ancient Corinth, Greece",
    coordinates: [22.8725, 37.8906],
    description:
      "Acrocorinth is the steep acropolis rising above ancient Corinth, a city where Paul lived and preached for eighteen months. The summit's ancient Temple of Aphrodite fed Corinth's reputation in antiquity for licentiousness — a cultural backdrop scholars connect to Paul's teaching on sexual immorality and idolatry in 1 Corinthians.",
    archaeology: {
      note: "Excavation of Acrocorinth began in 1929; the fortress preserves construction phases from the Archaic through Byzantine, Frankish, and Ottoman periods. Only foundation remains of the Aphrodite temple survive, later overbuilt by a church and mosque, so the scale of any \"sacred prostitution\" tradition described by later ancient writers is debated among historians rather than archaeologically confirmed in Paul's own era.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Acrocorinthos.jpg",
          caption: "The fortified rocky summit of Acrocorinth, acropolis of ancient Corinth",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Acrocorinthos.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Temple_of_Aphrodite_at_Acrocorinth.jpg",
          caption: "Remains at the site of the Temple of Aphrodite on the summit of Acrocorinth",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Temple_of_Aphrodite_at_Acrocorinth.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(37.8906, 22.8725),
    sources: [
      { label: "Acrocorinth - Wikipedia", url: "https://en.wikipedia.org/wiki/Acrocorinth" },
      { label: "About the Excavations - American School of Classical Studies at Athens", url: "https://www.ascsa.edu.gr/excavations/ancient-corinth/about-the-excavations-1" },
      { label: "1 Corinthians - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=1%20Corinthians%206" },
      { label: "Acts 18:11 (18 months in Corinth) - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2018%3A11" },
    ],
  },
  {
    id: "nazareth-synagogue-church",
    name: "Nazareth Synagogue Church",
    tag: "Religious Site",
    modernName: "Nazareth, Israel",
    coordinates: [35.2967, 32.7033],
    description:
      "This small church in Nazareth's old market stands on the traditional site of the town synagogue where, according to Luke 4:16-30, Jesus read from the scroll of Isaiah, declared its fulfillment in himself, and was driven out by an angry crowd.",
    archaeology: {
      note: "The current church building is medieval, likely built atop or incorporating a 12th-century Crusader structure. Archaeologists have found no evidence of a Roman-period public building on the site, so while the identification is an old, continuously maintained local tradition, scholars regard the specific link to the 1st-century synagogue of Jesus's day as unverified rather than established.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/8/8e/Nazareth_Synagogue_Church.jpg",
          caption: "Exterior of the Synagogue Church in the old market of Nazareth",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Nazareth_Synagogue_Church.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(32.7033, 35.2967),
    sources: [
      { label: "Luke 4:16-30 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Luke%204%3A16-30" },
      { label: "Nazareth - Wikipedia (Synagogue Church section)", url: "https://en.wikipedia.org/wiki/Nazareth" },
      { label: "Synagogue Church, Nazareth - Madain Project", url: "https://madainproject.com/synagogue_church_nazareth" },
    ],
  },
  {
    id: "upper-room",
    name: "Upper Room",
    tag: "Religious Site",
    modernName: "The Cenacle, Mount Zion, Jerusalem",
    coordinates: [35.229, 31.7718],
    description:
      "The Cenacle on Mount Zion is the traditional site of the Last Supper, where Jesus instituted the Eucharist with his disciples (Mark 14:12-26), and of the Holy Spirit's descent on believers at Pentecost (Acts 2:1-4).",
    archaeology: {
      note: "The upper-floor Gothic hall visitors see today is a medieval Crusader-to-Mamluk-era structure, variously dated between the 12th and 14th centuries. A 4th-century pilgrim account describes an earlier structure on the hill, but no archaeological remains directly confirm the room's use as the actual room of the Last Supper — the identification rests on continuous but unverifiable tradition.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/2b/The_Cenacle%2C_Last_Supper_Room_-_Mount_Zion%2C_Jerusalem_07.jpg",
          caption: "Interior of the Cenacle (traditional Last Supper Room) on Mount Zion, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Cenacle,_Last_Supper_Room_-_Mount_Zion,_Jerusalem_07.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/54/Cenacle_on_Mount_Zion.jpg",
          caption: "The Cenacle building on Mount Zion, traditionally venerated as the site of the Last Supper and Pentecost",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Cenacle_on_Mount_Zion.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7718, 35.229),
    sources: [
      { label: "Cenacle - Wikipedia", url: "https://en.wikipedia.org/wiki/Cenacle" },
      { label: "Mark 14:12-26 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Mark%2014%3A12-26" },
      { label: "Acts 2:1-4 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%202%3A1-4" },
      { label: "The Cenacle - See The Holy Land", url: "https://www.seetheholyland.net/cenacle/" },
    ],
  },
  {
    id: "antonia-fortress",
    name: "Antonia Fortress",
    tag: "Roman Garrison",
    modernName: "Temple Mount / Haram al-Sharif, Jerusalem",
    coordinates: [35.2362, 31.776],
    description:
      "The Antonia Fortress was a Herodian military garrison built at the northwest corner of the Temple Mount to overlook the Jewish Temple precinct. Long-standing Christian tradition identifies it as the Praetorium where Jesus was tried before Pontius Pilate (John 18:28-19:16) and the starting point of the Via Dolorosa.",
    archaeology: {
      note: "Excavations near the Temple Mount's northwest corner revealed a massive wall and Herodian ashlar masonry consistent with a large fortress, and flagstone paving once thought to be the Gospel's \"Pavement\" (Gabbatha, John 19:13). Modern scholarship has shown much of that pavement actually dates to a 2nd-century Roman forum, decades after Jesus's trial, and argues Pilate more likely resided at Herod's former palace on the Western Hill — making the Antonia's role as the actual trial site a matter of ongoing scholarly debate rather than settled fact.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/e/ef/The_Antonia_Fortress.jpg",
          caption: "Scale model of the Antonia Fortress beside the Second Temple, Israel Museum, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Antonia_Fortress.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/4/4d/Israel_Museum_290416_Model_of_Jerusalem_03.jpg",
          caption: "The Antonia Fortress section of the Second Temple Period model of Jerusalem, Israel Museum",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Israel_Museum_290416_Model_of_Jerusalem_03.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.776, 35.2362),
    sources: [
      { label: "Antonia Fortress - Wikipedia", url: "https://en.wikipedia.org/wiki/Antonia_Fortress" },
      { label: "John 18:28-19:16 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=John%2018%3A28-19%3A16" },
      { label: "Behold The Man: Where Did Pilate Sentence Jesus? - Bible Archaeology Report", url: "https://biblearchaeologyreport.com/2022/04/14/behold-the-man-where-did-pilate-sentence-jesus/" },
      { label: "Pilate's court - Wikipedia", url: "https://en.wikipedia.org/wiki/Pilate%27s_court" },
    ],
  },
  {
    id: "dominus-flevit",
    name: "Dominus Flevit",
    tag: "Religious Site",
    modernName: "Mount of Olives, East Jerusalem",
    coordinates: [35.2418, 31.778],
    description:
      "Dominus Flevit (\"the Lord wept\") marks the traditional spot on the western slope of the Mount of Olives where, according to Luke 19:41-44, Jesus wept over Jerusalem while foretelling the city's destruction. A teardrop-shaped chapel (built 1953-1955) now stands on the site.",
    archaeology: {
      note: "Construction of the chapel uncovered a Canaanite tomb from the Late Bronze Age and a Second Temple-period necropolis with inscribed ossuaries (Hebrew, Aramaic, and Greek script, some bearing crosses), plus a later Byzantine monastery. The name \"Dominus Flevit\" reflects a 14th-century Franciscan tradition commemorating the Gospel event, not an archaeologically verified location for where Jesus actually wept — the excavated remains attest to real, continuous burial and monastic use of the hillside, independent of the traditional identification.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Jerusalem_Dominus_flevit_BW_1.JPG",
          caption: "View toward the Temple Mount from the window of Dominus Flevit Church, Mount of Olives",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Jerusalem_Dominus_flevit_BW_1.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Jerusalem_Dominus_flevit_BW_2.JPG",
          caption: "Interior of Dominus Flevit Church, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Jerusalem_Dominus_flevit_BW_2.JPG",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.778, 35.2418),
    sources: [
      { label: "Dominus Flevit Church - Wikipedia", url: "https://en.wikipedia.org/wiki/Dominus_Flevit_Church" },
      { label: "Luke 19:41-44 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Luke%2019%3A41-44" },
      { label: "Church of Dominus Flevit - See The Holy Land", url: "https://www.seetheholyland.net/church-of-dominus-flevit/" },
    ],
  },
  {
    id: "st-peter-gallicantu",
    name: "St. Peter in Gallicantu",
    tag: "Religious Site",
    modernName: "Mount Zion, Jerusalem",
    coordinates: [35.2319, 31.7714],
    description:
      "The Church of St. Peter in Gallicantu (\"at cock-crow\") sits on the eastern slope of Mount Zion. Tradition identifies the site as the location of the House of Caiaphas, the High Priest before whom Jesus was tried, and the setting for Peter's threefold denial (Matthew 26:69-75).",
    archaeology: {
      note: "The current church (1924-1931) was built after excavation uncovered Second Temple-period caves and cisterns beneath it, including a chamber known as the \"Sacred Pit,\" sometimes shown as the traditional holding cell of Jesus, plus a stepped street descending toward the Kidron Valley. Scholars caution that the identification of this spot as Caiaphas's palace is a Byzantine-period tradition rather than an archaeologically certain finding — the caves are typical of ordinary Roman-era domestic cellars, and a rival tradition locates the House of Caiaphas elsewhere on the same hill.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Church_of_Saint_Peter_in_Gallicantu.jpg",
          caption: "Exterior view of the Church of St. Peter in Gallicantu, overlooking Jerusalem's Old City",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_Saint_Peter_in_Gallicantu.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Sacred_Pit_%28dungeon%29%2C_Gallicantu_Peter%27s_Church.JPG",
          caption: "The rock-cut \"Sacred Pit,\" an underground chamber traditionally associated with Jesus's overnight imprisonment",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Sacred_Pit_(dungeon),_Gallicantu_Peter's_Church.JPG",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7714, 35.2319),
    sources: [
      { label: "Church of Saint Peter in Gallicantu - Wikipedia", url: "https://en.wikipedia.org/wiki/Church_of_Saint_Peter_in_Gallicantu" },
      { label: "Matthew 26:69-75 - Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Matthew%2026%3A69-75" },
      { label: "House of Caiaphas: Church of St. Gallicantu - HolyLandSite.com", url: "https://www.holylandsite.com/house-of-caiaphas" },
    ],
  },
  {
    id: "herod-winter-palace-jericho",
    name: "Herod's Winter Palace",
    tag: "Palace",
    modernName: "Tulul Abu el-Alayiq, near Jericho, West Bank",
    coordinates: [35.4337, 31.8537],
    description:
      "Tulul Abu el-Alayiq, on the banks of Wadi Qelt southwest of modern Jericho, was the site of the Hasmonean and Herodian winter palace complex, expanded by Herod the Great into a lavish Roman-style royal resort. Josephus records that Herod fell fatally ill and died near Jericho in 4 BC, likely at this palace.",
    archaeology: {
      note: "Extensive excavations led by Ehud Netzer beginning in 1973 identified a sequence of Hasmonean and Herodian structures, including Herod's First, Second, and Third Palaces, revealing opulent Roman-influenced architecture, bathhouses, a sunken garden, and a large pool complex spanning both banks of the wadi. Some interpretive details, such as precise room functions and construction phasing, remain debated among specialists.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/a/a1/Opus_reticulatum_stonework_from_Herod%27s_palace_at_Jericho.jpg",
          caption: "Opus reticulatum stonework from Herod's palace at Jericho",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Opus_reticulatum_stonework_from_Herod's_palace_at_Jericho.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/b/b5/By_Ovedc_-_Tulul_al-Alaiq%2C_Herod%27s_winter_palaces%2C_Jericho_01.jpg",
          caption: "View of the archaeological ruins at Tulul al-Alaiq, Herod's winter palaces, Jericho",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:By_Ovedc_-_Tulul_al-Alaiq,_Herod's_winter_palaces,_Jericho_01.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.8537, 35.4337),
    sources: [
      { label: "Ehud Netzer - Wikipedia", url: "https://en.wikipedia.org/wiki/Ehud_Netzer" },
      { label: "Hasmonean and Herodian royal winter palaces - Wikipedia", url: "https://en.wikipedia.org/wiki/Hasmonean_and_Herodian_royal_winter_palaces" },
      { label: "Archaeology in Israel: Jericho, The Winter Palace of King Herod - Jewish Virtual Library", url: "https://www.jewishvirtuallibrary.org/jericho-the-winter-palace-of-king-herod" },
    ],
  },
  {
    id: "lechaion",
    name: "Lechaion",
    tag: "Ancient Port",
    modernName: "Lechaio, near Corinth, Greece",
    coordinates: [22.8875, 37.9327],
    description:
      "Lechaion was the western harbor of ancient Corinth, connected to the city by fortified Long Walls, and served as Corinth's gateway to trade with Italy and the western Mediterranean. Corinth's dual-port system (Lechaion west, Cenchreae east) made it a great commercial crossroads, the kind of trade hub reflected in Paul's eighteen-month ministry there.",
    archaeology: {
      note: "Excavations uncovered a massive Early Christian basilica (5th century), one of the largest in mainland Greece. More recent underwater fieldwork has documented the harbor's monumental ashlar moles, a breakwater, and rare wooden caissons from an early Byzantine mole; precise dating and full extent of some harbor phases remain areas of ongoing research.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/e/ee/Lechaion_Basilica_01.JPG",
          caption: "View from the entrance of the Lechaion Basilica archaeological site, near Corinth, Greece",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Lechaion_Basilica_01.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Lechaion.jpg",
          caption: "Byzantine Ionic capitals among the ruins of the Lechaion Basilica",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Lechaion.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(37.9327, 22.8875),
    sources: [
      { label: "Early Christian Basilica of Lechaion - topostext.org", url: "https://topostext.org/place/379229ELec" },
      { label: "The ancient port of Lechaion - Visit Peloponnese", url: "https://www.visitpeloponnese.com/en/prdct/ancient-port-lechaion" },
      { label: "Corinth - Wikipedia (Lechaion port section)", url: "https://en.wikipedia.org/wiki/Corinth" },
    ],
  },
  {
    id: "tower-of-david",
    name: "Tower of David",
    tag: "Fortress",
    modernName: "Jerusalem Citadel, near Jaffa Gate, Old City of Jerusalem",
    coordinates: [35.2278, 31.7761],
    description:
      "Herod the Great fortified this corner of Jerusalem's Upper City (c. 37-34 BC) with a royal palace complex and three massive defensive towers, named Phasael, Hippicus, and Mariamne. Josephus describes these towers as key elements of Jerusalem's defenses during the First Jewish-Roman War.",
    archaeology: {
      note: "Excavations have exposed roughly 16 courses of massive Herodian-period ashlar stones at the base of the citadel, identified as the remains of one of Herod's towers, along with earlier Hasmonean-period wall sections beneath it. The name \"Tower of David\" is not ancient — it originated in the Byzantine period when Christian tradition mistakenly identified this part of the Upper City hill as biblical Mount Zion and presumed the ruins to be King David's palace; archaeologically there is no evidence connecting the structure to David.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/da/Old_City_Walls_and_Tower_of_David_in_Jerusalem_%282019%29_03.jpg",
          caption: "Old City walls and the Tower of David in Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Old_City_Walls_and_Tower_of_David_in_Jerusalem_(2019)_03.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/91/Jaffa_Gate%2C_Tower_of_David_and_Western_Wall_Old_City%2C_Jerusalem.jpg",
          caption: "Panoramic view of Jaffa Gate, the Tower of David citadel, and the Western Wall in Jerusalem's Old City",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Jaffa_Gate,_Tower_of_David_and_Western_Wall_Old_City,_Jerusalem.jpg",
        },
      ],
    },
    modernMapUrl: mapsUrl(31.7761, 35.2278),
    sources: [
      { label: "Tower of David - Wikipedia", url: "https://en.wikipedia.org/wiki/Tower_of_David" },
      { label: "Phasael Tower - Madain Project", url: "https://madainproject.com/phasael_tower" },
      { label: "The Citadel of Jerusalem - Jewish Virtual Library", url: "https://www.jewishvirtuallibrary.org/the-citadel-of-jerusalem" },
    ],
  },
  {
    id: "chapel-of-ascension",
    name: "Chapel of the Ascension",
    tag: "Traditional Site",
    modernName: "At-Tur, Mount of Olives, East Jerusalem",
    coordinates: [35.24505, 31.7789],
    description: "This small domed edicule on the summit of the Mount of Olives marks the traditional spot where Jesus ascended to heaven forty days after the Resurrection, witnessed by the apostles as \"a cloud took him out of their sight\" (Acts 1:9-12). The tradition, dating to the 4th century, centers on a limestone slab inside the shrine venerated as bearing an impression of Christ's footprint. Uniquely among Jerusalem's holy sites, it is administered by the Islamic Waqf, and Christians of all denominations are granted access, especially to celebrate the Feast of the Ascension.",
    archaeology: {
      note: "The first church on this site, called the Imbomon (\"on the hill\"), was built around 390 CE by the Roman noblewoman Poimenia, replacing an earlier open-air gathering spot described by the pilgrim Egeria in 384 CE. That octagonal Byzantine structure was destroyed by the Persians in 614, rebuilt, and later reconstructed by the Crusaders around 1150 into the current small octagonal edicule. After Saladin's conquest in 1187 it was converted into a mosque, adding the stone dome and exterior walls seen today. A 1995 salvage excavation outside the mosque's south wall uncovered a Byzantine-period underground crypt linked to the site, but the precise location of Poimenia's original church remains a matter of scholarly reconstruction, and the \"footprint\" relic is devotional tradition, not an archaeological find.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Church_of_the_Ascension%2C_Jerusalem3001.JPG",
          caption: "The Chapel of the Ascension edicule, Mount of Olives, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_the_Ascension,_Jerusalem3001.JPG",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Chapel of the Ascension", url: "https://en.wikipedia.org/wiki/Chapel_of_the_Ascension" },
      { label: "Bible Gateway — Acts 1:9-12", url: "https://www.biblegateway.com/passage/?search=Acts+1%3A9-12" },
      { label: "BibleWalks — Chapel of Ascension, Mt. Olives", url: "https://www.biblewalks.com/ascensionchurch/" },
      { label: "Madain Project — Chapel of the Ascension", url: "https://madainproject.com/chapel_of_the_ascension" },
    ],
  },
  {
    id: "church-of-pater-noster",
    name: "Church of the Pater Noster",
    tag: "Traditional Site",
    modernName: "Mount of Olives, East Jerusalem",
    coordinates: [35.2449, 31.778],
    description: "Part of a Carmelite convent on the Mount of Olives, this church stands over a grotto where, by patristic-era tradition rather than direct Gospel narrative, Jesus taught his disciples the Lord's Prayer (compare Luke 11:1-4 and Matthew 6:9-13). Its cloister and church walls are covered with ceramic plaques bearing the prayer in more than 140 languages, making it one of the most visually striking sites on the Mount. The site was originally known as Eleona (\"of the olives\") and, in early tradition recorded by pilgrims like Egeria, was also associated with Jesus's private teaching to the disciples, including the Olivet Discourse (Matthew 24-25; Mark 13).",
    archaeology: {
      note: "The original Eleona basilica was commissioned in the early 4th century, traditionally under the patronage of Constantine's mother Helena, and measured roughly 35 by 19 meters; it was destroyed by the Sasanian Persian invasion in 614 CE. Crusaders built an oratory on the ruins in 1106 and a fuller church in 1152. The Byzantine basilica's foundations were rediscovered in 1910 by French archaeologists, partially underlying the present 19th-century Carmelite cloister; a full reconstruction begun in 1915 was never completed. The identification of the specific grotto with the Lord's Prayer teaching is a medieval devotional overlay on an earlier, broader tradition about the site — it is not attested in the New Testament text itself.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Church_of_the_Pater_Noster_%28Jerusalem%293007.jpg",
          caption: "Exterior of the Church of the Pater Noster, Mount of Olives, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_the_Pater_Noster_(Jerusalem)3007.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Church of the Pater Noster", url: "https://en.wikipedia.org/wiki/Church_of_the_Pater_Noster" },
      { label: "Bible Gateway — Luke 11:1-4", url: "https://www.biblegateway.com/passage/?search=Luke+11%3A1-4" },
      { label: "See the Holy Land — Church of Pater Noster", url: "https://www.seetheholyland.net/church-of-pater-noster/" },
      { label: "BibleWalks — Pater Noster, Mt. Olives", url: "https://www.biblewalks.com/paternoster/" },
    ],
  },
  {
    id: "tomb-of-virgin-mary-kidron",
    name: "Tomb of the Virgin Mary",
    tag: "Traditional Site",
    modernName: "Kidron Valley, East Jerusalem",
    coordinates: [35.2394, 31.78013],
    description: "This rock-cut tomb and subterranean church in the Kidron Valley, at the foot of the Mount of Olives, is venerated by Byzantine-era tradition as the burial place of Mary, mother of Jesus, following her Dormition. The tradition is entirely extra-biblical — the New Testament records no account of Mary's death or burial — but the site has been a major pilgrimage destination since at least the 5th century. A long staircase descends into a crypt shared today, under a long-standing arrangement, by the Greek Orthodox and Armenian Apostolic churches, with a Muslim prayer niche also present.",
    archaeology: {
      note: "A small octagonal upper church was built over the tomb in the 5th century under Patriarch Juvenal; it was destroyed in the 614 CE Persian invasion. Crusaders rebuilt the church in 1130, establishing the Benedictine Abbey of St. Mary of the Valley of Jehoshaphat; Saladin demolished the upper structure in 1187, though the lower crypt survived. In 1972 Franciscan archaeologist Bellarmino Bagatti excavated the site and reported evidence of a 1st-century Jewish rock-cut cemetery beneath the later church; his findings have not been subjected to full independent peer review, so the identification of any specific chamber as Mary's actual burial site remains a matter of tradition rather than established archaeological fact.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/1/15/Tomb_of_Virgin_Mary.jpg",
          caption: "The Church of the Sepulchre of Saint Mary (Tomb of the Virgin Mary), Kidron Valley, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Tomb_of_Virgin_Mary.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Tomb of the Virgin Mary", url: "https://en.wikipedia.org/wiki/Tomb_of_the_Virgin_Mary" },
      { label: "See the Holy Land — Tomb of Mary", url: "https://www.seetheholyland.net/tomb-of-mary/" },
      { label: "Madain Project — Tomb of the Virgin Mary", url: "https://madainproject.com/tomb_of_the_virgin_mary_(jerusalem)" },
    ],
  },
  {
    id: "dormition-abbey",
    name: "Dormition Abbey",
    tag: "Traditional Site",
    modernName: "Mount Zion, Jerusalem, Israel",
    coordinates: [35.2289, 31.7722],
    description: "The Dormition Abbey (Hagia Maria Sion Abbey) is a Benedictine church and monastery on Mount Zion just outside Jerusalem's Old City walls, marking the traditional site where the Virgin Mary \"fell asleep\" (died) at the end of her earthly life. This tradition is not recorded in the New Testament itself — the closest biblical anchor is John 19:26-27, where the dying Jesus entrusts Mary to the care of \"the disciple whom he loved\" — and instead derives from later apocryphal texts (roughly 4th-6th centuries), venerated by both Catholic and Orthodox tradition with differing theological conclusions (Catholic \"Assumption\" vs. Orthodox \"Dormition\").",
    archaeology: {
      note: "A Byzantine basilica called Hagia Sion was built on this rise in the early 5th century under Bishop John II of Jerusalem, but it was destroyed in the Sasanian sack of Jerusalem in 614 CE. A Crusader-era monastic church rose on the ruins in the 12th century, destroyed again in the 13th. The foundations were rediscovered in 1899, and the present neo-Romanesque abbey was constructed 1900-1910 after Kaiser Wilhelm II purchased the land. The specific location of Mary's death is a matter of tradition, not archaeological verification — there is no physical evidence tying the crypt itself to the event beyond continuous veneration since at least the Byzantine period.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Dormition_Abbey%2C_Jerusalem.JPG",
          caption: "Exterior view of Dormition Abbey on Mount Zion, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Dormition_Abbey,_Jerusalem.JPG",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Abbey of the Dormition", url: "https://en.wikipedia.org/wiki/Abbey_of_the_Dormition" },
      { label: "Dormitio Abbey — Official Site", url: "https://www.dormitio.net/english/en.places/en.abbey/en.abbey.church/index.html" },
      { label: "Bible Gateway — John 19:25-27", url: "https://www.biblegateway.com/passage/?search=John%2019%3A25-27" },
      { label: "SeeTheHolyLand — Church of the Dormition", url: "https://www.seetheholyland.net/church-of-the-dormition/" },
    ],
  },
  {
    id: "ecce-homo-arch",
    name: "Ecce Homo Arch",
    tag: "Traditional Site",
    modernName: "Via Dolorosa, Old City, Jerusalem, Israel",
    coordinates: [35.2334, 31.7804],
    description: "The Ecce Homo Arch is a Roman monumental archway spanning the Via Dolorosa in Jerusalem's Old City, traditionally venerated as the spot where Pontius Pilate presented the scourged Jesus to the crowd with the words \"Behold the man!\" (John 19:5, Latin: \"Ecce Homo\"). Modern archaeology has established that this arch was NOT standing at the time of Jesus's trial: excavations since the late 1970s show it was built by the emperor Hadrian around 135 CE as a gateway into the eastern forum of Aelia Capitolina — nearly a century after the crucifixion — with no verified connection to Herod's Antonia Fortress or Pilate's Praetorium. The traditional identification is a later Christian devotional association, not a historically supported one.",
    archaeology: {
      note: "The visible arch is the central span of what was originally a Hadrianic triple gateway (c. 135 CE) marking the entrance to Aelia Capitolina's eastern forum. One of the flanking arches survives inside the Basilica of the Ecce Homo, within the Convent of the Sisters of Zion (built 1857). Beneath the convent lies the Struthion Pool and a large rock-cut pavement once mistakenly associated with the biblical \"Gabbatha\" or Stone Pavement of John 19:13; that pavement is now also dated to Hadrian's era, not the Second Temple period. No archaeological material at the site predates the 2nd century CE, so nothing here can be physically linked to the Gospel trial narrative.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Ecce_Homo_in_Dolorosa_Jerusalem.jpg",
          caption: "The Ecce Homo Arch spanning the Via Dolorosa, Jerusalem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ecce_Homo_in_Dolorosa_Jerusalem.jpg",
        },
      ],
    },
    sources: [
      { label: "Madain Project — Ecce Homo Arch", url: "https://madainproject.com/ecce_homo_arch" },
      { label: "Wikidata — Arch of Ecce Homo", url: "https://www.wikidata.org/wiki/Q1280180" },
      { label: "Bible Gateway — John 19:5", url: "https://www.biblegateway.com/passage/?search=John%2019%3A5" },
      { label: "SeeTheHolyLand — Ecce Homo", url: "https://www.seetheholyland.net/ecce-homo/" },
    ],
  },
  {
    id: "milk-grotto-bethlehem",
    name: "Milk Grotto",
    tag: "Traditional Site",
    modernName: "Bethlehem, West Bank, Palestinian Territories",
    coordinates: [35.208778, 31.703444],
    description: "The Chapel of the Milk Grotto is a small limestone cave-shrine in Bethlehem traditionally identified as a stopping point for the Holy Family as they prepared to flee to Egypt to escape Herod's massacre of infants (Matthew 2:13-15). According to a tradition traceable to at least the 6th century, while nursing the infant Jesus in this cave, a drop of the Virgin Mary's milk fell to the ground and turned the reddish local rock chalky white. The site has no explicit textual basis in the Gospel account itself, making the specific location purely a matter of extra-biblical popular tradition, though it has been continuously venerated by both Christian and Muslim women as a pilgrimage site.",
    archaeology: {
      note: "A Byzantine-era church stood on the site from around the 5th century, of which only fragments of a geometric mosaic floor survive on the grotto's terrace; relics associated with the Milk Grotto were already circulating in Europe and the East by the 6th century, indicating the tradition's antiquity even though it cannot be independently verified. The current Franciscan-run chapel dates only to 1872, built atop the earlier remains. As with most cave-shrine traditions in the Bethlehem area, the identification rests on continuous local memory and pilgrim veneration rather than any archaeological evidence directly confirming a Holy Family visit.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Chapel_of_the_Milk_Grotto_4-Bethlehem.jpg",
          caption: "Exterior of the Chapel of the Milk Grotto, Bethlehem",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Chapel_of_the_Milk_Grotto_4-Bethlehem.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Chapel of the Milk Grotto", url: "https://en.wikipedia.org/wiki/Chapel_of_the_Milk_Grotto" },
      { label: "SeeTheHolyLand — Milk Grotto", url: "https://www.seetheholyland.net/milk-grotto/" },
      { label: "Bible Gateway — Matthew 2:13-15", url: "https://www.biblegateway.com/passage/?search=Matthew%202%3A13-15" },
      { label: "Pro Terra Sancta — Milk Grotto", url: "https://www.proterrasancta.org/en/news/story-of-the-milk-grotto-in-bethlehem" },
    ],
  },
  {
    id: "basilica-of-annunciation-nazareth",
    name: "Basilica of the Annunciation",
    tag: "Religious Site",
    modernName: "Nazareth, Israel",
    coordinates: [35.29778, 32.70222],
    description: "The largest Christian church in the Middle East, the Basilica of the Annunciation marks the Roman Catholic tradition's site of the Annunciation, where the angel Gabriel told Mary she would conceive Jesus (Luke 1:26-38). The lower church encloses the Grotto of the Annunciation, venerated since at least the Byzantine period as the remains of Mary's childhood home. The current two-story basilica, designed by Italian architect Giovanni Muzio, was built 1960-1969 over the ruins of Crusader and Byzantine churches on the same spot.",
    archaeology: {
      note: "Extensive excavations by Franciscan archaeologists (led by Bellarmino Bagatti) between 1955 and 1968 uncovered a Byzantine church (4th-5th century) with mosaic floors, a Crusader-era church built by Tancred after 1102, and evidence of a small Iron Age/early Roman village with cave dwellings, cisterns, and silos — consistent with 1st-century Nazareth being a modest agricultural hamlet. No inscription or artifact confirms this specific cave as Mary's home; the identification rests on continuous local tradition traceable to at least the 4th century. In 2009 the Israel Antiquities Authority separately uncovered a 1st-century two-room house on an adjacent property, supporting that Nazareth was inhabited at the time, though not tied specifically to this site.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/91/Basilique_de_l%27Annonciation%2C_Nazareth.jpg",
          caption: "Exterior view of the Basilica of the Annunciation, showing its distinctive dome and facade",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Basilique_de_l'Annonciation,_Nazareth.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/d0/4200-20080119-0624UTC--nazareth-church-of-the-annunciation-grotto.jpg",
          caption: "Catholic Mass being celebrated in the Grotto of the Annunciation, the cave venerated as Mary's traditional home",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:4200-20080119-0624UTC--nazareth-church-of-the-annunciation-grotto.jpg",
        },
      ],
    },
    sources: [
      { label: "Basilica of the Annunciation — Wikipedia", url: "https://en.wikipedia.org/wiki/Basilica_of_the_Annunciation" },
      { label: "Nazareth – Basilica of the Annunciation — Custodia Terrae Sanctae", url: "https://www.custodia.org/en/sanctuaries/nazareth-basilica-of-the-annunciation/" },
      { label: "Luke 1:26-38 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Luke%201%3A26-38" },
    ],
  },
  {
    id: "marys-well-nazareth",
    name: "Mary's Well / Church of St. Gabriel",
    tag: "Traditional Site",
    modernName: "Nazareth, Israel",
    coordinates: [35.30156, 32.70671],
    description: "The Greek Orthodox counter-tradition to the Basilica of the Annunciation, this site holds that Gabriel first appeared to Mary while she was drawing water from Nazareth's ancient spring — an episode from the apocryphal 2nd-century Protoevangelium of James, not found in the canonical Luke 1:26-38 account, which names no location. The Church of St. Gabriel was built directly over the spring's source, with the water still flowing through the crypt beneath the altar. A separate public well structure in the plaza, fed by the same spring, served as Nazareth's only water source for centuries.",
    archaeology: {
      note: "Israel Antiquities Authority excavations in 1997-98 documented rock-cut water channels dating to the Roman period (2nd-4th century CE) beneath and around the site, showing the spring was in continuous use for a very long span — plausibly including the 1st century, when Nazareth was a small village. That confirms the spring itself is ancient and was almost certainly Nazareth's communal water source in Jesus's era, but it cannot verify the Annunciation narrative detail from the apocryphal source; the present church structure dates only to a mid-18th-century (1750) Ottoman-period rebuilding after Crusader and Mamluk-destroyed predecessors.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/27/MarysWellNazareth.jpg",
          caption: "Mary's Well, the public well structure in Nazareth fed by the ancient spring beneath the Church of St. Gabriel",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:MarysWellNazareth.jpg",
        },
      ],
    },
    sources: [
      { label: "Mary's Well — Wikipedia", url: "https://en.wikipedia.org/wiki/Mary's_Well" },
      { label: "Greek Orthodox Church of the Annunciation — Wikipedia", url: "https://en.wikipedia.org/wiki/Greek_Orthodox_Church_of_the_Annunciation" },
      { label: "St. Gabriel Greek Orthodox Church, Nazareth — BibleWalks", url: "https://www.biblewalks.com/stgabriel/" },
    ],
  },
  {
    id: "wedding-church-cana",
    name: "Wedding Church of Cana",
    tag: "Traditional Site",
    modernName: "Kafr Kanna, Israel",
    coordinates: [35.3386, 32.7467],
    description: "This Franciscan Catholic church in Kafr Kanna is the traditional site of Jesus's first recorded miracle, turning water into wine at a wedding feast (John 2:1-11). Built circa 1881 and expanded 1897-1905 by the Franciscan Custody of the Holy Land, the current church stands over the remains of earlier Byzantine and Jewish structures. Thousands of couples still visit each year to renew their wedding vows here.",
    archaeology: {
      note: "Excavations beneath the church uncovered remains of a Byzantine-era church with Aramaic-inscribed mosaics, plus fragments possibly belonging to a 1st-century Jewish house and later 4th-6th century synagogue remains. However, Kafr Kanna's identification as biblical Cana is a Byzantine-period tradition, not a 1st-century one; no pre-8th-century source names Kafr Kanna specifically. Most current archaeologists instead favor Khirbet Qana, an unexcavated-until-recently ruin about 13 km northwest of Nazareth, where ongoing digs have found a thriving 1st-century Jewish village with mikvaot and winepresses. The traditional site remains the enduring pilgrimage destination, but the historical-geographic identification is genuinely contested among scholars.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/d8/PikiWiki_Israel_40269_The_cana_cahtholic_wedding_church.JPG",
          caption: "The Catholic Wedding Church at Cana in Kafr Kanna",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:PikiWiki_Israel_40269_The_cana_cahtholic_wedding_church.JPG",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/27/Wedding_Church_at_Cana_Hochzeitskirche_Kana_Israel_%2834970523361%29.jpg",
          caption: "The Wedding Church of Cana, where tradition holds Jesus performed his first miracle",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Wedding_Church_at_Cana_Hochzeitskirche_Kana_Israel_(34970523361).jpg",
        },
      ],
    },
    sources: [
      { label: "Wedding Church at Cana — Wikipedia", url: "https://en.wikipedia.org/wiki/Wedding_Church_at_Cana" },
      { label: "Khirbet Qana — Wikipedia", url: "https://en.wikipedia.org/wiki/Khirbet_Qana" },
      { label: "John 2:1-11 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=John%202%3A1-11" },
    ],
  },
  {
    id: "straight-street-damascus",
    name: "Street Called Straight (Via Recta)",
    tag: "Historic Street",
    modernName: "Medhat Pasha Street / Bab Sharqi Street, Damascus, Syria",
    coordinates: [36.3114, 33.5092],
    description: "The old Roman decumanus maximus of Damascus, running roughly 1,500 meters east-west through the Old City. In Acts 9:11, the Lord tells Ananias to go to \"the street called Straight\" to find Saul of Tarsus, praying in the house of Judas, so that his sight could be restored. Today the western half is called Midhat Pasha Street and the eastern half Bab Sharqi Street, and it remains a functioning market street.",
    archaeology: {
      note: "The Roman street's colonnaded plan and monumental arch (partially reconstructed near the Bab Sharqi end) have been documented since 19th-century surveys and confirmed by 20th-century excavation of column bases beneath the modern street level. The Roman-era alignment and width are well established archaeologically; the specific house of Judas mentioned in Acts is not archaeologically identifiable and its location is a matter of tradition rather than excavation.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Damascus_Straight_Street.jpg",
          caption: "View along the Street Called Straight (Via Recta) in the Old City of Damascus",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Damascus_Straight_Street.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia: Straight Street", url: "https://en.wikipedia.org/wiki/Straight_Street" },
      { label: "Acts 9:11 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%209%3A11" },
      { label: "Wikipedia: Old city of Damascus", url: "https://en.wikipedia.org/wiki/Old_city_of_Damascus" },
    ],
  },
  {
    id: "house-of-ananias-damascus",
    name: "House (Chapel) of Ananias",
    tag: "Traditional Site",
    modernName: "Bab Sharqi Quarter, Old City of Damascus, Syria",
    coordinates: [36.3175, 33.5114],
    description: "A subterranean chapel near the eastern end of the Street Called Straight, venerated as the traditional site of the home of Ananias, the disciple who was sent by the Lord in a vision to lay hands on the blinded Saul, restore his sight, and baptize him (Acts 9:10-19). It is one of the oldest continuously venerated Christian sites in Damascus.",
    archaeology: {
      note: "Excavations in 1921 under the modern chapel uncovered remains of a Byzantine-era church dated to the 5th or 6th century, indicating the site was venerated by Christians well before the modern structure. The Franciscan Custody rebuilt the house into its present chapel form in 1820, with further renovation in 1973. The identification of this specific underground room as Ananias's actual house rests on continuous local tradition rather than any inscription or artifact naming him.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Chapel_of_Saint_Ananias_01.jpg",
          caption: "Interior of the underground Chapel of Saint Ananias, Damascus",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Chapel_of_Saint_Ananias_01.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia: Saint Ananias House", url: "https://en.wikipedia.org/wiki/Saint_Ananias_House" },
      { label: "Acts 9:10-19 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%209%3A10-19" },
    ],
  },
  {
    id: "bab-kisan-damascus",
    name: "Bab Kisan (St. Paul's Window)",
    tag: "Traditional Site",
    modernName: "Southeastern Old City Wall, Damascus, Syria",
    coordinates: [36.3153, 33.5064],
    description: "One of the seven ancient gates of Damascus, in the southeastern city wall, near where early Christian tradition places the window through which Paul's disciples lowered him in a basket by night to escape a plot to kill him (Acts 9:23-25; 2 Corinthians 11:32-33). A modern Melkite Greek Catholic chapel, the Chapel of St. Paul, now stands incorporating stonework from the old Roman-era gate and wall.",
    archaeology: {
      note: "The Roman city wall and the gate's foundational masonry in this area date to the Roman period, and portions of ancient wall fabric are visible incorporated into the modern chapel built in 1939. No inscription or archaeological find ties this exact spot to Paul's escape — the association rests on an early but undatable Christian tradition, and the original Bab Kisan gate itself was largely walled up and altered over centuries of Byzantine, Islamic, and Ottoman rebuilding.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Bab_Kisan_-_Chapel_of_St._Paul.jpg",
          caption: "The Chapel of St. Paul at Bab Kisan, built into the old Roman city wall of Damascus",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Bab_Kisan_-_Chapel_of_St._Paul.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia: Bab Kisan", url: "https://en.wikipedia.org/wiki/Bab_Kisan" },
      { label: "Acts 9:23-25 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%209%3A23-25" },
      { label: "2 Corinthians 11:32-33 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=2%20Corinthians%2011%3A32-33" },
    ],
  },
  {
    id: "cave-of-apocalypse-patmos",
    name: "Cave of the Apocalypse",
    tag: "UNESCO World Heritage Site",
    modernName: "Between Chora and Skala, Patmos, Greece",
    coordinates: [26.5447, 37.3144],
    description: "A grotto on a hillside on the Aegean island of Patmos, venerated since antiquity as the place where the apostle John, exiled \"on the island called Patmos because of the word of God,\" received the visions he recorded in the Book of Revelation (Revelation 1:9-11). Tradition holds that John dictated the text to his disciple Prochorus here. The site, together with the nearby Monastery of Saint John the Theologian, was inscribed as a UNESCO World Heritage Site in 1999.",
    archaeology: {
      note: "The cave itself is a natural rock formation that has been continuously venerated and built around since at least the Byzantine period, with the surrounding Chapel of Saint Anne and monastic structures added over centuries; the earliest surviving built fabric on the site dates to after the 11th-century founding of the neighboring monastery. There is no archaeological evidence that can independently confirm John's presence in this specific cave — the identification rests entirely on a long, unbroken monastic and pilgrimage tradition rather than excavation.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/77/Cave_of_the_Apocalypse.jpg",
          caption: "Interior of the Cave of the Apocalypse, Patmos, venerated as the site of John's visions",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Cave_of_the_Apocalypse.jpg",
        },
      ],
    },
    sources: [
      { label: "UNESCO World Heritage Centre: Patmos", url: "https://whc.unesco.org/en/list/942/" },
      { label: "Wikipedia: Cave of the Apocalypse", url: "https://en.wikipedia.org/wiki/Cave_of_the_Apocalypse" },
      { label: "Revelation 1:9-11 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Revelation%201%3A9-11" },
    ],
  },
  {
    id: "antipatris",
    name: "Antipatris (Tel Afek)",
    tag: "Archaeological Site",
    modernName: "Yarkon-Tel Afek National Park, near Rosh HaAyin, Israel",
    coordinates: [34.9304, 32.105],
    description: "A city founded by Herod the Great around 9 BC and named for his father Antipater, built at the headwaters of the Yarkon River astride the ancient Via Maris. In Acts 23:31, Roman soldiers escorting Paul from Jerusalem to Caesarea by night bring him as far as Antipatris before handing him off to a smaller mounted escort for the rest of the journey.",
    archaeology: {
      note: "Tel Afek has been excavated across multiple expeditions since the 1970s, revealing a stratified mound with occupation spanning the Chalcolithic through Ottoman periods, including Canaanite, Egyptian, Philistine, Hellenistic, and Roman remains. The Herodian and Roman-period city is archaeologically well attested through pottery, road remains, and structural fragments, though the precise building Paul's escort would have stopped at is not individually identifiable; the visible Ottoman fortress (Binar Bashi, 1571-1574) sits atop and postdates the New Testament-era city.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/08/Afek_IMG_8217.JPG",
          caption: "Archaeological remains at Tel Afek (Antipatris), Yarkon National Park, Israel",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Afek_IMG_8217.JPG",
        },
      ],
    },
    sources: [
      { label: "Wikipedia: Antipatris", url: "https://en.wikipedia.org/wiki/Antipatris" },
      { label: "Acts 23:31 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2023%3A31" },
      { label: "BiblePlaces.com: Aphek, Antipatris", url: "https://www.bibleplaces.com/aphek/" },
    ],
  },
  {
    id: "tomb-of-lazarus-bethany",
    name: "Tomb of Lazarus",
    tag: "Traditional Site",
    modernName: "Al-Eizariya, West Bank",
    coordinates: [35.2559, 31.7717],
    description: "A rock-cut tomb in Al-Eizariya (whose Arabic name derives from \"Lazarus\"), on the southeastern slope of the Mount of Olives, venerated since at least the 4th century as the tomb of Lazarus of Bethany, whom Jesus raised from the dead four days after his burial (John 11:1-44). The site has been a Christian pilgrimage destination continuously since antiquity, described by the pilgrim Egeria around AD 410.",
    archaeology: {
      note: "A church (the \"Lazarium\") is attested at this location by Jerome in AD 390, and the burial chamber's original vestibule-and-chamber form is consistent with typical Second Temple-period Jewish rock-cut tombs. Because the site has been continuously built over — a Byzantine church, then Crusader-era rebuilding, then the 16th-century Ottoman al-Uzair Mosque, and a modern Franciscan-cut entrance from the 1560s-70s — the tomb's original first-century context has been substantially altered, and its identification as Lazarus's specific tomb rests on a very early but still traditional chain of pilgrim testimony rather than an inscription or artifact.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/2c/PikiWiki_Israel_63831_the_place_of_st_lazarus39s_burial.jpg",
          caption: "The traditional Tomb of Lazarus in Al-Eizariya (Bethany)",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:PikiWiki_Israel_63831_the_place_of_st_lazarus39s_burial.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia: Tomb of Lazarus", url: "https://en.wikipedia.org/wiki/Tomb_of_Lazarus" },
      { label: "John 11:1-44 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=John%2011%3A1-44" },
      { label: "Wikipedia: Church of Saint Lazarus, Al-Eizariya", url: "https://en.wikipedia.org/wiki/Church_of_Saint_Lazarus,_Al-Eizariya" },
    ],
  },
  {
    id: "erastus-inscription-corinth",
    name: "Erastus Inscription",
    tag: "Inscription",
    modernName: "Ancient Corinth, Corinthia, Greece",
    coordinates: [22.8781, 37.9066],
    description: "A 1st-century Latin paving-stone inscription reading ERASTVS PRO AEDILITATE S P STRAVIT (\"Erastus, in return for his aedileship, paved this at his own expense\"). Many scholars connect this Erastus with the Erastus named in Romans 16:23, whom Paul calls \"the city's director of public works,\" though the Latin office of aedile is not a precise equivalent of that Greek title, so the identification — while widely cited — remains a scholarly inference rather than a certainty.",
    archaeology: {
      note: "Discovered in 1929 by excavators from the American School of Classical Studies at Athens, set into a limestone pavement near the north edge of the Roman theater at ancient Corinth, where it remains in situ today. The lettering style and the use of the formula sua pecunia (\"with his own money\") point to a mid-1st-century date, consistent with Paul's residence in Corinth (c. 50-52 CE). Debate continues among scholars over whether this Erastus is the same figure named in Romans, since holding an aedileship sits awkwardly with the lesser financial-officer role Paul describes.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/05/Erastus_stone_at_Theater_of_Corinth.jpg",
          caption: "The Erastus inscription in situ near the theater of ancient Corinth",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Erastus_stone_at_Theater_of_Corinth.jpg",
        },
      ],
    },
    sources: [
      { label: "Erastus of Corinth — Wikipedia", url: "https://en.wikipedia.org/wiki/Erastus_of_Corinth" },
      { label: "Romans 16:23 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Romans%2016%3A23" },
      { label: "Erastus, Gallio, and Paul — Bible Odyssey", url: "https://www.bibleodyssey.org/articles/erastus-gallio-and-paul/" },
    ],
  },
  {
    id: "bema-of-corinth",
    name: "Bema of Corinth (Judgment Seat)",
    tag: "Monument",
    modernName: "Ancient Corinth, Corinthia, Greece",
    coordinates: [22.8803, 37.9051],
    description: "A large raised stone platform (the Latin rostra, Greek bema) standing near the center of Corinth's Roman forum, rising roughly 7.5 feet above the pavement and originally faced in marble. This is traditionally identified as the site where \"the Jews made a united attack on Paul and brought him before the judgment seat (bema)\" before the proconsul Gallio, who dismissed the charges as an internal Jewish religious dispute (Acts 18:12-17).",
    archaeology: {
      note: "Excavated by the American School of Classical Studies at Athens as part of its ongoing work in the Corinth forum. The platform's identification as the specific bema of Acts 18 rests on its prominent, central position in the forum and the known Roman practice of provincial governors holding court in a city's main public square — not on an inscription naming it, so the precise identification, while very plausible, is an inference from location and function rather than an epigraphic certainty.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/96/The_rostra_%28Bema%29_in_the_Roman_forum_of_the_Ancient_Corinth_on_6_April_2019.jpg",
          caption: "The rostra (Bema) in the Roman forum of ancient Corinth",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_rostra_(Bema)_in_the_Roman_forum_of_the_Ancient_Corinth_on_6_April_2019.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/b/b6/Ancient_Corinth_-_Bema.jpg",
          caption: "View of the Bema platform amid the ruins of the Corinth forum",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ancient_Corinth_-_Bema.jpg",
        },
      ],
    },
    sources: [
      { label: "Acts 18:12-17 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2018%3A12-17" },
      { label: "Picture of the Week: The Bema at Corinth — BiblePlaces.com", url: "https://www.bibleplaces.com/blog/2013/08/picture-of-week-bema-at-corinth/" },
    ],
  },
  {
    id: "temple-of-apollo-corinth",
    name: "Temple of Apollo, Corinth",
    tag: "Ancient Temple",
    modernName: "Ancient Corinth, Corinthia, Greece",
    coordinates: [22.8794, 37.9061],
    description: "The best-preserved Archaic temple at Corinth, built around 560 BCE of local limestone atop a hill overlooking the forum, with seven of its original monolithic Doric columns still standing. As the most visually dominant pagan shrine in the city Paul knew, it exemplifies the temple culture and meat-market economy tied to idol worship that Paul addresses directly in 1 Corinthians 8 and 10, where he counsels believers on eating food previously sacrificed to such gods.",
    archaeology: {
      note: "Excavated by the American School of Classical Studies at Athens, whose work at Corinth began in 1896. The temple's date is fixed by its architecture — its unusually long, narrow plan, oversized monolithic column shafts, and squat, flaring Doric capitals, all hallmarks of Archaic construction. Scholars debate whether the temple was dedicated to Apollo at all in its original phase, since the identification rests on later literary testimony (Pausanias) rather than an inscription found on-site.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/59/The_Temple_of_Apollo_%286th_century_B.C.%29_in_Corinth_on_3_June_2018.jpg",
          caption: "The seven standing monolithic Doric columns of the Archaic Temple of Apollo at Corinth",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Temple_of_Apollo_(6th_century_B.C.)_in_Corinth_on_3_June_2018.jpg",
        },
      ],
    },
    sources: [
      { label: "1 Corinthians 8 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=1%20Corinthians%208" },
      { label: "Corinth Computer Project — University of Pennsylvania", url: "http://corinth.sas.upenn.edu/ad150apollo.html" },
      { label: "Temple of Apollo — Visit Corinthia", url: "https://visitcorinthia.com/temple-of-apollo/" },
    ],
  },
  {
    id: "gallio-inscription-delphi",
    name: "Gallio Inscription",
    tag: "Inscription",
    modernName: "Delphi Archaeological Museum, Delphi, Greece",
    coordinates: [22.5013, 38.4824],
    description: "A fragmentary Greek inscription (nine pieces) recording a letter of the emperor Claudius that names \"Lucius Junius Gallio, my friend, and proconsul of Achaia\" (Acts 18:12). Because Claudius's imperial acclamation count in the letter can be dated to around 51-52 CE, and Roman proconsuls typically served one-year terms beginning in early summer, the inscription is the single most important anchor point for dating Paul's roughly 18-month stay in Corinth (Acts 18:11).",
    archaeology: {
      note: "The fragments were discovered near the Temple of Apollo at Delphi in 1905 (with further pieces identified through 1908-1910) and are now held in the Delphi Archaeological Museum. Because the text survives only in pieces and part of the emperor's titulature had to be reconstructed by scholars, some uncertainty remains over the exact month of Gallio's term, but a range of roughly summer 51 to summer 52 CE is broadly accepted.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/1/1f/Delphes_Gallion.jpg",
          caption: "Fragment of the Gallio inscription bearing the proconsul's name, Delphi Archaeological Museum",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Delphes_Gallion.jpg",
        },
      ],
    },
    sources: [
      { label: "Acts 18:12 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2018%3A12" },
      { label: "Gallio: An Archaeological Biography — Bible Archaeology Report", url: "https://biblearchaeologyreport.com/2019/10/31/gallio-an-archaeological-biography/" },
    ],
  },
  {
    id: "areopagus-athens",
    name: "Areopagus (Mars Hill)",
    tag: "Ancient Site",
    modernName: "Athens, Attica, Greece",
    coordinates: [23.7238, 37.9715],
    description: "A rocky limestone outcropping immediately below the western slope of the Acropolis, named for Ares (Roman: Mars) and traditionally the meeting place of the Areopagus council, Athens's ancient judicial and aristocratic body. Tradition places Paul's famous sermon to the philosophers of Athens here (Acts 17:19-34), delivered in response to the altar he had seen inscribed \"TO AN UNKNOWN GOD\" (Acts 17:23) — though Acts itself does not specify the rock outcropping by name, only \"the Areopagus,\" which could refer either to the hill or to the council/court that bore its name.",
    archaeology: {
      note: "The hill has been studied since the 19th century alongside the adjacent Acropolis and Agora excavations, though little of any structure used by the council survives above the bare rock itself; a worn staircase cut into the stone still leads to the summit. Because the biblical text is ambiguous between the physical hill and the judicial council as an institution, some scholars argue Paul's speech was more likely delivered in the Agora below, making the hilltop identification a strong tradition rather than a settled fact.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/c/ca/The_Areopagus_and_the_Acropolis_on_August_22%2C_2019.jpg",
          caption: "The Areopagus (Mars Hill) with the Acropolis rising behind it, Athens",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Areopagus_and_the_Acropolis_on_August_22,_2019.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/6/6c/The_top_of_the_Areopagus_on_July_31%2C_2022.jpg",
          caption: "The summit of the Areopagus, worn smooth by centuries of visitors",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_top_of_the_Areopagus_on_July_31,_2022.jpg",
        },
      ],
    },
    sources: [
      { label: "Acts 17:19-34 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2017%3A19-34" },
      { label: "Areopagus sermon — Wikipedia", url: "https://en.wikipedia.org/wiki/Areopagus_sermon" },
    ],
  },
  {
    id: "ancient-agora-athens",
    name: "Ancient Agora of Athens",
    tag: "Ancient Site",
    modernName: "Athens, Attica, Greece",
    coordinates: [23.7229, 37.975],
    description: "The principal civic and commercial marketplace of ancient Athens, northwest of the Acropolis, filled by the 1st century CE with temples, altars, statues, and colonnaded stoas. Acts 17:17 records that Paul \"reasoned in the synagogue with the Jews and the God-fearing Greeks, as well as in the marketplace day by day with those who happened to be there\" — the daily philosophical and religious debate that eventually led the Stoic and Epicurean philosophers to bring him before the Areopagus.",
    archaeology: {
      note: "Systematically excavated by the American School of Classical Studies at Athens beginning in 1931; the reconstructed 2nd-century-BCE Stoa of Attalos now serves as the Ancient Agora Museum. By Paul's time the square had become an open-air museum of altars and statues collected over centuries — the same religious density that likely included the \"altar to an unknown god\" he references in his Areopagus speech (Acts 17:23), though that specific altar has never been recovered archaeologically.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Ancient_Agora_of_Athens.jpg",
          caption: "Overview of the Ancient Agora of Athens with the Temple of Hephaestus in the background",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ancient_Agora_of_Athens.jpg",
        },
      ],
    },
    sources: [
      { label: "Acts 17:17 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2017%3A17" },
      { label: "Ancient Agora of Athens — Wikipedia", url: "https://en.wikipedia.org/wiki/Ancient_Agora_of_Athens" },
    ],
  },
  {
    id: "temple-of-artemis-ephesus",
    name: "Temple of Artemis, Ephesus",
    tag: "Ancient Wonder / Temple Ruins",
    modernName: "Selçuk, İzmir Province, Turkey",
    coordinates: [27.36389, 37.94972],
    description: "One of the Seven Wonders of the Ancient World, the Temple of Artemis was the great pagan shrine whose cult and lucrative silver-shrine trade form the backdrop to the Ephesian riot in Acts 19:23-41, where the crowd chanted \"Great is Artemis of the Ephesians!\" (Acts 19:28, 19:34) after the silversmith Demetrius accused Paul's preaching of threatening the goddess's worship and his trade. By Paul's time this was the massive Hellenistic-era reconstruction (begun 323 BC), roughly four times the size of the Parthenon. Only a single reconstructed column and scattered foundation stones remain on the site today.",
    archaeology: {
      note: "The temple had at least three major building phases: an 8th-century BC peripteral shrine, the mid-6th-century BC Archaic temple funded by Croesus of Lydia (burned in 356 BC), and the Hellenistic rebuild begun in 323 BC that stood in Paul's day. The site was rediscovered in 1869 by John Turtle Wood in a British Museum-sponsored search; excavations continued to 1874, with further work by David George Hogarth (1904-06) and re-excavations in 1987-88. Little survives above foundation level — most sculptural fragments were removed to the British Museum.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Ephesus%2C_ruins_of_the_Temple_of_Artemis.jpg",
          caption: "Ruins of the Temple of Artemis at Ephesus, with the reconstructed single column marking the site",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ephesus,_ruins_of_the_Temple_of_Artemis.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia: Temple of Artemis", url: "https://en.wikipedia.org/wiki/Temple_of_Artemis" },
      { label: "Bible Gateway: Acts 19", url: "https://www.biblegateway.com/passage/?search=Acts%2019" },
      { label: "Biblical Archaeology Society: Biblical Riot at Ephesus", url: "https://www.biblicalarchaeology.org/daily/biblical-sites-places/biblical-archaeology-places/biblical-riot-at-ephesus/" },
    ],
  },
  {
    id: "great-theatre-ephesus",
    name: "Great Theatre of Ephesus",
    tag: "Ancient Theatre",
    modernName: "Selçuk, İzmir Province, Turkey",
    coordinates: [27.3254604, 37.9415382],
    description: "This roughly 25,000-seat theater, carved into the western slope of Mount Pion (Panayırdağ), is traditionally identified as the site of the Ephesian riot in Acts 19:29, where the crowd \"rushed together into the theatre\" dragging Paul's traveling companions Gaius and Aristarchus after the silversmith Demetrius stirred up opposition to Paul's preaching. Paul himself was restrained by disciples and city officials from entering the theatre (Acts 19:30-31). Built in the Hellenistic period (3rd century BC) under Lysimachus and enlarged under Claudius and Nero, it remains one of the largest surviving ancient theatres in Asia Minor.",
    archaeology: {
      note: "Construction began around 200 BC under Lysimachus's Hellenistic city plan; the cavea and stage building were substantially rebuilt and enlarged in the Roman period, with a two-story stage added under Nero and a third story completed by the mid-2nd century AD. Austrian Archaeological Institute excavations have documented the structure's building phases in detail. The identification of this theatre as the Acts 19 riot site is treated as historically secure by most scholars, since Ephesus had only one large public theatre matching the narrative's description.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/78/Great_Theatre%2C_Ephesus.jpg",
          caption: "The Great Theatre of Ephesus, carved into the slope of Mount Pion",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Great_Theatre,_Ephesus.jpg",
        },
      ],
    },
    sources: [
      { label: "Biblical Archaeology Society: Biblical Riot at Ephesus", url: "https://www.biblicalarchaeology.org/daily/biblical-sites-places/biblical-archaeology-places/biblical-riot-at-ephesus/" },
      { label: "Bible Gateway: Acts 19", url: "https://www.biblegateway.com/passage/?search=Acts%2019" },
      { label: "Turkish Archaeological News: Great Theatre in Ephesus", url: "https://turkisharchaeonews.net/object/great-theatre-ephesus" },
    ],
  },
  {
    id: "grotto-of-st-paul-ephesus",
    name: "Grotto (Cave) of St. Paul, Ephesus",
    tag: "Rock-Cut Chapel",
    modernName: "Bülbüldağ, Selçuk, İzmir Province, Turkey",
    coordinates: [27.329, 37.938],
    description: "A narrow rock-cut chapel on the slope of Bülbüldağ (Nightingale Mountain) above the Great Theatre, venerated since at least the 4th-6th century AD as a place associated with the apostle Paul's time in Ephesus (cf. Acts 19-20; 1 Corinthians 16:8). Its walls preserve the only known ancient depiction of Paul at Ephesus, showing him seated with a book alongside Thecla and her mother Theocleia — a scene drawn from the 2nd-century apocryphal Acts of Paul and Thecla rather than from the canonical New Testament text itself. Coordinates given are approximate — the site is not open to the public and lacks a precisely published GPS location.",
    archaeology: {
      note: "The grotto's principal fresco was uncovered under later plaster layers and dated by Dr. Renate Pillinger (University of Vienna) to the late 5th or early 6th century AD; additional paintings and over 500 graffiti/inscriptions span the 4th through 12th-13th centuries. Because the fresco illustrates the non-canonical Acts of Paul and Thecla rather than an episode from Acts of the Apostles, its NT connection is devotional/traditional rather than a direct excavated confirmation of a specific biblical event. The cave remains closed to the general public to protect the fragile paintings.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Fresco_of_Saint_Paul_at_Ephesus.jpg",
          caption: "Fresco of Saint Paul at the Cave of Saint Paul, Ephesus (late 5th/early 6th century AD)",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Fresco_of_Saint_Paul_at_Ephesus.jpg",
        },
      ],
    },
    sources: [
      { label: "BiblePlaces.com: The Grotto of Saint Paul in Ephesus", url: "https://www.bibleplaces.com/blog/2013/04/the-grotto-of-saint-paul-in-ephesus/" },
      { label: "NASSCAL: Grotto of Saint Paul (Ephesus)", url: "https://www.nasscal.com/materiae-apocryphorum/grotto-of-saint-paul/" },
      { label: "Bible Gateway: 1 Corinthians 16:8", url: "https://www.biblegateway.com/passage/?search=1%20Corinthians%2016%3A8" },
    ],
  },
  {
    id: "church-of-mary-ephesus",
    name: "Church of Mary (Double Church)",
    tag: "Council Basilica",
    modernName: "Ephesus archaeological site, near Selçuk, İzmir Province, Turkey",
    coordinates: [27.33948, 37.94502],
    description: "Built in the early 5th century over an earlier Roman civic hall (the \"Hall of the Muses\") near the harbor of Ephesus, this basilica hosted the Council of Ephesus in AD 431, the third Ecumenical Council, which affirmed Mary as \"Theotokos\" (God-bearer) against Nestorius. It is traditionally called the first church built in Mary's name, later the \"Double Church\" after its western domed hall and eastern basilica were rebuilt in separate phases. The council itself is not narrated in the New Testament, but its central question — the nature of Christ born of Mary — draws directly on passages such as Luke 1:31-35 and John 1:14.",
    archaeology: {
      note: "Austrian Archaeological Institute excavations identified the structure beneath the church as a large late-Roman hall, abandoned in the 3rd century and converted into a church between roughly 400 and 431 — likely finished in time to host the 431 council. Around 500 the building was enlarged into a monumental domed cathedral, whose apse and piers still stand; scholars debate the precise phasing and whether the 431 sessions used the western hall, the eastern basilica, or both. It is one of the few New Testament-era Ephesian sites with a firm, non-legendary historical anchor.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Ephesus_Church_of_Mary_Cross_domed_part_in_2015_2824.jpg",
          caption: "Remains of the cross-domed section of the Church of Mary (Double Church) at Ephesus",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Ephesus_Church_of_Mary_Cross_domed_part_in_2015_2824.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Church of Mary", url: "https://en.wikipedia.org/wiki/Church_of_Mary" },
      { label: "Wikipedia — Council of Ephesus", url: "https://en.wikipedia.org/wiki/Council_of_Ephesus" },
      { label: "Turkish Archaeological News — Church of the Virgin Mary in Ephesus", url: "https://turkisharchaeonews.net/object/church-virgin-mary-ephesus" },
    ],
  },
  {
    id: "house-of-virgin-mary-ephesus",
    name: "House of the Virgin Mary",
    tag: "Modern Pilgrimage Site",
    modernName: "Meryemana, Mt. Koressos, ~7 km from Selçuk, İzmir Province, Turkey",
    coordinates: [27.3342, 37.9117],
    description: "A small stone house on a hillside above Ephesus venerated by Catholic and, separately, Muslim pilgrims as the place where the Virgin Mary lived out her final years under the care of the Apostle John. The tradition rests on John 19:26-27, where the dying Jesus entrusts Mary to John's household, combined with the separately attested tradition that John later ministered in Ephesus. IMPORTANT: this specific house was not identified by archaeology or continuous historical memory — it was located in 1881 by a French priest using descriptions from the 19th-century visions of a German nun, Anne Catherine Emmerich, who never traveled to Turkey.",
    archaeology: {
      note: "The site was pinpointed in 1881 by Abbé Julien Gouyet and confirmed by Lazarist missionaries in 1891, working entirely from visionary descriptions published after Emmerich's death — not from any prior local tradition or excavation trail pointing to this exact structure. Investigators found foundations consistent with a 1st-century building beneath a later chapel, but this only shows a house existed there in antiquity, not that it was Mary's. The Catholic Church has deliberately never ruled on the site's authenticity \"for lack of scientifically acceptable evidence,\" even as it has supported pilgrimage there since Pope Leo XIII in 1896.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Panaya_Kapulu_the_House_of_Virgin_Mary_in_Ephesus.jpg",
          caption: "Panaya Kapulu, the House of the Virgin Mary shrine near Ephesus",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Panaya_Kapulu_the_House_of_Virgin_Mary_in_Ephesus.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — House of the Virgin Mary", url: "https://en.wikipedia.org/wiki/House_of_the_Virgin_Mary" },
      { label: "Turkish Archaeological News — House of the Virgin Mary in Ephesus", url: "https://turkisharchaeonews.net/object/house-virgin-mary-ephesus" },
      { label: "Bible Gateway — John 19:25-27", url: "https://www.biblegateway.com/passage/?search=John%2019%3A25-27" },
    ],
  },
  {
    id: "tomb-of-timothy-ephesus",
    name: "Tomb / Memorial of St. Timothy",
    tag: "Traditional Martyrdom Site",
    modernName: "Panayır Dağı (Mt. Pion), Ephesus archaeological site, near Selçuk, Turkey",
    coordinates: [27.3467, 37.942],
    description: "Timothy, Paul's close companion and the recipient of 1 & 2 Timothy, is honored by tradition as the first bishop of Ephesus, echoing Paul's charge to him to \"remain at Ephesus\" and oversee sound teaching there (1 Timothy 1:3). Later apocryphal tradition holds that around AD 97 the elderly Timothy was mortally beaten by a crowd on Mount Pion while protesting a pagan festival procession, making the hillside his traditional place of martyrdom. His name appears repeatedly in Acts (16:1-3, 19:22) and Paul's letters documenting his long partnership with Paul, including time spent together in Ephesus.",
    archaeology: {
      note: "No tomb, shrine, or inscription for Timothy has ever been excavated on Panayır Dağı. What is historically documented is the later fate of relics venerated as his: sources record they were translated from Ephesus to Constantinople's Church of the Holy Apostles in the 4th century, then reportedly moved to Italy around 1239 and rediscovered at Termoli Cathedral in 1945. This entry represents a traditional/commemorative location tied to a real New Testament figure, not a verified archaeological find.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/52/The_Great_Theatre_in_Ephesus%2C_Turkey.jpg",
          caption: "The Great Theatre of Ephesus, built into the slope of Panayır Dağı (Mount Pion), traditional site of Timothy's martyrdom",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Great_Theatre_in_Ephesus,_Turkey.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Saint Timothy", url: "https://en.wikipedia.org/wiki/Saint_Timothy" },
      { label: "Bible Gateway — 1 Timothy 1:3", url: "https://www.biblegateway.com/passage/?search=1%20Timothy%201%3A3" },
    ],
  },
  {
    id: "theatre-of-miletus",
    name: "Theatre of Miletus",
    tag: "Ancient Theatre",
    modernName: "Balat (Milet), Aydın Province, Turkey",
    coordinates: [27.27837, 37.53023],
    description: "This massive Greco-Roman theatre, seating roughly 15,000, stood at the heart of Miletus when Paul summoned the elders of the Ephesian church to meet him there rather than travel to Ephesus himself, delivering his emotional farewell address before sailing for Jerusalem (Acts 20:17-38). The book of Acts does not name the theatre specifically as the meeting site, but it remains the most prominent surviving structure from the Miletus Paul would have known.",
    archaeology: {
      note: "First excavated in 1873 by French archaeologist Olivier Rayet, with systematic German-led excavations beginning in 1899. The earliest phase of the cavea dates to the Hellenistic period (4th-3rd century BC), with major Roman-era rebuilding under Trajan giving the stage building its three-story, 22-meter-high facade; the structure was later converted into a Byzantine fortress. No inscription or artifact ties the theatre directly to Paul's visit — its NT association is topographical and traditional.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Miletus_-_Ancient_Greek_theatre_02.jpg",
          caption: "The ancient Greek theatre of Miletus, Turkey",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Miletus_-_Ancient_Greek_theatre_02.jpg",
        },
      ],
    },
    sources: [
      { label: "Acts 20:17-38 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2020%3A17-38" },
      { label: "Miletus — Wikipedia", url: "https://en.wikipedia.org/wiki/Miletus" },
      { label: "Miletus Theatre — The Ancient Theatre Archive", url: "https://ancienttheatrearchive.com/theatre/miletus/" },
    ],
  },
  {
    id: "well-of-st-paul-tarsus",
    name: "Well of St. Paul, Tarsus",
    tag: "Traditional Site",
    modernName: "Kızılmurat neighborhood, Tarsus, Mersin Province, Turkey",
    coordinates: [34.89361, 36.91917],
    description: "Paul described himself as \"a Jew, born in Tarsus of Cilicia\" (Acts 22:3), and this stone-lined well — roughly 38 meters deep — sits in a courtyard local tradition identifies as the site of Paul's family home. The well itself dates archaeologically to the Roman period, consistent with Paul's lifetime, but its specific identification as Paul's birthplace is a long-standing pilgrimage tradition rather than a verified excavation finding.",
    archaeology: {
      note: "The well and surrounding house ruins were uncovered during a rescue excavation in 1999, revealing Roman, Byzantine, and Ottoman-period occupation layers at the site. It is jointly listed with the nearby Saint Paul's Church on Turkey's UNESCO World Heritage Tentative List. Scholars are honest that while the well's Roman-era date fits the traditional story, the association with Paul's actual household is tradition passed down through local Christian veneration rather than something archaeology can independently confirm.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/7c/St_Paul_well%2C_Tarsus.jpg",
          caption: "St. Paul's Well in Tarsus, Mersin Province, Turkey",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:St_Paul_well,_Tarsus.jpg",
        },
      ],
    },
    sources: [
      { label: "Acts 22:3 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2022%3A3" },
      { label: "Saint Paul's Well — Wikipedia", url: "https://en.wikipedia.org/wiki/Saint_Paul's_Well" },
    ],
  },
  {
    id: "sardis-synagogue",
    name: "Sardis Synagogue",
    tag: "Religious Site",
    modernName: "Sart, Salihli, Manisa Province, Turkey",
    coordinates: [28.04028, 38.48833],
    description: "This vast synagogue — the largest known from the ancient world, with a main hall over 50 meters long that could hold nearly 1,000 worshippers — was part of the same Jewish community that formed the backdrop to Christ's letter to the church in Sardis, which rebukes the congregation for being spiritually \"dead\" despite its reputation (Revelation 3:1-6). While the surviving structure was renovated into its grand basilical form in the late 3rd-4th century AD (after the NT period), it stands on a site occupied by Sardis's Jewish community for centuries before, including in the 1st century.",
    archaeology: {
      note: "Discovered in 1962 during Harvard-Cornell excavations led by George Hanfmann and Henry Detweiler, the synagogue occupies a wing of the city's bath-gymnasium complex. Excavation has yielded over 80 Greek and 7 Hebrew inscriptions and roughly 1,400 square meters of mosaic flooring, with donor inscriptions showing some congregants held civic titles — evidence the Jewish community was highly integrated into Roman civic life. Excavations at Sardis continue annually.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f5/Sardis_Synagogue%2C_late_3rd_century_AD%2C_Sardis%2C_Lydia%2C_Turkey_%2819331773400%29.jpg",
          caption: "Sardis Synagogue, late 3rd century AD, Sardis, Lydia, Turkey",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Sardis_Synagogue,_late_3rd_century_AD,_Sardis,_Lydia,_Turkey_(19331773400).jpg",
        },
      ],
    },
    sources: [
      { label: "Revelation 3:1-6 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Revelation%203%3A1-6" },
      { label: "Sardis Synagogue — Wikipedia", url: "https://en.wikipedia.org/wiki/Sardis_Synagogue" },
    ],
  },
  {
    id: "martyrdom-site-polycarp-smyrna",
    name: "Martyrdom Site of Polycarp, Smyrna",
    tag: "Historical Site",
    modernName: "İzmir, Turkey",
    coordinates: [27.1456, 38.4141],
    description: "Polycarp, bishop of Smyrna and a disciple of the Apostle John, was burned and then stabbed to death in this city's Roman stadium around AD 155-156, according to the Martyrdom of Polycarp, one of the earliest and most detailed martyrdom accounts outside the New Testament. Smyrna is one of the seven churches addressed in Revelation 2:8-11, where the risen Christ warns the congregation of coming tribulation and promises \"the crown of life\" to those faithful unto death — words later Christians read as a direct foreshadowing of Polycarp's fate.",
    archaeology: {
      note: "The Roman stadium of Smyrna stood on the southwest slope of Mount Pagos (modern Kadifekale) but was progressively dismantled, most severely by an Ottoman vizier in 1675, and is now entirely built over by the modern city; no visible remains survive. Its approximate location is established from 19th- and early 20th-century travelers' accounts and old maps rather than modern excavation.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Izmir_panorama_from_Kadifekale.jpg",
          caption: "View from Kadifekale (ancient Mount Pagos), overlooking the slope where the Roman stadium of Smyrna once stood",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Izmir_panorama_from_Kadifekale.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Polycarp", url: "https://en.wikipedia.org/wiki/Polycarp" },
      { label: "Wikipedia — Martyrdom of Polycarp", url: "https://en.wikipedia.org/wiki/Martyrdom_of_Polycarp" },
    ],
  },
  {
    id: "nicaea-council-site",
    name: "Council of Nicaea Site",
    tag: "Historical Site",
    modernName: "İznik, Turkey",
    coordinates: [29.7211, 40.4286],
    description: "In AD 325, Emperor Constantine I convened the First Ecumenical Council in the city of Nicaea, gathering roughly 250-318 bishops from across the Christian world to resolve the Arian controversy over the nature of Christ. The council produced the original Nicene Creed, the first empire-wide doctrinal statement of the Christian church, and addressed the dating of Easter and other matters of church order.",
    archaeology: {
      note: "The council almost certainly met in an imperial palace complex whose precise location within ancient Nicaea has not been definitively excavated. In 2014, archaeologists discovered a submerged late-4th/early-5th-century basilica in Lake İznik; some scholars have proposed it was built to commemorate the council, but this connection remains speculative. The Hagia Sophia standing in İznik's town center today was rebuilt after the 1065 earthquake atop an earlier basilica and hosted the Second Council of Nicaea in 787 — a related but distinct site.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/09/Iznik_Hagia_Sophia_Mosque_october_2018_8065.jpg",
          caption: "Hagia Sophia in İznik (ancient Nicaea), standing on the site of an earlier basilica in the city center",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Iznik_Hagia_Sophia_Mosque_october_2018_8065.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — First Council of Nicaea", url: "https://en.wikipedia.org/wiki/First_Council_of_Nicaea" },
      { label: "Britannica — Council of Nicaea", url: "https://www.britannica.com/event/Council-of-Nicaea-325" },
    ],
  },
  {
    id: "cave-church-st-peter-antioch",
    name: "Cave Church of St. Peter",
    tag: "Religious Site",
    modernName: "Antakya, Hatay Province, Turkey",
    coordinates: [36.1782, 36.2094],
    description: "According to long-standing local tradition, this rock-cut cave on the slope of Mount Starius (Habib-i Neccar Mountain) was used as a meeting and worship place by the earliest Christian community of Antioch, the city where \"the disciples were first called Christians\" (Acts 11:26). Antioch was the base from which Paul and Barnabas launched their missionary journeys (Acts 13:1-3) and a leading center of the early church alongside Jerusalem and Rome.",
    archaeology: {
      note: "The cave itself is a natural/rock-cut grotto with a rear tunnel traditionally said to have served as an escape route during persecution; none of this can be independently dated to the apostolic era, and the identification with Peter rests on tradition rather than excavation. The structure's visible façade was built by Crusaders during their occupation of Antioch (1098-1268) and substantially rebuilt in 1863 under Capuchin friars. The site suffered damage in the February 2023 earthquakes.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/73/Antakya_-_Chiesa_di_S._Pietro_-_panoramio.jpg",
          caption: "The Cave Church of St. Peter, Antakya, with its Crusader-era façade",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Antakya_-_Chiesa_di_S._Pietro_-_panoramio.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Church of Saint Peter (Antakya)", url: "https://en.wikipedia.org/wiki/Church_of_Saint_Peter" },
      { label: "Acts 11:26 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2011%3A26" },
    ],
  },
  {
    id: "mamertine-prison-rome",
    name: "Mamertine Prison",
    tag: "Historical Site",
    modernName: "Rome, Italy",
    coordinates: [12.4853, 41.8925],
    description: "Known in antiquity as the Tullianum or Carcer, the Mamertine Prison at the foot of the Capitoline Hill was ancient Rome's principal state prison, used for detaining and executing enemies of Rome. Christian tradition, though not attested in the New Testament itself, holds that both Peter and Paul were held here in the final days before their martyrdoms under Nero in the 60s AD.",
    archaeology: {
      note: "The lower chamber is a genuinely ancient structure, with masonry dated by archaeologists to as early as the 7th-6th century BC, making it one of the oldest structures in Rome; a natural spring inside it is central to the later legend that Peter used its water to baptize fellow prisoners. There is no first-century documentary or archaeological evidence specifically placing Peter or Paul in this cell — the association is a devotional tradition first attested centuries after the apostolic period.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/95/San_Giuseppe_dei_Falegnami_%28Roma%29_-_Facciata_%28Mamertinum%29.jpg",
          caption: "Façade of San Giuseppe dei Falegnami, built above the ancient Mamertine Prison (Tullianum)",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:San_Giuseppe_dei_Falegnami_(Roma)_-_Facciata_(Mamertinum).jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Mamertine Prison", url: "https://en.wikipedia.org/wiki/Mamertine_Prison" },
      { label: "BiblePlaces.com — Mamertine Prison", url: "https://www.bibleplaces.com/mamertine-prison/" },
    ],
  },
  {
    id: "basilica-st-paul-outside-walls-rome",
    name: "Basilica of St. Paul Outside the Walls",
    tag: "Religious Site",
    modernName: "Rome, Italy",
    coordinates: [12.4767, 41.8581],
    description: "This basilica stands on the traditional burial site of the Apostle Paul, martyred in Rome under Nero around AD 64-67. First built by Constantine in the 4th century over an earlier funerary monument, greatly enlarged under Theodosius I, the basilica has been venerated as Paul's tomb continuously since antiquity, making it one of the four papal major basilicas of Rome.",
    archaeology: {
      note: "A Vatican-sponsored excavation conducted between 2002 and 2006 uncovered an intact white marble sarcophagus directly beneath the high altar, inscribed \"Paulo Apostolo Mart\" (\"to Paul, apostle and martyr\"). The sarcophagus has been dated to at least the late 4th century, consistent with Constantine's original shrine. In 2009, Pope Benedict XVI announced that a probe inserted into the sarcophagus had detected bone fragments carbon-dated to the 1st or 2nd century — findings consistent with, but not proof of, the traditional identification of the remains as Paul's.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Basilica_Papale_San_Paolo_fuori_le_Mura.jpg",
          caption: "Basilica of St. Paul Outside the Walls, Rome",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Basilica_Papale_San_Paolo_fuori_le_Mura.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Basilica of Saint Paul Outside the Walls", url: "https://en.wikipedia.org/wiki/Basilica_of_Saint_Paul_Outside_the_Walls" },
      { label: "Basilica Papale di San Paolo Fuori le Mura — The Tomb", url: "https://basilicasanpaolo.org/en/tomb/" },
    ],
  },
  {
    id: "circus-of-nero-rome",
    name: "Circus of Nero / Vatican Hill",
    tag: "Historical Site",
    modernName: "Vatican City / Rome, Italy",
    coordinates: [12.4539, 41.9022],
    description: "Built by Caligula and expanded by Nero in the gardens on the Vatican Hill, this circus was the site of Rome's first state-sponsored, mass persecution of Christians. After the Great Fire of Rome in AD 64, the historian Tacitus records that Nero, to deflect blame from himself, had Christians arrested and executed here in brutal spectacles (Annals 15.44). Tradition holds that the Apostle Peter was martyred, reportedly crucified upside down, on or near this site around AD 64-67.",
    archaeology: {
      note: "Tacitus's account of the persecution is considered strong, near-contemporary historical evidence, but no archaeological remains of the circus's superstructure survive above ground today — it lay in the area now occupied by St. Peter's Square and the southern flank of the basilica. The Egyptian granite obelisk that stood in the circus's spina survives and was relocated by Pope Sixtus V in 1586 to the center of St. Peter's Square.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/df/The_Vatican_obelisk_at_St._Peter%27s_Square.jpg",
          caption: "The Vatican obelisk in St. Peter's Square, originally the central spina marker of Nero's Circus",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Vatican_obelisk_at_St._Peter's_Square.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Circus of Nero", url: "https://en.wikipedia.org/wiki/Circus_of_Nero" },
      { label: "Wikipedia — Great Fire of Rome", url: "https://en.wikipedia.org/wiki/Great_Fire_of_Rome" },
    ],
  },
  {
    id: "vatican-necropolis-rome",
    name: "Vatican Necropolis",
    tag: "Catacomb",
    modernName: "Vatican City",
    coordinates: [12.4533, 41.9023],
    description: "Beneath St. Peter's Basilica lies a Roman-era necropolis dating to the 1st-4th centuries AD, at the center of which a small 2nd-century shrine (\"the Trophy of Gaius\") was long venerated as marking the burial place of the Apostle Peter. Constantine chose to build the original St. Peter's Basilica directly over this shrine in the 4th century, despite the enormous engineering effort of leveling the hillside cemetery — a choice widely read as evidence of the site's early and firmly held significance to Roman Christians.",
    archaeology: {
      note: "Systematic excavations were carried out beneath the basilica from 1940 to 1949 under Pope Pius XII's direction. In 1950 Pius XII announced that Peter's tomb had probably been found but that identifiable bones could not be confirmed. Further work led Pope Paul VI to announce in 1968 that bones recovered from a repository near the shrine — belonging to a robustly built male around 60-70 years old — were, in the Vatican investigators' judgment, likely Peter's. The identification remains debated among scholars, as the bones were moved between locations during the dig.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Vatican_Necropolis_01.jpg",
          caption: "Mausoleum street in the Vatican Necropolis, excavated beneath St. Peter's Basilica",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Vatican_Necropolis_01.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Vatican Necropolis", url: "https://en.wikipedia.org/wiki/Vatican_Necropolis" },
      { label: "Wikipedia — Saint Peter's tomb", url: "https://en.wikipedia.org/wiki/Saint_Peter%27s_tomb" },
    ],
  },
  {
    id: "catacombs-of-priscilla-rome",
    name: "Catacombs of Priscilla",
    tag: "Catacomb",
    modernName: "Rome, Italy (Via Salaria)",
    coordinates: [12.5087, 41.9297],
    description: "One of the oldest Christian catacombs in Rome, the Catacomb of Priscilla began as a set of underground quarries and burial chambers along the Via Salaria, likely on the estate of a Christian noble family, and grew into a vast Christian cemetery used from the late 2nd century onward. Several early popes and many martyrs were buried here, earning it the title \"Regina Catacumbarum\" (\"Queen of the Catacombs\").",
    archaeology: {
      note: "The catacomb's Greek Chapel preserves 3rd-century frescoes generally interpreted as Old and New Testament scenes, including a fresco of the \"fractio panis\" (breaking of bread) widely read as an early eucharistic image. A separate fresco, dated by most scholars to the mid-to-late 3rd century, depicts a seated woman nursing an infant beside a robed male figure pointing to a star, and is frequently identified as the earliest surviving image of the Virgin Mary and Christ child — though this identification is debated among art historians.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Madonna_catacomb.jpg",
          caption: "Fresco in the Catacomb of Priscilla often identified as the earliest known image of the Virgin Mary and Christ child",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Madonna_catacomb.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Catacomb of Priscilla", url: "https://en.wikipedia.org/wiki/Catacomb_of_Priscilla" },
      { label: "Turismo Roma — The Catacombs of Priscilla", url: "https://www.turismoroma.it/en/places/catacombs-priscilla" },
    ],
  },
  {
    id: "catacombs-of-callixtus-rome",
    name: "Catacombs of San Callisto (Callixtus)",
    tag: "Catacomb",
    modernName: "Rome, Italy (Via Appia Antica)",
    coordinates: [12.5106, 41.8586],
    description: "The largest of Rome's underground Christian cemeteries, the Catacomb of Callixtus became the official burial ground of the Roman church in the early 3rd century, after Pope Zephyrinus placed the future Pope Callixtus I, then a deacon, in charge of enlarging and administering it. Its \"Crypt of the Popes\" became the principal burial chamber for the bishops of Rome for much of the 3rd century, reflecting the young church's growing institutional organization within a generation or two of the last apostles.",
    archaeology: {
      note: "Excavation and identification of the site is credited to the 19th-century archaeologist Giovanni Battista de Rossi, who in 1854 rediscovered the long-lost Crypt of the Popes and confirmed, through inscriptions, the burial there of nine popes and several bishops who served between roughly AD 230 and 283. The catacomb complex spans four levels and roughly 15-20 kilometers of galleries. Relics were largely translated to churches within the city walls by the 9th century, after which the catacombs were abandoned until de Rossi's rediscovery.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/92/Catacombe_di_san_callisto%2C_ingresso.jpg",
          caption: "Entrance to the Catacombs of San Callisto on the Via Appia Antica",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Catacombe_di_san_callisto,_ingresso.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Catacomb of Callixtus", url: "https://en.wikipedia.org/wiki/Catacomb_of_Callixtus" },
      { label: "Catacombe di San Callisto — Official site", url: "https://www.catacombesancallisto.it/en/le-origini-delle-catacombe.php" },
    ],
  },
  {
    id: "appian-way-quo-vadis-rome",
    name: "Appian Way / Church of Quo Vadis",
    tag: "Ancient Roman Road / Legendary Site",
    modernName: "Via Appia Antica, Rome, Italy",
    coordinates: [12.521, 41.8459],
    description: "The Via Appia (Appian Way), begun in 312 BC by censor Appius Claudius Caecus, was ancient Rome's principal highway south. About 800m outside Porta San Sebastiano stands the small Church of Domine Quo Vadis, built on the spot where later Christian tradition, drawn from the apocryphal Acts of Peter, holds that the Apostle Peter, fleeing Rome to escape persecution, encountered a vision of the risen Christ. Peter reportedly asked \"Domine, quo vadis?\" (\"Lord, where are you going?\"), and Christ answered that he was going to Rome to be crucified again — prompting Peter's shamed return to the city and eventual martyrdom.",
    archaeology: {
      note: "The Appian Way itself is extensively excavated and preserved, forming the Appia Antica Archaeological Park; in July 2024 the road was inscribed as a UNESCO World Heritage Site. The Quo Vadis legend, by contrast, is not attested in the New Testament and rests solely on the apocryphal Acts of Peter — scholars regard it as pious legend, not history. The current chapel dates only to 1637, though a sanctuary has stood on the site since at least the 9th century.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Appian_Way.jpg",
          caption: "The ancient paving stones of the Appian Way (Via Appia Antica) near Rome",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Appian_Way.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Domine_quo_vadis_%28Santa_Maria_in_Palmis%29_-_esterno.jpg",
          caption: "Exterior of the Church of Domine Quo Vadis (Santa Maria in Palmis) on the Appian Way",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Domine_quo_vadis_(Santa_Maria_in_Palmis)_-_esterno.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Appian Way", url: "https://en.wikipedia.org/wiki/Appian_Way" },
      { label: "Wikipedia — Domine, quo vadis?", url: "https://en.wikipedia.org/wiki/Domine,_quo_vadis%3F" },
      { label: "UNESCO World Heritage Centre — Via Appia. Regina Viarum", url: "https://whc.unesco.org/en/list/1708/" },
    ],
  },
  {
    id: "forum-of-appius-three-taverns",
    name: "Forum of Appius & Three Taverns",
    tag: "Waypoints on the Appian Way",
    modernName: "Near Borgo Faiti / Cisterna di Latina, Lazio, Italy",
    coordinates: [13.07, 41.53],
    description: "These were two Roman waystations on the Via Appia south of Rome — Forum Appii roughly 43 Roman miles from Rome, Three Taverns about 10 miles closer. Acts 28:15 records that when believers in Rome heard Paul was approaching, they traveled out to meet him at these two points; seeing them, Paul \"thanked God and took courage.\"",
    archaeology: {
      note: "There are no specific, pinpointed excavated ruins definitively marking either site today — this is a general regional identification only. Forum Appii is placed near modern Borgo Faiti in the reclaimed Pontine Marshes, with only scattered traces surviving. Three Taverns' exact location is even less certain. Both sites are attested by classical writers (Cicero, Horace) as established stopping points, but modern coordinates for either are approximate.",
      photos: [],
    },
    sources: [
      { label: "Acts 28:15 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2028%3A15" },
      { label: "BibleHub — Acts 28:15", url: "https://biblehub.com/acts/28-15.htm" },
    ],
  },
  {
    id: "rhegium",
    name: "Rhegium",
    tag: "Ancient Port City",
    modernName: "Reggio Calabria, Calabria, Italy",
    coordinates: [15.65, 38.1147],
    description: "Rhegium, founded c. 720 BC by Greek colonists from Chalcis, sat on the Strait of Messina opposite Sicily. Acts 28:13 records it as a stop on Paul's voyage to Rome as a prisoner: after three days in Syracuse, the ship \"weighed anchor and came to Rhegium,\" waiting there for a favorable south wind before sailing to Puteoli.",
    archaeology: {
      note: "Rhegium's Greek origins are well documented archaeologically — remains of the Hippodamian grid city plan, fragments of ancient Greek walls, an acropolis, and Roman-era baths have been excavated in the city center; finds are housed in the Museo Nazionale della Magna Grecia. There is no specific excavated site tied to Paul's brief stopover — Acts records only a short layover awaiting wind.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/7/76/Reggio_calabria_mura_greche_lungomare.jpg",
          caption: "Remains of the ancient Greek walls of Rhegium along the Lungomare Falcomatà, Reggio Calabria",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Reggio_calabria_mura_greche_lungomare.jpg",
        },
      ],
    },
    sources: [
      { label: "Acts 28:13 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2028%3A13" },
      { label: "BiblePlaces.com — Rhegium", url: "https://www.bibleplaces.com/rhegium/" },
    ],
  },
  {
    id: "syracuse",
    name: "Syracuse",
    tag: "Ancient Greek/Roman City",
    modernName: "Syracuse (Siracusa), Sicily, Italy",
    coordinates: [15.2866, 37.0755],
    description: "Founded by Corinthian settlers in 733 BC, Syracuse became one of the greatest cities of Magna Graecia. Acts 28:12 records that the ship carrying Paul to Rome, after leaving Malta, \"put in at Syracuse, and stayed there three days\" before continuing toward Rhegium and Puteoli.",
    archaeology: {
      note: "Syracuse is one of the best-preserved ancient cities in the Mediterranean, containing the 5th-century BC Greek Theatre, a Roman amphitheater, the Latomie quarries, and remains on the island of Ortigia. The site is UNESCO-listed. No specific ruin is tied to Paul's three-day stop — the biblical account records only a brief stopover.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/06/Teatro_greco_di_Siracusa_-_aerea.jpg",
          caption: "Aerial view of the ancient Greek Theatre of Syracuse, in the Neapolis Archaeological Park",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Teatro_greco_di_Siracusa_-_aerea.jpg",
        },
      ],
    },
    sources: [
      { label: "Acts 28:12 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2028%3A12" },
      { label: "UNESCO World Heritage Centre — Syracuse", url: "https://whc.unesco.org/en/list/1200/" },
    ],
  },
  {
    id: "neapolis-philippi-port",
    name: "Neapolis (Philippi's Port)",
    tag: "Ancient Port",
    modernName: "Kavala, Greece",
    coordinates: [24.4, 40.933],
    description: "Neapolis was the harbor town where Paul, Silas, Timothy, and Luke landed after sailing from Troas via Samothrace — the first recorded step of the gospel onto European soil (Acts 16:11-12). From this port they walked roughly 10 miles inland along the Via Egnatia to Philippi.",
    archaeology: {
      note: "Founded in the late 7th century BC as a colony of Thasos, Neapolis kept its own identity and coinage before becoming Kavala. Because the modern city continuously occupies the same peninsula, excavation of the 1st-century port is limited; visible remains include a Roman-era aqueduct, acropolis/castle fortifications, and Ionic temple fragments in the Archaeological Museum of Kavala. The Kavala/Neapolis identification is not seriously disputed.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Kavala-Aqueduct.jpg",
          caption: "The Roman-era aqueduct in Kavala, ancient Neapolis, Paul's landing port into Europe",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Kavala-Aqueduct.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia: Kavala", url: "https://en.wikipedia.org/wiki/Kavala" },
      { label: "Acts 16:11 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2016%3A11" },
    ],
  },
  {
    id: "amphipolis",
    name: "Amphipolis",
    tag: "Ancient City",
    modernName: "Amfipoli, Serres, Greece",
    coordinates: [23.84, 40.818],
    description: "Amphipolis was a major Macedonian city on the Via Egnatia that Paul, Silas, and Timothy passed through — without stopping to preach — on their way from Philippi to Thessalonica (Acts 17:1), likely because it had no synagogue.",
    archaeology: {
      note: "Founded as an Athenian colony in 437 BC, later Macedonian and then a Roman provincial capital. Post-WWII excavations uncovered city walls, a necropolis, basilicas, and the acropolis. The famous Lion of Amphipolis (a 4th-century BC tomb monument, reassembled in 1937) and the separately excavated, much-debated Kasta Tomb mound are the site's best-known features.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Lion_of_Amphipolis_BW_2017-10-05_09-38-25.jpg",
          caption: "The Lion of Amphipolis, a 4th-century BC tomb monument reconstructed in 1937",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Lion_of_Amphipolis_BW_2017-10-05_09-38-25.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia: Amphipolis", url: "https://en.wikipedia.org/wiki/Amphipolis" },
      { label: "Acts 17:1 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2017%3A1" },
    ],
  },
  {
    id: "apollonia-macedonia",
    name: "Apollonia",
    tag: "Traditional Site (Location Uncertain)",
    modernName: "Near Nea Apollonia, Thessaloniki region, Greece",
    coordinates: [23.4697, 40.6237],
    description: "Apollonia was the second waypoint Paul, Silas, and Timothy passed through between Philippi and Thessalonica (Acts 17:1), again without stopping to preach. No other New Testament passage mentions Apollonia.",
    archaeology: {
      note: "The exact site Luke meant is not certain among scholars. Ancient itineraries place a Via Egnatia station named Apollonia between Amphipolis and Thessalonica; most modern atlases associate it with a site near modern Nea Apollonia, based mainly on itinerary distances rather than definitive inscriptional proof. No major ruins are open to visitors today, and the village's \"Bema of the Apostle Paul\" monument is a modern marker, not an ancient structure.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/58/Apollonia_%28Thessaloniki%29_Bema_of_Apostle_Paul_1.JPG",
          caption: "Modern commemorative \"Bema of the Apostle Paul\" monument at Nea Apollonia",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Apollonia_(Thessaloniki)_Bema_of_Apostle_Paul_1.JPG",
        },
      ],
    },
    sources: [
      { label: "Wikipedia: Apollonia (Mygdonia)", url: "https://en.wikipedia.org/wiki/Apollonia_(Mygdonia)" },
      { label: "Acts 17:1 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2017%3A1" },
    ],
  },
  {
    id: "st-pauls-bay-malta",
    name: "St. Paul's Bay",
    tag: "Traditional Site",
    modernName: "San Pawl il-Baħar, Malta",
    coordinates: [14.4017, 35.9483],
    description: "St. Paul's Bay is the traditional site where the ship carrying Paul as a prisoner ran aground during a storm, after which he and all 276 aboard reached shore safely (Acts 27:39-28:1). Paul then spent three months on Malta, surviving a viper bite and healing Publius's father (Acts 28:1-10).",
    archaeology: {
      note: "The identification with this bay has been local tradition for roughly 500 years, but no archaeological evidence — wreck timbers, anchors, or 1st-century artifacts tied specifically to the event — has ever been confirmed here despite searching. Some researchers argue the geography in Acts fits other locations better, such as St. Thomas Bay, making this a genuinely open question. A statue of St. Paul was erected on the small island at the bay's mouth (Selmunett) in 1845.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Malta_-_St._Paul_Islands_-_St._Paul_statue.jpg",
          caption: "The statue of St. Paul on St. Paul's Island (Selmunett), at the mouth of St. Paul's Bay, Malta",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Malta_-_St._Paul_Islands_-_St._Paul_statue.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia: St. Paul's Bay", url: "https://en.wikipedia.org/wiki/St._Paul's_Bay" },
      { label: "Acts 27:39-28:10 — Bible Gateway", url: "https://www.biblegateway.com/passage/?search=Acts%2027%3A39-28%3A10" },
    ],
  },
  {
    id: "megiddo-church",
    name: "Megiddo Church (Christian Prayer Hall)",
    tag: "Early Christian Prayer Hall",
    modernName: "Megiddo Prison, near Tel Megiddo, Israel",
    coordinates: [35.191306, 32.571167],
    description: "In 2005, prisoners doing salvage excavation ahead of a Megiddo Prison expansion (at ancient Kfar Othnay/Legio) uncovered the floor of one of the world's oldest known Christian prayer halls, dated to roughly AD 230. A mosaic bears a Greek inscription stating that \"the God-loving Akeptous has offered the table to God Jesus Christ as a memorial\" — one of the earliest surviving inscriptions to explicitly call Jesus \"God,\" predating Constantine's legalization of Christianity by nearly a century.",
    archaeology: {
      note: "Excavated in 2005 by Yotam Tepper (Tel Aviv University/Israel Antiquities Authority). The c. 230 AD date rests on associated pottery, coins, and lettering style; the room appears deliberately covered around 305 AD, plausibly to hide it during the Diocletianic persecution. Some scholars argue the structure may be a later conversion of an earlier building rather than purpose-built — the early date is well-supported but not universally uncontested.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/0/08/Akeptous_Inscription_2.jpg",
          caption: "The Akeptous mosaic inscription at Megiddo, dedicating a table \"to God Jesus Christ as a memorial\"",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Akeptous_Inscription_2.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Megiddo church (Israel)", url: "https://en.wikipedia.org/wiki/Megiddo_church_(Israel)" },
      { label: "Biblical Archaeology Society — The Megiddo Mosaic", url: "https://www.biblicalarchaeology.org/exhibits-events/the-megiddo-mosaic/" },
    ],
  },
  {
    id: "dura-europos-house-church",
    name: "Dura-Europos House Church",
    tag: "Earliest Known Christian House-Church",
    modernName: "Dura-Europos (Salhiyé), near Deir ez-Zor, Syria",
    coordinates: [40.727958, 34.745829],
    description: "An ordinary Roman-era house at the frontier city of Dura-Europos was converted around AD 240/241 into a dedicated Christian meeting place (domus ecclesiae) with a small baptistery — the earliest archaeologically identified Christian building anywhere, predating Constantine's legalization of Christianity by nearly a century. The baptistery's wall paintings, including the Good Shepherd and Christ walking on water, are the oldest surviving depictions of Jesus Christ yet found.",
    archaeology: {
      note: "Excavated in 1931-1932 by a joint French-Yale team led by Clark Hopkins and Michael Rostovtzeff. The city was abandoned after a Persian siege in AD 256 and buried under a Roman defensive earthen ramp, which inadvertently preserved the building. The wall paintings and font were removed to Yale, where the reconstructed baptistery is displayed at the Yale University Art Gallery; the original site in Syria has suffered looting and conflict-related damage during the Syrian Civil War.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/4/4d/Dura_Europos_baptistry_overview.jpg",
          caption: "The Dura-Europos baptistery as reconstructed at Yale University",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Dura_Europos_baptistry_overview.jpg",
        },
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/a/aa/Dura_Europos_Baptistry_Good_Shepherd.jpg",
          caption: "Wall painting of the Good Shepherd with Adam and Eve, from the Dura-Europos baptistery",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Dura_Europos_Baptistry_Good_Shepherd.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Dura-Europos church", url: "https://en.wikipedia.org/wiki/Dura-Europos_church" },
      { label: "Biblical Archaeology Society — Dura-Europos House Church", url: "https://www.biblicalarchaeology.org/daily/ancient-cultures/ancient-rome/dura-europos-house-church/" },
    ],
  },
  {
    id: "eutychus-site-troas",
    name: "Traditional Site of Eutychus's Fall",
    tag: "Narrative Site — General Region",
    modernName: "Ruins of Alexandria Troas, near Dalyan/Ezine, Çanakkale Province, Turkey",
    coordinates: [26.15861, 39.75167],
    description: "Acts 20:7-12 recounts that during Paul's farewell visit to Troas, a young man named Eutychus fell asleep during Paul's long, late-night sermon, fell from a third-story window, and was found apparently dead — after which Paul embraced him and he was restored. The text places the event in an upper room of a house in Troas, but no specific building has ever been identified. This entry marks the broad site of ancient Alexandria Troas, not any pinpointed structure.",
    archaeology: {
      note: "Alexandria Troas was a major Roman-era port city; its ruins today include a bath complex, an odeon, a theatre, a gymnasium, and a stadium uncovered by German-led excavations in the early 2000s. No archaeological work has identified a specific house or \"upper room\" connected to the Eutychus narrative — the biblical account gives no address-level detail.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/The_Roman_Harbour_of_Alexandria_Troas%2C_built_in_the_reign_of_Augustus_and_consisting_of_an_outer_basin_protected_by_two_breakwaters_and_an_inner_basin%2C_Troad%2C_Turkey_-_52985177481.jpg",
          caption: "The Roman-era harbor of Alexandria Troas, built under Augustus, in the Troad region of modern Turkey",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Roman_Harbour_of_Alexandria_Troas,_built_in_the_reign_of_Augustus_and_consisting_of_an_outer_basin_protected_by_two_breakwaters_and_an_inner_basin,_Troad,_Turkey_-_52985177481.jpg",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Alexandria Troas", url: "https://en.wikipedia.org/wiki/Alexandria_Troas" },
      { label: "Bible Gateway — Acts 20:7-12", url: "https://www.biblegateway.com/passage/?search=Acts%2020%3A7-12" },
    ],
  },
  {
    id: "chalcedon-council-site",
    name: "Council of Chalcedon Site",
    tag: "Ecumenical Council Site",
    modernName: "Kadıköy (ancient Chalcedon), Istanbul, Turkey",
    coordinates: [29.0186, 40.9962],
    description: "The Fourth Ecumenical Council convened at Chalcedon October 8-November 1, AD 451, meeting in the Church of St. Euphemia, across the Bosphorus from Constantinople. The council produced the Chalcedonian Definition, affirming Christ \"in two natures\" (fully God, fully man) united in one person — accepted by Rome, Byzantium, and most churches, but rejected by the Oriental Orthodox churches, a split persisting today.",
    archaeology: {
      note: "No physical remains of the Church of St. Euphemia survive above ground; historians generally place its foundations near the Haydarpaşa railway station complex on the Kadıköy waterfront, inferred from historical topography rather than confirmed excavation. Chalcedon's urban fabric has been almost entirely built over by modern Istanbul, so this entry marks the traditional, historically-attested area rather than an excavated council chamber.",
      photos: [
        {
          url: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Haydarpasa_1470090_Nevit.JPG",
          caption: "Haydarpaşa railway station in Kadıköy, Istanbul, near the traditional site of the Church of St. Euphemia",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Haydarpasa_1470090_Nevit.JPG",
        },
      ],
    },
    sources: [
      { label: "Wikipedia — Council of Chalcedon", url: "https://en.wikipedia.org/wiki/Council_of_Chalcedon" },
      { label: "New Advent Catholic Encyclopedia — Council of Chalcedon", url: "https://www.newadvent.org/cathen/03555a.htm" },
    ],
  },
];
