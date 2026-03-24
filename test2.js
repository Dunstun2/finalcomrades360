const db = require('./backend/models');
db.Order.findOne({
  where: { orderNumber: 'ORD-1774179946586-415' },
  include: [{ model: db.DeliveryTask, as: 'deliveryTasks' }]
}).then(o => {
  console.log(JSON.stringify(o, null, 2));
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
