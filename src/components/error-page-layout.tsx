"use client";

import { ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface ErrorPageLayoutProps {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  description: string;
  actions: ReactNode;
  footer: ReactNode;
}

export function ErrorPageLayout({
  icon,
  iconClassName = "bg-primary/10",
  title,
  description,
  actions,
  footer,
}: ErrorPageLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <AnimatePresence>
          {mounted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              className="flex flex-col items-center text-center max-w-md"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease }}
                className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${iconClassName}`}
              >
                {icon}
              </motion.div>

              {/* Message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4, ease }}
              >
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">
                  {title}
                </h1>
                <p className="text-muted-foreground mb-8">
                  {description}
                </p>
              </motion.div>

              {/* Actions */}
              <motion.div
                className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4, ease }}
              >
                {actions}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {footer}
    </div>
  );
}
