'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('HandoverCode', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            code: {
                type: Sequelize.STRING(5),
                allowNull: false
            },
            orderId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Order',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            taskId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'DeliveryTask',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            handoverType: {
                type: Sequelize.STRING,
                allowNull: false
            },
            initiatorId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'User',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            confirmerId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'User',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            status: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'pending'
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: false
            },
            confirmedAt: {
                type: Sequelize.DATE,
                allowNull: true
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });

        // Add indexes for performance
        await queryInterface.addIndex('HandoverCode', ['code', 'orderId', 'handoverType', 'status']);
        await queryInterface.addIndex('HandoverCode', ['orderId', 'handoverType', 'status']);
        await queryInterface.addIndex('HandoverCode', ['initiatorId']);
        await queryInterface.addIndex('HandoverCode', ['expiresAt']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('HandoverCode');
    }
};
