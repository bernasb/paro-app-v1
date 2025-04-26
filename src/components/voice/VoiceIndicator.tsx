
import React from "react";
import { useVoice } from "@/contexts/VoiceContext";
import { Mic, Loader2, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function VoiceIndicator() {
  const { isListening, isProcessing, transcript, isWakeWordEnabled } = useVoice();

  // Don't show the main indicator if only wake word detection is active
  if (!isListening && !isProcessing && !isWakeWordEnabled) return null;

  return (
    <AnimatePresence>
      {/* Main listening/processing indicator */}
      {(isListening || isProcessing) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-background border shadow-lg rounded-full py-2 px-4 flex items-center gap-3 z-50"
        >
          {isListening ? (
            <div className="relative">
              <Mic className="h-6 w-6 text-clergy-primary" />
              <motion.div
                className="absolute inset-0 rounded-full bg-clergy-primary opacity-30"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          ) : (
            <Loader2 className="h-6 w-6 text-clergy-primary animate-spin" />
          )}
          
          <div className="flex flex-col">
            {isListening ? (
              <span className="text-sm font-medium">Listening...</span>
            ) : (
              <span className="text-sm font-medium">Processing command...</span>
            )}
            {transcript && (
              <span className="text-xs opacity-80 max-w-[200px] truncate">
                "{transcript}"
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Wake word indicator (only shows when wake word is enabled but not actively listening) */}
      {isWakeWordEnabled && !isListening && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 bg-background border shadow-lg rounded-full py-1 px-3 flex items-center gap-2 z-50 text-xs"
        >
          <Radio className="h-4 w-4 text-clergy-primary" />
          <span>Say "paro" to activate</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
