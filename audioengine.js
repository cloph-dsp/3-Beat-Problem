import { subscribe, getState } from './statemanager.js';
import { updateDotColors, resetDotColors, visualize } from './uicontroller.js'; // Import visualization functions

// Constants (should match constants in uicontroller and statemanager)
const COLOR_NOISES = ['white', 'pink', 'brown', 'violet', 'blue', 'red', 'grey', 'purple', 'orange'];
// Map default note for noise types
const SOUND_TO_NOTE = COLOR_NOISES.reduce((map, color) => { map[color] = 'C4'; return map; }, {});
// Configurations for filtering white noise to create colored noise variants
const NOISE_FILTER_CONFIG = {
  violet: { type: 'highpass', frequency: 2000, rolloff: -12 },
  blue:   { type: 'highpass', frequency: 500, rolloff: -12 },
  red:    { type: 'lowpass',  frequency: 200, rolloff: -12 },
  grey:   { type: 'bandpass', frequency: 1000, rolloff: -12 },
  purple: { type: 'highpass', frequency: 4000, rolloff: -12 },
  orange: { type: 'lowpass',  frequency: 5000, rolloff: -12 }
};
// Available oscillator types for synthesizers
const OSC_TYPES = ['sine','square','triangle','sawtooth','fatsine','fatsawtooth','amsine','fatsquare','fattriangle'];

// Audio Objects
let gainNodes = [];
let analyzerNodes = [];
let sequences = [];
let audioSources = {}; // Store instantiated synths/noises keyed by sequencer index

// --- Audio Engine Functions ---

// Initialize audio context and nodes
export function init() {
  // Reduce scheduling lookahead and set low-latency for audio context
  Tone.Transport.lookahead = 0.03;
  // Tone.js context will be started on first user interaction (e.g., play button click)

  // Create Gain Nodes and Analyzer Nodes for each sequencer
  const numberOfSequencers = getState().sequencers.length;
  gainNodes = Array(numberOfSequencers).fill().map(() => new Tone.Gain().toDestination());
  analyzerNodes = Array(numberOfSequencers).fill().map(() => new Tone.Analyser('fft', 512));

  // Connect analyzer nodes to their respective gain nodes
  analyzerNodes.forEach((analyzer, index) => gainNodes[index].connect(analyzer));

  // Set initial volumes and subscribe to volume changes
  getState().sequencers.forEach((seq, index) => {
      gainNodes[index].gain.value = seq.volume / 100;
  });
   subscribe('sequencerVolumeChange', handleSequencerVolumeChange);


  // Subscribe to state changes that affect playback
  subscribe('isPlayingChange', handleIsPlayingChange);
  subscribe('bpmChange', handleBpmChange);
  subscribe('barMultiplierChange', handleBarMultiplierChange);
  subscribe('sequencerPatternChange', handleSequencerPatternChange);
  subscribe('sequencerSoundChange', handleSequencerSoundChange);
  subscribe('sequencerNoteChange', handleSequencerNoteChange);
  subscribe('sequencerDivisionsChange', handleSequencerDivisionsChange);
   subscribe('velocityRandomizationChange', handleGlobalPlaybackChange);
   subscribe('noteDurationChange', handleGlobalPlaybackChange);

  // Initial setup of sequences based on the initial state
  setupSequences(getState());

   // Return analyzer nodes for visualization in the UI
   return analyzerNodes;
}

// Setup or re-setup Tone.js Sequences based on the current state
function setupSequences(state) {
  // Stop and clear existing sequences and sources
  // console.log('setupSequences called.'); // Removed log
  sequences.forEach(seq => {
     if (seq && seq.dispose) {
        seq.dispose();
     }
  });
  sequences = []; // Clear the sequences array
  disposeAudioSources(); // Dispose of audio sources

  const { bpm, barMultiplier } = state;

   // Ensure positive BPM value for Tone.js Transport
  const adjustedBpm = Math.max(bpm / (1 + (barMultiplier - 1) * 0.5), 1); // Adjust BPM based on bar multiplier

  // Set new BPM with validation
  Tone.Transport.bpm.value = adjustedBpm;
  // console.log('setupSequences finished disposal and Transport BPM update.'); // Removed log
}

// --- State Change Handlers (react to state changes) ---

