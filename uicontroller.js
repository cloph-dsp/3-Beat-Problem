import { dispatch, subscribe, getState } from './statemanager.js';
import { exportMidi } from './midiexport.js';
// Constants
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [3, 4, 5];
// Available oscillator types (ordered by harmonic content: sine, triangle, square, sawtooth; then fat variants and FM)
const OSC_TYPES = ['sine', 'triangle', 'square', 'sawtooth', 'fatsine', 'fattriangle', 'fatsquare', 'fatsawtooth', 'amsine'];
// Available noise colors
const COLOR_NOISES = ['white', 'pink', 'brown', 'grey', 'red', 'orange', 'blue', 'violet', 'purple'];
// Combined sound options for dropdown
const SOUNDS = [...OSC_TYPES, ...COLOR_NOISES];
// Default note mapping for noise types
const SOUND_TO_NOTE = COLOR_NOISES.reduce((map, color) => { map[color] = 'C4'; return map; }, {});

// DOM element references (initialized in init)
let playPauseButton, bpmInput, barMultiplierSelect, exportMidiButton;
let velocityRandomizationSlider, velocityRandomizationValueSpan, noteDurationSlider, noteDurationValueSpan;
let sequencerElements, soundSelects, noteSelects, divisionsInputs, volumeSliders, spectrogramCanvases;

// Visualization related
let analyzerNodes = []; // Will be set by audioengine

// --- Helper Functions ---

// Show notification message
export function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => notification.classList.add('show'), 100);

  // Remove notification
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Populate note and sound select dropdowns
function populateNoteAndSoundSelects() {
  const musicalSequence = OCTAVES.flatMap(octave => NOTES.map(note => `${note}${octave}`));

  noteSelects.forEach(select => {
    select.innerHTML = musicalSequence.map(note => `<option value="${note}">${note}</option>`).join('');
  });

  soundSelects.forEach(select => {
    // Use defined OSC_TYPES and COLOR_NOISES order directly
    const oscOptions = OSC_TYPES.map(type => `<option value="${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</option>`).join('');
    const noiseOptions = COLOR_NOISES.map(color => `<option value="${color}">${color.charAt(0).toUpperCase() + color.slice(1)}</option>`).join('');
    select.innerHTML =
      `<optgroup label="Oscillators">${oscOptions}</optgroup>` +
      `<optgroup label="Noise">${noiseOptions}</optgroup>`;
  });
}

// Create dot elements for a sequencer circle
function createDots(sequencerId, divisions, pattern) {
  const circle = document.querySelector(`#${sequencerId} .circle`);
  if (!circle) {
    console.error(`Circle element not found for sequencer ${sequencerId}`);
    return;
  }

  // Clear existing dots and orbiting circles, but preserve base elements
  const existingDots = circle.querySelectorAll('.dot');
  existingDots.forEach(dot => dot.remove());
  const existingOrbitingCircles = circle.querySelectorAll('.orbiting-circle');
  existingOrbitingCircles.forEach(oc => oc.remove());


  // Create and append dots
  for (let i = 0; i < divisions; i++) {
    const angle = (i / divisions) * 2 * Math.PI - Math.PI / 2;
    const radius = 40;
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.dataset.index = i;
    if (pattern[i]) {
        dot.classList.add('active');
    }
    dot.style.left = `${50 + radius * Math.cos(angle)}%`;
    dot.style.top = `${50 + radius * Math.sin(angle)}%`;

    // Add event listener directly to the dot element
    dot.addEventListener('click', () => {
      try {
        dispatch({ type: 'TOGGLE_DOT', payload: { sequencerId, dotIndex: i } });
      } catch (error) {
        console.error('Error dispatching toggle dot action:', error);
      }
    });

    circle.appendChild(dot);
  }

  // Add orbiting circles after dots
  addOrbitingCircles(circle);
}

