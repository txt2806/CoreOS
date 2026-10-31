"use client";

/**
 * The API takes `employees: { id, name }[]` for every bulk write, and this module
 * is not allowed to read the employee directory from another feature. Typing one
 * person per line is therefore the honest entry point; the format is announced in
 * the field hint so the copy and the parser cannot drift apart.
 */
export interface ParsedEmployee {
  id: string;
  name: string;
}

export function parseEmployeeLines(raw: string): {
  employees: ParsedEmployee[];
  badLines: number[];
} {
  const employees: ParsedEmployee[] = [];
  const badLines: number[] = [];
  const seen = new Set<string>();

  raw
    .split(/\r?\n/)
    .forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const separator = trimmed.includes("|") ? "|" : trimmed.includes("\t") ? "\t" : null;
      if (!separator) {
        badLines.push(index + 1);
        return;
      }
      const [rawId, ...rest] = trimmed.split(separator);
      const id = (rawId ?? "").trim();
      const name = rest.join(separator).trim();
      if (!id || !name || id.length > 64 || name.length > 200) {
        badLines.push(index + 1);
        return;
      }
      if (seen.has(id)) return;
      seen.add(id);
      employees.push({ id, name });
    });

  return { employees, badLines };
}

export const EMPLOYEE_LINES_HINT = "Mỗi dòng một người, dạng: mã nhân sự | tên nhân sự";
export const EMPLOYEE_LINES_PLACEHOLDER = "EMP-0142 | Nguyễn Minh Anh\nEMP-0143 | Trần Thu Hà";
