"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Stethoscope } from "lucide-react";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import type { DoctorResult } from "@/types/scan";

export function ScanCompleteBanner({
  doctor,
  show,
}: {
  doctor: DoctorResult;
  show: boolean;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-teal/30 bg-teal-muted px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/20 text-teal">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-foreground">AI Diagnosis Complete</p>
              <p className="mono-tag text-[11px] text-muted-foreground">
                {doctor.issues.length} issue{doctor.issues.length === 1 ? "" : "s"} found · generating optimization report
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-right">
            <div>
              <p className="mono-tag text-[10px] text-subtle-foreground">HEALTH</p>
              <p className="font-display text-lg font-semibold text-teal">
                <AnimatedNumber value={doctor.health_score} duration={0.6} />
              </p>
            </div>
            <div>
              <p className="mono-tag text-[10px] text-subtle-foreground">SAVINGS</p>
              <p className="font-display text-lg font-semibold text-teal">
                <AnimatedNumber value={doctor.total_estimated_savings_tokens} duration={0.6} /> tok
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
