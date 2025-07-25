import { useEffect, useRef, useState } from "react";

export function useSpeechRecognition(enabled: boolean) {
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    if (!enabled) {
      (recognitionRef.current as { stop?: () => void })?.stop?.();
      return;
    }
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition, webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition || (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition, webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: unknown) => {
      let finalTranscript = "";
      const evt = event as { resultIndex: number; results: ArrayLike<{ 0: { transcript: string } }> };
      for (let i = evt.resultIndex; i < evt.results.length; ++i) {
        finalTranscript += evt.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
    };
    recognition.start();
    recognitionRef.current = recognition;
    return () => (recognitionRef.current as { stop?: () => void })?.stop?.();
  }, [enabled]);

  return transcript;
} 