'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class Stream {
    constructor(data, offset) {
        this.data = data;
        this.ip = offset;
    }
    readString(size) {
        const str = String.fromCharCode.apply(null, this.data.subarray(this.ip, (this.ip += size)));
        const nullLocation = str.indexOf("\u0000");
        if (nullLocation > 0) {
            return str.substr(0, nullLocation);
        }
        return str;
    }
    readWORD() {
        return this.data[this.ip++] | (this.data[this.ip++] << 8);
    }
    readDWORD(bigEndian = false) {
        if (bigEndian) {
            return (((this.data[this.ip++] << 24) |
                (this.data[this.ip++] << 16) |
                (this.data[this.ip++] << 8) |
                this.data[this.ip++]) >>>
                0);
        }
        else {
            return ((this.data[this.ip++] |
                (this.data[this.ip++] << 8) |
                (this.data[this.ip++] << 16) |
                (this.data[this.ip++] << 24)) >>>
                0);
        }
    }
    readByte() {
        return this.data[this.ip++];
    }
    readAt(offset) {
        return this.data[this.ip + offset];
    }
    /* helper */
    readUInt8() {
        return this.readByte();
    }
    readInt8() {
        return (this.readByte() << 24) >> 24;
    }
    readUInt16() {
        return this.readWORD();
    }
    readInt16() {
        return (this.readWORD() << 16) >> 16;
    }
    readUInt32() {
        return this.readDWORD();
    }
}

function parseChunk$1(input, ip, bigEndian) {
    const stream = new Stream(input, ip);
    const type = stream.readString(4);
    const size = stream.readDWORD(bigEndian);
    return new Chunk(type, size, stream.ip);
}
function parseRiff(input, index = 0, length, { padding = true, bigEndian = false } = {}) {
    const chunkList = [];
    const end = length + index;
    let ip = index;
    while (ip < end) {
        const chunk = parseChunk$1(input, ip, bigEndian);
        ip = chunk.offset + chunk.size;
        // padding
        if (padding && ((ip - index) & 1) === 1) {
            ip++;
        }
        chunkList.push(chunk);
    }
    return chunkList;
}
class Chunk {
    constructor(type, size, offset) {
        this.type = type;
        this.size = size;
        this.offset = offset;
    }
}

const GeneratorEnumeratorTable = [
    "startAddrsOffset",
    "endAddrsOffset",
    "startloopAddrsOffset",
    "endloopAddrsOffset",
    "startAddrsCoarseOffset",
    "modLfoToPitch",
    "vibLfoToPitch",
    "modEnvToPitch",
    "initialFilterFc",
    "initialFilterQ",
    "modLfoToFilterFc",
    "modEnvToFilterFc",
    "endAddrsCoarseOffset",
    "modLfoToVolume",
    undefined,
    "chorusEffectsSend",
    "reverbEffectsSend",
    "pan",
    undefined,
    undefined,
    undefined,
    "delayModLFO",
    "freqModLFO",
    "delayVibLFO",
    "freqVibLFO",
    "delayModEnv",
    "attackModEnv",
    "holdModEnv",
    "decayModEnv",
    "sustainModEnv",
    "releaseModEnv",
    "keynumToModEnvHold",
    "keynumToModEnvDecay",
    "delayVolEnv",
    "attackVolEnv",
    "holdVolEnv",
    "decayVolEnv",
    "sustainVolEnv",
    "releaseVolEnv",
    "keynumToVolEnvHold",
    "keynumToVolEnvDecay",
    "instrument",
    undefined,
    "keyRange",
    "velRange",
    "startloopAddrsCoarseOffset",
    "keynum",
    "velocity",
    "initialAttenuation",
    undefined,
    "endloopAddrsCoarseOffset",
    "coarseTune",
    "fineTune",
    "sampleID",
    "sampleModes",
    undefined,
    "scaleTuning",
    "exclusiveClass",
    "overridingRootKey",
];

