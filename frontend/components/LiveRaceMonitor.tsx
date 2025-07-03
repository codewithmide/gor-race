'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useConnection } from '@solana/wallet-adapter-react';
import { CowboyCard } from './CowboyCard';
import { CowboyButton } from './CowboyButton';
import { RaceTrack } from './RaceTrack';
import { useGorRace } from '@/hooks/useGorRace';
import { HORSE_NAMES } from '@/lib/constants';
import toast from 'react-hot-toast';

interface LiveRaceMonitorProps {
  raceId?: number;
  onRaceComplete?: () => void;
}

export const LiveRaceMonitor: React.FC<LiveRaceMonitorProps> = ({
  raceId,
  onRaceComplete,
}) => {
  const { connection } = useConnection();
  const { getRace, getPlayerEntry, executeRace, claimPrize, publicKey } = useGorRace();
  const [race, setRace] = useState<any>(null);
  const [playerEntry, setPlayerEntry] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [racePhase, setRacePhase] = useState<'waiting' | 'racing' | 'completed'>('waiting');
  const [loading, setLoading] = useState(false);

  // Load race data
  const loadRaceData = async () => {
    if (!raceId) return;
    
    try {
      const raceData = await getRace(raceId);
      setRace(raceData);

      if (publicKey) {
        const entryData = await getPlayerEntry(raceId, publicKey);
        setPlayerEntry(entryData);
      }

      // Determine race phase
      if (raceData) {
        const status = Object.keys(raceData.status)[0];
        setRacePhase(status as any);
      }
    } catch (error) {
      console.error('Failed to load race data:', error);
    }
  };

  // Real-time monitoring
  useEffect(() => {
    if (!raceId) return;

    // Initial load
    loadRaceData();

    // Poll for updates every 5 seconds
    const interval = setInterval(loadRaceData, 5000);

    return () => clearInterval(interval);
  }, [raceId, publicKey]);

  // Countdown timer for race start
  useEffect(() => {
    if (!race || racePhase !== 'waiting') return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const raceStartTime = race.createdAt + race.waitTime;
      const remaining = Math.max(0, raceStartTime - now);
      setTimeLeft(remaining);

      if (remaining === 0 && racePhase === 'waiting') {
        toast.success('Race is ready to start! 🏁');
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [race, racePhase]);

  const handleExecuteRace = async () => {
    if (!raceId) return;

    setLoading(true);
    try {
      const success = await executeRace(raceId);
      if (success) {
        await loadRaceData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClaimPrize = async () => {
    if (!raceId) return;

    setLoading(true);
    try {
      const success = await claimPrize(raceId);
      if (success) {
        await loadRaceData();
        onRaceComplete?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isPlayerWinner = () => {
    if (!race || !playerEntry || !race.winningHorses) return false;
    return race.winningHorses.includes(playerEntry.horseNumber);
  };

  const getPlayerPosition = () => {
    if (!race || !playerEntry || !race.winningHorses) return null;
    const position = race.winningHorses.indexOf(playerEntry.horseNumber);
    return position !== -1 ? position + 1 : null;
  };

  if (!race) {
    return (
      <CowboyCard title="Loading Race..." variant="wood">
        <div className="text-center py-8">
          <div className="spinner-western mx-auto mb-4"></div>
          <p className="font-western text-cowboy-cream">
            Fetching race information from the frontier...
          </p>
        </div>
      </CowboyCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Race Header */}
      <CowboyCard title={`Race #${raceId}`} variant="wood">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-cowboy-gold">{race.entryCount}</div>
            <div className="text-sm font-western text-cowboy-cream">Riders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cowboy-gold">
              {(race.totalPool / 1e9).toFixed(2)} GOR
            </div>
            <div className="text-sm font-western text-cowboy-cream">Prize Pool</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cowboy-gold">
              {racePhase === 'waiting' 
                ? formatTime(timeLeft)
                : racePhase === 'racing' 
                ? 'RACING' 
                : 'FINISHED'
              }
            </div>
            <div className="text-sm font-western text-cowboy-cream">
              {racePhase === 'waiting' ? 'Time to Start' : 'Status'}
            </div>
          </div>
        </div>

        {/* Player Entry Info */}
        {playerEntry && (
          <div className="mt-4 p-4 bg-cowboy-gold/20 rounded-lg border border-cowboy-gold">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-western text-cowboy-cream">Your Horse:</span>
                <span className="ml-2 font-bold text-cowboy-gold">
                  #{playerEntry.horseNumber} {HORSE_NAMES[playerEntry.horseNumber - 1]}
                </span>
              </div>
              {racePhase === 'completed' && (
                <div className="text-right">
                  {isPlayerWinner() ? (
                    <div>
                      <div className="text-lg">
                        {getPlayerPosition() === 1 ? '🥇' : getPlayerPosition() === 2 ? '🥈' : '🥉'}
                      </div>
                      <div className="text-sm font-bold text-cowboy-gold">
                        {getPlayerPosition()}{getPlayerPosition() === 1 ? 'st' : getPlayerPosition() === 2 ? 'nd' : 'rd'} Place!
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-cowboy-cream">Better luck next time!</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CowboyCard>

      {/* Race Track */}
      <CowboyCard title="Race Track" variant="parchment">
        <RaceTrack 
          raceData={race}
          isRacing={racePhase === 'racing'}
          winningHorses={racePhase === 'completed' ? race.winningHorses : []}
        />
      </CowboyCard>

      {/* Race Controls */}
      <CowboyCard title="Race Controls" variant="leather">
        <div className="space-y-4">
          {racePhase === 'waiting' && (
            <div>
              {timeLeft === 0 ? (
                <CowboyButton
                  onClick={handleExecuteRace}
                  loading={loading}
                  className="w-full"
                  size="lg"
                >
                  🏁 Start Race!
                </CowboyButton>
              ) : (
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-4xl mb-2"
                  >
                    ⏰
                  </motion.div>
                  <p className="font-western text-cowboy-cream">
                    Waiting for more riders... Race starts in {formatTime(timeLeft)}
                  </p>
                </div>
              )}
            </div>
          )}

          {racePhase === 'racing' && (
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-4xl mb-2"
              >
                🏇
              </motion.div>
              <p className="font-western text-cowboy-cream">
                The race is underway! Dust is flying and hooves are thundering!
              </p>
              <CowboyButton
                onClick={handleExecuteRace}
                loading={loading}
                variant="secondary"
                className="mt-4"
              >
                🎯 Check for Results
              </CowboyButton>
            </div>
          )}

          {racePhase === 'completed' && playerEntry && (
            <div className="space-y-4">
              {isPlayerWinner() ? (
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 3 }}
                    className="text-6xl mb-4"
                  >
                    🎉
                  </motion.div>
                  <h3 className="text-2xl font-bold text-cowboy-gold mb-2">
                    Yeehaw! You won {getPosition()}!
                  </h3>
                  <p className="font-western text-cowboy-cream mb-4">
                    Time to claim your prize, partner!
                  </p>
                  {Object.keys(playerEntry.claimStatus)[0] === 'unclaimed' ? (
                    <CowboyButton
                      onClick={handleClaimPrize}
                      loading={loading}
                      className="w-full"
                      size="lg"
                    >
                      💰 Claim Prize ({(playerEntry.prizeAmount / 1e9).toFixed(2)} GOR)
                    </CowboyButton>
                  ) : (
                    <div className="text-center p-4 bg-cowboy-gold/20 rounded-lg border border-cowboy-gold">
                      <div className="text-lg">✅ Prize Claimed!</div>
                      <div className="text-sm font-western text-cowboy-cream">
                        {(playerEntry.prizeAmount / 1e9).toFixed(2)} GOR sent to your wallet
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-4xl mb-4">🤠</div>
                  <h3 className="text-xl font-bold text-cowboy-cream mb-2">
                    Good race, partner!
                  </h3>
                  <p className="font-western text-cowboy-cream">
                    Your horse #{playerEntry.horseNumber} gave it their all. 
                    Better luck in the next race!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CowboyCard>

      {/* Race Results */}
      {racePhase === 'completed' && race.winningHorses && (
        <CowboyCard title="Final Results" variant="wood">
          <div className="space-y-3">
            {race.winningHorses.slice(0, 3).map((horseNumber: number, index: number) => (
              <motion.div
                key={horseNumber}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                className="flex items-center justify-between p-3 bg-cowboy-leather/30 rounded-lg border border-cowboy-dark"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </div>
                  <div>
                    <div className="font-bold text-cowboy-gold">
                      #{horseNumber} {HORSE_NAMES[horseNumber - 1]}
                    </div>
                    <div className="text-sm font-western text-cowboy-cream">
                      {index === 0 ? '1st Place' : index === 1 ? '2nd Place' : '3rd Place'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-cowboy-gold">
                    {index === 0 ? '60%' : index === 1 ? '25%' : '15%'}
                  </div>
                  <div className="text-xs font-western text-cowboy-cream">of prize pool</div>
                </div>
              </motion.div>
            ))}
          </div>
        </CowboyCard>
      )}
    </div>
  );

  function getPosition() {
    const pos = getPlayerPosition();
    if (pos === 1) return '1st place';
    if (pos === 2) return '2nd place';
    if (pos === 3) return '3rd place';
    return `${pos}th place`;
  }
};