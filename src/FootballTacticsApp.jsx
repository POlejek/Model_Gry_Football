import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Minus, Trash2, Play, Pause, SkipBack, SkipForward, Save, ChevronRight, ChevronDown, Download, Upload, Bold, Italic,
  MousePointer2, MoveUpRight, Square, Copy, ClipboardPaste, Undo2, Redo2, Check, AlertTriangle, MoreHorizontal, Keyboard,
  X, Layers, SlidersHorizontal, Pentagon,
} from 'lucide-react';
import PptxGenJs from 'pptxgenjs';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { loadStoredData, saveStoredData } from './utils/storage.js';
import { drawField, drawPlayer, drawPlayerLabel, drawPlayerPath, drawBall, drawZone, drawLine, interpolatePlayers, findMatchingPlayer } from './utils/draw.js';
import {
  isPointNearLine, isPointNearControlPoint, isPointNearLineEnd, isPointInZone, isPointNearPolygonVertex,
  hitZoneHandle, resizeZone, zoneHandleCursor, rectangleToPolygon,
} from './utils/geometry.js';
import { ErrorBanner } from './components/ErrorBanner.jsx';
import { LINE_TYPES, ZONE_SHAPES } from './utils/lineTypes.jsx';


const TOOLBAR_BTN = 'h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-35 disabled:pointer-events-none whitespace-nowrap';
const MENU_ITEM = 'w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none';
const optionBtnClass = (active) => `h-8 px-1 rounded-md inline-flex items-center justify-center transition-colors ${
  active ? 'bg-white/20 ring-1 ring-blue-400 text-white' : 'text-slate-300 hover:bg-white/10'}`;

