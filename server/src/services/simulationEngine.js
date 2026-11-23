import { Farm } from '../models/Farm.js';
import { Crop } from '../models/Crop.js';
import { User } from '../models/User.js';
import { SimulationConfig } from '../models/SimulationConfig.js';
import { awardUserXp } from './gamificationService.js';

export const INITIAL_TILES = [
  {
    id: 'tile-A1',
    row: 0,
    col: 0,
    label: 'A1',
    soilHealth: 84,
    moisture: 60,
    nitrogenLevel: 80,
    pestRisk: 18,
    plantedCrop: {
      cropId: 'crop-tomato',
      name: 'Heritage Tomato',
      daysPlanted: 16,
      stageIndex: 1,
      health: 92,
      companion: {
        name: 'French Marigold',
        type: 'marigold',
        label: 'Pest Barrier',
      },
      isWaterStressed: false,
      isPestAfflicted: false,
      readyToHarvest: false,
    },
    previousCrop: null,
  },
  {
    id: 'tile-A2',
    row: 0,
    col: 1,
    label: 'A2',
    soilHealth: 76,
    moisture: 45,
    nitrogenLevel: 70,
    pestRisk: 22,
    plantedCrop: {
      cropId: 'crop-wheat',
      name: 'Organic Durum Wheat',
      daysPlanted: 10,
      stageIndex: 1,
      health: 88,
      companion: null,
      isWaterStressed: false,
      isPestAfflicted: false,
      readyToHarvest: false,
    },
    previousCrop: null,
  },
  {
    id: 'tile-A3',
    row: 0,
    col: 2,
    label: 'A3',
    soilHealth: 88,
    moisture: 65,
    nitrogenLevel: 85,
    pestRisk: 10,
    plantedCrop: null,
    previousCrop: 'Legume Cover',
  },
  { id: 'tile-A4', row: 0, col: 3, label: 'A4', soilHealth: 82, moisture: 58, nitrogenLevel: 78, pestRisk: 12, plantedCrop: null, previousCrop: null },
  { id: 'tile-B1', row: 1, col: 0, label: 'B1', soilHealth: 79, moisture: 52, nitrogenLevel: 74, pestRisk: 15, plantedCrop: null, previousCrop: null },
  { id: 'tile-B2', row: 1, col: 1, label: 'B2', soilHealth: 85, moisture: 70, nitrogenLevel: 82, pestRisk: 14, plantedCrop: null, previousCrop: null },
  { id: 'tile-B3', row: 1, col: 2, label: 'B3', soilHealth: 75, moisture: 40, nitrogenLevel: 68, pestRisk: 20, plantedCrop: null, previousCrop: null },
  { id: 'tile-B4', row: 1, col: 3, label: 'B4', soilHealth: 90, moisture: 62, nitrogenLevel: 88, pestRisk: 8, plantedCrop: null, previousCrop: null },
  { id: 'tile-C1', row: 2, col: 0, label: 'C1', soilHealth: 81, moisture: 55, nitrogenLevel: 75, pestRisk: 16, plantedCrop: null, previousCrop: null },
  { id: 'tile-C2', row: 2, col: 1, label: 'C2', soilHealth: 83, moisture: 58, nitrogenLevel: 79, pestRisk: 12, plantedCrop: null, previousCrop: null },
  { id: 'tile-C3', row: 2, col: 2, label: 'C3', soilHealth: 86, moisture: 60, nitrogenLevel: 84, pestRisk: 11, plantedCrop: null, previousCrop: null },
  { id: 'tile-C4', row: 2, col: 3, label: 'C4', soilHealth: 80, moisture: 50, nitrogenLevel: 72, pestRisk: 18, plantedCrop: null, previousCrop: null },
];

