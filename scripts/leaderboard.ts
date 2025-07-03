import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GorRace } from "../target/types/gor_race";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

interface PlayerStats {
  address: string;
  username: string;
  totalRaces: number;
  totalWins: number;
  totalPodiums: number;
  totalEarnings: number;
  winRate: number;
  podiumRate: number;
  score: number; // Calculated ranking score
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GorRace as Program<GorRace>;

  // Get command line arguments
  const args = process.argv.slice(2);
  const sortBy = args[0] || "score"; // Default to score
  const limit = parseInt(args[1]) || 10; // Default to top 10

  console.log("🏆 GOR Race Leaderboard");
  console.log("=".repeat(50));

  try {
    // Fetch all player profiles
    const playerProfiles = await program.account.playerProfile.all();
    
    if (playerProfiles.length === 0) {
      console.log("📭 No player profiles found yet!");
      console.log("💡 Create your profile with: npm run create-profile <username>");
      return;
    }

    // Process and calculate stats
    const playerStats: PlayerStats[] = playerProfiles.map(profile => {
      const account = profile.account;
      const winRate = account.totalRaces > 0 ? (account.totalWins / account.totalRaces) * 100 : 0;
      const podiumRate = account.totalRaces > 0 ? (account.totalPodiums / account.totalRaces) * 100 : 0;
      
      // Calculate ranking score (weighted combination of different metrics)
      const score = calculateScore(
        account.totalWins,
        account.totalPodiums,
        account.totalRaces,
        account.totalEarnings.toNumber()
      );

      return {
        address: account.player.toString(),
        username: account.username,
        totalRaces: account.totalRaces,
        totalWins: account.totalWins,
        totalPodiums: account.totalPodiums,
        totalEarnings: account.totalEarnings.toNumber(),
        winRate: winRate,
        podiumRate: podiumRate,
        score: score
      };
    });

    // Sort based on criteria
    let sortedStats: PlayerStats[];
    switch (sortBy.toLowerCase()) {
      case "wins":
        sortedStats = playerStats.sort((a, b) => b.totalWins - a.totalWins);
        break;
      case "races":
        sortedStats = playerStats.sort((a, b) => b.totalRaces - a.totalRaces);
        break;
      case "earnings":
        sortedStats = playerStats.sort((a, b) => b.totalEarnings - a.totalEarnings);
        break;
      case "winrate":
        sortedStats = playerStats.sort((a, b) => b.winRate - a.winRate);
        break;
      case "podiums":
        sortedStats = playerStats.sort((a, b) => b.totalPodiums - a.totalPodiums);
        break;
      default: // "score"
        sortedStats = playerStats.sort((a, b) => b.score - a.score);
    }

    // Display leaderboard
    console.log(`📊 Sorted by: ${sortBy.toUpperCase()}`);
    console.log(`👥 Showing top ${Math.min(limit, sortedStats.length)} players\n`);

    // Header
    console.log("Rank | Username               | Wins | Races | Earnings | Win%  | Podium% | Score");
    console.log("-".repeat(85));

    // Display top players
    sortedStats.slice(0, limit).forEach((player, index) => {
      const rank = getRankEmoji(index + 1);
      const username = player.username.substring(0, 20).padEnd(20);
      const wins = player.totalWins.toString().padStart(4);
      const races = player.totalRaces.toString().padStart(5);
      const earnings = (player.totalEarnings / anchor.web3.LAMPORTS_PER_SOL).toFixed(2).padStart(8);
      const winRate = player.winRate.toFixed(1).padStart(4);
      const podiumRate = player.podiumRate.toFixed(1).padStart(6);
      const score = player.score.toFixed(0).padStart(5);

      console.log(`${rank}${index + 1}   | ${username} | ${wins} | ${races} | ${earnings} | ${winRate}% | ${podiumRate}% | ${score}`);
    });

    console.log("\n" + "-".repeat(85));
    console.log(`📈 Total players: ${playerStats.length}`);
    console.log(`🎯 Active players: ${playerStats.filter(p => p.totalRaces > 0).length}`);
    console.log(`🏆 Winners: ${playerStats.filter(p => p.totalWins > 0).length}`);

    // Show usage info
    console.log("\n💡 Usage:");
    console.log("npm run leaderboard [sort] [limit]");
    console.log("Sort options: score (default), wins, races, earnings, winrate, podiums");
    console.log("Example: npm run leaderboard wins 20");

  } catch (error) {
    console.error("❌ Error fetching leaderboard:", error);
    process.exit(1);
  }
}

function calculateScore(wins: number, podiums: number, races: number, earnings: number): number {
  // Weighted scoring system
  const winWeight = 10;      // 10 points per win
  const podiumWeight = 3;    // 3 points per podium
  const raceWeight = 1;      // 1 point per race participation
  const earningsWeight = 1;  // 1 point per GOR earned (scaled)
  
  const baseScore = (wins * winWeight) + (podiums * podiumWeight) + (races * raceWeight);
  const earningsScore = (earnings / anchor.web3.LAMPORTS_PER_SOL) * earningsWeight;
  
  // Bonus for consistency (higher multiplier for players with good win rates and significant activity)
  let consistencyBonus = 1.0;
  if (races >= 10) {
    const winRate = wins / races;
    if (winRate >= 0.3) consistencyBonus = 1.5;      // 30%+ win rate
    else if (winRate >= 0.2) consistencyBonus = 1.3; // 20%+ win rate
    else if (winRate >= 0.1) consistencyBonus = 1.1; // 10%+ win rate
  }
  
  return Math.floor((baseScore + earningsScore) * consistencyBonus);
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return "🥇";
    case 2: return "🥈";
    case 3: return "🥉";
    case 4: return "🏅";
    case 5: return "🏅";
    default: return "  ";
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });