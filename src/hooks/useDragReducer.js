import { useReducer } from 'react';

const initialState = {
  // Zawodnicy
  isDragging: false,
  draggedPlayer: null,
  selectedPlayer: null,
  isDraggingRotation: false,
  // Linie
  isDraggingLine: false,
  isDraggingControlPoint: false,
  isDraggingLineEnd: null,     // 'start' | 'end' | null
  lineDragOffset: { x: 0, y: 0 },
  // Strefy
  isDraggingZone: false,
  zoneDragOffset: { x: 0, y: 0 },
  isDraggingPolygonVertex: false,
  draggedVertexIndex: null,
};

function dragReducer(state, action) {
  switch (action.type) {
    case 'START_PLAYER_DRAG':
      return { ...state, isDragging: true, draggedPlayer: action.player };
    case 'START_ROTATION_DRAG':
      return { ...state, isDraggingRotation: true };
    case 'SELECT_PLAYER':
      return { ...state, selectedPlayer: action.player };
    case 'DESELECT_PLAYER':
      return { ...state, selectedPlayer: null };

    case 'START_LINE_DRAG':
      return { ...state, isDraggingLine: true, lineDragOffset: action.offset };
    case 'START_LINE_END_DRAG':
      return { ...state, isDraggingLineEnd: action.end };
    case 'START_CONTROL_POINT_DRAG':
      return { ...state, isDraggingControlPoint: true };

    case 'START_ZONE_DRAG':
      return { ...state, isDraggingZone: true, zoneDragOffset: action.offset };
    case 'START_VERTEX_DRAG':
      return { ...state, isDraggingPolygonVertex: true, draggedVertexIndex: action.index };

    case 'STOP_ALL':
      return initialState;

    default:
      return state;
  }
}

export function useDragReducer() {
  const [drag, dispatch] = useReducer(dragReducer, initialState);
  return { drag, dispatch };
}

export { initialState as dragInitialState };
