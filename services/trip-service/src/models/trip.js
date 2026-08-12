const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class Trip extends Model {}

Trip.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    rider_id: { type: DataTypes.STRING, allowNull: false },
    driver_id: { type: DataTypes.STRING, allowNull: false },
    pickup_longitude: { type: DataTypes.FLOAT, allowNull: false },
    pickup_latitude: { type: DataTypes.FLOAT, allowNull: false },
    status: {
      type: DataTypes.ENUM('requested', 'assigned', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'requested',
    },
    fare: { type: DataTypes.FLOAT, allowNull: true },
    surge_multiplier: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1.0 },
  },
  {
    sequelize,
    modelName: 'Trip',
    tableName: 'trips',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Trip;