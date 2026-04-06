/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Game } from './game/Game';
import { Upgrade, getRandomUpgrades } from './game/Upgrades';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [maxXp, setMaxXp] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [gameInstance, setGameInstance] = useState<Game | null>(null);
  
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [upgradeChoices, setUpgradeChoices] = useState<Upgrade[]>([]);

  useEffect(() => {
    if (!hasStarted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Set canvas size to window size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const game = new Game(
      canvas,
      (finalScore) => {
        setGameOver(true);
      },
      (newScore, newMultiplier, newLives, newLevel, newXp, newMaxXp) => {
        setScore(newScore);
        setMultiplier(newMultiplier);
        setLives(newLives);
        setLevel(newLevel);
        setXp(newXp);
        setMaxXp(newMaxXp);
      },
      () => {
        setUpgradeChoices(getRandomUpgrades(3));
        setShowLevelUp(true);
      }
    );
    
    setGameInstance(game);
    game.start();

    return () => {
      window.removeEventListener('resize', resize);
      game.destroy();
    };
  }, [hasStarted]);

  const handleRestart = () => {
    setGameOver(false);
    setShowLevelUp(false);
    setScore(0);
    setMultiplier(1);
    setLives(3);
    setLevel(1);
    setXp(0);
    setMaxXp(100);
    if (gameInstance) {
      gameInstance.destroy();
    }
    
    if (canvasRef.current) {
      const game = new Game(
        canvasRef.current,
        (finalScore) => {
          setGameOver(true);
        },
        (newScore, newMultiplier, newLives, newLevel, newXp, newMaxXp) => {
          setScore(newScore);
          setMultiplier(newMultiplier);
          setLives(newLives);
          setLevel(newLevel);
          setXp(newXp);
          setMaxXp(newMaxXp);
        },
        () => {
          setUpgradeChoices(getRandomUpgrades(3));
          setShowLevelUp(true);
        }
      );
      setGameInstance(game);
      game.start();
    }
  };

  const handleUpgradeSelect = (upgrade: Upgrade) => {
    if (gameInstance) {
      gameInstance.applyUpgrade(upgrade.id);
      gameInstance.isPaused = false;
    }
    setShowLevelUp(false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-mono">
      {!hasStarted ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50">
          <h1 className="text-6xl font-bold text-cyan-400 mb-8 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">GEOMETRY WARS</h1>
          <button 
            onClick={() => setHasStarted(true)}
            className="px-8 py-3 bg-transparent border-2 border-cyan-400 text-cyan-400 font-bold rounded hover:bg-cyan-400 hover:text-black transition-colors duration-200"
          >
            START GAME
          </button>
        </div>
      ) : (
        <>
          <canvas ref={canvasRef} className="absolute inset-0 block cursor-none" />
          
          {/* HUD */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
              {score.toLocaleString()}
            </div>
            <div className="text-xl text-yellow-400 drop-shadow-[0_0_8px_rgba(255,255,0,0.8)]">
              x{multiplier}
            </div>
            <div className="text-xl text-red-400 drop-shadow-[0_0_8px_rgba(255,0,0,0.8)] mt-2">
              Lives: {lives}
            </div>
          </div>

          <div className="absolute top-4 right-4 pointer-events-none text-right text-sm text-gray-400">
            <p>WASD / Arrows to Move</p>
            <p>Mouse / IJKL to Shoot</p>
          </div>

          {/* XP Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-1/2 max-w-2xl pointer-events-none">
            <div className="text-center text-cyan-400 font-bold mb-2 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
              LEVEL {level}
            </div>
            <div className="w-full h-4 bg-gray-900 border-2 border-gray-700 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-cyan-400 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(0,255,255,0.8)]"
                style={{ width: `${(xp / maxXp) * 100}%` }}
              />
            </div>
            <div className="text-center text-xs text-gray-400 mt-1">
              {xp} / {maxXp} XP
            </div>
          </div>

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50">
              <h1 className="text-6xl font-bold text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">GAME OVER</h1>
              <p className="text-2xl mb-8">Final Score: <span className="text-cyan-400">{score.toLocaleString()}</span></p>
              <button 
                onClick={handleRestart}
                className="px-8 py-3 bg-transparent border-2 border-cyan-400 text-cyan-400 font-bold rounded hover:bg-cyan-400 hover:text-black transition-colors duration-200"
              >
                PLAY AGAIN
              </button>
            </div>
          )}

          {/* Level Up Screen */}
          {showLevelUp && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50">
              <h1 className="text-5xl font-bold text-yellow-400 mb-8 drop-shadow-[0_0_15px_rgba(255,255,0,0.8)]">LEVEL UP!</h1>
              <p className="text-xl mb-8 text-gray-300">Choose an upgrade:</p>
              
              <div className="flex gap-6 max-w-4xl px-4">
                {upgradeChoices.map((upgrade) => (
                  <button
                    key={upgrade.id}
                    onClick={() => handleUpgradeSelect(upgrade)}
                    className="flex flex-col items-center p-6 bg-gray-900 border-2 rounded-xl transition-all duration-200 hover:scale-105 hover:bg-gray-800 flex-1"
                    style={{ borderColor: upgrade.color, boxShadow: `0 0 15px ${upgrade.color}40` }}
                  >
                    <h3 className="text-2xl font-bold mb-4 text-center" style={{ color: upgrade.color }}>
                      {upgrade.name}
                    </h3>
                    <p className="text-gray-300 text-center">
                      {upgrade.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
