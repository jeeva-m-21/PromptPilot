# PromptPilot: Browser Extension Plan
*A non-invasive prompt copilot that lives inside Claude, ChatGPT, Gemini and other AI chats.*

---

## 1. Product Vision

**One sentence:** While you type in an AI chat, PromptPilot quietly spots what's vague, asks 1-3 fast questions only when needed, and rewrites your prompt into a clear, structured one. You accept with `Tab`. Nothing is saved or changed until you do.

### Design principles (every decision is checked against these)

| # | Principle | What it means in practice |
|---|-----------|---------------------------|
| 1 | **Never block typing** | No modal on keystroke. No latency on the host input. Ever. |
| 2 | **Silent unless useful** | If the prompt is already good, the extension shows nothing. |
| 3 | **Keyboard first** | Whole flow works without touching the mouse. |
| 4 | **User owns the text** | Nothing is replaced, saved, or sent without an explicit key press. |
| 5 | **Questions are cheap** | Max 3 questions, tap/number-key answers, always skippable with sensible defaults. |
| 6 | **Show the diff** | The user always sees what changed and why. |
| 7 | **Feels native** | Matches host site's theme (light/dark), font, spacing. |

---

## 2. Where Prompts Are Usually Ambiguous (the gap taxonomy)

This is the core of the "smart questions" system. Every prompt is scored against these gap types.

| Gap type | Example prompt | What's missing | Question asked |
|----------|----------------|----------------|----------------|
| **Goal / intent** | "help me with my resume" | What outcome? Rewrite, critique, tailor? | "What do you want done?" `Rewrite / Critique / Tailor to a job / Other` |
| **Audience** | "write a blog about AI" | Who reads it? | `Beginners / Developers / Executives / Other` |
| **Format / output shape** | "explain kubernetes" | Table? Steps? Essay? Code? | `Short answer / Step-by-step / Table / Deep dive` |
| **Length / depth** | "summarize this" | 1 line or 1 page? | `1-2 lines / Paragraph / Detailed` |
| **Tone / style** | "write an email to my boss" | Formal? Apologetic? Firm? | `Formal / Friendly / Direct` |
| **Missing input / context** | "fix this code" (no code) | The thing being referred to | Inline warning: "No code attached. Paste it?" |
| **Dangling reference** | "make it shorter", "like before" | `it` has no referent in this thread | "What should 'it' refer to?" (suggests last message) |
| **Constraints** | "plan a trip to Japan" | Budget, dates, preferences | `Budget? Dates? Interests?` |
| **Success criteria** | "improve my landing page" | What does "better" mean? | `More conversions / Clearer / Faster / Prettier` |
| **Persona / role** | "review my business idea" | Who should the AI act as? | `Investor / Customer / Mentor` |
| **Scope overload** | "write the app, deploy it, and make the logo" | Too many tasks in one prompt | Suggest splitting into numbered steps |
| **Conflicting instructions** | "be very detailed but keep it under 50 words" | Contradiction | "Which matters more?" |
| **Vague quantifiers** | "a few", "some", "good", "fast" | Unmeasured words | Replace with a number or example |
| **Language / locale** | "write a speech" | Language, region, units | Only asked when the page locale hints at it |

### Rule: ask only about gaps that **change the output meaningfully**
Each gap gets an **impact score (0-1)**. Questions are shown only for gaps with impact ≥ 0.5, ranked by impact, capped at 3.

---

## 3. How Ambiguity Is Detected (two-tier system)

### Tier 1: Local heuristics (instant, free, offline, runs on pause)
Runs in the content script in under 5 ms. No network.

- **Length check:** under 6 words → "very short" flag.
- **Intent verb detection:** regex/lexicon for write, explain, fix, summarize, plan, review, etc.
- **Dangling-pronoun check:** `it / this / that / these` with no code block, attachment, or prior-message referent.
- **Missing-artifact check:** "fix this code", "summarize this article" but no code fence, URL, or attachment.
- **Vague-word lexicon:** good, better, nice, some, few, quick, simple, professional.
- **Format cues absent:** no mention of format, length, tone, audience.
- **Multi-task detector:** count of distinct imperative verbs joined by "and/then/also".
- **Contradiction patterns:** short + detailed, formal + casual, etc.

