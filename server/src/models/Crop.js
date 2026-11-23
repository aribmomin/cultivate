import mongoose from 'mongoose';

const cropSchema = new mongoose.Schema(
  {
    cropId: {
      type: String,
      required: [true, 'Crop identifier is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Crop common name is required'],
      trim: true,
    },
    scientificName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Crop category is required'],
      trim: true,
    },
    baseGrowthDays: {
      type: Number,
      required: [true, 'Base growth duration is required'],
      min: 1,
    },
    dailyWaterNeed: {
      type: Number,
      required: [true, 'Daily water consumption is required'],
      min: 0,
    },
    optimalSoilHealthMin: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    optimalSoilHealthMax: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    pestSusceptibility: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    baseYieldKg: {
      type: Number,
      required: true,
      min: 0,
    },
    marketPricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },
    minHarvestDay: {
      type: Number,
      required: true,
      min: 1,
    },
    color: {
      type: String,
      default: '#10B981',
    },
    bgColor: {
      type: String,
      default: '#ECFDF5',
    },
    borderColor: {
      type: String,
      default: '#A7F3D0',
    },
    description: {
      type: String,
      required: true,
    },
    growthStages: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Crop = mongoose.model('Crop', cropSchema);

