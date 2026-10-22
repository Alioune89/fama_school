"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Détecteur de codes intégré à Chrome sur Android (absent de Safari) : non décrit par TypeScript. */
type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
type BarcodeDetectorClass = {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
};

type Decoder = (video: HTMLVideoElement) => Promise<string | null>;

/** Lecture d'une image de la caméra : détecteur du navigateur s'il lit les QR codes, sinon jsQR. */
async function createDecoder(): Promise<Decoder> {
  const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector;
  if (Detector && (await Detector.getSupportedFormats().catch((): string[] => [])).includes("qr_code")) {
    const detector = new Detector({ formats: ["qr_code"] });
    return async (video) => (await detector.detect(video).catch(() => []))[0]?.rawValue ?? null;
  }

  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return async (video) => {
    if (!context || !video.videoWidth) return null;
    // Image réduite : la lecture reste fluide sur un téléphone d'entrée de gamme.
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}

export type CameraProblem = "denied" | "unavailable" | "insecure";

/** Intervalle entre deux lectures d'image (5 par seconde suffisent à l'entrée d'une école). */
const SCAN_INTERVAL_MS = 200;

/**
 * Caméra arrière et lecture des QR codes en continu. `onCode` reçoit chaque texte lu ;
 * le tri (carte connue, même carte encore devant la caméra) revient à l'appelant.
 */
export function useQrScanner(onCode: (text: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const onCodeRef = useRef(onCode);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState<CameraProblem | null>(null);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    setProblem(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setProblem("insecure");
      return;
    }
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      const decode = await createDecoder();
      setActive(true);

      const tick = async () => {
        if (!streamRef.current) return;
        const text = await decode(video);
        if (text) onCodeRef.current(text);
        timerRef.current = window.setTimeout(() => void tick(), SCAN_INTERVAL_MS);
      };
      void tick();
    } catch (error) {
      stop();
      const name = error instanceof DOMException ? error.name : "";
      setProblem(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
    } finally {
      setStarting(false);
    }
  }, [stop]);

  // La caméra s'éteint quand on quitte la page.
  useEffect(() => stop, [stop]);

  return { videoRef, active, starting, problem, start, stop };
}
