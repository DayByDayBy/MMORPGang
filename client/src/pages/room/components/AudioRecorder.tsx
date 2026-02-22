import { useState, useRef } from "react";
import { MAX_CLIP_DURATION } from "shared";
import { Button } from "@/components/Button";

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

  const cleanup = () => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  };

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
    <div className="my-4 p-4 bg-white/3 border border-border-subtle rounded-lg">
      <p className="m-0 mb-2.5 text-[13px] font-semibold tracking-wider uppercase text-neutral-400">
        Paddle Sound
      </p>

      {state === "idle" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded text-[13px]"
          onClick={startRecording}
        >
          Record Sound
        </Button>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/10 rounded-sm overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-sm transition-[width] duration-50 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="rounded text-[13px]"
            onClick={stopEarly}
          >
            Stop
          </Button>
        </div>
      )}

      {state === "done" && audioUrl && (
        <div className="flex items-center gap-2.5">
          <audio src={audioUrl} controls className="h-8 flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded text-xs"
            onClick={reRecord}
          >
            Re-record
          </Button>
        </div>
      )}

      <p className="mt-2 mb-0 text-[11px] text-text-muted">
        {state === "idle" && "Record a short sound effect for your paddle"}
        {state === "recording" && "Recording... speak or make a noise!"}
        {state === "done" && "This plays when the ball hits your paddle"}
      </p>
    </div>
  );
};
