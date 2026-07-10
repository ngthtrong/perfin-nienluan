const { subscriptionFingerprint, subscriptionScanMessage } = require('../messages');
const { resolveTargetUserIds } = require('../userScope');
const { persistInternalMessage } = require('../internalMessage');
const { decorateProactiveMessage } = require('../persona');

function createSubscriptionScanHandler(deps = {}) {
  const analytics = deps.analytics || require('../../analytics');
  const persist = deps.persistInternalMessage || persistInternalMessage;
  const resolveUsers = deps.resolveTargetUserIds || resolveTargetUserIds;
  const decorate = deps.decorateMessage || decorateProactiveMessage;

  return async function subscriptionScan(job = {}) {
    const userIds = await resolveUsers(job.data || {});
    const results = [];

    for (const userId of userIds) {
      const facts = await analytics.subscriptionFacts(userId);
      const rawContent = subscriptionScanMessage(facts);
      const content = rawContent ? await decorate(userId, rawContent, deps.personaService) : null;
      if (!content) {
        results.push({ userId, detected: 0, notificationCreated: false });
        continue;
      }
      const fingerprint = subscriptionFingerprint(facts);
      const stored = await persist({
        userId,
        content,
        type: 'subscription_scan',
        eventKey: `subscription-scan:${fingerprint}`,
        dedupeHours: 24 * 90,
        metadata: {
          fingerprint,
          subscription_count: facts.subscriptions.length,
          total_monthly: facts.totalMonthly,
          subscriptions: facts.subscriptions,
        },
      });
      results.push({
        userId,
        detected: facts.subscriptions.length,
        notificationCreated: stored.created,
        fingerprint,
      });
    }

    return { job: 'subscription-scan', users: results };
  };
}

module.exports = { createSubscriptionScanHandler };
