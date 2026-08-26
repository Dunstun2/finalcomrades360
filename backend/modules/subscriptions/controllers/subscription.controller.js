const { Plan, Subscription, MealOccurrence, MealSchedule, BenefitPackage, PackageBenefit, User } = require('../../../database/models.registry');
const { PlanBenefit, Feature, FastFood, sequelize } = require('../../../database/models.registry');
const { Op } = require('sequelize');
const SubscriptionEngine = require('../services/SubscriptionEngine');
const MealSubscriptionService = require('../services/MealSubscriptionService');

class SubscriptionController {
  constructor() {
    // Bind all methods to ensure 'this' is available in Express route callbacks
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    for (const method of methods) {
      if (method !== 'constructor' && typeof this[method] === 'function') {
        this[method] = this[method].bind(this);
      }
    }
  }

  normalizePlanPayload(payload) {
    const normalized = { ...payload };
    if (normalized.type === 'meal') {
      normalized.gracePeriodDays = 0;
    }
    return normalized;
  }

  validatePlanBenefits(type, benefits = []) {
    const TYPE_ALLOWED_CATEGORIES = {
      meal: ['Meal', 'Delivery', 'Finance', 'Support'],
      seller: ['Visibility', 'Finance', 'Support', 'Limits', 'Analytics', 'Marketing', 'Delivery'],
      service: ['Service', 'Support', 'Finance'],
      laundry: ['Laundry', 'Delivery', 'Support', 'Finance'],
      delivery: ['Delivery', 'Support', 'Finance']
    };

    const FEATURE_ALLOWED_TYPES = {
      free_delivery: ['meal', 'laundry', 'delivery', 'seller'],
      reduced_delivery_fee: ['meal', 'laundry', 'delivery'],
      free_meals: ['meal'],
      meal_discount: ['meal'],
      skip_meals: ['meal'],
      seller_commission_discount: [],
      free_laundry_kg: ['laundry'],
      laundry_discount: ['laundry'],
      free_services: ['service'],
      service_discount: ['service'],
      featured_product: ['seller'],
      boosted_products: ['seller'],
      advanced_analytics: ['seller'],
      priority_support: ['seller', 'meal', 'service', 'laundry', 'delivery'],
      cashback_orders: ['meal', 'service', 'laundry', 'delivery'],
      double_points: ['meal', 'service', 'laundry', 'delivery'],
      // Limits / Inventory Management
      max_products: ['seller'],
      max_categories: ['seller'],
      inventory_management: ['seller'],
      // Analytics & Reporting
      export_reports: ['seller'],
      realtime_analytics: ['seller'],
      // Delivery & Marketing
      delivery_tracking: ['seller', 'meal'],
      free_delivery_promotions: ['seller'],
      marketing_items_limit: ['seller'],
      // Financial Tools
      express_payout: ['seller', 'service', 'laundry'],
      invoice_generation: ['seller'],
      monthly_statements: ['seller'],
      tax_reports: ['seller']
    };

    const allowedCategories = TYPE_ALLOWED_CATEGORIES[type] || [];
    for (const benefit of benefits) {
      if (!benefit) continue;
      if (benefit.category && !allowedCategories.includes(benefit.category)) {
        throw new Error(`Category "${benefit.category}" is not allowed for plan/package type "${type}"`);
      }
      const allowedTypes = FEATURE_ALLOWED_TYPES[benefit.featureCode];
      if (allowedTypes && !allowedTypes.includes(type)) {
        throw new Error(`Feature "${benefit.featureCode}" is not allowed for plan/package type "${type}"`);
      }
    }
  }

  async syncPlanBenefits(planId, benefits = [], transaction) {
    await PlanBenefit.destroy({ where: { planId }, transaction });

    for (const benefit of benefits) {
      if (!benefit || !benefit.featureCode) continue;
      let feat = await Feature.findOne({ where: { code: benefit.featureCode }, transaction });
      if (!feat) {
        await Feature.create({
          code: benefit.featureCode,
          name: benefit.featureName || benefit.featureCode,
          description: benefit.description || '',
          category: benefit.category || 'Support'
        }, { transaction });
      }

      await PlanBenefit.create({
        planId,
        featureCode: benefit.featureCode,
        limitType: benefit.limitType,
        value: benefit.value,
        startDate: benefit.startDate || null,
        endDate: benefit.endDate || null
      }, { transaction });
    }
  }

