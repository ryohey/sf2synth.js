import { WebMidiLink } from "@ryohey/sf2synth"

const wml = new WebMidiLink()
wml.setLoadCallback(() => {
  console.info("Loaded.")
})
wml.setup("/A320U.sf2")
