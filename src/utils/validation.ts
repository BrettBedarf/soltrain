import type { CardData, Rank } from "../types/card";

const rankOrder: Rank[] = [
	"A",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"J",
	"Q",
	"K",
];

export const getRankValue = (rank: Rank): number => {
	return rankOrder.indexOf(rank) + 1;
};

export const isRed = (card: CardData): boolean => {
	return card.suit === "hearts" || card.suit === "diamonds";
};

export const isBlack = (card: CardData): boolean => {
	return card.suit === "clubs" || card.suit === "spades";
};

export const alternatesColor = (card1: CardData, card2: CardData): boolean => {
	return (isRed(card1) && isBlack(card2)) || (isBlack(card1) && isRed(card2));
};

// Validate if a card can be placed on a tableau pile
export const canPlaceOnTableau = (
	cardsToPlace: CardData[],
	targetPile: CardData[],
): boolean => {
	const cardToPlace = cardsToPlace[0]; // Only check the first card in the stack

	// If target pile is empty, only Kings can be placed
	if (targetPile.length === 0) {
		return cardToPlace.rank === "K";
	}

	const targetCard = targetPile[targetPile.length - 1]; // Top card of target pile

	// Card must be one rank lower
	const cardValue = getRankValue(cardToPlace.rank);
	const targetValue = getRankValue(targetCard.rank);
	const isOneLower = cardValue === targetValue - 1;

	// Colors must alternate
	const colorsAlternate = alternatesColor(cardToPlace, targetCard);

	return isOneLower && colorsAlternate;
};

// Validate if a card can be placed on a foundation pile
export const canPlaceOnFoundation = (
	cardsToPlace: CardData[],
	targetPile: CardData[],
): boolean => {
	// Foundation only accepts single cards
	if (cardsToPlace.length !== 1) {
		return false;
	}

	const cardToPlace = cardsToPlace[0];

	// If foundation is empty, only Aces can be placed
	if (targetPile.length === 0) {
		return cardToPlace.rank === "A";
	}

	const targetCard = targetPile[targetPile.length - 1];

	// Must be same suit
	if (cardToPlace.suit !== targetCard.suit) {
		return false;
	}

	// Must be one rank higher
	const cardValue = getRankValue(cardToPlace.rank);
	const targetValue = getRankValue(targetCard.rank);

	return cardValue === targetValue + 1;
};
