import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter(
      (cell, index, arr) =>
        !(index === 0 && cell === "") && !(index === arr.length - 1 && cell === ""),
    );
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim());
}

export function BriefingMarkdown({
  content,
  compact = false,
}: {
  content: string;
  compact?: boolean;
}) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const h1Class = compact
    ? "text-lg font-semibold tracking-tight text-foreground mb-2"
    : "text-2xl font-semibold tracking-tight text-foreground mb-2";
  const h2Class = compact
    ? "text-sm font-semibold text-primary mt-5 mb-2 first:mt-0"
    : "text-base font-semibold text-primary mt-8 mb-3";
  const h3Class = compact
    ? "text-sm font-medium text-foreground mt-4 mb-1.5"
    : "text-sm font-semibold text-foreground mt-6 mb-2";

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key++} className={h1Class}>
          {renderInline(line.slice(2))}
        </h1>,
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key++} className={h2Class}>
          {renderInline(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={key++} className={h3Class}>
          {renderInline(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }

    if (line.startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-4 overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h} className="text-xs font-medium">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.join("-")}>
                  {row.map((cell, ci) => (
                    <TableCell key={`${row[0]}-${ci}`} className="text-sm">
                      {renderInline(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>,
      );
      continue;
    }

    if (line.startsWith("- ")) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("- ")) {
        const item = lines[i].trimStart().slice(2);
        items.push(
          <li key={key++} className="text-sm leading-relaxed text-muted-foreground">
            {renderInline(item)}
          </li>,
        );
        i++;
      }
      blocks.push(
        <ul key={key++} className="ml-4 list-disc space-y-1.5">
          {items}
        </ul>,
      );
      continue;
    }

    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      blocks.push(
        <p
          key={key++}
          className="mt-6 border-t border-border pt-4 text-xs italic text-muted-foreground"
        >
          {line.slice(1, -1)}
        </p>,
      );
      i++;
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    blocks.push(
      <p key={key++} className="text-sm leading-relaxed text-muted-foreground">
        {renderInline(line)}
      </p>,
    );
    i++;
  }

  return <div className="space-y-2">{blocks}</div>;
}
