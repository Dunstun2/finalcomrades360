// backend/models/TeamMember.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const TeamMember = sequelize.define("TeamMember", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: "Team member full name"
    },
    position: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: "Team member job position/title"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Team member bio or description"
    },
    photo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Team member photo URL or base64"
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Display order of team members"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether to display this team member"
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Admin user who created this team member"
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Admin user who last updated this team member"
    }
  }, {
    freezeTableName: true,
    timestamps: true,
    indexes: [
      {
        fields: ['isActive']
      },
      {
        fields: ['order']
      },
      {
        fields: ['createdBy']
      }
    ]
  });

  TeamMember.associate = (models) => {
    // Associations removed - no foreign key constraints
  };

  return TeamMember;
};
