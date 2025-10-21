import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	Animated,
	PanResponder,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import type { CardData, GameState } from "../types/card";
import { dealCards } from "../utils/deck";
import { canPlaceOnFoundation, canPlaceOnTableau } from "../utils/validation";
import { CARD_HEIGHT, CARD_WIDTH, Card } from "./Card";

// Game layout constants
const COLUMN_GAP = 4; // Gap between columns
// Card overlap as percentage of COLUMN WIDTH (cards are 100% of column width)
// Card height = (CARD_HEIGHT/CARD_WIDTH) * 100% = 146.15% of column width
const CARD_HEIGHT_PERCENT = (CARD_HEIGHT / CARD_WIDTH) * 100; // ~146.15%
const FACE_DOWN_OVERLAP = `${CARD_HEIGHT_PERCENT * 0.85}%`; // % of card height hidden
const FACE_UP_OVERLAP = `${CARD_HEIGHT_PERCENT * 0.7}%`; // % of card height hidden

const WASTE_PILE_OFFSET = CARD_HEIGHT * 0.55; // 55% of card height - vertical offset for waste pile cards

interface DragState {
	source: "tableau" | "waste";
	columnIndex: number; // For tableau, the column index. For waste, this is -1
	cardIndex: number; // Index of the first card being dragged
	cards: CardData[]; // All cards being dragged (from cardIndex to end of pile)
	x: number;
	y: number;
	width: number; // Width of the card being dragged
}

interface DropZone {
	x: number;
	y: number;
	width: number;
	height: number;
	type: "tableau" | "foundation";
	index: number;
}

