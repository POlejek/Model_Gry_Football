import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Play, Pause, SkipBack, SkipForward, Save, ChevronRight, ChevronDown, Download, Upload, Bold, Italic } from 'lucide-react';
import PptxGenJs from 'pptxgenjs';
import { FFmpeg } from '@ffmpeg/ffmpeg';

const FootballTacticsApp = () => {
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
  const [lineType, setLineType] = useState('arrow-solid'); // Typ linii: arrow-solid, arrow-dashed, double-arrow-solid, line-dashed, line-solid, curve-*
  const [lineColor, setLineColor] = useState('#000000'); // Kolor linii
  const [currentLine, setCurrentLine] = useState(null); // Rysowana linia
  const [lines, setLines] = useState([]); // Wszystkie linie na bieżącej klatce
  const [expandedPanel, setExpandedPanel] = useState(null); // 'move' lub 'draw' - rozwinięty panel w górnym pasku
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
  const [draggedVertexIndex, setDraggedVertexIndex] = useState(null); // Indeks przeciąganego wierzchołka
  const [openColorPalette, setOpenColorPalette] = useState(null); // 'team', 'opponent', 'line', 'zone', 'player' lub null
  const [clipboard, setClipboard] = useState(null); // Schowek dla Ctrl+C/Ctrl+V: {type: 'line'|'zone', data: {...}}
  const [showCopyNotification, setShowCopyNotification] = useState(false); // Powiadomienie o skopiowaniu

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

  // Wczytaj dane z localStorage przy starcie
  useEffect(() => {
    const savedData = localStorage.getItem('footballTacticsData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data.phases) setPhases(data.phases);
        if (data.schemes) setSchemes(data.schemes);
        if (data.gameFormat) setGameFormat(data.gameFormat);
        if (data.selectedPhase) setSelectedPhase(data.selectedPhase);
        if (data.selectedSubPhase) setSelectedSubPhase(data.selectedSubPhase);
        if (data.expandedPhases) setExpandedPhases(data.expandedPhases);
        if (data.teamColor) setTeamColor(data.teamColor);
        if (data.opponentColor) setOpponentColor(data.opponentColor);
      } catch (error) {
        console.error('Błąd przy wczytywaniu danych:', error);
      }
    }
  }, []);

  // Zapisz dane do localStorage przy każdej zmianie
  useEffect(() => {
    const dataToSave = {
      phases,
      schemes,
      gameFormat,
      selectedPhase,
      selectedSubPhase,
      expandedPhases,
      teamColor,
      opponentColor
    };
    localStorage.setItem('footballTacticsData', JSON.stringify(dataToSave));
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

  // Obsługa skrótów klawiszowych
  useEffect(() => {
    const handleKeyDown = (e) => {
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
  }, [selectedLineIndex, selectedZoneIndex, lines, zones, clipboard, currentScheme, currentFrame, players]);

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

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.number, player.x, player.y);

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

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.number, player.x, player.y);

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
        }

        ctx.restore();
      });
    }

    // Rysuj linie ruchu jeśli mamy następną klatkę
    if (nextFrameData) {
      currentFrameData.team.forEach((player, i) => {
        if (nextFrameData.team[i]) {
          ctx.save();
          ctx.strokeStyle = 'rgba(26, 54, 93, 0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          
          ctx.beginPath();
          ctx.moveTo(player.x, player.y);
          ctx.lineTo(nextFrameData.team[i].x, nextFrameData.team[i].y);
          ctx.stroke();
          
          ctx.setLineDash([]);
          ctx.restore();
        }
      });

      currentFrameData.opponent.forEach((player, i) => {
        if (nextFrameData.opponent[i]) {
          ctx.save();
          ctx.strokeStyle = 'rgba(139, 0, 0, 0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          
          ctx.beginPath();
          ctx.moveTo(player.x, player.y);
          ctx.lineTo(nextFrameData.opponent[i].x, nextFrameData.opponent[i].y);
          ctx.stroke();
          
          ctx.setLineDash([]);
          ctx.restore();
        }
      });
    }

    // Interpoluj pozycje zawodników jeśli jest progress
    let interpolatedData = currentFrameData;
    if (nextFrameData && progress > 0) {
      interpolatedData = {
        team: currentFrameData.team.map((player, i) => ({
          ...player,
          x: player.x + (nextFrameData.team[i].x - player.x) * progress,
          y: player.y + (nextFrameData.team[i].y - player.y) * progress,
          rotation: player.rotation
        })),
        opponent: currentFrameData.opponent.map((player, i) => ({
          ...player,
          x: player.x + (nextFrameData.opponent[i].x - player.x) * progress,
          y: player.y + (nextFrameData.opponent[i].y - player.y) * progress,
          rotation: player.rotation
        })),
        ball: {
          x: currentFrameData.ball.x + (nextFrameData.ball.x - currentFrameData.ball.x) * progress,
          y: currentFrameData.ball.y + (nextFrameData.ball.y - currentFrameData.ball.y) * progress
        }
      };
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
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.number, 0, 0);
      
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
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.number, 0, 0);
      
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
      console.error('Błąd podczas eksportu animacji:', error);
      alert('Błąd podczas eksportu animacji: ' + error.message);
    }
  };

  // Eksport do PowerPoint
  const exportToPowerPoint = async () => {
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
        schemeCount += schemes[gameFormat][key].length;
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
            const schemeList = schemes[gameFormat][key] || [];
            
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
          const schemeList = schemes[gameFormat][key] || [];
          
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
      alert('Błąd podczas eksportu: ' + error.message);
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
    const updatedScheme = {
      ...currentScheme,
      frames: [...currentScheme.frames, newFrame]
    };
    
    updateCurrentScheme(updatedScheme);
    setCurrentFrame(updatedScheme.frames.length - 1);
  };

  const updateCurrentScheme = (updatedScheme) => {
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
  };

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

  const drawField = (ctx) => {
    const width = ctx.canvas.width;  // 700px
    const height = ctx.canvas.height;  // 1080px
    const margin = 20;
    
    // Wymiary boiska według unifikacji PZPN
    const fieldDimensions = {
      '7v7': { 
        length: 55, 
        width: 37,
        penaltyBoxWidth: 20,
        penaltyBoxDepth: 13,
        goalBoxWidth: 12,
        goalBoxDepth: 5,
        goalWidth: 5,
        penaltySpot: 0, // brak punktu karnego w 7v7
        centerCircle: 6,
        arcRadius: 0 // brak łuku
      },
      '9v9': { 
        length: 70, 
        width: 50,
        penaltyBoxWidth: 30,
        penaltyBoxDepth: 13,
        goalBoxWidth: 15,
        goalBoxDepth: 5,
        goalWidth: 6,
        penaltySpot: 9,
        centerCircle: 7,
        arcRadius: 7 // łuk o promieniu 7m
      },
      '11v11': { 
        length: 105, 
        width: 68,
        penaltyBoxWidth: 40.32,
        penaltyBoxDepth: 16.5,
        goalBoxWidth: 18.32,
        goalBoxDepth: 5.5,
        goalWidth: 7.32,
        penaltySpot: 11,
        centerCircle: 9.15,
        arcRadius: 9.15
      }
    };
    
    const dims = fieldDimensions[gameFormat];
    const fieldLength = dims.length;
    const fieldWidthMeters = dims.width;
    
    const fieldWidth = width - 2 * margin;  // 660px
    const fieldHeight = height - 2 * margin;  // 1040px
    
    // Wymiary w proporcji do rzeczywistego boiska
    const penaltyBoxWidth = (dims.penaltyBoxWidth / fieldWidthMeters) * fieldWidth;
    const penaltyBoxDepth = (dims.penaltyBoxDepth / fieldLength) * fieldHeight;
    const goalBoxWidth = (dims.goalBoxWidth / fieldWidthMeters) * fieldWidth;
    const goalBoxDepth = (dims.goalBoxDepth / fieldLength) * fieldHeight;
    const penaltySpotDistance = (dims.penaltySpot / fieldLength) * fieldHeight;
    const centerCircleRadius = (dims.centerCircle / fieldWidthMeters) * fieldWidth;
    const goalWidth = (dims.goalWidth / fieldWidthMeters) * fieldWidth;

    // Białe tło boiska
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Obramowanie boiska (grubsze)
    ctx.strokeStyle = '#c4a76e';
    ctx.lineWidth = 3;
    ctx.strokeRect(margin, margin, fieldWidth, fieldHeight);

    // WSZYSTKIE Linie boiska - brązowe jak obramowanie
    ctx.strokeStyle = '#c4a76e';
    ctx.lineWidth = 2;

    // Linia środkowa
    ctx.beginPath();
    ctx.moveTo(margin, height / 2);
    ctx.lineTo(width - margin, height / 2);
    ctx.stroke();

    // Okrąg środkowy
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, centerCircleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Punkt środkowy
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#c4a76e';
    ctx.fill();

    // Pole karne górne
    const penaltyBoxLeft = (width - penaltyBoxWidth) / 2;
    const penaltyBoxRight = penaltyBoxLeft + penaltyBoxWidth;
    ctx.strokeRect(penaltyBoxLeft, margin, penaltyBoxWidth, penaltyBoxDepth);
    
    // Pole bramkowe górne
    const goalBoxLeft = (width - goalBoxWidth) / 2;
    const goalBoxRight = goalBoxLeft + goalBoxWidth;
    ctx.strokeRect(goalBoxLeft, margin, goalBoxWidth, goalBoxDepth);

    // Pole karne dolne
    ctx.strokeRect(penaltyBoxLeft, height - margin - penaltyBoxDepth, penaltyBoxWidth, penaltyBoxDepth);
    // Pole bramkowe dolne
    ctx.strokeRect(goalBoxLeft, height - margin - goalBoxDepth, goalBoxWidth, goalBoxDepth);

    // Bramki - brązowe
    ctx.strokeStyle = '#c4a76e';
    ctx.lineWidth = 4;
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

    // Łuki pól karnych (wyśrodkowane na punkcie karnym, końce na linii pola karnego)
    // Tylko dla 9v9 i 11v11
    if (dims.arcRadius > 0 && dims.penaltySpot > 0) {
      ctx.strokeStyle = '#c4a76e';
      ctx.lineWidth = 2;
      const arcRadius = (dims.arcRadius / fieldWidthMeters) * fieldWidth;
      const penaltySpotTop = margin + penaltySpotDistance;
      const penaltySpotBottom = height - margin - penaltySpotDistance;
      
      // Odległość od punktu karnego do linii pola karnego
      const distancePenaltySpotToLine = ((dims.penaltyBoxDepth - dims.penaltySpot) / fieldLength) * fieldHeight;
      // Kąt gdzie łuk przecina linię pola karnego
      const arcAngle = Math.asin(Math.min(distancePenaltySpotToLine / arcRadius, 1));
      
      // Łuk górny (tylko część wewnątrz/na linii pola karnego)
      ctx.beginPath();
      ctx.arc(width / 2, penaltySpotTop, arcRadius, arcAngle, Math.PI - arcAngle);
      ctx.stroke();

      // Łuk dolny
      ctx.beginPath();
      ctx.arc(width / 2, penaltySpotBottom, arcRadius, Math.PI + arcAngle, Math.PI * 2 - arcAngle);
      ctx.stroke();
    }

    // Punkty karne (tylko dla 9v9 i 11v11)
    if (dims.penaltySpot > 0) {
      ctx.fillStyle = '#c4a76e';
      const penaltySpotTop = margin + penaltySpotDistance;
      const penaltySpotBottom = height - margin - penaltySpotDistance;
      
      ctx.beginPath();
      ctx.arc(width / 2, penaltySpotTop, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(width / 2, penaltySpotBottom, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // WYSZARZENIE STREF między liniami pola karnego a piątki
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    
    // Lewa strefa (między lewą linią pola karnego a lewą linią piątki)
    ctx.fillRect(goalBoxLeft, margin, penaltyBoxLeft - goalBoxLeft, fieldHeight);
    
    // Prawa strefa (między prawą linią piątki a prawą linią pola karnego)
    ctx.fillRect(goalBoxRight, margin, penaltyBoxRight - goalBoxRight, fieldHeight);

    // LINIE PÓŁPRZESTRZENI - przerywane, brązowe
    // Są przedłużeniem linii bocznych pola karnego i pola bramkowego
    ctx.strokeStyle = 'rgba(196, 167, 110, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 10]);

    // Lewa linia - przedłużenie lewej linii pola karnego
    ctx.beginPath();
    ctx.moveTo(penaltyBoxLeft, margin);
    ctx.lineTo(penaltyBoxLeft, height - margin);
    ctx.stroke();

    // Prawa linia - przedłużenie prawej linii pola karnego
    ctx.beginPath();
    ctx.moveTo(penaltyBoxRight, margin);
    ctx.lineTo(penaltyBoxRight, height - margin);
    ctx.stroke();

    // Lewa wewnętrzna linia - przedłużenie lewej linii pola bramkowego (piątki)
    ctx.beginPath();
    ctx.moveTo(goalBoxLeft, margin);
    ctx.lineTo(goalBoxLeft, height - margin);
    ctx.stroke();

    // Prawa wewnętrzna linia - przedłużenie prawej linii pola bramkowego (piątki)
    ctx.beginPath();
    ctx.moveTo(goalBoxRight, margin);
    ctx.lineTo(goalBoxRight, height - margin);
    ctx.stroke();

    // Resetuj linię przerywaną
    ctx.setLineDash([]);
  };

  const drawPlayer = (ctx, player, isTeam, playerColor = null) => {
    ctx.save();
    
    // Rozmiar zawodnika proporcjonalny do boiska
    // Im mniejsze boisko, tym większe ikony (lepiej widoczne)
    const playerSizes = {
      '7v7': 26,   // większe
      '9v9': 22,   // średnie
      '11v11': 18  // standardowe
    };
    const playerRadius = playerSizes[gameFormat] || 18;
    const fontSize = Math.floor(playerRadius * 0.65);
    
    // Użyj koloru zawodnika jeśli jest ustawiony, w przeciwnym razie użyj domyślnego koloru drużyny
    const color = player.color || playerColor || (isTeam ? teamColor : opponentColor);
    
    // Przesuń kontekst do pozycji zawodnika i obróć
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation || 0);
    
    // Cień
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    
    // Okrąg zawodnika
    ctx.beginPath();
    ctx.arc(0, 0, playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    
    // "Ręce" zawodnika - dwie linie po bokach pokazujące orientację
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    // Lewa ręka
    ctx.beginPath();
    ctx.moveTo(-playerRadius * 0.5, -playerRadius * 0.3);
    ctx.lineTo(-playerRadius * 1.3, -playerRadius * 0.8);
    ctx.stroke();
    
    // Prawa ręka
    ctx.beginPath();
    ctx.moveTo(playerRadius * 0.5, -playerRadius * 0.3);
    ctx.lineTo(playerRadius * 1.3, -playerRadius * 0.8);
    ctx.stroke();
    
    // Numer (obrócony z powrotem aby był zawsze poziomy)
    ctx.rotate(-(player.rotation || 0));
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.number, 0, 0);
    ctx.rotate(player.rotation || 0);
    
    ctx.restore();
    
    // Rysuj rączkę rotacji jeśli zawodnik jest wybrany
    if (selectedPlayer && selectedPlayer.id === player.id && 
        ((selectedPlayer.type === 'team' && isTeam) || 
         (selectedPlayer.type === 'opponent' && !isTeam))) {
      
      ctx.save();
      const handleDistance = playerRadius + 15;
      const handleX = player.x + Math.sin(player.rotation || 0) * handleDistance;
      const handleY = player.y - Math.cos(player.rotation || 0) * handleDistance;
      
      // Linia do rączki
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(handleX, handleY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Rączka
      ctx.beginPath();
      ctx.arc(handleX, handleY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.restore();
    }
  };

  const drawPlayerPath = (ctx, fromPlayer, toPlayer, isTeam, progress) => {
    ctx.save();
    
    // Rysuj ścieżkę ruchu jako cienką linię z cieniem
    ctx.strokeStyle = isTeam ? 'rgba(26, 54, 93, 0.3)' : 'rgba(139, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(fromPlayer.x, fromPlayer.y);
    ctx.lineTo(toPlayer.x, toPlayer.y);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.restore();
  };

  const interpolatePlayers = (from, to, progress) => {
    return {
      team: from.team.map((player, i) => ({
        ...player,
        x: player.x + (to.team[i].x - player.x) * progress,
        y: player.y + (to.team[i].y - player.y) * progress
      })),
      opponent: from.opponent.map((player, i) => ({
        ...player,
        x: player.x + (to.opponent[i].x - player.x) * progress,
        y: player.y + (to.opponent[i].y - player.y) * progress
      })),
      ball: {
        x: from.ball.x + (to.ball.x - from.ball.x) * progress,
        y: from.ball.y + (to.ball.y - from.ball.y) * progress
      }
    };
  };

  const drawBall = (ctx, ball) => {
    ctx.save();
    
    // Rozmiar pi\u0142ki proporcjonalny do formatu gry
    const ballSizes = {
      '7v7': 10,   // wi\u0119ksza
      '9v9': 9,    // \u015brednia
      '11v11': 8   // standardowa
    };
    const ballRadius = ballSizes[gameFormat] || 8;
    
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    
    // Bia\u0142a podstawa
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    
    // Klasyczny wz\u00f3r pi\u0142ki - czarne pi\u0119ciok\u0105ty
    ctx.fillStyle = '#000000';
    
    // G\u0142\u00f3wny pi\u0119ciok\u0105t (uproszczony wz\u00f3r)
    const pentagonRadius = ballRadius * 0.35;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const x = ball.x + Math.cos(angle) * pentagonRadius;
      const y = ball.y + Math.sin(angle) * pentagonRadius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Dodatkowe czarne elementy dla realizmu
    const hexSize = ballRadius * 0.25;
    const positions = [
      { angle: 0, distance: ballRadius * 0.7 },
      { angle: Math.PI * 0.66, distance: ballRadius * 0.7 },
      { angle: -Math.PI * 0.66, distance: ballRadius * 0.7 }
    ];
    
    positions.forEach(pos => {
      const centerX = ball.x + Math.cos(pos.angle) * pos.distance;
      const centerY = ball.y + Math.sin(pos.angle) * pos.distance;
      
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

  // Funkcja sprawdzająca czy punkt (px, py) jest blisko linii
  const isPointNearLine = (px, py, line, threshold = 8) => {
    // Dla linii prostych
    if (!line.type.includes('curve')) {
      // Odległość punktu od odcinka
      const A = px - line.startX;
      const B = py - line.startY;
      const C = line.endX - line.startX;
      const D = line.endY - line.startY;
      
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      
      if (lenSq !== 0) param = dot / lenSq;
      
      let xx, yy;
      
      if (param < 0) {
        xx = line.startX;
        yy = line.startY;
      } else if (param > 1) {
        xx = line.endX;
        yy = line.endY;
      } else {
        xx = line.startX + param * C;
        yy = line.startY + param * D;
      }
      
      const dx = px - xx;
      const dy = py - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance < threshold;
    } else {
      // Dla linii krzywych - sprawdź punkty wzdłuż krzywej
      const cp = line.controlX !== undefined && line.controlY !== undefined
        ? { x: line.controlX, y: line.controlY }
        : {
            x: (line.startX + line.endX) / 2 + (line.endY - line.startY) * 0.3,
            y: (line.startY + line.endY) / 2 - (line.endX - line.startX) * 0.3
          };
      
      // Sprawdź wiele punktów wzdłuż krzywej
      for (let t = 0; t <= 1; t += 0.05) {
        const x = (1-t)*(1-t)*line.startX + 2*(1-t)*t*cp.x + t*t*line.endX;
        const y = (1-t)*(1-t)*line.startY + 2*(1-t)*t*cp.y + t*t*line.endY;
        const distance = Math.sqrt((px - x) * (px - x) + (py - y) * (py - y));
        if (distance < threshold) return true;
      }
      return false;
    }
  };

  // Funkcja sprawdzająca czy punkt jest blisko punktu kontrolnego krzywej
  const isPointNearControlPoint = (px, py, line, threshold = 10) => {
    if (!line.type.includes('curve')) return false;
    
    const cp = line.controlX !== undefined && line.controlY !== undefined
      ? { x: line.controlX, y: line.controlY }
      : {
          x: (line.startX + line.endX) / 2 + (line.endY - line.startY) * 0.3,
          y: (line.startY + line.endY) / 2 - (line.endX - line.startX) * 0.3
        };
    
    const distance = Math.sqrt((px - cp.x) * (px - cp.x) + (py - cp.y) * (py - cp.y));
    return distance < threshold;
  };

  // Funkcja sprawdzająca czy punkt jest blisko końca linii (do wydłużania)
  const isPointNearLineEnd = (px, py, line, threshold = 12) => {
    const distToStart = Math.sqrt((px - line.startX) * (px - line.startX) + (py - line.startY) * (py - line.startY));
    const distToEnd = Math.sqrt((px - line.endX) * (px - line.endX) + (py - line.endY) * (py - line.endY));
    
    if (distToStart < threshold) return 'start';
    if (distToEnd < threshold) return 'end';
    return null;
  };

  // Funkcja sprawdzająca czy punkt jest wewnątrz strefy
  const isPointInZone = (px, py, zone) => {
    switch (zone.type) {
      case 'rectangle':
        return px >= Math.min(zone.x, zone.x + zone.width) &&
               px <= Math.max(zone.x, zone.x + zone.width) &&
               py >= Math.min(zone.y, zone.y + zone.height) &&
               py <= Math.max(zone.y, zone.y + zone.height);
      
      case 'circle':
        const dx = px - zone.centerX;
        const dy = py - zone.centerY;
        return Math.sqrt(dx * dx + dy * dy) <= zone.radius;
      
      case 'polygon':
        // Ray casting algorithm
        let inside = false;
        for (let i = 0, j = zone.points.length - 1; i < zone.points.length; j = i++) {
          const xi = zone.points[i].x, yi = zone.points[i].y;
          const xj = zone.points[j].x, yj = zone.points[j].y;
          
          const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      
      default:
        return false;
    }
  };

  // Funkcja sprawdzająca czy punkt jest blisko wierzchołka wielokąta
  const isPointNearPolygonVertex = (px, py, zone, threshold = 10) => {
    if (zone.type !== 'polygon' || !zone.points) return null;
    
    for (let i = 0; i < zone.points.length; i++) {
      const vertex = zone.points[i];
      const distance = Math.sqrt((px - vertex.x) * (px - vertex.x) + (py - vertex.y) * (py - vertex.y));
      if (distance < threshold) {
        return i; // Zwróć indeks wierzchołka
      }
    }
    return null;
  };

  // Funkcja rysująca strefę
  const drawZone = (ctx, zone, isSelected = false) => {
    ctx.save();
    ctx.fillStyle = zone.color || zoneColor;
    ctx.globalAlpha = zone.opacity || zoneOpacity;
    ctx.strokeStyle = isSelected ? '#00ff00' : (zone.color || zoneColor);
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash(isSelected ? [5, 5] : []);

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
          
          // Rysuj punkty wierzchołków jeśli zaznaczony
          if (isSelected) {
            zone.points.forEach(point => {
              ctx.fillStyle = '#00ff00';
              ctx.beginPath();
              ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
        break;
    }

    ctx.restore();
  };

  const drawLine = (ctx, line, isSelected = false) => {
    ctx.save();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = isSelected ? 5 : 3; // Pogrub zaznaczoną linię
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const dx = line.endX - line.startX;
    const dy = line.endY - line.startY;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);
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
      // Jeśli linia ma zapisany punkt kontrolny, użyj go
      if (line.controlX !== undefined && line.controlY !== undefined) {
        return { x: line.controlX, y: line.controlY };
      }
      // W przeciwnym razie wylicz domyślny
      return {
        x: (line.startX + line.endX) / 2 + (line.endY - line.startY) * 0.3,
        y: (line.startY + line.endY) / 2 - (line.endX - line.startX) * 0.3
      };
    };

    switch (line.type) {
      case 'line-solid':
        // Prosta ciągła bez grotów
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        break;

      case 'line-dashed':
        // Prosta przerywana bez grotów
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        ctx.setLineDash([]);
        break;

      case 'arrow-solid':
        // Prosta ciągła z grotem
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        drawArrowHead(line.endX, line.endY, angle);
        break;

      case 'arrow-dashed':
        // Prosta przerywana z grotem
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        ctx.setLineDash([]);
        drawArrowHead(line.endX, line.endY, angle);
        break;

      case 'double-arrow-solid':
        // Podwójna prosta ciągła z grotem
        const offset = 4; // Odstęp między liniami
        const perpX = -Math.sin(angle) * offset;
        const perpY = Math.cos(angle) * offset;
        
        // Skróć linie przed grotem
        const arrowGap = 8; // Odległość gdzie grot się zaczyna
        const shortenedEndX = line.endX - arrowGap * Math.cos(angle);
        const shortenedEndY = line.endY - arrowGap * Math.sin(angle);
        
        // Pierwsza linia
        ctx.beginPath();
        ctx.moveTo(line.startX + perpX, line.startY + perpY);
        ctx.lineTo(shortenedEndX + perpX, shortenedEndY + perpY);
        ctx.stroke();
        
        // Druga linia
        ctx.beginPath();
        ctx.moveTo(line.startX - perpX, line.startY - perpY);
        ctx.lineTo(shortenedEndX - perpX, shortenedEndY - perpY);
        ctx.stroke();
        
        // Grot strzałki (większy dla podwójnej linii)
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
        // Linia krzywa bez grotów
        const cp1 = getControlPoint();
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.quadraticCurveTo(cp1.x, cp1.y, line.endX, line.endY);
        ctx.stroke();
        
        // Rysuj punkt kontrolny jeśli linia jest zaznaczona
        if (isSelected) {
          ctx.fillStyle = '#00ff00';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cp1.x, cp1.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        break;

      case 'curve-arrow-solid':
        // Linia krzywa ciągła z grotem
        const cp2 = getControlPoint();
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.quadraticCurveTo(cp2.x, cp2.y, line.endX, line.endY);
        ctx.stroke();
        
        // Oblicz kąt strzałki na końcu krzywej
        const t = 0.95; // Punkt blisko końca krzywej
        const nearEndX = (1-t)*(1-t)*line.startX + 2*(1-t)*t*cp2.x + t*t*line.endX;
        const nearEndY = (1-t)*(1-t)*line.startY + 2*(1-t)*t*cp2.y + t*t*line.endY;
        const curveAngle = Math.atan2(line.endY - nearEndY, line.endX - nearEndX);
        drawArrowHead(line.endX, line.endY, curveAngle);
        
        // Punkt kontrolny dla edycji
        if (isSelected) {
          ctx.fillStyle = '#00ff00';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cp2.x, cp2.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        break;

      case 'curve-arrow-dashed':
        // Linia krzywa przerywana z grotem
        const cp3 = getControlPoint();
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.quadraticCurveTo(cp3.x, cp3.y, line.endX, line.endY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Oblicz kąt strzałki na końcu krzywej
        const t3 = 0.95;
        const nearEndX3 = (1-t3)*(1-t3)*line.startX + 2*(1-t3)*t3*cp3.x + t3*t3*line.endX;
        const nearEndY3 = (1-t3)*(1-t3)*line.startY + 2*(1-t3)*t3*cp3.y + t3*t3*line.endY;
        const curveAngle3 = Math.atan2(line.endY - nearEndY3, line.endX - nearEndX3);
        drawArrowHead(line.endX, line.endY, curveAngle3);
        
        // Punkt kontrolny dla edycji
        if (isSelected) {
          ctx.fillStyle = '#00ff00';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cp3.x, cp3.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        break;

      // Obsługa starych typów dla kompatybilności wstecznej
      case 'solid':
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        break;

      case 'dashed':
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        ctx.setLineDash([]);
        break;

      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        drawArrowHead(line.endX, line.endY, angle);
        break;

      case 'double-arrow':
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        drawArrowHead(line.endX, line.endY, angle);
        // Strzałka na początku
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(
          line.startX + arrowSize * Math.cos(angle - Math.PI / 6),
          line.startY + arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(
          line.startX + arrowSize * Math.cos(angle + Math.PI / 6),
          line.startY + arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;

      case 'curve':
        const cpOld = getControlPoint();
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.quadraticCurveTo(cpOld.x, cpOld.y, line.endX, line.endY);
        ctx.stroke();
        break;

      case 'wavy':
        const segments = 8;
        const amplitude = 10;
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const midX = line.startX + dx * t;
          const midY = line.startY + dy * t;
          const perpX = -dy / length * amplitude * Math.sin(t * Math.PI * 4);
          const perpY = dx / length * amplitude * Math.sin(t * Math.PI * 4);
          ctx.lineTo(midX + perpX, midY + perpY);
        }
        ctx.stroke();
        break;

      default:
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
    }

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawField(ctx);
    
    // Rysuj strefy (pod liniami i zawodnikami)
    zones.forEach((zone, index) => drawZone(ctx, zone, index === selectedZoneIndex));
    if (currentZone) {
      drawZone(ctx, currentZone, false);
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
      fromFrame.team.forEach((player, i) => {
        if (toFrame.team[i]) {
          drawPlayerPath(ctx, player, toFrame.team[i], true, interpolationProgress);
        }
      });
      
      fromFrame.opponent.forEach((player, i) => {
        if (toFrame.opponent[i]) {
          drawPlayerPath(ctx, player, toFrame.opponent[i], false, interpolationProgress);
        }
      });
    }
    
    players.team.forEach(player => drawPlayer(ctx, player, true));
    players.opponent.forEach(player => drawPlayer(ctx, player, false));
    drawBall(ctx, players.ball);
  }, [players, isPlaying, currentFrame, currentScheme, interpolationProgress, lines, currentLine, selectedLineIndex, zones, currentZone, selectedZoneIndex, polygonPoints, zoneColor, zoneType, isDrawingMode, selectedPlayer]);

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

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Przeskaluj współrzędne myszy do wewnętrznej rozdzielczości canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

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
    const rect = canvas.getBoundingClientRect();
    
    // Przeskaluj współrzędne myszy do wewnętrznej rozdzielczości canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

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
        
        setPlayers(prev => ({
          ...prev,
          [selectedPlayer.type]: prev[selectedPlayer.type].map(p =>
            p.id === selectedPlayer.id ? { ...p, rotation: angle } : p
          )
        }));
      }
      return;
    }

    // Obsługa przeciągania
    if (!isDragging || !draggedPlayer) return;

    const boundedX = Math.max(20, Math.min(x, canvas.width - 20));
    const boundedY = Math.max(20, Math.min(y, canvas.height - 20));

    if (draggedPlayer.type === 'ball') {
      setPlayers(prev => ({
        ...prev,
        ball: { x: boundedX, y: boundedY }
      }));
    } else {
      setPlayers(prev => ({
        ...prev,
        [draggedPlayer.type]: prev[draggedPlayer.type].map(p =>
          p.id === draggedPlayer.id ? { ...p, x: boundedX, y: boundedY } : p
        )
      }));
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
    if ((isDraggingZone || isDraggingPolygonVertex) && currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        frames: currentScheme.frames.map((f, i) => 
          i === currentFrame ? { ...players, lines: lines, zones: zones } : f
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
    setDraggedVertexIndex(null);
  };

  const handleCanvasDoubleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

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

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col overflow-hidden">
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

      {/* Górny pasek nawigacji */}
      <div className="bg-slate-950/70 backdrop-blur-xl border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Logo/Tytuł */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">⚽</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Model Gry</h1>
              <p className="text-xs text-slate-400">Taktyka Piłkarska</p>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10"></div>

          {/* Przyciski Przesuwanie / Rysowanie */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsDrawingMode(false);
                setExpandedPanel(expandedPanel === 'move' ? null : 'move');
                setCurrentLine(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                !isDrawingMode && expandedPanel === 'move'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/10 hover:bg-white/15 text-slate-300'
              }`}
            >
              🖱️ Przesuwanie
            </button>
            
            <button
              onClick={() => {
                setIsDrawingMode(true);
                setExpandedPanel(expandedPanel === 'draw' ? null : 'draw');
              }}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                isDrawingMode && expandedPanel === 'draw'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/10 hover:bg-white/15 text-slate-300'
              }`}
            >
              ✏️ Rysowanie
            </button>
          </div>

          <div className="h-8 w-px bg-white/10"></div>

          {/* Kolory drużyn */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 relative">
              <span className="text-sm text-slate-300">Drużyna:</span>
              {/* Ukryty natywny color picker */}
              <input
                ref={teamColorInputRef}
                type="color"
                value={teamColor}
                onChange={(e) => handleTeamColorChange(e.target.value)}
                className="hidden"
              />
              {/* Widoczny przycisk koloru */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenColorPalette(openColorPalette === 'team' ? null : 'team');
                }}
                className="w-8 h-8 rounded cursor-pointer border-2 border-white/20 hover:border-white/40 transition-all"
                style={{ backgroundColor: teamColor }}
                title="Wybierz kolor drużyny"
              />
              {openColorPalette === 'team' && (
                <div className="absolute top-full mt-2 left-0 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg p-2 flex gap-1 shadow-xl z-50">
                  {quickColorPalette.map((colorItem) => (
                    <button
                      key={colorItem.color}
                      onClick={() => handleTeamColorChange(colorItem.color)}
                      className="w-7 h-7 rounded border-2 border-white/30 hover:scale-110 hover:border-white/60 transition-all"
                      style={{ backgroundColor: colorItem.color }}
                      title={colorItem.name}
                    />
                  ))}
                  {/* Przycisk RGB */}
                  <button
                    onClick={() => teamColorInputRef.current?.click()}
                    className="w-7 h-7 rounded border-2 border-white/30 hover:scale-110 hover:border-white/60 transition-all bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold"
                    title="Wybór RGB"
                  >
                    RGB
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 relative">
              <span className="text-sm text-slate-300">Przeciwnik:</span>
              {/* Ukryty natywny color picker */}
              <input
                ref={opponentColorInputRef}
                type="color"
                value={opponentColor}
                onChange={(e) => handleOpponentColorChange(e.target.value)}
                className="hidden"
              />
              {/* Widoczny przycisk koloru */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenColorPalette(openColorPalette === 'opponent' ? null : 'opponent');
                }}
                className="w-8 h-8 rounded cursor-pointer border-2 border-white/20 hover:border-white/40 transition-all"
                style={{ backgroundColor: opponentColor }}
                title="Wybierz kolor przeciwnika"
              />
              {openColorPalette === 'opponent' && (
                <div className="absolute top-full mt-2 left-0 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg p-2 flex gap-1 shadow-xl z-50">
                  {quickColorPalette.map((colorItem) => (
                    <button
                      key={colorItem.color}
                      onClick={() => handleOpponentColorChange(colorItem.color)}
                      className="w-7 h-7 rounded border-2 border-white/30 hover:scale-110 hover:border-white/60 transition-all"
                      style={{ backgroundColor: colorItem.color }}
                      title={colorItem.name}
                    />
                  ))}
                  {/* Przycisk RGB */}
                  <button
                    onClick={() => opponentColorInputRef.current?.click()}
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

        {/* Rozwijany panel dla Rysowania */}
        {expandedPanel === 'draw' && isDrawingMode && (
          <div className="mt-3 pt-3 border-t border-white/10">
            {/* Wybór narzędzia rysowania */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-slate-400 font-medium">Narzędzie:</span>
              <button
                onClick={() => {
                  setDrawingTool('line');
                  setCurrentZone(null);
                  setPolygonPoints([]);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  drawingTool === 'line'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/10 hover:bg-white/15 text-slate-300'
                }`}
              >
                📏 Linie
              </button>
              <button
                onClick={() => {
                  setDrawingTool('zone');
                  setCurrentLine(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  drawingTool === 'zone'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/10 hover:bg-white/15 text-slate-300'
                }`}
              >
                🔷 Strefy
              </button>
            </div>

            {/* Opcje linii */}
            {drawingTool === 'line' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-400 font-medium">Typ linii:</span>
                
                {/* Linie z grotem */}
              <button
                onClick={() => setLineType('arrow-solid')}
                className={`px-3 py-2 rounded transition-all ${
                  lineType === 'arrow-solid' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                }`}
                title="Prosta linia ciągła z grotem"
              >
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <line x1="4" y1="12" x2="32" y2="12" stroke="currentColor" strokeWidth="2" />
                  <polygon points="32,12 28,9 28,15" fill="currentColor" />
                </svg>
              </button>
              
              <button
                onClick={() => setLineType('arrow-dashed')}
                className={`px-3 py-2 rounded transition-all ${
                  lineType === 'arrow-dashed' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                }`}
                title="Prosta linia przerywana z grotem"
              >
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <line x1="4" y1="12" x2="32" y2="12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                  <polygon points="32,12 28,9 28,15" fill="currentColor" />
                </svg>
              </button>
              
              <button
                onClick={() => setLineType('double-arrow-solid')}
                className={`px-3 py-2 rounded transition-all ${
                  lineType === 'double-arrow-solid' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                }`}
                title="Podwójna prosta linia ciągła z grotem"
              >
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <line x1="4" y1="10" x2="32" y2="10" stroke="currentColor" strokeWidth="2" />
                  <line x1="4" y1="14" x2="32" y2="14" stroke="currentColor" strokeWidth="2" />
                  <polygon points="32,12 28,9 28,15" fill="currentColor" />
                </svg>
              </button>

              <div className="w-px h-8 bg-white/10"></div>
              
              {/* Linie bez grotów */}
              <button
                onClick={() => setLineType('line-dashed')}
                className={`px-3 py-2 rounded transition-all ${
                  lineType === 'line-dashed' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                }`}
                title="Linia przerywana bez grotów"
              >
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <line x1="4" y1="12" x2="36" y2="12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                </svg>
              </button>
              
              <button
                onClick={() => setLineType('line-solid')}
                className={`px-3 py-2 rounded transition-all ${
                  lineType === 'line-solid' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                }`}
                title="Linia ciągła bez grotów"
              >
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <line x1="4" y1="12" x2="36" y2="12" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>

              <div className="w-px h-8 bg-white/10"></div>
              
              {/* Linie krzywe */}
              <button
                onClick={() => setLineType('curve-arrow-solid')}
                className={`px-3 py-2 rounded transition-all ${
                  lineType === 'curve-arrow-solid' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                }`}
                title="Linia krzywa ciągła z grotem"
              >
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <path d="M4 12 Q 18 4, 32 12" stroke="currentColor" strokeWidth="2" fill="none" />
                  <polygon points="32,12 28,10 28,14" fill="currentColor" />
                </svg>
              </button>
              
              <button
                onClick={() => setLineType('curve-arrow-dashed')}
                className={`px-3 py-2 rounded transition-all ${
                  lineType === 'curve-arrow-dashed' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                }`}
                title="Linia krzywa przerywana z grotem"
              >
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <path d="M4 12 Q 18 4, 32 12" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                  <polygon points="32,12 28,10 28,14" fill="currentColor" />
                </svg>
              </button>
              
              <button
                onClick={() => setLineType('curve-line')}
                className={`px-3 py-2 rounded transition-all ${
                  lineType === 'curve-line' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                }`}
                title="Linia krzywa bez grotów"
              >
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <path d="M4 12 Q 18 4, 36 12" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>

              <div className="w-px h-8 bg-white/10"></div>
              
              {/* Kolor linii */}
              <div className="flex items-center gap-2 relative">
                <span className="text-sm text-slate-400">Kolor:</span>
                {/* Ukryty natywny color picker */}
                <input
                  ref={lineColorInputRef}
                  type="color"
                  value={lineColor}
                  onChange={(e) => {
                    setLineColor(e.target.value);
                    setOpenColorPalette(null);
                  }}
                  className="hidden"
                />
                {/* Widoczny przycisk koloru */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenColorPalette(openColorPalette === 'line' ? null : 'line');
                  }}
                  className="w-8 h-8 rounded cursor-pointer border-2 border-white/20 hover:border-white/40 transition-all"
                  style={{ backgroundColor: lineColor }}
                  title="Kolor linii"
                />
                {openColorPalette === 'line' && (
                  <div className="absolute top-full mt-2 left-0 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg p-2 flex gap-1 shadow-xl z-50">
                    {quickColorPalette.map((colorItem) => (
                      <button
                        key={colorItem.color}
                        onClick={() => {
                          setLineColor(colorItem.color);
                          setOpenColorPalette(null);
                        }}
                        className="w-7 h-7 rounded border-2 border-white/30 hover:scale-110 hover:border-white/60 transition-all"
                        style={{ backgroundColor: colorItem.color }}
                        title={colorItem.name}
                      />
                    ))}
                    {/* Przycisk RGB */}
                    <button
                      onClick={() => lineColorInputRef.current?.click()}
                      className="w-7 h-7 rounded border-2 border-white/30 hover:scale-110 hover:border-white/60 transition-all bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold"
                      title="Wybór RGB"
                    >
                      RGB
                    </button>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Opcje stref */}
            {drawingTool === 'zone' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-400 font-medium">Typ strefy:</span>
                  
                  {/* Prostokąt */}
                  <button
                    onClick={() => setZoneType('rectangle')}
                    className={`p-3 rounded-lg transition-all ${
                      zoneType === 'rectangle' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                    }`}
                    title="Prostokąt (kliknij i przeciągnij)"
                  >
                    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                      <rect x="4" y="4" width="32" height="16" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </button>

                  {/* Koło */}
                  <button
                    onClick={() => setZoneType('circle')}
                    className={`p-3 rounded-lg transition-all ${
                      zoneType === 'circle' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                    }`}
                    title="Koło (kliknij i przeciągnij)"
                  >
                    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                      <circle cx="20" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </button>

                  {/* Wielokąt */}
                  <button
                    onClick={() => setZoneType('polygon')}
                    className={`p-3 rounded-lg transition-all ${
                      zoneType === 'polygon' ? 'bg-white/20 ring-2 ring-blue-500' : 'bg-white/5 hover:bg-white/10'
                    }`}
                    title="Wielokąt (klikaj punkty, zamknij klikając pierwszy punkt)"
                  >
                    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                      <path d="M 20 4 L 35 10 L 30 20 L 10 20 L 5 10 Z" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </button>

                  <div className="w-px h-8 bg-white/10"></div>
                  
                  {/* Kolor strefy */}
                  <div className="flex items-center gap-2 relative">
                    <span className="text-sm text-slate-400">Kolor:</span>
                    {/* Ukryty natywny color picker */}
                    <input
                      ref={zoneColorInputRef}
                      type="color"
                      value={zoneColor}
                      onChange={(e) => {
                        setZoneColor(e.target.value);
                        setOpenColorPalette(null);
                      }}
                      className="hidden"
                    />
                    {/* Widoczny przycisk koloru */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenColorPalette(openColorPalette === 'zone' ? null : 'zone');
                      }}
                      className="w-8 h-8 rounded cursor-pointer border-2 border-white/20 hover:border-white/40 transition-all"
                      style={{ backgroundColor: zoneColor }}
                      title="Kolor strefy"
                    />
                    {openColorPalette === 'zone' && (
                      <div className="absolute top-full mt-2 left-0 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg p-2 flex gap-1 shadow-xl z-50">
                        {quickColorPalette.map((colorItem) => (
                          <button
                            key={colorItem.color}
                            onClick={() => {
                              setZoneColor(colorItem.color);
                              setOpenColorPalette(null);
                            }}
                            className="w-7 h-7 rounded border-2 border-white/30 hover:scale-110 hover:border-white/60 transition-all"
                            style={{ backgroundColor: colorItem.color }}
                            title={colorItem.name}
                          />
                        ))}
                        {/* Przycisk RGB */}
                        <button
                          onClick={() => zoneColorInputRef.current?.click()}
                          className="w-7 h-7 rounded border-2 border-white/30 hover:scale-110 hover:border-white/60 transition-all bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold"
                          title="Wybór RGB"
                        >
                          RGB
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Przezroczystość */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Przezroczystość:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={zoneOpacity}
                      onChange={(e) => setZoneOpacity(parseFloat(e.target.value))}
                      className="w-24"
                      title="Przezroczystość strefy"
                    />
                    <span className="text-xs text-slate-400 w-8">{Math.round(zoneOpacity * 100)}%</span>
                  </div>
                </div>

                {/* Instrukcja dla wielokąta */}
                {zoneType === 'polygon' && (
                  <div className="text-xs text-slate-400 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                    💡 Klikaj na boisku, aby dodać punkty wielokąta. Kliknij pierwszy punkt ponownie, aby zamknąć kształt.
                    {polygonPoints.length > 0 && ` (Punktów: ${polygonPoints.length})`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Rozwijany panel dla Przesuwania */}
        {expandedPanel === 'move' && !isDrawingMode && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
              <span className="text-sm text-slate-400">Tryb przesuwania zawodników, linii i stref aktywny</span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono bg-white/5 px-2 py-1 rounded">Delete</span>
                <span>usuń</span>
                <span className="mx-1">|</span>
                <span className="font-mono bg-white/5 px-2 py-1 rounded">Ctrl+C</span>
                <span>kopiuj</span>
                <span className="mx-1">|</span>
                <span className="font-mono bg-white/5 px-2 py-1 rounded">Ctrl+V</span>
                <span>wklej</span>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              
              {/* Przyciski dla zaznaczonej linii */}
              {selectedLineIndex !== null && (
                <>
                  <button
                    onClick={() => {
                      setClipboard({
                        type: 'line',
                        data: { ...lines[selectedLineIndex] }
                      });
                      setShowCopyNotification(true);
                      setTimeout(() => setShowCopyNotification(false), 2000);
                    }}
                    className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-sm text-blue-300 transition-all"
                    title="Ctrl+C"
                  >
                    📋 Kopiuj linię
                  </button>
                  <button
                    onClick={() => {
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
                    }}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all"
                    title="Delete"
                  >
                    🗑️ Usuń linię
                  </button>
                </>
              )}
              
              {/* Przyciski dla zaznaczonej strefy */}
              {selectedZoneIndex !== null && (
                <>
                  <button
                    onClick={() => {
                      setClipboard({
                        type: 'zone',
                        data: { ...zones[selectedZoneIndex] }
                      });
                      setShowCopyNotification(true);
                      setTimeout(() => setShowCopyNotification(false), 2000);
                    }}
                    className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-sm text-blue-300 transition-all"
                    title="Ctrl+C"
                  >
                    📋 Kopiuj strefę
                  </button>
                  <button
                    onClick={() => {
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
                    }}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all"
                    title="Delete"
                  >
                    🗑️ Usuń strefę
                  </button>
                </>
              )}
              
              {/* Przycisk wklej */}
              {clipboard && (
                <button
                  onClick={() => {
                    if (clipboard.type === 'line') {
                      const newLine = {
                        ...clipboard.data,
                        startX: clipboard.data.startX + 20,
                        startY: clipboard.data.startY + 20,
                        endX: clipboard.data.endX + 20,
                        endY: clipboard.data.endY + 20
                      };
                      
                      if (newLine.controlX !== undefined && newLine.controlY !== undefined) {
                        newLine.controlX += 20;
                        newLine.controlY += 20;
                      }
                      
                      const newLines = [...lines, newLine];
                      setLines(newLines);
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
                  }}
                  className="px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm text-green-300 transition-all"
                  title="Ctrl+V"
                >
                  📌 Wklej {clipboard.type === 'line' ? 'linię' : 'strefę'}
                </button>
              )}
              
              {lines.length > 0 && (
                <button
                  onClick={() => {
                    setLines([]);
                    setSelectedLineIndex(null);
                    if (currentScheme) {
                      const updatedScheme = {
                        ...currentScheme,
                        frames: currentScheme.frames.map((f, i) => 
                          i === currentFrame ? { ...players, lines: [], zones: zones } : f
                        )
                      };
                      updateCurrentScheme(updatedScheme);
                    }
                  }}
                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all"
                >
                  🗑️ Wyczyść wszystkie linie
                </button>
              )}
              {zones.length > 0 && (
                <button
                  onClick={() => {
                    setZones([]);
                    setSelectedZoneIndex(null);
                    if (currentScheme) {
                      const updatedScheme = {
                        ...currentScheme,
                        frames: currentScheme.frames.map((f, i) => 
                          i === currentFrame ? { ...players, lines: lines, zones: [] } : f
                        )
                      };
                      updateCurrentScheme(updatedScheme);
                    }
                  }}
                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all"
                >
                  🗑️ Wyczyść wszystkie strefy
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Wrapper dla 3 paneli */}
      <div className="flex flex-1 overflow-hidden">

      {/* Lewy panel - Fazy i Schematy */}
      <div className="w-80 bg-slate-950/50 backdrop-blur-xl border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Model Gry
          </h1>
          <p className="text-sm text-slate-400 mt-1">Taktyka drużyny</p>
          
          {/* Wybór formatu gry */}
          <div className="mt-4">
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
          <div className="mt-4 flex gap-2">
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
                    className={`phase-btn flex-1 px-4 py-3 rounded-lg text-left font-semibold flex items-center justify-between ${
                      selectedPhase === phase ? 'active' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span>{phase}</span>
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
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('schemeId', scheme.id);
                                e.dataTransfer.setData('fromKey', `${phase}-${subPhase}`);
                              }}
                              onClick={() => selectScheme(scheme)}
                              className={`scheme-card p-2 rounded-lg bg-gradient-to-br cursor-move ${
                                currentScheme?.id === scheme.id
                                  ? 'from-blue-600/30 to-purple-600/30 border border-blue-500/50'
                                  : 'from-white/5 to-white/10 border border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between">
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
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('schemeId', scheme.id);
                        e.dataTransfer.setData('fromKey', phase);
                      }}
                      onClick={() => selectScheme(scheme)}
                      className={`scheme-card p-2 rounded-lg bg-gradient-to-br cursor-move ${
                        currentScheme?.id === scheme.id
                          ? 'from-blue-600/30 to-purple-600/30 border border-blue-500/50'
                          : 'from-white/5 to-white/10 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
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
              title="Eksportuj dane do pliku JSON"
            >
              <Download size={16} />
              JSON
            </button>
            <button
              onClick={exportToPowerPoint}
              className="flex-1 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg font-medium flex items-center justify-center gap-2 transition-all text-sm text-red-300"
              title="Eksportuj wszystkie schematy do PowerPoint"
            >
              <Download size={16} />
              PPT
            </button>
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
        
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
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
                className="control-btn p-1 bg-white/10 hover:bg-white/20 rounded transition-all flex-shrink-0"
                title="Od początku"
              >
                <SkipBack size={16} />
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
                className="control-btn p-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded flex-shrink-0"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
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
                className="control-btn p-1 bg-white/10 hover:bg-white/20 rounded flex-shrink-0"
                disabled={currentFrame >= currentScheme.frames.length - 1}
              >
                <SkipForward size={16} />
              </button>

              <div className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                {currentFrame + 1} / {currentScheme.frames.length}
              </div>
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${((currentFrame + interpolationProgress) / currentScheme.frames.length) * 100}%` }}
                />
              </div>

              <button
                onClick={addFrame}
                className="control-btn px-2 py-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded font-medium flex items-center gap-1 whitespace-nowrap text-xs flex-shrink-0"
              >
                <Plus size={14} />
                Klatkę
              </button>
              
              <button
                onClick={exportAnimationToMP4}
                className="control-btn px-2 py-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed rounded font-medium flex items-center gap-1 whitespace-nowrap text-xs flex-shrink-0"
                title="Pobierz animację jako MP4 (zwolnione tempo, z liniami ruchu)"
                disabled={!currentScheme || currentScheme.frames.length < 2}
              >
                <Download size={14} />
                Pobierz animację
              </button>
              
              {/* Podgląd klatek - po prawej */}
              <div className="flex-1"></div>
              <div className="flex gap-1 items-flex-start flex-shrink-0 max-w-xs overflow-x-auto scrollbar-custom">
                {currentScheme.frames.map((frame, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5 items-center flex-shrink-0">
                    <div
                      onClick={() => {
                        setCurrentFrame(idx);
                        setPlayers(frame);
                        setIsPlaying(false);
                        setInterpolationProgress(0);
                      }}
                      className={`cursor-pointer rounded flex-shrink-0 transition-all ${
                        currentFrame === idx 
                          ? 'border border-blue-400 bg-blue-400/40 w-6 h-6' 
                          : 'border border-white/20 bg-white/5 hover:bg-white/10 w-5 h-5'
                      }`}
                    >
                      <div className="flex items-center justify-center text-[8px] font-bold text-slate-300 w-full h-full">
                        {idx + 1}
                      </div>
                    </div>
                    {currentFrame === idx && currentScheme.frames.length > 1 && (
                      <button
                        onClick={() => deleteFrame(idx)}
                        className="p-0.5 bg-red-600 hover:bg-red-700 rounded transition-all"
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
      </div>

      {/* Prawy panel - Szczegóły schematu */}
      <div className="w-96 bg-slate-950/50 backdrop-blur-xl border-l border-white/10 flex flex-col">
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
            <div className="text-center py-12 text-slate-400">
              <p className="mb-4">Wybierz lub utwórz schemat</p>
              <p className="text-sm">aby rozpocząć projektowanie</p>
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
  );
};

export default FootballTacticsApp;
