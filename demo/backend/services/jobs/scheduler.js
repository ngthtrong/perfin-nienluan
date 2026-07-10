const { getScheduleDefinitions } = require('./schedules');

const SCHEDULED_JOB_OPTIONS = Object.freeze({
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
});

async function syncJobSchedulers(queue, definitions = getScheduleDefinitions()) {
  const results = [];
  for (const definition of definitions) {
    if (!definition.enabled) {
      const removed = await queue.removeJobScheduler(definition.schedulerId);
      results.push({ ...definition, action: removed ? 'removed' : 'disabled' });
      continue;
    }

    await queue.upsertJobScheduler(
      definition.schedulerId,
      { pattern: definition.pattern, tz: definition.timezone },
      {
        name: definition.name,
        data: { source: 'scheduler', schedulerId: definition.schedulerId },
        opts: SCHEDULED_JOB_OPTIONS,
      }
    );
    results.push({ ...definition, action: 'upserted' });
  }
  return results;
}

module.exports = { SCHEDULED_JOB_OPTIONS, syncJobSchedulers };
