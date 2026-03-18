import type { Ref } from "vue";
import type { CrossfadeEngine } from "~/composables/useCrossfade";

/**
 * When a CrossfadeEngine is provided, reads from its shared AnalyserNode
 * (no extra MediaElementAudioSourceNode needed).
 * Falls back to creating its own AudioContext + source for standalone use.
 */
export function useAudioVisualiser(
  audioRef: Ref<HTMLAudioElement | null>,
  onLevel: (level: number) => void,
  crossfadeEngine?: CrossfadeEngine,
) {
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let animationFrameId = 0;
  let attachedElement: HTMLAudioElement | null = null;

  const frame = () => {
    if (!analyser) {
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const average =
      data.reduce((sum, value) => sum + value, 0) / (data.length || 1);
    onLevel(average / 255);
    animationFrameId = requestAnimationFrame(frame);
  };

  const start = async () => {
    const audio = audioRef.value;
    if (!audio || typeof window === "undefined") {
      return;
    }

    // If crossfade engine is available, use its shared analyser
    if (crossfadeEngine) {
      const shared = crossfadeEngine.getAnalyser();
      if (shared) {
        analyser = shared;
        cancelAnimationFrame(animationFrameId);
        frame();
        return;
      }
    }

    // Standalone fallback (no crossfade engine)
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (!sourceNode || attachedElement !== audio) {
      attachedElement = audio;
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.84;
      sourceNode = audioContext.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
    }

    cancelAnimationFrame(animationFrameId);
    frame();
  };

  const stop = () => {
    cancelAnimationFrame(animationFrameId);
    onLevel(0);
  };

  onMounted(() => {
    watch(
      audioRef,
      (audio, previousAudio) => {
        previousAudio?.removeEventListener("play", start);
        previousAudio?.removeEventListener("pause", stop);
        previousAudio?.removeEventListener("ended", stop);

        audio?.addEventListener("play", start);
        audio?.addEventListener("pause", stop);
        audio?.addEventListener("ended", stop);
      },
      { immediate: true },
    );
  });

  onBeforeUnmount(() => {
    stop();
    attachedElement?.removeEventListener("play", start);
    attachedElement?.removeEventListener("pause", stop);
    attachedElement?.removeEventListener("ended", stop);

    // Only clean up if we created our own context (standalone mode)
    if (!crossfadeEngine) {
      analyser?.disconnect();
      sourceNode?.disconnect();
      audioContext?.close().catch(() => undefined);
    }
  });
}
