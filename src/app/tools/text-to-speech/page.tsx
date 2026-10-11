"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

interface VoiceOption {
  voice: SpeechSynthesisVoice;
  label: string;
  lang: string;
}

const MAX_CHARS = 5000;

export default function TextToSpeechPage() {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supported, setSupported] = useState(true);
  const [highlightedWord, setHighlightedWord] = useState<{ start: number; end: number } | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const loadVoices = useCallback(() => {
    const allVoices = window.speechSynthesis.getVoices();
    const filtered = allVoices
      .filter((v) => v.lang.startsWith("tr") || v.lang.startsWith("en"))
      .map((v) => ({
        voice: v,
        label: `${v.name} (${v.lang})`,
        lang: v.lang,
      }));

    // If no Turkish/English voices, show all
    const list = filtered.length > 0 ? filtered : allVoices.map((v) => ({
      voice: v,
      label: `${v.name} (${v.lang})`,
      lang: v.lang,
    }));

    setVoices(list);
    if (list.length > 0 && !selectedVoice) {
      // Prefer Turkish first
      const tr = list.find((v) => v.lang.startsWith("tr"));
      setSelectedVoice((tr ?? list[0]).voice.name);
    }
  }, [selectedVoice]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [loadVoices]);

  const handlePlay = useCallback(() => {
    if (!text.trim()) { toast.error(t("tts.ui.enterText")); return; }

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    const voiceObj = voices.find((v) => v.voice.name === selectedVoice)?.voice;
    if (voiceObj) utter.voice = voiceObj;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;

    utter.onstart = () => { setPlaying(true); setPaused(false); };
    utter.onend = () => { setPlaying(false); setPaused(false); setHighlightedWord(null); };
    utter.onerror = () => { setPlaying(false); setPaused(false); toast.error(t("tts.ui.synthFailed")); };
    utter.onboundary = (e) => {
      if (e.name === "word") {
        setHighlightedWord({ start: e.charIndex, end: e.charIndex + (e.charLength ?? 0) });
      }
    };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [text, voices, selectedVoice, rate, pitch, volume, t]);

  const handlePause = useCallback(() => {
    window.speechSynthesis.pause();
    setPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    window.speechSynthesis.resume();
    setPaused(false);
  }, []);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    setHighlightedWord(null);
  }, []);

  const trVoices = voices.filter((v) => v.lang.startsWith("tr"));
  const enVoices = voices.filter((v) => v.lang.startsWith("en"));
  const otherVoices = voices.filter((v) => !v.lang.startsWith("tr") && !v.lang.startsWith("en"));

  // Render text with word highlight
  const renderHighlightedText = () => {
    if (!highlightedWord) return text;
    return (
      <>
        {text.slice(0, highlightedWord.start)}
        <mark className="bg-accent/30 text-t-primary rounded">{text.slice(highlightedWord.start, highlightedWord.end)}</mark>
        {text.slice(highlightedWord.end)}
      </>
    );
  };

  return (
    <ToolLayout
      toolName="Text to Speech"
      toolDescription="Convert text to spoken audio using your browser's built-in speech synthesis. Supports Turkish, English and more."
    >
      <div className="space-y-5">
        {!supported ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-t-secondary text-sm">
              ⚠️ {t("tts.ui.unsupported")}
            </p>
          </div>
        ) : (
          <>
            {/* Text Input */}
            <div className="glass rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-t-primary">{t("tts.ui.text")}</label>
                <span className={`text-xs ${text.length > MAX_CHARS * 0.9 ? "text-red-700 dark:text-red-400" : "text-t-tertiary"}`}>
                  {text.length}/{MAX_CHARS}
                </span>
              </div>
              {playing && highlightedWord ? (
                <div className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm leading-relaxed whitespace-pre-wrap">
                  {renderHighlightedText()}
                </div>
              ) : (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                  placeholder={t("tts.ui.placeholder")}
                  className="w-full h-32 px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm resize-y focus:outline-none focus:border-accent/50"
                />
              )}
            </div>

            {/* Voice Selector */}
            <div className="glass rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-t-primary">{t("tts.ui.voiceSettings")}</h3>

              <div>
                <label className="text-xs text-t-secondary mb-1.5 block">{t("tts.ui.voice")}</label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm focus:outline-none focus:border-accent/50"
                >
                  {trVoices.length > 0 && (
                    <optgroup label={`🇹🇷 ${t("tts.ui.turkish")}`}>
                      {trVoices.map((v) => <option key={v.voice.name} value={v.voice.name}>{v.label}</option>)}
                    </optgroup>
                  )}
                  {enVoices.length > 0 && (
                    <optgroup label={`🇺🇸 ${t("tts.ui.english")}`}>
                      {enVoices.map((v) => <option key={v.voice.name} value={v.voice.name}>{v.label}</option>)}
                    </optgroup>
                  )}
                  {otherVoices.length > 0 && (
                    <optgroup label={t("tts.ui.other")}>
                      {otherVoices.map((v) => <option key={v.voice.name} value={v.voice.name}>{v.label}</option>)}
                    </optgroup>
                  )}
                  {voices.length === 0 && <option value="">{t("tts.ui.loadingVoices")}</option>}
                </select>
              </div>

              {/* Sliders */}
              {[
                { key: "speed", label: t("tts.ui.speed"), value: rate, min: 0.5, max: 2, step: 0.1, format: (v: number) => `${v.toFixed(1)}×`, setter: setRate },
                { key: "pitch", label: t("tts.ui.pitch"), value: pitch, min: 0.5, max: 2, step: 0.1, format: (v: number) => v.toFixed(1), setter: setPitch },
                { key: "volume", label: t("tts.ui.volume"), value: volume, min: 0, max: 1, step: 0.05, format: (v: number) => `${Math.round(v * 100)}%`, setter: setVolume },
              ].map(({ key, label, value, min, max, step, format, setter }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-t-secondary">{label}</label>
                    <span className="text-xs font-semibold text-t-primary">{format(value)}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={(e) => setter(parseFloat(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3">
              {!playing && (
                <button
                  onClick={handlePlay}
                  disabled={!text.trim() || voices.length === 0}
                  className="px-6 py-3 rounded-xl font-semibold text-on-accent bg-accent hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ▶ {t("tts.ui.speak")}
                </button>
              )}
              {playing && !paused && (
                <button onClick={handlePause} className="px-6 py-3 rounded-xl font-semibold text-t-primary bg-bg-tertiary hover:bg-border transition-all">
                  ⏸ {t("ar.pause")}
                </button>
              )}
              {playing && paused && (
                <button onClick={handleResume} className="px-6 py-3 rounded-xl font-semibold text-on-accent bg-accent hover:opacity-90 transition-all">
                  ▶ {t("ar.resume")}
                </button>
              )}
              {playing && (
                <button onClick={handleStop} className="px-6 py-3 rounded-xl font-semibold text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors">
                  ⏹ {t("ar.stop")}
                </button>
              )}
              {text && (
                <button
                  onClick={() => { navigator.clipboard.writeText(text); toast.success(t("tts.ui.textCopied")); }}
                  className="px-4 py-3 rounded-xl font-semibold text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
                >
                  📋 {t("ui.copy")}
                </button>
              )}
            </div>

            {/* Tip */}
            <div className="flex gap-3 p-4 rounded-xl bg-accent/5 border border-accent/10">
              <span className="text-lg shrink-0">💡</span>
              <p className="text-xs text-t-secondary leading-relaxed">
                {t("tts.ui.tip")}
              </p>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
