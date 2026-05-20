import type * as Nav from 'navcat';
import { addOffMeshConnection, OffMeshConnectionDirection } from 'navcat';
import * as THREE from 'three';

import Editor from '@stem/editor-oss/editor/Editor';
import { BehaviorBase } from '../../Behavior';
import GameManager from '../../game/GameManager';

/**
 * NavMeshConnectionBehavior creates an off-mesh connection between this object
 * and a target object, allowing AI agents to jump, teleport, climb, or traverse
 * special paths that aren't part of the regular navigation mesh.
 */
class NavMeshConnectionBehavior extends BehaviorBase {
    private game: GameManager | null = null;
    private editor: Editor | null = null;
    private scene: THREE.Scene | null = null;
    private previewScene: THREE.Group | THREE.Scene | null = null;
    private navMeshBehavior: any = null;
    private connectionAdded: boolean = false;
    private visualizationHelper: THREE.ArrowHelper | null = null;

    async init(game: GameManager): Promise<void> {
        this.game = game;
        this.scene = game.scene!;
        this.previewScene = this.scene;
        
        // Find NavMesh behavior in scene
        this.findNavMeshBehavior();
    }

    async onStart(): Promise<void> {
        // Try to add connection when behavior starts
        this.addConnection();
        
        // Show visualization if enabled
        if (this.attributes.showConnection) {
            this.showVisualization();
        }
    }

    onStop(): void {
        this.hideVisualization();
    }

    onAttributesUpdated(): void {
        // Re-add connection with new settings
        if (this.connectionAdded) {
            console.info('[NavMeshConnectionBehavior]: Attributes changed, will re-add on next navmesh generation');
            this.connectionAdded = false;
        }
        
        // Update visualization
        if (this.attributes.showConnection) {
            this.showVisualization();
        } else {
            this.hideVisualization();
        }
    }

    // Editor methods
    onEditorAdded(editor: Editor): void {
        this.editor = editor;
        this.scene = editor.scene!;
        this.previewScene = editor.sceneHelpers!;
        
        if (this.attributes.showConnection) {
            this.showVisualization();
        }
    }

    onEditorUpdate(): void {
        // Update visualization every frame when in editor
        if (this.attributes.showConnection) {
            this.updateVisualizationPositions();
        }
    }

    onEditorAttributesUpdated(): void {
        // Update visualization when attributes change
        if (this.attributes.showConnection) {
            this.showVisualization();
        } else {
            this.hideVisualization();
        }
    }

    onEditorDispose(): void {
        // Clean up when switching from editor to game mode
        this.hideVisualization();
        this.editor = null;
    }

    /**
     * Update visualization positions without recreating arrows
     */
    private updateVisualizationPositions(): void {
        if (!this.visualizationHelper) return;

        const targetUUID = this.attributes.targetObject;
        if (!targetUUID) return;

        const targetObject = this.scene?.getObjectByProperty('uuid', targetUUID);
        if (!targetObject) return;

        // Get current positions
        const startPos = this.target.getWorldPosition(new THREE.Vector3());
        const endPos = targetObject.getWorldPosition(new THREE.Vector3());

        // Update each arrow in the group
        this.visualizationHelper.children.forEach((child) => {
            if (child instanceof THREE.ArrowHelper) {
                const isForward = child === this.visualizationHelper!.children[0];
                
                if (isForward) {
                    // Forward arrow: from start to end
                    const direction = new THREE.Vector3().subVectors(endPos, startPos);
                    const length = direction.length();
                    direction.normalize();
                    
                    child.position.copy(startPos);
                    child.setDirection(direction);
                    child.setLength(length, length * 0.2, length * 0.1);
                } else {
                    // Backward arrow: from end to start
                    const direction = new THREE.Vector3().subVectors(startPos, endPos);
                    const length = direction.length();
                    direction.normalize();
                    
                    child.position.copy(endPos);
                    child.setDirection(direction);
                    child.setLength(length, length * 0.2, length * 0.1);
                }
            }
        });
    }

    /**
     * Find NavMesh behavior in the scene
     */
    private findNavMeshBehavior(): void {
        const navMeshBehaviors = this.game?.behaviorManager?.getBehaviorsById('navmesh');
        if (navMeshBehaviors && navMeshBehaviors.length > 0) {
            this.navMeshBehavior = navMeshBehaviors[0];
        } else {
            console.warn('[NavMeshConnectionBehavior]: NavMesh behavior not found in scene');
        }
    }

