'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Habit, Completion } from '@/lib/types'
import HabitYearGrid from '@/components/HabitYearGrid'
import { COLOR_VARIANTS } from '@/lib/colors'

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDates(): string[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 6 + i)
    return toLocalDate(d)
  })
}

interface CardProps {
  habit: Habit
  completions: Completion[]
  sharedWith?: string
  weekDates: string[]
  onEdit: (habit: Habit) => void
  onToggleDay: (habit_id: number, date: string) => void
}

function SortableHabitCard({ habit, completions, sharedWith, weekDates, onEdit, onToggleDay }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: COLOR_VARIANTS[habit.color ?? '']?.card ?? (habit.color ?? '#F3F4F6') + '40',
  }

  const count = habit.completed_days
  const done = count >= habit.goal
  const pct = Math.round((count / habit.goal) * 100)

  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(habit)}
      className="rounded-2xl border border-transparent px-3 py-[18px] cursor-pointer transition-all hover:opacity-90"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col min-w-0 flex-1">
          <span
            style={habit.color ? { color: COLOR_VARIANTS[habit.color]?.filled ?? habit.color, filter: COLOR_VARIANTS[habit.color] ? undefined : 'brightness(0.7)' } : undefined}
            className={`text-[14.7px] font-bold tracking-tight truncate ${!habit.color && 'text-gray-700'}`}
          >
            {habit.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {habit.streak > 0 && (
            <span
              style={pct >= 100 && habit.color ? { color: habit.color, filter: 'brightness(0.85)' } : undefined}
              className={`text-[11px] ${pct >= 100 ? (habit.color ? '' : 'text-emerald-500 font-medium') : 'text-gray-400'}`}
            >
              {habit.streak} days in a row
            </span>
          )}
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
            className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none focus:outline-none"
            aria-label="Drag to reorder"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Week day circles */}
      <div className="flex justify-between mb-2" onClick={e => e.stopPropagation()}>
        {weekDates.map(date => {
          const filled = completions.some(c => c.habit_id === habit.id && c.date === date)
          return (
            <div key={date} className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">
                {DAY_ABBREVS[new Date(date + 'T00:00:00').getDay()]}
              </span>
              <button
                onClick={() => onToggleDay(habit.id, date)}
                style={{ backgroundColor: filled ? (COLOR_VARIANTS[habit.color ?? '']?.filled ?? habit.color ?? '#9CA3AF') : (COLOR_VARIANTS[habit.color ?? '']?.unfilled ?? (habit.color ?? '#9CA3AF') + '61') }}
                className={`w-[38px] h-[38px] min-[375px]:w-[41.8px] min-[375px]:h-[41.8px] sm:w-[3.135rem] sm:h-[3.135rem] rounded-full text-[12px] min-[375px]:text-[14.4px] sm:text-[16.8px] font-semibold text-white transition-opacity hover:opacity-80 ${filled ? 'shadow-sm' : ''}`}
              >
                {date.slice(8)}
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        {sharedWith ? (
          <span className="text-[10px] text-gray-400 bg-black/4 rounded-full px-1.5 py-0.5 capitalize">
            shared with {sharedWith.split(' ')[0]}
          </span>
        ) : <div />}
        <span
          style={pct >= 100 && habit.color ? { color: habit.color, filter: 'brightness(0.85)' } : undefined}
          className={`text-[11px] ${pct >= 100 ? (habit.color ? '' : 'text-emerald-500 font-medium') : 'text-gray-400'}`}
        >
          {count} / {habit.goal} days ({pct}%){pct >= 100 ? ' 🎉' : ''}
        </span>
      </div>
    </li>
  )
}

interface Props {
  habits: Habit[]
  completions: Completion[]
  yearCompletions: Completion[]
  loading: boolean
  error: string | null
  viewMode: 'cards' | 'heatmap'
  sharedHabitIds?: Map<number, string>
  onEdit: (habit: Habit) => void
  onToggleDay: (habit_id: number, date: string) => void
  onReorder?: (habits: Habit[]) => void
}

export default function HabitList({ habits, completions, yearCompletions, loading, error, viewMode, sharedHabitIds, onEdit, onToggleDay, onReorder }: Props) {
  if (loading) return <p className="text-sm text-gray-500">Loading...</p>
  if (error) return <p className="text-sm text-gray-500">{error}</p>
  if (!habits.length) return null

  if (viewMode === 'heatmap') {
    return (
      <ul className="space-y-3">
        {habits.map(habit => {
          const completedDates = new Set(
            yearCompletions.filter(c => c.habit_id === habit.id).map(c => c.date)
          )
          return (
            <HabitYearGrid
              key={habit.id}
              habit={habit}
              completedDates={completedDates}
              onEdit={onEdit}
            />
          )
        })}
      </ul>
    )
  }

  return <SortableList habits={habits} completions={completions} sharedHabitIds={sharedHabitIds} onEdit={onEdit} onToggleDay={onToggleDay} onReorder={onReorder} />
}

function SortableList({ habits, completions, sharedHabitIds, onEdit, onToggleDay, onReorder }: Omit<Props, 'loading' | 'error' | 'viewMode' | 'yearCompletions'>) {
  const [items, setItems] = useState(habits.map(h => h.id))
  const weekDates = getWeekDates()

  // Sync when habits prop changes (e.g. after refresh)
  if (items.length !== habits.length || items.some((id, i) => id !== habits[i]?.id)) {
    setItems(habits.map(h => h.id))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.indexOf(active.id as number)
    const newIndex = items.indexOf(over.id as number)
    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)

    const reordered = newItems.map(id => habits.find(h => h.id === id)!).filter(Boolean)
    onReorder?.(reordered)
  }

  const habitMap = new Map(habits.map(h => [h.id, h]))

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3">
          {items.map(id => {
            const habit = habitMap.get(id)
            if (!habit) return null
            return (
              <SortableHabitCard
                key={habit.id}
                habit={habit}
                completions={completions}
                sharedWith={sharedHabitIds?.get(habit.id)}
                weekDates={weekDates}
                onEdit={onEdit}
                onToggleDay={onToggleDay}
              />
            )
          })}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