class VersionTag {
    static parse(stream) {
        const v = new VersionTag();
        v.major = stream.readInt8();
        v.minor = stream.readInt8();
        return v;
    }
}
class Info {
    // LIST - INFO の全ての chunk
    static parse(data, chunks) {
        function getChunk(type) {
            return chunks.find((c) => c.type === type);
        }
        function toStream(chunk) {
            return new Stream(data, chunk.offset);
        }
        function readString(type) {
            const chunk = getChunk(type);
            if (!chunk) {
                return null;
            }
            return toStream(chunk).readString(chunk.size);
        }
        function readVersionTag(type) {
            const chunk = getChunk(type);
            if (!chunk) {
                return null;
            }
            return VersionTag.parse(toStream(chunk));
        }
        const info = new Info();
        info.comment = readString("ICMT");
        info.copyright = readString("ICOP");
        info.creationDate = readString("ICRD");
        info.engineer = readString("IENG");
        info.name = readString("INAM");
        info.product = readString("IPRD");
        info.software = readString("ISFT");
        info.version = readVersionTag("ifil");
        info.soundEngine = readString("isng");
        info.romName = readString("irom");
        info.romVersion = readVersionTag("iver");
        return info;
    }
}
class PresetHeader {
    get isEnd() {
        return this.presetName === "EOP";
    }
    static parse(stream) {
        const p = new PresetHeader();
        p.presetName = stream.readString(20);
        p.preset = stream.readWORD();
        p.bank = stream.readWORD();
        p.presetBagIndex = stream.readWORD();
        p.library = stream.readDWORD();
        p.genre = stream.readDWORD();
        p.morphology = stream.readDWORD();
        return p;
    }
}
class PresetBag {
    static parse(stream) {
        const p = new PresetBag();
        p.presetGeneratorIndex = stream.readWORD();
        p.presetModulatorIndex = stream.readWORD();
        return p;
    }
}
class RangeValue {
    constructor(lo, hi) {
        this.lo = lo;
        this.hi = hi;
    }
    static parse(stream) {
        return new RangeValue(stream.readByte(), stream.readByte());
    }
}
class ModulatorList {
    get type() {
        return GeneratorEnumeratorTable[this.destinationOper];
    }
    get isEnd() {
        return (this.sourceOper === 0 &&
            this.destinationOper === 0 &&
            this.value === 0 &&
            this.amountSourceOper === 0 &&
            this.transOper === 0);
    }
    static parse(stream) {
        const t = new ModulatorList();
        t.sourceOper = stream.readWORD();
        t.destinationOper = stream.readWORD();
        switch (t.type) {
            case "keyRange": /* FALLTHROUGH */
            case "velRange": /* FALLTHROUGH */
            case "keynum": /* FALLTHROUGH */
            case "velocity":
                t.value = RangeValue.parse(stream);
                break;
            default:
                t.value = stream.readInt16();
                break;
        }
        t.amountSourceOper = stream.readWORD();
        t.transOper = stream.readWORD();
        return t;
    }
}
class GeneratorList {
    get type() {
        return GeneratorEnumeratorTable[this.code];
    }
    get isEnd() {
        return this.code === 0 && this.value === 0;
    }
    static parse(stream) {
        const t = new GeneratorList();
        t.code = stream.readWORD();
        switch (t.type) {
            case "keynum": /* FALLTHROUGH */
            case "keyRange": /* FALLTHROUGH */
            case "velRange": /* FALLTHROUGH */
            case "velocity":
                t.value = RangeValue.parse(stream);
                break;
            default:
                t.value = stream.readInt16();
                break;
        }
        return t;
    }
}
class Instrument {
    get isEnd() {
        return this.instrumentName === "EOI";
    }
    static parse(stream) {
        const t = new Instrument();
        t.instrumentName = stream.readString(20);
        t.instrumentBagIndex = stream.readWORD();
        return t;
    }
}
class InstrumentBag {
    static parse(stream) {
        const t = new InstrumentBag();
        t.instrumentGeneratorIndex = stream.readWORD();
        t.instrumentModulatorIndex = stream.readWORD();
        return t;
    }
}
class SampleHeader {
    get isEnd() {
        return this.sampleName === "EOS";
    }
    static parse(stream) {
        const s = new SampleHeader();
        s.sampleName = stream.readString(20);
        s.start = stream.readDWORD();
        s.end = stream.readDWORD();
        s.loopStart = stream.readDWORD();
        s.loopEnd = stream.readDWORD();
        s.sampleRate = stream.readDWORD();
        s.originalPitch = stream.readByte();
        s.pitchCorrection = stream.readInt8();
        s.sampleLink = stream.readWORD();
        s.sampleType = stream.readWORD();
        s.loopStart -= s.start;
        s.loopEnd -= s.start;
        return s;
    }
}