// Helper function to attempt starting Tone.Transport and sequences
async function attemptStartTransportAndSequences() {
  // Resume AudioContext if suspended
  // console.log(`AudioContext state before resume check: ${Tone.context.state}`); // Removed log
  if (Tone.context.state === 'suspended') {
    // console.log("AudioContext is suspended, attempting to resume..."); // Removed log
    await Tone.context.resume();
    // console.log(`AudioContext state after resume attempt: ${Tone.context.state}`); // Removed log
  } else if (Tone.context.state === 'running') {
  } else {
  }

  // Dispose and clear existing sequences and sources (from previous setup or prior play)
  sequences.forEach(seq => {
     if (seq && seq.dispose) {
        seq.dispose();
     }
  });
  sequences = []; // Clear the sequences array
  disposeAudioSources(); // Dispose of audio sources

  // Get current state for sequence creation parameters
  const state = getState();
  const { bpm, barMultiplier, sequencers, velocityRandomization, noteDuration } = state;
  const adjustedBpm = Math.max(bpm / (1 + (barMultiplier - 1) * 0.5), 1);

  // Create new sequences with the active context
  sequences = sequencers.map((seq, index) => {
    const stepTime = Math.max(60 / (adjustedBpm * seq.divisions), 0.01);
    let sequence = createSequence(seq, index, stepTime);
    return sequence;
  }).filter(seq => seq !== null); // Explicitly terminate the statement

  // Start transport and sequences
  // console.log('Tone.Transport state before start:', Tone.Transport.state); // Removed log
  Tone.Transport.start();
  // console.log('Tone.Transport state after start:', Tone.Transport.state); // Removed log

  // console.log('Sequences array before starting:', sequences); // Removed log
  sequences.forEach(sequence => { // Removed index from log below as it wasn't defined
      // console.log('Attempting to start sequence:', sequence); // Removed log
      if (sequence && sequence.start) {
          // Start sequence at the beginning of the transport timeline
          sequence.start(0);
          // console.log(`Sequence started at transport time 0.`); // Removed log
        } else {
            console.warn('Sequence is not valid or does not have a start method:', sequence);
        }
    });
    visualize(); // Start visualization loop when transport starts
}

// Dispose of all audio sources (synths and noises)
function disposeAudioSources() {
    for (const index in audioSources) {
        if (audioSources[index] && audioSources[index].dispose) {
            audioSources[index].dispose();
        }
    }
    audioSources = {}; // Clear the stored sources
}

// --- State Change Handlers (react to state changes) ---

// Store the ID of the scheduled visualization event
let visualizationEventId = null;

