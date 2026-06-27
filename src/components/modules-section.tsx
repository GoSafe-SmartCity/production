"use client";

import { AuroraText } from "@/components/ui/aurora-text";

export function ModulesSection() {
  return (
    <section className="container pb-16 pt-16">
      <div className="w-full">

        <div className="text-left mb-10">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-foreground">
            Values <AuroraText>GoSafe</AuroraText> Delivers
          </h2>
          <p className="text-base sm:text-lg lg:text-xl font-medium text-foreground max-w-2xl mt-3 leading-relaxed">
            Intelligent routing, real-time risk assessment, and community rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Card 1: Giao Diện Bản Đồ/Giám Sát (lg:col-span-2, ratio 2:1) */}
          <div className="lg:col-span-2 rounded-3xl border border-border/50 shadow-sm relative overflow-hidden min-h-[280px] bg-card group hover:border-border transition-all">
            <img
              src="/assets/city.jpg"
              alt="Urban city traffic"
              className="w-full h-[280px] object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {/* Card 2: Chỉ Số Hoạt Động Hệ Thống (lg:col-span-1, ratio :1) */}
          <div className="lg:col-span-1 p-8 rounded-3xl bg-card border border-border/50 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[280px] group hover:border-border transition-all">
            <span className="text-7xl font-normal text-primary">150+</span>
            <h4 className="font-bold text-xl text-foreground mt-4">Safe Detours</h4>
            <p className="text-xs text-foreground/75 mt-2">
              Commuters successfully rerouted away from active flooding.
            </p>
          </div>

          {/* Card 3: Local AI Scoring Engine */}
          <div className="lg:col-span-1 p-8 rounded-3xl bg-card border border-border/50 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[280px] group hover:border-border transition-all">
            <span className="text-7xl font-normal text-primary">94%</span>
            <h4 className="font-bold text-xl text-foreground mt-4">High Risk</h4>
            <p className="text-xs text-foreground/75 mt-2">
              Dynamic danger evaluation.
            </p>
          </div>

          {/* Card 4: Smart Map */}
          <div className="lg:col-span-1 p-8 rounded-3xl border border-border/50 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[280px] bg-card group hover:border-border transition-all">
            {/* Full Image background */}
            <img
              src="/assets/banner.png"
              alt="Smart Map Navigation"
              className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
            />

            {/* Top Fade overlay - gradual fade to prevent text overlay clashing */}
            <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-card via-card/85 via-card/30 to-transparent z-10 pointer-events-none" />

            {/* Content sitting relative above the blur */}
            <div className="relative z-20">
              <h4 className="font-bold text-xl text-foreground">Smart Map</h4>
              <p className="text-xs text-foreground/80 font-medium mt-2">
                Instant safety navigation.
              </p>
            </div>

            {/* Empty spacer to reveal bottom map area clearly */}
            <div className="h-16 relative z-20" />
          </div>

          {/* Card 5: Voucher Partners */}
          <div className="lg:col-span-1 p-8 rounded-3xl bg-card border border-border/50 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[280px] group hover:border-border transition-all">
            <div className="flex justify-between items-center gap-4">
              <div>
                <span className="text-7xl font-normal text-primary">50+</span>
                <h4 className="font-bold text-xl text-foreground mt-4">Voucher Partners</h4>
                <p className="text-xs text-foreground/75 mt-2">
                  Redeem safety credits for vouchers.
                </p>
              </div>
              
              {/* Big UrbanLoop logo standing static on the right with blur background (2x larger) */}
              <div className="relative shrink-0 mr-2">
                <div className="absolute -inset-4 bg-teal-500/20 rounded-full filter blur-xl opacity-80" />
                <img 
                  src="/assets/companies/urbanloop.png" 
                  alt="UrbanLoop" 
                  className="h-20 w-auto object-contain rounded-2xl dark:brightness-110 relative z-10 select-none" 
                />
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
