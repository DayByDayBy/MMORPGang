import { useState, useRef, useCallback } from "react";
import { MAX_CLIP_DURATION } from "shared";

interface AudioRecorderProps {
  onRecorded: (dataUrl: string) => void;
}

type RecState = "idle" | "recording" | "done";

export const AudioRecorder = ({ onRecorded }: AudioRecorderProps) => {
  const [state, setState] = useState<RecState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      recorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setAudioUrl(dataUrl);
          onRecorded(dataUrl);
          setState("done");
        };
        reader.readAsDataURL(blob);
        cleanup();
      };

      recorder.start();
      setState("recording");
      startTimeRef.current = Date.now();

      const tick = () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setProgress(Math.min(elapsed / MAX_CLIP_DURATION, 1));
        if (elapsed < MAX_CLIP_DURATION && recorderRef.current?.state === "recording") {
          timerRef.current = requestAnimationFrame(tick);
        }
      };
      timerRef.current = requestAnimationFrame(tick);

      setTimeout(() => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      }, MAX_CLIP_DURATION * 1000);
    } catch {
      setState("idle");
      cleanup();
    }
  };

  const stopEarly = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const reRecord = () => {
    setAudioUrl(null);
    setProgress(0);
    setState("idle");
  };

  return (
    <div className="recorder">
      <p className="recorder__label">Paddle Sound</p>

      {state === "idle" && (
        <button className="recorder__btn" onClick={startRecording}>
          Record Sound
        </button>
      )}

      {state === "recording" && (
        <div className="recorder__active">
          <div className="recorder__bar">
            <div className="recorder__fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <button className="recorder__btn recorder__btn--stop" onClick={stopEarly}>
            Stop
          </button>
        </div>
      )}

      {state === "done" && audioUrl && (
        <div className="recorder__preview">
          <audio src={audioUrl} controls className="recorder__audio" />
          <button className="recorder__btn recorder__btn--redo" onClick={reRecord}>
            Re-record
          </button>
        </div>
      )}

      <p className="recorder__hint">
        {state === "idle" && "Record a short sound effect for your paddle"}
        {state === "recording" && "Recording... speak or make a noise!"}
        {state === "done" && "This plays when the ball hits your paddle"}
      </p>
    </div>
  );
};
