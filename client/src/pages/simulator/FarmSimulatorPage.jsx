import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { farmSimulationService } from '../../services/farmSimulationService';
import { FarmStatusHUD } from './components/FarmStatusHUD';
import { FarmGrid } from './components/FarmGrid';
import { TileInspector } from './components/TileInspector';
import { PlantingModal } from './components/PlantingModal';
import { HarvestModal } from './components/HarvestModal';
import { ActivityLog } from './components/ActivityLog';

export const FarmSimulatorPage = () => {
  const { isAuthenticated } = useAuth();
  // Pure initializer to prevent cascading renders
  const [farm, setFarm] = useState(() => farmSimulationService.loadFarmState());
  const [selectedTileId, setSelectedTileId] = useState('tile-A1');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [plantingModalOpen, setPlantingModalOpen] = useState(false);
  const [harvestModalData, setHarvestModalData] = useState(null);
  const [notification, setNotification] = useState(null);

  // Sync with MongoDB backend when authenticated
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      farmSimulationService.getFarmStateApi()
        .then((freshFarm) => {
          if (isMounted && freshFarm) {
            setFarm(freshFarm);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Active selected tile object
  const selectedTile = farm.tiles.find((t) => t.id === selectedTileId) || farm.tiles[0];

  const triggerNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Turn Progression: Advance Day
  const handleAdvanceDay = async () => {
    if (isAdvancing) return;
    setIsAdvancing(true);

    if (isAuthenticated) {
      try {
        const result = await farmSimulationService.advanceDayApi();
        if (result.success && result.farm) {
          setFarm(result.farm);
          if (result.warnings && result.warnings.length > 0) {
            triggerNotification(
              `Advanced to Day ${result.farm.day}! ${result.warnings.length} advisory issue(s) need attention.`,
              'warning'
            );
          } else {
            triggerNotification(`Advanced to Day ${result.farm.day}! Plant growth updated.`, 'success');
          }
          setIsAdvancing(false);
          return;
        }
      } catch (err) {
        triggerNotification(err.extractedMessage || 'Server error advancing simulation day.', 'error');
        setIsAdvancing(false);
        return;
      }
    }

    const result = farmSimulationService.advanceDay(farm);
    setFarm(result.farm);

    if (result.warnings && result.warnings.length > 0) {
      triggerNotification(
        `Advanced to Day ${result.farm.day}! ${result.warnings.length} advisory issue(s) need attention.`,
        'warning'
      );
    } else {
      triggerNotification(`Advanced to Day ${result.farm.day}! Plant growth updated.`, 'success');
    }

    setTimeout(() => setIsAdvancing(false), 350);
  };

  // Reset Simulation
  const handleReset = async () => {
    if (window.confirm('Reset virtual farm back to initial Day 16 state? All custom planted plots will be restored to baseline.')) {
      if (isAuthenticated) {
        try {
          const res = await farmSimulationService.resetFarmStateApi();
          if (res.success && res.farm) {
            setFarm(res.farm);
            setSelectedTileId('tile-A1');
            triggerNotification('Farm reset to initial Day 16 baseline state on server.', 'info');
            return;
          }
        } catch (err) {
          triggerNotification(err.extractedMessage || 'Server error resetting farm.', 'error');
          return;
        }
      }

      const pristine = farmSimulationService.resetFarmState();
      setFarm(pristine);
      setSelectedTileId('tile-A1');
      triggerNotification('Farm reset to initial Day 16 baseline state.', 'info');
    }
  };

  // Tile Selection
  const handleSelectTile = (tile) => {
    setSelectedTileId(tile.id);
  };

  // Unified Action Dispatcher (Server authoritative, offline fallback)
  const executeFarmAction = async (actionType, tileId, extraParams = {}, onCustomSuccess = null) => {
    if (isAuthenticated) {
      try {
        const res = await farmSimulationService.performActionApi(actionType, tileId, extraParams);
        if (!res.success) {
          triggerNotification(res.reason || res.message, 'error');
          return;
        }
        setFarm(res.farm);
        if (onCustomSuccess) {
          onCustomSuccess(res);
        } else {
          triggerNotification(res.message, 'success');
        }
        return;
      } catch (err) {
        triggerNotification(err.extractedMessage || 'Server error performing farm action.', 'error');
        return;
      }
    }

    let res;
    if (actionType === 'plant') res = farmSimulationService.plantCrop(farm, tileId, extraParams.cropId);
    else if (actionType === 'irrigate') res = farmSimulationService.irrigateTile(farm, tileId);
    else if (actionType === 'compost') res = farmSimulationService.applyCompost(farm, tileId);
    else if (actionType === 'neem') res = farmSimulationService.applyNeemSpray(farm, tileId);
    else if (actionType === 'companion') res = farmSimulationService.addCompanion(farm, tileId, extraParams.companionType);
    else if (actionType === 'harvest') res = farmSimulationService.harvestCrop(farm, tileId);
    else if (actionType === 'clear') res = farmSimulationService.clearCrop(farm, tileId);

    if (!res || !res.success) {
      triggerNotification(res?.reason || 'Action failed', 'error');
      return;
    }
    setFarm(res.farm);
    if (onCustomSuccess) {
      onCustomSuccess(res);
    } else {
      triggerNotification(res.message, 'success');
    }
  };

  const handleConfirmPlant = (tileId, cropId) => {
    executeFarmAction('plant', tileId, { cropId }, (res) => {
      setPlantingModalOpen(false);
      triggerNotification(res.message, 'success');
    });
  };

  const handleIrrigate = (tileId) => {
    executeFarmAction('irrigate', tileId);
  };

  const handleCompost = (tileId) => {
    executeFarmAction('compost', tileId);
  };

  const handleNeemSpray = (tileId) => {
    executeFarmAction('neem', tileId);
  };

  const handleAddCompanion = (tileId, companionType) => {
    executeFarmAction('companion', tileId, { companionType });
  };

  const handleHarvest = (tileId) => {
    executeFarmAction('harvest', tileId, {}, (res) => {
      setHarvestModalData(res.harvestData);
      triggerNotification(res.message, 'success');
    });
  };

  const handleClearCrop = (tileId) => {
    if (window.confirm('Plow under and clear this plot? The current crop will be removed to create a clean fallow bed.')) {
      executeFarmAction('clear', tileId, {}, (res) => {
        triggerNotification(res.message, 'info');
      });
    }
  };

  return (
    <div className="py-8 sm:py-12 bg-[#FBFBF9] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Floating Notification Toast */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="fixed top-20 right-4 sm:right-8 z-50 max-w-md shadow-xl rounded-2xl p-4 flex items-start gap-3 border text-xs font-semibold backdrop-blur-md bg-white/95"
              style={{
                borderColor:
                  notification.type === 'error'
                    ? '#FCA5A5'
                    : notification.type === 'warning'
                    ? '#FDE68A'
                    : notification.type === 'success'
                    ? '#86EFAC'
                    : '#BAE6FD',
                color:
                  notification.type === 'error'
                    ? '#991B1B'
                    : notification.type === 'warning'
                    ? '#854D0E'
                    : notification.type === 'success'
                    ? '#14532D'
                    : '#075985'
              }}
            >
              <div className="shrink-0 mt-0.5">
                {notification.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : notification.type === 'warning' ? (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                ) : notification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Info className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <div className="flex-1 leading-relaxed">{notification.message}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top HUD Display */}
        <FarmStatusHUD
          farm={farm}
          onAdvanceDay={handleAdvanceDay}
          onReset={handleReset}
          isAdvancing={isAdvancing}
        />

        {/* Main Studio 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left Column: 2D Farm Grid & Biological Activity Ledger */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <FarmGrid
              tiles={farm.tiles}
              selectedTileId={selectedTileId}
              onSelectTile={handleSelectTile}
            />

            <ActivityLog logs={farm.logs} />
          </div>

          {/* Right Column: Selected Plot Inspector & Action Command Deck */}
          <div className="lg:col-span-4 sticky top-24">
            <TileInspector
              tile={selectedTile}
              budget={farm.budget}
              onOpenPlantModal={() => setPlantingModalOpen(true)}
              onIrrigate={handleIrrigate}
              onCompost={handleCompost}
              onNeemSpray={handleNeemSpray}
              onAddCompanion={handleAddCompanion}
              onHarvest={handleHarvest}
              onClearCrop={handleClearCrop}
            />

            {/* Quick Educational Tip Box */}
            <div className="mt-4 bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-4 text-xs text-gray-700">
              <div className="flex items-center gap-1.5 font-bold text-[#065F46] mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Biological Tip of the Day</span>
              </div>
              <p className="leading-relaxed text-gray-600">
                Intercropping French Marigolds alongside nightshades releases natural root polythienyls, reducing root-knot nematode reproduction by over 80% without any synthetic fumigants.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Planting Modal */}
      <PlantingModal
        isOpen={plantingModalOpen}
        tile={selectedTile}
        budget={farm.budget}
        onClose={() => setPlantingModalOpen(false)}
        onConfirmPlant={handleConfirmPlant}
      />

      {/* Harvest Celebratory Modal */}
      <HarvestModal
        isOpen={harvestModalData !== null}
        harvestData={harvestModalData}
        onClose={() => setHarvestModalData(null)}
      />
    </div>
  );
};
