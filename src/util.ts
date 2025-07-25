import { fromEvent, interval, merge, timer, from, mergeMap, delayWhen, Observable } from "rxjs";
import { map, filter, scan } from "rxjs/operators";
import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import { Key, Event, Note, CircleObj, State, Action, NoteObject, Constants, Viewport } from "./types";
import { initialState, Tick, RemoveCircle, UpdateCircleState, reduceState } from "./state";
export { createSvgElement, CreateCircle, show, hide, csvToArray, createUserPlayNote$, createBackGroundNotes$, playSound, handleKeyPress, showKeys };

//////////////// CREATE CIRCLE //////////////////////

/**
 * Class responsible for creating and managing SVG circle elements
 * that represent musical notes.
 */
class CreateCircle {
    constructor(private svgNamespace: string | null) {}

    /**
     * Determines the color of the circle based on the note's pitch.
     * @param note NoteObject - The note to determine the color for.
     * @returns string - The color of the circle.
     */
    private determineColour(note: NoteObject): string {
        const colour = note.pitch % 4; // Calculate color index based on pitch modulo 4
        switch (colour) {
            case 0:
                return "green"; // Green for index 0
            case 1:
                return "red"; // Red for index 1
            case 2:
                return "blue"; // Blue for index 2
            case 3:
                return "yellow"; // Yellow for index 3
            default:
                return "error"; // Error case should not be reached
        }
    }

    /**
     * Determines the horizontal (cx) position of the circle based on the note's pitch.
     * @param note NoteObject - The note to determine the cx position for.
     * @returns string - The cx position of the circle.
     */
    private determineCxPosition(note: NoteObject): string {
        const colour = note.pitch % 4; // Calculate position index based on pitch modulo 4
        const position = ["20%", "40%", "60%", "80%"]; // Predefined positions
        return position[colour]; // Return position corresponding to the index
    }

    /**
     * Creates a CircleObj that includes the SVG circle element and note details.
     * @param note NoteObject - The note to create a CircleObj for.
     * @returns CircleObj - The created CircleObj.
     */
    createCircleObj(note: NoteObject): CircleObj {
        // Create the SVG circle element with the determined attributes
        const circle = createSvgElement(this.svgNamespace, 'circle', {
            r: `${Note.RADIUS}`, // Radius of the circle
            cx: this.determineCxPosition(note), // Set horizontal position (cx)
            cy: '0', // Start at the top of the SVG (cy = 0)
            style: `fill: ${this.determineColour(note)}`, // Fill color based on pitch
            class: 'shadow', // Apply a shadow class for styling
        }) as SVGElement;  // Ensure the returned type is SVGElement

        // Return the CircleObj with the correctly typed circle
        return {
            note: note, // Include the note data
            circle: circle, // Include the SVG circle element
            yPos: 0, // Initial y-position (cy) at 0
        };
    }
}

///////////////////// HELPER FUNCTION ////////////////////////////

/**
 * Displays an SVG element on the canvas by setting its visibility
 * to "visible" and bringing it to the foreground.
 * @param elem SVGGraphicsElement - The SVG element to display.
 */
const show = (elem: SVGGraphicsElement) => {
    elem.setAttribute("visibility", "visible"); // Set element visibility to visible
    elem.parentNode!.appendChild(elem); // Append the element to its parent to ensure it is in the foreground
};

/**
 * Hides an SVG element on the canvas by setting its visibility
 * to "hidden".
 * @param elem SVGGraphicsElement - The SVG element to hide.
 */
const hide = (elem: SVGGraphicsElement) =>
    elem.setAttribute("visibility", "hidden"); // Set element visibility to hidden

/**
 * Creates a new SVG element with specified attributes.
 * @param namespace string | null - The SVG namespace.
 * @param name string - The type of SVG element to create.
 * @param props Record<string, string> - A dictionary of properties to set on the SVG element.
 * @returns SVGElement - The created SVG element.
 */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
): SVGElement => {
    // Create the SVG element in the specified namespace
    const elem = document.createElementNS(namespace, name) as SVGElement;
    // Set each provided attribute on the SVG element
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem; // Return the created SVG element
};

/**
 * Converts a CSV string into an array of NoteObjects.
 * @param csv string - The CSV string to convert.
 * @returns NoteObject[] - An array of NoteObjects parsed from the CSV.
 */
