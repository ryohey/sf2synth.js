import { GeneratorEnumeratorTable } from "./Constants"
import { GeneratorList, RangeValue } from "./Structs"

type TupleToUnion<T extends readonly any[]> = T[number]

export type GeneratorParams = {
  [key in Exclude<
    TupleToUnion<typeof GeneratorEnumeratorTable>,
    undefined
  >]: any
}

export function createGeneraterObject(generators: GeneratorList[]) {
  const result: Partial<GeneratorParams> = {}
  for (const gen of generators) {
    const type = gen.type
    if (type !== undefined) {
      result[type] = gen.value
    }
  }
  return result
}

export const defaultInstrumentZone: GeneratorParams = {
  keynum: undefined,
  instrument: undefined,
  velocity: undefined,
  exclusiveClass: undefined,
  keyRange: new RangeValue(0, 127),
  velRange: new RangeValue(0, 127),
  sampleID: undefined,
  delayVolEnv: -12000,
  attackVolEnv: -12000,
  decayVolEnv: -12000,
  holdVolEnv: -12000,
  sustainVolEnv: 0,
  releaseVolEnv: -12000,
  delayModEnv: -12000,
  attackModEnv: -12000,
  decayModEnv: -12000,
  holdModEnv: -12000,
  sustainModEnv: 0,
  releaseModEnv: -12000,
  modEnvToPitch: 0,
  modEnvToFilterFc: 0,
  modLfoToFilterFc: 0,
  modLfoToPitch: 0,
  modLfoToVolume: 0,
  vibLfoToPitch: 0,
  chorusEffectsSend: 0,
  reverbEffectsSend: 0,
  delayModLFO: 0,
  freqModLFO: 0,
  delayVibLFO: 0,
  keynumToModEnvDecay: 0,
  keynumToModEnvHold: 0,
  keynumToVolEnvDecay: 0,
  keynumToVolEnvHold: 0,
  coarseTune: 0,
  fineTune: 0,
  scaleTuning: 100,
  freqVibLFO: 0,
  startAddrsOffset: 0,
  startAddrsCoarseOffset: 0,
  endAddrsOffset: 0,
  endAddrsCoarseOffset: 0,
  startloopAddrsOffset: 0,
  startloopAddrsCoarseOffset: 0,
  initialAttenuation: 0,
  endloopAddrsOffset: 0,
  endloopAddrsCoarseOffset: 0,
  overridingRootKey: undefined,
  initialFilterQ: 1,
  initialFilterFc: 13500,
  sampleModes: 0,
  pan: undefined,
}
