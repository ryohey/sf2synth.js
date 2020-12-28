import { NoteInfo } from "../parser/SoundFont";
export interface InstrumentState {
    channel: number;
    key: number;
    volume: number;
    panpot: number;
    velocity: number;
    pitchBend: number;
    pitchBendSensitivity: number;
    expression: number;
    mute: boolean;
    releaseTime: number;
    cutOffFrequency: number;
    harmonicContent: number;
}
export default class SynthesizerNote {
    private readonly ctx;
    private readonly bufferSource;
    private readonly modulator;
    private readonly panner;
    private readonly expressionGain;
    private readonly gainOutput;
    private readonly destination;
    private readonly noteInfo;
    private readonly instrument;
    private readonly playbackRate;
    private expression;
    private startTime;
    private computedPlaybackRate;
    get channel(): number;
    get key(): number;
    constructor(ctx: AudioContext, destination: AudioNode, noteInfo: NoteInfo, instrument: InstrumentState);
    noteOn(): void;
    noteOff(): void;
    disconnect(): void;
    schedulePlaybackRate(): void;
    updateExpression(expression: number): void;
    updatePitchBend(pitchBend: number): void;
}
