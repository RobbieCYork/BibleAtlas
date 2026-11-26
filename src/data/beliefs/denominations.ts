import type { BeliefRecord } from "./types";

/**
 * Christian Traditions and Denominations.
 *
 * Every adherent figure below was read on the cited page on 2026-11-26 unless `verified` is false.
 * Bodies count different things (baptized members, communicant members, adherents, survey
 * self-identification); `counts` says which, and the figures are not comparable across records
 * without that caveat.
 *
 * Written from the app's Protestant evangelical position (master prompt, 2026-09-07). Description
 * fields describe each body in terms its own members would recognise; assessment lives only in
 * `evangelicalView`, and `ownAnswer` gives the tradition its reply.
 */
export const christianTraditions: BeliefRecord[] = [
  // ─────────────────────────────────────────────────────────────── Catholic Church
  {
    id: "catholicism",
    name: "Catholic Church",
    alternateNames: ["Roman Catholic Church", "Catholicism", "Roman Catholicism"],
    area: "christian-tradition",
    group: "Catholic and Orthodox churches",
    role: "Christian communion in union with the Bishop of Rome",
    summary:
      "The largest Christian body in the world: a communion of the Latin Church and the Eastern Catholic churches, united in faith, sacraments and government under the Pope as Bishop of Rome.",
    selfDescription:
      "The Catholic Church understands itself as the one Church founded by Christ, which the Nicene Creed confesses as one, holy, catholic and apostolic. It teaches that this Church subsists in the Catholic Church, governed by the successor of Peter and the bishops in communion with him, while recognising that many elements of sanctification and truth are found outside its visible structure (Second Vatican Council, Lumen Gentium 8).",
    founding: {
      founders:
        "By Catholic teaching, founded by Jesus Christ on the apostles, with Peter as their head (Matthew 16:18). Historians describe the Church of Rome as present by the mid-first century; there is no later human founder.",
      founderKind: "none",
      date: "First century AD (by Catholic teaching, from Christ and the apostles)",
      dateNote:
        "The name Roman Catholic is a later usage that became common after the Reformation to distinguish Rome from Protestant and Orthodox churches.",
      place: "Jerusalem and Rome",
    },
    adherents: {
      figure: "about 1.42 billion (1,422,144,000)",
      counts: "baptized Catholics, about 17.8% of the world's population",
      year: "2024",
      source: {
        label: "Agenzia Fides, Catholic Church Statistics, from the Church's Statistical Yearbook",
        url: "https://www.fides.org/en/news/78290-Catholic_Church_Statistics_2026",
      },
      verified: true,
      note: "Counts people baptized as Catholics, not weekly attenders.",
    },
    distinctives: [
      "The Catholic Church holds that Christ gave Peter a unique office among the apostles and that this office continues in the Bishop of Rome. The Pope, together with the college of bishops, exercises the Church's teaching office, the Magisterium. The First Vatican Council (1870) defined that the Pope teaches infallibly when he solemnly defines a doctrine of faith or morals for the whole Church; this is a narrow claim about formal definitions, not a claim that every papal statement is free from error.",
      "Divine revelation is received through Sacred Scripture and Sacred Tradition together, which the Second Vatican Council described as flowing from the same divine source, with the Magisterium serving that word as its authentic interpreter (Dei Verbum 9-10). The Catholic canon of the Old Testament includes the books Protestants call the Apocrypha and Catholics call deuterocanonical, a list the Council of Trent defined in 1546.",
      "The Church is sacramental to its core. Seven sacraments are understood as acts of Christ himself: baptism, confirmation, the Eucharist, penance (confession), the anointing of the sick, holy orders and matrimony. The Eucharist is called the source and summit of the Christian life.",
      "The Church is not only Latin. Alongside the Latin Church are the Eastern Catholic churches, such as the Maronite, Melkite, Syro-Malabar and Ukrainian Catholic churches, which keep their own liturgies, law and often married clergy while being in full communion with Rome.",
    ],
    beliefs: [
      {
        label: "God",
        statement:
          "One God in three Persons, Father, Son and Holy Spirit, as confessed in the Nicene Creed and defined by the early ecumenical councils.",
      },
      {
        label: "Christ",
        statement:
          "Jesus Christ is true God and true man, one Person in two natures (Council of Chalcedon, 451), who died for the sins of the world and rose bodily from the dead.",
      },
      {
        label: "Authority",
        statement:
          "Scripture and Tradition form one sacred deposit of the word of God, entrusted to the Church and authentically interpreted by the Magisterium.",
      },
      {
        label: "Justification",
        statement:
          "Justification is God's free gift, received first in baptism, by which grace is not merely credited but poured into the soul, making the person truly righteous. The Council of Trent (Session VI, 1547) taught that no one can merit the grace of justification, and that by grace the justified grow in holiness and can merit the increase of grace and eternal life. The Catechism treats this at paragraphs 1987-2029.",
      },
      {
        label: "Sacraments",
        statement:
          "Seven sacraments instituted by Christ confer the grace they signify. In the Eucharist the bread and wine become the Body and Blood of Christ, a change the Church calls transubstantiation, and the Mass makes present the one sacrifice of Christ on the cross.",
      },
      {
        label: "Mary and the saints",
        statement:
          "Mary is honoured as Mother of God (Council of Ephesus, 431), ever-virgin, conceived without original sin (defined 1854) and assumed body and soul into heavenly glory (defined 1950). The Church distinguishes the worship given to God alone (latria) from the honour given to the saints (dulia) and the special honour given to Mary (hyperdulia), and asks the saints' prayers.",
      },
      {
        label: "Last things",
        statement:
          "After death comes judgment. Those who die in God's grace but are still imperfectly purified undergo purification, called purgatory, before entering heaven. Christ will return, the dead will be raised, and God's kingdom will be fulfilled.",
      },
    ],
    practices: [
      "The centre of Catholic worship is the Mass, celebrated daily in many parishes and required of Catholics on Sundays and holy days of obligation. Most Catholics worship in the rite of the Latin Church, usually in the language of the people since the reforms that followed the Second Vatican Council (1962-1965).",
      "The liturgical year runs through Advent, Christmas, Lent, the Easter Triduum and Easter, with feasts of Mary and the saints. Common devotions include the rosary, eucharistic adoration, pilgrimage and the regular confession of sins to a priest.",
      "Religious orders such as the Benedictines, Franciscans, Dominicans and Jesuits shape Catholic prayer, education and charity, and the Church runs one of the largest networks of schools, hospitals and charities in the world.",
    ],
    structure: [
      "The Church is organised into dioceses, each led by a bishop, grouped under the Pope as Bishop of Rome. Priests in the Latin Church are ordinarily celibate; deacons may be married. Ordination is reserved to men.",
      "The Latin Church and 23 Eastern Catholic churches are each a church in its own right (sui iuris) within one communion. The Holy See in Vatican City is the Church's central government.",
    ],
    relationships: [
      "The Catholic and Eastern Orthodox churches separated gradually, with 1054 as the conventional date. In 1965 Pope Paul VI and Patriarch Athenagoras I lifted the mutual excommunications of 1054, while stating that this did not end the differences between them.",
      "With Protestants, the Catholic Church has pursued formal dialogue since the Second Vatican Council. In 1999 the Catholic Church and the Lutheran World Federation signed the Joint Declaration on the Doctrine of Justification, which states a shared understanding of basic truths about justification and says the sixteenth-century condemnations do not apply to the teaching it sets out.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals and Catholics confess together the Trinity, the full deity and humanity of Christ, his virgin birth, atoning death, bodily resurrection and return, and the inspiration of Scripture. These are the convictions of the historic creeds, and on them Catholics are fellow confessors of the faith.",
        "Evangelicals can also recognise in Catholic moral teaching, care for the poor, defence of unborn life and devotional seriousness much that they share and from which they have learned.",
      ],
      disagreements: [
        "Authority: evangelicals hold that Scripture alone is the final and sufficient rule of faith (sola Scriptura), so that tradition and church teaching are always answerable to it. This is the root of most other differences.",
        "Justification: evangelicals teach that a sinner is declared righteous by God through faith alone, on the ground of Christ's righteousness credited to the believer (Romans 3:28; Romans 4:5; Ephesians 2:8-9), and that good works are the fruit of justification rather than part of its basis. Catholic teaching that justification includes inner renewal and can be increased and lost remains a real difference, even after the 1999 Joint Declaration.",
        "The Mass, Mary and the papacy: evangelicals hold that Christ's sacrifice was offered once for all (Hebrews 10:10-14) and do not accept transubstantiation, the later Marian dogmas, prayer to the saints, purgatory or papal infallibility, finding them unsupported by Scripture.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on how to relate to Catholics. Some, as in the 1994 statement Evangelicals and Catholics Together, emphasise common witness on shared convictions; others hold that the disagreement over justification is so basic that such statements blur the gospel. Many evangelicals also distinguish official Catholic teaching from the personal faith of individual Catholics.",
      ],
    },
    ownAnswer: [
      "Catholics answer that Scripture itself was received, collected and handed on by the Church, so that the Bible never stands apart from the community that carries it; sola Scriptura, they argue, is not itself taught in Scripture. They point to passages such as 2 Thessalonians 2:15 on holding to traditions taught by word or letter.",
      "On justification, Catholic teaching insists that salvation is entirely by grace and that the Church has never taught that anyone can earn it, citing Trent's own canons. Catholics read James 2:24 and Galatians 5:6 (faith working through love) as showing that the faith which justifies is never alone. They hold that the Mass does not repeat Calvary but makes the one sacrifice present, and that honour given to Mary always points to her Son.",
    ],
    sources: [
      { kind: "official", label: "Catechism of the Catholic Church (English)", url: "https://www.vatican.va/archive/ENG0015/_INDEX.HTM", note: "Holy See; link only, the text is under copyright" },
      { kind: "official", label: "Common Declaration of Pope Paul VI and Patriarch Athenagoras I (7 December 1965)", url: "https://www.vatican.va/content/paul-vi/en/speeches/1965/documents/hf_p-vi_spe_19651207_common-declaration.html" },
      { kind: "data", label: "Agenzia Fides, Catholic Church Statistics", url: "https://www.fides.org/en/news/78290-Catholic_Church_Statistics_2026", note: "from the Church's Statistical Yearbook" },
      { kind: "official", label: "Second Vatican Council, Dogmatic Constitution Lumen Gentium", url: "https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19641121_lumen-gentium_en.html" },
      { kind: "official", label: "Joint Declaration on the Doctrine of Justification (1999), Lutheran World Federation and Catholic Church", url: "https://lutheranworld.org/sites/default/files/2022-02/original_jddj_english.pdf" },
    ],
    verses: [
      { reference: "Matthew 16:18", note: "Peter and the rock, central to Catholic teaching on the papacy" },
      { reference: "Romans 3:28", note: "justified by faith apart from works of the law" },
      { reference: "James 2:24", note: "cited by Catholics on faith and works" },
      { reference: "Hebrews 10:10-14", note: "Christ's once-for-all sacrifice" },
    ],
    relatedIds: ["eastern-orthodoxy", "anglicanism", "lutheranism"],
  },

  // ─────────────────────────────────────────────────────────────── Eastern Orthodoxy
  {
    id: "eastern-orthodoxy",
    name: "Eastern Orthodox Church",
    alternateNames: ["Orthodox Church", "Eastern Orthodoxy", "Greek Orthodox", "Russian Orthodox"],
    area: "christian-tradition",
    group: "Catholic and Orthodox churches",
    role: "Communion of self-governing Orthodox churches",
    summary:
      "A family of self-governing churches, among them the churches of Constantinople, Russia, Serbia, Romania, Greece and Antioch, which share one faith, one liturgical life and the teaching of the seven ecumenical councils.",
    selfDescription:
      "The Orthodox Church understands itself not as one denomination among many but as the one, holy, catholic and apostolic Church of the Nicene Creed, which has kept the faith of the apostles and the councils without addition or subtraction. Orthodox Christians often describe their faith as a way of life and worship rather than a system of doctrine.",
    founding: {
      founders:
        "No human founder. The Orthodox Church traces itself to Christ and the apostles at Pentecost, and through unbroken succession of bishops to the ancient churches of Jerusalem, Antioch, Alexandria and Constantinople.",
      founderKind: "none",
      date: "First century AD (by Orthodox understanding, from Pentecost)",
      dateNote:
        "Outsiders often date Orthodoxy from 1054, but the Orthodox do not see that as their beginning. The censures of 1054 were against individuals, and the separation from Rome developed over centuries.",
    },
    adherents: {
      figure: "nearly 260 million",
      counts: "Orthodox Christians worldwide",
      year: "2010 estimate (published 2017)",
      source: {
        label: "Pew Research Center, Orthodox Christianity in the 21st Century (2017)",
        url: "https://www.pewresearch.org/religion/2017/11/08/orthodox-christianity-in-the-21st-century/",
      },
      verified: true,
      note: "Pew's Orthodox category also counts the Oriental Orthodox churches, such as the Ethiopian and Coptic churches, which are not in communion with the Eastern Orthodox, so the Eastern Orthodox share is smaller. A newer worldwide estimate was not found.",
    },
    distinctives: [
      "Orthodoxy is held together by shared faith and sacraments rather than by a single central government. Each autocephalous (self-governing) church has its own head, and the Ecumenical Patriarch of Constantinople holds a primacy of honour as first among equals, without authority to rule the other churches.",
      "Worship is the heart of Orthodox life. The Divine Liturgy, most often in the form attributed to Saint John Chrysostom, is sung in full, and Orthodox Christians understand it as joining the worship of heaven. Icons of Christ, Mary and the saints fill the church; the Seventh Ecumenical Council (Nicaea, 787) taught that the honour given to an icon passes to the one it depicts.",
      "Salvation is described as theosis, or deification: by grace, through union with Christ in the Church and the sacraments, human beings come to share in the life of God, becoming by grace what God is by nature. Orthodox writers use the language of healing and transformation more than the legal language that shaped Western debates.",
    ],
    beliefs: [
      { label: "God", statement: "One God in three Persons. Orthodox theology stresses the Father as the one source of the Son and the Spirit, and rejects the Western addition of filioque (and the Son) to the Nicene Creed." },
      { label: "Christ", statement: "The eternal Son became fully human without ceasing to be God, as defined by the ecumenical councils, so that humanity might be united to God." },
      { label: "Authority", statement: "Holy Tradition, the life of the Holy Spirit in the Church, includes Scripture as its supreme written expression, together with the creeds, the councils, the Fathers and the liturgy. The seven ecumenical councils (325-787) are authoritative." },
      { label: "Salvation", statement: "Salvation is the healing and deification of the whole person by God's grace, received in faith and worked out in a life of repentance, prayer and the sacraments." },
      { label: "Sacraments", statement: "The holy mysteries, commonly counted as seven, include baptism by triple immersion, chrismation (anointing) given immediately after baptism, and the Eucharist, in which the bread and wine truly become the Body and Blood of Christ." },
      { label: "Mary and the saints", statement: "Mary is honoured as Theotokos (God-bearer) and ever-virgin, and the saints are venerated and asked to pray. The Orthodox do not accept the Catholic dogma of the Immaculate Conception, though they honour Mary as all-holy." },
      { label: "Last things", statement: "Christ will return to judge the living and the dead; the dead will be raised. The Orthodox pray for the departed but do not teach purgatory as the Catholic Church defines it." },
    ],
    practices: [
      "Orthodox Christians keep a demanding cycle of fasts, including Great Lent before Pascha (Easter), and mark the year by twelve great feasts. Several churches still calculate Pascha by the Julian calendar, so it often falls on a different date from Western Easter.",
      "Prayer at home before icons, the Jesus Prayer, confession to a priest and communion after preparation and fasting are ordinary parts of Orthodox life. Infants receive baptism, chrismation and communion together.",
    ],
    structure: [
      "The churches are governed by bishops in synods. Parish priests may be married if they married before ordination; bishops are chosen from celibate clergy, usually monks. Ordination to the priesthood is reserved to men.",
      "The ancient patriarchates are Constantinople, Alexandria, Antioch and Jerusalem; others include Moscow, Serbia, Romania, Bulgaria and Georgia, alongside churches such as those of Greece, Cyprus and Poland. Relations are not always unbroken: in 2018 the Moscow Patriarchate broke communion with Constantinople after Constantinople moved to recognise an autocephalous Orthodox Church of Ukraine.",
    ],
    relationships: [
      "The Oriental Orthodox churches (Coptic, Ethiopian, Armenian, Syriac and others) separated from the Eastern Orthodox after the Council of Chalcedon in 451. Modern theological dialogues between the two families have concluded that much of the difference over the person of Christ was one of terminology, though full communion has not been restored.",
      "With Rome, the mutual excommunications of 1054 were lifted in 1965, and official dialogue continues; the papacy remains the central disagreement. With Protestants, Orthodox churches take part in ecumenical bodies such as the World Council of Churches, while a growing number of former evangelicals have joined Orthodox parishes in North America.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals share with the Orthodox the faith of the Nicene Creed and the definitions of the early councils on the Trinity and the person of Christ, which evangelicals receive as faithful summaries of Scripture. The Orthodox insistence that salvation is union with the living Christ, and their reverence for Scripture in worship, are common ground.",
      ],
      disagreements: [
        "Evangelicals hold that Scripture alone is the final authority over all tradition, including the councils and the Fathers, where Orthodoxy receives Scripture within Holy Tradition.",
        "Evangelicals teach justification by faith alone as God's declaration that the sinner is righteous in Christ (Romans 4:5), and are wary when theosis is presented without that forensic foundation. They do not accept the veneration of icons, prayer to the saints or the understanding of baptism and the Eucharist as means by which salvation is conveyed.",
      ],
      evangelicalsDiffer: [
        "Some evangelical theologians find the Orthodox language of union with Christ and participation in God close to biblical themes (2 Peter 1:4) and to the Reformers' own teaching on union with Christ; others judge that it obscures justification. Evangelicals also differ on whether icons are always forbidden by the second commandment or only when they are venerated.",
      ],
    },
    ownAnswer: [
      "The Orthodox answer that Scripture was written, recognised and interpreted within the worshipping Church, and that setting Scripture against Tradition divides what the Holy Spirit has kept together. They point out that the canon of Scripture itself was settled by the Church's tradition.",
      "They would add that the legal framework of Western debates about justification is too narrow, not false so much as partial: the gospel is that God became man so that man might share the life of God. On icons, they answer that the incarnation changed the second commandment's situation, because the invisible God has made himself visible in Christ.",
    ],
    sources: [
      { kind: "official", label: "Orthodox Church in America, The Orthodox Faith", url: "https://www.oca.org/orthodoxy/the-orthodox-faith", note: "one national Orthodox church's introduction" },
      { kind: "official", label: "Common Declaration of Pope Paul VI and Patriarch Athenagoras I (1965)", url: "https://www.vatican.va/content/paul-vi/en/speeches/1965/documents/hf_p-vi_spe_19651207_common-declaration.html" },
      { kind: "data", label: "Pew Research Center, Orthodox Christianity in the 21st Century (2017)", url: "https://www.pewresearch.org/religion/2017/11/08/orthodox-christianity-in-the-21st-century/" },
      { kind: "reference", label: "Christian History Magazine, issue 54: Eastern Orthodoxy", url: "https://christianhistoryinstitute.org/magazine/issue/eastern-orthodoxy" },
    ],
    verses: [{ reference: "2 Peter 1:4", note: "partakers of the divine nature, a key text for theosis" }],
    relatedIds: ["catholicism", "anglicanism"],
  },

  // ─────────────────────────────────────────────────────────────── Anglicanism
  {
    id: "anglicanism",
    name: "Anglicanism",
    alternateNames: ["Anglican Communion", "Church of England", "Anglican Church"],
    area: "christian-tradition",
    group: "Reformation churches",
    role: "Worldwide communion of churches descended from the Church of England",
    summary:
      "The family of churches that grew from the Church of England, united by the Book of Common Prayer tradition, the historic episcopate and recognition of the Archbishop of Canterbury as a focus of unity.",
    selfDescription:
      "Anglicans describe their church as both catholic and reformed: catholic in keeping the creeds, the sacraments and the historic order of bishops, priests and deacons, and reformed in holding Scripture as containing all things necessary to salvation. The Anglican Communion presents itself as a fellowship of autonomous churches in communion with the See of Canterbury.",
    founding: {
      founders:
        "No single founder. Anglicans trace their church to the ancient church in Britain and to Augustine's mission to Kent in 597. The break with Rome came under Henry VIII; its Protestant theology and liturgy were shaped chiefly by Thomas Cranmer, and its settled form by the Elizabethan Settlement of 1559.",
      founderKind: "several",
      date: "1534 (Act of Supremacy), as a church separate from Rome",
      dateNote:
        "Anglicans do not regard 1534 as the founding of a new church but as the moment the existing English church rejected papal authority.",
      place: "England",
    },
    adherents: {
      figure: "around 85 million",
      counts: "members of the churches of the Anglican Communion, partly estimated from attendance and measured differently by each church",
      year: "2015",
      source: {
        label: "Anglican Communion Office, Anglican Communion Q&A (2015)",
        url: "https://anglicancommunion.org/wp-content/uploads/2026/02/Anglican-Communion-QA-2015.pdf",
      },
      verified: true,
      note: "The Communion's website now gives a figure of about 90 million and 42 member churches, but that page could not be loaded to confirm it. Churches outside the Communion, such as the Anglican Church in North America, are not counted.",
    },
    distinctives: [
      "Anglicanism is defined less by a single founding confession than by its prayer book. The Book of Common Prayer, first issued under Thomas Cranmer in 1549 and revised in 1552 and 1662, shaped worship and doctrine across the English-speaking world, and the principle that the church's belief is expressed in its prayer is often summarised in the Latin phrase lex orandi, lex credendi.",
      "The Thirty-Nine Articles of Religion, settled in 1571, are the Church of England's historic doctrinal statement. They teach that Scripture contains all things necessary to salvation, that we are justified by faith only for the merit of Christ, and that the church has authority in ceremonies but may not ordain anything contrary to Scripture. Member churches give the Articles differing weight.",
      "Anglicans often describe their life as drawing on Scripture, tradition and reason, with Scripture first. The Chicago-Lambeth Quadrilateral (1886 and 1888) named four marks Anglicans offered as a basis for Christian unity: the Scriptures, the Apostles' and Nicene Creeds, the two sacraments of baptism and the Lord's Supper, and the historic episcopate.",
    ],
    beliefs: [
      { label: "God and Christ", statement: "The Trinity and the person of Christ as confessed in the Apostles', Nicene and Athanasian creeds." },
      { label: "Scripture", statement: "Holy Scripture contains all things necessary to salvation, and nothing that cannot be read in it or proved by it is to be required as an article of faith (Article VI)." },
      { label: "Salvation", statement: "Sinners are accounted righteous before God only for the merit of Jesus Christ, by faith, and not for their own works (Article XI)." },
      { label: "Sacraments", statement: "Two sacraments ordained by Christ in the gospel, baptism and the Lord's Supper. Infants are baptised. Anglicans hold that Christ is truly present to the faithful in the Lord's Supper, while describing that presence in a range of ways." },
      { label: "Ministry", statement: "The threefold order of bishops, priests and deacons, in historic succession, is kept as the ministry of the church." },
      { label: "Worship", statement: "Common prayer in the language of the people, following the church year, with the Daily Office and the Holy Communion at its centre." },
    ],
    practices: [
      "Anglican worship ranges widely. Anglo-Catholic parishes use vestments, incense and frequent sacramental devotion; evangelical parishes stress preaching and may worship informally; many parishes sit between. Morning and Evening Prayer and the Holy Communion follow set liturgies, now often from modern prayer books alongside the 1662 book.",
      "Confirmation by a bishop is the traditional rite of mature commitment for those baptised as infants.",
    ],
    structure: [
      "The Anglican Communion is made up of self-governing member churches (provinces), each with its own bishops and synods. It has no central legislature. Its four Instruments of Communion are the Archbishop of Canterbury, the Lambeth Conference of bishops (first held in 1867), the Anglican Consultative Council and the Primates' Meeting.",
      "Within Anglicanism, evangelical, Anglo-Catholic and liberal or broad church streams have long coexisted. Since 2008, the Global Anglican Future Conference (GAFCON) has drawn together many theologically conservative Anglicans, especially in Africa, who dispute the direction of some Western provinces on marriage and sexuality.",
    ],
    relationships: [
      "The Episcopal Church in the United States is the Communion's American province. Anglicans have entered full communion with several Lutheran churches, including the Porvoo agreement between British and Irish Anglican churches and Nordic and Baltic Lutheran churches.",
      "Methodism began as a renewal movement inside the Church of England under John Wesley and Charles Wesley, both Anglican priests.",
    ],
    evangelicalView: {
      agreements: [
        "The Thirty-Nine Articles are a Reformation confession, and on Scripture's supremacy and justification by faith alone they say what evangelicals say. Evangelical Anglicans, from the eighteenth-century revival to the present, have been among the most influential evangelical voices in the world, and the prayer book's language of sin, grace and assurance is widely loved by evangelicals of other churches.",
      ],
      disagreements: [
        "Evangelicals outside Anglicanism, and many inside it, are concerned that the comprehensiveness Anglicans value allows teaching that contradicts the church's own Articles, especially where some provinces have revised teaching on marriage and sexuality.",
        "Baptists and other believers'-church evangelicals disagree with infant baptism and with the claim that bishops in historic succession are of the church's essential order.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on church government: Anglican evangelicals defend episcopacy as ancient and wise, while Presbyterians and Baptists hold other forms to be more biblical. Evangelicals also differ on whether faithful Anglicans should stay in provinces they believe are in error or join realigned bodies such as the Anglican Church in North America.",
      ],
    },
    ownAnswer: [
      "Anglicans answer that their breadth is deliberate: the church requires agreement on the creeds and the essentials found in Scripture, and allows freedom where Scripture is not plain. Many would say that patience within one communion is itself a biblical calling (John 17:21).",
      "On bishops and infant baptism, Anglicans point to the church's practice from the earliest centuries and to the household baptisms of Acts, and hold that a reformed church need not discard what is ancient unless Scripture forbids it.",
    ],
    sources: [
      { kind: "official", label: "Anglican Communion Q&A (2015)", url: "https://anglicancommunion.org/wp-content/uploads/2026/02/Anglican-Communion-QA-2015.pdf", note: "Anglican Communion Office" },
      { kind: "primary", label: "The Thirty-Nine Articles of Religion (Book of Common Prayer, 1863 printing)", url: "https://en.wikisource.org/wiki/Book_of_Common_Prayer_(1863)/Articles_of_Religion", note: "public-domain text on Wikisource" },
      { kind: "reference", label: "Library of Congress, Today in History: the Act of Supremacy", url: "https://blogs.loc.gov/law/2017/07/today-in-history-extinguishing-the-popes-power-in-england/" },
      { kind: "official", label: "Anglican Communion, Member churches", url: "https://www.anglicancommunion.org/member-churches/", note: "could not be loaded on 2026-11-26" },
    ],
    verses: [{ reference: "John 17:21", note: "Christ's prayer that his followers be one" }],
    relatedIds: ["episcopal-church", "united-methodist-church", "catholicism", "lutheranism"],
  },

  // ─────────────────────────────────────────────────────────────── Episcopal Church
  {
    id: "episcopal-church",
    name: "The Episcopal Church",
    alternateNames: ["Episcopal Church", "Episcopalians", "Protestant Episcopal Church in the United States of America"],
    area: "christian-tradition",
    group: "Reformation churches",
    role: "The Anglican Communion's province in the United States",
    summary:
      "The American church of the Anglican tradition, organised after the American Revolution, with congregations in the United States and dioceses in several other countries.",
    selfDescription:
      "The Episcopal Church describes itself as a member of the worldwide Anglican Communion, a church that worships in the tradition of the Book of Common Prayer, holds the Scriptures, the creeds and the sacraments, and is governed by bishops together with clergy and lay people.",
    founding: {
      founders:
        "No single founder. The church grew from Church of England parishes in the American colonies. After independence, Samuel Seabury was consecrated in 1784 by bishops of the Scottish Episcopal Church as the first American bishop, and William White of Philadelphia led much of the church's organisation.",
      founderKind: "several",
      date: "1789 (constitution adopted at the General Convention in Philadelphia)",
      dateNote: "General Conventions met in 1785 and 1786 before the constitution and first American prayer book were adopted in 1789.",
      place: "Philadelphia, Pennsylvania",
    },
    adherents: {
      figure: "1,425,065",
      counts: "total members reported in the parochial reports, including overseas dioceses; average in-person Sunday attendance was 407,001",
      year: "2025",
      source: {
        label: "General Convention Office, Parochial Report results",
        url: "https://generalconvention.org/parochial-report-results/",
      },
      verified: true,
      note: "The report cautions that comparisons with earlier years are limited; membership was not collected for 2024.",
    },
    distinctives: [
      "Episcopal worship follows the Book of Common Prayer, in the current American edition of 1979, and most parishes celebrate the Holy Eucharist every Sunday. Its catechism and the historical documents bound into the prayer book, including the Thirty-Nine Articles, are the church's main statements of belief.",
      "The church's government gives lay people a strong voice. Its General Convention has two houses, the House of Bishops and the House of Deputies of clergy and lay members, and both must agree to change the church's canons or prayer book.",
      "The Episcopal Church has taken a progressive course on several questions. Its General Convention authorised the ordination of women as priests in 1976, it consecrated its first openly gay bishop in 2003, and in 2015 it authorised marriage rites for same-sex couples. Not all of its members or dioceses agreed with these decisions.",
    ],
    beliefs: [
      { label: "God and Christ", statement: "The Trinity and the person of Christ as confessed in the Apostles' and Nicene Creeds, recited in every principal service." },
      { label: "Scripture", statement: "The Holy Scriptures are the Word of God, containing all things necessary to salvation, as affirmed in the ordination vows of the prayer book." },
      { label: "Sacraments", statement: "Baptism and the Eucharist are the two great sacraments of the gospel; confirmation, ordination, marriage, reconciliation and unction are called sacramental rites. Baptism is given to infants and adults." },
      { label: "Ministry", statement: "Bishops, priests and deacons, with all the baptised called to ministry. Women and men are ordained to all three orders." },
      { label: "The Baptismal Covenant", statement: "The 1979 prayer book's Baptismal Covenant, asking members to continue in the apostles' teaching, resist evil, proclaim the gospel, serve Christ in all persons and strive for justice and peace, is central to how the church describes Christian life." },
    ],
    practices: [
      "Sunday Eucharist, the Daily Office, the church year and an emphasis on beauty in worship, music and architecture. Many congregations are active in social service and advocacy.",
    ],
    structure: [
      "About a hundred dioceses, each led by a bishop, gather in the General Convention every three years. A Presiding Bishop serves as the church's chief pastor and primate in the Anglican Communion.",
    ],
    relationships: [
      "The Episcopal Church is in full communion with the Evangelical Lutheran Church in America (since 2001) and with the Moravian Church in America. Theologically conservative Episcopalians who left the church formed the Anglican Church in North America in 2009, which the Episcopal Church does not recognise as an Anglican province and which is aligned with GAFCON.",
    ],
    evangelicalView: {
      agreements: [
        "The church's prayer book, with its creeds, its Scripture readings and its prayers of confession and thanksgiving, sets out the historic faith in words evangelicals recognise, and there are evangelical Episcopal clergy and congregations.",
      ],
      disagreements: [
        "Evangelicals generally hold that the Episcopal Church's decisions on marriage and sexuality depart from the plain teaching of Scripture (Matthew 19:4-6), and many are concerned that the church tolerates teaching that questions core doctrines its own creeds confess.",
        "Many evangelicals also disagree with the ordination of women as priests and bishops, though evangelicals are divided on that question.",
      ],
      evangelicalsDiffer: [
        "Evangelicals are divided on women's ordination: complementarians hold that the office of pastor or elder is for qualified men, while egalitarian evangelicals ordain women. Evangelicals also differ on whether conservatives should stay in the Episcopal Church to witness within it or leave.",
      ],
    },
    ownAnswer: [
      "Episcopalians answer that their decisions came from long study of Scripture, tradition and reason, and from a conviction that the gospel's welcome extends to all baptised people. They read Galatians 3:28 and the church's growing understanding over time, as in its earlier reconsideration of slavery, as reasons for their course.",
      "They would also say that the church still prays the creeds every Sunday and that its unity rests on common prayer and sacraments rather than on agreement on every contested question.",
    ],
    sources: [
      { kind: "official", label: "The Episcopal Church, What We Believe", url: "https://www.episcopalchurch.org/what-we-believe/" },
      { kind: "data", label: "General Convention Office, Parochial Report results", url: "https://generalconvention.org/parochial-report-results/" },
      { kind: "primary", label: "The Thirty-Nine Articles of Religion (1863 printing)", url: "https://en.wikisource.org/wiki/Book_of_Common_Prayer_(1863)/Articles_of_Religion", note: "public-domain text on Wikisource" },
      { kind: "reference", label: "Encyclopedia.com, Episcopal Church (US)", url: "https://www.encyclopedia.com/religion/encyclopedias-almanacs-transcripts-and-maps/episcopal-church-us" },
    ],
    relatedIds: ["anglicanism", "lutheranism"],
  },

  // ─────────────────────────────────────────────────────────────── Lutheranism
  {
    id: "lutheranism",
    name: "Lutheranism",
    alternateNames: ["Lutheran Church", "Lutherans", "Evangelical Lutheran"],
    area: "christian-tradition",
    group: "Reformation churches",
    role: "Protestant tradition from the Reformation of Martin Luther",
    summary:
      "The churches that grew from Martin Luther's Reformation in sixteenth-century Germany and hold to the Lutheran confessions gathered in the Book of Concord.",
    selfDescription:
      "Lutherans call themselves evangelical, meaning churches of the gospel, and describe themselves as a reform movement within the one catholic Church rather than a new church. They confess that sinners are justified by grace alone, through faith alone, on account of Christ alone, as taught in Scripture alone.",
    founding: {
      founders:
        "Martin Luther (1483-1546), with Philip Melanchthon and other reformers. Luther did not intend to found a church and objected to his followers being named after him.",
      founderKind: "single",
      date: "1517 (Ninety-five Theses, 31 October); 1530 (Augsburg Confession)",
      dateNote: "31 October 1517 is the date of the Ninety-five Theses. The story that Luther nailed them to the church door in Wittenberg is traditional and disputed by historians.",
      place: "Wittenberg, Saxony",
    },
    adherents: {
      figure: "over 78 million",
      counts: "members of the 153 churches in the Lutheran World Federation, in 99 countries",
      year: "2023 (LWF statistics)",
      source: { label: "Lutheran World Federation, Member churches", url: "https://lutheranworld.org/member-churches" },
      verified: true,
      note: "Not every Lutheran church belongs to the LWF. In the US, the Evangelical Lutheran Church in America reported 2,677,239 baptized members at the end of 2024 (ELCA statistics). The Lutheran Church-Missouri Synod is not an LWF member; its baptized membership is commonly given as about 1.7 million, a figure not confirmed against an LCMS page.",
    },
    distinctives: [
      "Lutheran identity is confessional. The Book of Concord (1580) gathers the three ecumenical creeds, the Augsburg Confession (1530) and its Apology, the Smalcald Articles, Luther's Small and Large Catechisms and the Formula of Concord. Confessional Lutherans subscribe to these because, not merely insofar as, they agree with Scripture.",
      "Lutheran theology is organised around the distinction between law and gospel: the law shows sin and the need of a Saviour, and the gospel gives the forgiveness of sins freely in Christ. Lutherans also speak of the theology of the cross, God revealing himself in weakness and suffering rather than in glory.",
      "Lutherans hold a high view of the sacraments as means of grace. In baptism God gives forgiveness and new life, and in the Lord's Supper Christ's true body and blood are present in, with and under the bread and wine, for the forgiveness of sins. Lutherans reject both the Catholic doctrine of transubstantiation and the view that the Supper is only a memorial.",
    ],
    beliefs: [
      { label: "God and Christ", statement: "The Trinity and the person of Christ as confessed in the Apostles', Nicene and Athanasian creeds." },
      { label: "Scripture", statement: "The prophetic and apostolic Scriptures are the only rule and norm by which all teachers and teachings are to be judged (Formula of Concord)." },
      { label: "Justification", statement: "Human beings cannot be justified before God by their own strength or works, but are freely justified for Christ's sake through faith (Augsburg Confession, Article IV). This is called the article on which the church stands or falls." },
      { label: "Baptism", statement: "Baptism is necessary and is given to infants, through whom God works faith and new birth." },
      { label: "The Lord's Supper", statement: "The true body and blood of Christ are truly present and distributed to those who eat (Augsburg Confession, Article X)." },
      { label: "Vocation", statement: "Every Christian serves God in ordinary callings of family, work and citizenship, and all the baptised share the priesthood of believers." },
    ],
    practices: [
      "Lutheran worship keeps the historic liturgy, the church year, vestments and frequently weekly communion, with preaching of law and gospel at its centre. Congregational hymn singing, from Luther's own hymns to the chorales of J. S. Bach, is one of the tradition's great gifts.",
      "Luther's Small Catechism remains the standard teaching tool for confirmation of young people.",
    ],
    structure: [
      "In Germany and the Nordic countries Lutheran churches were long state or national churches; elsewhere they are free churches. Some keep bishops in historic succession, as in Sweden and Finland, while others are governed by synods with congregational polity.",
      "Lutherans divide along confessional lines. The Lutheran World Federation, founded in 1947, includes most of the world's Lutheran churches, among them the ELCA, which ordains women and has revised its teaching on same-sex relationships. The International Lutheran Council gathers confessional churches such as the LCMS, which do not ordain women and hold a stricter subscription to the confessions.",
    ],
    relationships: [
      "In 1999 the Lutheran World Federation and the Catholic Church signed the Joint Declaration on the Doctrine of Justification; the LCMS and other confessional Lutherans did not accept it. The ELCA is in full communion with the Episcopal Church, the Presbyterian Church (U.S.A.), the Reformed Church in America, the United Church of Christ, the Moravian Church and the United Methodist Church.",
      "Lutherans and the Reformed share the Reformation's teaching on grace but divided early over the Lord's Supper, as at the Marburg Colloquy between Martin Luther and Huldrych Zwingli in 1529.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals owe the recovery of justification by faith alone to Martin Luther, and the Augsburg Confession's article on justification states what evangelicals of every church believe. Confessional Lutherans share evangelicals' commitment to the authority of Scripture.",
      ],
      disagreements: [
        "Baptists and many other evangelicals disagree with infant baptism and with the Lutheran teaching that baptism regenerates. Evangelicals in the Reformed and Baptist traditions do not accept the bodily presence of Christ in, with and under the bread and wine.",
        "Evangelicals generally share confessional Lutherans' concerns about the ELCA's revisions on sexuality and its view of Scripture.",
      ],
      evangelicalsDiffer: [
        "Within evangelicalism, Lutheran, Reformed and Baptist believers have never agreed on the sacraments, and some evangelicals consider confessional Lutherans part of the evangelical family while many Lutherans prefer not to use the American term evangelical of themselves.",
      ],
    },
    ownAnswer: [
      "Lutherans answer that their sacramental teaching is simply taking Christ's words at face value: This is my body (Matthew 26:26), and that baptism now saves you (1 Peter 3:21). They hold that the sacraments are not human works but the gospel itself, given in water, bread and wine, so that faith clings to God's promise rather than to its own sincerity.",
    ],
    sources: [
      { kind: "official", label: "Lutheran World Federation, Member churches", url: "https://lutheranworld.org/member-churches" },
      { kind: "primary", label: "The Augsburg Confession (Book of Concord)", url: "https://thebookofconcord.org/augsburg-confession/" },
      { kind: "official", label: "ELCA, What We Believe", url: "https://www.elca.org/about/what-we-believe" },
      { kind: "official", label: "Lutheran Church-Missouri Synod, Beliefs", url: "https://www.lcms.org/what-we-believe/beliefs" },
      { kind: "data", label: "ELCA, Summary of congregational statistics as of 12/31/2024", url: "https://elcamediaresources.blob.core.windows.net/cdn/wp-content/uploads/summary-of-congregational-statistics-as-of-12-31-24.pdf" },
    ],
    verses: [
      { reference: "Romans 3:28", note: "justified by faith apart from works of the law" },
      { reference: "Matthew 26:26", note: "This is my body" },
      { reference: "1 Peter 3:21", note: "baptism now saves you" },
    ],
    relatedIds: ["catholicism", "presbyterianism", "anglicanism", "episcopal-church"],
  },

  // ─────────────────────────────────────────────────────────────── Presbyterians
  {
    id: "presbyterianism",
    name: "Presbyterianism",
    alternateNames: ["Presbyterian Church", "Presbyterians", "Reformed churches"],
    area: "christian-tradition",
    group: "Reformation churches",
    role: "Reformed Protestant tradition governed by elders",
    summary:
      "The churches of the Reformed tradition of John Calvin and John Knox, named for their government by presbyters (from the New Testament word for elder), gathered in courts from the local session to the general assembly.",
    selfDescription:
      "Presbyterians describe themselves as Reformed churches: churches reformed according to the Word of God, which confess the sovereignty of God in salvation, the authority of Scripture and a church governed by presbyters (each an elder) who are elected by the people.",
    founding: {
      founders:
        "No single founder. The theology is chiefly that of John Calvin in Geneva (from 1536); John Knox led the Scottish Reformation, whose parliament adopted the Scots Confession in 1560. Presbyterian churches in America date from the early 1700s.",
      founderKind: "several",
      date: "1560 (Scottish Reformation); 1646 (Westminster Confession of Faith)",
      place: "Geneva and Scotland",
    },
    adherents: {
      figure: "1,019,003 in the Presbyterian Church (U.S.A.); 400,751 in the Presbyterian Church in America",
      counts: "members of the two largest US Presbyterian bodies (PC(USA) members; PCA total members, communicant and non-communicant)",
      year: "2025 (PC(USA)); 2024 (PCA)",
      source: {
        label: "Presbyterian News Service, PC(USA) still home to more than 1 million members (June 2026)",
        url: "https://pcusa.org/news-storytelling/news/2026/6/29/pcusa-still-home-more-1-million-members",
      },
      verified: true,
      note: "PCA figure from byFaith, New statistics reveal PCA's growth in 2024. Worldwide, the World Communion of Reformed Churches reports about 100 million members in its 230-plus member churches, which include Reformed and Congregational as well as Presbyterian churches.",
    },
    distinctives: [
      "Presbyterian government is by presbyters. Each congregation is led by a session, made up of its ruling elder members and its pastor (a teaching elder); congregations are joined in a presbytery, presbyteries in synods, and the whole church in a general assembly. Authority lies in these representative courts rather than in a bishop or in the single congregation.",
      "Reformed theology emphasises the sovereignty of God over all things, including salvation. God's grace is unconditional; the Westminster Confession teaches that God chose some to eternal life from before the foundation of the world, not because of anything foreseen in them but out of his free grace and love.",
      "Presbyterians read Scripture through the covenants God has made with his people. This covenant theology shapes their practice of baptising the children of believers as members of the covenant community, as circumcision marked the children of Israel.",
    ],
    beliefs: [
      { label: "God and Christ", statement: "The Trinity and the person of Christ as confessed in the creeds and the Reformed confessions." },
      { label: "Scripture", statement: "The Old and New Testaments are the Word of God, the only infallible rule of faith and life (Westminster Confession, chapter 1)." },
      { label: "Salvation", statement: "Salvation is by grace alone through faith alone in Christ alone; those whom God effectually calls he justifies, adopts, sanctifies and keeps to the end." },
      { label: "Sacraments", statement: "Two sacraments, baptism and the Lord's Supper. Infants of believers are baptised. In the Supper Christ is spiritually present and received by faith." },
      { label: "The church", statement: "Christ alone is head of the church, governing it through presbyters chosen by the people." },
      { label: "The Christian life", statement: "All of life is lived to the glory of God; the Westminster Shorter Catechism's first answer says that man's chief end is to glorify God and to enjoy him forever." },
    ],
    practices: [
      "Worship centres on the reading and preaching of Scripture, with prayer, psalms and hymns and the regular celebration of the Lord's Supper. Traditional Presbyterian worship is shaped by the regulative principle, the conviction that worship should include only what Scripture commands or warrants; some churches sing only psalms.",
      "Catechesis, especially the Westminster Shorter Catechism and the Heidelberg Catechism in Reformed churches, has historically been central to Presbyterian education.",
    ],
    structure: [
      "In the United States the largest bodies are the Presbyterian Church (U.S.A.), formed in 1983 by the reunion of northern and southern churches divided since the Civil War, and the Presbyterian Church in America, formed in Birmingham, Alabama, in December 1973 by congregations that left the southern church over theological liberalism. Other bodies include the Orthodox Presbyterian Church (1936) and ECO, A Covenant Order of Evangelical Presbyterians (2012).",
      "The PC(USA) holds a Book of Confessions of several historic and modern statements and ordains women and men to all offices, and since 2014-2015 its constitution allows same-sex marriage. The PCA holds the Westminster Standards, ordains only men as ruling elder or minister, and holds to the traditional teaching on marriage.",
    ],
    relationships: [
      "Presbyterians are one branch of the wider Reformed family, which also includes the Dutch and continental Reformed churches and Congregationalists. The PC(USA) is in full communion with the ELCA and several other churches under the 1997 Formula of Agreement.",
    ],
    evangelicalView: {
      agreements: [
        "The Westminster Standards are among the most thorough statements of Reformation teaching on Scripture and salvation ever written, and many evangelicals of other churches learned their theology from them. Conservative Presbyterian bodies such as the PCA are firmly within evangelicalism.",
      ],
      disagreements: [
        "Baptist and other believers'-church evangelicals disagree with infant baptism. Many evangelicals hold to a different view of God's sovereignty and human freedom than the Reformed doctrine of predestination.",
        "Evangelicals share conservative Presbyterians' concern that the PC(USA) has moved away from the authority of Scripture, particularly on marriage and sexuality.",
      ],
      evangelicalsDiffer: [
        "Calvinist and Arminian evangelicals have disagreed about predestination since the seventeenth century, and both positions are held by faithful evangelicals. Evangelicals also differ on church government and on the regulative principle of worship.",
      ],
    },
    ownAnswer: [
      "Presbyterians answer that predestination is not a speculation but a comfort, the assurance that salvation rests wholly on God's grace (Ephesians 1:4-5; Romans 8:29-30). On infant baptism they argue that the New Testament keeps the Old Testament's pattern of including children in the covenant (Acts 2:39) and that household baptisms in Acts point the same way.",
    ],
    sources: [
      { kind: "official", label: "PC(USA), Reformed theology", url: "https://pcusa.org/about-pcusa/who-we-are/reformed-theology" },
      { kind: "official", label: "Presbyterian Church in America, Beliefs", url: "https://pcanet.org/beliefs/" },
      { kind: "primary", label: "Westminster Confession of Faith (1646)", url: "https://en.wikisource.org/wiki/Westminster_Confession_of_Faith", note: "editions on Wikisource, public domain" },
      { kind: "data", label: "Presbyterian News Service, PC(USA) membership 2025", url: "https://pcusa.org/news-storytelling/news/2026/6/29/pcusa-still-home-more-1-million-members" },
      { kind: "data", label: "byFaith, New statistics reveal PCA's growth in 2024", url: "https://byfaithonline.com/new-statistics-reveal-pcas-growth-in-2024/" },
      { kind: "official", label: "PCA, History", url: "https://pcanet.org/history" },
    ],
    verses: [
      { reference: "Ephesians 1:4-5", note: "chosen before the foundation of the world" },
      { reference: "Acts 2:39", note: "the promise is for you and for your children" },
    ],
    relatedIds: ["lutheranism", "anglicanism", "southern-baptist-convention"],
  },

  // ─────────────────────────────────────────────────────────────── Church of the Nazarene
  {
    id: "church-of-the-nazarene",
    name: "Church of the Nazarene",
    alternateNames: ["Nazarenes"],
    area: "christian-tradition",
    group: "Methodist and Holiness churches",
    role: "Wesleyan-Holiness Protestant denomination",
    summary:
      "An international Wesleyan-Holiness denomination formed in 1908 from a union of American holiness churches, known for its teaching on entire sanctification.",
    selfDescription:
      "The denomination describes itself as a Christian, holiness and missional church in the Wesleyan tradition, whose mission is to make Christlike disciples in the nations.",
    founding: {
      founders:
        "Several founders. Phineas F. Bresee and Joseph P. Widney organised the Church of the Nazarene in Los Angeles in 1895. Regional holiness bodies united with it in 1907 and 1908.",
      founderKind: "several",
      date: "October 1908 (union at Pilot Point, Texas), the date the church uses for its founding",
      dateNote: "The body was called the Pentecostal Church of the Nazarene until 1919, when it dropped the word Pentecostal; it is not part of the Pentecostal movement.",
      place: "Pilot Point, Texas",
    },
    adherents: {
      figure: "2,764,205",
      counts: "total members worldwide",
      year: "2025 (reporting year October 2024 to September 2025)",
      source: { label: "Church of the Nazarene, General Secretary releases 2025 statistics", url: "https://nazarene.org/news/general-secretary-releases-2025-statistics/" },
      verified: true,
    },
    distinctives: [
      "The church's defining teaching is entire sanctification: a work of God, subsequent to regeneration, by which believers are freed from original sin and brought into entire devotement to God, received by faith. Nazarenes stress that this is not sinless perfection but a heart made perfect in love, and that growth in grace continues after it.",
      "Its theology is Wesleyan-Arminian. God's grace goes before every person, enabling them to respond; Christ died for all; and a believer can fall away. Nazarenes speak of the optimism of grace, the hope that God can truly change a human life.",
      "The church has ordained women since its founding, and its early leaders combined holiness preaching with ministry among the poor of American cities.",
    ],
    beliefs: [
      { label: "God and Christ", statement: "One God, Father, Son and Holy Spirit; Jesus Christ fully God and fully man." },
      { label: "Scripture", statement: "The Holy Scriptures are given by divine inspiration, inerrantly revealing the will of God concerning us in all things necessary to our salvation." },
      { label: "Salvation", statement: "Justification, regeneration and adoption are received by faith in Christ, made possible by prevenient grace offered to all." },
      { label: "Entire sanctification", statement: "A second, definite work of grace in which the heart is cleansed from original sin and filled with perfect love (1 Thessalonians 5:23)." },
      { label: "Sacraments", statement: "Baptism, which may be by sprinkling, pouring or immersion and may be given to infants, and the Lord's Supper." },
      { label: "Holy living", statement: "Members commit to a covenant of Christian character and conduct, historically including abstinence from alcohol and tobacco." },
    ],
    practices: [
      "Worship is evangelical and often revivalist in style, with preaching, singing and invitations to respond. Revival meetings and camp meetings were central to the church's early life.",
      "The church has a strong missionary and educational emphasis, with Nazarene universities and colleges in the United States and around the world, and compassionate ministries in many countries.",
    ],
    structure: [
      "The church combines superintendency with representative government. A General Assembly meets every four years and elects the Board of General Superintendents; districts are led by district superintendents. Its doctrine and polity are set out in the Manual, and its Articles of Faith state its beliefs. Its global ministry centre is in Lenexa, Kansas.",
    ],
    relationships: [
      "Nazarenes belong to the Holiness movement that came out of nineteenth-century Methodism, alongside the Wesleyan Church, the Free Methodist Church and the Salvation Army. The church is a member of the National Association of Evangelicals in the United States.",
    ],
    evangelicalView: {
      agreements: [
        "This denomination is an evangelical church. It confesses the Trinity, the authority of Scripture, salvation by grace through faith in Christ, and a call to holy living that all evangelicals share (Hebrews 12:14).",
      ],
      disagreements: [
        "Most evangelicals outside the Wesleyan-Holiness tradition do not accept entire sanctification as a distinct second work of grace in this life, holding that sanctification is progressive until glorification and that indwelling sin remains in believers (1 John 1:8).",
      ],
      evangelicalsDiffer: [
        "This is a disagreement within evangelicalism. Reformed evangelicals hold that true believers will persevere to the end, while Wesleyan evangelicals such as the Nazarenes hold that a believer can fall away; both cite Scripture, and both are evangelical positions.",
      ],
    },
    ownAnswer: [
      "Nazarenes answer that Scripture commands and promises holiness (1 Thessalonians 5:23; Matthew 5:48), and that God would not command what his grace cannot accomplish. They stress that entire sanctification is about love, not about a claim never to sin, and that John Wesley taught the same.",
    ],
    sources: [
      { kind: "official", label: "Church of the Nazarene, What We Believe", url: "https://nazarene.org/what-we-believe/" },
      { kind: "official", label: "Church of the Nazarene, Historical Statement", url: "https://nazarene.org/historical-statement" },
      { kind: "official", label: "Church of the Nazarene, Our History", url: "https://nazarene.org/our-history/" },
      { kind: "data", label: "Church of the Nazarene, 2025 statistics", url: "https://nazarene.org/news/general-secretary-releases-2025-statistics/" },
    ],
    verses: [
      { reference: "1 Thessalonians 5:23", note: "sanctify you completely" },
      { reference: "Hebrews 12:14", note: "holiness without which no one will see the Lord" },
      { reference: "1 John 1:8", note: "if we say we have no sin, we deceive ourselves" },
    ],
    relatedIds: ["united-methodist-church", "assemblies-of-god"],
  },

  // ─────────────────────────────────────────────────────────────── Southern Baptist Convention
  {
    id: "southern-baptist-convention",
    name: "Southern Baptist Convention",
    alternateNames: ["Southern Baptists", "SBC"],
    area: "christian-tradition",
    group: "Baptist churches",
    role: "Cooperative fellowship of Baptist churches in the United States",
    summary:
      "The largest Protestant body in the United States: a voluntary convention of autonomous Baptist churches that cooperate in missions, theological education and other ministries.",
    selfDescription:
      "The SBC describes itself not as a denomination with authority over churches but as a network of independent, autonomous Baptist churches that voluntarily cooperate to share the gospel around the world, united around the Baptist Faith and Message.",
    founding: {
      founders:
        "Organised by delegates of Baptist churches from the southern states, led by figures such as William B. Johnson, its first president. Baptists as a movement date from early seventeenth-century English Separatists, including John Smyth and Thomas Helwys.",
      founderKind: "several",
      date: "8 May 1845",
      dateNote:
        "Southern Baptists separated from northern Baptists over the appointment of slaveholders as missionaries. In 1995 the convention adopted a resolution repenting of its historic defence of slavery and racism.",
      place: "Augusta, Georgia",
    },
    adherents: {
      figure: "12,331,954",
      counts: "members of cooperating churches reported in the Annual Church Profile",
      year: "2025",
      source: {
        label: "The Baptist Paper, Annual Church Profile report",
        url: "https://thebaptistpaper.org/annual-church-profile-amid-falling-membership-in-sbc-baptisms-increase-for-5th-consecutive-year/",
      },
      verified: true,
      note: "Reported from the SBC's Annual Church Profile; the Baptist Press page could not be loaded. Membership rolls are larger than weekly attendance.",
    },
    distinctives: [
      "Baptists baptise only those who profess faith in Christ, and only by immersion, which they understand as the New Testament pattern and a picture of death, burial and resurrection with Christ (Romans 6:4). Baptism and the Lord's Supper are called ordinances, acts of obedience and remembrance, rather than sacraments that convey grace.",
      "Every local church is autonomous. Congregations call their own pastors, own their property and govern themselves under Christ; no convention, association or agency has authority over them. The convention meets once a year as messengers from the churches.",
      "Baptists have historically championed religious liberty and the separation of church and state, the conviction that faith must be free and that the state has no authority over conscience.",
      "Cooperation is funded mainly through the Cooperative Program, begun in 1925, which supports the International Mission Board, the North American Mission Board, six seminaries and other ministries.",
    ],
    beliefs: [
      { label: "Scripture", statement: "The Holy Bible was written by men divinely inspired and is God's revelation of himself to man; it has truth, without any mixture of error, for its matter (Baptist Faith and Message 2000, Article I)." },
      { label: "God and Christ", statement: "One God, eternally existing as Father, Son and Holy Spirit; Jesus Christ the eternal Son, fully God and fully man, who died for sin and rose bodily." },
      { label: "Salvation", statement: "Salvation is offered freely to all who accept Jesus Christ as Lord and Saviour, and is by grace through faith (Ephesians 2:8-9). Southern Baptists hold that genuine believers will never fall away." },
      { label: "The church", statement: "A New Testament church is an autonomous local congregation of baptised believers. The office of pastor is limited to men as qualified by Scripture." },
      { label: "Ordinances", statement: "Believer's baptism by immersion and the Lord's Supper as a memorial of Christ's death." },
      { label: "Family and life", statement: "Marriage is the union of one man and one woman in covenant commitment for a lifetime; human life is sacred from conception." },
      { label: "Mission", statement: "It is the duty of every Christian and every church to make disciples of all nations (Matthew 28:19-20)." },
    ],
    practices: [
      "Worship is centred on preaching, congregational singing and prayer, often closing with an invitation to respond to the gospel. Many churches celebrate the Lord's Supper monthly or quarterly. Sunday school and small-group Bible study are traditional strengths.",
      "Evangelism and missions are defining priorities; the International Mission Board supports thousands of missionaries abroad.",
    ],
    structure: [
      "Churches relate voluntarily to local associations, state conventions and the national convention. The national convention's statement of faith, the Baptist Faith and Message, was adopted in 1925 and revised in 1963 and 2000. A churches-in-friendly-cooperation standard allows the convention to decline to seat messengers from churches it judges out of step with its beliefs; in 2023 messengers upheld the removal of churches with women serving as pastors.",
      "From 1979 the convention went through what supporters call the Conservative Resurgence, which reaffirmed the inerrancy of Scripture in its seminaries and agencies. Some churches that disagreed later formed the Cooperative Baptist Fellowship (1991).",
    ],
    relationships: [
      "Southern Baptists are part of the wider Baptist family, which includes the American Baptist Churches USA, the National Baptist Convention and other historically Black Baptist bodies, and Baptist unions around the world. The SBC withdrew from the Baptist World Alliance in 2004.",
    ],
    evangelicalView: {
      agreements: [
        "The Southern Baptist Convention is at the centre of American evangelicalism. Its statement of faith on Scripture, the Trinity, Christ, salvation by grace through faith and the Great Commission is evangelical belief in its plainest form.",
      ],
      disagreements: [
        "Evangelicals in paedobaptist churches (Presbyterian, Anglican, Lutheran, Methodist) disagree with the Baptist restriction of baptism to professing believers, and Lutherans and others hold a higher view of the sacraments than the memorial view common among Baptists.",
      ],
      evangelicalsDiffer: [
        "Within the SBC itself, Calvinist and non-Calvinist Baptists have debated the doctrines of grace for years, and the convention has debated the role of women in ministry. Evangelicals more broadly differ on whether women may serve as pastors, on the meaning and subjects of baptism, and on how closely churches should be involved in politics.",
      ],
    },
    ownAnswer: [
      "Baptists answer that the New Testament everywhere connects baptism with repentance and faith (Acts 2:38-41; Acts 8:36-38) and gives no clear command or example of infant baptism, so that believer's baptism is simply obedience to Scripture. They hold that a regenerate church membership is the New Testament's picture of the church.",
    ],
    sources: [
      { kind: "official", label: "The Baptist Faith and Message 2000", url: "https://bfm.sbc.net/bfm2000/" },
      { kind: "official", label: "SBC Constitution", url: "https://www.sbc.net/about/what-we-do/legal-documentation/constitution/" },
      { kind: "data", label: "The Baptist Paper, Annual Church Profile 2025", url: "https://thebaptistpaper.org/annual-church-profile-amid-falling-membership-in-sbc-baptisms-increase-for-5th-consecutive-year/" },
      { kind: "reference", label: "Christian History Magazine, issue 126: Baptists in America", url: "https://christianhistoryinstitute.org/magazine/issue/baptists-in-america" },
    ],
    verses: [
      { reference: "Romans 6:4", note: "buried with him by baptism" },
      { reference: "Ephesians 2:8-9", note: "by grace through faith" },
      { reference: "Matthew 28:19-20", note: "the Great Commission" },
    ],
    relatedIds: ["churches-of-christ", "non-denominational-churches", "presbyterianism"],
  },

  // ─────────────────────────────────────────────────────────────── United Methodist Church
  {
    id: "united-methodist-church",
    name: "United Methodist Church",
    alternateNames: ["United Methodists", "UMC", "Methodism"],
    area: "christian-tradition",
    group: "Methodist and Holiness churches",
    role: "Methodist denomination in the Wesleyan tradition",
    summary:
      "The largest Methodist body in the United States, with conferences in Africa, Europe and the Philippines, formed in 1968 and rooted in the eighteenth-century revival led by John Wesley.",
    selfDescription:
      "United Methodists describe their church as a connectional church in the Wesleyan tradition whose mission is to make disciples of Jesus Christ for the transformation of the world, holding together personal faith and social holiness.",
    founding: {
      founders:
        "Methodism began with John Wesley (1703-1791) and Charles Wesley, Anglican priests, in the 1730s and 1740s, alongside George Whitefield. The United Methodist Church itself was formed by the union of two churches.",
      founderKind: "several",
      date: "23 April 1968 (union of the Methodist Church and the Evangelical United Brethren Church)",
      dateNote: "American Methodism became a separate church at the Christmas Conference in Baltimore in 1784.",
      place: "Dallas, Texas",
    },
    adherents: {
      figure: "about 10.3 million worldwide, including about 3.8 million in the United States",
      counts: "professing members",
      year: "2025 (US); latest reported years elsewhere",
      source: { label: "UM News, Amid decline, US professions of faith rise (October 2026)", url: "https://www.umnews.org/en/news/amid-decline-us-professions-of-faith-rise" },
      verified: true,
      note: "Down from an estimated 12.5 million in 2017, largely because of the disaffiliations of 2019-2023. Figures outside the US come from the latest available annual conference journals, so years vary.",
    },
    distinctives: [
      "Methodism began as a disciplined renewal movement within the Church of England: small groups (classes and bands) meeting weekly for accountability, field preaching to people outside the churches, and hymns, many by Charles Wesley, that taught doctrine in song.",
      "Its theology is Wesleyan and Arminian. Prevenient grace goes before every person; justifying grace forgives and accepts the believer by faith; sanctifying grace leads toward Christian perfection, a life filled with love for God and neighbour. John Wesley's account of his heart being strangely warmed at Aldersgate Street in 1738 is often seen as emblematic of Methodism's stress on assurance.",
      "Methodism joins personal holiness with social holiness, and the United Methodist Church has a long record of social engagement, set out in its Social Principles.",
    ],
    beliefs: [
      { label: "God and Christ", statement: "The Trinity and the person of Christ as confessed in the historic creeds and in the church's Articles of Religion and Confession of Faith." },
      { label: "Scripture", statement: "Scripture contains all things necessary to salvation and is the primary source and criterion for Christian doctrine, read with tradition, experience and reason (often called the Wesleyan Quadrilateral)." },
      { label: "Salvation", statement: "Salvation is by grace through faith, offered to all; Christ died for all people, and grace can be resisted." },
      { label: "Sacraments", statement: "Two sacraments, baptism (given to infants and adults) and Holy Communion, with Christ really present in Communion; the table is open to all who seek Christ." },
      { label: "Sanctification", statement: "Believers are called to grow in grace toward perfection in love in this life." },
      { label: "Social holiness", statement: "Faith is expressed in works of mercy and justice." },
    ],
    practices: [
      "Worship ranges from liturgical services using the United Methodist Hymnal and Book of Worship to contemporary styles. Hymn singing is central. Many congregations run food pantries, disaster relief through the United Methodist Committee on Relief, schools and hospitals.",
    ],
    structure: [
      "The church is connectional: congregations belong to districts and annual conferences, led by bishops who appoint pastors to churches. The General Conference, meeting every four years, is the only body that speaks for the whole church, and the Judicial Council rules on church law. The Book of Discipline sets out its doctrine and order.",
      "After decades of division over sexuality, a 2019 special General Conference adopted a temporary process (¶2553 of the Book of Discipline) allowing US churches to leave with their property; about a quarter of US congregations did so by 2023, many joining the Global Methodist Church, launched in 2022. In 2024 the General Conference removed the church's restrictions on gay clergy and same-sex weddings and approved a regional structure for the worldwide church.",
    ],
    relationships: [
      "Other Methodist bodies include the African Methodist Episcopal Church, the African Methodist Episcopal Zion Church, the Christian Methodist Episcopal Church, the Free Methodist Church and the Global Methodist Church. The Holiness movement, including the Nazarenes, and through it much of Pentecostalism, grew out of Methodism.",
    ],
    evangelicalView: {
      agreements: [
        "The Methodist revival is one of the founding streams of evangelicalism, and Wesleyan teaching on new birth, assurance and holy living has shaped evangelicals everywhere. Many United Methodist congregations and members are evangelical.",
      ],
      disagreements: [
        "Evangelicals generally hold that the 2024 changes on marriage and sexuality depart from Scripture's teaching (Matthew 19:4-6), and that the church has for many years tolerated teaching contrary to its own doctrinal standards.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on Arminian and Calvinist accounts of grace, on infant baptism and on women's ordination, all of which the United Methodist Church holds in the Arminian, paedobaptist and egalitarian direction. Evangelical Methodists themselves divided over whether to stay or leave during the disaffiliation period.",
      ],
    },
    ownAnswer: [
      "United Methodists who support the 2024 decisions answer that they read Scripture through the whole witness of Christ's love and through the experience of the church, and that the church's doctrinal standards on Christ and salvation are unchanged. They point to Wesley's own call to unity in essentials and charity where Christians disagree.",
    ],
    sources: [
      { kind: "official", label: "United Methodist Church, What we believe", url: "https://www.umc.org/en/what-we-believe" },
      { kind: "official", label: "Ask The UMC: When was The United Methodist Church created?", url: "https://www.umc.org/en/content/ask-the-umc-when-was-the-united-methodist-church-created" },
      { kind: "data", label: "UM News, Amid decline, US professions of faith rise", url: "https://www.umnews.org/en/news/amid-decline-us-professions-of-faith-rise" },
      { kind: "data", label: "UMData (General Council on Finance and Administration)", url: "https://www.umdata.org/" },
    ],
    verses: [{ reference: "Matthew 22:37-39", note: "love God and neighbour, the heart of Wesleyan perfection" }],
    relatedIds: ["anglicanism", "church-of-the-nazarene", "assemblies-of-god"],
  },

  // ─────────────────────────────────────────────────────────────── Assemblies of God
  {
    id: "assemblies-of-god",
    name: "Assemblies of God",
    alternateNames: ["AG", "AOG", "General Council of the Assemblies of God"],
    area: "christian-tradition",
    group: "Pentecostal churches",
    role: "Pentecostal fellowship of churches",
    summary:
      "The largest Pentecostal fellowship in the world, organised in 1914 and known for its teaching on the baptism in the Holy Spirit and spiritual gifts.",
    selfDescription:
      "The Assemblies of God describes itself as a Pentecostal fellowship committed to reaching people with the gospel, worshipping God, making disciples and showing compassion, in the power of the Holy Spirit.",
    founding: {
      founders:
        "About three hundred Pentecostal ministers and lay people, gathered under the leadership of figures including Eudorus N. Bell, its first chairman. The wider Pentecostal movement traces itself to revivals in the early 1900s, especially the Azusa Street Revival in Los Angeles led by William J. Seymour from 1906.",
      founderKind: "several",
      date: "April 1914 (General Council, 2-12 April)",
      place: "Hot Springs, Arkansas",
    },
    adherents: {
      figure: "88,866,189 worldwide, including 3,102,546 in the United States",
      counts: "adherents in the Assemblies of God and the World Assemblies of God Fellowship",
      year: "2025",
      source: { label: "Assemblies of God media kit", url: "https://cdn1.acdn.io/sites/agorg/Press/Assemblies_of_God_Media_Kit.pdf" },
      verified: true,
      note: "Adherents include children and regular attenders, not only members. The World Assemblies of God Fellowship's own site rounds the worldwide figure to 88 million in more than 451,000 churches.",
    },
    distinctives: [
      "The Assemblies of God teaches that all believers should seek the baptism in the Holy Spirit, a gift distinct from and following the new birth, which empowers them for witness and service (Acts 1:8). Its Statement of Fundamental Truths holds that the initial physical evidence of this baptism is speaking in other tongues as the Spirit gives utterance (Acts 2:4).",
      "It is continuationist: the gifts of the Spirit described in 1 Corinthians 12, including prophecy, tongues, interpretation and healing, continue in the church today. Divine healing is taught as provided for in Christ's atonement.",
      "Expectant, expressive worship, with raised hands, spontaneous prayer and openness to the gifts, is characteristic, though styles vary widely. The fellowship has credentialed women as ministers from its early years.",
    ],
    beliefs: [
      { label: "Scripture", statement: "The Scriptures, Old and New Testaments, are verbally inspired of God and are the revelation of God to man, the infallible, authoritative rule of faith and conduct." },
      { label: "God and Christ", statement: "One true God revealed as Father, Son and Holy Spirit; the deity of Jesus Christ, his virgin birth, sinless life, miracles, atoning death and bodily resurrection." },
      { label: "Salvation", statement: "Salvation is received through repentance toward God and faith toward the Lord Jesus Christ, by grace." },
      { label: "Ordinances", statement: "Water baptism by immersion of believers, and the Lord's Supper." },
      { label: "Baptism in the Holy Spirit", statement: "A distinct experience available to all believers, evidenced initially by speaking in tongues." },
      { label: "Healing", statement: "Deliverance from sickness is provided for in the atonement and is the privilege of all believers." },
      { label: "Last things", statement: "The imminent return of Christ to gather the church (the rapture), followed by his visible return and millennial reign; eternal judgment." },
    ],
    practices: [
      "Services combine contemporary worship, preaching and altar times for prayer, where people seek salvation, Spirit baptism and healing. Missions are a defining priority: the US fellowship has sent missionaries since its first years, and most of its worldwide adherents are outside North America.",
    ],
    structure: [
      "In the United States the Assemblies of God is a cooperative fellowship: local churches are self-governing, while district councils and the General Council credential ministers and coordinate missions. Its national office is in Springfield, Missouri. National Assemblies of God churches in other countries are autonomous and cooperate through the World Assemblies of God Fellowship.",
      "Its doctrine is set out in the 16 Fundamental Truths, first adopted in 1916. That year it affirmed the doctrine of the Trinity against the Oneness (Jesus-only) teaching, and the Oneness Pentecostals separated from it.",
    ],
    relationships: [
      "The Assemblies of God belongs to the broad Pentecostal movement with churches such as the Church of God in Christ, the Church of God (Cleveland, Tennessee) and the International Church of the Foursquare Gospel. The charismatic renewal brought similar experiences into mainline, Catholic and non-denominational churches from the 1960s. The US fellowship is a member of the National Association of Evangelicals.",
    ],
    evangelicalView: {
      agreements: [
        "The Assemblies of God is an evangelical fellowship. Its fundamental truths on Scripture, the Trinity, Christ and salvation by grace through faith are shared by all evangelicals, and its missionary zeal is one of the great evangelistic movements of the past century.",
      ],
      disagreements: [
        "Many evangelicals do not accept that Spirit baptism is a distinct experience after conversion, holding that every believer receives the Spirit at conversion (1 Corinthians 12:13), and most do not accept that tongues is the necessary initial evidence. Many are cautious about claims that healing is guaranteed in the atonement.",
      ],
      evangelicalsDiffer: [
        "Evangelicals are divided between continuationists, who believe all the spiritual gifts continue today, and cessationists, who believe the sign gifts ceased with the apostolic age; many hold an open-but-cautious view between them. All three positions are held within evangelicalism.",
      ],
    },
    ownAnswer: [
      "Pentecostals answer that the pattern of Acts, in which believers who had already come to faith later received the Spirit with tongues (Acts 2:4; Acts 8:14-17; Acts 19:1-6), is meant for the whole church, and that the promise of the Spirit is for all whom the Lord calls (Acts 2:39). They point to the explosive growth of Pentecostal churches in the global South as fruit of the Spirit's power.",
    ],
    sources: [
      { kind: "official", label: "Assemblies of God, Statement of Fundamental Truths", url: "https://ag.org/beliefs/statement-of-fundamental-truths", note: "could not be loaded on 2026-11-26" },
      { kind: "official", label: "Assemblies of God media kit", url: "https://cdn1.acdn.io/sites/agorg/Press/Assemblies_of_God_Media_Kit.pdf" },
      { kind: "official", label: "World Assemblies of God Fellowship", url: "https://worldagfellowship.org/" },
      { kind: "reference", label: "CALS Encyclopedia of Arkansas, Assemblies of God", url: "https://encyclopediaofarkansas.net/entries/assemblies-of-god-5121/" },
    ],
    verses: [
      { reference: "Acts 1:8", note: "power when the Holy Spirit comes" },
      { reference: "Acts 2:4", note: "speaking in other tongues at Pentecost" },
      { reference: "1 Corinthians 12:13", note: "all baptised by one Spirit into one body" },
    ],
    relatedIds: ["united-methodist-church", "church-of-the-nazarene", "non-denominational-churches"],
  },

  // ─────────────────────────────────────────────────────────────── Churches of Christ
  {
    id: "churches-of-christ",
    name: "Churches of Christ",
    alternateNames: ["Church of Christ", "a cappella Churches of Christ"],
    area: "christian-tradition",
    group: "Restorationist churches",
    role: "Autonomous congregations of the Stone-Campbell Restoration Movement",
    summary:
      "Independent congregations that seek to restore the church of the New Testament, known for weekly communion, believers' immersion and singing without instruments.",
    selfDescription:
      "Members of Churches of Christ generally do not regard themselves as a denomination but as Christians only, seeking to be the church described in the New Testament, speaking where the Bible speaks and being silent where the Bible is silent. The name comes from Romans 16:16.",
    founding: {
      founders:
        "No founder in their own understanding, which traces the church to Pentecost. Historically, the movement grew from the American Restoration Movement led by Barton W. Stone (associated with the Cane Ridge revival of 1801) and Thomas Campbell and Alexander Campbell (Thomas Campbell's Declaration and Address, 1809). Its followers united in 1832.",
      founderKind: "none",
      date: "Early 1800s (Restoration Movement); listed separately from the Disciples of Christ in the 1906 US religious census",
      dateNote: "Members would say the church began at Pentecost (Acts 2); the dates describe the modern movement.",
      place: "Kentucky, Pennsylvania and western Virginia",
    },
    adherents: {
      figure: "about 1.42 million in about 11,900 congregations",
      counts: "adherents in the United States, from 21st Century Christian's directory",
      year: "latest directory figures, reported January 2025",
      source: { label: "The Christian Chronicle, Holy imagination: churches seek to reverse decline (2025)", url: "https://christianchronicle.org/holy-imagination-churches-seek-to-reverse-decline/" },
      verified: true,
      note: "There is no central membership roll, and the directory behind these figures was last printed in 2018. A January 2026 Christian Chronicle article reports a researcher's estimate of about 10,100 congregations and 850,000-950,000 regular attenders. No worldwide figure was confirmed from a primary source.",
    },
    distinctives: [
      "Congregations sing a cappella, without musical instruments, because instruments are not commanded in New Testament worship (Ephesians 5:19; Colossians 3:16). This, together with disagreement over missionary societies, was a main cause of the division from the Christian Church (Disciples of Christ).",
      "The Lord's Supper is observed every Sunday, following Acts 20:7.",
      "Baptism is by immersion of believers, and is taught as the point at which a penitent believer receives forgiveness of sins and the gift of the Holy Spirit (Acts 2:38; Acts 22:16). Members stress that this is obedience of faith, not a work that earns salvation.",
    ],
    beliefs: [
      { label: "Scripture", statement: "The Bible is the inspired Word of God and the only authority for faith and practice; creeds are not used as tests of fellowship." },
      { label: "God and Christ", statement: "One God, Father, Son and Holy Spirit; Jesus Christ is the Son of God, who died for sin and rose again." },
      { label: "Salvation", statement: "A person is saved by God's grace through faith, expressed in hearing the gospel, believing, repenting, confessing Christ and being baptised for the remission of sins." },
      { label: "The church", statement: "The church is the body of Christ; each congregation is self-governing under its own overseers and deacons." },
      { label: "Worship", statement: "Worship follows New Testament patterns: singing, prayer, preaching, giving and the Lord's Supper every first day of the week." },
      { label: "Unity", statement: "Christian unity is to be found by returning to the New Testament rather than by agreement on human creeds." },
    ],
    practices: [
      "Sunday worship includes a cappella congregational singing, prayer, preaching, giving and the Lord's Supper. Bible classes for all ages are traditional. Congregations are often active in mission work and support Christian universities associated with the movement.",
    ],
    structure: [
      "There is no headquarters, synod or convention. Each congregation is autonomous, led by a plurality of men serving as elder, also called shepherds, and served by deacons and preachers. Cooperation happens through lectureships, colleges, periodicals and congregations voluntarily supporting shared works.",
      "Within the fellowship there are subgroups, such as non-institutional congregations that do not fund orphanages or colleges from church treasuries, and congregations that use one cup for communion. The International Churches of Christ is a separate movement with its own history and leadership.",
    ],
    relationships: [
      "Churches of Christ share their origin with the Christian Church (Disciples of Christ), a mainline denomination, and the independent Christian Churches and Churches of Christ, which use instruments. Many members are cautious about the label evangelical, though they share most evangelical convictions.",
    ],
    evangelicalView: {
      agreements: [
        "Evangelicals share the Churches of Christ's devotion to Scripture as the supreme authority, their confession of Christ's deity and resurrection, their seriousness about baptism and the Lord's Supper, and their longing for a church shaped by the New Testament.",
      ],
      disagreements: [
        "Most evangelicals disagree with teaching that baptism is necessary for the forgiveness of sins, holding that forgiveness is received by faith and that baptism follows as its sign (Ephesians 2:8-9; Acts 10:44-48).",
        "Most evangelicals also do not accept that the silence of the New Testament forbids instruments in worship, citing the Psalms' instruments as part of the worship God receives (Psalm 150).",
      ],
      evangelicalsDiffer: [
        "Evangelicals themselves differ on how baptism relates to conversion, and some evangelical scholars note that the New Testament closely ties baptism to repentance and faith. Within Churches of Christ, too, views vary on how to regard sincere believers who were not immersed.",
      ],
    },
    ownAnswer: [
      "Members answer that they do not add baptism to faith but obey the gospel as the apostles preached it: Peter's answer at Pentecost was repent and be baptised for the forgiveness of sins (Acts 2:38), and Paul was told to be baptised and wash away his sins (Acts 22:16). On instruments, they answer that New Testament worship tells Christians to sing, and that faithfulness means not adding what God has not asked.",
    ],
    sources: [
      { kind: "reference", label: "The Christian Chronicle, What is a Church of Christ?", url: "https://christianchronicle.org/what-is-a-church-of-christ/", note: "news journal published by members of Churches of Christ" },
      { kind: "data", label: "The Christian Chronicle, Holy imagination: churches seek to reverse decline", url: "https://christianchronicle.org/holy-imagination-churches-seek-to-reverse-decline/" },
      { kind: "data", label: "The Christian Chronicle, Why counting the sheep is so difficult (2026)", url: "https://christianchronicle.org/why-counting-the-sheep-is-so-difficult/" },
      { kind: "primary", label: "Last Will and Testament of the Springfield Presbytery (1804)", url: "https://en.wikisource.org/wiki/Last_Will_and_Testament_of_The_Springfield_Presbytery", note: "Barton W. Stone and colleagues; public-domain text on Wikisource" },
    ],
    verses: [
      { reference: "Romans 16:16", note: "the churches of Christ greet you" },
      { reference: "Acts 2:38", note: "repent and be baptised for the forgiveness of sins" },
      { reference: "Acts 20:7", note: "on the first day of the week, to break bread" },
      { reference: "Ephesians 5:19", note: "singing and making melody in your heart" },
    ],
    relatedIds: ["southern-baptist-convention", "non-denominational-churches"],
  },

  // ─────────────────────────────────────────────────────────────── Seventh-day Adventists
  {
    id: "seventh-day-adventist-church",
    name: "Seventh-day Adventist Church",
    alternateNames: ["Seventh-day Adventists", "Adventists", "SDA"],
    area: "christian-tradition",
    group: "Adventist churches",
    role: "Protestant denomination keeping the seventh-day Sabbath",
    summary:
      "A worldwide Protestant church that grew from the American Advent movement of the 1840s, known for keeping Saturday as the Sabbath, expecting Christ's soon return and its emphasis on health.",
    selfDescription:
      "Seventh-day Adventists describe themselves as Protestant Christians who accept the Bible as their only creed, keep the seventh-day Sabbath, and proclaim the everlasting gospel and the soon return of Jesus, as in the three angels' messages of Revelation 14.",
    founding: {
      founders:
        "Several founders. The church grew from the Millerite movement of William Miller. Its principal founders were Joseph Bates, James White and Ellen G. White, whom Adventists regard as having received the gift of prophecy.",
      founderKind: "several",
      date: "May 1863 (General Conference organised); the name Seventh-day Adventist was adopted in 1860",
      dateNote: "Its roots are in the Great Disappointment of 22 October 1844, when Christ did not return as Millerites had expected.",
      place: "Battle Creek, Michigan",
    },
    adherents: {
      figure: "24,372,139",
      counts: "baptized members worldwide",
      year: "end of 2025",
      source: { label: "Seventh-day Adventist Church, Adventist Atlas (Office of Archives, Statistics and Research)", url: "https://www.adventistatlas.org/" },
      verified: true,
      note: "The same figure appears in the church's 2025 world statistics summary. Weekly attendance figures differ from membership.",
    },
    distinctives: [
      "Adventists keep the seventh day, from sunset Friday to sunset Saturday, as the Sabbath of the fourth commandment (Exodus 20:8-11), a memorial of creation and a sign of redemption. They hold that God's moral law remains binding on Christians, not as a means of salvation but as the fruit of it.",
      "Adventists teach that Christ began a final phase of his ministry in the heavenly sanctuary in 1844, a pre-advent or investigative judgment, drawing on Daniel 8:14 and Hebrews 8-9.",
      "They teach conditional immortality: the dead sleep unconscious until they are raised at Christ's return, and the final punishment of the wicked is destruction rather than eternal conscious torment.",
      "Health is part of discipleship. Adventists avoid alcohol, tobacco and the meats Leviticus calls unclean, and many are vegetarian; the church runs one of the largest Protestant health care and education systems in the world.",
    ],
    beliefs: [
      { label: "Scripture", statement: "The Holy Scriptures are the infallible revelation of God's will and the standard by which all teaching and experience must be tested." },
      { label: "God and Christ", statement: "One God, a unity of three co-eternal Persons; Jesus Christ is fully God and fully human." },
      { label: "Salvation", statement: "Salvation is by grace through faith in Christ alone, whose life and death are the only means of atonement." },
      { label: "The Sabbath", statement: "The seventh-day Sabbath is God's perpetual sign of his covenant, to be kept by all Christians." },
      { label: "The gift of prophecy", statement: "The gift of prophecy was manifested in the ministry of Ellen G. White, whose writings Adventists regard as an authoritative source of counsel, while holding that the Bible is the standard by which all teaching is tested." },
      { label: "Death and resurrection", statement: "The dead are unconscious until they are raised at Christ's return; the wicked will ultimately be destroyed." },
      { label: "The second coming", statement: "The literal, personal, visible return of Christ is near." },
    ],
    practices: [
      "Sabbath begins with worship at sunset on Friday; Saturday includes Sabbath School (Bible study) and a worship service. Baptism is by immersion of believers. Communion is held quarterly and includes foot washing, following John 13.",
      "Adventists are known for education, from primary schools to universities, for health ministries and for disaster and development work through the Adventist Development and Relief Agency (ADRA).",
    ],
    structure: [
      "The church is organised in four levels: local churches, conferences, union conferences and the General Conference, whose world headquarters is in Silver Spring, Maryland, with regional divisions. The General Conference in session, every five years, sets its 28 Fundamental Beliefs and its Church Manual. In 2015 the session voted not to allow divisions to approve the ordination of women as pastors.",
    ],
    relationships: [
      "Adventists share their Millerite roots with smaller Adventist bodies such as the Advent Christian Church. In the 1950s conversations with evangelical leaders, including Walter Martin and Donald Grey Barnhouse, led to the book Questions on Doctrine (1957) and to Martin's conclusion that Adventists are fellow Christians, though he disagreed with several of their teachings.",
    ],
    evangelicalView: {
      agreements: [
        "Adventists confess the Trinity, the full deity of Christ, salvation by grace through faith in his atoning death and resurrection, the authority of Scripture and the visible return of Christ. They are, in the app's judgement and that of many evangelical scholars since the 1950s, Christians within historic orthodoxy, and the app files them among the Christian traditions.",
      ],
      disagreements: [
        "Most evangelicals hold that the Sabbath command is fulfilled in Christ and that Christians are not bound to keep the seventh day (Colossians 2:16-17), and do not accept the investigative judgment, which they find unsupported by Scripture and in tension with the finished work of Christ (Hebrews 9:12).",
        "Evangelicals hold that Scripture alone is the authority for doctrine and are concerned about the place given to Ellen G. White's writings.",
      ],
      evangelicalsDiffer: [
        "Evangelicals themselves differ on the Sabbath, from Sunday-sabbatarians in the Puritan tradition to those who see no day as binding, and on conditional immortality, which some respected evangelical theologians have held. These are disagreements within orthodoxy.",
      ],
    },
    ownAnswer: [
      "Adventists answer that the Sabbath was given at creation, before Israel existed (Genesis 2:2-3), stands within the Ten Commandments, and was kept by Jesus; no text transfers it to Sunday. They teach that Sabbath-keeping is rest in Christ's finished work, not a way of earning salvation. On Ellen G. White, they say that her writings are tested by Scripture and do not add to it, and that the gift of prophecy is promised to the church (Joel 2:28; Revelation 19:10).",
    ],
    sources: [
      { kind: "official", label: "Seventh-day Adventist Church, 28 Fundamental Beliefs", url: "https://www.adventist.org/beliefs/", note: "could not be loaded on 2026-11-26" },
      { kind: "data", label: "Adventist Atlas (Office of Archives, Statistics and Research)", url: "https://www.adventistatlas.org/" },
      { kind: "data", label: "Seventh-day Adventist World Church Statistics Summary 2025", url: "https://documents.adventistarchives.org/Statistics/Other/SDAWorldChurchStatsSummary2025.pdf", note: "could not be loaded on 2026-11-26" },
      { kind: "reference", label: "Christianity Today, What Seventh-day Adventists Believe (1984)", url: "https://www.christianitytoday.com/1984/10/what-seventh-day-adventists-believe" },
    ],
    verses: [
      { reference: "Exodus 20:8-11", note: "the fourth commandment" },
      { reference: "Revelation 14:6-12", note: "the three angels' messages" },
      { reference: "Colossians 2:16-17", note: "cited by evangelicals on Sabbath observance" },
      { reference: "Genesis 2:2-3", note: "God rested on the seventh day" },
    ],
    relatedIds: ["southern-baptist-convention"],
  },

  // ─────────────────────────────────────────────────────────────── Non-denominational
  {
    id: "non-denominational-churches",
    name: "Non-denominational Churches",
    alternateNames: ["Nondenominational", "Independent churches", "Non-denominational Christianity"],
    area: "christian-tradition",
    group: "Independent evangelical churches",
    role: "Independent Protestant congregations with no denominational affiliation",
    summary:
      "Protestant congregations, most of them evangelical, that belong to no denomination. Together they are now the largest Protestant grouping in the United States by congregations.",
    selfDescription:
      "Non-denominational churches usually describe themselves simply as Bible-believing Christian churches, focused on Jesus and Scripture rather than on a denominational tradition, and free to govern themselves.",
    founding: {
      founders:
        "No founder. Independent congregations have existed throughout Protestant history; their modern growth in the US owes much to independent Bible churches, the Jesus Movement and Calvary Chapel (from 1965, under Chuck Smith) and the megachurch movement of the late twentieth century.",
      founderKind: "none",
      date: "No single date; rapid growth from the 1970s",
    },
    adherents: {
      figure: "21,098,641 adherents in 44,319 congregations",
      counts: "adherents of non-denominational Christian churches in the United States",
      year: "2020",
      source: { label: "U.S. Religion Census 2020, Appendix B: Non-denominational Christian Churches", url: "https://www.usreligioncensus.org/sites/default/files/2023-03/Appendix_B--Non-denominational_Christian_Churches.pdf" },
      verified: true,
      note: "The census cautions that its list of independent churches is incomplete. Pew Research Center's 2023-24 Religious Landscape Study found that 7% of US adults identify as nondenominational Protestants. Worldwide independent churches are counted in other ways and are not included here.",
    },
    distinctives: [
      "Each congregation governs itself, usually under a lead pastor with an elder board or church board. Many hold a statement of faith close to that of the National Association of Evangelicals and practise believers' baptism by immersion, though practice varies.",
      "Worship is usually contemporary, with a band and modern worship songs, practical expository or topical preaching, small groups and a strong emphasis on welcome to newcomers. Many of the largest US churches are non-denominational.",
      "Many congregations relate to networks rather than denominations, such as church-planting networks, which offer training and fellowship without authority over local churches.",
    ],
    beliefs: [
      { label: "Scripture", statement: "Most hold that the Bible is the inspired and authoritative Word of God, often stated as inerrant." },
      { label: "God and Christ", statement: "Most confess the Trinity and the deity, death and bodily resurrection of Jesus Christ." },
      { label: "Salvation", statement: "Salvation by grace through faith in Christ, usually with an emphasis on personal conversion." },
      { label: "Baptism and communion", statement: "Most practise baptism of believers by immersion and celebrate communion as a memorial, though some baptise infants or hold other views." },
      { label: "The Holy Spirit", statement: "Views range from cessationist to charismatic; many non-denominational churches are charismatic in practice." },
    ],
    practices: [
      "Sunday services, often several, with contemporary worship and preaching; small groups or life groups through the week; and a strong emphasis on service, missions and outreach to the local community.",
    ],
    structure: [
      "There is no structure beyond the congregation, by definition. Some large churches have multiple campuses under one leadership, and some plant daughter churches. Accountability depends on each church's own elder board or church board and on any network it chooses to join.",
    ],
    relationships: [
      "Non-denominational churches draw members from every denomination and are often shaped by Baptist, Pentecostal and charismatic, Reformed or Wesleyan influences, depending on their founders. Calvary Chapel and the Vineyard, both from Southern California, began as independent movements and have become families of churches in their own right.",
    ],
    evangelicalView: {
      agreements: [
        "Most non-denominational churches are evangelical churches, and their focus on the gospel, on Scripture and on reaching people outside the church is evangelical conviction in practice.",
      ],
      disagreements: [
        "Evangelicals from confessional traditions raise concerns that independence can leave a congregation without outside accountability for its leaders and without a historic confession to guard its teaching, and that a church without a tradition can lose touch with the wider church's wisdom.",
      ],
      evangelicalsDiffer: [
        "Evangelicals differ on whether denominations are a help or a hindrance. Some see them as safeguards of doctrine and accountability; others see them as human structures that divide Christians and are not required by the New Testament.",
      ],
    },
    ownAnswer: [
      "Non-denominational churches answer that the New Testament knows local churches, each led by its own overseers, not denominations, and that freedom from denominational structures lets them focus on the gospel and adapt to their communities. Many point to their elder boards, networks and statements of faith as real accountability.",
    ],
    sources: [
      { kind: "data", label: "U.S. Religion Census 2020, Appendix B: Non-denominational Christian Churches", url: "https://www.usreligioncensus.org/sites/default/files/2023-03/Appendix_B--Non-denominational_Christian_Churches.pdf" },
      { kind: "data", label: "Pew Research Center, Religious Landscape Study: religious identity (2025)", url: "https://www.pewresearch.org/religion/2025/02/26/religious-landscape-study-religious-identity/" },
      { kind: "official", label: "National Association of Evangelicals, Statement of Faith", url: "https://www.nae.org/statement-of-faith/" },
    ],
    relatedIds: ["southern-baptist-convention", "assemblies-of-god", "churches-of-christ"],
  },
];
