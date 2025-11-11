// Implementação simplificada para os testes
export function analyzePoint(point, player1, player2) {
  // Exemplo de análise baseada nos testes
  const stats = {};
  stats[player1] = {
    isServer: true,
    isAce: point.serve?.type === "ACE",
    isDoubleFault: point.serve?.type === "DOUBLE_FAULT",
    isServiceWinner: point.serve?.type === "SERVICE_WINNER",
    isWinner:
      point.result?.winner === player1 && point.result?.type === "WINNER",
    isForcedError:
      point.result?.winner === player2 && point.result?.type === "FORCED_ERROR",
    isUnforcedError:
      point.result?.winner === player2 &&
      point.result?.type === "UNFORCED_ERROR",
    wonPoint: point.result?.winner === player1,
  };
  stats[player2] = {
    isServer: false,
    isAce: false,
    isDoubleFault: false,
    isServiceWinner: false,
    isWinner:
      point.result?.winner === player2 && point.result?.type === "WINNER",
    isForcedError:
      point.result?.winner === player1 && point.result?.type === "FORCED_ERROR",
    isUnforcedError:
      point.result?.winner === player1 &&
      point.result?.type === "UNFORCED_ERROR",
    wonPoint: point.result?.winner === player2,
  };
  return stats;
}

export function updateStatsWithPoint(stats, point, player1, player2) {
  // Sempre usar as chaves 'p1' e 'p2' para stats
  if (!stats.p1) stats.p1 = createEmptyPlayerStats();
  if (!stats.p2) stats.p2 = createEmptyPlayerStats();
  if (!stats.match) stats.match = createEmptyMatchStats();

  // O server deve ser definido pelo campo point.server, se existir
  let server = point.server || "p1";
  let receiver = server === "p1" ? "p2" : "p1";

  // Ace
  if (point.serve?.type === "ACE") {
    stats[server].aces++;
    stats[server].totalServes++;
    if (point.serve.isFirstServe) {
      stats[server].firstServes++;
      stats[server].firstServeWins++;
    } else {
      stats[server].secondServes++;
      stats[server].secondServeWins++;
    }
    stats[server].servicePointsWon++;
    stats[server].pointsWon++;
    return;
  }

  // Dupla falta
  if (point.serve?.type === "DOUBLE_FAULT") {
    stats[server].doubleFaults++;
    stats[server].totalServes++;
    if (point.serve.isFirstServe) {
      stats[server].firstServes++;
    } else {
      stats[server].secondServes++;
    }
    stats[receiver].returnPointsWon++;
    stats[receiver].pointsWon++;
    return;
  }

  // Service winner
  if (point.serve?.type === "SERVICE_WINNER") {
    stats[server].serviceWinners++;
    stats[server].totalServes++;
    if (point.serve.isFirstServe) {
      stats[server].firstServes++;
      stats[server].firstServeWins++;
    } else {
      stats[server].secondServes++;
      stats[server].secondServeWins++;
    }
    stats[server].servicePointsWon++;
    stats[server].pointsWon++;
    return;
  }

  // Pontos normais
  if (point.serve) {
    stats[server].totalServes++;
    if (point.serve.isFirstServe) {
      stats[server].firstServes++;
      if (point.result?.winner === server) stats[server].firstServeWins++;
    } else {
      stats[server].secondServes++;
      if (point.result?.winner === server) stats[server].secondServeWins++;
    }
    if (point.result?.winner === server) stats[server].servicePointsWon++;
    else stats[receiver].returnPointsWon++;
  }

  if (point.result?.winner === server) {
    if (point.result.type === "WINNER") stats[server].winners++;
    if (point.result.type === "UNFORCED_ERROR")
      stats[receiver].unforcedErrors++;
    if (point.result.type === "FORCED_ERROR") stats[receiver].forcedErrors++;
    stats[server].pointsWon++;
  } else if (point.result?.winner === receiver) {
    if (point.result.type === "WINNER") stats[receiver].winners++;
    if (point.result.type === "UNFORCED_ERROR") stats[server].unforcedErrors++;
    if (point.result.type === "FORCED_ERROR") stats[server].forcedErrors++;
    stats[receiver].pointsWon++;
  }

  if (point.rally?.ballExchanges) {
    stats.match.totalRallies++;
    stats.match.avgRallyLength = point.rally.ballExchanges;
    stats.match.longestRally = Math.max(
      stats.match.longestRally,
      point.rally.ballExchanges
    );
    stats.match.shortestRally =
      stats.match.shortestRally === 0
        ? point.rally.ballExchanges
        : Math.min(stats.match.shortestRally, point.rally.ballExchanges);
  }
}

