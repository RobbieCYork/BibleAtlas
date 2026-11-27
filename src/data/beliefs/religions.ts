/**
 * World Religions and Worldviews — the half of "Religions and Denominations" that covers traditions
 * outside historic Christianity, plus the two movements from a Christian background that the app
 * files here (Robbie, 2026-09-09), plus atheism and agnosticism, which are worldviews and not
 * religions and say so.
 *
 * Record shape and editorial rules: ./types.ts. In short — every field except `evangelicalView`
 * describes the tradition as its own members would recognise it; `ownAnswer` gives it its reply.
 *
 * Sourcing rules followed here (capstone-bible/AGENTS.md, master prompt, beliefs-scope.md §5):
 *  - No third-party text is hosted. Nothing beyond a short, attributed phrase is quoted.
 *  - The Qur'an is cited by sura and verse and linked to quran.com, which shows the translations
 *    Muslims actually read; no translation is quoted, so no translation choice is imposed on the
 *    reader. Wikisource's Muhammad Ali translation is listed as a link only, with its caveat.
 *  - Watch Tower and Latter-day Saint material is cited and linked, never reproduced beyond a
 *    phrase of a few words.
 *  - Adherent figures were each checked against the linked source on 2026-11-26.
 *
 * Paragraphs here are run through the name linker when rendered. Full modern names are used
 * ("Joseph Smith", "Charles Taze Russell"), and the linker output was enumerated before commit.
 */

import type { BeliefRecord } from "./types";

