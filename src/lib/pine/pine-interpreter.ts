// Pine Script v5/v6 Parser, Metadata Extractor & Bar-by-Bar Strategy Interpreter
// Pure TypeScript — runs identically on VPS (24x7 live signal alerts) and Next.js (chart preview & validation).

export interface PineCandle {
  time: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PineExtractedMetadata {
  detectedTitle?: string;
  detectedInstrument?: string;
  detectedTimeframe?: string;
  detectedWinRate?: number;
  detectedProfitFactor?: number;
  detectedMaxDrawdown?: number;
  detectedNetReturn?: number;
  detectedTotalTrades?: number;
  detectedTpDist?: number;
  detectedSlDist?: number;
  detectedIndicators: string[];
  pineVersion?: string;
  parseValid: boolean;
  parseError?: string;
}

export interface PineSignalEvent {
  barIndex: number;
  barTime: number;
  signalType: "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT";
  direction: "LONG" | "SHORT";
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  targetPrice?: number;
  comment?: string;
}

export interface PineClosedTrade {
  entryBarIndex: number;
  exitBarIndex: number;
  entryTime: number;
  exitTime: number;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  profit: number;
  size: number; // +1 long, -1 short
  tpPrice?: number;
  slPrice?: number;
  outcome: "TP" | "SL" | "EXIT";
}

export interface PineExecutionResult {
  success: boolean;
  error?: string;
  strategyName?: string;
  events: PineSignalEvent[];
  closedTrades: PineClosedTrade[];
  finalPosition: {
    size: number; // 0 flat, >0 long, <0 short
    entryPrice: number;
    entryTime: number;
    entryBarIndex: number;
    currTP?: number;
    currSL?: number;
  };
  plots: Array<{ name: string; color?: string; values: Array<number | null> }>;
}

// ============================================================================
// 1. METADATA AUTO-EXTRACTOR (zero config needed when pasting Pine scripts)
// ============================================================================

export function extractPineMetadata(code: string): PineExtractedMetadata {
  const result: PineExtractedMetadata = {
    detectedIndicators: [],
    parseValid: false,
  };

  if (!code || !code.trim()) {
    result.parseError = "Pine Script code is empty.";
    return result;
  }

  const verMatch = code.match(/\/\/@version\s*=\s*(\d+)/i);
  if (verMatch) result.pineVersion = `v${verMatch[1]}`;

  const titleMatch =
    code.match(/(?:strategy|indicator)\s*\([\s\S]*?title\s*=\s*["']([^"']+)["']/i) ||
    code.match(/(?:strategy|indicator)\s*\(\s*["']([^"']+)["']/i);
  if (titleMatch) result.detectedTitle = titleMatch[1].trim();

  // Instrument detection
  const instMatch = code.match(/(?:FOREXCOM:|OANDA:|FX_IDC:|BINANCE:)?\b(XAUUSD|EURUSD|GBPUSD|USDJPY|NAS100|US30|SPX500|BTCUSD|ETHUSD)\b/i);
  if (instMatch) result.detectedInstrument = instMatch[1].toUpperCase();

  // Timeframe detection
  if (/timeframe\.multiplier\s*==\s*(\d+)/.test(code)) {
    const m = code.match(/timeframe\.multiplier\s*==\s*(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      result.detectedTimeframe = n === 60 ? "H1" : n === 240 ? "H4" : `M${n}`;
    }
  } else {
    const tfComment = code.match(/(?:Timeframe|STRICTLY)\s*[:\-]?\s*(?:STRICTLY\s*)?(5M|15M|30M|1H|4H|1D|M5|M15|M30|H1|H4|D1)/i);
    if (tfComment) {
      const raw = tfComment[1].toUpperCase();
      if (raw === "5M" || raw === "M5") result.detectedTimeframe = "M5";
      else if (raw === "15M" || raw === "M15") result.detectedTimeframe = "M15";
      else if (raw === "30M" || raw === "M30") result.detectedTimeframe = "M30";
      else if (raw === "1H" || raw === "H1") result.detectedTimeframe = "H1";
      else if (raw === "4H" || raw === "H4") result.detectedTimeframe = "H4";
      else if (raw === "1D" || raw === "D1") result.detectedTimeframe = "D1";
    }
  }

  // Optional header metrics extraction from comments if present
  const wrMatch = code.match(/Win\s*Rate\s*[:\-]\s*([\d.]+)\s*%/i);
  if (wrMatch) result.detectedWinRate = parseFloat(wrMatch[1]);

  const pfMatch = code.match(/Profit\s*Factor\s*[:\-]\s*([\d.]+)/i);
  if (pfMatch) result.detectedProfitFactor = parseFloat(pfMatch[1]);

  const ddMatch = code.match(/(?:Max\s*(?:Closed\s*)?Drawdown|Max\s*DD)\s*[:\-]\s*[^0-9]*([\d.]+)\s*%/i);
  if (ddMatch) result.detectedMaxDrawdown = parseFloat(ddMatch[1]);

  const retMatch = code.match(/(?:Total\s*)?Net\s*Return\s*[:\-]\s*[^+\-\d]*(?:\+\$[\d.,]+\s*\()?([+-]?[\d.]+)\s*[R%]/i);
  if (retMatch) result.detectedNetReturn = parseFloat(retMatch[1]);

  const tradesMatch = code.match(/over\s+(\d+)\s+Trades/i);
  if (tradesMatch) result.detectedTotalTrades = parseInt(tradesMatch[1], 10);

  // Extract TP / SL inputs if declared
  const tpMatch = code.match(/(?:tpDist\w*|takeProfit\w*)\s*=\s*input\.(?:float|int)\s*\(\s*([\d.]+)/i);
  if (tpMatch) result.detectedTpDist = parseFloat(tpMatch[1]);

  const slMatch = code.match(/(?:slDist\w*|stopLoss\w*)\s*=\s*input\.(?:float|int)\s*\(\s*([\d.]+)/i);
  if (slMatch) result.detectedSlDist = parseFloat(slMatch[1]);

  // Indicators used
  const indChecks: Array<[RegExp, string]> = [
    [/ta\.ema\b/i, "EMA"],
    [/ta\.sma\b/i, "SMA"],
    [/ta\.stdev\b|ta\.bb\b/i, "Bollinger Bands"],
    [/ta\.atr\b/i, "ATR"],
    [/ta\.rsi\b/i, "RSI"],
    [/ta\.macd\b/i, "MACD"],
    [/ta\.supertrend\b/i, "SuperTrend"],
    [/ta\.kc\b|keltner/i, "Keltner"],
    [/ta\.crossover\b|ta\.crossunder\b/i, "Crossover"],
    [/ta\.stoch\b/i, "Stochastic"],
  ];
  for (const [re, label] of indChecks) {
    if (re.test(code)) result.detectedIndicators.push(label);
  }

  // Validate by parsing AST
  try {
    parsePineScript(code);
    result.parseValid = true;
  } catch (err: any) {
    result.parseValid = false;
    result.parseError = err?.message || "Failed to parse Pine Script";
  }

  return result;
}

// ============================================================================
// 2. LEXER & AST PARSER
// ============================================================================

type TokType =
  | "NUM"
  | "STR"
  | "ID"
  | "OP"
  | "LPAREN"
  | "RPAREN"
  | "LBRACK"
  | "RBRACK"
  | "COMMA"
  | "DOT"
  | "QMARK"
  | "COLON"
  | "ASSIGN"
  | "REASSIGN"
  | "COMP_ASSIGN"
  | "NEWLINE"
  | "INDENT"
  | "DEDENT"
  | "EOF";

interface Token {
  type: TokType;
  val: string;
  line: number;
}

const KEYWORDS = new Set(["and", "or", "not", "if", "else", "for", "to", "by", "var", "true", "false", "na"]);

function tokenizePine(source: string): Token[] {
  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const tokens: Token[] = [];
  const indentStack = [0];
  let inBlockComment = false;
  let parenDepth = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    let raw = lines[lineIdx];

    // Strip block comments /* ... */
    let cleaned = "";
    let i = 0;
    let inStr: string | null = null;
    while (i < raw.length) {
      if (inBlockComment) {
        if (raw[i] === "*" && raw[i + 1] === "/") {
          inBlockComment = false;
          i += 2;
        } else {
          i++;
        }
        continue;
      }
      if (inStr) {
        if (raw[i] === "\\" && i + 1 < raw.length) {
          cleaned += raw[i] + raw[i + 1];
          i += 2;
          continue;
        }
        if (raw[i] === inStr) {
          inStr = null;
        }
        cleaned += raw[i];
        i++;
        continue;
      }
      if (raw[i] === '"' || raw[i] === "'") {
        inStr = raw[i];
        cleaned += raw[i];
        i++;
        continue;
      }
      if (raw[i] === "/" && raw[i + 1] === "*") {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (raw[i] === "/" && raw[i + 1] === "/") {
        break;
      }
      cleaned += raw[i];
      i++;
    }

    if (!cleaned.trim()) continue;

    // Count leading spaces (treat tab as 4 spaces)
    let indent = 0;
    let pos = 0;
    while (pos < cleaned.length && (cleaned[pos] === " " || cleaned[pos] === "\t")) {
      indent += cleaned[pos] === "\t" ? 4 : 1;
      pos++;
    }

    // Only emit INDENT/DEDENT/NEWLINE when outside (), []
    if (parenDepth === 0) {
      const topIndent = indentStack[indentStack.length - 1];
      // Check if previous line was an incomplete continuation? Wait: handled via parenDepth,
      // and for top-level vs blocks, Pine indents by >= 4 spaces (or any consistent > topIndent)
      if (indent > topIndent) {
        indentStack.push(indent);
        tokens.push({ type: "INDENT", val: "", line: lineIdx + 1 });
      } else {
        while (indent < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          tokens.push({ type: "DEDENT", val: "", line: lineIdx + 1 });
        }
      }
    }

    // Scan characters on line
    const lineTokensStart = tokens.length;
    while (pos < cleaned.length) {
      const ch = cleaned[pos];
      if (ch === " " || ch === "\t") {
        pos++;
        continue;
      }
      // String literal
      if (ch === '"' || ch === "'") {
        const quote = ch;
        pos++;
        let str = "";
        while (pos < cleaned.length && cleaned[pos] !== quote) {
          if (cleaned[pos] === "\\" && pos + 1 < cleaned.length) {
            const nxt = cleaned[pos + 1];
            str += nxt === "n" ? "\n" : nxt === "t" ? "\t" : nxt;
            pos += 2;
          } else {
            str += cleaned[pos];
            pos++;
          }
        }
        pos++; // skip closing quote
        tokens.push({ type: "STR", val: str, line: lineIdx + 1 });
        continue;
      }
      // Hex color literal like #10b981 -> treat as STR
      if (ch === "#") {
        let hex = "#";
        pos++;
        while (pos < cleaned.length && /[0-9a-fA-F]/.test(cleaned[pos])) {
          hex += cleaned[pos++];
        }
        tokens.push({ type: "STR", val: hex, line: lineIdx + 1 });
        continue;
      }
      // Number
      if (/[0-9]/.test(ch) || (ch === "." && pos + 1 < cleaned.length && /[0-9]/.test(cleaned[pos + 1]))) {
        let num = "";
        while (pos < cleaned.length && /[0-9.]/.test(cleaned[pos])) {
          num += cleaned[pos++];
        }
        tokens.push({ type: "NUM", val: num, line: lineIdx + 1 });
        continue;
      }
      // Identifier / keyword
      if (/[a-zA-Z_]/.test(ch)) {
        let id = "";
        while (pos < cleaned.length && /[a-zA-Z0-9_]/.test(cleaned[pos])) {
          id += cleaned[pos++];
        }
        tokens.push({ type: "ID", val: id, line: lineIdx + 1 });
        continue;
      }
      // Two-char operators
      const two = cleaned.slice(pos, pos + 2);
      if (two === ":=") {
        tokens.push({ type: "REASSIGN", val: ":=", line: lineIdx + 1 });
        pos += 2;
        continue;
      }
      if (two === "+=" || two === "-=" || two === "*=" || two === "/=") {
        tokens.push({ type: "COMP_ASSIGN", val: two, line: lineIdx + 1 });
        pos += 2;
        continue;
      }
      if (two === "==" || two === "!=" || two === "<=" || two === ">=") {
        tokens.push({ type: "OP", val: two, line: lineIdx + 1 });
        pos += 2;
        continue;
      }
      // Single-char punctuation / operators
      if (ch === "(") { parenDepth++; tokens.push({ type: "LPAREN", val: "(", line: lineIdx + 1 }); pos++; continue; }
      if (ch === ")") { parenDepth = Math.max(0, parenDepth - 1); tokens.push({ type: "RPAREN", val: ")", line: lineIdx + 1 }); pos++; continue; }
      if (ch === "[") { parenDepth++; tokens.push({ type: "LBRACK", val: "[", line: lineIdx + 1 }); pos++; continue; }
      if (ch === "]") { parenDepth = Math.max(0, parenDepth - 1); tokens.push({ type: "RBRACK", val: "]", line: lineIdx + 1 }); pos++; continue; }
      if (ch === ",") { tokens.push({ type: "COMMA", val: ",", line: lineIdx + 1 }); pos++; continue; }
      if (ch === ".") { tokens.push({ type: "DOT", val: ".", line: lineIdx + 1 }); pos++; continue; }
      if (ch === "?") { tokens.push({ type: "QMARK", val: "?", line: lineIdx + 1 }); pos++; continue; }
      if (ch === ":") { tokens.push({ type: "COLON", val: ":", line: lineIdx + 1 }); pos++; continue; }
      if (ch === "=") { tokens.push({ type: "ASSIGN", val: "=", line: lineIdx + 1 }); pos++; continue; }
      if ("+-*/%<>".includes(ch)) {
        tokens.push({ type: "OP", val: ch, line: lineIdx + 1 });
        pos++;
        continue;
      }
      pos++;
    }

    if (parenDepth === 0 && tokens.length > lineTokensStart) {
      tokens.push({ type: "NEWLINE", val: "\n", line: lineIdx + 1 });
    }
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push({ type: "DEDENT", val: "", line: lines.length });
  }
  tokens.push({ type: "EOF", val: "", line: lines.length });
  return tokens;
}

// AST Nodes
type Expr =
  | { kind: "num"; val: number }
  | { kind: "str"; val: string }
  | { kind: "bool"; val: boolean }
  | { kind: "na" }
  | { kind: "id"; name: string }
  | { kind: "array"; items: Expr[] }
  | { kind: "member"; obj: Expr; prop: string }
  | { kind: "index"; obj: Expr; idx: Expr }
  | { kind: "unary"; op: string; arg: Expr }
  | { kind: "bin"; op: string; left: Expr; right: Expr }
  | { kind: "ternary"; cond: Expr; t: Expr; f: Expr }
  | { kind: "call"; callee: Expr; args: Array<{ name?: string; expr: Expr }>; callId: number };

type Stmt =
  | { kind: "assign"; isVar: boolean; mode: "decl" | "reassign" | "comp"; compOp?: string; targets: string[]; expr: Expr }
  | { kind: "if"; branches: Array<{ cond: Expr | null; body: Stmt[] }> }
  | { kind: "for"; varName: string; start: Expr; end: Expr; step: Expr | null; body: Stmt[] }
  | { kind: "expr"; expr: Expr };

const TYPE_ANNOTATIONS = new Set(["int", "float", "bool", "string", "color", "label", "line", "box", "table"]);

export function parsePineScript(source: string): Stmt[] {
  const tokens = tokenizePine(source);
  let pos = 0;
  let nextCallId = 1;

  const peek = (offset = 0): Token => tokens[Math.min(pos + offset, tokens.length - 1)];
  const next = (): Token => tokens[Math.min(pos++, tokens.length - 1)];
  const skipNewlines = () => {
    while (peek().type === "NEWLINE") next();
  };

  function parseBlock(): Stmt[] {
    const stmts: Stmt[] = [];
    skipNewlines();
    if (peek().type !== "INDENT") return stmts;
    next(); // INDENT
    while (peek().type !== "DEDENT" && peek().type !== "EOF") {
      skipNewlines();
      if (peek().type === "DEDENT" || peek().type === "EOF") break;
      const s = parseStmt();
      if (s) stmts.push(s);
    }
    if (peek().type === "DEDENT") next();
    return stmts;
  }

  function parseStmt(): Stmt | null {
    skipNewlines();
    const t = peek();
    if (t.type === "EOF" || t.type === "DEDENT") return null;

    // if / else if / else
    if (t.type === "ID" && t.val === "if") {
      next();
      const branches: Array<{ cond: Expr | null; body: Stmt[] }> = [];
      const cond = parseExpr();
      skipNewlines();
      const body = parseBlock();
      branches.push({ cond, body });

      while (peek().type === "ID" && peek().val === "else") {
        next();
        if (peek().type === "ID" && peek().val === "if") {
          next();
          const eCond = parseExpr();
          skipNewlines();
          const eBody = parseBlock();
          branches.push({ cond: eCond, body: eBody });
        } else {
          skipNewlines();
          const eBody = parseBlock();
          branches.push({ cond: null, body: eBody });
          break;
        }
      }
      return { kind: "if", branches };
    }

    // for i = start to end [by step]
    if (t.type === "ID" && t.val === "for") {
      next();
      const varTok = next();
      if (peek().type === "ASSIGN") next();
      const start = parseExpr();
      if (peek().type === "ID" && peek().val === "to") next();
      const end = parseExpr();
      let step: Expr | null = null;
      if (peek().type === "ID" && peek().val === "by") {
        next();
        step = parseExpr();
      }
      skipNewlines();
      const body = parseBlock();
      return { kind: "for", varName: varTok.val, start, end, step, body };
    }

    // [var] [type] id = expr | id := expr | id += expr | [a, b] = expr
    let isVar = false;
    let savedPos = pos;
    if (t.type === "ID" && t.val === "var") {
      isVar = true;
      next();
    }

    // Tuple destructuring: [a, b, c] = expr
    if (peek().type === "LBRACK") {
      const tupPos = pos;
      next(); // [
      const targets: string[] = [];
      let validTuple = true;
      while (peek().type !== "RBRACK" && peek().type !== "EOF") {
        const idT = next();
        if (idT.type !== "ID") { validTuple = false; break; }
        targets.push(idT.val);
        if (peek().type === "COMMA") next();
      }
      if (validTuple && peek().type === "RBRACK") {
        next(); // ]
        if (peek().type === "ASSIGN" || peek().type === "REASSIGN") {
          const mode = peek().type === "REASSIGN" ? "reassign" : "decl";
          next();
          const expr = parseExpr();
          skipNewlines();
          return { kind: "assign", isVar, mode, targets, expr };
        }
      }
      pos = tupPos;
    }

    // Optional type annotation: var float ep = na  OR  float ep = na
    if (peek().type === "ID" && TYPE_ANNOTATIONS.has(peek().val) && peek(1).type === "ID" && !KEYWORDS.has(peek(1).val)) {
      next(); // skip type name
    }

    if (
      peek().type === "ID" &&
      (peek(1).type === "ASSIGN" || peek(1).type === "REASSIGN" || peek(1).type === "COMP_ASSIGN")
    ) {
      const targetName = next().val;
      const opTok = next();
      const mode =
        opTok.type === "ASSIGN" ? "decl" : opTok.type === "REASSIGN" ? "reassign" : "comp";
      const compOp = mode === "comp" ? opTok.val[0] : undefined;
      const expr = parseExpr();
      skipNewlines();
      return { kind: "assign", isVar, mode, compOp, targets: [targetName], expr };
    }

    // Roll back var if it wasn't an assignment
    if (isVar) pos = savedPos;

    const expr = parseExpr();
    skipNewlines();
    return { kind: "expr", expr };
  }

  function parseExpr(): Expr {
    return parseTernary();
  }

  function parseTernary(): Expr {
    const cond = parseOr();
    if (peek().type === "QMARK") {
      next();
      const t = parseTernary();
      if (peek().type === "COLON") next();
      const f = parseTernary();
      return { kind: "ternary", cond, t, f };
    }
    return cond;
  }

  function parseOr(): Expr {
    let left = parseAnd();
    while (peek().type === "ID" && peek().val === "or") {
      next();
      const right = parseAnd();
      left = { kind: "bin", op: "or", left, right };
    }
    return left;
  }

  function parseAnd(): Expr {
    let left = parseEq();
    while (peek().type === "ID" && peek().val === "and") {
      next();
      const right = parseEq();
      left = { kind: "bin", op: "and", left, right };
    }
    return left;
  }

  function parseEq(): Expr {
    let left = parseCmp();
    while (peek().type === "OP" && (peek().val === "==" || peek().val === "!=")) {
      const op = next().val;
      const right = parseCmp();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  function parseCmp(): Expr {
    let left = parseAdd();
    while (peek().type === "OP" && ["<", "<=", ">", ">="].includes(peek().val)) {
      const op = next().val;
      const right = parseAdd();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  function parseAdd(): Expr {
    let left = parseMul();
    while (peek().type === "OP" && (peek().val === "+" || peek().val === "-")) {
      const op = next().val;
      const right = parseMul();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  function parseMul(): Expr {
    let left = parseUnary();
    while (peek().type === "OP" && (peek().val === "*" || peek().val === "/" || peek().val === "%")) {
      const op = next().val;
      const right = parseUnary();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }

  function parseUnary(): Expr {
    if (peek().type === "ID" && peek().val === "not") {
      next();
      return { kind: "unary", op: "not", arg: parseUnary() };
    }
    if (peek().type === "OP" && (peek().val === "-" || peek().val === "+")) {
      const op = next().val;
      return { kind: "unary", op, arg: parseUnary() };
    }
    return parsePostfix();
  }

  function parsePostfix(): Expr {
    let expr = parsePrimary();
    while (true) {
      if (peek().type === "DOT") {
        next();
        const prop = next().val;
        expr = { kind: "member", obj: expr, prop };
      } else if (peek().type === "LBRACK") {
        next();
        const idx = parseExpr();
        if (peek().type === "RBRACK") next();
        expr = { kind: "index", obj: expr, idx };
      } else if (peek().type === "LPAREN") {
        next();
        const args: Array<{ name?: string; expr: Expr }> = [];
        while (peek().type !== "RPAREN" && peek().type !== "EOF") {
          if (peek().type === "ID" && peek(1).type === "ASSIGN") {
            const argName = next().val;
            next(); // =
            args.push({ name: argName, expr: parseExpr() });
          } else {
            args.push({ expr: parseExpr() });
          }
          if (peek().type === "COMMA") next();
        }
        if (peek().type === "RPAREN") next();
        expr = { kind: "call", callee: expr, args, callId: nextCallId++ };
      } else {
        break;
      }
    }
    return expr;
  }

  function parsePrimary(): Expr {
    const t = peek();
    if (t.type === "NUM") { next(); return { kind: "num", val: parseFloat(t.val) }; }
    if (t.type === "STR") { next(); return { kind: "str", val: t.val }; }
    if (t.type === "ID" && t.val === "true") { next(); return { kind: "bool", val: true }; }
    if (t.type === "ID" && t.val === "false") { next(); return { kind: "bool", val: false }; }
    if (t.type === "ID" && t.val === "na") { next(); return { kind: "na" }; }
    if (t.type === "ID") { next(); return { kind: "id", name: t.val }; }
    if (t.type === "LPAREN") {
      next();
      const expr = parseExpr();
      if (peek().type === "RPAREN") next();
      return expr;
    }
    if (t.type === "LBRACK") {
      next();
      const items: Expr[] = [];
      while (peek().type !== "RBRACK" && peek().type !== "EOF") {
        items.push(parseExpr());
        if (peek().type === "COMMA") next();
      }
      if (peek().type === "RBRACK") next();
      return { kind: "array", items };
    }
    next();
    return { kind: "na" };
  }

  const program: Stmt[] = [];
  while (peek().type !== "EOF") {
    skipNewlines();
    if (peek().type === "EOF") break;
    if (peek().type === "INDENT" || peek().type === "DEDENT") {
      next();
      continue;
    }
    const stmt = parseStmt();
    if (stmt) program.push(stmt);
  }
  return program;
}

// ============================================================================
// 3. TECHNICAL INDICATOR & EXECUTION RUNTIME (Bar-by-Bar State Machine)
// ============================================================================

function isNaVal(v: any): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

function toNum(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return NaN;
}

function toBool(v: any): boolean {
  if (isNaVal(v)) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
  if (typeof v === "string") return v.length > 0;
  return Boolean(v);
}

function pineMemberToPath(expr: Expr): string | null {
  if (expr.kind === "id") return expr.name;
  if (expr.kind === "member") {
    const p = pineMemberToPath(expr.obj);
    return p ? `${p}.${expr.prop}` : null;
  }
  return null;
}

function parseTimeframeMeta(tfStr?: string): { isminutes: boolean; isdaily: boolean; isintraday: boolean; multiplier: number; period: string } {
  const s = (tfStr || "15").trim().toUpperCase();
  if (s === "1D" || s === "D" || s === "D1") {
    return { isminutes: false, isdaily: true, isintraday: false, multiplier: 1, period: "D" };
  }
  if (s === "H1" || s === "60") return { isminutes: true, isdaily: false, isintraday: true, multiplier: 60, period: "60" };
  if (s === "H4" || s === "240") return { isminutes: true, isdaily: false, isintraday: true, multiplier: 240, period: "240" };
  const mins = parseInt(s.replace(/^M/i, ""), 10) || 15;
  return { isminutes: true, isdaily: false, isintraday: true, multiplier: mins, period: String(mins) };
}

function getTzParts(epochMs: number, tz?: string): { hour: number; minute: number; dayofmonth: number; dayofweek: number; month: number; year: number } {
  const d = new Date(epochMs);
  if (!tz || tz.toUpperCase() === "UTC" || tz === "Etc/UTC" || tz === "syminfo.timezone") {
    return {
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      dayofmonth: d.getUTCDate(),
      dayofweek: d.getUTCDay() + 1, // TradingView: 1=Sun..7=Sat
      month: d.getUTCMonth() + 1,
      year: d.getUTCFullYear(),
    };
  }
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      weekday: "short",
    });
    const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
    const wdMap: Record<string, number> = { Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7 };
    const h = parseInt(parts.hour, 10);
    return {
      hour: h === 24 ? 0 : h,
      minute: parseInt(parts.minute, 10),
      dayofmonth: parseInt(parts.day, 10),
      dayofweek: wdMap[parts.weekday] || 1,
      month: parseInt(parts.month, 10),
      year: parseInt(parts.year, 10),
    };
  } catch {
    return getTzParts(epochMs, "UTC");
  }
}

export function executePineScript(
  code: string,
  candles: PineCandle[],
  options?: { instrument?: string; timeframe?: string }
): PineExecutionResult {
  const events: PineSignalEvent[] = [];
  const closedTrades: PineClosedTrade[] = [];

  if (!candles || candles.length === 0) {
    return {
      success: false,
      error: "No candles provided",
      events,
      closedTrades,
      finalPosition: { size: 0, entryPrice: 0, entryTime: 0, entryBarIndex: -1 },
      plots: [],
    };
  }

  let ast: Stmt[];
  try {
    ast = parsePineScript(code);
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Pine syntax parse error",
      events,
      closedTrades,
      finalPosition: { size: 0, entryPrice: 0, entryTime: 0, entryBarIndex: -1 },
      plots: [],
    };
  }

  const tfMeta = parseTimeframeMeta(options?.timeframe);
  let strategyName = "Custom Pine Strategy";

  // Series history per variable & per indicator callId
  const varValues: Record<string, any> = {};
  const varHistory: Record<string, any[]> = {};
  const varPersistent = new Set<string>();
  const callHistory: Record<number, any[]> = {};
  const callExtra: Record<number, any> = {};
  const plotSeries: Record<number, { name: string; color?: string; values: Array<number | null> }> = {};

  // Strategy broker emulator state
  let posSize = 0; // +1 long, -1 short, 0 flat
  let posEntryPrice = 0;
  let posEntryTime = 0;
  let posEntryBar = -1;
  let posEntryId = "";
  let activeLimit: number | undefined;
  let activeStop: number | undefined;
  let maxEquity = 0;
  let maxDrawdown = 0;
  let cumProfit = 0;
  let winTradesCount = 0;
  let lossTradesCount = 0;

  let curBar = 0;

  function getVar(name: string, lookback = 0): any {
    const hist = varHistory[name];
    if (!hist) return NaN;
    const idx = curBar - lookback;
    if (idx < 0 || idx >= hist.length) return NaN;
    return hist[idx];
  }

  function setVar(name: string, val: any, isVarDecl: boolean) {
    if (isVarDecl) varPersistent.add(name);
    varValues[name] = val;
    if (!varHistory[name]) varHistory[name] = new Array(curBar + 1).fill(NaN);
    while (varHistory[name].length <= curBar) varHistory[name].push(NaN);
    varHistory[name][curBar] = val;
  }

  function recordCallHistory(callId: number, val: any): any {
    if (!callHistory[callId]) callHistory[callId] = [];
    while (callHistory[callId].length < curBar) callHistory[callId].push(NaN);
    callHistory[callId][curBar] = val;
    return val;
  }

  function getArg(args: Array<{ name?: string; expr: Expr }>, index: number, named?: string): any {
    if (named) {
      const found = args.find((a) => a.name === named);
      if (found) return evalExpr(found.expr);
    }
    if (index >= 0 && index < args.length && !args[index].name) {
      return evalExpr(args[index].expr);
    }
    return undefined;
  }

  function getArgExpr(args: Array<{ name?: string; expr: Expr }>, index: number, named?: string): Expr | undefined {
    if (named) {
      const found = args.find((a) => a.name === named);
      if (found) return found.expr;
    }
    if (index >= 0 && index < args.length && !args[index].name) {
      return args[index].expr;
    }
    return undefined;
  }

  // Evaluate series values on historical bar `idx` for ta.* calculations
  function evalSeriesAt(expr: Expr, idx: number): number {
    // Fast path for built-in series & variables stored in varHistory / callHistory
    if (expr.kind === "id") {
      const n = expr.name;
      if (n === "close") return candles[idx].close;
      if (n === "open") return candles[idx].open;
      if (n === "high") return candles[idx].high;
      if (n === "low") return candles[idx].low;
      if (n === "volume") return candles[idx].volume ?? 0;
      if (n === "hl2") return (candles[idx].high + candles[idx].low) / 2;
      if (n === "hlc3") return (candles[idx].high + candles[idx].low + candles[idx].close) / 3;
      if (n === "ohlc4") return (candles[idx].open + candles[idx].high + candles[idx].low + candles[idx].close) / 4;
      const h = varHistory[n];
      if (h && idx >= 0 && idx < h.length) return toNum(h[idx]);
      return NaN;
    }
    if (expr.kind === "call") {
      const ch = callHistory[expr.callId];
      if (ch && idx >= 0 && idx < ch.length) {
        return toNum(ch[idx]);
      }
    }
    const saved = curBar;
    curBar = idx;
    const v = toNum(evalExpr(expr));
    curBar = saved;
    return v;
  }

  function getBuiltinSeries(name: string, lookback = 0): any {
    const idx = curBar - lookback;
    if (idx < 0 || idx >= candles.length) return NaN;
    const c = candles[idx];
    switch (name) {
      case "open": return c.open;
      case "high": return c.high;
      case "low": return c.low;
      case "close": return c.close;
      case "volume": return c.volume ?? 0;
      case "time": return c.time;
      case "timenow": return candles[candles.length - 1].time;
      case "bar_index": return idx;
      case "hl2": return (c.high + c.low) / 2;
      case "hlc3": return (c.high + c.low + c.close) / 3;
      case "ohlc4": return (c.open + c.high + c.low + c.close) / 4;
      case "hlcc4": return (c.high + c.low + 2 * c.close) / 4;
      default: return undefined;
    }
  }

  function resolveMemberPath(path: string): any {
    switch (path) {
      case "strategy.long": return "LONG";
      case "strategy.short": return "SHORT";
      case "strategy.fixed": return "fixed";
      case "strategy.percent_of_equity": return "percent_of_equity";
      case "strategy.cash": return "cash";
      case "strategy.commission.cash_per_contract":
      case "strategy.commission.cash_per_order":
      case "strategy.commission.percent": return "commission";
      case "strategy.position_size": return posSize;
      case "strategy.position_avg_price": return posSize !== 0 ? posEntryPrice : NaN;
      case "strategy.closedtrades": return closedTrades.length;
      case "strategy.wintrades": return winTradesCount;
      case "strategy.losstrades": return lossTradesCount;
      case "strategy.netprofit": return cumProfit;
      case "strategy.max_drawdown": return maxDrawdown;
      case "timeframe.isminutes": return tfMeta.isminutes;
      case "timeframe.isdaily": return tfMeta.isdaily;
      case "timeframe.isintraday": return tfMeta.isintraday;
      case "timeframe.multiplier": return tfMeta.multiplier;
      case "timeframe.period": return tfMeta.period;
      case "barstate.isconfirmed": return true;
      case "barstate.islast": return curBar === candles.length - 1;
      case "barstate.isfirst": return curBar === 0;
      case "barstate.ishistory": return curBar < candles.length - 1;
      case "barstate.isrealtime": return curBar === candles.length - 1;
      case "syminfo.ticker": return options?.instrument || "XAUUSD";
      case "syminfo.mintick": return 0.01;
      case "syminfo.pointvalue": return 1;
      case "syminfo.timezone": return "UTC";
      default:
        if (path.startsWith("color.") || path.startsWith("label.") || path.startsWith("line.") || path.startsWith("shape.") || path.startsWith("location.") || path.startsWith("size.") || path.startsWith("position.") || path.startsWith("plot.") || path.startsWith("border.")) {
          return path;
        }
        return undefined;
    }
  }

  function evalExpr(expr: Expr, lookback = 0): any {
    switch (expr.kind) {
      case "num": return expr.val;
      case "str": return expr.val;
      case "bool": return expr.val;
      case "na": return NaN;
      case "array": return expr.items.map((it) => evalExpr(it));

      case "id": {
        const b = getBuiltinSeries(expr.name, lookback);
        if (b !== undefined) return b;
        if (expr.name in varValues || expr.name in varHistory) {
          return lookback === 0 && expr.name in varValues ? varValues[expr.name] : getVar(expr.name, lookback);
        }
        return NaN;
      }

      case "member": {
        const path = pineMemberToPath(expr);
        if (path) {
          const resolved = resolveMemberPath(path);
          if (resolved !== undefined) return resolved;
        }
        return NaN;
      }

      case "index": {
        const offset = Math.max(0, Math.round(toNum(evalExpr(expr.idx))));
        if (Number.isNaN(offset)) return NaN;
        if (expr.obj.kind === "id" || expr.obj.kind === "call") {
          if (expr.obj.kind === "call") {
            // Ensure current bar is evaluated so history is populated
            evalExpr(expr.obj, 0);
            const h = callHistory[expr.obj.callId];
            if (!h) return NaN;
            const targetIdx = curBar - offset;
            return targetIdx >= 0 && targetIdx < h.length ? h[targetIdx] : NaN;
          }
          return evalExpr(expr.obj, lookback + offset);
        }
        const arr = evalExpr(expr.obj);
        if (Array.isArray(arr)) return arr[offset];
        return NaN;
      }

      case "unary": {
        const v = evalExpr(expr.arg);
        if (expr.op === "not") return !toBool(v);
        if (expr.op === "-") return isNaVal(v) ? NaN : -toNum(v);
        if (expr.op === "+") return toNum(v);
        return v;
      }

      case "ternary": {
        return toBool(evalExpr(expr.cond)) ? evalExpr(expr.t) : evalExpr(expr.f);
      }

      case "bin": {
        if (expr.op === "and") return toBool(evalExpr(expr.left)) && toBool(evalExpr(expr.right));
        if (expr.op === "or") return toBool(evalExpr(expr.left)) || toBool(evalExpr(expr.right));

        const l = evalExpr(expr.left);
        const r = evalExpr(expr.right);

        if (expr.op === "+") {
          if (typeof l === "string" || typeof r === "string") return String(l ?? "") + String(r ?? "");
          return toNum(l) + toNum(r);
        }
        if (expr.op === "-") return toNum(l) - toNum(r);
        if (expr.op === "*") return toNum(l) * toNum(r);
        if (expr.op === "/") return toNum(r) === 0 ? NaN : toNum(l) / toNum(r);
        if (expr.op === "%") return toNum(r) === 0 ? NaN : toNum(l) % toNum(r);
        if (expr.op === "==") return l === r || (isNaVal(l) && isNaVal(r));
        if (expr.op === "!=") return !(l === r || (isNaVal(l) && isNaVal(r)));
        if (expr.op === "<") return toNum(l) < toNum(r);
        if (expr.op === "<=") return toNum(l) <= toNum(r);
        if (expr.op === ">") return toNum(l) > toNum(r);
        if (expr.op === ">=") return toNum(l) >= toNum(r);
        return NaN;
      }

      case "call":
        return evalCall(expr);
    }
  }

  function evalCall(expr: Extract<Expr, { kind: "call" }>): any {
    const path = pineMemberToPath(expr.callee) || "";
    const { args, callId } = expr;

    // Strategy & Indicator declarations
    if (path === "strategy" || path === "indicator") {
      const title = getArg(args, 0, "title");
      if (typeof title === "string" && title.trim()) strategyName = title.trim();
      return NaN;
    }

    // Input functions
    if (path === "input" || path.startsWith("input.")) {
      return getArg(args, 0, "defval");
    }

    // N/A helpers & runtime
    if (path === "na") return isNaVal(getArg(args, 0));
    if (path === "nz") {
      const v = getArg(args, 0, "source");
      const rep = getArg(args, 1, "replacement") ?? 0;
      return isNaVal(v) ? rep : v;
    }
    if (path === "runtime.error") return NaN;

    // String helpers
    if (path === "str.tostring") {
      const v = getArg(args, 0);
      if (isNaVal(v)) return "na";
      if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
      return String(v);
    }

    // Time helpers
    if (path === "hour" || path === "minute" || path === "dayofmonth" || path === "dayofweek" || path === "month" || path === "year") {
      const tVal = toNum(getArg(args, 0, "time")) || candles[curBar].time;
      const tzVal = getArg(args, 1, "timezone");
      const parts = getTzParts(tVal, typeof tzVal === "string" ? tzVal : "UTC");
      return (parts as any)[path];
    }

    // Closed trades inspection
    if (path === "strategy.closedtrades.profit") {
      const idx = Math.round(toNum(getArg(args, 0)));
      return closedTrades[idx]?.profit ?? 0;
    }
    if (path === "strategy.closedtrades.entry_price") {
      const idx = Math.round(toNum(getArg(args, 0)));
      return closedTrades[idx]?.entryPrice ?? NaN;
    }
    if (path === "strategy.closedtrades.exit_price") {
      const idx = Math.round(toNum(getArg(args, 0)));
      return closedTrades[idx]?.exitPrice ?? NaN;
    }
    if (path === "strategy.closedtrades.entry_bar_index") {
      const idx = Math.round(toNum(getArg(args, 0)));
      return closedTrades[idx]?.entryBarIndex ?? -1;
    }
    if (path === "strategy.closedtrades.exit_bar_index") {
      const idx = Math.round(toNum(getArg(args, 0)));
      return closedTrades[idx]?.exitBarIndex ?? -1;
    }
    if (path === "strategy.closedtrades.size") {
      const idx = Math.round(toNum(getArg(args, 0)));
      return closedTrades[idx]?.size ?? 0;
    }

    // Strategy execution commands
    if (path === "strategy.entry") {
      const id = String(getArg(args, 0, "id") || "Entry");
      const dirRaw = String(getArg(args, 1, "direction") || "LONG").toUpperCase();
      const direction: "LONG" | "SHORT" = dirRaw.includes("SHORT") ? "SHORT" : "LONG";
      const limitArg = getArg(args, -1, "limit");
      const stopArg = getArg(args, -1, "stop");

      const bar = candles[curBar];
      const nextSize = direction === "LONG" ? 1 : -1;

      // Ignore redundant same-direction entry when already in same position
      if (posSize === nextSize) return NaN;

      // If flipping direction, close opposite position first
      if (posSize !== 0 && posSize !== nextSize) {
        closeOpenPosition(curBar, bar.time, bar.close, "EXIT", `Reverse to ${direction}`);
      }

      posSize = nextSize;
      posEntryPrice = bar.close;
      posEntryTime = bar.time;
      posEntryBar = curBar;
      posEntryId = id;
      activeLimit = !isNaVal(limitArg) ? toNum(limitArg) : undefined;
      activeStop = !isNaVal(stopArg) ? toNum(stopArg) : undefined;

      events.push({
        barIndex: curBar,
        barTime: bar.time,
        signalType: "ENTRY",
        direction,
        entryPrice: Number(posEntryPrice.toFixed(2)),
        stopLoss: activeStop !== undefined ? Number(activeStop.toFixed(2)) : undefined,
        targetPrice: activeLimit !== undefined ? Number(activeLimit.toFixed(2)) : undefined,
        comment: id,
      });
      return NaN;
    }

    if (path === "strategy.exit") {
      const fromEntry = getArg(args, 1, "from_entry");
      const limitArg = getArg(args, -1, "limit");
      const stopArg = getArg(args, -1, "stop");
      const profitPts = getArg(args, -1, "profit");
      const lossPts = getArg(args, -1, "loss");

      if (posSize === 0) return NaN;
      if (fromEntry && posEntryId && String(fromEntry) !== posEntryId) return NaN;

      if (!isNaVal(limitArg)) activeLimit = toNum(limitArg);
      else if (!isNaVal(profitPts)) activeLimit = posSize > 0 ? posEntryPrice + toNum(profitPts) : posEntryPrice - toNum(profitPts);

      if (!isNaVal(stopArg)) activeStop = toNum(stopArg);
      else if (!isNaVal(lossPts)) activeStop = posSize > 0 ? posEntryPrice - toNum(lossPts) : posEntryPrice + toNum(lossPts);

      // Enrich the ENTRY event emitted on this same bar if TP/SL was registered right after strategy.entry()
      const lastEvt = events[events.length - 1];
      if (lastEvt && lastEvt.barIndex === curBar && lastEvt.signalType === "ENTRY") {
        if (activeLimit !== undefined) lastEvt.targetPrice = Number(activeLimit.toFixed(2));
        if (activeStop !== undefined) lastEvt.stopLoss = Number(activeStop.toFixed(2));
      }
      return NaN;
    }

    if (path === "strategy.close" || path === "strategy.close_all") {
      const id = getArg(args, 0, "id");
      const comment = getArg(args, -1, "comment");
      if (posSize === 0) return NaN;
      if (path === "strategy.close" && id && posEntryId && String(id) !== posEntryId) return NaN;
      const bar = candles[curBar];
      closeOpenPosition(curBar, bar.time, bar.close, "EXIT", comment ? String(comment) : undefined);
      return NaN;
    }

    // Visual plot tracking (also powers chart series!)
    if (path === "plot") {
      const val = toNum(getArg(args, 0, "series"));
      const title = String(getArg(args, 1, "title") || `Plot ${callId}`);
      if (!plotSeries[callId]) {
        plotSeries[callId] = { name: title, values: new Array(candles.length).fill(null) };
      }
      plotSeries[callId].values[curBar] = Number.isNaN(val) ? null : Number(val.toFixed(3));
      return NaN;
    }

    // Ignore drawing/table functions cleanly
    if (
      path.startsWith("label.") ||
      path.startsWith("box.") ||
      path.startsWith("line.") ||
      path.startsWith("table.") ||
      path.startsWith("color.") ||
      path === "plotshape" ||
      path === "plotchar" ||
      path === "bgcolor" ||
      path === "barcolor" ||
      path === "alert" ||
      path === "alertcondition"
    ) {
      return NaN;
    }

    // math.*
    if (path === "math.abs") return Math.abs(toNum(getArg(args, 0)));
    if (path === "math.sqrt") return Math.sqrt(toNum(getArg(args, 0)));
    if (path === "math.pow") return Math.pow(toNum(getArg(args, 0)), toNum(getArg(args, 1)));
    if (path === "math.log") return Math.log(toNum(getArg(args, 0)));
    if (path === "math.round") return Math.round(toNum(getArg(args, 0)));
    if (path === "math.floor") return Math.floor(toNum(getArg(args, 0)));
    if (path === "math.ceil") return Math.ceil(toNum(getArg(args, 0)));
    if (path === "math.sign") return Math.sign(toNum(getArg(args, 0)));
    if (path === "math.max") return Math.max(...args.map((a) => toNum(evalExpr(a.expr))));
    if (path === "math.min") return Math.min(...args.map((a) => toNum(evalExpr(a.expr))));
    if (path === "math.avg") {
      const nums = args.map((a) => toNum(evalExpr(a.expr)));
      return nums.reduce((s, n) => s + n, 0) / Math.max(1, nums.length);
    }

    // ta.* technical indicators
    if (path === "ta.sma") {
      const srcExpr = getArgExpr(args, 0, "source")!;
      const len = Math.max(1, Math.round(toNum(getArg(args, 1, "length"))));
      if (curBar + 1 < len) return recordCallHistory(callId, NaN);
      let sum = 0;
      for (let j = 0; j < len; j++) {
        const v = evalSeriesAt(srcExpr, curBar - j);
        if (Number.isNaN(v)) return recordCallHistory(callId, NaN);
        sum += v;
      }
      return recordCallHistory(callId, sum / len);
    }

    if (path === "ta.ema") {
      const srcExpr = getArgExpr(args, 0, "source")!;
      const len = Math.max(1, Math.round(toNum(getArg(args, 1, "length"))));
      const val = evalSeriesAt(srcExpr, curBar);
      const hist = callHistory[callId] || [];
      const prev = curBar > 0 ? hist[curBar - 1] : NaN;
      if (Number.isNaN(val)) return recordCallHistory(callId, NaN);
      if (Number.isNaN(prev)) {
        // Need `len` valid values to seed SMA cleanly
        let sum = 0;
        if (curBar + 1 < len) return recordCallHistory(callId, NaN);
        for (let j = 0; j < len; j++) {
          const s = evalSeriesAt(srcExpr, curBar - j);
          if (Number.isNaN(s)) return recordCallHistory(callId, NaN);
          sum += s;
        }
        return recordCallHistory(callId, sum / len);
      }
      const k = 2 / (len + 1);
      return recordCallHistory(callId, val * k + prev * (1 - k));
    }

    if (path === "ta.rma") {
      const srcExpr = getArgExpr(args, 0, "source")!;
      const len = Math.max(1, Math.round(toNum(getArg(args, 1, "length"))));
      const val = evalSeriesAt(srcExpr, curBar);
      const hist = callHistory[callId] || [];
      const prev = curBar > 0 ? hist[curBar - 1] : NaN;
      if (Number.isNaN(val)) return recordCallHistory(callId, NaN);
      if (Number.isNaN(prev)) {
        if (curBar + 1 < len) return recordCallHistory(callId, NaN);
        let sum = 0;
        for (let j = 0; j < len; j++) {
          const s = evalSeriesAt(srcExpr, curBar - j);
          if (Number.isNaN(s)) return recordCallHistory(callId, NaN);
          sum += s;
        }
        return recordCallHistory(callId, sum / len);
      }
      const alpha = 1 / len;
      return recordCallHistory(callId, val * alpha + prev * (1 - alpha));
    }

    if (path === "ta.wma") {
      const srcExpr = getArgExpr(args, 0, "source")!;
      const len = Math.max(1, Math.round(toNum(getArg(args, 1, "length"))));
      if (curBar + 1 < len) return recordCallHistory(callId, NaN);
      let norm = 0;
      let sum = 0;
      for (let j = 0; j < len; j++) {
        const w = len - j;
        const v = evalSeriesAt(srcExpr, curBar - j);
        if (Number.isNaN(v)) return recordCallHistory(callId, NaN);
        sum += v * w;
        norm += w;
      }
      return recordCallHistory(callId, sum / norm);
    }

    if (path === "ta.stdev") {
      const srcExpr = getArgExpr(args, 0, "source")!;
      const len = Math.max(1, Math.round(toNum(getArg(args, 1, "length"))));
      if (curBar + 1 < len) return recordCallHistory(callId, NaN);
      const vals: number[] = [];
      let sum = 0;
      for (let j = 0; j < len; j++) {
        const v = evalSeriesAt(srcExpr, curBar - j);
        if (Number.isNaN(v)) return recordCallHistory(callId, NaN);
        vals.push(v);
        sum += v;
      }
      const mean = sum / len;
      let sq = 0;
      for (const v of vals) sq += (v - mean) * (v - mean);
      return recordCallHistory(callId, Math.sqrt(sq / len));
    }

    if (path === "ta.tr") {
      const c = candles[curBar];
      const tr = curBar === 0
        ? c.high - c.low
        : Math.max(c.high - c.low, Math.abs(c.high - candles[curBar - 1].close), Math.abs(c.low - candles[curBar - 1].close));
      return recordCallHistory(callId, tr);
    }

    if (path === "ta.atr") {
      const len = Math.max(1, Math.round(toNum(getArg(args, 0, "length"))));
      const c = candles[curBar];
      const tr = curBar === 0
        ? c.high - c.low
        : Math.max(c.high - c.low, Math.abs(c.high - candles[curBar - 1].close), Math.abs(c.low - candles[curBar - 1].close));
      const hist = callHistory[callId] || [];
      const prev = curBar > 0 ? hist[curBar - 1] : NaN;
      if (Number.isNaN(prev)) {
        if (curBar + 1 < len) return recordCallHistory(callId, NaN);
        let sum = 0;
        for (let j = 0; j < len; j++) {
          const idx = curBar - j;
          const b = candles[idx];
          sum += idx === 0
            ? b.high - b.low
            : Math.max(b.high - b.low, Math.abs(b.high - candles[idx - 1].close), Math.abs(b.low - candles[idx - 1].close));
        }
        return recordCallHistory(callId, sum / len);
      }
      const alpha = 1 / len;
      return recordCallHistory(callId, tr * alpha + prev * (1 - alpha));
    }

    if (path === "ta.rsi") {
      const srcExpr = getArgExpr(args, 0, "source")!;
      const len = Math.max(1, Math.round(toNum(getArg(args, 1, "length"))));
      if (!callExtra[callId]) callExtra[callId] = { avgG: NaN, avgL: NaN };
      const st = callExtra[callId];
      if (curBar === 0) return recordCallHistory(callId, NaN);
      const diff = evalSeriesAt(srcExpr, curBar) - evalSeriesAt(srcExpr, curBar - 1);
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      if (Number.isNaN(st.avgG)) {
        if (curBar < len) return recordCallHistory(callId, NaN);
        let gSum = 0, lSum = 0;
        for (let k = curBar - len + 1; k <= curBar; k++) {
          const d = evalSeriesAt(srcExpr, k) - evalSeriesAt(srcExpr, k - 1);
          if (Number.isNaN(d)) return recordCallHistory(callId, NaN);
          if (d > 0) gSum += d;
          else lSum += -d;
        }
        st.avgG = gSum / len;
        st.avgL = lSum / len;
      } else {
        st.avgG = (st.avgG * (len - 1) + gain) / len;
        st.avgL = (st.avgL * (len - 1) + loss) / len;
      }
      const rsiVal = st.avgL === 0 ? 100 : 100 - 100 / (1 + st.avgG / st.avgL);
      return recordCallHistory(callId, rsiVal);
    }

    if (path === "ta.highest" || path === "ta.lowest") {
      const srcExpr = args.length >= 2 ? getArgExpr(args, 0, "source")! : ({ kind: "id", name: path === "ta.highest" ? "high" : "low" } as Expr);
      const lenArg = args.length >= 2 ? getArg(args, 1, "length") : getArg(args, 0, "length");
      const len = Math.max(1, Math.round(toNum(lenArg)));
      if (curBar + 1 < len) return recordCallHistory(callId, NaN);
      let best = path === "ta.highest" ? -Infinity : Infinity;
      for (let j = 0; j < len; j++) {
        const v = evalSeriesAt(srcExpr, curBar - j);
        if (Number.isNaN(v)) return recordCallHistory(callId, NaN);
        best = path === "ta.highest" ? Math.max(best, v) : Math.min(best, v);
      }
      return recordCallHistory(callId, best);
    }

    if (path === "ta.crossover" || path === "ta.crossunder" || path === "ta.cross") {
      if (curBar === 0) return false;
      const e1 = getArgExpr(args, 0)!;
      const e2 = getArgExpr(args, 1)!;
      const a0 = evalSeriesAt(e1, curBar);
      const b0 = evalSeriesAt(e2, curBar);
      const a1 = evalSeriesAt(e1, curBar - 1);
      const b1 = evalSeriesAt(e2, curBar - 1);
      if (Number.isNaN(a0) || Number.isNaN(b0) || Number.isNaN(a1) || Number.isNaN(b1)) return false;
      if (path === "ta.crossover") return a1 <= b1 && a0 > b0;
      if (path === "ta.crossunder") return a1 >= b1 && a0 < b0;
      return (a1 <= b1 && a0 > b0) || (a1 >= b1 && a0 < b0);
    }

    if (path === "ta.change") {
      const srcExpr = getArgExpr(args, 0, "source")!;
      const len = Math.max(1, Math.round(toNum(getArg(args, 1, "length") ?? 1)));
      if (curBar < len) return NaN;
      return evalSeriesAt(srcExpr, curBar) - evalSeriesAt(srcExpr, curBar - len);
    }

    if (path === "ta.mom") {
      const srcExpr = getArgExpr(args, 0, "source")!;
      const len = Math.max(1, Math.round(toNum(getArg(args, 1, "length"))));
      if (curBar < len) return NaN;
      return evalSeriesAt(srcExpr, curBar) - evalSeriesAt(srcExpr, curBar - len);
    }

    if (path === "ta.bb") {
      const srcExpr = getArgExpr(args, 0, "series")!;
      const len = Math.max(1, Math.round(toNum(getArg(args, 1, "length"))));
      const mult = toNum(getArg(args, 2, "mult"));
      if (curBar + 1 < len) return [NaN, NaN, NaN];
      const vals: number[] = [];
      let sum = 0;
      for (let j = 0; j < len; j++) {
        const v = evalSeriesAt(srcExpr, curBar - j);
        if (Number.isNaN(v)) return [NaN, NaN, NaN];
        vals.push(v);
        sum += v;
      }
      const basis = sum / len;
      let sq = 0;
      for (const v of vals) sq += (v - basis) * (v - basis);
      const dev = mult * Math.sqrt(sq / len);
      return [basis, basis + dev, basis - dev];
    }

    if (path === "ta.macd") {
      const srcExpr = getArgExpr(args, 0, "source")!;
      const fastLen = Math.max(1, Math.round(toNum(getArg(args, 1, "fastlen") ?? 12)));
      const slowLen = Math.max(1, Math.round(toNum(getArg(args, 2, "slowlen") ?? 26)));
      const sigLen = Math.max(1, Math.round(toNum(getArg(args, 3, "siglen") ?? 9)));
      if (!callExtra[callId]) callExtra[callId] = { fast: NaN, slow: NaN, sig: NaN };
      const st = callExtra[callId];
      const v = evalSeriesAt(srcExpr, curBar);
      if (Number.isNaN(v)) return [NaN, NaN, NaN];
      st.fast = Number.isNaN(st.fast) ? v : v * (2 / (fastLen + 1)) + st.fast * (1 - 2 / (fastLen + 1));
      st.slow = Number.isNaN(st.slow) ? v : v * (2 / (slowLen + 1)) + st.slow * (1 - 2 / (slowLen + 1));
      const macdLine = curBar + 1 >= slowLen ? st.fast - st.slow : NaN;
      if (!Number.isNaN(macdLine)) {
        st.sig = Number.isNaN(st.sig) ? macdLine : macdLine * (2 / (sigLen + 1)) + st.sig * (1 - 2 / (sigLen + 1));
      }
      const hist = !Number.isNaN(macdLine) && !Number.isNaN(st.sig) ? macdLine - st.sig : NaN;
      return [macdLine, st.sig, hist];
    }

    if (path === "ta.supertrend") {
      const factor = toNum(getArg(args, 0, "factor") ?? 3);
      const atrLen = Math.max(1, Math.round(toNum(getArg(args, 1, "atrPeriod") ?? 10)));
      if (!callExtra[callId]) callExtra[callId] = { atr: NaN, up: NaN, dn: NaN, dir: 1 };
      const st = callExtra[callId];
      const b = candles[curBar];
      const tr = curBar === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - candles[curBar - 1].close), Math.abs(b.low - candles[curBar - 1].close));
      st.atr = Number.isNaN(st.atr) ? tr : (st.atr * (atrLen - 1) + tr) / atrLen;
      const hl2 = (b.high + b.low) / 2;
      let upperBand = hl2 + factor * st.atr;
      let lowerBand = hl2 - factor * st.atr;
      const prevClose = curBar > 0 ? candles[curBar - 1].close : b.close;
      if (!Number.isNaN(st.dn)) {
        lowerBand = lowerBand > st.dn || prevClose < st.dn ? lowerBand : st.dn;
      }
      if (!Number.isNaN(st.up)) {
        upperBand = upperBand < st.up || prevClose > st.up ? upperBand : st.up;
      }
      if (Number.isNaN(st.atr)) return [NaN, 1];
      if (st.dir === -1 && b.close < lowerBand) st.dir = 1;
      else if (st.dir === 1 && b.close > upperBand) st.dir = -1;
      st.up = upperBand;
      st.dn = lowerBand;
      return [st.dir === -1 ? lowerBand : upperBand, st.dir];
    }

    return NaN;
  }

  function closeOpenPosition(barIdx: number, barTime: number, exitPrice: number, outcome: "TP" | "SL" | "EXIT", comment?: string) {
    if (posSize === 0) return;
    const dir: "LONG" | "SHORT" = posSize > 0 ? "LONG" : "SHORT";
    const profit = dir === "LONG" ? exitPrice - posEntryPrice : posEntryPrice - exitPrice;
    const roundedExit = Number(exitPrice.toFixed(2));

    closedTrades.push({
      entryBarIndex: posEntryBar,
      exitBarIndex: barIdx,
      entryTime: posEntryTime,
      exitTime: barTime,
      direction: dir,
      entryPrice: Number(posEntryPrice.toFixed(2)),
      exitPrice: roundedExit,
      profit: Number(profit.toFixed(2)),
      size: posSize,
      tpPrice: activeLimit !== undefined ? Number(activeLimit.toFixed(2)) : undefined,
      slPrice: activeStop !== undefined ? Number(activeStop.toFixed(2)) : undefined,
      outcome,
    });

    cumProfit += profit;
    if (profit > 0) winTradesCount++;
    else lossTradesCount++;
    maxEquity = Math.max(maxEquity, cumProfit);
    maxDrawdown = Math.max(maxDrawdown, maxEquity - cumProfit);

    const signalType: PineSignalEvent["signalType"] =
      outcome === "TP" ? "TAKE_PROFIT" : outcome === "SL" ? "STOP_LOSS" : "EXIT";

    events.push({
      barIndex: barIdx,
      barTime,
      signalType,
      direction: dir,
      entryPrice: Number(posEntryPrice.toFixed(2)),
      exitPrice: roundedExit,
      stopLoss: activeStop !== undefined ? Number(activeStop.toFixed(2)) : undefined,
      targetPrice: activeLimit !== undefined ? Number(activeLimit.toFixed(2)) : undefined,
      comment,
    });

    posSize = 0;
    posEntryPrice = 0;
    posEntryTime = 0;
    posEntryBar = -1;
    posEntryId = "";
    activeLimit = undefined;
    activeStop = undefined;
  }

  function execStmt(stmt: Stmt) {
    switch (stmt.kind) {
      case "assign": {
        // If `var` and already initialized (curBar > 0 and history was already created), skip initial declaration
        if (stmt.isVar && stmt.mode === "decl" && stmt.targets.every((t) => t in varValues && varPersistent.has(t))) {
          return;
        }
        const val = evalExpr(stmt.expr);
        if (stmt.targets.length > 1 && Array.isArray(val)) {
          stmt.targets.forEach((tgt, i) => setVar(tgt, val[i], stmt.isVar));
          return;
        }
        const name = stmt.targets[0];
        if (stmt.mode === "comp" && stmt.compOp) {
          const prev = toNum(getVar(name, 0));
          const cur = isNaVal(prev) ? 0 : prev;
          const rhs = toNum(val);
          const next =
            stmt.compOp === "+" ? cur + rhs
            : stmt.compOp === "-" ? cur - rhs
            : stmt.compOp === "*" ? cur * rhs
            : rhs === 0 ? NaN : cur / rhs;
          setVar(name, next, stmt.isVar);
        } else {
          setVar(name, val, stmt.isVar);
        }
        return;
      }

      case "if": {
        for (const br of stmt.branches) {
          if (br.cond === null || toBool(evalExpr(br.cond))) {
            for (const s of br.body) execStmt(s);
            break;
          }
        }
        return;
      }

      case "for": {
        const s = Math.round(toNum(evalExpr(stmt.start)));
        const e = Math.round(toNum(evalExpr(stmt.end)));
        const step = stmt.step ? Math.round(toNum(evalExpr(stmt.step))) : 1;
        if (Number.isNaN(s) || Number.isNaN(e) || step === 0) return;
        let guard = 0;
        for (let v = s; step > 0 ? v <= e : v >= e; v += step) {
          if (++guard > 2000) break;
          setVar(stmt.varName, v, false);
          for (const inner of stmt.body) execStmt(inner);
        }
        return;
      }

      case "expr": {
        evalExpr(stmt.expr);
        return;
      }
    }
  }

  // Run bar-by-bar simulation across all candles
  for (let i = 0; i < candles.length; i++) {
    curBar = i;
    const bar = candles[i];

    // 1. Carry forward persistent `var` values into bar `i`
    for (const vName of varPersistent) {
      if (vName in varValues) {
        if (!varHistory[vName]) varHistory[vName] = [];
        while (varHistory[vName].length <= i) varHistory[vName].push(varValues[vName]);
        varHistory[vName][i] = varValues[vName];
      }
    }

    // 2. Check open position bracket exits (TP/SL) on bar `i` BEFORE evaluating bar `i` entries
    if (posSize === 1) {
      if (activeLimit !== undefined && bar.high >= activeLimit) {
        closeOpenPosition(i, bar.time, activeLimit, "TP", "TP HIT");
      } else if (activeStop !== undefined && bar.low <= activeStop) {
        closeOpenPosition(i, bar.time, activeStop, "SL", "SL HIT");
      }
    } else if (posSize === -1) {
      if (activeLimit !== undefined && bar.low <= activeLimit) {
        closeOpenPosition(i, bar.time, activeLimit, "TP", "TP HIT");
      } else if (activeStop !== undefined && bar.high >= activeStop) {
        closeOpenPosition(i, bar.time, activeStop, "SL", "SL HIT");
      }
    }

    // 3. Execute all top-level statements for bar `i`
    for (const stmt of ast) {
      execStmt(stmt);
    }
  }

  return {
    success: true,
    strategyName,
    events,
    closedTrades,
    finalPosition: {
      size: posSize,
      entryPrice: posSize !== 0 ? Number(posEntryPrice.toFixed(2)) : 0,
      entryTime: posSize !== 0 ? posEntryTime : 0,
      entryBarIndex: posSize !== 0 ? posEntryBar : -1,
      currTP: activeLimit !== undefined ? Number(activeLimit.toFixed(2)) : undefined,
      currSL: activeStop !== undefined ? Number(activeStop.toFixed(2)) : undefined,
    },
    plots: Object.values(plotSeries),
  };
}
