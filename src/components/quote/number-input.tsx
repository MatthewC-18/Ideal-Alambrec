"use client";

import { forwardRef, useEffect, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "" || t === "." || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const show = (n: number | null | undefined, digits: number, fixed = false) =>
  n === null || n === undefined ? "" : (fixed ? n.toFixed(digits) : String(Math.round(n * 10 ** digits) / 10 ** digits)).replace(".", ",");

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: number | null | undefined;
  onValueChange: (n: number | null) => void;
  digits?: number;
  suffix?: string;
  prefix?: string;
  fixed?: boolean;
};

// Text input that accepts "2,5" or "2.5" and only reports parsed numbers upward.
export const NumberInput = forwardRef<HTMLInputElement, Props>(({ value, onValueChange, digits = 2, suffix, prefix, fixed, className, ...rest }, ref) => {
  const [text, setText] = useState(show(value, digits, fixed));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(show(value, digits, fixed));
  }, [value, digits, focused, fixed]);
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-muted">{prefix}</span>}
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn("input tabular text-right", prefix && "pl-7", suffix && (suffix.length > 2 ? "pr-12" : "pr-8"), className)}
        value={text}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          setText(show(parseDecimal(text), digits, fixed));
        }}
        onChange={(e) => {
          setText(e.target.value);
          onValueChange(parseDecimal(e.target.value));
        }}
        {...rest}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted">{suffix}</span>}
    </div>
  );
});
NumberInput.displayName = "NumberInput";
