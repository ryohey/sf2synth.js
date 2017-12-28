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

  getInstrumentKey(bankNumber, instrumentNumber, key, velocity = 100): NoteInfo|null {
    const presetHeader = this.parsed.presetHeaders.find(p => p.preset === instrumentNumber && p.bank === bankNumber)
    
    if (!presetHeader) {
      console.warn("preset not found: bank=%s instrument=%s", bankNumber, instrumentNumber)
      return null
    }

    let presetGenerators: GeneratorList[]
    const presetBag = this.parsed.presetZone[presetHeader.presetBagIndex]

    const nextPresetHeaderIndex = this.parsed.presetHeaders.indexOf(presetHeader) + 1
    if (nextPresetHeaderIndex < this.parsed.presetHeaders.length) {
      // 次の preset までのすべての generator を取得する
      const nextPresetHeader = this.parsed.presetHeaders[nextPresetHeaderIndex]
      const nextPresetBag = this.parsed.presetZone[nextPresetHeader.presetBagIndex]
      presetGenerators = this.parsed.presetGenerators.slice(presetBag.presetGeneratorIndex, nextPresetBag.presetGeneratorIndex)
    } else {
      // 最後の preset だった場合は一つだけ使う
      presetGenerators = [this.parsed.presetGenerators[presetBag.presetGeneratorIndex]]
    }

    // Last Preset Generator must be instrument
    const lastPresetGenertor = presetGenerators[presetGenerators.length - 1]
    if (lastPresetGenertor.type !== "instrument" || Number(lastPresetGenertor.value) === NaN) {
      throw new Error("Invalid SoundFont: invalid preset generator: expect instrument")
    }
    const instrumentID = lastPresetGenertor.value as number
    const instrument = this.parsed.instruments[instrumentID]
    const nextInstrument = this.parsed.instruments[instrumentID + 1]

    // instrument がもつ全ての Generator を使いやすい形式にまとめる
    const instrumentZones = arrayRange(instrument.instrumentBagIndex, nextInstrument.instrumentBagIndex)
      .map(i => {
        const instrumentBag = this.parsed.instrumentZone[i]
        const nextInstrumentBag = this.parsed.instrumentZone[i + 1]
        const generators = this.parsed.instrumentGenerators.slice(instrumentBag.instrumentGeneratorIndex, nextInstrumentBag.instrumentGeneratorIndex)
        return createInstrumentZone(generators)
      })

    let globalInstrumentZone: any|undefined
    
    // 最初のゾーンがsampleID を持たなければ global instrument zone
    if (instrumentZones[0].sampleID === undefined) {
      globalInstrumentZone = instrumentZones[0]
    }

    // keyRange と velRange がマッチしている Generator を探す
    const instrumentZone = instrumentZones.find(i => {
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
      console.warn("instrument not found: bank=%s instrument=%s", bankNumber, instrumentNumber)
      return null
    }

    if (instrumentZone.sampleID === undefined) { 
      throw new Error("Invalid SoundFont: sampleID not found")
    }
    
    const gen = {...defaultInstrumentZone, ...removeUndefined(globalInstrumentZone || {}), ...removeUndefined(instrumentZone)}

    const sample = this.parsed.samples[gen.sampleID!]
    const sampleHeader = this.parsed.sampleHeaders[gen.sampleID!]
    const tune = gen.coarseTune + gen.fineTune / 100
    const basePitch = tune + (sampleHeader.pitchCorrection / 100) - (gen.overridingRootKey || sampleHeader.originalPitch)
    const scaleTuning = gen.scaleTuning / 100

    return {
      sample,
      sampleRate: sampleHeader.sampleRate,
      sampleName: sampleHeader.sampleName,
      scaleTuning,
      playbackRate: (key) => Math.pow(Math.pow(2, 1 / 12), (key + basePitch) * scaleTuning),
      keyRange: gen.keyRange,
      velRange: gen.velRange,
      volAttack: Math.pow(2, gen.volAttack / 1200),
      volDecay: Math.pow(2, gen.volDecay / 1200),
      volSustain: gen.volSustain / 1000,
      volRelease: Math.pow(2, gen.volRelease / 1200),
      modAttack: Math.pow(2, gen.modAttack / 1200),
      modDecay: Math.pow(2, gen.modDecay / 1200),
      modSustain: gen.modSustain / 1000,
      modRelease: Math.pow(2, gen.modRelease / 1200),
      modEnvToPitch: gen.modEnvToPitch / 100,
      modEnvToFilterFc: gen.modEnvToFilterFc,
      initialFilterQ: gen.initialFilterQ,
      initialFilterFc: gen.initialFilterFc,
      freqVibLFO: gen.freqVibLFO ? Math.pow(2, gen.freqVibLFO / 1200) * 8.176 : undefined,
      start: gen.startAddrsCoarseOffset * 32768 + gen.startAddrsOffset,
      end: gen.endAddrsCoarseOffset * 32768 + gen.endAddrsOffset,
      loopStart: (
        sampleHeader.loopStart +
        gen.startloopAddrsCoarseOffset * 32768 +
        gen.startloopAddrsOffset
      ),
      loopEnd: (
        sampleHeader.loopEnd +
        gen.endloopAddrsCoarseOffset * 32768 +
        gen.endloopAddrsOffset
      ),
    }
  }

  // presetNames[bankNumber][presetNumber] = presetName
  getPresetNames() {
    const bank: {[index: number]: {[index: number]: string}} = {}
    this.parsed.presetHeaders.forEach(preset => {
      if (!bank[preset.bank]) {
        bank[preset.bank] = {}
      }
      bank[preset.bank][preset.preset] = preset.presetName
    })
    return bank
  }
}

