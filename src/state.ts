import { Key, Event, Note, CircleObj, State, Action, NoteObject, Constants, Viewport } from "./types";
export { initialState, Tick, RemoveCircle, UpdateCircleState, GameEnd, reduceState };

//////////////// STATE UPDATES //////////////////////

/**
 * Initial state of the game.
 * This is the starting point of the game's state, setting up default values for all properties.
 * - gameEnd: Boolean indicating if the game has ended (initially false).
 * - notes: An array that will hold all the notes in the game (initially empty).
 * - multiplier: A score multiplier (initially 0).
 * - score: The player's score (initially 0).
 * - time: The current time in the game, used to synchronize events (initially 0).
 * - circles: An array of CircleObj representing the active notes on the canvas (initially empty).
 * - exits: An array of CircleObj that have exited the playable area (initially empty).
 */
const initialState: State = {
    gameEnd: false,  // The game has not ended at the start
    notes: [],  // No notes have been processed yet
    score: 0,  // The score starts at 0
    time: 0,  // The game time starts at 0
    circles: [],  // No circles are active at the start
    exits: [],  // No circles have exited the screen at the start
} as const;

/**
 * Class to handle the Tick action, which updates the game state over time.
 * The Tick action typically represents the passage of a single frame or tick in the game loop.
 */
class Tick implements Action {
    /**
     * Applies the Tick action to the current state.
     * - Moves each circle downwards by a fixed amount.
     * - Removes circles that have exited the playable area.
     * - Increments the game time.
     * @param s State - The current game state.
     * @returns State - The updated game state after applying the Tick action.
     */
    apply(s: State): State {
        // Move each circle down by 5 units and filter out circles that exit the playable area
        const updatedCircles = s.circles
            .map(circle => ({
                ...circle,
                yPos: circle.yPos + 5,  // Increase y-position by 5 units to move the circle down
            }))
            .filter(circle => circle.yPos <= 350);  // Keep circles that are still within the playable area

        // Identify circles that have exited the playable area (yPos > 350)
        const newExits = s.circles.filter(circle => circle.yPos > 350);

        // Update the state with the new positions, any exited circles, and increment the game time
        return {
            ...s,
            circles: updatedCircles,
            exits: [...s.exits, ...newExits],  // Add newly exited circles to the exits array
            time: s.time + 1,  // Increment game time by 1
        };
    }
}

/**
 * Class to handle the action of removing a specific circle (note) from the game state.
 * This typically occurs when a circle has been successfully played or missed.
 */
class RemoveCircle implements Action {
    constructor(private note: NoteObject) {}

    /**
     * Applies the RemoveCircle action to the current state.
     * - Removes the circle associated with the provided note from the active circles.
     * @param s State - The current game state.
     * @returns State - The updated game state after removing the specified circle.
     */
    apply(s: State): State {
        return {
            ...s,
            circles: s.circles.filter(circle => circle.note !== this.note),  // Remove the circle corresponding to the note
        };
    }
}

/**
 * Class to handle updating the state with a new circle.
 * This occurs when a new note is introduced into the game.
 */
class UpdateCircleState implements Action {
    constructor(private readonly circle: CircleObj) {}

    /**
     * Applies the UpdateCircleState action to the current state.
     * - Adds a new circle to the list of active circles.
     * @param state State - The current game state.
     * @returns State - The updated game state with the new circle added.
     */
    apply(state: State): State {
        return {
            ...state,
            circles: [...state.circles, this.circle] as ReadonlyArray<CircleObj>,  // Add the new circle to the active circles array
        };
    }
}

/**
 * Class to handle the action of ending the game.
 * This will mark the game as over, preventing further updates or inputs.
 */
class GameEnd implements Action {
    /**
     * Applies the GameEnd action to the current state.
     * - Marks the game as ended.
     * @param s State - The current game state.
     * @returns State - The updated game state with the game marked as ended.
     */
    apply(s: State): State {
        return {
            ...s,
            gameEnd: true,  // Set gameEnd to true, marking the game as over
        };
    }
}

/**
 * Reducer function to apply a given action to the state.
 * This function takes the current state and an action, and returns the next state.
 * @param s State - The current game state.
 * @param action Action - The action to apply to the state.
 * @returns State - The updated game state after applying the action.
 */
const reduceState = (s: State, action: Action): State => action.apply(s);
