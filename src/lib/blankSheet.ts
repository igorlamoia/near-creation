import type { Database, Sheet } from './domain'

export const blankSheet = (db: Database): Sheet => ({
  printerId: '',
  filaments: [{ materialId: '', weightGrams: 0 }],
  lines: [],
  printHours: 0,
  labor: 0,
  batch: null,
  channelId: db.settings.channels[0]?.id || '',
  mode: 'sale',
  margin: 30,
})