// Add orbiting circles for visual effect
function addOrbitingCircles(circle) {
    const orbitingCircleSizes = ['small', 'medium', 'large'];
    const radiusFactors = [1.2, 1.5, 1.8];
    const speedFactors = [8, 12, 15];
    const baseRadius = 40;

    // Remove existing orbiting circle styles
    document.head.querySelectorAll('style[data-orbit]').forEach(style => style.remove());

    orbitingCircleSizes.forEach((size, index) => {
      const orbitingCircle = document.createElement('div');
      orbitingCircle.className = `orbiting-circle orbiting-circle-${size}`;

      const startAngle = Math.random() * Math.PI * 2;
      const orbitRadius = baseRadius * radiusFactors[index];

      // Update the animation to use translate(-50%, -50%) to center the circle
      const keyframes = `
        @keyframes orbit${index + 1} {
          from {
            transform: translate(-50%, -50%) rotate(${startAngle}rad) translateX(${orbitRadius}px) rotate(-${startAngle}rad);
          }
          to {
            transform: translate(-50%, -50%) rotate(${startAngle + 2 * Math.PI}rad) translateX(${orbitRadius}px) rotate(-${startAngle + 2 * Math.PI}rad);
          }
        }
      `;

      orbitingCircle.style.cssText = `
        width: ${8 - index}px;
        height: ${8 - index}px;
        animation: orbit${index + 1} ${speedFactors[index]}s linear infinite;
      `;

      // Add the new keyframes
      const styleSheet = document.createElement('style');
      styleSheet.setAttribute('data-orbit', index + 1);
      styleSheet.textContent = keyframes;
      document.head.appendChild(styleSheet);

      circle.appendChild(orbitingCircle);
    });
  }


// Update dot colors based on current step
export function updateDotColors(sequencerIndex, currentStep) {
  const sequencerId = `sequencer${sequencerIndex + 1}`;
  const dots = document.querySelectorAll(`#${sequencerId} .dot`);
  dots.forEach((dot, index) => {
    if (index === currentStep) {
      dot.style.backgroundColor = dot.classList.contains('active') ?
        'var(--primary-color)' :
        'var(--secondary-color)';
      dot.style.boxShadow = '0 0 15px var(--primary-color)';
    } else {
      dot.style.backgroundColor = dot.classList.contains('active') ?
        'var(--primary-color)' :
        'var(--secondary-color)';
      dot.style.boxShadow = 'none';
    }
  });
}

// Reset all dot colors to their default state
export function resetDotColors() {
  document.querySelectorAll('.dot').forEach(dot => {
    dot.style.backgroundColor = dot.classList.contains('active') ?
      'var(--primary-color)' :
      'var(--secondary-color)';
    dot.style.boxShadow = 'none';
  });
}

// Update sequencer dot colors based on Transport time
export function updateSequencerVisuals(transportTime) {
    const state = getState(); // Get current state
    state.sequencers.forEach((seq, index) => {
        const { bpm, barMultiplier } = state;
        const { divisions } = seq;

        // Calculate the duration of a single step in the extended pattern based on the original BPM and divisions.
        // Assuming a 4/4 time signature, a bar has 4 beats.
        // Total duration of one original pattern repetition (seq.divisions steps) = (60 / BPM) seconds/beat * (seq.divisions / divisions per beat, assuming divisions are divisions per beat)
        // Let's assume divisions are subdivisions of a beat (e.g., 8 for 8th notes if BPM is quarter note).
        // Duration of one beat = 60 / BPM
        // Duration of one division = (60 / BPM) / divisions
        // This seems to be the simplest approach that aligns with musical timing.

        const beatDuration = 60 / bpm;
        const divisionDuration = beatDuration / divisions;

        // The extended pattern has `divisions * barMultiplier` steps.
        // The Tone.Sequence in audioengine is likely scheduled with an interval corresponding to `divisionDuration`.
        // We need to calculate the current step index within the *extended* pattern.

        // Get the current time within the Transport's loop.
        const loopEnd = Tone.Transport.loopEnd;
        let currentLoopTime = transportTime;
        if (loopEnd > 0) {
             currentLoopTime = transportTime % loopEnd;
        }


        // Calculate the current step based on the time and the original division duration.
        // This assumes each step in the extended pattern still corresponds to an original division's time slot.
        let currentStep = Math.floor(currentLoopTime / divisionDuration);

        // The visual step should loop within the *original* number of divisions for display on the circle.
        const visualStep = currentStep % divisions;

        // Call the existing updateDotColors function
        updateDotColors(index, visualStep);
    });
}


