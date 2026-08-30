import { useCallback, useEffect, useRef, useState } from "react";

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string; confidence: number };
  }>;
}

interface RecognitionErrorEvent {
  error: string;
}

interface RecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface RecognitionConstructor {
  new (): RecognitionInstance;
}

type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

function recognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}

function appendWithoutImmediateDuplicate(existing: string, segment: string) {
  const clean = segment.replace(/\s+/g, " ").trim();
  if (!clean) return existing;
  if (existing.toLowerCase().endsWith(clean.toLowerCase())) return existing;
  return `${existing}${existing ? " " : ""}${clean}`.trim();
}

export function useAdvancedSpeechRecognition(
  enabled: boolean,
  options: { language?: string; continuous?: boolean; interimResults?: boolean } = {},
) {
  const { language = "en-US", continuous = true, interimResults = true } = options;
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const transcriptRef = useRef("");
  const enabledRef = useRef(enabled);
  const blockedRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<() => void>(() => undefined);
  const retryCountRef = useRef(0);

  const cancelRestart = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
  }, []);

  const scheduleRestart = useCallback(() => {
    if (!enabledRef.current || blockedRef.current || restartTimerRef.current) return;
    const delay = Math.min(300 * 2 ** Math.min(retryCountRef.current, 4), 4_000);
    retryCountRef.current += 1;
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      startRef.current();
    }, delay);
  }, []);

  const startRecognition = useCallback(() => {
    if (!enabledRef.current || blockedRef.current || recognitionRef.current) return;
    const Recognition = recognitionConstructor();
    if (!Recognition) return;

    try {
      const recognition = new Recognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        retryCountRef.current = 0;
        setIsListening(true);
        setErrorMessage("");
      };
      recognition.onresult = (event) => {
        let interim = "";
        let current = transcriptRef.current;
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) current = appendWithoutImmediateDuplicate(current, result[0].transcript);
          else interim += `${result[0].transcript} `;
        }
        transcriptRef.current = current;
        setFinalTranscript(current);
        setInterimTranscript(interim.trim());
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          blockedRef.current = true;
          setErrorMessage("Microphone or speech recognition permission was denied. Allow it in site settings, then retry.");
        } else if (event.error === "audio-capture") {
          blockedRef.current = true;
          setErrorMessage("No working microphone was found. Check the selected input device.");
        } else if (event.error === "network") {
          setErrorMessage("Speech recognition lost its network connection. Retrying…");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          setErrorMessage("Speech recognition paused unexpectedly. Retrying…");
        }
      };
      recognition.onend = () => {
        if (recognitionRef.current === recognition) recognitionRef.current = null;
        setIsListening(false);
        if (enabledRef.current && !blockedRef.current) scheduleRestart();
      };
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      const name = error instanceof DOMException ? error.name : "";
      if (name !== "InvalidStateError") setErrorMessage("Speech recognition could not start. Please retry.");
      scheduleRestart();
    }
  }, [continuous, interimResults, language, scheduleRestart]);
  startRef.current = startRecognition;

  const stopRecognition = useCallback(() => {
    cancelRestart();
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        recognition.abort();
      }
    }
    setIsListening(false);
    setInterimTranscript("");
  }, [cancelRestart]);

  const retry = useCallback(() => {
    blockedRef.current = false;
    retryCountRef.current = 0;
    setErrorMessage("");
    stopRecognition();
    enabledRef.current = enabled;
    if (enabled) startRef.current();
  }, [enabled, stopRecognition]);

  const replaceTranscript = useCallback((value: string) => {
    const clean = value.replace(/\s+/g, " ").trim();
    transcriptRef.current = clean;
    setFinalTranscript(clean);
    setInterimTranscript("");
  }, []);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
  }, []);

  useEffect(() => {
    const supported = Boolean(recognitionConstructor());
    setIsSupported(supported);
    enabledRef.current = enabled;
    if (enabled && supported) startRef.current();
    else stopRecognition();
    return () => {
      enabledRef.current = false;
      stopRecognition();
    };
  }, [enabled, stopRecognition]);

  return {
    transcript: `${finalTranscript}${interimTranscript ? ` ${interimTranscript}` : ""}`.trim(),
    finalTranscript,
    interimTranscript,
    isListening,
    hasError: Boolean(errorMessage),
    errorMessage,
    isSupported,
    clearTranscript,
    replaceTranscript,
    retry,
  };
}