function csvToArray(csv: string): NoteObject[] {
    return csv
        .trim() // Remove any leading or trailing whitespace
        .split('\n') // Split the CSV into lines
        .slice(1) // Skip the header line
        .map(line => {
            const [user_played, instrument_name, velocity, pitch, start, end] = line.split(',');

            // Convert the CSV fields into a NoteObject
            return {
                user_played: user_played.toLocaleLowerCase() === 'true', // Convert string to boolean
                instrument_name, // Instrument name as a string
                velocity: parseInt(velocity, 10), // Convert velocity to integer
                pitch: parseInt(pitch, 10), // Convert pitch to integer
                start: parseFloat(start), // Convert start time to float
                end: parseFloat(end), // Convert end time to float
                processed: false  // Initialize processed flag as false
            };
        });
}

/**
 * Creates an observable stream that emits state updates for user-played notes.
 * @param notes NoteObject[] - The array of notes.
 * @param createCircle CreateCircle - The circle creation utility.
 * @returns Observable - The observable stream of state updates.
 */
function createUserPlayNote$(
    notes: NoteObject[], 
    createCircle: CreateCircle
) {
    return from(notes).pipe(
        filter(note => note.user_played === true), // Filter to only process user-played notes
        delayWhen(note => timer(note.start * 1000)), // Delay based on the start time of the note (converted to milliseconds)
        map(note => {
            const circleObj = createCircle.createCircleObj(note); // Create a circle object for the note
            return (state: State) => new UpdateCircleState(circleObj).apply(state); // Return a function to update the circle state
        })
    );
}

/**
 * Plays a sound using Tone.js based on the note's properties.
 * @param note NoteObject - The note to play.
 * @param samples { [key: string]: Tone.Sampler } - A dictionary of instrument samples.
 */
function playSound(note: NoteObject, samples: { [key: string]: Tone.Sampler }) {
    const instrument = samples[note.instrument_name]; // Retrieve the instrument sample by name
    if (instrument) {
        // Trigger the sound for the note using Tone.js
        instrument.triggerAttackRelease(
            Tone.Frequency(note.pitch, "midi").toNote(), // Convert MIDI pitch to note name
            "8n", // Note duration (eighth note)
            Tone.now(), // Play the note immediately
            note.velocity / 127 // Normalize velocity to the range [0, 1]
        );
    }
}

/**
 * Creates an observable stream that plays background notes and updates the state.
 * @param notes NoteObject[] - The array of notes.
 * @param playSound function - Function to play a sound.
 * @param samples { [key: string]: Tone.Sampler } - A dictionary of instrument samples.
 * @returns Observable - The observable stream of state updates.
 */
function createBackGroundNotes$(
    notes: NoteObject[], 
    playSound: (note: NoteObject, samples: { [key: string]: Tone.Sampler }) => void,
    samples: { [key: string]: Tone.Sampler }
) {
    return from(notes).pipe(
        filter((note) => !note.user_played), // Only process notes not played by the user
        delayWhen((note) => timer(note.start * 1000)), // Delay the emission of each note based on its start time (converted to milliseconds)
        map((note) => {
            playSound(note, samples); // Play the note sound
            return (state: State) => state; // Return a no-op state update function
        })
    );
}

/**
 * Sets up key listeners to show visual feedback when specific keys (H, J, K, L) are pressed.
 */
function showKeys() {
    // Function to set up observable for showing and hiding key highlights
    function showKey(k: Key) {
        const arrowKey = document.getElementById(k); // Get the element corresponding to the key
        if (!arrowKey) return;
    
        const createObservable = (e: Event) =>
            fromEvent<KeyboardEvent>(document, e).pipe(
                filter(({ code }) => code === k) // Filter events to only those for the specified key
            );
    
        // Add highlight on key down
        createObservable("keydown").subscribe(() =>
            arrowKey.classList.add("highlight")
        );
        // Remove highlight on key up
        createObservable("keyup").subscribe(() =>
            arrowKey.classList.remove("highlight")
        );
    }
    // Set up key listeners for each of the specified keys
    showKey("KeyH");
    showKey("KeyJ");
    showKey("KeyK");
    showKey("KeyL");
}

/**
 * Maps key codes (H, J, K, L) to corresponding horizontal (cx) positions.
 * @param keyCode Key - The key code to map.
 * @returns string - The corresponding cx position.
 */
