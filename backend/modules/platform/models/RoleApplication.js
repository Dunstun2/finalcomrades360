const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RoleApplication = sequelize.define("RoleApplication", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    appliedRole: {
      type: DataTypes.ENUM('seller', 'marketer', 'delivery_agent', 'service_provider'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
      defaultValue: 'draft'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true // Allow null for drafts
    },
    university: {
      type: DataTypes.STRING,
      allowNull: true
    },
    studentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    nationalIdFrontUrl: {
      type: DataTypes.STRING,
      allowNull: true // Allow null for drafts
    },
    nationalIdBackUrl: {
      type: DataTypes.STRING,
      allowNull: true // Allow null for drafts
    },
    studentIdFrontUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    studentIdBackUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    referees: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    jobOpeningId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'JobOpening',
        key: 'id'
      }
    }
  }, {
    freezeTableName: true,
    timestamps: true,
    paranoid: true, // Enable soft deletes
    defaultScope: {
      attributes: {
        exclude: ['ipAddress', 'userAgent'] // Don't include these in default queries
      }
    },
    scopes: {
      withSensitiveData: {
        attributes: { include: ['ipAddress', 'userAgent'] }
      },
      pending: {
        where: { status: 'pending' }
      },
      approved: {
        where: { status: 'approved' }
      },
      rejected: {
        where: { status: 'rejected' }
      }
    },
    hooks: {
      beforeCreate: (application) => {
        // Trim string fields
        if (application.university) application.university = application.university.trim();
        if (application.studentId) application.studentId = application.studentId.trim();
        if (application.reason) application.reason = application.reason.trim();
        if (application.adminNotes) application.adminNotes = application.adminNotes.trim();

        // Set reviewedAt to now if status is not pending
        if (application.status !== 'pending' && !application.reviewedAt) {
          application.reviewedAt = new Date();
        }
      },
      beforeUpdate: (application) => {
        // Update reviewedAt if status is being changed from pending
        if (application.changed('status') && application.status !== 'pending' && !application.reviewedAt) {
          application.reviewedAt = new Date();
        }
      }
    }
  });

  // Add associations
  RoleApplication.associate = (models) => {
    RoleApplication.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    RoleApplication.belongsTo(models.User, {
      foreignKey: 'reviewedBy',
      as: 'reviewer',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    RoleApplication.belongsTo(models.JobOpening, {
      foreignKey: 'jobOpeningId',
      as: 'jobOpening'
    });
  };

  // Add class methods
  RoleApplication.getStatusCounts = async function (userId = null) {
    const whereClause = userId ? { userId } : {};

    const results = await this.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: whereClause,
      group: ['status'],
      raw: true
    });

    // Format the results into an object
    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };

    results.forEach(row => {
      counts[row.status] = parseInt(row.count, 10);
      counts.total += parseInt(row.count, 10);
    });

    return counts;
  };

  return RoleApplication;
};
