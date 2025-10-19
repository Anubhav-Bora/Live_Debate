import { useEffect, useRef, useState, useCallback } from "react";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// Use any to avoid TypeScript conflicts with existing Window interface
const getWebSpeechRecognition = (): SpeechRecognitionConstructor | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
};

// @ts-ignore - Suppress the duplicate interface error

interface UseAdvancedSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface SpeechRecognitionState {
  isListening: boolean;
  hasError: boolean;
  errorMessage: string;
  isSupported: boolean;
  isMicrophoneReady: boolean;
}

export function useAdvancedSpeechRecognition(
  enabled: boolean,
  options: UseAdvancedSpeechRecognitionOptions = {}
) {
  const { language = "en-US", continuous = true, interimResults = true } = options;

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    hasError: false,
    errorMessage: "",
    isSupported: false,
    isMicrophoneReady: false,
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualStopRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);
  const attemptCountRef = useRef(0);
  const MAX_ATTEMPTS = 10;

  const checkSpeechRecognitionSupport = useCallback(() => {
    const supported = !!getWebSpeechRecognition();
    console.log("[Speech Recognition] Browser support:", supported ? "✅ Supported" : "❌ Not supported");
    return supported;
  }, []);

  const initializeRecognition = useCallback(() => {
    if (!enabled || !checkSpeechRecognitionSupport() || recognitionRef.current) {
      console.log("[Speech Recognition] Cannot initialize - conditions not met");
      return;
    }

    try {
      const SpeechRecognition = getWebSpeechRecognition();

      if (!SpeechRecognition) {
        throw new Error("SpeechRecognition not available");
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;

      console.log("[Speech Recognition] Initializing with settings:", { language, continuous, interimResults });

      recognition.onstart = () => {
        console.log("[Speech Recognition] ✅ Recognition started - listening for audio");
        setState(prev => ({
          ...prev,
          isListening: true,
          hasError: false,
          errorMessage: "",
          isSupported: true,
          isMicrophoneReady: true,
        }));
        lastSpeechTimeRef.current = Date.now();
        attemptCountRef.current = 0;
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = "";
        let finalText = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;

          if (event.results[i].isFinal) {
            finalText += transcript + " ";
            console.log("[Speech Recognition] 📝 Final result:", { transcript, confidence });
          } else {
            interimText += transcript;
            console.log("[Speech Recognition] 🎤 Interim result:", transcript);
          }
        }

        finalTranscriptRef.current = finalText;
        setTranscript(finalText.trim());
        setInterimTranscript(interimText);
        lastSpeechTimeRef.current = Date.now();

        // Reset silence timeout on speech
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          console.log("[Speech Recognition] 🔇 Silence detected (2s) - stopping");
          if (recognitionRef.current && !isManualStopRef.current) {
            recognitionRef.current.stop();
          }
        }, 2000);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[Speech Recognition] ❌ Error:", event.error);

        let errorMsg = "";
        let shouldRestart = false;

        switch (event.error) {
          case "no-speech":
            errorMsg = "No speech detected. Speak clearly into your microphone.";
            shouldRestart = attemptCountRef.current < MAX_ATTEMPTS && enabled && !isManualStopRef.current;
            console.warn("[Speech Recognition] No speech - will retry");
            break;

          case "audio-capture":
            errorMsg = "Microphone not working. Check your device settings.";
            console.error("[Speech Recognition] Audio capture failed");
            break;

          case "not-allowed":
            errorMsg = "Microphone access denied. Please check browser permissions.";
            console.error("[Speech Recognition] Permission denied by user");
            break;

          case "network":
            errorMsg = "Network error. Retrying...";
            shouldRestart = attemptCountRef.current < MAX_ATTEMPTS && enabled && !isManualStopRef.current;
            console.warn("[Speech Recognition] Network error - will retry");
            break;

          case "service-not-allowed":
            errorMsg = "Speech service unavailable in your region.";
            console.error("[Speech Recognition] Service not allowed");
            break;

          case "bad-grammar":
            errorMsg = "Could not understand. Please try again.";
            shouldRestart = attemptCountRef.current < MAX_ATTEMPTS && enabled && !isManualStopRef.current;
            break;

          default:
            errorMsg = `Error: ${event.error}`;
            shouldRestart = attemptCountRef.current < MAX_ATTEMPTS && enabled && !isManualStopRef.current;
        }

        setState(prev => ({
          ...prev,
          isListening: false,
          hasError: !!errorMsg,
          errorMessage: errorMsg,
        }));

        recognitionRef.current = null;

        if (shouldRestart) {
          attemptCountRef.current++;
          const delayMs = Math.min(1000 * Math.pow(1.2, attemptCountRef.current - 1), 5000);
          console.log(`[Speech Recognition] Retrying in ${delayMs}ms (attempt ${attemptCountRef.current}/${MAX_ATTEMPTS})`);

          restartTimeoutRef.current = setTimeout(() => {
            if (enabled && !isManualStopRef.current) {
              initializeRecognition();
            }
          }, delayMs);
        }
      };

      recognition.onend = () => {
        console.log("[Speech Recognition] Recognition ended");
        setState(prev => ({ ...prev, isListening: false }));
        recognitionRef.current = null;

        if (enabled && !isManualStopRef.current && attemptCountRef.current < MAX_ATTEMPTS) {
          console.log("[Speech Recognition] Auto-restarting recognition");
          restartTimeoutRef.current = setTimeout(() => {
            if (enabled && !isManualStopRef.current) {
              initializeRecognition();
            }
          }, 500);
        }
      };

      recognition.start();
      console.log("[Speech Recognition] ▶️ Started listening");
    } catch (error) {
      console.error("[Speech Recognition] Failed to initialize:", error);
      setState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : "Failed to initialize speech recognition",
        isSupported: false,
      }));
    }
  }, [enabled, language, continuous, interimResults, checkSpeechRecognitionSupport]);

  const stopRecognition = useCallback(() => {
    console.log("[Speech Recognition] Stopping recognition (manual)");
    isManualStopRef.current = true;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (error) {
        console.warn("[Speech Recognition] Error stopping:", error);
      }
      recognitionRef.current = null;
    }

    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  const clearTranscript = useCallback(() => {
    console.log("[Speech Recognition] Clearing transcript");
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
  }, []);

  // Test microphone availability
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
        console.log("[Speech Recognition] ✅ Microphone is available");
        setState(prev => ({ ...prev, isMicrophoneReady: true }));
      })
      .catch(error => {
        console.error("[Speech Recognition] ❌ Microphone error:", error.message);
        setState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: `Microphone error: ${error.message}`,
          isMicrophoneReady: false,
        }));
      });
  }, []);

  // Effect to manage recognition lifecycle
  useEffect(() => {
    setState(prev => ({ ...prev, isSupported: checkSpeechRecognitionSupport() }));

    if (enabled) {
      isManualStopRef.current = false;
      attemptCountRef.current = 0;
      initializeRecognition();
    } else {
      stopRecognition();
    }

    return () => {
      stopRecognition();
    };
  }, [enabled, initializeRecognition, stopRecognition, checkSpeechRecognitionSupport]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.warn("[Speech Recognition] Error cleaning up:", error);
        }
      }
    };
  }, []);

  return {
    transcript: transcript + (interimTranscript ? ` ${interimTranscript}` : ""),
    finalTranscript: transcript,
    interimTranscript,
    isListening: state.isListening,
    hasError: state.hasError,
    errorMessage: state.errorMessage,
    isSupported: state.isSupported,
    isMicrophoneReady: state.isMicrophoneReady,
    clearTranscript,
    isAttempting: attemptCountRef.current > 0,
    attemptCount: attemptCountRef.current,
  };
}
