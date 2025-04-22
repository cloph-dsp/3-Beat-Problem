// Constants for MIDI mapping
const MIDI_NOTE_MAP = {
  'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65,
  'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71
};

// Helper function to convert note string (e.g., 'C4') to MIDI number
function noteToMidiNumber(note) {
  if (!note) return 60; // Default to middle C if note is undefined
  const noteName = note.slice(0, -1); // Remove octave
  const octave = parseInt(note.slice(-1));
  const baseNote = MIDI_NOTE_MAP[noteName];
  if (baseNote === undefined) return 60; // Default to middle C if note name is invalid
  return baseNote + ((octave - 4) * 12); // Adjust for octave relative to C4 (MIDI 60)
}

// Helper function to write variable length quantities (used in MIDI file format)
function writeVarLength(view, offset, value) {
  let v = value;
  if (v < 0) v = 0;

  if (v > 0x0FFFFFFF) v = 0x0FFFFFFF;

  let bytes = [];
  do {
    bytes.push(v & 0x7F);
    v = v >> 7;
  } while (v > 0);

  for (let i = bytes.length - 1; i >= 0; i--) {
    let b = bytes[i];
    if (i > 0) b |= 0x80;
    view.setUint8(offset.value, b);
    offset.value++;
  }
}

// Function to generate MIDI data object from application state
function createMidiData(state) {
  try {
    const { bpm, barMultiplier, sequencers, velocityRandomization, noteDuration } = state;

    const ticksPerBeat = 480; // Standard MIDI ticks per beat

    let midiData = {
      format: 0, // Single track file format
      numTracks: 1,
      ticksPerBeat: ticksPerBeat,
      tracks: [[
        // Add tempo meta event
        {
          deltaTime: 0,
          meta: true,
          type: 'setTempo',
          microsecondsPerBeat: Math.floor(60000000 / bpm)
        }
      ]]
    };

    sequencers.forEach((seq, index) => {
      const channel = index; // Assign a unique MIDI channel to each sequencer
      const ticksPerDivision = Math.floor(ticksPerBeat * 4 / seq.divisions); // Ticks per sequence step

      // Calculate total pattern length accounting for bar multiplier
      const totalSteps = seq.divisions * barMultiplier;

      for (let step = 0; step < totalSteps; step++) {
        const noteStep = step % seq.divisions;
        if (seq.pattern[noteStep]) {
          const noteNumber = noteToMidiNumber(seq.note);
          
          // Apply velocity randomization
          const baseVelocity = Math.floor(70 + (Math.random() * 30)); // Base velocity between 70-100
          const randomizedVelocity = Math.max(0, Math.min(127, baseVelocity + (Math.random() * 2 - 1) * (velocityRandomization / 100) * baseVelocity));
          const velocity = Math.floor(randomizedVelocity); // MIDI velocity is 0-127

          const stepTime = step * ticksPerDivision;
          
          // Apply note duration
          // Scale noteDuration (0-100) to a factor (e.g., 0.1 to 1.0 of stepTime)
          const durationFactor = 0.1 + (noteDuration / 100) * 0.9; 
          const durationTicks = Math.max(1, Math.floor(ticksPerDivision * durationFactor));


          // Note On event
          midiData.tracks[0].push({
            deltaTime: stepTime,
            channel: channel,
            type: 'noteOn',
            noteNumber: noteNumber,
            velocity: velocity
          });

          // Note Off event
          midiData.tracks[0].push({
            deltaTime: stepTime + durationTicks,
            channel: channel,
            type: 'noteOff',
            noteNumber: noteNumber,
            velocity: 0 // Note off velocity is typically 0
          });
        }
      }
    });

    // Sort events by time to ensure correct playback order
    midiData.tracks[0].sort((a, b) => a.deltaTime - b.deltaTime);

    // Convert absolute times to delta times
    let lastTime = 0;
    midiData.tracks[0].forEach(event => {
      const absoluteTime = event.deltaTime;
      event.deltaTime = Math.max(0, absoluteTime - lastTime); // Ensure delta time is non-negative
      lastTime = absoluteTime;
    });

    // Add end of track meta event
    midiData.tracks[0].push({
      deltaTime: 0,
      meta: true,
      type: 'endOfTrack'
    });

    return midiData;
  } catch (error) {
    console.error('Error creating MIDI data:', error);
    throw error;
  }
}

// Function to generate a MIDI Blob from MIDI data
function generateMidiBlob(midiData) {
  try {
    // Estimate required buffer size (can be adjusted based on typical pattern size)
    const estimatedBufferSize = 1024 + midiData.tracks[0].length * 10; 
    const buffer = new ArrayBuffer(estimatedBufferSize);
    const view = new DataView(buffer);
    let offset = { value: 0 }; // Use an object to pass offset by reference

    // Helper to write string
    const writeString = (str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset.value + i, str.charCodeAt(i));
      }
      offset.value += str.length;
    };

    // Helper to write 16-bit integer (big-endian)
    const writeInt16 = (value) => {
      view.setInt16(offset.value, value, false);
      offset.value += 2;
    };

    // Helper to write 32-bit integer (big-endian)
    const writeInt32 = (value) => {
      view.setInt32(offset.value, value, false);
      offset.value += 4;
    };

    // Write header chunk
    writeString('MThd');
    writeInt32(6); // Header length
    writeInt16(midiData.format);
    writeInt16(midiData.numTracks);
    writeInt16(midiData.ticksPerBeat);

    // Write track chunk
    writeString('MTrk');
    const trackLengthOffset = offset.value;
    writeInt32(0); // Placeholder for track length

    // Write track events
    midiData.tracks[0].forEach(event => {
      writeVarLength(view, offset, event.deltaTime);

      if (event.meta) {
        view.setUint8(offset.value++, 0xFF);

        if (event.type === 'setTempo') {
          view.setUint8(offset.value++, 0x51);
          view.setUint8(offset.value++, 0x03); // Length of tempo data (3 bytes)
          view.setUint8(offset.value++, (event.microsecondsPerBeat >> 16) & 0xFF);
          view.setUint8(offset.value++, (event.microsecondsPerBeat >> 8) & 0xFF);
          view.setUint8(offset.value++, event.microsecondsPerBeat & 0xFF);
        } else if (event.type === 'endOfTrack') {
          view.setUint8(offset.value++, 0x2F);
          view.setUint8(offset.value++, 0x00); // Length of end of track (0 bytes)
        }
      } else {
        // Note events
        const statusByte = event.type === 'noteOn' ? 0x90 : 0x80;
        view.setUint8(offset.value++, statusByte | event.channel);
        view.setUint8(offset.value++, event.noteNumber & 0x7F);
        view.setUint8(offset.value++, event.velocity & 0x7F);
      }
    });

    // Write actual track length
    const trackLength = offset.value - trackLengthOffset - 4;
    view.setInt32(trackLengthOffset, trackLength, false);

    // Return blob containing the MIDI data
    return new Blob([new Uint8Array(buffer.slice(0, offset.value))], { type: 'audio/midi' });

  } catch (error) {
    console.error('Error generating MIDI blob:', error);
    throw error;
  }
}

// Function to handle the MIDI export process
export function exportMidi(state) {
  try {
    const midiData = createMidiData(state);
    const blob = generateMidiBlob(midiData);
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = '3beat-pattern.mid';
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, message: 'MIDI file exported successfully' };

  } catch (error) {
    console.error('Error exporting MIDI:', error);
    return { success: false, message: 'Failed to export MIDI file' };
  }
}