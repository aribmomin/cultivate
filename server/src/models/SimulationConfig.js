import mongoose from 'mongoose';

const simulationConfigSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'default',
      unique: true,
      index: true,
    },
    initialBudget: {
      type: Number,
      default: 650,
    },
    dailyEvaporationRate: {
      type: Number,
      default: 6,
    },
    rainfallBonus: {
      type: Number,
      default: 18,
    },
    waterStressThreshold: {
      type: Number,
      default: 20,
    },
    irrigationMoistureBoost: {
      type: Number,
      default: 35,
    },
    irrigationCost: {
      type: Number,
      default: 10,
    },
    compostSoilHealthBoost: {
      type: Number,
      default: 16,
    },
    compostNitrogenBoost: {
      type: Number,
      default: 22,
    },
    compostCost: {
      type: Number,
      default: 25,
    },
    neemPestReduction: {
      type: Number,
      default: 30,
    },
    neemCost: {
      type: Number,
      default: 20,
    },
    yieldPlotMultiplier: {
      type: Number,
      default: 0.28,
    },
  },
  {
    timestamps: true,
  }
);

export const SimulationConfig = mongoose.model(
  'SimulationConfig',
  simulationConfigSchema
);