export const INITIAL_FARM_DATA = {
  day: 16,
  budget: 650.0,
  season: 'Spring (Active Growth)',
  weather: {
    condition: 'Sunny',
    temperatureC: 24,
    rainfallMm: 0,
    label: 'Sunny & Moderate • 24°C',
  },
  totalHarvestRevenue: 0,
  totalCropsHarvested: 0,
  tiles: INITIAL_TILES,
  logs: [
    {
      id: 'log-init-1',
      day: 16,
      type: 'info',
      message:
        'Farm initialized on Day 16. Plots A1 (Tomato) and A2 (Wheat) are actively growing. 10 fertile plots are ready for planting.',
    },
    {
      id: 'log-init-2',
      day: 16,
      type: 'bio',
      message:
        'Biological advisory: Plot A1 has French Marigolds planted as companion shields, actively repelling root-knot pests.',
    },
  ],
};

export const SEED_PRICES = {
  'crop-tomato': 20,
  'crop-wheat': 15,
  'crop-corn': 25,
  'crop-carrot': 15,
  'crop-rice': 25,
};

export const ACTION_COSTS = {
  irrigation: 10,
  compost: 25,
  neemSpray: 20,
  companionMarigold: 15,
  companionClover: 15,
  clearPlow: 5,
};

/**
 * Dedicated Organic Farming Simulation Engine.
 * Implements deterministic agronomic formulas and validation on the server.
 */