const FootballTacticsApp = ({ embedded = false, active = true }) => {
  const [gameFormat, setGameFormat] = useState('11v11');
  const [selectedPhase, setSelectedPhase] = useState('Atak');
  const [selectedSubPhase, setSelectedSubPhase] = useState('Otwarcie');
  const [schemes, setSchemes] = useState({
    '11v11': {
      'Atak-Otwarcie': [],
      'Atak-Budowanie': [],
      'Atak-Tworzenie szans': [],
      'Atak-Finalizacja': [],
      'A/O': [],
      'Obrona': [],
      'O/A': [],
      'SFG': []
    },
    '9v9': {
      'Atak-Otwarcie': [],
      'Atak-Budowanie': [],
      'Atak-Tworzenie szans': [],
      'Atak-Finalizacja': [],
      'A/O': [],
      'Obrona': [],
      'O/A': [],
      'SFG': []
    },
    '7v7': {
      'Atak-Otwarcie': [],
      'Atak-Budowanie': [],
      'Atak-Tworzenie szans': [],
      'Atak-Finalizacja': [],
      'A/O': [],
      'Obrona': [],
      'O/A': [],
      'SFG': []
    }
  });
  const [currentScheme, setCurrentScheme] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState({ 'Atak': true });
  const [interpolationProgress, setInterpolationProgress] = useState(0);
  const [editingPhase, setEditingPhase] = useState(null);
  const [editingSubPhase, setEditingSubPhase] = useState(null);
  const [newPhaseMode, setNewPhaseMode] = useState(false);
  const [newSubPhaseMode, setNewSubPhaseMode] = useState(null);
  
  const canvasRef = useRef(null);
  const commentsRef = useRef(null);
  const ffmpegRef = useRef(null);
  const ffmpegLoadedRef = useRef(false);
  const ffmpegLoadingRef = useRef(false);
  const teamColorInputRef = useRef(null);
  const opponentColorInputRef = useRef(null);
  const lineColorInputRef = useRef(null);
  const zoneColorInputRef = useRef(null);
  const playerColorInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null); // Wybrany zawodnik do rotacji
  const [isDraggingRotation, setIsDraggingRotation] = useState(false);
  const [editingPlayerNumber, setEditingPlayerNumber] = useState(null); // Modal edycji numeru
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerColor, setNewPlayerColor] = useState(''); // Kolor edytowanego zawodnika
  const [draggedPhase, setDraggedPhase] = useState(null); // Przeciągana faza
  const [draggedSubPhase, setDraggedSubPhase] = useState(null); // Przeciągana subfaza
  const [allPhasesExpanded, setAllPhasesExpanded] = useState(true); // Rozwijanie wszystkich faz
  const [showInstructions, setShowInstructions] = useState(false); // Instrukcje
  const [moving, setMoving] = useState(null); // {scheme, oldKey} - schemat do przeniesienia
  const [moveToPhase, setMoveToPhase] = useState(null); // Nowa faza
  const [moveToSubPhase, setMoveToSubPhase] = useState(null); // Nowa subfaza
  const [showImportDialog, setShowImportDialog] = useState(false); // Dialog importu
  const [importedData, setImportedData] = useState(null); // Tymczasowe dane z importu
  const [teamColor, setTeamColor] = useState('#1a365d'); // Kolor drużyny
  const [opponentColor, setOpponentColor] = useState('#8b0000'); // Kolor przeciwnika
  const [isDrawingMode, setIsDrawingMode] = useState(false); // Tryb rysowania linii
  const [lineType, setLineType] = useState('arrow-solid'); // Typ linii: arrow-solid, arrow-dashed, arrow-wavy, double-arrow-solid, line-dashed, line-solid, curve-*
  const [lineColor, setLineColor] = useState('#000000'); // Kolor linii
  const [currentLine, setCurrentLine] = useState(null); // Rysowana linia
  const [lines, setLines] = useState([]); // Wszystkie linie na bieżącej klatce
  const [selectedLineIndex, setSelectedLineIndex] = useState(null); // Indeks zaznaczonej linii
  const [isDraggingLine, setIsDraggingLine] = useState(false); // Czy przeciągamy linię
  const [isDraggingControlPoint, setIsDraggingControlPoint] = useState(false); // Czy przeciągamy punkt kontrolny krzywej
  const [isDraggingLineEnd, setIsDraggingLineEnd] = useState(null); // 'start' lub 'end' - który koniec linii przeciągamy
  const [lineDragOffset, setLineDragOffset] = useState({ x: 0, y: 0 }); // Offset przy przeciąganiu linii
  
  // Strefy
  const [zones, setZones] = useState([]); // Wszystkie strefy na bieżącej klatce
  const [drawingTool, setDrawingTool] = useState('line'); // 'line' lub 'zone'
  const [zoneType, setZoneType] = useState('rectangle'); // 'rectangle', 'circle', 'polygon'
  const [zoneColor, setZoneColor] = useState('#ff0000'); // Kolor strefy
  const [zoneOpacity, setZoneOpacity] = useState(0.3); // Przezroczystość strefy
  const [currentZone, setCurrentZone] = useState(null); // Rysowana strefa
  const [polygonPoints, setPolygonPoints] = useState([]); // Punkty wielokąta
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(null); // Indeks zaznaczonej strefy
  const [isDraggingZone, setIsDraggingZone] = useState(false); // Czy przeciągamy strefę
  const [zoneDragOffset, setZoneDragOffset] = useState({ x: 0, y: 0 }); // Offset przy przeciąganiu strefy
  const [isDraggingPolygonVertex, setIsDraggingPolygonVertex] = useState(false); // Czy przeciągamy wierzchołek wielokąta
  const [zoneHandleDrag, setZoneHandleDrag] = useState(null); // { handle, origin } — zmiana rozmiaru prostokąta/koła
  const [draggedVertexIndex, setDraggedVertexIndex] = useState(null); // Indeks przeciąganego wierzchołka
  const [openColorPalette, setOpenColorPalette] = useState(null); // 'team', 'opponent', 'line', 'zone', 'player' lub null
  const [openFormationMenu, setOpenFormationMenu] = useState(null); // 'team', 'opponent' lub null
  const [clipboard, setClipboard] = useState(null); // Schowek dla Ctrl+C/Ctrl+V: {type: 'line'|'zone', data: {...}}
  const [pptSelectionMode, setPptSelectionMode] = useState(false); // Tryb wyboru schematów do PPT
  const [selectedSchemesForPpt, setSelectedSchemesForPpt] = useState(new Set()); // ID zaznaczonych schematów
  const [leftPanelOpen, setLeftPanelOpen] = useState(false); // Mobilny lewy panel
  const [rightPanelOpen, setRightPanelOpen] = useState(false); // Mobilny prawy panel
  const lastTapRef = useRef(0); // Do wykrywania double-tap na mobile
  const [showCopyNotification, setShowCopyNotification] = useState(false); // Powiadomienie o skopiowaniu
  const [draggedFrameIdx, setDraggedFrameIdx] = useState(null); // Indeks przeciąganej klatki
  const [dragOverFrameIdx, setDragOverFrameIdx] = useState(null); // Indeks klatki nad którą jest kursor
  const [errorMessage, setErrorMessage] = useState(null); // Błąd wyświetlany przez ErrorBanner

  // Paleta kolorów szybkiego wyboru
  const quickColorPalette = [
    { name: 'Niebieski', color: '#1F77B4' },
    { name: 'Zielony', color: '#2CA02C' },
    { name: 'Turkusowy', color: '#17BECF' },
    { name: 'Granatowy', color: '#003F5C' },
    { name: 'Czerwony', color: '#D62728' },
    { name: 'Pomarańczowy', color: '#FF7F0E' },
    { name: 'Żółty', color: '#BCBD22' },
    { name: 'Różowy', color: '#E377C2' },
    { name: 'Brązowy', color: '#8C564B' },
    { name: 'Czarny', color: '#000000' },
    { name: 'Biały', color: '#FFFFFF' }
  ];

  const [phases, setPhases] = useState({
    'Atak': ['Otwarcie', 'Budowanie', 'Tworzenie szans', 'Finalizacja'],
    'A/O': [],
    'Obrona': [],
    'O/A': [],
    'SFG': []
  });

  // Wczytaj dane z localStorage przy starcie (z migracją wersji)
  useEffect(() => {
    const data = loadStoredData();
    if (data) {
      if (data.phases) setPhases(data.phases);
      if (data.schemes) setSchemes(data.schemes);
      if (data.gameFormat) setGameFormat(data.gameFormat);
      if (data.selectedPhase) setSelectedPhase(data.selectedPhase);
      if (data.selectedSubPhase) setSelectedSubPhase(data.selectedSubPhase);
      if (data.expandedPhases) setExpandedPhases(data.expandedPhases);
      if (data.teamColor) setTeamColor(data.teamColor);
      if (data.opponentColor) setOpponentColor(data.opponentColor);
    }
  }, []);

  // Zapisz dane do localStorage przy każdej zmianie
  useEffect(() => {
    saveStoredData({ phases, schemes, gameFormat, selectedPhase, selectedSubPhase, expandedPhases, teamColor, opponentColor });
  }, [phases, schemes, gameFormat, selectedPhase, selectedSubPhase, expandedPhases, teamColor, opponentColor]);

  // Synchronizuj zawartość comments edytora tylko gdy zmienia się schemat
  useEffect(() => {
    if (commentsRef.current && currentScheme) {
      // Tylko ustaw zawartość jeśli nie jest już ustawiona
      if (commentsRef.current.innerHTML !== currentScheme.comments) {
        commentsRef.current.innerHTML = currentScheme.comments;
      }
    }
  }, [currentScheme?.id, currentScheme?.comments]);

  // Zamknij paletę kolorów przy kliknięciu poza nią
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Sprawdź czy kliknięcie było w paletę lub przycisk koloru
      const clickedPalette = e.target.closest('.absolute.top-full');
      const clickedColorButton = e.target.closest('button[style*="backgroundColor"]');
      
      if (openColorPalette && !clickedPalette && !clickedColorButton) {
        setOpenColorPalette(null);
      }
    };
    
    if (openColorPalette) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openColorPalette]);

  // Zamknij menu formacji przy kliknięciu poza nim
  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedMenu = e.target.closest('.absolute.top-full');
      if (openFormationMenu && !clickedMenu) {
        setOpenFormationMenu(null);
      }
    };
    if (openFormationMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openFormationMenu]);

  // Gdy zmieni się wybrany schemat, zamknij modal przenoszenia
  useEffect(() => {
    setMoving(null);
    setMoveToPhase(null);
    setMoveToSubPhase(null);
  }, [currentScheme?.id]);

  // Załaduj kolory schematu przy zmianie currentScheme
  useEffect(() => {
    if (currentScheme) {
      if (currentScheme.teamColor) {
        setTeamColor(currentScheme.teamColor);
      }
      if (currentScheme.opponentColor) {
        setOpponentColor(currentScheme.opponentColor);
      }
    }
  }, [currentScheme?.id]);

  const getInitialPlayers = (format) => {
    const formations = {
      '7v7': {
        team: [
          { id: 'gk', x: 350, y: 1020, number: '1', rotation: 0 },
          { id: 'lb', x: 240, y: 860, number: '4', rotation: 0 },
          { id: 'rb', x: 460, y: 860, number: '5', rotation: 0 },
          { id: 'lm', x: 200, y: 680, number: '11', rotation: 0 },
          { id: 'cm', x: 350, y: 680, number: '8', rotation: 0 },
          { id: 'rm', x: 500, y: 680, number: '7', rotation: 0 },
          { id: 'st', x: 350, y: 600, number: '9', rotation: 0 }
        ],
        opponent: [
          { id: 'ogk', x: 350, y: 60, number: '1', rotation: Math.PI },
          { id: 'olb', x: 240, y: 220, number: '4', rotation: Math.PI },
          { id: 'orb', x: 460, y: 220, number: '5', rotation: Math.PI },
          { id: 'olm', x: 200, y: 400, number: '11', rotation: Math.PI },
          { id: 'ocm', x: 350, y: 400, number: '8', rotation: Math.PI },
          { id: 'orm', x: 500, y: 400, number: '7', rotation: Math.PI },
          { id: 'ost', x: 350, y: 480, number: '9', rotation: Math.PI }
        ]
      },
      '9v9': {
        team: [
          { id: 'gk', x: 350, y: 1020, number: '1', rotation: 0 },
          { id: 'lb', x: 220, y: 880, number: '3', rotation: 0 },
          { id: 'cb', x: 350, y: 880, number: '5', rotation: 0 },
          { id: 'rb', x: 480, y: 880, number: '2', rotation: 0 },
          { id: 'ldm', x: 260, y: 740, number: '6', rotation: 0 },
          { id: 'rdm', x: 440, y: 740, number: '8', rotation: 0 },
          { id: 'lw', x: 200, y: 620, number: '11', rotation: 0 },
          { id: 'rw', x: 500, y: 620, number: '7', rotation: 0 },
          { id: 'st', x: 350, y: 600, number: '9', rotation: 0 }
        ],
        opponent: [
          { id: 'ogk', x: 350, y: 60, number: '1', rotation: Math.PI },
          { id: 'olb', x: 220, y: 200, number: '3', rotation: Math.PI },
          { id: 'ocb', x: 350, y: 200, number: '5', rotation: Math.PI },
          { id: 'orb', x: 480, y: 200, number: '2', rotation: Math.PI },
          { id: 'oldm', x: 260, y: 340, number: '6', rotation: Math.PI },
          { id: 'ordm', x: 440, y: 340, number: '8', rotation: Math.PI },
          { id: 'olw', x: 200, y: 460, number: '11', rotation: Math.PI },
          { id: 'orw', x: 500, y: 460, number: '7', rotation: Math.PI },
          { id: 'ost', x: 350, y: 480, number: '9', rotation: Math.PI }
        ]
      },
      '11v11': {
        team: [
          { id: 'gk', x: 350, y: 1030, number: '1', rotation: 0 },
          { id: 'lb', x: 180, y: 900, number: '3', rotation: 0 },
          { id: 'lcb', x: 280, y: 910, number: '4', rotation: 0 },
          { id: 'rcb', x: 420, y: 910, number: '5', rotation: 0 },
          { id: 'rb', x: 520, y: 900, number: '2', rotation: 0 },
          { id: 'ldm', x: 260, y: 770, number: '6', rotation: 0 },
          { id: 'rdm', x: 440, y: 770, number: '8', rotation: 0 },
          { id: 'lw', x: 160, y: 640, number: '11', rotation: 0 },
          { id: 'cam', x: 350, y: 640, number: '10', rotation: 0 },
          { id: 'rw', x: 540, y: 640, number: '7', rotation: 0 },
          { id: 'st', x: 350, y: 570, number: '9', rotation: 0 }
        ],
        opponent: [
          { id: 'ogk', x: 350, y: 50, number: '1', rotation: Math.PI },
          { id: 'olb', x: 180, y: 180, number: '3', rotation: Math.PI },
          { id: 'olcb', x: 280, y: 170, number: '4', rotation: Math.PI },
          { id: 'orcb', x: 420, y: 170, number: '5', rotation: Math.PI },
          { id: 'orb', x: 520, y: 180, number: '2', rotation: Math.PI },
          { id: 'oldm', x: 260, y: 310, number: '6', rotation: Math.PI },
          { id: 'ordm', x: 440, y: 310, number: '8', rotation: Math.PI },
          { id: 'olw', x: 160, y: 440, number: '11', rotation: Math.PI },
          { id: 'ocam', x: 350, y: 440, number: '10', rotation: Math.PI },
          { id: 'orw', x: 540, y: 440, number: '7', rotation: Math.PI },
          { id: 'ost', x: 350, y: 510, number: '9', rotation: Math.PI }
        ]
      }
    };

    return {
      ...formations[format],
      ball: { x: 350, y: 540 }
    };
  };

  const [players, setPlayers] = useState(getInitialPlayers('11v11'));
  const latestPlayersRef = useRef(players);

  useEffect(() => {
    latestPlayersRef.current = players;
  }, [players]);

  // Obsługa skrótów klawiszowych
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!active) return;
      // Ignoruj skróty gdy użytkownik jest w polu tekstowym
      const isInputFocused = e.target.tagName === 'INPUT' || 
                            e.target.tagName === 'TEXTAREA' || 
                            e.target.contentEditable === 'true';
      
      if (isInputFocused) return;

      // Delete - usuń zaznaczoną linię lub strefę
      if (e.key === 'Delete') {
        e.preventDefault();
        
        if (selectedLineIndex !== null) {
          const newLines = lines.filter((_, index) => index !== selectedLineIndex);
          setLines(newLines);
          setSelectedLineIndex(null);
          
          if (currentScheme) {
            const updatedScheme = {
              ...currentScheme,
              frames: currentScheme.frames.map((f, i) => 
                i === currentFrame ? { ...players, lines: newLines, zones: zones } : f
              )
            };
            updateCurrentScheme(updatedScheme);
          }
        } else if (selectedZoneIndex !== null) {
          const newZones = zones.filter((_, index) => index !== selectedZoneIndex);
          setZones(newZones);
          setSelectedZoneIndex(null);
          
          if (currentScheme) {
            const updatedScheme = {
              ...currentScheme,
              frames: currentScheme.frames.map((f, i) => 
                i === currentFrame ? { ...players, lines: lines, zones: newZones } : f
              )
            };
            updateCurrentScheme(updatedScheme);
          }
        }
      }

      // Ctrl+C - kopiuj zaznaczoną linię lub strefę
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        
        if (selectedLineIndex !== null) {
          setClipboard({
            type: 'line',
            data: { ...lines[selectedLineIndex] }
          });
          setShowCopyNotification(true);
          setTimeout(() => setShowCopyNotification(false), 2000);
        } else if (selectedZoneIndex !== null) {
          setClipboard({
            type: 'zone',
            data: { ...zones[selectedZoneIndex] }
          });
          setShowCopyNotification(true);
          setTimeout(() => setShowCopyNotification(false), 2000);
        }
      }

      // Ctrl+V - wklej skopiowaną linię lub strefę
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        
        if (clipboard) {
          if (clipboard.type === 'line') {
            // Wklej linię z przesunięciem o 20px w prawo i w dół
            const newLine = {
              ...clipboard.data,
              startX: clipboard.data.startX + 20,
              startY: clipboard.data.startY + 20,
              endX: clipboard.data.endX + 20,
              endY: clipboard.data.endY + 20
            };
            
            // Jeśli linia ma punkt kontrolny, też go przesuń
            if (newLine.controlX !== undefined && newLine.controlY !== undefined) {
              newLine.controlX += 20;
              newLine.controlY += 20;
            }
            
            const newLines = [...lines, newLine];
            setLines(newLines);
            
            // Zaznacz nową linię
            setSelectedLineIndex(newLines.length - 1);
            setSelectedZoneIndex(null);
            
            if (currentScheme) {
              const updatedScheme = {
                ...currentScheme,
                frames: currentScheme.frames.map((f, i) => 
                  i === currentFrame ? { ...players, lines: newLines, zones: zones } : f
                )
              };
              updateCurrentScheme(updatedScheme);
            }
          } else if (clipboard.type === 'zone') {
            // Wklej strefę z przesunięciem o 20px w prawo i w dół
            const newZone = { ...clipboard.data };
            
            if (newZone.type === 'rectangle') {
              newZone.x += 20;
              newZone.y += 20;
            } else if (newZone.type === 'circle') {
              newZone.centerX += 20;
              newZone.centerY += 20;
            } else if (newZone.type === 'polygon' && newZone.points) {
              newZone.points = newZone.points.map(point => ({
                x: point.x + 20,
                y: point.y + 20
              }));
            }
            
            const newZones = [...zones, newZone];
            setZones(newZones);
            
            // Zaznacz nową strefę
            setSelectedZoneIndex(newZones.length - 1);
            setSelectedLineIndex(null);
            
            if (currentScheme) {
              const updatedScheme = {
                ...currentScheme,
                frames: currentScheme.frames.map((f, i) => 
                  i === currentFrame ? { ...players, lines: lines, zones: newZones } : f
                )
              };
              updateCurrentScheme(updatedScheme);
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, selectedLineIndex, selectedZoneIndex, lines, zones, clipboard, currentScheme, currentFrame, players]);

  // Helper: Rysuj klatkę na podanym canvas
  const drawFrameToCanvas = (frameData, format, canvas, ctx, tColor = '#1a365d', oColor = '#8b0000') => {
    const width = canvas.width;
    const height = canvas.height;
    const margin = 20;

    const fieldDimensions = {
      '7v7': { length: 55, width: 37, penaltyBoxWidth: 20, penaltyBoxDepth: 13, goalBoxWidth: 12, goalBoxDepth: 5, goalWidth: 5, penaltySpot: 0, centerCircle: 6, arcRadius: 0 },
      '9v9': { length: 70, width: 50, penaltyBoxWidth: 30, penaltyBoxDepth: 13, goalBoxWidth: 15, goalBoxDepth: 5, goalWidth: 6, penaltySpot: 9, centerCircle: 7, arcRadius: 7 },
      '11v11': { length: 105, width: 68, penaltyBoxWidth: 40.32, penaltyBoxDepth: 16.5, goalBoxWidth: 18.32, goalBoxDepth: 5.5, goalWidth: 7.32, penaltySpot: 11, centerCircle: 9.15, arcRadius: 9.15 }
    };

    const dims = fieldDimensions[format];
    const fieldLength = dims.length;
    const fieldWidthMeters = dims.width;
    const fieldWidth = width - 2 * margin;
    const fieldHeight = height - 2 * margin;

    // Białe tło
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Obramowanie
    ctx.strokeStyle = '#c4a76e';
    ctx.lineWidth = 3;
    ctx.strokeRect(margin, margin, fieldWidth, fieldHeight);

    // Linie boiska
    ctx.strokeStyle = '#c4a76e';
    ctx.lineWidth = 2;

    // Linia środkowa
    ctx.beginPath();
    ctx.moveTo(margin, height / 2);
    ctx.lineTo(width - margin, height / 2);
    ctx.stroke();

    // Okrąg środkowy
    const centerCircleRadius = (dims.centerCircle / fieldWidthMeters) * fieldWidth;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, centerCircleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Punkt środkowy
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#c4a76e';
    ctx.fill();

    // Pola karne i bramkowe
    const penaltyBoxWidth = (dims.penaltyBoxWidth / fieldWidthMeters) * fieldWidth;
    const penaltyBoxDepth = (dims.penaltyBoxDepth / fieldLength) * fieldHeight;
    const goalBoxWidth = (dims.goalBoxWidth / fieldWidthMeters) * fieldWidth;
    const goalBoxDepth = (dims.goalBoxDepth / fieldLength) * fieldHeight;

    const penaltyBoxLeft = (width - penaltyBoxWidth) / 2;
    const goalBoxLeft = (width - goalBoxWidth) / 2;

    ctx.strokeStyle = '#c4a76e';
    ctx.lineWidth = 2;
    ctx.strokeRect(penaltyBoxLeft, margin, penaltyBoxWidth, penaltyBoxDepth);
    ctx.strokeRect(goalBoxLeft, margin, goalBoxWidth, goalBoxDepth);
    ctx.strokeRect(penaltyBoxLeft, height - margin - penaltyBoxDepth, penaltyBoxWidth, penaltyBoxDepth);
    ctx.strokeRect(goalBoxLeft, height - margin - goalBoxDepth, goalBoxWidth, goalBoxDepth);

    // Rysuj strefy jeśli są w klatce
    if (frameData.zones && frameData.zones.length > 0) {
      frameData.zones.forEach(zone => {
        ctx.save();
        ctx.fillStyle = zone.color || '#3b82f6';
        ctx.globalAlpha = zone.opacity || 0.3;
        ctx.strokeStyle = zone.color || '#3b82f6';
        ctx.lineWidth = 2;

        switch (zone.type) {
          case 'rectangle':
            ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
            ctx.globalAlpha = 1;
            ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
            break;
          
          case 'circle':
            ctx.beginPath();
            ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
            break;
          
          case 'polygon':
            if (zone.points && zone.points.length > 0) {
              ctx.beginPath();
              ctx.moveTo(zone.points[0].x, zone.points[0].y);
              for (let i = 1; i < zone.points.length; i++) {
                ctx.lineTo(zone.points[i].x, zone.points[i].y);
              }
              ctx.closePath();
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.stroke();
            }
            break;
        }
        ctx.restore();
      });
    }

    // Rysuj linie jeśli są w klatce
    if (frameData.lines && frameData.lines.length > 0) {
      frameData.lines.forEach(line => {
        ctx.save();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const dx = line.endX - line.startX;
        const dy = line.endY - line.startY;
        const angle = Math.atan2(dy, dx);
        const arrowSize = 15;

        const drawArrowHead = (x, y, angle) => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(
            x - arrowSize * Math.cos(angle - Math.PI / 6),
            y - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(x, y);
          ctx.lineTo(
            x - arrowSize * Math.cos(angle + Math.PI / 6),
            y - arrowSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        };

        const getControlPoint = () => {
          if (line.controlX !== undefined && line.controlY !== undefined) {
            return { x: line.controlX, y: line.controlY };
          }
          return {
            x: (line.startX + line.endX) / 2 + (line.endY - line.startY) * 0.3,
            y: (line.startY + line.endY) / 2 - (line.endX - line.startX) * 0.3
          };
        };

        const drawWavyStraight = () => {
          const lineLength = Math.hypot(dx, dy);
          if (lineLength === 0) return;

          const amplitude = 6;
          const wavelength = 24;
          const straightTail = Math.min(22, lineLength * 0.35);
          const fadeTail = Math.min(14, Math.max(6, straightTail * 0.7));
          const tailStartDistance = Math.max(0, lineLength - straightTail);
          const fadeStartDistance = Math.max(0, tailStartDistance - fadeTail);
          const tailStartT = tailStartDistance / lineLength;
          const segments = Math.max(16, Math.ceil(lineLength / 4));
          const normalX = -dy / lineLength;
          const normalY = dx / lineLength;

          ctx.beginPath();
          for (let i = 0; i <= segments; i++) {
            const rawT = i / segments;
            const t = Math.min(rawT, tailStartT);
            const distance = t * lineLength;
            const baseX = line.startX + dx * t;
            const baseY = line.startY + dy * t;
            const phase = (distance * Math.PI * 2) / wavelength;

            let damping = 1;
            if (distance >= tailStartDistance) {
              damping = 0;
            } else if (distance > fadeStartDistance) {
              damping = (tailStartDistance - distance) / Math.max(1, tailStartDistance - fadeStartDistance);
            }

            const offset = Math.sin(phase) * amplitude * damping;
            const x = baseX + normalX * offset;
            const y = baseY + normalY * offset;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            if (rawT >= tailStartT) break;
          }

          const tailStartX = line.startX + dx * tailStartT;
          const tailStartY = line.startY + dy * tailStartT;
          ctx.lineTo(tailStartX, tailStartY);
          ctx.lineTo(line.endX, line.endY);
          ctx.stroke();
        };

        const getQuadraticPoint = (t, cp) => {
          const oneMinusT = 1 - t;
          return {
            x: oneMinusT * oneMinusT * line.startX + 2 * oneMinusT * t * cp.x + t * t * line.endX,
            y: oneMinusT * oneMinusT * line.startY + 2 * oneMinusT * t * cp.y + t * t * line.endY
          };
        };

        const getQuadraticTangent = (t, cp) => ({
          x: 2 * (1 - t) * (cp.x - line.startX) + 2 * t * (line.endX - cp.x),
          y: 2 * (1 - t) * (cp.y - line.startY) + 2 * t * (line.endY - cp.y)
        });

        const drawWavyCurve = (cp) => {
          const arcSamples = 80;
          const arcPoints = [];
          let curveLength = 0;
          let previousPoint = getQuadraticPoint(0, cp);
          arcPoints.push({ t: 0, distance: 0, point: previousPoint });

          for (let i = 1; i <= arcSamples; i++) {
            const t = i / arcSamples;
            const point = getQuadraticPoint(t, cp);
            curveLength += Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
            arcPoints.push({ t, distance: curveLength, point });
            previousPoint = point;
          }

          const getTAtDistance = (targetDistance) => {
            if (targetDistance <= 0) return 0;
            if (targetDistance >= curveLength) return 1;

            for (let i = 1; i < arcPoints.length; i++) {
              const prev = arcPoints[i - 1];
              const current = arcPoints[i];
              if (targetDistance <= current.distance) {
                const segmentDistance = current.distance - prev.distance || 1;
                const ratio = (targetDistance - prev.distance) / segmentDistance;
                return prev.t + (current.t - prev.t) * ratio;
              }
            }
            return 1;
          };

          const amplitude = 6;
          const wavelength = 24;
          const straightTail = Math.min(24, curveLength * 0.35);
          const fadeTail = Math.min(16, Math.max(6, straightTail * 0.7));
          const tailStartDistance = Math.max(0, curveLength - straightTail);
          const fadeStartDistance = Math.max(0, tailStartDistance - fadeTail);
          const tailStartT = getTAtDistance(tailStartDistance);
          const segments = Math.max(24, Math.ceil(curveLength / 4));

          ctx.beginPath();
          for (let i = 0; i <= segments; i++) {
            const rawT = i / segments;
            const t = Math.min(rawT, tailStartT);
            const point = getQuadraticPoint(t, cp);
            const tangent = getQuadraticTangent(t, cp);
            const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
            const normalX = -tangent.y / tangentLength;
            const normalY = tangent.x / tangentLength;
            const distance = t * curveLength;
            const phase = (distance * Math.PI * 2) / wavelength;

            let damping = 1;
            if (distance >= tailStartDistance) {
              damping = 0;
            } else if (distance > fadeStartDistance) {
              damping = (tailStartDistance - distance) / Math.max(1, tailStartDistance - fadeStartDistance);
            }

            const offset = Math.sin(phase) * amplitude * damping;
            const x = point.x + normalX * offset;
            const y = point.y + normalY * offset;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            if (rawT >= tailStartT) break;
          }

          const tailPoint = getQuadraticPoint(tailStartT, cp);
          ctx.lineTo(tailPoint.x, tailPoint.y);
          ctx.lineTo(line.endX, line.endY);
          ctx.stroke();

          return Math.atan2(line.endY - tailPoint.y, line.endX - tailPoint.x);
        };

        switch (line.type) {
          case 'line-solid':
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.stroke();
            break;

          case 'line-dashed':
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.stroke();
            ctx.setLineDash([]);
            break;

          case 'arrow-solid':
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.stroke();
            drawArrowHead(line.endX, line.endY, angle);
            break;

          case 'arrow-dashed':
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.stroke();
            ctx.setLineDash([]);
            drawArrowHead(line.endX, line.endY, angle);
            break;

          case 'arrow-wavy':
            drawWavyStraight();
            drawArrowHead(line.endX, line.endY, angle);
            break;

          case 'double-arrow-solid':
            const offset = 4;
            const perpX = -Math.sin(angle) * offset;
            const perpY = Math.cos(angle) * offset;
            const arrowGap = 8;
            const shortenedEndX = line.endX - arrowGap * Math.cos(angle);
            const shortenedEndY = line.endY - arrowGap * Math.sin(angle);
            
            ctx.beginPath();
            ctx.moveTo(line.startX + perpX, line.startY + perpY);
            ctx.lineTo(shortenedEndX + perpX, shortenedEndY + perpY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(line.startX - perpX, line.startY - perpY);
            ctx.lineTo(shortenedEndX - perpX, shortenedEndY - perpY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(line.endX, line.endY);
            ctx.lineTo(
              line.endX - (arrowSize + 2) * Math.cos(angle - Math.PI / 6),
              line.endY - (arrowSize + 2) * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(line.endX, line.endY);
            ctx.lineTo(
              line.endX - (arrowSize + 2) * Math.cos(angle + Math.PI / 6),
              line.endY - (arrowSize + 2) * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
            break;

          case 'curve-line':
            const cp1 = getControlPoint();
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.quadraticCurveTo(cp1.x, cp1.y, line.endX, line.endY);
            ctx.stroke();
            break;

          case 'curve-arrow-solid':
            const cp2 = getControlPoint();
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.quadraticCurveTo(cp2.x, cp2.y, line.endX, line.endY);
            ctx.stroke();
            
            const t = 0.95;
            const nearEndX = (1-t)*(1-t)*line.startX + 2*(1-t)*t*cp2.x + t*t*line.endX;
            const nearEndY = (1-t)*(1-t)*line.startY + 2*(1-t)*t*cp2.y + t*t*line.endY;
            const curveAngle = Math.atan2(line.endY - nearEndY, line.endX - nearEndX);
            drawArrowHead(line.endX, line.endY, curveAngle);
            break;

          case 'curve-arrow-wavy':
            const cp3 = getControlPoint();
            const wavyCurveAngle = drawWavyCurve(cp3);
            drawArrowHead(line.endX, line.endY, wavyCurveAngle);
            break;
        }

        ctx.restore();
      });
    }

    // Rysuj zawodników
    const playerSizes = { '7v7': 26, '9v9': 22, '11v11': 18 };
    const playerRadius = playerSizes[format] || 18;

    // Drużyna
    frameData.team.forEach(player => {
      const playerColor = player.color || tColor;
      ctx.save();
      ctx.fillStyle = playerColor;
      ctx.beginPath();
      ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 12px Arial';
      drawPlayerLabel(ctx, player.number, player.x, player.y, playerRadius, playerColor);

      const arrowLength = playerRadius + 8;
      ctx.strokeStyle = playerColor;
      ctx.lineWidth = 2;
      const radians = (player.rotation * Math.PI) / 180;
      const endX = player.x + Math.cos(radians) * arrowLength;
      const endY = player.y + Math.sin(radians) * arrowLength;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
    });

    // Przeciwnik
    frameData.opponent.forEach(player => {
      const playerColor = player.color || oColor;
      ctx.save();
      ctx.fillStyle = playerColor;
      ctx.beginPath();
      ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 12px Arial';
      drawPlayerLabel(ctx, player.number, player.x, player.y, playerRadius, playerColor);

      const arrowLength = playerRadius + 8;
      ctx.strokeStyle = playerColor;
      ctx.lineWidth = 2;
      const radians = (player.rotation * Math.PI) / 180;
      const endX = player.x + Math.cos(radians) * arrowLength;
      const endY = player.y + Math.sin(radians) * arrowLength;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
    });

    // Piłka z klasycznym wzorem
    ctx.save();
    const ballRadius = 8;
    
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    
    // Biała podstawa
    ctx.beginPath();
    ctx.arc(frameData.ball.x, frameData.ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    
    // Klasyczny wzór piłki - czarne pięciokąty
    ctx.fillStyle = '#000000';
    
    const pentagonRadius = ballRadius * 0.35;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const x = frameData.ball.x + Math.cos(angle) * pentagonRadius;
      const y = frameData.ball.y + Math.sin(angle) * pentagonRadius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Dodatkowe czarne elementy
    const hexSize = ballRadius * 0.25;
    const positions = [
      { angle: 0, distance: ballRadius * 0.7 },
      { angle: Math.PI * 0.66, distance: ballRadius * 0.7 },
      { angle: -Math.PI * 0.66, distance: ballRadius * 0.7 }
    ];
    
    positions.forEach(pos => {
      const centerX = frameData.ball.x + Math.cos(pos.angle) * pos.distance;
      const centerY = frameData.ball.y + Math.sin(pos.angle) * pos.distance;
      
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI / 6) + pos.angle;
        const x = centerX + Math.cos(angle) * hexSize;
        const y = centerY + Math.sin(angle) * hexSize;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    });
    
    ctx.restore();
  };

  // Helper: Narysuj klatkę na canvas i zwróć data URL
  const getFrameImageDataUrl = (frameData, format) => {
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    drawFrameToCanvas(frameData, format, canvas, ctx, teamColor, opponentColor);
    return canvas.toDataURL('image/png');
  };

  const toBlobURL = async (url, mimeType) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return URL.createObjectURL(new Blob([blob], { type: mimeType }));
  };

  const ensureFfmpegLoaded = async () => {
    if (ffmpegLoadedRef.current && ffmpegRef.current) {
      return ffmpegRef.current;
    }

    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
    }

    if (ffmpegLoadingRef.current) {
      while (!ffmpegLoadedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return ffmpegRef.current;
    }

    ffmpegLoadingRef.current = true;
    const coreUrl = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js';
    const wasmUrl = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm';
    const coreBlobUrl = await toBlobURL(coreUrl, 'text/javascript');
    const wasmBlobUrl = await toBlobURL(wasmUrl, 'application/wasm');

    await ffmpegRef.current.load({
      coreURL: coreBlobUrl,
      wasmURL: wasmBlobUrl
    });

    ffmpegLoadedRef.current = true;
    ffmpegLoadingRef.current = false;
    return ffmpegRef.current;
  };

  const generateMp4FromFrames = async (frames, format) => {
    if (!frames.length) {
      throw new Error('Brak klatek do wygenerowania MP4');
    }

    const ffmpeg = await ensureFfmpegLoaded();
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    const frameFiles = [];
    const frameCount = frames.length;

    for (let i = 0; i < frameCount; i++) {
      drawFrameToCanvas(frames[i], format, canvas, ctx, teamColor, opponentColor);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error('Nie mozna wygenerowac klatki PNG');
      }
      const arrayBuffer = await blob.arrayBuffer();
      const fileName = `frame_${String(i).padStart(3, '0')}.png`;
      await ffmpeg.writeFile(fileName, new Uint8Array(arrayBuffer));
      frameFiles.push(fileName);
    }

    const outputName = `output_${Date.now()}.mp4`;
    try {
      await ffmpeg.exec([
        '-framerate', '5',
        '-i', 'frame_%03d.png',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        outputName
      ]);
    } catch (error) {
      await ffmpeg.exec([
        '-framerate', '5',
        '-i', 'frame_%03d.png',
        '-c:v', 'mpeg4',
        '-pix_fmt', 'yuv420p',
        outputName
      ]);
    }

    const data = await ffmpeg.readFile(outputName);

    await Promise.all([
      ...frameFiles.map(fileName => ffmpeg.deleteFile(fileName)),
      ffmpeg.deleteFile(outputName)
    ]);

    const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('MP4 read error'));
      reader.readAsDataURL(videoBlob);
    });
  };

  const generateAnimatedMp4FromFrames = async (frames, format, tColor, oColor) => {
    if (frames.length < 2) {
      throw new Error('Brak wystarczajacej liczby klatek do animacji');
    }

    const ffmpeg = await ensureFfmpegLoaded();
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    const frameFiles = [];
    const framesPerTransition = 15;
    let frameIndex = 0;

    for (let i = 0; i < frames.length; i++) {
      const currentFrameData = frames[i];
      const nextFrameData = i < frames.length - 1 ? frames[i + 1] : null;

      if (nextFrameData) {
        for (let step = 0; step < framesPerTransition; step++) {
          const progress = step / framesPerTransition;
          drawAnimationFrame(ctx, currentFrameData, nextFrameData, progress, format, tColor, oColor);

          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!blob) {
            throw new Error('Nie mozna wygenerowac klatki PNG');
          }
          const arrayBuffer = await blob.arrayBuffer();
          const fileName = `frame_${String(frameIndex).padStart(4, '0')}.png`;
          await ffmpeg.writeFile(fileName, new Uint8Array(arrayBuffer));
          frameFiles.push(fileName);
          frameIndex++;
        }
      } else {
        drawAnimationFrame(ctx, currentFrameData, null, 0, format, tColor, oColor);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) {
          throw new Error('Nie mozna wygenerowac klatki PNG');
        }
        const arrayBuffer = await blob.arrayBuffer();
        const fileName = `frame_${String(frameIndex).padStart(4, '0')}.png`;
        await ffmpeg.writeFile(fileName, new Uint8Array(arrayBuffer));
        frameFiles.push(fileName);
        frameIndex++;
      }
    }

    const outputName = `ppt_animation_${Date.now()}.mp4`;

    try {
      await ffmpeg.exec([
        '-framerate', '20',
        '-i', 'frame_%04d.png',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        outputName
      ]);
    } catch (error) {
      await ffmpeg.exec([
        '-framerate', '20',
        '-i', 'frame_%04d.png',
        '-c:v', 'mpeg4',
        '-pix_fmt', 'yuv420p',
        outputName
      ]);
    }

    const data = await ffmpeg.readFile(outputName);

    await Promise.all([
      ...frameFiles.map(fileName => ffmpeg.deleteFile(fileName)),
      ffmpeg.deleteFile(outputName)
    ]);

    const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('MP4 read error'));
      reader.readAsDataURL(videoBlob);
    });
  };

  // Funkcja pomocnicza do renderowania pełnej klatki animacji z liniami ruchu
  const drawAnimationFrame = (ctx, currentFrameData, nextFrameData, progress, format, tColor = '#1a365d', oColor = '#8b0000') => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const margin = 20;

    const fieldDimensions = {
      '7v7': { length: 55, width: 37, penaltyBoxWidth: 20, penaltyBoxDepth: 13, goalBoxWidth: 12, goalBoxDepth: 5, goalWidth: 5, penaltySpot: 0, centerCircle: 6, arcRadius: 0 },
      '9v9': { length: 70, width: 50, penaltyBoxWidth: 30, penaltyBoxDepth: 13, goalBoxWidth: 15, goalBoxDepth: 5, goalWidth: 6, penaltySpot: 9, centerCircle: 7, arcRadius: 7 },
      '11v11': { length: 105, width: 68, penaltyBoxWidth: 40.32, penaltyBoxDepth: 16.5, goalBoxWidth: 18.32, goalBoxDepth: 5.5, goalWidth: 7.32, penaltySpot: 11, centerCircle: 9.15, arcRadius: 9.15 }
    };

    const dims = fieldDimensions[format];
    const fieldLength = dims.length;
    const fieldWidthMeters = dims.width;
    const fieldWidth = width - 2 * margin;
    const fieldHeight = height - 2 * margin;

    // Białe tło
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Obramowanie
    ctx.strokeStyle = '#c4a76e';
    ctx.lineWidth = 3;
    ctx.strokeRect(margin, margin, fieldWidth, fieldHeight);

    // Linie boiska
    ctx.strokeStyle = '#c4a76e';
    ctx.lineWidth = 2;

    // Linia środkowa
    ctx.beginPath();
    ctx.moveTo(margin, height / 2);
    ctx.lineTo(width - margin, height / 2);
    ctx.stroke();

    // Okrąg środkowy
    const centerCircleRadius = (dims.centerCircle / fieldWidthMeters) * fieldWidth;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, centerCircleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Punkt środkowy
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#c4a76e';
    ctx.fill();

    // Pola karne i bramkowe
    const penaltyBoxWidth = (dims.penaltyBoxWidth / fieldWidthMeters) * fieldWidth;
    const penaltyBoxDepth = (dims.penaltyBoxDepth / fieldLength) * fieldHeight;
    const goalBoxWidth = (dims.goalBoxWidth / fieldWidthMeters) * fieldWidth;
    const goalBoxDepth = (dims.goalBoxDepth / fieldLength) * fieldHeight;

    const penaltyBoxLeft = (width - penaltyBoxWidth) / 2;
    const goalBoxLeft = (width - goalBoxWidth) / 2;
    const penaltyBoxRight = penaltyBoxLeft + penaltyBoxWidth;
    const goalBoxRight = goalBoxLeft + goalBoxWidth;

    ctx.strokeStyle = '#c4a76e';
    ctx.lineWidth = 2;
    ctx.strokeRect(penaltyBoxLeft, margin, penaltyBoxWidth, penaltyBoxDepth);
    ctx.strokeRect(goalBoxLeft, margin, goalBoxWidth, goalBoxDepth);
    ctx.strokeRect(penaltyBoxLeft, height - margin - penaltyBoxDepth, penaltyBoxWidth, penaltyBoxDepth);
    ctx.strokeRect(goalBoxLeft, height - margin - goalBoxDepth, goalBoxWidth, goalBoxDepth);

    // Bramki
    ctx.strokeStyle = '#c4a76e';
    ctx.lineWidth = 4;
    const goalWidth = (dims.goalWidth / fieldWidthMeters) * fieldWidth;
    const goalLeft = (width - goalWidth) / 2;
    const goalRight = goalLeft + goalWidth;
    
    ctx.beginPath();
    ctx.moveTo(goalLeft, margin);
    ctx.lineTo(goalLeft, margin - 5);
    ctx.lineTo(goalRight, margin - 5);
    ctx.lineTo(goalRight, margin);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(goalLeft, height - margin);
    ctx.lineTo(goalLeft, height - margin + 5);
    ctx.lineTo(goalRight, height - margin + 5);
    ctx.lineTo(goalRight, height - margin);
    ctx.stroke();

    // Łuki i punkty karne (dla 9v9 i 11v11)
    if (dims.arcRadius > 0 && dims.penaltySpot > 0) {
      ctx.strokeStyle = '#c4a76e';
      ctx.lineWidth = 2;
      const arcRadius = (dims.arcRadius / fieldWidthMeters) * fieldWidth;
      const penaltySpotDistance = (dims.penaltySpot / fieldLength) * fieldHeight;
      const penaltySpotTop = margin + penaltySpotDistance;
      const penaltySpotBottom = height - margin - penaltySpotDistance;
      
      const distancePenaltySpotToLine = ((dims.penaltyBoxDepth - dims.penaltySpot) / fieldLength) * fieldHeight;
      const arcAngle = Math.asin(Math.min(distancePenaltySpotToLine / arcRadius, 1));
      
      ctx.beginPath();
      ctx.arc(width / 2, penaltySpotTop, arcRadius, arcAngle, Math.PI - arcAngle);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width / 2, penaltySpotBottom, arcRadius, Math.PI + arcAngle, Math.PI * 2 - arcAngle);
      ctx.stroke();

      ctx.fillStyle = '#c4a76e';
      ctx.beginPath();
      ctx.arc(width / 2, penaltySpotTop, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(width / 2, penaltySpotBottom, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wyszarzenie stref
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.fillRect(goalBoxLeft, margin, penaltyBoxLeft - goalBoxLeft, fieldHeight);
    ctx.fillRect(goalBoxRight, margin, penaltyBoxRight - goalBoxRight, fieldHeight);

    // Linie półprzestrzeni
    ctx.strokeStyle = 'rgba(196, 167, 110, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 10]);

    ctx.beginPath();
    ctx.moveTo(penaltyBoxLeft, margin);
    ctx.lineTo(penaltyBoxLeft, height - margin);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(penaltyBoxRight, margin);
    ctx.lineTo(penaltyBoxRight, height - margin);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(goalBoxLeft, margin);
    ctx.lineTo(goalBoxLeft, height - margin);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(goalBoxRight, margin);
    ctx.lineTo(goalBoxRight, height - margin);
    ctx.stroke();

    ctx.setLineDash([]);

    // Rysuj strefy jeśli są w klatce
    if (currentFrameData.zones && currentFrameData.zones.length > 0) {
      currentFrameData.zones.forEach(zone => {
        ctx.save();
        ctx.fillStyle = zone.color || '#3b82f6';
        ctx.globalAlpha = zone.opacity || 0.3;
        ctx.strokeStyle = zone.color || '#3b82f6';
        ctx.lineWidth = 2;

        switch (zone.type) {
          case 'rectangle':
            ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
            ctx.globalAlpha = 1;
            ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
            break;
          
          case 'circle':
            ctx.beginPath();
            ctx.arc(zone.centerX, zone.centerY, zone.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
            break;
          
          case 'polygon':
            if (zone.points && zone.points.length > 0) {
              ctx.beginPath();
              ctx.moveTo(zone.points[0].x, zone.points[0].y);
              for (let i = 1; i < zone.points.length; i++) {
                ctx.lineTo(zone.points[i].x, zone.points[i].y);
              }
              ctx.closePath();
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.stroke();
            }
            break;
        }
        ctx.restore();
      });
    }

    // Rysuj linie jeśli są w klatce
    if (currentFrameData.lines && currentFrameData.lines.length > 0) {
      currentFrameData.lines.forEach(line => {
        ctx.save();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const dx = line.endX - line.startX;
        const dy = line.endY - line.startY;
        const angle = Math.atan2(dy, dx);
        const arrowSize = 15;

        // Funkcja rysująca grot strzałki
        const drawArrowHead = (x, y, angle) => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(
            x - arrowSize * Math.cos(angle - Math.PI / 6),
            y - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(x, y);
          ctx.lineTo(
            x - arrowSize * Math.cos(angle + Math.PI / 6),
            y - arrowSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        };

        // Funkcja licząca punkt kontrolny dla krzywej
        const getControlPoint = () => {
          if (line.controlX !== undefined && line.controlY !== undefined) {
            return { x: line.controlX, y: line.controlY };
          }
          return {
            x: (line.startX + line.endX) / 2 + (line.endY - line.startY) * 0.3,
            y: (line.startY + line.endY) / 2 - (line.endX - line.startX) * 0.3
          };
        };

        const drawWavyStraight = () => {
          const lineLength = Math.hypot(dx, dy);
          if (lineLength === 0) return;

          const amplitude = 6;
          const wavelength = 24;
          const straightTail = Math.min(22, lineLength * 0.35);
          const fadeTail = Math.min(14, Math.max(6, straightTail * 0.7));
          const tailStartDistance = Math.max(0, lineLength - straightTail);
          const fadeStartDistance = Math.max(0, tailStartDistance - fadeTail);
          const tailStartT = tailStartDistance / lineLength;
          const segments = Math.max(16, Math.ceil(lineLength / 4));
          const normalX = -dy / lineLength;
          const normalY = dx / lineLength;

          ctx.beginPath();
          for (let i = 0; i <= segments; i++) {
            const rawT = i / segments;
            const t = Math.min(rawT, tailStartT);
            const distance = t * lineLength;
            const baseX = line.startX + dx * t;
            const baseY = line.startY + dy * t;
            const phase = (distance * Math.PI * 2) / wavelength;

            let damping = 1;
            if (distance >= tailStartDistance) {
              damping = 0;
            } else if (distance > fadeStartDistance) {
              damping = (tailStartDistance - distance) / Math.max(1, tailStartDistance - fadeStartDistance);
            }

            const offset = Math.sin(phase) * amplitude * damping;
            const x = baseX + normalX * offset;
            const y = baseY + normalY * offset;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            if (rawT >= tailStartT) break;
          }

          const tailStartX = line.startX + dx * tailStartT;
          const tailStartY = line.startY + dy * tailStartT;
          ctx.lineTo(tailStartX, tailStartY);
          ctx.lineTo(line.endX, line.endY);
          ctx.stroke();
        };

        const getQuadraticPoint = (t, cp) => {
          const oneMinusT = 1 - t;
          return {
            x: oneMinusT * oneMinusT * line.startX + 2 * oneMinusT * t * cp.x + t * t * line.endX,
            y: oneMinusT * oneMinusT * line.startY + 2 * oneMinusT * t * cp.y + t * t * line.endY
          };
        };

        const getQuadraticTangent = (t, cp) => ({
          x: 2 * (1 - t) * (cp.x - line.startX) + 2 * t * (line.endX - cp.x),
          y: 2 * (1 - t) * (cp.y - line.startY) + 2 * t * (line.endY - cp.y)
        });

        const drawWavyCurve = (cp) => {
          const arcSamples = 80;
          const arcPoints = [];
          let curveLength = 0;
          let previousPoint = getQuadraticPoint(0, cp);
          arcPoints.push({ t: 0, distance: 0, point: previousPoint });

          for (let i = 1; i <= arcSamples; i++) {
            const t = i / arcSamples;
            const point = getQuadraticPoint(t, cp);
            curveLength += Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
            arcPoints.push({ t, distance: curveLength, point });
            previousPoint = point;
          }

          const getTAtDistance = (targetDistance) => {
            if (targetDistance <= 0) return 0;
            if (targetDistance >= curveLength) return 1;

            for (let i = 1; i < arcPoints.length; i++) {
              const prev = arcPoints[i - 1];
              const current = arcPoints[i];
              if (targetDistance <= current.distance) {
                const segmentDistance = current.distance - prev.distance || 1;
                const ratio = (targetDistance - prev.distance) / segmentDistance;
                return prev.t + (current.t - prev.t) * ratio;
              }
            }
            return 1;
          };

          const amplitude = 6;
          const wavelength = 24;
          const straightTail = Math.min(24, curveLength * 0.35);
          const fadeTail = Math.min(16, Math.max(6, straightTail * 0.7));
          const tailStartDistance = Math.max(0, curveLength - straightTail);
          const fadeStartDistance = Math.max(0, tailStartDistance - fadeTail);
          const tailStartT = getTAtDistance(tailStartDistance);
          const segments = Math.max(24, Math.ceil(curveLength / 4));

          ctx.beginPath();
          for (let i = 0; i <= segments; i++) {
            const rawT = i / segments;
            const t = Math.min(rawT, tailStartT);
            const point = getQuadraticPoint(t, cp);
            const tangent = getQuadraticTangent(t, cp);
            const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
            const normalX = -tangent.y / tangentLength;
            const normalY = tangent.x / tangentLength;
            const distance = t * curveLength;
            const phase = (distance * Math.PI * 2) / wavelength;

            let damping = 1;
            if (distance >= tailStartDistance) {
              damping = 0;
            } else if (distance > fadeStartDistance) {
              damping = (tailStartDistance - distance) / Math.max(1, tailStartDistance - fadeStartDistance);
            }

            const offset = Math.sin(phase) * amplitude * damping;
            const x = point.x + normalX * offset;
            const y = point.y + normalY * offset;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            if (rawT >= tailStartT) break;
          }

          const tailPoint = getQuadraticPoint(tailStartT, cp);
          ctx.lineTo(tailPoint.x, tailPoint.y);
          ctx.lineTo(line.endX, line.endY);
          ctx.stroke();

          return Math.atan2(line.endY - tailPoint.y, line.endX - tailPoint.x);
        };

        switch (line.type) {
          case 'line-solid':
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.stroke();
            break;

          case 'line-dashed':
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.stroke();
            ctx.setLineDash([]);
            break;

          case 'arrow-solid':
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.stroke();
            drawArrowHead(line.endX, line.endY, angle);
            break;

          case 'arrow-dashed':
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.lineTo(line.endX, line.endY);
            ctx.stroke();
            ctx.setLineDash([]);
            drawArrowHead(line.endX, line.endY, angle);
            break;

          case 'arrow-wavy':
            drawWavyStraight();
            drawArrowHead(line.endX, line.endY, angle);
            break;

          case 'double-arrow-solid':
            const offset = 4;
            const perpX = -Math.sin(angle) * offset;
            const perpY = Math.cos(angle) * offset;
            const arrowGap = 8;
            const shortenedEndX = line.endX - arrowGap * Math.cos(angle);
            const shortenedEndY = line.endY - arrowGap * Math.sin(angle);
            
            ctx.beginPath();
            ctx.moveTo(line.startX + perpX, line.startY + perpY);
            ctx.lineTo(shortenedEndX + perpX, shortenedEndY + perpY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(line.startX - perpX, line.startY - perpY);
            ctx.lineTo(shortenedEndX - perpX, shortenedEndY - perpY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(line.endX, line.endY);
            ctx.lineTo(
              line.endX - (arrowSize + 2) * Math.cos(angle - Math.PI / 6),
              line.endY - (arrowSize + 2) * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(line.endX, line.endY);
            ctx.lineTo(
              line.endX - (arrowSize + 2) * Math.cos(angle + Math.PI / 6),
              line.endY - (arrowSize + 2) * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
            break;

          case 'curve-line':
            const cp1 = getControlPoint();
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.quadraticCurveTo(cp1.x, cp1.y, line.endX, line.endY);
            ctx.stroke();
            break;

          case 'curve-arrow-solid':
            const cp2 = getControlPoint();
            ctx.beginPath();
            ctx.moveTo(line.startX, line.startY);
            ctx.quadraticCurveTo(cp2.x, cp2.y, line.endX, line.endY);
            ctx.stroke();
            
            const t = 0.95;
            const nearEndX = (1-t)*(1-t)*line.startX + 2*(1-t)*t*cp2.x + t*t*line.endX;
            const nearEndY = (1-t)*(1-t)*line.startY + 2*(1-t)*t*cp2.y + t*t*line.endY;
            const curveAngle = Math.atan2(line.endY - nearEndY, line.endX - nearEndX);
            drawArrowHead(line.endX, line.endY, curveAngle);
            break;

          case 'curve-arrow-wavy':
            const cp3 = getControlPoint();
            const wavyCurveAngle = drawWavyCurve(cp3);
            drawArrowHead(line.endX, line.endY, wavyCurveAngle);
            break;
        }

        ctx.restore();
      });
    }

    // Rysuj linie ruchu jeśli mamy następną klatkę
    if (nextFrameData) {
      (currentFrameData.team || []).forEach((player, i) => {
        const target = findMatchingPlayer(nextFrameData.team, player, i);
        if (target) {
          ctx.save();
          ctx.strokeStyle = 'rgba(26, 54, 93, 0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          
          ctx.beginPath();
          ctx.moveTo(player.x, player.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          
          ctx.setLineDash([]);
          ctx.restore();
        }
      });

      (currentFrameData.opponent || []).forEach((player, i) => {
        const target = findMatchingPlayer(nextFrameData.opponent, player, i);
        if (target) {
          ctx.save();
          ctx.strokeStyle = 'rgba(139, 0, 0, 0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          
          ctx.beginPath();
          ctx.moveTo(player.x, player.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          
          ctx.setLineDash([]);
          ctx.restore();
        }
      });
    }

    // Interpoluj pozycje zawodników jeśli jest progress
    let interpolatedData = currentFrameData;
    if (nextFrameData && progress > 0) {
      interpolatedData = interpolatePlayers(currentFrameData, nextFrameData, progress);
    }

    // Rysuj zawodników
    const playerSizes = { '7v7': 26, '9v9': 22, '11v11': 18 };
    const playerRadius = playerSizes[format] || 18;
    const fontSize = Math.floor(playerRadius * 0.65);

    // Drużyna
    interpolatedData.team.forEach(player => {
      const playerColor = player.color || tColor;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.rotation || 0);
      
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      ctx.arc(0, 0, playerRadius, 0, Math.PI * 2);
      ctx.fillStyle = playerColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.shadowColor = 'transparent';
      
      // Ręce zawodnika
      ctx.strokeStyle = playerColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(-playerRadius * 0.5, -playerRadius * 0.3);
      ctx.lineTo(-playerRadius * 1.3, -playerRadius * 0.8);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(playerRadius * 0.5, -playerRadius * 0.3);
      ctx.lineTo(playerRadius * 1.3, -playerRadius * 0.8);
      ctx.stroke();
      
      ctx.rotate(-(player.rotation || 0));
      ctx.font = `bold ${fontSize}px Arial`;
      drawPlayerLabel(ctx, player.number, 0, 0, playerRadius, playerColor);
      
      ctx.restore();
    });

    // Przeciwnik
    interpolatedData.opponent.forEach(player => {
      const playerColor = player.color || oColor;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.rotation || 0);
      
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      ctx.arc(0, 0, playerRadius, 0, Math.PI * 2);
      ctx.fillStyle = playerColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.shadowColor = 'transparent';
      
      // Ręce zawodnika
      ctx.strokeStyle = playerColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(-playerRadius * 0.5, -playerRadius * 0.3);
      ctx.lineTo(-playerRadius * 1.3, -playerRadius * 0.8);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(playerRadius * 0.5, -playerRadius * 0.3);
      ctx.lineTo(playerRadius * 1.3, -playerRadius * 0.8);
      ctx.stroke();
      
      ctx.rotate(-(player.rotation || 0));
      ctx.font = `bold ${fontSize}px Arial`;
      drawPlayerLabel(ctx, player.number, 0, 0, playerRadius, playerColor);
      
      ctx.restore();
    });

    // Piłka z klasycznym wzorem
    const ballSizes = { '7v7': 10, '9v9': 9, '11v11': 8 };
    const ballRadius = ballSizes[format] || 8;
    
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    
    // Biała podstawa
    ctx.beginPath();
    ctx.arc(interpolatedData.ball.x, interpolatedData.ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    
    // Klasyczny wzór piłki - czarne pięciokąty
    ctx.fillStyle = '#000000';
    
    const pentagonRadius = ballRadius * 0.35;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const x = interpolatedData.ball.x + Math.cos(angle) * pentagonRadius;
      const y = interpolatedData.ball.y + Math.sin(angle) * pentagonRadius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Dodatkowe czarne elementy
    const hexSize = ballRadius * 0.25;
    const positions = [
      { angle: 0, distance: ballRadius * 0.7 },
      { angle: Math.PI * 0.66, distance: ballRadius * 0.7 },
      { angle: -Math.PI * 0.66, distance: ballRadius * 0.7 }
    ];
    
    positions.forEach(pos => {
      const centerX = interpolatedData.ball.x + Math.cos(pos.angle) * pos.distance;
      const centerY = interpolatedData.ball.y + Math.sin(pos.angle) * pos.distance;
      
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI / 6) + pos.angle;
        const x = centerX + Math.cos(angle) * hexSize;
        const y = centerY + Math.sin(angle) * hexSize;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    });
    
    ctx.restore();
  };

  // Eksport animacji do MP4
  const exportAnimationToMP4 = async () => {
    if (!currentScheme || currentScheme.frames.length < 2) {
      alert('Musisz mieć co najmniej 2 klatki, aby wyeksportować animację!');
      return;
    }

    try {
      const ffmpeg = await ensureFfmpegLoaded();
      const canvas = document.createElement('canvas');
      canvas.width = 700;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      const frameFiles = [];
      const framesPerTransition = 15; // Liczba klatek pomiędzy każdą parą klatek schematu (dla zwolnionego tempa)
      let frameIndex = 0;

      // Generuj klatki animacji
      for (let i = 0; i < currentScheme.frames.length; i++) {
        const currentFrameData = currentScheme.frames[i];
        const nextFrameData = i < currentScheme.frames.length - 1 ? currentScheme.frames[i + 1] : null;

        if (nextFrameData) {
          // Generuj interpolowane klatki między obecną a następną
          for (let step = 0; step < framesPerTransition; step++) {
            const progress = step / framesPerTransition;
            
            // Rysuj klatkę z liniami ruchu
            drawAnimationFrame(ctx, currentFrameData, nextFrameData, progress, gameFormat, teamColor, opponentColor);
            
            // Zapisz klatkę
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) {
              throw new Error('Nie można wygenerować klatki PNG');
            }
            const arrayBuffer = await blob.arrayBuffer();
            const fileName = `frame_${String(frameIndex).padStart(4, '0')}.png`;
            await ffmpeg.writeFile(fileName, new Uint8Array(arrayBuffer));
            frameFiles.push(fileName);
            frameIndex++;
          }
        } else {
          // Ostatnia klatka - narysuj ją bez interpolacji
          drawAnimationFrame(ctx, currentFrameData, null, 0, gameFormat, teamColor, opponentColor);
          
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!blob) {
            throw new Error('Nie można wygenerować klatki PNG');
          }
          const arrayBuffer = await blob.arrayBuffer();
          const fileName = `frame_${String(frameIndex).padStart(4, '0')}.png`;
          await ffmpeg.writeFile(fileName, new Uint8Array(arrayBuffer));
          frameFiles.push(fileName);
          frameIndex++;
        }
      }

      const outputName = `animation_${Date.now()}.mp4`;
      
      // Generuj MP4 z framerate 20 fps (zwolnione tempo)
      try {
        await ffmpeg.exec([
          '-framerate', '20',
          '-i', 'frame_%04d.png',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          outputName
        ]);
      } catch (error) {
        // Fallback na mpeg4
        await ffmpeg.exec([
          '-framerate', '20',
          '-i', 'frame_%04d.png',
          '-c:v', 'mpeg4',
          '-pix_fmt', 'yuv420p',
          outputName
        ]);
      }

      const data = await ffmpeg.readFile(outputName);

      // Czyszczenie plików tymczasowych
      await Promise.all([
        ...frameFiles.map(fileName => ffmpeg.deleteFile(fileName)),
        ffmpeg.deleteFile(outputName)
      ]);

      // Pobierz plik MP4
      const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `animacja-${currentScheme.name || 'schemat'}-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Animacja została pobrana pomyślnie!');
    } catch (error) {
      console.error('[eksport animacji]', error);
      setErrorMessage('Błąd eksportu animacji: ' + error.message);
    }
  };

  // Eksport do PowerPoint
  const exportToPowerPoint = async (schemeIdFilter = null) => {
    try {
      const pres = new PptxGenJs();
      pres.layout = 'LAYOUT_WIDE';
      let schemeCount = 0;
      let processedSchemes = 0;

      const slideWidth = 13.333;
      const slideHeight = 7.5;
      const marginX = 0.4;
      const topRowY = 0.2;
      const topRowH = 0.35;
      const rowGap = 0.1;
      const subRowY = topRowY + topRowH + rowGap;
      const subRowH = 0.32;
      const contentTop = subRowY + subRowH + 0.3;
      const contentBottom = 0.4;
      const contentHeight = slideHeight - contentTop - contentBottom;
      const leftPanelW = 6.2;
      const panelGap = 0.4;
      const rightPanelX = marginX + leftPanelW + panelGap;
      const rightPanelW = slideWidth - rightPanelX - marginX;

      const phaseKeys = Object.keys(phases);
      const phaseGap = 0.18;
      const phaseCellW = (slideWidth - (2 * marginX) - (phaseKeys.length - 1) * phaseGap) / phaseKeys.length;
      const activeFill = '8BC34A';
      const inactiveFill = 'FFFFFF';
      const borderColor = '1F2937';
      
      // Najpierw policz ile będzie schematów
      Object.keys(schemes[gameFormat]).forEach(key => {
        const list = schemes[gameFormat][key];
        schemeCount += schemeIdFilter ? list.filter(s => schemeIdFilter.has(s.id)).length : list.length;
      });

      if (schemeCount === 0) {
        alert('Brak schematów do eksportu!');
        return;
      }
      
      // Przejdź przez wszystkie schematy w kolejności faz i subfaz
      for (const phase of phaseKeys) {
        const subPhases = phases[phase] || [];
        
        // Jeśli faza ma subfazy
        if (subPhases.length > 0) {
          for (const subPhase of subPhases) {
            const key = `${phase}-${subPhase}`;
            const schemeList = (schemes[gameFormat][key] || []).filter(s => !schemeIdFilter || schemeIdFilter.has(s.id));

            for (const scheme of schemeList) {
              processedSchemes++;

              // Dodaj slajd
              const slide = pres.addSlide();

              phaseKeys.forEach((phaseKey, idx) => {
                const phaseX = marginX + idx * (phaseCellW + phaseGap);
                const isActivePhase = phaseKey === phase;

                slide.addText(phaseKey, {
                  x: phaseX,
                  y: topRowY,
                  w: phaseCellW,
                  h: topRowH,
                  fontSize: 14,
                  bold: true,
                  align: 'center',
                  valign: 'mid',
                  color: '0F172A',
                  fill: { color: isActivePhase ? activeFill : inactiveFill },
                  line: { color: borderColor, width: 1 }
                });
              });

              // Wyświetl subfazy tylko dla wybranej fazy, na całej szerokości
              const selectedPhaseSubfases = phases[phase] || [];
              if (selectedPhaseSubfases.length > 0) {
                const subGap = 0.08;
                const subCellW = (slideWidth - (2 * marginX) - (selectedPhaseSubfases.length - 1) * subGap) / selectedPhaseSubfases.length;

                selectedPhaseSubfases.forEach((subPhaseKey, subIdx) => {
                  const subX = marginX + subIdx * (subCellW + subGap);
                  const isActiveSub = subPhaseKey === subPhase;

                  slide.addText(subPhaseKey, {
                    x: subX,
                    y: subRowY,
                    w: subCellW,
                    h: subRowH,
                    fontSize: 11,
                    bold: true,
                    align: 'center',
                    valign: 'mid',
                    color: '0F172A',
                    fill: { color: isActiveSub ? activeFill : inactiveFill },
                    line: { color: borderColor, width: 1 }
                  });
                });
              }
              
              // Lewy panel - animacja jak w "Pobierz animacje" lub klatka 1
              const schemeTeamColor = scheme.teamColor || teamColor;
              const schemeOpponentColor = scheme.opponentColor || opponentColor;
          const leftPanelX = marginX;
          const leftTitleH = 0.35;
          const leftMediaY = contentTop + leftTitleH + 0.15;
          const leftMediaH = contentHeight - leftTitleH - 0.15;

          slide.addText('Animacja', {
            x: leftPanelX,
            y: contentTop,
            w: leftPanelW,
            h: leftTitleH,
            fontSize: 18,
            bold: true,
            color: '111827'
          });

          try {
            const mp4DataUrl = await generateAnimatedMp4FromFrames(
              scheme.frames,
              gameFormat,
              schemeTeamColor,
              schemeOpponentColor
            );
            slide.addMedia({
              type: 'video',
              data: mp4DataUrl,
              x: leftPanelX,
              y: leftMediaY,
              w: leftPanelW,
              h: leftMediaH
            });
          } catch (mp4Error) {
            console.warn('Błąd przy tworzeniu MP4, używam klatki 1', mp4Error);

            if (scheme.frames.length > 0) {
              const imageDataUrl = (() => {
                const canvas = document.createElement('canvas');
                canvas.width = 700;
                canvas.height = 1080;
                const ctx = canvas.getContext('2d');
                drawFrameToCanvas(scheme.frames[0], gameFormat, canvas, ctx, schemeTeamColor, schemeOpponentColor);
                return canvas.toDataURL('image/png');
              })();

              slide.addImage({
                data: imageDataUrl,
                x: leftPanelX,
                y: leftMediaY,
                w: leftPanelW,
                h: leftMediaH,
                border: { pt: 1, color: '9CA3AF' }
              });
            }
          }

          // Prawy panel - nazwa schematu i komentarze
          const schemeName = scheme.name || 'Schemat bez nazwy';
          slide.addText(schemeName, {
            x: rightPanelX,
            y: contentTop,
            w: rightPanelW,
            h: 0.6,
            fontSize: 26,
            bold: true,
            color: '111827'
          });

          const commentLabelY = contentTop + 0.85;
          slide.addText('Komentarze/Zadania', {
            x: rightPanelX,
            y: commentLabelY,
            w: rightPanelW,
            h: 0.35,
            fontSize: 14,
            bold: true,
            color: '1f2937'
          });
          
          // Usuń tagi HTML z komentarza
          const plainComments = scheme.comments
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();

          slide.addText(plainComments || '(brak komentarza)', {
            x: rightPanelX,
            y: commentLabelY + 0.4,
            w: rightPanelW,
            h: slideHeight - (commentLabelY + 0.4) - contentBottom,
            fontSize: 12,
            color: '374151',
            valign: 'top',
            wrap: true
          });
            }
          }
        } else {
          // Faza bez subfaz
          const key = phase;
          const schemeList = (schemes[gameFormat][key] || []).filter(s => !schemeIdFilter || schemeIdFilter.has(s.id));

          for (const scheme of schemeList) {
            processedSchemes++;

            // Dodaj slajd
            const slide = pres.addSlide();

            phaseKeys.forEach((phaseKey, idx) => {
              const phaseX = marginX + idx * (phaseCellW + phaseGap);
              const isActivePhase = phaseKey === phase;

              slide.addText(phaseKey, {
                x: phaseX,
                y: topRowY,
                w: phaseCellW,
                h: topRowH,
                fontSize: 14,
                bold: true,
                align: 'center',
                valign: 'mid',
                color: '0F172A',
                fill: { color: isActivePhase ? activeFill : inactiveFill },
                line: { color: borderColor, width: 1 }
              });
            });

            // Lewy panel - animacja
            const schemeTeamColor = scheme.teamColor || teamColor;
            const schemeOpponentColor = scheme.opponentColor || opponentColor;
            const leftPanelX = marginX;
            const leftTitleH = 0.35;
            const leftMediaY = contentTop + leftTitleH + 0.15;
            const leftMediaH = contentHeight - leftTitleH - 0.15;

            slide.addText('Animacja', {
              x: leftPanelX,
              y: contentTop,
              w: leftPanelW,
              h: leftTitleH,
              fontSize: 18,
              bold: true,
              color: '111827'
            });

            try {
              const mp4DataUrl = await generateAnimatedMp4FromFrames(
                scheme.frames,
                gameFormat,
                schemeTeamColor,
                schemeOpponentColor
              );
              slide.addMedia({
                type: 'video',
                data: mp4DataUrl,
                x: leftPanelX,
                y: leftMediaY,
                w: leftPanelW,
                h: leftMediaH
              });
            } catch (mp4Error) {
              console.warn('Błąd przy tworzeniu MP4, używam klatki 1', mp4Error);

              if (scheme.frames.length > 0) {
                const imageDataUrl = (() => {
                  const canvas = document.createElement('canvas');
                  canvas.width = 700;
                  canvas.height = 1080;
                  const ctx = canvas.getContext('2d');
                  drawFrameToCanvas(scheme.frames[0], gameFormat, canvas, ctx, schemeTeamColor, schemeOpponentColor);
                  return canvas.toDataURL('image/png');
                })();

                slide.addImage({
                  data: imageDataUrl,
                  x: leftPanelX,
                  y: leftMediaY,
                  w: leftPanelW,
                  h: leftMediaH,
                  border: { pt: 1, color: '9CA3AF' }
                });
              }
            }

            // Prawy panel - nazwa schematu i komentarze
            const schemeName = scheme.name || 'Schemat bez nazwy';
            slide.addText(schemeName, {
              x: rightPanelX,
              y: contentTop,
              w: rightPanelW,
              h: 0.6,
              fontSize: 26,
              bold: true,
              color: '111827'
            });

            const commentLabelY = contentTop + 0.85;
            slide.addText('Komentarze/Zadania', {
              x: rightPanelX,
              y: commentLabelY,
              w: rightPanelW,
              h: 0.35,
              fontSize: 14,
              bold: true,
              color: '1f2937'
            });
            
            // Usuń tagi HTML z komentarza
            const plainComments = scheme.comments
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .trim();

            slide.addText(plainComments || '(brak komentarza)', {
              x: rightPanelX,
              y: commentLabelY + 0.4,
              w: rightPanelW,
              h: slideHeight - (commentLabelY + 0.4) - contentBottom,
              fontSize: 12,
              color: '374151',
              valign: 'top',
              wrap: true
            });
          }
        }
      }
      
      // Pobierz plik
      pres.writeFile({
        fileName: `Taktyka-${gameFormat}-${new Date().toISOString().split('T')[0]}`
      });
      
      alert(`Eksportowano ${processedSchemes} schematów do PowerPoint!`);
    } catch (error) {
      console.error('Błąd podczas eksportu PowerPoint:', error);
      setErrorMessage('Błąd eksportu PowerPoint: ' + error.message);
    }
  };

  // Eksport danych do JSON
  const exportData = () => {
    const dataToExport = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      phases,
      schemes,
      gameFormat,
      selectedPhase,
      selectedSubPhase,
      expandedPhases
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `model-gry-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import danych z JSON
  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            
            // Walidacja danych
            if (!data.phases || !data.schemes) {
              alert('Nieprawidłowy format pliku!');
              return;
            }
            
            // Przechowaj dane i pokaż dialog
            setImportedData(data);
            setShowImportDialog(true);
          } catch (error) {
            alert('Błąd podczas wczytywania pliku: ' + error.message);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleImportMode = (mode) => {
    if (!importedData) return;

    if (mode === 'merge') {
      // Dodaj tylko nowe rekordy - merge schemaów
      const mergedSchemes = { ...schemes };
      
      Object.keys(importedData.schemes).forEach(gameFormat => {
        if (!mergedSchemes[gameFormat]) {
          mergedSchemes[gameFormat] = {};
        }
        
        Object.keys(importedData.schemes[gameFormat]).forEach(key => {
          if (!mergedSchemes[gameFormat][key]) {
            mergedSchemes[gameFormat][key] = [];
          }
          
          // Dodaj nowe schematy (bez duplikatów po ID)
          const existingIds = new Set(mergedSchemes[gameFormat][key].map(s => s.id));
          const newSchemes = importedData.schemes[gameFormat][key].filter(
            s => !existingIds.has(s.id)
          );
          mergedSchemes[gameFormat][key] = [...mergedSchemes[gameFormat][key], ...newSchemes];
        });
      });
      
      setSchemes(mergedSchemes);
    } else if (mode === 'replace') {
      // Zamień wszystko
      setSchemes(importedData.schemes);
      setPhases(importedData.phases);
      setCurrentScheme(null);
    }
    
    // Zastosuj pozostałe dane
    if (importedData.gameFormat) setGameFormat(importedData.gameFormat);
    if (importedData.selectedPhase) setSelectedPhase(importedData.selectedPhase);
    if (importedData.selectedSubPhase) setSelectedSubPhase(importedData.selectedSubPhase);
    if (importedData.expandedPhases) setExpandedPhases(importedData.expandedPhases);
    
    setCurrentScheme(null);
    setPlayers(getInitialPlayers(importedData.gameFormat || gameFormat));
    
    // Zamknij dialog i wyczyść dane
    setShowImportDialog(false);
    setImportedData(null);
    
    alert('Dane zostały pomyślnie zaimportowane!');
  };

  const addNewPhase = () => {
    setNewPhaseMode(true);
  };

  const saveNewPhase = (newPhaseName) => {
    if (newPhaseName && newPhaseName.trim()) {
      setPhases(prev => ({
        ...prev,
        [newPhaseName.trim()]: []
      }));
      setSchemes(prev => {
        const newSchemes = { ...prev };
        // Dodaj klucz dla każdego formatu gry
        Object.keys(newSchemes).forEach(format => {
          newSchemes[format] = {
            ...newSchemes[format],
            [newPhaseName.trim()]: []
          };
        });
        return newSchemes;
      });
      setSelectedPhase(newPhaseName.trim());
    }
    setNewPhaseMode(false);
  };

  const addNewSubPhase = (phaseName) => {
    setNewSubPhaseMode(phaseName);
    setExpandedPhases(prev => ({ ...prev, [phaseName]: true }));
  };

  const saveNewSubPhase = (phaseName, newSubPhaseName) => {
    if (newSubPhaseName && newSubPhaseName.trim()) {
      setPhases(prev => ({
        ...prev,
        [phaseName]: [...prev[phaseName], newSubPhaseName.trim()]
      }));
      setSchemes(prev => {
        const newSchemes = { ...prev };
        const key = `${phaseName}-${newSubPhaseName.trim()}`;
        // Dodaj klucz dla każdego formatu gry
        Object.keys(newSchemes).forEach(format => {
          newSchemes[format] = {
            ...newSchemes[format],
            [key]: []
          };
        });
        return newSchemes;
      });
      setSelectedPhase(phaseName);
      setSelectedSubPhase(newSubPhaseName.trim());
    }
    setNewSubPhaseMode(null);
  };

  const renamePhase = (oldName, newName) => {
    if (!newName || !newName.trim() || oldName === newName) return;
    
    const newPhases = {};
    const newSchemes = {};
    
    Object.keys(phases).forEach(key => {
      if (key === oldName) {
        newPhases[newName] = phases[key];
        // Przenieś schematy
        if (phases[key].length === 0) {
          newSchemes[newName] = schemes[oldName] || [];
        } else {
          phases[key].forEach(subPhase => {
            newSchemes[`${newName}-${subPhase}`] = schemes[`${oldName}-${subPhase}`] || [];
          });
        }
      } else {
        newPhases[key] = phases[key];
        if (phases[key].length === 0) {
          newSchemes[key] = schemes[key];
        } else {
          phases[key].forEach(subPhase => {
            newSchemes[`${key}-${subPhase}`] = schemes[`${key}-${subPhase}`] || [];
          });
        }
      }
    });
    
    setPhases(newPhases);
    setSchemes(newSchemes);
    if (selectedPhase === oldName) setSelectedPhase(newName);
  };

  const renameSubPhase = (phaseName, oldSubName, newSubName) => {
    if (!newSubName || !newSubName.trim() || oldSubName === newSubName) return;
    
    setPhases(prev => ({
      ...prev,
      [phaseName]: prev[phaseName].map(sub => sub === oldSubName ? newSubName : sub)
    }));
    
    const oldKey = `${phaseName}-${oldSubName}`;
    const newKey = `${phaseName}-${newSubName}`;
    
    setSchemes(prev => {
      const newSchemes = { ...prev };
      newSchemes[newKey] = prev[oldKey] || [];
      delete newSchemes[oldKey];
      return newSchemes;
    });
    
    if (selectedSubPhase === oldSubName && selectedPhase === phaseName) {
      setSelectedSubPhase(newSubName);
    }
  };

  const deletePhase = (phaseName) => {
    const confirmDelete = window.confirm(`Czy na pewno chcesz usunąć fazę "${phaseName}"? Wszystkie schematy zostaną utracone.`);
    if (!confirmDelete) return;
    
    const newPhases = { ...phases };
    delete newPhases[phaseName];
    setPhases(newPhases);
    
    // Usuń schematy związane z tą fazą
    const newSchemes = { ...schemes };
    if (phases[phaseName].length === 0) {
      delete newSchemes[phaseName];
    } else {
      phases[phaseName].forEach(subPhase => {
        delete newSchemes[`${phaseName}-${subPhase}`];
      });
    }
    setSchemes(newSchemes);
    
    // Jeśli usunięta faza była wybrana, wybierz pierwszą dostępną
    if (selectedPhase === phaseName) {
      const remainingPhases = Object.keys(newPhases);
      if (remainingPhases.length > 0) {
        setSelectedPhase(remainingPhases[0]);
        if (newPhases[remainingPhases[0]].length > 0) {
          setSelectedSubPhase(newPhases[remainingPhases[0]][0]);
        }
      }
    }
    
    // Jeśli usunięty schemat był aktywny, wyczyść go
    if (currentScheme) {
      setCurrentScheme(null);
      setPlayers(getInitialPlayers(gameFormat));
    }
  };

  const deleteSubPhase = (phaseName, subPhaseName) => {
    const confirmDelete = window.confirm(`Czy na pewno chcesz usunąć subfazę "${subPhaseName}"? Wszystkie schematy zostaną utracone.`);
    if (!confirmDelete) return;
    
    setPhases(prev => ({
      ...prev,
      [phaseName]: prev[phaseName].filter(sub => sub !== subPhaseName)
    }));
    
    // Usuń schematy związane z tą subfazą
    const key = `${phaseName}-${subPhaseName}`;
    const newSchemes = { ...schemes };
    delete newSchemes[key];
    setSchemes(newSchemes);
    
    // Jeśli usunięta subfaza była wybrana, wybierz pierwszą dostępną
    if (selectedSubPhase === subPhaseName && selectedPhase === phaseName) {
      const remainingSubPhases = phases[phaseName].filter(sub => sub !== subPhaseName);
      if (remainingSubPhases.length > 0) {
        setSelectedSubPhase(remainingSubPhases[0]);
      }
    }
    
    // Jeśli usunięty schemat był aktywny, wyczyść go
    if (currentScheme) {
      setCurrentScheme(null);
      setPlayers(getInitialPlayers(gameFormat));
    }
  };

  const createNewScheme = () => {
    const key = phases[selectedPhase]?.length > 0 ? 
      `${selectedPhase}-${selectedSubPhase}` : selectedPhase;
    
    // Upewnij się, że klucz istnieje w schemes[gameFormat]
    if (!schemes[gameFormat][key]) {
      setSchemes(prev => ({
        ...prev,
        [gameFormat]: {
          ...prev[gameFormat],
          [key]: []
        }
      }));
    }
    
    const existingSchemesCount = schemes[gameFormat][key]?.length || 0;
    const initialFrame = {
      ...JSON.parse(JSON.stringify(getInitialPlayers(gameFormat))),
      lines: []
    };
    const newScheme = {
      id: Date.now(),
      name: `Schemat ${existingSchemesCount + 1}`,
      comments: '',
      frames: [initialFrame]
    };
    
    setSchemes({
      ...schemes,
      [gameFormat]: {
        ...schemes[gameFormat],
        [key]: [...(schemes[gameFormat][key] || []), newScheme]
      }
    });
    setCurrentScheme(newScheme);
    setCurrentFrame(0);
    setPlayers(newScheme.frames[0]);
  };

  const addFrame = () => {
    if (!currentScheme) return;
    
    const newFrame = {
      ...JSON.parse(JSON.stringify(players)),
      lines: [...lines]
    };
    const insertAt = currentFrame + 1;
    const newFrames = [
      ...currentScheme.frames.slice(0, insertAt),
      newFrame,
      ...currentScheme.frames.slice(insertAt)
    ];
    const updatedScheme = {
      ...currentScheme,
      frames: newFrames
    };

    updateCurrentScheme(updatedScheme);
    setCurrentFrame(insertAt);
  };

  const updateCurrentScheme = useCallback((updatedScheme) => {
    const key = phases[selectedPhase]?.length > 0 ? 
      `${selectedPhase}-${selectedSubPhase}` : selectedPhase;
    
    setSchemes({
      ...schemes,
      [gameFormat]: {
        ...schemes[gameFormat],
        [key]: schemes[gameFormat][key].map(s => s.id === updatedScheme.id ? updatedScheme : s)
      }
    });
    setCurrentScheme(updatedScheme);
  }, [phases, selectedPhase, selectedSubPhase, gameFormat, schemes]);

  const handleTeamColorChange = (newColor) => {
    setTeamColor(newColor);
    
    // Aktualizuj graczy na boisku (usuń indywidualne kolory jeśli istnieją)
    setPlayers(prev => ({
      ...prev,
      team: prev.team.map(player => {
        const { color, ...rest } = player;
        return rest;
      })
    }));
    
    // Zapisz do currentScheme jeśli schemat jest wybrany
    if (currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        teamColor: newColor,
        frames: currentScheme.frames.map((frame, idx) => {
          if (idx === currentFrame) {
            return {
              ...frame,
              team: frame.team.map(player => {
                const { color, ...rest } = player;
                return rest;
              })
            };
          }
          return frame;
        })
      };
      updateCurrentScheme(updatedScheme);
    }
    
    setOpenColorPalette(null);
  };

  const handleOpponentColorChange = (newColor) => {
    setOpponentColor(newColor);
    
    // Aktualizuj graczy na boisku (usuń indywidualne kolory jeśli istnieją)
    setPlayers(prev => ({
      ...prev,
      opponent: prev.opponent.map(player => {
        const { color, ...rest } = player;
        return rest;
      })
    }));
    
    // Zapisz do currentScheme jeśli schemat jest wybrany
    if (currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        opponentColor: newColor,
        frames: currentScheme.frames.map((frame, idx) => {
          if (idx === currentFrame) {
            return {
              ...frame,
              opponent: frame.opponent.map(player => {
                const { color, ...rest } = player;
                return rest;
              })
            };
          }
          return frame;
        })
      };
      updateCurrentScheme(updatedScheme);
    }
    
    setOpenColorPalette(null);
  };

  const getFormationPositions = (formationName, teamType) => {
    const isTeam = teamType === 'team';
    const gy = isTeam ? 1030 : 50;
    const dy = isTeam ? 900 : 180;
    const my = isTeam ? 740 : 340;
    const fy = isTeam ? 590 : 490;

    // Numeracja wg Narodowego Modelu Gry PZPN:
    // 1=GK, 2=Prawy obrońca, 3=Lewy obrońca, 4=Prawy CB, 5=Lewy CB,
    // 6=CDM, 7=Prawy skrzydłowy, 8=CM, 9=ST, 10=CAM/drugi napastnik, 11=Lewy skrzydłowy
    const formations = {
      '1-4-4-2': [
        { x: 350, y: gy, number: '1' },
        { x: 140, y: dy, number: '3' }, { x: 270, y: dy, number: '5' }, { x: 430, y: dy, number: '4' }, { x: 560, y: dy, number: '2' },
        { x: 140, y: my, number: '11' }, { x: 275, y: my, number: '8' }, { x: 425, y: my, number: '6' }, { x: 560, y: my, number: '7' },
        { x: 275, y: fy, number: '10' }, { x: 425, y: fy, number: '9' }
      ],
      '1-4-3-3': [
        { x: 350, y: gy, number: '1' },
        { x: 140, y: dy, number: '3' }, { x: 270, y: dy, number: '5' }, { x: 430, y: dy, number: '4' }, { x: 560, y: dy, number: '2' },
        { x: 210, y: my, number: '10' }, { x: 350, y: my, number: '6' }, { x: 490, y: my, number: '8' },
        { x: 155, y: fy, number: '11' }, { x: 350, y: fy, number: '9' }, { x: 545, y: fy, number: '7' }
      ],
      '1-3-5-2': [
        { x: 350, y: gy, number: '1' },
        { x: 220, y: dy, number: '5' }, { x: 350, y: dy, number: '4' }, { x: 480, y: dy, number: '2' },
        { x: 130, y: my, number: '3' }, { x: 250, y: my, number: '11' }, { x: 350, y: my, number: '6' }, { x: 450, y: my, number: '8' }, { x: 570, y: my, number: '7' },
        { x: 265, y: fy, number: '10' }, { x: 435, y: fy, number: '9' }
      ],
      '1-3-4-3': [
        { x: 350, y: gy, number: '1' },
        { x: 220, y: dy, number: '5' }, { x: 350, y: dy, number: '4' }, { x: 480, y: dy, number: '2' },
        { x: 175, y: my, number: '3' }, { x: 305, y: my, number: '6' }, { x: 395, y: my, number: '8' }, { x: 525, y: my, number: '7' },
        { x: 155, y: fy, number: '11' }, { x: 350, y: fy, number: '9' }, { x: 545, y: fy, number: '10' }
      ]
    };

    return formations[formationName] || null;
  };

  const applyFormation = (teamType, formationName) => {
    const positions = getFormationPositions(formationName, teamType);
    if (!positions) return;

    const newTeamPlayers = players[teamType].map((player, index) => ({
      ...player,
      x: positions[index].x,
      y: positions[index].y,
      number: positions[index].number
    }));

    setPlayers(prev => ({ ...prev, [teamType]: newTeamPlayers }));

    if (currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        frames: currentScheme.frames.map((frame, idx) =>
          idx === currentFrame
            ? { ...frame, [teamType]: newTeamPlayers }
            : frame
        )
      };
      updateCurrentScheme(updatedScheme);
    }

    setOpenFormationMenu(null);
  };

  const deleteScheme = (schemeId, key) => {
    const confirmDelete = window.confirm('Czy na pewno chcesz usunąć ten schemat? Tej czynności nie można cofnąć.');
    if (!confirmDelete) return;
    
    setSchemes({
      ...schemes,
      [gameFormat]: {
        ...schemes[gameFormat],
        [key]: schemes[gameFormat][key].filter(s => s.id !== schemeId)
      }
    });
    if (currentScheme?.id === schemeId) {
      setCurrentScheme(null);
      setPlayers(getInitialPlayers(gameFormat));
    }
  };

  // Znajdź klucz schematu w obiekcie schemes dla aktualnego formatu gry
  const findSchemeKey = (schemeId) => {
    const gameSchemes = schemes[gameFormat];
    for (let key in gameSchemes) {
      if (gameSchemes[key].some(s => s.id === schemeId)) {
        return key;
      }
    }
    return null;
  };

  // Przenieś schemat do nowej Fazy/Subfazy
  const moveScheme = () => {
    if (!moving) return;
    
    const newKey = phases[moveToPhase]?.length > 0 
      ? `${moveToPhase}-${moveToSubPhase}` 
      : moveToPhase;
    
    if (!schemes[gameFormat][newKey]) {
      alert('Faza/subfaza nie istnieje');
      return;
    }

    // Usuń ze starej lokalizacji
    const updatedOldSchemes = schemes[gameFormat][moving.oldKey].filter(s => s.id !== moving.scheme.id);
    
    // Dodaj do nowej lokalizacji
    const updatedNewSchemes = [...schemes[gameFormat][newKey], moving.scheme];
    
    setSchemes({
      ...schemes,
      [gameFormat]: {
        ...schemes[gameFormat],
        [moving.oldKey]: updatedOldSchemes,
        [newKey]: updatedNewSchemes
      }
    });
    
    // Zakończ tryb przenoszenia
    setMoving(null);
    setMoveToPhase(null);
    setMoveToSubPhase(null);
  };

  useEffect(() => {
    setPlayers(getInitialPlayers(gameFormat));
    if (currentScheme) {
      setCurrentScheme(null);
    }
    setMoving(null);
  }, [gameFormat]);

  // Inicjuj allPhasesExpanded na true gdy aplikacja startuje
  useEffect(() => {
    const allOpen = {};
    Object.keys(phases).forEach(phase => {
      allOpen[phase] = true;
    });
    setExpandedPhases(allOpen);
    setAllPhasesExpanded(true);
  }, []);

  // Obsługa przeciągania faz
  const handlePhaseDragStart = (e, phase) => {
    setDraggedPhase(phase);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePhaseDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handlePhaseDrop = (e, targetPhase) => {
    e.preventDefault();
    
    // Sprawdź czy to schemat czy faza
    const schemeId = e.dataTransfer.getData('schemeId');
    const fromKey = e.dataTransfer.getData('fromKey');
    
    if (schemeId && fromKey) {
      // To jest schemat - przenieś go
      handleSchemeDrop(e, targetPhase, schemeId, fromKey);
      return;
    }
    
    // To jest faza - obsłuż przeciąganie faz
    if (!draggedPhase || draggedPhase === targetPhase) {
      setDraggedPhase(null);
      return;
    }

    const phaseKeys = Object.keys(phases);
    const draggedIndex = phaseKeys.indexOf(draggedPhase);
    const targetIndex = phaseKeys.indexOf(targetPhase);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPhase(null);
      return;
    }

    // Utwórz nową kolejność faz
    const newPhaseKeys = [...phaseKeys];
    newPhaseKeys.splice(draggedIndex, 1);
    newPhaseKeys.splice(targetIndex, 0, draggedPhase);

    // Odbuduj obiekt phases z nową kolejnością
    const newPhases = {};
    newPhaseKeys.forEach(key => {
      newPhases[key] = phases[key];
    });

    setPhases(newPhases);
    setDraggedPhase(null);
  };

  // Obsługa przeciągania schematów do nowej fazy
  const handleSchemeDrop = (e, targetPhase, schemeId, fromKey) => {
    e.preventDefault();
    
    // Znaleźć schemat
    const scheme = schemes[gameFormat][fromKey]?.find(s => s.id === parseInt(schemeId));
    if (!scheme) return;
    
    // Jeśli target faza ma subfazy, przenieś do pierwszej subfazy
    const targetKey = phases[targetPhase]?.length > 0 
      ? `${targetPhase}-${phases[targetPhase][0]}`
      : targetPhase;
    
    // Nie przenosić jeśli jest już tam
    if (fromKey === targetKey) return;
    
    // Usuń ze starej lokalizacji
    const updatedOldSchemes = schemes[gameFormat][fromKey].filter(s => s.id !== scheme.id);
    
    // Dodaj do nowej lokalizacji
    const updatedNewSchemes = [...(schemes[gameFormat][targetKey] || []), scheme];
    
    setSchemes({
      ...schemes,
      [gameFormat]: {
        ...schemes[gameFormat],
        [fromKey]: updatedOldSchemes,
        [targetKey]: updatedNewSchemes
      }
    });
  };

  // Obsługa przeciągania subfaz
  const handleSubPhaseDragStart = (e, phase, subPhase) => {
    setDraggedSubPhase({ phase, subPhase });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSubPhaseDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSubPhaseDrop = (e, targetPhase, targetSubPhase) => {
    e.preventDefault();
    if (!draggedSubPhase || 
        (draggedSubPhase.phase === targetPhase && draggedSubPhase.subPhase === targetSubPhase)) {
      setDraggedSubPhase(null);
      return;
    }

    // Można przeciągać tylko w obrębie tej samej fazy
    if (draggedSubPhase.phase !== targetPhase) {
      setDraggedSubPhase(null);
      return;
    }

    const subPhases = [...phases[targetPhase]];
    const draggedIndex = subPhases.indexOf(draggedSubPhase.subPhase);
    const targetIndex = subPhases.indexOf(targetSubPhase);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSubPhase(null);
      return;
    }

    // Zmień kolejność subfaz
    subPhases.splice(draggedIndex, 1);
    subPhases.splice(targetIndex, 0, draggedSubPhase.subPhase);

    setPhases(prev => ({
      ...prev,
      [targetPhase]: subPhases
    }));

    setDraggedSubPhase(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawField(ctx, gameFormat);
    
    // Rysuj strefy (pod liniami i zawodnikami)
    zones.forEach((zone, index) => drawZone(ctx, zone, index === selectedZoneIndex, zoneColor, zoneOpacity, isCoarsePointer ? 1.6 : 1));
    if (currentZone) {
      drawZone(ctx, currentZone, false, zoneColor, zoneOpacity);
    }
    
    // Rysuj wierzchołki dla zaznaczonego wielokąta (do edycji)
    if (selectedZoneIndex !== null && zones[selectedZoneIndex] && zones[selectedZoneIndex].type === 'polygon' && !isDrawingMode) {
      const zone = zones[selectedZoneIndex];
      if (zone.points) {
        zone.points.forEach((point, idx) => {
          ctx.fillStyle = '#00ff00';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }
    }
    
    // Rysuj wielokąt w trakcie tworzenia
    if (zoneType === 'polygon' && polygonPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = zoneColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
      for (let i = 1; i < polygonPoints.length; i++) {
        ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
      }
      ctx.stroke();
      
      // Rysuj punkty
      polygonPoints.forEach(point => {
        ctx.fillStyle = zoneColor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
    
    // Rysuj linie
    lines.forEach((line, index) => {
      drawLine(ctx, line, index === selectedLineIndex);
      // Rysuj punkty końcowe dla zaznaczonej linii (do wydłużania)
      if (index === selectedLineIndex && !isDrawingMode) {
        ctx.fillStyle = '#ff6600';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Punkt startowy
        ctx.beginPath();
        ctx.arc(line.startX, line.startY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Punkt końcowy
        ctx.beginPath();
        ctx.arc(line.endX, line.endY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
    if (currentLine) {
      drawLine(ctx, currentLine, false);
    }
    
    // Jeśli odtwarzamy animację i mamy następną klatkę, rysuj ścieżki
    if (isPlaying && currentScheme && currentFrame < currentScheme.frames.length - 1) {
      const fromFrame = currentScheme.frames[currentFrame];
      const toFrame = currentScheme.frames[currentFrame + 1];
      
      // Rysuj ścieżki ruchu
      (fromFrame.team || []).forEach((player, i) => {
        const target = findMatchingPlayer(toFrame.team, player, i);
        if (target) drawPlayerPath(ctx, player, target, true, interpolationProgress);
      });

      (fromFrame.opponent || []).forEach((player, i) => {
        const target = findMatchingPlayer(toFrame.opponent, player, i);
        if (target) drawPlayerPath(ctx, player, target, false, interpolationProgress);
      });
    }
    
    players.team.forEach(player => drawPlayer(ctx, player, true, null, teamColor, opponentColor, gameFormat, selectedPlayer));
    players.opponent.forEach(player => drawPlayer(ctx, player, false, null, teamColor, opponentColor, gameFormat, selectedPlayer));
    drawBall(ctx, players.ball, gameFormat);
  }, [players, isPlaying, currentFrame, currentScheme, interpolationProgress, lines, currentLine, selectedLineIndex, zones, currentZone, selectedZoneIndex, polygonPoints, zoneColor, zoneType, isDrawingMode, selectedPlayer, gameFormat, teamColor, opponentColor, zoneOpacity]);

  useEffect(() => {
    let interval;
    if (isPlaying && currentScheme && currentFrame < currentScheme.frames.length - 1) {
      const startFrame = currentScheme.frames[currentFrame];
      const endFrame = currentScheme.frames[currentFrame + 1];
      const duration = 800; // czas trwania przejścia w ms
      const fps = 30; // klatek na sekundę
      const steps = (duration / 1000) * fps;
      let step = 0;
      
      interval = setInterval(() => {
        step++;
        const progress = Math.min(step / steps, 1);
        setInterpolationProgress(progress);
        
        const interpolated = interpolatePlayers(startFrame, endFrame, progress);
        setPlayers(interpolated);
        
        if (progress >= 1) {
          step = 0;
          setCurrentFrame(prev => {
            const next = prev + 1;
            if (next >= currentScheme.frames.length - 1) {
              setIsPlaying(false);
              setInterpolationProgress(0);
            }
            return next;
          });
        }
      }, 1000 / fps);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentFrame, currentScheme]);

  // Załaduj linie przy zmianie klatki
  useEffect(() => {
    if (currentScheme && currentScheme.frames[currentFrame]) {
      const frame = currentScheme.frames[currentFrame];
      setLines(frame.lines || []);
      setZones(frame.zones || []);
    }
  }, [currentFrame, currentScheme]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const source = e.touches ? e.touches[0] : e;
    return {
      x: (source.clientX - rect.left) * scaleX,
      y: (source.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e) => {
    const { x, y } = getCanvasCoords(e);

    // Tryb rysowania linii
    if (isDrawingMode && drawingTool === 'line') {
      setCurrentLine({
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        type: lineType,
        color: lineColor
      });
      return;
    }

    // Tryb rysowania stref
    if (isDrawingMode && drawingTool === 'zone') {
      if (zoneType === 'polygon') {
        // Sprawdź czy kliknięto blisko pierwszego punktu (zamknięcie wielokąta)
        if (polygonPoints.length >= 3) {
          const firstPoint = polygonPoints[0];
          const dist = Math.sqrt((x - firstPoint.x) ** 2 + (y - firstPoint.y) ** 2);
          if (dist < 10) {
            // Zamknij wielokąt
            const newZone = {
              type: 'polygon',
              points: [...polygonPoints],
              color: zoneColor,
              opacity: zoneOpacity
            };
            const newZones = [...zones, newZone];
            setZones(newZones);
            setPolygonPoints([]);
            
            // Zapisz do schematu
            if (currentScheme) {
              const updatedScheme = {
                ...currentScheme,
                frames: currentScheme.frames.map((f, i) =>
                  i === currentFrame ? { ...players, lines: lines, zones: newZones } : f
                )
              };
              updateCurrentScheme(updatedScheme);
            }
            return;
          }
        }
        
        // Dodaj nowy punkt
        setPolygonPoints([...polygonPoints, { x, y }]);
        return;
      } else if (zoneType === 'rectangle') {
        setCurrentZone({
          type: 'rectangle',
          x: x,
          y: y,
          width: 0,
          height: 0,
          color: zoneColor,
          opacity: zoneOpacity
        });
        return;
      } else if (zoneType === 'circle') {
        setCurrentZone({
          type: 'circle',
          centerX: x,
          centerY: y,
          radius: 0,
          color: zoneColor,
          opacity: zoneOpacity
        });
        return;
      }
    }

    // Tryb przesuwania - sprawdź czy kliknięto na linię lub jej punkt kontrolny
    if (!isDrawingMode && lines.length > 0) {
      // Najpierw sprawdź końce linii (do wydłużania) jeśli linia jest zaznaczona
      if (selectedLineIndex !== null) {
        const lineEnd = isPointNearLineEnd(x, y, lines[selectedLineIndex]);
        if (lineEnd) {
          setIsDraggingLineEnd(lineEnd);
          return;
        }
      }
      
      // Sprawdź punkty kontrolne krzywych (jeśli linia jest zaznaczona)
      if (selectedLineIndex !== null && lines[selectedLineIndex]?.type.includes('curve')) {
        if (isPointNearControlPoint(x, y, lines[selectedLineIndex])) {
          setIsDraggingControlPoint(true);
          return;
        }
      }
      
      // Sprawdź czy kliknięto na którąś linię
      for (let i = lines.length - 1; i >= 0; i--) {
        if (isPointNearLine(x, y, lines[i])) {
          setSelectedLineIndex(i);
          setSelectedZoneIndex(null); // Odznacz strefę
          setIsDraggingLine(true);
          // Zapisz offset między punktem kliknięcia a początkiem/końcem linii
          setLineDragOffset({
            startX: x - lines[i].startX,
            startY: y - lines[i].startY,
            endX: x - lines[i].endX,
            endY: y - lines[i].endY
          });
          return;
        }
      }
      
      // Jeśli kliknięto poza liniami, odznacz linię
      if (selectedLineIndex !== null) {
        setSelectedLineIndex(null);
      }
    }

    // Tryb przesuwania - sprawdź czy kliknięto na strefę
    if (!isDrawingMode && zones.length > 0) {
      // Najpierw sprawdź wierzchołki zaznaczonego wielokąta (do edycji)
      if (selectedZoneIndex !== null && zones[selectedZoneIndex].type === 'polygon') {
        const vertexIndex = isPointNearPolygonVertex(x, y, zones[selectedZoneIndex]);
        if (vertexIndex !== null) {
          setIsDraggingPolygonVertex(true);
          setDraggedVertexIndex(vertexIndex);
          return;
        }
      }
      
      // Uchwyty zmiany rozmiaru zaznaczonego prostokąta/koła
      if (selectedZoneIndex !== null && zones[selectedZoneIndex]) {
        const handle = hitZoneHandle(x, y, zones[selectedZoneIndex], isCoarsePointer ? 18 : 10);
        if (handle) {
          setZoneHandleDrag({ handle, origin: zones[selectedZoneIndex] });
          return;
        }
      }

      // Sprawdź czy kliknięto w zaznaczoną strefę (do przesuwania)
      if (selectedZoneIndex !== null && isPointInZone(x, y, zones[selectedZoneIndex])) {
        const zone = zones[selectedZoneIndex];
        setIsDraggingZone(true);
        
        // Oblicz offset dla różnych typów stref
        if (zone.type === 'rectangle') {
          setZoneDragOffset({ x: x - zone.x, y: y - zone.y });
        } else if (zone.type === 'circle') {
          setZoneDragOffset({ x: x - zone.centerX, y: y - zone.centerY });
        } else if (zone.type === 'polygon') {
          // Dla wielokąta zapisz offset względem każdego punktu
          setZoneDragOffset({ x: x, y: y });
        }
        return;
      }
      
      // Sprawdź czy kliknięto na którąś strefę (do zaznaczenia)
      for (let i = zones.length - 1; i >= 0; i--) {
        if (isPointInZone(x, y, zones[i])) {
          setSelectedZoneIndex(i);
          setSelectedLineIndex(null); // Odznacz linię
          return;
        }
      }
      
      // Jeśli kliknięto poza strefami, odznacz strefę
      if (selectedZoneIndex !== null) {
        setSelectedZoneIndex(null);
      }
    }

    // Rozmiary dynamiczne
    const ballSizes = { '7v7': 10, '9v9': 9, '11v11': 8 };
    const playerSizes = { '7v7': 26, '9v9': 22, '11v11': 18 };
    const ballRadius = ballSizes[gameFormat] || 8;
    const playerRadius = playerSizes[gameFormat] || 18;

    // Sprawdź czy kliknięto na rączkę rotacji (jeśli zawodnik jest wybrany)
    if (selectedPlayer) {
      const playerList = selectedPlayer.type === 'team' ? players.team : players.opponent;
      const player = playerList.find(p => p.id === selectedPlayer.id);
      
      if (player) {
        const handleDistance = playerRadius + 15;
        const handleX = player.x + Math.sin(player.rotation || 0) * handleDistance;
        const handleY = player.y - Math.cos(player.rotation || 0) * handleDistance;
        const distToHandle = Math.sqrt((x - handleX) ** 2 + (y - handleY) ** 2);
        
        if (distToHandle < 12) {
          setIsDraggingRotation(true);
          return;
        }
      }
    }

    // Sprawdź piłkę
    const dist = Math.sqrt((x - players.ball.x) ** 2 + (y - players.ball.y) ** 2);
    if (dist < ballRadius + 5) {
      setIsDragging(true);
      setDraggedPlayer({ type: 'ball' });
      setSelectedPlayer(null); // Odznacz zawodnika
      return;
    }

    // Sprawdź zawodników
    for (const player of [...players.team, ...players.opponent]) {
      const dist = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2);
      if (dist < playerRadius + 5) {
        const playerType = players.team.includes(player) ? 'team' : 'opponent';
        
        // Najpierw wybierz zawodnika (to pokaże rączkę rotacji)
        setSelectedPlayer({
          type: playerType,
          id: player.id
        });
        
        // Następnie rozpocznij przeciąganie
        setIsDragging(true);
        setDraggedPlayer({
          type: playerType,
          id: player.id
        });
        return;
      }
    }
    
    // Kliknięto poza zawodnikami - odznacz
    setSelectedPlayer(null);
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    const { x, y } = getCanvasCoords(e);

    // Rysowanie linii
    if (currentLine) {
      setCurrentLine(prev => ({
        ...prev,
        endX: x,
        endY: y
      }));
      return;
    }

    // Rysowanie stref
    if (currentZone) {
      if (currentZone.type === 'rectangle') {
        setCurrentZone(prev => ({
          ...prev,
          width: x - prev.x,
          height: y - prev.y
        }));
      } else if (currentZone.type === 'circle') {
        const dx = x - currentZone.centerX;
        const dy = y - currentZone.centerY;
        const radius = Math.sqrt(dx * dx + dy * dy);
        setCurrentZone(prev => ({
          ...prev,
          radius: radius
        }));
      }
      return;
    }

    // Wydłużanie linii (przesuwanie końców)
    if (isDraggingLineEnd && selectedLineIndex !== null) {
      const updatedLines = [...lines];
      if (isDraggingLineEnd === 'start') {
        updatedLines[selectedLineIndex] = {
          ...updatedLines[selectedLineIndex],
          startX: x,
          startY: y
        };
      } else if (isDraggingLineEnd === 'end') {
        updatedLines[selectedLineIndex] = {
          ...updatedLines[selectedLineIndex],
          endX: x,
          endY: y
        };
      }
      setLines(updatedLines);
      return;
    }

    // Przesuwanie punktu kontrolnego krzywej
    if (isDraggingControlPoint && selectedLineIndex !== null) {
      const updatedLines = [...lines];
      updatedLines[selectedLineIndex] = {
        ...updatedLines[selectedLineIndex],
        controlX: x,
        controlY: y
      };
      setLines(updatedLines);
      return;
    }

    // Przesuwanie całej linii
    if (isDraggingLine && selectedLineIndex !== null) {
      const selectedLine = lines[selectedLineIndex];
      const newStartX = x - lineDragOffset.startX;
      const newStartY = y - lineDragOffset.startY;
      const newEndX = x - lineDragOffset.endX;
      const newEndY = y - lineDragOffset.endY;
      
      const updatedLines = [...lines];
      const newLine = {
        ...selectedLine,
        startX: newStartX,
        startY: newStartY,
        endX: newEndX,
        endY: newEndY
      };
      
      // Jeśli linia ma punkt kontrolny, przesuń go proporcjonalnie
      if (selectedLine.controlX !== undefined && selectedLine.controlY !== undefined) {
        const dx = newStartX - selectedLine.startX;
        const dy = newStartY - selectedLine.startY;
        newLine.controlX = selectedLine.controlX + dx;
        newLine.controlY = selectedLine.controlY + dy;
      }
      
      updatedLines[selectedLineIndex] = newLine;
      setLines(updatedLines);
      return;
    }

    // Zmiana rozmiaru prostokąta/koła za uchwyt
    if (zoneHandleDrag && selectedZoneIndex !== null) {
      const updatedZones = [...zones];
      updatedZones[selectedZoneIndex] = resizeZone(zoneHandleDrag.origin, zoneHandleDrag.handle, x, y);
      setZones(updatedZones);
      return;
    }

    // Edycja wierzchołka wielokąta
    if (isDraggingPolygonVertex && selectedZoneIndex !== null && draggedVertexIndex !== null) {
      const updatedZones = [...zones];
      const zone = updatedZones[selectedZoneIndex];
      if (zone.type === 'polygon' && zone.points) {
        const newPoints = [...zone.points];
        newPoints[draggedVertexIndex] = { x, y };
        updatedZones[selectedZoneIndex] = {
          ...zone,
          points: newPoints
        };
        setZones(updatedZones);
      }
      return;
    }

    // Przesuwanie całej strefy
    if (isDraggingZone && selectedZoneIndex !== null) {
      const updatedZones = [...zones];
      const zone = zones[selectedZoneIndex];
      
      if (zone.type === 'rectangle') {
        updatedZones[selectedZoneIndex] = {
          ...zone,
          x: x - zoneDragOffset.x,
          y: y - zoneDragOffset.y
        };
      } else if (zone.type === 'circle') {
        updatedZones[selectedZoneIndex] = {
          ...zone,
          centerX: x - zoneDragOffset.x,
          centerY: y - zoneDragOffset.y
        };
      } else if (zone.type === 'polygon') {
        const dx = x - zoneDragOffset.x;
        const dy = y - zoneDragOffset.y;
        const newPoints = zone.points.map(point => ({
          x: point.x + dx,
          y: point.y + dy
        }));
        updatedZones[selectedZoneIndex] = {
          ...zone,
          points: newPoints
        };
        setZoneDragOffset({ x, y }); // Aktualizuj offset dla płynnego przesuwania
      }
      
      setZones(updatedZones);
      return;
    }

    // Obsługa rotacji
    if (isDraggingRotation && selectedPlayer) {
      const playerList = selectedPlayer.type === 'team' ? players.team : players.opponent;
      const player = playerList.find(p => p.id === selectedPlayer.id);
      
      if (player) {
        // Oblicz kąt między zawodnikiem a myszą
        const dx = x - player.x;
        const dy = y - player.y;
        const angle = Math.atan2(dx, -dy); // -dy bo oś Y rośnie w dół
        
        setPlayers(prev => {
          const next = {
            ...prev,
            [selectedPlayer.type]: prev[selectedPlayer.type].map(p =>
              p.id === selectedPlayer.id ? { ...p, rotation: angle } : p
            )
          };
          latestPlayersRef.current = next;
          return next;
        });
      }
      return;
    }

    // Kursor zmiany rozmiaru nad uchwytem zaznaczonej strefy
    if (!isDragging && !isDrawingMode && canvas) {
      const zone = selectedZoneIndex !== null ? zones[selectedZoneIndex] : null;
      const handle = zone ? hitZoneHandle(x, y, zone, 10) : null;
      canvas.style.cursor = handle ? zoneHandleCursor(handle) : '';
    }

    // Obsługa przeciągania
    if (!isDragging || !draggedPlayer) return;

    const boundedX = Math.max(20, Math.min(x, canvas.width - 20));
    const boundedY = Math.max(20, Math.min(y, canvas.height - 20));

    if (draggedPlayer.type === 'ball') {
      setPlayers(prev => {
        const next = {
          ...prev,
          ball: { x: boundedX, y: boundedY }
        };
        latestPlayersRef.current = next;
        return next;
      });
    } else {
      setPlayers(prev => {
        const next = {
          ...prev,
          [draggedPlayer.type]: prev[draggedPlayer.type].map(p =>
            p.id === draggedPlayer.id ? { ...p, x: boundedX, y: boundedY } : p
          )
        };
        latestPlayersRef.current = next;
        return next;
      });
    }
  };

  const handleCanvasMouseUp = () => {
    // Zakończ rysowanie linii
    if (currentLine && isDrawingMode && drawingTool === 'line') {
      const distance = Math.sqrt(
        Math.pow(currentLine.endX - currentLine.startX, 2) + 
        Math.pow(currentLine.endY - currentLine.startY, 2)
      );
      
      // Dodaj linię tylko jeśli jest wystarczająco długa
      if (distance > 10) {
        const newLines = [...lines, currentLine];
        setLines(newLines);
        
        // Zapisz linie do schematu
        if (currentScheme) {
          const updatedScheme = {
            ...currentScheme,
            frames: currentScheme.frames.map((f, i) => 
              i === currentFrame ? { ...players, lines: newLines, zones: zones } : f
            )
          };
          updateCurrentScheme(updatedScheme);
        }
      }
      setCurrentLine(null);
      return;
    }

    // Zakończ rysowanie strefy
    if (currentZone && isDrawingMode && drawingTool === 'zone') {
      let shouldAdd = false;
      
      if (currentZone.type === 'rectangle') {
        // Dodaj prostokąt tylko jeśli ma minimalny rozmiar
        shouldAdd = Math.abs(currentZone.width) > 20 && Math.abs(currentZone.height) > 20;
      } else if (currentZone.type === 'circle') {
        // Dodaj koło tylko jeśli ma minimalny promień
        shouldAdd = currentZone.radius > 10;
      }
      
      if (shouldAdd) {
        const newZones = [...zones, currentZone];
        setZones(newZones);
        
        // Zapisz strefy do schematu
        if (currentScheme) {
          const updatedScheme = {
            ...currentScheme,
            frames: currentScheme.frames.map((f, i) => 
              i === currentFrame ? { ...players, lines: lines, zones: newZones } : f
            )
          };
          updateCurrentScheme(updatedScheme);
        }
      }
      setCurrentZone(null);
      return;
    }

    // Zakończ wydłużanie linii i zapisz zmiany
    if (isDraggingLineEnd && currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        frames: currentScheme.frames.map((f, i) => 
          i === currentFrame ? { ...players, lines: lines, zones: zones } : f
        )
      };
      updateCurrentScheme(updatedScheme);
    }

    // Zakończ przesuwanie linii/punktu kontrolnego i zapisz zmiany
    if ((isDraggingLine || isDraggingControlPoint) && currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        frames: currentScheme.frames.map((f, i) => 
          i === currentFrame ? { ...players, lines: lines, zones: zones } : f
        )
      };
      updateCurrentScheme(updatedScheme);
    }

    // Zakończ przesuwanie strefy lub edycję wierzchołków i zapisz zmiany
    if ((isDraggingZone || isDraggingPolygonVertex || zoneHandleDrag) && currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        frames: currentScheme.frames.map((f, i) => 
          i === currentFrame ? { ...players, lines: lines, zones: zones } : f
        )
      };
      updateCurrentScheme(updatedScheme);
    }

    // Zakończ przeciąganie zawodnika/piłki lub rotację i zapisz zmiany
    if ((isDragging || isDraggingRotation) && currentScheme) {
      const latestPlayers = latestPlayersRef.current;
      const updatedScheme = {
        ...currentScheme,
        frames: currentScheme.frames.map((f, i) =>
          i === currentFrame ? { ...latestPlayers, lines: lines, zones: zones } : f
        )
      };
      updateCurrentScheme(updatedScheme);
    }

    setIsDragging(false);
    setDraggedPlayer(null);
    setIsDraggingRotation(false);
    setIsDraggingLine(false);
    setIsDraggingControlPoint(false);
    setIsDraggingLineEnd(null);
    setIsDraggingZone(false);
    setIsDraggingPolygonVertex(false);
    setZoneHandleDrag(null);
    setDraggedVertexIndex(null);
  };

  const handleCanvasDoubleClick = (e) => {
    const { x, y } = getCanvasCoords(e);

    const playerSizes = { '7v7': 26, '9v9': 22, '11v11': 18 };
    const playerRadius = playerSizes[gameFormat] || 18;

    // Sprawdź czy kliknięto na zawodniku
    for (const player of [...players.team, ...players.opponent]) {
      const dist = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2);
      if (dist < playerRadius + 5) {
        const playerType = players.team.includes(player) ? 'team' : 'opponent';
        const defaultColor = playerType === 'team' ? teamColor : opponentColor;
        setOpenColorPalette(null); // Zamknij inne palety kolorów
        setEditingPlayerNumber({
          player: player,
          type: playerType
        });
        setNewPlayerNumber(player.number);
        setNewPlayerColor(player.color || defaultColor);
        return;
      }
    }
  };

  // Touch event handlers dla canvas (rejestrowane przez useEffect jako non-passive)
  const handleCanvasTouchStart = useRef(null);
  const handleCanvasTouchMove = useRef(null);
  const handleCanvasTouchEnd = useRef(null);

  useEffect(() => {
    handleCanvasTouchStart.current = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleCanvasMouseDown(e);
      }
    };
    handleCanvasTouchMove.current = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleCanvasMouseMove(e);
      }
    };
    handleCanvasTouchEnd.current = (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // double-tap → otwórz edycję zawodnika
        if (e.changedTouches.length > 0) {
          handleCanvasDoubleClick({ touches: e.changedTouches });
        }
      }
      lastTapRef.current = now;
      handleCanvasMouseUp();
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const opts = { passive: false };
    const onStart = (e) => handleCanvasTouchStart.current?.(e);
    const onMove  = (e) => handleCanvasTouchMove.current?.(e);
    const onEnd   = (e) => handleCanvasTouchEnd.current?.(e);
    canvas.addEventListener('touchstart', onStart, opts);
    canvas.addEventListener('touchmove',  onMove,  opts);
    canvas.addEventListener('touchend',   onEnd,   opts);
    return () => {
      canvas.removeEventListener('touchstart', onStart, opts);
      canvas.removeEventListener('touchmove',  onMove,  opts);
      canvas.removeEventListener('touchend',   onEnd,   opts);
    };
  }, []);

  const savePlayerNumber = () => {
    if (!editingPlayerNumber || !newPlayerNumber.trim()) {
      setEditingPlayerNumber(null);
      setOpenColorPalette(null); // Zamknij paletę kolorów
      return;
    }

    const { player, type } = editingPlayerNumber;
    
    setPlayers(prev => ({
      ...prev,
      [type]: prev[type].map(p =>
        p.id === player.id ? { ...p, number: newPlayerNumber.trim(), color: newPlayerColor } : p
      )
    }));
    
    if (currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        frames: currentScheme.frames.map((f, i) => 
          i === currentFrame ? {
            ...f,
            [type]: f[type].map(p =>
              p.id === player.id ? { ...p, number: newPlayerNumber.trim(), color: newPlayerColor } : p
            ),
            lines: lines
          } : f
        )
      };
      updateCurrentScheme(updatedScheme);
    }
    
    setEditingPlayerNumber(null);
    setNewPlayerNumber('');
    setNewPlayerColor('');
    setOpenColorPalette(null); // Zamknij paletę kolorów
  };

  const togglePhase = (phase) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phase]: !prev[phase]
    }));
  };

  const toggleAllPhases = () => {
    if (allPhasesExpanded) {
      // Zwijanie - wszystkie na false
      const allClosed = {};
      Object.keys(phases).forEach(phase => {
        allClosed[phase] = false;
      });
      setExpandedPhases(allClosed);
      setAllPhasesExpanded(false);
    } else {
      // Rozwijanie - wszystkie na true
      const allOpen = {};
      Object.keys(phases).forEach(phase => {
        allOpen[phase] = true;
      });
      setExpandedPhases(allOpen);
      setAllPhasesExpanded(true);
    }
  };

  const formatText = (format) => {
    if (!commentsRef.current) return;
    
    // Upewnij się że edytor ma focus
    commentsRef.current.focus();
    
    // Czekaj micro-task aby upewnić się że focus jest ustawiony
    setTimeout(() => {
      switch (format) {
        case 'bold':
          document.execCommand('bold', false, null);
          break;
        case 'italic':
          document.execCommand('italic', false, null);
          break;
        case 'underline':
          document.execCommand('underline', false, null);
          break;
        case 'strike':
          document.execCommand('strikeThrough', false, null);
          break;
        case 'bullet':
          const bulletText = '● ';
          if (window.getSelection().toString()) {
            document.execCommand('delete', false, null);
          }
          document.execCommand('insertText', false, bulletText);
          break;
        case 'number':
          break;
        case 'check':
          const checkText = '☐ ';
          if (window.getSelection().toString()) {
            document.execCommand('delete', false, null);
          }
          document.execCommand('insertText', false, checkText);
          break;
        case 'line':
          if (window.getSelection().toString()) {
            document.execCommand('delete', false, null);
          }
          document.execCommand('insertHTML', false, '<div style="border-bottom: 1px solid rgba(255,255,255,0.3); margin: 8px 0; height: 0;"></div><br>');
          break;
        default:
          return;
      }
      
      const htmlContent = commentsRef.current.innerHTML;
      const updatedScheme = { ...currentScheme, comments: htmlContent };
      updateCurrentScheme(updatedScheme);
      
      // Zaznacz ponownie aby formatowanie bylo widoczne
      commentsRef.current.focus();
    }, 0);
  };

  // Sprawdź czy dane formatowanie jest aktywne w bieżącej selekcji
  const isFormatActive = (format) => {
    if (!commentsRef.current) return false;
    
    try {
      // Wymuszenie fokusa na edytorze aby queryCommandState działał prawidłowo
      const selection = window.getSelection();
      
      switch (format) {
        case 'bold':
          return document.queryCommandState('bold');
        case 'italic':
          return document.queryCommandState('italic');
        case 'underline':
          return document.queryCommandState('underline');
        case 'strike':
          return document.queryCommandState('strikeThrough');

        default:
          return false;
      }
    } catch (e) {
      return false;
    }
  };

  const deleteFrame = (frameIndex) => {
    if (!currentScheme || currentScheme.frames.length <= 1) return;
    
    const confirmDelete = window.confirm(`Czy na pewno chcesz usunąć klatkę #${frameIndex + 1}?`);
    if (!confirmDelete) return;
    
    const updatedFrames = currentScheme.frames.filter((_, i) => i !== frameIndex);
    const updatedScheme = {
      ...currentScheme,
      frames: updatedFrames
    };
    
    updateCurrentScheme(updatedScheme);
    
    if (frameIndex === currentFrame) {
      const newIndex = Math.max(0, frameIndex - 1);
      setCurrentFrame(newIndex);
      setPlayers(updatedFrames[newIndex]);
    }
  };

  const selectScheme = (scheme) => {
    setCurrentScheme(scheme);
    setCurrentFrame(0);
    setPlayers(scheme.frames[0]);
    setIsPlaying(false);
  };


  // ── Drawing actions shared by the toolbar and keyboard shortcuts ──
  const saveDrawingsToScheme = (newLines, newZones) => {
    if (!currentScheme) return;
    updateCurrentScheme({
      ...currentScheme,
      frames: currentScheme.frames.map((f, i) => (i === currentFrame ? { ...players, lines: newLines, zones: newZones } : f)),
    });
  };

  const hasDrawingSelection = selectedLineIndex !== null || selectedZoneIndex !== null;

  const copySelectedDrawing = () => {
    if (selectedLineIndex !== null) setClipboard({ type: 'line', data: { ...lines[selectedLineIndex] } });
    else if (selectedZoneIndex !== null) setClipboard({ type: 'zone', data: { ...zones[selectedZoneIndex] } });
    else return;
    setShowCopyNotification(true);
    setTimeout(() => setShowCopyNotification(false), 2000);
  };

  const pasteDrawing = () => {
    if (!clipboard) return;
    if (clipboard.type === 'line') {
      const d = clipboard.data;
      const newLine = { ...d, startX: d.startX + 20, startY: d.startY + 20, endX: d.endX + 20, endY: d.endY + 20 };
      if (d.controlX !== undefined && d.controlY !== undefined) { newLine.controlX = d.controlX + 20; newLine.controlY = d.controlY + 20; }
      const newLines = [...lines, newLine];
      setLines(newLines);
      setSelectedLineIndex(newLines.length - 1);
      setSelectedZoneIndex(null);
      saveDrawingsToScheme(newLines, zones);
    } else {
      const newZone = { ...clipboard.data };
      if (newZone.type === 'rectangle') { newZone.x += 20; newZone.y += 20; }
      else if (newZone.type === 'circle') { newZone.centerX += 20; newZone.centerY += 20; }
      else if (newZone.points) newZone.points = newZone.points.map(pt => ({ x: pt.x + 20, y: pt.y + 20 }));
      const newZones = [...zones, newZone];
      setZones(newZones);
      setSelectedZoneIndex(newZones.length - 1);
      setSelectedLineIndex(null);
      saveDrawingsToScheme(lines, newZones);
    }
  };

  const deleteSelectedDrawing = () => {
    if (selectedLineIndex !== null) {
      const newLines = lines.filter((_, i) => i !== selectedLineIndex);
      setLines(newLines);
      setSelectedLineIndex(null);
      saveDrawingsToScheme(newLines, zones);
    } else if (selectedZoneIndex !== null) {
      const newZones = zones.filter((_, i) => i !== selectedZoneIndex);
      setZones(newZones);
      setSelectedZoneIndex(null);
      saveDrawingsToScheme(lines, newZones);
    }
  };

  const clearAllLines = () => { setLines([]); setSelectedLineIndex(null); saveDrawingsToScheme([], zones); };
  const clearAllZones = () => { setZones([]); setSelectedZoneIndex(null); saveDrawingsToScheme(lines, []); };

  // ── Tool switching (desktop toolbar; mobile keeps its expandable panels) ──
  const tacticsTool = isDrawingMode ? drawingTool : 'select';
  const setTacticsTool = (t) => {
    setIsDrawingMode(t !== 'select');
    if (t !== 'select') {
      setDrawingTool(t);
      setSelectedLineIndex(null);
      setSelectedZoneIndex(null);
    }
    setCurrentLine(null);
    setCurrentZone(null);
    setPolygonPoints([]);
  };

  // ── Undo / redo for the open scheme ──
  const schemeHistRef = useRef({ id: null, stack: [], index: -1 });
  const [, setSchemeHistTick] = useState(0);
  const schemeSnapshot = useMemo(() => (currentScheme ? JSON.stringify(currentScheme) : null), [currentScheme]);

  const commitSchemeHistory = (snap) => {
    const h = schemeHistRef.current;
    if (!snap || h.stack[h.index] === snap) return;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(snap);
    if (h.stack.length > 100) h.stack.shift();
    h.index = h.stack.length - 1;
    setSchemeHistTick(t => t + 1);
  };

  useEffect(() => {
    if (!currentScheme) {
      schemeHistRef.current = { id: null, stack: [], index: -1 };
      setSchemeHistTick(t => t + 1);
      return undefined;
    }
    if (schemeHistRef.current.id !== currentScheme.id) {
      schemeHistRef.current = { id: currentScheme.id, stack: [schemeSnapshot], index: 0 };
      setSchemeHistTick(t => t + 1);
      return undefined;
    }
    // debounced so typing in the name/comments becomes one undo step
    const t = setTimeout(() => commitSchemeHistory(schemeSnapshot), 400);
    return () => clearTimeout(t);
  }, [schemeSnapshot]);

  const applySchemeSnapshot = (snap) => {
    const s = JSON.parse(snap);
    updateCurrentScheme(s);
    const frameIdx = Math.min(currentFrame, s.frames.length - 1);
    setCurrentFrame(frameIdx);
    setPlayers(s.frames[frameIdx]);
    if (s.teamColor) setTeamColor(s.teamColor);
    if (s.opponentColor) setOpponentColor(s.opponentColor);
    setIsPlaying(false);
    setSelectedLineIndex(null);
    setSelectedZoneIndex(null);
    setSelectedPlayer(null);
  };

  const undoScheme = () => {
    commitSchemeHistory(schemeSnapshot);
    const h = schemeHistRef.current;
    if (h.index <= 0) return;
    h.index--;
    applySchemeSnapshot(h.stack[h.index]);
    setSchemeHistTick(t => t + 1);
  };

  const redoScheme = () => {
    const h = schemeHistRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index++;
    applySchemeSnapshot(h.stack[h.index]);
    setSchemeHistTick(t => t + 1);
  };

  const histState = schemeHistRef.current;
  const canUndoScheme = !!currentScheme && (histState.index > 0 || (histState.index >= 0 && histState.stack[histState.index] !== schemeSnapshot));
  const canRedoScheme = !!currentScheme && histState.index < histState.stack.length - 1;

  // ── Extra shortcuts: tools, undo/redo, Esc, Mac keys (Backspace, Cmd+C/V) ──
  const extraKeyHandlerRef = useRef(null);
  extraKeyHandlerRef.current = (e) => {
    if (!active) return;
    const t = e.target;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undoScheme(); return; }
    if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redoScheme(); return; }
    // Ctrl+C/V and Delete are handled by the original shortcut handler; add the Mac equivalents
    if (e.metaKey && !e.ctrlKey && k === 'c') { copySelectedDrawing(); return; }
    if (e.metaKey && !e.ctrlKey && k === 'v') { e.preventDefault(); pasteDrawing(); return; }
    if (e.key === 'Backspace' && hasDrawingSelection) { e.preventDefault(); deleteSelectedDrawing(); return; }
    if (e.key === 'Escape') {
      if (polygonPoints.length || currentLine || currentZone) { setPolygonPoints([]); setCurrentLine(null); setCurrentZone(null); }
      else if (isDrawingMode) setTacticsTool('select');
      else { setSelectedLineIndex(null); setSelectedZoneIndex(null); setSelectedPlayer(null); }
      return;
    }
    if (!mod && !e.altKey) {
      if (k === 'v') setTacticsTool('select');
      else if (k === 'l') setTacticsTool('line');
      else if (k === 's') setTacticsTool('zone');
    }
  };

  useEffect(() => {
    const handler = (e) => extraKeyHandlerRef.current(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const [modeHintVisible, setModeHintVisible] = useState(false);
  const [isCoarsePointer] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  useEffect(() => {
    if (tacticsTool === 'select') { setModeHintVisible(false); return undefined; }
    setModeHintVisible(true);
    const t = setTimeout(() => setModeHintVisible(false), 5000);
    return () => clearTimeout(t);
  }, [tacticsTool, zoneType]);

  const canvasHint = isPlaying || (!modeHintVisible && !polygonPoints.length) ? null
    : tacticsTool === 'line' ? 'Przeciągnij po boisku, aby narysować linię · Esc kończy rysowanie'
    : tacticsTool === 'zone' ? (zoneType === 'polygon'
      ? (polygonPoints.length
        ? (isCoarsePointer
          ? `Punkty: ${polygonPoints.length} · stuknij pierwszy punkt, aby zamknąć`
          : `Punkty: ${polygonPoints.length} · kliknij pierwszy punkt, aby zamknąć · Esc anuluje`)
        : 'Klikaj kolejne wierzchołki strefy')
      : 'Przeciągnij po boisku, aby narysować strefę · Esc kończy rysowanie')
    : null;


  const colorSwatch = (kind, value, onPick, inputRef, title, align) => (
    <div className="relative flex items-center">
      <input ref={inputRef} type="color" value={value}
        onChange={(e) => { onPick(e.target.value); setOpenColorPalette(null); }} className="hidden" />
      <button onClick={(e) => { e.stopPropagation(); setOpenColorPalette(openColorPalette === kind ? null : kind); }}
        className="w-7 h-7 rounded-md border-2 border-white/25 hover:border-white/50 transition-colors"
        style={{ backgroundColor: value }} title={title} aria-label={title} />
      {openColorPalette === kind && (
        <div className={`absolute top-full mt-1 ${align === 'right' ? 'right-0' : 'left-0'} bg-slate-900 border border-white/20 rounded-lg p-1.5 w-max grid grid-cols-6 gap-1 shadow-xl z-50`}>
          {quickColorPalette.map((c) => (
            <button key={c.color} onClick={() => { onPick(c.color); setOpenColorPalette(null); }}
              className="w-6 h-6 rounded border border-white/30 hover:scale-110 transition-transform"
              style={{ backgroundColor: c.color }} title={c.name} />
          ))}
          <button onClick={() => inputRef.current?.click()} title="Dowolny kolor"
            className="w-6 h-6 rounded border border-white/30 hover:scale-110 transition-transform bg-gradient-to-br from-red-500 via-green-500 to-blue-500 text-white text-[8px] font-bold">
            RGB
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
    <div className={`w-full text-white flex flex-col overflow-hidden ${embedded ? 'flex-1' : 'h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'Outfit', sans-serif;
        }
        
        .phase-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .phase-btn:hover {
          transform: translateX(4px);
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }
        
        .phase-btn.active {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
        }
        
        .scheme-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .scheme-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }
        
        .canvas-container {
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .canvas-container canvas {
          object-fit: contain;
        }
        
        [draggable="true"] {
          cursor: move;
        }
        
        [draggable="true"]:active {
          opacity: 0.5;
        }
        
        .control-btn {
          transition: all 0.2s ease;
        }
        
        .control-btn:hover {
          transform: scale(1.05);
        }
        
        .control-btn:active {
          transform: scale(0.95);
        }
        
        .frame-indicator {
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .scrollbar-custom::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-custom::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
        }
        
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
      `}</style>

      {/* Pasek narzędzi — tryby, opcje bieżącego trybu, drużyny, cofnij/ponów, stan zapisu (na telefonie wersja kompaktowa) */}
      <div className="flex items-center gap-1 bg-slate-950/70 backdrop-blur-xl border-b border-white/10 px-3 py-1.5 relative z-50">
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5" role="group" aria-label="Narzędzie">
          {[
            ['select', MousePointer2, 'Przesuwanie', 'Przesuwanie zawodników, piłki, linii i stref (V)'],
            ['line', MoveUpRight, 'Linie', 'Rysowanie linii i strzałek (L)'],
            ['zone', Square, 'Strefy', 'Rysowanie stref (S)'],
          ].map(([t, Icon, label, title]) => (
            <button key={t} onClick={() => setTacticsTool(t)} title={title} aria-label={label} aria-pressed={tacticsTool === t}
              className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                tacticsTool === t ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <Icon size={14} /> <span className="hidden min-[1300px]:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

        {tacticsTool === 'select' && (
          <>
            <button className={TOOLBAR_BTN} onClick={copySelectedDrawing} disabled={!hasDrawingSelection} title="Kopiuj zaznaczoną linię lub strefę (Ctrl+C)" aria-label="Kopiuj">
              <Copy size={14} /> <span className="hidden sm:inline">Kopiuj</span>
            </button>
            <button className={TOOLBAR_BTN} onClick={pasteDrawing} disabled={!clipboard} title="Wklej (Ctrl+V)" aria-label="Wklej">
              <ClipboardPaste size={14} /> <span className="hidden sm:inline">Wklej</span>
            </button>
            <button className={TOOLBAR_BTN} onClick={deleteSelectedDrawing} disabled={!hasDrawingSelection} title="Usuń zaznaczoną linię lub strefę (Delete)" aria-label="Usuń">
              <Trash2 size={14} /> <span className="hidden sm:inline">Usuń</span>
            </button>
            {selectedZoneIndex !== null && zones[selectedZoneIndex]?.type === 'rectangle' && (
              <button className={TOOLBAR_BTN} aria-label="Swobodne rogi"
                title="Zamienia prostokąt w wielokąt — każdy róg przesuniesz niezależnie"
                onClick={() => {
                  const newZones = zones.map((z, i) => (i === selectedZoneIndex ? rectangleToPolygon(z) : z));
                  setZones(newZones);
                  saveDrawingsToScheme(lines, newZones);
                }}>
                <Pentagon size={14} /> <span className="hidden sm:inline">Swobodne rogi</span>
              </button>
            )}
            {(lines.length > 0 || zones.length > 0) && (
              <div className="relative">
                <button className={TOOLBAR_BTN} title="Więcej: wyczyść rysunki na tej klatce" aria-label="Więcej"
                  onClick={(e) => { e.stopPropagation(); setOpenFormationMenu(openFormationMenu === 'clear' ? null : 'clear'); }}>
                  <MoreHorizontal size={15} />
                </button>
                {openFormationMenu === 'clear' && (
                  <div className="absolute top-full mt-1 left-0 w-60 bg-slate-900 border border-white/15 rounded-lg shadow-2xl py-1 z-50">
                    <button disabled={!lines.length} onClick={() => { clearAllLines(); setOpenFormationMenu(null); }} className={MENU_ITEM}>
                      Usuń wszystkie linie na klatce ({lines.length})
                    </button>
                    <button disabled={!zones.length} onClick={() => { clearAllZones(); setOpenFormationMenu(null); }} className={MENU_ITEM}>
                      Usuń wszystkie strefy na klatce ({zones.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tacticsTool === 'line' && (
          <>
            <div className="relative md:hidden">
              <button onClick={(e) => { e.stopPropagation(); setOpenColorPalette(openColorPalette === 'linetype' ? null : 'linetype'); }}
                aria-label="Typ linii" className={`${optionBtnClass(true)} px-1.5 gap-0.5`}>
                {LINE_TYPES.find(t => t && t[0] === lineType)?.[2]}<ChevronDown size={12} />
              </button>
              {openColorPalette === 'linetype' && (
                <div className="absolute top-full mt-1 left-0 w-max bg-slate-900 border border-white/15 rounded-lg shadow-2xl p-1.5 grid grid-cols-4 gap-1 z-50">
                  {LINE_TYPES.filter(Boolean).map(([type, title, icon]) => (
                    <button key={type} onClick={() => { setLineType(type); setOpenColorPalette(null); }} title={title} aria-label={title}
                      className={`${optionBtnClass(lineType === type)} w-11 h-10`}>
                      {icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden md:contents">
            {LINE_TYPES.map((t, idx) => (t ? (
              <button key={t[0]} onClick={() => setLineType(t[0])} title={t[1]} aria-pressed={lineType === t[0]}
                className={`${optionBtnClass(lineType === t[0])} w-9`}>
                {t[2]}
              </button>
            ) : <div key={idx} className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />))}
            <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />
            </div>
            {colorSwatch('line', lineColor, setLineColor, lineColorInputRef, 'Kolor linii', 'left')}
          </>
        )}

        {tacticsTool === 'zone' && (
          <>
            <div className="relative md:hidden">
              <button onClick={(e) => { e.stopPropagation(); setOpenColorPalette(openColorPalette === 'zonetype' ? null : 'zonetype'); }}
                aria-label="Kształt i krycie strefy" className={`${optionBtnClass(true)} px-1.5 gap-0.5`}>
                {ZONE_SHAPES.find(z => z[0] === zoneType)?.[2]}<ChevronDown size={12} />
              </button>
              {openColorPalette === 'zonetype' && (
                <div className="absolute top-full mt-1 left-0 w-max bg-slate-900 border border-white/15 rounded-lg shadow-2xl p-2 z-50">
                  <div className="flex gap-1">
                    {ZONE_SHAPES.map(([type, title, icon]) => (
                      <button key={type} onClick={() => { setZoneType(type); setPolygonPoints([]); setCurrentZone(null); }} title={title} aria-label={title}
                        className={`${optionBtnClass(zoneType === type)} w-12 h-10`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    Krycie
                    <input type="range" min="0" max="1" step="0.1" value={zoneOpacity}
                      onChange={(e) => setZoneOpacity(parseFloat(e.target.value))} className="w-28" />
                    <span className="w-8 tabular-nums">{Math.round(zoneOpacity * 100)}%</span>
                  </label>
                </div>
              )}
            </div>
            <div className="hidden md:contents">
            {ZONE_SHAPES.map(([type, title, icon]) => (
              <button key={type} onClick={() => { setZoneType(type); setPolygonPoints([]); setCurrentZone(null); }} title={title} aria-pressed={zoneType === type}
                className={`${optionBtnClass(zoneType === type)} w-10`}>
                {icon}
              </button>
            ))}
            <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />
            </div>
            {colorSwatch('zone', zoneColor, setZoneColor, zoneColorInputRef, 'Kolor strefy', 'left')}
            <label className="ml-2 hidden md:flex items-center gap-1.5 text-xs text-slate-400" title="Przezroczystość strefy">
              Krycie
              <input type="range" min="0" max="1" step="0.1" value={zoneOpacity}
                onChange={(e) => setZoneOpacity(parseFloat(e.target.value))} className="w-20" />
              <span className="w-8 tabular-nums">{Math.round(zoneOpacity * 100)}%</span>
            </label>
            {polygonPoints.length > 0 && (
              <button className={TOOLBAR_BTN} onClick={() => setPolygonPoints([])} title="Anuluj rysowany wielokąt (Esc)" aria-label="Anuluj wielokąt">
                <X size={14} /> <span className="hidden sm:inline">Anuluj</span>
              </button>
            )}
          </>
        )}

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-xs text-slate-400 hidden min-[1500px]:inline">Drużyna</span>
          {colorSwatch('team', teamColor, handleTeamColorChange, teamColorInputRef, 'Kolor drużyny', 'right')}
          <span className="text-xs text-slate-400 hidden min-[1500px]:inline ml-1">Przeciwnik</span>
          {colorSwatch('opponent', opponentColor, handleOpponentColorChange, opponentColorInputRef, 'Kolor przeciwnika', 'right')}
        </div>

        {gameFormat === '11v11' && (
          <div className="relative hidden md:block">
            <button className={TOOLBAR_BTN} title="Ustaw formację drużyny lub przeciwnika"
              onClick={(e) => { e.stopPropagation(); setOpenFormationMenu(openFormationMenu === 'formation' ? null : 'formation'); }}>
              Formacja <ChevronDown size={13} />
            </button>
            {openFormationMenu === 'formation' && (
              <div className="absolute top-full mt-1 right-0 w-64 bg-slate-900 border border-white/15 rounded-lg shadow-2xl p-2 z-50 grid grid-cols-2 gap-2">
                {[['team', 'Drużyna'], ['opponent', 'Przeciwnik']].map(([side, label]) => (
                  <div key={side}>
                    <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    {['1-4-4-2', '1-4-3-3', '1-3-5-2', '1-3-4-3'].map((f) => (
                      <button key={f} onClick={() => { applyFormation(side, f); setOpenFormationMenu(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-md text-sm font-mono text-slate-200 hover:bg-white/10 transition-colors">
                        {f}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="hidden md:block w-px h-6 bg-white/10 mx-1 flex-shrink-0" />
        <button className={TOOLBAR_BTN} onClick={undoScheme} disabled={!canUndoScheme} title="Cofnij (Ctrl+Z)" aria-label="Cofnij"><Undo2 size={15} /></button>
        <button className={TOOLBAR_BTN} onClick={redoScheme} disabled={!canRedoScheme} title="Ponów (Ctrl+Y)" aria-label="Ponów"><Redo2 size={15} /></button>
        <div className="hidden md:block w-px h-6 bg-white/10 mx-1 flex-shrink-0" />
        {currentScheme ? (
          <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap" title="Zmiany zapisują się automatycznie w pamięci tej przeglądarki">
            <Check size={13} className="text-emerald-400" />
            <span className="hidden min-[1400px]:inline">Zapisano automatycznie</span>
            <span className="min-[1400px]:hidden">Zapisano</span>
          </span>
        ) : (
          <span className="hidden md:inline-flex items-center gap-1 text-xs text-amber-300 whitespace-nowrap" title="Utwórz lub wybierz schemat w lewym panelu, aby zapisywać ustawienie">
            <AlertTriangle size={13} /> Bez schematu
          </span>
        )}
      </div>

      {/* Wrapper dla 3 paneli */}
      <div className="flex flex-1 overflow-hidden relative">

      {/* Overlay dla mobilnych drawerów */}
      {(leftPanelOpen || rightPanelOpen) && (
        <div
          className="md:hidden absolute inset-0 z-30 bg-black/50"
          onClick={() => { setLeftPanelOpen(false); setRightPanelOpen(false); }}
        />
      )}

      {/* Lewy panel - Fazy i Schematy */}
      <div className={`
        absolute md:relative z-40 h-full
        w-80 bg-slate-950/95 md:bg-slate-950/50 backdrop-blur-xl border-r border-white/10 flex flex-col
        transition-transform duration-300
        ${leftPanelOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="px-4 py-3 border-b border-white/10">
          {/* Wybór formatu gry */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Format gry</label>
            <div className="flex gap-2">
              {['7v7', '9v9', '11v11'].map(format => (
                <button
                  key={format}
                  onClick={() => {
                    setGameFormat(format);
                    setCurrentScheme(null);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                    gameFormat === format
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Przyciski kontroli */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={toggleAllPhases}
              className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium rounded-lg transition-all"
              title={allPhasesExpanded ? "Zwiń wszystkie fazy" : "Rozwiń wszystkie fazy"}
            >
              {allPhasesExpanded ? "➖ Zwiń" : "➕ Rozwiń"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-custom p-4 space-y-3">
          {newPhaseMode && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nazwa nowej fazy..."
                  autoFocus
                  onBlur={(e) => saveNewPhase(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveNewPhase(e.target.value);
                    } else if (e.key === 'Escape') {
                      setNewPhaseMode(false);
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-white/10 border border-green-500/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={() => setNewPhaseMode(false)}
                  className="p-2 bg-red-600/30 hover:bg-red-600/50 rounded-lg transition-all"
                  title="Anuluj"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}
          {Object.keys(phases).map(phase => (
            <div 
              key={phase} 
              className="space-y-2"
              draggable={editingPhase !== phase}
              onDragStart={(e) => handlePhaseDragStart(e, phase)}
              onDragOver={handlePhaseDragOver}
              onDrop={(e) => handlePhaseDrop(e, phase)}
            >
              <div className="flex items-center gap-2">
                {editingPhase === phase ? (
                  <input
                    type="text"
                    defaultValue={phase}
                    autoFocus
                    onBlur={(e) => {
                      renamePhase(phase, e.target.value);
                      setEditingPhase(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renamePhase(phase, e.target.value);
                        setEditingPhase(null);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-white/10 border border-blue-500/50 rounded-lg text-sm focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setSelectedPhase(phase);
                      setCurrentScheme(null);
                      if (phases[phase].length > 0) {
                        setSelectedSubPhase(phases[phase][0]);
                        togglePhase(phase);
                      }
                    }}
                    onDoubleClick={() => setEditingPhase(phase)}
                    className={`flex-1 px-4 py-3 rounded-lg text-left font-semibold flex items-center justify-between transition-all cursor-grab active:cursor-grabbing border-2 ${
                      draggedPhase === phase 
                        ? 'bg-yellow-500/30 border-yellow-500 shadow-lg' 
                        : selectedPhase === phase 
                          ? 'bg-blue-600/30 border-blue-500' 
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-slate-400 cursor-grab active:cursor-grabbing">☰</span>
                      {phase}
                    </span>
                    {phases[phase].length > 0 && (
                      expandedPhases[phase] ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                    )}
                  </button>
                )}
                <button
                  onClick={() => addNewSubPhase(phase)}
                  className="p-2 bg-blue-600/30 hover:bg-blue-600/50 rounded-lg transition-all"
                  title="Dodaj subfazę"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => deletePhase(phase)}
                  className="p-2 bg-red-600/30 hover:bg-red-600/50 rounded-lg transition-all"
                  title="Usuń fazę"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {expandedPhases[phase] && (
                <div className="ml-4 space-y-2">
                  {newSubPhaseMode === phase && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nazwa nowej subfazy..."
                        autoFocus
                        onBlur={(e) => saveNewSubPhase(phase, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveNewSubPhase(phase, e.target.value);
                          } else if (e.key === 'Escape') {
                            setNewSubPhaseMode(null);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white/10 border border-green-500/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={() => setNewSubPhaseMode(null)}
                        className="p-2 bg-red-600/30 hover:bg-red-600/50 rounded-lg transition-all"
                        title="Anuluj"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                  {phases[phase].map(subPhase => (
                    <div 
                      key={subPhase} 
                      className="flex items-center gap-2"
                      draggable={editingSubPhase !== `${phase}-${subPhase}`}
                      onDragStart={(e) => handleSubPhaseDragStart(e, phase, subPhase)}
                      onDragOver={handleSubPhaseDragOver}
                      onDrop={(e) => handleSubPhaseDrop(e, phase, subPhase)}
                    >
                      {editingSubPhase === `${phase}-${subPhase}` ? (
                        <input
                          type="text"
                          defaultValue={subPhase}
                          autoFocus
                          onBlur={(e) => {
                            renameSubPhase(phase, subPhase, e.target.value);
                            setEditingSubPhase(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameSubPhase(phase, subPhase, e.target.value);
                              setEditingSubPhase(null);
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-white/10 border border-blue-500/50 rounded-lg text-sm focus:outline-none"
                        />
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPhase(phase);
                              setSelectedSubPhase(subPhase);
                            }}
                            onDoubleClick={() => setEditingSubPhase(`${phase}-${subPhase}`)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const schemeId = e.dataTransfer.getData('schemeId');
                              const fromKey = e.dataTransfer.getData('fromKey');
                              if (schemeId && fromKey) {
                                const targetKey = `${phase}-${subPhase}`;
                                if (fromKey !== targetKey) {
                                  const scheme = schemes[gameFormat][fromKey]?.find(s => s.id === parseInt(schemeId));
                                  if (scheme) {
                                    const updatedOldSchemes = schemes[gameFormat][fromKey].filter(s => s.id !== scheme.id);
                                    const updatedNewSchemes = [...(schemes[gameFormat][targetKey] || []), scheme];
                                    setSchemes({
                                      ...schemes,
                                      [gameFormat]: {
                                        ...schemes[gameFormat],
                                        [fromKey]: updatedOldSchemes,
                                        [targetKey]: updatedNewSchemes
                                      }
                                    });
                                  }
                                }
                              }
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                              selectedSubPhase === subPhase && selectedPhase === phase
                                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            {subPhase}
                          </button>
                          <button
                            onClick={() => deleteSubPhase(phase, subPhase)}
                            className="p-2 bg-red-600/30 hover:bg-red-600/50 rounded-lg transition-all"
                            title="Usuń subfazę"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      
                      {/* Schematy dla tej subfazy */}
                      {selectedPhase === phase && selectedSubPhase === subPhase && (
                        <div className="ml-6 mt-2 space-y-2">
                          {schemes[gameFormat][`${phase}-${subPhase}`]?.map(scheme => (
                            <div
                              key={scheme.id}
                              draggable={!pptSelectionMode}
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('schemeId', scheme.id);
                                e.dataTransfer.setData('fromKey', `${phase}-${subPhase}`);
                              }}
                              onClick={() => pptSelectionMode ? null : selectScheme(scheme)}
                              className={`scheme-card p-2 rounded-lg bg-gradient-to-br ${pptSelectionMode ? 'cursor-pointer' : 'cursor-move'} ${
                                currentScheme?.id === scheme.id && !pptSelectionMode
                                  ? 'from-blue-600/30 to-purple-600/30 border border-blue-500/50'
                                  : pptSelectionMode && selectedSchemesForPpt.has(scheme.id)
                                  ? 'from-red-600/20 to-red-700/20 border border-red-500/50'
                                  : 'from-white/5 to-white/10 border border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                {pptSelectionMode ? (
                                  <label className="flex items-center gap-2 cursor-pointer w-full" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={selectedSchemesForPpt.has(scheme.id)}
                                      onChange={(e) => {
                                        const next = new Set(selectedSchemesForPpt);
                                        e.target.checked ? next.add(scheme.id) : next.delete(scheme.id);
                                        setSelectedSchemesForPpt(next);
                                      }}
                                      className="w-3.5 h-3.5 accent-red-500"
                                    />
                                    <span className="font-medium text-xs">{scheme.name}</span>
                                  </label>
                                ) : (
                                  <>
                                    <span className="font-medium text-xs">{scheme.name}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteScheme(scheme.id, `${phase}-${subPhase}`);
                                      }}
                                      className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Schematy dla fazy bez subfaz */}
              {phases[phase].length === 0 && selectedPhase === phase && (
                <div className="ml-4 space-y-2 mt-3">
                  {schemes[gameFormat][phase]?.map(scheme => (
                    <div
                      key={scheme.id}
                      draggable={!pptSelectionMode}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('schemeId', scheme.id);
                        e.dataTransfer.setData('fromKey', phase);
                      }}
                      onClick={() => pptSelectionMode ? null : selectScheme(scheme)}
                      className={`scheme-card p-2 rounded-lg bg-gradient-to-br ${pptSelectionMode ? 'cursor-pointer' : 'cursor-move'} ${
                        currentScheme?.id === scheme.id && !pptSelectionMode
                          ? 'from-blue-600/30 to-purple-600/30 border border-blue-500/50'
                          : pptSelectionMode && selectedSchemesForPpt.has(scheme.id)
                          ? 'from-red-600/20 to-red-700/20 border border-red-500/50'
                          : 'from-white/5 to-white/10 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {pptSelectionMode ? (
                          <label className="flex items-center gap-2 cursor-pointer w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedSchemesForPpt.has(scheme.id)}
                              onChange={(e) => {
                                const next = new Set(selectedSchemesForPpt);
                                e.target.checked ? next.add(scheme.id) : next.delete(scheme.id);
                                setSelectedSchemesForPpt(next);
                              }}
                              className="w-3.5 h-3.5 accent-red-500"
                            />
                            <span className="font-medium text-xs">{scheme.name}</span>
                          </label>
                        ) : (
                          <>
                            <span className="font-medium text-xs">{scheme.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteScheme(scheme.id, phase);
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={createNewScheme}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all transform hover:scale-105"
          >
            <Plus size={20} />
            Nowy schemat
          </button>
          <button
            onClick={addNewPhase}
            className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium flex items-center justify-center gap-2 transition-all text-sm"
          >
            <Plus size={16} />
            Dodaj fazę
          </button>
          
          <div className="flex gap-2 pt-2 border-t border-white/10">
            <button
              onClick={exportData}
              className="flex-1 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg font-medium flex items-center justify-center gap-2 transition-all text-sm text-green-300"
              title="Eksportuj wszystkie fazy i schematy do pliku .json (kopia zapasowa)"
            >
              <Download size={16} />
              Eksport
            </button>
            {pptSelectionMode ? (
              <>
                <button
                  onClick={() => {
                    exportToPowerPoint(selectedSchemesForPpt);
                    setPptSelectionMode(false);
                    setSelectedSchemesForPpt(new Set());
                  }}
                  disabled={selectedSchemesForPpt.size === 0}
                  className="flex-1 px-4 py-2 bg-red-600/40 hover:bg-red-600/60 border border-red-500/60 rounded-lg font-medium flex items-center justify-center gap-2 transition-all text-sm text-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Pobierz zaznaczone schematy jako PPT"
                >
                  <Download size={16} />
                  PPT ({selectedSchemesForPpt.size})
                </button>
                <button
                  onClick={() => {
                    setPptSelectionMode(false);
                    setSelectedSchemesForPpt(new Set());
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-sm text-slate-300 transition-all"
                  title="Anuluj"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={() => setPptSelectionMode(true)}
                className="flex-1 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg font-medium flex items-center justify-center gap-2 transition-all text-sm text-red-300"
                title="Wybierz schematy do eksportu PowerPoint"
              >
                <Download size={16} />
                PPT
              </button>
            )}
            <button
              onClick={importData}
              className="flex-1 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg font-medium flex items-center justify-center gap-2 transition-all text-sm text-purple-300"
              title="Importuj dane z pliku JSON"
            >
              <Upload size={16} />
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Środek - Boisko */}
      <div className="flex-1 flex flex-col bg-slate-900/30 overflow-hidden">
        
        {!currentScheme && (
          <div className="flex-shrink-0 flex items-center justify-center gap-3 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-100">
            <AlertTriangle size={14} className="text-amber-300 flex-shrink-0" />
            <span className="whitespace-nowrap">
              Bez schematu<span className="hidden sm:inline"> — zmiany na boisku nie są zapisywane</span>
            </span>
            <button onClick={createNewScheme}
              className="h-7 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium inline-flex items-center gap-1 whitespace-nowrap flex-shrink-0">
              <Plus size={13} /> Nowy schemat
            </button>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto relative">
          {currentScheme && canvasHint && (
            <div className={`${polygonPoints.length ? '' : 'hidden md:block'} pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10 max-w-[92%] text-center px-3 py-1.5 rounded-full bg-slate-900/85 border border-white/10 text-xs text-slate-200 shadow-lg md:whitespace-nowrap`}>
              {canvasHint}
            </div>
          )}
          <div className="canvas-container rounded-2xl overflow-hidden" style={{ maxHeight: '100%', maxWidth: '100%', aspectRatio: '700/1080' }}>
            <canvas
              ref={canvasRef}
              width={700}
              height={1080}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onDoubleClick={handleCanvasDoubleClick}
              className={isDrawingMode ? "cursor-crosshair" : "cursor-move"}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                width: 'auto', 
                height: 'auto',
                display: 'block'
              }}
            />
          </div>
        </div>

        {currentScheme && (
          <div className="bg-slate-950/50 backdrop-blur-xl border-t border-white/10">
            <div className="p-3 flex items-center gap-2 overflow-x-auto scrollbar-custom">
              <button
                onClick={() => {
                  setCurrentFrame(0);
                  setPlayers(currentScheme.frames[0]);
                  setIsPlaying(false);
                  setInterpolationProgress(0);
                }}
                className="control-btn p-2 md:p-1 bg-white/10 hover:bg-white/20 rounded transition-all flex-shrink-0"
                title="Do pierwszej klatki"
              >
                <SkipBack size={20} className="md:w-4 md:h-4" />
              </button>

              <button
                onClick={() => {
                  if (!isPlaying && currentFrame === currentScheme.frames.length - 1) {
                    setCurrentFrame(0);
                    setPlayers(currentScheme.frames[0]);
                    setInterpolationProgress(0);
                  }
                  setIsPlaying(!isPlaying);
                }}
                className="control-btn p-3 md:p-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded flex-shrink-0"
                title={isPlaying ? 'Pauza' : 'Odtwórz animację'}
                aria-label={isPlaying ? 'Pauza' : 'Odtwórz animację'}
              >
                {isPlaying ? <Pause size={20} className="md:w-4 md:h-4" /> : <Play size={20} className="md:w-4 md:h-4" />}
              </button>

              <button
                onClick={() => {
                  if (currentFrame < currentScheme.frames.length - 1) {
                    const next = currentFrame + 1;
                    setCurrentFrame(next);
                    setPlayers(currentScheme.frames[next]);
                    setInterpolationProgress(0);
                  }
                }}
                className="control-btn p-2 md:p-1 bg-white/10 hover:bg-white/20 rounded flex-shrink-0 disabled:opacity-40"
                disabled={currentFrame >= currentScheme.frames.length - 1}
                title="Następna klatka"
                aria-label="Następna klatka"
              >
                <SkipForward size={20} className="md:w-4 md:h-4" />
              </button>

              <div className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                {currentFrame + 1} / {currentScheme.frames.length}
              </div>
              <div className="hidden sm:block w-20 h-1.5 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${((currentFrame + interpolationProgress) / currentScheme.frames.length) * 100}%` }}
                />
              </div>

              <button
                onClick={addFrame}
                title="Dodaj klatkę (kopia bieżącej)"
                aria-label="Dodaj klatkę"
                className="control-btn px-2 py-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded font-medium flex items-center gap-1 whitespace-nowrap text-xs flex-shrink-0"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Dodaj klatkę</span>
              </button>
              <button
                onClick={() => deleteFrame(currentFrame)}
                disabled={currentScheme.frames.length <= 1}
                className="control-btn px-2 py-1 bg-white/10 hover:bg-white/20 rounded font-medium flex items-center gap-1 whitespace-nowrap text-xs flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Usuń bieżącą klatkę"
              >
                <Minus size={14} />
                <span className="hidden sm:inline">Usuń klatkę</span>
              </button>
              
              <button
                onClick={exportAnimationToMP4}
                className="control-btn px-2 py-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed rounded font-medium flex items-center gap-1 whitespace-nowrap text-xs flex-shrink-0"
                title="Pobierz animację jako MP4 (zwolnione tempo, z liniami ruchu)" aria-label="Pobierz animację"
                disabled={!currentScheme || currentScheme.frames.length < 2}
              >
                <Download size={14} />
                <span className="hidden sm:inline">Pobierz animację</span>
              </button>
              
              {/* Podgląd klatek - po prawej */}
              <div className="flex-1"></div>
              <div className="flex gap-1 items-flex-start flex-shrink-0 max-w-xs overflow-x-auto scrollbar-custom">
                {currentScheme.frames.map((frame, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-0.5 items-center flex-shrink-0"
                    draggable
                    onDragStart={(e) => {
                      setDraggedFrameIdx(idx);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverFrameIdx(idx);
                    }}
                    onDragLeave={() => setDragOverFrameIdx(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedFrameIdx === null || draggedFrameIdx === idx) {
                        setDraggedFrameIdx(null);
                        setDragOverFrameIdx(null);
                        return;
                      }
                      const newFrames = [...currentScheme.frames];
                      const [moved] = newFrames.splice(draggedFrameIdx, 1);
                      newFrames.splice(idx, 0, moved);
                      // Śledź aktualną klatkę po przesunięciu
                      let newCurrentFrame = currentFrame;
                      if (currentFrame === draggedFrameIdx) {
                        newCurrentFrame = idx;
                      } else if (draggedFrameIdx < currentFrame && idx >= currentFrame) {
                        newCurrentFrame = currentFrame - 1;
                      } else if (draggedFrameIdx > currentFrame && idx <= currentFrame) {
                        newCurrentFrame = currentFrame + 1;
                      }
                      updateCurrentScheme({ ...currentScheme, frames: newFrames });
                      setCurrentFrame(newCurrentFrame);
                      setPlayers(newFrames[newCurrentFrame]);
                      setDraggedFrameIdx(null);
                      setDragOverFrameIdx(null);
                    }}
                    onDragEnd={() => {
                      setDraggedFrameIdx(null);
                      setDragOverFrameIdx(null);
                    }}
                  >
                    <div
                      onClick={() => {
                        setCurrentFrame(idx);
                        setPlayers(frame);
                        setIsPlaying(false);
                        setInterpolationProgress(0);
                      }}
                      className={`cursor-grab active:cursor-grabbing rounded flex-shrink-0 transition-all ${
                        draggedFrameIdx === idx
                          ? 'opacity-30 scale-90'
                          : dragOverFrameIdx === idx && draggedFrameIdx !== null
                          ? 'border-2 border-yellow-400 bg-yellow-400/20 scale-110 w-9 h-9 md:w-7 md:h-7'
                          : currentFrame === idx
                          ? 'border border-blue-400 bg-blue-600 w-9 h-9 md:w-7 md:h-7'
                          : 'border border-white/20 bg-white/5 hover:bg-white/10 w-8 h-8 md:w-7 md:h-7'
                      }`}
                    >
                      <div className="flex items-center justify-center text-xs font-semibold text-slate-100 w-full h-full" title={`Klatka ${idx + 1} — kliknij, aby edytować; przeciągnij, aby zmienić kolejność`}>
                        {idx + 1}
                      </div>
                    </div>
                    {currentFrame === idx && currentScheme.frames.length > 1 && (
                      <button
                        onClick={() => deleteFrame(idx)}
                        className="md:hidden p-0.5 bg-red-600 hover:bg-red-700 rounded transition-all"
                        title="Usuń klatkę"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Mobilna dolna nawigacja */}
        <nav className="md:hidden flex-shrink-0 grid grid-cols-2 bg-slate-950/95 border-t border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {[
            ['left', <Layers size={20} />, 'Fazy i schematy', leftPanelOpen, () => { setLeftPanelOpen(v => !v); setRightPanelOpen(false); }],
            ['right', <SlidersHorizontal size={20} />, 'Szczegóły', rightPanelOpen, () => { setRightPanelOpen(v => !v); setLeftPanelOpen(false); }],
          ].map(([id, icon, label, active, onClick]) => (
            <button key={id} onClick={onClick}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${active ? 'text-blue-400' : 'text-slate-300'}`}>
              {icon}
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Prawy panel - Szczegóły schematu */}
      <div className={`
        absolute md:relative right-0 z-40 h-full min-h-0 overflow-y-auto scrollbar-custom
        w-80 md:w-96 bg-slate-950/95 md:bg-slate-950/50 backdrop-blur-xl border-l border-white/10 flex flex-col
        transition-transform duration-300
        ${rightPanelOpen ? 'translate-x-0' : 'translate-x-full'}
        md:translate-x-0
      `}>
        <div className="md:hidden p-4 border-b border-white/10 space-y-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Drużyny</p>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <span className="flex items-center gap-2">{colorSwatch('team', teamColor, handleTeamColorChange, teamColorInputRef, 'Kolor drużyny', 'left')} Drużyna</span>
            <span className="flex items-center gap-2">{colorSwatch('opponent', opponentColor, handleOpponentColorChange, opponentColorInputRef, 'Kolor przeciwnika', 'left')} Przeciwnik</span>
          </div>
          {gameFormat === '11v11' && (
            <div className="grid grid-cols-2 gap-2">
              {[['team', 'Formacja drużyny'], ['opponent', 'Formacja przeciwnika']].map(([side, label]) => (
                <div key={side}>
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {['1-4-4-2', '1-4-3-3', '1-3-5-2', '1-3-4-3'].map((f) => (
                      <button key={f} onClick={() => applyFormation(side, f)}
                        className="h-8 rounded-md text-xs font-mono bg-white/5 hover:bg-white/15 text-slate-200">
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold mb-4">Szczegóły schematu</h2>
          
          {currentScheme ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Nazwa schematu
                </label>
                <input
                  type="text"
                  value={currentScheme.name}
                  onChange={(e) => {
                    const updatedScheme = { ...currentScheme, name: e.target.value };
                    updateCurrentScheme(updatedScheme);
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Faza / Subfaza
                </label>
                <div className="flex gap-2">
                  <div className="text-sm px-4 py-2 bg-white/5 border border-white/10 rounded-lg flex-1 flex items-center">
                    {(() => {
                      const currentKey = findSchemeKey(currentScheme.id);
                      if (!currentKey) return 'Brak';
                      const parts = currentKey.split('-');
                      return parts.length > 1 ? `${parts[0]} - ${parts[1]}` : parts[0];
                    })()}
                  </div>
                  <button
                    onClick={() => {
                      const currentKey = findSchemeKey(currentScheme.id);
                      if (currentKey) {
                        setMoving({ scheme: currentScheme, oldKey: currentKey });
                        const parts = currentKey.split('-');
                        setMoveToPhase(parts[0]);
                        setMoveToSubPhase(parts[1] || '');
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded font-medium text-sm text-white transition-all"
                  >
                    Przenieś
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Komentarze / Zadania
                </label>
                <div className="mb-2 flex gap-0.5 flex-wrap p-2 bg-white/5 border border-white/10 rounded-lg">
                  <button
                    onClick={() => formatText('bold')}
                    onMouseDown={(e) => e.preventDefault()}
                    className={`px-2 py-1 text-xs rounded transition-all ${
                      isFormatActive('bold')
                        ? 'bg-blue-500/40 border border-blue-400 text-white'
                        : 'hover:bg-white/20 text-slate-300 border border-transparent'
                    }`}
                    title="Pogrubienie (Ctrl+B)"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    onClick={() => formatText('italic')}
                    onMouseDown={(e) => e.preventDefault()}
                    className={`px-2 py-1 text-xs rounded transition-all ${
                      isFormatActive('italic')
                        ? 'bg-blue-500/40 border border-blue-400 text-white'
                        : 'hover:bg-white/20 text-slate-300 border border-transparent'
                    }`}
                    title="Kursywa (Ctrl+I)"
                  >
                    <em>I</em>
                  </button>
                  <button
                    onClick={() => formatText('underline')}
                    onMouseDown={(e) => e.preventDefault()}
                    className={`px-2 py-1 text-xs rounded transition-all ${
                      isFormatActive('underline')
                        ? 'bg-blue-500/40 border border-blue-400 text-white'
                        : 'hover:bg-white/20 text-slate-300 border border-transparent'
                    }`}
                    title="Podkreślenie (Ctrl+U)"
                  >
                    <u>U</u>
                  </button>
                  <button
                    onClick={() => formatText('strike')}
                    onMouseDown={(e) => e.preventDefault()}
                    className={`px-2 py-1 text-xs rounded transition-all ${
                      isFormatActive('strike')
                        ? 'bg-blue-500/40 border border-blue-400 text-white'
                        : 'hover:bg-white/20 text-slate-300 border border-transparent'
                    }`}
                    title="Przekreślenie"
                  >
                    <s>S</s>
                  </button>
                  <div className="w-px bg-white/10 mx-0.5"></div>
                  <button
                    onClick={() => formatText('bullet')}
                    onMouseDown={(e) => e.preventDefault()}
                    className="px-2 py-1 hover:bg-white/20 text-slate-300 text-xs rounded border border-transparent transition-all"
                    title="Punkt listy"
                  >
                    ●
                  </button>
                  <div className="w-px bg-white/10 mx-0.5"></div>
                  <button
                    onClick={() => formatText('check')}
                    onMouseDown={(e) => e.preventDefault()}
                    className="px-2 py-1 hover:bg-white/20 text-slate-300 text-xs rounded border border-transparent transition-all"
                    title="Checkbox"
                  >
                    ☐
                  </button>
                  <button
                    onClick={() => formatText('line')}
                    onMouseDown={(e) => e.preventDefault()}
                    className="px-2 py-1 hover:bg-white/20 text-slate-300 text-xs rounded border border-transparent transition-all"
                    title="Linia"
                  >
                    ─
                  </button>
                </div>
                <div className="relative">
                  <div
                    ref={commentsRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => {
                      const htmlContent = commentsRef.current.innerHTML;
                      const updatedScheme = { ...currentScheme, comments: htmlContent };
                      updateCurrentScheme(updatedScheme);
                    }}
                    onBlur={() => {
                      const htmlContent = commentsRef.current.innerHTML;
                      const updatedScheme = { ...currentScheme, comments: htmlContent };
                      updateCurrentScheme(updatedScheme);
                    }}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs leading-relaxed min-h-64 max-h-96 overflow-y-auto text-slate-200"
                    style={{ outline: 'none', whiteSpace: 'normal', wordWrap: 'break-word', color: '#cbd5e1' }}
                  />
                  {(!currentScheme.comments || commentsRef.current?.textContent?.trim() === '') && (
                    <div className="absolute top-2 left-4 text-xs text-slate-500 pointer-events-none">
                      Dodaj zadania dla zawodników, uwagi taktyczne...
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="text-sm text-slate-400 space-y-2">
                  <div className="flex justify-between">
                    <span>Faza:</span>
                    <span className="text-white font-medium">{(() => {
                      const schemeKey = findSchemeKey(currentScheme.id);
                      if (!schemeKey) return selectedPhase;
                      return schemeKey.split('-')[0];
                    })()}</span>
                  </div>
                  {(() => {
                    const schemeKey = findSchemeKey(currentScheme.id);
                    const schemePhase = schemeKey ? schemeKey.split('-')[0] : selectedPhase;
                    return phases[schemePhase]?.length > 0 && (
                      <div className="flex justify-between">
                        <span>Subfaza:</span>
                        <span className="text-white font-medium">{(() => {
                          if (!schemeKey || !schemeKey.includes('-')) return selectedSubPhase;
                          return schemeKey.split('-')[1];
                        })()}</span>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between">
                    <span>Klatek:</span>
                    <span className="text-white font-medium">{currentScheme.frames.length}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-slate-400">
              <p className="text-slate-300">Schemat to zapisane ustawienie zespołu: pozycje, animacja w klatkach, linie, strefy i komentarze.</p>
              <ol className="space-y-2.5">
                {[
                  'Wybierz fazę gry w lewym panelu, np. Atak, a w niej Budowanie.',
                  'Kliknij „Nowy schemat” albo wybierz istniejący z listy.',
                  'Ustaw zawodników, narysuj linie i strefy, dodawaj kolejne klatki animacji.',
                ].map((text, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="w-5 h-5 flex-shrink-0 rounded-full bg-blue-600/30 text-blue-200 text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
              <button onClick={createNewScheme}
                className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium inline-flex items-center justify-center gap-2 transition-colors">
                <Plus size={16} /> Nowy schemat w fazie „{selectedPhase}{phases[selectedPhase]?.length > 0 && selectedSubPhase ? ` – ${selectedSubPhase}` : ''}”
              </button>
              <div className="pt-3 border-t border-white/10">
                <p className="flex items-center gap-1.5 text-slate-300 mb-2"><Keyboard size={14} /> Skróty klawiszowe</p>
                <div className="space-y-1 text-xs">
                  {[
                    ['V / L / S', 'przesuwanie / linie / strefy'],
                    ['Ctrl+Z / Y', 'cofnij / ponów'],
                    ['Ctrl+C / V', 'kopiuj / wklej linię lub strefę'],
                    ['Delete', 'usuń zaznaczoną linię lub strefę'],
                    ['Esc', 'anuluj rysowanie / odznacz'],
                    ['Dwuklik', 'numer i kolor zawodnika'],
                  ].map(([k, d]) => (
                    <p key={k}><kbd className="bg-white/10 px-1 rounded text-slate-300">{k}</kbd> {d}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {currentScheme && (
          <div className="flex-1 overflow-y-auto scrollbar-custom p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-300">Instrukcje</h3>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="p-1 hover:bg-white/10 rounded-lg transition-all"
                title={showInstructions ? "Ukryj instrukcje" : "Pokaż instrukcje"}
              >
                <ChevronDown 
                  size={18} 
                  className={`text-slate-400 transition-transform ${
                    showInstructions ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
            </div>
            {showInstructions && (
            <div className="space-y-3 text-sm text-slate-400">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="font-medium text-blue-300 mb-1">Dodawanie klatek</div>
                <p>Kliknij "Dodaj klatkę" aby stworzyć nową pozycję w animacji</p>
              </div>
              
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="font-medium text-green-300 mb-1">Przesuwanie zawodników</div>
                <p>Przeciągnij zawodników i piłkę na boisku, aby ustawić ich pozycje</p>
              </div>
              
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="font-medium text-purple-300 mb-1">Odtwarzanie animacji</div>
                <p>Użyj przycisków odtwarzania, aby zobaczyć płynną animację ruchu ze ścieżkami</p>
              </div>

              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="font-medium text-orange-300 mb-1">Edycja faz</div>
                <p>Kliknij dwukrotnie nazwę fazy lub subfazy, aby ją zmienić. Użyj przycisku + aby dodać nowe.</p>
              </div>
              
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <div className="font-medium text-cyan-300 mb-1">Automatyczny zapis</div>
                <p>Dane są automatycznie zapisywane w pamięci przeglądarki</p>
              </div>
            </div>
            )}
          </div>
        )}
      </div>

      </div> {/* Koniec wrappera dla 3 paneli */}

      {/* Modal edycji numeru zawodnika */}
      {editingPlayerNumber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          setEditingPlayerNumber(null);
          setOpenColorPalette(null);
        }}>
          <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700 min-w-[300px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Edytuj zawodnika</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Numer zawodnika</label>
                <input
                  type="text"
                  value={newPlayerNumber}
                  onChange={(e) => setNewPlayerNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') savePlayerNumber();
                    if (e.key === 'Escape') {
                      setEditingPlayerNumber(null);
                      setOpenColorPalette(null);
                    }
                  }}
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-lg font-semibold text-center"
                  placeholder="Wprowadź numer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Kolor zawodnika</label>
                <div className="relative flex items-center gap-3 px-4 py-3 bg-slate-700 rounded-lg">
                  {/* Ukryty natywny color picker */}
                  <input
                    ref={playerColorInputRef}
                    type="color"
                    value={newPlayerColor}
                    onChange={(e) => {
                      setNewPlayerColor(e.target.value);
                      setOpenColorPalette(null);
                    }}
                    className="hidden"
                  />
                  {/* Widoczny przycisk koloru */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenColorPalette(openColorPalette === 'player' ? null : 'player');
                    }}
                    className="w-12 h-12 rounded cursor-pointer border-2 border-white/20 hover:border-white/40 transition-all"
                    style={{ backgroundColor: newPlayerColor }}
                    title="Wybierz kolor zawodnika"
                  />
                  <span className="text-sm text-slate-300 font-mono">{newPlayerColor.toUpperCase()}</span>
                  
                  {/* Paleta kolorów */}
                  {openColorPalette === 'player' && (
                    <div className="absolute left-4 top-full mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg p-2 flex gap-1 shadow-xl z-50">
                      {quickColorPalette.map((colorItem) => (
                        <button
                          key={colorItem.color}
                          onClick={() => {
                            setNewPlayerColor(colorItem.color);
                            setOpenColorPalette(null);
                          }}
                          className="w-7 h-7 rounded border-2 border-white/30 hover:scale-110 hover:border-white/60 transition-all"
                          style={{ backgroundColor: colorItem.color }}
                          title={colorItem.name}
                        />
                      ))}
                      {/* Przycisk RGB */}
                      <button
                        onClick={() => playerColorInputRef.current?.click()}
                        className="w-7 h-7 rounded border-2 border-white/30 hover:scale-110 hover:border-white/60 transition-all bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold"
                        title="Wybór RGB"
                      >
                        RGB
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setEditingPlayerNumber(null);
                  setOpenColorPalette(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={savePlayerNumber}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal wyboru trybu importu */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImportDialog(false)}>
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Importuj dane</h3>
            <p className="text-slate-400 mb-6">Jak chcesz załadować dane?</p>
            
            <div className="space-y-4">
              <button
                onClick={() => handleImportMode('merge')}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold text-center"
              >
                ➕ Dodaj nowe rekordy
              </button>
              
              <button
                onClick={() => handleImportMode('replace')}
                className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-semibold text-center"
              >
                🔄 Zamień wszystko
              </button>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportedData(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal przenoszenia schematu */}
      {moving && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setMoving(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Przenieś schemat: {moving.scheme.name}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Faza</label>
                <select
                  value={moveToPhase || ''}
                  onChange={(e) => {
                    setMoveToPhase(e.target.value);
                    setMoveToSubPhase('');
                  }}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Wybierz fazę</option>
                  {Object.keys(phases).map(phase => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </select>
              </div>

              {moveToPhase && phases[moveToPhase]?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Subfaza</label>
                  <select
                    value={moveToSubPhase || ''}
                    onChange={(e) => setMoveToSubPhase(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Wybierz subfazę</option>
                    {phases[moveToPhase].map(subphase => (
                      <option key={subphase} value={subphase}>{subphase}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setMoving(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={moveScheme}
                disabled={!moveToPhase}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
              >
                Przenieś
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Powiadomienie o skopiowaniu */}
      {showCopyNotification && (
        <div className="fixed bottom-8 right-8 bg-blue-600/95 backdrop-blur-xl border border-blue-400/30 text-white px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 animate-fade-in">
          <span className="text-2xl">📋</span>
          <div>
            <div className="font-semibold">Skopiowano!</div>
            <div className="text-sm opacity-90">
              {clipboard?.type === 'line' ? 'Linia skopiowana do schowka' : 'Strefa skopiowana do schowka'}
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
};

export default FootballTacticsApp;
