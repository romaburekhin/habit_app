export interface Habit {
  id: number
  user_id: string
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

export interface Profile {
  user_id: string
  email: string
  name: string | null
}

export interface ChallengeHabit {
  id: number
  name: string
  color: string | null
  goal: number
  completed_days: number
}

export interface ChallengeView {
  id: number
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  role: 'inviter' | 'invitee'
  my_habit: ChallengeHabit | null
  their_habit: ChallengeHabit | null
  their_email: string
  their_name: string | null
  description: string | null
  period_end: string | null
  start_date: string | null
  update_proposal: { name: string; description: string; periodEnd: string; startDate: string | null; days: number } | null
  i_proposed_update: boolean
}
