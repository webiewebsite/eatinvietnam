/**
 * Minimal .xlsx reader for the restaurant sheet (#48): cell values only — no styles,
 * formulas or merged cells. Zero dependencies: a zip directory walk + zlib inflate and a
 * few regexes over SpreadsheetML. Node only (Buffer, zlib); never import it in the client.
 */
import { inflateRawSync } from 'node:zlib';

export type Cell = string | number | boolean | null;
/** Rows by 1-based row number; each row is a 0-based array of cells (A = 0). */
export type SheetRows = Map<number, Cell[]>;

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

/** File name → uncompressed bytes for every entry of a zip archive. */
export function unzip(buf: Buffer): Map<string, Buffer> {
  // End-of-central-directory record: last 22 bytes + an optional comment (≤ 64 KB).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Không phải file .xlsx (zip) hợp lệ');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== CENTRAL) throw new Error('Thư mục zip bị hỏng');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    if (buf.readUInt32LE(local) !== LOCAL) throw new Error(`Zip entry hỏng: ${name}`);
    // Sizes in the local header may be zero (data descriptor); the central directory is authoritative.
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + compSize);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data));
    else throw new Error(`Kiểu nén zip không hỗ trợ (${method}): ${name}`);
  }
  return out;
}

export function decodeXml(s: string): string {
  return s
    .replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e: string) => {
      const k = e.toLowerCase();
      if (k === 'lt') return '<';
      if (k === 'gt') return '>';
      if (k === 'amp') return '&';
      if (k === 'quot') return '"';
      if (k === 'apos') return "'";
      const code = k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    })
    // OOXML escapes control characters as _xHHHH_ (e.g. _x000D_ for CR).
    .replace(/_x([0-9a-f]{4})_/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

/** Concatenated text of every <t> run, skipping phonetic hints (<rPh>). */
const runText = (xml: string) =>
  [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1]!)).join('');

const attr = (attrs: string, name: string) => attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

/** "AB12" → 27 (0-based column index). */
export function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? '';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export class Workbook {
  private files: Map<string, Buffer>;
  private shared: string[];
  /** Sheet name → path inside the archive. */
  readonly sheets: Map<string, string>;

  constructor(buf: Buffer) {
    this.files = unzip(buf);
    const text = (path: string) => this.files.get(path)?.toString('utf8');
    const wb = text('xl/workbook.xml');
    if (!wb) throw new Error('Không thấy xl/workbook.xml — file không phải .xlsx');
    const rels = text('xl/_rels/workbook.xml.rels') ?? '';
    const targets = new Map(
      [...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => [attr(m[1]!, 'Id'), attr(m[1]!, 'Target')] as const),
    );
    this.sheets = new Map();
    for (const m of wb.matchAll(/<sheet\b([^>]*)\/?>/g)) {
      const name = decodeXml(attr(m[1]!, 'name') ?? '');
      const target = targets.get(attr(m[1]!, 'r:id'));
      if (!target) continue;
      this.sheets.set(name, target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`);
    }
    const sst = text('xl/sharedStrings.xml') ?? '';
    this.shared = [...sst.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => runText(m[1]!));
  }

  rows(sheetName: string): SheetRows {
    const path = this.sheets.get(sheetName);
    const xml = path && this.files.get(path)?.toString('utf8');
    if (!xml) throw new Error(`Không thấy sheet "${sheetName}"`);
    const rows: SheetRows = new Map();
    for (const rm of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const r = Number(attr(rm[1]!, 'r'));
      const cells: Cell[] = [];
      let next = 0;
      for (const cm of (rm[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = attr(cm[1]!, 'r');
        const col = ref ? columnIndex(ref) : next;
        next = col + 1;
        cells[col] = this.value(attr(cm[1]!, 't'), cm[2] ?? '');
      }
      for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = null;
      if (Number.isFinite(r)) rows.set(r, cells);
    }
    return rows;
  }

  private value(type: string | undefined, inner: string): Cell {
    if (type === 'inlineStr') return runText(inner) || null;
    const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
    if (v == null) return null;
    switch (type) {
      case 's':
        return this.shared[Number(v)] ?? null;
      case 'str':
      case 'e':
        return decodeXml(v);
      case 'b':
        return v === '1';
      default: {
        const n = Number(v);
        return Number.isFinite(n) ? n : decodeXml(v);
      }
    }
  }
}

/** Excel serial day (1900 date system) → "YYYY-MM-DD". */
export function excelDate(serial: number): string {
  const ms = Math.round((serial - 25569) * 86_400_000);
  return new Date(ms).toISOString().slice(0, 10);
}