function handleIsPlayingChange(isPlaying) {
  // console.log(`AudioEngine: handleIsPlayingChange called with: ${isPlaying}`); // Removed log
  if (isPlaying) {
    // Attempt to start Transport and sequences only if playing
    attemptStartTransportAndSequences();

    // Schedule the visualization update function from uicontroller
    // Import updateSequencerVisuals from uicontroller
    import('./uicontroller.js').then(({ updateSequencerVisuals }) => {
        // Schedule UI updates using Tone.Draw to offload to the animation frame
        visualizationEventId = Tone.Transport.scheduleRepeat(time => {
            Tone.Draw.schedule(() => updateSequencerVisuals(time));
        }, '16n'); // Update interval
    });

  } else {
    // console.log("AudioEngine: Stopping transport."); // Removed log
    Tone.Transport.pause();
    // console.log("AudioEngine: Cancelling transport events."); // Removed log
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
   const currentState = getState();
   const { barMultiplier } = currentState;
   const adjustedBpm = Math.max(newBpm / (1 + (barMultiplier - 1) * 0.5), 1); // Ensure positive BPM value
   Tone.Transport.bpm.value = adjustedBpm;
   // Note: Individual sequence intervals in createSequence might also need to adapt
   // or sequences need to be re-created if intervals cannot update dynamically.
   // Further refinement may be needed here or in createSequence/related logic.
}

function handleBarMultiplierChange(newMultiplier) {
   const currentState = getState();
   const { bpm, sequencers } = currentState;
   const adjustedBpm = Math.max(bpm / (1 + (newMultiplier - 1) * 0.5), 1);

   // Update Tone.Transport BPM as it's affected by the bar multiplier
   Tone.Transport.bpm.value = adjustedBpm;

   // Update individual sequence intervals based on the new bar multiplier and divisions
   sequencers.forEach((seq, index) => {
       if (sequences[index] && sequences[index].interval) {
           const stepTime = Math.max(60 / (adjustedBpm * seq.divisions), 0.01);
           const adjustedStepTime = Math.max(stepTime * (1 + (newMultiplier - 1) * 0.5), 0.01);
           sequences[index].interval = adjustedStepTime;

           // Recreate the events array based on the new bar multiplier
           const extendedPattern = Array(seq.divisions * newMultiplier)
             .fill(0)
             .map((_, i) => seq.pattern[i % seq.divisions]);

           // Tone.js Sequence's events property can be updated directly
           sequences[index].events = Array.from(Array(seq.divisions * newMultiplier).keys());
           // Note: The callback logic in createSequence relies on extendedPattern.
           // We might need a more sophisticated way to handle pattern updates with changing length.
           // For now, this updates the sequence length and interval.
       }
   });
}

function handleSequencerPatternChange({ sequencerIndex, pattern }) {
    // Pattern change requires re-setting up the specific sequence,
    // but we can reuse the audio source if the sound type hasn't changed.
    const currentState = getState();
    // Update the pattern in the local state representation used by createSequence
    currentState.sequencers[sequencerIndex].pattern = pattern;
    const seqConfig = currentState.sequencers[sequencerIndex];

    // Dispose the old sequence for this index
    if (sequences[sequencerIndex] && sequences[sequencerIndex].dispose) {
        sequences[sequencerIndex].dispose();
    }

    // Recreate and store the new sequence. createSequence will reuse the audio source if possible.
    const adjustedBpm = Math.max(currentState.bpm / (1 + (currentState.barMultiplier - 1) * 0.5), 1);
    const stepTime = Math.max(60 / (adjustedBpm * seqConfig.divisions), 0.01);
    const newSequence = createSequence(seqConfig, sequencerIndex, stepTime);
    sequences[sequencerIndex] = newSequence;

    // If playing, start the new sequence immediately at transport time 0
    if (Tone.Transport.state === 'started' && newSequence && newSequence.start) {
        newSequence.start(0);
    }
}

function handleSequencerSoundChange({ sequencerIndex, sound }) {
    const currentState = getState();
    // Update the sound in the local state representation
    currentState.sequencers[sequencerIndex].sound = sound;
    const seqConfig = currentState.sequencers[sequencerIndex];

    // Dispose the old audio source for this index if it exists
    if (audioSources[sequencerIndex] && audioSources[sequencerIndex].dispose) {
        audioSources[sequencerIndex].dispose();
        delete audioSources[sequencerIndex]; // Remove from stored sources
    }

    // Create and store the new audio source
    let source;
    if (COLOR_NOISES.includes(sound)) {
        if (NOISE_FILTER_CONFIG[sound]) {
            source = new Tone.Noise('white');
            const filter = new Tone.Filter(NOISE_FILTER_CONFIG[sound]);
            source.chain(filter, gainNodes[sequencerIndex]);
        } else {
            source = new Tone.Noise(sound).connect(gainNodes[sequencerIndex]);
        }
    } else {
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


function handleSequencerNoteChange({ sequencerIndex, note }) {
    // Note change is picked up directly by the sequence callback via getState(),
    // so no action is needed here for existing Synth sources.
    // If the sound type changes to something that doesn't use notes (e.g., noise),
    // handleSequencerSoundChange will handle the source replacement.
}

function handleSequencerDivisionsChange({ sequencerIndex, divisions, pattern }) {
     // Divisions change requires re-setting up the specific sequence,
     // but we can reuse the audio source if the sound type hasn't changed.
    const currentState = getState();
    // Update divisions and pattern in the local state representation
    currentState.sequencers[sequencerIndex].divisions = divisions;
    currentState.sequencers[sequencerIndex].pattern = pattern; // Pattern is also updated
    const seqConfig = currentState.sequencers[sequencerIndex];

     // Dispose the old sequence for this index
    if (sequences[sequencerIndex] && sequences[sequencerIndex].dispose) {
        sequences[sequencerIndex].dispose();
    }

     // Recreate and store the new sequence. createSequence will reuse the audio source if possible.
    const adjustedBpm = Math.max(currentState.bpm / (1 + (currentState.barMultiplier - 1) * 0.5), 1);
    const stepTime = Math.max(60 / (adjustedBpm * seqConfig.divisions), 0.01);
    const newSequence = createSequence(seqConfig, sequencerIndex, stepTime);
    sequences[sequencerIndex] = newSequence;

     // If playing, start the new sequence immediately at transport time 0
     if (Tone.Transport.state === 'started' && newSequence && newSequence.start) {
         newSequence.start(0);
     }
}


function handleSequencerVolumeChange({ sequencerIndex, volume }) {
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
      let source = audioSources[index];
      if (!source || (source.type && source.type !== seq.sound) || (source.noise && source.noise.type !== seq.sound)) {
          // This case should ideally be handled by handleSequencerSoundChange before createSequence is called,
          // but including fallback logic here for robustness.
           if (source && source.dispose) {
                source.dispose();
           }
           if (COLOR_NOISES.includes(seq.sound)) {
                if (NOISE_FILTER_CONFIG[seq.sound]) {
                    source = new Tone.Noise('white');
                    const filter = new Tone.Filter(NOISE_FILTER_CONFIG[seq.sound]);
                    source.chain(filter, gainNodes[index]);
                } else {
                    source = new Tone.Noise(seq.sound).connect(gainNodes[index]);
                }
           } else {
                source = new Tone.Synth({
                    oscillator: { type: seq.sound }
                }).connect(gainNodes[index]);
           }
           audioSources[index] = source; // Store the new source
      }


      const currentState = getState();
      const { barMultiplier, velocityRandomization, noteDuration } = currentState;

      // Create an extended pattern array that repeats based on bar multiplier
      const extendedPattern = Array(seq.divisions * barMultiplier)
        .fill(0)
        .map((_, i) => seq.pattern[i % seq.divisions]);

      // Ensure positive stepTime
      const adjustedStepTime = Math.max(stepTime * (1 + (barMultiplier - 1) * 0.5), 0.01);


      return new Tone.Sequence((time, step) => {
        // console.log(`Sequence Callback - Index: ${index}, Time: ${time}, Step: ${step}`); // Removed log
        // Ensure time is non-negative
        if (time < 0) {
            // console.log(`Sequence Callback - Negative time (${time}), returning.`); // Removed log
            return;
        }

        // Calculate the visual step (which dot to highlight) - Moved to separate UI logic
        const visualStep = step % seq.divisions;
        // updateDotColors(index, visualStep); // UI update - REMOVED

        if (extendedPattern[step]) {
            // console.log(`Sequence Callback - Step ${step} is active.`); // Removed log
          // Apply velocity randomization
           const baseVelocity = 0.7; // Base velocity (0-1)
           const randomizedVelocity = Math.max(0, Math.min(1, baseVelocity + (Math.random() * 2 - 1) * (velocityRandomization / 100) * baseVelocity));
           const velocity = randomizedVelocity; // Tone.js velocity is 0-1

          // Apply note duration
          const durationFactor = 0.1 + (noteDuration / 100) * 0.9;
          const duration = Math.max(adjustedStepTime * durationFactor, 0.01); // Ensure positive duration

          try {
             if (COLOR_NOISES.includes(seq.sound)) {
                source.start(Math.max(time, Tone.now())).stop(Math.max(time + duration, Tone.now() + 0.01)); // Ensure time is at least Tone.now()
             } else {
                source.triggerAttackRelease(seq.note, duration, Math.max(time, Tone.now()), velocity); // Ensure time is at least Tone.now()
             }
          } catch (error) {
            console.warn('Error playing sound:', error);
          }
        } else {
            // console.log(`Sequence Callback - Step ${step} is inactive.`); // Optional: Log inactive steps
        }
      }, Array.from(Array(seq.divisions * barMultiplier).keys()), adjustedStepTime); // Ensure the events array is correctly formatted

    } catch (error) {
      console.error('Error in createSequence:', error);
      return null;
    }
}

// Expose analyzer nodes
export function getAnalyzerNodes() {
    return analyzerNodes;
}