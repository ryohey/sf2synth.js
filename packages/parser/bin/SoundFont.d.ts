import { GeneratorParams } from "./GeneratorParams";
import { ParseResult } from "./Parser";
import { RangeValue } from "./Structs";
/**
 * Parser で読み込んだサウンドフォントのデータを
 * Synthesizer から利用しやすい形にするクラス
 */
export declare class SoundFont {
    private parsed;
    constructor(parsed: ParseResult);
    getPresetZone(presetHeaderIndex: number): import("./Structs").GeneratorList[];
    getInstrumentZone(instrumentZoneIndex: number): Partial<GeneratorParams>;
    getInstrumentZoneIndexes(instrumentID: number): number[];
    getInstrumentKey(bankNumber: number, instrumentNumber: number, key: number, velocity?: number): NoteInfo | null;
    getPresetNames(): {
        [index: number]: {
            [index: number]: string;
        };
    };
}
export declare function convertTime(value: number): number;
export interface NoteInfo {
    sample: Int16Array;
    sampleRate: number;
    sampleName: string;
    sampleModes: number;
    playbackRate: Function;
    modEnvToPitch: number;
    scaleTuning: number;
    start: number;
    end: number;
    loopStart: number;
    loopEnd: number;
    volDelay: number;
    volAttack: number;
    volHold: number;
    volDecay: number;
    volSustain: number;
    volRelease: number;
    modDelay: number;
    modAttack: number;
    modHold: number;
    modDecay: number;
    modSustain: number;
    modRelease: number;
    initialFilterFc: number;
    modEnvToFilterFc: number;
    initialFilterQ: number;
    initialAttenuation: number;
    freqVibLFO: number | undefined;
    pan: number | undefined;
    keyRange: RangeValue;
    velRange: RangeValue | undefined;
}