function parse(input, option = {}) {
    // parse RIFF chunk
    const chunkList = parseRiff(input, 0, input.length, option);
    if (chunkList.length !== 1) {
        throw new Error("wrong chunk length");
    }
    const chunk = chunkList[0];
    if (chunk === null) {
        throw new Error("chunk not found");
    }
    function parseRiffChunk(chunk, data) {
        const chunkList = getChunkList(chunk, data, "RIFF", "sfbk");
        if (chunkList.length !== 3) {
            throw new Error("invalid sfbk structure");
        }
        return Object.assign({ 
            // INFO-list
            info: parseInfoList(chunkList[0], data), 
            // sdta-list
            samplingData: parseSdtaList(chunkList[1], data) }, parsePdtaList(chunkList[2], data));
    }
    function parsePdtaList(chunk, data) {
        const chunkList = getChunkList(chunk, data, "LIST", "pdta");
        // check number of chunks
        if (chunkList.length !== 9) {
            throw new Error("invalid pdta chunk");
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
        };
    }
    const result = parseRiffChunk(chunk, input);
    return Object.assign(Object.assign({}, result), { samples: loadSample(result.sampleHeaders, result.samplingData.offset, input) });
}
function getChunkList(chunk, data, expectedType, expectedSignature) {
    // check parse target
    if (chunk.type !== expectedType) {
        throw new Error("invalid chunk type:" + chunk.type);
    }
    const stream = new Stream(data, chunk.offset);
    // check signature
    const signature = stream.readString(4);
    if (signature !== expectedSignature) {
        throw new Error("invalid signature:" + signature);
    }
    // read structure
    return parseRiff(data, stream.ip, chunk.size - 4);
}
function parseInfoList(chunk, data) {
    const chunkList = getChunkList(chunk, data, "LIST", "INFO");
    return Info.parse(data, chunkList);
}
function parseSdtaList(chunk, data) {
    const chunkList = getChunkList(chunk, data, "LIST", "sdta");
    if (chunkList.length !== 1) {
        throw new Error("TODO");
    }
    return chunkList[0];
}
function parseChunk(chunk, data, type, clazz, terminate) {
    const result = [];
    if (chunk.type !== type) {
        throw new Error("invalid chunk type:" + chunk.type);
    }
    const stream = new Stream(data, chunk.offset);
    const size = chunk.offset + chunk.size;
    while (stream.ip < size) {
        const obj = clazz.parse(stream);
        if (terminate && terminate(obj)) {
            break;
        }
        result.push(obj);
    }
    return result;
}
const parsePhdr = (chunk, data) => parseChunk(chunk, data, "phdr", PresetHeader, (p) => p.isEnd);
const parsePbag = (chunk, data) => parseChunk(chunk, data, "pbag", PresetBag);
const parseInst = (chunk, data) => parseChunk(chunk, data, "inst", Instrument, (i) => i.isEnd);
const parseIbag = (chunk, data) => parseChunk(chunk, data, "ibag", InstrumentBag);
const parsePmod = (chunk, data) => parseChunk(chunk, data, "pmod", ModulatorList, (m) => m.isEnd);
const parseImod = (chunk, data) => parseChunk(chunk, data, "imod", ModulatorList, (m) => m.isEnd);
const parsePgen = (chunk, data) => parseChunk(chunk, data, "pgen", GeneratorList, (g) => g.isEnd);
const parseIgen = (chunk, data) => parseChunk(chunk, data, "igen", GeneratorList);
const parseShdr = (chunk, data) => parseChunk(chunk, data, "shdr", SampleHeader, (s) => s.isEnd);
function adjustSampleData(sample, sampleRate) {
    let multiply = 1;
    // buffer
    while (sampleRate < 22050) {
        const newSample = new Int16Array(sample.length * 2);
        for (let i = 0, j = 0, il = sample.length; i < il; ++i) {
            newSample[j++] = sample[i];
            newSample[j++] = sample[i];
        }
        sample = newSample;
        multiply *= 2;
        sampleRate *= 2;
    }
    return {
        sample,
        multiply,
    };
}
function loadSample(sampleHeader, samplingDataOffset, data) {
    return sampleHeader.map((header) => {
        let sample = new Int16Array(new Uint8Array(data.subarray(samplingDataOffset + header.start * 2, samplingDataOffset + header.end * 2)).buffer);
        if (header.sampleRate > 0) {
            const adjust = adjustSampleData(sample, header.sampleRate);
            sample = adjust.sample;
            header.sampleRate *= adjust.multiply;
            header.loopStart *= adjust.multiply;
            header.loopEnd *= adjust.multiply;
        }
        return sample;
    });
}

