export interface MorseSymbol {
  char: string
  code: string
}

export type TrainMode = 'charToCode' | 'codeToChar' | 'audioToChar' | 'typingToCode'

export interface HistoryEntry {
  id: number
  input: string
  output: string
  correct: boolean
  timestamp: number
}

export type DrillPhase = 'sos' | 'confirm' | 'reply'

export type DrillRole = 'station_a' | 'station_b' | 'station_c'

export interface DrillTask {
  id: number
  phase: DrillPhase
  fromRole: DrillRole
  toRole: DrillRole
  expectedText: string
  expectedMorse: string
  userInput: string
  completed: boolean
  correct: boolean
  timestamp: number
}

export interface DrillSession {
  id: number
  tasks: DrillTask[]
  currentTaskIndex: number
  startTime: number
  endTime: number | null
  completed: boolean
  totalCorrect: number
  totalTasks: number
}

export interface DrillScenarioConfig {
  roles: DrillRole[]
  rounds: number
  messages: Record<DrillPhase, string[]>
}
