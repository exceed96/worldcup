import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { ArrowUpRight, CalendarDays, Check, ListChecks, Radio, Trophy, X, Zap } from "lucide-react";
import "./styles.css";

type Status = "stable" | "watch" | "danger";
type RankingTab = "ranking" | "scenarios" | "matches";

type LocalizedText = {
  Locale: string;
  Description: string;
};

type FifaThirdPlaceRow = {
  IdCompetition: string;
  IdSeason: string;
  IdStage: string;
  IdGroup: string;
  IdTeam: string;
  Group: LocalizedText[];
  Won: number;
  Lost: number;
  Drawn: number;
  Played: number;
  Against: number;
  For: number;
  Position: number;
  Points: number;
  GoalsDiference: number;
  TeamConductScore?: number;
  QualificationStatus?: string;
  IsLive?: boolean;
  Team: {
    Name: LocalizedText[];
    IdAssociation?: string;
    IdCountry?: string;
    Abbreviation?: string;
    PictureUrl?: string;
  };
};

type FifaThirdPlaceResponse = {
  Results?: FifaThirdPlaceRow[];
};

type FifaMatchTeam = {
  Score: number | null;
  TeamName: LocalizedText[];
  Abbreviation: string;
  IdTeam: string;
};

type FifaMatchRow = {
  IdMatch: string;
  IdGroup?: string;
  GroupName?: LocalizedText[];
  Date: string;
  Home: FifaMatchTeam | null;
  Away: FifaMatchTeam | null;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
  MatchStatus: number;
  MatchTime?: string | null;
  Stadium?: {
    Name?: LocalizedText[];
    CityName?: LocalizedText[];
  };
};

type FifaMatchesResponse = {
  Results?: FifaMatchRow[];
};

type ThirdPlaceTeam = {
  group: string;
  country: string;
  code: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  conductScore?: number;
  probability: number;
  status: Status;
  liveNote: string;
  qualificationStatus: string;
  isLive: boolean;
  fifaRank: number;
};

const liveRefreshMs = 15000;
const idleRefreshMs = 30000;
const thirdPlaceQualifyingSlots = 8;
const simulationIterations = 20000;
const fifaSeasonId = "285023";
const fifaThirdStandingPath = `/api/v3/groupstanding/third/${fifaSeasonId}?language=ko`;
const fifaMatchesPath = `/api/v3/calendar/matches?idSeason=${fifaSeasonId}&language=ko&count=100`;
const fifaServerlessStandingsUrl = "/api/fifa?resource=standings";
const fifaServerlessMatchesUrl = "/api/fifa?resource=matches";
const fifaProxyUrl = `/fifa-api${fifaThirdStandingPath}`;
const fifaDirectUrl = `https://api.fifa.com${fifaThirdStandingPath}`;
const fifaMatchesProxyUrl = `/fifa-api${fifaMatchesPath}`;
const fifaMatchesDirectUrl = `https://api.fifa.com${fifaMatchesPath}`;
const offlineTeams: ThirdPlaceTeam[] = [
  { group: "F조", country: "스웨덴", code: "SWE", points: 4, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 7, goalsAgainst: 7, goalDiff: 0, conductScore: -4, probability: 100, status: "stable", liveNote: "FIFA 공식 스냅샷: 현재 진출권", qualificationStatus: "LiveQualified", isLive: true, fifaRank: 1 },
  { group: "E조", country: "에콰도르", code: "ECU", points: 4, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 2, goalsAgainst: 2, goalDiff: 0, conductScore: -5, probability: 100, status: "stable", liveNote: "FIFA 공식 스냅샷: 진출 확정", qualificationStatus: "ConfirmedQualified", isLive: false, fifaRank: 2 },
  { group: "B조", country: "보스니아 헤르체고비나", code: "BIH", points: 4, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 5, goalsAgainst: 6, goalDiff: -1, conductScore: -10, probability: 100, status: "stable", liveNote: "FIFA 공식 스냅샷: 진출 확정", qualificationStatus: "ConfirmedQualified", isLive: false, fifaRank: 3 },
  { group: "L조", country: "크로아티아", code: "CRO", points: 3, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 4, goalDiff: -1, conductScore: -1, probability: 83, status: "stable", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 4 },
  { group: "A조", country: "대한민국", code: "KOR", points: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 3, goalDiff: -1, conductScore: -4, probability: 80, status: "stable", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 5 },
  { group: "J조", country: "알제리", code: "ALG", points: 3, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 2, goalsAgainst: 4, goalDiff: -2, conductScore: -1, probability: 77, status: "stable", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 6 },
  { group: "D조", country: "파라과이", code: "PAR", points: 3, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 2, goalsAgainst: 4, goalDiff: -2, conductScore: -11, probability: 74, status: "watch", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 7 },
  { group: "C조", country: "스코틀랜드", code: "SCO", points: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 4, goalDiff: -3, conductScore: -5, probability: 71, status: "watch", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 8 },
  { group: "H조", country: "카보베르데", code: "CPV", points: 2, played: 2, won: 0, drawn: 2, lost: 0, goalsFor: 2, goalsAgainst: 2, goalDiff: 0, conductScore: -3, probability: 45, status: "danger", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 9 },
  { group: "G조", country: "벨기에", code: "BEL", points: 2, played: 2, won: 0, drawn: 2, lost: 0, goalsFor: 1, goalsAgainst: 1, goalDiff: 0, conductScore: -7, probability: 38, status: "danger", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 10 },
  { group: "K조", country: "콩고 DR", code: "COD", points: 1, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 2, goalDiff: -1, conductScore: -2, probability: 31, status: "danger", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 11 },
  { group: "I조", country: "세네갈", code: "SEN", points: 0, played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 6, goalDiff: -3, conductScore: 0, probability: 24, status: "danger", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 12 },
];