  // 1. Create a Plan (Admin Only)
  async createPlan(req, res) {
    try {
      const payload = this.normalizePlanPayload(req.body);
      try {
        this.validatePlanBenefits(payload.type, payload.benefits);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
      payload.creatorId = req.user?.id || null;
      const plan = await sequelize.transaction(async (t) => {
        const createdPlan = await Plan.create(payload, { transaction: t });
        // If benefitPackageId is provided, we just link it.
        // But if they provided manual benefits (custom overrides), we still sync those to PlanBenefit
        if (payload.benefits && payload.benefits.length > 0) {
          await this.syncPlanBenefits(createdPlan.id, payload.benefits, t);
        }
        return createdPlan;
      });

      const planWithBenefits = await Plan.findByPk(plan.id, {
        include: [
          { model: PlanBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] },
          { model: BenefitPackage, as: 'benefitPackage' }
        ]
      });
      return res.status(201).json({ message: 'Plan created successfully', plan: planWithBenefits || plan });
    } catch (err) {
      console.error('❌ Error creating plan:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // 2. Get Plans
  async getPlans(req, res) {
    try {
      console.log('🔍 [getPlans] request:', {
        query: req.query,
        user: req.user ? { id: req.user.id, role: req.user.role } : 'null',
        headers: { authorization: req.headers.authorization ? 'present' : 'missing' }
      });
      
      const { type, all } = req.query;
      const where = {};
      if (type) where.type = type;
      if (!all) where.status = 'Published'; // Standard users only see published plans
      
      // Determine if user is admin
      const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'super_admin');
      
      // Hide personal plans from global catalog unless it's an admin OR they created it
      if (!isAdmin) {
        const userId = req.user?.id;
        if (userId) {
          where[Op.or] = [
            { isVisible: true },
            { creatorId: userId }
          ];
        } else {
          where.isVisible = true;
        }
      }

      console.log('🔍 [getPlans] built where clause:', JSON.stringify(where));

      const { User } = require('../../../database/models.registry');

      const plans = await Plan.findAll({
        where,
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'role', 'roles'] },
          { model: PlanBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] },
          { 
            model: BenefitPackage, 
            as: 'benefitPackage',
            include: [
              { 
                model: PackageBenefit, 
                as: 'benefits', 
                include: [{ model: Feature, as: 'feature' }] 
              }
            ]
          }
        ]
      });

      console.log('🔍 [getPlans] returning plan count:', plans.length, 'Plans:', plans.map(p => ({ id: p.id, name: p.name, isVisible: p.isVisible, creatorId: p.creatorId })));

      // Hydrate templateSchedule entries with food item details
      const plansJson = plans.map(p => p.toJSON());

      const foodIdSet = new Set();
      plansJson.forEach(plan => {
        if (Array.isArray(plan.templateSchedule)) {
          plan.templateSchedule.forEach(entry => {
            // Support both fastFoodItemId (single) and fastFoodItemIds (array)
            if (entry.fastFoodItemId) foodIdSet.add(entry.fastFoodItemId);
            if (Array.isArray(entry.fastFoodItemIds)) {
              entry.fastFoodItemIds.forEach(id => foodIdSet.add(id));
            }
          });
        }
      });

