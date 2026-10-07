import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm disabled:bg-brand-300",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline: "border border-line-strong bg-white text-ink hover:bg-page",
  ghost: "text-ink-2 hover:bg-page hover:text-ink",
  danger: "bg-bad text-white hover:bg-bad-ink",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-[14px] gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
  icon: "h-9 w-9 justify-center",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(
    "inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition outline-none focus-visible:ring-3 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
    className,
  );

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant, size, className, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />
));
Button.displayName = "Button";

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
