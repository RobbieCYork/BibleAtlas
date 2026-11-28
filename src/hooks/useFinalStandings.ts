import { useEffect, useState } from "react";
import { fetchProfileCards } from "../lib/supabase";

/** What GamePlayer (Bible Trivia) and SavingPeterPlayer share that a results screen needs. */
interface StandingPlayer {
  user_id: string;
  display_name: string;
  score: number;
}

/** A finished game's standings, for both multiplayer results screens: who is listed, who won, and the
 * pictures this viewer may see. */
export function useFinalStandings<P extends StandingPlayer>(players: P[], winnerId: string | null) {
  // Leaving a finished room deletes that player's row. The result is final, so everyone this screen
  // has seen stays listed, the winner included.
  const [roster, setRoster] = useState(players);
  const [latest, setLatest] = useState(players);
  if (players !== latest) {
    setLatest(players);
    setRoster([...players, ...roster.filter((r) => !players.some((p) => p.user_id === r.user_id))]);
  }

  const ranked = [...roster].sort((a, b) => b.score - a.score);
  const multiplayer = ranked.length > 1;
  // A round that runs out of questions with the lead shared ends with no winner_id — say so rather
  // than naming whichever tied player happens to sort first.
  const tied = !winnerId && multiplayer && ranked[0].score === ranked[1].score;
  const winner = tied ? undefined : winnerId ? roster.find((p) => p.user_id === winnerId) : ranked[0];
  const winners = tied ? ranked.filter((p) => p.score === ranked[0].score) : winner ? [winner] : [];

  // Pictures come from get_profile_cards (sql/042), which answers for yourself, friends and pending
  // friend requests. Anyone else, and anyone blocked either way, has no card and keeps the initial.
  // A solo game shows no pictures, so it asks for none.
  const ids = multiplayer ? ranked.map((p) => p.user_id).sort().join(",") : "";
  const [pictures, setPictures] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    fetchProfileCards(ids.split(","))
      .then((cards) => {
        if (!cancelled) setPictures(Object.fromEntries(cards.map((c) => [c.id, c.avatar_url])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return { ranked, multiplayer, tied, winner, winners, pictures };
}
