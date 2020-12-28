import { NoteInfo } from "../parser/SoundFont"

export interface InstrumentState {
  channel: number
  key: number
  volume: number
  panpot: number
  velocity: number
  pitchBend: number
  pitchBendSensitivity: number
  expression: number
  mute: boolean
  releaseTime: number
  cutOffFrequency: number
  harmonicContent: number
}

const createNoteBufferNode = (ctx: AudioContext, noteInfo: NoteInfo) => {
  const bufferSource = ctx.createBufferSource()

  const sample = noteInfo.sample.subarray(
    0,
    noteInfo.sample.length + noteInfo.end
  )

  const audioBuffer = ctx.createBuffer(1, sample.length, noteInfo.sampleRate)

  const channelData = audioBuffer.getChannelData(0)
  channelData.set(sample)
  bufferSource.buffer = audioBuffer
  bufferSource.loop = noteInfo.sampleModes !== 0
  bufferSource.loopStart = noteInfo.loopStart / noteInfo.sampleRate
  bufferSource.loopEnd = noteInfo.loopEnd / noteInfo.sampleRate

  return bufferSource
}

const amountToFreq = (val: number) => Math.pow(2, (val - 6900) / 1200) * 440

export default class SynthesizerNote {
  private readonly ctx: AudioContext

  private readonly bufferSource: AudioBufferSourceNode
  private readonly modulator: BiquadFilterNode
  private readonly panner: PannerNode
  private readonly expressionGain: GainNode
  private readonly gainOutput: GainNode
  private readonly destination: AudioNode

  private readonly noteInfo: NoteInfo
  private readonly instrument: InstrumentState
  private readonly playbackRate: number

  // state
  private expression: number
  private startTime: number
  private computedPlaybackRate: number

  get channel() {
    return this.instrument.channel
  }
  get key() {
    return this.instrument.key
  }

  constructor(
    ctx: AudioContext,
    destination: AudioNode,
    noteInfo: NoteInfo,
    instrument: InstrumentState
  ) {
    this.ctx = ctx
    this.destination = destination
    this.noteInfo = noteInfo
    this.playbackRate = noteInfo.playbackRate(instrument.key)
    this.instrument = instrument
    this.expression = instrument.expression
    this.startTime = ctx.currentTime
    this.computedPlaybackRate = this.playbackRate

    this.bufferSource = createNoteBufferNode(ctx, noteInfo)
    this.gainOutput = ctx.createGain()
    this.panner = ctx.createPanner()
    this.modulator = ctx.createBiquadFilter()
    this.expressionGain = ctx.createGain()

    this.modulator.type = "lowpass"
    this.panner.panningModel = "equalpower"

    this.bufferSource.connect(this.modulator)
    this.modulator.connect(this.panner)
    this.panner.connect(this.expressionGain)
    this.expressionGain.connect(this.gainOutput)
    this.bufferSource.onended = () => this.disconnect()

    this.updatePitchBend(this.instrument.pitchBend)

    this.expressionGain.gain.setTargetAtTime(
      this.expression / 127,
      this.ctx.currentTime,
      0.015
    )

    const baseFreq = amountToFreq(noteInfo.initialFilterFc)
    this.modulator.frequency.setTargetAtTime(
      baseFreq,
      this.ctx.currentTime,
      0.015
    )
  }

  noteOn() {
    const { noteInfo } = this

    const now = this.ctx.currentTime

    // panpot
    // TODO: ドラムパートのPanが変化した場合、その計算をしなければならない
    // http://cpansearch.perl.org/src/PJB/MIDI-SoundFont-1.08/doc/sfspec21.html#8.4.6
    const pan = noteInfo.pan ? noteInfo.pan / 120 : this.instrument.panpot
    this.panner.positionX.setValueAtTime(Math.sin((pan * Math.PI) / 2), now)
    this.panner.positionZ.setValueAtTime(Math.cos((pan * Math.PI) / 2), now)

    //---------------------------------------------------------------------------
    // Delay, Attack, Hold, Decay, Sustain
    //---------------------------------------------------------------------------
    let attackVolume =
      this.instrument.volume *
      (this.instrument.velocity / 127) *
      (1 - noteInfo.initialAttenuation / 1000)
    if (attackVolume < 0) {
      attackVolume = 0
    }

    const volDelay = now + noteInfo.volDelay
    const volAttack = volDelay + noteInfo.volAttack
    const volHold = volAttack + noteInfo.volHold
    const volDecay = volHold + noteInfo.volDecay
    const modDelay = now + noteInfo.modDelay
    const modAttack = volDelay + noteInfo.modAttack
    const modHold = modAttack + noteInfo.modHold
    const modDecay = modHold + noteInfo.modDecay

    const startTime = noteInfo.start / noteInfo.sampleRate

    // volume envelope
    this.gainOutput.gain
      .setValueAtTime(0, now)
      .setValueAtTime(0, volDelay)
      .setTargetAtTime(attackVolume, volDelay, noteInfo.volAttack)
      .setValueAtTime(attackVolume, volHold)
      .linearRampToValueAtTime(
        attackVolume * (1 - noteInfo.volSustain),
        volDecay
      )

    // modulation envelope
    const baseFreq = amountToFreq(noteInfo.initialFilterFc)
    const peekFreq = amountToFreq(
      noteInfo.initialFilterFc + noteInfo.modEnvToFilterFc
    )
    const sustainFreq =
      baseFreq + (peekFreq - baseFreq) * (1 - noteInfo.modSustain)

    this.modulator.Q.setValueAtTime(
      Math.pow(10, noteInfo.initialFilterQ / 200),
      now
    )
    this.modulator.frequency
      .setValueAtTime(baseFreq, now)
      .setValueAtTime(baseFreq, modDelay)
      .setTargetAtTime(peekFreq, modDelay, noteInfo.modAttack++) // For FireFox fix
      .setValueAtTime(peekFreq, modHold)
      .linearRampToValueAtTime(sustainFreq, modDecay)

    if (!noteInfo.mute) {
      this.gainOutput.connect(this.destination)
    } else {
      this.gainOutput.disconnect()
    }

    // fire
    this.bufferSource.start(0, startTime)
  }