Output: `ambiguityScore` (0-100) + list of candidate gaps.

### Tier 2: LLM refinement (only when Tier 1 score ≥ threshold *and* user asks or pauses)
A small, fast model (Haiku-class / GPT-mini-class / or local model) receives:

```
SYSTEM: You are a prompt analyst. Return JSON only.
INPUT: { prompt, last_3_messages_summary, site, locale }
OUTPUT: {
  "gaps": [{ "type", "impact", "why", "question", "options": [..], "default" }],
  "intent": "...",
  "rewrite_ready": true|false
}
```

The LLM does **not** rewrite yet. It only returns gaps and questions. This keeps it fast (~400-800 ms) and cheap.

### When Tier 2 is NOT called
- Prompt score < 35 → silent.
- User is mid-typing (debounce not expired).
- Same prompt text was already analyzed.
- User dismissed the suggestion for this draft.

---

## 4. The Core User Flow (what happens as they type)

### State machine

```
IDLE → TYPING → ANALYZING → SUGGESTION_READY → QUESTIONING → PREVIEW → ACCEPTED
                     ↓              ↓                ↓           ↓
                  (silent)       DISMISSED        SKIPPED     REVERTED
```

### Step-by-step timeline

**Moment 0: User starts typing.** Nothing appears. Zero UI.

**Moment 1: User pauses ≥ 1.2 s and has ≥ 6 words.** Tier 1 heuristics run (local, instant).

- Score < 35 → **stay silent** (prompt is fine).
- Score ≥ 35 → a tiny **status chip** fades in at the bottom-right corner of the input box:

```
┌──────────────────────────────────────────────────────┐
│ write a blog about ai                                │
│                                                      │
│                              ✦ 3 gaps · Tab to refine│
└──────────────────────────────────────────────────────┘
```

It is 24 px high, low contrast, no animation beyond a 150 ms fade. If the user keeps typing, it fades out. It never steals focus.

**Moment 2: User presses `Tab`** (only captured while the chip is visible; otherwise Tab behaves natively).

The chip expands into an **inline question tray** attached to the input (not a modal, not a popup elsewhere):

```
┌──────────────────────────────────────────────────────┐
│ write a blog about ai                                │
├──────────────────────────────────────────────────────┤
│ Who's it for?                                  1/3   │
│ [1 Beginners] [2 Developers] [3 Executives] [4 …]    │
│                                                      │
│ ↵ next   ⇥ use default   Esc cancel                  │
└──────────────────────────────────────────────────────┘
```

- Number keys `1-4` select an option instantly and auto-advance.
- `4 …` opens a one-line free-text field (type, then Enter).
- `Tab` = "use the suggested default and skip".
- `Shift+Tab` goes back one question.
- Questions are **sequential, one at a time**, so there's no wall of form fields.
- A thin progress dot row shows 1/3, 2/3, 3/3.

**Moment 3: Answers done → optimization runs** (~600-1200 ms, streaming).

The tray swaps to a **preview card** with a diff view:

```
┌──────────────────────────────────────────────────────┐
│ ✦ Optimized prompt                          [Diff|Clean]│
│                                                      │
│ Write a 900-word blog post on how AI is changing     │
│ everyday jobs, for non-technical beginners. Use a    │
│ friendly tone, a hook intro, 3 real-world examples,  │
│ and end with a one-line takeaway.                    │
│                                                      │
│ Added: audience · length · tone · structure          │
│                                                      │
│ ⇥ Accept   E Edit   Esc Keep original   ⌘Z Revert    │
└──────────────────────────────────────────────────────┘
```

- Additions are highlighted subtly (green underline in Diff mode).
- The "Added:" line explains **what improved** in plain words, so the user learns prompt-craft.

**Moment 4: User presses `Tab`** → the text in the host chat input is replaced with the optimized version. This is the **only** moment anything is written or saved.

