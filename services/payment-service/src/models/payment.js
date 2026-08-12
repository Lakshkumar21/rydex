const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class Payment extends Model {}

Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    trip_id: { type: DataTypes.UUID, allowNull: false },
    rider_id: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'succeeded', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    stripe_payment_intent_id: { type: DataTypes.STRING, allowNull: true },
    failure_reason: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Payment;