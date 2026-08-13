// Vai trò: Là facade công bố queue, scheduler và worker cho phần còn lại của backend.
// Luồng chính: re-export interface ổn định, giữ chi tiết BullMQ trong các module con.

const { QUEUE_NAME, JOB_NAMES, SCHEDULER_IDS } = require('./constants');
const { enqueueJob, closeJobQueue } = require('./queue');
const { startJobWorker } = require('./worker');
const { getScheduleDefinitions, getWorkerOptions } = require('./schedules');

module.exports = {
  QUEUE_NAME,
  JOB_NAMES,
  SCHEDULER_IDS,
  enqueueJob,
  closeJobQueue,
  startJobWorker,
  getScheduleDefinitions,
  getWorkerOptions,
};
