"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { data: session, status } = useSession();
  const [isVisible, setIsVisible] = useState(true);
  const [addBorder, setAddBorder] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const controls = useAnimation();

  useEffect(() => {
    let lastScrollY = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY <= lastScrollY || currentScrollY < 50);
      setAddBorder(currentScrollY > 20);
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll);
    const initialLoadFrame = window.requestAnimationFrame(() => {
      setIsInitialLoad(false);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(initialLoadFrame);
    };
  }, []);

  useEffect(() => {
    controls.start(isVisible ? "visible" : "hidden");
  }, [isVisible, controls]);

  const headerVariants = {
    hidden: { opacity: 0, y: "-100%" },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.header
          initial="hidden"
          animate={controls}
          exit="hidden"
          variants={headerVariants}
          transition={{
            duration: isInitialLoad ? 0.4 : 0.15,
            delay: isInitialLoad ? 0.1 : 0,
            ease: "easeOut",
          }}
          className={cn(
            "fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md",
          )}
        >
          <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center group">
              <Image
                src="/logo.png"
                alt="GoSafe Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </Link>

            {/* Right side - Auth */}
            <div className="flex items-center gap-4">
              {status === "loading" ? (
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              ) : session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={session.user.image || ""}
                          alt={session.user.name || "User"}
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {session.user.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-3xl p-2"
                  >
                    <div className="flex items-center gap-2 p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user.image || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {session.user.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {session.user.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {session.user.email}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut()}
                      className="cursor-pointer group hover:!bg-destructive text-destructive focus:!text-white rounded-xl"
                    >
                      <LogOut className="mr-2 group-hover:text-white h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                    {session.user.role !== "ADMIN" ? (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin"
                          className="cursor-pointer rounded-xl"
                        >
                          Switch to admin
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => signIn("google")}
                  className="rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground transition-all font-bold border-0"
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
          <motion.hr
            initial={{ opacity: 0 }}
            animate={{ opacity: addBorder ? 1 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute w-full bottom-0 border-border"
          />
        </motion.header>
      )}
    </AnimatePresence>
  );
}
