import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, PanResponder, Animated, TouchableOpacity, Text } from 'react-native';
import { Card } from './Card';
import { GameState, CardData } from '../types/card';
import { dealCards } from '../utils/deck';
import { canPlaceOnTableau, canPlaceOnFoundation } from '../utils/validation';

interface DragState {
  source: 'tableau' | 'waste';
  columnIndex: number; // For tableau, the column index. For waste, this is -1
  cardIndex: number; // Index of the first card being dragged
  cards: CardData[]; // All cards being dragged (from cardIndex to end of pile)
  x: number;
  y: number;
}

interface DropZone {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'tableau' | 'foundation';
  index: number;
}

export const GameBoard: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => dealCards());
  const [draggedCard, setDraggedCard] = useState<DragState | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const dropZones = useRef<DropZone[]>([]);
  const foundationRefs = useRef<(View | null)[]>([null, null, null, null]);
  const tableauRefs = useRef<(View | null)[]>([null, null, null, null, null, null, null]);

  // Remeasure drop zones when game state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      // Measure all foundation piles
      foundationRefs.current.forEach((ref, index) => {
        if (ref) measureAndRegisterZone(ref, 'foundation', index);
      });
      
      // Measure all tableau columns
      tableauRefs.current.forEach((ref, index) => {
        if (ref) measureAndRegisterZone(ref, 'tableau', index);
      });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [gameState]);

  const handleRefresh = () => {
    setGameState(dealCards());
    setDraggedCard(null);
    pan.setValue({ x: 0, y: 0 });
  };

  const handleDrawCard = () => {
    const newGameState = { ...gameState };
    
    if (newGameState.stock.length > 0) {
      // Draw 1 card from stock to waste
      const card = newGameState.stock.pop()!;
      newGameState.waste.push(card);
    } else if (newGameState.waste.length > 0) {
      // Reset: move all waste cards back to stock
      newGameState.stock = [...newGameState.waste].reverse();
      newGameState.waste = [];
    }
    
    setGameState(newGameState);
  };

  const registerDropZone = (type: 'tableau' | 'foundation', index: number, x: number, y: number, width: number, height: number) => {
    const existingIndex = dropZones.current.findIndex(zone => zone.type === type && zone.index === index);
    const newZone: DropZone = { type, index, x, y, width, height };
    
    console.log('Registering drop zone:', newZone);
    
    if (existingIndex >= 0) {
      dropZones.current[existingIndex] = newZone;
    } else {
      dropZones.current.push(newZone);
    }
  };

  const measureAndRegisterZone = (ref: View | null, type: 'tableau' | 'foundation', index: number) => {
    if (ref) {
      ref.measureInWindow((x, y, width, height) => {
        registerDropZone(type, index, x, y, width, height);
      });
    }
  };

  const findDropZone = (x: number, y: number): DropZone | null => {
    // Check if the point (x, y) is within any drop zone
    for (const zone of dropZones.current) {
      if (x >= zone.x && x <= zone.x + zone.width &&
          y >= zone.y && y <= zone.y + zone.height) {
        return zone;
      }
    }
    return null;
  };

  const handleDrop = (dropZone: DropZone) => {
    if (!draggedCard) return;

    const newGameState = { ...gameState };
    let sourcePile: CardData[];
    let sourceFaceUpCount = 0;
    
    if (draggedCard.source === 'tableau') {
      sourcePile = newGameState.tableau[draggedCard.columnIndex].cards;
      sourceFaceUpCount = newGameState.tableau[draggedCard.columnIndex].faceUpCount;
    } else {
      // Source is waste
      sourcePile = newGameState.waste;
    }
    
    const numCards = sourcePile.length;
    const numCardsBeingMoved = draggedCard.cards.length;
    
    // Validate the drop
    let isValid = false;
    if (dropZone.type === 'tableau') {
      const targetPile = newGameState.tableau[dropZone.index];
      isValid = canPlaceOnTableau(draggedCard.cards, targetPile.cards);
    } else if (dropZone.type === 'foundation') {
      const targetPile = newGameState.foundation[dropZone.index];
      isValid = canPlaceOnFoundation(draggedCard.cards, targetPile);
      console.log('Foundation validation:', { 
        draggedCards: draggedCard.cards, 
        targetPile, 
        isValid 
      });
    }

    // If invalid, don't perform the move
    if (!isValid) {
      console.log('Drop rejected - invalid move');
      return;
    }
    
    // Remove cards from source
    if (draggedCard.source === 'tableau') {
      const tableauPile = newGameState.tableau[draggedCard.columnIndex];
      const isFaceUp = draggedCard.cardIndex >= numCards - tableauPile.faceUpCount;
      
      tableauPile.cards.splice(draggedCard.cardIndex, numCardsBeingMoved);
      
      // Adjust faceUpCount based on how many face-up cards were removed
      if (isFaceUp && tableauPile.faceUpCount > 0) {
        tableauPile.faceUpCount -= numCardsBeingMoved;
        if (tableauPile.faceUpCount < 0) {
          tableauPile.faceUpCount = 0;
        }
      }
      
      // If no face-up cards remain but there are still cards, flip the top card
      if (tableauPile.cards.length > 0 && tableauPile.faceUpCount === 0) {
        tableauPile.faceUpCount = 1;
      }
    } else {
      // Remove from waste (only the top card)
      newGameState.waste.pop();
    }

    // Add cards to destination
    if (dropZone.type === 'tableau') {
      newGameState.tableau[dropZone.index].cards.push(...draggedCard.cards);
      newGameState.tableau[dropZone.index].faceUpCount += numCardsBeingMoved;
    } else if (dropZone.type === 'foundation') {
      newGameState.foundation[dropZone.index].push(draggedCard.cards[0]);
    }

    setGameState(newGameState);
  };

  const createCardPanResponder = (columnIndex: number, cardIndex: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const pile = gameState.tableau[columnIndex];
        
        // Collect all cards from this index to the end
        const cardsToMove = pile.cards.slice(cardIndex);
        
        setDraggedCard({
          source: 'tableau',
          columnIndex,
          cardIndex,
          cards: cardsToMove,
          x: pageX - 30, // Center the card on touch (card width is 60)
          y: pageY - 120, // Position cards above the touch point for better visibility
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({
          x: gestureState.dx,
          y: gestureState.dy,
        });
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Calculate the final position of the dragged card (not the finger)
        const cardX = draggedCard ? draggedCard.x + gestureState.dx : 0;
        const cardY = draggedCard ? draggedCard.y + gestureState.dy : 0;
        
        // Check drop zones using the card's center position
        const cardCenterX = cardX + 30; // Half of card width (60/2)
        const cardCenterY = cardY + 42; // Half of card height (84/2)
        
        const dropZone = findDropZone(cardCenterX, cardCenterY);
        
        if (dropZone) {
          handleDrop(dropZone);
        }
        
        setDraggedCard(null);
        pan.setValue({ x: 0, y: 0 });
      },
    });
  };

  const createWastePanResponder = () => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        
        // Only grab the top card from waste
        if (gameState.waste.length === 0) return;
        const topCard = gameState.waste[gameState.waste.length - 1];
        
        setDraggedCard({
          source: 'waste',
          columnIndex: -1,
          cardIndex: 0,
          cards: [topCard],
          x: pageX - 30,
          y: pageY - 120,
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({
          x: gestureState.dx,
          y: gestureState.dy,
        });
      },
      onPanResponderRelease: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const dropZone = findDropZone(pageX, pageY);
        
        if (dropZone) {
          handleDrop(dropZone);
        }
        
        setDraggedCard(null);
        pan.setValue({ x: 0, y: 0 });
      },
    });
  };

  // Render a column of cards for the tableau
  const renderTableauColumn = (columnIndex: number) => {
    const pile = gameState.tableau[columnIndex];
    const numCards = pile.cards.length;

    return (
      <View 
        key={columnIndex} 
        ref={(ref) => {
          tableauRefs.current[columnIndex] = ref;
          if (ref) {
            setTimeout(() => measureAndRegisterZone(ref, 'tableau', columnIndex), 100);
          }
        }}
        style={styles.tableauColumn}
      >
        {pile.cards.map((card, cardIndex) => {
          const isBeingDragged = 
            draggedCard?.source === 'tableau' &&
            draggedCard?.columnIndex === columnIndex && 
            cardIndex >= draggedCard.cardIndex; // Hide this card and all below it
          const isLastCard = cardIndex === numCards - 1;
          const isFaceUp = cardIndex >= numCards - pile.faceUpCount;
          // Allow dragging any face-up card
          const cardPanResponder = isFaceUp ? createCardPanResponder(columnIndex, cardIndex) : null;
          
          return (
            <View
              key={card.id}
              style={[
                styles.tableauCard,
                isLastCard && styles.lastCard,
                isBeingDragged && styles.hiddenCard,
              ]}
              {...(cardPanResponder ? cardPanResponder.panHandlers : {})}
            >
              <Card card={card} faceUp={isFaceUp} />
            </View>
          );
        })}
        {numCards === 0 && <Card isEmpty />}
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, styles.contentContainer]}>
        {/* Top Row: Stock, Waste, and Foundation Piles */}
        <View style={styles.topRow}>
          {/* Stock and Waste Piles */}
          <View style={styles.leftSection}>
            {/* Stock Pile - Click to draw cards */}
            <TouchableOpacity style={styles.pile} onPress={handleDrawCard}>
              {gameState.stock.length > 0 ? (
                <Card faceUp={false} />
              ) : (
                <Card isEmpty />
              )}
            </TouchableOpacity>
            
            {/* Waste Pile - Drag from here */}
            <View 
              style={styles.pile}
              {...(gameState.waste.length > 0 ? createWastePanResponder().panHandlers : {})}
            >
              {gameState.waste.length > 0 ? (
                <View style={[
                  draggedCard?.source === 'waste' && styles.hiddenCard
                ]}>
                  <Card 
                    card={gameState.waste[gameState.waste.length - 1]} 
                    faceUp={true} 
                  />
                </View>
              ) : (
                <Card isEmpty />
              )}
            </View>
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Foundation Piles (4 piles) */}
          <View style={styles.foundationSection}>
            {Array.from({ length: 4 }).map((_, index) => {
              const foundationPile = gameState.foundation[index];
              const topCard = foundationPile.length > 0 ? foundationPile[foundationPile.length - 1] : null;
              
              return (
                <View 
                  key={index} 
                  ref={(ref) => {
                    foundationRefs.current[index] = ref;
                    if (ref) {
                      // Measure after a short delay to ensure layout is complete
                      setTimeout(() => measureAndRegisterZone(ref, 'foundation', index), 100);
                    }
                  }}
                  style={styles.foundationPile}
                >
                  <Card card={topCard ?? undefined} isEmpty={!topCard} faceUp={true} />
                </View>
              );
            })}
          </View>
        </View>

        {/* Tableau: 7 columns */}
        <View style={styles.tableau}>
          {[1, 2, 3, 4, 5, 6, 7].map((numCards, index) =>
            renderTableauColumn(index)
          )}
        </View>
      </View>

      {/* Refresh Button - Bottom Right */}
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Text style={styles.refreshText}>↻</Text>
      </TouchableOpacity>

      {/* Dragged Card Overlay */}
      {draggedCard && (
        <Animated.View
          style={[
            styles.draggedCard,
            {
              left: draggedCard.x,
              top: draggedCard.y,
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
              ],
            },
          ]}
          pointerEvents="none"
        >
          {draggedCard.cards.map((card, index) => (
            <View
              key={card.id}
              style={[
                styles.draggedCardItem,
                index > 0 && { marginTop: -60 }, // Overlap cards like in tableau
              ]}
            >
              <Card card={card} faceUp={true} />
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0B6623', // Classic green felt color
  },
  contentContainer: {
    padding: 16,
    paddingTop: 60, // Add top padding
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  leftSection: {
    flexDirection: 'row',
    gap: 12,
  },
  foundationSection: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 999,
  },
  refreshText: {
    fontSize: 32,
    color: '#0B6623',
    fontWeight: 'bold',
  },
  spacer: {
    flex: 1,
  },
  pile: {
    marginRight: 4,
    width: 60,
    height: 84,
  },
  foundationPile: {
    marginRight: 4,
    width: 70,
    height: 94,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableau: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  tableauColumn: {
    flex: 1,
    alignItems: 'center',
  },
  tableauCard: {
    marginBottom: -60, // Overlap cards to show cascade effect
  },
  lastCard: {
    marginBottom: 0, // Last card should not overlap
  },
  hiddenCard: {
    opacity: 0,
  },
  draggedCard: {
    position: 'absolute',
    zIndex: 1000,
  },
  draggedCardItem: {
    // Container for individual dragged cards
  },
});