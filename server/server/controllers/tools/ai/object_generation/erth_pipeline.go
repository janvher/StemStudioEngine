package object_generation

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"regexp"
	"strings"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/userlimits"
)

// extractJSON extracts JSON from a response that might be wrapped in markdown code blocks
func extractJSON(response string) string {
	response = strings.TrimSpace(response)

	// Try to extract from ```json ... ``` or ``` ... ```
	jsonBlockRegex := regexp.MustCompile("(?s)```(?:json)?\\s*\\n?(.*?)\\n?```")
	matches := jsonBlockRegex.FindStringSubmatch(response)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}

	// If no code block, check if it starts with { and ends with }
	if strings.HasPrefix(response, "{") && strings.HasSuffix(response, "}") {
		return response
	}

	// Try to find JSON object in the response
	startIdx := strings.Index(response, "{")
	endIdx := strings.LastIndex(response, "}")
	if startIdx != -1 && endIdx != -1 && endIdx > startIdx {
		return response[startIdx : endIdx+1]
	}

	return response
}

// runErthPipeline executes the 3-stage AI pipeline for Erth generation
func runErthPipeline(ctx context.Context, taskID string, req ErthGenerateRequest, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("[ErthBuilder:%s] Pipeline panic: %v", taskID, rec)
			updateErthTaskError(taskID, "pipeline", fmt.Sprintf("Pipeline panic: %v", rec))
		}
	}()

	log.Printf("[ErthBuilder:%s] Starting pipeline for prompt: %q, style: %q", taskID, req.Prompt, req.Style)

	// OpenAI client for image generation (Claude doesn't support image generation).
	// BYOK keys are extracted from the request and passed via the per-key helpers.
	openaiByokKey, _ := byok.ResolveFromRequest(r, "openai", "OPENAI_API_KEY")
	openaiClient, err := helpers.NewOpenAIClientWithKey(openaiByokKey)
	if err != nil {
		log.Printf("[ErthBuilder:%s] Failed to create OpenAI client: %v", taskID, err)
		updateErthTaskError(taskID, "initialization", fmt.Sprintf("OpenAI client error: %v", err))
		return
	}

	// Claude client for vision analysis and primitive generation (default).
	claudeByokKey, _ := byok.ResolveFromRequest(r, "anthropic", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY")
	claudeClient, err := helpers.NewClaudeClientWithKey(claudeByokKey)
	if err != nil {
		log.Printf("[ErthBuilder:%s] Failed to create Claude client, falling back to OpenAI: %v", taskID, err)
		claudeClient = nil // Will use OpenAI as fallback
	}

	// STAGE 1: Generate Image with GPT Image (OpenAI only - Claude doesn't support image generation)
	log.Printf("[ErthBuilder:%s] Stage 1: Generating image...", taskID)
	updateErthTaskProgress(taskID, 10, "image", "Generating 2D image...")

	imagePrompt := buildImagePrompt(req.Prompt, req.Style)
	log.Printf("[ErthBuilder:%s] Image prompt: %q", taskID, imagePrompt)

	imageB64, err := openaiClient.GenerateImage(ctx, imagePrompt)
	if err != nil {
		log.Printf("[ErthBuilder:%s] Image generation failed: %v", taskID, err)
		updateErthTaskError(taskID, "image", fmt.Sprintf("Image generation failed: %v", err))
		return
	}

	log.Printf("[ErthBuilder:%s] Image generated successfully, size: %d bytes", taskID, len(imageB64))
	imageDataURL := fmt.Sprintf("data:image/png;base64,%s", imageB64)
	// Don't store image in task during processing - it will be copied from composition.metadata at completion
	updateErthTaskProgress(taskID, 25, "image", "Image generated successfully")

	// STAGE 2: Analyze Image → Annotations with Claude Vision (default) or GPT-4 Vision (fallback)
	var annotationJSON string
	annotationPrompt := buildAnnotationPrompt()

	if claudeClient != nil {
		log.Printf("[ErthBuilder:%s] Stage 2: Analyzing image with Claude Vision...", taskID)
		updateErthTaskProgress(taskID, 30, "annotations", "Analyzing image with Claude Vision...")

		annotationJSON, err = claudeClient.RecognizeImage(ctx, annotationPrompt, imageDataURL)
		if err != nil {
			log.Printf("[ErthBuilder:%s] Claude image analysis failed, falling back to OpenAI: %v", taskID, err)
			claudeClient = nil // Disable Claude for refinement step too
		}
	}

	// Fallback to OpenAI if Claude failed or wasn't available
	if claudeClient == nil || annotationJSON == "" {
		log.Printf("[ErthBuilder:%s] Stage 2: Analyzing image with GPT-4 Vision (fallback)...", taskID)
		updateErthTaskProgress(taskID, 30, "annotations", "Analyzing image with GPT-4 Vision...")

		annotationJSON, err = openaiClient.RecognizeImage(ctx, annotationPrompt, imageDataURL)
		if err != nil {
			log.Printf("[ErthBuilder:%s] Image analysis failed: %v", taskID, err)
			updateErthTaskError(taskID, "annotations", fmt.Sprintf("Image analysis failed: %v", err))
			return
		}
	}

	log.Printf("[ErthBuilder:%s] Raw annotation response (first 500 chars): %s", taskID, truncateString(annotationJSON, 500))

	// Extract JSON from potential markdown wrapper and parse
	cleanJSON := extractJSON(annotationJSON)
	log.Printf("[ErthBuilder:%s] Cleaned JSON (first 500 chars): %s", taskID, truncateString(cleanJSON, 500))

	var rawComposition PrimitiveComposition
	if err := json.Unmarshal([]byte(cleanJSON), &rawComposition); err != nil {
		log.Printf("[ErthBuilder:%s] Failed to parse annotations: %v", taskID, err)
		log.Printf("[ErthBuilder:%s] Full raw response: %s", taskID, annotationJSON)
		updateErthTaskError(taskID, "annotations", fmt.Sprintf("Failed to parse annotations: %v", err))
		return
	}

	log.Printf("[ErthBuilder:%s] Parsed %d primitives from annotations", taskID, len(rawComposition.Primitives))
	annotationJSON = cleanJSON // Use cleaned version for refinement

	updateErthTaskProgress(taskID, 60, "annotations", "Annotations extracted successfully")

	// STAGE 3: Refine Composition with Claude (default) or GPT-4 (fallback)
	log.Printf("[ErthBuilder:%s] Stage 3: Refining composition...", taskID)
	updateErthTaskProgress(taskID, 70, "composition", "Refining 3D composition...")

	refinementPrompt := buildRefinementPrompt(annotationJSON)
	var refinedJSON string

	if claudeClient != nil {
		log.Printf("[ErthBuilder:%s] Refining with Claude...", taskID)
		refinedJSON, err = claudeClient.CreateCompletion(ctx, "", refinementPrompt)
		if err != nil {
			log.Printf("[ErthBuilder:%s] Claude refinement failed, falling back to OpenAI: %v", taskID, err)
			refinedJSON = ""
		}
	}

	// Fallback to OpenAI if Claude failed or wasn't available
	if claudeClient == nil || refinedJSON == "" {
		log.Printf("[ErthBuilder:%s] Refining with OpenAI (fallback)...", taskID)
		refinedJSON, err = openaiClient.CreateCompletion(ctx, "", refinementPrompt)
		if err != nil {
			log.Printf("[ErthBuilder:%s] Refinement failed, using raw annotations: %v", taskID, err)
			refinedJSON = annotationJSON
		}
	}

	log.Printf("[ErthBuilder:%s] Refined JSON (first 500 chars): %s", taskID, truncateString(refinedJSON, 500))

	var finalComposition PrimitiveComposition
	cleanRefinedJSON := extractJSON(refinedJSON)
	if err := json.Unmarshal([]byte(cleanRefinedJSON), &finalComposition); err != nil {
		log.Printf("[ErthBuilder:%s] Invalid refined composition, using raw annotations: %v", taskID, err)
		finalComposition = rawComposition
	}

	log.Printf("[ErthBuilder:%s] Final composition has %d primitives", taskID, len(finalComposition.Primitives))

	// Add metadata
	finalComposition.Metadata = CompositionMetadata{
		TotalPrimitives: len(finalComposition.Primitives),
		BoundingBox:     calculateBoundingBox(finalComposition.Primitives),
		GeneratedImage:  imageDataURL,
	}

	updateErthTaskProgress(taskID, 90, "composition", "Finalizing...")

	// STAGE 4: Complete
	log.Printf("[ErthBuilder:%s] Pipeline completed successfully", taskID)
	updateErthTaskComplete(taskID, &finalComposition)

	// Decrement quota on success
	if err := userlimits.Consume3D(r, 1); err != nil {
		log.Printf("[ErthBuilder:%s] Warning: Failed to decrement quota: %v", taskID, err)
	}
}

