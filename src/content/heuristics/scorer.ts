import { GapType } from '../../shared/types';

export interface HeuristicResult {
  score: number;
  reasons: string[];
  candidateGaps: GapType[];
}

const VAGUE_WORDS = new Set([
  'good',
  'better',
  'best',
  'nice',
  'some',
  'few',
  'quick',
  'quickly',
  'simple',
  'professional',
  'properly',
  'clean',
  'fast',
  'cool',
  'awesome',
  'great',
]);

const INTENT_VERBS = [
  'write',
  'explain',
  'summarize',
  'fix',
  'debug',
  'code',
  'create',
  'build',
  'plan',
  'review',
  'improve',
  'analyze',
  'compare',
  'rewrite',
  'draft',
];

const FORMAT_CUES = [
  'table',
  'json',
  'bullet',
  'bullets',
  'step-by-step',
  'steps',
  'csv',
  'markdown',
  'list',
  'paragraphs',
  'words',
  'lines',
  'code only',
];

const AUDIENCE_CUES = [
  'for beginners',
  'for developers',
  'for engineers',
  'for kids',
  'for experts',
  'for executives',
  'audience',
  'reader',
];

const TONE_CUES = [
  'formal',
  'casual',
  'friendly',
  'professional',
  'humorous',
  'direct',
  'persuasive',
  'academic',
  'tone',
];

export function analyzePromptTier1(text: string, hasAttachments: boolean = false): HeuristicResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { score: 0, reasons: [], candidateGaps: [] };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = trimmed.toLowerCase();

  let score = 0;
  const reasons: string[] = [];
  const candidateGaps: Set<GapType> = new Set();

  // 1. Length check
  if (wordCount < 4) {
    score += 45;
    reasons.push('Extremely short instruction');
    candidateGaps.add('goal');
  } else if (wordCount < 7) {
    score += 30;
    reasons.push('Very short instruction');
    candidateGaps.add('goal');
  }

  // 2. Intent verb check
  const hasIntentVerb = INTENT_VERBS.some((verb) =>
    new RegExp(`\\b${verb}\\b`, 'i').test(trimmed)
  );
  if (!hasIntentVerb) {
    score += 15;
    reasons.push('No clear action verb');
    candidateGaps.add('goal');
  }

  // 3. Vague words check
  const foundVagueWords = words.filter((w) => VAGUE_WORDS.has(w.toLowerCase().replace(/[^\w]/g, '')));
  if (foundVagueWords.length > 0) {
    score += Math.min(foundVagueWords.length * 15, 30);
    reasons.push(`Contains vague words: "${foundVagueWords.slice(0, 3).join(', ')}"`);
    candidateGaps.add('vague');
  }

  // 4. Missing context / artifact references ("fix this code", "summarize this")
  const hasDanglingPronoun = /\b(this|it|that|these|the code|the text|the article)\b/i.test(trimmed);
  const hasCodeFence = trimmed.includes('```');
  const hasUrl = /https?:\/\/[^\s]+/i.test(trimmed);

  if (hasDanglingPronoun && !hasCodeFence && !hasUrl && !hasAttachments && wordCount < 20) {
    score += 30;
    reasons.push('Refers to context without code/text attached');
    candidateGaps.add('context');
  }

  // 5. Format cues absent
  const hasFormatCue = FORMAT_CUES.some((cue) => lower.includes(cue));
  if (!hasFormatCue && wordCount < 25) {
    score += 15;
    reasons.push('No desired output format specified');
    candidateGaps.add('format');
  }

  // 6. Audience cues absent
  const hasAudienceCue = AUDIENCE_CUES.some((cue) => lower.includes(cue));
  if (!hasAudienceCue && (lower.includes('write') || lower.includes('explain') || lower.includes('blog') || lower.includes('email'))) {
    score += 15;
    reasons.push('Target audience unspecified');
    candidateGaps.add('audience');
  }

  // 7. Tone cues absent
  const hasToneCue = TONE_CUES.some((cue) => lower.includes(cue));
  if (!hasToneCue && (lower.includes('email') || lower.includes('speech') || lower.includes('letter') || lower.includes('message'))) {
    score += 15;
    reasons.push('Desired tone unspecified');
    candidateGaps.add('tone');
  }

  // 8. Contradiction patterns ("short" + "detailed", "simple" + "exhaustive")
  if (
    (lower.includes('short') || lower.includes('brief')) &&
    (lower.includes('detailed') || lower.includes('in-depth') || lower.includes('exhaustive'))
  ) {
    score += 25;
    reasons.push('Conflicting length/depth instructions');
    candidateGaps.add('conflict');
  }

  // Cap score at 100
  const finalScore = Math.min(score, 100);

  return {
    score: finalScore,
    reasons,
    candidateGaps: Array.from(candidateGaps),
  };
}
