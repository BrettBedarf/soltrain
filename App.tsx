import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { GameBoard } from "./src/components/GameBoard";

export default function App() {
	return (
		<View style={styles.container}>
			<GameBoard />
			<StatusBar style="auto" />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0B6623",
	},
});
