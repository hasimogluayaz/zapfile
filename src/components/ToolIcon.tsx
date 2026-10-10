import {
  AlignLeft,
  ArrowDownUp,
  AudioLines,
  Binary,
  Blend,
  Braces,
  Brush,
  Calculator,
  CaseSensitive,
  CalendarClock,
  Clock,
  Code,
  Columns2,
  Contrast,
  Crop,
  Droplet,
  Eraser,
  FileArchive,
  FileCode,
  FileImage,
  FileJson,
  FileLock,
  FileStack,
  FileText,
  FileType,
  Files,
  Film,
  Fingerprint,
  Gauge,
  Globe,
  Grid2x2,
  Hash,
  ImageDown,
  Images,
  KeyRound,
  Keyboard,
  Laugh,
  Link2,
  ListOrdered,
  type LucideIcon,
  Monitor,
  Palette,
  Pipette,
  QrCode,
  Regex,
  RotateCw,
  Ruler,
  ScanLine,
  ScanText,
  Scaling,
  ScissorsLineDashed,
  Shapes,
  ShieldCheck,
  Shuffle,
  Smile,
  SquareCode,
  Sparkles,
  Stamp,
  Table,
  Text,
  Timer,
  TimerReset,
  Type,
  UserRound,
  Volume2,
  Wand2,
  Workflow,
  Mic,
  Wrench,
  Video,
  Repeat,
  FileDiff,
  Merge,
} from "lucide-react";
import type { ToolCategory } from "@/lib/tools";

const toolIcons: Record<string, LucideIcon> = {
  // PDF
  "merge-pdf": Merge,
  "split-pdf": ScissorsLineDashed,
  "pdf-to-images": FileImage,
  "rotate-pdf": RotateCw,
  "pdf-page-numbers": ListOrdered,
  "pdf-encrypt": FileLock,
  "pdf-text-extractor": ScanText,
  "pdf-compress": FileArchive,
  "html-to-pdf": FileCode,
  // Image
  "compress-image": ImageDown,
  "resize-image": Scaling,
  "convert-image": Repeat,
  "crop-image": Crop,
  "rotate-image": RotateCw,
  "watermark-image": Stamp,
  "image-to-pdf": FileStack,
  "blur-image": Droplet,
  "favicon-generator": Shapes,
  "exif-viewer": ScanLine,
  "image-collage": Grid2x2,
  "meme-generator": Laugh,
  "image-to-base64": Binary,
  "svg-to-png": FileType,
  "image-pipeline": Workflow,
  "background-remover": Eraser,
  "color-dropper": Pipette,
  "photo-filter": Wand2,
  "image-compare": Columns2,
  // Video & audio
  "audio-waveform": AudioLines,
  "video-to-gif": Film,
  "audio-recorder": Mic,
  "text-to-speech": Volume2,
  // Utility
  "qr-generator": QrCode,
  "qr-scanner": ScanLine,
  "base64-encode": Binary,
  "color-picker": Palette,
  "json-formatter": FileJson,
  "hash-generator": Fingerprint,
  "word-counter": AlignLeft,
  "password-generator": KeyRound,
  "diff-checker": FileDiff,
  "markdown-editor": FileText,
  "url-encoder": Link2,
  "timestamp-converter": CalendarClock,
  "lorem-ipsum": Text,
  "regex-tester": Regex,
  "csv-json": Braces,
  "xml-formatter": Code,
  "yaml-formatter": SquareCode,
  "unit-converter": Ruler,
  "pomodoro-timer": TimerReset,
  "jwt-decoder": ShieldCheck,
  "uuid-generator": Hash,
  "css-minifier": Brush,
  "base-converter": Calculator,
  "typing-speed-test": Keyboard,
  "color-palette": Blend,
  "ascii-art": Type,
  "color-contrast": Contrast,
  "csv-viewer": Table,
  "ip-address": Globe,
  "screen-resolution": Monitor,
  "internet-speed": Gauge,
  "fake-identity": UserRound,
  "password-strength": ShieldCheck,
  "emoji-picker": Smile,
  "character-counter": CaseSensitive,
  "text-case": ArrowDownUp,
  "random-color": Shuffle,
  stopwatch: Timer,
  "world-clock": Clock,
};

export const categoryIcons: Record<ToolCategory, LucideIcon> = {
  pdf: Files,
  image: Images,
  video: Video,
  utility: Wrench,
};

export function iconForTool(slug: string): LucideIcon {
  return toolIcons[slug] ?? Sparkles;
}

export default function ToolIcon({
  slug,
  className = "h-5 w-5",
  strokeWidth = 1.75,
}: {
  slug: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = iconForTool(slug);
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export function CategoryIcon({
  category,
  className = "h-4 w-4",
  strokeWidth = 1.75,
}: {
  category: ToolCategory;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = categoryIcons[category];
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