      if (foodIdSet.size > 0) {
        const foodItems = await FastFood.findAll({
          where: { id: Array.from(foodIdSet) },
          attributes: ['id', 'name', 'basePrice', 'displayPrice', 'discountPrice', 'deliveryFee', 'category', 'mainImage']
        });
        const foodMap = Object.fromEntries(foodItems.map(f => [f.id, f.toJSON()]));

        plansJson.forEach(plan => {
          if (Array.isArray(plan.templateSchedule)) {
            plan.templateSchedule = plan.templateSchedule.map(entry => {
              // Single item format
              if (entry.fastFoodItemId) {
                return { ...entry, fastFoodItem: foodMap[entry.fastFoodItemId] || null };
              }
              // Array format - embed full items array
              if (Array.isArray(entry.fastFoodItemIds)) {
                return {
                  ...entry,
                  fastFoodItems: entry.fastFoodItemIds.map(id => foodMap[id]).filter(Boolean)
                };
              }
              return entry;
            });
          }
        });
      }

      return res.status(200).json(plansJson);
    } catch (err) {
      console.error('❌ Error fetching plans:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // 2.5 Update Plan (Admin Only)
  async updatePlan(req, res) {
    try {
      const plan = await Plan.findByPk(req.params.id);
      if (!plan) return res.status(404).json({ error: 'Plan not found' });

      const payload = this.normalizePlanPayload(req.body);

      // Guard: once a plan has been published, Draft is no longer a valid status.
      // Admins must use Archived or Disabled to retire it instead.
      if (payload.status === 'Draft' && plan.firstPublishedAt) {
        return res.status(400).json({
          error: 'This plan has already been published and cannot be reverted to Draft. Use Archived or Disabled to retire it.'
        });
      }

      // Stamp firstPublishedAt the first time status becomes Published
      if (payload.status === 'Published' && !plan.firstPublishedAt) {
        payload.firstPublishedAt = new Date();
      }

      try {
        const type = payload.type || plan.type;
        this.validatePlanBenefits(type, payload.benefits);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
      await plan.update(payload);

      if (payload.benefits) {
        await sequelize.transaction(async (t) => {
          await this.syncPlanBenefits(plan.id, payload.benefits, t);
        });
      }

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
        guestName, guestEmail, guestPhone, guestDeliveryAddress,
        paymentProofUrl, paymentMethod, paymentSubType
      } = req.body;

      const userId = req.user ? req.user.id : null;

      // Delegate everything to the engine — it handles guests vs. registered users
      const result = await SubscriptionEngine.subscribe(userId, {
        planId, customSchedule, billingCycle,
        guestName, guestEmail, guestPhone, guestDeliveryAddress,
        paymentProofUrl, paymentMethod, paymentSubType
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

      // If payment verification is needed, inform the user
      if (result.needsPaymentVerification) {
        response.message = 'Subscription created! Your payment is being verified. You will be notified once approved.';
        response.paymentStatus = 'pending_verification';
      }

      return res.status(201).json(response);
    } catch (err) {
      console.error('❌ Subscription purchase failed:', err);
      return res.status(400).json({ error: err.message });
    }
  }

  // 3.5 Create Subscription Payment (Two-Step Flow - Step 1)
  async createSubscriptionPayment(req, res) {
    try {
      const { planId, paymentMethod, guestData } = req.body;
      const userId = req.user ? req.user.id : null;
      
      // We pass paymentProofUrl = 'pending_stk_push' to force the engine to create an Order for verification
      const result = await SubscriptionEngine.subscribe(userId, {
        planId,
        paymentMethod: paymentMethod || 'mpesa',
        paymentSubType: 'mpesa_prepay',
        paymentProofUrl: 'pending_stk_push',
        guestName: guestData?.name,
        guestEmail: guestData?.email,
        guestPhone: guestData?.phone,
        guestDeliveryAddress: guestData?.address
      });

      // The Order is created by the engine. Find it.
      const { Order } = require('../../../database/models.registry');
      const order = await Order.findOne({ 
        where: { subscriptionId: result.subscription.id },
        order: [['createdAt', 'DESC']]
      });

      if (!order) {
        throw new Error('Failed to create payment order for subscription');
      }

      return res.status(200).json({
        id: order.id,
        orderId: order.id,
        amount: order.total,
        subscriptionId: result.subscription.id
      });
    } catch (err) {
      console.error('❌ Error creating subscription payment:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // 3.6 Confirm Subscription Payment (Two-Step Flow - Step 2)
  async confirmSubscriptionPayment(req, res) {
    try {
      const { id } = req.params; // order id
      const { paymentId } = req.body;

      const { Order, Subscription, SubscriptionInvoice, Plan } = require('../../../database/models.registry');
      const order = await Order.findByPk(id);
      
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (!order.subscriptionId) return res.status(400).json({ error: 'Order is not linked to a subscription' });

      // Mark order as paid optimistically if M-Pesa webhook was delayed
      order.status = 'processing';
      order.paymentConfirmed = true;
      if (paymentId) order.paymentProofUrl = paymentId;
      await order.save();

      // Activate the subscription
      const sub = await Subscription.findByPk(order.subscriptionId);
      if (sub && sub.status === 'Pending') {
        const plan = await Plan.findByPk(sub.planId);
        const trialDays = plan?.trialPeriodDays || 0;
        sub.status = trialDays > 0 ? 'Trial' : 'Active';
        await sub.save();

        // Mark invoice as paid
        const invoice = await SubscriptionInvoice.findOne({ where: { subscriptionId: sub.id, status: 'pending_verification' }});
        if (invoice) {
          invoice.status = 'paid';
          invoice.paidAt = new Date();
          invoice.paymentReference = paymentId || order.orderNumber;
          await invoice.save();
        }

        // Reactivate seller benefits if it's a seller plan
        if (plan?.type === 'seller') {
          const { SellerSubscriptionService } = require('../services/SellerSubscriptionService');
          await SellerSubscriptionService.reactivateSellerBenefits(sub.userId);
        }
      }

      return res.status(200).json({ message: 'Subscription confirmed successfully', subscription: sub });
    } catch (err) {
      console.error('❌ Error confirming subscription payment:', err);
      return res.status(500).json({ error: err.message });
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
      const userRole = String(req.user.role || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const isAdmin = userRole === 'admin' || userRole === 'superadmin';
      const { id } = req.params;
      const { reason, issueRefund, password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Password is required to cancel a subscription.' });
      }

      const { User } = require('../../../database/models.registry');
      const bcrypt = require('bcryptjs');

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password. Cancellation aborted.' });
      }

      const sub = await SubscriptionEngine.cancel(id, userId, null, reason, issueRefund, isAdmin);
      return res.status(200).json({ message: 'Subscription cancelled successfully', subscription: sub });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  // 6. Fetch User Subscriptions
  async getMySubscriptions(req, res) {
    try {
      const userId = req.user.id;
      const { type } = req.query; // 'seller' or 'meal'
      
      const includeClause = { 
        model: Plan, 
        as: 'plan',
        include: [
          { model: PlanBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] },
          { model: BenefitPackage, as: 'benefitPackage' }
        ]
      };

      const where = { userId };

      if (type) {
        if (type === 'meal') {
          // For meal type, include both plan-based meal subscriptions AND custom meal plans (planId is null)
          const { Op } = require('sequelize');
          includeClause.required = false; // Left join so custom plans (planId=null) are not excluded
          where[Op.or] = [
            { planId: null },  // Custom meal plans
            { '$plan.type$': type }  // Plan-based meal subscriptions
          ];
        } else {
          includeClause.where = { type };
          includeClause.required = true;
        }
      }

      const subs = await Subscription.findAll({
        where,
        include: [includeClause],
        order: [['createdAt', 'DESC']]
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
        include: [
          { 
            model: Plan, 
            as: 'plan' 
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone', 'createdAt'],
            required: false // Allow subscriptions without users (guest subscriptions)
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      return res.status(200).json(subs);
    } catch (err) {
      console.error('❌ Error fetching all subscriptions:', err);
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
      const isAdmin = req.user.role === 'superadmin' || req.user.role === 'super_admin' || req.user.role === 'admin';

      const where = { id };
      if (!isAdmin) {
        where.userId = userId;
      }

      const sub = await Subscription.findOne({ where });
      if (!sub) return res.status(404).json({ error: 'Subscription not found' });

      const schedule = await MealSchedule.findAll({ 
        where: { subscriptionId: id },
        include: [{
          model: FastFood,
          as: 'preferredFastFoodItem'
        }]
      });
      return res.status(200).json(schedule);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 9. Fetch Generated Meal Occurrences (for User Calendar Dashboard)
  async getMealOccurrences(req, res) {
    console.log('🔍 [getMealOccurrences] Request received:', {
      subscriptionId: req.params.id,
      userId: req.user?.id,
      userRole: req.user?.role,
      timestamp: new Date().toISOString()
    });
    
    try {
      const userId = req.user.id;
      // Check for admin role - handle both 'superadmin' and 'admin' 
      const isAdmin = req.user.role === 'superadmin' || req.user.role === 'super_admin' || req.user.role === 'admin';
      
      console.log('🔍 [getMealOccurrences] Auth check:', { userId, userRole: req.user.role, isAdmin });
      
      const { id } = req.params; // subscriptionId
      const { startDate, endDate } = req.query;

      // Admin can view any subscription, regular users can only view their own
      const where = { id };
      if (!isAdmin) {
        where.userId = userId;
      }

      console.log('🔍 [getMealOccurrences] Looking for subscription with where:', where);

      const sub = await Subscription.findOne({ where });
      
      console.log('🔍 [getMealOccurrences] Subscription found:', sub ? `ID: ${sub.id}, userId: ${sub.userId}` : 'NOT FOUND');
      
      if (!sub) return res.status(404).json({ error: 'Subscription not found' });

      const occurrenceWhere = { subscriptionId: id };
      if (startDate && endDate) {
        occurrenceWhere.scheduledDate = {
          [Op.between]: [startDate, endDate]
        };
      }

      const occurrences = await MealOccurrence.findAll({
        where: occurrenceWhere,
        include: [
          {
            model: MealSchedule,
            as: 'schedule',
            attributes: ['mealTimeType', 'preferredTime', 'dayOfWeek'],
            include: [
              {
                model: FastFood,
                as: 'preferredFastFoodItem',
                attributes: ['id', 'name', 'basePrice']
              }
            ]
          }
        ],
        order: [['date', 'ASC']]
      });
      
      console.log('🔍 [getMealOccurrences] Found occurrences:', {
        count: occurrences.length,
        subscriptionId: id,
        sample: occurrences.length > 0 ? {
          id: occurrences[0].id,
          date: occurrences[0].date,
          status: occurrences[0].status,
          hasSchedule: !!occurrences[0].schedule,
          hasFastFood: !!occurrences[0].schedule?.preferredFastFoodItem
        } : null
      });
      
      return res.status(200).json(occurrences);
    } catch (err) {
      console.error('Error fetching meal occurrences:', err);
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

  // ==========================================
  // BENEFIT PACKAGES CRUD (Admin Only)
  // ==========================================

  async getBenefitPackages(req, res) {
    try {
      const packages = await BenefitPackage.findAll({
        include: [
          { model: PackageBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] }
        ]
      });
      return res.status(200).json(packages);
    } catch (err) {
      console.error('❌ Error fetching benefit packages:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async syncPackageBenefits(packageId, benefits = [], transaction) {
    await PackageBenefit.destroy({ where: { packageId }, transaction });

    for (const benefit of benefits) {
      if (!benefit || !benefit.featureCode) continue;
      let feat = await Feature.findOne({ where: { code: benefit.featureCode }, transaction });
      if (!feat) {
        await Feature.create({
          code: benefit.featureCode,
          name: benefit.featureName || benefit.featureCode,
          description: benefit.description || '',
          category: benefit.category || 'Support'
        }, { transaction });
      }

      await PackageBenefit.create({
        packageId,
        featureCode: benefit.featureCode,
        limitType: benefit.limitType,
        value: benefit.value,
        startDate: benefit.startDate || null,
        endDate: benefit.endDate || null
      }, { transaction });
    }
  }

  async createBenefitPackage(req, res) {
    try {
      const { name, description, type, benefits } = req.body;
      try {
        this.validatePlanBenefits(type, benefits);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
      const pkg = await sequelize.transaction(async (t) => {
        const createdPkg = await BenefitPackage.create({ name, description, type }, { transaction: t });
        if (benefits && benefits.length > 0) {
          await this.syncPackageBenefits(createdPkg.id, benefits, t);
        }
        return createdPkg;
      });

      const packageWithBenefits = await BenefitPackage.findByPk(pkg.id, {
        include: [{ model: PackageBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] }]
      });
      return res.status(201).json({ message: 'Benefit package created successfully', package: packageWithBenefits || pkg });
    } catch (err) {
      console.error('❌ Error creating benefit package:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async updateBenefitPackage(req, res) {
    try {
      const pkg = await BenefitPackage.findByPk(req.params.id);
      if (!pkg) return res.status(404).json({ error: 'Package not found' });
      
      const { name, description, type, benefits } = req.body;
      try {
        const pkgType = type || pkg.type;
        this.validatePlanBenefits(pkgType, benefits);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
      
      await sequelize.transaction(async (t) => {
        await pkg.update({ name, description, type }, { transaction: t });
        if (benefits) {
          await this.syncPackageBenefits(pkg.id, benefits, t);
        }
      });

      const updatedPkg = await BenefitPackage.findByPk(pkg.id, {
        include: [{ model: PackageBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] }]
      });
      return res.status(200).json({ message: 'Benefit package updated successfully', package: updatedPkg });
    } catch (err) {
      console.error('❌ Error updating benefit package:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async deleteBenefitPackage(req, res) {
    try {
      const pkg = await BenefitPackage.findByPk(req.params.id);
      if (!pkg) return res.status(404).json({ error: 'Package not found' });
      
      await sequelize.transaction(async (t) => {
        await PackageBenefit.destroy({ where: { packageId: pkg.id }, transaction: t });
        await pkg.destroy({ transaction: t });
      });
      
      return res.status(200).json({ message: 'Benefit package deleted successfully' });
    } catch (err) {
      console.error('❌ Error deleting benefit package:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ==========================================
  // CUSTOMER-FACING: Create Personal Plan
  // ==========================================

  /**
   * Allows authenticated users to create their own meal plan.
   * Users can only select from existing benefit packages (no custom benefits).
   * The created plan is automatically subscribed to.
   */
  async createUserPlan(req, res) {
    try {
      const userId = req.user.id;
      const { name, description, billingCycle, benefitPackageId, templateSchedule } = req.body;

      // Validate required fields
      if (!name || !billingCycle || !templateSchedule || templateSchedule.length === 0) {
        return res.status(400).json({ error: 'Name, billingCycle, and templateSchedule are required' });
      }

      // Validate benefit package exists (if provided)
      if (benefitPackageId) {
        const pkg = await BenefitPackage.findByPk(benefitPackageId);
        if (!pkg) {
          return res.status(400).json({ error: 'Selected benefit package not found' });
        }
      }

      // Create the plan
      const result = await sequelize.transaction(async (t) => {
        // Calculate custom price from schedule
        const customPrice = await this.calculateCustomPriceFromSchedule(templateSchedule, t);

        // Create user's personal plan
        const userPlan = await Plan.create({
          name,
          description: description || '',
          type: 'meal',
          status: 'Published',
          price: customPrice, 
          billingCycle,
          gracePeriodDays: 0,
          isVisible: false, // Hide personal plans from global catalog
          creatorId: req.user?.id || null,
          benefitPackageId: benefitPackageId || null,
          templateSchedule: templateSchedule || []
        }, { transaction: t });

        return { plan: userPlan, customPrice };
      });

      // Return with benefits included
      const planWithBenefits = await Plan.findByPk(result.plan.id, {
        include: [
          { model: PlanBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] },
          { model: BenefitPackage, as: 'benefitPackage' }
        ]
      });

      return res.status(201).json({
        message: 'Your personal meal plan has been saved!',
        plan: planWithBenefits
      });
    } catch (err) {
      console.error('❌ Error creating user plan:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // Update a personal meal plan (Customer only - can only edit plans they created)
  async updateUserPlan(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Find the plan and verify ownership
      const plan = await Plan.findByPk(id);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      if (plan.creatorId !== userId) {
        return res.status(403).json({ error: 'You can only edit plans you created' });
      }

      // Check if plan has active subscription
      const activeSubs = await Subscription.findAll({
        where: { planId: plan.id, status: 'Active' }
      });
      if (activeSubs.length > 0) {
        return res.status(400).json({ error: 'This plan has an active subscription and cannot be edited. Please cancel the subscription first.' });
      }

      const { name, description, billingCycle, benefitPackageId, templateSchedule } = req.body;

      // Validate benefit package if provided
      if (benefitPackageId) {
        const pkg = await BenefitPackage.findByPk(benefitPackageId);
        if (!pkg) {
          return res.status(400).json({ error: 'Benefit package not found' });
        }
      }

      // Recalculate price from the new schedule
      const customPrice = await this.calculateCustomPriceFromSchedule(templateSchedule || plan.templateSchedule);

      // Update the plan
      await plan.update({
        name: name || plan.name,
        description: description !== undefined ? description : plan.description,
        billingCycle: billingCycle || plan.billingCycle,
        price: customPrice,
        benefitPackageId: benefitPackageId !== undefined ? (benefitPackageId || null) : plan.benefitPackageId,
        templateSchedule: templateSchedule || plan.templateSchedule
      });

      // If this plan has active subscriptions, update their price and active meal schedule too!
      // (activeSubs is already fetched above)
      if (activeSubs.length > 0) {
        console.log(`📝 Updating ${activeSubs.length} active subscription(s) with new price: ${customPrice} and template schedule`);
        await sequelize.transaction(async (t) => {
          for (const sub of activeSubs) {
            // Update subscription price
            await sub.update({ price: customPrice }, { transaction: t });

            // Clear old MealSchedule entries
            await MealSchedule.destroy({
              where: { subscriptionId: sub.id },
              transaction: t
            });

            // Re-create MealSchedule entries from the updated templateSchedule
            const targetSchedule = templateSchedule || plan.templateSchedule;
            if (targetSchedule && targetSchedule.length > 0) {
              const scheduleToCreate = targetSchedule.flatMap(entry => {
                const ids = entry.fastFoodItemIds?.length
                  ? entry.fastFoodItemIds
                  : entry.fastFoodItemId ? [entry.fastFoodItemId] : [null];
                return ids.map(id => ({
                  subscriptionId: sub.id,
                  dayOfWeek: entry.dayOfWeek.toLowerCase(),
                  mealTimeType: entry.mealTimeType.toLowerCase(),
                  preferredTime: entry.preferredTime,
                  pickupStationId: null,
                  deliveryAddress: sub.guestDeliveryAddress || null,
                  preferredFastFoodItemId: id || null
                }));
              });

              for (const schedItem of scheduleToCreate) {
                await MealSchedule.create(schedItem, { transaction: t });
              }
            }
          }
        });
      }

      // Return updated plan with benefits
      const updatedPlan = await Plan.findByPk(plan.id, {
        include: [
          { model: PlanBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] },
          { model: BenefitPackage, as: 'benefitPackage' }
        ]
      });

      return res.json({
        message: activeSubs.length > 0
          ? `Plan updated! ${activeSubs.length} active subscription(s) updated with new price.`
          : 'Your personal meal plan has been updated!',
        plan: updatedPlan
      });
    } catch (err) {
      console.error('❌ Error updating user plan:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * Helper to calculate custom price from schedule items.
   * Each entry may carry fastFoodItemIds[] (multi, new) or fastFoodItemId (legacy single).
   */
  async calculateCustomPriceFromSchedule(schedule, transaction) {
    const { FastFood } = require('../../../database/models.registry');
    let total = 0;
    for (const entry of schedule) {
      const ids = entry.fastFoodItemIds?.length
        ? entry.fastFoodItemIds
        : entry.fastFoodItemId ? [entry.fastFoodItemId] : [];

      for (const id of ids) {
        const item = await FastFood.findByPk(id, {
          attributes: ['basePrice'],
          transaction
        });
        if (item) {
          total += parseFloat(item.basePrice) || 0;
        }
      }
    }
    return parseFloat(total.toFixed(2));
  }

  // ==========================================
  // CUSTOMER-FACING: View Subscription Benefits
  // ==========================================

  /**
   * Returns all benefits for a user's subscription with usage information.
   */
  async getSubscriptionBenefits(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params; // subscriptionId
      const isAdmin = req.user.role === 'superadmin' || req.user.role === 'super_admin' || req.user.role === 'admin';

      const where = { id };
      if (!isAdmin) {
        where.userId = userId;
      }

      const sub = await Subscription.findOne({
        where,
        include: [
          { 
            model: Plan, 
            as: 'plan',
            include: [
              { model: PlanBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] },
              { 
                model: BenefitPackage, 
                as: 'benefitPackage',
                include: [{ model: PackageBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] }]
              }
            ]
          }
        ]
      });

      if (!sub) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      const benefits = [];
      const now = new Date();

      // Get benefits from plan (custom overrides)
      if (sub.plan && sub.plan.benefits) {
        for (const planBenefit of sub.plan.benefits) {
          const remaining = await this.getBenefitRemaining(sub.id, planBenefit.featureCode);
          benefits.push({
            source: 'plan',
            featureCode: planBenefit.featureCode,
            featureName: planBenefit.feature?.name || planBenefit.featureCode,
            category: planBenefit.feature?.category || 'Support',
            limitType: planBenefit.limitType,
            value: planBenefit.value,
            remaining,
            isActive: true
          });
        }
      }

      // Get benefits from package (if no plan-specific benefits or as fallback)
      if (sub.plan && sub.plan.benefitPackageId && sub.plan.benefitPackage) {
        for (const pkgBenefit of sub.plan.benefitPackage.benefits || []) {
          // Skip if already added from plan
          if (benefits.some(b => b.featureCode === pkgBenefit.featureCode)) continue;

          const remaining = await this.getBenefitRemaining(sub.id, pkgBenefit.featureCode);
          benefits.push({
            source: 'package',
            featureCode: pkgBenefit.featureCode,
            featureName: pkgBenefit.feature?.name || pkgBenefit.featureCode,
            category: pkgBenefit.feature?.category || 'Support',
            limitType: pkgBenefit.limitType,
            value: pkgBenefit.value,
            remaining,
            isActive: true
          });
        }
      }

      return res.status(200).json({
        subscriptionId: sub.id,
        planName: sub.plan?.name,
        status: sub.status,
        benefits
      });
    } catch (err) {
      console.error('❌ Error fetching subscription benefits:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Helper to get remaining usage for a benefit
   */
  async getBenefitRemaining(subscriptionId, featureCode) {
    const { SubscriptionUsage } = require('../../../database/models.registry');
    const usage = await SubscriptionUsage.findOne({
      where: { subscriptionId, featureCode }
    });

    if (!usage) return null;
    if (usage.quantityLimit === -1) return Infinity;
    return Math.max(0, usage.quantityLimit - usage.quantityUsed);
  }

  // ==========================================
  // CUSTOMER-FACING: Get Available Packages
  // ==========================================

  /**
   * Returns benefit packages available for customer use.
   */
  async getAvailablePackages(req, res) {
    try {
      const packages = await BenefitPackage.findAll({
        where: { type: 'meal' },
        include: [
          { model: PackageBenefit, as: 'benefits', include: [{ model: Feature, as: 'feature' }] }
        ]
      });
      return res.status(200).json(packages);
    } catch (err) {
      console.error('❌ Error fetching available packages:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get cashback summary for the authenticated user
   */
  async getCashbackSummary(req, res) {
    try {
      const userId = req.user.id;
      const CashbackService = require('../services/CashbackService');
      const summary = await CashbackService.getCashbackSummary(userId);
      return res.status(200).json(summary);
    } catch (err) {
      console.error('❌ Error fetching cashback summary:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new SubscriptionController();