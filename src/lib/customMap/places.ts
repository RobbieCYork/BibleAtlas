/* The places a custom map can show: the app's own Locations and Sites, with their own coordinates.
 * Nothing here adds or moves a coordinate. */
import { locations } from "../../data/locations";
import { pois } from "../../data/pois";
import { buildIndex, searchIndex } from "../unifiedSearch";

export type PlaceKey = `loc:${string}` | `poi:${string}`;

/** How far the pin can be trusted. "area" is not doubt: the record is a region, sea or river, and
 * one pin can only mark a point in it. */
export type CertaintyLevel = "disputed" | "traditional" | "approximate" | "area";

export interface Certainty {
  level: CertaintyLevel;
  note: string;
}

export interface CmPlace {
  key: PlaceKey;
  kind: "location" | "poi";
  id: string;
  name: string;
  /** "City · Tell es-Sultan, near modern Jericho" — what tells two same-named places apart. */
  detail: string;
  coordinates: [number, number];
  certainty: Certainty | null;
}

export const CERTAINTY_LABEL: Record<CertaintyLevel, string> = {
  disputed: "Location disputed",
  traditional: "Traditional site",
  approximate: "Approximate",
  area: "Area",
};

/** Pins that carry the "*" mark on a slide. */
export const isDoubtful = (c: Certainty | null) => c !== null && c.level !== "area";

const d = (note: string): Certainty => ({ level: "disputed", note });
const t = (note: string): Certainty => ({ level: "traditional", note });
const a = (note: string): Certainty => ({ level: "approximate", note });

/* The data has no certainty field, so this table restates, in one line each, what the record's own
 * text (modernName, facts, archaeology note or description) already says. Change a record's
 * position on its site and change its line here in the same commit. Records not listed fall through
 * to certaintyFromRecord below. */
const STATED: Partial<Record<PlaceKey, Certainty>> = {
  "loc:sodom": d("Unresolved. The pin follows the southern Dead Sea theory (Bab edh-Dhra)."),
  "loc:gomorrah": d("No site confirmed. The pin follows the southern Dead Sea theory."),
  "loc:eden": d("Disputed. The pin marks a traditional placement near the Tigris–Euphrates confluence."),
  "loc:mount-sinai": d("Disputed. The pin shows the traditional site, Jebel Musa."),
  "poi:mount-sinai": d("Disputed. The pin shows the traditional site, Jebel Musa."),
  "loc:ai": d("Disputed. The pin shows the traditional identification, et-Tell."),
  "loc:cana": d("Debated. The pin shows Kafr Kanna; many scholars favour Khirbet Qana."),
  "loc:gilgal": d("Exact site unidentified. Proposals lie near Jericho."),
  "loc:ziklag": d("Site debated. More than one location has been proposed."),
  "loc:mizpah": d("Commonly identified with Tell en-Nasbeh; the identification is debated."),
  "loc:sychar": d("Exact location debated."),
  "loc:gadara": d("Where the Gospel healing happened (Gadara, Gerasa or Gergesa) is debated."),
  "loc:red-sea": d("The crossing point of the Exodus is disputed. The pin marks the sea generally."),
  "loc:succoth": d("Two places share this name. The pin shows the Egyptian (Exodus) one, not Jacob's Succoth in the Jordan Valley."),
  "poi:bethsaida": d("Live dispute between two sites. The pin shows et-Tell."),
  "poi:emmaus": d("Uncertain. The pin shows Emmaus Nicopolis, one of the candidates."),
  "poi:golgotha": t("Traditional site (Church of the Holy Sepulchre). The Garden Tomb is promoted as an alternative."),
  "poi:garden-tomb": t("Proposed since the 19th century as an alternative to the traditional site."),
  "poi:upper-room": t("Traditional site, not archaeologically confirmed."),
  "poi:al-maghtas": t("Traditional site."),
  "poi:tomb-of-timothy-ephesus": t("Commemorative location. No tomb has been excavated."),
  "poi:chalcedon-council-site": a("Traditional area. No excavated council building."),
  "poi:nicaea-council-site": a("The exact meeting place is not confirmed."),
  "poi:apollonia-macedonia": a("The exact site is not certain among scholars."),
  "poi:forum-of-appius-three-taverns": a("General regional position only."),
  "poi:eutychus-site-troas": a("General site only."),
  "poi:dominus-flevit": t("Traditional spot, not an archaeologically verified one."),
  "poi:st-peter-gallicantu": t("Tradition identifies this as Caiaphas's house; it is not archaeologically certain."),
  "poi:nazareth-synagogue-church": t("Traditional site of the synagogue; no Roman-period public building has been found here."),
  "poi:basilica-of-annunciation-nazareth": t("The site by church tradition."),
  "poi:basilica-st-john": t("Traditional burial site of John."),
  "poi:basilica-st-paul-outside-walls-rome": t("Traditional burial site of Paul."),
  "poi:house-of-virgin-mary-ephesus": t("Located in 1881 from reported visions, not by archaeology."),
  "poi:cave-church-st-peter-antioch": t("A local tradition that cannot be dated to the apostles."),
  "poi:cave-of-apocalypse-patmos": t("Venerated by tradition as the place of John's visions."),
  "poi:appian-way-quo-vadis-rome": t("The spot of a later tradition from outside the New Testament."),
  "poi:grotto-of-st-paul-ephesus": a("The app's record gives these coordinates as approximate."),
  "poi:martyrdom-site-polycarp-smyrna": a("The location is approximate."),
  "loc:bethphage": t("The precise location rests on tradition."),
  "loc:mount-ararat": t("The identification of this peak comes mainly from later tradition."),
  "loc:peniel": a("Possibly Tulul edh-Dhahab; not fully settled."),
  "loc:ramah": t("Traditionally identified with er-Ram. Scripture names more than one Ramah."),
  "loc:gibeah": a("Commonly identified with Tell el-Ful."),
  "loc:goshen": { level: "area", note: "A region without precise bounds. The pin marks a point in it." },
};

