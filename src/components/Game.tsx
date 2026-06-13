import React, { useState, useEffect, useCallback } from 'react';
import { GameMap, Cell } from '../utils/generator';
import { ChatMessage } from './Chat';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Scan, Radio, Target, Eye } from 'lucide-react';
import { LootItem } from '../App';

interface GameProps {
  initialMap: GameMap;
  onAddMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  onEndGame: () => void;
  stashLoot: LootItem[];
  artifactLoot: LootItem[];
  isGM?: boolean;
  onUpdateMap?: (newMap: GameMap) => void;
}

export function Game({ initialMap, onAddMessage, onEndGame, stashLoot, artifactLoot, isGM = true, onUpdateMap }: GameProps) {
  // Use initialMap as truth if onUpdateMap is provided, otherwise keep local state (fallback)
  const map = initialMap;
  const [playerPos, setPlayerPos] = useState({ x: initialMap.entrance.x, y: initialMap.entrance.y });
  const [boltMode, setBoltMode] = useState(false);

  // Sync back to parent
  const internalSetMap = useCallback((newMap: GameMap) => {
    if (onUpdateMap) onUpdateMap(newMap);
  }, [onUpdateMap]);

  const revealCell = useCallback((x: number, y: number, currentMap: GameMap) => {
    const newGrid = [...currentMap.grid];
    newGrid[y] = [...newGrid[y]];
    newGrid[y][x] = { ...newGrid[y][x], isRevealed: true };
    return { ...currentMap, grid: newGrid };
  }, []);

  const getWeightedLoot = (lootTable: LootItem[]) => {
    if (lootTable.length === 0) return 'Ничего';
    const totalWeight = lootTable.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of lootTable) {
      random -= item.weight;
      if (random <= 0) return item.name;
    }
    return lootTable[lootTable.length - 1].name;
  };

  const handleCellEnter = useCallback((x: number, y: number, currentMap: GameMap) => {
    let updatedMap = revealCell(x, y, currentMap);
    const cell = updatedMap.grid[y][x];
    let newPos = { x, y };

    if (cell.type === 'exit') {
      onAddMessage({ text: "Группа успешно покинула аномальную зону!", type: 'success' });
      onEndGame();
      return { updatedMap, newPos };
    }

    if (cell.type === 'stash') {
      const loot = getWeightedLoot(stashLoot);
      onAddMessage({ text: `Найден схрон! Получено: ${loot}`, type: 'loot' });
      updatedMap.grid[y][x] = { ...cell, type: 'empty', isRevealed: true };
    }

    if (cell.type === 'artifact') {
      const loot = getWeightedLoot(artifactLoot);
      onAddMessage({ text: `Найден артефакт! Получено: ${loot}`, type: 'loot' });
      updatedMap.grid[y][x] = { ...cell, type: 'empty', isRevealed: true };
    }

    if (cell.type === 'anomaly') {
      switch (cell.anomalyType) {
        case 'fire':
          onAddMessage({ text: "Вы активировали огненную аномалию! Столб пламени обжигает группу.", type: 'danger' });
          break;
        case 'trampoline':
          onAddMessage({ text: "Трамплин! Группу подбрасывает и откидывает в случайную сторону.", type: 'danger' });
          newPos = {
            x: Math.floor(Math.random() * updatedMap.width),
            y: Math.floor(Math.random() * updatedMap.height)
          };
          updatedMap = revealCell(newPos.x, newPos.y, updatedMap);
          break;
        case 'sphere':
          if (!cell.hasExpanded) {
            onAddMessage({ text: "Сфера расширяется, задевая окружающие клетки!", type: 'danger' });
            
            updatedMap.grid[y] = [...updatedMap.grid[y]];
            updatedMap.grid[y][x] = { ...updatedMap.grid[y][x], hasExpanded: true };

            const adjacent = [
              {dx: 1, dy: 0}, {dx: -1, dy: 0}, {dx: 0, dy: 1}, {dx: 0, dy: -1},
              {dx: 1, dy: 1}, {dx: -1, dy: -1}, {dx: 1, dy: -1}, {dx: -1, dy: 1}
            ];
            adjacent.forEach(adj => {
              const ax = x + adj.dx;
              const ay = y + adj.dy;
              if (ax >= 0 && ax < updatedMap.width && ay >= 0 && ay < updatedMap.height) {
                if (updatedMap.grid[ay][ax].type === 'empty') {
                  updatedMap.grid[ay] = [...updatedMap.grid[ay]];
                  updatedMap.grid[ay][ax] = {
                    ...updatedMap.grid[ay][ax],
                    type: 'anomaly',
                    anomalyType: 'sphere',
                    isRevealed: true,
                    hasExpanded: true
                  };
                }
              }
            });
          } else {
            onAddMessage({ text: "Вы попали в остаточное поле сферы, получаете урон!", type: 'danger' });
          }
          break;
        case 'electric':
          onAddMessage({ text: "Электрический разряд прошивает группу!", type: 'danger' });
          break;
        case 'vortex':
          onAddMessage({ text: "Воронка! Вас затягивает и выбрасывает на соседнюю клетку.", type: 'danger' });
          const vAdj = [
            {dx: 1, dy: 0}, {dx: -1, dy: 0}, {dx: 0, dy: 1}, {dx: 0, dy: -1},
            {dx: 1, dy: 1}, {dx: -1, dy: -1}, {dx: 1, dy: -1}, {dx: -1, dy: 1}
          ];
          const validVAdj = vAdj.filter(a => 
            x + a.dx >= 0 && x + a.dx < updatedMap.width && 
            y + a.dy >= 0 && y + a.dy < updatedMap.height
          );
          if (validVAdj.length > 0) {
            const move = validVAdj[Math.floor(Math.random() * validVAdj.length)];
            newPos = { x: x + move.dx, y: y + move.dy };
            updatedMap = revealCell(newPos.x, newPos.y, updatedMap);
          }
          break;
        case 'time_loop':
          onAddMessage({ text: "Хроно-сдвиг! Пространство искажается, и вы оказываетесь в начале пути.", type: 'danger' });
          newPos = { x: initialMap.entrance.x, y: initialMap.entrance.y };
          updatedMap = revealCell(newPos.x, newPos.y, updatedMap);
          break;
      }
    }

    if (cell.radiationLevel > 0) {
      onAddMessage({ text: `Вы попали в зону радиации (Уровень ${cell.radiationLevel})! Получен урон и заражение.`, type: 'warning' });
    }

    return { updatedMap, newPos };
  }, [revealCell, onAddMessage, onEndGame, stashLoot, artifactLoot, initialMap.entrance.x, initialMap.entrance.y]);

  const throwBolt = useCallback((dx: number, dy: number) => {
    if (!isGM) return; // Only GM can interact initially
    const nx = playerPos.x + dx;
    const ny = playerPos.y + dy;
    if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
      onAddMessage({ text: `Брошен болт.`, type: 'info' });
      const newGrid = [...map.grid];
      newGrid[ny] = [...newGrid[ny]];
      newGrid[ny][nx] = { ...newGrid[ny][nx], isScannedByBolt: true };
      internalSetMap({ ...map, grid: newGrid });
      
      if (newGrid[ny][nx].type === 'anomaly') {
        onAddMessage({ text: `Болт вызвал реакцию! Впереди аномалия: ${newGrid[ny][nx].anomalyType}.`, type: 'danger' });
      } else {
        onAddMessage({ text: `Болт упал на землю. Аномалий не видно.`, type: 'success' });
      }
    }
  }, [playerPos, map, onAddMessage, isGM, internalSetMap]);

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (!isGM) return; // Only GM controls movement in sync mode
    if (boltMode) {
      throwBolt(dx, dy);
      setBoltMode(false);
      return;
    }

    const nx = playerPos.x + dx;
    const ny = playerPos.y + dy;

    if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
      const { updatedMap, newPos } = handleCellEnter(nx, ny, map);
      internalSetMap(updatedMap);
      setPlayerPos(newPos);
      
      // Also broadcast player position via app state mapping directly into map grid or separate message! 
      // Actually we will just broadcast position inside the internalSetMap wrapper
      const m = { ...updatedMap, playerPos: newPos };
      internalSetMap(m);
    }
  }, [playerPos, map, boltMode, handleCellEnter, throwBolt, isGM, internalSetMap]);

  // Read playerPos from map if provided via sync
  useEffect(() => {
    if ((map as any).playerPos) {
      setPlayerPos((map as any).playerPos);
    }
  }, [map]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGM) return;
      switch (e.key) {
        case 'ArrowUp': movePlayer(0, -1); break;
        case 'ArrowDown': movePlayer(0, 1); break;
        case 'ArrowLeft': movePlayer(-1, 0); break;
        case 'ArrowRight': movePlayer(1, 0); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, isGM]);

  const useGeiger = () => {
    if (!isGM) return;
    onAddMessage({ text: "Использован счетчик Гейгера. Сканирование радиуса 2 клеток...", type: 'info' });
    const newGrid = [...map.grid];
    let found = false;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = playerPos.x + dx;
        const ny = playerPos.y + dy;
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          newGrid[ny] = [...newGrid[ny]];
          newGrid[ny][nx] = { ...newGrid[ny][nx], isScannedForRadiation: true };
          if (newGrid[ny][nx].radiationLevel > 0) found = true;
        }
      }
    }
    internalSetMap({ ...map, grid: newGrid });
    if (found) onAddMessage({ text: "Счетчик Гейгера трещит! Обнаружена радиация.", type: 'warning' });
    else onAddMessage({ text: "Радиационный фон в норме.", type: 'success' });
  };

  const useAnalyzer = () => {
    if (!isGM) return;
    onAddMessage({ text: "Использован анализатор артефактов. Сканирование радиуса 3 клеток...", type: 'info' });
    const newGrid = [...map.grid];
    let found = false;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const nx = playerPos.x + dx;
        const ny = playerPos.y + dy;
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          newGrid[ny] = [...newGrid[ny]];
          newGrid[ny][nx] = { ...newGrid[ny][nx], isScannedForArtifact: true };
          if (newGrid[ny][nx].type === 'artifact') found = true;
        }
      }
    }
    internalSetMap({ ...map, grid: newGrid });
    if (found) onAddMessage({ text: "Анализатор зафиксировал аномальную активность! Поблизости есть артефакт.", type: 'loot' });
    else onAddMessage({ text: "Артефактов поблизости не обнаружено.", type: 'info' });
  };

  const getCellAppearance = (cell: Cell) => {
    const isVisible = cell.isRevealed || isGM;
    
    let bgClass = 'bg-gray-800';
    let content = '';
    let borderClass = 'border-gray-700';

    if (!isVisible) {
      bgClass = 'bg-gray-900';
      if (cell.isScannedByBolt) bgClass = 'bg-gray-800';
    } else {
      switch (cell.type) {
        case 'empty': bgClass = 'bg-stone-700'; break;
        case 'entrance': bgClass = 'bg-blue-600'; content = 'В'; break;
        case 'exit': bgClass = 'bg-green-600'; content = 'ВЫХ'; break;
        case 'stash': bgClass = 'bg-yellow-600'; content = 'С'; break;
        case 'artifact': bgClass = 'bg-purple-600'; content = 'А'; break;
        case 'anomaly': 
          bgClass = 'bg-red-600'; 
          content = cell.anomalyType === 'fire' ? '🔥' : 
                    cell.anomalyType === 'trampoline' ? '💨' : 
                    cell.anomalyType === 'sphere' ? '🫧' : 
                    cell.anomalyType === 'vortex' ? '🌀' :
                    cell.anomalyType === 'time_loop' ? '⏳' : '⚡';
          break;
      }
    }

    if (!isVisible && cell.isScannedForArtifact && cell.type === 'artifact') {
      borderClass = 'border-purple-500 border-2';
    }
    
    const showRadiation = (isVisible || cell.isScannedForRadiation) && cell.radiationLevel > 0;
    
    if (showRadiation && cell.type === 'empty' && isVisible) {
      if (cell.radiationLevel === 1) bgClass = 'bg-lime-800';
      if (cell.radiationLevel === 2) bgClass = 'bg-yellow-700';
      if (cell.radiationLevel === 3) bgClass = 'bg-orange-700';
    }

    const isPlayerHere = playerPos.x === cell.x && playerPos.y === cell.y;

    return (
      <div 
        key={`${cell.x}-${cell.y}`}
        className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 border ${borderClass} ${bgClass} flex items-center justify-center text-xs font-bold relative transition-colors`}
      >
        {content}
        {showRadiation && (
          <div className="absolute top-0 right-0 text-[10px] leading-none bg-yellow-400 text-black px-1 rounded-bl font-bold z-10">
            {cell.radiationLevel}
          </div>
        )}
        {isPlayerHere && (
          <div className="absolute inset-0 flex items-center justify-center z-20 overflow-visible">
            <div className="w-5 h-5 bg-white border-2 border-green-500 rounded-full shadow-[0_0_15px_rgba(255,255,255,1)] animate-pulse" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex-1 bg-gray-950 p-4 rounded-lg border border-gray-800 overflow-auto relative">
        <div className="w-fit min-w-full mx-auto flex flex-col">
          <div className="mb-4 flex justify-between w-full shrink-0 sticky left-0 text-gray-400 text-sm">
            <div>Текущие координаты группы: {playerPos.x}, {playerPos.y}</div>
            {!isGM && <div className="text-yellow-500 animate-pulse">Ожидание хода мастера...</div>}
            {isGM && <div className="text-green-500 px-2 rounded border border-green-900 bg-green-900/30">Режим Мастера (GM) - Все тайны раскрыты</div>}
          </div>
          
          <div 
            className="grid gap-px bg-gray-900 border-2 border-gray-700 p-1 rounded self-center shrink-0 shadow-2xl relative"
            style={{ gridTemplateColumns: `repeat(${map.width}, max-content)` }}
          >
            {map.grid.map(row => row.map(cell => getCellAppearance(cell)))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-64 flex flex-col gap-4">
        {isGM ? (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-xl">
            <h3 className="text-gray-200 font-bold mb-4 text-center">Управление <span className="text-[10px] text-gray-500">(видит только GM)</span></h3>
            
            <div className="grid grid-cols-3 gap-2 mb-6 max-w-[150px] mx-auto">
              <div />
              <button onClick={() => movePlayer(0, -1)} className="bg-gray-700 hover:bg-gray-500 p-3 rounded flex justify-center text-white transition-colors duration-75 active:scale-95 border-b-2 border-gray-900"><ArrowUp size={20} /></button>
              <div />
              <button onClick={() => movePlayer(-1, 0)} className="bg-gray-700 hover:bg-gray-500 p-3 rounded flex justify-center text-white transition-colors duration-75 active:scale-95 border-b-2 border-gray-900"><ArrowLeft size={20} /></button>
              <button onClick={() => movePlayer(0, 1)} className="bg-gray-700 hover:bg-gray-500 p-3 rounded flex justify-center text-white transition-colors duration-75 active:scale-95 border-b-2 border-gray-900"><ArrowDown size={20} /></button>
              <button onClick={() => movePlayer(1, 0)} className="bg-gray-700 hover:bg-gray-500 p-3 rounded flex justify-center text-white transition-colors duration-75 active:scale-95 border-b-2 border-gray-900"><ArrowRight size={20} /></button>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setBoltMode(!boltMode)} 
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded font-bold transition-all duration-200 outline-none ${boltMode ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)] scale-105' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-b-2 border-gray-900'}`}
              >
                <Target size={18} />
                {boltMode ? 'ВЫБЕРИТЕ КЛЕТКУ...' : 'Бросить болт'}
              </button>
              <button 
                onClick={useGeiger}
                className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 py-3 px-4 rounded font-bold transition-transform active:scale-95 border-b-2 border-gray-900"
              >
                <Radio size={18} className="text-lime-500" />
                Счетчик Гейгера
              </button>
              <button 
                onClick={useAnalyzer}
                className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 py-3 px-4 rounded font-bold transition-transform active:scale-95 border-b-2 border-gray-900"
              >
                <Scan size={18} className="text-purple-500" />
                Поиск артефактов
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col items-center justify-center gap-3 text-center opacity-70">
            <Target size={32} className="text-gray-500" />
            <p className="text-gray-400 text-sm">Панель управления недоступна. Все перемещения и действия контролирует Мастер.</p>
          </div>
        )}
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 text-xs text-gray-400 space-y-3">
          <p className="flex items-center"><span className="shrink-0 w-4 h-4 bg-blue-600 mr-3 rounded-sm shadow"></span> Вход</p>
          <p className="flex items-center"><span className="shrink-0 w-4 h-4 bg-green-600 mr-3 rounded-sm shadow"></span> Выход</p>
          <p className="flex items-center"><span className="shrink-0 w-4 h-4 bg-yellow-600 mr-3 rounded-sm shadow"></span> Схрон (тайник)</p>
          <p className="flex items-center"><span className="shrink-0 w-4 h-4 bg-purple-600 mr-3 rounded-sm shadow"></span> Артефакт</p>
          <p className="flex items-center"><span className="shrink-0 w-4 h-4 bg-red-600 mr-3 rounded-sm shadow text-center flex items-center justify-center">⚡</span> Смертельная Аномалия</p>
          <p className="flex items-center"><span className="shrink-0 w-4 h-4 bg-lime-800 mr-3 rounded-sm shadow"></span> Уровень радиации (цвет и цифра)</p>
        </div>
      </div>
    </div>
  );
}
