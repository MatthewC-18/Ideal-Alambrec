"""Recalculate the legacy Excel cotizador in LibreOffice for many input combinations.

Writes a JSON fixture used by tests/engine.golden.test.ts to compare the web engine
line-by-line against the original spreadsheet. The output contains price data, so it is
gitignored (tests/fixtures/*.local.json).

Usage: python3 -I scripts/golden/gen_golden.py <cotizador.xlsm> <output.json>
Requires LibreOffice (soffice) with the Python UNO bridge.
"""
import shutil
import json, os, subprocess, sys, time, itertools, random, tempfile
import uno
from com.sun.star.beans import PropertyValue

def pv(n, v):
    p = PropertyValue(); p.Name = n; p.Value = v; return p

profile = tempfile.mkdtemp(prefix="lo_prof_")
proc = subprocess.Popen(["soffice", f"-env:UserInstallation=file://{profile}", "--headless", "--invisible", "--nologo", "--norestore",
                         "--accept=socket,host=127.0.0.1,port=2002;urp;"], env={**os.environ, "SAL_USE_VCLPLUGIN": "svp"},
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
local = uno.getComponentContext()
resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
for _ in range(60):
    try:
        ctx = resolver.resolve("uno:socket,host=127.0.0.1,port=2002;urp;StarOffice.ComponentContext"); break
    except Exception: time.sleep(0.5)
desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
work = os.path.join(tempfile.mkdtemp(prefix="golden_"), "work.xlsm")
shutil.copy(sys.argv[1], work)
url = uno.systemPathToFileUrl(work)
doc = desktop.loadComponentFromURL(url, "_blank", 0, (pv("Hidden", True), pv("MacroExecutionMode", 0)))
sh = doc.Sheets
ing, sal = sh.getByName("Ingreso"), sh.getByName("Salida")

def setv(cell, v):
    c = ing.getCellRangeByName(cell)
    if isinstance(v, str): c.setString(v)
    else: c.setValue(v)

def get(cell):
    c = sal.getCellRangeByName(cell)
    t = c.getType().value  # EMPTY, VALUE, TEXT, FORMULA
    if c.getError(): return None
    s = c.getString()
    if t == "FORMULA":
        ft = c.FormulaResultType2
        if ft == 1: return c.getValue()
        return s
    if t == "VALUE": return c.getValue()
    return s

SECTIONS = {
    "PERIMETRAL": (range(26, 45), "G62", "G68", "G70", "L61"),
    "URBANA": (range(111, 131), "G148", "G154", "G156", "L147"),
    "INTRADOMICILIARIA": (range(197, 216), "G234", "G240", "G242", "L233"),
    "MAXIMA SEGURIDAD": (range(283, 301), "G319", "G325", "G327", "L318"),
}
TIERS = ["CercaSolu", "Mallero", "Distribuidor", "Mayorista", "Franquicia", "Detallista", "PVS"]
random.seed(7)
cases = []
for L in [10, 24, 37.5, 130, 501, 1250]:
    for h in [1.11, 2.08, 2.4, 3.05, 4.02]:
        for placa in "NS":
            for puas in "NS":
                for incl in [0, 0.1]:
                    cases.append(dict(tipo="PERIMETRAL", L=L, altura=h, placa=placa, puas=puas, incl=incl, tier=random.choice(TIERS), dl=random.choice([0, 0.1]), dp=0))
for L in [10, 24, 130, 777]:
    for puas in "NS":
        for incl in [0, 0.15]:
            cases.append(dict(tipo="URBANA", L=L, altura=2.08, placa="N", puas=puas, incl=incl, tier=random.choice(TIERS), dl=0, dp=0))
for L in [5, 10, 24, 130, 333]:
    cases.append(dict(tipo="INTRADOMICILIARIA", L=L, altura=1.25, placa="N", puas="N", incl=0, tier=random.choice(TIERS), dl=0, dp=0))
for L in [10, 49, 130, 600]:
    for h in [2.1, 2.45, 3]:
        for incl in [0, 0.1]:
            cases.append(dict(tipo="MAXIMA SEGURIDAD", L=L, altura=h, placa="N", puas="N", incl=incl, tier=random.choice(TIERS), dl=0, dp=0))

out = []
for cs in cases:
    setv("C4", cs["tipo"]); setv("D22", cs["L"]); setv("H22", cs["tier"]); setv("D23", cs["placa"]); setv("D24", cs["puas"])
    setv("D25", cs["incl"]); setv("H28", cs["dl"]); setv("H29", cs["dp"]); setv("D29", "N")
    if cs["tipo"] == "MAXIMA SEGURIDAD": setv("E26", cs["altura"])
    else: setv("D26", cs["altura"])
    doc.calculateAll()
    rows, sub, iva, tot, peso = SECTIONS[cs["tipo"]]
    lines = []
    for r in rows:
        code, qty, desc, price, total = get(f"B{r}"), get(f"C{r}"), get(f"D{r}"), get(f"F{r}"), get(f"G{r}")
        if isinstance(qty, float) and isinstance(price, float):
            lines.append(dict(row=r, code=code, qty=qty, desc=desc, price=price, total=total))
    out.append(dict(input=cs, lines=lines, subtotal=get(sub), iva=get(iva), total=get(tot), peso=get(peso)))
doc.close(True)
proc.terminate()
json.dump(out, open(sys.argv[2], "w"), indent=1, ensure_ascii=False)
print(len(out), "cases")
