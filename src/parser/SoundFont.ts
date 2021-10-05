import { ParseResult } from "./Parser"
import { RangeValue, GeneratorList } from "./Structs"

/**
 * Parser で読み込んだサウンドフォントのデータを
 * Synthesizer から利用しやすい形にするクラス
 */
export default class SoundFont {
  private parsed: ParseResult

  constructor(parsed: ParseResult) {
    this.parsed = parsed
  }

  getPresetZone(presetHeaderIndex: number) {
    let presetGenerators: GeneratorList[]
    const presetHeader = this.parsed.presetHeaders[presetHeaderIndex]
    const presetBag = this.parsed.presetZone[presetHeader.presetBagIndex]

    const nextPresetHeaderIndex = presetHeaderIndex + 1
    if (nextPresetHeaderIndex < this.parsed.presetHeaders.length) {
      // 次の preset までのすべての generator を取得する
      const nextPresetHeader = this.parsed.presetHeaders[nextPresetHeaderIndex]
      const nextPresetBag = this.parsed.presetZone[
        nextPresetHeader.presetBagIndex
      ]
      presetGenerators = this.parsed.presetGenerators.slice(
        presetBag.presetGeneratorIndex,
        nextPresetBag.presetGeneratorIndex
      )
    } else {
      // 最後の preset だった場合は最後まで取得する
      presetGenerators = this.parsed.presetGenerators.slice(
        presetBag.presetGeneratorIndex,
        this.parsed.presetGenerators.length
      )
    }

    return presetGenerators
  }

  getInstrumentZone(instrumentZoneIndex: number) {
    const instrumentBag = this.parsed.instrumentZone[instrumentZoneIndex]
    const nextInstrumentBag = this.parsed.instrumentZone[
      instrumentZoneIndex + 1
    ]
    const generatorIndex = instrumentBag.instrumentGeneratorIndex
    const nextGeneratorIndex = nextInstrumentBag
      ? nextInstrumentBag.instrumentGeneratorIndex
      : this.parsed.instrumentGenerators.length
    const generators = this.parsed.instrumentGenerators.slice(
      generatorIndex,
      nextGeneratorIndex
    )
    return createInstrumentZone(generators)
  }

  getInstrumentZoneIndexes(instrumentID: number): number[] {
    const instrument = this.parsed.instruments[instrumentID]
    const nextInstrument = this.parsed.instruments[instrumentID + 1]
    return arrayRange(
      instrument.instrumentBagIndex,
      nextInstrument
        ? nextInstrument.instrumentBagIndex
        : this.parsed.instrumentZone.length
    )
  }

