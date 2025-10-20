import React from 'react';
import { View, StyleSheet } from 'react-native';

interface CardProps {
  faceUp?: boolean;
  isEmpty?: boolean;
}

export const Card: React.FC<CardProps> = ({ faceUp = true, isEmpty = false }) => {
  if (isEmpty) {
    return <View style={[styles.card, styles.emptyCard]} />;
  }

  if (!faceUp) {
    return (
      <View style={[styles.card, styles.faceDownCard]}>
        <View style={styles.cardInnerBorder}>
          <View style={styles.cardPattern} />
        </View>
      </View>
    );
  }

  return <View style={[styles.card, styles.faceUpCard]} />;
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
});