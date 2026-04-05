"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type IndentSize = "2" | "4";

function formatXML(xml: string, indentSize: number): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    throw new Error(errorNode.textContent || "XML parse error");
  }

  const indent = " ".repeat(indentSize);

  function serialize(node: Node, level: number): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").trim();
      if (!text) return "";
      return indent.repeat(level) + text;
    }

    if (node.nodeType === Node.COMMENT_NODE) {
      return indent.repeat(level) + "<!--" + node.textContent + "-->";
    }

    if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      const pi = node as ProcessingInstruction;
      return indent.repeat(level) + "<?" + pi.target + " " + pi.data + "?>";
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName;
      let attrs = "";
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        attrs += ` ${attr.name}="${attr.value}"`;
      }

      const children = Array.from(el.childNodes);
      const childTexts = children
        .map((child) => serialize(child, level + 1))
        .filter((t) => t !== "");

      if (childTexts.length === 0) {
        return indent.repeat(level) + `<${tag}${attrs}/>`;
      }

      if (childTexts.length === 1 && children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
        const textContent = (children[0].textContent || "").trim();
        return indent.repeat(level) + `<${tag}${attrs}>${textContent}</${tag}>`;
      }

      const open = indent.repeat(level) + `<${tag}${attrs}>`;
      const close = indent.repeat(level) + `</${tag}>`;
      return [open, ...childTexts, close].join("\n");
    }

    if (node.nodeType === Node.DOCUMENT_NODE) {
      const children = Array.from(node.childNodes);
      return children.map((child) => serialize(child, level)).filter((t) => t !== "").join("\n");
    }

    return "";
  }

  let result = serialize(doc, 0);

  if (xml.trimStart().startsWith("<?xml")) {
    const declMatch = xml.match(/<\?xml[^?]*\?>/);
    if (declMatch && !result.startsWith("<?xml")) {
      result = declMatch[0] + "\n" + result;
    }
  }

  return result;
}

function minifyXML(xml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    throw new Error(errorNode.textContent || "XML parse error");
  }

  const serializer = new XMLSerializer();
  let result = serializer.serializeToString(doc);
  result = result.replace(/>\s+</g, "><");
  result = result.replace(/\n\s*/g, "");
  return result;
}

function validateXML(xml: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    return errorNode.textContent || "XML parse error";
  }
  return null;
}

export default function XMLFormatterPage() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [indentSize, setIndentSize] = useState<IndentSize>("2");
  const [validationMessage, setValidationMessage] = useState("");

  const handleFormat = () => {
    if (!input.trim()) {
      setError(t("xml.enterXml"));
      setOutput("");
      setValidationMessage("");
      return;
    }
    try {
      const formatted = formatXML(input, parseInt(indentSize));
      setOutput(formatted);
      setError("");
      setValidationMessage("");
      toast.success(t("xml.formatSuccess"));
    } catch (e) {
      const message = e instanceof Error ? e.message : t("xml.invalidXml");
      setError(message);
      setOutput("");
      setValidationMessage("");
      toast.error(t("xml.invalidXml"));
    }
  };

  const handleMinify = () => {
    if (!input.trim()) {
      setError(t("xml.enterXml"));
      setOutput("");
      setValidationMessage("");
      return;
    }
    try {
      const minified = minifyXML(input);
      setOutput(minified);
      setError("");
      setValidationMessage("");
      toast.success(t("xml.minifySuccess"));
    } catch (e) {
      const message = e instanceof Error ? e.message : t("xml.invalidXml");
      setError(message);
      setOutput("");
      setValidationMessage("");
      toast.error(t("xml.invalidXml"));
    }
  };

  const handleValidate = () => {
    if (!input.trim()) {
      setError(t("xml.enterXml"));
      setOutput("");
      setValidationMessage("");
      return;
    }
    const validationError = validateXML(input);
    if (validationError) {
      setError(validationError);
      setValidationMessage("");
      setOutput("");
      toast.error(t("xml.invalidXml"));
    } else {
      setError("");
      setOutput("");
      setValidationMessage(t("xml.validXml"));
      toast.success(t("xml.validXml"));
    }
  };

  const copyToClipboard = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
    setError("");
    setValidationMessage("");
  };

  return (
    <ToolLayout
      toolName="XML Formatter"
      toolDescription="Format, minify, and validate XML data"
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="glass rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-t-secondary">{t("ui.indent")}</span>
              <div className="flex gap-1.5">
                {(["2", "4"] as IndentSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setIndentSize(size)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      indentSize === size
                        ? "bg-accent text-white"
                        : "text-t-secondary hover:text-t-primary bg-bg-secondary border border-border"
                    }`}
                  >
                    {size} {t("ui.spaces")}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={clearAll}
              className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
            >
              {t("ui.clear")}
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm text-t-secondary mb-2">{t("xml.xmlInput")}</label>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
              setValidationMessage("");
            }}
            placeholder='<root><item id="1"><name>Example</name></item></root>'
            rows={10}
            spellCheck={false}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleFormat}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg transition-all"
          >
            {t("ui.format")}
          </button>
          <button
            onClick={handleMinify}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg transition-all"
          >
            {t("ui.minify")}
          </button>
          <button
            onClick={handleValidate}
            className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
          >
            {t("ui.validate")}
          </button>
        </div>

        {/* Validation Success */}
        {validationMessage && (
          <div className="glass rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-emerald-400">{validationMessage}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass rounded-xl p-4 border border-red-500/20 bg-red-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-400">{t("xml.invalidXml")}</p>
                <p className="text-xs text-red-400/70 mt-1 font-mono">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Output */}
        {output && (
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-t-secondary">{t("ui.output")}</label>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
              >
                {t("ui.copy")}
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              rows={10}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary font-mono text-sm resize-y"
            />
            <p className="text-xs text-t-tertiary mt-2">
              {output.length.toLocaleString()} {t("ui.characters")}
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
