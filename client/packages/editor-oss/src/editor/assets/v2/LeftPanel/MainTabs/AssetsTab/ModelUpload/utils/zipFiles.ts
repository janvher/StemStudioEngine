import JSZip from "jszip";

/**
 * Zip multiple files into a single blob.
 * Preserves folder structure when files have webkitRelativePath (from folder selection).
 * @param files
 */
export const zipFiles = async (files: FileList | File[]): Promise<Blob> => {
  const zip = new JSZip();
  const fileArray = Array.isArray(files) ? files : Array.from(files);

  for (let i = 0; i < fileArray.length; ++i) {
    const file = fileArray[i]!;

    // Read file contents
    const data = await file.arrayBuffer();

    // Use webkitRelativePath to preserve folder structure, otherwise just filename
    // webkitRelativePath includes the root folder name, e.g., "myFolder/textures/diffuse.png"
    const filePath = getFilePath(file);

    // Add to zip with the path (creates folders automatically)
    zip.file(filePath, data);
  }

  // Generate zip as a Blob
  return zip.generateAsync({ type: "blob" });
};

/**
 * Get the file path for zipping.
 * Uses webkitRelativePath if available (folder selection), otherwise just the filename.
 * @param file
 */
function getFilePath(file: File): string {
  // webkitRelativePath is set when using directory selection (webkitdirectory attribute)
  // It contains the relative path from the selected folder root
  const relativePath = (file as any).webkitRelativePath;

  if (relativePath && typeof relativePath === 'string' && relativePath.length > 0) {
    // relativePath looks like "folderName/subfolder/file.png"
    // We keep the full path to preserve structure
    return relativePath;
  }

  // Fallback to just the filename
  return file.name;
}
