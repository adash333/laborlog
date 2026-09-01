import Dexie, { type EntityTable } from 'dexie'
import type { Profile, WorkDay, AuditEntry, Incident, MonthlyInput } from './types'

// 全データはブラウザ内 IndexedDB のみに保存する(ローカルファースト方針)
export const db = new Dexie('mamolog') as Dexie & {
  profile: EntityTable<Profile, 'id'>
  workdays: EntityTable<WorkDay, 'date'>
  auditLog: EntityTable<AuditEntry, 'id'>
  incidents: EntityTable<Incident, 'id'>
  monthlyInputs: EntityTable<MonthlyInput, 'month'>
}

db.version(1).stores({
  profile: 'id',
  workdays: 'date',
  auditLog: '++id, date',
})

db.version(2).stores({
  profile: 'id',
  workdays: 'date',
  auditLog: '++id, date',
  incidents: '++id, date',
  monthlyInputs: 'month',
})

/** 勤務日を保存し、修正履歴を残す */
export async function saveWorkDay(day: WorkDay): Promise<void> {
  const toSave = { ...day, updatedAt: new Date().toISOString() }
  await db.transaction('rw', db.workdays, db.auditLog, async () => {
    await db.workdays.put(toSave)
    await db.auditLog.add({
      date: toSave.date,
      at: toSave.updatedAt,
      snapshot: JSON.stringify(toSave),
    })
  })
}

export interface BackupData {
  app: 'mamolog'
  exportedAt: string
  profile: Profile[]
  workdays: WorkDay[]
  auditLog: AuditEntry[]
  incidents?: Incident[]
  monthlyInputs?: MonthlyInput[]
}

const ALL_TABLES = [
  () => db.profile,
  () => db.workdays,
  () => db.auditLog,
  () => db.incidents,
  () => db.monthlyInputs,
]

export async function exportAll(): Promise<BackupData> {
  return {
    app: 'mamolog',
    exportedAt: new Date().toISOString(),
    profile: await db.profile.toArray(),
    workdays: await db.workdays.toArray(),
    auditLog: await db.auditLog.toArray(),
    incidents: await db.incidents.toArray(),
    monthlyInputs: await db.monthlyInputs.toArray(),
  }
}

export async function importAll(data: BackupData): Promise<void> {
  if (data.app !== 'mamolog') throw new Error('まもログのバックアップファイルではありません')
  const tables = ALL_TABLES.map((t) => t())
  await db.transaction('rw', tables, async () => {
    for (const table of tables) await table.clear()
    await db.profile.bulkAdd(data.profile)
    await db.workdays.bulkAdd(data.workdays)
    await db.auditLog.bulkAdd(data.auditLog.map(({ id: _id, ...rest }) => rest))
    // 旧バージョンのバックアップにはないテーブルは空として扱う
    await db.incidents.bulkAdd((data.incidents ?? []).map(({ id: _id, ...rest }) => rest))
    await db.monthlyInputs.bulkAdd(data.monthlyInputs ?? [])
  })
}

export async function deleteAll(): Promise<void> {
  const tables = ALL_TABLES.map((t) => t())
  await db.transaction('rw', tables, async () => {
    for (const table of tables) await table.clear()
  })
}
