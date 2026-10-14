import type { AccountPreset } from '../types/db'

export interface PresetLabels {
  participant: string
  participants: string
  program: string
  programs: string
  context: string
  contexts: string
  operator: string
  operators: string
}

export interface PresetDefinition {
  value: AccountPreset
  label: string
  description: string
  labels: PresetLabels
  features: {
    gradebook: boolean
    timetable: boolean
    parentView: boolean
    checkout: boolean
  }
}

const BASE_FEATURES = {
  gradebook: false,
  timetable: false,
  parentView: false,
  checkout: false,
}

export const PRESETS: Record<AccountPreset, PresetDefinition> = {
  school: {
    value: 'school',
    label: 'School',
    description: 'Lectures, terms, students, grades.',
    labels: {
      participant: 'Student',
      participants: 'Students',
      program: 'Course',
      programs: 'Courses',
      context: 'Session',
      contexts: 'Sessions',
      operator: 'Lecturer',
      operators: 'Lecturers',
    },
    features: { ...BASE_FEATURES, gradebook: true, timetable: true, parentView: true },
  },
  symposium: {
    value: 'symposium',
    label: 'Symposium',
    description: 'Talks, tracks, attendees.',
    labels: {
      participant: 'Attendee',
      participants: 'Attendees',
      program: 'Track',
      programs: 'Tracks',
      context: 'Talk',
      contexts: 'Talks',
      operator: 'Speaker',
      operators: 'Speakers',
    },
    features: { ...BASE_FEATURES },
  },
  bootcamp: {
    value: 'bootcamp',
    label: 'Bootcamp',
    description: 'Modules, cohorts, trainees.',
    labels: {
      participant: 'Trainee',
      participants: 'Trainees',
      program: 'Cohort',
      programs: 'Cohorts',
      context: 'Module',
      contexts: 'Modules',
      operator: 'Instructor',
      operators: 'Instructors',
    },
    features: { ...BASE_FEATURES },
  },
  conference: {
    value: 'conference',
    label: 'Conference',
    description: 'Sessions, tracks, delegates.',
    labels: {
      participant: 'Delegate',
      participants: 'Delegates',
      program: 'Track',
      programs: 'Tracks',
      context: 'Session',
      contexts: 'Sessions',
      operator: 'Speaker',
      operators: 'Speakers',
    },
    features: { ...BASE_FEATURES },
  },
  hotel: {
    value: 'hotel',
    label: 'Hotel',
    description: 'Rooms, stays, guests.',
    labels: {
      participant: 'Guest',
      participants: 'Guests',
      program: 'Room',
      programs: 'Rooms',
      context: 'Stay',
      contexts: 'Stays',
      operator: 'Staff',
      operators: 'Staff',
    },
    features: { ...BASE_FEATURES, checkout: true },
  },
  event: {
    value: 'event',
    label: 'Event',
    description: 'Checkpoints, guests, entries.',
    labels: {
      participant: 'Guest',
      participants: 'Guests',
      program: 'Group',
      programs: 'Groups',
      context: 'Checkpoint',
      contexts: 'Checkpoints',
      operator: 'Staff',
      operators: 'Staff',
    },
    features: { ...BASE_FEATURES, checkout: true },
  },
  custom: {
    value: 'custom',
    label: 'Custom',
    description: 'Your own structure.',
    labels: {
      participant: 'Person',
      participants: 'People',
      program: 'Group',
      programs: 'Groups',
      context: 'Occurrence',
      contexts: 'Occurrences',
      operator: 'Operator',
      operators: 'Operators',
    },
    features: { ...BASE_FEATURES },
  },
}

export function getPreset(preset: AccountPreset | undefined | null): PresetDefinition {
  if (!preset) return PRESETS.school
  return PRESETS[preset] ?? PRESETS.school
}