"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import toast from "react-hot-toast";
import { AlertCircle, Copy, Info, Pause, Play, RotateCcw, SkipBack, SkipForward, Square } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Slider, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";

const MAX_CHARS = 20000;
/** Chrome stops utterances after ~15 s, so long sentences are split further. */
const MAX_CHUNK = 220;
const DEFAULTS = { rate: 1, pitch: 1, volume: 1 };

type Status = "idle" | "speaking" | "paused";

interface Chunk {
  start: number;
  end: number;
}

function normLang(lang: string): string {
  return (lang || "").replace(/_/g, "-");
}

/** Sentence chunks (absolute indices into `text`), split by Intl.Segmenter when available. */
function splitText(text: string, lang: string): Chunk[] {
  const sentences: Chunk[] = [];
  type SegmenterCtor = new (l: string, o: { granularity: "sentence" }) => {
    segment: (s: string) => Iterable<{ segment: string; index: number }>;
  };
  const Segmenter = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  if (Segmenter) {
    let seg: InstanceType<SegmenterCtor>;
    try {
      seg = new Segmenter(lang || "en", { granularity: "sentence" });
    } catch {
      seg = new Segmenter("en", { granularity: "sentence" });
    }
    for (const s of Array.from(seg.segment(text))) sentences.push({ start: s.index, end: s.index + s.segment.length });
  } else {
    const re = /[^.!?…。！？\n]+[.!?…。！？]*["'”’)]*\s*|\n+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) sentences.push({ start: m.index, end: m.index + m[0].length });
  }
  const out: Chunk[] = [];
  for (const s of sentences) {
    let start = s.start;
    const end = s.end;
    // also split on blank lines/newlines inside a "sentence"
    while (start < end) {
      while (start < end && /\s/.test(text[start])) start++;
      if (start >= end) break;
      let stop = end;
      const nl = text.indexOf("\n", start);
      if (nl >= 0 && nl < stop) stop = nl;
      if (stop - start > MAX_CHUNK) {
        const window = text.slice(start, start + MAX_CHUNK);
        const punct = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "), window.lastIndexOf(" – "), window.lastIndexOf(" — "));
        const space = window.lastIndexOf(" ");
        const cut = punct > MAX_CHUNK * 0.4 ? punct + 1 : space > MAX_CHUNK * 0.4 ? space : MAX_CHUNK;
        stop = start + cut;
      }
      let trimmedEnd = stop;
      while (trimmedEnd > start && /\s/.test(text[trimmedEnd - 1])) trimmedEnd--;
      if (trimmedEnd > start && /\S/.test(text.slice(start, trimmedEnd))) out.push({ start, end: trimmedEnd });
      start = stop;
    }
  }
  return out;
}

const WORD_RE = new RegExp("^[\\p{L}\\p{N}\\p{M}'’-]+", "u");

function wordEnd(text: string, from: number): number {
  const m = WORD_RE.exec(text.slice(from, from + 64));
  return from + (m ? m[0].length : 1);
}

function formatDuration(seconds: number): string {
  const s = Math.max(1, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function TextToSpeechPage() {
  const { t, locale } = useI18n();
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(DEFAULTS.rate);
  const [pitch, setPitch] = useState(DEFAULTS.pitch);
  const [volume, setVolume] = useState(DEFAULTS.volume);
  const [status, setStatus] = useState<Status>("idle");
  const [supported, setSupported] = useState(true);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [active, setActive] = useState<{ chunk: number; word: [number, number] | null } | null>(null);

  const sessionRef = useRef(0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null); // keeps Chrome from GC'ing it mid-speech
  const posRef = useRef({ chunk: 0, char: 0 });
  const statusRef = useRef<Status>("idle");
  const activeChunkRef = useRef<HTMLSpanElement | null>(null);
  const settingsRef = useRef({ rate, pitch, volume, voice: null as SpeechSynthesisVoice | null });

  const [voicesTimedOut, setVoicesTimedOut] = useState(false);
  const voice = useMemo(() => voices.find((v) => v.voiceURI === voiceURI) ?? null, [voices, voiceURI]);
  settingsRef.current = { rate, pitch, volume, voice };
  statusRef.current = status;

  // ---- Voices: all of them, grouped by language; default to the UI language.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const synth = window.speechSynthesis;
    const session = sessionRef;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener?.("voiceschanged", load);
    // Some browsers (and Linux without speech-dispatcher) never report voices.
    const giveUp = window.setTimeout(() => setVoicesTimedOut(true), 3000);
    return () => {
      window.clearTimeout(giveUp);
      synth.removeEventListener?.("voiceschanged", load);
      session.current++;
      synth.cancel();
    };
  }, []);

  useEffect(() => {
    if (!voices.length) return;
    if (voiceURI && voices.some((v) => v.voiceURI === voiceURI)) return;
    const ui = locale.toLowerCase();
    const inUi = voices.filter((v) => normLang(v.lang).toLowerCase().split("-")[0] === ui);
    const pick =
      inUi.find((v) => v.default) ?? inUi.find((v) => v.localService) ?? inUi[0] ?? voices.find((v) => v.default) ?? voices[0];
    setVoiceURI(pick.voiceURI);
  }, [voices, voiceURI, locale]);

  const groups = useMemo(() => {
    let names: { of: (code: string) => string | undefined } | null = null;
    try {
      names = new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      names = null;
    }
    const map = new Map<string, { label: string; voices: SpeechSynthesisVoice[] }>();
    for (const v of voices) {
      const tag = normLang(v.lang) || "und";
      let label = tag;
      try {
        label = names?.of(tag) ?? tag;
      } catch {
        label = tag;
      }
      const g = map.get(tag) ?? { label, voices: [] };
      g.voices.push(v);
      map.set(tag, g);
    }
    const ui = locale.toLowerCase();
    return Array.from(map.entries())
      .sort(([a, ga], [b, gb]) => {
        const pa = a.toLowerCase().startsWith(ui) ? 0 : 1;
        const pb = b.toLowerCase().startsWith(ui) ? 0 : 1;
        return pa - pb || ga.label.localeCompare(gb.label, locale);
      })
      .map(([tag, g]) => ({ tag, ...g }));
  }, [voices, locale]);

  // ---- Speaking: one sentence at a time.
  const stop = useCallback(() => {
    sessionRef.current++;
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setStatus("idle");
    setActive(null);
  }, []);

  const speakFrom = useCallback(
    (list: Chunk[], source: string, chunkIndex: number, fromChar?: number) => {
      const synth = window.speechSynthesis;
      const session = ++sessionRef.current;
      synth.cancel();
      const say = (i: number, from?: number) => {
        if (session !== sessionRef.current) return;
        if (i >= list.length) {
          utterRef.current = null;
          setStatus("idle");
          setActive(null);
          posRef.current = { chunk: 0, char: 0 };
          return;
        }
        const chunk = list[i];
        const begin = from !== undefined && from >= chunk.start && from < chunk.end ? from : chunk.start;
        const { rate: r, pitch: p, volume: vol, voice: v } = settingsRef.current;
        const u = new SpeechSynthesisUtterance(source.slice(begin, chunk.end));
        if (v) {
          u.voice = v;
          u.lang = v.lang;
        }
        u.rate = r;
        u.pitch = p;
        u.volume = vol;
        u.onstart = () => {
          if (session === sessionRef.current) setActive({ chunk: i, word: null });
        };
        u.onboundary = (e) => {
          if (session !== sessionRef.current || e.name !== "word") return;
          const ws = begin + e.charIndex;
          const we = e.charLength ? ws + e.charLength : wordEnd(source, ws);
          posRef.current = { chunk: i, char: ws };
          setActive({ chunk: i, word: [ws, Math.min(we, chunk.end)] });
        };
        u.onend = () => {
          if (session === sessionRef.current) say(i + 1);
        };
        u.onerror = (e) => {
          if (session !== sessionRef.current) return;
          if (e.error === "interrupted" || e.error === "canceled") return; // our own stop/pause
          toast.error(t("tts.ui.synthFailed"));
          stop();
        };
        posRef.current = { chunk: i, char: begin };
        utterRef.current = u;
        setActive({ chunk: i, word: null });
        synth.speak(u);
      };
      setStatus("speaking");
      // Some engines drop a speak() issued in the same tick as cancel().
      setTimeout(() => say(chunkIndex, fromChar), 0);
    },
    [stop, t],
  );

  const start = useCallback(() => {
    if (!text.trim()) {
      toast.error(t("tts.ui.enterText"));
      return;
    }
    const list = splitText(text, voice?.lang ?? locale);
    setChunks(list);
    if (!list.length) return;
    speakFrom(list, text, 0);
  }, [text, voice, locale, speakFrom, t]);

  // Pause = cancel and remember the last word; resume re-speaks from there.
  // (speechSynthesis.pause() is unreliable across engines.)
  const pause = useCallback(() => {
    sessionRef.current++;
    window.speechSynthesis.cancel();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    speakFrom(chunks, text, posRef.current.chunk, posRef.current.char);
  }, [chunks, text, speakFrom]);

  const jump = useCallback(
    (index: number) => {
      if (!chunks.length) return;
      const i = Math.max(0, Math.min(chunks.length - 1, index));
      speakFrom(chunks, text, i);
    },
    [chunks, text, speakFrom],
  );

  // Voice / rate / pitch / volume changes apply immediately (from the current word).
  useEffect(() => {
    if (statusRef.current !== "speaking") return;
    const id = setTimeout(() => {
      if (statusRef.current === "speaking") speakFrom(chunks, text, posRef.current.chunk, posRef.current.char);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, pitch, volume, voiceURI]);

  // Keep the spoken sentence in view.
  useEffect(() => {
    activeChunkRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active?.chunk]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      start();
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("tts.ui.textCopied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const estSeconds = (words / 2.6) / rate;
  const reading = status !== "idle";
  const settingsChanged = rate !== DEFAULTS.rate || pitch !== DEFAULTS.pitch || volume !== DEFAULTS.volume;

  const renderReader = () => {
    const parts: ReactNode[] = [];
    let cursor = 0;
    chunks.forEach((c, i) => {
      if (c.start > cursor) parts.push(text.slice(cursor, c.start));
      const isActive = active?.chunk === i;
      const word = isActive ? active?.word : null;
      parts.push(
        <span
          key={i}
          ref={isActive ? activeChunkRef : undefined}
          onClick={() => jump(i)}
          className={`cursor-pointer rounded-[4px] transition-colors ${isActive ? "bg-volt/25 text-t-primary" : "hover:bg-bg-tertiary"}`}
        >
          {word ? (
            <>
              {text.slice(c.start, word[0])}
              <mark className="rounded-[3px] bg-volt px-0.5 text-volt-ink">{text.slice(word[0], word[1])}</mark>
              {text.slice(word[1], c.end)}
            </>
          ) : (
            text.slice(c.start, c.end)
          )}
        </span>,
      );
      cursor = c.end;
    });
    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts;
  };

  if (!supported) {
    return (
      <ToolLayout toolName={t("tool.text-to-speech.name")} toolDescription={t("tool.text-to-speech.desc")}>
        <div role="alert" className="glass flex items-start gap-3 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-t-secondary" aria-hidden="true" />
          <p className="text-[14px] text-t-primary">{t("tts.ui.unsupported")}</p>
        </div>
      </ToolLayout>
    );
  }

  return (
    <ToolLayout toolName={t("tool.text-to-speech.name")} toolDescription={t("tool.text-to-speech.desc")}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Text / reader */}
        <div className="glass space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="tts-text" className={sectionTitle}>
              {t("tts.ui.text")}
            </label>
            <span className={`text-[12.5px] tabular-nums ${text.length > MAX_CHARS * 0.95 ? "text-red-700 dark:text-red-400" : "text-t-tertiary"}`}>
              {text.length.toLocaleString(locale)} / {MAX_CHARS.toLocaleString(locale)}
            </span>
          </div>

          {reading ? (
            <div
              aria-live="off"
              className="max-h-[420px] min-h-[220px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-bg-secondary px-4 py-3 text-[15px] leading-relaxed text-t-secondary"
            >
              {renderReader()}
            </div>
          ) : (
            <textarea
              id="tts-text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={onKeyDown}
              placeholder={t("tts.ui.placeholder")}
              className="min-h-[220px] w-full resize-y rounded-xl border border-border bg-bg-secondary px-4 py-3 text-[15px] leading-relaxed text-t-primary placeholder:text-t-tertiary focus:border-accent focus:outline-none"
            />
          )}

          <p className="text-[12.5px] tabular-nums text-t-tertiary">
            {reading ? t("tts.v2.readerHint") : t("tts.v2.stats", { words: words.toLocaleString(locale), time: formatDuration(estSeconds) })}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {status === "idle" && (
              <button type="button" onClick={start} disabled={!text.trim() || !voices.length} className={buttonPrimary}>
                <Play className="h-4 w-4" aria-hidden="true" />
                {t("tts.ui.speak")}
              </button>
            )}
            {status === "speaking" && (
              <button type="button" onClick={pause} className={buttonPrimary}>
                <Pause className="h-4 w-4" aria-hidden="true" />
                {t("ar.pause")}
              </button>
            )}
            {status === "paused" && (
              <button type="button" onClick={resume} className={buttonPrimary}>
                <Play className="h-4 w-4" aria-hidden="true" />
                {t("ar.resume")}
              </button>
            )}
            {reading && (
              <>
                <button
                  type="button"
                  onClick={() => jump((active?.chunk ?? posRef.current.chunk) - 1)}
                  aria-label={t("tts.v2.prev")}
                  title={t("tts.v2.prev")}
                  className={`${buttonSecondary} h-11 w-11 px-0`}
                >
                  <SkipBack className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => jump((active?.chunk ?? posRef.current.chunk) + 1)}
                  aria-label={t("tts.v2.next")}
                  title={t("tts.v2.next")}
                  className={`${buttonSecondary} h-11 w-11 px-0`}
                >
                  <SkipForward className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={stop} className={buttonSecondary}>
                  <Square className="h-4 w-4" aria-hidden="true" />
                  {t("ar.stop")}
                </button>
              </>
            )}
            {!reading && text && (
              <button type="button" onClick={copy} className={buttonSecondary}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                {t("ui.copy")}
              </button>
            )}
            {!reading && <span className="hidden text-[12px] text-t-tertiary sm:inline">{t("tts.v2.shortcut")}</span>}
          </div>
        </div>

        {/* Voice settings */}
        <div className="space-y-5">
          <div className="glass space-y-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className={sectionTitle}>{t("tts.ui.voiceSettings")}</p>
              <button
                type="button"
                onClick={() => {
                  setRate(DEFAULTS.rate);
                  setPitch(DEFAULTS.pitch);
                  setVolume(DEFAULTS.volume);
                }}
                disabled={!settingsChanged}
                className={`${buttonSecondary} min-h-[36px] px-3 py-1.5 text-[13px]`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {t("ui.reset")}
              </button>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[13px] text-t-secondary">{t("tts.ui.voice")}</span>
              <select
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
                disabled={!voices.length}
                className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-[14px] text-t-primary focus:border-accent focus:outline-none"
              >
                {!voices.length && <option value="">{voicesTimedOut ? t("tts.v2.noVoices") : t("tts.ui.loadingVoices")}</option>}
                {groups.map((g) => (
                  <optgroup key={g.tag} label={g.label}>
                    {g.voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {voices.length > 0 && <span className="mt-1.5 block text-[12px] text-t-tertiary">{t("tts.v2.voiceCount", { n: voices.length })}</span>}
            </label>

            <Slider label={t("tts.ui.speed")} value={rate} min={0.5} max={2} step={0.05} onChange={setRate} display={`${rate.toFixed(2)}×`} />
            <Slider label={t("tts.ui.pitch")} value={pitch} min={0.5} max={2} step={0.05} onChange={setPitch} display={pitch.toFixed(2)} />
            <Slider label={t("tts.ui.volume")} value={volume} min={0} max={1} step={0.05} onChange={setVolume} display={`${Math.round(volume * 100)}%`} />
          </div>

          <div className="glass flex gap-3 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-t-tertiary" aria-hidden="true" />
            <div className="space-y-2 text-[12.5px] leading-relaxed text-t-secondary">
              <p>{t("tts.v2.noExport")}</p>
              <p>{t("tts.v2.tip")}</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
