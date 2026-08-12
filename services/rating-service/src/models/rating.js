const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class Rating extends Model {}

Rating.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    trip_id: { type: DataTypes.UUID, allowNull: false },
    rater_id: { type: DataTypes.STRING, allowNull: false }, // who gave the rating
    target_id: { type: DataTypes.STRING, allowNull: false }, // who is being rated
    stars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Rating',
    tableName: 'ratings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Rating;