function localizedName(values?: LocalizedText[], fallback = "-") {
  return values?.find((item) => item.Locale.toLowerCase().startsWith("ko"))?.Description ?? values?.[0]?.Description ?? fallback;
}

function getCountryDisplayName(name: string, code?: string | null) {
  return code === "COD" ? "콩고 DR" : name;
}

function getStatus(probability: number, qualificationStatus: string): Status {
  if (/qualified/i.test(qualificationStatus) || probability >= 75) return "stable";
  if (probability >= 50) return "watch";
  return "danger";
}

function getQualificationStatusLabel(qualificationStatus: string) {
  if (/confirmedqualified/i.test(qualificationStatus)) return "진출 확정";
  if (/livequalified/i.test(qualificationStatus)) return "현재 진출권";
  if (/couldqualify/i.test(qualificationStatus)) return "진출 가능";
  if (/eliminated|cannot/i.test(qualificationStatus)) return "탈락";
  return "확인 중";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toTeam(row: FifaThirdPlaceRow, previous?: ThirdPlaceTeam): ThirdPlaceTeam {
  const qualificationStatus = row.QualificationStatus ?? "Unknown";
  const probability = previous?.probability ?? (/confirmedqualified|livequalified/i.test(qualificationStatus) ? 100 : 0);
  return {
    group: localizedName(row.Group),
    country: getCountryDisplayName(localizedName(row.Team.Name), row.Team.Abbreviation),
    code: row.Team.Abbreviation ?? row.Team.IdAssociation ?? row.Team.IdCountry ?? row.IdTeam,
    points: row.Points,
    played: row.Played,
    won: row.Won,
    drawn: row.Drawn,
    lost: row.Lost,
    goalsFor: row.For,
    goalsAgainst: row.Against,
    goalDiff: row.GoalsDiference,
    conductScore: row.TeamConductScore,
    probability,
    status: getStatus(probability, qualificationStatus),
    liveNote: `FIFA 공식 상태: ${getQualificationStatusLabel(qualificationStatus)}`,
    qualificationStatus,
    isLive: row.IsLive ?? false,
    fifaRank: row.Position,
  };
}

async function fetchFifaStandings(current: ThirdPlaceTeam[]) {
  const previousByCode = new Map(current.map((team) => [team.code, team]));
  const urls = [fifaServerlessStandingsUrl, fifaProxyUrl, fifaDirectUrl];

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`FIFA API ${response.status}`);
      const data = (await response.json()) as FifaThirdPlaceResponse;
      if (!Array.isArray(data.Results) || data.Results.length === 0) throw new Error("No FIFA standings");
      return {
        teams: data.Results.map((row) => toTeam(row, previousByCode.get(row.Team.Abbreviation ?? ""))),
        source: "FIFA 공식 데이터",
        fetchedAt: new Date(),
      };
    } catch {
      continue;
    }
  }

  return {
    teams: current.length ? current : offlineTeams,
    source: current.length ? "FIFA 공식 데이터 연결 대기" : "오프라인 공식 스냅샷",
    fetchedAt: new Date(),
  };
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatMatchDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getMatchDayKey(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function formatMatchDay(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(date));
}

function getMatchTeamName(team?: FifaMatchTeam | null) {
  return getCountryDisplayName(localizedName(team?.TeamName, "-"), team?.Abbreviation);
}

