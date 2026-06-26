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
  previousProbability: number;
  status: Status;
  liveNote: string;
  qualificationStatus: string;
  isLive: boolean;
  fifaRank: number;
};

const refreshMs = 30000;
const thirdPlaceQualifyingSlots = 8;
const groupStageMatches = 3;
const fifaSeasonId = "285023";
const fifaThirdStandingPath = `/api/v3/groupstanding/third/${fifaSeasonId}?language=ko`;
const fifaMatchesPath = `/api/v3/calendar/matches?idSeason=${fifaSeasonId}&language=ko&count=100`;
const fifaProxyUrl = `/fifa-api${fifaThirdStandingPath}`;
const fifaDirectUrl = `https://api.fifa.com${fifaThirdStandingPath}`;
const fifaMatchesProxyUrl = `/fifa-api${fifaMatchesPath}`;
const fifaMatchesDirectUrl = `https://api.fifa.com${fifaMatchesPath}`;
const scenarioTeamCodes = ["AUS", "PAR", "GER", "ECU", "JPN", "SWE", "EGY", "IRN", "ESP", "URU", "SEN", "IRQ", "AUT", "ALG", "COD", "UZB", "GHA", "CRO"];

const offlineTeams: ThirdPlaceTeam[] = [
  { group: "F조", country: "스웨덴", code: "SWE", points: 4, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 7, goalsAgainst: 7, goalDiff: 0, conductScore: -4, probability: 100, previousProbability: 100, status: "stable", liveNote: "FIFA 공식 스냅샷: 현재 진출권", qualificationStatus: "LiveQualified", isLive: true, fifaRank: 1 },
  { group: "E조", country: "에콰도르", code: "ECU", points: 4, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 2, goalsAgainst: 2, goalDiff: 0, conductScore: -5, probability: 100, previousProbability: 100, status: "stable", liveNote: "FIFA 공식 스냅샷: 진출 확정", qualificationStatus: "ConfirmedQualified", isLive: false, fifaRank: 2 },
  { group: "B조", country: "보스니아 헤르체고비나", code: "BIH", points: 4, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 5, goalsAgainst: 6, goalDiff: -1, conductScore: -10, probability: 100, previousProbability: 100, status: "stable", liveNote: "FIFA 공식 스냅샷: 진출 확정", qualificationStatus: "ConfirmedQualified", isLive: false, fifaRank: 3 },
  { group: "L조", country: "크로아티아", code: "CRO", points: 3, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 4, goalDiff: -1, conductScore: -1, probability: 83, previousProbability: 83, status: "stable", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 4 },
  { group: "A조", country: "대한민국", code: "KOR", points: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 3, goalDiff: -1, conductScore: -4, probability: 80, previousProbability: 80, status: "stable", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 5 },
  { group: "J조", country: "알제리", code: "ALG", points: 3, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 2, goalsAgainst: 4, goalDiff: -2, conductScore: -1, probability: 77, previousProbability: 77, status: "stable", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 6 },
  { group: "D조", country: "파라과이", code: "PAR", points: 3, played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 2, goalsAgainst: 4, goalDiff: -2, conductScore: -11, probability: 74, previousProbability: 74, status: "watch", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 7 },
  { group: "C조", country: "스코틀랜드", code: "SCO", points: 3, played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 4, goalDiff: -3, conductScore: -5, probability: 71, previousProbability: 71, status: "watch", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 8 },
  { group: "H조", country: "카보베르데", code: "CPV", points: 2, played: 2, won: 0, drawn: 2, lost: 0, goalsFor: 2, goalsAgainst: 2, goalDiff: 0, conductScore: -3, probability: 45, previousProbability: 45, status: "danger", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 9 },
  { group: "G조", country: "벨기에", code: "BEL", points: 2, played: 2, won: 0, drawn: 2, lost: 0, goalsFor: 1, goalsAgainst: 1, goalDiff: 0, conductScore: -7, probability: 38, previousProbability: 38, status: "danger", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 10 },
  { group: "K조", country: "콩고 민주 공화국", code: "COD", points: 1, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 2, goalDiff: -1, conductScore: -2, probability: 31, previousProbability: 31, status: "danger", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 11 },
  { group: "I조", country: "세네갈", code: "SEN", points: 0, played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 6, goalDiff: -3, conductScore: 0, probability: 24, previousProbability: 24, status: "danger", liveNote: "FIFA 공식 스냅샷: 진출 가능", qualificationStatus: "CouldQualify", isLive: false, fifaRank: 12 },
];