// Helper function to convert hex color to rgba
function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`; // Default fallback
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Convert intensity (0-1) to color via HSL colormap (blue-to-red)
function getColorForIntensity(intensity) {
    const hue = (1 - intensity) * 240; // 240=blue, 0=red
    return `hsl(${hue}, 100%, 50%)`;
}

// Visualization using AnalyzerNode
export function visualize() {
  console.log('visualize function called.'); // Log 1: Function entry

  // Check if AudioContext is running before proceeding
  if (Tone.context.state === 'suspended' || Tone.context.state === 'closed') {
     console.log('visualize - AudioContext not running, stopping loop.'); // Add logging if needed
     return; // Stop the requestAnimationFrame loop if context is not running
  }

  // Always schedule the next frame if the context is running
  requestAnimationFrame(visualize);

  const isPlaying = getState().isPlaying;
  console.log('visualize - isPlaying:', isPlaying); // Log 2: isPlaying state

  // Only perform drawing if playback is active
  if (isPlaying) {
    console.log('visualize - isPlaying is true, drawing.'); // Log 3: Playing, will draw

    console.log('visualize - analyzerNodes:', analyzerNodes); // Log 4: analyzerNodes state
    if (!analyzerNodes || analyzerNodes.length === 0) {
      console.log('visualize - analyzerNodes is empty or null, stopping drawing for this frame.'); // Log 5: analyzerNodes empty
      // Do not return here, allow the loop to continue, but stop drawing for this frame
    } else {
       // Get computed styles once per frame
      const computedStyle = getComputedStyle(document.body);
      const primaryColor = computedStyle.getPropertyValue('--primary-color').trim();
      const secondaryColor = computedStyle.getPropertyValue('--secondary-color').trim();
      // Define alpha values for the gradient
      const alphaStart = 0.15;
      const alphaEnd = 0.6;

      analyzerNodes.forEach((analyzer, index) => {
        console.log(`visualize - Processing analyzer index ${index}. Analyzer:`, analyzer); // Log 6: Individual analyzer

        if (!analyzer || typeof analyzer.getValue !== 'function') {
          console.log(`visualize - Analyzer at index ${index} is invalid, skipping.`); // Log 7: Invalid analyzer
          return;
        }
        const spectrogramCanvas = spectrogramCanvases[index];
        if (!spectrogramCanvas) {
          return;
        }

        const spectrogramCtx = spectrogramCanvas.getContext('2d');
        if (!spectrogramCtx) {
          return;
        }
        const bufferLength = analyzer.size;
        let dataArray;
        try {
          dataArray = analyzer.getValue();
          console.log(`visualize - Analyzer ${index} getValue() result:`, dataArray); // Log 8: Analyzer data
        } catch (error) {
          console.error(`Visualize: Error getting analyzer value for index ${index}:`, error);
          return;
        }

        // Clear the canvas first
        spectrogramCtx.clearRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);

        // Create circular clip path
        spectrogramCtx.save();
        spectrogramCtx.beginPath();
        spectrogramCtx.arc(
          spectrogramCanvas.width / 2,
          spectrogramCanvas.height / 2,
          Math.min(spectrogramCanvas.width, spectrogramCanvas.height) / 2 - 10, // Adjusted radius
          0,
          Math.PI * 2
        );
        spectrogramCtx.clip();

        // Draw subtle background using primary color with very low alpha
        spectrogramCtx.fillStyle = hexToRgba(primaryColor, 0.03);
        spectrogramCtx.fillRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);

        const barWidth = (spectrogramCanvas.width / bufferLength) * 2.5;
        let x = 0;

        // Calculate circle geometry for vertical anchoring
        const radius = Math.min(spectrogramCanvas.width, spectrogramCanvas.height) / 2 - 10;
        const centerY = spectrogramCanvas.height / 2;
        const maxBarHeight = radius * 2 * 0.9; // 90% of circle diameter

        for (let i = 0; i < bufferLength; i++) {
          let value = dataArray[i];

          if (!Number.isFinite(value) || value === null) {
            value = -140;
          }

          value = Math.max(-140, Math.min(0, value));
          const barHeight = ((value + 140) / 140) * maxBarHeight;
          // Anchor bars to bottom of circle and elongate upwards
          const y = centerY + radius * 0.9 - barHeight;

          if (barHeight > 0) {
            try {
              const gradient = spectrogramCtx.createLinearGradient(
                0,
                spectrogramCanvas.height,
                0,
                Math.max(0, spectrogramCanvas.height - barHeight)
              );

              // Use CSS variables for gradient colors with alpha
              // Alternate between primary and secondary based on index? Or just use primary? Let's use primary for now.
              gradient.addColorStop(0, hexToRgba(primaryColor, alphaStart));
              gradient.addColorStop(1, hexToRgba(primaryColor, alphaEnd));

              spectrogramCtx.fillStyle = getColorForIntensity((value + 140) / 140);
              spectrogramCtx.fillRect(
                x,
                y,
                barWidth,
                barHeight
              );
            } catch (error) {
              console.warn('Visualization drawing error:', error);
              // Fallback fill
              spectrogramCtx.fillStyle = hexToRgba(primaryColor, 0.2);
              spectrogramCtx.fillRect(
                x,
                y,
                barWidth,
                barHeight
              );
            }
          }

          x += barWidth + 1;
        }

        spectrogramCtx.restore();
      });
    }
  } else {
    console.log('visualize - isPlaying is false, not drawing.'); // Log 9: Not playing, no drawing
    // Optionally clear canvas or reset state here if needed when stopping
  }
}

// --- Event Handlers ---

function handlePlayPauseClick() {
    // Always attempt to start/resume the AudioContext on a user gesture
    Tone.start().then(() => {
        console.log('AudioContext started/resumed. State:', Tone.context.state);
        console.log('Tone.Transport state after Tone.start():', Tone.Transport.state);
        // Audio context is now running (or was already running), proceed with dispatching the action
        dispatch({ type: 'SET_IS_PLAYING', payload: !getState().isPlaying });
    }).catch(error => {
        console.error("Error starting Tone.js AudioContext:", error);
        // Handle potential errors during context start (e.g., user denied audio)
    });
}

function handleBpmInput(event) {
  let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
  let numValue = parseInt(value);

  // Validate and clamp BPM
  if (isNaN(numValue) || numValue < 60 || numValue > 300) {
    bpmInput.classList.add('invalid');
    playPauseButton.disabled = true;
  } else {
    bpmInput.classList.remove('invalid');
    playPauseButton.disabled = false;
    dispatch({ type: 'SET_BPM', payload: numValue });
  }

  // Update input value to clamped value with padding
  // This prevents the user from entering invalid numbers visually
  bpmInput.value = numValue >= 60 && numValue <= 300 ? numValue.toString().padStart(3, '0') : value.padStart(3, '0');
}


function handleBarMultiplierChange(event) {
  dispatch({ type: 'SET_BAR_MULTIPLIER', payload: parseInt(event.target.value) });
}

function handleExportMidiClick() {
    const result = exportMidi(getState());
    showNotification(result.message, result.success ? 'success' : 'error');
}

function handleVelocityRandomizationInput(event) {
  dispatch({ type: 'SET_VELOCITY_RANDOMIZATION', payload: parseInt(event.target.value) });
}

function handleNoteDurationInput(event) {
  dispatch({ type: 'SET_NOTE_DURATION', payload: parseInt(event.target.value) });
}

function handleSoundChange(event) {
  const selectElement = event.target;
  const sequencerId = selectElement.id.replace('sound', 'sequencer');
  const sound = selectElement.value;
  const sequencerIndex = parseInt(sequencerId.slice(-1)) - 1;
  const noteSelect = document.getElementById(`note${sequencerIndex + 1}`);
  const isNoise = COLOR_NOISES.includes(sound);

  if (isNoise) {
      // Save current note before disabling and changing
      const currentState = getState();
      dispatch({ type: 'SAVE_NOTE_FOR_SEQUENCER', payload: { sequencerIndex, note: currentState.sequencers[sequencerIndex].note } });
      noteSelect.disabled = true;
       // Set note to default for noise
      dispatch({ type: 'SET_NOTE', payload: { sequencerId, note: SOUND_TO_NOTE[sound] || 'C4' } });
  } else {
      noteSelect.disabled = false;
      // Restore saved note when switching back to non-noise
      const currentState = getState();
      dispatch({ type: 'SET_NOTE', payload: { sequencerId, note: currentState.savedNotes[sequencerIndex] || 'C4' } });
  }

  dispatch({ type: 'SET_SOUND', payload: { sequencerId, sound } });
}


function handleNoteChange(event) {
  const selectElement = event.target;
  const sequencerId = selectElement.id.replace('note', 'sequencer');
  const note = selectElement.value;
  dispatch({ type: 'SET_NOTE', payload: { sequencerId, note } });
}

function handleDivisionsInput(event) {
  const inputElement = event.target;
  const sequencerId = inputElement.id.replace('divisions', 'sequencer');
  const divisions = parseInt(inputElement.value);
  dispatch({ type: 'SET_DIVISIONS', payload: { sequencerId, divisions } });
}

function handleVolumeInput(event) {
  const sliderElement = event.target;
  const sequencerId = sliderElement.id.replace('volume', 'sequencer');
  const volume = parseInt(sliderElement.value);
  dispatch({ type: 'SET_VOLUME', payload: { sequencerId, volume } });
}


// --- State Change Subscribers (update UI based on state) ---

function handleIsPlayingChange(isPlaying) {
  if (isPlaying) {
    document.querySelector('.play-icon').classList.remove('show');
    document.querySelector('.pause-icon').classList.add('show');
    // Use setTimeout to ensure state update has propagated before visualize starts
    visualize(); // Start the requestAnimationFrame loop for spectrogram

  } else {
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

function handleSequencerPatternChange({ sequencerIndex, pattern }) {
    const sequencerId = `sequencer${sequencerIndex + 1}`;
    const dots = document.querySelectorAll(`#${sequencerId} .dot`);
    dots.forEach((dot, index) => {
        if (pattern[index]) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
     // If not playing, reset dot colors to reflect pattern change immediately
    if (!getState().isPlaying) {
         resetDotColors();
    }
}

function handleSequencerSoundChange({ sequencerIndex, sound }) {
    const soundSelect = soundSelects[sequencerIndex];
    soundSelect.value = sound;
     // Update note select disabled state and value based on sound type
    const noteSelect = noteSelects[sequencerIndex];
    const isNoise = COLOR_NOISES.includes(sound);
    noteSelect.disabled = isNoise;
    if (isNoise) {
         noteSelect.value = SOUND_TO_NOTE[sound] || 'C4';
    } else {
         const currentState = getState();
         noteSelect.value = currentState.savedNotes[sequencerIndex] || 'C4';
    }
}


function handleSequencerNoteChange({ sequencerIndex, note }) {
    const noteSelect = noteSelects[sequencerIndex];
    // Only update if the select is not disabled (i.e., not a noise sound)
    if (!noteSelect.disabled) {
        noteSelect.value = note;
    }
}

function handleSequencerDivisionsChange({ sequencerIndex, divisions, pattern }) {
    const divisionsInput = divisionsInputs[sequencerIndex];
    const sequencerId = `sequencer${sequencerIndex + 1}`;
    divisionsInput.value = divisions;
     // Recreate dots if divisions changed
    createDots(sequencerId, divisions, pattern);
}

function handleSequencerVolumeChange({ sequencerIndex, volume }) {
    const volumeSlider = volumeSliders[sequencerIndex];
    volumeSlider.value = volume;
     // Update Tone.js gain node if this handler is called after Tone.js is initialized
     // This part will likely be handled in audioengine.js as it relates to audio nodes
}


// --- Initialization ---

export function init(audioAnalyzers) {
  // Assign analyzer nodes from audioengine
  analyzerNodes = audioAnalyzers;

  // Fetch DOM elements after DOM is ready
  playPauseButton = document.getElementById('playPause');
  bpmInput = document.getElementById('bpm');
  barMultiplierSelect = document.getElementById('barMultiplier');
  exportMidiButton = document.getElementById('exportMidi');
  velocityRandomizationSlider = document.getElementById('velocityRandomization');
  noteDurationSlider = document.getElementById('noteDuration');
  velocityRandomizationValueSpan = document.getElementById('velocityRandomizationValue');
  noteDurationValueSpan = document.getElementById('noteDurationValue');
  sequencerElements = ['sequencer1','sequencer2','sequencer3'].map(id => document.getElementById(id));
  soundSelects = ['sound1','sound2','sound3'].map(id => document.getElementById(id));
  noteSelects = ['note1','note2','note3'].map(id => document.getElementById(id));
  divisionsInputs = ['divisions1','divisions2','divisions3'].map(id => document.getElementById(id));
  volumeSliders = ['volume1','volume2','volume3'].map(id => document.getElementById(id));
  spectrogramCanvases = ['spectrogram1','spectrogram2','spectrogram3'].map(id => document.getElementById(id));

  // Populate selects on initial load
  populateNoteAndSoundSelects();

  // Initial render of sequencers based on default or loaded state
  const initialState = getState();

  // Dynamically create advanced controls panel under header
  const headerElem = document.querySelector('.header');
  const advPanel = document.createElement('div');
  advPanel.id = 'advancedControls';
  advPanel.className = 'advanced-controls collapsed';
  advPanel.setAttribute('role', 'region');
  advPanel.setAttribute('aria-label', 'Advanced Controls');
  advPanel.innerHTML = `
    <div class="slider-container">
      <div class="slider-group">
        <label for="velocityRandomization">Velocity Randomization:</label>
        <input type="range" id="velocityRandomization" min="0" max="100" value="${initialState.velocityRandomization}" step="1">
        <span id="velocityRandomizationValue" class="value-display">${initialState.velocityRandomization}%</span>
      </div>
      <div class="slider-group">
        <label for="noteDuration">Note Duration:</label>
        <input type="range" id="noteDuration" min="0" max="100" value="${initialState.noteDuration}" step="1">
        <span id="noteDurationValue" class="value-display">${initialState.noteDuration}%</span>
      </div>
    </div>
  `;
  const headerActions = document.querySelector('.header-actions');
  headerActions.appendChild(advPanel);

  // Assign slider element references
  velocityRandomizationSlider = document.getElementById('velocityRandomization');
  noteDurationSlider = document.getElementById('noteDuration');
  velocityRandomizationValueSpan = document.getElementById('velocityRandomizationValue');
  noteDurationValueSpan = document.getElementById('noteDurationValue');

  initialState.sequencers.forEach((seq, index) => {
       createDots(seq.id, seq.divisions, seq.pattern);
       // Set initial select/input values based on state
       soundSelects[index].value = seq.sound;
       noteSelects[index].value = seq.note;
       divisionsInputs[index].value = seq.divisions;
       volumeSliders[index].value = seq.volume;
        // Handle initial disabled state for note selects if sound is noise
        const isNoise = COLOR_NOISES.includes(seq.sound);
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

  soundSelects.forEach(select => select.addEventListener('change', handleSoundChange));
  noteSelects.forEach(select => select.addEventListener('change', handleNoteChange));
  divisionsInputs.forEach(input => input.addEventListener('input', handleDivisionsInput));
  volumeSliders.forEach(slider => slider.addEventListener('input', handleVolumeInput));

  // Add event listener for settings toggle
  const settingsToggle = document.getElementById('settingsToggle');
  const advancedControls = document.getElementById('advancedControls');
  settingsToggle.addEventListener('click', () => {
    const isCollapsed = advancedControls.classList.toggle('collapsed');
    settingsToggle.setAttribute('aria-expanded', String(!isCollapsed));
  });

  // Subscribe to state changes
  subscribe('isPlayingChange', handleIsPlayingChange);
  subscribe('bpmChange', handleBpmChange);
  subscribe('barMultiplierChange', updateBarMultiplierUI);
  subscribe('velocityRandomizationChange', handleVelocityRandomizationChange);
  subscribe('noteDurationChange', handleNoteDurationChange);
  subscribe('sequencerPatternChange', handleSequencerPatternChange);
  subscribe('sequencerSoundChange', handleSequencerSoundChange);
  subscribe('sequencerNoteChange', handleSequencerNoteChange);
  subscribe('sequencerDivisionsChange', handleSequencerDivisionsChange);
  subscribe('sequencerVolumeChange', handleSequencerVolumeChange); // This might be handled in audioengine
   // Also subscribe to stateLoaded to ensure UI is fully updated when state is loaded
   subscribe('stateLoaded', (loadedState) => {
      // Update all UI elements based on the loaded state
      handleIsPlayingChange(loadedState.isPlaying);
      handleBpmChange(loadedState.bpm);
      handleBarMultiplierChange(loadedState.barMultiplier);
      handleVelocityRandomizationChange(loadedState.velocityRandomization);
      handleNoteDurationChange(loadedState.noteDuration);
      loadedState.sequencers.forEach((seq, index) => {
           handleSequencerSoundChange({ sequencerIndex: index, sound: seq.sound });
           handleSequencerNoteChange({ sequencerIndex: index, note: seq.note });
           handleSequencerDivisionsChange({ sequencerIndex: index, divisions: seq.divisions, pattern: seq.pattern });
           handleSequencerVolumeChange({ sequencerIndex: index, volume: seq.volume });
      });
   });


  // Visualization will be started by handleIsPlayingChange when needed
  // visualize(); // Remove initial call
}