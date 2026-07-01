const { Plan, Subscription, MealOccurrence, MealSchedule, Op } = require('../../../database/models.registry');
const SubscriptionEngine = require('../services/SubscriptionEngine');
const MealSubscriptionService = require('../services/MealSubscriptionService');

class SubscriptionController {
  // 1. Create a Plan (Admin Only)
  async createPlan(req, res) {
    try {
      const plan = await Plan.create(req.body);
      return res.status(201).json({ message: 'Plan created successfully', plan });
    } catch (err) {
      console.error('❌ Error creating plan:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. Get Plans
  async getPlans(req, res) {
    try {
      const { type, all } = req.query;
      const where = {};
      if (type) where.type = type;
      if (!all) where.status = 'Published'; // Standard users only see published plans

      const plans = await Plan.findAll({ where });
      return res.status(200).json(plans);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2.5 Update Plan (Admin Only)
  async updatePlan(req, res) {
    try {
      const plan = await Plan.findByPk(req.params.id);
      if (!plan) return res.status(404).json({ error: 'Plan not found' });
      
      await plan.update(req.body);
      return res.status(200).json({ message: 'Plan updated successfully', plan });
    } catch (err) {
      console.error('❌ Error updating plan:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // 3. Purchase a Subscription
  // Auth optional — guests can build custom meal plans without creating an account
  async subscribe(req, res) {
    try {
      const {
        planId, customSchedule, billingCycle,
        guestName, guestEmail, guestPhone, guestDeliveryAddress
      } = req.body;

      const userId = req.user ? req.user.id : null;

      // Delegate everything to the engine — it handles guests vs. registered users
      const result = await SubscriptionEngine.subscribe(userId, {
        planId, customSchedule, billingCycle,
        guestName, guestEmail, guestPhone, guestDeliveryAddress
      });

      const response = {
        message: result.subscription.userId
          ? 'Subscribed successfully!'
          : 'Meal plan created! We\'ll contact you to confirm delivery.',
        subscription: result.subscription
      };

      // If this was a guest, return the manage token
      if (result.guestManageToken) {
        response.guestManageToken = result.guestManageToken;
        response.manageUrl = `/guest/subscriptions/${result.guestManageToken}`;
        response.notice = 'Use the link in your SMS/email to manage your meal plan — skip meals, view your calendar, and more. No account needed!';
      }

      if (result.customPrice != null) {
        response.customPrice = result.customPrice;
      }

      return res.status(201).json(response);
    } catch (err) {
      console.error('❌ Subscription purchase failed:', err);
      return res.status(400).json({ error: err.message });
    }
  }


  // 4. Upgrade / Downgrade Subscription (Prorated)
  async upgrade(req, res) {
    try {
      const userId = req.user.id;
      const { newPlanId } = req.body;

      const sub = await SubscriptionEngine.upgrade(userId, newPlanId);
      return res.status(200).json({ message: 'Subscription transitioned successfully', subscription: sub });
    } catch (err) {
      console.error('❌ Subscription upgrade failed:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  // 5. Cancel Subscription (Immediate or autoRenew = false depending on plan)
  async cancel(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const sub = await SubscriptionEngine.cancel(id, userId, null);
      return res.status(200).json({ message: 'Subscription cancelled successfully', subscription: sub });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  // 6. Fetch User Subscriptions
  async getMySubscriptions(req, res) {
    try {
      const userId = req.user.id;
      const subs = await Subscription.findAll({
        where: { userId },
        include: [{ model: Plan, as: 'plan' }]
      });
      return res.status(200).json(subs);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 6a. Guest: View subscription by manage token (no auth required)
  async getGuestSubscription(req, res) {
    try {
      const { token } = req.params;
      const sub = await SubscriptionEngine.getByGuestToken(token);
      return res.status(200).json(sub);
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }
  }

  // 6b. Guest: Cancel subscription by manage token
  async cancelGuest(req, res) {
    try {
      const { token } = req.params;
      const sub = await SubscriptionEngine.cancel(req.params.id, null, token);
      return res.status(200).json({ message: 'Subscription cancelled', subscription: sub });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  // 6.5 Fetch All Subscriptions (Admin Only)
  async getAllSubscriptions(req, res) {
    try {
      const subs = await Subscription.findAll({
        include: [{ model: Plan, as: 'plan' }]
      });
      // In a real app we might want to also include the User model to show who owns it
      return res.status(200).json(subs);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 7. Save Meal Schedule (Weekly default template)
  async saveMealSchedule(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params; // subscriptionId
      const { schedule } = req.body;

      const created = await MealSubscriptionService.saveSchedule(id, userId, schedule);
      return res.status(200).json({ message: 'Weekly meal schedule updated successfully', schedule: created });
    } catch (err) {
      console.error('❌ Failed saving meal schedule:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  // 8. Get Meal Schedule
  async getMealSchedule(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params; // subscriptionId

      const sub = await Subscription.findOne({ where: { id, userId } });
      if (!sub) return res.status(404).json({ error: 'Subscription not found' });

      const schedule = await MealSchedule.findAll({ where: { subscriptionId: id } });
      return res.status(200).json(schedule);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 9. Fetch Generated Meal Occurrences (for User Calendar Dashboard)
  async getMealOccurrences(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params; // subscriptionId
      const { startDate, endDate } = req.query;

      const sub = await Subscription.findOne({ where: { id, userId } });
      if (!sub) return res.status(404).json({ error: 'Subscription not found' });

      const where = { subscriptionId: id };
      if (startDate && endDate) {
        where.date = {
          [Op.between]: [startDate, endDate]
        };
      }

      const occurrences = await MealOccurrence.findAll({
        where,
        order: [['date', 'ASC']]
      });
      return res.status(200).json(occurrences);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 10. Skip a Single Meal Occurrence (Process Refund)
  async skipOccurrence(req, res) {
    try {
      const userId = req.user.id;
      const { occurrenceId } = req.params;

      const result = await MealSubscriptionService.skipMeal(occurrenceId, userId);
      return res.status(200).json({ message: 'Meal skipped and refunded successfully', ...result });
    } catch (err) {
      console.error('❌ Failed skipping occurrence:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  // 11. Override Address for a Single Meal Occurrence
  async updateOccurrenceAddress(req, res) {
    try {
      const userId = req.user.id;
      const { occurrenceId } = req.params;
      const { deliveryAddress, pickupStationId } = req.body;

      const occurrence = await MealSubscriptionService.updateOccurrenceAddress(
        occurrenceId,
        userId,
        deliveryAddress,
        pickupStationId
      );
      return res.status(200).json({ message: 'Meal occurrence routing updated successfully', occurrence });
    } catch (err) {
      console.error('❌ Failed updating occurrence address:', err);
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = new SubscriptionController();