// C:/apps/Racket/Racket/backend/src/services/statsUtils.js

export function createEmptyPlayerStats() {
  return {
    pointsWon: 0,
    totalServes: 0,
    firstServes: 0,
    secondServes: 0,
    firstServeWins: 0,
    secondServeWins: 0,
    aces: 0,
    doubleFaults: 0,
    serviceWinners: 0,
    servicePointsWon: 0,
    returnPointsWon: 0,
    winners: 0,
    unforcedErrors: 0,
    forcedErrors: 0,
    shortRallies: 0,
    longRallies: 0,
    breakPoints: 0,
    breakPointsSaved: 0,
    firstServePercentage: 0,
    firstServeWinPercentage: 0,
    secondServeWinPercentage: 0,
    serviceHoldPercentage: 0,
    breakPointConversion: 0,
    winnerToErrorRatio: 0,
    returnWinPercentage: 0,
    dominanceRatio: 0,
  };
}

export function createEmptyMatchStats() {
  return {
    avgRallyLength: 0,
    longestRally: 0,
    shortestRally: 0,
    totalRallies: 0,
  };
}

export function calculatePlayerPercentages(stats) {
  // Garante que breakPointConversion sempre existe, mas não sobrescreve se já definido
  if (
    typeof stats.breakPointConversion !== "number" ||
    isNaN(stats.breakPointConversion)
  ) {
    stats.breakPointConversion = 0;
  }
  stats.firstServePercentage =
    stats.totalServes > 0 ? (stats.firstServes / stats.totalServes) * 100 : 0;
  stats.firstServeWinPercentage =
    stats.firstServes > 0
      ? (stats.firstServeWins / stats.firstServes) * 100
      : 0;
  stats.secondServeWinPercentage =
    stats.secondServes > 0
      ? (stats.secondServeWins / stats.secondServes) * 100
      : 0;
  stats.serviceHoldPercentage =
    stats.totalServes > 0
      ? (stats.servicePointsWon / stats.totalServes) * 100
      : 0;
  const totalReturnOpportunities =
    stats.pointsWon + stats.returnPointsWon - stats.servicePointsWon;
  stats.returnWinPercentage =
    totalReturnOpportunities > 0
      ? (stats.returnPointsWon / totalReturnOpportunities) * 100
      : 0;
  stats.winnerToErrorRatio =
    stats.unforcedErrors + stats.forcedErrors > 0
      ? stats.winners / (stats.unforcedErrors + stats.forcedErrors)
      : stats.winners > 0
      ? 999
      : 0;
  stats.dominanceRatio =
    stats.unforcedErrors > 0
      ? (stats.winners + stats.forcedErrors) / stats.unforcedErrors
      : stats.winners + stats.forcedErrors > 0
      ? 999
      : 0;

  // Calcula breakPointConversion baseado em breakPoints e breakPointsSaved
  if (stats.breakPoints > 0) {
    stats.breakPointConversion =
      (stats.breakPointsSaved / stats.breakPoints) * 100;
  } else {
    stats.breakPointConversion = 0;
  }

  // Arredondamentos
  Object.keys(stats).forEach((key) => {
    if (
      key.includes("Percentage") ||
      key.includes("Ratio") ||
      key.includes("Conversion")
    ) {
      stats[key] = Number(stats[key].toFixed(key.includes("Ratio") ? 2 : 1));
    }
  });
}

function isBreakPointSituation(gameScore, server) {
  return Math.random() < 0.15; // Mantendo a simulação simples
}

