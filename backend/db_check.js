const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database_temp.sqlite');

db.serialize(() => {
    db.get("SELECT id, orderNumber FROM `Order` WHERE orderNumber = 'ORD-1772568638103-669'", (err, row) => {
        if (err) {
            console.error('Error fetching order:', err);
            process.exit(1);
        }
        console.log('ORDER_DATA:' + JSON.stringify(row));

        if (row) {
            db.all("SELECT * FROM OrderItem WHERE orderId = " + row.id, (err2, items) => {
                if (err2) {
                    console.error('Error fetching items:', err2);
                    process.exit(1);
                }
                console.log('ITEMS_DATA:' + JSON.stringify(items));
                db.close();
            });
        } else {
            console.log('Order not found');
            db.close();
        }
    });
});
