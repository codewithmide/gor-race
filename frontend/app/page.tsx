'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { Navigation } from '@/components/Navigation';
import { CowboyCard } from '@/components/CowboyCard';
import { CowboyButton } from '@/components/CowboyButton';
import { HorseSelector } from '@/components/HorseSelector';
import { COWBOY_MESSAGES } from '@/lib/constants';
import { useProfile } from '@/hooks/useProfile';
import { useRaceManager } from '@/hooks/useRaceManager';

type PageType = 'dashboard' | 'create' | 'join' | 'leaderboard';

export default function Home() {
  const { connected, publicKey } = useWallet();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  
  // Use the profile hook
  const { userProfile, loading, profileLoading, createProfile, createRace } = useProfile();
  
  // Use the race manager hook
  const { 
    currentRace, 
    playerEntry, 
    timeRemaining, 
    racePhase, 
    loading: raceLoading,
    formatTimeRemaining,
    setCurrentRace,
    setRacePhase,
    setTimeRemaining
  } = useRaceManager();

  // Create race state
  const [waitTime, setWaitTime] = useState(60);
  
  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard! 📋');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Join race state
  const [selectedHorse, setSelectedHorse] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState('');

  // Profile creation state
  const [newUsername, setNewUsername] = useState('');

  useEffect(() => {
    if (connected && publicKey) {
      toast.success(`${COWBOY_MESSAGES.welcome}`, {
        icon: '🤠',
      });
    }
  }, [connected, publicKey]);

  // Add this useEffect near your other useEffect hooks
useEffect(() => {
  let timer: NodeJS.Timeout;

  if (currentRace && racePhase === 'waiting') {
    timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        
        // When timer reaches 0
        if (newTime <= 0) {
          clearInterval(timer);
          
          // Check if enough players joined (at least 2 including creator)
          if (currentRace.entryCount >= 2) {
            setRacePhase('racing');
            
            // Simulate race duration (60 seconds)
            setTimeout(() => {
              setRacePhase('completed');
            }, 60000);
          } else {
            // Not enough players - cancel race
            toast.error('Not enough players joined. Race cancelled.');
            setCurrentRace(null);
            setRacePhase(null);
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);
  }

  return () => {
    if (timer) clearInterval(timer);
  };
}, [currentRace, racePhase]);

  // Note: Race persistence removed for simplicity - races are temporary for now

  // Debug effect to track race state changes
  useEffect(() => {
    console.log('📊 Race state changed:', {
      hasCurrentRace: !!currentRace,
      racePhase,
      timeRemaining,
      currentPage
    });
  }, [currentRace, racePhase, timeRemaining, currentPage]);

  const handleCreateProfile = async () => {
    if (!newUsername.trim()) {
      toast.error('Enter a username, partner!');
      return;
    }

    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first!');
      return;
    }

    const success = await createProfile(newUsername.trim());
    if (success) {
      setNewUsername('');
    }
  };

  const handleCreateRace = async () => {
    if (!connected) {
      toast.error(COWBOY_MESSAGES.noWallet);
      return;
    }

    if (!userProfile) {
      toast.error('Create your profile first, partner!');
      return;
    }

    const result = await createRace(waitTime);
    if (result) {
      console.log('🏁 Race created successfully:', result);
      
      // Create race object directly from the creation result
      const newRace = {
        raceId: result.raceId,
        referralCode: result.referralCode,
        creator: publicKey!,
        status: 'Pending' as const,
        startTime: Math.floor(Date.now() / 1000),
        waitTime: waitTime,
        entryCount: 1, // Creator is the first entry
        totalPool: 0, // Will be updated as players join
        winningHorses: [],
        horseNames: []
      };
      
      // Set the race data directly - no need to fetch from blockchain
      setCurrentRace(newRace);
      setRacePhase('waiting');
      
      // Calculate and set initial timer
      const raceStartTime = newRace.startTime + newRace.waitTime;
      const now = Math.floor(Date.now() / 1000);
      const remaining = raceStartTime - now;
      setTimeRemaining(Math.max(0, remaining));
      
      console.log('✅ Race data set directly:', { newRace, timeRemaining: remaining });
      
      // STAY ON CREATE PAGE - DON'T NAVIGATE AWAY
    }
  };

  const handleJoinRace = async () => {
    if (!connected) {
      toast.error(COWBOY_MESSAGES.noWallet);
      return;
    }

    if (!userProfile) {
      toast.error('Create your profile first, partner!');
      return;
    }

    if (!selectedHorse || !referralCode) {
      toast.error('Please select a horse and enter the referral code!');
      return;
    }

    // TODO: Implement race joining
    toast.success('Race joining coming soon!');
  };

  const renderProfileCreation = () => (
    <CowboyCard title="Welcome to the Frontier!" subtitle="Create your cowboy profile" variant="parchment" className="max-w-md mx-auto">
      <div className="space-y-4">
        <div className="text-center text-6xl mb-4">🤠</div>
        <p className="font-western text-cowboy-dark text-center">
          Howdy, partner! Before you can join the races, you'll need to create your cowboy profile.
        </p>
        <div>
          <label className="block font-western text-cowboy-dark mb-2">
            Choose your cowboy name:
          </label>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter your username..."
            className="w-full p-3 border-2 border-cowboy-leather rounded-lg bg-white text-cowboy-dark font-western"
            maxLength={32}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
          />
        </div>
        <CowboyButton
          onClick={handleCreateProfile}
          loading={loading}
          className="w-full"
          size="lg"
          disabled={!newUsername.trim()}
        >
          🤠 Create Profile
        </CowboyButton>
      </div>
    </CowboyCard>
  );

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Race Status Display */}
      {currentRace && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {racePhase === 'waiting' && (
            <CowboyCard title="🏁 Race Starting Soon!" variant="wood" className="max-w-2xl mx-auto">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-pulse">🕰️</div>
                  <div className="text-4xl font-bold text-cowboy-gold mb-2">
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                  <p className="font-western text-cowboy-cream">
                    Time remaining for players to join!
                  </p>
                </div>
                <div className="bg-cowboy-gold/20 p-4 rounded-lg border border-cowboy-gold space-y-2">
                  <div className="flex justify-between">
                    <span className="font-western text-cowboy-cream">Referral Code:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cowboy-gold text-lg">{currentRace.referralCode}</span>
                      <button
                        onClick={() => copyToClipboard(currentRace.referralCode)}
                        className="text-cowboy-gold hover:text-cowboy-cream transition-colors"
                        title="Copy Race ID"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-western text-cowboy-cream">Players Joined:</span>
                    <span className="font-bold text-cowboy-gold">{currentRace.entryCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-western text-cowboy-cream">Total Pool:</span>
                    <span className="font-bold text-cowboy-gold">{(currentRace.totalPool / 1e9).toFixed(2)} GOR</span>
                  </div>
                </div>
              </div>
            </CowboyCard>
          )}
          
          {racePhase === 'racing' && (
            <CowboyCard title="🏇 Race in Progress!" variant="leather" className="max-w-2xl mx-auto">
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4 animate-bounce">🐎</div>
                <p className="font-western text-cowboy-cream text-lg">
                  The horses are running! Results coming soon...
                </p>
                <div className="animate-pulse text-cowboy-gold">
                  🏁 Racing in progress... 🏁
                </div>
              </div>
            </CowboyCard>
          )}
          
          {racePhase === 'completed' && playerEntry && (
            <CowboyCard title="🏆 Race Complete!" variant="wood" className="max-w-2xl mx-auto">
              <div className="space-y-4">
                <div className="text-center">
                  {currentRace.winningHorses.includes(playerEntry.horseNumber) ? (
                    <div>
                      <div className="text-6xl mb-4">🏆</div>
                      <h3 className="text-2xl font-bold text-cowboy-gold mb-2">
                        Congratulations! You won!
                      </h3>
                      <p className="font-western text-cowboy-cream mb-4">
                        Your horse #{playerEntry.horseNumber} finished in the top 3!
                      </p>
                      {playerEntry.claimStatus === 'Unclaimed' && (
                        <CowboyButton
                          onClick={() => toast.success('Prize claiming coming soon!')}
                          loading={raceLoading}
                          className="w-full"
                          size="lg"
                        >
                          💰 Claim Your Prize ({(playerEntry.prizeAmount / 1e9).toFixed(4)} GOR)
                        </CowboyButton>
                      )}
                      {playerEntry.claimStatus === 'Claimed' && (
                        <div className="text-cowboy-gold font-bold">
                          ✅ Prize Already Claimed!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="text-6xl mb-4">😔</div>
                      <h3 className="text-xl font-bold text-cowboy-cream mb-2">
                        Better luck next time, partner!
                      </h3>
                      <p className="font-western text-cowboy-cream">
                        Your horse #{playerEntry.horseNumber} didn't place in the top 3.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-cowboy-leather/20 p-4 rounded-lg">
                  <h4 className="font-bold text-cowboy-gold mb-2">Race Results:</h4>
                  <div className="space-y-1">
                    {currentRace.winningHorses.map((horse, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="font-western text-cowboy-cream">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {index + 1}st Place:
                        </span>
                        <span className="font-bold text-cowboy-gold">
                          Horse #{horse} - {currentRace.horseNames[horse - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <CowboyButton
                  onClick={() => {
                    setCurrentRace(null);
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Back to Salon
                </CowboyButton>
              </div>
            </CowboyCard>
          )}
        </motion.div>
      )}
      

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="font-cowboy text-4xl md:text-6xl font-bold text-cowboy-gold text-shadow-western mb-4">
          Welcome to the Frontier!
        </h1>
        <p className="font-western text-lg text-cowboy-cream max-w-2xl mx-auto">
          The wildest horse racing saloon in the digital frontier. Place your bets, choose your steed, and may the fastest horse win!
        </p>
      </motion.div>

      {/* Profile Section */}
      {connected && userProfile ? (
        <div className="grid md:grid-cols-2 gap-8">
          {/* User Stats */}
          <CowboyCard title="Your Ranch" variant="leather">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-western text-cowboy-cream">Username:</span>
                <span className="font-bold text-cowboy-gold">🤠 {userProfile.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-western text-cowboy-cream">Total Races:</span>
                <span className="font-bold text-cowboy-gold">{userProfile.totalRaces}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-western text-cowboy-cream">Victories:</span>
                <span className="font-bold text-cowboy-gold">{userProfile.totalWins} 🏆</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-western text-cowboy-cream">Total Earnings:</span>
                <span className="font-bold text-cowboy-gold">{(userProfile.totalEarnings / 1e9).toFixed(2)} GOR 💰</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-western text-cowboy-cream">Win Rate:</span>
                <span className="font-bold text-cowboy-gold">
                  {userProfile.totalRaces > 0 ? ((userProfile.totalWins / userProfile.totalRaces) * 100).toFixed(1) : '0'}% 📈
                </span>
              </div>
            </div>
          </CowboyCard>

          {/* Quick Actions */}
          <CowboyCard title="Quick Draw Actions" variant="wood">
            <div className="space-y-4">
              <CowboyButton 
                onClick={() => setCurrentPage('create')}
                className="w-full"
                size="lg"
              >
                🏇 Start New Race
              </CowboyButton>
              <CowboyButton 
                onClick={() => setCurrentPage('join')}
                variant="secondary"
                className="w-full"
                size="lg"
              >
                🎯 Join Existing Race
              </CowboyButton>
              <CowboyButton 
                onClick={() => setCurrentPage('leaderboard')}
                variant="secondary"
                className="w-full"
                size="lg"
              >
                🏆 View Hall of Fame
              </CowboyButton>
            </div>
          </CowboyCard>
        </div>
      ) : connected && profileLoading ? (
        <div className="text-center">
          <CowboyCard title="Loading your profile..." variant="parchment" className="max-w-md mx-auto">
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">🤠</div>
              <div className="spinner-western mx-auto"></div>
              <p className="font-western text-cowboy-dark">
                Checking if you're already registered at our saloon...
              </p>
            </div>
          </CowboyCard>
        </div>
      ) : connected && !userProfile ? (
        renderProfileCreation()
      ) : (
        <CowboyCard title="Connect Your Wallet" variant="parchment" className="max-w-md mx-auto">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🤠</div>
            <p className="font-western text-cowboy-dark">
              Partner, you'll need to connect your wallet to join the fun at our saloon!
            </p>
          </div>
        </CowboyCard>
      )}
    </div>
  );

  const renderCreateRace = () => (
    <div className="max-w-2xl mx-auto">
      {/* Show race status if there is an active race - REPLACES EVERYTHING */}
      {currentRace ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {racePhase === 'waiting' && (
            <CowboyCard title="🏁 Your Race is Ready!" variant="wood">
              <div className="space-y-6">
                {/* BOLD PROMINENT TIMER */}
                <div className="text-center">
                  <div className="text-8xl mb-6 animate-pulse">🕰️</div>
                  <div className="text-7xl font-black text-cowboy-gold mb-4 text-shadow-western">
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                  <p className="font-western text-cowboy-cream text-xl font-bold">
                    Time remaining for players to join!
                  </p>
                </div>
                
                {/* RACE DETAILS */}
                <div className="bg-cowboy-gold/20 p-6 rounded-lg border-2 border-cowboy-gold space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-western text-cowboy-cream text-lg">Referral Code:</span>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-cowboy-gold text-2xl">{currentRace.referralCode}</span>
                      <button
                        onClick={() => copyToClipboard(currentRace.referralCode)}
                        className="text-cowboy-gold hover:text-cowboy-cream transition-colors text-2xl"
                        title="Copy Race ID"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-western text-cowboy-cream text-lg">Players Joined:</span>
                    <span className="font-bold text-cowboy-gold text-xl">{currentRace.entryCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-western text-cowboy-cream text-lg">Total Pool:</span>
                    <span className="font-bold text-cowboy-gold text-xl">{(currentRace.totalPool / 1e9).toFixed(2)} GOR</span>
                  </div>
                </div>
                
                <div className="text-center bg-cowboy-leather/20 p-4 rounded-lg">
                  <p className="font-western text-cowboy-cream text-lg font-bold">
                    🤠 Share your referral code with other cowboys! 🤠
                  </p>
                  <p className="font-western text-cowboy-tan mt-2">
                    The race will start automatically when the timer ends
                  </p>
                </div>
              </div>
            </CowboyCard>
          )}
          
          {racePhase === 'racing' && (
            <CowboyCard title="🏇 Race in Progress!" variant="leather">
              <div className="text-center space-y-6">
                <div className="text-8xl mb-6 animate-bounce">🐎</div>
                <p className="font-western text-cowboy-cream text-2xl font-bold">
                  The horses are running!
                </p>
                <p className="font-western text-cowboy-cream text-lg">
                  Results coming soon...
                </p>
                <div className="animate-pulse text-cowboy-gold text-xl font-bold">
                  🏁 Racing in progress... 🏁
                </div>
              </div>
            </CowboyCard>
          )}
          
          {racePhase === 'completed' && (
            <CowboyCard title="🏆 Race Complete!" variant="wood">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-8xl mb-6">🏆</div>
                  <h3 className="text-3xl font-black text-cowboy-gold mb-4">
                    Race Finished!
                  </h3>
                  <p className="font-western text-cowboy-cream text-lg">
                    Check the salon tab to see if you won and claim your prize!
                  </p>
                </div>
                
                <div className="bg-cowboy-leather/20 p-6 rounded-lg">
                  <h4 className="font-bold text-cowboy-gold mb-4 text-xl">🏁 Race Results:</h4>
                  <div className="space-y-2">
                    {currentRace.winningHorses.map((horse, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="font-western text-cowboy-cream text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {index + 1}st Place:
                        </span>
                        <span className="font-bold text-cowboy-gold text-lg">
                          Horse #{horse} - {currentRace.horseNames[horse - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <CowboyButton
                  onClick={() => {
                    setCurrentRace(null);
                  }}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                >
                  🏇 Create New Race
                </CowboyButton>
              </div>
            </CowboyCard>
          )}
        </motion.div>
      ) : (
        <CowboyCard title="Start a New Race" subtitle="Set up the corral for other cowboys" variant="wood">
          <div className="space-y-6">
            <div>
              <label className="block font-western text-cowboy-cream mb-2">
                Wait Time (seconds):
              </label>
              <input
                type="number"
                value={waitTime}
                onChange={(e) => setWaitTime(parseInt(e.target.value) || 60)}
                className="w-full p-3 border-2 border-cowboy-leather rounded-lg bg-cowboy-cream text-cowboy-dark font-western"
                min="30"
                max="180"
              />
              <p className="text-sm text-cowboy-tan mt-1">
                How long others have to join before the race starts
              </p>
            </div>

            <div className="bg-cowboy-gold/20 p-4 rounded-lg border border-cowboy-gold">
              <h4 className="font-bold text-cowboy-gold mb-2">🎯 Race Details:</h4>
              <ul className="space-y-1 font-western text-sm text-cowboy-cream">
                <li>• Entry Fee: 0.1 GOR per player</li>
                <li>• Platform Fee: 5% of total pool</li>
                <li>• 🥇 1st Place: 50% of total pool</li>
                <li>• 🥈 2nd Place: 30% of total pool</li>
                <li>• 🥉 3rd Place: 15% of total pool</li>
                <li>• 🅰️ Auto-execute when timer ends</li>
                <li>• 🏁 60-second race simulation</li>
              </ul>
            </div>

            <CowboyButton
              onClick={handleCreateRace}
              loading={loading}
              className="w-full"
              size="lg"
            >
              🏇 Create Race & Pay Entry Fee
            </CowboyButton>
          </div>
        </CowboyCard>
      )}
    </div>
  );

  const renderJoinRace = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <CowboyCard title="Join an Existing Race" subtitle="Mount up and join the action" variant="leather">
        <div className="space-y-6">
          <div>
            <label className="block font-western text-cowboy-cream mb-2">
              Referral Code:
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Enter referral code..."
              className="w-full p-3 border-2 border-cowboy-dark rounded-lg bg-cowboy-cream text-cowboy-dark font-western"
              maxLength={8}
            />
            <p className="text-sm text-cowboy-tan mt-1">
              Get this code from the race creator
            </p>
          </div>
        </div>
      </CowboyCard>

      <CowboyCard variant="parchment">
        <HorseSelector
          selectedHorse={selectedHorse}
          onSelectHorse={setSelectedHorse}
          disabled={loading}
        />
      </CowboyCard>

      <CowboyButton
        onClick={handleJoinRace}
        loading={loading}
        className="w-full"
        size="lg"
        disabled={!selectedHorse || !referralCode}
      >
        🎯 Join Race & Pay Entry Fee (0.1 GOR)
      </CowboyButton>
    </div>
  );

  const renderLeaderboard = () => (
    <div className="max-w-4xl mx-auto">
      <CowboyCard title="Hall of Fame" subtitle="The finest cowboys and cowgirls in the frontier" variant="wood">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((rank) => (
            <motion.div
              key={rank}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rank * 0.1 }}
              className="flex items-center justify-between p-4 bg-cowboy-leather/30 rounded-lg border border-cowboy-dark"
            >
              <div className="flex items-center space-x-4">
                <div className="text-2xl">
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅'}
                </div>
                <div>
                  <div className="font-bold text-cowboy-gold">Cowboy #{rank}</div>
                  <div className="text-sm text-cowboy-cream font-western">
                    {Math.floor(Math.random() * 100)} races • {Math.floor(Math.random() * 50)} wins
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-cowboy-gold">{(Math.random() * 100).toFixed(1)} GOR</div>
                <div className="text-sm text-cowboy-cream font-western">Total Earnings</div>
              </div>
            </motion.div>
          ))}
        </div>
      </CowboyCard>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'create':
        return renderCreateRace();
      case 'join':
        return renderJoinRace();
      case 'leaderboard':
        return renderLeaderboard();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      
      <main className="container mx-auto px-4 py-8">
        {renderCurrentPage()}
      </main>

      {/* Floating western decorations */}
      <div className="fixed bottom-4 left-4 text-2xl opacity-30 animate-swing">
        🐎
      </div>
      <div className="fixed bottom-4 right-4 text-2xl opacity-30 animate-swing" style={{ animationDelay: '1s' }}>
        🤠
      </div>
    </div>
  );
}