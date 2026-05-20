---
title: Billboards
slug: billboards
description: Display images, videos, and web content on flat surfaces in your 3D scene using billboard objects.
status: draft
audience: creators
prerequisites: [editor/01-left-panel]
---

# Billboards

Billboards are flat display surfaces that show images, videos, or web content within your 3D scene. StemStudio provides three billboard types, each optimized for a different media format.

## How To Add Billboards

1. Open the **Library & Tools** tab in the left panel.
2. Expand the **Tools** category.
3. Click **Billboard**, **Image Billboard**, or **Video Billboard**.
4. The billboard is added to your scene.

Select the billboard and open the right panel to configure its display properties.

---

## Billboard (Generic)

The generic billboard supports three display modes: images, web pages, and YouTube videos.

### Display Modes

| Mode | Description |
|------|-------------|
| **Image** | Displays a static image or GIF |
| **Webpage** | Embeds a live web page (rendered as a texture) |
| **YouTube Video** | Embeds a YouTube video player |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| **Mode** | dropdown | Image, Webpage, or YouTube Video |
| **URL / Image** | text or image picker | The content source (URL or uploaded image) |
| **Face Camera** | toggle | When enabled, the billboard always rotates to face the camera |
| **Two Sided** | toggle | When enabled, the billboard is visible from both front and back |
| **Transparent** | toggle | When enabled, transparent areas of the image are see-through |
| **Occlusion Detection** | toggle | When enabled, the billboard is hidden when occluded by other objects |

---

## Image Billboard

The image billboard is optimized for displaying static images and GIFs with precise layout control.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| **Image** | image picker or URL | The image to display. Supports uploaded assets and external URLs |
| **Rotation** | number | Rotation angle of the image on the billboard surface |
| **Aspect Ratio** | number | Width-to-height ratio of the billboard |
| **Fit Mode** | dropdown | **Contain** (fit within bounds) or **Cover** (fill bounds, may crop) |
| **GIF Support** | automatic | Animated GIFs play automatically when used as the image source |

### Image Sources

You can provide images in two ways:
- **Asset library:** Select an image you have already uploaded to your project
- **External URL:** Enter a direct URL to an image hosted online

---

## Video Billboard

The video billboard plays video content in 3D space with spatial audio support.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| **Video** | video picker or URL | The video to play. Supports uploaded assets and external URLs |
| **Rotation** | number | Rotation angle of the video on the billboard surface |
| **Aspect Ratio** | number | Width-to-height ratio of the billboard |
| **Fit** | dropdown | **Contain** or **Cover** |
| **Autoplay** | toggle | Start playing automatically when the scene loads |
| **Loop** | toggle | Restart the video when it finishes |
| **Mute** | toggle | Play without audio |
| **Volume** | slider | Playback volume level |
| **Proximity Volume** | toggle | When enabled, volume adjusts based on player distance |
| **Proximity Distance** | number | Maximum distance at which the video is audible |
| **Start On Trigger** | toggle | When enabled, the video starts only when activated by a trigger event |

### Autoplay and Mute

Most browsers block autoplay of videos with audio. If you want a video to autoplay when the scene loads, enable **Mute** as well. Players can then unmute manually if needed.

---

## Common Properties

All billboard types share standard object properties:

| Property | Description |
|----------|-------------|
| **Custom Name** | A display name for the billboard in the scene hierarchy |
| **Position** | 3D position in the scene (x, y, z) |
| **Rotation** | Orientation of the billboard |
| **Scale** | Size of the billboard |

---

## Tips

- **Enable Mute for autoplay** to ensure videos start playing automatically across all browsers.
- **Use proximity volume** on video billboards to create spatial audio that gets louder as the player walks closer.
- **Face Camera** on generic billboards is useful for signs and labels that should always be readable.
- **Trigger-based video playback** lets you start videos when a player enters an area or interacts with an object. Combine with [Scene Volumes](09-scene-tools.md) for area-based triggers.
- **Image billboards support GIFs** for simple animated displays without the overhead of video playback.

## Next Steps

- Learn about trigger-based interactions in [Scene Tools](09-scene-tools.md).
- Add sound to your scene with the Point Sound tool in [Scene Tools](09-scene-tools.md).
- Configure materials on 3D objects in [Materials and Textures](05-materials-and-textures.md).
