import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import type { CardData } from "../types/card";

// Card dimension constants (these define the aspect ratio and reference size)
export const CARD_WIDTH = 65;
export const CARD_HEIGHT = 95;

interface CardProps {
	card?: CardData;
	faceUp?: boolean;
	isEmpty?: boolean;
}

const getSuitSymbol = (suit: string): string => {
	switch (suit) {
		case "hearts":
			return "♥";
		case "diamonds":
			return "♦";
		case "clubs":
			return "♣";
		case "spades":
			return "♠";
		default:
			return "";
	}
};

const getSuitColor = (suit: string): string => {
	return suit === "hearts" || suit === "diamonds" ? "#DC143C" : "#000000";
};

export const Card: React.FC<CardProps> = ({
	card,
	faceUp = true,
	isEmpty = false,
}) => {
	const [cardHeight, setCardHeight] = React.useState(CARD_HEIGHT);

	const handleLayout = (event: any) => {
		const { height, width } = event.nativeEvent.layout;
		if (height > 0) {
			setCardHeight(height);
		}
	};

	// Simple pre-calculated sizes based on card height
	const topSectionHeight = cardHeight * 0.25;
	const bottomSectionHeight = cardHeight * 0.75;

	// Platform-specific multipliers to compensate for font rendering differences
	const fontMultiplier = Platform.OS === "ios" ? 1.2 : 1.0;

	const cornerFontSize = cardHeight * 0.18 * fontMultiplier;
	const largeSuitSize = cardHeight * 0.5 * fontMultiplier;

	// console.log(`Card height: ${cardHeight}, Corner font: ${cornerFontSize}, Large suit: ${largeSuitSize}`);

	if (isEmpty) {
		return (
			<View style={[styles.card, styles.emptyCard]} onLayout={handleLayout} />
		);
	}

	if (!faceUp || !card) {
		return (
			<View style={[styles.card, styles.faceDownCard]} onLayout={handleLayout}>
				<View style={styles.cardInnerBorder}>
					<View style={styles.cardPattern} />
				</View>
			</View>
		);
	}

	const suitSymbol = getSuitSymbol(card.suit);
	const suitColor = getSuitColor(card.suit);

	return (
		<View style={[styles.card, styles.faceUpCard]} onLayout={handleLayout}>
			{/* Top section: rank + suit */}
			<View
				style={{
					height: topSectionHeight,
					flexDirection: "row",
					alignItems: "center",
					paddingLeft: 2,
					paddingTop: 2,
				}}
			>
				<Text
					style={{
						color: suitColor,
						fontSize: cornerFontSize,
						fontWeight: "bold",
						fontFamily: "System",
					}}
				>
					{card.rank}
				</Text>
				<Text
					style={{
						color: suitColor,
						fontSize: cornerFontSize,
						marginLeft: 2,
						fontFamily: "System",
					}}
				>
					{suitSymbol}
				</Text>
			</View>

			{/* Bottom section: large suit */}
			<View
				style={{
					height: bottomSectionHeight,
					justifyContent: "flex-end",
					alignItems: "center",
				}}
			>
				<Text
					style={{
						color: suitColor,
						fontSize: largeSuitSize,
						fontFamily: "System",
					}}
				>
					{suitSymbol}
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		width: "100%",
		aspectRatio: CARD_WIDTH / CARD_HEIGHT,
		borderRadius: 6,
		borderWidth: 1,
	},
	faceUpCard: {
		backgroundColor: "#FFFFFF",
		borderColor: "#333333",
	},
	faceDownCard: {
		backgroundColor: "#1E5A8E",
		borderColor: "#144A7A",
		borderWidth: 2,
	},
	emptyCard: {
		backgroundColor: "rgba(0, 0, 0, 0.15)",
		borderColor: "#999999",
		borderStyle: "dashed",
		borderWidth: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	cardInnerBorder: {
		flex: 1,
		margin: 4,
		borderWidth: 1.5,
		borderColor: "#FFFFFF",
		borderRadius: 3,
		padding: 4,
	},
	cardPattern: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#FFFFFF",
		borderRadius: 2,
	},
	cardContent: {
		flex: 1,
		padding: 1.5,
	},
	topSection: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-start",
		paddingLeft: 2,
		paddingTop: 2,
		gap: 2,
	},
	cornerRank: {
		fontWeight: "bold",
	},
	cornerSuit: {
		// Font size set dynamically
	},
	bottomSection: {
		flex: 1, // Fills remaining space
		justifyContent: "flex-end",
		alignItems: "flex-end",
		overflow: "hidden",
		width: "100%",
	},
	largeSuit: {
		textAlign: "right",
	},
});
