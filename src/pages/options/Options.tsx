import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Sliders,
  History,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Server,
  Cloud,
  Cpu,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  DEFAULT_SETTINGS,
  POPULAR_FIREWORKS_MODELS,
  POPULAR_OLLAMA_MODELS,
} from '../../shared/constants';
import { ExtensionSettings, HistoryItem, LLMProvider } from '../../shared/types';

export const Options: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    message?: string;
    error?: boolean;
    models?: string[];
  } | null>(null);
  const [scannedOllamaModels, setScannedOllamaModels] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      if (res?.success && res.data) {
        setSettings(res.data);
      }
    });

    chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (res) => {
      if (res?.success && res.data) {
        setHistory(res.data);
      }
    });
  }, []);

  const handleSave = (newSettings?: ExtensionSettings) => {
    const toSave = newSettings || settings;
    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: toSave }, (res) => {
      if (res?.success) {
        setSaveStatus('Settings saved successfully!');
        setTimeout(() => setSaveStatus(null), 2500);
      }
    });
  };

  const handleProviderChange = (provider: LLMProvider) => {
    const updated = { ...settings, provider };
    setSettings(updated);
    setTestStatus(null);
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });

    chrome.runtime.sendMessage(
      {
        type: 'TEST_PROVIDER_CONNECTION',
        payload: {
          provider: settings.provider,
          apiKey: settings.fireworksApiKey,
          model:
            settings.provider === 'ollama'
              ? settings.ollamaModel
              : settings.provider === 'local_openai'
              ? settings.localOpenAiModel
              : settings.model,
          endpoint:
            settings.provider === 'ollama'
              ? settings.ollamaEndpoint
              : settings.localOpenAiEndpoint,
        },
      },
      (res) => {
        if (res?.success && res.data) {
          const { latency, models } = res.data;
          setTestStatus({
            loading: false,
            error: false,
            message: `Connected successfully! (${latency}ms latency)`,
            models,
          });
          if (models && models.length > 0) {
            setScannedOllamaModels(models);
          }
        } else {
          setTestStatus({
            loading: false,
            error: true,
            message: res?.error || 'Connection failed.',
          });
        }
      }
    );
  };

  const handleScanOllamaModels = () => {
    setIsScanning(true);
    chrome.runtime.sendMessage(
      {
        type: 'TEST_PROVIDER_CONNECTION',
        payload: {
          provider: 'ollama',
          endpoint: settings.ollamaEndpoint,
          model: settings.ollamaModel,
        },
      },
      (res) => {
        setIsScanning(false);
        if (res?.success && res.data?.models?.length > 0) {
          setScannedOllamaModels(res.data.models);
          // If current model not in list, auto-select first found model
          if (!res.data.models.includes(settings.ollamaModel)) {
            setSettings({ ...settings, ollamaModel: res.data.models[0] });
          }
        } else {
          alert('Could not discover Ollama models. Ensure Ollama is running at ' + settings.ollamaEndpoint);
        }
      }
    );
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your prompt history?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, () => {
        setHistory([]);
      });
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              PromptPilot Settings
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 font-normal capitalize">
                {settings.provider === 'ollama'
                  ? 'Local Ollama'
                  : settings.provider === 'local_openai'
                  ? 'Local LM Studio / llama.cpp'
                  : 'Fireworks AI'}
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Non-invasive prompt copilot for Claude, ChatGPT, and Gemini
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'settings'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configuration</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({history.length})</span>
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveStatus}</span>
        </div>
      )}

      {activeTab === 'settings' ? (
        <div className="mt-8 flex flex-col gap-8">
          {/* Section 1: LLM Provider Selection */}
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-white">LLM Runtime & Provider</h2>
              </div>
              <span className="text-[11px] text-neutral-400">Choose Cloud or Local Runtime</span>
            </div>

            {/* Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Fireworks Card */}
              <button
                type="button"
                onClick={() => handleProviderChange('fireworks')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  settings.provider === 'fireworks'
                    ? 'bg-brand-950/40 border-brand-500 ring-1 ring-brand-500/50 text-white'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Cloud className="w-4 h-4 text-brand-400" />
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300">
                      Cloud Fast
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-white mt-2">Fireworks AI</div>
                  <div className="text-[11px] text-neutral-400 mt-1 leading-snug">
                    DeepSeek 4.1 Flash via ultra-low latency API.
                  </div>
                </div>
              </button>

              {/* Ollama Card */}
              <button
                type="button"
                onClick={() => handleProviderChange('ollama')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  settings.provider === 'ollama'
                    ? 'bg-brand-950/40 border-brand-500 ring-1 ring-brand-500/50 text-white'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      100% Private
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-white mt-2">Ollama (Local)</div>
                  <div className="text-[11px] text-neutral-400 mt-1 leading-snug">
                    Connects directly to your local Ollama server (localhost:11434).
                  </div>
                </div>
              </button>

              {/* LM Studio / llama.cpp Card */}
              <button
                type="button"
                onClick={() => handleProviderChange('local_openai')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  settings.provider === 'local_openai'
                    ? 'bg-brand-950/40 border-brand-500 ring-1 ring-brand-500/50 text-white'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      OpenAI Local
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-white mt-2">LM Studio / llama.cpp</div>
                  <div className="text-[11px] text-neutral-400 mt-1 leading-snug">
                    Compatible with any local OpenAI endpoint (localhost:1234 or 8080).
                  </div>
                </div>
              </button>
            </div>

            {/* Provider Configuration Forms */}
            <div className="pt-3 border-t border-neutral-800">
              {/* Option A: Fireworks AI */}
              {settings.provider === 'fireworks' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-neutral-300">
                      Fireworks API Key
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={settings.fireworksApiKey}
                          onChange={(e) =>
                            setSettings({ ...settings, fireworksApiKey: e.target.value })
                          }
                          placeholder="fw_3Z..."
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs font-mono outline-none focus:border-brand-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300"
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testStatus?.loading}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-xs font-medium text-neutral-200 transition-colors disabled:opacity-50"
                      >
                        {testStatus?.loading ? 'Testing…' : 'Test Connection'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-neutral-300">
                      Model Endpoint
                    </label>
                    <select
                      value={settings.model}
                      onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-brand-500 cursor-pointer"
                    >
                      {POPULAR_FIREWORKS_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Option B: Ollama (Local) */}
              {settings.provider === 'ollama' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-neutral-300">
                      Ollama Server Endpoint
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={settings.ollamaEndpoint}
                        onChange={(e) =>
                          setSettings({ ...settings, ollamaEndpoint: e.target.value })
                        }
                        placeholder="http://localhost:11434"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs font-mono outline-none focus:border-brand-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testStatus?.loading}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-xs font-medium text-neutral-200 transition-colors disabled:opacity-50"
                      >
                        {testStatus?.loading ? 'Testing…' : 'Test Ollama'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-neutral-300">
                        Ollama Model Name
                      </label>
                      <button
                        type="button"
                        onClick={handleScanOllamaModels}
                        disabled={isScanning}
                        className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                        <span>Scan Installed Local Models</span>
                      </button>
                    </div>

                    {scannedOllamaModels.length > 0 ? (
                      <select
                        value={settings.ollamaModel}
                        onChange={(e) =>
                          setSettings({ ...settings, ollamaModel: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-brand-500 cursor-pointer"
                      >
                        {scannedOllamaModels.map((m) => (
                          <option key={m} value={m}>
                            {m} (Installed Locally)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={settings.ollamaModel}
                          onChange={(e) =>
                            setSettings({ ...settings, ollamaModel: e.target.value })
                          }
                          className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs outline-none focus:border-brand-500 cursor-pointer"
                        >
                          {POPULAR_OLLAMA_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={settings.ollamaModel}
                          onChange={(e) =>
                            setSettings({ ...settings, ollamaModel: e.target.value })
                          }
                          placeholder="or custom tag (e.g. qwen2.5:0.5b)"
                          className="w-48 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs font-mono outline-none focus:border-brand-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Ollama CORS Info */}
                  <div className="p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80 text-[11px] text-neutral-400 flex items-start gap-2">
                    <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>
                        <strong>Note on CORS:</strong> If Ollama refuses connections from the extension, launch Ollama with cross-origin allowed:
                      </span>
                      <pre className="mt-1 p-1.5 rounded bg-neutral-900 text-neutral-300 font-mono text-[10px]">
                        OLLAMA_ORIGINS="*" ollama serve
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Option C: LM Studio / llama.cpp */}
              {settings.provider === 'local_openai' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-neutral-300">
                      Local Server Endpoint
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={settings.localOpenAiEndpoint}
                        onChange={(e) =>
                          setSettings({ ...settings, localOpenAiEndpoint: e.target.value })
                        }
                        placeholder="http://localhost:1234/v1"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs font-mono outline-none focus:border-brand-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testStatus?.loading}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-xs font-medium text-neutral-200 transition-colors disabled:opacity-50"
                      >
                        {testStatus?.loading ? 'Testing…' : 'Test Endpoint'}
                      </button>
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      Common: <code>http://localhost:1234/v1</code> (LM Studio) or <code>http://localhost:8080/v1</code> (llama.cpp)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-neutral-300">
                        Model ID
                      </label>
                      <input
                        type="text"
                        value={settings.localOpenAiModel}
                        onChange={(e) =>
                          setSettings({ ...settings, localOpenAiModel: e.target.value })
                        }
                        placeholder="local-model"
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs font-mono outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-neutral-300">
                        API Key (Optional)
                      </label>
                      <input
                        type="password"
                        value={settings.localOpenAiApiKey || ''}
                        onChange={(e) =>
                          setSettings({ ...settings, localOpenAiApiKey: e.target.value })
                        }
                        placeholder="not-needed"
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs font-mono outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Status Banner */}
              {testStatus && (
                <div
                  className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    testStatus.error
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {testStatus.error ? (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{testStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Behavior & Sensitivity */}
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
              <Sliders className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-white">Detection & Trigger Behavior</h2>
            </div>

            {/* Sensitivity */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-300">
                Ambiguity Sensitivity
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { id: 'quiet', title: 'Quiet', desc: 'Shows only when very vague (≥50)' },
                    { id: 'balanced', title: 'Balanced (Recommended)', desc: 'Standard gaps (≥35)' },
                    { id: 'proactive', title: 'Proactive', desc: 'Spots minor gaps early (≥20)' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSettings({ ...settings, sensitivity: s.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      settings.sensitivity === s.id
                        ? 'bg-brand-950/40 border-brand-500 text-white'
                        : 'bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="font-semibold text-xs text-brand-300">{s.title}</div>
                    <div className="text-[11px] text-neutral-500 mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pause delay */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300">
                  Pause Detection Delay
                </label>
                <span className="text-xs font-mono text-brand-400">
                  {settings.pauseDelayMs} ms
                </span>
              </div>
              <input
                type="range"
                min="800"
                max="2500"
                step="100"
                value={settings.pauseDelayMs}
                onChange={(e) =>
                  setSettings({ ...settings, pauseDelayMs: parseInt(e.target.value, 10) })
                }
                className="w-full accent-brand-500 cursor-pointer"
              />
              <span className="text-[11px] text-neutral-500">
                How long you pause typing before local heuristics evaluate your prompt.
              </span>
            </div>

            {/* Always use defaults toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/50 border border-neutral-800">
              <div>
                <div className="text-xs font-medium text-neutral-200">
                  Fast Mode (Bypass Questions)
                </div>
                <div className="text-[11px] text-neutral-500">
                  Directly optimize prompt using smart defaults without showing the question tray.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.alwaysUseDefaults}
                onChange={(e) =>
                  setSettings({ ...settings, alwaysUseDefaults: e.target.checked })
                }
                className="w-4 h-4 accent-brand-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Section 3: Custom System Instructions */}
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-3">
            <label className="text-xs font-semibold text-white">
              Custom Prompt Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={settings.customInstructions || ''}
              onChange={(e) =>
                setSettings({ ...settings, customInstructions: e.target.value })
              }
              placeholder="e.g. Always format code using TypeScript types. Avoid verbose introductions."
              className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 outline-none focus:border-brand-500"
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => handleSave()}
              className="px-6 py-2.5 rounded-xl font-medium text-xs bg-brand-600 hover:bg-brand-500 text-white shadow-lg transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      ) : (
        /* History Explorer Tab */
        <div className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-400">
              Showing locally saved prompt rewrites you accepted.
            </p>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-rose-900/50 text-neutral-400 hover:text-rose-400 text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All History</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500 border border-neutral-800/60 rounded-2xl">
              No prompt rewrites accepted yet. Start chatting in Claude, ChatGPT, or Gemini!
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pb-2 border-b border-neutral-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase tracking-wider text-brand-400">
                        {item.site}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{item.mode} mode</span>
                      <span>·</span>
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.id, item.optimized)}
                      className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === item.id ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-850">
                      <div className="text-[10px] uppercase font-mono text-neutral-500 pb-1">
                        Original
                      </div>
                      <p className="text-neutral-400 whitespace-pre-wrap">{item.original}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-brand-950/20 border border-brand-900/30">
                      <div className="text-[10px] uppercase font-mono text-brand-400 pb-1">
                        Optimized
                      </div>
                      <p className="text-neutral-200 whitespace-pre-wrap">{item.optimized}</p>
                    </div>
                  </div>

                  {item.addedTags && item.addedTags.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="text-[10px] text-neutral-500">Added:</span>
                      {item.addedTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
