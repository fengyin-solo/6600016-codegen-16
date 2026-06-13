import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { textToMorse } from '../utils/morse-code'
import type { DrillPhase, DrillRole, DrillTask, DrillSession, DrillScenarioConfig } from '../types'

const ROLE_LABELS: Record<DrillRole, string> = {
  station_a: 'A台',
  station_b: 'B台',
  station_c: 'C台',
}

const PHASE_LABELS: Record<DrillPhase, string> = {
  sos: '求救',
  confirm: '确认',
  reply: '回复',
}

const DEFAULT_CONFIG: DrillScenarioConfig = {
  roles: ['station_a', 'station_b', 'station_c'],
  rounds: 3,
  messages: {
    sos: ['SOS', 'HELP', 'MAYDAY', 'EMERGENCY', 'DISTRESS'],
    confirm: ['ROGER', 'COPY', 'RECEIVED', 'ACKNOWLEDGE', 'WILCO'],
    reply: ['ENROUTE', 'STANDBY', 'ONMYWAY', 'WAIT', 'COMING'],
  },
}

export const useDrillStore = defineStore('drill', () => {
  const sessions = ref<DrillSession[]>([])
  const currentSession = ref<DrillSession | null>(null)
  const userInput = ref('')
  const isPlaying = ref(false)

  let audioCtx: AudioContext | null = null

  const currentTask = computed(() => {
    if (!currentSession.value) return null
    const s = currentSession.value
    if (s.currentTaskIndex >= s.tasks.length) return null
    return s.tasks[s.currentTaskIndex]
  })

  const progress = computed(() => {
    if (!currentSession.value) return { done: 0, total: 0, percent: 0 }
    const s = currentSession.value
    const done = s.tasks.filter(t => t.completed).length
    return { done, total: s.totalTasks, percent: Math.round(done / s.totalTasks * 100) }
  })

  function getAudioCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext()
    return audioCtx
  }

  function playTone(duration: number, frequency = 700, volume = 0.6): Promise<void> {
    return new Promise(resolve => {
      const ctx = getAudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.value = volume
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      setTimeout(() => { osc.stop(); resolve() }, duration)
    })
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  async function playMorse(morse: string, wpm = 15) {
    isPlaying.value = true
    const dd = 1200 / wpm
    for (const token of morse.split(' ')) {
      if (token === '/') { await sleep(dd * 7); continue }
      for (const sym of token) {
        await playTone(sym === '.' ? dd : dd * 3)
        await sleep(dd)
      }
      await sleep(dd * 2)
    }
    isPlaying.value = false
  }

  function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  function generateDrill(config: DrillScenarioConfig = DEFAULT_CONFIG) {
    const tasks: DrillTask[] = []
    let taskId = Date.now()
    const { roles, rounds, messages } = config

    for (let round = 0; round < rounds; round++) {
      const callerIdx = round % roles.length
      const responderIdx = (callerIdx + 1) % roles.length
      const confirmerIdx = (callerIdx + 2) % roles.length

      const caller = roles[callerIdx]
      const responder = roles[responderIdx]
      const confirmer = roles[confirmerIdx]

      const sosText = pickRandom(messages.sos)
      const confirmText = pickRandom(messages.confirm)
      const replyText = pickRandom(messages.reply)

      tasks.push({
        id: taskId++,
        phase: 'sos',
        fromRole: caller,
        toRole: responder,
        expectedText: sosText,
        expectedMorse: textToMorse(sosText),
        userInput: '',
        completed: false,
        correct: false,
        timestamp: 0,
      })

      tasks.push({
        id: taskId++,
        phase: 'confirm',
        fromRole: responder,
        toRole: caller,
        expectedText: confirmText,
        expectedMorse: textToMorse(confirmText),
        userInput: '',
        completed: false,
        correct: false,
        timestamp: 0,
      })

      tasks.push({
        id: taskId++,
        phase: 'reply',
        fromRole: confirmer,
        toRole: caller,
        expectedText: replyText,
        expectedMorse: textToMorse(replyText),
        userInput: '',
        completed: false,
        correct: false,
        timestamp: 0,
      })
    }

    const session: DrillSession = {
      id: Date.now(),
      tasks,
      currentTaskIndex: 0,
      startTime: Date.now(),
      endTime: null,
      completed: false,
      totalCorrect: 0,
      totalTasks: tasks.length,
    }

    currentSession.value = session
    userInput.value = ''
  }

  function submitTask() {
    if (!currentTask.value) return
    const task = currentTask.value
    const session = currentSession.value!

    const userMorse = userInput.value.trim()
    const correct = userMorse === task.expectedMorse

    task.userInput = userMorse
    task.correct = correct
    task.completed = true
    task.timestamp = Date.now()

    if (correct) session.totalCorrect++

    session.currentTaskIndex++

    if (session.currentTaskIndex >= session.tasks.length) {
      session.completed = true
      session.endTime = Date.now()
      sessions.value.unshift(session)
    }

    userInput.value = ''
  }

  function skipTask() {
    if (!currentTask.value) return
    const task = currentTask.value
    const session = currentSession.value!

    task.userInput = ''
    task.correct = false
    task.completed = true
    task.timestamp = Date.now()

    session.currentTaskIndex++

    if (session.currentTaskIndex >= session.tasks.length) {
      session.completed = true
      session.endTime = Date.now()
      sessions.value.unshift(session)
    }

    userInput.value = ''
  }

  function resetDrill() {
    currentSession.value = null
    userInput.value = ''
  }

  function clearHistory() {
    sessions.value = []
  }

  return {
    sessions,
    currentSession,
    currentTask,
    userInput,
    isPlaying,
    progress,
    ROLE_LABELS,
    PHASE_LABELS,
    generateDrill,
    submitTask,
    skipTask,
    resetDrill,
    clearHistory,
    playMorse,
  }
})