  noteOff() {
    const { noteInfo, bufferSource } = this
    const output = this.gainOutput
    const now = this.ctx.currentTime
    const release = noteInfo.releaseTime - 64

    //---------------------------------------------------------------------------
    // volume release time
    //---------------------------------------------------------------------------
    const volEndTimeTmp = noteInfo.volRelease * output.gain.value
    const volEndTime =
      now + volEndTimeTmp * (1 + release / (release < 0 ? 64 : 63))

    //---------------------------------------------------------------------------
    // modulation release time
    //---------------------------------------------------------------------------
    const modulator = this.modulator
    const baseFreq = amountToFreq(noteInfo.initialFilterFc)
    const peekFreq = amountToFreq(
      noteInfo.initialFilterFc + noteInfo.modEnvToFilterFc
    )
    const modEndTime =
      now +
      noteInfo.modRelease *
        (baseFreq === peekFreq
          ? 1
          : (modulator.frequency.value - baseFreq) / (peekFreq - baseFreq))

    //---------------------------------------------------------------------------
    // Release
    //---------------------------------------------------------------------------
    switch (noteInfo.sampleModes) {
      case 0:
        break
      case 1:
        output.gain.cancelScheduledValues(0)
        output.gain.setValueAtTime(output.gain.value, now)
        output.gain.linearRampToValueAtTime(0, volEndTime)

        modulator.frequency.cancelScheduledValues(0)
        modulator.frequency.setValueAtTime(modulator.frequency.value, now)
        modulator.frequency.linearRampToValueAtTime(baseFreq, modEndTime)

        bufferSource.playbackRate.cancelScheduledValues(0)
        bufferSource.playbackRate.setValueAtTime(
          bufferSource.playbackRate.value,
          now
        )
        bufferSource.playbackRate.linearRampToValueAtTime(
          this.computedPlaybackRate,
          modEndTime
        )

        bufferSource.stop(volEndTime)
        break
      case 2:
        console.log("detect unused sampleModes")
        break
      case 3:
        bufferSource.loop = false
        break
    }
  }

  disconnect() {
    this.gainOutput.disconnect(0)
  }

  schedulePlaybackRate() {
    const { noteInfo } = this
    const playbackRate = this.bufferSource.playbackRate
    const computed = this.computedPlaybackRate
    const start = this.startTime
    const modAttack = start + noteInfo.modAttack
    const modDecay = modAttack + noteInfo.modDecay
    const peekPitch =
      computed *
      Math.pow(
        Math.pow(2, 1 / 12),
        noteInfo.modEnvToPitch * noteInfo.scaleTuning
      )

    playbackRate.cancelScheduledValues(0)
    playbackRate.setValueAtTime(computed, start)
    playbackRate.linearRampToValueAtTime(peekPitch, modAttack)
    playbackRate.linearRampToValueAtTime(
      computed + (peekPitch - computed) * (1 - noteInfo.modSustain),
      modDecay
    )
  }

  updateExpression(expression: number) {
    this.expressionGain.gain.value = (this.expression = expression) / 127
  }

  updatePitchBend(pitchBend: number) {
    this.computedPlaybackRate =
      this.playbackRate *
      Math.pow(
        Math.pow(2, 1 / 12),
        this.instrument.pitchBendSensitivity *
          (pitchBend / (pitchBend < 0 ? 8192 : 8191)) *
          this.noteInfo.scaleTuning
      )
    this.schedulePlaybackRate()
  }
}
