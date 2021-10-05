function arrayRange(start, end) {
    return Array.from({ length: end - start }, (_, k) => k + start);
}
export function getInstrumentZone(parsed, instrumentZoneIndex) {
    const instrumentBag = parsed.instrumentZone[instrumentZoneIndex];
    const nextInstrumentBag = parsed.instrumentZone[instrumentZoneIndex + 1];
    const generatorIndex = instrumentBag.instrumentGeneratorIndex;
    const nextGeneratorIndex = nextInstrumentBag
        ? nextInstrumentBag.instrumentGeneratorIndex
        : parsed.instrumentGenerators.length;
    return parsed.instrumentGenerators.slice(generatorIndex, nextGeneratorIndex);
}
export function getInstrumentZoneIndexes(parsed, instrumentID) {
    const instrument = parsed.instruments[instrumentID];
    const nextInstrument = parsed.instruments[instrumentID + 1];
    return arrayRange(instrument.instrumentBagIndex, nextInstrument
        ? nextInstrument.instrumentBagIndex
        : parsed.instrumentZone.length);
}
export function getInstrumentGenerators(parsed, instrumentID) {
    return getInstrumentZoneIndexes(parsed, instrumentID).map((i) => getInstrumentZone(parsed, i));
}
//# sourceMappingURL=getInstrumentGenerators.js.map