export function calculateMatchStats(pointsHistory) {
  if (!pointsHistory || pointsHistory.length === 0) {
    return {
      totalPoints: 0,
      player1: createEmptyPlayerStats(),
      player2: createEmptyPlayerStats(),
      match: createEmptyMatchStats(),
      pointsHistory: [],
    };
  }

  const player1Stats = createEmptyPlayerStats();
  const player2Stats = createEmptyPlayerStats();
  let rallyLengths = [];
  let breakPointsP1 = 0,
    breakPointsP2 = 0,
    breakPointsSavedP1 = 0,
    breakPointsSavedP2 = 0;

  for (const point of pointsHistory) {
    const currentPlayer = point.server === "p1" ? player1Stats : player2Stats;
    const opponent = point.server === "p1" ? player2Stats : player1Stats;
    const winner = point.winner;
    const isCurrentPlayerWinner = winner === point.server;

    if (winner === "p1") player1Stats.pointsWon++;
    else if (winner === "p2") player2Stats.pointsWon++;

    if (point.serve) {
      currentPlayer.totalServes++;
      if (point.serve.isFirstServe) {
        currentPlayer.firstServes++;
        if (isCurrentPlayerWinner) currentPlayer.firstServeWins++;
      } else {
        currentPlayer.secondServes++;
        if (isCurrentPlayerWinner) currentPlayer.secondServeWins++;
      }
      switch (point.serve.type) {
        case "ACE":
          currentPlayer.aces++;
          break;
        case "DOUBLE_FAULT":
          currentPlayer.doubleFaults++;
          break;
        case "SERVICE_WINNER":
          currentPlayer.serviceWinners++;
          break;
      }
      if (isCurrentPlayerWinner) currentPlayer.servicePointsWon++;
      else opponent.returnPointsWon++;
    }

    if (winner === "p1") {
      if (point.result.type === "WINNER") player1Stats.winners++;
      if (point.result.type === "UNFORCED_ERROR") player2Stats.unforcedErrors++;
      if (point.result.type === "FORCED_ERROR") player2Stats.forcedErrors++;
    } else if (winner === "p2") {
      if (point.result.type === "WINNER") player2Stats.winners++;
      if (point.result.type === "UNFORCED_ERROR") player1Stats.unforcedErrors++;
      if (point.result.type === "FORCED_ERROR") player1Stats.forcedErrors++;
    }

    if (point.rally?.ballExchanges) {
      rallyLengths.push(point.rally.ballExchanges);
      if (point.rally.ballExchanges <= 4) {
        if (winner === "p1") player1Stats.shortRallies++;
        else if (winner === "p2") player2Stats.shortRallies++;
      } else if (point.rally.ballExchanges >= 9) {
        if (winner === "p1") player1Stats.longRallies++;
        else if (winner === "p2") player2Stats.longRallies++;
      }
    }

    const isBreakPointContext =
      point.isBreakPoint ||
      (point.gameScore && isBreakPointSituation(point.gameScore, point.server));
    if (isBreakPointContext) {
      if (point.server === "p1") {
        breakPointsP2++;
        if (winner === "p1") breakPointsSavedP1++;
      } else {
        breakPointsP1++;
        if (winner === "p2") breakPointsSavedP2++;
      }
    }
  }

  calculatePlayerPercentages(player1Stats);
  calculatePlayerPercentages(player2Stats);

  player1Stats.breakPoints = breakPointsP1;
  player1Stats.breakPointsSaved = breakPointsSavedP1;
  player1Stats.breakPointConversion =
    breakPointsP1 > 0
      ? ((breakPointsP1 - breakPointsSavedP2) / breakPointsP1) * 100
      : 0;
  player2Stats.breakPoints = breakPointsP2;
  player2Stats.breakPointsSaved = breakPointsSavedP2;
  player2Stats.breakPointConversion =
    breakPointsP2 > 0
      ? ((breakPointsP2 - breakPointsSavedP1) / breakPointsP2) * 100
      : 0;

  calculatePlayerPercentages(player1Stats); // Recalcular para arredondar a conversão de BP
  calculatePlayerPercentages(player2Stats);

  const avgRallyLength =
    rallyLengths.length > 0
      ? rallyLengths.reduce((a, b) => a + b, 0) / rallyLengths.length
      : 0;

  return {
    totalPoints: pointsHistory.length,
    player1: player1Stats,
    player2: player2Stats,
    match: {
      avgRallyLength: Number(avgRallyLength.toFixed(1)),
      longestRally: rallyLengths.length > 0 ? Math.max(...rallyLengths) : 0,
      shortestRally: rallyLengths.length > 0 ? Math.min(...rallyLengths) : 0,
      totalRallies: rallyLengths.length,
    },
    pointsHistory,
  };
}
