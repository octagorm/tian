import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// The daily reminders that are due (reminders.ts)
crons.interval('reminders', { minutes: 1 }, internal.reminders.due)

export default crons