  getInstrumentKey(
    bankNumber: number,
    instrumentNumber: number,
    key: number,
    velocity = 100
  ): NoteInfo | null {
    const presetHeaderIndex = this.parsed.presetHeaders.findIndex(
      (p) => p.preset === instrumentNumber && p.bank === bankNumber
    )

    if (presetHeaderIndex < 0) {
      console.warn(
        "preset not found: bank=%s instrument=%s",
        bankNumber,
        instrumentNumber
      )
      return null
    }

    const presetGenerators = this.getPresetZone(presetHeaderIndex)

    // Last Preset Generator must be instrument
    const lastPresetGenertor = presetGenerators[presetGenerators.length - 1]
    if (
      lastPresetGenertor.type !== "instrument" ||
      isNaN(Number(lastPresetGenertor.value))
    ) {
      throw new Error(
        "Invalid SoundFont: invalid preset generator: expect instrument"
      )
    }
    const instrumentID = lastPresetGenertor.value as number
    const instrumentZones = this.getInstrumentZoneIndexes(
      instrumentID
    ).map((i) => this.getInstrumentZone(i))

    // 最初のゾーンがsampleID を持たなければ global instrument zone
    let globalInstrumentZone: any | undefined
    const firstInstrumentZone = instrumentZones[0]
    if (firstInstrumentZone.sampleID === undefined) {
      globalInstrumentZone = instrumentZones[0]
    }

    // keyRange と velRange がマッチしている Generator を探す
    const instrumentZone = instrumentZones.find((i) => {
      if (i === globalInstrumentZone) {
        return false // global zone を除外
      }

      let isInKeyRange = false
      if (i.keyRange) {
        isInKeyRange = key >= i.keyRange.lo && key <= i.keyRange.hi
      }

      let isInVelRange = true
      if (i.velRange) {
        isInVelRange = velocity >= i.velRange.lo && velocity <= i.velRange.hi
      }

      return isInKeyRange && isInVelRange
    })

    if (!instrumentZone) {
      console.warn(
        "instrument not found: bank=%s instrument=%s",
        bankNumber,
        instrumentNumber
      )
      return null
    }

    if (instrumentZone.sampleID === undefined) {
      throw new Error("Invalid SoundFont: sampleID not found")
    }

    const gen = {
      ...defaultInstrumentZone,
      ...removeUndefined(globalInstrumentZone || {}),
      ...removeUndefined(instrumentZone),
    }

    const sample = this.parsed.samples[gen.sampleID!]
    const sampleHeader = this.parsed.sampleHeaders[gen.sampleID!]
    const tune = gen.coarseTune + gen.fineTune / 100
    const basePitch =
      tune +
      sampleHeader.pitchCorrection / 100 -
      (gen.overridingRootKey || sampleHeader.originalPitch)
    const scaleTuning = gen.scaleTuning / 100

    return {
      sample,
      sampleRate: sampleHeader.sampleRate,
      sampleName: sampleHeader.sampleName,
      sampleModes: gen.sampleModes,
      playbackRate: (key: number) =>
        Math.pow(Math.pow(2, 1 / 12), (key + basePitch) * scaleTuning),
      modEnvToPitch: gen.modEnvToPitch / 100, // cent
      scaleTuning,
      start: gen.startAddrsCoarseOffset * 32768 + gen.startAddrsOffset,
      end: gen.endAddrsCoarseOffset * 32768 + gen.endAddrsOffset,
      loopStart:
        sampleHeader.loopStart +
        gen.startloopAddrsCoarseOffset * 32768 +
        gen.startloopAddrsOffset,
      loopEnd:
        sampleHeader.loopEnd +
        gen.endloopAddrsCoarseOffset * 32768 +
        gen.endloopAddrsOffset,
      volDelay: convertTime(gen.volDelay),
      volAttack: convertTime(gen.volAttack),
      volHold: convertTime(gen.volHold),
      volDecay: convertTime(gen.volDecay),
      volSustain: gen.volSustain / 1000,
      volRelease: convertTime(gen.volRelease),
      modDelay: convertTime(gen.modDelay),
      modAttack: convertTime(gen.modAttack),
      modHold: convertTime(gen.modHold),
      modDecay: convertTime(gen.modDecay),
      modSustain: gen.modSustain / 1000,
      modRelease: convertTime(gen.modRelease),
      keyRange: gen.keyRange,
      velRange: gen.velRange,
      initialFilterFc: gen.initialFilterFc,
      modEnvToFilterFc: gen.modEnvToFilterFc, // semitone (100 cent)
      initialFilterQ: gen.initialFilterQ,
      initialAttenuation: gen.initialAttenuation,
      freqVibLFO: gen.freqVibLFO
        ? convertTime(gen.freqVibLFO) * 8.176
        : undefined,
      pan: gen.pan,
    }
  }

  // presetNames[bankNumber][presetNumber] = presetName
  getPresetNames() {
    const bank: { [index: number]: { [index: number]: string } } = {}
    this.parsed.presetHeaders.forEach((preset) => {
      if (!bank[preset.bank]) {
        bank[preset.bank] = {}
      }
      bank[preset.bank][preset.preset] = preset.presetName
    })
    return bank
  }
}

// value = 1200log2(sec) で表される時間を秒単位に変換する
export function convertTime(value: number) {
  return Math.pow(2, value / 1200)
}

function removeUndefined<T>(obj: T) {
  const result: Partial<T> = {}
  for (let key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key]
    }
  }
  return result
}

function arrayRange(start: number, end: number) {
  return Array.from({ length: end - start }, (_, k) => k + start)
}

