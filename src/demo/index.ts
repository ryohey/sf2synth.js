import { WebMidiLink } from "../synth"

const wml = new WebMidiLink()
wml.setLoadCallback(() => {
  // ロード完了時の処理
})
wml.setup("TestSoundFont.sf2")
