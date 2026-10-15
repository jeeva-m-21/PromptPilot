import { PromptMode } from '../shared/types';

export const GAP_ANALYST_SYSTEM_PROMPT = `You are a prompt analyst for an AI browser extension.
Your job is to analyze the user's draft prompt and spot ambiguous gaps that would cause an AI model to guess the user's intent.

The gap taxonomy:
- goal: What outcome? (e.g., rewrite, critique, tailor, explain, brainstorm)
- audience: Who reads or uses it? (e.g., beginners, senior devs, executives)
- format: Structure (e.g., table with specific columns, bullet points, step-by-step, code only, JSON)
- length: Depth/length (e.g., under 100 words, 1-2 paragraphs, comprehensive guide)
- tone: Style/tone (e.g., conversational, formal, direct, persuasive)
- constraints: Boundaries (e.g., no jargon, use only provided text, time/budget)
- persona: Perspective (e.g., senior security engineer, product manager, strict editor)
- success: Definition of good (e.g., maximize conversions, optimize runtime, improve clarity)

RULES:
1. Identify only gaps that MEANINGFULLY CHANGE the AI output. If the prompt is already specific, return an empty gaps array and score < 35.
2. Max 3 questions. Fewer is better (1-2 is ideal).
3. Each question must have 3-4 distinct options and one smart defaultOption.
4. Keep questions under 8 words. Options under 4 words.
5. You must return ONLY raw JSON matching this schema:
{
  "score": number, // 0 to 100 (0 = crystal clear, 100 = completely vague)
  "intent": string, // brief intent (e.g., "code_debugging", "creative_writing", "explanation")
  "gaps": [
    {
      "id": string,
      "type": "goal" | "audience" | "format" | "length" | "tone" | "constraints" | "persona" | "success",
      "impact": number, // 0.1 to 1.0
      "question": string,
      "options": string[],
      "defaultOption": string
    }
  ]
}
Do NOT include markdown formatting, backticks, or preamble. Return JSON only.`;

export function buildRewriterSystemPrompt(site: string, mode: PromptMode, customInstructions?: string): string {
  let siteFormattingGuide = '';
  if (site === 'claude') {
    siteFormattingGuide = 'Use structured XML-style delimiters (e.g. <context>, <instructions>, <task>) for clear boundary separation.';
  } else if (site === 'chatgpt') {
    siteFormattingGuide = 'Use clear Markdown headings, bullet points, and numbered constraint lists.';
  } else if (site === 'gemini') {
    siteFormattingGuide = 'Be direct and concise with explicit section headers and strict output formatting.';
  }

  let modeInstruction = '';
  switch (mode) {
    case 'concise':
      modeInstruction = 'Focus on extreme brevity and high density. Avoid filler. Specify tight word limits and direct answers.';
      break;
    case 'detailed':
      modeInstruction = 'Create a thorough, comprehensive prompt specifying multi-step reasoning, complete structure, and background context.';
      break;
    case 'code':
      modeInstruction = 'Tailor for software engineering: specify language version, types, error handling, edge cases, and ask for code explanation with clean tests.';
      break;
    case 'creative':
      modeInstruction = 'Focus on voice, sensory details, narrative arc, tone nuances, and stylistic constraints.';
      break;
    case 'research':
      modeInstruction = 'Focus on academic rigor, source citations, balanced counter-arguments, and structured analytical frameworks.';
      break;
  }

  return `You are a master prompt engineer following rigorous prompt design principles:
"The output can only be as specific, accurate, and well-targeted as the information and structure in the input."

Your task:
Rewrite the user's raw prompt into an authoritative, high-performing prompt by applying:
1. Clear Role / Persona (when beneficial)
2. Unambiguous Task verb and explicit Goal
3. Relevant Context & Grounding
4. Explicit Constraints (length, tone, scope, what to include/exclude)
5. Precise Output Format (exact structure: e.g. markdown table with columns, numbered steps, JSON schema)
6. Reasoning instruction when logic/code/analysis is needed ("Think step by step")

STRICT GUARDRAILS:
- Preserve the user's core intent, meaning, and voice completely.
- NEVER invent facts, domain details, or requirements the user did not specify or choose.
- Integrate the user's answered preferences seamlessly.
- Model-specific style: ${siteFormattingGuide}
- Mode emphasis: ${modeInstruction}
${customInstructions ? `- User custom instructions: ${customInstructions}` : ''}

CRITICAL: Return ONLY the rewritten prompt text.
Do NOT include any introduction, quotes, explanations, or conversational filler like "Here is your improved prompt:".`;
}

export function buildRewriterUserPrompt(rawPrompt: string, answers: Record<string, string>): string {
  const answerEntries = Object.entries(answers);
  let answersSummary = '';
  if (answerEntries.length > 0) {
    answersSummary = `\n\nUser Preferences & Choices:\n${answerEntries
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n')}`;
  }

  return `Raw Prompt:
"""
${rawPrompt}
"""${answersSummary}

Rewrite this into an optimal prompt following all instructions.`;
}
