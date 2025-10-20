import React, { useState, useRef } from 'react';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';
import { Card } from './Card';

interface DragState {
  columnIndex: number;
  cardIndex: number;
  x: number;
  y: number;
}

export const GameBoard: React.FC = () => {
  const [draggedCard, setDraggedCard] = useState<DragState | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;

  const createCardPanResponder = (columnIndex: number, cardIndex: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        setDraggedCard({
          columnIndex,
          cardIndex,
          x: pageX - 30, // Center the card on touch (card width is 60)
          y: pageY - 42, // Center the card on touch (card height is 84)
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({
          x: gestureState.dx,
          y: gestureState.dy,
        });
      },
      onPanResponderRelease: () => {
        setDraggedCard(null);
        pan.setValue({ x: 0, y: 0 });
      },
    });
  };

  // Render a column of cards for the tableau
  const renderTableauColumn = (numCards: number, columnIndex: number) => {
    return (
      <View key={columnIndex} style={styles.tableauColumn}>
        {Array.from({ length: numCards }).map((_, cardIndex) => {
          const isBeingDragged = 
            draggedCard?.columnIndex === columnIndex && 
            draggedCard?.cardIndex === cardIndex;
          const isLastCard = cardIndex === numCards - 1;
          const cardPanResponder = isLastCard ? createCardPanResponder(columnIndex, cardIndex) : null;
          
          return (
            <View
              key={cardIndex}
              style={[
                styles.tableauCard,
                isLastCard && styles.lastCard,
                isBeingDragged && styles.hiddenCard,
              ]}
              {...(cardPanResponder ? cardPanResponder.panHandlers : {})}
            >
              <Card faceUp={isLastCard} />
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
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={styles.pile}>
                <Card isEmpty />
              </View>
            ))}
          </View>
        </View>

        {/* Tableau: 7 columns */}
        <View style={styles.tableau}>
          {[1, 2, 3, 4, 5, 6, 7].map((numCards, index) =>
            renderTableauColumn(numCards, index)
          )}
        </View>
      </View>

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
          <Card faceUp={true} />
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
});