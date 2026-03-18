const models = require('../models');

const DEFAULT_AGENT_SHARE_PERCENT = 70;

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

(async () => {
  const { DeliveryTask, PlatformConfig, sequelize } = models;

  try {
    const config = await PlatformConfig.findOne({ where: { key: 'delivery_fee_agent_share' } });
    const configuredShare = toNumber(config?.value, DEFAULT_AGENT_SHARE_PERCENT);
    const shareToApply = configuredShare > 0 ? configuredShare : DEFAULT_AGENT_SHARE_PERCENT;

    const tasks = await DeliveryTask.findAll();
    let updatedShareCount = 0;
    let updatedEarningsCount = 0;

    await sequelize.transaction(async (t) => {
      for (const task of tasks) {
        const currentShare = toNumber(task.agentShare, 0);
        const baseFee = toNumber(task.deliveryFee, 0);
        const currentEarnings = toNumber(task.agentEarnings, -1);

        const updates = {};

        if (!(currentShare > 0)) {
          updates.agentShare = shareToApply;
          updatedShareCount += 1;
        }

        const effectiveShare = updates.agentShare || currentShare;
        if (baseFee > 0 && !(currentEarnings >= 0)) {
          updates.agentEarnings = Number((baseFee * (effectiveShare / 100)).toFixed(2));
          updatedEarningsCount += 1;
        }

        if (Object.keys(updates).length > 0) {
          await task.update(updates, { transaction: t });
        }
      }
    });

    console.log('Backfill completed.');
    console.log(`Applied agentShare to ${updatedShareCount} task(s).`);
    console.log(`Applied agentEarnings to ${updatedEarningsCount} task(s).`);
    console.log(`Share used: ${shareToApply}%`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    try {
      await models.sequelize.close();
    } catch (_) {
      // noop
    }
    process.exit(1);
  }
})();
