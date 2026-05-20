class VoiceRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: BlobPart[] = [];
    private stream: MediaStream | null = null;
    private isInitialized = false;
    private onAudioRecorded: ((audioBlob: Blob) => void) | null = null;
    constructor() {}

    async init() {
        if (this.isInitialized) {
            return;
        }
        if (!window.MediaRecorder) {
            console.error("MediaRecorder not supported in this browser.");
            return;
        }
        this.isInitialized = true;
        await this.setStream(stream => {
            this.stream = stream;
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.bindListeners();
        });
    }

    startRecording(onAudioRecorded: (audioBlob: Blob) => void) {
        if (this.mediaRecorder && this.mediaRecorder.state === "inactive") {
            this.audioChunks = [];
            this.onAudioRecorded = onAudioRecorded;
            this.mediaRecorder.start();
        }
    }

    stopRecording() {
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
        }
    }

    bindListeners() {
        if (this.mediaRecorder) {
            this.mediaRecorder.ondataavailable = event => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, {type: this.mediaRecorder?.mimeType});
                //this.playAudio(audioBlob);
                this.onAudioRecorded && this.onAudioRecorded(audioBlob);
                this.audioChunks = [];
                this.onAudioRecorded = null;
            };
        }
    }

    playAudio(audioBlob: Blob) {
        // for testing
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    }

    async setStream(onSuccess: (stream: MediaStream) => void) {
        navigator.mediaDevices.getUserMedia({audio: true}).then(onSuccess, () => {
            console.error("Failed to get user media.");
        });
    }

    dispose() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.mediaRecorder) {
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        this.mediaRecorder?.stop();
        this.mediaRecorder = null;
        this.isInitialized = false;
    }
}

export default VoiceRecorder;