function CountryFlag({ code }: { code?: string | null }) {
  if (!code) return null;
  return (
    <img
      className="countryFlag"
      src={`https://api.fifa.com/api/v3/picture/flags-sq-2/${code}`}
      alt=""
      loading="lazy"
      decoding="async"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function getMatchScore(match: FifaMatchRow) {
  if (match.HomeTeamScore === null || match.AwayTeamScore === null) return "경기 전";
  return `${match.HomeTeamScore} - ${match.AwayTeamScore}`;
}

function getScenarioMatchScore(match: FifaMatchRow) {
  if (match.HomeTeamScore === null || match.AwayTeamScore === null) return "vs";
  return getMatchScore(match);
}

function isMatchFinished(match?: FifaMatchRow) {
  return match?.HomeTeamScore !== null && match?.AwayTeamScore !== null && match?.MatchStatus === 0;
}

type LiveMatchPhase = {
  kind: "first-half" | "second-half" | "stoppage" | "hydration" | "half-time";
  clock: string;
  label: string;
};

function getLiveMatchPhase(match: FifaMatchRow): LiveMatchPhase | null {
  if (getMatchState(match) !== "live") return null;

  const rawTime = match.MatchTime?.trim() ?? "";
  const normalizedTime = rawTime.toLowerCase();
  const elapsedFromKickoff = (Date.now() - new Date(match.Date).getTime()) / 60000;
  if (/hydration|cooling|water|수분|음수/.test(normalizedTime)) {
    return { kind: "hydration", clock: "3분 휴식", label: "수분 보충 휴식" };
  }
  if (/^ht$|^전반$|half.?time|interval|전반.?종료/.test(normalizedTime)) {
    return { kind: "half-time", clock: "하프타임", label: "전반 종료" };
  }
  if (!rawTime && match.MatchStatus === 3 && elapsedFromKickoff >= 50 && elapsedFromKickoff <= 75) {
    return { kind: "half-time", clock: "하프타임", label: "전반 종료" };
  }

  const minute = Number(rawTime.match(/\d+/)?.[0] ?? 0);
  if (minute === 22 || minute === 67) {
    return { kind: "hydration", clock: `${minute}' · 3분`, label: "수분 보충 휴식" };
  }

  if (minute === 45 && !rawTime.includes("+") && elapsedFromKickoff >= 50) {
    return { kind: "half-time", clock: "하프타임", label: "전반 종료" };
  }
  if (minute <= 45) {
    return {
      kind: rawTime.includes("+") ? "stoppage" : "first-half",
      clock: rawTime || "전반",
      label: rawTime.includes("+") ? "전반 추가시간" : "전반 진행",
    };
  }
  return {
    kind: minute >= 90 || rawTime.includes("+") ? "stoppage" : "second-half",
    clock: rawTime || "후반",
    label: minute >= 90 || rawTime.includes("+") ? "후반 추가시간" : "후반 진행",
  };
}

function getMatchStatusLabel(match: FifaMatchRow) {
  if (isMatchFinished(match)) return "종료";
  const phase = getLiveMatchPhase(match);
  if (phase) {
    if (phase.kind === "hydration" || phase.kind === "half-time") return phase.label;
    return phase.clock;
  }
  return "예정";
}

function getLiveMatchIndicator(phase: LiveMatchPhase | null, fallback?: string | null) {
  if (!phase) return fallback ?? "진행 중";
  if (phase.kind === "hydration" || phase.kind === "half-time") return phase.label;
  return phase.clock;
}

function getMatchState(match: FifaMatchRow) {
  if (isMatchFinished(match)) return "finished";
  if (match.MatchStatus === 3 || (match.MatchTime && match.MatchTime !== "0'")) return "live";
  return "scheduled";
}

type SimulationStanding = {
  code: string;
  group: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
};

type SimulationResult = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
};

type TeamForm = {
  played: number;
  goalsFor: number;
  goalsAgainst: number;
};

function createSeededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let output = value;
    output = Math.imul(output ^ (output >>> 15), output | 1);
    output ^= output + Math.imul(output ^ (output >>> 7), output | 61);
    return ((output ^ (output >>> 14)) >>> 0) / 4294967296;
  };
}

