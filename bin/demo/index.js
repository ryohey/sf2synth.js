import { WebMidiLink } from "../synth";
const wml = new WebMidiLink();
wml.setLoadCallback(() => {
    console.info("Loaded.");
});
wml.setup("//cdn.rawgit.com/logue/smfplayer.js/gh-pages/Yamaha%20XG%20Sound%20Set.sf2");
//# sourceMappingURL=index.js.map