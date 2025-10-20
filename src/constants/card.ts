// Card dimension constants
export const CARD_WIDTH = 55;
export const CARD_HEIGHT = 84;

// Card drag behavior constants
export const CARD_OVERLAP = 60; // How much cards overlap in tableau
export const CARD_VISIBLE_GAP = CARD_HEIGHT - CARD_OVERLAP; // Visible gap between overlapped cards (24px)
export const DRAG_OFFSET_MIN = 10; // Minimum vertical raise when touching card
export const DRAG_OFFSET_MAX = 60; // Maximum vertical raise when touching card
export const DRAG_TARGET_DISTANCE = 60; // Target distance to keep card top above finger
export const WASTE_PILE_OFFSET = 52; // Vertical offset for waste pile cards