function hashMatchSnapshot(matches: FifaMatchRow[]) {
  let hash = 2166136261;
  const snapshot = matches
    .map((match) => `${match.IdMatch}:${match.HomeTeamScore}:${match.AwayTeamScore}:${match.MatchStatus}:${match.MatchTime ?? ""}`)
    .join("|");
  for (let index = 0; index < snapshot.length; index += 1) {
    hash ^= snapshot.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function samplePoisson(lambda: number, random: () => number) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let goals = 0;
  do {
    goals += 1;
    product *= random();
  } while (product > limit);
  return goals - 1;
}

function applySimulationResult(standingByCode: Map<string, SimulationStanding>, result: SimulationResult) {
  const home = standingByCode.get(result.home);
  const away = standingByCode.get(result.away);
  if (!home || !away) return;

  home.played += 1;
  away.played += 1;
  home.goalsFor += result.homeScore;
  home.goalsAgainst += result.awayScore;
  away.goalsFor += result.awayScore;
  away.goalsAgainst += result.homeScore;
  home.goalDiff = home.goalsFor - home.goalsAgainst;
  away.goalDiff = away.goalsFor - away.goalsAgainst;

  if (result.homeScore > result.awayScore) home.points += 3;
  else if (result.homeScore < result.awayScore) away.points += 3;
  else {
    home.points += 1;
    away.points += 1;
  }
}

function rankGroup(
  standings: SimulationStanding[],
  results: SimulationResult[],
  conductByCode: Map<string, number>,
  currentThirdRankByCode: Map<string, number>,
) {
  const pointsGroups = new Map<number, SimulationStanding[]>();
  standings.forEach((standing) => {
    const tied = pointsGroups.get(standing.points) ?? [];
    tied.push(standing);
    pointsGroups.set(standing.points, tied);
  });

  return [...pointsGroups.entries()]
    .sort(([pointsA], [pointsB]) => pointsB - pointsA)
    .flatMap(([, tied]) => {
      if (tied.length === 1) return tied;
      const tiedCodes = new Set(tied.map((standing) => standing.code));
      const headToHead = new Map(tied.map((standing) => [standing.code, { points: 0, goalsFor: 0, goalsAgainst: 0 }]));
      results.forEach((result) => {
        if (!tiedCodes.has(result.home) || !tiedCodes.has(result.away)) return;
        const home = headToHead.get(result.home)!;
        const away = headToHead.get(result.away)!;
        home.goalsFor += result.homeScore;
        home.goalsAgainst += result.awayScore;
        away.goalsFor += result.awayScore;
        away.goalsAgainst += result.homeScore;
        if (result.homeScore > result.awayScore) home.points += 3;
        else if (result.homeScore < result.awayScore) away.points += 3;
        else {
          home.points += 1;
          away.points += 1;
        }
      });

      return tied.sort((a, b) => {
        const headA = headToHead.get(a.code)!;
        const headB = headToHead.get(b.code)!;
        if (headB.points !== headA.points) return headB.points - headA.points;
        const headGoalDiffA = headA.goalsFor - headA.goalsAgainst;
        const headGoalDiffB = headB.goalsFor - headB.goalsAgainst;
        if (headGoalDiffB !== headGoalDiffA) return headGoalDiffB - headGoalDiffA;
        if (headB.goalsFor !== headA.goalsFor) return headB.goalsFor - headA.goalsFor;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        const conductA = conductByCode.get(a.code) ?? -5;
        const conductB = conductByCode.get(b.code) ?? -5;
        if (conductB !== conductA) return conductB - conductA;
        const rankA = currentThirdRankByCode.get(a.code) ?? 99;
        const rankB = currentThirdRankByCode.get(b.code) ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.code.localeCompare(b.code);
      });
    });
}

function simulateQualification(matches: FifaMatchRow[], trackedTeams: ThirdPlaceTeam[]) {
  const groupMatches = matches.filter(
    (match) => match.GroupName?.length && match.Home?.Abbreviation && match.Away?.Abbreviation,
  );
  if (groupMatches.length < 60) return new Map<string, number>();

  const groups = new Map<string, Set<string>>();
  const baseStandings = new Map<string, SimulationStanding>();
  const baseResultsByGroup = new Map<string, SimulationResult[]>();
  const forms = new Map<string, TeamForm>();
  const openMatches: Array<{ match: FifaMatchRow; group: string }> = [];

  groupMatches.forEach((match) => {
    const group = localizedName(match.GroupName, match.IdGroup ?? "-");
    const home = match.Home!.Abbreviation;
    const away = match.Away!.Abbreviation;
    const groupCodes = groups.get(group) ?? new Set<string>();
    groupCodes.add(home);
    groupCodes.add(away);
    groups.set(group, groupCodes);
    [home, away].forEach((code) => {
      if (!baseStandings.has(code)) {
        baseStandings.set(code, { code, group, played: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 });
      }
      if (!forms.has(code)) forms.set(code, { played: 0, goalsFor: 0, goalsAgainst: 0 });
    });

    if (isMatchFinished(match)) {
      const result = { home, away, homeScore: match.HomeTeamScore!, awayScore: match.AwayTeamScore! };
      applySimulationResult(baseStandings, result);
      const groupResults = baseResultsByGroup.get(group) ?? [];
      groupResults.push(result);
      baseResultsByGroup.set(group, groupResults);
      const homeForm = forms.get(home)!;
      const awayForm = forms.get(away)!;
      homeForm.played += 1;
      awayForm.played += 1;
      homeForm.goalsFor += result.homeScore;
      homeForm.goalsAgainst += result.awayScore;
      awayForm.goalsFor += result.awayScore;
      awayForm.goalsAgainst += result.homeScore;
    } else {
      openMatches.push({ match, group });
    }
  });

  const completedMatches = [...baseResultsByGroup.values()].reduce((total, results) => total + results.length, 0);
  const completedGoals = [...baseResultsByGroup.values()].flat().reduce((total, result) => total + result.homeScore + result.awayScore, 0);
  const averageGoals = completedMatches > 0 ? completedGoals / (completedMatches * 2) : 1.25;
  const expectedGoals = (teamCode: string, opponentCode: string) => {
    const team = forms.get(teamCode) ?? { played: 0, goalsFor: 0, goalsAgainst: 0 };
    const opponent = forms.get(opponentCode) ?? { played: 0, goalsFor: 0, goalsAgainst: 0 };
    const attack = (team.goalsFor + averageGoals * 2) / (team.played + 2);
    const opponentDefence = (opponent.goalsAgainst + averageGoals * 2) / (opponent.played + 2);
    return clamp((attack * opponentDefence) / averageGoals, 0.25, 3.4);
  };

  const conductByCode = new Map(trackedTeams.map((team) => [team.code, team.conductScore ?? -5]));
  const currentThirdRankByCode = new Map(trackedTeams.map((team) => [team.code, team.fifaRank]));
  const qualificationCounts = new Map([...baseStandings.keys()].map((code) => [code, 0]));
  const random = createSeededRandom(hashMatchSnapshot(groupMatches));

  for (let iteration = 0; iteration < simulationIterations; iteration += 1) {
    const standings = new Map([...baseStandings].map(([code, standing]) => [code, { ...standing }]));
    const resultsByGroup = new Map([...baseResultsByGroup].map(([group, results]) => [group, [...results]]));

    openMatches.forEach(({ match, group }) => {
      const home = match.Home!.Abbreviation;
      const away = match.Away!.Abbreviation;
      const minute = Number(match.MatchTime?.match(/\d+/)?.[0] ?? 0);
      const remainingShare = getMatchState(match) === "live" ? clamp((90 - minute) / 90, 0, 1) : 1;
      const result = {
        home,
        away,
        homeScore: (match.HomeTeamScore ?? 0) + samplePoisson(expectedGoals(home, away) * remainingShare, random),
        awayScore: (match.AwayTeamScore ?? 0) + samplePoisson(expectedGoals(away, home) * remainingShare, random),
      };
      applySimulationResult(standings, result);
      const groupResults = resultsByGroup.get(group) ?? [];
      groupResults.push(result);
      resultsByGroup.set(group, groupResults);
    });

    const thirdPlaced: SimulationStanding[] = [];
    groups.forEach((codes, group) => {
      const groupStandings = [...codes].map((code) => standings.get(code)!).filter(Boolean);
      const ranked = rankGroup(groupStandings, resultsByGroup.get(group) ?? [], conductByCode, currentThirdRankByCode);
      ranked.slice(0, 2).forEach((team) => qualificationCounts.set(team.code, (qualificationCounts.get(team.code) ?? 0) + 1));
      if (ranked[2]) thirdPlaced.push(ranked[2]);
    });

    thirdPlaced
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        const conductA = conductByCode.get(a.code) ?? -5;
        const conductB = conductByCode.get(b.code) ?? -5;
        if (conductB !== conductA) return conductB - conductA;
        const rankA = currentThirdRankByCode.get(a.code) ?? 99;
        const rankB = currentThirdRankByCode.get(b.code) ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.code.localeCompare(b.code);
      })
      .slice(0, thirdPlaceQualifyingSlots)
      .forEach((team) => qualificationCounts.set(team.code, (qualificationCounts.get(team.code) ?? 0) + 1));
  }

  return new Map([...qualificationCounts].map(([code, count]) => [code, Math.round((count / simulationIterations) * 100)]));
}

