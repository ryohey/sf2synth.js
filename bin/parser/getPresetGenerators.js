export function getPresetGenerators(parsed, presetHeaderIndex) {
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
//# sourceMappingURL=getPresetGenerators.js.map