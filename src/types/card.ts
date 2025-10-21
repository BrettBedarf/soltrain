export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
	| "A"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| "10"
	| "J"
	| "Q"
	| "K";

export interface CardData {
	suit: Suit;
	rank: Rank;
	id: string; // Unique identifier for each card
}

export interface TableauPile {
	cards: CardData[];
	faceUpCount: number; // How many cards from the bottom are face-up
}

export interface GameState {
	tableau: TableauPile[]; // 7 piles
	foundation: CardData[][]; // 4 piles (one per suit)
	stock: CardData[]; // Face-down deck to draw from
	waste: CardData[]; // Face-up cards drawn from stock
}
