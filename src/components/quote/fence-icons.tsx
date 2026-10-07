import { cn } from "@/lib/cn";

// Schematic drawings (not photos) so each system is recognizable without implying a specific product image.
export function FenceIcon({ system, className }: { system: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 120 64" className={cn("h-12 w-auto", className)} aria-hidden>
      <path d="M2 60h116" {...common} strokeWidth={2} opacity={0.35} />
      {system === "PERIMETRAL" && (
        <g {...common} strokeWidth={1.6}>
          {[8, 60, 112].map((x) => (
            <rect key={x} x={x - 3} y={8} width={6} height={52} rx={1} fill="currentColor" stroke="none" />
          ))}
          {[0, 52].map((o) => (
            <g key={o}>
              {[18, 26, 34, 42, 50].map((x) => (
                <path key={x} d={`M${x + o} 12v46`} opacity={0.75} />
              ))}
              <path d={`M${11 + o} 16H${57 + o}`} />
              <path d={`M${11 + o} 30 l6 4 h34 l6 -4`} />
              <path d={`M${11 + o} 46 l6 4 h34 l6 -4`} />
              <path d={`M${11 + o} 56H${57 + o}`} />
            </g>
          ))}
        </g>
      )}
      {system === "URBANA" && (
        <g {...common} strokeWidth={1.6}>
          {[10, 60, 110].map((x) => (
            <rect key={x} x={x - 4} y={10} width={8} height={50} rx={1} fill="currentColor" stroke="none" />
          ))}
          {[0, 50].map((o) => (
            <g key={o}>
              {[20, 27, 34, 41, 48].map((x) => (
                <path key={x} d={`M${x + o} 14v44`} opacity={0.75} />
              ))}
              <path d={`M${14 + o} 16H${56 + o}`} />
              <path d={`M${14 + o} 37H${56 + o}`} />
              <path d={`M${14 + o} 56H${56 + o}`} />
            </g>
          ))}
        </g>
      )}
      {system === "INTRADOMICILIARIA" && (
        <g {...common} strokeWidth={1.6}>
          {[8, 44, 80, 112].map((x) => (
            <rect key={x} x={x - 2.5} y={30} width={5} height={30} rx={1} fill="currentColor" stroke="none" />
          ))}
          {[8, 44].map((o) => (
            <g key={o}>
              <path d={`M${o + 4} 34H${o + 34}`} />
              <path d={`M${o + 4} 56H${o + 34}`} />
              {[12, 18, 24, 30].map((x) => (
                <path key={x} d={`M${o + x} 34v22`} opacity={0.75} />
              ))}
            </g>
          ))}
          <rect x={84} y={33} width={24} height={24} rx={2} />
          <path d="M84 45h24M96 33v24" opacity={0.75} />
          <circle cx={104} cy={45} r={1.6} fill="currentColor" />
        </g>
      )}
      {system === "MAXIMA_SEGURIDAD" && (
        <g {...common} strokeWidth={1.2}>
          {[8, 60, 112].map((x) => (
            <rect key={x} x={x - 4} y={4} width={8} height={56} rx={1} fill="currentColor" stroke="none" />
          ))}
          {[0, 52].map((o) => (
            <g key={o}>
              {Array.from({ length: 12 }, (_, i) => (
                <path key={i} d={`M${15 + o + i * 3.4} 6v52`} opacity={0.7} />
              ))}
              {Array.from({ length: 8 }, (_, i) => (
                <path key={i} d={`M${13 + o} ${8 + i * 7}H${55 + o}`} opacity={0.55} />
              ))}
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
