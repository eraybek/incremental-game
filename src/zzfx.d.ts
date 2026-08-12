declare module 'zzfx' {
  export function zzfx(...parameters: number[]): AudioBufferSourceNode;

  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    play(...parameters: number[]): AudioBufferSourceNode;
    playSamples(
      sampleChannels: number[][],
      volumeScale?: number,
      rate?: number,
      pan?: number,
      loop?: boolean,
    ): AudioBufferSourceNode;
    buildSamples(...parameters: number[]): number[];
  };
}