function findMatch(matches: FifaMatchRow[], homeCode: string, awayCode: string) {
  return matches.find(
    (match) =>
      (match.Home?.Abbreviation === homeCode && match.Away?.Abbreviation === awayCode) ||
      (match.Home?.Abbreviation === awayCode && match.Away?.Abbreviation === homeCode),
  );
}

function teamScore(match: FifaMatchRow, code: string) {
  if (match.Home?.Abbreviation === code) return match.HomeTeamScore;
  if (match.Away?.Abbreviation === code) return match.AwayTeamScore;
  return null;
}

function scenarioStatus(match: FifaMatchRow | undefined, passes: (match: FifaMatchRow) => boolean) {
  if (!match || !isMatchFinished(match)) return "pending" as const;
  return passes(match) ? ("passed" as const) : ("failed" as const);
}

function buildScenarios(matches: FifaMatchRow[]) {
  return [
    {
      id: "D",
      group: "D",
      title: "호주가 파라과이를 잡는다",
      match: findMatch(matches, "AUS", "PAR"),
      status: scenarioStatus(findMatch(matches, "AUS", "PAR"), (match) => (teamScore(match, "AUS") ?? -1) > (teamScore(match, "PAR") ?? -1)),
    },
    {
      id: "E",
      group: "E",
      title: "독일이 에콰도르를 이긴다",
      match: findMatch(matches, "GER", "ECU"),
      status: scenarioStatus(findMatch(matches, "GER", "ECU"), (match) => (teamScore(match, "GER") ?? -1) > (teamScore(match, "ECU") ?? -1)),
    },
    {
      id: "F",
      group: "F",
      title: "일본이 스웨덴을 2골 차 이상으로 이긴다",
      match: findMatch(matches, "JPN", "SWE"),
      status: scenarioStatus(findMatch(matches, "JPN", "SWE"), (match) => ((teamScore(match, "JPN") ?? -99) - (teamScore(match, "SWE") ?? 99)) >= 2),
    },
    {
      id: "G",
      group: "G",
      title: "이집트가 이란을 이긴다",
      match: findMatch(matches, "EGY", "IRN"),
      status: scenarioStatus(findMatch(matches, "EGY", "IRN"), (match) => (teamScore(match, "EGY") ?? -1) > (teamScore(match, "IRN") ?? -1)),
    },
    {
      id: "H",
      group: "H",
      title: "스페인이 우루과이를 이긴다",
      match: findMatch(matches, "ESP", "URU"),
      status: scenarioStatus(findMatch(matches, "ESP", "URU"), (match) => (teamScore(match, "ESP") ?? -1) > (teamScore(match, "URU") ?? -1)),
    },
    {
      id: "I",
      group: "I",
      title: "세네갈이 이라크와 비기거나 1골 차로 이긴다",
      match: findMatch(matches, "SEN", "IRQ"),
      status: scenarioStatus(findMatch(matches, "SEN", "IRQ"), (match) => {
        const diff = (teamScore(match, "SEN") ?? -99) - (teamScore(match, "IRQ") ?? 99);
        return diff === 0 || diff === 1;
      }),
    },
    {
      id: "J",
      group: "J",
      title: "오스트리아가 알제리를 이긴다 or 알제리가 오스트리아를 2골 차 이상으로 이긴다",
      match: findMatch(matches, "AUT", "ALG"),
      status: scenarioStatus(findMatch(matches, "AUT", "ALG"), (match) => {
        const austriaScore = teamScore(match, "AUT") ?? -99;
        const algeriaScore = teamScore(match, "ALG") ?? -99;
        return austriaScore > algeriaScore || algeriaScore - austriaScore >= 2;
      }),
    },
    {
      id: "K",
      group: "K",
      title: "우즈베키스탄이 콩고 DR을 이기거나 비긴다",
      match: findMatch(matches, "COD", "UZB"),
      status: scenarioStatus(findMatch(matches, "COD", "UZB"), (match) => (teamScore(match, "COD") ?? 99) <= (teamScore(match, "UZB") ?? -99)),
    },
    {
      id: "L",
      group: "L",
      title: "가나가 크로아티아를 이긴다",
      match: findMatch(matches, "GHA", "CRO"),
      status: scenarioStatus(findMatch(matches, "GHA", "CRO"), (match) => (teamScore(match, "GHA") ?? -1) > (teamScore(match, "CRO") ?? -1)),
    },
  ];
}