export const simulationEngine = {
  // Fetch active simulation coefficients from database (with fallback)
  async getCoefficients() {
    let config = await SimulationConfig.findOne({ singletonKey: 'default' });
    if (!config) {
      config = await SimulationConfig.create({ singletonKey: 'default' });
    }
    return config;
  },

  // Get or initialize persistent user farm
  async getUserFarm(userId) {
    let farm = await Farm.findOne({ userId });
    if (!farm) {
      farm = await Farm.create({
        userId,
        ...INITIAL_FARM_DATA,
      });
    }
    return farm;
  },

  // Reset user farm to Day 16 baseline
  async resetFarm(userId) {
    await Farm.deleteOne({ userId });
    const freshFarm = await Farm.create({
      userId,
      ...INITIAL_FARM_DATA,
    });
    return freshFarm;
  },

  // Execute a verified agricultural action
  async executeAction(userId, actionType, payload = {}) {
    const farm = await this.getUserFarm(userId);
    const coeffs = await this.getCoefficients();
    const { tileId, cropId, companionType } = payload;

    const tile = farm.tiles.find((t) => t.id === tileId);
    if (!tile && actionType !== 'advanceDay') {
      return { success: false, reason: `Tile '${tileId}' not found.` };
    }

    switch (actionType) {
      case 'plant': {
        if (tile.plantedCrop) {
          return {
            success: false,
            reason: `Plot ${tile.label} is already occupied by ${tile.plantedCrop.name}. Clear or harvest first.`,
          };
        }

        const crop = await Crop.findOne({ cropId });
        if (!crop) {
          return { success: false, reason: `Invalid crop selection '${cropId}'.` };
        }

        const cost = SEED_PRICES[cropId] || 20;
        if (farm.budget < cost) {
          return {
            success: false,
            reason: `Insufficient budget. Planting ${crop.name} costs $${cost.toFixed(2)}, but treasury has $${farm.budget.toFixed(2)}.`,
          };
        }

        const initialHealth = Math.min(
          100,
          Math.max(75, 88 + Math.round((tile.soilHealth - 75) / 3))
        );

        tile.plantedCrop = {
          cropId: crop.cropId,
          name: crop.name,
          daysPlanted: 0,
          stageIndex: 0,
          health: initialHealth,
          companion: null,
          isWaterStressed: false,
          isPestAfflicted: false,
          readyToHarvest: false,
        };

        farm.budget = Math.round((farm.budget - cost) * 100) / 100;
        farm.logs.unshift({
          id: `log-${Date.now()}`,
          day: farm.day,
          type: 'action',
          message: `Planted ${crop.name} seeds in Plot ${tile.label} (-$${cost.toFixed(2)}). Initial vitality: ${initialHealth}%.`,
          timestamp: new Date(),
        });

        await farm.save();
        return {
          success: true,
          farm,
          message: `Successfully seeded ${crop.name} in Plot ${tile.label}!`,
        };
      }

      case 'irrigate': {
        const cost = coeffs.irrigationCost || ACTION_COSTS.irrigation;
        if (farm.budget < cost) {
          return {
            success: false,
            reason: `Insufficient funds for drip irrigation ($${cost.toFixed(2)}).`,
          };
        }

        if (tile.moisture >= 95) {
          return {
            success: false,
            reason: `Plot ${tile.label} soil is fully saturated (${tile.moisture}%). Overwatering causes root anaerobic rot.`,
          };
        }

        const boost = coeffs.irrigationMoistureBoost || 35;
        const newMoisture = Math.min(100, tile.moisture + boost);

        tile.moisture = newMoisture;
        if (tile.plantedCrop) {
          const healthBoost = tile.plantedCrop.isWaterStressed ? 6 : 2;
          tile.plantedCrop.health = Math.min(100, tile.plantedCrop.health + healthBoost);
          tile.plantedCrop.isWaterStressed = false;
        }

        farm.budget = Math.round((farm.budget - cost) * 100) / 100;
        farm.logs.unshift({
          id: `log-${Date.now()}`,
          day: farm.day,
          type: 'action',
          message: `Applied precision drip irrigation to Plot ${tile.label}. Soil moisture rose to ${newMoisture}% (-$${cost.toFixed(2)}).`,
          timestamp: new Date(),
        });

        await farm.save();
        return {
          success: true,
          farm,
          message: `Irrigated Plot ${tile.label} (+${boost}% Moisture).`,
        };
      }

      case 'compost': {
        const cost = coeffs.compostCost || ACTION_COSTS.compost;
        if (farm.budget < cost) {
          return {
            success: false,
            reason: `Insufficient funds for vermicompost application ($${cost.toFixed(2)}).`,
          };
        }

        const healthBoost = coeffs.compostSoilHealthBoost || 16;
        const nitroBoost = coeffs.compostNitrogenBoost || 22;

        tile.soilHealth = Math.min(100, tile.soilHealth + healthBoost);
        tile.nitrogenLevel = Math.min(100, tile.nitrogenLevel + nitroBoost);

        if (tile.plantedCrop) {
          tile.plantedCrop.health = Math.min(100, tile.plantedCrop.health + 5);
        }

        farm.budget = Math.round((farm.budget - cost) * 100) / 100;
        farm.logs.unshift({
          id: `log-${Date.now()}`,
          day: farm.day,
          type: 'action',
          message: `Enriched Plot ${tile.label} with aerated vermicompost. Soil health: ${tile.soilHealth}%, N: ${tile.nitrogenLevel}% (-$${cost.toFixed(2)}).`,
          timestamp: new Date(),
        });

        await farm.save();
        return {
          success: true,
          farm,
          message: `Applied vermicompost to Plot ${tile.label} (+${healthBoost}% Soil Vitality, +${nitroBoost}% N).`,
        };
      }

      case 'neem':
      case 'neemSpray': {
        const cost = coeffs.neemCost || ACTION_COSTS.neemSpray;
        if (farm.budget < cost) {
          return {
            success: false,
            reason: `Insufficient funds for neem biopesticide spray ($${cost.toFixed(2)}).`,
          };
        }

        const pestReduction = coeffs.neemPestReduction || 30;
        const newPest = Math.max(5, tile.pestRisk - pestReduction);

        tile.pestRisk = newPest;
        if (tile.plantedCrop) {
          tile.plantedCrop.isPestAfflicted = false;
          tile.plantedCrop.health = Math.min(100, tile.plantedCrop.health + 4);
        }

        farm.budget = Math.round((farm.budget - cost) * 100) / 100;
        farm.logs.unshift({
          id: `log-${Date.now()}`,
          day: farm.day,
          type: 'action',
          message: `Sprayed cold-pressed neem seed oil on Plot ${tile.label}. Pest hazard dropped to ${newPest}% (-$${cost.toFixed(2)}).`,
          timestamp: new Date(),
        });

        await farm.save();
        return {
          success: true,
          farm,
          message: `Sprayed neem bio-repellent on Plot ${tile.label} (-${pestReduction}% Pest Hazard).`,
        };
      }

      case 'companion': {
        if (!tile.plantedCrop) {
          return {
            success: false,
            reason: `Cannot intercrop on an empty plot. Plant a crop in Plot ${tile.label} first.`,
          };
        }

        if (tile.plantedCrop.companion) {
          return {
            success: false,
            reason: `Plot ${tile.label} already has companion ${tile.plantedCrop.companion.name}.`,
          };
        }

        const cost = 15;
        if (farm.budget < cost) {
          return {
            success: false,
            reason: `Insufficient budget for companion planting ($${cost.toFixed(2)}).`,
          };
        }

        const companionData =
          companionType === 'clover'
            ? { name: 'White Clover', type: 'clover', label: 'Rhizobium N-Fixer' }
            : { name: 'French Marigold', type: 'marigold', label: 'Pest Barrier Shield' };

        if (companionType === 'marigold') {
          tile.pestRisk = Math.max(5, tile.pestRisk - 20);
        } else {
          tile.nitrogenLevel = Math.min(100, tile.nitrogenLevel + 15);
        }

        tile.plantedCrop.companion = companionData;
        farm.budget = Math.round((farm.budget - cost) * 100) / 100;
        farm.logs.unshift({
          id: `log-${Date.now()}`,
          day: farm.day,
          type: 'action',
          message: `Intercropped ${companionData.name} in Plot ${tile.label} alongside ${tile.plantedCrop.name} (-$${cost.toFixed(2)}).`,
          timestamp: new Date(),
        });

        await farm.save();
        return {
          success: true,
          farm,
          message: `Intercropped ${companionData.name} in Plot ${tile.label}!`,
        };
      }

      case 'harvest': {
        if (!tile.plantedCrop) {
          return { success: false, reason: 'No crop on this plot to harvest.' };
        }

        const crop = await Crop.findOne({ cropId: tile.plantedCrop.cropId });
        if (!crop) {
          return { success: false, reason: 'Crop agronomic data missing.' };
        }

        // Strict enforcement of SRS SIM-REQ-11: Prevent premature harvesting
        if (
          !tile.plantedCrop.readyToHarvest &&
          tile.plantedCrop.daysPlanted < crop.minHarvestDay
        ) {
          return {
            success: false,
            reason: `${crop.name} is only at Day ${tile.plantedCrop.daysPlanted}. Harvesting requires at least Day ${crop.minHarvestDay} (SRS SIM-REQ-11 prevents premature harvest).`,
          };
        }

        // Calculate yield based on plant health and soil quality
        const healthFactor = tile.plantedCrop.health / 100;
        const soilFactor = tile.soilHealth / 85;
        const multiplier = coeffs.yieldPlotMultiplier || 0.28;
        const yieldKg = Math.max(
          15,
          Math.round(crop.baseYieldKg * multiplier * healthFactor * soilFactor)
        );
        const grossRevenue = Math.round(yieldKg * crop.marketPricePerKg * 100) / 100;

        // Rotation advisory based on harvested family
        let rotationTip =
          'Follow up with a nitrogen-fixing legume cover crop (clover or beans) to restore depleted organic matter.';
        if (crop.category === 'Cereal Grain') {
          rotationTip =
            'Fibrous roots aerated subsoil compaction. Excellent time to plant root vegetables like carrots.';
        } else if (crop.cropId === 'crop-tomato') {
          rotationTip =
            'Avoid planting other Solanaceae (peppers, potatoes) here next season to prevent soil-borne pathogens.';
        }

        tile.plantedCrop = null;
        tile.previousCrop = crop.name;
        tile.nitrogenLevel = Math.max(40, tile.nitrogenLevel - 15);

        farm.budget = Math.round((farm.budget + grossRevenue) * 100) / 100;
        farm.totalHarvestRevenue =
          Math.round((farm.totalHarvestRevenue + grossRevenue) * 100) / 100;
        farm.totalCropsHarvested += 1;

        farm.logs.unshift({
          id: `log-${Date.now()}`,
          day: farm.day,
          type: 'harvest',
          message: `Harvested Plot ${tile.label} (${crop.name})! Produced ${yieldKg} kg of organic produce (+$${grossRevenue.toFixed(2)}).`,
          timestamp: new Date(),
        });

        // Award +75 XP for successful harvest (SRS GAME-REQ-03)
        await awardUserXp(userId, 75, `Harvested ${crop.name} in Plot ${tile.label}`);
        await User.findByIdAndUpdate(userId, { $addToSet: { unlockedBadges: 'heritage-harvester' } });

        await farm.save();

        return {
          success: true,
          farm,
          harvestData: {
            cropName: crop.name,
            yieldKg,
            marketPrice: crop.marketPricePerKg,
            grossRevenue,
            plotLabel: tile.label,
            rotationTip,
            xpAwarded: 75,
          },
          message: `Harvested ${crop.name}! Reaped ${yieldKg} kg organic yield (+$${grossRevenue.toFixed(2)}).`,
        };
      }

      case 'clear': {
        if (!tile.plantedCrop) {
          return { success: false, reason: 'No crop on this plot to clear.' };
        }

        const cost = ACTION_COSTS.clearPlow;
        if (farm.budget < cost) {
          return {
            success: false,
            reason: `Insufficient budget to plow under plot ($${cost.toFixed(2)}).`,
          };
        }

        const cropName = tile.plantedCrop.name;
        tile.plantedCrop = null;
        tile.previousCrop = `${cropName} (Plowed Fallow)`;

        farm.budget = Math.round((farm.budget - cost) * 100) / 100;
        farm.logs.unshift({
          id: `log-${Date.now()}`,
          day: farm.day,
          type: 'action',
          message: `Plowed under ${cropName} on Plot ${tile.label} to establish biological fallow rest (-$${cost.toFixed(2)}).`,
          timestamp: new Date(),
        });

        await farm.save();
        return {
          success: true,
          farm,
          message: `Plowed and cleared Plot ${tile.label}.`,
        };
      }

      default:
        return { success: false, reason: `Unknown simulation action '${actionType}'.` };
    }
  },

  // Turn Progression: Advance Day by 1 step
  async advanceSimulationDay(userId) {
    const farm = await this.getUserFarm(userId);
    const coeffs = await this.getCoefficients();
    const crops = await Crop.find({});

    const newDay = farm.day + 1;

    // Environmental / Weather cycle simulation
    const weatherPatterns = [
      { condition: 'Sunny & Warm', temperatureC: 25, rainfallMm: 0, label: 'Sunny • 25°C • Low Humidity' },
      { condition: 'Partly Cloudy', temperatureC: 22, rainfallMm: 0, label: 'Partly Cloudy • 22°C • Gentle Breeze' },
      { condition: 'Gentle Rain', temperatureC: 19, rainfallMm: 12, label: 'Gentle Rain • 19°C • Free Natural Hydration' },
      { condition: 'Warm & Humid', temperatureC: 27, rainfallMm: 0, label: 'Warm & Humid • 27°C • Moderate Pest Drift' },
    ];
    const weatherIndex = (newDay + 1) % weatherPatterns.length;
    const isExplicitRain = farm.weather?.condition === 'Rainy' || (farm.weather?.rainfallMm && farm.weather.rainfallMm > 0);
    const currentWeather = isExplicitRain ? farm.weather : weatherPatterns[weatherIndex];
    const isRainy = currentWeather.rainfallMm > 0;

    const warnings = [];

    // Process all 12 plots
    for (const tile of farm.tiles) {
      const evaporation = isRainy
        ? coeffs.rainfallBonus || 18
        : -(coeffs.dailyEvaporationRate || 6);

      if (!tile.plantedCrop) {
        // Fallow soil microbial rest
        tile.soilHealth = Math.min(95, Math.round((tile.soilHealth + 0.5) * 10) / 10);
        tile.moisture = Math.max(10, Math.min(100, Math.round(tile.moisture + evaporation)));
        continue;
      }

      // Crop is planted on this plot
      const cropDef = crops.find((c) => c.cropId === tile.plantedCrop.cropId);
      const dailyWaterUse = cropDef ? Math.round(cropDef.dailyWaterNeed * 0.7) : 10;
      const retentionBonus = tile.soilHealth > 80 ? 0.8 : 1.0;
      const netWaterDelta = isRainy
        ? 18 - dailyWaterUse * 0.5
        : -dailyWaterUse * retentionBonus;

      tile.moisture = Math.max(0, Math.min(100, Math.round(tile.moisture + netWaterDelta)));

      // Pest dynamics
      const hasMarigold = tile.plantedCrop.companion?.type === 'marigold';
      const pestDrift = hasMarigold ? 1 : 3;
      tile.pestRisk = Math.min(90, Math.max(5, tile.pestRisk + pestDrift));

      // Nitrogen dynamics
      const hasClover = tile.plantedCrop.companion?.type === 'clover';
      if (hasClover) {
        tile.nitrogenLevel = Math.min(100, tile.nitrogenLevel + 2.5);
      } else if (cropDef?.cropId === 'crop-corn') {
        tile.nitrogenLevel = Math.max(25, tile.nitrogenLevel - 2);
      } else {
        tile.nitrogenLevel = Math.max(30, tile.nitrogenLevel - 1);
      }

      // Crop age & growth stages
      tile.plantedCrop.daysPlanted += 1;
      const totalGrowthDays = cropDef ? cropDef.baseGrowthDays : 60;
      const stages = cropDef?.growthStages || ['Seedling', 'Vegetative', 'Flowering', 'Harvest'];
      const stageProgress = tile.plantedCrop.daysPlanted / totalGrowthDays;
      tile.plantedCrop.stageIndex = Math.min(
        stages.length - 1,
        Math.floor(stageProgress * stages.length)
      );

      const minHarvest = cropDef?.minHarvestDay || 50;
      const isReadyToHarvest = tile.plantedCrop.daysPlanted >= minHarvest;
      tile.plantedCrop.readyToHarvest = isReadyToHarvest;

      // Biological Health
      let health = tile.plantedCrop.health;
      tile.plantedCrop.isWaterStressed = false;
      tile.plantedCrop.isPestAfflicted = false;

      // Water stress check
      const stressThreshold = coeffs.waterStressThreshold || 20;
      if (tile.moisture < stressThreshold) {
        health = Math.max(15, health - 8);
        tile.plantedCrop.isWaterStressed = true;
        warnings.push(`Plot ${tile.label} (${tile.plantedCrop.name}): Severe root dehydration stress.`);
      } else if (tile.moisture > 90 && cropDef?.cropId !== 'crop-rice') {
        health = Math.max(25, health - 5);
        warnings.push(`Plot ${tile.label} (${tile.plantedCrop.name}): Saturated root waterlogging detected.`);
      }

      // Pest pressure check
      if (tile.pestRisk > 50) {
        health = Math.max(15, health - 6);
        tile.plantedCrop.isPestAfflicted = true;
        warnings.push(`Plot ${tile.label} (${tile.plantedCrop.name}): Insect and pest infestation hazard.`);
      }

      // Soil vitality boost
      if (tile.soilHealth > 80 && !tile.plantedCrop.isWaterStressed && !tile.plantedCrop.isPestAfflicted) {
        health = Math.min(100, health + 2);
      }

      if (isReadyToHarvest && tile.plantedCrop.daysPlanted === minHarvest) {
        warnings.push(`🌾 Plot ${tile.label} (${tile.plantedCrop.name}) reached harvest maturity!`);
      }

      tile.plantedCrop.health = Math.round(health);
    }

    farm.day = newDay;
    farm.weather = currentWeather;

    let logSummary = `Advanced to Day ${newDay}. Weather: ${currentWeather.label}.`;
    if (isRainy) {
      logSummary += ` Free natural rainfall hydrated plots (+18% moisture).`;
    }
    if (warnings.length > 0) {
      logSummary += ` ${warnings.length} advisory alert(s) logged.`;
    }

    farm.logs.unshift({
      id: `log-${Date.now()}`,
      day: newDay,
      type: 'next-day',
      message: logSummary,
      timestamp: new Date(),
    });

    // Cap logs at 50
    if (farm.logs.length > 50) {
      farm.logs = farm.logs.slice(0, 50);
    }

    await farm.save();

    return {
      success: true,
      farm,
      warnings,
    };
  },
};

