import Synthesizer from "./Synthesizer";
import View from "./View";
import MidiMessageHandler from "./MidiMessageHandler";
export default class WebMidiLink {
    loadCallback: (buf: ArrayBuffer) => void;
    midiMessageHandler: MidiMessageHandler;
    ready: boolean;
    synth: Synthesizer;
    view: View;
    target: Element | null;
    wml: Window | null;
    constructor(target?: string);
    setup(url: string): void;
    load(url: string): void;
    onload(response: ArrayBuffer): void;
    loadSoundFont(input: Uint8Array): void;
    onmessage(ev: MessageEvent): void;
    setLoadCallback(callback: (buf: ArrayBuffer) => void): void;
}