export const worldReligions: BeliefRecord[] = [
  // ───────────────────────────────────────────────────────────────────────────── Judaism
  {
    id: "judaism",
    name: "Judaism",
    alternateNames: ["Jewish faith", "Rabbinic Judaism"],
    area: "world-religion",
    group: "Abrahamic religions",
    role: "Religion of the Jewish people; the faith of the Hebrew Scriptures",
    summary:
      "Judaism is the religion of the Jewish people: the covenant faith of Israel, centred on the one God, the Torah and the life of a people bound to him. Its Scriptures are the books Christians call the Old Testament, and the Judaism practised today is the rabbinic Judaism that took shape after the destruction of the Second Temple in AD 70.",
    selfDescription:
      "Jews describe Judaism less as a set of doctrines than as the covenant between God and the people of Israel, lived out through the Torah — the written Torah of the Hebrew Bible and the oral Torah preserved in the Mishnah and Talmud. The Shema (Deuteronomy 6:4), recited morning and evening, is the closest thing to a creed: the LORD is our God, the LORD is one.",
    founding: {
      founders:
        "No single founder. By Jewish tradition the covenant begins with God's call of Abraham and is given its law through Moses at Sinai; Jews speak of Abraham, Isaac and Jacob as the patriarchs, not as founders of a religion. Historians trace the religion of ancient Israel through the monarchy, the exile and the Second Temple period, and rabbinic Judaism to the sages after AD 70.",
      founderKind: "none",
      date: "No founding date",
      dateNote:
        "Traditional Jewish chronology dates the patriarchs and the exodus to the second millennium BC; historians dispute the dating of the patriarchal and exodus narratives. The rabbinic Judaism practised today took shape between the fall of the Second Temple (AD 70) and the completion of the Talmud in Babylonia (around AD 500-600).",
      place: "The land of Israel; later the Diaspora, above all Babylonia",
    },
    adherents: {
      figure: "about 14.8 million",
      counts:
        "Jews by religion — self-identification in surveys and censuses outside Israel, and Israel's population register, which uses religious-legal criteria, inside it",
      year: "2020",
      source: {
        label: "Pew Research Center, Jewish population change, 2010-2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/jewish-population-change/",
      },
      verified: true,
      note:
        "Who counts as Jewish is itself a question Jews answer differently — by religion, by descent, or by identity. The demographer Sergio DellaPergola, using a 'core Jewish population' that includes Jews who are not religious, estimated about 15.7 million on 1 January 2024, roughly 7.2 million of them in Israel and 6.3 million in the United States. Pew notes its own US figure is 5.7 million by religion but 7.5 million on a broader definition.",
    },
    distinctives: [
      "Judaism is not, for this app, one more comparison. It is the faith of the people to whom the Scriptures were first given, whose Bible the app reads on every screen, and from whom Jesus of Nazareth and all the apostles came (Romans 9:4-5). Christianity and rabbinic Judaism are two traditions that both claim the Hebrew Scriptures and went their separate ways in the first and second centuries; neither can be explained without the other.",
      "Judaism puts practice ahead of creed. A Jew is born into the people or joins it by conversion, and Jewish life is shaped by halakhah — the way of walking, the body of law drawn from the Torah by the rabbis — covering prayer, food, Sabbath, festivals, marriage and ethics. Argument is part of the tradition: the Talmud preserves dissenting opinions alongside the rulings that prevailed.",
      "Judaism is also a people with a history. The covenant with Israel, the land, exile and return, and memory — of the exodus at Passover, and in modern times of the Holocaust — are part of what the religion is. For that reason many Jews who are not observant still regard themselves as fully Jewish.",
    ],
    beliefs: [
      {
        label: "God",
        statement:
          "There is one God, Creator of all, incorporeal and indivisible, who has no partner and takes no human form. The Shema (Deuteronomy 6:4) is the central confession.",
      },
      {
        label: "Covenant",
        statement:
          "God chose Israel and bound himself to it by covenant — with Abraham, and at Sinai through Moses — not because Israel was greater but out of love, giving it a calling to be holy and to bear witness to him among the nations.",
      },
      {
        label: "Torah",
        statement:
          "God revealed his teaching to Israel. Traditional Judaism holds that Moses received both the written Torah and an oral Torah that explains it, now preserved in the Mishnah, the Talmud and later codes. Reform and other liberal movements regard the Torah as inspired but shaped by human hands and binding in a different way.",
      },
      {
        label: "Scripture",
        statement:
          "The Tanakh — Torah (Law), Nevi'im (Prophets) and Ketuvim (Writings) — contains the same books as the Protestant Old Testament, arranged in a different order and ending with Chronicles.",
      },
      {
        label: "Human beings",
        statement:
          "Every person is made in the image of God and is free to choose good. Judaism teaches an inclination to evil and an inclination to good in each person, and repentance (teshuvah) is always open; it does not teach inherited original sin in the Christian sense.",
      },
      {
        label: "Ethics and law",
        statement:
          "Loving God is expressed by keeping his commandments. Rabbinic tradition counts 613 commandments in the Torah, binding on Jews; the rest of humanity is bound by the seven Noahide laws, and the righteous among the nations have a share in the world to come.",
      },
      {
        label: "The Messiah",
        statement:
          "Traditional Judaism awaits a human Messiah from the line of David who will gather the exiles, rebuild the Temple and bring peace to the world. Maimonides counted belief in his coming among the thirteen principles of faith. Many liberal Jews speak of a messianic age rather than a personal Messiah.",
      },
      {
        label: "The world to come",
        statement:
          "Traditional Judaism teaches that the dead will be raised and that there is a world to come, but leaves the details largely open; Jewish teaching on the afterlife has always been less defined than on how to live now.",
      },
    ],
    practices: [
      "The Sabbath (Shabbat), from Friday sunset to Saturday nightfall, is the heart of Jewish practice: a day of rest, prayer, family meals and Torah study. The yearly cycle includes Passover, Shavuot and Sukkot (the three pilgrim festivals of the Torah), Rosh Hashanah and Yom Kippur (the High Holy Days), Hanukkah and Purim.",
      "Daily prayer is said in the morning, afternoon and evening, communally in the synagogue where a quorum (minyan) is present. Observant Jews keep kashrut, the food laws, and mark life with circumcision of boys on the eighth day, bar and bat mitzvah, marriage under the canopy and set rites of mourning. Study of Torah and Talmud is itself an act of worship.",
    ],
    structure: [
      "Judaism has no central authority. Rabbis are teachers and judges of Jewish law, not priests; communities and movements govern themselves. Israel has a Chief Rabbinate with authority over some personal-status matters there, but it does not speak for Jews worldwide.",
      "The main modern movements are Orthodox Judaism (including Modern Orthodox and Haredi communities, the latter including the Hasidic movements), which holds the written and oral Torah to be divinely given and halakhah binding; Conservative (Masorti) Judaism, which holds halakhah binding but developing; Reform (Progressive) Judaism, which treats ethical teaching as primary and ritual law as a matter of informed choice; and Reconstructionist Judaism, which understands Judaism as the evolving civilisation of the Jewish people. Many Jews belong to no movement.",
      "Ashkenazi, Sephardi and Mizrahi Jews are not denominations but communities of descent with their own customs and liturgies. Karaite Jews, a small community, accept the written Torah but not the rabbinic oral law.",
    ],
    relationships: [
      "Christianity and Islam both trace themselves to Abraham and draw on Israel's Scriptures. Jewish-Christian relations carry a long and painful history: Christian anti-Judaism, expulsions, forced conversions and the antisemitism that culminated in the Holocaust. Since the Second World War most churches, Catholic and Protestant, have formally repudiated the charge that the Jewish people are collectively guilty of Jesus's death.",
      "Messianic Jews — Jewish people who believe Jesus is the Messiah and keep Jewish practice — regard themselves as Jews. The Jewish movements, and Israeli law for purposes of immigration, do not count them as practising Judaism. Their placement is genuinely contested and this article does not settle it.",
    ],
    viewOfJesus: [
      "Judaism does not regard Jesus as the Messiah, because, Jews say, the messianic age the prophets describe — exiles gathered, the Temple rebuilt, peace among nations — has not come. Nor does it accept that the Messiah would be divine, which Jews see as incompatible with the oneness of God.",
      "Jewish scholars widely recognise Jesus as a first-century Jewish teacher from Galilee, and many modern Jewish writers have studied him with sympathy as part of Jewish history. Judaism has no single official teaching about him.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals and Jews confess the same God, the God of Abraham, Isaac and Jacob, and receive the same Hebrew Scriptures as the word of God. The Shema is Jesus's own first commandment (Mark 12:29-30).",
        "Evangelicals hold, with Paul, that the covenants, the law, the promises and the Messiah himself came to the world through Israel (Romans 9:4-5), and that Gentile Christians are grafted into Israel's olive tree and must not boast over the natural branches (Romans 11:17-18). Contempt for the Jewish people has no place in Christian faith, and the history of Christian antisemitism is a sin to be confessed, not explained away.",
      ],
      disagreements: [
        "The central disagreement is Jesus. Evangelicals believe Jesus of Nazareth is the promised Messiah of Israel, the eternal Word who became flesh (John 1:1, 14), and that his death and resurrection fulfil the Scriptures (1 Corinthians 15:3-4). They read passages such as Isaiah 53 as fulfilled in him.",
        "Evangelicals hold that salvation, for Jew and Gentile alike, is through faith in Jesus Christ (John 14:6), and that the oneness of God confessed in the Shema is not denied but revealed more fully in Father, Son and Holy Spirit.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on Israel's future. Dispensationalists hold that God's promises to ethnic Israel, including the land, remain to be fulfilled distinctly from the church; covenant theologians generally see the promises fulfilled in Christ and his one people, while many still expect a future turning of Jewish people to Christ from Romans 11:25-26. A small minority of Christians teach a 'dual covenant' in which Jews are saved apart from faith in Jesus; most evangelical bodies reject this.",
        "Evangelicals also differ on how, and whether, to support organised evangelism directed specifically at Jewish people, and on the relationship of Messianic congregations to the wider church.",
      ],
    },
    ownAnswer: [
      "Jews answer that the Messiah's task is to bring visible redemption to Israel and the world, and that a Messiah who leaves the world unredeemed has not done it. They read Isaiah 53, in line with much of the rabbinic tradition, as describing Israel, the suffering servant of the surrounding chapters, rather than an individual.",
      "Jews also answer that the Shema excludes any plurality in God, that the Torah was given to be kept and has not been abolished, and that Judaism has never taught that the righteous of other nations must become Jews to be saved. Many add that, after centuries of coerced conversion, Christian missionary efforts toward Jews are experienced as a threat to the survival of the people.",
    ],
    sources: [
      {
        kind: "primary",
        label: "The Holy Scriptures (Jewish Publication Society, 1917), on Wikisource",
        url: "https://en.wikisource.org/wiki/Bible_(Jewish_Publication_Society_1917)",
        note: "public-domain Jewish translation of the Tanakh",
      },
      {
        kind: "official",
        label: "Orthodox Union",
        url: "https://www.ou.org/",
        note: "Orthodox",
      },
      {
        kind: "official",
        label: "United Synagogue of Conservative Judaism",
        url: "https://www.uscj.org/",
        note: "Conservative",
      },
      {
        kind: "official",
        label: "Union for Reform Judaism",
        url: "https://urj.org/",
        note: "Reform",
      },
      {
        kind: "official",
        label: "Reconstructing Judaism",
        url: "https://www.reconstructingjudaism.org/",
        note: "Reconstructionist",
      },
      {
        kind: "data",
        label: "Pew Research Center, Jewish population change, 2010-2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/jewish-population-change/",
      },
      {
        kind: "data",
        label: "Sergio DellaPergola, World Jewish Population, 2024 (via Israel Central Bureau of Statistics)",
        url: "https://www.cbs.gov.il/he/Documents/World%20DellaPergola%202024%20complete.pdf",
        note: "core Jewish population estimate, 1 January 2024",
      },
      {
        kind: "reference",
        label: "My Jewish Learning",
        url: "https://www.myjewishlearning.com/",
        note: "cross-denominational Jewish reference",
      },
    ],
    verses: [
      { reference: "Deuteronomy 6:4", note: "The Shema" },
      { reference: "Romans 9:4-5" },
      { reference: "Romans 11:17-18" },
    ],
    relatedIds: ["islam"],
  },

  // ───────────────────────────────────────────────────────────────────────────── Islam
  {
    id: "islam",
    name: "Islam",
    alternateNames: ["Muslim faith"],
    area: "world-religion",
    noBibleLinks: true,
    group: "Abrahamic religions",
    role: "Monotheistic religion based on the Qur'an and the example of Muhammad",
    summary:
      "Islam is the faith of submission (islam) to the one God, Allah, as revealed in the Qur'an to the prophet Muhammad in seventh-century Arabia. A Muslim is one who submits. With about two billion adherents it is the world's second-largest religion.",
    selfDescription:
      "Muslims describe Islam not as a new religion but as the original faith of every prophet God sent, from Adam through Abraham, Moses and Jesus, restored and completed in the final revelation given to Muhammad, whom the Qur'an calls the seal of the prophets (Qur'an 33:40). Its foundation is tawhid, the absolute oneness of God (Qur'an 112).",
    founding: {
      founders:
        "Muhammad ibn Abdullah (c. AD 570-632) of Mecca. Muslims do not call him the founder of Islam: they hold that he was the last of the prophets and that Islam is the religion God revealed to all of them. By Muslim tradition the Qur'an was revealed to him through the angel Gabriel (Jibril) over about twenty-three years.",
      founderKind: "single",
      date: "AD 610 (first revelation, by Muslim tradition); AD 622 (the Hijra to Medina, year 1 of the Islamic calendar)",
      dateNote:
        "The year of the first revelation is the traditional one; the Hijra of 622 is the fixed point from which the Islamic calendar counts.",
      place: "Mecca and Medina, Arabia",
    },
    adherents: {
      figure: "about 2.0 billion",
      counts: "people who identify as Muslim in censuses and surveys",
      year: "2020",
      source: {
        label: "Pew Research Center, Muslim population change, 2010-2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/muslim-population-change/",
      },
      verified: true,
      note:
        "Pew puts Muslims at 25.6% of the world's population in 2020, up from 1.7 billion in 2010, the fastest growth of any major group. Pew's earlier estimate of the Sunni-Shi'a balance is 87-90% Sunni and 10-13% Shi'a, given as a range because few censuses ask the question.",
    },
    distinctives: [
      "Islam's centre is the Qur'an, which Muslims hold to be the literal speech of God, revealed in Arabic and preserved without alteration. Because the revelation is tied to its Arabic words, Muslims regard a translation as an interpretation of the Qur'an rather than the Qur'an itself; the text is recited in Arabic in prayer worldwide.",
      "Alongside the Qur'an stands the Sunnah, the example of the Prophet, recorded in the hadith — reports of what Muhammad said and did, transmitted through chains of narrators and sifted by scholars. Together they are the sources of sharia, God's guidance for all of life, which jurists work out in fiqh (jurisprudence). Worship, family life, commerce and ethics all fall within it.",
      "Islam is not attributed here to any one country, movement or group. The Sunni and Shi'a traditions, the schools of law within them, and movements such as Sufism and Salafism each have their own history, and Muslims disagree among themselves, as members of every large tradition do.",
    ],
    beliefs: [
      {
        label: "God (tawhid)",
        statement:
          "God is one, eternal and absolutely unique; he neither begets nor is begotten, and nothing is comparable to him (Qur'an 112). To associate any partner with God (shirk) is the gravest sin.",
      },
      {
        label: "Angels",
        statement:
          "God created angels, who serve him; Gabriel (Jibril) brought the Qur'an to Muhammad.",
      },
      {
        label: "Revealed books",
        statement:
          "God gave scriptures to earlier prophets — the Torah to Moses, the Psalms to David, the Gospel (Injil) to Jesus — and the Qur'an to Muhammad as the final and preserved revelation. Muslims widely hold that the earlier scriptures as now possessed have been altered or misinterpreted, though scholars differ on how far.",
      },
      {
        label: "Prophets",
        statement:
          "God sent prophets to every people, among them Adam, Noah, Abraham, Moses, David and Jesus. Muhammad is the last, the seal of the prophets (Qur'an 33:40).",
      },
      {
        label: "The Last Day",
        statement:
          "There will be a day of resurrection and judgement, when every soul is judged by God and enters paradise or hell, according to God's justice and mercy.",
      },
      {
        label: "Divine decree",
        statement:
          "God has knowledge and power over all things, and nothing happens outside his decree (qadar); human beings remain accountable for their choices. Muslim theological schools explain the relation between the two differently.",
      },
      {
        label: "Salvation",
        statement:
          "Salvation rests on God's mercy toward those who believe and do good; there is no doctrine of original sin or of a substitutionary atonement. Every person is born in a natural disposition (fitrah) to know God.",
      },
    ],
    practices: [
      "The Five Pillars are the framework of Muslim practice: the shahada, the declaration that there is no god but God and Muhammad is his messenger; salat, ritual prayer five times a day facing the Kaaba in Mecca, with congregational prayer at midday on Friday; zakat, obligatory almsgiving; sawm, fasting from dawn to sunset during the month of Ramadan (Qur'an 2:183); and hajj, the pilgrimage to Mecca once in a lifetime for those able to make it (Qur'an 3:97).",
      "The two great festivals are Eid al-Fitr, at the end of Ramadan, and Eid al-Adha, during the hajj, which remembers Abraham's willingness to sacrifice his son. Daily life includes dietary laws (halal food, no pork or alcohol), modesty in dress, and recitation and memorisation of the Qur'an. The mosque is a place of prayer led by an imam, not a priest; Islam has no priesthood or sacraments.",
    ],
    structure: [
      "Islam has no single central authority. Religious authority rests with scholars (ulama) trained in the Qur'an, hadith and law, and with the schools of jurisprudence they belong to.",
      "Sunni Muslims, the large majority, recognise the first four caliphs as Muhammad's rightful successors and follow one of four schools of law — Hanafi, Maliki, Shafi'i and Hanbali. Shi'a Muslims hold that leadership belonged to Ali ibn Abi Talib, the Prophet's cousin and son-in-law, and to imams descended from him; the largest Shi'a branch is the Twelvers (Ithna Ashari), predominant in Iran and Iraq, and others include the Ismailis and the Zaydis. The Ibadis, predominant in Oman, are a third, smaller tradition. The split goes back to the succession after Muhammad's death in 632 and was sealed by the killing of Ali's son Husayn at Karbala in 680.",
      "Sufism is the mystical tradition of Islam, found among both Sunnis and Shi'a and organised in orders. Salafism, a modern reform movement, calls Muslims back to the practice of the first generations. The Amman Message (2004-2005), endorsed by several hundred Muslim scholars, recognised eight schools of law across the Sunni, Shi'a and Ibadi traditions as valid. The Ahmadiyya movement, founded in nineteenth-century India, regards itself as Muslim; most Sunni and Shi'a authorities do not.",
    ],
    relationships: [
      "The Qur'an calls Jews and Christians 'People of the Book', who received earlier revelation. Islam shares with them a lineage traced through Abraham, and many of the same prophets. Muslim tradition connects the Kaaba in Mecca with Abraham and his son Ishmael.",
      "Contested matters inside Islamic law — the meaning of jihad, the penalty for apostasy, the status of non-Muslims in a Muslim state — are argued among Muslim jurists with a real range of positions, from classical rulings to modern reinterpretations that appeal, for instance, to Qur'an 2:256 ('no compulsion in religion'). Groups that justify violence in Islam's name have been condemned by large numbers of Muslim scholars — the Amman Message, for example, restricts religious rulings to qualified scholars and forbids declaring members of the recognised schools apostates — and their claims are not presented here as Islam's teaching.",
    ],
    viewOfJesus: [
      "Islam honours Jesus (Isa) as one of the greatest prophets and the Messiah, born of the virgin Mary (Qur'an 3:45-47; 19:16-34), a worker of miracles and a word and spirit from God (Qur'an 4:171). Mary is honoured above all women, and a sura of the Qur'an bears her name.",
      "Islam denies that Jesus is divine or the Son of God, and rejects the Trinity (Qur'an 4:171). The mainstream reading of Qur'an 4:157 is that Jesus was not killed or crucified but that it was made to appear so, and that God raised him to himself; many Muslims expect his return before the Last Day. (The Ahmadiyya hold instead that he survived crucifixion and died a natural death.)",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals share with Muslims belief in one Creator God who speaks, who sent prophets, who will raise the dead and judge the world, and who calls human beings to worship, prayer, honesty and care for the poor.",
        "Evangelicals welcome the honour Islam gives to Jesus — his virgin birth, his miracles, his title of Messiah — and to Mary, and recognise that a Muslim reader comes to the Gospels already revering Jesus.",
      ],
      disagreements: [
        "Evangelicals believe Jesus is not only a prophet but the eternal Son of God, God incarnate, and that the oneness of God is revealed in Father, Son and Holy Spirit rather than contradicted by them. Christians do not teach three gods, nor that God took a wife — readings of the Trinity that Muslims often reject and that Christians reject too.",
        "Evangelicals hold that Jesus truly died on the cross and rose bodily on the third day. That event is attested by the earliest Christian sources and by non-Christian historians of the first and second centuries, and the gospel depends on it.",
        "Evangelicals hold that salvation is a gift of grace received through faith in Christ, not secured by balancing deeds, and that the Bible is a reliable record of revelation rather than a corrupted one.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on whether Christians and Muslims can be said to worship 'the same God' — some saying yes, referring to the one Creator, though understood very differently; others saying no, because the God of the Bible is known as Father, Son and Spirit. They also differ on the best approach to mission and dialogue among Muslims.",
      ],
    },
    ownAnswer: [
      "Muslims answer that tawhid cannot admit a Son or a Trinity in any form, that the Qur'an corrects what earlier communities exaggerated about Jesus (Qur'an 4:171), and that honouring Jesus as a prophet is the highest honour a human being can receive. They point out that the word Trinity does not appear in the Bible.",
      "On the cross, Muslims answer that God would not allow his righteous prophet to be killed in disgrace, and that the Qur'an (4:157) states what happened. On salvation, they answer that God forgives whom he wills and needs no sacrifice to do so, that every person bears their own burden, and that God's mercy outweighs his wrath.",
    ],
    sources: [
      {
        kind: "primary",
        label: "The Qur'an, on Quran.com (Arabic with several English translations)",
        url: "https://quran.com/1",
        note: "cited by sura and verse throughout; no translation is quoted",
      },
      {
        kind: "primary",
        label: "The Holy Qur'an, tr. Maulana Muhammad Ali (1917), on Wikisource",
        url: "https://en.wikisource.org/wiki/The_Holy_Qur%27an_(Maulana_Muhammad_Ali)",
        note: "link only; the translator was Ahmadi and his readings differ from mainstream Sunni and Shi'a interpretation",
      },
      {
        kind: "official",
        label: "The Amman Message",
        url: "https://ammanmessage.com/",
        note: "2004-2005 statement endorsed by Muslim scholars on the recognised schools of law",
      },
      {
        kind: "data",
        label: "Pew Research Center, Muslim population change, 2010-2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/muslim-population-change/",
      },
      {
        kind: "data",
        label: "Pew Research Center, Mapping the Global Muslim Population (2009)",
        url: "https://www.pewresearch.org/religion/2009/10/07/mapping-the-global-muslim-population/",
        note: "Sunni-Shi'a estimate",
      },
      {
        kind: "reference",
        label: "Encyclopaedia Britannica, Islam",
        url: "https://www.britannica.com/topic/Islam",
      },
    ],
    relatedIds: ["judaism"],
  },

  // ───────────────────────────────────────────────────────────────────────────── Hinduism
  {
    id: "hinduism",
    name: "Hinduism",
    alternateNames: ["Sanatana Dharma", "Hindu dharma"],
    area: "world-religion",
    noBibleLinks: true,
    group: "Religions from India",
    role: "Family of religious traditions originating in the Indian subcontinent",
    summary:
      "Hinduism is the name given to the family of religious traditions that grew from the Vedas in the Indian subcontinent. It has no founder, no single creed and no central authority, and it is the world's third-largest religion, with about 1.2 billion adherents.",
    selfDescription:
      "Many Hindus call their tradition Sanatana Dharma, the eternal way or eternal order, and describe it as a way of life rather than a single religion: many paths, many forms of worship and many schools of thought that share a reverence for the Vedas and the ideas of dharma, karma and liberation. The word 'Hindu' itself began as an outsiders' geographical term for the people beyond the Indus river.",
    founding: {
      founders:
        "No founder. Hindus regard the Veda as eternal, heard (shruti) by ancient seers (rishis) rather than composed. Historians describe Hinduism as developing from the religion of the Vedic period through the Upanishads, the epics and the devotional movements into the traditions practised today.",
      founderKind: "none",
      date: "No founding date",
      dateNote:
        "Historians commonly date the oldest hymns of the Rig Veda to the second millennium BC, but the dating is debated, and many Hindus reject the idea that their tradition has a beginning in time at all. The use of 'Hinduism' as one umbrella name for these traditions is itself largely modern, from the colonial period onward.",
      place: "The Indian subcontinent",
    },
    adherents: {
      figure: "about 1.2 billion",
      counts: "people who identify as Hindu in censuses and surveys",
      year: "2020",
      source: {
        label: "Pew Research Center, How the global religious landscape changed from 2010 to 2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/how-the-global-religious-landscape-changed-from-2010-to-2020/",
      },
      verified: true,
      note:
        "Pew puts Hindus at 14.9% of the world's population in 2020, a share that held steady over the decade. The great majority live in India, with large communities in Nepal, Bangladesh and the diaspora.",
    },
    distinctives: [
      "Hinduism is less a single religion than a family of traditions. A Hindu may worship Vishnu, Shiva or the Goddess, or regard all deities as forms of one ultimate reality; may follow a guru or none; and may hold philosophical views ranging from strict non-dualism to devotion to a personal God. That breadth is not a defect in Hindu eyes but part of its genius: truth is one, the sages call it by many names, as a famous Rig Vedic line is usually summarised.",
      "At the centre of most Hindu thought is the cycle of birth, death and rebirth (samsara), governed by karma — the moral law that actions bear fruit — and the hope of moksha, liberation from the cycle. Dharma, the right order of things and the duty proper to each person's stage and station of life, governs how one lives within it.",
    ],
    beliefs: [
      {
        label: "Ultimate reality",
        statement:
          "Brahman is the one ultimate reality underlying all things. Schools differ on how Brahman relates to the world and to personal gods: for Advaita Vedanta all distinctions are finally illusory; for the devotional schools Brahman is a personal Lord, such as Vishnu or Shiva.",
      },
      {
        label: "The self",
        statement:
          "Each living being has an eternal self (atman) that passes through many births. In Advaita the atman is identical with Brahman; in other schools it is distinct from God and dependent on him.",
      },
      {
        label: "Karma and rebirth",
        statement:
          "Actions have consequences that shape this life and the next. The self is reborn according to its karma until it is liberated.",
      },
      {
        label: "Liberation (moksha)",
        statement:
          "The highest goal is release from the cycle of rebirth. The classic paths are knowledge (jnana), devotion (bhakti) and selfless action (karma yoga), as taught in the Bhagavad Gita; many traditions also teach meditation (yoga in the narrower sense).",
      },
      {
        label: "Dharma",
        statement:
          "There is a moral and cosmic order, and each person has duties proper to their stage of life. Hindu tradition names four aims of life: dharma (righteousness), artha (prosperity), kama (pleasure) and moksha (liberation).",
      },
      {
        label: "Deities and avatars",
        statement:
          "God is worshipped in many forms. Vaishnavas worship Vishnu, who descends in avatars such as Rama and Krishna; Shaivas worship Shiva; Shaktas worship the Goddess (Devi); Smartas honour several deities as forms of the one Brahman.",
      },
      {
        label: "Scripture",
        statement:
          "The Vedas, including the Upanishads, are shruti (heard revelation). The epics (the Ramayana and the Mahabharata, which contains the Bhagavad Gita), the Puranas and law books are smriti (remembered tradition), authoritative but secondary.",
      },
      {
        label: "Non-violence",
        statement:
          "Ahimsa, non-harming, is a widely held ideal; many Hindus are vegetarian and the cow is widely held sacred.",
      },
    ],
    practices: [
      "Worship (puja) is offered at home shrines and in temples, before images (murti) in which the deity is understood to be present: offerings of flowers, food, light and incense, chanting and prayer. Pilgrimage to sacred rivers and cities, such as the Ganges at Varanasi, is a major practice, as are great festivals such as Diwali, Holi and Navaratri.",
      "Life is marked by rites of passage (samskaras) from birth to cremation. Many Hindus practise yoga and meditation, follow a guru, recite mantras and read the Bhagavad Gita and the epics. Devotional singing (bhajan, kirtan) is central to the bhakti traditions.",
    ],
    structure: [
      "There is no central authority, creed or church. Authority rests with scripture, with lineages of teachers (gurus and acharyas), with temple priests (often Brahmins) for ritual, and with monastic orders such as those associated with the philosopher Adi Shankara.",
      "The major streams are Vaishnavism, Shaivism, Shaktism and the Smarta tradition. Philosophical schools include the Vedanta schools — Advaita (non-dualist, Shankara), Vishishtadvaita (qualified non-dualist, Ramanuja) and Dvaita (dualist, Madhva) — and older systems such as Yoga and Samkhya. Modern movements include the Ramakrishna Mission, ISKCON (the Hare Krishna movement) and the Swaminarayan traditions.",
      "Caste (varna, the four classes of the classical texts, and jati, hereditary community) has long shaped Hindu society. Many Hindu reformers and teachers reject caste hierarchy as no part of the essence of Hindu teaching, and India's constitution abolished untouchability and outlaws caste discrimination; how far caste belongs to Hinduism itself is debated by Hindus.",
    ],
    relationships: [
      "Buddhism, Jainism and Sikhism all arose in India in conversation with Hindu traditions and share much of their vocabulary, such as karma, dharma and rebirth, while rejecting the authority of the Vedas or reframing it. Hindu tradition has often been willing to absorb other teachers as further manifestations of the divine.",
    ],
    viewOfJesus: [
      "Hinduism has no official teaching about Jesus. Many Hindus revere him as a great teacher, a holy man or an incarnation of the divine among others, and some modern Hindu teachers have written of him with deep respect. What Hindu traditions generally do not accept is that he is the only incarnation of God or the only way to liberation.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals share with Hindus the conviction that there is a spiritual reality beyond the material world, that human beings are moral beings answerable for their actions, and that devotion, prayer and self-discipline matter. Many evangelicals find in the bhakti traditions a longing for a personal God that Christianity also expresses.",
        "Evangelicals agree that compassion, non-violence toward the weak and reverence for life are goods, and Christians in India have long joined Hindu reformers in opposing caste discrimination.",
      ],
      disagreements: [
        "Evangelicals believe in one personal Creator God, distinct from the world he made, and reject both the worship of many deities and the view that the self is ultimately identical with God.",
        "Evangelicals hold that each person lives once and then faces judgement, rather than passing through many births, and that salvation is not attained by knowledge, devotion or works but received as grace through the death and resurrection of Christ.",
        "Evangelicals hold that Jesus is not one incarnation among many but the unique and only Son of God, the one way to the Father.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on how far Christians may use Hindu cultural forms — music, dress, festivals, yoga as exercise — and on contextual movements of Hindus who follow Jesus without joining a church.",
      ],
    },
    ownAnswer: [
      "Hindus answer that truth is too great for one name or one path, that the claim of exclusive salvation is a form of spiritual pride, and that Hinduism can honour Jesus without making him the only way. Many say that a single life is too short for any soul to reach perfection, and that karma and rebirth are a more just account of human suffering.",
      "On the many deities, many Hindus answer that they worship one ultimate reality in many forms, and that images are aids to devotion, not the object of it. Many add that conversion campaigns in India have been experienced as an attack on their culture.",
    ],
    sources: [
      {
        kind: "primary",
        label: "The Bhagavad Gita, tr. Edwin Arnold (1885), on Wikisource",
        url: "https://en.wikisource.org/wiki/The_Bhagavad_Gita_(Arnold_translation)",
        note: "public-domain Victorian verse translation",
      },
      {
        kind: "primary",
        label: "The Hymns of the Rigveda, tr. Ralph T. H. Griffith (1896), on Wikisource",
        url: "https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda",
      },
      {
        kind: "official",
        label: "Hindu American Foundation",
        url: "https://www.hinduamerican.org/",
        note: "Hindu advocacy and education organisation",
      },
      {
        kind: "data",
        label: "Pew Research Center, How the global religious landscape changed from 2010 to 2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/how-the-global-religious-landscape-changed-from-2010-to-2020/",
      },
      {
        kind: "data",
        label: "Pew Research Center, Hindu population change, 2010-2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/hindu-population-change/",
      },
      {
        kind: "reference",
        label: "Encyclopaedia Britannica, Hinduism",
        url: "https://www.britannica.com/topic/Hinduism",
      },
    ],
    relatedIds: ["buddhism", "sikhism"],
  },

  // ───────────────────────────────────────────────────────────────────────────── Buddhism
  {
    id: "buddhism",
    name: "Buddhism",
    alternateNames: ["Buddha Dharma"],
    area: "world-religion",
    noBibleLinks: true,
    group: "Religions from India",
    role: "Religious tradition founded on the teaching of the Buddha",
    summary:
      "Buddhism is the tradition that follows the teaching (Dharma) of Siddhartha Gautama, the Buddha, or 'awakened one', who taught in northern India in the fifth century BC. It teaches a path to the end of suffering through ethical living, meditation and wisdom, and it has about 324 million self-identified adherents.",
    selfDescription:
      "Buddhists take refuge in the Three Jewels: the Buddha, who discovered the path; the Dharma, his teaching; and the Sangha, the community that practises it. They describe the Buddha not as a god but as a human being who awakened to the truth about suffering and its end, and taught others to do the same.",
    founding: {
      founders:
        "Siddhartha Gautama, the Buddha. By Buddhist tradition he was born a prince of the Shakya clan at Lumbini (in present-day Nepal), left home in search of release from suffering, attained awakening under the bodhi tree at Bodh Gaya, gave his first teaching at the Deer Park near Sarnath, and died at Kushinagar at about eighty.",
      founderKind: "single",
      date: "5th century BC (the dating most historians favour)",
      dateNote:
        "The Buddha's dates are uncertain. The traditional Theravada reckoning, used for the Buddhist Era calendar, places his death in 544 or 543 BC; many modern historians place it about a century or more later, around 400 BC. The details of his life come from Buddhist texts written down centuries afterwards.",
      place: "The Ganges plain, northern India",
    },
    adherents: {
      figure: "about 324 million",
      counts: "people who identify as Buddhist in censuses and surveys",
      year: "2020",
      source: {
        label: "Pew Research Center, Buddhist population change, 2010-2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/buddhist-population-change/",
      },
      verified: true,
      note:
        "Pew reports a 5% decline from 343 million in 2010. It cautions that its estimates do not reflect the full influence of Buddhism, because they leave out people who take part in Buddhist beliefs or practices without identifying as Buddhist.",
    },
    distinctives: [
      "Buddhism does not centre on a creator God. The Buddha set aside questions about the origin of the world as not leading to liberation and taught instead a diagnosis of the human condition and a path out of it. Many Buddhists honour gods and spirits, but as beings within the cycle of rebirth, not as the source of salvation.",
      "Its distinctive teaching is anatta, 'not-self': that there is no permanent, unchanging self at the core of a person, only a changing stream of physical and mental processes. Clinging to a self and to impermanent things is what binds beings to suffering; letting go of craving is what frees them.",
    ],
    beliefs: [
      {
        label: "The Four Noble Truths",
        statement:
          "Life as ordinarily lived is marked by suffering or unsatisfactoriness (dukkha); its cause is craving; it can cease (nirvana); and the way to its cessation is the Noble Eightfold Path. This was the substance of the Buddha's first teaching.",
      },
      {
        label: "The Eightfold Path",
        statement:
          "Right view, right intention, right speech, right action, right livelihood, right effort, right mindfulness and right concentration — grouped as ethics, meditation and wisdom.",
      },
      {
        label: "Three marks of existence",
        statement:
          "All conditioned things are impermanent (anicca), unsatisfactory (dukkha) and without a permanent self (anatta).",
      },
      {
        label: "Karma and rebirth",
        statement:
          "Intentional actions shape future experience, in this life and in future births, within the cycle of samsara.",
      },
      {
        label: "Nirvana",
        statement:
          "The goal is nirvana, the extinguishing of craving, hatred and delusion, and release from rebirth. In Mahayana teaching the ideal is the bodhisattva, who seeks awakening for the sake of all beings.",
      },
      {
        label: "The Buddha",
        statement:
          "The Buddha is a fully awakened teacher, not a god or a saviour who saves by his own merit. Mahayana Buddhism also teaches many buddhas and bodhisattvas who can aid beings, and the Pure Land tradition teaches reliance on the vow of the Buddha Amitabha.",
      },
      {
        label: "Ethics",
        statement:
          "Lay Buddhists commonly undertake the Five Precepts: to refrain from killing, stealing, sexual misconduct, false speech and intoxicants. Compassion (karuna) and loving-kindness (metta) are central virtues.",
      },
    ],
    practices: [
      "Practice centres on meditation — calm (samatha) and insight (vipassana) in Theravada, zazen in Zen, visualisation and mantra in Vajrayana — together with ethical discipline and study. Lay Buddhists support monks and nuns with food and gifts, make offerings at temples and stupas, chant, and keep observance days.",
      "Monastic life is central to most Buddhist traditions, under a code of discipline (the Vinaya). Major festivals include Vesak (in many countries Buddha Day), celebrating the Buddha's birth, awakening and death. Pilgrimage to Lumbini, Bodh Gaya, Sarnath and Kushinagar is a long-standing practice.",
    ],
    structure: [
      "Buddhism has no single head. Authority rests with monastic communities, lineages of teachers and, in some countries, national monastic hierarchies. The Dalai Lama is the most widely known Buddhist teacher in the West, but he leads within the Tibetan tradition, not over Buddhism as a whole.",
      "The three main branches are Theravada (the 'doctrine of the theras', the senior monks), predominant in Sri Lanka, Myanmar, Thailand, Cambodia and Laos, which keeps the Pali Canon; Mahayana ('great vehicle'), predominant in China, Japan, Korea and Vietnam, which adds further sutras and includes Zen (Chan) and Pure Land Buddhism; and Vajrayana ('diamond vehicle'), the tantric tradition of Tibet, Bhutan and Mongolia, often counted within Mahayana.",
    ],
    relationships: [
      "Buddhism arose in India alongside the Vedic and Jain traditions and shares with them the vocabulary of karma, rebirth and liberation, while rejecting the authority of the Vedas and the idea of a permanent self. It largely disappeared from India by the late Middle Ages and flourished instead from Sri Lanka to Japan.",
    ],
    viewOfJesus: [
      "Buddhism has no doctrine about Jesus. Buddhist teachers who have written about him have often admired him as a compassionate and wise teacher, and some have compared him to a bodhisattva. The Christian claims that he is the Son of God and the one saviour do not fit a tradition without a creator God.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals agree with Buddhists that human life as we live it is deeply marked by suffering, that craving and self-centredness lie near its root, and that ordinary pleasures and possessions cannot satisfy the heart.",
        "Evangelicals honour the Buddhist call to compassion, self-discipline, truthfulness and non-violence, and Christians have their own traditions of contemplative prayer and stillness before God.",
      ],
      disagreements: [
        "Evangelicals believe in a personal Creator God, the source of all being and goodness, who is known in Jesus Christ; the deepest problem is not ignorance or craving alone but sin against a holy God.",
        "Evangelicals hold that each human being is a real, created person made in God's image and loved by him, whose individual self is not dissolved but redeemed, raised and glorified.",
        "Evangelicals hold that release from sin and death is not achieved by one's own effort along a path but received as grace through Christ's death and resurrection, and that each person lives once and then faces judgement.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on whether mindfulness and meditation techniques drawn from Buddhism can be used by Christians, detached from their Buddhist purpose, or should be avoided.",
      ],
    },
    ownAnswer: [
      "Buddhists answer that the Buddha did not deny or affirm a creator because speculation about it does not end suffering, and that the path is to be tested in practice, not taken on faith. Many say that clinging to a permanent self, even an eternal one, is itself a form of the craving that causes suffering.",
      "On grace and effort, Buddhists of the Pure Land tradition answer that they too rely on the compassion of another rather than their own power. Others answer that liberation must be realised by each person, and that a teacher can show the way but cannot walk it for anyone.",
    ],
    sources: [
      {
        kind: "primary",
        label: "Setting the Wheel of Dhamma in Motion (SN 56.11), tr. Bhikkhu Sujato, SuttaCentral",
        url: "https://suttacentral.net/sn56.11/en/sujato",
        note: "the Buddha's first teaching; link only",
      },
      {
        kind: "primary",
        label: "The Dhammapada, tr. F. Max Muller, Sacred Books of the East vol. 10 (1881), on Wikisource",
        url: "https://en.wikisource.org/wiki/Sacred_Books_of_the_East/Volume_10",
      },
      {
        kind: "official",
        label: "Office of His Holiness the Dalai Lama",
        url: "https://www.dalailama.com/",
        note: "Tibetan Buddhist tradition",
      },
      {
        kind: "data",
        label: "Pew Research Center, Buddhist population change, 2010-2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/buddhist-population-change/",
      },
      {
        kind: "scholarly",
        label: "Stanford Encyclopedia of Philosophy, The Buddha",
        url: "https://plato.stanford.edu/entries/buddha/",
      },
      {
        kind: "reference",
        label: "Encyclopaedia Britannica, Buddhism",
        url: "https://www.britannica.com/topic/Buddhism",
      },
    ],
    relatedIds: ["hinduism", "confucianism"],
  },

  // ───────────────────────────────────────────────────────────────────────────── Sikhism
  {
    id: "sikhism",
    name: "Sikhism",
    alternateNames: ["Sikhi", "Gurmat"],
    area: "world-religion",
    noBibleLinks: true,
    group: "Religions from India",
    role: "Monotheistic religion founded by Guru Nanak in the Punjab",
    summary:
      "Sikhism is the monotheistic faith taught by Guru Nanak and the nine Gurus who succeeded him in the Punjab between the fifteenth and eighteenth centuries. Its scripture, the Guru Granth Sahib, is honoured as the living Guru. There are about 25 million Sikhs, most of them in India.",
    selfDescription:
      "Sikhs call their faith Sikhi, the way of the disciple (sikh). It teaches devotion to the one Creator, remembered through his Name, honest work and sharing with others, and the equality of all people. Sikhism is a distinct religion with its own scripture and Gurus, not a branch of Hinduism or a blend of Hinduism and Islam.",
    founding: {
      founders:
        "Guru Nanak (1469-1539), born at Talwandi, now Nankana Sahib in Pakistan, followed by nine human Gurus. The tenth, Guru Gobind Singh, founded the Khalsa in 1699 and, before his death in 1708, declared the scripture itself to be the Guru from then on.",
      founderKind: "single",
      date: "c. AD 1500 (Guru Nanak's call, by Sikh tradition)",
      dateNote:
        "By Sikh tradition Guru Nanak received his call after disappearing into the river at Sultanpur Lodhi at about the age of thirty, around 1499-1500; the exact year is not certain. Other fixed points are the compilation of the scripture by Guru Arjan in 1604 and the founding of the Khalsa in 1699.",
      place: "The Punjab",
    },
    adherents: {
      figure: "about 25 million",
      counts: "Sikhs worldwide, more than nine in ten of them in India (World Religion Database estimate)",
      year: "c. 2010, reported 2012",
      source: {
        label: "Pew Research Center, Global Religious Landscape: Other Religions (2012), citing the World Religion Database",
        url: "https://www.pewresearch.org/religion/2012/12/18/global-religious-landscape-other/",
      },
      verified: true,
      note:
        "No newer global count is published by Pew, whose 2025 report counts Sikhs within 'other religions' without a separate figure. India's 2011 census counted nearly 21 million Sikhs, about 1.7% of the population, most of them in the state of Punjab (Pew Research Center, 2021). Large communities live in Canada, the United Kingdom and the United States.",
    },
    distinctives: [
      "Sikhism's scripture is its Guru. The Guru Granth Sahib, compiled by Guru Arjan and completed by Guru Gobind Singh, gathers hymns of the Sikh Gurus together with hymns of Hindu and Muslim holy men whose teaching agreed with theirs. It is treated with the respect due to a living teacher — installed on a raised throne under a canopy, read with a whisk waved over it, and consulted for guidance.",
      "Sikhism rejects caste, ritualism and idol worship and teaches the equality of men and women. That is embodied in the langar, the free community kitchen of every gurdwara, where all sit together and eat the same food regardless of caste, class or religion.",
      "Initiated Sikhs of the Khalsa keep the Five Ks: kesh (uncut hair, usually covered by a turban), kangha (a wooden comb), kara (a steel bracelet), kachera (a cotton undergarment) and kirpan (a ceremonial sword). The turban is a mark of Sikh identity, often mistaken in the West for something else.",
    ],
    beliefs: [
      {
        label: "God",
        statement:
          "There is one God, Ik Onkar, the Creator, the eternal Truth, without fear or enmity, beyond time and birth, known by the grace of the Guru — the substance of the Mul Mantar, which opens the Guru Granth Sahib. God is beyond form yet present in all creation, and is not incarnated in human form.",
      },
      {
        label: "The Name",
        statement:
          "Liberation comes through remembering God's Name (nam simran) in meditation and devotion, by the grace of the Guru.",
      },
      {
        label: "The Guru",
        statement:
          "God's will was revealed through the ten Gurus, and now through the Guru Granth Sahib (the scripture) and the Guru Panth (the community of the Khalsa).",
      },
      {
        label: "The human problem",
        statement:
          "Human beings are separated from God by haumai, ego or self-centredness, and by the vices of lust, anger, greed, attachment and pride.",
      },
      {
        label: "Karma and liberation",
        statement:
          "The soul passes through cycles of birth and death according to karma, but by God's grace it can be liberated (mukti) and united with God, even in this life.",
      },
      {
        label: "Three duties",
        statement:
          "Remember God (naam japna), earn an honest living (kirat karni) and share with others (vand chhakna).",
      },
      {
        label: "Equality and service",
        statement:
          "All human beings are equal before God, regardless of caste, sex or religion. Selfless service (seva) is a central expression of devotion.",
      },
    ],
    practices: [
      "Sikhs gather in the gurdwara ('door of the Guru') for kirtan (the singing of hymns from the scripture), prayer and langar. Devout Sikhs rise early, bathe and recite the morning prayers, beginning with Guru Nanak's Japji Sahib, and say evening and night prayers. The Harmandir Sahib (the Golden Temple) in Amritsar is the holiest gurdwara.",
      "Initiation into the Khalsa is by the amrit ceremony. Sikh men commonly take the name Singh and women Kaur. Sikhs mark the Gurus' birthdays and martyrdoms, and Vaisakhi, the anniversary of the founding of the Khalsa. The code of conduct (the Sikh Rehat Maryada) is issued by the Shiromani Gurdwara Parbandhak Committee.",
    ],
    structure: [
      "Sikhism has no clergy in the sense of priests; any Sikh, man or woman, may lead worship. The granthi reads the scripture and cares for the gurdwara. The Akal Takht in Amritsar is the highest seat of Sikh temporal authority, and its jathedar can issue directives to the community. The Shiromani Gurdwara Parbandhak Committee (SGPC) manages the principal gurdwaras in Punjab.",
      "Most Sikhs are not formally divided into denominations, though some groups — such as Namdharis, Nirankaris and Udasis — differ from the mainstream Khalsa tradition, and are regarded by it as outside it to varying degrees. Many Sikhs are not initiated into the Khalsa but keep the faith; some do not keep uncut hair.",
    ],
    relationships: [
      "Sikhism arose in a Punjab shaped by Hindu and Muslim devotional movements, and its scripture includes hymns by Hindu and Muslim saints. Sikhs nevertheless regard their faith as a new and independent revelation. Its history includes the martyrdom of Guru Arjan in 1606 and of Guru Tegh Bahadur in 1675 under the Mughal rulers, and violent episodes in the twentieth century, including the storming of the Golden Temple in 1984 and the anti-Sikh massacres that followed the assassination of Indira Gandhi that year.",
    ],
    viewOfJesus: [
      "Sikhism has no doctrine concerning Jesus. Sikhs generally respect holy people of every faith and may honour Jesus as a holy man, but Sikh teaching that God is beyond birth and is not incarnated means they do not accept that he is God in human form.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals share the Sikh belief in one sovereign Creator God who is not an idol and cannot be bound by ritual, and the conviction that God's grace — not birth, caste or ceremony — is what brings a person to him.",
        "Evangelicals admire the Sikh commitment to honest work, generosity, the equality of all people and hospitality to strangers; the langar is a picture of the welcome the church is meant to give.",
      ],
      disagreements: [
        "Evangelicals believe that God, without ceasing to be God, became a human being in Jesus Christ, and that he is revealed as Father, Son and Holy Spirit.",
        "Evangelicals hold that the human problem is sin against a holy God, not only ego, and that grace comes through Christ's atoning death and resurrection rather than through remembering the Name; and that each person lives once rather than passing through rebirth.",
      ],
    },
    ownAnswer: [
      "Sikhs answer that God, being beyond birth and death, does not take human form, and that the Gurus were enlightened teachers through whom God's word came, not God himself. They hold that grace is real and freely given, but that it is received through the Guru's word and the remembrance of the Name.",
      "Sikhs also answer that no one religion owns God, and that the Guru Granth Sahib's inclusion of Hindu and Muslim saints shows that truth may be found wherever God is truly remembered.",
    ],
    sources: [
      {
        kind: "official",
        label: "Shiromani Gurdwara Parbandhak Committee (SGPC)",
        url: "https://sgpc.net/",
      },
      {
        kind: "official",
        label: "Sikh Rehat Maryada (code of conduct), SGPC",
        url: "https://sgpc.net/sikh-rehat-maryada-in-english/",
      },
      {
        kind: "primary",
        label: "Sri Granth: the Guru Granth Sahib online",
        url: "https://www.srigranth.org/",
        note: "link only",
      },
      {
        kind: "data",
        label: "Pew Research Center, Global Religious Landscape: Other Religions (2012)",
        url: "https://www.pewresearch.org/religion/2012/12/18/global-religious-landscape-other/",
      },
      {
        kind: "data",
        label: "Pew Research Center, Population growth and religious composition (India, 2021)",
        url: "https://www.pewresearch.org/religion/2021/09/21/population-growth-and-religious-composition/",
        note: "India 2011 census figures",
      },
      {
        kind: "reference",
        label: "SikhNet",
        url: "https://www.sikhnet.com/",
        note: "Sikh community resource",
      },
      {
        kind: "reference",
        label: "Encyclopaedia Britannica, Sikhism",
        url: "https://www.britannica.com/topic/Sikhism",
      },
    ],
    relatedIds: ["hinduism", "islam"],
  },

  // ───────────────────────────────────────────────────────────────────────────── Confucianism
  {
    id: "confucianism",
    name: "Confucianism",
    alternateNames: ["Ru tradition", "Rujia", "Rujiao"],
    area: "world-religion",
    noBibleLinks: true,
    group: "East Asian traditions",
    role: "Ethical and religious tradition of China and East Asia rooted in the teaching of Confucius",
    summary:
      "Confucianism is the tradition of ethics, ritual, learning and government that traces itself to Confucius (Kongzi) in China around 500 BC. It shaped the family life, education and statecraft of China, Korea, Vietnam and Japan for two thousand years. Whether it is a religion, a philosophy or both is itself debated.",
    selfDescription:
      "In Chinese the tradition is called the teaching of the Ru, the scholars. Its followers describe it as a way of becoming fully human through moral cultivation — learning, ritual propriety and humaneness — expressed first in the family and then in society and government, in harmony with Heaven (Tian). Confucius described himself as a transmitter of the ancient ways rather than an originator.",
    founding: {
      founders:
        "Confucius (Kong Qiu, honoured as Kongzi, 'Master Kong'), traditionally 551-479 BC, of the state of Lu in present-day Shandong. He did not found a religion or an institution; his disciples recorded his sayings in the Analects, and later thinkers, above all Mencius and Xunzi, developed his teaching. Confucius regarded himself as passing on the wisdom of the early Zhou kings.",
      founderKind: "single",
      date: "c. 500 BC (the teaching of Confucius)",
      dateNote:
        "Confucius's dates are the traditional ones. The tradition became the official orthodoxy of the Chinese state under the Han dynasty in the second century BC, and was reshaped as Neo-Confucianism from the eleventh and twelfth centuries AD, above all by Zhu Xi (1130-1200).",
      place: "The state of Lu, eastern China",
    },
    adherents: {
      figure: "No reliable count",
      counts:
        "nothing directly: Confucianism has no membership or initiation to count, and Pew makes no estimate of the number of Confucians",
      year: "no estimate published",
      source: {
        label: "Pew Research Center, Confucianism, Taoism and Chinese folk religions (2023)",
        url: "https://www.pewresearch.org/religion/2023/08/30/confucianism-taoism-and-chinese-folk-religions/",
      },
      verified: true,
      note:
        "Pew does not estimate a number of Confucians and does not analyse Confucianism as a religious affiliation; it notes that many people in China, and the Chinese government, do not regard it as a religion. In the 2018 Chinese General Social Survey, three-quarters of Chinese adults said they had visited a family member's grave at least once in the past year — a practice of filial piety that Confucian ethics and Chinese folk religion share.",
    },
    classificationNote:
      "Confucianism appears in this section because it has shaped the moral and ritual life of China, Korea, Vietnam and Japan as a religion would, and because many scholars treat it as one. Many of its own heirs, and the Chinese state, describe it instead as a philosophy or ethical tradition. This article does not settle the question.",
    distinctives: [
      "Confucianism is concerned above all with how to live well with others. Its focus is the cultivation of virtue — humaneness, righteousness, ritual propriety, wisdom and trustworthiness — and its ideal is the junzi, the noble or exemplary person, whose character transforms those around them. Confucius taught that a ruler governs best by moral example rather than by force.",
      "The family is the root of the moral life. Filial piety (xiao) — respect, care and reverence for parents and ancestors, during their lives and after their deaths — is the first of the virtues, and the five relationships (ruler and subject, parent and child, husband and wife, elder and younger sibling, friend and friend) frame mutual duties.",
      "Confucius spoke little of gods or the afterlife and counselled reverence for spirits while keeping a distance from them, yet he spoke of Heaven as a moral power that had given him his mission. Ritual (li), including the rites to ancestors and to Heaven, was for him the form in which reverence and right relationship are lived.",
    ],
    beliefs: [
      {
        label: "Heaven (Tian)",
        statement:
          "Heaven is the moral order and highest power of the universe. Rulers govern by the Mandate of Heaven, which is lost when they govern unjustly.",
      },
      {
        label: "Human nature",
        statement:
          "Human beings are capable of becoming good through learning and self-cultivation. Mencius taught that human nature is originally good; Xunzi that it must be reformed by ritual and education. The mainstream tradition followed Mencius.",
      },
      {
        label: "Humaneness (ren)",
        statement:
          "The supreme virtue is ren — humaneness, benevolence, love for others — summarised in the principle not to do to others what one would not wish done to oneself.",
      },
      {
        label: "Ritual propriety (li)",
        statement:
          "Ritual and propriety, from state ceremony to daily courtesy, shape character and order society.",
      },
      {
        label: "Filial piety (xiao)",
        statement:
          "Honouring parents and ancestors is the foundation of virtue and of social harmony.",
      },
      {
        label: "Learning",
        statement:
          "Moral improvement comes through study of the classics, reflection and practice; education is open to anyone willing to learn.",
      },
      {
        label: "Government",
        statement:
          "Good government rests on the virtue of rulers and officials, who should be chosen for merit and learning.",
      },
    ],
    practices: [
      "The central religious practice associated with Confucianism is the veneration of ancestors — offerings and bows before ancestral tablets at home or in clan halls, and the tending of graves, especially at the Qingming festival. Temples of Confucius, the greatest at his birthplace in Qufu, hold ceremonies in his honour, notably on his traditional birthday.",
      "For most of its history Confucianism was practised through education: study of the Four Books (the Analects, the Mencius, the Great Learning and the Doctrine of the Mean) and the Five Classics, which formed the basis of China's imperial civil-service examinations until they were abolished in 1905.",
    ],
    structure: [
      "Confucianism has no church, clergy or membership. Its institutions were historically the imperial state, the academies, the examination system, the family and the clan. Many East Asians who live by Confucian values also take part in Buddhist, Daoist, folk, Shinto or Christian practice, without any sense of contradiction.",
      "Its main phases are classical Confucianism (Confucius, Mencius, Xunzi); Han Confucianism, the state orthodoxy; Neo-Confucianism, including the school of Zhu Xi and the school of Wang Yangming; and twentieth-century New Confucianism. Korea's Joseon dynasty (1392-1910) was one of the most thoroughly Confucian states in history.",
    ],
    relationships: [
      "Confucianism, Daoism and Buddhism are traditionally called China's 'three teachings', and they borrowed from one another for centuries. Christianity met Confucianism through the Jesuit missionary Matteo Ricci (1552-1610), who argued that ancestor rites were civil honours compatible with the faith. The papacy ruled against that view in the eighteenth century in the Chinese Rites controversy and relaxed the ruling in 1939.",
    ],
    viewOfJesus: [
      "Confucianism has no teaching about Jesus. Chinese Christians and Confucian scholars have often compared his ethical teaching, especially the golden rule, with Confucius's, while noting that Confucianism makes no claim about a saviour or about a God who becomes human.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals share Confucianism's high view of the family, of honouring father and mother, of education, diligence and personal integrity, and its conviction that rulers are morally accountable to a higher order. Confucius's negative form of the golden rule stands close to Jesus's positive form.",
        "Evangelicals recognise in the Confucian sense of Heaven and of conscience a witness to the moral order that God has written on human hearts.",
      ],
      disagreements: [
        "Evangelicals believe human beings cannot become good through learning and self-cultivation alone, because the problem is sin against God, which only his grace in Christ can forgive and heal.",
        "Evangelicals believe that Heaven is not an impersonal moral order but the living, personal God, who has spoken in Christ and who alone is to be worshipped.",
      ],
      evangelicalsDiffer: [
        "Asian evangelical churches differ on ancestor rites: some hold that bowing before ancestral tablets and offering food is worship of the dead and must be given up; others hold that some forms are expressions of filial respect that a Christian may keep, and have developed Christian memorial services in their place.",
      ],
    },
    ownAnswer: [
      "Confucians answer that the tradition is not a rival religion but a way of being human that leaves questions about gods and the afterlife open, and that many Confucians have also been Buddhists, Daoists or Christians. They regard ancestor rites as gratitude and remembrance, not as worship of gods.",
      "Confucians also answer that human beings have within them the seeds of goodness, as Mencius taught, and that moral education and good example, not a doctrine of sin, are what bring them to flower.",
    ],
    sources: [
      {
        kind: "primary",
        label: "The Confucian Analects, tr. James Legge (1861; 1893 ed.), on Wikisource",
        url: "https://en.wikisource.org/wiki/The_Chinese_Classics/Volume_1/Confucian_Analects",
        note: "link only",
      },
      {
        kind: "primary",
        label: "Chinese Text Project: the Analects (Chinese with Legge's translation)",
        url: "https://ctext.org/analects",
        note: "link only",
      },
      {
        kind: "data",
        label: "Pew Research Center, Confucianism, Taoism and Chinese folk religions (2023)",
        url: "https://www.pewresearch.org/religion/2023/08/30/confucianism-taoism-and-chinese-folk-religions/",
      },
      {
        kind: "scholarly",
        label: "Stanford Encyclopedia of Philosophy, Confucius",
        url: "https://plato.stanford.edu/entries/confucius/",
      },
      {
        kind: "reference",
        label: "Encyclopaedia Britannica, Confucianism",
        url: "https://www.britannica.com/topic/Confucianism",
      },
    ],
    relatedIds: ["buddhism"],
  },

  // ───────────────────────────────────────────────────────────────── Latter-day Saints
  {
    id: "latter-day-saints",
    name: "The Church of Jesus Christ of Latter-day Saints",
    alternateNames: ["Latter-day Saints", "Mormonism", "LDS Church", "Mormons"],
    area: "world-religion",
    group: "Movements from a Christian background",
    role: "Restorationist church organised in 1830",
    summary:
      "The Church of Jesus Christ of Latter-day Saints, headquartered in Salt Lake City, Utah, teaches that it is the restoration of the original church of Jesus Christ, re-established in 1830 through a modern prophet. It accepts the Bible together with the Book of Mormon and other modern scripture, and reports nearly 17.9 million members.",
    selfDescription:
      "Latter-day Saints describe themselves as Christians who worship God the Eternal Father and his Son Jesus Christ, the Savior of the world. They believe that after the apostles died the church fell into apostasy, and that God restored it — its priesthood, ordinances and continuing revelation — through a latter-day prophet. The Church asks to be called by its full name, its members 'Latter-day Saints', and discourages the terms 'Mormon', 'LDS' and 'Mormonism'.",
    classificationNote:
      "Latter-day Saints identify as Christians and regard their church as the restored church of Jesus Christ. This app files it with other movements from a Christian background rather than among the Christian denominations. That filing is the app's editorial judgement, not a neutral fact, and it is disputed. The criterion is the one shared by Catholic, Orthodox and Protestant churches: whether a body confesses the doctrine of God set out in the Nicene Creed. The Church's own teaching is that 'the members of the Godhead are three separate beings', the Father and the Son having bodies of flesh and bones (Gospel Topics, 'Godhead'; Doctrine and Covenants 130:22), which it holds in place of the Nicene doctrine of one God in three persons.",
    founding: {
      founders:
        "Joseph Smith (1805-1844). Latter-day Saints regard Christ as the founder of his church and Joseph Smith as the prophet through whom it was restored. Smith taught that God the Father and Jesus Christ appeared to him in a grove near Palmyra, New York (the First Vision), and that an angel, Moroni, led him to golden plates which he translated by divine power as the Book of Mormon, published in March 1830.",
      founderKind: "single",
      date: "6 April 1830",
      dateNote:
        "The Church was formally organised on 6 April 1830. Joseph Smith's 1838 account dates the First Vision to the spring of 1820; the Church has published his several accounts of it, which differ in detail, in its Gospel Topics essays.",
      place: "Fayette, New York, by the Church's account",
    },
    adherents: {
      figure: "17,887,212",
      counts: "members on the Church's own records worldwide",
      year: "31 December 2025",
      source: {
        label: "The Church of Jesus Christ of Latter-day Saints, 2025 Statistical Report (April 2026)",
        url: "https://newsroom.churchofjesuschrist.org/article/2025-statistical-report",
      },
      verified: true,
      note:
        "Reported at the April 2026 general conference. This is a church membership count, not a survey of who attends or self-identifies, so it is not directly comparable with the survey figures elsewhere in this section. Surveys of US adults find fewer people identifying as Latter-day Saints than appear on the Church's US rolls; the two count different things.",
    },
    distinctives: [
      "Latter-day Saints believe in an open canon and continuing revelation. Besides the Bible (in English, the King James Version), they accept the Book of Mormon — which they regard as another testament of Jesus Christ, an account of ancient peoples of the Americas whom the risen Christ visited — the Doctrine and Covenants, and the Pearl of Great Price. The President of the Church is sustained as a living prophet, seer and revelator.",
      "They teach that God restored the priesthood authority lost in the apostasy, and that ordinances performed by that authority — baptism, confirmation, and temple ordinances, including the sealing of families for eternity — are necessary for exaltation. Ordinances may be performed in temples on behalf of the dead, who may accept or reject them, which is why Latter-day Saints are committed to family history.",
      "They teach that human beings lived as spirit children of Heavenly Parents before birth, that life on earth is a time of testing and growth, and that through the Atonement of Jesus Christ God's children may progress to become like him — the doctrine of exaltation.",
    ],
    beliefs: [
      {
        label: "The Godhead",
        statement:
          "God the Eternal Father, his Son Jesus Christ and the Holy Ghost are three distinct beings, one in purpose. The Father and the Son have glorified bodies of flesh and bones; the Holy Ghost is a personage of spirit (Articles of Faith 1; Doctrine and Covenants 130:22).",
      },
      {
        label: "Jesus Christ",
        statement:
          "Jesus Christ is the Son of God, the Savior and Redeemer of the world, who suffered for the sins of all in Gethsemane and on the cross, rose bodily, and will come again. Salvation is only through him.",
      },
      {
        label: "Apostasy and Restoration",
        statement:
          "After the deaths of the apostles, the authority and many truths of Christ's church were lost; they were restored through the Church's founding prophet, and the Church of Jesus Christ is that restored church.",
      },
      {
        label: "Scripture",
        statement:
          "The Bible is the word of God as far as it is translated correctly; the Book of Mormon is the word of God (Articles of Faith 8); further revelation is recorded in the Doctrine and Covenants and the Pearl of Great Price.",
      },
      {
        label: "Human beings",
        statement:
          "Every person is literally a spirit child of Heavenly Parents, existed before mortal birth, and has divine potential. People will be punished for their own sins and not for Adam's transgression (Articles of Faith 2).",
      },
      {
        label: "Salvation and exaltation",
        statement:
          "Through Christ's Atonement all will be resurrected, and all may be saved by obedience to the laws and ordinances of the gospel — faith in Christ, repentance, baptism by immersion and the gift of the Holy Ghost (Articles of Faith 3-4). Exaltation, eternal life with God as families, requires ordinances performed in temples.",
      },
      {
        label: "The afterlife",
        statement:
          "After all are resurrected, nearly all people will receive a kingdom of glory — the celestial, terrestrial or telestial — according to the light they received and their faithfulness.",
      },
      {
        label: "Prophets",
        statement:
          "God calls living prophets and apostles. The First Presidency and the Quorum of the Twelve Apostles are sustained as prophets, seers and revelators.",
      },
    ],
    practices: [
      "Members attend weekly sacrament meeting in local congregations (wards), where bread and water are blessed and passed in remembrance of Christ, followed by classes. Congregations are led by lay leaders; there is no paid local clergy. Worthy male members may be ordained to the priesthood; women serve in the Relief Society and other callings.",
      "Members keep the Word of Wisdom (abstaining from alcohol, tobacco, coffee and tea), pay tithing of a tenth of income, and fast monthly, giving the cost of the meals to the poor. Temples, distinct from meetinghouses, are open to members holding a temple recommend, for endowment and sealing ordinances. Many young members serve full-time missions.",
    ],
    structure: [
      "The Church is led by the First Presidency — the President and his two counsellors — and the Quorum of the Twelve Apostles, with further quorums of Seventy. Wards and branches are grouped into stakes. The 2025 statistical report lists 3,695 stakes and 204 temples in operation.",
      "Other churches trace their origin to the same founding prophet, most notably the Community of Christ (formerly the Reorganized Church of Jesus Christ of Latter Day Saints), which today is closer to mainline Protestantism, and small groups that continue plural marriage, which the Church of Jesus Christ abandoned in 1890 and excommunicates for practising.",
    ],
    relationships: [
      "Latter-day Saints share with other Christians belief in the Bible, in Jesus as the Son of God and Savior, in his atoning death and bodily resurrection, and in his return. They decline to adopt the creeds of the fourth and fifth centuries, which they regard as products of the apostasy, and most Catholic, Orthodox and Protestant churches do not recognise Latter-day Saint baptism.",
    ],
    viewOfJesus: [
      "Jesus Christ is at the centre of Latter-day Saint faith: the firstborn spirit child of the Father, the Jehovah of the Old Testament, the Only Begotten Son in the flesh, who atoned for the sins of the world, rose from the dead and will return to reign. The Book of Mormon records his appearance to people in the Americas after his resurrection.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals share with Latter-day Saints a love of the Bible, faith in Jesus as Son of God and Savior, belief in his atoning death, bodily resurrection and return, and a commitment to prayer, family, moral seriousness and service. Many evangelicals have learned from Latter-day Saint care for the poor and devotion to family.",
      ],
      disagreements: [
        "Evangelicals hold that there is one God, eternally God, who never was a man and beside whom there was and will be no other (Isaiah 43:10), revealed as Father, Son and Spirit — one being in three persons, as the Nicene Creed confesses. The teaching that the Father has a body of flesh and bone, and that human beings may become gods, is in their view a different doctrine of God.",
        "Evangelicals hold that the faith was delivered once for all, that the church never wholly apostatised (Matthew 16:18), and that the Bible is the sufficient and final written word of God; they do not accept the Book of Mormon as scripture, and point to the absence of archaeological evidence for its peoples.",
        "Evangelicals hold that salvation and eternal life are a free gift received through faith in Christ alone (Ephesians 2:8-9), not dependent on priesthood ordinances.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on tone and approach: some engage Latter-day Saints chiefly through apologetics, others through long-term dialogue — such as the evangelical-Latter-day Saint conversations among scholars since the late 1990s — and they differ on how far joint action on moral and social causes is appropriate.",
      ],
    },
    ownAnswer: [
      "Latter-day Saints answer that they worship the Father in the name of Jesus Christ and rely wholly on his grace, and that the Book of Mormon teaches that salvation comes only through his merits. They hold that the Nicene Creed reflects Hellenistic philosophy rather than the Bible, which shows the Father and Son as distinct (for example at Jesus's baptism), and that the Bible itself speaks of human beings as God's offspring (Acts 17:29).",
      "They answer too that the Bible nowhere says revelation has ceased, that a living church needs living prophets, and that the Book of Mormon is to be tested by prayer, as it invites (Moroni 10:4), rather than by outside argument alone. Many add that being told they are not Christian is painful to people who centre their lives on Christ.",
    ],
    sources: [
      {
        kind: "official",
        label: "The Church of Jesus Christ of Latter-day Saints, Gospel Topics: Godhead",
        url: "https://www.churchofjesuschrist.org/study/manual/gospel-topics/godhead?lang=eng",
      },
      {
        kind: "official",
        label: "The Articles of Faith (Pearl of Great Price)",
        url: "https://www.churchofjesuschrist.org/study/scriptures/pgp/a-of-f/1?lang=eng",
      },
      {
        kind: "official",
        label: "Doctrine and Covenants 130",
        url: "https://www.churchofjesuschrist.org/study/scriptures/dc-testament/dc/130?lang=eng",
      },
      {
        kind: "official",
        label: "Gospel Topics essay: Becoming Like God",
        url: "https://www.churchofjesuschrist.org/study/manual/gospel-topics-essays/becoming-like-god?lang=eng",
      },
      {
        kind: "official",
        label: "Gospel Topics essay: First Vision Accounts",
        url: "https://www.churchofjesuschrist.org/study/manual/gospel-topics-essays/first-vision-accounts?lang=eng",
      },
      {
        kind: "official",
        label: "Gospel Topics essay: Are \"Mormons\" Christian?",
        url: "https://www.churchofjesuschrist.org/study/manual/gospel-topics-essays/christians?lang=eng",
      },
      {
        kind: "official",
        label: "Newsroom: 2025 Statistical Report",
        url: "https://newsroom.churchofjesuschrist.org/article/2025-statistical-report",
      },
      {
        kind: "official",
        label: "Newsroom: Style guide — the name of the Church",
        url: "https://newsroom.churchofjesuschrist.org/style-guide",
      },
      {
        kind: "primary",
        label: "The Book of Mormon (1830 first edition), on Wikisource",
        url: "https://en.wikisource.org/wiki/Book_of_Mormon_(1830)",
      },
      {
        kind: "reference",
        label: "Encyclopaedia Britannica, Church of Jesus Christ of Latter-day Saints",
        url: "https://www.britannica.com/topic/Church-of-Jesus-Christ-of-Latter-day-Saints",
      },
    ],
    relatedIds: ["jehovahs-witnesses"],
  },

  // ───────────────────────────────────────────────────────────────── Jehovah's Witnesses
  {
    id: "jehovahs-witnesses",
    name: "Jehovah's Witnesses",
    alternateNames: ["Watch Tower Society", "Bible Students"],
    area: "world-religion",
    group: "Movements from a Christian background",
    role: "Restorationist Bible movement that grew from the Bible Students of Charles Taze Russell",
    summary:
      "Jehovah's Witnesses are a worldwide movement, which identifies as Christian, that grew from a Bible study group around Charles Taze Russell near Pittsburgh in the 1870s. They are known for door-to-door and public preaching, for using the name Jehovah for God, and for teaching that God's Kingdom, ruled by Christ since 1914, will soon replace human governments. They report a peak of about 9.2 million active members.",
    selfDescription:
      "Witnesses describe themselves as Christians who follow the teachings and example of Jesus and seek to practise the Christianity of the first century. They take their name from Isaiah 43:10 ('you are my witnesses'). They regard Jesus, not Charles Taze Russell, as the founder of their organisation, and say Russell was not the founder of a new religion.",
    classificationNote:
      "Jehovah's Witnesses identify as Christians. This app files them with other movements from a Christian background rather than among the Christian denominations. That filing is the app's editorial judgement, not a neutral fact, and it is disputed. The criterion is the one shared by Catholic, Orthodox and Protestant churches: whether a body confesses the doctrine of God set out in the Nicene Creed. The Witnesses' own published teaching is that there is no Scriptural basis for the Trinity, that 'Jesus is not Almighty God' but God's first creation, and that 'the holy spirit is not a person' but God's active force (jw.org).",
    founding: {
      founders:
        "Witnesses regard Jesus as the founder of their organisation. Historically, the movement grew from a Bible study group formed in the 1870s around Charles Taze Russell (1852-1916), who led its Bible education work and was the first editor of the magazine now called The Watchtower. Under his successor, Joseph Franklin Rutherford, the Bible Students adopted the name Jehovah's witnesses in 1931.",
      founderKind: "single",
      date: "1870s (Bible Student movement); 1879 (Zion's Watch Tower first published); 1931 (name adopted)",
      dateNote:
        "Witnesses' own account dates their beginnings only to the end of the nineteenth century and treats the movement as a return to first-century Christianity, not the start of a new religion.",
      place: "Allegheny (now part of Pittsburgh), Pennsylvania",
    },
    adherents: {
      figure: "9,205,326",
      counts:
        "peak publishers — Witnesses actively preaching, baptized and unbaptized, counted as the sum of each country's monthly peak",
      year: "2025 service year, 1 September 2024 to 31 August 2025",
      source: {
        label: "Jehovah's Witnesses, How Many of Jehovah's Witnesses Are There Worldwide? (jw.org)",
        url: "https://www.jw.org/en/jehovahs-witnesses/faq/how-many-jw/",
      },
      verified: true,
      note:
        "The same 2025 report gives an average of 9,047,083 publishers a month and an attendance of 20,635,015 at the annual Memorial of Christ's death, which includes many who are not counted as Witnesses. Because the count includes only active preachers, it is stricter than most churches' membership figures.",
    },
    distinctives: [
      "Witnesses are best known for their preaching. Every Witness is a minister, and they go from house to house, set up literature carts in public places and offer free Bible studies, using publications produced by the Watch Tower Bible and Tract Society. They meet in Kingdom Halls, not churches, and have no paid clergy.",
      "They hold that God's personal name is Jehovah and should be used, and they use their own translation, the New World Translation of the Holy Scriptures. They do not celebrate Christmas, Easter or birthdays, which they regard as having pagan origins or as unscriptural; the only religious anniversary they observe is the Memorial of Christ's death.",
      "They practise strict political neutrality — they do not vote for political parties or candidates, go to war or salute national flags (the subject of the 1943 US Supreme Court case West Virginia State Board of Education v. Barnette) — which has led to imprisonment in many countries, including in Nazi Germany, where Witnesses were sent to concentration camps. They refuse blood transfusions, on the basis of the biblical command to abstain from blood (Acts 15:28-29), while accepting medical alternatives.",
    ],
    beliefs: [
      {
        label: "God",
        statement:
          "Jehovah is the one true and Almighty God, the Creator, the God of Abraham, Moses and Jesus. There is no Scriptural basis for the Trinity.",
      },
      {
        label: "Jesus",
        statement:
          "Jesus is the Son of God and the Savior, but he is not Almighty God. He was God's first creation, existed in heaven as a spirit before his human birth, and is identified with the archangel Michael. His death was a ransom that opens the way to everlasting life.",
      },
      {
        label: "The holy spirit",
        statement:
          "The holy spirit is not a person but God's power in action, his active force.",
      },
      {
        label: "The Bible",
        statement:
          "All sixty-six books of the Bible are God's inspired word and the basis of belief; parts of it are figurative.",
      },
      {
        label: "Death and the soul",
        statement:
          "The soul is the living person, not an immortal part of them. The dead cease to exist and await resurrection; there is no hell of eternal torment. Those who finally reject God are destroyed for ever.",
      },
      {
        label: "God's Kingdom",
        statement:
          "God's Kingdom is a real government in heaven with Jesus as King, which began ruling in 1914 and will soon replace human governments in the war of God the Almighty (Revelation 16:14-16).",
      },
      {
        label: "Heaven and earth",
        statement:
          "A limited number, 144,000, are raised to life in heaven to rule with Christ. Most of the faithful will live for ever in perfect health on a restored paradise earth.",
      },
      {
        label: "Salvation",
        statement:
          "Salvation requires faith in Jesus's ransom, a changed life in obedience to God, baptism, and faithfulness to the end.",
      },
    ],
    practices: [
      "Congregations meet twice a week in Kingdom Halls for Bible talks and study of The Watchtower, and Witnesses gather for regional conventions each year. Baptism is by full immersion for those who have studied and dedicated themselves to Jehovah. The Memorial of Christ's death is held once a year on the date of Passover; only those who believe they are of the 144,000 partake of the bread and wine.",
      "Witnesses who commit serious sins and do not repent are removed from the congregation (formerly called disfellowshipping). The Witnesses' own literature says members stop keeping company with them (1 Corinthians 5:11), while letting them attend meetings and welcoming them back on repentance, and that within a household marriage and normal family affection continue. Former members and others describe the practice as shunning, and it has been examined by governments and courts in several countries; in Belgium, a 2021 criminal conviction over it was overturned on appeal in 2022, and the Court of Cassation upheld the acquittal in 2023.",
    ],
    structure: [
      "Jehovah's Witnesses are directed by the Governing Body, a small group of anointed Witnesses at world headquarters in Warwick, New York, whom Witnesses regard as the 'faithful and discreet slave' of Matthew 24:45. Legal and publishing work is done through the Watch Tower Bible and Tract Society of Pennsylvania and related corporations. Branch offices oversee the work in each region, and each congregation is cared for by a body of unpaid overseers.",
      "The movement is unified, without denominations. Several small groups continue the Bible Student tradition from before 1931 independently of the Watch Tower Society.",
    ],
    relationships: [
      "Witnesses regard the churches of Christendom as having departed from the Bible, especially in teaching the Trinity, the immortality of the soul and hell, and in taking part in politics and war. They do not join in interfaith worship, and most other Christian churches do not recognise their baptism.",
    ],
    viewOfJesus: [
      "Jesus is God's only-begotten Son, his first creation, through whom all other things were made; he lived as a perfect man, died as a ransom on a torture stake rather than a cross, was raised as a spirit, and now rules as King of God's Kingdom. Witnesses honour and obey him but worship Jehovah alone.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals admire the Witnesses' devotion to the Bible, their personal witness, their moral discipline, their courage under persecution — including under the Nazis — and their insistence that faith shape the whole of life.",
        "Evangelicals agree with them that God's name and holiness matter, that Jesus's death was a ransom for many, and that Christ will return to judge and to renew creation.",
      ],
      disagreements: [
        "Evangelicals believe Jesus is not a created being but the eternal Word who was with God and was God (John 1:1), who could say 'before Abraham was, I am' (John 8:58), and whom Thomas confessed as 'My Lord and my God' (John 20:28). They read 'the firstborn of all creation' (Colossians 1:15) as a title of pre-eminence, since the next verse says all things were created by him.",
        "Evangelicals hold that the Holy Spirit is a person, into whose name, with the Father and the Son, believers are baptized (Matthew 28:19).",
        "Evangelicals hold that salvation is by grace through faith, not by works (Ephesians 2:8-9), that every believer is a child of God with a heavenly hope, and that no human governing body speaks for God with the authority of Scripture.",
      ],
      evangelicalsDiffer: [
        "Some evangelicals share the Witnesses' conditional view of the soul and their rejection of eternal conscious torment (annihilationism, or conditional immortality); most do not. Evangelicals who hold it do so while confessing the Trinity, which is the point of difference here.",
      ],
    },
    ownAnswer: [
      "Witnesses answer that the word Trinity is not in the Bible, that the doctrine was developed in the fourth century under the influence of Platonic philosophy, and that Jesus himself said the Father is greater than he is (John 14:28). They translate John 1:1 as saying the Word 'was a god', a rendering most specialists in New Testament grammar reject but which Witnesses defend on grammatical grounds.",
      "They answer that they do put faith in Jesus's ransom, that works are the evidence of genuine faith (James 2:26), and that the Governing Body does not claim inspiration but serves as the channel through which the congregation receives spiritual food. They hold that faithful Christians in every age have been few, as Jesus said the road to life is narrow.",
    ],
    sources: [
      {
        kind: "official",
        label: "Jehovah's Witnesses, What Do Jehovah's Witnesses Believe? (jw.org)",
        url: "https://www.jw.org/en/jehovahs-witnesses/faq/jehovah-witness-beliefs/",
      },
      {
        kind: "official",
        label: "Jehovah's Witnesses, Who Is the Founder of Jehovah's Witnesses? (jw.org)",
        url: "https://www.jw.org/en/jehovahs-witnesses/faq/founder/",
      },
      {
        kind: "official",
        label: "Jehovah's Witnesses, Why Do Jehovah's Witnesses Believe Jesus Is God's Son? (jw.org)",
        url: "https://www.jw.org/en/bible-teachings/questions/jesus-son-of-god/",
      },
      {
        kind: "official",
        label: "Jehovah's Witnesses, What Is the Holy Spirit? (jw.org)",
        url: "https://www.jw.org/en/bible-teachings/questions/what-is-the-holy-spirit/",
      },
      {
        kind: "official",
        label: "Jehovah's Witnesses, FAQ on those removed from the congregation (jw.org)",
        url: "https://www.jw.org/en/jehovahs-witnesses/faq/removed-from-the-congregation/",
      },
      {
        kind: "official",
        label: "Jehovah's Witnesses, Why Don't Jehovah's Witnesses Accept Blood Transfusions? (jw.org)",
        url: "https://www.jw.org/en/jehovahs-witnesses/faq/jehovahs-witnesses-why-no-blood-transfusions/",
      },
      {
        kind: "official",
        label: "Jehovah's Witnesses, 2025 Service Year Report (jw.org)",
        url: "https://www.jw.org/en/library/books/2025-Service-Year-Report-of-Jehovahs-Witnesses-Worldwide/",
      },
      {
        kind: "official",
        label: "Jehovah's Witnesses, Are Jehovah's Witnesses Christians? (jw.org)",
        url: "https://www.jw.org/en/jehovahs-witnesses/faq/are-jehovahs-witnesses-christians/",
      },
      {
        kind: "reference",
        label: "Encyclopaedia Britannica, Jehovah's Witnesses",
        url: "https://www.britannica.com/topic/Jehovahs-Witnesses",
      },
    ],
    relatedIds: ["latter-day-saints"],
  },

  // ───────────────────────────────────────────────────────────────────────────── Atheism
  {
    id: "atheism",
    name: "Atheism",
    alternateNames: ["Atheist", "Nonbelief"],
    area: "world-religion",
    noBibleLinks: true,
    group: "Worldviews",
    role: "Worldview position: the absence of belief in God or gods",
    summary:
      "Atheism is the absence of belief in God or gods, or, in its stronger form, the view that no God exists. It is not a religion: it has no founder, scripture, creed or worship. About 5% of US adults call themselves atheists.",
    selfDescription:
      "Atheist organisations describe atheism simply as lacking belief in gods — not, in their words, 'an affirmative belief that there are not gods', and not a religion or a belief system (American Atheists). Many atheists also hold a positive worldview, such as secular humanism, but atheism itself does not supply one.",
    classificationNote:
      "Atheism is not a religion, and this app does not call it one. It appears in this section because readers meet it alongside the world's religions and ask what it holds.",
    founding: {
      founders:
        "No founder. Doubt or denial of the gods is found in the ancient world — in the materialist Carvaka school of India and among some Greek thinkers — and openly atheist books appear in modern Europe in the eighteenth century, such as Baron d'Holbach's System of Nature (1770). Modern atheism draws on the Enlightenment, on nineteenth-century critics of religion and on scientific naturalism.",
      founderKind: "none",
      date: "No founding date",
      dateNote:
        "Ironically, early Christians were themselves called 'atheists' by Romans for refusing to worship the gods of the empire.",
    },
    adherents: {
      figure: "5%",
      counts:
        "US adults who describe their religion as 'atheist' when asked their religious identity — a self-chosen label, not a direct measure of belief",
      year: "2023-24 Religious Landscape Study",
      source: {
        label: "Pew Research Center, 2023-24 Religious Landscape Study: Religious identity (2025)",
        url: "https://www.pewresearch.org/religion/2025/02/26/religious-landscape-study-religious-identity/",
      },
      verified: true,
      note:
        "Worldwide, Pew counts 1.9 billion 'religiously unaffiliated' people in 2020 (24.2% of the world), but that category combines atheists, agnostics and people who say their religion is 'nothing in particular', and Pew does not separate them; about two-thirds of the unaffiliated live in China. In the United States, 'nones' are 29% of adults, of whom atheists are 5 points. In a separate Pew survey in summer 2023, 77% of self-identified US atheists said they do not believe in God, a higher power or any spiritual force — so even the label is not a precise measure of belief.",
    },
    distinctives: [
      "Atheism is defined by what it does not hold. It makes no claim about the meaning of life, ethics or politics, and atheists hold a wide range of views on all of them. Philosophers commonly distinguish 'negative' or 'weak' atheism (simply not believing in God) from 'positive' or 'strong' atheism (believing that there is no God).",
      "Most atheists in the West ground their view in naturalism — the conviction that the natural world is all that exists and that science is the most reliable way to know it — and point to arguments such as the problem of evil and the lack of evidence they find for God. Many find meaning and ethics in human relationships, reason and the common good.",
    ],
    beliefs: [
      {
        label: "God",
        statement:
          "There is no good reason to believe that God or gods exist; strong atheists hold that none do.",
      },
      {
        label: "Knowledge",
        statement:
          "Beliefs should be held in proportion to evidence; claims about the supernatural have not met that standard. Many atheists see science as the best route to knowledge about the world.",
      },
      {
        label: "The natural world",
        statement:
          "Most atheists are naturalists: the universe and life arose by natural processes, and human beings are part of nature, without a soul that survives death.",
      },
      {
        label: "Ethics",
        statement:
          "Morality does not need God. Atheists ground it variously in human well-being, empathy, reason, social agreement or evolved moral intuitions.",
      },
      {
        label: "Meaning",
        statement:
          "Life has no meaning given from outside, but people can create and find meaning in love, work, knowledge, beauty and service.",
      },
      {
        label: "Evil",
        statement:
          "The amount and kind of suffering in the world is, for many atheists, strong evidence against an all-good and all-powerful God.",
      },
      {
        label: "Religion and society",
        statement:
          "Many atheists advocate the separation of religion and state and freedom of conscience; atheist and humanist organisations campaign for these.",
      },
    ],
    practices: [
      "Atheism has no rituals or worship. Some atheists join organisations such as American Atheists, founded in 1963, or humanist associations, which hold secular weddings, naming ceremonies and funerals. Humanists International's Amsterdam Declaration (adopted 1952, revised 2002 and 2022) sets out a non-religious ethic of reason, human dignity and responsibility that many atheists share.",
    ],
    structure: [
      "There is no structure. Atheists may be secular humanists, rationalists, skeptics, Marxists or simply indifferent to religion. Some religious traditions, such as some forms of Buddhism and some liberal Jewish communities, include people who do not believe in God, so atheism and religious practice are not always separate.",
      "In the twentieth century, Marxist-Leninist states — the Soviet Union, the People's Republic of China, Albania and others — promoted state atheism and persecuted religion. Most atheists today reject coercion in either direction, and many have themselves faced discrimination where religion is enforced by law.",
    ],
    relationships: [
      "Agnosticism is related but distinct: an agnostic holds that God's existence cannot be known, or has not been, while an atheist does not believe in God. Many people are both — not believing, and not claiming to know.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals agree with atheists that beliefs should be held honestly and with good reason, that superstition, manipulation and religious hypocrisy deserve criticism, and that the suffering in the world is a real and serious question that must not be brushed aside.",
        "Evangelicals agree that atheists can be people of real moral seriousness, and they credit the moral law atheists recognise to the God they believe has written it on every heart.",
      ],
      disagreements: [
        "Evangelicals believe God's existence and power are clearly seen in what he has made, and that the existence of the universe, its order, consciousness and the moral law point beyond nature.",
        "Evangelicals rest Christianity on a historical claim open to examination: that Jesus rose bodily from the dead. They hold that God is known not only by argument but personally, in Christ.",
        "Evangelicals hold that without God, human dignity, moral obligation and ultimate meaning lack a secure foundation.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on method — classical apologists start from arguments for God's existence, evidentialists from the historical evidence for the resurrection, presuppositionalists from the claim that reason itself depends on God — and on how to relate faith and science, including evolution.",
      ],
    },
    ownAnswer: [
      "Atheists answer that the burden of proof lies with those who claim God exists, that the arguments for God do not succeed, and that natural explanations have steadily replaced supernatural ones. On the resurrection, they answer that extraordinary claims require extraordinary evidence, and that ancient testimony from believers cannot supply it.",
      "On morality and meaning, atheists answer that many good people live ethical, meaningful lives without God, that grounding morality in divine command makes it arbitrary, and that a good God would not leave so much suffering and so much doubt about his existence.",
    ],
    sources: [
      {
        kind: "official",
        label: "American Atheists, What Is Atheism?",
        url: "https://www.atheists.org/what-is-an-atheist/",
      },
      {
        kind: "official",
        label: "Humanists International, The Amsterdam Declaration",
        url: "https://humanists.international/what-is-humanism/the-amsterdam-declaration/",
      },
      {
        kind: "data",
        label: "Pew Research Center, 2023-24 Religious Landscape Study: Religious identity (2025)",
        url: "https://www.pewresearch.org/religion/2025/02/26/religious-landscape-study-religious-identity/",
      },
      {
        kind: "data",
        label: "Pew Research Center, 8 facts about atheists (2024)",
        url: "https://www.pewresearch.org/short-reads/2024/02/07/8-facts-about-atheists/",
      },
      {
        kind: "data",
        label: "Pew Research Center, Religiously unaffiliated population change, 2010-2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/religiously-unaffiliated-population-change/",
      },
      {
        kind: "scholarly",
        label: "Stanford Encyclopedia of Philosophy, Atheism and Agnosticism",
        url: "https://plato.stanford.edu/entries/atheism-agnosticism/",
      },
    ],
    relatedIds: ["agnosticism"],
  },

  // ───────────────────────────────────────────────────────────────────────────── Agnosticism
  {
    id: "agnosticism",
    name: "Agnosticism",
    alternateNames: ["Agnostic"],
    area: "world-religion",
    noBibleLinks: true,
    group: "Worldviews",
    role: "Worldview position: that God's existence is unknown or unknowable",
    summary:
      "Agnosticism is the view that whether God exists is not known, or cannot be known. It is not a religion and has no founder, texts or practices. About 6% of US adults call themselves agnostic.",
    selfDescription:
      "Agnostics describe their position as honest uncertainty: they neither affirm nor deny God's existence, because they do not think the evidence settles it. The word was coined by the biologist T. H. Huxley, who described agnosticism not as a creed but as a method — not to claim certainty for any conclusion that has not been demonstrated.",
    classificationNote:
      "Agnosticism is not a religion, and this app does not call it one. It appears in this section because readers meet it alongside the world's religions, and many agnostics are seriously asking the questions this app exists to explore.",
    founding: {
      founders:
        "No founder. The term was coined by the English biologist T. H. Huxley (1825-1895) around 1869, as he later recounted, to describe his position among the believers and unbelievers of the Metaphysical Society, founded that year. Questioning whether the divine can be known is far older, found among ancient Greek skeptics and others.",
      founderKind: "none",
      date: "c. 1869 (the word, coined by T. H. Huxley)",
      dateNote: "The date is the coining of the term, which Huxley described in his 1889 essay 'Agnosticism' and which is conventionally dated to 1869; the position itself has no founding date.",
    },
    adherents: {
      figure: "6%",
      counts:
        "US adults who describe their religion as 'agnostic' when asked their religious identity — a self-chosen label; many people uncertain about God call themselves 'nothing in particular', atheist, or members of a religion",
      year: "2023-24 Religious Landscape Study",
      source: {
        label: "Pew Research Center, 2023-24 Religious Landscape Study: Religious identity (2025)",
        url: "https://www.pewresearch.org/religion/2025/02/26/religious-landscape-study-religious-identity/",
      },
      verified: true,
      note:
        "There is no reliable worldwide count of agnostics. Pew's global figure of 1.9 billion 'religiously unaffiliated' in 2020 combines agnostics with atheists and people who say 'nothing in particular', without separating them.",
    },
    distinctives: [
      "Agnosticism is about knowledge rather than belief. Philosophers often distinguish it from atheism this way: atheism answers 'do you believe in God?' with no, while agnosticism answers 'do you know whether God exists?' with no. A person can therefore be an agnostic atheist (not believing, without claiming to know) or, more rarely, an agnostic theist (believing, without claiming knowledge).",
      "Agnostics differ in how firmly they hold their uncertainty. Some hold only that they themselves do not know; others hold that no one can know, because the question lies beyond human reason or evidence. Many are open, and would welcome evidence either way.",
    ],
    beliefs: [
      {
        label: "God",
        statement:
          "The existence of God or gods has not been shown, and may not be knowable; the honest response is to suspend judgement.",
      },
      {
        label: "Knowledge",
        statement:
          "One should not claim certainty for a conclusion that has not been demonstrated — Huxley's principle, which he called a method rather than a creed.",
      },
      {
        label: "Openness",
        statement:
          "The question remains open. Many agnostics are willing to change their view if better evidence or argument appears.",
      },
      {
        label: "Ethics",
        statement:
          "Agnosticism carries no ethic of its own; agnostics draw their ethics from humanism, religious upbringing, philosophy or conscience.",
      },
      {
        label: "Religion",
        statement:
          "Agnostics take many attitudes to religion — from respect and occasional participation to indifference or criticism.",
      },
      {
        label: "Meaning",
        statement:
          "Uncertainty about God need not mean a life without meaning; agnostics find meaning in relationships, work, beauty and the search for truth.",
      },
    ],
    practices: [
      "Agnosticism has no rituals, gatherings or organisations of its own. Some agnostics take part in religious services for family or cultural reasons, some join humanist or secular groups, and many simply have no religious practice.",
    ],
    structure: [
      "There is no structure. Agnostics range from people actively seeking an answer to people who regard the question as unanswerable and unimportant.",
    ],
    relationships: [
      "Agnosticism overlaps with atheism and with religious doubt. Many people move through agnosticism in either direction — toward faith or away from it — and the Christian tradition has its own long history of honest doubt and the search for God.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals respect the agnostic's honesty about what they do not know, and agree that God is not proved like a theorem and that the human mind has real limits. Many Christians have passed through seasons of doubt.",
        "Evangelicals agree that the question matters and is worth pursuing with an open mind.",
      ],
      disagreements: [
        "Evangelicals believe God has not left himself unknowable: he has made himself known in creation, in Scripture, and above all in Jesus Christ.",
        "Evangelicals hold that the question of God cannot stay suspended for ever, because it bears on how one lives and dies, and that God promises to be found by those who seek him with all their heart.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on how much weight to give rational argument in reaching agnostics, as against personal testimony, Christian community and the reading of Scripture.",
      ],
    },
    ownAnswer: [
      "Agnostics answer that they have looked at the arguments and the claims of revelation and found them not decisive, that the many conflicting religions each claim to have the truth, and that admitting uncertainty is more honest than professing a faith one does not have.",
      "Many agnostics add that they would believe if they were given good reason, that a God who wanted to be known could make himself plain, and that a sincere search should not be treated as a moral failing.",
    ],
    sources: [
      {
        kind: "primary",
        label: "T. H. Huxley, 'Agnosticism', Popular Science Monthly vol. 34 (April 1889), on Wikisource",
        url: "https://en.wikisource.org/wiki/Popular_Science_Monthly/Volume_34/April_1889/Agnosticism",
        note: "the essay in which Huxley tells how he coined the word; link only",
      },
      {
        kind: "primary",
        label: "T. H. Huxley, 'Agnosticism and Christianity', Popular Science Monthly vol. 35 (August 1889), on Wikisource",
        url: "https://en.wikisource.org/wiki/Popular_Science_Monthly/Volume_35/August_1889/Agnosticism_and_Christianity",
        note: "link only",
      },
      {
        kind: "data",
        label: "Pew Research Center, 2023-24 Religious Landscape Study: Religious identity (2025)",
        url: "https://www.pewresearch.org/religion/2025/02/26/religious-landscape-study-religious-identity/",
      },
      {
        kind: "data",
        label: "Pew Research Center, Religiously unaffiliated population change, 2010-2020 (2025)",
        url: "https://www.pewresearch.org/religion/2025/06/09/religiously-unaffiliated-population-change/",
      },
      {
        kind: "scholarly",
        label: "Stanford Encyclopedia of Philosophy, Atheism and Agnosticism",
        url: "https://plato.stanford.edu/entries/atheism-agnosticism/",
      },
      {
        kind: "reference",
        label: "Encyclopaedia Britannica, Agnosticism",
        url: "https://www.britannica.com/topic/agnosticism",
      },
    ],
    relatedIds: ["atheism"],
  },
];
