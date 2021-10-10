import Synthesizer from "./Synthesizer"
import View from "./View"
import MidiMessageHandler, { Listener } from "./MidiMessageHandler"
import delegateProxy from "./delegateProxy"

export default class WebMidiLink {
  loadCallback: (buf: ArrayBuffer) => void
  midiMessageHandler: MidiMessageHandler
  ready: boolean = false
  synth: Synthesizer
  view: View
  target: Element | null
  wml: Window | null

  constructor(target = ".synth") {
    this.midiMessageHandler = new MidiMessageHandler()
    this.target = document.body.querySelector(target)
    if (!this.target) {
      throw "Target DOM is not found."
    }
    if (window.opener) {
      this.wml = window.opener
    } else if (window.parent !== window) {
      this.wml = window.parent
    } else {
      this.wml = null
    }

    window.addEventListener(
      "DOMContentLoaded",
      () => (this.ready = true),
      false
    )
  }

  setup(url: string) {
    if (!this.ready) {
      const onload = () => {
        window.removeEventListener("DOMContentLoaded", onload, false)
        this.load(url)
      }
      window.addEventListener("DOMContentLoaded", onload, false)
    } else {
      this.load(url)
    }
  }

  load(url: string) {
    const xhr = new XMLHttpRequest()
    const progress = this.target!.appendChild(
      document.createElement("progress")
    )
    const percentage = progress.parentNode!.insertBefore(
      document.createElement("outpout"),
      progress.nextElementSibling
    )

    xhr.open("GET", url, true)
    xhr.responseType = "arraybuffer"

    xhr.addEventListener(
      "load",
      (ev) => {
        const xhr = ev.target as XMLHttpRequest

        this.onload(xhr.response)
        this.target!.removeChild(progress)
        this.target!.removeChild(percentage)
        if (typeof this.loadCallback === "function") {
          this.loadCallback(xhr.response)
        }
      },
      false
    )

    xhr.addEventListener(
      "progress",
      (e) => {
        progress.max = e.total
        progress.value = e.loaded
        percentage.innerText = e.loaded / e.total / 100 + " %"
        // NOTE: This message is not compliant of WebMidiLink.
        if (this.wml)
          this.wml.postMessage("link,progress," + e.loaded + "," + e.total, "*")
      },
      false
    )
    xhr.send()
  }

  onload(response: ArrayBuffer) {
    const input = new Uint8Array(response)
    this.loadSoundFont(input)
  }

  loadSoundFont(input: Uint8Array) {
    let synth: Synthesizer

    if (!this.synth) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      synth = this.synth = new Synthesizer(ctx)
      synth.connect(ctx.destination)
      synth.loadSoundFont(input)
      const view = (this.view = new View())
      this.target!.appendChild(view.draw(synth))
      this.midiMessageHandler.listener = delegateProxy<Listener>([synth, view])
      window.addEventListener("message", this.onmessage.bind(this), false)
    } else {
      synth = this.synth
      synth.loadSoundFont(input)
    }

    // link ready
    if (this.wml) this.wml.postMessage("link,ready", "*")
  }

  onmessage(ev: MessageEvent) {
    if (typeof ev.data !== "string") {
      return
    }
    const msg = ev.data.split(",")
    const type = msg.shift()

    switch (type) {
      case "midi":
        this.midiMessageHandler.processMidiMessage(
          msg.map((hex) => parseInt(hex, 16))
        )
        break
      case "link":
        const command = msg.shift()
        switch (command) {
          case "reqpatch":
            // TODO: dummy data
            if (this.wml) this.wml.postMessage("link,patch", "*")
            break
          case "setpatch":
            // TODO: NOP
            break
          default:
            console.error("unknown link message:", command)
            break
        }
        break
      default:
        console.error("unknown message type")
    }
  }

  setLoadCallback(callback: (buf: ArrayBuffer) => void) {
    this.loadCallback = callback
  }
}
