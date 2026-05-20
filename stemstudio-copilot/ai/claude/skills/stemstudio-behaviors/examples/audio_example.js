/**
 * AUDIO CONTROLLER EXAMPLE
 * 
 * Demonstrates loading and playing 2D/3D audio with AudioController.
 */

this.init = function(game) {
    this.game = game;
    this.audioClips = {};
};

this.onStart = async function() {
    // Example 1: Load 2D background music
    this.audioClips.bgMusic = await this.game.audioController.loadAudioClip("sounds/background.mp3");
    this.game.audioController.setAudioClipProperties(this.audioClips.bgMusic, {
        positional: false,  // 2D audio
        loop: true,
        volume: 0.3
    });
    this.game.audioController.playAudioClip(this.audioClips.bgMusic);
    
    // Example 2: Load 3D positional sound (attached to object)
    this.audioClips.footstep = await this.game.audioController.loadAudioClip("sounds/footstep.wav");
    this.game.audioController.attachAudioClipToObject(this.audioClips.footstep, this.target);
    this.game.audioController.setAudioClipProperties(this.audioClips.footstep, {
        positional: true,   // 3D spatial audio
        loop: false,
        volume: 0.5,
        rolloffFactor: 1.5  // Distance attenuation
    });
    
    // Example 3: Load one-shot sound effect
    this.audioClips.explosion = await this.game.audioController.loadAudioClip("sounds/explosion.wav");
    this.game.audioController.setAudioClipProperties(this.audioClips.explosion, {
        positional: false,
        loop: false,
        volume: 0.8
    });
};

// Example 4: Play footstep on walk
this.onFootstep = function() {
    if (this.audioClips.footstep) {
        this.game.audioController.playAudioClip(this.audioClips.footstep);
    }
};

// Example 5: Play explosion at specific location
this.explode = function(position) {
    if (this.audioClips.explosion) {
        // For positional audio at a point, attach to a temporary object
        const explosionPoint = new THREE.Object3D();
        explosionPoint.position.copy(position);
        this.game.scene.add(explosionPoint);
        
        this.game.audioController.attachAudioClipToObject(this.audioClips.explosion, explosionPoint);
        this.game.audioController.playAudioClip(this.audioClips.explosion);
        
        // Remove temporary object after sound finishes
        setTimeout(() => {
            this.game.scene.remove(explosionPoint);
        }, 3000);
    }
};

// Example 6: Pause/resume audio
this.pauseMusic = function() {
    if (this.audioClips.bgMusic) {
        this.game.audioController.pauseAudioClip(this.audioClips.bgMusic);
    }
};

this.resumeMusic = function() {
    if (this.audioClips.bgMusic) {
        this.game.audioController.playAudioClip(this.audioClips.bgMusic);
    }
};

// Example 7: Stop audio
this.stopMusic = function() {
    if (this.audioClips.bgMusic) {
        this.game.audioController.stopAudioClip(this.audioClips.bgMusic);
    }
};

// Example 8: Check if audio is playing
this.isPlayingMusic = function() {
    if (this.audioClips.bgMusic) {
        return this.game.audioController.isAudioClipPlaying(this.audioClips.bgMusic);
    }
    return false;
};

// Example 9: Master volume control
this.setMasterVolume = function(volume) {
    this.game.audioController.setMasterVolume(volume); // 0.0 to 1.0
};

// Example 10: Dynamic volume based on distance (manual control)
this.update = function(deltaTime) {
    if (this.game.player && this.audioClips.ambientSound) {
        const distance = this.target.position.distanceTo(this.game.player.position);
        const maxDistance = 20;
        const volume = Math.max(0, 1 - (distance / maxDistance));
        
        this.game.audioController.setAudioClipProperties(this.audioClips.ambientSound, {
            volume: volume
        });
    }
};

// Cleanup
this.dispose = function() {
    // Stop and dispose all audio clips
    Object.values(this.audioClips).forEach(clipId => {
        if (clipId) {
            this.game.audioController.stopAudioClip(clipId);
            this.game.audioController.disposeAudioClip(clipId);
        }
    });
    this.audioClips = {};
};
