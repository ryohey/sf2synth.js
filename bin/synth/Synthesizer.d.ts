import SynthesizerNote from "./SynthesizerNote";
import SoundFont from "../parser/SoundFont";
import { Listener } from "./MidiMessageHandler";
declare class Channel {
    instrument: number;
    volume: number;
    pitchBend: number;
    pitchBendSensitivity: number;
    panpot: number;
    expression: number;
    releaseTime: number;
    reverb: number;
    currentNoteOn: SynthesizerNote[];
    hold: boolean;
    bankMsb: number;
    bankLsb: number;
    isPercussionPart: boolean;
    harmonicContent: number;
    cutOffFrequency: number;
    mute: boolean;
}
export default class Synthesizer implements Listener {
    private ctx;
    private gainMaster;
    channels: Channel[];
    masterVolume: number;
    soundFont: SoundFont;
    isXG: boolean;
    isGS: boolean;
    constructor(ctx: AudioContext);
    init(): void;
    loadSoundFont(input: Uint8Array): void;
    connect(destination: AudioNode): void;
    setMasterVolume(volume: number): void;
    noteOn(channelNumber: number, key: number, velocity: number): void;
    noteOff(channelNumber: number, key: number, _velocity: number): void;
    hold(channelNumber: number, value: boolean): void;
    bankSelectMsb(channelNumber: number, value: number): void;
    bankSelectLsb(channelNumber: number, value: number): void;
    programChange(channelNumber: number, instrument: number): void;
    volumeChange(channelNumber: number, volume: number): void;
    expression(channelNumber: number, expression: number): void;
    panpotChange(channelNumber: number, panpot: number): void;
    pitchBend(channelNumber: number, pitchBend: number): void;
    pitchBendSensitivity(channelNumber: number, sensitivity: number): void;
    releaseTime(channelNumber: number, releaseTime: number): void;
    allSoundOff(channelNumber: number): void;
    resetAllControl(channelNumber: number): void;
    setReverbDepth(channelNumber: number, depth: number): void;
    private getBank;
    setPercussionPart(channelNumber: number, sw: boolean): void;
}
export {};