// ひとつの instrument に対応する Generator の配列から使いやすくしたオブジェクトを返す
function createInstrumentZone(instrumentGenerators: GeneratorList[]) {
  function getValue(type: string): number | undefined {
    const generator = instrumentGenerators.find((g) => g.type === type)
    if (!generator) {
      return undefined
    }
    if (isNaN(Number(generator.value))) {
      throw new Error("something wrong")
    }
    return generator.value as number
  }

  // First Instrument Generator must be keyRange
  const firstInstrumentGenerator = instrumentGenerators[0]
  let keyRange: RangeValue | undefined
  if (
    firstInstrumentGenerator &&
    firstInstrumentGenerator.type === "keyRange"
  ) {
    if (!(firstInstrumentGenerator.value instanceof RangeValue)) {
      throw new Error("Invalid SoundFont: keyRange is not ranged value")
    }
    keyRange = firstInstrumentGenerator.value as RangeValue
  }

  // Second Instrument Generator could be velRange
  const secondInstrumentGenerator = instrumentGenerators[1]
  let velRange: RangeValue | undefined
  if (
    secondInstrumentGenerator &&
    secondInstrumentGenerator.type === "velRange"
  ) {
    if (!(secondInstrumentGenerator.value instanceof RangeValue)) {
      throw new Error("Invalid SoundFont: velRange is not ranged value")
    }
    velRange = secondInstrumentGenerator.value as RangeValue
  }

  // Last Instrument Generator must be sampleID
  const lastInstrumentGenerator =
    instrumentGenerators[instrumentGenerators.length - 1]
  let sampleID: number | undefined
  if (lastInstrumentGenerator && lastInstrumentGenerator.type === "sampleID") {
    if (isNaN(Number(lastInstrumentGenerator.value))) {
      throw new Error("Invalid SoundFont: sampleID is not number")
    }
    sampleID = lastInstrumentGenerator.value as number
  }

  return {
    keyRange, // あるはずだが global zone には無いかもしれない
    velRange, // optional
    sampleID, // global zone の場合だけない
    volAttack: getValue("attackVolEnv"),
    volDecay: getValue("decayVolEnv"),
    volDelay: getValue("delayVolEnv"),
    volSustain: getValue("sustainVolEnv"),
    volRelease: getValue("releaseVolEnv"),
    modAttack: getValue("attackModEnv"),
    modDecay: getValue("decayModEnv"),
    modDelay: getValue("delayModEnv"),
    modSustain: getValue("sustainModEnv"),
    modRelease: getValue("releaseModEnv"),
    modEnvToPitch: getValue("modEnvToPitch"),
    modEnvToFilterFc: getValue("modEnvToFilterFc"),
    coarseTune: getValue("coarseTune"),
    fineTune: getValue("fineTune"),
    scaleTuning: getValue("scaleTuning"),
    freqVibLFO: getValue("freqVibLFO"),
    startAddrsOffset: getValue("startAddrsOffset"),
    startAddrsCoarseOffset: getValue("startAddrsCoarseOffset"),
    endAddrsOffset: getValue("endAddrsOffset"),
    endAddrsCoarseOffset: getValue("endAddrsCoarseOffset"),
    startloopAddrsOffset: getValue("startloopAddrsOffset"),
    startloopAddrsCoarseOffset: getValue("startloopAddrsCoarseOffset"),
    endloopAddrsOffset: getValue("endloopAddrsOffset"),
    initialAttenuation: getValue("initialAttenuation"),
    endloopAddrsCoarseOffset: getValue("endloopAddrsCoarseOffset"),
    overridingRootKey: getValue("overridingRootKey"),
    initialFilterQ: getValue("initialFilterQ"),
    initialFilterFc: getValue("initialFilterFc"),
    sampleModes: getValue("sampleModes"),
    pan: getValue("pan"),
  }
}

const defaultInstrumentZone = {
  keyRange: new RangeValue(0, 127),
  velRange: new RangeValue(0, 127),
  sampleID: undefined,
  volDelay: -12000,
  volAttack: -12000,
  volDecay: -12000,
  volHold: -12000,
  volSustain: 0,
  volRelease: -12000,
  modDelay: -12000,
  modAttack: -12000,
  modHold: -12000,
  modDecay: -12000,
  modSustain: 0,
  modRelease: -12000,
  modEnvToPitch: 0,
  modEnvToFilterFc: 0,
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

export interface NoteInfo {
  sample: Int16Array
  sampleRate: number
  sampleName: string
  sampleModes: number
  playbackRate: Function
  modEnvToPitch: number
  scaleTuning: number
  start: number
  end: number
  loopStart: number
  loopEnd: number
  volDelay: number
  volAttack: number
  volHold: number
  volDecay: number
  volSustain: number
  volRelease: number
  modDelay: number
  modAttack: number
  modHold: number
  modDecay: number
  modSustain: number
  modRelease: number
  initialFilterFc: number
  modEnvToFilterFc: number
  initialFilterQ: number
  initialAttenuation: number
  freqVibLFO: number | undefined
  pan: number | undefined
  keyRange: RangeValue
  velRange: RangeValue | undefined
}
