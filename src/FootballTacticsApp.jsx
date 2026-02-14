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
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null); // Wybrany zawodnik do rotacji
  const [isDraggingRotation, setIsDraggingRotation] = useState(false);
  const [editingPlayerNumber, setEditingPlayerNumber] = useState(null); // Modal edycji numeru
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [draggedPhase, setDraggedPhase] = useState(null); // Przeciągana faza
  const [draggedSubPhase, setDraggedSubPhase] = useState(null); // Przeciągana subfaza
  const [allPhasesExpanded, setAllPhasesExpanded] = useState(true); // Rozwijanie wszystkich faz
  const [showInstructions, setShowInstructions] = useState(false); // Instrukcje
  const [moving, setMoving] = useState(null); // {scheme, oldKey} - schemat do przeniesienia
  const [moveToPhase, setMoveToPhase] = useState(null); // Nowa faza
  const [moveToSubPhase, setMoveToSubPhase] = useState(null); // Nowa subfaza
  const [showImportDialog, setShowImportDialog] = useState(false); // Dialog importu
  const [importedData, setImportedData] = useState(null); // Tymczasowe dane z importu

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
      expandedPhases
    };
    localStorage.setItem('footballTacticsData', JSON.stringify(dataToSave));
  }, [phases, schemes, gameFormat, selectedPhase, selectedSubPhase, expandedPhases]);

  // Synchronizuj zawartość comments edytora tylko gdy zmienia się schemat
  useEffect(() => {
    if (commentsRef.current && currentScheme) {
      // Tylko ustaw zawartość jeśli nie jest już ustawiona
      if (commentsRef.current.innerHTML !== currentScheme.comments) {
        commentsRef.current.innerHTML = currentScheme.comments;
      }
    }
  }, [currentScheme?.id, currentScheme?.comments]);

  // Gdy zmieni się wybrany schemat, zamknij modal przenoszenia
  useEffect(() => {
    setMoving(null);
    setMoveToPhase(null);
    setMoveToSubPhase(null);
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

  // Helper: Rysuj klatkę na podanym canvas
  const drawFrameToCanvas = (frameData, format, canvas, ctx) => {
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

    // Rysuj zawodników
    const playerSizes = { '7v7': 26, '9v9': 22, '11v11': 18 };
    const playerRadius = playerSizes[format] || 18;

    // Drużyna (niebieska)
    frameData.team.forEach(player => {
      ctx.save();
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.number, player.x, player.y);

      const arrowLength = playerRadius + 8;
      ctx.strokeStyle = '#1e40af';
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

    // Przeciwnik (czerwona)
    frameData.opponent.forEach(player => {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(player.x, player.y, playerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.number, player.x, player.y);

      const arrowLength = playerRadius + 8;
      ctx.strokeStyle = '#991b1b';
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

    // Piłka
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(frameData.ball.x, frameData.ball.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };

  // Helper: Narysuj klatkę na canvas i zwróć data URL
  const getFrameImageDataUrl = (frameData, format) => {
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    drawFrameToCanvas(frameData, format, canvas, ctx);
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
      drawFrameToCanvas(frames[i], format, canvas, ctx);
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

  // Funkcja pomocnicza do renderowania pełnej klatki animacji z liniami ruchu
  const drawAnimationFrame = (ctx, currentFrameData, nextFrameData, progress, format) => {
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

    // Drużyna (niebieska)
    interpolatedData.team.forEach(player => {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.rotation || 0);
      
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      ctx.arc(0, 0, playerRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#1a365d';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.shadowColor = 'transparent';
      
      // Ręce zawodnika
      ctx.strokeStyle = '#1a365d';
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

    // Przeciwnik (czerwona)
    interpolatedData.opponent.forEach(player => {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.rotation || 0);
      
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      ctx.arc(0, 0, playerRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#8b0000';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.shadowColor = 'transparent';
      
      // Ręce zawodnika
      ctx.strokeStyle = '#8b0000';
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

    // Piłka
    const ballSizes = { '7v7': 10, '9v9': 9, '11v11': 8 };
    const ballRadius = ballSizes[format] || 8;
    
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    
    ctx.beginPath();
    ctx.arc(interpolatedData.ball.x, interpolatedData.ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
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
            drawAnimationFrame(ctx, currentFrameData, nextFrameData, progress, gameFormat);
            
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
          drawAnimationFrame(ctx, currentFrameData, null, 0, gameFormat);
          
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
      let schemeCount = 0;
      let processedSchemes = 0;
      
      // Najpierw policz ile będzie schematów
      Object.keys(schemes[gameFormat]).forEach(key => {
        schemeCount += schemes[gameFormat][key].length;
      });
      
      if (schemeCount === 0) {
        alert('Brak schematów do eksportu!');
        return;
      }
      
      // Przejdź przez wszystkie schematy
      for (const key of Object.keys(schemes[gameFormat])) {
        const schemeList = schemes[gameFormat][key];
        
        for (const scheme of schemeList) {
          processedSchemes++;
          
          // Parsuj klucz na fazę i subfazę
          const [phase, subPhase] = key.includes('-') ? key.split('-') : [key, ''];
          
          // Dodaj slajd
          const slide = pres.addSlide();
          
          // Lewy panel - animacja jako MP4
          try {
            const mp4DataUrl = await generateMp4FromFrames(scheme.frames, gameFormat);
            slide.addMedia({
              type: 'video',
              data: mp4DataUrl,
              x: 0.3,
              y: 0.5,
              w: 3.2,
              h: 6.5
            });
          } catch (mp4Error) {
            console.warn('Błąd przy tworzeniu MP4, używam statycznych obrazów', mp4Error);

            // Fallback: użyj statycznych obrazów
            const imageDataUrl = getFrameImageDataUrl(scheme.frames[0], gameFormat);
            slide.addImage({
              data: imageDataUrl,
              x: 0.3,
              y: 0.5,
              w: 3.2,
              h: 6.5,
              border: { pt: 1, color: '999999' }
            });
          }
          
          // Prawy panel - tekst
          const rightX = 3.7;
          const rightWidth = 9.3;
          
          // Tytuł - Nazwa Schematu
          slide.addText(scheme.name, {
            x: rightX,
            y: 0.5,
            w: rightWidth,
            h: 0.6,
            fontSize: 28,
            bold: true,
            color: '1e40af'
          });
          
          // Informacja o fazie
          slide.addText(`Faza: ${phase}`, {
            x: rightX,
            y: 1.3,
            w: rightWidth,
            h: 0.4,
            fontSize: 14,
            color: '1f2937'
          });
          
          // Informacja o subfazie
          if (subPhase) {
            slide.addText(`Subfaza: ${subPhase}`, {
              x: rightX,
              y: 1.75,
              w: rightWidth,
              h: 0.4,
              fontSize: 14,
              color: '1f2937'
            });
          }
          
          // Informacja o klatkach
          slide.addText(`Liczba klatek: ${scheme.frames.length}`, {
            x: rightX,
            y: subPhase ? 2.2 : 1.75,
            w: rightWidth,
            h: 0.4,
            fontSize: 12,
            color: '6b7280'
          });
          
          // Komentarz/Zadania
          const commentY = subPhase ? 2.8 : 2.35;
          slide.addText('Komentarz:', {
            x: rightX,
            y: commentY,
            w: rightWidth,
            h: 0.35,
            fontSize: 12,
            bold: true,
            color: '374151'
          });
          
          // Usuń tagi HTML z komentarza
          const plainComments = scheme.comments
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
          
          slide.addText(plainComments || '(brak komentarza)', {
            x: rightX,
            y: commentY + 0.45,
            w: rightWidth,
            h: 3.8,
            fontSize: 11,
            color: '4b5563',
            valign: 'top',
            wrap: true
          });
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
      setSchemes(prev => ({
        ...prev,
        [newPhaseName.trim()]: []
      }));
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
      setSchemes(prev => ({
        ...prev,
        [`${phaseName}-${newSubPhaseName.trim()}`]: []
      }));
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
    
    const newScheme = {
      id: Date.now(),
      name: `Schemat ${schemes[gameFormat][key].length + 1}`,
      comments: '',
      frames: [JSON.parse(JSON.stringify(getInitialPlayers(gameFormat)))]
    };
    
    setSchemes({
      ...schemes,
      [gameFormat]: {
        ...schemes[gameFormat],
        [key]: [...schemes[gameFormat][key], newScheme]
      }
    });
    setCurrentScheme(newScheme);
    setCurrentFrame(0);
    setPlayers(newScheme.frames[0]);
  };

  const addFrame = () => {
    if (!currentScheme) return;
    
    const newFrame = JSON.parse(JSON.stringify(players));
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

  const drawPlayer = (ctx, player, isTeam) => {
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
    ctx.fillStyle = isTeam ? '#1a365d' : '#8b0000';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    
    // "Ręce" zawodnika - dwie linie po bokach pokazujące orientację
    ctx.strokeStyle = isTeam ? '#1a365d' : '#8b0000';
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
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawField(ctx);
    
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
  }, [players, isPlaying, currentFrame, currentScheme, interpolationProgress]);

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

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Przeskaluj współrzędne myszy do wewnętrznej rozdzielczości canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

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
        
        // Wybierz zawodnika I rozpocznij przeciąganie od razu
        setSelectedPlayer({
          type: playerType,
          id: player.id
        });
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
    if (isDragging && currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        frames: currentScheme.frames.map((f, i) => 
          i === currentFrame ? players : f
        )
      };
      updateCurrentScheme(updatedScheme);
    }
    if (isDraggingRotation && currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        frames: currentScheme.frames.map((f, i) => 
          i === currentFrame ? players : f
        )
      };
      updateCurrentScheme(updatedScheme);
    }
    setIsDragging(false);
    setDraggedPlayer(null);
    setIsDraggingRotation(false);
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
        setEditingPlayerNumber({
          player: player,
          type: playerType
        });
        setNewPlayerNumber(player.number);
        return;
      }
    }
  };

  const savePlayerNumber = () => {
    if (!editingPlayerNumber || !newPlayerNumber.trim()) {
      setEditingPlayerNumber(null);
      return;
    }

    const { player, type } = editingPlayerNumber;
    
    setPlayers(prev => ({
      ...prev,
      [type]: prev[type].map(p =>
        p.id === player.id ? { ...p, number: newPlayerNumber.trim() } : p
      )
    }));
    
    if (currentScheme) {
      const updatedScheme = {
        ...currentScheme,
        frames: currentScheme.frames.map((f, i) => 
          i === currentFrame ? {
            ...f,
            [type]: f[type].map(p =>
              p.id === player.id ? { ...p, number: newPlayerNumber.trim() } : p
            )
          } : f
        )
      };
      updateCurrentScheme(updatedScheme);
    }
    
    setEditingPlayerNumber(null);
    setNewPlayerNumber('');
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
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex overflow-hidden">
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
              className="cursor-move"
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

      {/* Modal edycji numeru zawodnika */}
      {editingPlayerNumber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingPlayerNumber(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700 min-w-[300px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Zmień numer zawodnika</h3>
            <input
              type="text"
              value={newPlayerNumber}
              onChange={(e) => setNewPlayerNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') savePlayerNumber();
                if (e.key === 'Escape') setEditingPlayerNumber(null);
              }}
              autoFocus
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-lg font-semibold text-center"
              placeholder="Wprowadź numer"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditingPlayerNumber(null)}
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
    </div>
  );
};

export default FootballTacticsApp;