function createGeneraterObject(generators) {
    const result = {};
    for (const gen of generators) {
        const type = gen.type;
        if (type !== undefined) {
            result[type] = gen.value;
        }
    }
    return result;
}
const defaultInstrumentZone = {
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
};

function arrayRange(start, end) {
    return Array.from({ length: end - start }, (_, k) => k + start);
}
function getInstrumentZone(parsed, instrumentZoneIndex) {
    const instrumentBag = parsed.instrumentZone[instrumentZoneIndex];
    const nextInstrumentBag = parsed.instrumentZone[instrumentZoneIndex + 1];
    const generatorIndex = instrumentBag.instrumentGeneratorIndex;
    const nextGeneratorIndex = nextInstrumentBag
        ? nextInstrumentBag.instrumentGeneratorIndex
        : parsed.instrumentGenerators.length;
    return parsed.instrumentGenerators.slice(generatorIndex, nextGeneratorIndex);
}
function getInstrumentZoneIndexes(parsed, instrumentID) {
    const instrument = parsed.instruments[instrumentID];
    const nextInstrument = parsed.instruments[instrumentID + 1];
    return arrayRange(instrument.instrumentBagIndex, nextInstrument
        ? nextInstrument.instrumentBagIndex
        : parsed.instrumentZone.length);
}
function getInstrumentGenerators(parsed, instrumentID) {
    return getInstrumentZoneIndexes(parsed, instrumentID).map((i) => getInstrumentZone(parsed, i));
}

function getPresetGenerators(parsed, presetHeaderIndex) {
    let presetGenerators;
    const presetHeader = parsed.presetHeaders[presetHeaderIndex];
    const presetBag = parsed.presetZone[presetHeader.presetBagIndex];
    const nextPresetHeaderIndex = presetHeaderIndex + 1;
    if (nextPresetHeaderIndex < parsed.presetHeaders.length) {
        // 次の preset までのすべての generator を取得する
        const nextPresetHeader = parsed.presetHeaders[nextPresetHeaderIndex];
        const nextPresetBag = parsed.presetZone[nextPresetHeader.presetBagIndex];
        presetGenerators = parsed.presetGenerators.slice(presetBag.presetGeneratorIndex, nextPresetBag.presetGeneratorIndex);
    }
    else {
        // 最後の preset だった場合は最後まで取得する
        presetGenerators = parsed.presetGenerators.slice(presetBag.presetGeneratorIndex, parsed.presetGenerators.length);
    }
    return presetGenerators;
}

/**
 * Parser で読み込んだサウンドフォントのデータを
 * Synthesizer から利用しやすい形にするクラス
 */
