import { ParseResult } from "./Parser";
export declare function getInstrumentZone(parsed: ParseResult, instrumentZoneIndex: number): import("./Structs").GeneratorList[];
export declare function getInstrumentZoneIndexes(parsed: ParseResult, instrumentID: number): number[];
export declare function getInstrumentGenerators(parsed: ParseResult, instrumentID: number): import("./Structs").GeneratorList[][];