export const GameBoard: React.FC = () => {
	const [gameState, setGameState] = useState<GameState>(() => dealCards());
	const [draggedCard, setDraggedCard] = useState<DragState | null>(null);
	const [isWinner, setIsWinner] = useState(false);
	const pan = useRef(new Animated.ValueXY()).current;
	const dropZones = useRef<DropZone[]>([]);
	const foundationRefs = useRef<(View | null)[]>([null, null, null, null]);
	const tableauRefs = useRef<(View | null)[]>([
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	]);
	const cardRefs = useRef<{ [key: string]: View | null }>({});

	// Remeasure drop zones when game state changes
	useEffect(() => {
		const timer = setTimeout(() => {
			// Measure all foundation piles
			foundationRefs.current.forEach((ref, index) => {
				if (ref) measureAndRegisterZone(ref, "foundation", index);
			});

			// Measure all tableau columns
			tableauRefs.current.forEach((ref, index) => {
				if (ref) measureAndRegisterZone(ref, "tableau", index);
			});
		}, 200);

		return () => clearTimeout(timer);
	}, [gameState]);

	// Check for win condition
	useEffect(() => {
		const totalFoundationCards = gameState.foundation.reduce(
			(sum, pile) => sum + pile.length,
			0,
		);

		// Win if all cards are in foundation
		if (totalFoundationCards === 52) {
			setIsWinner(true);
			return;
		}

		// Also win if all cards are face-up (game is trivially solvable)
		const allTableauFaceUp = gameState.tableau.every(
			(pile) =>
				pile.cards.length === 0 || pile.faceUpCount === pile.cards.length,
		);
		const stockAndWasteEmpty =
			gameState.stock.length === 0 && gameState.waste.length === 0;

		if (allTableauFaceUp && stockAndWasteEmpty) {
			setIsWinner(true);
			return;
		}
	}, [gameState]);

	const handleRefresh = () => {
		setGameState(dealCards());
		setDraggedCard(null);
		setIsWinner(false);
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

	const registerDropZone = (
		type: "tableau" | "foundation",
		index: number,
		x: number,
		y: number,
		width: number,
		height: number,
	) => {
		const existingIndex = dropZones.current.findIndex(
			(zone) => zone.type === type && zone.index === index,
		);
		const newZone: DropZone = { type, index, x, y, width, height };

		if (existingIndex >= 0) {
			dropZones.current[existingIndex] = newZone;
		} else {
			dropZones.current.push(newZone);
		}
	};

	const measureAndRegisterZone = (
		ref: View | null,
		type: "tableau" | "foundation",
		index: number,
	) => {
		if (ref) {
			ref.measureInWindow((x, y, width, height) => {
				registerDropZone(type, index, x, y, width, height);
			});
		}
	};

	const findDropZone = (x: number, y: number): DropZone | null => {
		// Check if the point (x, y) is within any drop zone
		for (const zone of dropZones.current) {
			if (
				x >= zone.x &&
				x <= zone.x + zone.width &&
				y >= zone.y &&
				y <= zone.y + zone.height
			) {
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

		if (draggedCard.source === "tableau") {
			sourcePile = newGameState.tableau[draggedCard.columnIndex].cards;
			sourceFaceUpCount =
				newGameState.tableau[draggedCard.columnIndex].faceUpCount;
		} else {
			// Source is waste
			sourcePile = newGameState.waste;
		}

		const numCards = sourcePile.length;
		const numCardsBeingMoved = draggedCard.cards.length;

		// Validate the drop
		let isValid = false;
		if (dropZone.type === "tableau") {
			const targetPile = newGameState.tableau[dropZone.index];
			isValid = canPlaceOnTableau(draggedCard.cards, targetPile.cards);
		} else if (dropZone.type === "foundation") {
			const targetPile = newGameState.foundation[dropZone.index];
			isValid = canPlaceOnFoundation(draggedCard.cards, targetPile);
		}

		// If invalid, don't perform the move
		if (!isValid) {
			return;
		}

		// Remove cards from source
		if (draggedCard.source === "tableau") {
			const tableauPile = newGameState.tableau[draggedCard.columnIndex];
			const isFaceUp =
				draggedCard.cardIndex >= numCards - tableauPile.faceUpCount;

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
		if (dropZone.type === "tableau") {
			newGameState.tableau[dropZone.index].cards.push(...draggedCard.cards);
			newGameState.tableau[dropZone.index].faceUpCount += numCardsBeingMoved;
		} else if (dropZone.type === "foundation") {
			newGameState.foundation[dropZone.index].push(draggedCard.cards[0]);
		}

		setGameState(newGameState);
	};

	const createCardPanResponder = (columnIndex: number, cardIndex: number) => {
		// TODO: refactor to use react-native-reanimated and react-native-gesture-handler so that dragging runs on UI thread without lag
		return PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onStartShouldSetPanResponderCapture: () => true,
			onMoveShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponderCapture: () => true,
			onPanResponderGrant: (evt, gestureState) => {
				const pile = gameState.tableau[columnIndex];
				const cardsToMove = pile.cards.slice(cardIndex);

				const { pageY: touchPageY } = evt.nativeEvent;

				// Get the specific card's position for accurate placement
				const cardKey = `${columnIndex}-${cardIndex}`;
				const cardRef = cardRefs.current[cardKey];

				if (cardRef) {
					// Use measure to get layout coordinates, then convert to window coordinates
					cardRef.measure(
						(x, y, cardWidth, cardHeight, cardPageX, cardPageY) => {
							// cardPageX and cardPageY are the actual screen coordinates of the card
							const cardX = cardPageX;
							const cardY = cardPageY;
							// Use the actual card position for X (no horizontal shift)
							const finalCardX = cardX;

							// Calculate vertical offset using absolute pixel values (finger size is stable)
							const dragOffsetMin = 10; // Minimum popup in pixels
							const dragOffsetMax = 60; // Maximum popup in pixels
							const dragTargetDistance = 60; // Target distance in pixels (original value)

							const fingerRelativeToCard = touchPageY - cardY;
							// Clamp finger position to be within card boundaries (0 to cardHeight)
							const clampedFingerPosition = Math.max(
								0,
								Math.min(cardHeight, fingerRelativeToCard),
							);
							const fingerPercentOnCard =
								(clampedFingerPosition / cardHeight) * 100;
							const verticalOffset = Math.max(
								-dragOffsetMax,
								Math.min(
									-dragOffsetMin,
									clampedFingerPosition - dragTargetDistance,
								),
							);

							const cardBottom = cardY + cardHeight;
							const finalCardY = cardY + verticalOffset;

							console.log(
								`[${Platform.OS}] Touch - cardHeight: ${cardHeight}, cardY: ${cardY}, cardBottom: ${cardBottom}`,
							);
							console.log(
								`[${Platform.OS}] touchPageY: ${touchPageY}, fingerRelativeToCard: ${fingerRelativeToCard}, clamped: ${clampedFingerPosition}, fingerPercent: ${fingerPercentOnCard.toFixed(1)}%`,
							);
							console.log(
								`[${Platform.OS}] verticalOffset: ${verticalOffset}, dragTargetDistance: ${dragTargetDistance}`,
							);
							console.log(
								`[${Platform.OS}] FINAL POSITION - initial cardY: ${cardY}, final cardY: ${finalCardY}`,
							);

							setDraggedCard({
								source: "tableau",
								columnIndex,
								cardIndex,
								cards: cardsToMove,
								x: finalCardX,
								y: finalCardY,
								width: cardWidth,
							});
						},
					);
				}
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
				const cardCenterX = cardX + CARD_WIDTH / 2;
				const cardCenterY = cardY + CARD_HEIGHT / 2;

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
			onPanResponderGrant: (evt, gestureState) => {
				if (gameState.waste.length === 0) return;
				const topCard = gameState.waste[gameState.waste.length - 1];

				// Use the finger position for waste pile since we don't have a ref to the specific card
				const { pageX, pageY } = evt.nativeEvent;

				setDraggedCard({
					source: "waste",
					columnIndex: -1,
					cardIndex: 0,
					cards: [topCard],
					x: pageX - CARD_WIDTH / 2,
					y: pageY - WASTE_PILE_OFFSET,
					width: CARD_WIDTH,
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
				const cardCenterX = cardX + CARD_WIDTH / 2;
				const cardCenterY = cardY + CARD_HEIGHT / 2;

				const dropZone = findDropZone(cardCenterX, cardCenterY);

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
						setTimeout(
							() => measureAndRegisterZone(ref, "tableau", columnIndex),
							100,
						);
					}
				}}
				style={styles.tableauColumn}
			>
				{pile.cards.map((card, cardIndex) => {
					const isBeingDragged =
						draggedCard?.source === "tableau" &&
						draggedCard?.columnIndex === columnIndex &&
						cardIndex >= draggedCard.cardIndex; // Hide this card and all below it
					const isLastCard = cardIndex === numCards - 1;
					const isFaceUp = cardIndex >= numCards - pile.faceUpCount;
					const isFirstFaceUpCard =
						isFaceUp && cardIndex === numCards - pile.faceUpCount;

					// Allow dragging any face-up card
					const cardPanResponder = isFaceUp
						? createCardPanResponder(columnIndex, cardIndex)
						: null;

					// First face-up card uses tight overlap to stack properly with face-down cards below
					const overlap =
						isFaceUp && !isFirstFaceUpCard
							? FACE_UP_OVERLAP
							: FACE_DOWN_OVERLAP;

					return (
						<View
							key={card.id}
							ref={(ref) => {
								const cardKey = `${columnIndex}-${cardIndex}`;
								cardRefs.current[cardKey] = ref;
							}}
							style={[
								cardIndex > 0 && { marginTop: `-${overlap}` },
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
					{/* Foundation Pile 1 */}
					{Array.from({ length: 4 }).map((_, index) => {
						const foundationPile = gameState.foundation[index];
						const topCard =
							foundationPile.length > 0
								? foundationPile[foundationPile.length - 1]
								: null;

						return (
							<View
								key={index}
								ref={(ref) => {
									foundationRefs.current[index] = ref;
									if (ref) {
										setTimeout(
											() => measureAndRegisterZone(ref, "foundation", index),
											100,
										);
									}
								}}
								style={styles.topRowColumn}
							>
								<Card
									card={topCard ?? undefined}
									isEmpty={!topCard}
									faceUp={true}
								/>
							</View>
						);
					})}

					{/* Empty column */}
					<View style={styles.topRowColumn} />

					{/* Waste Pile */}
					<View
						style={styles.topRowColumn}
						{...(gameState.waste.length > 0
							? createWastePanResponder().panHandlers
							: {})}
					>
						{gameState.waste.length > 0 ? (
							<View
								style={[draggedCard?.source === "waste" && styles.hiddenCard]}
							>
								<Card
									card={gameState.waste[gameState.waste.length - 1]}
									faceUp={true}
								/>
							</View>
						) : (
							<Card isEmpty />
						)}
					</View>

					{/* Stock Pile */}
					<TouchableOpacity
						style={styles.topRowColumn}
						onPress={handleDrawCard}
					>
						{gameState.stock.length > 0 ? (
							<Card faceUp={false} />
						) : (
							<Card isEmpty />
						)}
					</TouchableOpacity>
				</View>

				{/* Tableau: 7 columns */}
				<View style={styles.tableau}>
					{[1, 2, 3, 4, 5, 6, 7].map((numCards, index) =>
						renderTableauColumn(index),
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
							width: draggedCard.width,
							transform: [{ translateX: pan.x }, { translateY: pan.y }],
						},
					]}
					pointerEvents="none"
				>
					{draggedCard.cards.map((card, index) => (
						<View
							key={card.id}
							style={[
								styles.draggedCardItem,
								index > 0 && { marginTop: `-${FACE_UP_OVERLAP}` }, // Overlap cards like in tableau (dragged cards are always face-up)
							]}
						>
							<Card card={card} faceUp={true} />
						</View>
					))}
				</Animated.View>
			)}

			{/* Winner Banner */}
			{isWinner && (
				<View style={styles.winnerBanner}>
					<Text style={styles.winnerText}>WINNER!</Text>
				</View>
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
		backgroundColor: "#0B6623", // Classic green felt color
	},
	contentContainer: {
		padding: 8,
		paddingTop: 150, // Add top padding
	},
	topRow: {
		flexDirection: "row",
		gap: COLUMN_GAP,
		marginBottom: 32,
	},
	topRowColumn: {
		flex: 1,
		alignItems: "center",
	},
	refreshButton: {
		position: "absolute",
		bottom: 20,
		right: 20,
		backgroundColor: "#FFFFFF",
		borderRadius: 30,
		width: 60,
		height: 60,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
		zIndex: 999,
	},
	refreshText: {
		fontSize: 32,
		color: "#0B6623",
		fontWeight: "bold",
	},
	tableau: {
		flexDirection: "row",
		gap: COLUMN_GAP,
	},
	tableauColumn: {
		flex: 1,
		alignItems: "center",
	},
	hiddenCard: {
		opacity: 0,
	},
	draggedCard: {
		position: "absolute",
		zIndex: 1000,
	},
	draggedCardItem: {
		// Container for individual dragged cards
	},
	winnerBanner: {
		position: "absolute",
		bottom: 100,
		left: 0,
		right: 0,
		backgroundColor: "#FFD700",
		paddingVertical: 20,
		paddingHorizontal: 40,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 10,
		zIndex: 1001,
	},
	winnerText: {
		fontSize: 48,
		fontWeight: "bold",
		color: "#000000",
		textShadowColor: "rgba(255, 255, 255, 0.5)",
		textShadowOffset: { width: 2, height: 2 },
		textShadowRadius: 4,
	},
});