function ProbabilityBar({
  value,
  tone = "default",
  settled = false,
}: {
  value: number;
  tone?: "default" | "korea" | "danger";
  settled?: boolean;
}) {
  return (
    <div
      className={`bar ${tone === "korea" ? "barKorea" : ""} ${tone === "danger" ? "barDanger" : ""} ${settled ? "barSettled" : ""}`}
      aria-label={`${value}%`}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function useLiveTeams(hasLiveMatches: boolean) {
  const initialTeams = useMemo(() => offlineTeams, []);
  const [teams, setTeams] = useState(initialTeams);
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [source, setSource] = useState("FIFA 공식 데이터 연결 중");
  const teamsRef = useRef(initialTeams);

  useEffect(() => {
    let ignore = false;

    async function loadFeed() {
      const result = await fetchFifaStandings(teamsRef.current);
      if (ignore) return;
      teamsRef.current = result.teams;
      setTeams(result.teams);
      setUpdatedAt(result.fetchedAt);
      setSource(result.source);
    }

    void loadFeed();
    const feedTimer = window.setInterval(loadFeed, hasLiveMatches ? liveRefreshMs : idleRefreshMs);

    return () => {
      ignore = true;
      window.clearInterval(feedTimer);
    };
  }, [hasLiveMatches]);

  return { teams, updatedAt, source };
}

function useLiveMatches() {
  const [matches, setMatches] = useState<FifaMatchRow[]>([]);

  useEffect(() => {
    let ignore = false;
    let matchTimer: number | undefined;

    async function loadMatches() {
      const urls = [fifaServerlessMatchesUrl, fifaMatchesProxyUrl, fifaMatchesDirectUrl];
      let nextRefreshMs = idleRefreshMs;
      for (const url of urls) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error(`FIFA matches ${response.status}`);
          const data = (await response.json()) as FifaMatchesResponse;
          if (!Array.isArray(data.Results)) throw new Error("No FIFA matches");
          if (!ignore) setMatches(data.Results);
          nextRefreshMs = data.Results.some((match) => getMatchState(match) === "live") ? liveRefreshMs : idleRefreshMs;
          break;
        } catch {
          continue;
        }
      }
      if (!ignore) matchTimer = window.setTimeout(loadMatches, nextRefreshMs);
    }

    void loadMatches();
    return () => {
      ignore = true;
      if (matchTimer !== undefined) window.clearTimeout(matchTimer);
    };
  }, []);

  return matches;
}

