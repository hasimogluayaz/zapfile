"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

type GenerateType = "paragraphs" | "sentences" | "words";

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "at", "vero", "eos",
  "accusamus", "iusto", "odio", "dignissimos", "ducimus", "blanditiis",
  "praesentium", "voluptatum", "deleniti", "atque", "corrupti", "quos", "dolores",
  "quas", "molestias", "excepturi", "obcaecati", "cupiditate", "provident",
  "similique", "mollitia", "animi", "recusandae", "tenetur", "a", "sapiente",
  "delectus", "rerum", "hic", "necessitatibus", "saepe", "eveniet",
  "voluptates", "repudiandae", "recusandae", "numquam", "eius", "modi",
  "tempora", "quaerat", "voluptatem", "quia", "consequuntur", "magni",
  "dolorem", "porro", "quisquam", "nihil", "impedit", "quo", "minus",
  "maxime", "placeat", "facere", "possimus", "omnis", "voluptas", "assumenda",
  "repellendus", "temporibus", "quibusdam", "illum", "fugit", "aspernatur",
  "aut", "odit", "consequatur", "vel", "rem", "aperiam", "eaque", "ipsa",
  "quae", "ab", "illo", "inventore", "veritatis", "quasi", "architecto",
  "beatae", "vitae", "dicta", "explicabo", "nemo", "ipsam", "voluptatibus",
  "maiores", "alias", "perferendis", "doloribus", "asperiores", "repellat",
  "hanc", "ego", "cum", "soluta", "nobis", "eligendi", "optio", "cumque",
  "impedit", "neque", "porro", "libero", "tempore", "cumque", "quod",
  "autem", "harum", "rerum", "facilis", "expedita", "distinctio", "nam",
  "totam", "accusantium", "doloremque", "laudantium", "aperiam", "eaque",
  "perspiciatis", "unde", "debitis", "aut", "rerum", "necessitatibus",
  "saepe", "eveniet", "ut", "et", "voluptates", "repudiandae", "sint",
  "molestiae", "non", "recusandae", "itaque", "earum", "rerum", "sapiente",
  "delectus", "officiis", "debitis", "aut", "rerum", "necessitatibus",
  "temporibus", "autem", "quibusdam", "aut", "officiis", "suscipit",
];

const LOREM_START = "Lorem ipsum dolor sit amet, consectetur adipiscing elit";

function getRandomWord(): string {
  return LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateSentence(): string {
  const length = 8 + Math.floor(Math.random() * 12);
  const words: string[] = [];
  for (let i = 0; i < length; i++) {
    words.push(getRandomWord());
  }
  words[0] = capitalize(words[0]);
  return words.join(" ") + ".";
}

function generateParagraph(): string {
  const sentenceCount = 4 + Math.floor(Math.random() * 5);
  const sentences: string[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    sentences.push(generateSentence());
  }
  return sentences.join(" ");
}

function generateText(
  type: GenerateType,
  count: number,
  startWithLorem: boolean
): string {
  let result: string;

  switch (type) {
    case "paragraphs": {
      const paragraphs: string[] = [];
      for (let i = 0; i < count; i++) {
        paragraphs.push(generateParagraph());
      }
      if (startWithLorem && paragraphs.length > 0) {
        paragraphs[0] = LOREM_START + ". " + paragraphs[0];
      }
      result = paragraphs.join("\n\n");
      break;
    }
    case "sentences": {
      const sentences: string[] = [];
      for (let i = 0; i < count; i++) {
        sentences.push(generateSentence());
      }
      if (startWithLorem && sentences.length > 0) {
        sentences[0] = LOREM_START + ". " + sentences[0];
      }
      result = sentences.join(" ");
      break;
    }
    case "words": {
      const words: string[] = [];
      for (let i = 0; i < count; i++) {
        words.push(getRandomWord());
      }
      if (startWithLorem && words.length > 0) {
        const loremWords = LOREM_START.toLowerCase().split(" ");
        const replaceCount = Math.min(loremWords.length, words.length);
        for (let i = 0; i < replaceCount; i++) {
          words[i] = loremWords[i];
        }
        words[0] = capitalize(words[0]);
      }
      result = words.join(" ");
      break;
    }
  }

  return result;
}

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export default function LoremIpsumPage() {
  const [type, setType] = useState<GenerateType>("paragraphs");
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [text, setText] = useState("");

  const defaultCounts: Record<GenerateType, number> = {
    paragraphs: 3,
    sentences: 10,
    words: 50,
  };

  const generate = useCallback(() => {
    setText(generateText(type, count, startWithLorem));
  }, [type, count, startWithLorem]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleTypeChange = (newType: GenerateType) => {
    setType(newType);
    setCount(defaultCounts[newType]);
  };

  const copyToClipboard = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Text copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const wordCount = countWords(text);
  const charCount = text.length;

  const types: { value: GenerateType; label: string }[] = [
    { value: "paragraphs", label: "Paragraphs" },
    { value: "sentences", label: "Sentences" },
    { value: "words", label: "Words" },
  ];

  return (
    <ToolLayout
      toolName="Lorem Ipsum Generator"
      toolDescription="Generate placeholder text for designs and layouts. Choose paragraphs, sentences, or words. Everything runs in your browser."
    >
      <div className="space-y-6">
        {/* Settings */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-t-secondary mb-4">
            Settings
          </h3>

          {/* Type Selector */}
          <div className="mb-5">
            <label className="text-sm text-t-primary mb-2 block">Type</label>
            <div className="flex gap-2">
              {types.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleTypeChange(value)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    type === value
                      ? "bg-indigo-500/20 border border-indigo-500 text-t-primary"
                      : "bg-white/[0.04] border border-white/[0.08] text-t-secondary hover:border-white/20"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Count Slider */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-t-primary">Count</label>
              <span className="text-sm font-semibold text-t-primary tabular-nums">
                {count}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-t-tertiary mt-1">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Start with Lorem checkbox */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                startWithLorem
                  ? "bg-indigo-500 border-indigo-500"
                  : "border-white/20 bg-transparent group-hover:border-white/40"
              }`}
              onClick={(e) => {
                e.preventDefault();
                setStartWithLorem(!startWithLorem);
              }}
            >
              {startWithLorem && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={startWithLorem}
              onChange={() => setStartWithLorem(!startWithLorem)}
              className="hidden"
            />
            <span className="text-sm text-t-primary">
              Start with &ldquo;Lorem ipsum dolor sit amet...&rdquo;
            </span>
          </label>
        </div>

        {/* Generated Text */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-t-secondary">
              Generated Text
            </h3>
            <div className="flex gap-2">
              <button
                onClick={generate}
                className="px-4 py-2 rounded-xl text-sm font-medium text-t-secondary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-t-primary transition-all"
              >
                Regenerate
              </button>
              <button
                onClick={copyToClipboard}
                disabled={!text}
                className="px-6 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="px-4 py-4 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
            {text}
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-3">
            <span className="text-xs text-t-tertiary">
              {wordCount.toLocaleString()} words
            </span>
            <span className="text-xs text-t-tertiary">
              {charCount.toLocaleString()} characters
            </span>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