// truncateString truncates a string to maxLen characters for logging
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// buildImagePrompt constructs the DALL-E prompt
func buildImagePrompt(userPrompt, style string) string {
	styleModifier := ""
	switch style {
	case "low-poly":
		styleModifier = ", low-poly 3D render style, distinct geometric facets, flat-shaded polygons, visible edges between faces"
	case "geometric":
		styleModifier = ", geometric 3D art style, clean angular shapes, distinct colored surfaces, faceted appearance"
	default:
		styleModifier = ", 3D model reference style, distinct parts clearly visible, clean surfaces"
	}

	return fmt.Sprintf(
		"%s%s. 3/4 isometric view showing front and side, single object centered on pure white background, "+
			"all major components clearly visible (wheels, body parts, details), even studio lighting with soft shadows, "+
			"distinct separation between parts, no motion blur, sharp details, reference sheet quality for 3D modeling.",
		userPrompt,
		styleModifier,
	)
}

// buildAnnotationPrompt constructs the Claude Vision annotation prompt
func buildAnnotationPrompt() string {
	return `You are a 3D reconstruction expert specializing in creating cohesive, playful 3D scenes. Analyze this isometric image and decompose it into 3D geometric primitives with HIGH FIDELITY.

## Core Principles
1. **SCENE CONSISTENCY**: All elements should feel like they belong together - unified style, proportional scale relationships, and coherent visual language
2. **GEO-SPATIAL ACCURACY**: Precise positioning is critical - objects must be grounded properly, aligned with each other, and spatially aware of neighboring elements
3. **PLAYFUL AESTHETIC**: Favor vibrant, saturated colors with good contrast. Think stylized game art - clean, bold, and visually appealing

## Available Primitives
- box: rectangular volumes (use for: bodies, panels, blocks, flat surfaces, structural elements)
- sphere: round volumes (use for: balls, domes, rounded caps, joints)
- cylinder: circular extrusions (use for: wheels, pipes, poles, tubes, columns, axles, handles)
- cone: tapered circular shapes (use for: noses, tips, funnels, pointed elements)
- plane: flat 2D surfaces (use for: wings, fins, blades, thin panels)

## Decomposition Strategy
1. IDENTIFY MAJOR COMPONENTS: Break the scene into logical parts (e.g., town = buildings + trees + paths + props)
2. USE 15-40 PRIMITIVES for rich detail - more primitives = higher fidelity
3. LAYER DETAILS: Start with main volumes, then add secondary details, then small accents
4. CAPTURE PROPORTIONS: Maintain consistent scale relationships - a person should fit through a door, trees should dwarf characters
5. SCENE COHERENCE: All objects should share a unified visual style and level of detail

## Orientation & Rotation Guide (CRITICAL)
The image shows an isometric view. Infer 3D orientations as follows:
- Objects facing "camera-left" in isometric → rotate ~45° around Y-axis (0.785 radians)
- Horizontal cylinders (wheels, axles) → rotate 90° around Z-axis (1.571 radians)
- Vertical cylinders (poles, legs) → no rotation needed
- Angled surfaces → combine X and Z rotations
- Front-facing elements → typically 0 or small Y rotation
- Wheels on sides of vehicles → rotate [1.571, 0, 0] to lay flat, position on X-axis sides

## Geo-Spatial Placement (CRITICAL)
- Items appearing "higher" in image are further back (larger Z)
- Items appearing "lower" in image are closer (smaller Z)
- Left-right in image maps to X-axis with perspective adjustment
- Overlapping shapes: front shape has smaller Z value
- Symmetric objects: mirror primitives across X=0 or Z=0 axis
- GROUNDING: All objects must touch the ground (Y=0) or rest on other objects - no floating elements
- ALIGNMENT: Buildings should have aligned edges, paths should connect properly, trees should be in consistent rows
- SPACING: Maintain realistic distances between objects - buildings need walkways, trees need room to "grow"

## Scale & Positioning Rules
- Coordinate system: Y-up, Y=0 is ground level
- Positions in meters, center of each primitive
- Scale = full dimensions [width, height, depth], NOT half-extents
- For wheels/cylinders: scale[0]=diameter, scale[1]=thickness, scale[2]=diameter
- Bottom of ground-touching objects: position.y = scale.y / 2
- Real-world proportions: car ~4m long, person ~1.8m tall, chair ~0.5m tall

## Color Palette (PLAYFUL & VIBRANT)
- Use SATURATED, VIBRANT colors - avoid dull grays and muddy browns
- Favor a cohesive palette: pick 4-6 main colors that work together harmoniously
- For natural scenes: bright greens (#7AC74C), warm yellows (#FFD93D), sky blues (#6EC6FF)
- For buildings: warm terracotta (#E07A5F), cream (#F4E8C1), rich browns (#8B5A2B)
- For details: pop colors that add visual interest - reds, oranges, purples
- Maintain good CONTRAST between adjacent elements for visual clarity
- Even shadows should have color - use darker tints of the base color, not gray

## Hierarchical Naming for Groups (IMPORTANT)
Use "/" separators in names to create logical groups. This enables ungrouping into useful sub-models.
Format: "category/subcategory/part_name"

Examples:
- Scene with buildings: "church/tower/spire", "church/nave/body", "house/left/roof", "house/right/door"
- Vehicle: "car/body/main", "car/wheels/front_left", "car/interior/steering"
- Character: "robot/head/dome", "robot/torso/chest", "robot/arm_left/upper"

Group primitives by:
1. Object type (building, tree, vehicle, character)
2. Sub-part (tower, nave, trunk, canopy)
3. Specific element (body, door, window, spire)

## JSON Output Format
CRITICAL: Return ONLY raw JSON. No markdown, no backticks. Start with { end with }.

{"primitives":[
  {"type":"box","name":"car/body/main","position":[0,0.5,0],"rotation":[0,0,0],"scale":[2,1,1],"color":"#FF0000"},
  {"type":"cylinder","name":"car/wheels/front_left","position":[-0.7,0.2,0.5],"rotation":[1.571,0,0],"scale":[0.4,0.2,0.4],"color":"#333333"},
  {"type":"box","name":"car/windows/windshield","position":[0.2,0.8,0],"rotation":[0.3,0,0],"scale":[0.8,0.3,0.02],"color":"#88CCFF"}
]}

## Quality Checklist
- [ ] 15+ primitives for any complex object
- [ ] All wheels/cylindrical parts have correct rotation
- [ ] Symmetric parts mirrored accurately
- [ ] No floating objects (all supported or connected)
- [ ] Colors sampled from actual image regions
- [ ] Proportions match the reference image
- [ ] Small details included (handles, buttons, accents)
- [ ] Hierarchical naming used for logical grouping

Now analyze the image and generate the primitive composition:`
}

