import { simulationEngine } from '../services/simulationEngine.js';
import { Crop } from '../models/Crop.js';

/**
 * GET /api/farms/me
 * Retrieve or initialize the authenticated user's 12-tile farm.
 */
export const getMyFarm = async (req, res) => {
  const farm = await simulationEngine.getUserFarm(req.user._id);
  res.status(200).json({
    success: true,
    farm,
  });
};

/**
 * POST /api/farms/action
 * Perform a validated farming action (plant, irrigate, compost, neemSpray, companion, harvest, clear).
 */
export const executeFarmAction = async (req, res) => {
  const { actionType, tileId, cropId, companionType } = req.body;

  if (!actionType) {
    return res.status(400).json({
      success: false,
      message: 'Please provide actionType (plant, irrigate, compost, neemSpray, companion, harvest, clear).',
    });
  }

  const result = await simulationEngine.executeAction(req.user._id, actionType, {
    tileId,
    cropId,
    companionType,
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.reason,
    });
  }

  res.status(200).json(result);
};

/**
 * POST /api/farms/advance-day
 * Advance the simulation by 1 day, running environmental and growth cycles.
 */
export const advanceFarmDay = async (req, res) => {
  const result = await simulationEngine.advanceSimulationDay(req.user._id);
  res.status(200).json(result);
};

/**
 * POST /api/farms/reset
 * Reset the user's farm back to the Day 16 initial baseline.
 */
export const resetFarm = async (req, res) => {
  const farm = await simulationEngine.resetFarm(req.user._id);
  res.status(200).json({
    success: true,
    message: 'Virtual farm reset to initial baseline state.',
    farm,
  });
};

/**
 * GET /api/crops
 * List the 5 standard organic agricultural crops.
 */
export const getCrops = async (req, res) => {
  const crops = await Crop.find({}).sort({ name: 1 });
  res.status(200).json({
    success: true,
    count: crops.length,
    crops,
  });
};

