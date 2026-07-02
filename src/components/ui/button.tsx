import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[0.01em] transition duration-300 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(215,196,154,0.18)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border border-diamond-champagne/70 bg-diamond-champagne text-black shadow-[0_10px_26px_rgba(215,196,154,0.13)] hover:bg-diamond-pearl",
        secondary: "border border-diamond-champagne/15 bg-[#11100f] text-diamond-pearl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-diamond-champagne/35 hover:bg-[#171512]",
        ghost: "text-muted-foreground hover:bg-diamond-champagne/[0.07] hover:text-diamond-pearl",
        outline: "border border-diamond-champagne/20 bg-transparent text-diamond-pearl hover:border-diamond-champagne/45 hover:bg-diamond-champagne/[0.055]"
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-7",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
