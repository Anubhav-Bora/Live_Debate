import { useEffect, useRef, useState, useCallback } from "react";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
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
  maxAlternatives: number;
  grammars?: unknown;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  restartDelay?: number;
  clearDelay?: number;
  maxRestartAttempts?: number;
  restartBackoffMultiplier?: number;
}

interface SpeechRecognitionState {
  isListening: boolean;
  hasError: boolean;
  errorMessage: string;
  isSupported: boolean;
}

export function useSpeechRecognition(
  enabled: boolean,
  options: UseSpeechRecognitionOptions = {}
) {
  const {
    language = "en-US",
    continuous = true,
    interimResults = true,
    maxAlternatives = 1,
    restartDelay = 3000,
    clearDelay = 30000,
    maxRestartAttempts = 5,
    restartBackoffMultiplier = 1.5,
  } = options;

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    hasError: false,
    errorMessage: "",
    isSupported: false,
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualStopRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);
  const restartAttemptsRef = useRef(0);
  const isStartingRef = useRef(false);

  const isSupported = useCallback(() => {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const startRecognition = useCallback(() => {
    console.log("[useSpeechRecognition] startRecognition called:", {
      enabled,
      isSupported: isSupported(),
      recognitionRef: !!recognitionRef.current,
      isStarting: isStartingRef.current
    });

    if (!enabled || !isSupported() || recognitionRef.current || isStartingRef.current) {
      console.log("[useSpeechRecognition] Early return - conditions not met");
      return;
    }

    isStartingRef.current = true;

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      
      console.log("[useSpeechRecognition] SpeechRecognition API:", SpeechRecognition ? 'Available' : 'Not available');

      if (!SpeechRecognition) {
        console.error("[useSpeechRecognition] Speech recognition API not supported");
        setState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: "Speech recognition not supported",
          isSupported: false,
        }));
        isStartingRef.current = false;
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      recognition.maxAlternatives = maxAlternatives;

      recognition.onstart = () => {
        console.log("[useSpeechRecognition] Recognition started - now listening");
        isStartingRef.current = false;
        setState(prev => ({
          ...prev,
          isListening: true,
          hasError: false,
          errorMessage: "",
          isSupported: true,
        }));
        lastSpeechTimeRef.current = Date.now();
        restartAttemptsRef.current = 0;
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscriptLocal = "";
        let finalTranscriptLocal = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          console.log("[useSpeechRecognition] Result received:", {
            index: i,
            transcript,
            isFinal: result.isFinal,
            confidence: result[0].confidence
          });

          if (result.isFinal) {
            finalTranscriptLocal += transcript + " ";
          } else {
            interimTranscriptLocal += transcript;
          }
        }

        finalTranscriptRef.current = finalTranscriptLocal;
        setTranscript(finalTranscriptLocal.trim());
        setInterimTranscript(interimTranscriptLocal);
        lastSpeechTimeRef.current = Date.now();
        
        console.log("[useSpeechRecognition] Updated transcript:", {
          final: finalTranscriptLocal.trim(),
          interim: interimTranscriptLocal
        });

        if (clearTimeoutRef.current) {
          clearTimeout(clearTimeoutRef.current);
        }
        clearTimeoutRef.current = setTimeout(() => {
          if (Date.now() - lastSpeechTimeRef.current >= clearDelay) {
            finalTranscriptRef.current = "";
            setTranscript("");
            setInterimTranscript("");
          }
        }, clearDelay);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[useSpeechRecognition] Error event:", event.error, event.message);
        isStartingRef.current = false;
        
        let shouldRestart = false;
        let errorMessage = "";

        switch (event.error) {
          case "network":
            errorMessage = "Network error";
            shouldRestart = restartAttemptsRef.current < maxRestartAttempts;
            console.warn("[useSpeechRecognition] Network error - will retry");
            break;
          case "not-allowed":
            errorMessage = "Microphone access denied";
            console.warn("[useSpeechRecognition] Microphone access denied by user");
            break;
          case "service-not-allowed":
            errorMessage = "Speech recognition service not allowed";
            console.warn("[useSpeechRecognition] Service not allowed");
            break;
          case "bad-grammar":
            shouldRestart = restartAttemptsRef.current < maxRestartAttempts;
            console.warn("[useSpeechRecognition] Bad grammar - will retry");
            break;
          case "language-not-supported":
            errorMessage = `Language ${language} not supported`;
            console.warn(`[useSpeechRecognition] Language ${language} not supported`);
            break;
          case "no-speech":
            shouldRestart = enabled && !isManualStopRef.current && restartAttemptsRef.current < maxRestartAttempts;
            console.warn("[useSpeechRecognition] No speech detected - will retry");
            break;
          case "audio-capture":
            errorMessage = "Audio capture failed";
            shouldRestart = restartAttemptsRef.current < maxRestartAttempts;
            console.error("[useSpeechRecognition] Audio capture failed");
            break;
          case "aborted":
            shouldRestart = false;
            console.log("[useSpeechRecognition] Recognition aborted");
            break;
          default:
            shouldRestart = restartAttemptsRef.current < maxRestartAttempts;
            console.warn("[useSpeechRecognition] Unknown error - will retry");
        }

        console.log("[useSpeechRecognition] Error handling:", { errorMessage, shouldRestart, attempts: restartAttemptsRef.current });

        setState(prev => ({
          ...prev,
          hasError: !!errorMessage,
          errorMessage,
          isListening: false,
        }));

        recognitionRef.current = null;

        if (shouldRestart && enabled && !isManualStopRef.current) {
          restartAttemptsRef.current++;
          const delay = restartDelay * Math.pow(restartBackoffMultiplier, restartAttemptsRef.current - 1);
          
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          
          restartTimeoutRef.current = setTimeout(() => {
            if (enabled && !isManualStopRef.current) {
              startRecognition();
            }
          }, Math.min(delay, 30000));
        }
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        setState(prev => ({ ...prev, isListening: false }));
        recognitionRef.current = null;

        if (enabled && !isManualStopRef.current && restartAttemptsRef.current < maxRestartAttempts) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          restartTimeoutRef.current = setTimeout(() => {
            if (enabled && !isManualStopRef.current) {
              startRecognition();
            }
          }, restartDelay);
        }
      };

      recognition.start();
    } catch {
      isStartingRef.current = false;
      setState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: "Failed to initialize speech recognition",
        isListening: false,
      }));
    }
  }, [enabled, language, continuous, interimResults, maxAlternatives, restartDelay, clearDelay, maxRestartAttempts, restartBackoffMultiplier, isSupported]);

  const stopRecognition = useCallback(() => {
    isManualStopRef.current = true;
    isStartingRef.current = false;
    restartAttemptsRef.current = 0;
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn("Error stopping recognition:", error);
      }
      recognitionRef.current = null;
    }

    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  const clearTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    lastSpeechTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    setState(prev => ({ ...prev, isSupported: isSupported() }));

    if (enabled) {
      isManualStopRef.current = false;
      restartAttemptsRef.current = 0;
      startRecognition();
    } else {
      stopRecognition();
    }

    return () => {
      stopRecognition();
    };
  }, [enabled, startRecognition, stopRecognition, isSupported]);

  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.warn("Error aborting recognition:", error);
        }
      }
    };
  }, []);

  const fullTranscript = transcript + (interimTranscript ? ` ${interimTranscript}` : "");

  return {
    transcript: fullTranscript,
    finalTranscript: transcript,
    interimTranscript,
    isListening: state.isListening,
    hasError: state.hasError,
    errorMessage: state.errorMessage,
    isSupported: state.isSupported,
    clearTranscript,
    startRecognition,
    stopRecognition,
  };
}