- A 2-second toast: `Applied · ⌥Z to undo`.
- Original is kept in memory so `⌥Z` restores it instantly.
- Entry saved to local history **now** (original, optimized, answers, site, timestamp).

**Moment 5: User reviews and presses Enter** (the site's own send). PromptPilot never auto-sends.

### What if the user ignores it?
Nothing happens. The chip fades after 6 s of inactivity and doesn't reappear for that draft unless the text changes by more than ~30%.

### What if the prompt is already good?
Silent. At most, after send, the chip can show a tiny `✓ clear prompt` once per session to build trust (optional setting, off by default).

---

## 5. Alternate Entry Points

| Entry point | Behavior |
|-------------|----------|
| **Auto (pause)** | Default flow above. |
| **Hotkey `⌥O` / `Alt+O`** | Force analyze right now, even on short prompts. |
| **Quick-optimize `⌥⇧O`** | Skip questions, optimize using smart defaults in one shot. |
| **Select text → right-click / hotkey** | Optimize only the selected portion. |
| **Pre-send guard (opt-in)** | If score ≥ 70 on Enter, a soft banner appears: "This is vague. Refine? ⇥ / Send anyway ↵". One key either way. |
| **Command palette `⌥K`** | Fuzzy search: modes, templates, history, settings. |

---

## 6. Shortcut Map

| Shortcut | Context | Action |
|----------|---------|--------|
| `Tab` | Chip visible | Open question tray |
| `Tab` | Preview visible | Accept optimized prompt |
| `Tab` | In a question | Use default, next |
| `Shift+Tab` | In a question | Previous question |
| `1-4` | In a question | Select option |
| `Enter` | In a question | Confirm / advance |
| `Esc` | Any PromptPilot UI | Dismiss, keep original |
| `⌥O` | Anywhere in chat | Analyze now |
| `⌥⇧O` | Anywhere in chat | One-shot optimize (no questions) |
| `⌥Z` | After accept | Revert to original |
| `⌥K` | Anywhere | Command palette |
| `⌥H` | Anywhere | Open history panel |
| `⌥M` | Anywhere | Cycle mode (Concise → Detailed → Code → Creative) |

**Important implementation notes**
- Chrome's `commands` API allows only a few suggested global shortcuts, so use it for `⌥O` and `⌥K`, and handle the rest via content-script `keydown` listeners.
- **Tab is only intercepted when a PromptPilot surface is visible.** Otherwise it passes through, so site accessibility is never broken.
- All shortcuts are remappable in settings. Detect conflicts with the host site's own shortcuts (e.g. Claude, ChatGPT).

---

## 7. The Prompt Optimization Engine

### Pipeline

```
raw prompt
   ↓
[1] Intent classification      (write / code / analyze / plan / learn / create)
   ↓
[2] Gap detection              (Section 3)
   ↓
[3] Smart questions            (Section 8)
   ↓
[4] Context injection          (thread summary, user profile, mode)
   ↓
[5] Template assembly          (technique chosen per intent)
   ↓
[6] LLM rewrite                (streamed, constrained)
   ↓
[7] Validation + diff          (no hallucinated facts, same intent, length sanity)
   ↓
preview → Tab → apply
```

### Techniques applied (selected automatically by intent)

| Technique | When used | What it adds |
|-----------|-----------|--------------|
| **Role framing** | Advice, review, critique | "Act as a senior …" |
| **Task decomposition** | Complex or multi-step asks | Numbered subtasks |
| **Output-format spec** | Almost always | Explicit structure: table, bullets, JSON, sections |
| **Constraints block** | When limits exist | Length, tone, must-include, must-avoid |
| **Few-shot hint** | Style or format matters | "Example of the style I want: …" (user-supplied only) |
| **Chain-of-thought request** | Reasoning, math, debugging | "Think step by step, then give the final answer" |
| **Context grounding** | Follow-ups in thread | Reference to prior content, stated explicitly |
| **Success criteria** | Open-ended improvement asks | "Good means: …" |
| **Clarify-or-assume clause** | Remaining unknowns | "If anything is unclear, ask before answering" |
| **Delimiters** | Pasted text or code | Wrap input in clear tags/fences |

### Rewrite system prompt (guardrails)
```
You rewrite user prompts. Rules:
1. Preserve the user's intent, voice, and language exactly.
2. Never invent facts, names, numbers, or requirements the user did not state or choose.
3. Fill gaps ONLY from the user's answers or clearly marked defaults.
4. Keep it as short as possible while being unambiguous.
5. Do not add instructions the target model doesn't need.
6. Return the prompt only. No commentary.
```

### Model-aware tuning
The extension knows which site it's on and tunes the structure:
- **Claude:** XML-style tags for sections, explicit thinking requests.
- **ChatGPT:** markdown headers + numbered constraints.
- **Gemini:** concise instructions + explicit output format.

### Modes
`Concise` · `Detailed` · `Code` · `Creative` · `Research` · `Custom`, each a different template bias, switchable with `⌥M`.

---

## 8. The Smart Question System (minimal overhead by design)

### Rules
1. **Max 3 questions.** Fewer is better; 1 is ideal.
2. **Multiple choice first**, free text only as an escape hatch.
3. **Every question has a pre-selected smart default.** `Tab` accepts it.
4. **Never ask what can be inferred.** Use thread context, earlier answers, past history, profile.
5. **Learn from the user.** If they always pick "Developers" for audience, make it the default and eventually stop asking.
6. **Ranked by impact.** Highest-impact gap first.
7. **One at a time**, never a form.
8. **"Just do it" escape** at any point: `⌥⇧O` optimizes with defaults.

### Question quality checklist (applied by the LLM and validated)
- Is it answerable in < 3 seconds?
- Does the answer change the output in a visible way?
- Are the options mutually exclusive and exhaustive enough?
- Is the default the most common choice?

### Anti-overhead mechanisms

| Mechanism | Effect |
|-----------|--------|
| Answer memory | Same site and intent → pre-fills from last time |
| Profile defaults | Set once: "I'm a developer, prefer concise" |
| Adaptive suppression | Gap types the user always skips stop being asked |
| Batched inference | 3 gaps often resolved by 1 question ("Is this for work or personal?" implies tone + audience) |
| Silent mode | Skip questions entirely, always use defaults |

---

## 9. UI / UX Specification

### Surfaces (smallest to largest)

| Surface | Purpose | Size | Invasiveness |
|---------|---------|------|--------------|
| **Status chip** | "Gaps found" hint | 24 px pill | Very low |
| **Question tray** | Sequential questions | Attached under the input | Low |
| **Preview card** | Review optimized prompt | Attached above/below input | Medium (user-triggered) |
| **Toast** | Confirm apply, undo | Bottom-center, 2 s | Low |
| **Command palette** | Power features | Centered overlay, `⌥K` | User-triggered only |
| **History panel** | Past prompts | Slide-in right drawer | User-triggered only |
| **Popup (toolbar icon)** | Quick settings | 320 px | User-triggered only |
| **Options page** | Full settings | Full tab | User-triggered only |

### Visual language
- **Shadow DOM** for every injected element, so host CSS can't break it and ours can't leak.
- **Theme-adaptive:** reads host `prefers-color-scheme` and the site's background luminance. Light/dark tokens switch automatically.
- **Typography:** inherits the host font stack for the chip and tray (feels native), with a monospace face only for diffs.
- **Accent:** one subtle accent color (indigo/violet) used sparingly; never red/yellow alerts for normal suggestions.
- **Motion:** 120-180 ms fades and slides, `prefers-reduced-motion` respected.
- **Spacing:** 8 px grid. Border radius matches host input radius.
- **Elevation:** 1 px border + soft shadow, never heavy.
- **Keycaps:** shortcuts shown as small `kbd` pills, always visible in the footer of each surface.

### Positioning rules
- Chip and tray anchor to the input container's bounding box, with a `ResizeObserver` and `IntersectionObserver` to follow it through scroll and resize.
- Never overlay the send button, attachment button, or model picker.
- On narrow viewports, the tray docks above the keyboard region.

### Accessibility
- Full ARIA: `role="status"` for the chip, `role="dialog"` (non-modal) for the tray.
- Focus never moves unless the user presses a PromptPilot key.
- All actions reachable by keyboard; visible focus rings; contrast ≥ 4.5:1.
- Screen-reader announcement: "Prompt suggestions available, press Tab to review."

### Empty / edge states
- Offline → heuristics only, with a subtle "offline mode" label.
- API error → chip shows "Couldn't refine. Retry ⌥O" and nothing else breaks.
- Rate-limited → falls back to local heuristics + templates.

---

## 10. Saving & Persistence Rules

> **Nothing is saved or applied until the user presses Accept (Tab).**

| Event | Saved? | Where |
|-------|--------|-------|
| Typing | No | n/a |
| Analysis result | No (in-memory cache for 60 s) | Content script memory |
| Answering questions | No | Memory only |
| Preview shown | No | Memory only |
| **Accept (Tab)** | **Yes**: original, optimized, answers, site, mode, timestamp | `chrome.storage.local` (encrypted option) / IndexedDB |
| Dismiss (Esc) | No, except an anonymous count for adaptive suppression | Local counters |
| Pin as template | Yes (explicit action) | Local storage |

### History features
- Searchable, filterable by site, mode, date.
- One-click reuse: inserts into the current chat input.
- "Save as template" with variables, e.g. `{{topic}}`, `{{audience}}`.
- Export/import JSON.
- Optional sync via `chrome.storage.sync` (opt-in, size-limited) or user-supplied cloud later.

---

## 11. Technical Architecture

### Extension type
**Chrome Manifest V3** (also Edge/Brave; Firefox port via WebExtension polyfill).

### Component map

```
┌─────────────────────────── Browser ────────────────────────────┐
│                                                                  │
│  Content Script (per site)                                       │
│   ├─ Site Adapter (selectors, insert, read thread)               │
│   ├─ Input Observer (debounced)                                  │
│   ├─ Heuristic Engine (Tier 1)                                   │
│   ├─ UI Layer (Shadow DOM: chip, tray, preview, toast)           │
│   └─ Keyboard Manager                                            │
│            │ chrome.runtime messages                             │
│            ▼                                                     │
│  Service Worker (background)                                     │
│   ├─ LLM Gateway (BYOK keys / backend proxy / local model)       │
│   ├─ Prompt Engine (pipeline, templates, validation)             │
│   ├─ Cache + rate limiter                                        │
│   └─ Storage Manager                                             │
│            │                                                     │
│  Popup / Options / History (React + Tailwind)                    │
└──────────────────────────────────────────────────────────────────┘
        │ (optional)
        ▼
  Backend proxy (auth, usage, key hiding)  → LLM provider
```

### Recommended stack
- **Language:** TypeScript
- **Build:** Vite + `@crxjs/vite-plugin` (HMR for extensions)
- **UI:** Preact or React + Tailwind (inside Shadow DOM, with CSS injected as a string)
- **State:** Zustand (small) or a lightweight XState machine for the flow state machine
- **Storage:** `chrome.storage.local` for settings; IndexedDB (Dexie) for history
- **Testing:** Vitest (unit), Playwright with extension loaded (e2e), plus recorded DOM fixtures per site
- **Lint/CI:** ESLint, Prettier, GitHub Actions, automated adapter smoke tests

### The hardest part: **Site Adapters**

Each AI chat site uses a rich-text editor (ProseMirror/contenteditable or React-controlled textarea). Plain `element.value = ...` doesn't work.

```ts
interface SiteAdapter {
  id: 'claude' | 'chatgpt' | 'gemini' | ...;
  matches(url: URL): boolean;
  findInput(): HTMLElement | null;
  getText(): string;
  setText(text: string): void;       // must trigger framework's change events
  getThreadContext(n: number): Message[];
  getInputRect(): DOMRect;
  onSend(cb: () => void): Unsubscribe;
  hasAttachments(): boolean;
}
```

**Reliable text insertion strategy (in fallback order)**
1. Focus input → `document.execCommand('selectAll')` → `document.execCommand('insertText', false, text)` (fires native input events; works with most editors).
2. Dispatch a synthetic `ClipboardEvent('paste')` with `DataTransfer` containing text.
3. For `<textarea>`: use the native value setter + dispatch `input` event.
4. Last resort: copy to clipboard + toast "Press ⌘V".

**Resilience against DOM changes**
- Selectors by role/aria/placeholder first, class names last.
- `MutationObserver` to re-find the input after SPA navigation.
- Remote selector config (signed JSON) so adapters can be hotfixed without a store review.
- Health check: if the adapter can't find the input, the extension disables itself silently on that page and reports an anonymous error code.

### LLM Gateway options (user-selectable)

| Option | Pros | Cons |
|--------|------|------|
| **BYOK** (user's own API key) | Private, no server cost | Setup friction |
| **Hosted backend** (your proxy, free tier + Pro) | Zero setup, best UX | Costs, privacy concerns |
| **Local model** (WebGPU / Ollama / Chrome built-in AI) | Fully private, offline | Slower and weaker |
| **Heuristics only** | Instant, free | No smart rewrite |

**Recommended default:** Hosted free tier with a small fast model, plus BYOK and local as options for privacy-focused users.

### Performance budget

| Action | Target |
|--------|--------|
| Keystroke overhead on host page | **0 ms**: debounced, off main thread where possible |
| Tier 1 heuristics | < 5 ms |
| Chip appearance after pause | < 1.5 s |
| Tier 2 gap analysis | < 800 ms |
| Optimized prompt first token | < 600 ms (streamed) |
| Extension memory | < 30 MB |
| Bundle size (content script) | < 150 KB gzipped |

### Permissions (keep minimal for trust and store approval)
- `host_permissions`: only the supported chat domains.
- `storage`, `activeTab`, `scripting`, `commands`.
- No broad `<all_urls>`, no `webRequest`, no reading page content outside the chat input and visible thread.

---

## 12. Privacy & Trust (this decides adoption)

- Prompt text is processed **only** when analysis is triggered. Never sent on every keystroke.
- Clear first-run explanation: what's sent, to whom, and why.
- **Local-first history.** Nothing leaves the device unless sync is enabled.
- Redaction pass before any remote call: emails, API keys, phone numbers, and credit-card-like patterns are masked and restored after.
- "Sensitive site/prompt" detection → switch to local-only automatically.
- Per-site on/off toggle, plus a global pause (`⌥P`).
- Open-source the adapter and prompt-engine layers if possible, which builds trust.
- No selling data. No training on user prompts. Say it plainly in the UI.

---

## 13. Data Model

```ts
type Draft = {
  id: string;
  site: string;
  originalText: string;
  analysis?: {
    score: number;
    intent: string;
    gaps: Gap[];
  };
  answers?: Record<GapId, string>;
  optimizedText?: string;
  state: 'idle'|'typing'|'analyzing'|'ready'|'asking'|'preview'|'accepted'|'dismissed';
};

type Gap = {
  id: string;
  type: 'goal'|'audience'|'format'|'length'|'tone'|'context'|'reference'
      |'constraints'|'success'|'persona'|'scope'|'conflict'|'vague'|'locale';
  impact: number;           // 0..1
  question: string;
  options: string[];
  defaultOption: string;
};

type HistoryItem = {
  id: string;
  timestamp: number;
  site: string;
  mode: string;
  original: string;
  optimized: string;
  answers: Record<string,string>;
  pinned: boolean;
  rating?: 'up'|'down';
};

type UserProfile = {
  defaults: Partial<Record<Gap['type'], string>>;
  skipCounts: Record<Gap['type'], number>;   // for adaptive suppression
  preferredMode: string;
  language: string;
};
```

---

## 14. Settings (kept small and clear)

**General**
- Enable/disable globally and per site
- Trigger: auto-on-pause / manual-only / pre-send-guard
- Pause delay (0.8 s – 3 s)
- Sensitivity (Quiet · Balanced · Proactive)

**Questions**
- Max questions (0-3)
- Always use defaults (no questions)
- Reset learned preferences

**Engine**
- Provider: Hosted / BYOK / Local
- Default mode
- Custom instructions ("always ask for sources", "I prefer British English")

**Appearance**
- Theme: auto / light / dark
- Compact vs comfortable
- Reduce motion

**Shortcuts** (remappable, conflict detection)

**Privacy**
- Local only, redaction on/off, clear history, export data

---

## 15. Edge Cases to Handle

| Case | Handling |
|------|----------|
| User edits text while analysis is in flight | Cancel stale request, discard result |
| User changes the prompt after preview opens | Preview marked "outdated", with a one-key re-run |
| Prompt in non-English language | Detect language, keep the rewrite in the same language |
| Very long prompts (> 2k words) | Skip questions, offer only structure cleanup |
| Pasted code / logs | Never rewrite the pasted block; only the instruction around it |
| Attachments present | Count them as context; don't ask "paste the file?" |
| Multi-turn follow-ups ("ok now make it shorter") | Treat as a refinement with thread context; usually silent |
| Voice dictation input | Wait for dictation end before analysis |
| Site redesign breaks selectors | Auto-disable, remote selector hotfix |
| Slash commands / site features (`/image`, `@file`) | Detect and stay out of the way |
| Undo/redo conflicts with site's own undo stack | Use `execCommand` so native history is preserved |
| Incognito | Off by default; opt-in |

---

## 16. Roadmap

### Phase 0: Spike (1 week)
- Prove text read/write on **one site** (Claude) via adapter.
- Heuristic score + chip in Shadow DOM.
- Hardcoded template rewrite.

### Phase 1: MVP (3-4 weeks)
- Claude + ChatGPT adapters.
- Pause-triggered chip, `Tab` flow, question tray (3 gap types: audience, format, length).
- LLM gateway (BYOK first) with the rewrite pipeline.
- Preview card with diff, Accept, Undo, local history.
- `⌥O` and `⌥⇧O`.

### Phase 2: Polish & Trust (3-4 weeks)
- Full gap taxonomy, impact ranking, adaptive suppression.
- Command palette, modes, history panel, templates with variables.
- Theme matching, accessibility audit, reduced motion.
- Privacy redaction, onboarding flow, settings.
- Gemini, Perplexity, Copilot adapters.

### Phase 3: Intelligence (4-6 weeks)
- Thread-aware context (summarize prior turns).
- Personal profile learning.
- Model-specific optimization styles.
- Local-model option (Chrome built-in AI / WebLLM).
- Prompt quality score + "why this is better" learning tips.

### Phase 4: Growth
- Hosted backend, freemium plan.
- Team shared templates.
- Prompt analytics (which optimizations get accepted and rated well).
- Firefox/Safari ports.
- Public API for community adapters and templates.

---

## 17. Success Metrics

| Metric | Target | Why |
|--------|--------|-----|
| **Acceptance rate** (Tab on preview) | > 40% | Core signal that output is useful |
| **Time-to-accept** (chip → apply) | < 8 s | Flow is fast enough |
| **Questions answered vs skipped** | > 60% answered | Questions are worth the effort |
| **Dismiss-without-engagement rate** | < 50% | Chip isn't noise |
| **Undo rate** | < 15% | Rewrites preserve intent |
| **Chip false-positive rate** | < 20% | Detector is calibrated |
| **7-day retention** | > 35% | Real habit formation |
| **Latency P95** (analysis) | < 1.2 s | Feels instant |
| **Crash / adapter-break rate** | < 1% sessions | Reliability |

### How to evaluate prompt quality objectively
- Build a **benchmark set** of ~200 vague prompts across intents.
- For each, compare model responses to the *original* vs *optimized* prompt, judged by blinded human raters and an LLM judge.
- Track the win rate. Ship only if optimized wins > 65% and never loses badly on intent preservation.

---

## 18. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Host site DOM changes break the extension | Remote selector config, health checks, adapter fixtures in CI |
| Users feel it's spying on prompts | Local-first, clear disclosure, minimal permissions, open adapters |
| Rewrites change user intent | Strict guardrails, diff view, one-key undo, intent-preservation tests |
| Annoying / too frequent | Quiet default sensitivity, adaptive suppression, easy global pause |
| LLM cost at scale | Heuristics gate Tier 2, caching, small model, BYOK |
| Sites add their own prompt improvers | Differentiate: cross-site, privacy, keyboard UX, personalization |
| Store review rejection | Minimal permissions, clear privacy policy, no remote code execution |
| Tab key conflicts | Capture only when UI visible; fully remappable |

---

## 19. Suggested Repo Structure

```
promptpilot/
├─ manifest.config.ts
├─ src/
│  ├─ content/
│  │  ├─ index.ts                 # bootstrap, adapter selection
│  │  ├─ adapters/
│  │  │  ├─ base.ts
│  │  │  ├─ claude.ts
│  │  │  ├─ chatgpt.ts
│  │  │  └─ gemini.ts
│  │  ├─ observer.ts              # debounced input watching
│  │  ├─ heuristics/              # Tier 1 detectors
│  │  ├─ keyboard.ts
│  │  └─ ui/
│  │     ├─ Chip.tsx
│  │     ├─ QuestionTray.tsx
│  │     ├─ PreviewCard.tsx
│  │     ├─ Toast.tsx
│  │     ├─ CommandPalette.tsx
│  │     └─ theme.ts
│  ├─ background/
│  │  ├─ index.ts
│  │  ├─ gateway/                 # byok.ts, hosted.ts, local.ts
│  │  ├─ engine/                  # pipeline, templates, validators
│  │  └─ storage.ts
│  ├─ pages/                      # popup, options, history
│  ├─ shared/                     # types, messages, constants
│  └─ prompts/                    # analyst + rewriter system prompts
├─ tests/
│  ├─ unit/
│  ├─ fixtures/                   # saved DOM snapshots per site
│  └─ e2e/
└─ docs/
```

---

## 20. Worked Example (end-to-end)

**User types:** `write a blog about ai`

1. Pause 1.2 s → heuristics: no audience, no format, no length, no tone → score 72.
2. Chip appears: `✦ 3 gaps · Tab to refine`.
3. `Tab` → LLM returns 3 ranked questions with defaults.
4. Q1 *"Who's it for?"* → press `1` (Beginners).
5. Q2 *"Length?"* → `Tab` (default: ~800 words).
6. Q3 *"Tone?"* → press `2` (Conversational).
7. Preview streams in (~900 ms):

> Write an ~800-word blog post explaining how AI is changing everyday life, aimed at complete beginners. Use a conversational, friendly tone, open with a relatable hook, include three concrete real-world examples, avoid jargon (define any technical term in one sentence), and end with a one-sentence takeaway.

8. `Tab` → input replaced, history saved, toast `Applied · ⌥Z to undo`.
9. User hits Enter on the site to send.

**Total user effort:** 1 pause + 4 keypresses. About 6 seconds.

---

## 21. What Makes This Feel Genuinely Useful (not gimmicky)

1. **It shuts up when you're right.** Silence on good prompts builds trust.
2. **Questions are keystrokes, not forms.**
3. **You see exactly what changed and why**, so you get better at prompting over time.
4. **It learns you.** Fewer questions every week.
5. **It never touches your text or your data without a key press.**
6. **It looks like part of the chat app,** not a bolted-on widget.
7. **It is fast.** Heuristics are instant; the LLM only runs when it can add value.

---

## 22. Immediate Next Steps

1. Pick the first site (recommend **Claude**, then **ChatGPT**) and build the adapter spike: read, write, and anchor a chip to the input.
2. Implement the Tier 1 heuristic scorer and test it on 100 real prompts to calibrate the threshold.
3. Write the analyst and rewriter system prompts and evaluate them in a notebook before building UI.
4. Prototype the chip → tray → preview flow in Shadow DOM with fake data to tune feel and timing.
5. Wire the LLM gateway (BYOK) and run the first end-to-end loop.
6. Dogfood daily for a week, measure acceptance and undo rates, then tune.