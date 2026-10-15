import React, { useEffect, useState } from 'react';
import { Sparkles, Settings, Key, ExternalLink, Sliders, Server, Cloud, Cpu } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { ExtensionSettings, LLMProvider, PromptMode } from '../../shared/types';

export const Popup: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      if (res?.success && res.data) {
        setSettings(res.data);
      }
      setLoading(false);
    });
  }, []);

  const updateSetting = <K extends keyof ExtensionSettings>(
    key: K,
    val: ExtensionSettings[K]
  ) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: { [key]: val } });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-neutral-400">
        Loading PromptPilot…
      </div>
    );
  }

  const hasApiKey = !!settings.fireworksApiKey?.trim();
  const modes: PromptMode[] = ['concise', 'detailed', 'code', 'creative', 'research'];

  const getProviderLabel = (p: LLMProvider) => {
    switch (p) {
      case 'ollama':
        return { name: 'Ollama (Local)', model: settings.ollamaModel, icon: Server };
      case 'local_openai':
        return { name: 'LM Studio / llama.cpp', model: settings.localOpenAiModel, icon: Cpu };
      case 'fireworks':
      default:
        return {
          name: 'Fireworks AI',
          model: settings.model.split('/').pop() || 'deepseek-v4p1-flash',
          icon: Cloud,
        };
    }
  };

  const activeProviderInfo = getProviderLabel(settings.provider);
  const ProviderIcon = activeProviderInfo.icon;

  return (
    <div className="p-4 bg-neutral-900 text-neutral-100 flex flex-col gap-3 font-sans w-80">
      {/* Brand Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white leading-none">
              PromptPilot
            </h1>
            <span className="text-[10px] text-neutral-400">AI Prompt Copilot</span>
          </div>
        </div>

        <button
          onClick={openOptions}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Open Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Provider Quick Switcher */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-neutral-400">Active LLM Runtime</label>
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { id: 'fireworks', label: 'Fireworks', icon: Cloud },
              { id: 'ollama', label: 'Ollama', icon: Server },
              { id: 'local_openai', label: 'LM Studio', icon: Cpu },
            ] as const
          ).map((prov) => {
            const Icon = prov.icon;
            const isSelected = settings.provider === prov.id;
            return (
              <button
                key={prov.id}
                type="button"
                onClick={() => updateSetting('provider', prov.id)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-medium border flex items-center justify-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-brand-600/30 border-brand-500 text-white'
                    : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="w-3 h-3 text-brand-400" />
                <span>{prov.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Provider Status Banner */}
      {settings.provider === 'fireworks' && !hasApiKey ? (
        <div
          onClick={openOptions}
          className="cursor-pointer p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between hover:bg-amber-500/20 transition-all"
        >
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium text-[11px]">API Key Required</span>
          </div>
          <ExternalLink className="w-3 h-3" />
        </div>
      ) : (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
          <span className="flex items-center gap-1.5">
            <ProviderIcon className="w-3.5 h-3.5" />
            <span className="font-medium">{activeProviderInfo.name}</span>
          </span>
          <span className="font-mono text-[10px] text-neutral-300 max-w-[110px] truncate" title={activeProviderInfo.model}>
            {activeProviderInfo.model}
          </span>
        </div>
      )}

      {/* Prompt Mode Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
          <span>Prompt Mode</span>
          <span className="capitalize text-brand-400 font-semibold">{settings.defaultMode}</span>
        </label>
        <div className="grid grid-cols-3 gap-1">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => updateSetting('defaultMode', m)}
              className={`py-1 px-1.5 rounded-md text-[11px] font-medium capitalize border transition-all text-center ${
                settings.defaultMode === m
                  ? 'bg-brand-600/30 border-brand-500 text-brand-200'
                  : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Active Sites */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label className="text-[11px] font-medium text-neutral-400">Supported AI Chats</label>
        <div className="flex items-center justify-between gap-1 text-xs">
          {(['claude', 'chatgpt', 'gemini'] as const).map((site) => (
            <label
              key={site}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md border cursor-pointer capitalize text-[11px] font-medium transition-all ${
                settings.enabledSites[site]
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-500 line-through'
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={settings.enabledSites[site]}
                onChange={(e) => {
                  const updated = {
                    ...settings.enabledSites,
                    [site]: e.target.checked,
                  };
                  updateSetting('enabledSites', updated);
                }}
              />
              <span>{site}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Shortcuts Footer */}
      <div className="pt-2 border-t border-neutral-800 text-[10px] text-neutral-400 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span>Refine prompt</span>
          <kbd className="px-1 rounded bg-neutral-800 border border-neutral-700 font-mono text-neutral-300">
            Tab
          </kbd>
        </div>
        <div className="flex items-center justify-between">
          <span>Force analyze</span>
          <kbd className="px-1 rounded bg-neutral-800 border border-neutral-700 font-mono text-neutral-300">
            ⌥O
          </kbd>
        </div>
        <div className="flex items-center justify-between">
          <span>Revert original</span>
          <kbd className="px-1 rounded bg-neutral-800 border border-neutral-700 font-mono text-neutral-300">
            ⌥Z
          </kbd>
        </div>
      </div>

      {/* Options Link */}
      <button
        onClick={openOptions}
        className="w-full mt-1 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 text-xs font-medium text-neutral-300 flex items-center justify-center gap-1.5 transition-colors"
      >
        <Sliders className="w-3.5 h-3.5 text-neutral-400" />
        <span>Full Settings & History</span>
      </button>
    </div>
  );
};
