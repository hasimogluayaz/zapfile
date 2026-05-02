"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { downloadBlob, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
  opacity: number;
  backgroundColor: string;
  backgroundOpacity: number;
}

function cloneTextItems(items: TextItem[]): TextItem[] {
  return items.map((t) => ({ ...t }));
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const safe = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : normalized.padEnd(6, "0").slice(0, 6);

  const r = Number.parseInt(safe.slice(0, 2), 16);
  const g = Number.parseInt(safe.slice(2, 4), 16);
  const b = Number.parseInt(safe.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getTextLines(text: string) {
  const lines = text.split(/\r?\n/);
  return lines.length > 0 ? lines : [""];
}

const FONT_FAMILIES = [
  "Impact",
  "Arial Black",
  "Arial",
  "Helvetica",
  "Comic Sans MS",
  "Georgia",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
  "Courier New",
];

type PresetTemplate = {
  labelKey: string;
  items: Omit<TextItem, "id">[];
};

const PRESETS: PresetTemplate[] = [
  {
    labelKey: "meme.preset.classic",
    items: [
      {
        text: "TOP TEXT",
        x: 50,
        y: 8,
        fontSize: 48,
        fontFamily: "Impact",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 3,
        rotation: 0,
        align: "center",
        bold: false,
        italic: false,
        opacity: 100,
        backgroundColor: "#000000",
        backgroundOpacity: 0,
      },
      {
        text: "BOTTOM TEXT",
        x: 50,
        y: 92,
        fontSize: 48,
        fontFamily: "Impact",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 3,
        rotation: 0,
        align: "center",
        bold: false,
        italic: false,
        opacity: 100,
        backgroundColor: "#000000",
        backgroundOpacity: 0,
      },
    ],
  },
  {
    labelKey: "meme.preset.bottomCaption",
    items: [
      {
        text: "Caption here",
        x: 50,
        y: 90,
        fontSize: 44,
        fontFamily: "Impact",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 3,
        rotation: 0,
        align: "center",
        bold: false,
        italic: false,
        opacity: 100,
        backgroundColor: "#000000",
        backgroundOpacity: 0,
      },
    ],
  },
  {
    labelKey: "meme.preset.reaction",
    items: [
      {
        text: "Me:",
        x: 20,
        y: 10,
        fontSize: 36,
        fontFamily: "Arial Black",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 2,
        rotation: 0,
        align: "left",
        bold: true,
        italic: false,
        opacity: 100,
        backgroundColor: "#000000",
        backgroundOpacity: 0,
      },
      {
        text: "Also me:",
        x: 70,
        y: 10,
        fontSize: 36,
        fontFamily: "Arial Black",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 2,
        rotation: 0,
        align: "left",
        bold: true,
        italic: false,
        opacity: 100,
        backgroundColor: "#000000",
        backgroundOpacity: 0,
      },
    ],
  },
  {
    labelKey: "meme.preset.distractedBoyfriend",
    items: [
      {
        text: "New thing",
        x: 25,
        y: 88,
        fontSize: 32,
        fontFamily: "Impact",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 2,
        rotation: 0,
        align: "center",
        bold: false,
        italic: false,
        opacity: 100,
        backgroundColor: "#000000",
        backgroundOpacity: 0,
      },
      {
        text: "Old thing",
        x: 75,
        y: 88,
        fontSize: 32,
        fontFamily: "Impact",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 2,
        rotation: 0,
        align: "center",
        bold: false,
        italic: false,
        opacity: 100,
        backgroundColor: "#000000",
        backgroundOpacity: 0,
      },
      {
        text: "Me",
        x: 50,
        y: 55,
        fontSize: 32,
        fontFamily: "Impact",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 2,
        rotation: 0,
        align: "center",
        bold: false,
        italic: false,
        opacity: 100,
        backgroundColor: "#000000",
        backgroundOpacity: 0,
      },
    ],
  },
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultItems(): TextItem[] {
  return [
    {
      id: makeId(),
      text: "TOP TEXT",
      x: 50,
      y: 8,
      fontSize: 48,
      fontFamily: "Impact",
      color: "#ffffff",
      strokeColor: "#000000",
      strokeWidth: 3,
      rotation: 0,
      align: "center",
      bold: false,
      italic: false,
      opacity: 100,
      backgroundColor: "#000000",
      backgroundOpacity: 0,
    },
    {
      id: makeId(),
      text: "BOTTOM TEXT",
      x: 50,
      y: 92,
      fontSize: 48,
      fontFamily: "Impact",
      color: "#ffffff",
      strokeColor: "#000000",
      strokeWidth: 3,
      rotation: 0,
      align: "center",
      bold: false,
      italic: false,
      opacity: 100,
      backgroundColor: "#000000",
      backgroundOpacity: 0,
    },
  ];
}


export default function MemeGeneratorPage() {
  const { locale, t } = useI18n();
  const editorCopy = locale === "tr"
    ? {
        newText: "Yeni Metin",
        duplicate: "Kopyala",
        bringForward: "Öne al",
        sendBackward: "Arkaya al",
        xPosition: "X Konumu",
        yPosition: "Y Konumu",
        opacity: "Saydamlık",
        textBackground: "Metin Arka Planı",
        backgroundOpacity: "Arka plan opaklığı",
        layerTools: "Katman araçları",
        quickMove: "İnce hareket",
      }
    : {
        newText: "New Text",
        duplicate: "Duplicate",
        bringForward: "Bring forward",
        sendBackward: "Send backward",
        xPosition: "X Position",
        yPosition: "Y Position",
        opacity: "Opacity",
        textBackground: "Text background",
        backgroundOpacity: "Background opacity",
        layerTools: "Layer tools",
        quickMove: "Fine move",
      };
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [textItems, setTextItems] = useState<TextItem[]>(defaultItems());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<TextItem[][]>([]);
  const [redoStack, setRedoStack] = useState<TextItem[][]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const itemsRef = useRef<TextItem[]>(textItems);
  itemsRef.current = textItems;

  // Drag state
  const dragRef = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startItemX: number;
    startItemY: number;
    beforeItems: TextItem[];
  } | null>(null);

  // Load image
  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    const url = URL.createObjectURL(f);
    setImgSrc(url);
    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;
    };
    img.onerror = () => toast.error(t("meme.loadFail"));
    img.src = url;
    setTextItems(defaultItems());
    setSelectedId(null);
    setUndoStack([]);
    setRedoStack([]);
  }, [t]);

  const selectedItem = textItems.find((item) => item.id === selectedId) ?? null;

  function pushHistorySnapshot() {
    setUndoStack((u) => [...u.slice(-49), cloneTextItems(itemsRef.current)]);
    setRedoStack([]);
  }

  function updateItem(id: string, patch: Partial<TextItem>) {
    setTextItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }

  function addText() {
    pushHistorySnapshot();
    const id = makeId();
    setTextItems((prev) => [
      ...prev,
      {
        id,
        text: editorCopy.newText,
        x: 50,
        y: 50,
        fontSize: 48,
        fontFamily: "Impact",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 3,
        rotation: 0,
        align: "center",
        bold: false,
        italic: false,
        opacity: 100,
        backgroundColor: "#000000",
        backgroundOpacity: 0,
      },
    ]);
    setSelectedId(id);
  }

  function deleteItem(id: string) {
    pushHistorySnapshot();
    setTextItems((prev) => prev.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function applyPreset(preset: PresetTemplate) {
    pushHistorySnapshot();
    setTextItems(preset.items.map((item) => ({ ...item, id: makeId() })));
    setSelectedId(null);
  }

  function duplicateItem(id: string) {
    const source = itemsRef.current.find((item) => item.id === id);
    if (!source) return;
    pushHistorySnapshot();
    const nextId = makeId();
    const clone = {
      ...source,
      id: nextId,
      x: Math.min(95, source.x + 4),
      y: Math.min(95, source.y + 4),
    };
    setTextItems((prev) => [...prev, clone]);
    setSelectedId(nextId);
  }

  function moveLayer(id: string, direction: "forward" | "backward") {
    const current = itemsRef.current;
    const index = current.findIndex((item) => item.id === id);
    if (index === -1) return;
    const targetIndex =
      direction === "forward"
        ? Math.min(current.length - 1, index + 1)
        : Math.max(0, index - 1);
    if (targetIndex === index) return;
    pushHistorySnapshot();
    const next = [...current];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    setTextItems(next);
  }

  function nudgeItem(id: string, deltaX: number, deltaY: number) {
    setTextItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              x: Math.max(0, Math.min(100, item.x + deltaX)),
              y: Math.max(0, Math.min(100, item.y + deltaY)),
            }
          : item,
      ),
    );
  }

  // Drag handlers
  function handleMouseDown(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    const container = containerRef.current;
    if (!container) return;
    const item = textItems.find((t) => t.id === id);
    if (!item) return;
    dragRef.current = {
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startItemX: item.x,
      startItemY: item.y,
      beforeItems: cloneTextItems(textItems),
    };
  }

  function handleTouchStart(e: React.TouchEvent, id: string) {
    e.stopPropagation();
    setSelectedId(id);
    const container = containerRef.current;
    if (!container) return;
    const item = textItems.find((t) => t.id === id);
    if (!item) return;
    const touch = e.touches[0];
    dragRef.current = {
      id,
      startMouseX: touch.clientX,
      startMouseY: touch.clientY,
      startItemX: item.x,
      startItemY: item.y,
      beforeItems: cloneTextItems(textItems),
    };
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragRef.current || !containerRef.current) return;
      const { id, startMouseX, startMouseY, startItemX, startItemY } = dragRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - startMouseX) / rect.width) * 100;
      const dy = ((e.clientY - startMouseY) / rect.height) * 100;
      updateItem(id, {
        x: Math.max(0, Math.min(100, startItemX + dx)),
        y: Math.max(0, Math.min(100, startItemY + dy)),
      });
    }
    function handleTouchMove(e: TouchEvent) {
      if (!dragRef.current || !containerRef.current) return;
      const { id, startMouseX, startMouseY, startItemX, startItemY } = dragRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const dx = ((touch.clientX - startMouseX) / rect.width) * 100;
      const dy = ((touch.clientY - startMouseY) / rect.height) * 100;
      updateItem(id, {
        x: Math.max(0, Math.min(100, startItemX + dx)),
        y: Math.max(0, Math.min(100, startItemY + dy)),
      });
    }
    function handleUp() {
      const d = dragRef.current;
      if (d?.beforeItems) {
        const after = itemsRef.current;
        if (JSON.stringify(after) !== JSON.stringify(d.beforeItems)) {
          setUndoStack((u) => [...u.slice(-49), d.beforeItems]);
          setRedoStack([]);
        }
      }
      dragRef.current = null;
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [textItems]);

  function undoMeme() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1]!;
    setRedoStack((r) => [...r, cloneTextItems(itemsRef.current)]);
    setUndoStack((u) => u.slice(0, -1));
    setTextItems(cloneTextItems(prev));
  }

  function redoMeme() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    setUndoStack((u) => [...u.slice(-49), cloneTextItems(itemsRef.current)]);
    setRedoStack((r) => r.slice(0, -1));
    setTextItems(cloneTextItems(next));
  }

  function drawCanvasTextItem(
    ctx: CanvasRenderingContext2D,
    item: TextItem,
    cx: number,
    cy: number,
    scaledFontSize: number,
    scaleFactor: number,
  ) {
    const lines = getTextLines(item.text);
    const lineHeight = scaledFontSize * 1.08;
    const style = item.italic ? "italic " : "";
    const weight = item.bold ? "bold " : "";

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.globalAlpha = item.opacity / 100;
    ctx.font = `${style}${weight}${scaledFontSize}px ${item.fontFamily}, sans-serif`;
    ctx.textAlign = item.align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    const widths = lines.map((line) => ctx.measureText(line || " ").width);
    const blockWidth = widths.length > 0 ? Math.max(...widths) : 0;
    const blockHeight = lineHeight * lines.length;
    const paddingX = 12 * scaleFactor;
    const paddingY = 8 * scaleFactor;

    if (item.backgroundOpacity > 0) {
      let rectX = -blockWidth / 2 - paddingX;
      if (item.align === "left") rectX = -paddingX;
      if (item.align === "right") rectX = -blockWidth - paddingX;
      const rectY = -blockHeight / 2 - paddingY;
      const rectWidth = blockWidth + paddingX * 2;
      const rectHeight = blockHeight + paddingY * 2;
      ctx.fillStyle = hexToRgba(
        item.backgroundColor,
        Math.min(1, Math.max(0, item.backgroundOpacity / 100)),
      );
      ctx.beginPath();
      ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 10 * scaleFactor);
      ctx.fill();
    }

    lines.forEach((line, index) => {
      const yOffset = (index - (lines.length - 1) / 2) * lineHeight;
      if (item.strokeWidth > 0) {
        ctx.strokeStyle = item.strokeColor;
        ctx.lineWidth = item.strokeWidth * scaleFactor * 2;
        ctx.strokeText(line, 0, yOffset);
      }
      ctx.fillStyle = item.color;
      ctx.fillText(line, 0, yOffset);
    });

    ctx.restore();
  }

  function handleDownload() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!img || !canvas || !file || !container) return;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    canvas.width = nw;
    canvas.height = nh;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);

    const displayW = container.clientWidth;
    const displayH = container.clientHeight;
    const scaleX = nw / displayW;
    const scaleY = nh / displayH;
    const scaleFactor = Math.min(scaleX, scaleY);

    for (const item of textItems) {
      if (!item.text.trim()) continue;

      const cx = (item.x / 100) * nw;
      const cy = (item.y / 100) * nh;
      const scaledFontSize = item.fontSize * scaleFactor;
      drawCanvasTextItem(ctx, item, cx, cy, scaledFontSize, scaleFactor);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const baseName = getFileNameWithoutExtension(file.name);
        downloadBlob(blob, `${baseName}-meme.png`);
        toast.success(t("meme.success"));
      } else {
        toast.error(t("meme.fail"));
      }
    }, "image/png");
  }

  function reset() {
    setFile(null);
    setImgSrc(null);
    imgRef.current = null;
    setTextItems(defaultItems());
    setSelectedId(null);
    setUndoStack([]);
    setRedoStack([]);
  }

  return (
    <ToolLayout
      toolName="Meme Generator"
      toolDescription="Add draggable text layers to images to create memes"
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-6">
        {!file ? (
          <>
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              accept={{
                "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
              }}
              formats={["JPG", "PNG", "WEBP", "GIF"]}
              label={t("meme.dropLabel")}
            />

            {/* Presets preview */}
            <div className="glass rounded-xl p-5 space-y-3">
              <p className="text-[13px] font-semibold text-t-primary">{t("meme.templates")}</p>
              <p className="text-[12px] text-t-secondary">
                {t("meme.templatesHint")}
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <span
                    key={p.labelKey}
                    className="text-[11px] px-3 py-1.5 rounded-lg border border-border bg-bg-secondary text-t-secondary"
                  >
                    {t(p.labelKey)}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
            {/* Canvas area */}
            <div className="space-y-3 lg:sticky lg:top-20">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-t-primary">{t("meme.preview")}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={undoMeme}
                    disabled={undoStack.length === 0}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-t-secondary bg-bg-secondary border border-border hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t("meme.undo")}
                  </button>
                  <button
                    type="button"
                    onClick={redoMeme}
                    disabled={redoStack.length === 0}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-t-secondary bg-bg-secondary border border-border hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t("meme.redo")}
                  </button>
                  <button
                    type="button"
                    onClick={addText}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                  >
                    {t("meme.addText")}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-t-secondary bg-bg-secondary border border-border hover:bg-white/10 transition-colors"
                  >
                    {t("meme.newImage")}
                  </button>
                </div>
              </div>

              {/* Interactive preview container */}
              <div
                ref={containerRef}
                className="relative mx-auto w-fit max-w-full select-none overflow-hidden rounded-xl border border-border bg-bg-secondary/60"
                style={{ cursor: "default" }}
                onClick={() => setSelectedId(null)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc!}
                  alt="Meme base"
                  className="mx-auto block max-h-[calc(100vh-18rem)] max-w-full object-contain"
                  draggable={false}
                />

                {/* Text overlays */}
                {textItems.map((item) => (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleMouseDown(e, item.id)}
                    onTouchStart={(e) => handleTouchStart(e, item.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(item.id);
                    }}
                    style={{
                      position: "absolute",
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                      fontSize: `${item.fontSize}px`,
                      fontFamily: `${item.fontFamily}, sans-serif`,
                      fontWeight: item.bold ? "bold" : "normal",
                      fontStyle: item.italic ? "italic" : "normal",
                      color: item.color,
                      textAlign: item.align,
                      opacity: item.opacity / 100,
                      backgroundColor:
                        item.backgroundOpacity > 0
                          ? hexToRgba(item.backgroundColor, item.backgroundOpacity / 100)
                          : "transparent",
                      WebkitTextStroke: item.strokeWidth > 0
                        ? `${item.strokeWidth}px ${item.strokeColor}`
                        : undefined,
                      cursor: "move",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.1,
                      padding: "4px 6px",
                      outline: selectedId === item.id
                        ? "2px dashed rgba(99,102,241,0.8)"
                        : "2px dashed transparent",
                      outlineOffset: "2px",
                      borderRadius: "4px",
                      userSelect: "none",
                      pointerEvents: "auto",
                    }}
                  >
                    {item.text || "\u00A0"}
                  </div>
                ))}
              </div>

              {/* Presets */}
              <div className="glass rounded-xl p-4 space-y-2">
                <p className="text-[12px] font-semibold text-t-primary">{t("meme.quickTemplates")}</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.labelKey}
                      onClick={() => applyPreset(p)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-t-secondary bg-bg-secondary border border-border hover:border-indigo-500/50 hover:text-t-primary transition-colors"
                    >
                      {t(p.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Download */}
              <button
                onClick={handleDownload}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all text-[14px]"
              >
                {t("meme.downloadMeme")}
              </button>
            </div>

            {/* Controls panel */}
            <div className="glass rounded-xl p-5 space-y-5 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1">
              {/* Text layers list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-semibold text-t-primary">{t("meme.textLayers")}</p>
                  <button
                    onClick={addText}
                    className="text-[11px] px-2.5 py-1 rounded-lg text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                  >
                    {t("meme.addLayer")}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {textItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        selectedId === item.id
                          ? "bg-indigo-500/15 border border-indigo-500/30"
                          : "bg-bg-secondary border border-border hover:bg-white/5"
                      }`}
                    >
                      <span className="flex-1 text-[12px] text-t-primary truncate">
                        {item.text || t("meme.emptyText")}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(item.id);
                        }}
                        className="text-[14px] text-t-secondary hover:text-red-400 transition-colors leading-none"
                        title={t("meme.deleteLayerTitle")}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected item controls */}
              {selectedItem ? (
                <div className="space-y-4 border-t border-border pt-4">
                  <p className="text-[12px] font-semibold text-t-secondary uppercase tracking-wide">
                    {t("meme.editSelected")}
                  </p>

                  {/* Text */}
                  <div>
                    <label className="block text-[11px] text-t-secondary mb-1">{t("meme.textLabel")}</label>
                    <textarea
                      value={selectedItem.text}
                      onChange={(e) => updateItem(selectedItem.id, { text: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-[13px] text-t-primary placeholder:text-t-secondary/50 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                      placeholder={t("meme.enterText")}
                    />
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="block text-[11px] text-t-secondary mb-1">{t("meme.fontFamily")}</label>
                    <select
                      value={selectedItem.fontFamily}
                      onChange={(e) => updateItem(selectedItem.id, { fontFamily: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-[13px] text-t-primary focus:outline-none focus:border-indigo-500/50 transition-colors"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f} style={{ fontFamily: f }}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bold / Italic */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateItem(selectedItem.id, { bold: !selectedItem.bold })}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-colors border ${
                        selectedItem.bold
                          ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                          : "bg-bg-secondary border-border text-t-secondary hover:bg-white/5"
                      }`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => updateItem(selectedItem.id, { italic: !selectedItem.italic })}
                      className={`flex-1 py-2 rounded-lg text-[12px] font-bold italic transition-colors border ${
                        selectedItem.italic
                          ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                          : "bg-bg-secondary border-border text-t-secondary hover:bg-white/5"
                      }`}
                    >
                      I
                    </button>
                  </div>

                  {/* Font Size */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[11px] text-t-secondary">{t("meme.fontSize")}</label>
                      <span className="text-[11px] font-mono text-t-secondary">{selectedItem.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={120}
                      step={1}
                      value={selectedItem.fontSize}
                      onChange={(e) => updateItem(selectedItem.id, { fontSize: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[11px] text-t-secondary">{t("meme.rotation")}</label>
                      <span className="text-[11px] font-mono text-t-secondary">{selectedItem.rotation}&deg;</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={selectedItem.rotation}
                      onChange={(e) => updateItem(selectedItem.id, { rotation: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* Stroke Width */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[11px] text-t-secondary">{t("meme.strokeWidth")}</label>
                      <span className="text-[11px] font-mono text-t-secondary">{selectedItem.strokeWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      step={1}
                      value={selectedItem.strokeWidth}
                      onChange={(e) => updateItem(selectedItem.id, { strokeWidth: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-t-secondary mb-1">{t("meme.textColor")}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedItem.color}
                          onChange={(e) => updateItem(selectedItem.id, { color: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-bg-secondary p-0.5"
                        />
                        <span className="text-[10px] font-mono text-t-secondary">{selectedItem.color}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-t-secondary mb-1">{t("meme.strokeColor")}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedItem.strokeColor}
                          onChange={(e) => updateItem(selectedItem.id, { strokeColor: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-bg-secondary p-0.5"
                        />
                        <span className="text-[10px] font-mono text-t-secondary">{selectedItem.strokeColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Alignment */}
                  <div>
                    <label className="block text-[11px] text-t-secondary mb-1">{t("meme.alignment")}</label>
                    <div className="flex gap-1">
                      {(["left", "center", "right"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => updateItem(selectedItem.id, { align: a })}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors border ${
                            selectedItem.align === a
                              ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                              : "bg-bg-secondary border-border text-t-secondary hover:bg-white/5"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-bg-secondary/70 p-3 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-t-secondary">
                      {editorCopy.layerTools}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => duplicateItem(selectedItem.id)}
                        className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-[12px] font-medium text-t-primary transition-colors hover:border-indigo-500/40"
                      >
                        {editorCopy.duplicate}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayer(selectedItem.id, "forward")}
                        className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-[12px] font-medium text-t-primary transition-colors hover:border-indigo-500/40"
                      >
                        {editorCopy.bringForward}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayer(selectedItem.id, "backward")}
                        className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-[12px] font-medium text-t-primary transition-colors hover:border-indigo-500/40"
                      >
                        {editorCopy.sendBackward}
                      </button>
                      <div className="rounded-lg border border-border bg-bg-primary px-3 py-2 text-[11px] text-t-secondary">
                        {editorCopy.quickMove}
                      </div>
                    </div>
                    <div className="mx-auto grid w-28 grid-cols-3 gap-2">
                      <span />
                      <button
                        type="button"
                        onClick={() => {
                          pushHistorySnapshot();
                          nudgeItem(selectedItem.id, 0, -1);
                        }}
                        className="rounded-lg border border-border bg-bg-primary px-2 py-2 text-[12px] text-t-primary transition-colors hover:border-indigo-500/40"
                      >
                        ↑
                      </button>
                      <span />
                      <button
                        type="button"
                        onClick={() => {
                          pushHistorySnapshot();
                          nudgeItem(selectedItem.id, -1, 0);
                        }}
                        className="rounded-lg border border-border bg-bg-primary px-2 py-2 text-[12px] text-t-primary transition-colors hover:border-indigo-500/40"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          pushHistorySnapshot();
                          updateItem(selectedItem.id, { x: 50, y: 50 });
                        }}
                        className="rounded-lg border border-border bg-bg-primary px-2 py-2 text-[11px] text-t-primary transition-colors hover:border-indigo-500/40"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          pushHistorySnapshot();
                          nudgeItem(selectedItem.id, 1, 0);
                        }}
                        className="rounded-lg border border-border bg-bg-primary px-2 py-2 text-[12px] text-t-primary transition-colors hover:border-indigo-500/40"
                      >
                        →
                      </button>
                      <span />
                      <button
                        type="button"
                        onClick={() => {
                          pushHistorySnapshot();
                          nudgeItem(selectedItem.id, 0, 1);
                        }}
                        className="rounded-lg border border-border bg-bg-primary px-2 py-2 text-[12px] text-t-primary transition-colors hover:border-indigo-500/40"
                      >
                        ↓
                      </button>
                      <span />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[11px] text-t-secondary">{editorCopy.xPosition}</label>
                      <span className="text-[11px] font-mono text-t-secondary">{Math.round(selectedItem.x)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={selectedItem.x}
                      onChange={(e) => updateItem(selectedItem.id, { x: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[11px] text-t-secondary">{editorCopy.yPosition}</label>
                      <span className="text-[11px] font-mono text-t-secondary">{Math.round(selectedItem.y)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={selectedItem.y}
                      onChange={(e) => updateItem(selectedItem.id, { y: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[11px] text-t-secondary">{editorCopy.opacity}</label>
                      <span className="text-[11px] font-mono text-t-secondary">{selectedItem.opacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={1}
                      value={selectedItem.opacity}
                      onChange={(e) => updateItem(selectedItem.id, { opacity: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-t-secondary mb-1">{editorCopy.textBackground}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedItem.backgroundColor}
                          onChange={(e) => updateItem(selectedItem.id, { backgroundColor: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-bg-secondary p-0.5"
                        />
                        <span className="text-[10px] font-mono text-t-secondary">{selectedItem.backgroundColor}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-[11px] text-t-secondary">{editorCopy.backgroundOpacity}</label>
                        <span className="text-[11px] font-mono text-t-secondary">{selectedItem.backgroundOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={selectedItem.backgroundOpacity}
                        onChange={(e) => updateItem(selectedItem.id, { backgroundOpacity: Number(e.target.value) })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteItem(selectedItem.id)}
                    className="w-full py-2 rounded-lg text-[12px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    {t("meme.deleteThisLayer")}
                  </button>
                </div>
              ) : (
                <div className="border-t border-border pt-4">
                  <p className="text-[12px] text-t-secondary text-center py-4">
                    {t("meme.selectHint")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