function localizedName(values?: LocalizedText[], fallback = "-") {
  return values?.find((item) => item.Locale.toLowerCase().startsWith("ko"))?.Description ?? values?.[0]?.Description ?? fallback;
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

type QualificationMetric = {
  points: number;
  played: number;
  goalsFor: number;
  goalDiff: number;
  qualificationStatus: string;
  fifaRank: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function estimateThirdPlaceChance(team: QualificationMetric, contenders: QualificationMetric[]) {
  const status = team.qualificationStatus;
  if (/confirmedqualified|livequalified/i.test(status)) return 100;
  if (/eliminated|cannot/i.test(status)) return 0;

  const sorted = [...contenders].sort((a, b) => a.fifaRank - b.fifaRank);
  const cutLine = sorted[thirdPlaceQualifyingSlots - 1];
  const confirmedCount = sorted.filter((item) => /confirmedqualified|livequalified/i.test(item.qualificationStatus)).length;
  const openSlots = Math.max(0, thirdPlaceQualifyingSlots - confirmedCount);
  if (openSlots === 0) return 0;

  const undecided = sorted.filter((item) => !/confirmedqualified|livequalified/i.test(item.qualificationStatus));
  const undecidedRank = undecided.findIndex((item) => item.fifaRank === team.fifaRank) + 1;
  const remainingMatches = Math.max(0, groupStageMatches - team.played);
  const slotsBehindTeam = openSlots - undecidedRank;
  const pointEdge = team.points - (cutLine?.points ?? 0);
  const tieBreakEdge = team.goalDiff - (cutLine?.goalDiff ?? 0) + (team.goalsFor - (cutLine?.goalsFor ?? 0)) * 0.25;

  const overtakePressure = undecided
    .filter((item) => item.fifaRank > team.fifaRank)
    .reduce((total, challenger) => {
      const challengerRemaining = Math.max(0, groupStageMatches - challenger.played);
      const challengerMaxPoints = challenger.points + challengerRemaining * 3;

      if (challengerMaxPoints < team.points) return total;
      if (challenger.points > team.points) return total + 1;

      if (challengerMaxPoints > team.points) {
        const pointGap = team.points - challenger.points;
        const base = pointGap <= 0 ? 0.9 : pointGap === 1 ? 0.78 : pointGap === 2 ? 0.58 : 0.38;
        const tieAdjust = challenger.goalDiff > team.goalDiff ? 0.08 : challenger.goalDiff < team.goalDiff ? -0.06 : 0;
        return total + clamp(base + tieAdjust, 0, 1);
      }

      const projectedGoalDiff = challenger.goalDiff + challengerRemaining;
      if (projectedGoalDiff > team.goalDiff) return total + 0.52;
      if (projectedGoalDiff === team.goalDiff) return total + 0.36;
      return total + 0.18;
    }, 0);

  const exposedPressure = Math.max(0, overtakePressure - Math.max(0, slotsBehindTeam));

  if (undecidedRank > 0 && undecidedRank <= openSlots) {
    const completedPenalty = remainingMatches === 0 ? 8 : 0;
    const rankCushion = Math.max(0, openSlots - undecidedRank) * 2.5;
    return Math.round(
      clamp(80 + rankCushion + pointEdge * 7 + tieBreakEdge * 1.5 + remainingMatches * 3 - completedPenalty - exposedPressure * 12, 35, 96),
    );
  }

  const distanceFromSlot = undecidedRank > 0 ? undecidedRank - openSlots : team.fifaRank - thirdPlaceQualifyingSlots;
  const maxPoints = team.points + remainingMatches * 3;
  const comebackRoom = Math.max(0, maxPoints - (cutLine?.points ?? team.points));
  return Math.round(clamp(42 - distanceFromSlot * 10 + comebackRoom * 12 + remainingMatches * 8 + tieBreakEdge * 1.2 - exposedPressure * 4, 5, 88));
}

function rowToMetric(row: FifaThirdPlaceRow): QualificationMetric {
  return {
    points: row.Points,
    played: row.Played,
    goalsFor: row.For,
    goalDiff: row.GoalsDiference,
    qualificationStatus: row.QualificationStatus ?? "Unknown",
    fifaRank: row.Position,
  };
}

function teamToMetric(team: ThirdPlaceTeam): QualificationMetric {
  return {
    points: team.points,
    played: team.played,
    goalsFor: team.goalsFor,
    goalDiff: team.goalDiff,
    qualificationStatus: team.qualificationStatus,
    fifaRank: team.fifaRank,
  };
}

function calibrateTeams(teams: ThirdPlaceTeam[]) {
  const metrics = teams.map(teamToMetric);
  return teams.map((team) => {
    const probability = estimateThirdPlaceChance(teamToMetric(team), metrics);
    return {
      ...team,
      probability,
      previousProbability: probability,
      status: getStatus(probability, team.qualificationStatus),
    };
  });
}

function toTeam(row: FifaThirdPlaceRow, contenders: FifaThirdPlaceRow[], previous?: ThirdPlaceTeam): ThirdPlaceTeam {
  const probability = estimateThirdPlaceChance(rowToMetric(row), contenders.map(rowToMetric));
  const qualificationStatus = row.QualificationStatus ?? "Unknown";
  return {
    group: localizedName(row.Group),
    country: localizedName(row.Team.Name),
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
    previousProbability: previous?.probability ?? probability,
    status: getStatus(probability, qualificationStatus),
    liveNote: `FIFA 공식 상태: ${getQualificationStatusLabel(qualificationStatus)}`,
    qualificationStatus,
    isLive: row.IsLive ?? false,
    fifaRank: row.Position,
  };
}

async function fetchFifaStandings(current: ThirdPlaceTeam[]) {
  const previousByCode = new Map(current.map((team) => [team.code, team]));
  const urls = [fifaProxyUrl, fifaDirectUrl];

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`FIFA API ${response.status}`);
      const data = (await response.json()) as FifaThirdPlaceResponse;
      if (!Array.isArray(data.Results) || data.Results.length === 0) throw new Error("No FIFA standings");
      return {
        teams: data.Results.map((row) => toTeam(row, data.Results ?? [], previousByCode.get(row.Team.Abbreviation ?? ""))),
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

function getDeltaLabel(team: ThirdPlaceTeam) {
  const delta = team.probability - team.previousProbability;
  if (delta === 0) return "변동 없음";
  return `${delta > 0 ? "+" : ""}${delta}%`;
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
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getMatchTeamName(team?: FifaMatchTeam | null) {
  return localizedName(team?.TeamName, "-");
}

function getMatchScore(match: FifaMatchRow) {
  if (match.HomeTeamScore === null || match.AwayTeamScore === null) return "경기 전";
  return `${match.HomeTeamScore} - ${match.AwayTeamScore}`;
}

function isMatchFinished(match?: FifaMatchRow) {
  return match?.HomeTeamScore !== null && match?.AwayTeamScore !== null && match?.MatchStatus === 0;
}

function getMatchStatusLabel(match: FifaMatchRow) {
  if (isMatchFinished(match)) return "종료";
  if (match.MatchTime && match.MatchTime !== "0'") return `진행 중 ${match.MatchTime}`;
  return "예정";
}

function getMatchState(match: FifaMatchRow) {
  if (isMatchFinished(match)) return "finished";
  if (match.MatchTime && match.MatchTime !== "0'") return "live";
  return "scheduled";
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
      title: "오스트리아가 알제리를 이긴다",
      match: findMatch(matches, "AUT", "ALG"),
      status: scenarioStatus(findMatch(matches, "AUT", "ALG"), (match) => (teamScore(match, "AUT") ?? -1) > (teamScore(match, "ALG") ?? -1)),
    },
    {
      id: "K",
      group: "K",
      title: "콩고가 우즈베키스탄을 못 이긴다",
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

function useLiveTeams() {
  const initialTeams = useMemo(() => calibrateTeams(offlineTeams), []);
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
    const feedTimer = window.setInterval(loadFeed, refreshMs);

    return () => {
      ignore = true;
      window.clearInterval(feedTimer);
    };
  }, []);

  return { teams, updatedAt, source };
}

function useLiveMatches() {
  const [matches, setMatches] = useState<FifaMatchRow[]>([]);

  useEffect(() => {
    let ignore = false;

    async function loadMatches() {
      const urls = [fifaMatchesProxyUrl, fifaMatchesDirectUrl];
      for (const url of urls) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error(`FIFA matches ${response.status}`);
          const data = (await response.json()) as FifaMatchesResponse;
          if (!Array.isArray(data.Results)) throw new Error("No FIFA matches");
          if (!ignore) setMatches(data.Results);
          return;
        } catch {
          continue;
        }
      }
    }

    void loadMatches();
    const matchTimer = window.setInterval(loadMatches, refreshMs);
    return () => {
      ignore = true;
      window.clearInterval(matchTimer);
    };
  }, []);

  return matches;
}

function App() {
  const { teams, updatedAt, source } = useLiveTeams();
  const matches = useLiveMatches();
  const [activeTab, setActiveTab] = useState<RankingTab>("ranking");

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
  const koreaRank = korea?.fifaRank ?? 0;
  const scenarios = useMemo(() => buildScenarios(matches), [matches]);
  const scenarioMatches = useMemo(
    () =>
      matches
        .filter((match) => {
          const home = match.Home?.Abbreviation;
          const away = match.Away?.Abbreviation;
          return Boolean(home && away && scenarioTeamCodes.includes(home) && scenarioTeamCodes.includes(away));
        })
        .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime()),
    [matches],
  );
  const hotTeams = sortedThirdPlaceTeams.filter((team) => team.isLive || Math.abs(team.probability - team.previousProbability) >= 3);

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
            <div className="koreaMeter" aria-label={`대한민국 진출 안정도 ${korea.probability}%`}>
              <div className="meterHeader">
                <span>{korea.country} 진출 안정도</span>
                <strong>{korea.probability}%</strong>
              </div>
              <ProbabilityBar value={korea.probability} tone="korea" settled={/confirmedqualified/i.test(korea.qualificationStatus)} />
              <div className="meterMeta">
                <span>FIFA 3위 국가 순위 {koreaRank}위</span>
                <span>AI 분석 기반 진출 안정도</span>
                <span className={korea.probability >= korea.previousProbability ? "deltaUp" : "deltaDown"}>
                  직전 대비 {getDeltaLabel(korea)}
                </span>
                <span>승점 {korea.points}, 득실 {korea.goalDiff > 0 ? `+${korea.goalDiff}` : korea.goalDiff}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rankingSection" aria-label="3위 국가 진출 순위">
        <div className="sectionHeader">
          <div>
            <h2>3위 국가 진출 순위</h2>
            <p>AI 분석 기반 진출 안정도입니다. 승점, 득실, 득점, 남은 경기와 현재 8위 컷을 반영합니다.</p>
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

        {activeTab === "ranking" && (
          <div className="rankingList">
            {sortedThirdPlaceTeams.map((team, index) => (
              <article className={`rankRow ${index < 8 ? "inZone" : "outZone"} ${team.code === "KOR" ? "highlight" : ""}`} key={team.code}>
                <span className="rankNo">{index + 1}</span>
                <div className="rankTeam">
                  <strong>{team.country}</strong>
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
                  <span className={team.probability >= team.previousProbability ? "deltaUp" : "deltaDown"}>직전 대비 {getDeltaLabel(team)}</span>
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
                    <span>
                      {getMatchTeamName(scenario.match.Home)} {getMatchScore(scenario.match)} {getMatchTeamName(scenario.match.Away)} · {getMatchStatusLabel(scenario.match)}
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
                  <span>{getMatchTeamName(match.Home)}</span>
                  <strong>{getMatchScore(match)}</strong>
                  <span>{getMatchTeamName(match.Away)}</span>
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
