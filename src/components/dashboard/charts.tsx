"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCompactMoney, fmtMoney } from "@/lib/format";

const SERIES_1 = "#1f5bcf";
const SERIES_2 = "#00aeef";
const GRID = "#e3e8ef";
const AXIS = "#7b8597";

export type MonthPoint = { month: string; label: string; cotizado: number; aceptado: number; count: number };

function MonthTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] shadow-[var(--shadow-pop)]">
      <div className="mb-1 font-semibold">{p.label}</div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_1 }} /> Cotizado <span className="ml-auto pl-4 font-medium tabular">{fmtMoney(p.cotizado)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_2 }} /> Aceptado <span className="ml-auto pl-4 font-medium tabular">{fmtMoney(p.aceptado)}</span>
      </div>
      <div className="mt-1 text-muted">{p.count} cotizaciones</div>
    </div>
  );
}

export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const [table, setTable] = useState(false);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-[12.5px] text-ink-2" aria-hidden={table}>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_1 }} /> Cotizado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_2 }} /> Aceptado
          </span>
        </div>
        <button onClick={() => setTable((t) => !t)} className="text-[12.5px] text-brand-600 hover:underline">
          {table ? "Ver gráfico" : "Ver tabla"}
        </button>
      </div>
      {table ? (
        <div className="max-h-[280px] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                <th className="th">Mes</th>
                <th className="th text-right">Cotizaciones</th>
                <th className="th text-right">Cotizado</th>
                <th className="th text-right">Aceptado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.month}>
                  <td className="td">{d.label}</td>
                  <td className="td text-right tabular">{d.count}</td>
                  <td className="td text-right tabular">{fmtMoney(d.cotizado)}</td>
                  <td className="td text-right tabular">{fmtMoney(d.aceptado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[280px]" role="img" aria-label="Monto cotizado y aceptado por mes, últimos 12 meses">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#cfd6e1" }} tick={{ fill: AXIS, fontSize: 12 }} interval={0} tickFormatter={(v: string) => v.split(" ")[0]} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 12 }} tickFormatter={(v: number) => fmtCompactMoney(v)} width={56} />
              <Tooltip content={<MonthTooltip />} cursor={{ fill: "rgba(31,91,207,0.06)" }} />
              <Bar dataKey="cotizado" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
              <Bar dataKey="aceptado" fill={SERIES_2} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
