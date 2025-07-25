// Export constants and types for use in other modules
export { Constants, Viewport, Note };
export type { Key, Event, NoteObject, CircleObj, State, Action };

//////////////////////// CONSTANTS ///////////////////////////

/**
 * Viewport settings for the canvas, defining its width and height.
 * These constants are used to size the game area.
 */
const Viewport = {
    CANVAS_WIDTH: 200,  // Width of the game canvas in pixels
    CANVAS_HEIGHT: 400, // Height of the game canvas in pixels
} as const;

/**
 * General constants used throughout the application.
 * - TICK_RATE_MS: The game's tick rate in milliseconds.
 * - SONG_NAME: The name of the song used in the game.
 * - StartCircleCount: The initial count of circles in the game.
 */
const Constants = {
    TICK_RATE_MS: 16,        // Game loop tick rate in milliseconds
    SONG_NAME: "RockinRobin", // Name of the song to be played
    StartCircleCount: 0,      // Initial circle count at the start of the game
} as const;

/**
 * Constants related to the visual representation of notes.
 * - RADIUS: The radius of the note circles, calculated based on the canvas width.
 * - TAIL_WIDTH: The width of the note's tail (if applicable).
 */
const Note = {
    RADIUS: 0.07 * Viewport.CANVAS_WIDTH, // Radius of the note circle
    TAIL_WIDTH: 10,                       // Width of the note tail
};

///////////////////////// TYPES /////////////////////////////

/** 
 * Represents the keys that can be pressed by the user.
 * These correspond to the keys used in the game to interact with the notes.
 */
type Key = "KeyH" | "KeyJ" | "KeyK" | "KeyL";

/** 
 * Represents the types of keyboard events the game listens for.
 * - "keydown": Triggered when a key is pressed down.
 * - "keyup": Triggered when a key is released.
 * - "keypress": Triggered when a key is pressed (deprecated in modern browsers).
 */
type Event = "keydown" | "keyup" | "keypress";

/** 
 * Represents the properties of a musical note object.
 * - user_played: Indicates whether the note was played by the user.
 * - instrument_name: The name of the instrument associated with the note.
 * - velocity: The velocity (intensity) of the note, ranging from 0 to 127.
 * - pitch: The pitch of the note, represented as a MIDI number.
 * - start: The start time of the note in seconds.
 * - end: The end time of the note in seconds.
 */
type NoteObject = Readonly<{
    user_played: boolean;
    instrument_name: string;
    velocity: number;
    pitch: number;
    start: number; 
    end: number;
}>;

/**
 * Represents a circle object that is displayed in the game.
 * - note: The NoteObject that this circle represents.
 * - circle: The actual SVG element that is displayed on the canvas.
 * - yPos: The current y-position of the circle on the canvas.
 */
type CircleObj = Readonly<{
    note: NoteObject;
    circle: SVGElement;
    yPos: number;
}>;

/**
 * Represents the entire state of the game at any point in time.
 * - gameEnd: Indicates whether the game has ended.
 * - notes: An array of all NoteObjects to be processed in the game.
 * - processedNotesCount: The number of notes that have been processed so far.
 * - multiplier: A score multiplier based on player performance.
 * - score: The current score of the player.
 * - time: The current time in the game, used to synchronize note playback.
 * - circles: An array of CircleObj currently active on the canvas.
 * - exits: An array of CircleObj that have exited the playable area.
 */
type State = Readonly<{
    gameEnd: boolean;
    notes: ReadonlyArray<NoteObject>;
    score: number;
    time: number;
    circles: ReadonlyArray<CircleObj>;
    exits: ReadonlyArray<CircleObj>;
}>;

/**
 * Represents an action that can be applied to the game state.
 * Implementing classes should define the `apply` method to modify the state.
 */
interface Action {
    apply(s: State): State;
}
