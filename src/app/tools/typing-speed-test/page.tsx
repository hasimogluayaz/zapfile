"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type Difficulty = "easy" | "medium" | "hard";
type Mode = "completion" | "time";
type Lang = "en" | "tr" | "de" | "fr" | "es";

const TIME_OPTIONS = [15, 30, 60, 120];

interface TypingRecord {
  wpm: number;
  accuracy: number;
  date: string;
}

const TEXTS: Record<Lang, Record<Difficulty, string[]>> = {
  en: {
    easy: [
      "The sun sets slowly over the calm sea, painting the sky in shades of orange and pink.",
      "She opened the window and let the fresh morning air fill the quiet room.",
      "The old dog sat by the fire, watching the snow fall outside the frosted glass.",
      "He smiled at the letter in his hand, then folded it carefully and placed it in his pocket.",
      "We walked along the beach at sunset, picking up shells and laughing at the waves.",
      "The children ran through the garden, chasing butterflies in the warm afternoon sun.",
    ],
    medium: [
      "Consistent practice is the single most reliable path to mastering any new skill you choose to pursue.",
      "Technology continues to reshape the way modern societies communicate, work, and form human connections.",
      "The quick brown fox jumps over the lazy dog near the riverbank every morning at dawn.",
      "Learning to read quickly requires training your eyes to scan groups of words instead of individual letters.",
      "Every great journey starts with a single step taken in the direction of your deepest passion.",
      "The library was silent except for the soft rustle of pages being turned in the dim light.",
      "Scientists have discovered that the ocean depths harbor ecosystems as diverse as any tropical rainforest.",
    ],
    hard: [
      "Asynchronous programming paradigms facilitate concurrent execution without blocking the main thread of a process.",
      "The intrinsic complexity of distributed consensus algorithms demands rigorous fault-tolerance engineering.",
      "Polymorphic dispatch in statically typed languages enables flexible yet type-safe architectural patterns.",
      "Cryptographic hash functions produce deterministic, collision-resistant digests from arbitrary input data.",
      "Recursive descent parsers construct abstract syntax trees by applying grammar rules to tokenized input.",
      "Microservices architectures decouple monolithic applications into independently deployable bounded contexts.",
    ],
  },
  tr: {
    easy: [
      "Güneş yavaşça batar ve gökyüzünü turuncu ile pembe tonlarıyla boyar.",
      "Sabahın erken saatlerinde, kentin sokaklarında sessiz bir huzur vardı.",
      "Küçük kedi pencere kenarında oturmuş, dışarıdaki kuşları izliyordu.",
      "O gün okula gitmek yerine parkta yürümeye karar verdim.",
      "Bahçedeki çiçekler baharın gelişini haber veriyordu.",
    ],
    medium: [
      "Düzenli çalışma, herhangi bir beceriyi geliştirmenin en güvenilir yoludur.",
      "Teknoloji, modern toplumların birbirleriyle iletişim kurma şeklini köklü biçimde değiştirmektedir.",
      "Her büyük yolculuk, tutkunuzun yönünde atılan tek bir adımla başlar.",
      "Kitap okumak, hem bilgiyi artırır hem de hayal gücünü besler.",
      "İklim değişikliği, günümüzün en acil küresel sorunu haline gelmiştir.",
    ],
    hard: [
      "Paralel programlama paradigmaları, işlemci çekirdeklerini verimli biçimde kullanarak performansı artırır.",
      "Makine öğrenmesi algoritmalarının başarısı büyük ölçüde veri kalitesine ve miktarına bağlıdır.",
      "Dağıtık sistemlerde tutarlılık ile kullanılabilirlik arasındaki denge, temel bir tasarım sorunudur.",
      "Kriptografik özet fonksiyonları, keyfi girdilerden deterministik ve çarpışmaya dayanıklı özetler üretir.",
    ],
  },
  de: {
    easy: [
      "Die Sonne geht langsam unter und malt den Himmel in Orange und Rosa.",
      "Sie öffnete das Fenster und ließ die frische Morgenluft ins Zimmer.",
      "Der alte Hund saß am Feuer und beobachtete den fallenden Schnee.",
      "Wir spazierten bei Sonnenuntergang am Strand entlang und lachten über die Wellen.",
      "Die Kinder liefen durch den Garten und jagten Schmetterlinge.",
    ],
    medium: [
      "Regelmäßige Übung ist der zuverlässigste Weg, eine neue Fähigkeit zu meistern.",
      "Die Technologie verändert weiterhin die Art und Weise, wie moderne Gesellschaften kommunizieren.",
      "Jede große Reise beginnt mit einem einzigen Schritt in Richtung Ihrer tiefsten Leidenschaft.",
      "Wissenschaftler haben entdeckt, dass die Tiefen des Ozeans vielfältige Ökosysteme beherbergen.",
      "Das Lesen vieler Bücher erweitert den Horizont und schärft das analytische Denken.",
    ],
    hard: [
      "Asynchrone Programmierparadigmen ermöglichen die nebenläufige Ausführung ohne den Hauptthread zu blockieren.",
      "Die Komplexität verteilter Konsenssysteme erfordert sorgfältige Fehlertoleranzarchitekturen.",
      "Kryptografische Hash-Funktionen erzeugen deterministische, kollisionsresistente Prüfsummen.",
      "Polymorphe Methodenauflösung in statisch typisierten Sprachen ermöglicht flexible Entwurfsmuster.",
    ],
  },
  fr: {
    easy: [
      "Le soleil se couche lentement sur la mer calme, peignant le ciel en orange et rose.",
      "Elle a ouvert la fenêtre et laissé l'air frais du matin envahir la pièce.",
      "Le vieux chien était assis près du feu, regardant la neige tomber dehors.",
      "Nous avons marché le long de la plage au coucher du soleil en ramassant des coquillages.",
      "Les enfants couraient dans le jardin en chassant des papillons.",
    ],
    medium: [
      "La pratique régulière est le chemin le plus sûr pour maîtriser toute nouvelle compétence.",
      "La technologie continue de transformer la façon dont les sociétés modernes communiquent.",
      "Chaque grand voyage commence par un seul pas dans la direction de votre passion la plus profonde.",
      "Les scientifiques ont découvert que les profondeurs océaniques abritent des écosystèmes très diversifiés.",
      "Lire de nombreux livres élargit l'esprit et affine la pensée analytique.",
    ],
    hard: [
      "Les paradigmes de programmation asynchrone facilitent l'exécution concurrente sans bloquer le fil principal.",
      "La complexité intrinsèque des algorithmes de consensus distribué exige une ingénierie rigoureuse.",
      "Les fonctions de hachage cryptographique produisent des condensés déterministes et résistants aux collisions.",
      "La résolution polymorphe dans les langages à typage statique permet des patterns architecturaux flexibles.",
    ],
  },
  es: {
    easy: [
      "El sol se pone lentamente sobre el mar tranquilo, pintando el cielo de naranja y rosa.",
      "Ella abrió la ventana y dejó que el aire fresco de la mañana llenara la habitación.",
      "El viejo perro se sentó junto al fuego, mirando caer la nieve por la ventana.",
      "Caminamos por la playa al atardecer recogiendo conchas y riendo de las olas.",
      "Los niños corrían por el jardín persiguiendo mariposas bajo el sol de la tarde.",
    ],
    medium: [
      "La práctica constante es el camino más fiable para dominar cualquier nueva habilidad.",
      "La tecnología sigue transformando la forma en que las sociedades modernas se comunican.",
      "Cada gran viaje comienza con un solo paso en la dirección de tu pasión más profunda.",
      "Los científicos han descubierto que las profundidades del océano albergan ecosistemas muy diversos.",
      "Leer muchos libros amplía la mente y agudiza el pensamiento analítico.",
    ],
    hard: [
      "Los paradigmas de programación asíncrona facilitan la ejecución concurrente sin bloquear el hilo principal.",
      "La complejidad inherente de los algoritmos de consenso distribuido exige ingeniería rigurosa.",
      "Las funciones hash criptográficas producen resúmenes deterministas y resistentes a colisiones.",
      "El despacho polimórfico en lenguajes de tipado estático permite patrones arquitectónicos flexibles.",
    ],
  },
};

