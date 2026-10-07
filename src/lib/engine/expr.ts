// Safe expression language for calculation rules edited from the UI.
// No access to JS globals: only numbers, strings, booleans, variables and a fixed function list.

export type Value = number | string | boolean | null;
export type Scope = Record<string, Value>;

type Node =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "var"; name: string }
  | { t: "un"; op: "-" | "!"; a: Node }
  | { t: "bin"; op: string; a: Node; b: Node }
  | { t: "tern"; c: Node; a: Node; b: Node }
  | { t: "call"; fn: string; args: Node[] };

export class ExprError extends Error {}

type Tok = { k: "num" | "str" | "id" | "op" | "eof"; v: string; pos: number };

const OPS = ["&&", "||", "==", "!=", "<=", ">=", "+", "-", "*", "/", "%", "<", ">", "!", "?", ":", "(", ")", ","];

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
      if (!m) throw new ExprError(`Número inválido en posición ${i + 1}`);
      out.push({ k: "num", v: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const end = src.indexOf(ch, i + 1);
      if (end < 0) throw new ExprError(`Texto sin cerrar en posición ${i + 1}`);
      out.push({ k: "str", v: src.slice(i + 1, end), pos: i });
      i = end + 1;
      continue;
    }
    if (/[A-Za-z_áéíóúñÁÉÍÓÚÑ]/.test(ch)) {
      const m = /^[A-Za-z_áéíóúñÁÉÍÓÚÑ][A-Za-z0-9_áéíóúñÁÉÍÓÚÑ]*/.exec(src.slice(i))!;
      out.push({ k: "id", v: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new ExprError(`Carácter no permitido "${ch}" en posición ${i + 1}`);
    out.push({ k: "op", v: op, pos: i });
    i += op.length;
  }
  out.push({ k: "eof", v: "", pos: src.length });
  return out;
}

const PREC: Record<string, number> = {
  "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6,
};

class Parser {
  private i = 0;
  constructor(private toks: Tok[]) {}
  private peek() { return this.toks[this.i]; }
  private next() { return this.toks[this.i++]; }
  private expect(v: string) {
    const t = this.next();
    if (t.v !== v) throw new ExprError(`Se esperaba "${v}" en posición ${t.pos + 1}`);
  }
  parse(): Node {
    const n = this.ternary();
    if (this.peek().k !== "eof") throw new ExprError(`Texto inesperado "${this.peek().v}" en posición ${this.peek().pos + 1}`);
    return n;
  }
  private ternary(): Node {
    const c = this.binary(1);
    if (this.peek().v === "?") {
      this.next();
      const a = this.ternary();
      this.expect(":");
      const b = this.ternary();
      return { t: "tern", c, a, b };
    }
    return c;
  }
  private binary(minPrec: number): Node {
    let left = this.unary();
    for (;;) {
      const t = this.peek();
      const p = t.k === "op" ? PREC[t.v] : undefined;
      if (p === undefined || p < minPrec) return left;
      this.next();
      const right = this.binary(p + 1);
      left = { t: "bin", op: t.v, a: left, b: right };
    }
  }
  private unary(): Node {
    const t = this.peek();
    if (t.v === "-" || t.v === "!") {
      this.next();
      return { t: "un", op: t.v, a: this.unary() };
    }
    return this.primary();
  }
  private primary(): Node {
    const t = this.next();
    if (t.k === "num") return { t: "num", v: Number(t.v) };
    if (t.k === "str") return { t: "str", v: t.v };
    if (t.v === "(") {
      const n = this.ternary();
      this.expect(")");
      return n;
    }
    if (t.k === "id") {
      if (t.v === "true" || t.v === "verdadero") return { t: "num", v: 1 };
      if (t.v === "false" || t.v === "falso") return { t: "num", v: 0 };
      if (t.v === "null") return { t: "str", v: "" };
      if (this.peek().v === "(") {
        this.next();
        const args: Node[] = [];
        if (this.peek().v !== ")") {
          for (;;) {
            args.push(this.ternary());
            if (this.peek().v === ",") { this.next(); continue; }
            break;
          }
        }
        this.expect(")");
        const fn = t.v.toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(FUNCS, fn)) throw new ExprError(`Función desconocida "${t.v}"`);
        return { t: "call", fn, args };
      }
      return { t: "var", name: t.v };
    }
    throw new ExprError(`Expresión incompleta en posición ${t.pos + 1}`);
  }
}

// Excel ROUND semantics: half away from zero, after trimming binary noise to 15 significant digits.
export function excelRound(x: number, digits = 0): number {
  const f = 10 ** digits;
  const scaled = Number((Math.abs(x) * f).toPrecision(15));
  return (Math.sign(x) * Math.round(scaled)) / f;
}

export function excelRoundUp(x: number, digits = 0): number {
  const f = 10 ** digits;
  const scaled = Number((Math.abs(x) * f).toPrecision(15));
  return (Math.sign(x) * Math.ceil(scaled)) / f;
}

function num(v: Value, fn: string): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === null || v === "") return 0;
  const n = Number(v);
  if (Number.isNaN(n)) throw new ExprError(`"${fn}" esperaba un número y recibió "${v}"`);
  return n;
}

function truthy(v: Value): boolean {
  if (typeof v === "string") return v !== "" && v !== "0";
  return Boolean(v);
}

