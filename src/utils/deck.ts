import type {
	CardData,
	GameState,
	Rank,
	Suit,
	TableauPile,
} from "../types/card";

const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const ranks: Rank[] = [
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

// Create a standard 52-card deck
export const createDeck = (): CardData[] => {
	const deck: CardData[] = [];

	for (const suit of suits) {
		for (const rank of ranks) {
			deck.push({
				suit,
				rank,
				id: `${suit}-${rank}`,
			});
		}
	}

	return deck;
};

// Fisher-Yates shuffle algorithm
export const shuffleDeck = (deck: CardData[]): CardData[] => {
	const shuffled = [...deck];

	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	return shuffled;
};

// Deal cards for a new solitaire game
export const dealCards = (): GameState => {
	const deck = shuffleDeck(createDeck());

	// Initialize tableau (7 piles with 1-7 cards each)
	const tableau: TableauPile[] = [];
	let deckIndex = 0;

	for (let i = 0; i < 7; i++) {
		const numCards = i + 1;
		const cards: CardData[] = [];

		for (let j = 0; j < numCards; j++) {
			cards.push(deck[deckIndex++]);
		}

		tableau.push({
			cards,
			faceUpCount: 1, // Only the last card is face-up initially
		});
	}

	// Remaining cards go to stock
	const stock = deck.slice(deckIndex);

	return {
		tableau,
		foundation: [[], [], [], []], // 4 empty foundation piles
		stock,
		waste: [],
	};
};
