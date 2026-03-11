export interface Habit {
  id: number
  name: string
  goal: number
  created_at: string
  completed_days: number
  streak: number
  color: string | null
}

export interface Completion {
  id: number
  habit_id: number
  date: string
}
