import test from 'node:test';
import assert from 'node:assert';
import {
  buildRewriterSystemPrompt,
  buildRewriterUserPrompt,
} from '../src/background/prompts.ts';

test('Prompt Rewriter: produces Claude-specific XML delimiters instruction', () => {
  const prompt = buildRewriterSystemPrompt('claude', 'code');
  assert.ok(prompt.includes('XML-style delimiters'), 'Claude prompt must include XML delimiters');
  assert.ok(prompt.includes('software engineering'), 'Code mode must tailor for software engineering');
});

test('Prompt Rewriter: produces ChatGPT-specific markdown guide', () => {
  const prompt = buildRewriterSystemPrompt('chatgpt', 'detailed');
  assert.ok(prompt.includes('Markdown headings'), 'ChatGPT prompt must use markdown headings');
  assert.ok(prompt.includes('multi-step reasoning'), 'Detailed mode must ask for multi-step reasoning');
});

test('Prompt Rewriter: formats user answers clearly without hallucinated extras', () => {
  const userPrompt = buildRewriterUserPrompt('write a blog post about rust', {
    audience: 'Beginners',
    length: '~800 words',
  });

  assert.ok(userPrompt.includes('write a blog post about rust'));
  assert.ok(userPrompt.includes('audience: Beginners'));
  assert.ok(userPrompt.includes('length: ~800 words'));
});
