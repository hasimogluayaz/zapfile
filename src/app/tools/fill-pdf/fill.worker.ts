/// <reference lib="webworker" />
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const w = self as unknown as DedicatedWorkerGlobalScope;

export interface FillRequest {
  bytes: ArrayBuffer;
  values: Record<string, string | boolean>;
  flatten: boolean;
  font: ArrayBuffer;
}

w.onmessage = async (e: MessageEvent<FillRequest>) => {
  const { bytes, values, flatten, font } = e.data;
  try {
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch {
      w.postMessage({ type: "error", code: "load" });
      return;
    }
    doc.registerFontkit(fontkit);
    const form = doc.getForm();
    for (const field of form.getFields()) {
      const name = field.getName();
      if (!(name in values)) continue;
      const v = values[name]!;
      try {
        if (field instanceof PDFTextField) {
          // A missing, "auto" (0) or oversized font on a multi-line box makes a few words huge: use
          // normal text size. Checked before setText, which writes the auto-computed size into the DA.
          if (field.isMultiline()) {
            const auto = (da: string | undefined) => {
              const m = da ? /([\d.]+)\s+Tf/.exec(da) : null;
              const size = m ? Number(m[1]) : 0;
              return size === 0 || size > 14;
            };
            const widgets = field.acroField.getWidgets();
            if (auto(field.acroField.getDefaultAppearance()) && widgets.every((wd) => auto(wd.getDefaultAppearance()))) {
              field.acroField.setDefaultAppearance("/Helv 10 Tf 0 g");
              for (const wd of widgets) wd.setDefaultAppearance("/Helv 10 Tf 0 g");
            }
          }
          field.setText(String(v));
        }         else if (field instanceof PDFCheckBox) {
          if (v) field.check();
          else field.uncheck();
        }
        else if (field instanceof PDFRadioGroup) {
          // pdf.js reports a widget's appearance-state name, which for /Opt groups is the option index.
          const opts = field.getOptions();
          const pick = typeof v === "string" && v ? (opts.includes(v) ? v : /^\d+$/.test(v) ? opts[+v] : undefined) : undefined;
          if (pick) field.select(pick);
          else field.clear();
        } else if (field instanceof PDFDropdown) {
          if (typeof v === "string" && v) field.select(v, !field.getOptions().includes(v));
          else field.clear();
        } else if (field instanceof PDFOptionList) {
          if (typeof v === "string" && v) field.select(v);
          else field.clear();
        }
      } catch {
        /* a value the field can't take (e.g. too long): keep the original */
      }
    }
    // Draw appearances with a Unicode font so Turkish, Greek and Cyrillic text shows everywhere.
    const uni = await doc.embedFont(font, { subset: true });
    form.updateFieldAppearances(uni);
    if (flatten) form.flatten();
    const out = await doc.save({ useObjectStreams: true });
    w.postMessage({ type: "done", bytes: out, kind: "pdf" }, [out.buffer]);
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
