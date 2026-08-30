import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MARGIN = 54;
const LINE_HEIGHT = 1.45;

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter(
      (cell, index, arr) =>
        !(index === 0 && cell === "") && !(index === arr.length - 1 && cell === "")
    );
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim());
}

function stripBoldMarkers(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

function briefingFilename(content: string): string {
  const titleLine = content.split("\n").find((line) => line.startsWith("# "));
  if (!titleLine) return "executive-briefing.pdf";

  const slug = titleLine
    .slice(2)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug ? `${slug}.pdf` : "executive-briefing.pdf";
}

export function downloadBriefingPdf(content: string, filename?: string): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const addWrappedText = (
    text: string,
    fontSize: number,
    style: "normal" | "bold" | "italic" = "normal",
    extraSpacing = 0
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    const wrapped = doc.splitTextToSize(stripBoldMarkers(text), contentWidth) as string[];
    const blockHeight = wrapped.length * fontSize * LINE_HEIGHT;
    ensureSpace(blockHeight);
    doc.text(wrapped, MARGIN, y);
    y += blockHeight + extraSpacing;
  };

  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      addWrappedText(line.slice(2), 20, "bold", 8);
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      y += 10;
      addWrappedText(line.slice(3), 14, "bold", 6);
      i++;
      continue;
    }

    if (line.startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(parseTableRow(lines[i]).map(stripBoldMarkers));
        i++;
      }

      ensureSpace(48);
      autoTable(doc, {
        startY: y,
        head: [headers],
        body: rows,
        margin: { left: MARGIN, right: MARGIN },
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 6,
          lineColor: [210, 210, 210],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [14, 116, 144],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: "grid",
      });

      y = ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y) + 16;
      continue;
    }

    if (line.startsWith("- ")) {
      addWrappedText(`• ${line.slice(2)}`, 10, "normal", 4);
      i++;
      continue;
    }

    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      y += 12;
      addWrappedText(line.slice(1, -1), 9, "italic", 0);
      i++;
      continue;
    }

    if (line.trim() === "") {
      y += 6;
      i++;
      continue;
    }

    addWrappedText(line, 10, "normal", 6);
    i++;
  }

  doc.save(filename ?? briefingFilename(content));
}
