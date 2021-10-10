import Stream from "./Stream";
import { Chunk } from "./RiffParser";
export declare class VersionTag {
    major: number;
    minor: number;
    static parse(stream: Stream): VersionTag;
}
export declare class Info {
    comment: string | null;
    copyright: string | null;
    creationDate: string | null;
    engineer: string | null;
    name: string;
    product: string | null;
    software: string | null;
    version: VersionTag;
    soundEngine: string | null;
    romName: string | null;
    romVersion: VersionTag | null;
    static parse(data: Uint8Array, chunks: Chunk[]): Info;
}
export declare class PresetHeader {
    presetName: string;
    preset: number;
    bank: number;
    presetBagIndex: number;
    library: number;
    genre: number;
    morphology: number;
    get isEnd(): boolean;
    static parse(stream: Stream): PresetHeader;
}
export declare class PresetBag {
    presetGeneratorIndex: number;
    presetModulatorIndex: number;
    static parse(stream: Stream): PresetBag;
}
export declare class RangeValue {
    lo: number;
    hi: number;
    constructor(lo: number, hi: number);
    static parse(stream: Stream): RangeValue;
}
export declare class ModulatorList {
    sourceOper: number;
    destinationOper: number;
    value: number | RangeValue;
    amountSourceOper: number;
    transOper: number;
    get type(): "pan" | "startAddrsOffset" | "endAddrsOffset" | "startloopAddrsOffset" | "endloopAddrsOffset" | "startAddrsCoarseOffset" | "modLfoToPitch" | "vibLfoToPitch" | "modEnvToPitch" | "initialFilterFc" | "initialFilterQ" | "modLfoToFilterFc" | "modEnvToFilterFc" | "endAddrsCoarseOffset" | "modLfoToVolume" | "chorusEffectsSend" | "reverbEffectsSend" | "delayModLFO" | "freqModLFO" | "delayVibLFO" | "freqVibLFO" | "delayModEnv" | "attackModEnv" | "holdModEnv" | "decayModEnv" | "sustainModEnv" | "releaseModEnv" | "keynumToModEnvHold" | "keynumToModEnvDecay" | "delayVolEnv" | "attackVolEnv" | "holdVolEnv" | "decayVolEnv" | "sustainVolEnv" | "releaseVolEnv" | "keynumToVolEnvHold" | "keynumToVolEnvDecay" | "instrument" | "keyRange" | "velRange" | "startloopAddrsCoarseOffset" | "keynum" | "velocity" | "initialAttenuation" | "endloopAddrsCoarseOffset" | "coarseTune" | "fineTune" | "sampleID" | "sampleModes" | "scaleTuning" | "exclusiveClass" | "overridingRootKey" | undefined;
    get isEnd(): boolean;
    static parse(stream: Stream): ModulatorList;
}
export declare class GeneratorList {
    code: number;
    value: number | RangeValue;
    get type(): "pan" | "startAddrsOffset" | "endAddrsOffset" | "startloopAddrsOffset" | "endloopAddrsOffset" | "startAddrsCoarseOffset" | "modLfoToPitch" | "vibLfoToPitch" | "modEnvToPitch" | "initialFilterFc" | "initialFilterQ" | "modLfoToFilterFc" | "modEnvToFilterFc" | "endAddrsCoarseOffset" | "modLfoToVolume" | "chorusEffectsSend" | "reverbEffectsSend" | "delayModLFO" | "freqModLFO" | "delayVibLFO" | "freqVibLFO" | "delayModEnv" | "attackModEnv" | "holdModEnv" | "decayModEnv" | "sustainModEnv" | "releaseModEnv" | "keynumToModEnvHold" | "keynumToModEnvDecay" | "delayVolEnv" | "attackVolEnv" | "holdVolEnv" | "decayVolEnv" | "sustainVolEnv" | "releaseVolEnv" | "keynumToVolEnvHold" | "keynumToVolEnvDecay" | "instrument" | "keyRange" | "velRange" | "startloopAddrsCoarseOffset" | "keynum" | "velocity" | "initialAttenuation" | "endloopAddrsCoarseOffset" | "coarseTune" | "fineTune" | "sampleID" | "sampleModes" | "scaleTuning" | "exclusiveClass" | "overridingRootKey" | undefined;
    get isEnd(): boolean;
    static parse(stream: Stream): GeneratorList;
}
export declare class Instrument {
    instrumentName: string;
    instrumentBagIndex: number;
    get isEnd(): boolean;
    static parse(stream: Stream): Instrument;
}
export declare class InstrumentBag {
    instrumentGeneratorIndex: number;
    instrumentModulatorIndex: number;
    static parse(stream: Stream): InstrumentBag;
}
export declare class SampleHeader {
    sampleName: string;
    start: number;
    end: number;
    loopStart: number;
    loopEnd: number;
    sampleRate: number;
    originalPitch: number;
    pitchCorrection: number;
    sampleLink: number;
    sampleType: number;
    get isEnd(): boolean;
    static parse(stream: Stream): SampleHeader;
}
export declare const SampleLink: {
    monoSample: number;
    rightSample: number;
    leftSample: number;
    linkedSample: number;
    RomMonoSample: number;
    RomRightSample: number;
    RomLeftSample: number;
    RomLinkedSample: number;
};