// buildRefinementPrompt constructs the refinement prompt
func buildRefinementPrompt(annotationJSON string) string {
	return fmt.Sprintf(`You are a 3D composition refinement expert. Review and improve this primitive composition for accuracy and realism.

## Current Composition
%s

## Refinement Tasks

### 1. Orientation Corrections (CRITICAL)
- Wheels/tires MUST rotate [1.571, 0, 0] (90° around X) to lay horizontally
- Horizontal pipes/cylinders: rotate [0, 0, 1.571] (90° around Z)
- Verify rotations are in RADIANS (π/2 = 1.571, π = 3.142)
- Objects should face logical directions (fronts forward, handles accessible)

### 2. Structural Integrity
- No floating primitives: every object needs support or connection
- Ground-touching objects: position.y = scale.y / 2
- Stacked objects: top.position.y = bottom.position.y + (bottom.scale.y + top.scale.y) / 2
- Connected parts should overlap slightly or touch exactly

### 3. Symmetry & Alignment
- Mirror symmetric parts exactly (same |x| positions, opposite signs)
- Wheels in pairs: front-left/front-right, rear-left/rear-right
- Center main body at X=0, Z=0

### 4. Proportional Accuracy
- Real-world scale expectations:
  - Car: ~4m long, ~1.5m tall, ~1.8m wide
  - Person: ~1.8m tall, ~0.5m wide
  - Chair: ~0.5m seat height, ~1m total height
  - Table: ~0.75m tall
- Relative proportions: wheels ~20-25%% of car height, head ~15%% of body height

### 5. Detail Enhancement
- If fewer than 15 primitives, ADD more detail:
  - Separate distinct visual regions into primitives
  - Add small features (handles, buttons, trim, accents)
  - Break large flat surfaces into component parts
- Each visually distinct area should have its own primitive

### 6. Color Validation
- Ensure all colors are valid hex (#RRGGBB format)
- Adjacent primitives should have appropriately different or matching colors
- Dark elements (wheels, shadows): use darker hex values
- Metallic/chrome elements: use light grays (#CCCCCC to #EEEEEE)

### 7. Naming Conventions
- Use descriptive, hierarchical names: "body_main", "wheel_front_left", "window_rear"
- Names should indicate position: front/rear, left/right, top/bottom

## Output Requirements
- Return the COMPLETE refined composition
- Keep all original primitives unless they need to be split or merged
- Add new primitives if detail is lacking
- CRITICAL: Return ONLY raw JSON. No markdown, no backticks. Start with { end with }.`, annotationJSON)
}

// calculateBoundingBox computes the overall bounding box
func calculateBoundingBox(primitives []PrimitiveObject) BoundingBox {
	if len(primitives) == 0 {
		return BoundingBox{Width: 1, Height: 1, Depth: 1}
	}

	minX, minY, minZ := math.Inf(1), math.Inf(1), math.Inf(1)
	maxX, maxY, maxZ := math.Inf(-1), math.Inf(-1), math.Inf(-1)

	for _, p := range primitives {
		halfScale := [3]float64{p.Scale[0] / 2, p.Scale[1] / 2, p.Scale[2] / 2}

		minX = math.Min(minX, p.Position[0]-halfScale[0])
		maxX = math.Max(maxX, p.Position[0]+halfScale[0])
		minY = math.Min(minY, p.Position[1]-halfScale[1])
		maxY = math.Max(maxY, p.Position[1]+halfScale[1])
		minZ = math.Min(minZ, p.Position[2]-halfScale[2])
		maxZ = math.Max(maxZ, p.Position[2]+halfScale[2])
	}

	return BoundingBox{
		Width:  maxX - minX,
		Height: maxY - minY,
		Depth:  maxZ - minZ,
	}
}
