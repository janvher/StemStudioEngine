# Mixamo animation samples

The four FBX files in this directory (`Idle.fbx`, `Walking.fbx`, `Slow Run.fbx`,
`Jumping.fbx`) are humanoid motion clips downloaded from
[Mixamo](https://www.mixamo.com), Adobe's free character-animation library.

## Licensing

Per Adobe's
[Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html):

> Both characters and animations downloaded from Mixamo can be used royalty
> free for personal, commercial, and non-profit projects, including
> incorporation of characters into illustrations and graphic art; use of
> characters and/or animations in 3D animations and pre-rendered video; use
> of characters and/or animations in video games; and 3D printing of
> characters for personal use.

These four clips are shipped here so the default avatar character has working
locomotion + idle animations out of the box. If you redistribute a build of
StemStudio that uses them, the same Mixamo terms apply to your build — they
do not transfer to a permissive open-source license. Treat them as "Adobe
royalty-free assets bundled with StemStudio", not as MIT-licensed content.

## Replacing the clips

The clips are loaded by
`client/packages/editor-oss/src/assets/js/animations/loadHumanoidAnimations.ts`.
If you want to substitute different animations, replace the FBX files here
(keeping the same filenames) or update the loader to point at your own files.
The engine's character behaviour reads them by name (`Idle`, `Walking`,
`Slow Run`, `Jumping`).
