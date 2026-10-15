// Töne und Ansagen. iOS spielt Ton nur ab, wenn er einmal bei einem Tippen freigeschaltet wurde.

type SessionType = 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record'
const session = () => (navigator as Navigator & { audioSession?: { type: SessionType } }).audioSession

let ctx: AudioContext | null = null

/** Bei jedem Tippen aufrufen (Satz abhaken, Training starten). */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state !== 'running') ctx.resume().catch(() => {})
    // Ein stiller Mini-Ton schaltet Safari den Ton für später frei
    const b = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = b
    src.connect(ctx.destination)
    src.start(0)
  } catch {
    ctx = null
  }
}

/** Dreifacher Piepton am Ende der Pause, auch im Lautlos-Modus. */
export async function beep() {
  if (!ctx) return
  const s = session()
  // „playback“ spielt auch bei Lautlos-Schalter; danach zurück auf Standard
  if (s) s.type = 'playback'
  try {
    if (ctx.state !== 'running') await ctx.resume()
  } catch {
    // ohne Freigabe kein Ton, dann bleibt die Anzeige
  }
  const t = ctx.currentTime + 0.05
  for (const [i, f] of [880, 880, 1320].entries()) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t + i * 0.3)
    g.gain.exponentialRampToValueAtTime(0.6, t + i * 0.3 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.3 + 0.25)
    o.connect(g).connect(ctx.destination)
    o.start(t + i * 0.3)
    o.stop(t + i * 0.3 + 0.27)
  }
  if (s) setTimeout(() => (s.type = 'auto'), 1500)
}

/** Liest einen Satz auf Deutsch vor (falls das Gerät eine Stimme hat). */
export function speak(text: string) {
  const synth = window.speechSynthesis
  if (!synth) return
  try {
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''))
    u.lang = 'de-DE'
    const voice = synth.getVoices().find((v) => v.lang.startsWith('de'))
    if (voice) u.voice = voice
    u.rate = 1.05
    synth.speak(u)
  } catch {
    // Vorlesen ist nur ein Extra
  }
}
