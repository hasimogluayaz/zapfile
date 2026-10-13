import {
  Droplets,
  LayoutGrid,
  MonitorPlay,
  Presentation,
  Sheet,
  AlignLeft,
  ArrowDownUp,
  Binary,
  Blend,
  Braces,
  Brush,
  Calculator,
  CalendarClock,
  Code,
  Contrast,
  Crop,
  Droplet,
  Eraser,
  FileArchive,
  FileImage,
  FileJson,
  FileLock,
  FilePen,
  FileSpreadsheet,
  FileStack,
  FileText,
  FileType,
  Files,
  Film,
  Fingerprint,
  Grid2x2,
  Hash,
  ImageDown,
  Images,
  KeyRound,
  Laugh,
  Link2,
  ListOrdered,
  type LucideIcon,
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
  SquareCode,
  Sparkles,
  Stamp,
  Text,
  Volume2,
  Wand2,
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
  "pdf-to-word": FilePen,
  "pdf-to-excel": FileSpreadsheet,
  "word-to-pdf": FileType,
  "excel-to-pdf": Sheet,
  "powerpoint-to-pdf": Presentation,
  "pdf-to-powerpoint": MonitorPlay,
  "organize-pdf": LayoutGrid,
  "watermark-pdf": Droplets,
  "pdf-compress": FileArchive,
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
  "background-remover": Eraser,
  "color-dropper": Pipette,
  "photo-filter": Wand2,
  // Video & audio
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
  "jwt-decoder": ShieldCheck,
  "uuid-generator": Hash,
  "css-minifier": Brush,
  "base-converter": Calculator,
  "color-palette": Blend,
  "color-contrast": Contrast,
  "text-case": ArrowDownUp,
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

