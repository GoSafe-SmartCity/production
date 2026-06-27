"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DotPattern } from "@/components/ui/dot-pattern";

interface FooterProps {
  className?: string;
  animate?: boolean;
  animationDelay?: number;
}

export function Footer({ className, animate = false, animationDelay = 0 }: FooterProps) {
  const content = (
    <div className="container flex flex-col md:flex-row items-center justify-between gap-6 px-4 sm:px-6 relative z-20">
      {/* Left side: Logo only (Bigger) */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left max-w-xl">
        <Link href="/" className="transition-transform hover:scale-105 shrink-0">
          <Image
            src="/logo.png"
            alt="GoSafe Logo"
            width={64}
            height={64}
            className="object-contain"
          />
        </Link>
      </div>

      {/* Right side: GitHub link & Year */}
      <div className="flex flex-col items-center md:items-end gap-2 text-xs font-semibold shrink-0">
        <a 
          href="https://github.com/GoSafe-SmartCity" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.478-10-10-10z" />
          </svg>
          GitHub Repository
        </a>
        <span className="text-[10px] text-muted-foreground font-normal">
          © 2026 GoSafe
        </span>
      </div>
    </div>
  );

  if (animate) {
    return (
      <motion.footer
        className={cn("relative z-10 py-8 sm:py-10 mt-auto overflow-hidden", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: animationDelay }}
      >
        <DotPattern
          width={12}
          height={12}
          cx={1}
          cy={1}
          cr={1.2}
          className="absolute top-0 left-0 h-full w-full fill-primary/30 opacity-75 [mask-image:radial-gradient(300px_circle_at_top_left,white,transparent)]"
        />
        {content}
      </motion.footer>
    );
  }

  return (
    <footer className={cn("relative z-10 py-8 sm:py-10 mt-auto overflow-hidden", className)}>
      <DotPattern
        width={12}
        height={12}
        cx={1}
        cy={1}
        cr={1.2}
        className="absolute top-0 left-0 h-full w-full fill-primary/30 opacity-75 [mask-image:radial-gradient(300px_circle_at_top_left,white,transparent)]"
      />
      {content}
    </footer>
  );
}
