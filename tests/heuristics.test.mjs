import test from 'node:test';
import assert from 'node:assert';
import { analyzePromptTier1 } from '../src/content/heuristics/scorer.ts';

test('Heuristic scorer: flags extremely short prompts with high ambiguity', () => {
  const result = analyzePromptTier1('write code');
  assert.ok(result.score >= 45, `Expected score >= 45, got ${result.score}`);
  assert.ok(result.candidateGaps.includes('goal'), 'Expected candidate gaps to include goal');
});

test('Heuristic scorer: flags missing artifacts when references lack code/attachment', () => {
  const result = analyzePromptTier1('fix this code please', false);
  assert.ok(result.candidateGaps.includes('context'), 'Expected context gap for missing attachment');
  assert.ok(result.score >= 35, `Expected score >= 35, got ${result.score}`);
});

test('Heuristic scorer: stays quiet for specific, complete prompts', () => {
  const specificPrompt =
    'Write a 400-word explainer table comparing React and Vue on performance, bundle size, and learning curve for junior developers.';
  const result = analyzePromptTier1(specificPrompt, false);
  // Should have low score below the 35 threshold
  assert.ok(result.score < 35, `Expected quiet score < 35 for specific prompt, got ${result.score}`);
});

test('Heuristic scorer: flags vague qualifiers', () => {
  const result = analyzePromptTier1('make a nice clean website with good design');
  assert.ok(result.candidateGaps.includes('vague'), 'Expected vague gap detected');
  assert.ok(result.score >= 35, `Expected score >= 35, got ${result.score}`);
});

test('Heuristic scorer: flags conflicting constraints', () => {
  const result = analyzePromptTier1('give me a short brief but very detailed and exhaustive explanation');
  assert.ok(result.candidateGaps.includes('conflict'), 'Expected conflict gap');
});
