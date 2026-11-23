import { simulationEngine } from '../services/simulationEngine.js';

/**
 * GET /api/analytics/farm-summary
 * Real database-derived statistics for the authenticated user's farm.
 */
export const getFarmSummary = async (req, res) => {
  const farm = await simulationEngine.getUserFarm(req.user._id);

  const tiles = farm.tiles || [];
  const plantedTiles = tiles.filter((t) => t.plantedCrop !== null);
  const readyToHarvestTiles = tiles.filter(
    (t) => t.plantedCrop && t.plantedCrop.readyToHarvest
  );

  const avgSoil =
    tiles.length > 0
      ? Math.round(tiles.reduce((acc, t) => acc + t.soilHealth, 0) / tiles.length)
      : 80;

  const avgMoisture =
    tiles.length > 0
      ? Math.round(tiles.reduce((acc, t) => acc + t.moisture, 0) / tiles.length)
      : 60;

  const avgNitrogen =
    tiles.length > 0
      ? Math.round(tiles.reduce((acc, t) => acc + t.nitrogenLevel, 0) / tiles.length)
      : 75;

  const avgCropHealth =
    plantedTiles.length > 0
      ? Math.round(
          plantedTiles.reduce((acc, t) => acc + t.plantedCrop.health, 0) /
            plantedTiles.length
        )
      : 100;

  // Crop distribution on field
  const cropDistribution = {};
  plantedTiles.forEach((t) => {
    const name = t.plantedCrop.name;
    cropDistribution[name] = (cropDistribution[name] || 0) + 1;
  });

  res.status(200).json({
    success: true,
    summary: {
      day: farm.day,
      budget: farm.budget,
      season: farm.season,
      weather: farm.weather,
      totalHarvestRevenue: farm.totalHarvestRevenue,
      totalCropsHarvested: farm.totalCropsHarvested,
      plantedPlotsCount: plantedTiles.length,
      readyToHarvestCount: readyToHarvestTiles.length,
      averageSoilHealth: avgSoil,
      averageMoisture: avgMoisture,
      averageNitrogen: avgNitrogen,
      averageCropHealth: avgCropHealth,
      cropDistribution,
    },
  });
};

/**
 * GET /api/analytics/time-series
 * Activity log timeline and historical progression data.
 */
export const getTimeSeriesAnalytics = async (req, res) => {
  const farm = await simulationEngine.getUserFarm(req.user._id);

  const logs = farm.logs || [];
  const actionEvents = logs.filter((l) => l.type === 'action');
  const harvestEvents = logs.filter((l) => l.type === 'harvest');
  const dayProgression = logs.filter((l) => l.type === 'next-day');

  res.status(200).json({
    success: true,
    timeSeries: {
      totalLogEvents: logs.length,
      actionEventsCount: actionEvents.length,
      harvestEventsCount: harvestEvents.length,
      dayTurnsCount: dayProgression.length,
      recentLogs: logs.slice(0, 20),
    },
  });
};

