"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Stage 0: Logo appears
    // Stage 1: HCMUTE appears
    // Stage 2: S-Link & QR Code appears
    // Stage 3: Subtitle appears
    // Stage 4: Complete
    
    const timers = [
      setTimeout(() => setStage(1), 400),
      setTimeout(() => setStage(2), 800),
      setTimeout(() => setStage(3), 1200),
      setTimeout(() => {
        setIsComplete(true);
        onComplete();
      }, 2200),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-8"
          >
            <Image
              src="/ute-logo.png"
              alt="HCMUTE Logo"
              width={80}
              height={80}
              className="rounded-2xl"
            />
          </motion.div>

          {/* Title */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-4xl md:text-5xl lg:text-6xl font-bold px-4">
            {/* HCMUTE */}
            <motion.span
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={stage >= 1 ? { opacity: 1, filter: "blur(0px)" } : {}}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-gradient-to-r from-[#2563eb] via-[#7c3aed] to-[#db2777] bg-clip-text text-transparent"
            >
              HCMUTE
            </motion.span>

            {/* S-Link & QR Code */}
            <motion.span
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={stage >= 2 ? { opacity: 1, filter: "blur(0px)" } : {}}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-foreground"
            >
              S-Link & QR Code
            </motion.span>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={stage >= 3 ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-6 text-lg text-muted-foreground text-center max-w-md px-4"
          >
            Rút gọn liên kết và tạo mã QR dễ dàng với công cụ miễn phí của HCMUTE
          </motion.p>

          {/* Loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={stage >= 3 ? { opacity: 1 } : {}}
            className="mt-8 flex items-center gap-1.5"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
