<template>
  <div class="flex flex-col gap-4">
    <div v-if="!store.currentSession" class="flex flex-col items-center gap-6 py-8">
      <div class="bg-gray-900 rounded-xl p-6 w-full max-w-lg text-center">
        <h3 class="text-amber-300 font-bold text-xl mb-4">多人值班演练</h3>
        <p class="text-gray-400 mb-2">模拟多站点之间的莫尔斯码通信演练</p>
        <p class="text-gray-400 mb-6 text-sm">
          按求救 → 确认 → 回复流程完成连续通信任务，输入正确的莫尔斯码完成每个步骤
        </p>
        <div class="mb-6">
          <label class="text-gray-400 text-sm block mb-2">轮次数量</label>
          <div class="flex gap-2 justify-center">
            <button v-for="n in [1, 2, 3, 5]" :key="n" @click="rounds = n"
              class="px-4 py-2 rounded text-sm font-medium"
              :class="rounds === n ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'">
              {{ n }} 轮
            </button>
          </div>
        </div>
        <button @click="startDrill" class="bg-amber-500 text-black px-8 py-3 rounded-lg text-lg font-bold hover:bg-amber-400">
          开始演练
        </button>
      </div>

      <div v-if="store.sessions.length > 0" class="bg-gray-900 rounded-xl p-6 w-full max-w-lg">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-amber-300 font-bold">历史记录</h3>
          <button @click="store.clearHistory()" class="text-red-400 text-sm hover:underline">清除</button>
        </div>
        <div class="max-h-48 overflow-y-auto">
          <div v-for="s in store.sessions.slice(0, 10)" :key="s.id"
            class="flex justify-between items-center bg-gray-800 rounded p-3 mb-2 text-sm">
            <span class="text-gray-300">{{ s.totalCorrect }}/{{ s.totalTasks }} 正确</span>
            <span class="font-mono"
              :class="s.totalCorrect / s.totalTasks >= 0.8 ? 'text-green-400' : s.totalCorrect / s.totalTasks >= 0.5 ? 'text-amber-400' : 'text-red-400'">
              {{ Math.round(s.totalCorrect / s.totalTasks * 100) }}%
            </span>
            <span class="text-gray-500 text-xs">{{ formatTime(s.startTime) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col gap-4">
      <div class="bg-gray-900 rounded-xl p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-amber-300 font-bold">演练进度</h3>
          <button @click="store.resetDrill()" class="text-red-400 text-sm hover:underline">放弃演练</button>
        </div>
        <div class="w-full bg-gray-800 rounded-full h-4 mb-2">
          <div class="bg-amber-500 h-4 rounded-full transition-all duration-300"
            :style="{ width: store.progress.percent + '%' }" />
        </div>
        <div class="text-center text-gray-400 text-sm">
          {{ store.progress.done }} / {{ store.progress.total }} 已完成 ({{ store.progress.percent }}%)
        </div>
      </div>

      <div v-if="store.currentSession!.completed" class="bg-gray-900 rounded-xl p-6 text-center">
        <h3 class="text-green-400 font-bold text-2xl mb-4">演练完成</h3>
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-gray-800 rounded p-3">
            <div class="text-3xl font-bold text-green-400">{{ store.currentSession!.totalCorrect }}</div>
            <div class="text-xs text-gray-400">正确</div>
          </div>
          <div class="bg-gray-800 rounded p-3">
            <div class="text-3xl font-bold text-red-400">{{ store.currentSession!.totalTasks - store.currentSession!.totalCorrect }}</div>
            <div class="text-xs text-gray-400">错误/跳过</div>
          </div>
          <div class="bg-gray-800 rounded p-3">
            <div class="text-3xl font-bold text-amber-400">
              {{ Math.round(store.currentSession!.totalCorrect / store.currentSession!.totalTasks * 100) }}%
            </div>
            <div class="text-xs text-gray-400">正确率</div>
          </div>
        </div>
        <button @click="store.resetDrill()" class="bg-amber-500 text-black px-6 py-2 rounded-lg font-bold hover:bg-amber-400">
          再来一次
        </button>
      </div>

      <div v-else-if="store.currentTask" class="flex flex-col gap-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-gray-900 rounded-xl p-4 text-center">
            <div class="text-gray-400 text-sm mb-1">发送方</div>
            <div class="text-2xl font-bold text-cyan-400">{{ store.ROLE_LABELS[store.currentTask.fromRole] }}</div>
          </div>
          <div class="bg-gray-900 rounded-xl p-4 text-center flex flex-col items-center justify-center">
            <div class="text-gray-400 text-sm mb-1">当前阶段</div>
            <div class="text-2xl font-bold"
              :class="{
                'text-red-400': store.currentTask.phase === 'sos',
                'text-green-400': store.currentTask.phase === 'confirm',
                'text-blue-400': store.currentTask.phase === 'reply',
              }">
              {{ store.PHASE_LABELS[store.currentTask.phase] }}
            </div>
            <div class="flex gap-1 mt-2">
              <div v-for="p in ['sos', 'confirm', 'reply'] as const" :key="p"
                class="w-3 h-3 rounded-full"
                :class="{
                  'bg-red-400': p === 'sos' && store.currentTask.phase === 'sos',
                  'bg-green-400': p === 'confirm' && store.currentTask.phase === 'confirm',
                  'bg-blue-400': p === 'reply' && store.currentTask.phase === 'reply',
                  'bg-gray-600': !(['sos','confirm','reply'].indexOf(p) <= ['sos','confirm','reply'].indexOf(store.currentTask.phase)),
                  'bg-gray-400': ['sos','confirm','reply'].indexOf(p) < ['sos','confirm','reply'].indexOf(store.currentTask.phase),
                }" />
            </div>
          </div>
          <div class="bg-gray-900 rounded-xl p-4 text-center">
            <div class="text-gray-400 text-sm mb-1">接收方</div>
            <div class="text-2xl font-bold text-amber-400">{{ store.ROLE_LABELS[store.currentTask.toRole] }}</div>
          </div>
        </div>

        <div class="bg-gray-900 rounded-xl p-4">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-amber-300 font-bold">通信任务</h3>
            <span class="text-gray-400 text-sm">
              第 {{ store.currentSession!.currentTaskIndex + 1 }} / {{ store.currentSession!.totalTasks }} 步
            </span>
          </div>
          <div class="bg-gray-800 rounded p-4 mb-3">
            <div class="text-gray-400 text-sm mb-1">需要发送的文本</div>
            <div class="text-3xl font-bold text-white font-mono text-center tracking-widest">
              {{ store.currentTask.expectedText }}
            </div>
          </div>
          <div class="flex gap-2 mb-4">
            <button @click="store.playMorse(store.currentTask!.expectedMorse)" :disabled="store.isPlaying"
              class="flex-1 bg-green-600 px-4 py-2 rounded hover:bg-green-500 disabled:opacity-50 font-medium">
              {{ store.isPlaying ? '播放中...' : '播放标准信号' }}
            </button>
            <button @click="showHint = !showHint"
              class="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 text-gray-300">
              {{ showHint ? '隐藏提示' : '显示提示' }}
            </button>
          </div>
          <div v-if="showHint" class="bg-gray-800 rounded p-3 mb-4 font-mono text-green-400 text-center text-lg">
            {{ store.currentTask.expectedMorse }}
          </div>
          <div class="flex gap-2">
            <input v-model="store.userInput" @keyup.enter="store.submitTask()"
              class="flex-1 bg-gray-800 rounded px-4 py-3 text-white font-mono text-lg"
              placeholder="输入莫尔斯码（. 和 -）" />
            <button @click="store.submitTask()"
              class="bg-amber-500 text-black px-6 py-3 rounded font-bold hover:bg-amber-400">
              提交
            </button>
            <button @click="store.skipTask()"
              class="bg-gray-700 text-gray-300 px-4 py-3 rounded hover:bg-gray-600 text-sm">
              跳过
            </button>
          </div>
        </div>

        <div class="bg-gray-900 rounded-xl p-4">
          <h3 class="text-amber-300 font-bold mb-3">通信记录</h3>
          <div class="max-h-48 overflow-y-auto">
            <div v-for="task in store.currentSession!.tasks.filter(t => t.completed)" :key="task.id"
              class="flex items-center gap-3 bg-gray-800 rounded p-2 mb-1 text-sm"
              :class="task.correct ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'">
              <span class="text-cyan-400 w-10 text-center">{{ store.ROLE_LABELS[task.fromRole] }}</span>
              <span class="text-gray-500">→</span>
              <span class="text-amber-400 w-10 text-center">{{ store.ROLE_LABELS[task.toRole] }}</span>
              <span class="font-mono text-white flex-1">{{ task.expectedText }}</span>
              <span :class="task.correct ? 'text-green-400' : 'text-red-400'">
                {{ task.correct ? '✓' : '✗' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDrillStore } from '../store/drill'

const store = useDrillStore()
const rounds = ref(3)
const showHint = ref(false)

function startDrill() {
  store.generateDrill({
    roles: ['station_a', 'station_b', 'station_c'],
    rounds: rounds.value,
    messages: {
      sos: ['SOS', 'HELP', 'MAYDAY', 'EMERGENCY', 'DISTRESS'],
      confirm: ['ROGER', 'COPY', 'RECEIVED', 'ACKNOWLEDGE', 'WILCO'],
      reply: ['ENROUTE', 'STANDBY', 'ONMYWAY', 'WAIT', 'COMING'],
    },
  })
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>
