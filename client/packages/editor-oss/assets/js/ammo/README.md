#ammo.js
This build was generated from the [dotEarth/ammo.js](https://github.com/dotErth/ammo.js) repository, which is a fork of [i12345/ammo.js](https://github.com/i12345/ammo.js).

##Building a new version
To build a new version, see the README.md file in [dotEarth/ammo.js](https://github.com/dotErth/ammo.js). That repository has a Dockerfile which can be used to build ammo.js. Note that if you update ammo.idl, you'll also need to regenerate Typescript types using `npm run generate`.

Once you have built the library, copy the following files into this directory (`web/assets/js/ammo/`):
* ammo.wasm.js
* ammo.wasm.wasm
* ammo.wasm.d.ts

`web/tsconfig.json` includes `assets/**/*.d.ts`, so the types are picked up automatically.

Finally, make the following modifications to ammo.wasm.js near the end of the file:
1. Comment-out `this.Ammo=d;` ('d' may be a different character)
2. Add `export  default  Ammo;` as the final line in the file
