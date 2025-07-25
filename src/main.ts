/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import { fromEvent, interval, merge, from, delayWhen, timer, mergeMap, take} from "rxjs";
import { map, filter, scan } from "rxjs/operators";
import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import {Key, Event, Note, CircleObj, State, Action, NoteObject, Constants,Viewport} from "./types"
import {initialState,Tick, RemoveCircle, UpdateCircleState, reduceState, GameEnd} from "./state"
import {createSvgElement, CreateCircle,show, hide,csvToArray,createUserPlayNote$, createBackGroundNotes$, playSound, handleKeyPress, createTriggeredRngStream} from "./util"
/** Constants */

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State) => s;



/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
export function main(csvContents: string, samples: { [key: string]: Tone.Sampler }) {
    // Canvas elements
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
        HTMLElement;
    const preview = document.querySelector(
        "#svgPreview",
    ) as SVGGraphicsElement & HTMLElement;
    const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
        HTMLElement;
    const container = document.querySelector("#main") as HTMLElement;

    svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
    svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);

    // Text fields
    const multiplier = document.querySelector("#multiplierText") as HTMLElement;
    const scoreText = document.querySelector("#scoreText") as HTMLElement;
    const highScoreText = document.querySelector(
        "#highScoreText",
    ) as HTMLElement;

    /** User input */

    /** User input - Setting up an observable stream for keypress events */
    const key$ = fromEvent<KeyboardEvent>(document, "keypress");

    /** Filters the keypress observable for specific keys */
    const fromKey = (keyCode: Key) =>
        key$.pipe(filter(({ code }) => code === keyCode));

    /** 
     * Determines the rate of time steps.
     * tick$ emits a value at a regular interval defined by Constants.TICK_RATE_MS.
     */
    const tick$ = interval(Constants.TICK_RATE_MS);

    // Parse the CSV content into an array of NoteObjects
    const notesArray = csvToArray(csvContents);

    // Initialize the game state
    let currentState: State = {
        ...initialState,
        notes: notesArray as ReadonlyArray<NoteObject>, // Populate the notes from the CSV
    };

    // Create a new instance of CreateCircle for generating SVG circles
    const createCircle = new CreateCircle(svg.namespaceURI);
    
    // Observable stream for user-played notes, generating actions to update the game state
    const userPlayNote$ = createUserPlayNote$(notesArray, createCircle);
    
    // Observable stream for background notes (not user-played), generating actions to update the game state
    const notUserPlayNote$ = createBackGroundNotes$(notesArray, playSound, samples);
    
    // Random value generator for handling key presses
    const getRandomValue = createTriggeredRngStream(42);

    // Observable stream that listens for key presses and generates actions to update the game state
    const keyPress$ = merge(
        fromKey("KeyH"),
        fromKey("KeyJ"),
        fromKey("KeyK"),
        fromKey("KeyL")
    ).pipe(
        map(keyEvent => (state: State) => handleKeyPress(keyEvent.code as Key, state, svg, samples, getRandomValue))
    );

    /**
     * Renders the current state to the canvas.
     *
     * In MVC terms, this updates the View using the Model.
     *
     * @param s Current state
     */
    const render = (state: State) => {
        // Update the displayed score
        scoreText.textContent = String(state.score);

        // Render each circle on the canvas by setting its y-position
        state.circles.forEach(({ circle, yPos }) => {
            circle.setAttribute("cy", String(yPos));
            svg.appendChild(circle);
        });
    };
    
    // The main observable stream that merges all other streams and updates the game state
    const source$ = merge(
        tick$.pipe(map(() => (state: State) => new Tick().apply(state))), // Time-based state updates
        userPlayNote$, // Actions for user-played notes
        notUserPlayNote$, // Actions for background notes
        keyPress$ // Actions for key presses
    )
    .pipe(
        scan((state: State, action) => {
            const newState = action(state); // Apply the action to the state
            return newState;
        }, currentState)
    )
    .subscribe((state: State) => {
        render(state); // Render the updated state

        // Check if the game has ended
        if (state.gameEnd) {
            show(gameover); // Show the game over screen
            source$.unsubscribe(); // Stop further state updates
        } else {
            hide(gameover); // Hide the game over screen
        }
    });
}













// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    // Load in the instruments and then start your game!
    const samples = SampleLibrary.load({
        instruments: [
            "bass-electric",
            "violin",
            "piano",
            "trumpet",
            "saxophone",
            "trombone",
            "flute",
        ], // SampleLibrary.list,
        baseUrl: "samples/",
    });

    const startGame = (contents: string) => {
        document.body.addEventListener(
            "mousedown",
            function () {
                main(contents, samples);
            },
            { once: true },
        );
    };

    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

    Tone.ToneAudioBuffer.loaded().then(() => {
        for (const instrument in samples) {
            samples[instrument].toDestination();
            samples[instrument].release = 0.5;
        }

        fetch(`${baseUrl}/assets/${Constants.SONG_NAME}.csv`)
            .then((response) => response.text())
            .then((text) => startGame(text))
            .catch((error) =>
                console.error("Error fetching the CSV file:", error),
            );
        
    });
}