const AREA_NOTES: Record<string, string> = {
  region: "A region. The pin marks a point within it.",
  province: "A province. The pin marks a point within it.",
  nation: "A nation. The pin marks a point within it.",
  sea: "A body of water. The pin marks a point on it.",
  river: "A river. The pin marks one point along it.",
};

function certaintyFromRecord(modernName: string, tag: string, category: string): Certainty | null {
  if (/disput|debated|uncertain|unidentified/i.test(modernName) || /location uncertain/i.test(tag))
    return d("The app's record marks this location as uncertain.");
  if (/traditional/i.test(modernName) || /traditional/i.test(tag)) return t("Traditional site.");
  if (/possibly|probably|commonly identified|general region/i.test(`${modernName} ${tag}`))
    return a("The identification is not certain.");
  const area = AREA_NOTES[category];
  return area ? { level: "area", note: area } : null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const PLACES: ReadonlyMap<PlaceKey, CmPlace> = new Map(
  [
    ...locations.map((l): CmPlace => {
      const key: PlaceKey = `loc:${l.id}`;
      return {
        key,
        kind: "location",
        id: l.id,
        name: l.name,
        detail: [cap(l.category), l.modernName].filter(Boolean).join(" · "),
        coordinates: l.coordinates,
        certainty: STATED[key] ?? certaintyFromRecord(l.modernName ?? "", "", l.category),
      };
    }),
    ...pois.map((p): CmPlace => {
      const key: PlaceKey = `poi:${p.id}`;
      return {
        key,
        kind: "poi",
        id: p.id,
        name: p.name,
        detail: [p.tag, p.modernName].filter(Boolean).join(" · "),
        coordinates: p.coordinates,
        certainty: STATED[key] ?? certaintyFromRecord(p.modernName ?? "", p.tag, ""),
      };
    }),
  ].map((p) => [p.key, p] as const)
);

export const placeKey = (kind: "location" | "poi", id: string): PlaceKey => (kind === "location" ? `loc:${id}` : `poi:${id}`);

/* Names more than one place goes by. Matched against the exact words in a verse, so "Caesarea
 * Philippi" is never ambiguous and a bare "Caesarea" is. */
export const SHARED_NAMES: Record<string, PlaceKey[]> = {
  antioch: ["loc:antioch-syria", "loc:antioch-pisidia"],
  caesarea: ["poi:caesarea-maritima", "poi:caesarea-philippi"],
  bethany: ["loc:bethany", "poi:al-maghtas"],
};

const INDEX = buildIndex({ locations, pois, people: [], topics: [], timelineEvents: [] });

/** The app's header search, restricted to places: names, alternate and modern names, then
 * descriptions and references. A shared name also brings in the other places that go by it. */
export function searchPlaces(query: string, limit = 12): CmPlace[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const keys: PlaceKey[] = [...(SHARED_NAMES[q] ?? [])];
  for (const e of searchIndex(INDEX, q).places) {
    const key = placeKey(e.kind as "location" | "poi", e.id);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys.slice(0, limit).map((k) => PLACES.get(k)!);
}
