import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// The net under the daily reminders, each of which is scheduled for its own
// minute (reminders.ts): any whose turn was lost
crons.interval('reminders', { hours: 1 }, internal.reminders.sweep)

export default crons
