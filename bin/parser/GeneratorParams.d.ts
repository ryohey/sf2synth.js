import { GeneratorEnumeratorTable } from "./Constants";
import { GeneratorList } from "./Structs";
declare type TupleToUnion<T extends readonly any[]> = T[number];
export declare type GeneratorParams = {
    [key in Exclude<TupleToUnion<typeof GeneratorEnumeratorTable>, undefined>]: any;
};
export declare function createGeneraterObject(generators: GeneratorList[]): Partial<GeneratorParams>;
export declare const defaultInstrumentZone: GeneratorParams;
export {};