const keyToPositionMapping = (keyCode: Key): string => {
    switch (keyCode) {
        case "KeyH":
            return "20%"; // Map KeyH to 20% horizontal position
        case "KeyJ":
            return "40%"; // Map KeyJ to 40% horizontal position
        case "KeyK":
            return "60%"; // Map KeyK to 60% horizontal position
        case "KeyL":
            return "80%"; // Map KeyL to 80% horizontal position
        default:
            return ""; // Return empty string for unknown keys
    }
};

/**
 * Handles key press events for playing notes and updating the game state.
 * @param keyCode Key - The key code pressed.
 * @param state State - The current game state.
 * @param svg SVGGraphicsElement - The SVG canvas element.
 * @param samples { [key: string]: Tone.Sampler } - A dictionary of instrument samples.
 * @param getRandomValue () => number - Function that generates a random value.
 * @returns State - The updated game state.
 */
function handleKeyPress(
    keyCode: Key,
    state: State,
    svg: SVGGraphicsElement,
    samples: { [key: string]: Tone.Sampler },
    getRandomValue: () => number
): State {
    const targetCx = keyToPositionMapping(keyCode); // Determine the target position based on the key pressed

    // Find the first circle that matches the target position and is within the hit range (y-position)
    const hitCircle = state.circles.find(circle => {
        const circleCx = circle.circle.getAttribute("cx"); // Get the circle's cx position
        return circleCx === targetCx && circle.yPos >= 320 && circle.yPos <= 350; // Check if the circle is within the hit range
    });

    if (hitCircle) {
        // If a circle is hit, play the corresponding sound
        playSound(hitCircle.note, samples);

        // Remove the hit circle from the SVG and update the state
        svg.removeChild(hitCircle.circle);
        const updatedCircles = state.circles.filter(circle => circle !== hitCircle);

        // Update the score by adding points
        const newScore = state.score + 10; 

        // Return the updated state with the remaining circles and new score
        return {
            ...state,
            circles: updatedCircles,
            score: newScore,
        };
    } else {
        // If no circle is hit, play a random note
        const randomIndex = Math.floor((getRandomValue() + 1) / 2 * state.notes.length);
        const randomNote = state.notes[randomIndex];

        playSound(randomNote, samples);

        // Reduce the score slightly (e.g., a penalty for missing)
        const newScore = Math.max(0, state.score - 1);

        // Return the updated state with the adjusted score
        return {
            ...state,
            score: newScore,
        };
    }
}

//////////////// RANDOM NUMBER GENERATION //////////////////////////

/**
 * Abstract class providing linear congruential generator (LCG) utilities.
 */
abstract class RNG {
    // LCG constants (using GCC's parameters)
    private static m = 0x80000000; // 2**31
    private static a = 1103515245;
    private static c = 12345;

    /**
     * Call `hash` repeatedly to generate the sequence of hashes.
     * @param seed number - The seed value to hash.
     * @returns number - A hash of the seed.
     */
    public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;

    /**
     * Takes a hash value and scales it to the range [-1, 1].
     * @param hash number - The hash value to scale.
     * @returns number - A scaled value in the range [-1, 1].
     */
    public static scale = (hash: number) => (2 * hash) / (RNG.m - 1) - 1;
}

/**
 * Interface representing a lazy sequence of values.
 */
interface LazySequence<T> {
    value: T; // The current value of the sequence
    next(): LazySequence<T>; // Function to get the next value in the sequence
}

/**
 * Generates a lazy sequence of random numbers using the RNG class.
 * @param seed number - The seed value to start the sequence.
 * @returns LazySequence<number> - A lazy sequence of random numbers.
 */
function lazyRNG(seed: number): LazySequence<number> {
    const value = seed; // Set the current value as the seed
    const next = () => lazyRNG(RNG.hash(value)); // Define the next value based on the hashed seed

    return {
        value, // Return the current value
        next // Return the function to get the next value in the sequence
    };
}

/**
 * Creates a stream of random values based on a seed, which can be triggered
 * to get the next value in the sequence.
 * @param seed number - The seed value to start the stream.
 * @returns function - A function that returns the next random value in the stream.
 */
export function createTriggeredRngStream(seed: number) {
    let currentSequence = lazyRNG(seed); // Initialize the sequence with the given seed

    return function getRandomValue(): number {
        currentSequence = currentSequence.next(); // Move to the next value in the sequence
        return RNG.scale(currentSequence.value); // Scale the value to the range [-1, 1]
    };
}
