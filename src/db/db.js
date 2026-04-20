import Dexie from 'dexie'

class SystemsDatabase extends Dexie {
  constructor() {
    super('systemsapp')

    this.version(1).stores({
      exercises: '++id,wgerId,name,category,updatedAt',
      workouts: '++id,name,updatedAt',
      workoutEntries: '++id,workoutId,exerciseId,createdAt',
      sessions: '++id,startedAt,endedAt,updatedAt',
      sets: '++id,sessionId,exerciseId,createdAt',
      personalRecords: '++id,exerciseId,value,unit,achievedAt',
      settings: '&key,updatedAt',
      syncMeta: '&key,updatedAt',
    })

    this.version(2).stores({
      exercises: '++id,wgerId,name,category,updatedAt',
      workouts: '++id,name,updatedAt',
      workoutEntries: '++id,workoutId,exerciseId,createdAt',
      sessions: '++id,startedAt,endedAt,updatedAt',
      sets: '++id,sessionId,exerciseId,createdAt',
      personalRecords: '++id,exerciseId,value,unit,achievedAt',
      settings: '&key,updatedAt',
      syncMeta: '&key,updatedAt',
      workoutTemplateItems: '++id,workoutType,exerciseId,sortOrder,updatedAt',
      exerciseCompletions: '++id,&completionKey,date,exerciseId,done,updatedAt',
      exercisePRs: 'exerciseId,valueStr,updatedAt',
    })
  }
}

export const db = new SystemsDatabase()
