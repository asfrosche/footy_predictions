// Official crests for the clubs that have one. Clubs without a file keep their initials.
export const CLUB_CRESTS: Record<string, string> = {
  Arsenal: "arsenal.svg",
  "Aston Villa": "aston-villa.png",
  Brentford: "brentford.svg",
  "Brighton & Hove Albion": "brighton.png",
  Everton: "everton.png",
  Fulham: "fulham.svg",
  "Leeds United": "leeds.png",
  Liverpool: "liverpool.svg",
  "Manchester United": "man-united.png",
};

export const crestSrc = (team: string): string | null =>
  CLUB_CRESTS[team] ? `/img/clubs/${CLUB_CRESTS[team]}` : null;

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
