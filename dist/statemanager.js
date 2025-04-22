"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.getState = getState;
exports.dispatch = dispatch;
exports.loadStateFromLocalStorage = loadStateFromLocalStorage;
// State
var state = {
    isPlaying: false,
    bpm: 120,
    barMultiplier: 1,
    velocityRandomization: 0,
    noteDuration: 50, // This is the slider value (0-100)
    sequencers: [
        { id: 'sequencer1', divisions: 4, note: 'C3', sound: 'sine', volume: 70, pattern: new Array(4).fill(false) },
        { id: 'sequencer2', divisions: 3, note: 'E4', sound: 'sine', volume: 70, pattern: new Array(3).fill(false) },
        { id: 'sequencer3', divisions: 5, note: 'G5', sound: 'sine', volume: 70, pattern: new Array(5).fill(false), sequence: null },
    ],
    savedNotes: ['C3', 'E4', 'G5'], // To store notes when switching to noise
};
// Subscribers for state changes
var subscribers = {};
// Subscribe to state changes
function subscribe(event, callback) {
    if (!subscribers[event]) {
        subscribers[event] = [];
    }
    subscribers[event].push(callback);
}
// Unsubscribe from state changes (optional, but good practice)
function unsubscribe(event, callback) {
    if (subscribers[event]) {
        subscribers[event] = subscribers[event].filter(function (sub) { return sub !== callback; });
    }
}
// Publish state changes
function publish(event, data) {
    if (subscribers[event]) {
        subscribers[event].forEach(function (callback) {
            try {
                callback(data);
            }
            catch (error) {
                console.error("Error in subscriber for event ".concat(event, ":"), error);
            }
        });
    }
}
// Get current state
function getState() {
    return JSON.parse(JSON.stringify(state)); // Return a copy to prevent external modification
}
// Actions to modify state (centralized state update logic)
function dispatch(action) {
    var oldState = getState();
    var newState = __assign({}, state); // Create a shallow copy
    switch (action.type) {
        case 'SET_IS_PLAYING':
            newState.isPlaying = action.payload;
            publish('isPlayingChange', newState.isPlaying);
            break;
        case 'SET_BPM':
            newState.bpm = Math.max(60, Math.min(300, action.payload)); // Clamp BPM
            // Only publish if BPM actually changed after clamping
            if (newState.bpm !== state.bpm) {
                publish('bpmChange', newState.bpm);
            }
            break;
        case 'SET_BAR_MULTIPLIER':
            newState.barMultiplier = Math.max(1, action.payload);
            if (newState.barMultiplier !== state.barMultiplier) {
                publish('barMultiplierChange', newState.barMultiplier);
            }
            break;
        case 'SET_VELOCITY_RANDOMIZATION':
            newState.velocityRandomization = Math.max(0, Math.min(100, action.payload));
            publish('velocityRandomizationChange', newState.velocityRandomization);
            break;
        case 'SET_NOTE_DURATION':
            newState.noteDuration = Math.max(0, Math.min(100, action.payload));
            publish('noteDurationChange', newState.noteDuration);
            break;
        case 'TOGGLE_DOT': {
            var _a = action.payload, sequencerId_1 = _a.sequencerId, dotIndex = _a.dotIndex;
            var sequencerIndex = newState.sequencers.findIndex(function (seq) { return seq.id === sequencerId_1; });
            if (sequencerIndex !== -1) {
                var pattern = __spreadArray([], newState.sequencers[sequencerIndex].pattern, true);
                if (dotIndex >= 0 && dotIndex < pattern.length) {
                    pattern[dotIndex] = !pattern[dotIndex];
                    newState.sequencers[sequencerIndex].pattern = pattern;
                    publish('sequencerPatternChange', { sequencerIndex: sequencerIndex, pattern: pattern });
                }
                else {
                    console.warn("Invalid dot index ".concat(dotIndex, " for sequencer ").concat(sequencerId_1));
                }
            }
            else {
                console.warn("Sequencer with id ".concat(sequencerId_1, " not found."));
            }
            break;
        }
        case 'SET_SOUND': {
            var _b = action.payload, sequencerId_2 = _b.sequencerId, sound = _b.sound;
            var sequencerIndex = newState.sequencers.findIndex(function (seq) { return seq.id === sequencerId_2; });
            if (sequencerIndex !== -1) {
                newState.sequencers[sequencerIndex].sound = sound;
                publish('sequencerSoundChange', { sequencerIndex: sequencerIndex, sound: sound });
            }
            else {
                console.warn("Sequencer with id ".concat(sequencerId_2, " not found."));
            }
            break;
        }
        case 'SET_NOTE': {
            var _c = action.payload, sequencerId_3 = _c.sequencerId, note = _c.note;
            var sequencerIndex = newState.sequencers.findIndex(function (seq) { return seq.id === sequencerId_3; });
            if (sequencerIndex !== -1) {
                newState.sequencers[sequencerIndex].note = note;
                publish('sequencerNoteChange', { sequencerIndex: sequencerIndex, note: note });
            }
            else {
                console.warn("Sequencer with id ".concat(sequencerId_3, " not found."));
            }
            break;
        }
        case 'SET_DIVISIONS': {
            var _d = action.payload, sequencerId_4 = _d.sequencerId, divisions = _d.divisions;
            var sequencerIndex = newState.sequencers.findIndex(function (seq) { return seq.id === sequencerId_4; });
            if (sequencerIndex !== -1) {
                var newDivisions = Math.max(1, Math.min(16, divisions)); // Clamp divisions
                if (newDivisions !== newState.sequencers[sequencerIndex].divisions) {
                    // Adjust pattern size based on new divisions
                    var oldPattern = newState.sequencers[sequencerIndex].pattern;
                    var newPattern = oldPattern.slice(0, newDivisions);
                    while (newPattern.length < newDivisions) {
                        newPattern.push(false); // Add false for new divisions
                    }
                    newState.sequencers[sequencerIndex].divisions = newDivisions;
                    newState.sequencers[sequencerIndex].pattern = newPattern;
                    publish('sequencerDivisionsChange', { sequencerIndex: sequencerIndex, divisions: newDivisions, pattern: newPattern });
                }
            }
            else {
                console.warn("Sequencer with id ".concat(sequencerId_4, " not found."));
            }
            break;
        }
        case 'SET_VOLUME': {
            var _e = action.payload, sequencerId_5 = _e.sequencerId, volume = _e.volume;
            var sequencerIndex = newState.sequencers.findIndex(function (seq) { return seq.id === sequencerId_5; });
            if (sequencerIndex !== -1) {
                newState.sequencers[sequencerIndex].volume = Math.max(0, Math.min(100, volume)); // Clamp volume
                publish('sequencerVolumeChange', { sequencerIndex: sequencerIndex, volume: newState.sequencers[sequencerIndex].volume });
            }
            else {
                console.warn("Sequencer with id ".concat(sequencerId_5, " not found."));
            }
            break;
        }
        case 'SAVE_NOTE_FOR_SEQUENCER': {
            var _f = action.payload, sequencerIndex = _f.sequencerIndex, note = _f.note;
            if (sequencerIndex >= 0 && sequencerIndex < newState.savedNotes.length) {
                newState.savedNotes[sequencerIndex] = note;
            }
            else {
                console.warn("Invalid sequencer index ".concat(sequencerIndex, " for saving note."));
            }
            break;
        }
        case 'LOAD_STATE':
            // Load state and apply clamping for known values like BPM
            newState = __assign(__assign({}, state), action.payload); // Shallow merge
            // Ensure loaded BPM is within the valid range
            if (newState.bpm !== undefined) {
                newState.bpm = Math.max(60, Math.min(300, newState.bpm));
            }
            // Trigger relevant initial publishes for UI and AudioEngine to update
            // Note: These publishes will be handled by the modules after app.js initializes them.
            break;
        default:
            console.warn('Unknown action type:', action.type);
    }
    // Update state and publish a general state change
    state = newState;
    // Consider if a general state change event is useful: publish('stateChange', state);
    // Optional: Save state to localStorage after any change
    saveStateToLocalStorage();
}
// State persistence (using localStorage for simplicity)
function saveStateToLocalStorage() {
    try {
        localStorage.setItem('sequencerState', JSON.stringify(state));
    }
    catch (error) {
        console.error('Error saving state to localStorage:', error);
    }
}
function loadStateFromLocalStorage() {
    try {
        var savedState = localStorage.getItem('sequencerState');
        if (savedState) {
            var parsedState = JSON.parse(savedState);
            // Dispatch LOAD_STATE action to correctly apply loaded state.
            // Initial UI/Audio updates will happen when modules subscribe to state changes after app.js initialization.
            dispatch({ type: 'LOAD_STATE', payload: parsedState });
            console.log('State loaded from localStorage.');
        }
        else {
            console.log('No state found in localStorage. Using default state.');
            // No action needed here, the default state is already set.
            // Initial UI/Audio updates will happen when modules subscribe to state changes after app.js initialization.
        }
    }
    catch (error) {
        console.error('Error loading state from localStorage:', error);
        // If loading fails, no action needed, default state is already set.
        // Initial UI/Audio updates will happen when modules subscribe to state changes after app.js initialization.
    }
}
