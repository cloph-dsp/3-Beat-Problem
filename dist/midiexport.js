"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportMidi = exportMidi;
// Constants for MIDI mapping
var MIDI_NOTE_MAP = {
    'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65,
    'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71
};
// Helper function to convert note string (e.g., 'C4') to MIDI number
function noteToMidiNumber(note) {
    if (!note)
        return 60; // Default to middle C if note is undefined
    var noteName = note.slice(0, -1); // Remove octave
    var octave = parseInt(note.slice(-1));
    var baseNote = MIDI_NOTE_MAP[noteName];
    if (baseNote === undefined)
        return 60; // Default to middle C if note name is invalid
    return baseNote + ((octave - 4) * 12); // Adjust for octave relative to C4 (MIDI 60)
}
// Helper function to write variable length quantities (used in MIDI file format)
function writeVarLength(view, offset, value) {
    var v = value;
    if (v < 0)
        v = 0;
    if (v > 0x0FFFFFFF)
        v = 0x0FFFFFFF;
    var bytes = [];
    do {
        bytes.push(v & 0x7F);
        v = v >> 7;
    } while (v > 0);
    for (var i = bytes.length - 1; i >= 0; i--) {
        var b = bytes[i];
        if (i > 0)
            b |= 0x80;
        view.setUint8(offset.value, b);
        offset.value++;
    }
}
// Function to generate MIDI data object from application state
function createMidiData(state) {
    try {
        var bpm = state.bpm, barMultiplier_1 = state.barMultiplier, sequencers = state.sequencers, velocityRandomization_1 = state.velocityRandomization, noteDuration_1 = state.noteDuration;
        var ticksPerBeat_1 = 480; // Standard MIDI ticks per beat
        var midiData_1 = {
            format: 0, // Single track file format
            numTracks: 1,
            ticksPerBeat: ticksPerBeat_1,
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
        sequencers.forEach(function (seq, index) {
            var channel = index; // Assign a unique MIDI channel to each sequencer
            var ticksPerDivision = Math.floor(ticksPerBeat_1 * 4 / seq.divisions); // Ticks per sequence step
            // Calculate total pattern length accounting for bar multiplier
            var totalSteps = seq.divisions * barMultiplier_1;
            for (var step = 0; step < totalSteps; step++) {
                var noteStep = step % seq.divisions;
                if (seq.pattern[noteStep]) {
                    var noteNumber = noteToMidiNumber(seq.note);
                    // Apply velocity randomization
                    var baseVelocity = Math.floor(70 + (Math.random() * 30)); // Base velocity between 70-100
                    var randomizedVelocity = Math.max(0, Math.min(127, baseVelocity + (Math.random() * 2 - 1) * (velocityRandomization_1 / 100) * baseVelocity));
                    var velocity = Math.floor(randomizedVelocity); // MIDI velocity is 0-127
                    var stepTime = step * ticksPerDivision;
                    // Apply note duration
                    // Scale noteDuration (0-100) to a factor (e.g., 0.1 to 1.0 of stepTime)
                    var durationFactor = 0.1 + (noteDuration_1 / 100) * 0.9;
                    var durationTicks = Math.max(1, Math.floor(ticksPerDivision * durationFactor));
                    // Note On event
                    midiData_1.tracks[0].push({
                        deltaTime: stepTime,
                        channel: channel,
                        type: 'noteOn',
                        noteNumber: noteNumber,
                        velocity: velocity
                    });
                    // Note Off event
                    midiData_1.tracks[0].push({
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
        midiData_1.tracks[0].sort(function (a, b) { return a.deltaTime - b.deltaTime; });
        // Convert absolute times to delta times
        var lastTime_1 = 0;
        midiData_1.tracks[0].forEach(function (event) {
            var absoluteTime = event.deltaTime;
            event.deltaTime = Math.max(0, absoluteTime - lastTime_1); // Ensure delta time is non-negative
            lastTime_1 = absoluteTime;
        });
        // Add end of track meta event
        midiData_1.tracks[0].push({
            deltaTime: 0,
            meta: true,
            type: 'endOfTrack'
        });
        return midiData_1;
    }
    catch (error) {
        console.error('Error creating MIDI data:', error);
        throw error;
    }
}
// Function to generate a MIDI Blob from MIDI data
function generateMidiBlob(midiData) {
    try {
        // Estimate required buffer size (can be adjusted based on typical pattern size)
        var estimatedBufferSize = 1024 + midiData.tracks[0].length * 10;
        var buffer = new ArrayBuffer(estimatedBufferSize);
        var view_1 = new DataView(buffer);
        var offset_1 = { value: 0 }; // Use an object to pass offset by reference
        // Helper to write string
        var writeString = function (str) {
            for (var i = 0; i < str.length; i++) {
                view_1.setUint8(offset_1.value + i, str.charCodeAt(i));
            }
            offset_1.value += str.length;
        };
        // Helper to write 16-bit integer (big-endian)
        var writeInt16 = function (value) {
            view_1.setInt16(offset_1.value, value, false);
            offset_1.value += 2;
        };
        // Helper to write 32-bit integer (big-endian)
        var writeInt32 = function (value) {
            view_1.setInt32(offset_1.value, value, false);
            offset_1.value += 4;
        };
        // Write header chunk
        writeString('MThd');
        writeInt32(6); // Header length
        writeInt16(midiData.format);
        writeInt16(midiData.numTracks);
        writeInt16(midiData.ticksPerBeat);
        // Write track chunk
        writeString('MTrk');
        var trackLengthOffset = offset_1.value;
        writeInt32(0); // Placeholder for track length
        // Write track events
        midiData.tracks[0].forEach(function (event) {
            writeVarLength(view_1, offset_1, event.deltaTime);
            if (event.meta) {
                view_1.setUint8(offset_1.value++, 0xFF);
                if (event.type === 'setTempo') {
                    view_1.setUint8(offset_1.value++, 0x51);
                    view_1.setUint8(offset_1.value++, 0x03); // Length of tempo data (3 bytes)
                    view_1.setUint8(offset_1.value++, (event.microsecondsPerBeat >> 16) & 0xFF);
                    view_1.setUint8(offset_1.value++, (event.microsecondsPerBeat >> 8) & 0xFF);
                    view_1.setUint8(offset_1.value++, event.microsecondsPerBeat & 0xFF);
                }
                else if (event.type === 'endOfTrack') {
                    view_1.setUint8(offset_1.value++, 0x2F);
                    view_1.setUint8(offset_1.value++, 0x00); // Length of end of track (0 bytes)
                }
            }
            else {
                // Note events
                var statusByte = event.type === 'noteOn' ? 0x90 : 0x80;
                view_1.setUint8(offset_1.value++, statusByte | event.channel);
                view_1.setUint8(offset_1.value++, event.noteNumber & 0x7F);
                view_1.setUint8(offset_1.value++, event.velocity & 0x7F);
            }
        });
        // Write actual track length
        var trackLength = offset_1.value - trackLengthOffset - 4;
        view_1.setInt32(trackLengthOffset, trackLength, false);
        // Return blob containing the MIDI data
        return new Blob([new Uint8Array(buffer.slice(0, offset_1.value))], { type: 'audio/midi' });
    }
    catch (error) {
        console.error('Error generating MIDI blob:', error);
        throw error;
    }
}
// Function to handle the MIDI export process
function exportMidi(state) {
    try {
        var midiData = createMidiData(state);
        var blob = generateMidiBlob(midiData);
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = '3beat-pattern.mid';
        document.body.appendChild(a);
        a.click();
        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, message: 'MIDI file exported successfully' };
    }
    catch (error) {
        console.error('Error exporting MIDI:', error);
        return { success: false, message: 'Failed to export MIDI file' };
    }
}
