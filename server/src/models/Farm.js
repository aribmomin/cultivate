import mongoose from 'mongoose';

const companionPlantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true }, // 'marigold' | 'clover'
    label: { type: String, required: true },
  },
  { _id: false }
);

const plantedCropSchema = new mongoose.Schema(
  {
    cropId: { type: String, required: true },
    name: { type: String, required: true },
    daysPlanted: { type: Number, default: 0, min: 0 },
    stageIndex: { type: Number, default: 0, min: 0 },
    health: { type: Number, default: 100, min: 0, max: 100 },
    companion: {
      type: companionPlantSchema,
      default: null,
    },
    isWaterStressed: { type: Boolean, default: false },
    isPestAfflicted: { type: Boolean, default: false },
    readyToHarvest: { type: Boolean, default: false },
  },
  { _id: false }
);

const farmTileSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    row: { type: Number, required: true, min: 0, max: 2 },
    col: { type: Number, required: true, min: 0, max: 3 },
    label: { type: String, required: true },
    soilHealth: { type: Number, default: 80, min: 0, max: 100 },
    moisture: { type: Number, default: 60, min: 0, max: 100 },
    nitrogenLevel: { type: Number, default: 75, min: 0, max: 100 },
    pestRisk: { type: Number, default: 15, min: 0, max: 100 },
    plantedCrop: {
      type: plantedCropSchema,
      default: null,
    },
    previousCrop: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const farmLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    day: { type: Number, required: true },
    type: {
      type: String,
      enum: ['action', 'info', 'bio', 'harvest', 'warning', 'next-day'],
      default: 'info',
    },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const farmSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: 'TerraLearn Organic Farm Plot',
    },
    day: {
      type: Number,
      default: 16,
      min: 1,
    },
    budget: {
      type: Number,
      default: 650.0,
      min: 0,
    },
    season: {
      type: String,
      default: 'Spring (Active Growth)',
    },
    weather: {
      condition: { type: String, default: 'Sunny' },
      temperatureC: { type: Number, default: 24 },
      rainfallMm: { type: Number, default: 0 },
      label: { type: String, default: 'Sunny & Moderate • 24°C' },
    },
    totalHarvestRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCropsHarvested: {
      type: Number,
      default: 0,
      min: 0,
    },
    tiles: {
      type: [farmTileSchema],
      validate: {
        validator: (t) => t && t.length === 12,
        message: 'A farm must maintain exactly 12 grid plots (3x4 grid)',
      },
    },
    logs: [farmLogSchema],
  },
  {
    timestamps: true,
  }
);

export const Farm = mongoose.model('Farm', farmSchema);

