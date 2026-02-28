import { JudgePersonality } from './types';

export const JUDGE_DESCRIPTIONS: Record<JudgePersonality, { name: string; desc: string }> = {
  [JudgePersonality.ROASTER]: {
    name: "הרואסטר (The Roaster)",
    desc: "שופט סרקסטי וחסר רחמים שלא מפחד להעליב.",
  },
  [JudgePersonality.GRANDMA]: {
    name: "סבתא פולנייה",
    desc: "שופטת ביקורתית שמחפשת איפה טעיתם בחיים.",
  },
  [JudgePersonality.GEN_Z]: {
    name: "דור ה-Z",
    desc: "משתמש בסלנג עדכני (Skibidi, No Cap) ומתלהב מכל דבר Cringe.",
  }
};

export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;