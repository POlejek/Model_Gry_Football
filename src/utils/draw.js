// Czyste funkcje rysowania canvas — nie zależą od stanu React

export const drawField = (ctx) => {
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

export const drawPlayer = (ctx, player, isTeam, playerColor = null) => {
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

export const drawPlayerPath = (ctx, fromPlayer, toPlayer, isTeam, progress) => {
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

export const interpolatePlayers = (from, to, progress) => {
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

export const drawBall = (ctx, ball) => {
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

export const drawZone = (ctx, zone, isSelected = false) => {
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

export const drawLine = (ctx, line, isSelected = false) => {
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

      case 'arrow-wavy':
        // Prosta falowana z grotem
        drawWavyStraight();
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

      case 'curve-arrow-wavy':
        // Linia krzywa falowana z grotem
        const cp4 = getControlPoint();
        const wavyCurveAngle = drawWavyCurve(cp4);
        drawArrowHead(line.endX, line.endY, wavyCurveAngle);

        if (isSelected) {
          ctx.fillStyle = '#00ff00';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cp4.x, cp4.y, 8, 0, Math.PI * 2);
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
