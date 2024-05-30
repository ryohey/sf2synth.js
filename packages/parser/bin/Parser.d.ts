import { Options as RiffParserOptions } from "./RiffParser";
import { PresetHeader, SampleHeader, PresetBag, Instrument, InstrumentBag, ModulatorList, GeneratorList, Info } from "./Structs";
export interface ParseResult {
    presetHeaders: PresetHeader[];
    presetZone: PresetBag[];
    presetModulators: ModulatorList[];
    presetGenerators: GeneratorList[];
    instruments: Instrument[];
    instrumentZone: InstrumentBag[];
    instrumentModulators: ModulatorList[];
    instrumentGenerators: GeneratorList[];
    sampleHeaders: SampleHeader[];
    samples: Int16Array[];
    samplingData: SamplingData;
    info: Info;
}
export interface SamplingData {
    offsetMSB: number;
    offsetLSB: number | undefined;
}
export declare function parse(input: Uint8Array, option?: RiffParserOptions): ParseResult;
