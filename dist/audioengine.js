"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
exports.getAnalyzerNodes = getAnalyzerNodes;
var statemanager_js_1 = require("./statemanager.js");
var uicontroller_js_1 = require("./uicontroller.js"); // Import visualization functions
// Constants (should match constants in uicontroller and statemanager)
var COLOR_NOISES = ['white', 'pink', 'brown', 'violet', 'blue'];
var SOUND_TO_NOTE = {
    'white': 'C4',
    'pink': 'C4',
    'brown': 'C4',
    'violet': 'C4',
    'blue': 'C4'
};
// Audio Objects
var gainNodes = [];
var analyzerNodes = [];
var sequences = [];
var audioSources = {}; // Store instantiated synths/noises keyed by sequencer index
// --- Audio Engine Functions ---
// Initialize audio context and nodes
function init() {
    // Tone.js context will be started on first user interaction (e.g., play button click)
    // Create Gain Nodes and Analyzer Nodes for each sequencer
    var numberOfSequencers = (0, statemanager_js_1.getState)().sequencers.length;
    gainNodes = Array(numberOfSequencers).fill().map(function () { return new Tone.Gain().toDestination(); });
    analyzerNodes = Array(numberOfSequencers).fill().map(function () { return new Tone.Analyser('fft', 512); });
    // Connect analyzer nodes to their respective gain nodes
    analyzerNodes.forEach(function (analyzer, index) { return gainNodes[index].connect(analyzer); });
    // Set initial volumes and subscribe to volume changes
    (0, statemanager_js_1.getState)().sequencers.forEach(function (seq, index) {
        gainNodes[index].gain.value = seq.volume / 100;
    });
    (0, statemanager_js_1.subscribe)('sequencerVolumeChange', handleSequencerVolumeChange);
    // Subscribe to state changes that affect playback
    (0, statemanager_js_1.subscribe)('isPlayingChange', handleIsPlayingChange);
    (0, statemanager_js_1.subscribe)('bpmChange', handleBpmChange);
    (0, statemanager_js_1.subscribe)('barMultiplierChange', handleBarMultiplierChange);
    (0, statemanager_js_1.subscribe)('sequencerPatternChange', handleSequencerPatternChange);
    (0, statemanager_js_1.subscribe)('sequencerSoundChange', handleSequencerSoundChange);
    (0, statemanager_js_1.subscribe)('sequencerNoteChange', handleSequencerNoteChange);
    (0, statemanager_js_1.subscribe)('sequencerDivisionsChange', handleSequencerDivisionsChange);
    (0, statemanager_js_1.subscribe)('velocityRandomizationChange', handleGlobalPlaybackChange);
    (0, statemanager_js_1.subscribe)('noteDurationChange', handleGlobalPlaybackChange);
    // Initial setup of sequences based on the initial state
    setupSequences((0, statemanager_js_1.getState)());
    // Return analyzer nodes for visualization in the UI
    return analyzerNodes;
}
// Setup or re-setup Tone.js Sequences based on the current state
function setupSequences(state) {
    // Stop and clear existing sequences and sources
    // console.log('setupSequences called.'); // Removed log
    sequences.forEach(function (seq) {
        if (seq && seq.dispose) {
            seq.dispose();
        }
    });
    sequences = []; // Clear the sequences array
    disposeAudioSources(); // Dispose of audio sources
    var bpm = state.bpm, barMultiplier = state.barMultiplier;
    // Ensure positive BPM value for Tone.js Transport
    var adjustedBpm = Math.max(bpm / (1 + (barMultiplier - 1) * 0.5), 1); // Adjust BPM based on bar multiplier
    // Set new BPM with validation
    Tone.Transport.bpm.value = adjustedBpm;
    // console.log('setupSequences finished disposal and Transport BPM update.'); // Removed log
}
// --- State Change Handlers (react to state changes) ---
// Helper function to attempt starting Tone.Transport and sequences
function attemptStartTransportAndSequences() {
    return __awaiter(this, void 0, void 0, function () {
        var state, bpm, barMultiplier, sequencers, velocityRandomization, noteDuration, adjustedBpm;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(Tone.context.state === 'suspended')) return [3 /*break*/, 2];
                    // console.log("AudioContext is suspended, attempting to resume..."); // Removed log
                    return [4 /*yield*/, Tone.context.resume()];
                case 1:
                    // console.log("AudioContext is suspended, attempting to resume..."); // Removed log
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    if (Tone.context.state === 'running') {
                    }
                    else {
                    }
                    _a.label = 3;
                case 3:
                    // Dispose and clear existing sequences and sources (from previous setup or prior play)
                    sequences.forEach(function (seq) {
                        if (seq && seq.dispose) {
                            seq.dispose();
                        }
                    });
                    sequences = []; // Clear the sequences array
                    disposeAudioSources(); // Dispose of audio sources
                    state = (0, statemanager_js_1.getState)();
                    bpm = state.bpm, barMultiplier = state.barMultiplier, sequencers = state.sequencers, velocityRandomization = state.velocityRandomization, noteDuration = state.noteDuration;
                    adjustedBpm = Math.max(bpm / (1 + (barMultiplier - 1) * 0.5), 1);
                    // Create new sequences with the active context
                    sequences = sequencers.map(function (seq, index) {
                        var stepTime = Math.max(60 / (adjustedBpm * seq.divisions), 0.01);
                        var sequence = createSequence(seq, index, stepTime);
                        return sequence;
                    }).filter(function (seq) { return seq !== null; }); // Explicitly terminate the statement
                    // Start transport and sequences
                    // console.log('Tone.Transport state before start:', Tone.Transport.state); // Removed log
                    Tone.Transport.start();
                    // console.log('Tone.Transport state after start:', Tone.Transport.state); // Removed log
                    // console.log('Sequences array before starting:', sequences); // Removed log
                    sequences.forEach(function (sequence) {
                        // console.log('Attempting to start sequence:', sequence); // Removed log
                        if (sequence && sequence.start) {
                            // Start sequence at the beginning of the transport timeline
                            sequence.start(0);
                            // console.log(`Sequence started at transport time 0.`); // Removed log
                        }
                        else {
                            console.warn('Sequence is not valid or does not have a start method:', sequence);
                        }
                    });
                    (0, uicontroller_js_1.visualize)(); // Start visualization loop when transport starts
                    return [2 /*return*/];
            }
        });
    });
}
// Dispose of all audio sources (synths and noises)
function disposeAudioSources() {
    for (var index in audioSources) {
        if (audioSources[index] && audioSources[index].dispose) {
            audioSources[index].dispose();
        }
    }
    audioSources = {}; // Clear the stored sources
}
// --- State Change Handlers (react to state changes) ---
// Store the ID of the scheduled visualization event
var visualizationEventId = null;
function handleIsPlayingChange(isPlaying) {
    // console.log(`AudioEngine: handleIsPlayingChange called with: ${isPlaying}`); // Removed log
    if (isPlaying) {
        // Attempt to start Transport and sequences only if playing
        attemptStartTransportAndSequences();
        // Schedule the visualization update function from uicontroller
        // Import updateSequencerVisuals from uicontroller
        Promise.resolve().then(function () { return __importStar(require('./uicontroller.js')); }).then(function (_a) {
            var updateSequencerVisuals = _a.updateSequencerVisuals;
            // Schedule to repeat every 16th note
            visualizationEventId = Tone.Transport.scheduleRepeat(function (time) {
                updateSequencerVisuals(time);
            }, '16n'); // Update interval
        });
    }
    else {
        // console.log("AudioEngine: Stopping transport."); // Removed log
        Tone.Transport.stop();
        // console.log("AudioEngine: Cancelling transport events."); // Removed log
        Tone.Transport.cancel(); // Ensure scheduled events are cleared
        // Cancel the scheduled visualization event if it exists
        if (visualizationEventId !== null) {
            Tone.Transport.clear(visualizationEventId);
            visualizationEventId = null;
        }
        // The UI's resetDotColors will be handled by uicontroller based on the isPlaying state change
        // No need to dispose sequences here, they are recreated on play
    }
}
function handleBpmChange(newBpm) {
    // Update Tone.Transport.bpm directly. Sequences linked to the Transport should adjust.
    var currentState = (0, statemanager_js_1.getState)();
    var barMultiplier = currentState.barMultiplier;
    var adjustedBpm = Math.max(newBpm / (1 + (barMultiplier - 1) * 0.5), 1); // Ensure positive BPM value
    Tone.Transport.bpm.value = adjustedBpm;
    // Note: Individual sequence intervals in createSequence might also need to adapt
    // or sequences need to be re-created if intervals cannot update dynamically.
    // Further refinement may be needed here or in createSequence/related logic.
}
function handleBarMultiplierChange(newMultiplier) {
    var currentState = (0, statemanager_js_1.getState)();
    var bpm = currentState.bpm, sequencers = currentState.sequencers;
    var adjustedBpm = Math.max(bpm / (1 + (newMultiplier - 1) * 0.5), 1);
    // Update Tone.Transport BPM as it's affected by the bar multiplier
    Tone.Transport.bpm.value = adjustedBpm;
    // Update individual sequence intervals based on the new bar multiplier and divisions
    sequencers.forEach(function (seq, index) {
        if (sequences[index] && sequences[index].interval) {
            var stepTime = Math.max(60 / (adjustedBpm * seq.divisions), 0.01);
            var adjustedStepTime = Math.max(stepTime * (1 + (newMultiplier - 1) * 0.5), 0.01);
            sequences[index].interval = adjustedStepTime;
            // Recreate the events array based on the new bar multiplier
            var extendedPattern = Array(seq.divisions * newMultiplier)
                .fill(0)
                .map(function (_, i) { return seq.pattern[i % seq.divisions]; });
            // Tone.js Sequence's events property can be updated directly
            sequences[index].events = Array.from(Array(seq.divisions * newMultiplier).keys());
            // Note: The callback logic in createSequence relies on extendedPattern.
            // We might need a more sophisticated way to handle pattern updates with changing length.
            // For now, this updates the sequence length and interval.
        }
    });
}
function handleSequencerPatternChange(_a) {
    var sequencerIndex = _a.sequencerIndex, pattern = _a.pattern;
    // Pattern change requires re-setting up the specific sequence,
    // but we can reuse the audio source if the sound type hasn't changed.
    var currentState = (0, statemanager_js_1.getState)();
    // Update the pattern in the local state representation used by createSequence
    currentState.sequencers[sequencerIndex].pattern = pattern;
    var seqConfig = currentState.sequencers[sequencerIndex];
    // Dispose the old sequence for this index
    if (sequences[sequencerIndex] && sequences[sequencerIndex].dispose) {
        sequences[sequencerIndex].dispose();
    }
    // Recreate and store the new sequence. createSequence will reuse the audio source if possible.
    var adjustedBpm = Math.max(currentState.bpm / (1 + (currentState.barMultiplier - 1) * 0.5), 1);
    var stepTime = Math.max(60 / (adjustedBpm * seqConfig.divisions), 0.01);
    var newSequence = createSequence(seqConfig, sequencerIndex, stepTime);
    sequences[sequencerIndex] = newSequence;
    // If playing, start the new sequence immediately at transport time 0
    if (Tone.Transport.state === 'started' && newSequence && newSequence.start) {
        newSequence.start(0);
    }
}
function handleSequencerSoundChange(_a) {
    var sequencerIndex = _a.sequencerIndex, sound = _a.sound;
    var currentState = (0, statemanager_js_1.getState)();
    // Update the sound in the local state representation
    currentState.sequencers[sequencerIndex].sound = sound;
    var seqConfig = currentState.sequencers[sequencerIndex];
    // Dispose the old audio source for this index if it exists
    if (audioSources[sequencerIndex] && audioSources[sequencerIndex].dispose) {
        audioSources[sequencerIndex].dispose();
        delete audioSources[sequencerIndex]; // Remove from stored sources
    }
    // Create and store the new audio source
    var source;
    if (COLOR_NOISES.includes(sound)) {
        if (sound === 'violet') {
            source = new Tone.Noise('white');
            var highPass1 = new Tone.Filter({ type: 'highpass', frequency: 500, rolloff: -12 });
            var highPass2 = new Tone.Filter({ type: 'highpass', frequency: 1000, rolloff: -12 });
            var highShelf = new Tone.Filter({ type: 'highshelf', frequency: 2000, gain: 6 });
            source.chain(highPass1, highPass2, highShelf, gainNodes[sequencerIndex]);
        }
        else if (sound === 'blue') {
            source = new Tone.Noise('white');
            var blueFilter = new Tone.Filter({ type: 'highpass', frequency: 500, rolloff: -12 });
            source.chain(blueFilter, gainNodes[sequencerIndex]);
        }
        else {
            source = new Tone.Noise(sound).connect(gainNodes[sequencerIndex]);
        }
    }
    else {
        source = new Tone.Synth({
            oscillator: { type: sound }
        }).connect(gainNodes[sequencerIndex]);
    }
    audioSources[sequencerIndex] = source; // Store the new source
    // No need to recreate the sequence, it will use the updated audio source
    // via the audioSources[sequencerIndex] reference in its callback.
    // If Tone.Transport is started, the existing sequence will continue to play
    // using the new source on its next scheduled event.
}
function handleSequencerNoteChange(_a) {
    var sequencerIndex = _a.sequencerIndex, note = _a.note;
    // Note change is picked up directly by the sequence callback via getState(),
    // so no action is needed here for existing Synth sources.
    // If the sound type changes to something that doesn't use notes (e.g., noise),
    // handleSequencerSoundChange will handle the source replacement.
}
function handleSequencerDivisionsChange(_a) {
    var sequencerIndex = _a.sequencerIndex, divisions = _a.divisions, pattern = _a.pattern;
    // Divisions change requires re-setting up the specific sequence,
    // but we can reuse the audio source if the sound type hasn't changed.
    var currentState = (0, statemanager_js_1.getState)();
    // Update divisions and pattern in the local state representation
    currentState.sequencers[sequencerIndex].divisions = divisions;
    currentState.sequencers[sequencerIndex].pattern = pattern; // Pattern is also updated
    var seqConfig = currentState.sequencers[sequencerIndex];
    // Dispose the old sequence for this index
    if (sequences[sequencerIndex] && sequences[sequencerIndex].dispose) {
        sequences[sequencerIndex].dispose();
    }
    // Recreate and store the new sequence. createSequence will reuse the audio source if possible.
    var adjustedBpm = Math.max(currentState.bpm / (1 + (currentState.barMultiplier - 1) * 0.5), 1);
    var stepTime = Math.max(60 / (adjustedBpm * seqConfig.divisions), 0.01);
    var newSequence = createSequence(seqConfig, sequencerIndex, stepTime);
    sequences[sequencerIndex] = newSequence;
    // If playing, start the new sequence immediately at transport time 0
    if (Tone.Transport.state === 'started' && newSequence && newSequence.start) {
        newSequence.start(0);
    }
}
function handleSequencerVolumeChange(_a) {
    var sequencerIndex = _a.sequencerIndex, volume = _a.volume;
    if (gainNodes[sequencerIndex]) {
        gainNodes[sequencerIndex].gain.value = volume / 100;
    }
}
function handleGlobalPlaybackChange() {
    // Changes to velocity randomization or note duration are picked up directly
    // by the sequence callback via getState(), so no action is needed here.
}
// Function to create a single Tone.js Sequence for a sequencer
function createSequence(seq, index, stepTime) {
    try {
        // Get or create reusable audio source
        var source_1 = audioSources[index];
        if (!source_1 || (source_1.type && source_1.type !== seq.sound) || (source_1.noise && source_1.noise.type !== seq.sound)) {
            // This case should ideally be handled by handleSequencerSoundChange before createSequence is called,
            // but including fallback logic here for robustness.
            if (source_1 && source_1.dispose) {
                source_1.dispose();
            }
            if (COLOR_NOISES.includes(seq.sound)) {
                if (seq.sound === 'violet') {
                    source_1 = new Tone.Noise('white');
                    var highPass1 = new Tone.Filter({ type: 'highpass', frequency: 500, rolloff: -12 });
                    var highPass2 = new Tone.Filter({ type: 'highpass', frequency: 1000, rolloff: -12 });
                    var highShelf = new Tone.Filter({ type: 'highshelf', frequency: 2000, gain: 6 });
                    source_1.chain(highPass1, highPass2, highShelf, gainNodes[index]);
                }
                else if (seq.sound === 'blue') {
                    source_1 = new Tone.Noise('white');
                    var blueFilter = new Tone.Filter({ type: 'highpass', frequency: 500, rolloff: -12 });
                    source_1.chain(blueFilter, gainNodes[index]);
                }
                else {
                    source_1 = new Tone.Noise(seq.sound).connect(gainNodes[index]);
                }
            }
            else {
                source_1 = new Tone.Synth({
                    oscillator: { type: seq.sound }
                }).connect(gainNodes[index]);
            }
            audioSources[index] = source_1; // Store the new source
        }
        var currentState = (0, statemanager_js_1.getState)();
        var barMultiplier = currentState.barMultiplier, velocityRandomization_1 = currentState.velocityRandomization, noteDuration_1 = currentState.noteDuration;
        // Create an extended pattern array that repeats based on bar multiplier
        var extendedPattern_1 = Array(seq.divisions * barMultiplier)
            .fill(0)
            .map(function (_, i) { return seq.pattern[i % seq.divisions]; });
        // Ensure positive stepTime
        var adjustedStepTime_1 = Math.max(stepTime * (1 + (barMultiplier - 1) * 0.5), 0.01);
        return new Tone.Sequence(function (time, step) {
            // console.log(`Sequence Callback - Index: ${index}, Time: ${time}, Step: ${step}`); // Removed log
            // Ensure time is non-negative
            if (time < 0) {
                // console.log(`Sequence Callback - Negative time (${time}), returning.`); // Removed log
                return;
            }
            // Calculate the visual step (which dot to highlight) - Moved to separate UI logic
            var visualStep = step % seq.divisions;
            // updateDotColors(index, visualStep); // UI update - REMOVED
            if (extendedPattern_1[step]) {
                // console.log(`Sequence Callback - Step ${step} is active.`); // Removed log
                // Apply velocity randomization
                var baseVelocity = 0.7; // Base velocity (0-1)
                var randomizedVelocity = Math.max(0, Math.min(1, baseVelocity + (Math.random() * 2 - 1) * (velocityRandomization_1 / 100) * baseVelocity));
                var velocity = randomizedVelocity; // Tone.js velocity is 0-1
                // Apply note duration
                var durationFactor = 0.1 + (noteDuration_1 / 100) * 0.9;
                var duration = Math.max(adjustedStepTime_1 * durationFactor, 0.01); // Ensure positive duration
                try {
                    if (COLOR_NOISES.includes(seq.sound)) {
                        source_1.start(Math.max(time, Tone.now())).stop(Math.max(time + duration, Tone.now() + 0.01)); // Ensure time is at least Tone.now()
                    }
                    else {
                        source_1.triggerAttackRelease(seq.note, duration, Math.max(time, Tone.now()), velocity); // Ensure time is at least Tone.now()
                    }
                }
                catch (error) {
                    console.warn('Error playing sound:', error);
                }
            }
            else {
                // console.log(`Sequence Callback - Step ${step} is inactive.`); // Optional: Log inactive steps
            }
        }, Array.from(Array(seq.divisions * barMultiplier).keys()), adjustedStepTime_1); // Ensure the events array is correctly formatted
    }
    catch (error) {
        console.error('Error in createSequence:', error);
        return null;
    }
}
// Expose analyzer nodes
function getAnalyzerNodes() {
    return analyzerNodes;
}
