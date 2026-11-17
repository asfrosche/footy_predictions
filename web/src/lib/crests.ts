// Official crests for the clubs that have one. Clubs without a file keep their initials.
export const CLUB_CRESTS: Record<string, string> = {
  Arsenal: "arsenal.svg",
  "Aston Villa": "aston-villa.png",
  Bournemouth: "bournemouth.svg",
  Brentford: "brentford.svg",
  "Brighton & Hove Albion": "brighton.png",
  Chelsea: "chelsea.svg",
  "Coventry City": "coventry-city.svg",
  "Crystal Palace": "crystal-palace.svg",
  Everton: "everton.png",
  "Hull City": "hull-city.svg",
  Fulham: "fulham.svg",
  "Leeds United": "leeds.png",
  "Leicester City": "leicester-city.png",
  "Ipswich Town": "ipswich-town.png",
  Liverpool: "liverpool.svg",
  "Manchester City": "man-city.svg",
  "Manchester United": "man-united.png",
  "Newcastle United": "newcastle.svg",
  "Nottingham Forest": "nottingham-forest.svg",
  Southampton: "southampton.png",
  Sunderland: "sunderland.svg",
  "Tottenham Hotspur": "tottenham.svg",
  "West Ham": "west-ham.png",
  "West Ham United": "west-ham.png",
  Wolves: "wolves.png",
  "Wolverhampton Wanderers": "wolves.png",
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
