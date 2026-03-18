export interface CrossfadeEngine {
  /** The currently audible audio element (for UI binding: timeupdate, seek, etc.) */
  activeAudio: Ref<HTMLAudioElement | null>;
  /** Bind two <audio> elements on mount */
  bind(a: HTMLAudioElement, b: HTMLAudioElement): void;
  /** Start playing a URL on the active deck */
  play(
    url: string,
    options?: { autoplay?: boolean; preserveTime?: number },
  ): Promise<void>;
  /** Trigger crossfade to a new URL (next track) */
  crossfadeTo(url: string): Promise<void>;
  /** Hard stop both decks */
  stop(): void;
  /** Set master volume (0–1). Applied on top of crossfade gain. */
  setVolume(volume: number): void;
  /** Is a crossfade currently in progress? */
  isCrossfading: Ref<boolean>;
  /** Get the shared analyser node for visualisation (available after first play) */
  getAnalyser(): AnalyserNode | null;
  /** Clean up Web Audio nodes */
  destroy(): void;
}

interface Deck {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
  gain: GainNode | null;
}

const CROSSFADE_DURATION = 10; // seconds

export function useCrossfade(): CrossfadeEngine {
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let masterVolume = 0.85;

  const deckA: Deck = { audio: null!, source: null, gain: null };
  const deckB: Deck = { audio: null!, source: null, gain: null };
  let activeDeck: Deck = deckA;
  let inactiveDeck: Deck = deckB;

  const activeAudio = shallowRef<HTMLAudioElement | null>(null);
  const isCrossfading = ref(false);

  let crossfadeRaf = 0;
  let crossfadeStartTime = 0;
  let bound = false;

  function ensureContext(): AudioContext {
    if (!ctx) {
      ctx = new AudioContext();
      // Shared analyser sits between gain nodes and destination
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.84;
      analyser.connect(ctx.destination);
    }
    return ctx;
  }

  function wireDeck(deck: Deck) {
    const audioCtx = ensureContext();
    if (!deck.source) {
      deck.source = audioCtx.createMediaElementSource(deck.audio);
      deck.gain = audioCtx.createGain();
      deck.source.connect(deck.gain);
      // Route through shared analyser instead of directly to destination
      deck.gain.connect(analyser!);
    }
  }

  function bind(a: HTMLAudioElement, b: HTMLAudioElement) {
    if (bound) return;
    bound = true;
    deckA.audio = a;
    deckB.audio = b;
    a.crossOrigin = "anonymous";
    b.crossOrigin = "anonymous";
    activeAudio.value = a;
  }

  async function resumeContext() {
    const audioCtx = ensureContext();
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
  }

  async function play(
    url: string,
    options: { autoplay?: boolean; preserveTime?: number } = {},
  ) {
    // Stop any ongoing crossfade
    cancelCrossfade();

    const deck = activeDeck;
    wireDeck(deck);
    await resumeContext();

    // Set active deck to full volume, inactive to silent
    deck.gain!.gain.value = masterVolume;
    if (inactiveDeck.gain) {
      inactiveDeck.gain.gain.value = 0;
    }

    // Stop the inactive deck
    inactiveDeck.audio.pause();

    const audio = deck.audio;
    activeAudio.value = audio;

    if (audio.src !== url) {
      await new Promise<void>((resolve) => {
        const finalize = () => {
          const preserveTime = options.preserveTime ?? 0;
          if (preserveTime > 0) {
            audio.currentTime = Math.max(0, preserveTime);
          }
          resolve();
        };
        audio.addEventListener("loadedmetadata", finalize, { once: true });
        audio.src = url;
        audio.load();
      });
    }

    if (options.autoplay !== false) {
      await audio.play().catch(() => undefined);
    }
  }

  async function crossfadeTo(url: string) {
    wireDeck(inactiveDeck);
    await resumeContext();

    const incoming = inactiveDeck;
    const outgoing = activeDeck;

    // Prepare incoming deck
    incoming.gain!.gain.value = 0;
    incoming.audio.volume = 1; // HTML volume stays at 1, gain node controls actual volume

    await new Promise<void>((resolve) => {
      incoming.audio.addEventListener("loadedmetadata", () => resolve(), {
        once: true,
      });
      incoming.audio.src = url;
      incoming.audio.load();
    });

    await incoming.audio.play().catch(() => undefined);

    // Start crossfade animation
    isCrossfading.value = true;
    crossfadeStartTime = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - crossfadeStartTime) / 1000;
      const progress = Math.min(elapsed / CROSSFADE_DURATION, 1);

      // Equal-power crossfade curve for smooth volume transition
      const outGain = Math.cos(progress * Math.PI * 0.5) * masterVolume;
      const inGain = Math.sin(progress * Math.PI * 0.5) * masterVolume;

      if (outgoing.gain) outgoing.gain.gain.value = outGain;
      if (incoming.gain) incoming.gain.gain.value = inGain;

      if (progress < 1) {
        crossfadeRaf = requestAnimationFrame(animate);
      } else {
        // Crossfade complete — swap decks
        outgoing.audio.pause();
        outgoing.audio.removeAttribute("src");
        outgoing.audio.load();
        if (outgoing.gain) outgoing.gain.gain.value = 0;

        incoming.gain!.gain.value = masterVolume;

        // Swap active/inactive
        activeDeck = incoming;
        inactiveDeck = outgoing;
        activeAudio.value = incoming.audio;
        isCrossfading.value = false;
      }
    };

    crossfadeRaf = requestAnimationFrame(animate);
  }

  function cancelCrossfade() {
    if (crossfadeRaf) {
      cancelAnimationFrame(crossfadeRaf);
      crossfadeRaf = 0;
    }
    isCrossfading.value = false;
  }

  function stop() {
    cancelCrossfade();
    deckA.audio?.pause();
    deckB.audio?.pause();
    if (deckA.gain) deckA.gain.gain.value = 0;
    if (deckB.gain) deckB.gain.gain.value = 0;
  }

  function setVolume(volume: number) {
    masterVolume = volume;
    // During crossfade, don't override — the animation loop handles it
    if (!isCrossfading.value && activeDeck.gain) {
      activeDeck.gain.gain.value = volume;
    }
  }

  function getAnalyser(): AnalyserNode | null {
    return analyser;
  }

  function destroy() {
    cancelCrossfade();
    stop();
    deckA.source?.disconnect();
    deckB.source?.disconnect();
    deckA.gain?.disconnect();
    deckB.gain?.disconnect();
    analyser?.disconnect();
    ctx?.close().catch(() => undefined);
    ctx = null;
    analyser = null;
  }

  return {
    activeAudio,
    bind,
    play,
    crossfadeTo,
    stop,
    setVolume,
    isCrossfading,
    getAnalyser,
    destroy,
  };
}