const FUNCS: Record<string, (args: Value[]) => Value> = {
  roundup: (a) => excelRoundUp(num(a[0], "roundup"), a[1] === undefined ? 0 : num(a[1], "roundup")),
  redondear_mas: (a) => excelRoundUp(num(a[0], "redondear_mas"), a[1] === undefined ? 0 : num(a[1], "redondear_mas")),
  round: (a) => excelRound(num(a[0], "round"), a[1] === undefined ? 0 : num(a[1], "round")),
  redondear: (a) => excelRound(num(a[0], "redondear"), a[1] === undefined ? 0 : num(a[1], "redondear")),
  ceil: (a) => Math.ceil(Number(num(a[0], "ceil").toPrecision(15))),
  floor: (a) => Math.floor(Number(num(a[0], "floor").toPrecision(15))),
  min: (a) => Math.min(...a.map((x) => num(x, "min"))),
  max: (a) => Math.max(...a.map((x) => num(x, "max"))),
  abs: (a) => Math.abs(num(a[0], "abs")),
  if: (a) => (truthy(a[0]) ? a[1] ?? null : a[2] ?? null),
  si: (a) => (truthy(a[0]) ? a[1] ?? null : a[2] ?? null),
};

function evalNode(n: Node, scope: Scope): Value {
  switch (n.t) {
    case "num": return n.v;
    case "str": return n.v;
    case "var": {
      if (!Object.prototype.hasOwnProperty.call(scope, n.name)) throw new ExprError(`Variable desconocida "${n.name}"`);
      return scope[n.name];
    }
    case "un": {
      const a = evalNode(n.a, scope);
      return n.op === "-" ? -num(a, "-") : !truthy(a);
    }
    case "tern": return truthy(evalNode(n.c, scope)) ? evalNode(n.a, scope) : evalNode(n.b, scope);
    case "call": {
      if (n.fn === "if" || n.fn === "si") {
        if (n.args.length < 2) throw new ExprError(`"${n.fn}" necesita al menos 2 argumentos`);
        return truthy(evalNode(n.args[0], scope)) ? evalNode(n.args[1], scope) : n.args[2] ? evalNode(n.args[2], scope) : null;
      }
      return FUNCS[n.fn](n.args.map((x) => evalNode(x, scope)));
    }
    case "bin": {
      if (n.op === "&&") return truthy(evalNode(n.a, scope)) && truthy(evalNode(n.b, scope));
      if (n.op === "||") return truthy(evalNode(n.a, scope)) || truthy(evalNode(n.b, scope));
      const a = evalNode(n.a, scope);
      const b = evalNode(n.b, scope);
      switch (n.op) {
        case "==": return typeof a === "string" || typeof b === "string" ? String(a ?? "") === String(b ?? "") : num(a, "==") === num(b, "==");
        case "!=": return typeof a === "string" || typeof b === "string" ? String(a ?? "") !== String(b ?? "") : num(a, "!=") !== num(b, "!=");
        case "<": return num(a, "<") < num(b, "<");
        case "<=": return num(a, "<=") <= num(b, "<=");
        case ">": return num(a, ">") > num(b, ">");
        case ">=": return num(a, ">=") >= num(b, ">=");
        case "+": return num(a, "+") + num(b, "+");
        case "-": return num(a, "-") - num(b, "-");
        case "*": return num(a, "*") * num(b, "*");
        case "/": {
          const d = num(b, "/");
          if (d === 0) throw new ExprError("División para cero");
          return num(a, "/") / d;
        }
        case "%": return num(a, "%") % num(b, "%");
      }
    }
  }
  throw new ExprError("Expresión inválida");
}

const cache = new Map<string, Node>();

export function compile(src: string): Node {
  const key = src.trim();
  let n = cache.get(key);
  if (!n) {
    if (!key) throw new ExprError("La fórmula está vacía");
    n = new Parser(tokenize(key)).parse();
    if (cache.size > 2000) cache.clear();
    cache.set(key, n);
  }
  return n;
}

export function evaluate(src: string, scope: Scope): Value {
  return evalNode(compile(src), scope);
}

export function evaluateNumber(src: string, scope: Scope): number {
  return num(evaluate(src, scope), src);
}

export function evaluateBool(src: string, scope: Scope): boolean {
  return truthy(evaluate(src, scope));
}

export function referencedVariables(src: string): string[] {
  const names = new Set<string>();
  const walk = (n: Node) => {
    if (n.t === "var") names.add(n.name);
    else if (n.t === "un") walk(n.a);
    else if (n.t === "bin") { walk(n.a); walk(n.b); }
    else if (n.t === "tern") { walk(n.c); walk(n.a); walk(n.b); }
    else if (n.t === "call") n.args.forEach(walk);
  };
  walk(compile(src));
  return [...names];
}

export const FUNCTION_HELP: { name: string; help: string }[] = [
  { name: "roundup(x)", help: "Redondea hacia arriba (como REDONDEAR.MAS de Excel)" },
  { name: "round(x, d)", help: "Redondea a d decimales (como REDONDEAR de Excel)" },
  { name: "ceil(x) / floor(x)", help: "Entero superior / inferior" },
  { name: "min(a, b, …) / max(a, b, …)", help: "Mínimo / máximo" },
  { name: "if(cond, a, b)", help: "Si cond es verdadera devuelve a, si no b (también: cond ? a : b)" },
];