    /**
     * Add off-mesh connection to the NavMesh
     */
    private addConnection(): void {
        if (this.connectionAdded) return;
        if (!this.navMeshBehavior) {
            this.findNavMeshBehavior();
            if (!this.navMeshBehavior) return;
        }

        // Check if NavMesh is ready
        if (!this.navMeshBehavior.isNavMeshReady()) {
            console.warn('[NavMeshConnectionBehavior]: NavMesh not ready yet, will retry');
            // Retry after a delay
            setTimeout(() => this.addConnection(), 1000);
            return;
        }

        // Get target object
        const targetUUID = this.attributes.targetObject;
        if (!targetUUID) {
            console.warn('[NavMeshConnectionBehavior]: No target object specified');
            return;
        }

        const targetObject = this.game?.scene?.getObjectByProperty('uuid', targetUUID);
        if (!targetObject) {
            console.warn('[NavMeshConnectionBehavior]: Target object not found:', targetUUID);
            return;
        }

        // Get world positions
        const startPos = this.target.getWorldPosition(new THREE.Vector3());
        const endPos = targetObject.getWorldPosition(new THREE.Vector3());

        // Get connection direction
        const direction = this.attributes.bidirectional 
            ? OffMeshConnectionDirection.BIDIRECTIONAL 
            : OffMeshConnectionDirection.START_TO_END;

        // Get radius
        const radius = this.attributes.radius || 0.5;

        try {
            // Get navMesh from NavMeshBehavior
            const navMesh = this.navMeshBehavior.navMesh;
            if (!navMesh) {
                console.warn('[NavMeshConnectionBehavior]: NavMesh not available');
                return;
            }

            // Add off-mesh connection
            addOffMeshConnection(navMesh, {
                start: [startPos.x, startPos.y, startPos.z],
                end: [endPos.x, endPos.y, endPos.z],
                direction,
                radius,
                area: 0,
                flags: 0xffffff,
            });

            this.connectionAdded = true;
            console.info('[NavMeshConnectionBehavior]: Added connection:', this.target.name, '->', targetObject.name);
        } catch (error) {
            console.error('[NavMeshConnectionBehavior]: Failed to add connection:', error);
        }
    }

    /**
     * Show visual representation of the connection
     */
    private showVisualization(): void {
        this.hideVisualization();

        const targetUUID = this.attributes.targetObject;
        if (!targetUUID) return;

        // Find target in the main scene, not previewScene
        const targetObject = this.scene!.getObjectByProperty('uuid', targetUUID);
        if (!targetObject) return;

        // Get positions
        const startPos = this.target.getWorldPosition(new THREE.Vector3());
        const endPos = targetObject.getWorldPosition(new THREE.Vector3());

        // Create direction vector
        const direction = new THREE.Vector3().subVectors(endPos, startPos);
        const length = direction.length();
        direction.normalize();

        // Create visualization group
        this.visualizationHelper = new THREE.Group() as any;
        this.visualizationHelper!.name = `NavMeshConnection_${this.target.name}`;

        // Get color based on bidirectional setting
        const isBidirectional = this.attributes.bidirectional;
        const color = new THREE.Color(isBidirectional ? '#00ffff' : '#00ff00'); // Cyan for bidirectional, green for one-way

        // Create forward arrow
        const forwardArrow = new THREE.ArrowHelper(
            direction,
            startPos,
            length,
            color.getHex(),
            length * 0.2, // headLength
            length * 0.1,  // headWidth
        );
        this.visualizationHelper!.add(forwardArrow);

        // Add backward arrow if bidirectional
        if (isBidirectional) {
            const backwardDirection = direction.clone().negate();
            const backwardArrow = new THREE.ArrowHelper(
                backwardDirection,
                endPos,
                length,
                color.getHex(),
                length * 0.2, // headLength
                length * 0.1,  // headWidth
            );
            this.visualizationHelper!.add(backwardArrow);
        }

        this.previewScene!.add(this.visualizationHelper!);
    }

    /**
     * Hide visualization
     */
    private hideVisualization(): void {
        if (this.visualizationHelper) {
            this.previewScene!.remove(this.visualizationHelper);
            
            // Dispose all children
            this.visualizationHelper.traverse((child: any) => {
                if (child.dispose) {
                    child.dispose();
                }
            });
            
            this.visualizationHelper = null;
        }
    }

    update(deltaTime: number): void {
        // No frame updates needed
        // Connection is added once when NavMesh is ready
    }

    dispose(): void {
        this.hideVisualization();
        this.navMeshBehavior = null;
        this.connectionAdded = false;
    }
}

export default NavMeshConnectionBehavior;
