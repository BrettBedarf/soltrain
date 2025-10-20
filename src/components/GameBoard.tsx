import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CardData, GameState } from '../types/card';
import { dealCards } from '../utils/deck';
import { Card } from './Card';

interface DragState {
  columnIndex: number;
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

  const handleRefresh = () => {
    setGameState(dealCards());
    setDraggedCard(null);
    pan.setValue({ x: 0, y: 0 });
  };

  const registerDropZone = (type: 'tableau' | 'foundation', index: number, x: number, y: number, width: number, height: number) => {
    const existingIndex = dropZones.current.findIndex(zone => zone.type === type && zone.index === index);
    const newZone: DropZone = { type, index, x, y, width, height };
    
    if (existingIndex >= 0) {
      dropZones.current[existingIndex] = newZone;
    } else {
      dropZones.current.push(newZone);
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
    const sourcePile = newGameState.tableau[draggedCard.columnIndex];
    const numCards = sourcePile.cards.length;
    const numCardsBeingMoved = draggedCard.cards.length;
    
    // Check if the card being moved is face-up
    const isFaceUp = draggedCard.cardIndex >= numCards - sourcePile.faceUpCount;
    
    // Remove cards from source (all cards from cardIndex to end)
    sourcePile.cards.splice(draggedCard.cardIndex, numCardsBeingMoved);
    
    // Adjust faceUpCount based on how many face-up cards were removed
    if (isFaceUp && sourcePile.faceUpCount > 0) {
      sourcePile.faceUpCount -= numCardsBeingMoved;
      // Ensure it doesn't go negative
      if (sourcePile.faceUpCount < 0) {
        sourcePile.faceUpCount = 0;
      }
    }
    
    // If no face-up cards remain but there are still cards, flip the top card
    if (sourcePile.cards.length > 0 && sourcePile.faceUpCount === 0) {
      sourcePile.faceUpCount = 1;
    }

    // Add cards to destination
    if (dropZone.type === 'tableau') {
      newGameState.tableau[dropZone.index].cards.push(...draggedCard.cards);
      newGameState.tableau[dropZone.index].faceUpCount += numCardsBeingMoved;
    } else if (dropZone.type === 'foundation') {
      // Foundation should only accept single cards (for now, we'll just take the first)
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
          columnIndex,
          cardIndex,
          cards: cardsToMove,
          x: pageX - 30, // Center the card on touch (card width is 60)
          y: pageY - 60, // Position cards above the touch point for better visibility
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
        style={styles.tableauColumn}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          event.target.measure((fx, fy, w, h, pageX, pageY) => {
            registerDropZone('tableau', columnIndex, pageX, pageY, w, h);
          });
        }}
      >
        {pile.cards.map((card, cardIndex) => {
          const isBeingDragged = 
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
            <View style={styles.pile}>
              <Card faceUp={false} />
            </View>
            <View style={styles.pile}>
              <Card isEmpty />
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
                  style={styles.pile}
                  onLayout={(event) => {
                    event.target.measure((fx, fy, w, h, pageX, pageY) => {
                      registerDropZone('foundation', index, pageX, pageY, w, h);
                    });
                  }}
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
