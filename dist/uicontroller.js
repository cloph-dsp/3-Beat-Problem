"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showNotification = showNotification;
exports.updateDotColors = updateDotColors;
exports.resetDotColors = resetDotColors;
exports.updateSequencerVisuals = updateSequencerVisuals;
exports.visualize = visualize;
exports.init = init;
var statemanager_js_1 = require("./statemanager.js");
var midiexport_js_1 = require("./midiexport.js");
// Constants
var NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
var OCTAVES = [3, 4, 5];
var SOUNDS = ['sine', 'triangle', 'sawtooth', 'square', 'white', 'pink', 'brown', 'violet', 'blue'];
var COLOR_NOISES = ['white', 'pink', 'brown', 'violet', 'blue'];
var SOUND_TO_NOTE = {
    'white': 'C4',
    'pink': 'C4',
    'brown': 'C4',
    'violet': 'C4',
    'blue': 'C4'
};
// DOM Elements (will be initialized in init function)
var playPauseButton = document.getElementById('playPause');
console.log('playPauseButton:', playPauseButton);
var bpmInput = document.getElementById('bpm');
console.log('bpmInput:', bpmInput);
var barMultiplierSelect = document.getElementById('barMultiplier');
console.log('barMultiplierSelect:', barMultiplierSelect);
var exportMidiButton = document.getElementById('exportMidi');
console.log('exportMidiButton:', exportMidiButton);
var velocityRandomizationSlider = document.getElementById('velocityRandomization');
console.log('velocityRandomizationSlider:', velocityRandomizationSlider);
var velocityRandomizationValueSpan = document.getElementById('velocityRandomizationValue');
console.log('velocityRandomizationValueSpan:', velocityRandomizationValueSpan);
var noteDurationSlider = document.getElementById('noteDuration');
console.log('noteDurationSlider:', noteDurationSlider);
var noteDurationValueSpan = document.getElementById('noteDurationValue');
console.log('noteDurationValueSpan:', noteDurationValueSpan);
var sequencerElements = ['sequencer1', 'sequencer2', 'sequencer3'].map(function (id) { return document.getElementById(id); });
console.log('sequencerElements:', sequencerElements);
var soundSelects = ['sound1', 'sound2', 'sound3'].map(function (id) { return document.getElementById(id); });
console.log('soundSelects:', soundSelects);
var noteSelects = ['note1', 'note2', 'note3'].map(function (id) { return document.getElementById(id); });
console.log('noteSelects:', noteSelects);
var divisionsInputs = ['divisions1', 'divisions2', 'divisions3'].map(function (id) { return document.getElementById(id); });
console.log('divisionsInputs:', divisionsInputs);
var volumeSliders = ['volume1', 'volume2', 'volume3'].map(function (id) { return document.getElementById(id); });
console.log('volumeSliders:', volumeSliders);
var spectrogramCanvases = ['spectrogram1', 'spectrogram2', 'spectrogram3'].map(function (id) { return document.getElementById(id); });
console.log('spectrogramCanvases:', spectrogramCanvases);
// Visualization related
var analyzerNodes = []; // Will be set by audioengine
// --- Helper Functions ---
// Show notification message
function showNotification(message, type) {
    var notification = document.createElement('div');
    notification.className = "notification ".concat(type);
    notification.textContent = message;
    document.body.appendChild(notification);
    // Show notification
    setTimeout(function () { return notification.classList.add('show'); }, 100);
    // Remove notification
    setTimeout(function () {
        notification.classList.remove('show');
        setTimeout(function () { return notification.remove(); }, 300);
    }, 3000);
}
// Populate note and sound select dropdowns
function populateNoteAndSoundSelects() {
    var musicalSequence = OCTAVES.flatMap(function (octave) { return NOTES.map(function (note) { return "".concat(note).concat(octave); }); });
    noteSelects.forEach(function (select) {
        select.innerHTML = musicalSequence.map(function (note) { return "<option value=\"".concat(note, "\">").concat(note, "</option>"); }).join('');
    });
    soundSelects.forEach(function (select) {
        soundSelects.innerHTML = SOUNDS.map(function (sound) { return "<option value=\"".concat(sound, "\">").concat(sound.charAt(0).toUpperCase() + sound.slice(1), "</option>"); }).join('');
    });
}
// Create dot elements for a sequencer circle
function createDots(sequencerId, divisions, pattern) {
    var circle = document.querySelector("#".concat(sequencerId, " .circle"));
    if (!circle) {
        console.error("Circle element not found for sequencer ".concat(sequencerId));
        return;
    }
    // Clear existing dots and orbiting circles, but preserve base elements
    var existingDots = circle.querySelectorAll('.dot');
    existingDots.forEach(function (dot) { return dot.remove(); });
    var existingOrbitingCircles = circle.querySelectorAll('.orbiting-circle');
    existingOrbitingCircles.forEach(function (oc) { return oc.remove(); });
    var _loop_1 = function (i) {
        var angle = (i / divisions) * 2 * Math.PI - Math.PI / 2;
        var radius = 40;
        var dot = document.createElement('div');
        dot.className = 'dot';
        dot.dataset.index = i;
        if (pattern[i]) {
            dot.classList.add('active');
        }
        dot.style.left = "".concat(50 + radius * Math.cos(angle), "%");
        dot.style.top = "".concat(50 + radius * Math.sin(angle), "%");
        // Add event listener directly to the dot element
        dot.addEventListener('click', function () {
            try {
                (0, statemanager_js_1.dispatch)({ type: 'TOGGLE_DOT', payload: { sequencerId: sequencerId, dotIndex: i } });
            }
            catch (error) {
                console.error('Error dispatching toggle dot action:', error);
            }
        });
        circle.appendChild(dot);
    };
    // Create and append dots
    for (var i = 0; i < divisions; i++) {
        _loop_1(i);
    }
    // Add orbiting circles after dots
    addOrbitingCircles(circle);
}
// Add orbiting circles for visual effect
function addOrbitingCircles(circle) {
    var orbitingCircleSizes = ['small', 'medium', 'large'];
    var radiusFactors = [1.2, 1.5, 1.8];
    var speedFactors = [8, 12, 15];
    var baseRadius = 40;
    // Remove existing orbiting circle styles
    document.head.querySelectorAll('style[data-orbit]').forEach(function (style) { return style.remove(); });
    orbitingCircleSizes.forEach(function (size, index) {
        var orbitingCircle = document.createElement('div');
        orbitingCircle.className = "orbiting-circle orbiting-circle-".concat(size);
        var startAngle = Math.random() * Math.PI * 2;
        var orbitRadius = baseRadius * radiusFactors[index];
        // Update the animation to use translate(-50%, -50%) to center the circle
        var keyframes = "\n        @keyframes orbit".concat(index + 1, " {\n          from {\n            transform: translate(-50%, -50%) rotate(").concat(startAngle, "rad) translateX(").concat(orbitRadius, "px) rotate(-").concat(startAngle, "rad);\n          }\n          to {\n            transform: translate(-50%, -50%) rotate(").concat(startAngle + 2 * Math.PI, "rad) translateX(").concat(orbitRadius, "px) rotate(-").concat(startAngle + 2 * Math.PI, "rad);\n          }\n        }\n      ");
        orbitingCircle.style.cssText = "\n        width: ".concat(8 - index, "px;\n        height: ").concat(8 - index, "px;\n        animation: orbit").concat(index + 1, " ").concat(speedFactors[index], "s linear infinite;\n      ");
        // Add the new keyframes
        var styleSheet = document.createElement('style');
        styleSheet.setAttribute('data-orbit', index + 1);
        styleSheet.textContent = keyframes;
        document.head.appendChild(styleSheet);
        circle.appendChild(orbitingCircle);
    });
}
// Update dot colors based on current step
function updateDotColors(sequencerIndex, currentStep) {
    var sequencerId = "sequencer".concat(sequencerIndex + 1);
    var dots = document.querySelectorAll("#".concat(sequencerId, " .dot"));
    dots.forEach(function (dot, index) {
        if (index === currentStep) {
            dot.style.backgroundColor = dot.classList.contains('active') ?
                'var(--primary-color)' :
                'var(--secondary-color)';
            dot.style.boxShadow = '0 0 15px var(--primary-color)';
        }
        else {
            dot.style.backgroundColor = dot.classList.contains('active') ?
                'var(--primary-color)' :
                'var(--secondary-color)';
            dot.style.boxShadow = 'none';
        }
    });
}
// Reset all dot colors to their default state
function resetDotColors() {
    document.querySelectorAll('.dot').forEach(function (dot) {
        dot.style.backgroundColor = dot.classList.contains('active') ?
            'var(--primary-color)' :
            'var(--secondary-color)';
        dot.style.boxShadow = 'none';
    });
}
// Update sequencer dot colors based on Transport time
function updateSequencerVisuals(transportTime) {
    var state = (0, statemanager_js_1.getState)(); // Get current state
    state.sequencers.forEach(function (seq, index) {
        var bpm = state.bpm, barMultiplier = state.barMultiplier;
        var divisions = seq.divisions;
        // Calculate the duration of a single step in the extended pattern based on the original BPM and divisions.
        // Assuming a 4/4 time signature, a bar has 4 beats.
        // Total duration of one original pattern repetition (seq.divisions steps) = (60 / BPM) seconds/beat * (seq.divisions / divisions per beat, assuming divisions are divisions per beat)
        // Let's assume divisions are subdivisions of a beat (e.g., 8 for 8th notes if BPM is quarter note).
        // Duration of one beat = 60 / BPM
        // Duration of one division = (60 / BPM) / divisions
        // This seems to be the simplest approach that aligns with musical timing.
        var beatDuration = 60 / bpm;
        var divisionDuration = beatDuration / divisions;
        // The extended pattern has `divisions * barMultiplier` steps.
        // The Tone.Sequence in audioengine is likely scheduled with an interval corresponding to `divisionDuration`.
        // We need to calculate the current step index within the *extended* pattern.
        // Get the current time within the Transport's loop.
        var loopEnd = Tone.Transport.loopEnd;
        var currentLoopTime = transportTime;
        if (loopEnd > 0) {
            currentLoopTime = transportTime % loopEnd;
        }
        // Calculate the current step based on the time and the original division duration.
        // This assumes each step in the extended pattern still corresponds to an original division's time slot.
        var currentStep = Math.floor(currentLoopTime / divisionDuration);
        // The visual step should loop within the *original* number of divisions for display on the circle.
        var visualStep = currentStep % divisions;
        // Call the existing updateDotColors function
        updateDotColors(index, visualStep);
    });
}
// Helper function to convert hex color to rgba
function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string')
        return "rgba(0,0,0,".concat(alpha, ")"); // Default fallback
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return "rgba(".concat(r, ", ").concat(g, ", ").concat(b, ", ").concat(alpha, ")");
}
// Visualization using AnalyzerNode
function visualize() {
    console.log('visualize function called.');
    // Check if AudioContext is running before proceeding
    if (Tone.context.state === 'suspended' || Tone.context.state === 'closed') {
        console.log('visualize - AudioContext not running, stopping loop.');
        return;
    }
    // Always schedule the next frame if the context is running
    requestAnimationFrame(visualize);
    var isPlaying = (0, statemanager_js_1.getState)().isPlaying;
    console.log('visualize - isPlaying:', isPlaying);
    // Only perform drawing if playback is active
    if (isPlaying) {
        console.log('visualize - isPlaying is true, drawing.');
        console.log('visualize - analyzerNodes:', analyzerNodes);
        if (!analyzerNodes || analyzerNodes.length === 0) {
            console.log('visualize - analyzerNodes is empty or null, stopping drawing for this frame.');
        }
        else {
            // Get computed styles once per frame
            var computedStyle = getComputedStyle(document.body);
            var primaryColor = computedStyle.getPropertyValue('--primary-color').trim();
            var secondaryColor = computedStyle.getPropertyValue('--secondary-color').trim();
            analyzerNodes.forEach(function (analyzer, index) {
                console.log("visualize - Processing analyzer index ".concat(index, ". Analyzer:"), analyzer);
                if (!analyzer || typeof analyzer.getValue !== 'function') {
                    console.log("visualize - Analyzer at index ".concat(index, " is invalid, skipping."));
                    return;
                }
                var spectrogramCanvas = spectrogramCanvases[index];
                if (!spectrogramCanvas) {
                    return;
                }
                var spectrogramCtx = spectrogramCanvas.getContext('2d');
                if (!spectrogramCtx) {
                    return;
                }
                var bufferLength = analyzer.size;
                var dataArray;
                try {
                    dataArray = analyzer.getValue();
                    console.log("visualize - Analyzer ".concat(index, " getValue() result:"), dataArray);
                }
                catch (error) {
                    console.error("Visualize: Error getting analyzer value for index ".concat(index, ":"), error);
                    return;
                }
                var canvasWidth = spectrogramCanvas.width;
                var canvasHeight = spectrogramCanvas.height;
                // 1. Save the current canvas state
                spectrogramCtx.save();
                // 2. Apply circular clip path
                spectrogramCtx.beginPath();
                spectrogramCtx.arc(canvasWidth / 2, canvasHeight / 2, Math.min(canvasWidth, canvasHeight) / 2 - 10, // Adjusted radius
                0, Math.PI * 2);
                spectrogramCtx.clip();
                // 3. Draw the existing canvas content shifted one pixel to the left
                spectrogramCtx.drawImage(spectrogramCanvas, -1, 0);
                // 4. Clear the rightmost column
                spectrogramCtx.clearRect(canvasWidth - 1, 0, 1, canvasHeight);
                // 5. Implement Colormap and draw the new column
                var colormap = function (amplitude) {
                    // Map amplitude (-140 to 0) to a color (example using HSL)
                    var hue = 240; // Blue
                    var saturation = 100;
                    var lightness = Math.max(0, Math.min(100, ((amplitude + 140) / 140) * 100)); // Map -140-0 to 0-100
                    return "hsl(".concat(hue, ", ").concat(saturation, "%, ").concat(lightness, "%)");
                };
                var barWidth = 1; // Width of the vertical slice
                var x = canvasWidth - barWidth; // X position of the new slice
                for (var i = 0; i < bufferLength; i++) {
                    var value = dataArray[i];
                    if (!Number.isFinite(value) || value === null) {
                        value = -140;
                    }
                    value = Math.max(-140, Math.min(0, value));
                    var barHeight = ((value + 140) / 140) * canvasHeight * 0.8;
                    var y = canvasHeight - barHeight;
                    spectrogramCtx.fillStyle = colormap(value);
                    spectrogramCtx.fillRect(x, y, barWidth, barHeight);
                    // 6. Restore the canvas state
                    spectrogramCtx.restore();
                }
            });
        }
    }
    else {
        console.log('visualize - isPlaying is false, not drawing.');
        // Optionally clear canvas or reset state here if needed when stopping
    }
}
// --- Event Handlers ---
function handlePlayPauseClick() {
    // Always attempt to start/resume the AudioContext on a user gesture
    Tone.start().then(function () {
        console.log('AudioContext started/resumed. State:', Tone.context.state);
        console.log('Tone.Transport state after Tone.start():', Tone.Transport.state);
        // Audio context is now running (or was already running), proceed with dispatching the action
        (0, statemanager_js_1.dispatch)({ type: 'SET_IS_PLAYING', payload: !(0, statemanager_js_1.getState)().isPlaying });
    }).catch(function (error) {
        console.error("Error starting Tone.js AudioContext:", error);
        // Handle potential errors during context start (e.g., user denied audio)
    });
}
function handleBpmInput(event) {
    var value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    var numValue = parseInt(value);
    // Validate and clamp BPM
    if (isNaN(numValue) || numValue < 60 || numValue > 300) {
        bpmInput.classList.add('invalid');
        playPauseButton.disabled = true;
    }
    else {
        bpmInput.classList.remove('invalid');
        playPauseButton.disabled = false;
        (0, statemanager_js_1.dispatch)({ type: 'SET_BPM', payload: numValue });
    }
    // Update input value to clamped value with padding
    // This prevents the user from entering invalid numbers visually
    bpmInput.value = numValue >= 60 && numValue <= 300 ? numValue.toString().padStart(3, '0') : value.padStart(3, '0');
}
function handleBarMultiplierChange(event) {
    (0, statemanager_js_1.dispatch)({ type: 'SET_BAR_MULTIPLIER', payload: parseInt(event.target.value) });
}
function handleExportMidiClick() {
    var result = (0, midiexport_js_1.exportMidi)((0, statemanager_js_1.getState)());
    showNotification(result.message, result.success ? 'success' : 'error');
}
function handleVelocityRandomizationInput(event) {
    (0, statemanager_js_1.dispatch)({ type: 'SET_VELOCITY_RANDOMIZATION', payload: parseInt(event.target.value) });
}
function handleNoteDurationInput(event) {
    (0, statemanager_js_1.dispatch)({ type: 'SET_NOTE_DURATION', payload: parseInt(event.target.value) });
}
function handleSoundChange(event) {
    var selectElement = event.target;
    var sequencerId = selectElement.id.replace('sound', 'sequencer');
    var sound = selectElement.value;
    var sequencerIndex = parseInt(sequencerId.slice(-1)) - 1;
    var noteSelect = document.getElementById("note".concat(sequencerIndex + 1));
    var isNoise = COLOR_NOISES.includes(sound);
    if (isNoise) {
        // Save current note before disabling and changing
        var currentState = (0, statemanager_js_1.getState)();
        (0, statemanager_js_1.dispatch)({ type: 'SAVE_NOTE_FOR_SEQUENCER', payload: { sequencerIndex: sequencerIndex, note: currentState.sequencers[sequencerIndex].note } });
        noteSelect.disabled = true;
        // Set note to default for noise
        (0, statemanager_js_1.dispatch)({ type: 'SET_NOTE', payload: { sequencerId: sequencerId, note: SOUND_TO_NOTE[sound] || 'C4' } });
    }
    else {
        noteSelect.disabled = false;
        // Restore saved note when switching back to non-noise
        var currentState = (0, statemanager_js_1.getState)();
        (0, statemanager_js_1.dispatch)({ type: 'SET_NOTE', payload: { sequencerId: sequencerId, note: currentState.savedNotes[sequencerIndex] || 'C4' } });
    }
    (0, statemanager_js_1.dispatch)({ type: 'SET_SOUND', payload: { sequencerId: sequencerId, sound: sound } });
}
function handleNoteChange(event) {
    var selectElement = event.target;
    var sequencerId = selectElement.id.replace('note', 'sequencer');
    var note = selectElement.value;
    (0, statemanager_js_1.dispatch)({ type: 'SET_NOTE', payload: { sequencerId: sequencerId, note: note } });
}
function handleDivisionsInput(event) {
    var inputElement = event.target;
    var sequencerId = inputElement.id.replace('divisions', 'sequencer');
    var divisions = parseInt(inputElement.value);
    (0, statemanager_js_1.dispatch)({ type: 'SET_DIVISIONS', payload: { sequencerId: sequencerId, divisions: divisions } });
}
function handleVolumeInput(event) {
    var sliderElement = event.target;
    var sequencerId = sliderElement.id.replace('volume', 'sequencer');
    var volume = parseInt(sliderElement.value);
    (0, statemanager_js_1.dispatch)({ type: 'SET_VOLUME', payload: { sequencerId: sequencerId, volume: volume } });
}
// --- State Change Subscribers (update UI based on state) ---
function handleIsPlayingChange(isPlaying) {
    if (isPlaying) {
        document.querySelector('.play-icon').classList.remove('show');
        document.querySelector('.pause-icon').classList.add('show');
        // Use setTimeout to ensure state update has propagated before visualize starts
        visualize(); // Start the requestAnimationFrame loop for spectrogram
    }
    else {
        document.querySelector('.play-icon').classList.add('show');
        document.querySelector('.pause-icon').classList.remove('show');
        // The loop will stop itself because of the check inside visualize()
    }
}
function handleBpmChange(bpm) {
    // Update the input field only if it's not currently focused to avoid disrupting user input
    if (document.activeElement !== bpmInput) {
        bpmInput.value = bpm.toString().padStart(3, '0');
    }
    // Also update Tone.js transport BPM here if this handler is called after Tone.js is initialized
    if (Tone.Transport) {
        Tone.Transport.bpm.value = bpm;
    }
}
function updateBarMultiplierUI(multiplier) {
    barMultiplierSelect.value = multiplier;
}
function handleVelocityRandomizationChange(value) {
    velocityRandomizationSlider.value = value;
    velocityRandomizationValueSpan.textContent = value + '%';
}
function handleNoteDurationChange(value) {
    noteDurationSlider.value = value;
    noteDurationValueSpan.textContent = value + '%';
}
function handleSequencerPatternChange(_a) {
    var sequencerIndex = _a.sequencerIndex, pattern = _a.pattern;
    var sequencerId = "sequencer".concat(sequencerIndex + 1);
    var dots = document.querySelectorAll("#".concat(sequencerId, " .dot"));
    dots.forEach(function (dot, index) {
        if (pattern[index]) {
            dot.classList.add('active');
        }
        else {
            dot.classList.remove('active');
        }
    });
    // If not playing, reset dot colors to reflect pattern change immediately
    if (!(0, statemanager_js_1.getState)().isPlaying) {
        resetDotColors();
    }
}
function handleSequencerSoundChange(_a) {
    var sequencerIndex = _a.sequencerIndex, sound = _a.sound;
    var soundSelect = soundSelects[sequencerIndex];
    soundSelect.value = sound;
    // Update note select disabled state and value based on sound type
    var noteSelect = noteSelects[sequencerIndex];
    var isNoise = COLOR_NOISES.includes(sound);
    noteSelect.disabled = isNoise;
    if (isNoise) {
        noteSelect.value = SOUND_TO_NOTE[sound] || 'C4';
    }
    else {
        var currentState = (0, statemanager_js_1.getState)();
        noteSelect.value = currentState.savedNotes[sequencerIndex] || 'C4';
    }
}
function handleSequencerNoteChange(_a) {
    var sequencerIndex = _a.sequencerIndex, note = _a.note;
    var noteSelect = noteSelects[sequencerIndex];
    // Only update if the select is not disabled (i.e., not a noise sound)
    if (!noteSelect.disabled) {
        noteSelect.value = note;
    }
}
function handleSequencerDivisionsChange(_a) {
    var sequencerIndex = _a.sequencerIndex, divisions = _a.divisions, pattern = _a.pattern;
    var divisionsInput = divisionsInputs[sequencerIndex];
    var sequencerId = "sequencer".concat(sequencerIndex + 1);
    divisionsInput.value = divisions;
    // Recreate dots if divisions changed
    createDots(sequencerId, divisions, pattern);
}
function handleSequencerVolumeChange(_a) {
    var sequencerIndex = _a.sequencerIndex, volume = _a.volume;
    var volumeSlider = volumeSliders[sequencerIndex];
    volumeSlider.value = volume;
    // Update Tone.js gain node if this handler is called after Tone.js is initialized
    // This part will likely be handled in audioengine.js as it relates to audio nodes
}
// --- Initialization ---
function init(audioAnalyzers) {
    // Assign analyzer nodes from audioengine
    analyzerNodes = audioAnalyzers;
    // Populate selects on initial load
    populateNoteAndSoundSelects();
    // Initial render of sequencers based on default or loaded state
    var initialState = (0, statemanager_js_1.getState)();
    initialState.sequencers.forEach(function (seq, index) {
        createDots(seq.id, seq.divisions, seq.pattern);
        // Set initial select/input values based on state
        soundSelects[index].value = seq.sound;
        noteSelects[index].value = seq.note;
        divisionsInputs[index].value = seq.divisions;
        volumeSliders[index].value = seq.volume;
        // Handle initial disabled state for note selects if sound is noise
        var isNoise = COLOR_NOISES.includes(seq.sound);
        noteSelects[index].disabled = isNoise;
    });
    // Set initial global control values
    bpmInput.value = initialState.bpm.toString().padStart(3, '0');
    // Manually trigger bpm input handling to enable play button based on initial value
    handleBpmInput({ target: bpmInput });
    barMultiplierSelect.value = initialState.barMultiplier;
    velocityRandomizationSlider.value = initialState.velocityRandomization;
    velocityRandomizationValueSpan.textContent = initialState.velocityRandomization + '%';
    noteDurationSlider.value = initialState.noteDuration;
    noteDurationValueSpan.textContent = initialState.noteDuration + '%';
    // Set initial play/pause button state
    handleIsPlayingChange(initialState.isPlaying);
    // Add event listeners
    playPauseButton.addEventListener('click', handlePlayPauseClick);
    bpmInput.addEventListener('input', handleBpmInput);
    barMultiplierSelect.addEventListener('change', handleBarMultiplierChange);
    exportMidiButton.addEventListener('click', handleExportMidiClick);
    velocityRandomizationSlider.addEventListener('input', handleVelocityRandomizationInput);
    noteDurationSlider.addEventListener('input', handleNoteDurationInput);
    soundSelects.forEach(function (select) { return select.addEventListener('change', handleSoundChange); });
    noteSelects.forEach(function (select) { return select.addEventListener('change', handleNoteChange); });
    divisionsInputs.forEach(function (input) { return input.addEventListener('input', handleDivisionsInput); });
    volumeSliders.forEach(function (slider) { return slider.addEventListener('input', handleVolumeInput); });
    // Subscribe to state changes
    (0, statemanager_js_1.subscribe)('isPlayingChange', handleIsPlayingChange);
    (0, statemanager_js_1.subscribe)('bpmChange', handleBpmChange);
    (0, statemanager_js_1.subscribe)('barMultiplierChange', updateBarMultiplierUI);
    (0, statemanager_js_1.subscribe)('velocityRandomizationChange', handleVelocityRandomizationChange);
    (0, statemanager_js_1.subscribe)('noteDurationChange', handleNoteDurationChange);
    (0, statemanager_js_1.subscribe)('sequencerPatternChange', handleSequencerPatternChange);
    (0, statemanager_js_1.subscribe)('sequencerSoundChange', handleSequencerSoundChange);
    (0, statemanager_js_1.subscribe)('sequencerNoteChange', handleSequencerNoteChange);
    (0, statemanager_js_1.subscribe)('sequencerDivisionsChange', handleSequencerDivisionsChange);
    (0, statemanager_js_1.subscribe)('sequencerVolumeChange', handleSequencerVolumeChange); // This might be handled in audioengine
    // Also subscribe to stateLoaded to ensure UI is fully updated when state is loaded
    (0, statemanager_js_1.subscribe)('stateLoaded', function (loadedState) {
        // Update all UI elements based on the loaded state
        handleIsPlayingChange(loadedState.isPlaying);
        handleBpmChange(loadedState.bpm);
        handleBarMultiplierChange(loadedState.barMultiplier);
        handleVelocityRandomizationChange(loadedState.velocityRandomization);
        handleNoteDurationChange(loadedState.noteDuration);
        loadedState.sequencers.forEach(function (seq, index) {
            handleSequencerSoundChange({ sequencerIndex: index, sound: seq.sound });
            handleSequencerNoteChange({ sequencerIndex: index, note: seq.note });
            handleSequencerDivisionsChange({ sequencerIndex: index, divisions: seq.divisions, pattern: seq.pattern });
            handleSequencerVolumeChange({ sequencerIndex: index, volume: seq.volume });
        });
    });
    // Visualization will be started by handleIsPlayingChange when needed
    // visualize(); // Remove initial call
}
