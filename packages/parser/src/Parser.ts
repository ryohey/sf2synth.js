import { parseRiff, Chunk, Options as RiffParserOptions } from "./RiffParser"
import {
  PresetHeader,
  SampleHeader,
  PresetBag,
  Instrument,
  InstrumentBag,
  ModulatorList,
  GeneratorList,
  Info,
} from "./Structs"
import Stream from "./Stream"

export interface ParseResult {
  presetHeaders: PresetHeader[]
  presetZone: PresetBag[]
  presetModulators: ModulatorList[]
  presetGenerators: GeneratorList[]
  instruments: Instrument[]
  instrumentZone: InstrumentBag[]
  instrumentModulators: ModulatorList[]
  instrumentGenerators: GeneratorList[]
  sampleHeaders: SampleHeader[]
  samples: Int16Array[]
  samplingData: SamplingData
  info: Info
}

export interface SamplingData {
  offsetMSB: number
  offsetLSB: number | undefined
}

export function parse(
  input: Uint8Array,
  option: RiffParserOptions = {}
): ParseResult {
  // parse RIFF chunk
  const chunkList = parseRiff(input, 0, input.length, option)

  if (chunkList.length !== 1) {
    throw new Error("wrong chunk length")
  }

  const chunk = chunkList[0]
  if (chunk === null) {
    throw new Error("chunk not found")
  }

  function parseRiffChunk(chunk: Chunk, data: Uint8Array) {
    const chunkList = getChunkList(chunk, data, "RIFF", "sfbk")

    if (chunkList.length !== 3) {
      throw new Error("invalid sfbk structure")
    }

    return {
      // INFO-list
      info: parseInfoList(chunkList[0], data),

      // sdta-list
      samplingData: parseSdtaList(chunkList[1], data),

      // pdta-list
      ...parsePdtaList(chunkList[2], data),
    }
  }

  function parsePdtaList(chunk: Chunk, data: Uint8Array) {
    const chunkList = getChunkList(chunk, data, "LIST", "pdta")

    // check number of chunks
    if (chunkList.length !== 9) {
      throw new Error("invalid pdta chunk")
    }

    return {
      presetHeaders: parsePhdr(chunkList[0], data),
      presetZone: parsePbag(chunkList[1], data),
      presetModulators: parsePmod(chunkList[2], data),
      presetGenerators: parsePgen(chunkList[3], data),
      instruments: parseInst(chunkList[4], data),
      instrumentZone: parseIbag(chunkList[5], data),
      instrumentModulators: parseImod(chunkList[6], data),
      instrumentGenerators: parseIgen(chunkList[7], data),
      sampleHeaders: parseShdr(chunkList[8], data),
    }
  }

  const result = parseRiffChunk(chunk, input)

  return {
    ...result,
    samples: loadSample(
      result.sampleHeaders,
      result.samplingData.offsetMSB,
      result.samplingData.offsetLSB,
      input
    ),
  }
}

function getChunkList(
  chunk: Chunk,
  data: Uint8Array,
  expectedType: string,
  expectedSignature: string
) {
  // check parse target
  if (chunk.type !== expectedType) {
    throw new Error("invalid chunk type:" + chunk.type)
  }

  const stream = new Stream(data, chunk.offset)

  // check signature
  const signature = stream.readString(4)
  if (signature !== expectedSignature) {
    throw new Error("invalid signature:" + signature)
  }

  // read structure
  return parseRiff(data, stream.ip, chunk.size - 4)
}

function parseInfoList(chunk: Chunk, data: Uint8Array) {
  const chunkList = getChunkList(chunk, data, "LIST", "INFO")
  return Info.parse(data, chunkList)
}

function parseSdtaList(chunk: Chunk, data: Uint8Array): SamplingData {
  const chunkList = getChunkList(chunk, data, "LIST", "sdta")

  return {
    offsetMSB: chunkList[0].offset,
    offsetLSB: chunkList[1]?.offset,
  }
}

function parseChunk<T>(
  chunk: Chunk,
  data: Uint8Array,
  type: string,
  clazz: { parse: (stream: Stream) => T },
  terminate?: (obj: T) => boolean
): T[] {
  const result: T[] = []

  if (chunk.type !== type) {
    throw new Error("invalid chunk type:" + chunk.type)
  }

  const stream = new Stream(data, chunk.offset)
  const size = chunk.offset + chunk.size

  while (stream.ip < size) {
    const obj = clazz.parse(stream)
    if (terminate && terminate(obj)) {
      break
    }
    result.push(obj)
  }

  return result
}

const parsePhdr = (chunk: Chunk, data: Uint8Array) =>
  parseChunk(chunk, data, "phdr", PresetHeader, (p) => p.isEnd)
const parsePbag = (chunk: Chunk, data: Uint8Array) =>
  parseChunk(chunk, data, "pbag", PresetBag)
const parseInst = (chunk: Chunk, data: Uint8Array) =>
  parseChunk(chunk, data, "inst", Instrument, (i) => i.isEnd)
const parseIbag = (chunk: Chunk, data: Uint8Array) =>
  parseChunk(chunk, data, "ibag", InstrumentBag)
const parsePmod = (chunk: Chunk, data: Uint8Array) =>
  parseChunk(chunk, data, "pmod", ModulatorList, (m) => m.isEnd)
const parseImod = (chunk: Chunk, data: Uint8Array) =>
  parseChunk(chunk, data, "imod", ModulatorList, (m) => m.isEnd)
const parsePgen = (chunk: Chunk, data: Uint8Array) =>
  parseChunk(chunk, data, "pgen", GeneratorList, (g) => g.isEnd)
const parseIgen = (chunk: Chunk, data: Uint8Array) =>
  parseChunk(chunk, data, "igen", GeneratorList)
const parseShdr = (chunk: Chunk, data: Uint8Array) =>
  parseChunk(chunk, data, "shdr", SampleHeader, (s) => s.isEnd)

function adjustSampleData(sample: Int16Array, sampleRate: number) {
  let multiply = 1

  // buffer
  while (sampleRate < 22050) {
    const newSample = new Int16Array(sample.length * 2)
    for (let i = 0, j = 0, il = sample.length; i < il; ++i) {
      newSample[j++] = sample[i]
      newSample[j++] = sample[i]
    }
    sample = newSample
    multiply *= 2
    sampleRate *= 2
  }

  return {
    sample,
    multiply,
  }
}

function loadSample(
  sampleHeader: SampleHeader[],
  samplingDataOffsetMSB: number,
  _samplingDataOffsetLSB: number | undefined,
  data: Uint8Array
): Int16Array[] {
  return sampleHeader.map((header) => {
    let sample = new Int16Array(
      new Uint8Array(
        data.subarray(
          samplingDataOffsetMSB + header.start * 2,
          samplingDataOffsetMSB + header.end * 2
        )
      ).buffer
    )

    // TODO: support 24bit sample

    if (header.sampleRate > 0) {
      const adjust = adjustSampleData(sample, header.sampleRate)
      sample = adjust.sample
      header.sampleRate *= adjust.multiply
      header.loopStart *= adjust.multiply
      header.loopEnd *= adjust.multiply
    }
    return sample
  })
}