class SoundFont {
    constructor(parsed) {
        this.parsed = parsed;
    }
    getPresetZone(presetHeaderIndex) {
        return getPresetGenerators(this.parsed, presetHeaderIndex);
    }
    getInstrumentZone(instrumentZoneIndex) {
        return createGeneraterObject(getInstrumentZone(this.parsed, instrumentZoneIndex));
    }
    getInstrumentZoneIndexes(instrumentID) {
        return getInstrumentZoneIndexes(this.parsed, instrumentID);
    }
    getInstrumentKey(bankNumber, instrumentNumber, key, velocity = 100) {
        const presetHeaderIndex = this.parsed.presetHeaders.findIndex((p) => p.preset === instrumentNumber && p.bank === bankNumber);
        if (presetHeaderIndex < 0) {
            console.warn("preset not found: bank=%s instrument=%s", bankNumber, instrumentNumber);
            return null;
        }
        const presetGenerators = getPresetGenerators(this.parsed, presetHeaderIndex);
        // Last Preset Generator must be instrument
        const lastPresetGenertor = presetGenerators[presetGenerators.length - 1];
        if (lastPresetGenertor.type !== "instrument" ||
            isNaN(Number(lastPresetGenertor.value))) {
            throw new Error("Invalid SoundFont: invalid preset generator: expect instrument");
        }
        const instrumentID = lastPresetGenertor.value;
        const instrumentZones = getInstrumentGenerators(this.parsed, instrumentID).map(createGeneraterObject);
        // 最初のゾーンがsampleID を持たなければ global instrument zone
        let globalInstrumentZone;
        const firstInstrumentZone = instrumentZones[0];
        if (firstInstrumentZone.sampleID === undefined) {
            globalInstrumentZone = instrumentZones[0];
        }
        // keyRange と velRange がマッチしている Generator を探す
        const instrumentZone = instrumentZones.find((i) => {
            if (i === globalInstrumentZone) {
                return false; // global zone を除外
            }
            let isInKeyRange = false;
            if (i.keyRange) {
                isInKeyRange = key >= i.keyRange.lo && key <= i.keyRange.hi;
            }
            let isInVelRange = true;
            if (i.velRange) {
                isInVelRange = velocity >= i.velRange.lo && velocity <= i.velRange.hi;
            }
            return isInKeyRange && isInVelRange;
        });
        if (!instrumentZone) {
            console.warn("instrument not found: bank=%s instrument=%s", bankNumber, instrumentNumber);
            return null;
        }
        if (instrumentZone.sampleID === undefined) {
            throw new Error("Invalid SoundFont: sampleID not found");
        }
        const gen = Object.assign(Object.assign(Object.assign({}, defaultInstrumentZone), removeUndefined(globalInstrumentZone || {})), removeUndefined(instrumentZone));
        const sample = this.parsed.samples[gen.sampleID];
        const sampleHeader = this.parsed.sampleHeaders[gen.sampleID];
        const tune = gen.coarseTune + gen.fineTune / 100;
        const basePitch = tune +
            sampleHeader.pitchCorrection / 100 -
            (gen.overridingRootKey || sampleHeader.originalPitch);
        const scaleTuning = gen.scaleTuning / 100;
        return {
            sample,
            sampleRate: sampleHeader.sampleRate,
            sampleName: sampleHeader.sampleName,
            sampleModes: gen.sampleModes,
            playbackRate: (key) => Math.pow(Math.pow(2, 1 / 12), (key + basePitch) * scaleTuning),
            modEnvToPitch: gen.modEnvToPitch / 100,
            scaleTuning,
            start: gen.startAddrsCoarseOffset * 32768 + gen.startAddrsOffset,
            end: gen.endAddrsCoarseOffset * 32768 + gen.endAddrsOffset,
            loopStart: sampleHeader.loopStart +
                gen.startloopAddrsCoarseOffset * 32768 +
                gen.startloopAddrsOffset,
            loopEnd: sampleHeader.loopEnd +
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
            modEnvToFilterFc: gen.modEnvToFilterFc,
            initialFilterQ: gen.initialFilterQ,
            initialAttenuation: gen.initialAttenuation,
            freqVibLFO: gen.freqVibLFO
                ? convertTime(gen.freqVibLFO) * 8.176
                : undefined,
            pan: gen.pan,
        };
    }
    // presetNames[bankNumber][presetNumber] = presetName
    getPresetNames() {
        const bank = {};
        this.parsed.presetHeaders.forEach((preset) => {
            if (!bank[preset.bank]) {
                bank[preset.bank] = {};
            }
            bank[preset.bank][preset.preset] = preset.presetName;
        });
        return bank;
    }
}
// value = 1200log2(sec) で表される時間を秒単位に変換する
function convertTime(value) {
    return Math.pow(2, value / 1200);
}
function removeUndefined(obj) {
    const result = {};
    for (let key in obj) {
        if (obj[key] !== undefined) {
            result[key] = obj[key];
        }
    }
    return result;
}

exports.SoundFont = SoundFont;
exports.convertTime = convertTime;
exports.createGeneraterObject = createGeneraterObject;
exports.defaultInstrumentZone = defaultInstrumentZone;
exports.getInstrumentGenerators = getInstrumentGenerators;
exports.getInstrumentZone = getInstrumentZone;
exports.getInstrumentZoneIndexes = getInstrumentZoneIndexes;
exports.getPresetGenerators = getPresetGenerators;
exports.parse = parse;
//# sourceMappingURL=index.js.map
