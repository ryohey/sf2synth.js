import {
  createGeneraterObject,
  defaultInstrumentZone,
  GeneratorParams,
} from "./GeneratorParams"
import { ParseResult } from "./Parser"
import {
  getInstrumentGenerators,
  getInstrumentZone,
  getInstrumentZoneIndexes,
} from "./getInstrumentGenerators"
import { RangeValue } from "./Structs"
import { getPresetGenerators } from "./getPresetGenerators"

/**
 * Parser で読み込んだサウンドフォントのデータを
 * Synthesizer から利用しやすい形にするクラス
 */
export class SoundFont {
  private parsed: ParseResult

  constructor(parsed: ParseResult) {
    this.parsed = parsed
  }

  getPresetZone(presetHeaderIndex: number) {
    return getPresetGenerators(this.parsed, presetHeaderIndex)
  }

  getInstrumentZone(instrumentZoneIndex: number) {
    return createGeneraterObject(
      getInstrumentZone(this.parsed, instrumentZoneIndex)
    )
  }

  getInstrumentZoneIndexes(instrumentID: number): number[] {
    return getInstrumentZoneIndexes(this.parsed, instrumentID)
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

    const presetGenerators = getPresetGenerators(this.parsed, presetHeaderIndex)

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

    const instrumentZones = getInstrumentGenerators(
      this.parsed,
      instrumentID
    ).map(createGeneraterObject)

    // 最初のゾーンがsampleID を持たなければ global instrument zone
    let globalInstrumentZone: Partial<GeneratorParams> | undefined
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
      volDelay: convertTime(gen.delayVolEnv),
      volAttack: convertTime(gen.attackVolEnv),
      volHold: convertTime(gen.holdVolEnv),
      volDecay: convertTime(gen.decayVolEnv),
      volSustain: gen.sustainVolEnv / 1000,
      volRelease: convertTime(gen.releaseVolEnv),
      modDelay: convertTime(gen.delayModEnv),
      modAttack: convertTime(gen.attackModEnv),
      modHold: convertTime(gen.holdModEnv),
      modDecay: convertTime(gen.decayModEnv),
      modSustain: gen.sustainModEnv / 1000,
      modRelease: convertTime(gen.releaseModEnv),
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