function removeUndefined(obj) {
  const result = {}
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      result[key] = obj[key]
    }
  })
  return result
}

function arrayRange(start, end) {
  return Array.from({length: end - start}, (_, k) => k + start);
}

// ひとつの instrument に対応する Generator の配列から使いやすくしたオブジェクトを返す
function createInstrumentZone(instrumentGenerators: GeneratorList[]) {
  function getValue(type: string): number|undefined {
    const generator = instrumentGenerators.find(g => g.type === type)
    if (!generator) {
      return undefined
    }
    if (Number(generator.value) === NaN) {
      throw new Error("something wrong")
    }
    return generator.value as number
  }
  
  // First Instrument Generator must be keyRange
  const firstInstrumentGenerator = instrumentGenerators[0]
  let keyRange: RangeValue|undefined
  if (firstInstrumentGenerator.type === "keyRange") {
    if (!(firstInstrumentGenerator.value instanceof RangeValue)) {
      throw new Error("Invalid SoundFont: keyRange is not ranged value")
    }
    keyRange = firstInstrumentGenerator.value as RangeValue
  }

  // Second Instrument Generator could be velRange
  const secondInstrumentGenerator = instrumentGenerators[1]
  let velRange: RangeValue|undefined
  if (secondInstrumentGenerator && secondInstrumentGenerator.type === "velRange") {
    if (!(secondInstrumentGenerator.value instanceof RangeValue)) {
      throw new Error("Invalid SoundFont: velRange is not ranged value")
    }
    velRange = secondInstrumentGenerator.value as RangeValue
  }

  // Last Instrument Generator must be sampleID
  const lastInstrumentGenerator = instrumentGenerators[instrumentGenerators.length - 1]
  let sampleID: number|undefined
  if (lastInstrumentGenerator.type === "sampleID") {
    if (Number(lastInstrumentGenerator.value) === NaN) {
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
    volSustain: getValue("sustainVolEnv"),
    volRelease: getValue("releaseVolEnv"),
    modAttack: getValue("attackModEnv"),
    modDecay: getValue("decayModEnv"),
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
    endloopAddrsCoarseOffset: getValue("endloopAddrsCoarseOffset"),
    overridingRootKey: getValue("overridingRootKey"),
    initialFilterQ: getValue("initialFilterQ"),
    initialFilterFc: getValue("initialFilterFc"),
  }
}

const defaultInstrumentZone = {
  keyRange: new RangeValue(0, 127),
  velRange: new RangeValue(0, 127),
  sampleID: undefined,
  volAttack: -12000,
  volDecay: -12000,
  volSustain: 0,
  volRelease: -12000,
  modAttack: -12000,
  modDecay: -12000,
  modSustain: 0,
  modRelease: 0,
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
  endloopAddrsOffset: 0,
  endloopAddrsCoarseOffset: 0,
  overridingRootKey: undefined,
  initialFilterQ: 1,
  initialFilterFc: 13500,
}

export interface NoteInfo {
  sample: Int16Array
  sampleRate: number
  sampleName: string
  start: number
  end: number
  scaleTuning: number
  playbackRate: Function
  loopStart: number
  loopEnd: number
  volAttack: number
  volDecay: number
  volSustain: number
  volRelease: number
  modAttack: number
  modDecay: number
  modSustain: number
  modRelease: number
  modEnvToPitch: number
  modEnvToFilterFc: number
  initialFilterFc: number
  initialFilterQ: number
  freqVibLFO: number|undefined
  keyRange: RangeValue
  velRange: RangeValue|undefined
}