function App() {
  const matches = useLiveMatches();
  const hasLiveMatches = matches.some((match) => getMatchState(match) === "live");
  const { teams: fifaTeams, updatedAt, source } = useLiveTeams(hasLiveMatches);
  const [activeTab, setActiveTab] = useState<RankingTab>("ranking");
  const simulatedProbabilities = useMemo(() => simulateQualification(matches, fifaTeams), [matches, fifaTeams]);
  const probabilitiesReady = simulatedProbabilities.size > 0;
  const teams = useMemo(
    () =>
      fifaTeams.map((team) => {
        const probability = simulatedProbabilities.get(team.code) ?? team.probability;
        return {
          ...team,
          probability,
          status: getStatus(probability, team.qualificationStatus),
        };
      }),
    [fifaTeams, simulatedProbabilities],
  );

  const sortedThirdPlaceTeams = useMemo(
    () =>
      [...teams].sort((a, b) => {
        if (b.probability !== a.probability) return b.probability - a.probability;
        if (/confirmedqualified/i.test(b.qualificationStatus) !== /confirmedqualified/i.test(a.qualificationStatus)) {
          return /confirmedqualified/i.test(b.qualificationStatus) ? 1 : -1;
        }
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
      }),
    [teams],
  );

  const korea = teams.find((team) => team.code === "KOR") ?? teams[0];
  const koreaRank = sortedThirdPlaceTeams.findIndex((team) => team.code === korea?.code) + 1;
  const scenarios = useMemo(() => buildScenarios(matches), [matches]);
  const scenarioMatches = useMemo(
    () => {
      const uniqueMatches = new Map<string, FifaMatchRow>();
      scenarios.forEach((scenario) => {
        if (scenario.match) uniqueMatches.set(scenario.match.IdMatch, scenario.match);
      });
      return [...uniqueMatches.values()].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    },
    [scenarios],
  );
  const liveMatches = useMemo(
    () =>
      matches
        .filter((match) => getMatchState(match) === "live")
        .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime()),
    [matches],
  );
  const upcomingScenarioMatches = useMemo(() => {
    const uniqueMatches = new Map<string, FifaMatchRow>();
    scenarios.forEach((scenario) => {
      if (scenario.status === "pending" && scenario.match && getMatchState(scenario.match) === "scheduled") {
        uniqueMatches.set(scenario.match.IdMatch, scenario.match);
      }
    });
    const upcoming = [...uniqueMatches.values()].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    if (!upcoming[0]) return [];
    const nextMatchDay = getMatchDayKey(upcoming[0].Date);
    return upcoming.filter((match) => getMatchDayKey(match.Date) === nextMatchDay);
  }, [scenarios]);
  const showingLiveMatches = liveMatches.length > 0;
  const featuredMatches = showingLiveMatches ? liveMatches : upcomingScenarioMatches;
  const hotTeams = sortedThirdPlaceTeams.filter((team) => team.isLive);

  return (
    <main className="page">
      <section className="hero">
        <div className="heroContent">
          <div className="liveHeader">
            <div className="eyebrow">
              <Radio size={16} />
              FIFA 공식 3위권 순위 추적
            </div>
            <div className="livePill">
              <span />
              {source} · {formatTime(updatedAt)}
            </div>
          </div>
          <h1>
            대한민국
            <span>32강 진출 가능성</span>
          </h1>
          {korea && (
            <div className="koreaMeter" aria-label={`대한민국 32강 진출 확률 ${korea.probability}%`}>
              <div className="meterHeader">
                <span className="countryName">
                  <CountryFlag code={korea.code} />
                  {korea.country} 32강 진출 확률
                </span>
                <strong>{probabilitiesReady ? `${korea.probability}%` : "계산 중"}</strong>
              </div>
              {probabilitiesReady ? (
                <ProbabilityBar value={korea.probability} tone="korea" settled={/confirmedqualified/i.test(korea.qualificationStatus)} />
              ) : (
                <div className="bar barKorea probabilityLoading" aria-label="32강 진출 확률 계산 중" />
              )}
              <div className="meterMeta">
                <span>3위 국가 순위 비교 {koreaRank}위</span>
                <span>승점 {korea.points}, 득실 {korea.goalDiff > 0 ? `+${korea.goalDiff}` : korea.goalDiff}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {featuredMatches.length > 0 && (
        <section className={`liveMatchSection ${showingLiveMatches ? "" : "upcoming"}`} aria-label={showingLiveMatches ? "현재 진행 중인 경기" : "다음 경우의 수 경기"}>
          <div className="liveMatchHeading">
            <div>
              <span className="liveMatchEyebrow">
                <span /> {showingLiveMatches ? "LIVE" : "NEXT"}
              </span>
              <h2>{showingLiveMatches ? "현재 진행 경기" : "다음 경우의 수 경기"}</h2>
            </div>
            <strong>
              {showingLiveMatches
                ? `${featuredMatches.length}경기 진행 중`
                : `${formatMatchDay(featuredMatches[0].Date)} · ${featuredMatches.length}경기 예정`}
            </strong>
          </div>
          <div className="liveMatchGrid">
            {featuredMatches.map((match) => {
              const relatedScenario = scenarios.find((scenario) => scenario.match?.IdMatch === match.IdMatch);
              const phase = getLiveMatchPhase(match);
              return (
                <article className={`liveMatchCard ${showingLiveMatches ? "" : "scheduled"}`} key={match.IdMatch}>
                  {relatedScenario && (
                    <div className="helpfulOutcome">
                      <Check size={13} />
                      <span>한국에 유리</span>
                      <strong>{relatedScenario.title}</strong>
                    </div>
                  )}
                  <div className="liveMatchMeta">
                    <strong>{localizedName(match.GroupName)}</strong>
                    <span className={phase?.kind}>
                      {showingLiveMatches ? getLiveMatchIndicator(phase, match.MatchTime) : formatMatchDate(match.Date)}
                    </span>
                  </div>
                  <div className="liveMatchScoreboard">
                    <span className="countryName">
                      <CountryFlag code={match.Home?.Abbreviation} />
                      {getMatchTeamName(match.Home)}
                    </span>
                    <strong>{showingLiveMatches ? getMatchScore(match) : getScenarioMatchScore(match)}</strong>
                    <span className="countryName">
                      <CountryFlag code={match.Away?.Abbreviation} />
                      {getMatchTeamName(match.Away)}
                    </span>
                  </div>
                  <div className="liveMatchVenue">
                    <span>{localizedName(match.Stadium?.Name)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="rankingSection" aria-label="3위 국가 진출 순위">
        <div className="sectionHeader">
          <div>
            <h2>3위 국가 진출 순위</h2>
            <p>AI 통계모형이 공식 스코어, 남은 시간과 FIFA 순위 규정을 반영해 20,000회 계산한 확률입니다.</p>
          </div>
          <span className="cutLine">
            <ArrowUpRight size={16} />
            커트라인 8위
          </span>
        </div>
        <div className="tabs" role="tablist" aria-label="3위권 분석 탭">
          <button className={activeTab === "ranking" ? "active" : ""} type="button" onClick={() => setActiveTab("ranking")}>
            <Trophy size={16} />
            AI 순위
          </button>
          <button className={activeTab === "scenarios" ? "active" : ""} type="button" onClick={() => setActiveTab("scenarios")}>
            <ListChecks size={16} />
            경우의 수
          </button>
          <button className={activeTab === "matches" ? "active" : ""} type="button" onClick={() => setActiveTab("matches")}>
            <CalendarDays size={16} />
            경기 일정
          </button>
        </div>

        {activeTab === "ranking" && !probabilitiesReady && (
          <div className="probabilityNotice" role="status">
            FIFA 경기 데이터를 불러와 진출 확률을 계산하고 있습니다.
          </div>
        )}

        {activeTab === "ranking" && probabilitiesReady && (
          <div className="rankingList">
            {sortedThirdPlaceTeams.map((team, index) => (
              <article className={`rankRow ${index < 8 ? "inZone" : "outZone"} ${team.code === "KOR" ? "highlight" : ""}`} key={team.code}>
                <span className="rankNo">{index + 1}</span>
                <div className="rankTeam">
                  <strong className="countryName">
                    <CountryFlag code={team.code} />
                    {team.country}
                  </strong>
                  <span>
                    {team.group} · {getQualificationStatusLabel(team.qualificationStatus)}
                  </span>
                </div>
                <div className="rankBar">
                  <ProbabilityBar
                    value={team.probability}
                    tone={team.status === "danger" ? "danger" : "default"}
                    settled={/confirmedqualified/i.test(team.qualificationStatus)}
                  />
                </div>
                <div className="rankStat">
                  <strong>{team.probability}%</strong>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === "scenarios" && (
          <div className="scenarioList">
            {scenarios.map((scenario) => (
              <article className={`scenarioRow ${scenario.status}`} key={scenario.id}>
                <span className="scenarioIcon">{scenario.status === "passed" ? <Check size={18} /> : scenario.status === "failed" ? <X size={18} /> : scenario.group}</span>
                <div>
                  <strong>{scenario.group}조</strong>
                  <p>{scenario.title}</p>
                  {scenario.match && (
                    <span className="scenarioMatchLine">
                      <span className="scenarioCountry">
                        <CountryFlag code={scenario.match.Home?.Abbreviation} />
                        {getMatchTeamName(scenario.match.Home)}
                      </span>
                      <span className="scenarioScore">{getScenarioMatchScore(scenario.match)}</span>
                      <span className="scenarioCountry">
                        <CountryFlag code={scenario.match.Away?.Abbreviation} />
                        {getMatchTeamName(scenario.match.Away)}
                      </span>
                      <span className="scenarioState">· {getMatchStatusLabel(scenario.match)}</span>
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === "matches" && (
          <div className="matchList">
            {scenarioMatches.map((match) => (
              <article className={`matchRow ${getMatchState(match)}`} key={match.IdMatch}>
                <div>
                  <strong>{localizedName(match.GroupName)} · {formatMatchDate(match.Date)}</strong>
                  <span>{localizedName(match.Stadium?.Name)} · {localizedName(match.Stadium?.CityName)}</span>
                </div>
                <div className="matchScore">
                  <span className="countryName">
                    <CountryFlag code={match.Home?.Abbreviation} />
                    {getMatchTeamName(match.Home)}
                  </span>
                  <strong>{getMatchScore(match)}</strong>
                  <span className="countryName">
                    <CountryFlag code={match.Away?.Abbreviation} />
                    {getMatchTeamName(match.Away)}
                  </span>
                </div>
                <em>{getMatchStatusLabel(match)}</em>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="ticker" aria-label="실시간 변동 알림">
        <div className="tickerTrack">
          {[...hotTeams, ...sortedThirdPlaceTeams.slice(0, 4)].map((team, index) => (
            <span key={`${team.code}-${index}`}>
              <Zap size={14} />
              <CountryFlag code={team.code} />
              {team.country} · {team.group} · {team.liveNote}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>,
);
