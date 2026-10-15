# PromptPilot ✦ AI Prompt Copilot

PromptPilot is a non-invasive Chrome browser extension (Manifest V3) that lives inside **Claude**, **ChatGPT**, and **Gemini**. Powered by **Fireworks AI (DeepSeek 4.1 Flash)**, it spots ambiguous gaps in your prompt as you pause typing, asks up to 3 quick multiple-choice questions, and rewrites your prompt following rigorous prompt-engineering principles.

---

## ⚡ Core Philosophy

1. **Never block typing** — Zero latency on the host input. No unexpected modals on keystroke.
2. **Silent unless useful** — If your prompt is already clear, PromptPilot shows nothing.
3. **Keyboard first** — The entire flow is controlled via `Tab`, numbers `1-4`, `Esc`, and hotkeys.
4. **User owns the text** — Nothing is changed or saved until you press `Tab` to accept.
5. **Isolated Shadow DOM** — Theme-adaptive styling that matches host site colors without CSS conflicts.

---

## 🚀 Quick Setup & Installation

### 1. Build the Extension
```bash
npm install
npm run build
```
This generates the ready-to-load extension in the `dist/` folder.

### 2. Load into Chrome / Brave / Edge
1. Open your browser and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `dist/` directory inside this project folder (`/home/jeeva/projects/NLP_2/dist`).

### 3. Choose your LLM Runtime (Cloud or Local)
Click the PromptPilot icon in the Chrome toolbar and open **Settings**:
- ⚡ **Fireworks AI (Cloud)**: Paste your Fireworks API key. By default, it targets `accounts/fireworks/models/deepseek-v4p1-flash` (or `deepseek-v3` / `deepseek-r1`).
- 🦙 **Ollama (100% Local & Private)**: Runs offline on `http://localhost:11434`. Click "Scan Installed Local Models" to select from models installed on your machine (e.g. `llama3.2`, `deepseek-r1:7b`, `qwen2.5`).
- 🖥️ **LM Studio / llama.cpp (Local OpenAI)**: Connects to local server endpoints like `http://localhost:1234/v1` or `http://localhost:8080/v1`.

> **Tip for Ollama CORS**: Launch Ollama with `OLLAMA_ORIGINS="*" ollama serve` to ensure seamless local browser requests.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Context | Action |
|----------|---------|--------|
| `Tab` | Chip visible | Open question tray |
| `1-4` | Question tray | Select option & advance to next question |
| `Tab` | Question tray | Accept default option & advance |
| `Tab` | Preview card | **Accept & apply** rewritten prompt |
| `Esc` | Any surface | Dismiss PromptPilot & keep original |
| `⌥O` / `Alt+O` | Chat input | Force analyze now |
| `⌥⇧O` / `Alt+Shift+O` | Chat input | One-shot optimize (uses smart defaults) |
| `⌥Z` / `Alt+Z` | After apply | Undo and restore original draft |

---

## 🛠️ Project Structure

```
├── dist/                     # Compiled extension ready for "Load unpacked"
├── public/
│   ├── manifest.json         # Manifest V3 specification
│   └── icons/                # Extension icons (16px, 48px, 128px)
├── src/
│   ├── background/
│   │   ├── fireworks.ts      # Fireworks API client (OpenAI-compatible + streaming)
│   │   ├── prompts.ts        # PROMPT_RULES.md prompt engineering engine
│   │   ├── storage.ts        # chrome.storage.local persistence helpers
│   │   └── index.ts          # Service worker listening for messages/streaming
│   ├── content/
│   │   ├── adapters/         # Site adapters for Claude, ChatGPT, Gemini
│   │   ├── heuristics/       # Tier 1 local analyzer (<5ms offline checks)
│   │   ├── keyboard.ts       # Global & contextual keyboard manager
│   │   ├── observer.ts       # Debounced pause detector
│   │   └── ui/               # Shadow DOM Preact/React components (Chip, Tray, Preview, Toast)
│   ├── pages/
│   │   ├── popup/            # Extension toolbar popup
│   │   └── options/          # Full settings & history explorer
│   └── shared/               # TypeScript interfaces and constants
└── tests/                    # Unit tests for heuristics and prompt builder
```

---

## 🧪 Testing & Verification

Run the test suite:
```bash
npm test
```

Type check:
```bash
npm run typecheck
```
