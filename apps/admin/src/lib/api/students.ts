import { supabase } from '../supabase'

export interface StudentRecordSession {
  id: string
  label: string
  date: string
  status: string
  checked_in_at: string | null
  method: string | null
}

export interface StudentRecordCourse {
  id: string
  name: string
  code: string
  sessions: StudentRecordSession[]
  attendance: {
    total: number
    present: number
    percent: number
  }
  grade: {
    ca_total: number | null
    exam: number | null
    total: number | null
    grade: string | null
  } | null
}

export interface StudentRecord {
  student: {
    full_name: string
    system_id: string
    external_id: string | null
  }
  account: {
    name: string
  }
  courses: StudentRecordCourse[]
}

export async function getStudentRecord(
  systemId: string
): Promise<{ data: StudentRecord | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_student_record', {
    p_system_id: systemId,
  })

  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: 'Student not found' }

  return { data: data as StudentRecord, error: null }
}