const LANG_LABELS: Record<Lang, string> = {
  en: "🇬🇧 EN",
  tr: "🇹🇷 TR",
  de: "🇩🇪 DE",
  fr: "🇫🇷 FR",
  es: "🇪🇸 ES",
};

type CharState = "pending" | "correct" | "incorrect";
interface CharData { char: string; state: CharState }

function recordKey(mode: Mode, diff: Difficulty, seconds: number) {
  return mode === "time" ? `typerec_time_${seconds}` : `typerec_comp_${diff}`;
}

function loadRecord(key: string): TypingRecord | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
}

function saveRecord(key: string, r: TypingRecord) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(r));
}

export default function TypingSpeedTestPage() {
  const { t } = useI18n();

  const [lang, setLang] = useState<Lang>("en");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mode, setMode] = useState<Mode>("completion");
  const [timeLimit, setTimeLimit] = useState(60);

  const [targetText, setTargetText] = useState("");
  const [charData, setCharData] = useState<CharData[]>([]);
  const [userInput, setUserInput] = useState("");

  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errorCount, setErrorCount] = useState(0);

  const [bestRecord, setBestRecord] = useState<TypingRecord | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentKey = recordKey(mode, difficulty, timeLimit);

  const pickText = useCallback((d: Difficulty, l: Lang) => {
    const arr = TEXTS[l][d];
    return arr[Math.floor(Math.random() * arr.length)];
  }, []);

  const initTest = useCallback(
    (d: Difficulty, l: Lang, m: Mode) => {
      const text = pickText(d, l);
      setTargetText(text);
      setCharData(text.split("").map((c) => ({ char: c, state: "pending" })));
      setUserInput("");
      setIsStarted(false);
      setIsFinished(false);
      setStartTime(null);
      setEndTime(null);
      setElapsed(0);
      setWpm(0);
      setAccuracy(100);
      setErrorCount(0);
      setIsNewRecord(false);
      const key = recordKey(m, d, timeLimit);
      setBestRecord(loadRecord(key));
    },
    [pickText, timeLimit]
  );

  useEffect(() => { initTest(difficulty, lang, mode); }, []);

  useEffect(() => {
    setBestRecord(loadRecord(currentKey));
  }, [currentKey]);

  // Timer
  useEffect(() => {
    if (isStarted && !isFinished) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const e = now - (startTime ?? now);
        setElapsed(e);

        if (mode === "time" && e >= timeLimit * 1000) {
          // Time's up
          setIsFinished(true);
          setEndTime(now);
          const minutes = e / 60000;
          const words = userInputRef.current.trim().split(/\s+/).filter(Boolean).length;
          const calc = minutes > 0 ? Math.round(words / minutes) : 0;
          setWpm(calc);
          toast.success(t("typing.done"));
        }
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted, isFinished, startTime, mode, timeLimit]);

  // Need a ref for userInput in the timer closure
  const userInputRef = useRef(userInput);
  useEffect(() => { userInputRef.current = userInput; }, [userInput]);

  const finishTest = useCallback(
    (input: string, st: number, et: number, chars: CharData[]) => {
      const minutes = (et - st) / 60000;
      const words = input.trim().split(/\s+/).filter(Boolean).length;
      const calc = minutes > 0 ? Math.round(words / minutes) : 0;
      const correct = chars.filter((c) => c.state === "correct").length;
      const acc = input.length > 0 ? Math.round((correct / input.length) * 100) : 100;

      setWpm(calc);
      setAccuracy(acc);
      setIsFinished(true);
      setEndTime(et);

      // Record check
      const key = recordKey(mode, difficulty, timeLimit);
      const prev = loadRecord(key);
      if (!prev || calc > prev.wpm) {
        const rec: TypingRecord = { wpm: calc, accuracy: acc, date: new Date().toLocaleDateString() };
        saveRecord(key, rec);
        setBestRecord(rec);
        if (prev) { setIsNewRecord(true); toast.success("🏆 " + t("typing.newRecord")); }
      }
      toast.success(t("typing.done"));
    },
    [mode, difficulty, timeLimit, t]
  );

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isFinished) return;
    const value = e.target.value;

    if (!isStarted && value.length > 0) {
      setIsStarted(true);
      setStartTime(Date.now());
    }

    setUserInput(value);

    const updated: CharData[] = targetText.split("").map((char, i) => ({
      char,
      state: i >= value.length ? "pending" : value[i] === char ? "correct" : "incorrect",
    }));
    setCharData(updated);

    const errors = updated.filter((c) => c.state === "incorrect").length;
    setErrorCount(errors);
    const acc = value.length > 0 ? Math.round((updated.filter((c) => c.state === "correct").length / value.length) * 100) : 100;
    setAccuracy(acc);

    if (mode === "completion" && value.length >= targetText.length) {
      const now = Date.now();
      finishTest(value, startTime ?? now, now, updated);
    }
  };

  const handleReset = () => {
    initTest(difficulty, lang, mode);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleLang = (l: Lang) => { setLang(l); initTest(difficulty, l, mode); };
  const handleDifficulty = (d: Difficulty) => { setDifficulty(d); initTest(d, lang, mode); };
  const handleMode = (m: Mode) => { setMode(m); initTest(difficulty, lang, m); };
  const handleTimeLimit = (s: number) => { setTimeLimit(s); initTest(difficulty, lang, mode); };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m > 0 ? `${m}m ${rem}s` : `${s}s`;
  };

  const countdown = mode === "time" ? Math.max(0, timeLimit - Math.floor(elapsed / 1000)) : null;

  const liveWpm = isFinished
    ? wpm
    : isStarted && startTime
    ? Math.round((userInput.trim().split(/\s+/).filter(Boolean).length / Math.max((Date.now() - startTime) / 60000, 0.001)))
    : 0;

  const progress = mode === "completion" && targetText.length > 0
    ? Math.round((userInput.length / targetText.length) * 100)
    : mode === "time" && timeLimit > 0
    ? Math.round((elapsed / (timeLimit * 1000)) * 100)
    : 0;

  const DIFF_BUTTONS: { key: Difficulty; label: string; color: string }[] = [
    { key: "easy",   label: t("typing.easy"),   color: "text-emerald-400" },
    { key: "medium", label: t("typing.medium"),  color: "text-amber-400" },
    { key: "hard",   label: t("typing.hard"),    color: "text-red-400" },
  ];

  return (
    <ToolLayout
      toolName={t("tool.typing-speed-test.name")}
      toolDescription={t("tool.typing-speed-test.desc")}
    >
      <div className="space-y-5">
        {/* Controls row */}
        <div className="glass rounded-2xl p-5 space-y-4">
          {/* Language */}
          <div>
            <p className="text-xs font-semibold text-t-tertiary uppercase tracking-wider mb-2">{t("typing.language")}</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                <button key={l} onClick={() => handleLang(l)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    lang === l
                      ? "bg-accent/15 border border-accent text-accent"
                      : "bg-bg-secondary border border-border text-t-secondary hover:border-border-strong"
                  }`}>
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          {/* Mode + Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-t-tertiary uppercase tracking-wider mb-2">{t("typing.mode")}</p>
              <div className="flex gap-2">
                {(["completion", "time"] as Mode[]).map((m) => (
                  <button key={m} onClick={() => handleMode(m)}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      mode === m
                        ? "bg-accent/15 border border-accent text-accent"
                        : "bg-bg-secondary border border-border text-t-secondary hover:border-border-strong"
                    }`}>
                    {m === "completion" ? t("typing.completion") : t("typing.countdown")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-t-tertiary uppercase tracking-wider mb-2">
                {mode === "time" ? `Duration` : t("typing.difficulty")}
              </p>
              {mode === "time" ? (
                <div className="flex gap-2">
                  {TIME_OPTIONS.map((s) => (
                    <button key={s} onClick={() => handleTimeLimit(s)}
                      className={`flex-1 px-2 py-2 rounded-xl text-sm font-medium transition-all ${
                        timeLimit === s
                          ? "bg-accent/15 border border-accent text-accent"
                          : "bg-bg-secondary border border-border text-t-secondary hover:border-border-strong"
                      }`}>
                      {s}{t("typing.seconds")}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2">
                  {DIFF_BUTTONS.map(({ key, label, color }) => (
                    <button key={key} onClick={() => handleDifficulty(key)}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        difficulty === key
                          ? `bg-accent/15 border border-accent ${color}`
                          : "bg-bg-secondary border border-border text-t-secondary hover:border-border-strong"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Text display */}
        <div className="glass rounded-2xl p-5">
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-bg-secondary mb-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>

          {/* Target text with char coloring */}
          <div
            className="font-mono text-[15px] leading-8 select-none mb-4 p-4 rounded-xl bg-bg-secondary border border-border relative overflow-hidden"
            onClick={() => textareaRef.current?.focus()}
          >
            {charData.map((cd, i) => {
              const isCursor = !isFinished && isStarted && i === userInput.length;
              return (
                <span key={i} className="relative">
                  {isCursor && (
                    <span className="absolute -left-px top-0 bottom-0 w-0.5 bg-accent animate-pulse" />
                  )}
                  <span className={
                    cd.state === "correct" ? "text-emerald-400" :
                    cd.state === "incorrect" ? "text-red-400 bg-red-500/20 rounded-sm" :
                    i === userInput.length && !isStarted ? "text-t-primary" :
                    "text-t-tertiary"
                  }>
                    {cd.char}
                  </span>
                </span>
              );
            })}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={handleInput}
              disabled={isFinished}
              placeholder={isFinished ? "" : t("typing.startPrompt")}
              rows={3}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              className={`w-full px-4 py-3 rounded-xl bg-bg-secondary text-t-primary placeholder:text-t-tertiary focus:outline-none resize-none font-mono text-sm transition-colors border ${
                isFinished
                  ? "border-border opacity-50 cursor-not-allowed"
                  : isStarted
                  ? "border-accent/40 focus:border-accent/70"
                  : "border-border focus:border-accent/40"
              }`}
            />
            {mode === "time" && isStarted && !isFinished && (
              <span className={`absolute top-3 right-3 text-lg font-bold font-mono ${countdown! <= 5 ? "text-red-400 animate-pulse" : "text-accent"}`}>
                {countdown}s
              </span>
            )}
            {mode === "completion" && isStarted && !isFinished && (
              <span className="absolute top-3 right-3 text-xs text-t-tertiary font-mono">
                {userInput.length}/{targetText.length}
              </span>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleReset}
              className="px-6 py-2.5 rounded-xl font-semibold text-white bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] text-sm">
              {isFinished ? t("typing.tryAgain") : t("typing.reset")}
            </button>
            {!isStarted && !isFinished && (
              <button onClick={() => textareaRef.current?.focus()}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-t-secondary bg-bg-secondary border border-border hover:border-border-strong transition-all">
                {t("typing.start")}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t("typing.wpm"), value: liveWpm, unit: "", hi: isFinished },
            { label: t("typing.accuracy"), value: accuracy, unit: "%", hi: false },
            { label: mode === "time" ? "Remaining" : t("typing.time"),
              value: mode === "time" && isStarted ? `${countdown}s` : formatTime(elapsed), unit: "", hi: false },
            { label: t("typing.errors"), value: errorCount, unit: "", hi: false },
          ].map(({ label, value, unit, hi }) => (
            <div key={label}
              className={`glass rounded-2xl p-4 text-center transition-all ${hi ? "border border-accent/40" : ""}`}>
              <p className="text-xs font-medium text-t-tertiary uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-2xl font-bold ${hi ? "text-accent" : "text-t-primary"}`}>
                {value}{unit}
              </p>
            </div>
          ))}
        </div>

        {/* Personal best */}
        {bestRecord && (
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-t-tertiary uppercase tracking-wider mb-0.5">{t("typing.bestWpm")}</p>
              <p className="text-t-primary">
                <span className="text-xl font-bold text-amber-400">{bestRecord.wpm}</span>
                <span className="text-sm text-t-tertiary ml-1">WPM</span>
                <span className="text-sm text-t-tertiary ml-3">{bestRecord.accuracy}% acc</span>
                <span className="text-xs text-t-tertiary ml-2">{bestRecord.date}</span>
              </p>
            </div>
            <span className="text-2xl">🏆</span>
          </div>
        )}

        {/* Finished banner */}
        {isFinished && (
          <div className={`glass rounded-2xl p-6 text-center border ${isNewRecord ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/30"}`}>
            {isNewRecord && (
              <p className="text-amber-400 font-bold text-sm mb-1 animate-pulse">🏆 {t("typing.newRecord")}</p>
            )}
            <p className={`text-lg font-semibold mb-1 ${isNewRecord ? "text-amber-400" : "text-emerald-400"}`}>
              {t("typing.done")}
            </p>
            <div className="flex items-center justify-center gap-6 flex-wrap text-sm text-t-secondary">
              <span><strong className="text-t-primary text-xl">{wpm}</strong> WPM</span>
              <span><strong className="text-t-primary">{accuracy}%</strong> {t("typing.accuracy")}</span>
              <span><strong className="text-t-primary">{errorCount}</strong> {t("typing.errors")}</span>
              <span><strong className="text-t-primary">{formatTime(endTime && startTime ? endTime - startTime : elapsed)}</strong> {t("typing.time")}</span>
            </div>
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={handleReset}
                className="px-6 py-2.5 rounded-xl font-semibold text-white bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] text-sm">
                {t("typing.tryAgain")}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
