import type { Person } from "./types";

/** New Testament people with a real story — linked from Bible text, opened in the Details panel
 * alongside locations and points of interest. Article depth follows `tier`. */
export const people: Person[] = [
  {
    id: "simon-peter",
    name: "Simon Peter",
    pronunciation: "SIGH-mun PEE-ter",
    alternateNames: ["Peter", "Simon", "Cephas"],
    tier: "major",
    role: "Apostle",
    summary:
      "A Galilean fisherman who became the most prominent of Jesus's twelve apostles and, after Jesus's death, the early church's leading voice in Jerusalem.",
    lifeStory: [
      "Peter was born Simon, son of John (or Jonah), and worked as a fisherman on the Sea of Galilee alongside his brother Andrew, in partnership with James and John, the sons of Zebedee. Jesus called the two brothers while they were casting their nets, telling them he would make them \"fishers of men,\" and Peter left his boats to follow him (Matthew 4:18-20).",
      "Within the Gospels, Peter consistently appears first among the twelve apostles and often speaks or acts on their behalf. At Caesarea Philippi he was the one who declared Jesus to be \"the Christ, the Son of the living God,\" a confession Jesus called a revelation from God the Father, and on which he said he would build his church (Matthew 16:13-19) — the origin of Peter's name, which means \"rock.\" He was present with James and John at the Transfiguration and in Gethsemane, and it was Peter who struck the ear off the high priest's servant Malchus when Jesus was arrested (John 18:10).",
      "That same night, exactly as Jesus predicted, Peter denied three times that he knew Jesus, then wept bitterly when he realized what he had done (Luke 22:54-62). After the resurrection, Jesus restored him personally, three times asking \"Do you love me?\" and each time commissioning him to \"feed my sheep\" (John 21:15-17).",
      "In Acts, Peter becomes the early church's leading figure in Jerusalem: he preaches the first public sermon at Pentecost, resulting in about three thousand converts (Acts 2), heals a man lame from birth at the temple gate (Acts 3), and is twice arrested and released by the Jewish council (Acts 4-5). He was the first apostle to baptize a Gentile, the Roman centurion Cornelius, after a vision convinced him that God's message was not for Jews only (Acts 10) — a turning point in the early church's expansion beyond Judaism. Paul later records a sharp public disagreement with Peter at Antioch over Peter's withdrawal from eating with Gentile believers (Galatians 2:11-14).",
      "Two New Testament letters, 1 and 2 Peter, bear his name. Church tradition (not the New Testament itself) holds that Peter went on to Rome and was martyred there under Nero, traditionally crucified upside down at his own request, considering himself unworthy to die in the same manner as Jesus.",
    ],
    controversies: [
      "His three denials of Jesus on the night of the arrest are recorded in all four Gospels — an unflattering episode about the movement's most prominent leader that most ancient writers would have been tempted to omit or soften, which many historians take as evidence for its authenticity.",
      "Paul's letter to the Galatians describes confronting Peter \"to his face\" at Antioch for pulling back from eating with Gentile Christians once certain men from James arrived, calling his behavior hypocrisy (Galatians 2:11-14) — a rare glimpse of open conflict between two apostolic leaders.",
    ],
    occupation: "Fisherman, then apostle and church leader",
    placesLived: "Born in Bethsaida, later lived and worked as a fisherman in Capernaum on the Sea of Galilee; later based in Jerusalem, and by tradition eventually went to Rome.",
    extraBiblicalReferences: [
      {
        source: "Clement of Rome, First Epistle to the Corinthians",
        citation: "5.4",
        summary:
          "Written from Rome around AD 96, this early letter lists Peter among those who \"bore witness\" and suffered, generally read as an early allusion to his death in Rome, though it does not narrate the crucifixion story or name a location explicitly.",
        reliability:
          "Very early (within decades of Peter's death) but brief and allusive — not a detailed independent account.",
      },
      {
        source: "Eusebius of Caesarea, Church History",
        citation: "2.25",
        summary:
          "Writing in the early 4th century, Eusebius records the tradition that Peter was crucified upside down in Rome under Nero, citing the earlier writer Origen as his source for that detail.",
        reliability:
          "Later church tradition (Eusebius wrote roughly 250 years after Peter's death) — valuable for showing what the early church believed, but not a contemporary historical record.",
      },
    ],
    verses: [
      { reference: "Matthew 4:18-20", note: "Called as a fisherman" },
      { reference: "Matthew 16:13-19", note: "Confesses Jesus as the Christ" },
      { reference: "Luke 22:54-62", note: "Denies Jesus three times" },
      { reference: "John 21:15-17", note: "Restored by the risen Jesus" },
      { reference: "Acts 2:14-41", note: "Preaches at Pentecost" },
      { reference: "Acts 10", note: "Baptizes Cornelius, the first Gentile convert" },
      { reference: "Galatians 2:11-14", note: "Confronted by Paul at Antioch" },
    ],
    sources: [{ label: "Encyclopaedia Britannica: Saint Peter the Apostle", url: "https://www.britannica.com/biography/Saint-Peter-the-Apostle" }],
  },
  {
    id: "pontius-pilate",
    name: "Pontius Pilate",
    pronunciation: "PON-shus PY-lut",
    alternateNames: ["Pilate"],
    tier: "major",
    role: "Roman Prefect of Judea",
    summary:
      "The Roman governor of Judea who presided over Jesus's trial and ordered his crucifixion — one of the few New Testament figures whose existence and title are directly confirmed by archaeology.",
    lifeStory: [
      "Pilate served as Roman prefect of Judea from about AD 26 to 36, appointed under the emperor Tiberius. Judea at the time was a minor Roman province, and Pilate's normal residence was Caesarea Maritima on the coast; he came to Jerusalem in force during major festivals like Passover, when the city's population swelled and the risk of unrest was highest.",
      "In the Gospels, the Jewish religious authorities bring Jesus to Pilate because only a Roman governor held the authority to carry out a death sentence. Pilate questions Jesus directly, tells the crowd he finds no basis for a charge against him, and — according to Matthew's account — even has his wife send word that she had suffered in a dream because of Jesus and urging him to have nothing to do with \"that righteous man\" (Matthew 27:19). Despite this, under pressure from the crowd and facing the accusation that releasing Jesus would make him no friend of Caesar, Pilate hands Jesus over to be crucified, in Matthew's account symbolically washing his hands before the crowd (Matthew 27:24).",
      "Outside the Gospels, Jewish sources describe Pilate as a harsher and more provocative governor than the Gospel portrait alone suggests — clashing repeatedly with the Jewish population over issues of religious sensitivity, including bringing military standards bearing the emperor's image into Jerusalem and appropriating temple funds to build an aqueduct, provoking a riot he put down by force.",
      "Pilate's tenure ended after he violently suppressed a Samaritan gathering at Mount Gerizim; the Samaritans complained to the Roman governor of Syria, who sent Pilate to Rome to answer to the emperor. What happened to him afterward is not reliably recorded — later Christian legend offers various (unverifiable) accounts of his death, including suicide.",
    ],
    controversies: [
      "Jewish sources (Josephus and Philo) depict Pilate as considerably more brutal and politically clumsy than the more sympathetic, reluctant figure in the Gospels, raising a long-running historical question about how to reconcile the two portraits.",
      "The Gospels' account of Pilate offering to release a prisoner at Passover (the choice between Jesus and Barabbas) has no clear parallel in outside Roman or Jewish sources describing such a custom, and its historicity is debated among historians.",
    ],
    occupation: "Roman prefect (provincial governor) of Judea",
    placesLived: "Based primarily at Caesarea Maritima on the Mediterranean coast, with a residence in Jerusalem used during festivals.",
    extraBiblicalReferences: [
      {
        source: "The Pilate Stone (inscription, Caesarea Maritima)",
        citation: "Discovered 1961, now in the Israel Museum, Jerusalem",
        summary:
          "A limestone block bearing a dedicatory inscription naming \"[Pon]tius Pilatus,\" \"[Praef]ectus Iuda[eae]\" (Prefect of Judea) — the only known archaeological inscription naming Pilate, confirming his existence and exact Roman title.",
        reliability:
          "Direct physical/archaeological evidence from Pilate's own time in office — the strongest possible kind of extra-biblical confirmation.",
      },
      {
        source: "Josephus, Antiquities of the Jews",
        citation: "18.3.1-2 (55-64) and 18.4.1-2 (85-89)",
        summary:
          "Describes Pilate provoking riots by bringing military standards into Jerusalem and by using temple funds for an aqueduct, and records the Mount Gerizim incident that led to Pilate being recalled to Rome.",
        reliability: "Near-contemporary Jewish historical record, written within living memory of the events.",
      },
      {
        source: "Philo of Alexandria, On the Embassy to Gaius",
        citation: "38 (299-305)",
        summary:
          "Quotes a letter describing Pilate as inflexible, corrupt, and guilty of \"briberies, insults, robberies, outrages,\" and needless executions — a harsher assessment than Josephus's, though Philo had his own polemical reasons for depicting Pilate negatively.",
        reliability: "Near-contemporary but explicitly one-sided source, hostile to Pilate.",
      },
      {
        source: "Tacitus, Annals",
        citation: "15.44",
        summary:
          "Writing about Nero's persecution of Christians in Rome (AD 64), Tacitus notes in passing that \"Christus\" had been executed \"at the hands of one of our procurators, Pontius Pilatus, in the reign of Tiberius\" — confirming the crucifixion and Pilate's role from a Roman, non-Christian source.",
        reliability: "Independent Roman historical source, though written roughly 80 years after the event.",
      },
    ],
    verses: [
      { reference: "Matthew 27:1-26", note: "Presides over Jesus's trial" },
      { reference: "Matthew 27:19", note: "His wife's warning dream" },
      { reference: "Matthew 27:24", note: "Washes his hands of the decision" },
      { reference: "John 18:28-19:16", note: "Extended dialogue with Jesus" },
      { reference: "Luke 23:1-25", note: "Finds no basis for a charge, sends Jesus to Herod Antipas" },
    ],
    sources: [
      { label: "Encyclopaedia Britannica: Pontius Pilate", url: "https://www.britannica.com/biography/Pontius-Pilate" },
      { label: "Israel Museum: The Pilate Stone", url: "https://www.imj.org.il/en/collections/378846" },
    ],
  },
];
