export interface Listener {
    init(): void;
    noteOn(channel: number, key: number, velocity: number): void;
    noteOff(channel: number, key: number, velocity: number): void;
    setMasterVolume(volume: number): void;
    programChange(channelNumber: number, instrument: number): void;
    volumeChange(channelNumber: number, volume: number): void;
    panpotChange(channelNumber: number, panpot: number): void;
    pitchBend(channelNumber: number, pitchBend: number): void;
    pitchBendSensitivity(channelNumber: number, sensitivity: number): void;
    allSoundOff(channelNumber: number): void;
    resetAllControl(channelNumber: number): void;
    expression(channelNumber: number, expression: number): void;
    setPercussionPart(channelNumber: number, sw: boolean): void;
    hold(channelNumber: number, sw: boolean): void;
    setReverbDepth(channelNumber: number, depth: number): void;
    releaseTime(channelNumber: number, value: number): void;
    isXG: boolean;
    isGS: boolean;
}
export default class MidiMessageHandler {
    private RpnMsb;
    private RpnLsb;
    listener: Listener;
    processMidiMessage(message: number[]): void;
}
