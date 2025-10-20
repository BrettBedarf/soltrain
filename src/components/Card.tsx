import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { CardData } from '../types/card';

interface CardProps {
  card?: CardData;
  faceUp?: boolean;
  isEmpty?: boolean;
}

const getSuitSymbol = (suit: string): string => {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    default: return '';
  }
};

const getSuitColor = (suit: string): string => {
  return suit === 'hearts' || suit === 'diamonds' ? '#DC143C' : '#000000';
};

export const Card: React.FC<CardProps> = ({ card, faceUp = true, isEmpty = false }) => {
  if (isEmpty) {
    return <View style={[styles.card, styles.emptyCard]} />;
  }

  if (!faceUp || !card) {
    return (
      <View style={[styles.card, styles.faceDownCard]}>
        <View style={styles.cardInnerBorder}>
          <View style={styles.cardPattern} />
        </View>
      </View>
    );
  }

  const suitSymbol = getSuitSymbol(card.suit);
  const suitColor = getSuitColor(card.suit);

  return (
    <View style={[styles.card, styles.faceUpCard]}>
      <View style={styles.cardContent}>
        <Text style={[styles.rankText, { color: suitColor }]}>
          {card.rank}
        </Text>
        <Text style={[styles.suitText, { color: suitColor }]}>
          {suitSymbol}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 60,
    height: 84,
    borderRadius: 6,
    borderWidth: 1,
  },
  faceUpCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#333333',
  },
  faceDownCard: {
    backgroundColor: '#1E5A8E',
    borderColor: '#144A7A',
    borderWidth: 2,
  },
  emptyCard: {
    backgroundColor: 'transparent',
    borderColor: '#666666',
    borderStyle: 'dashed',
  },
  cardInnerBorder: {
    flex: 1,
    margin: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 3,
    padding: 4,
  },
  cardPattern: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 2,
  },
  cardContent: {
    flex: 1,
    padding: 4,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  suitText: {
    fontSize: 20,
    marginTop: 2,
  },
});