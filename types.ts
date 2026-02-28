export enum GamePhase {
  LOBBY = 'LOBBY',
  UPLOAD = 'UPLOAD',
  CAPTIONING = 'CAPTIONING',
  JUDGING = 'JUDGING',
  RESULTS = 'RESULTS',
}

export enum JudgePersonality {
  ROASTER = 'ROASTER',
  GRANDMA = 'GRANDMA',
  GEN_Z = 'GEN_Z',
}

export interface Player {
  id: string;
  name: string;
  score: number;
  avatar: string;
}

export interface MemeSubmission {
  playerId: string;
  caption: string;
}

export interface AIJudgmentResult {
  playerId: string;
  scores: {
    creativity: number;
    visualFit: number;
    vibeCheck: number;
  };
  totalScore: number;
  comment: string;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  judgePersonality: JudgePersonality;
  currentImageBase64: string | null;
  submissions: MemeSubmission[];
  judgments: AIJudgmentResult[];
  roundsPlayed: number;
  roomCode: string | null; // New: The active room code
  isHost: boolean;         // New: Is this client the host?
}