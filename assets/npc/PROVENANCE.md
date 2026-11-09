# Native 3D character assets

## Source and license

- `jordan-business-walk.glb`: Innerscene, “Walk carrying briefcase – Jordan – 3D Person, Animated”. Source: https://www.innerscene.com/tools/library/3d-parts/walk-carrying-briefcase-jordan-3d-person-animated-c805c97a
- `harper-business-walk.glb`: Innerscene, “Walk carrying briefcase – Harper – 3D Person, Animated”. Source: https://www.innerscene.com/tools/library/3d-parts/walk-carrying-briefcase-harper-3d-person-animated-e6e9eb6a

- `sam-relaxed-walk.glb` uses Innerscene's “Relaxed walk – Sam – 3D Person, Animated”. [Source model](https://www.innerscene.com/tools/library/3d-parts/relaxed-walk-sam-3d-person-animated-732f1206)

All three GLB files contain an `asset.copyright` declaration dedicating the model under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Jordan and Harper use `Walk_Carry`. Sam uses `Walk_Relaxed`. Each actor has its own animated skeleton. The three model heads have distinct geometry and skin textures.

## Historical limits

The faces are fictional. Jordan and Harper wear general business clothing. Sam wears a long-sleeved top and trousers. The clothing is an approximation for the historical scenes. Modern handheld props are hidden in both historical eras.

The hats use separate elliptical fits measured on each model's scalp mesh. A hat follows the head rig throughout the walk. Hair is visible on bareheaded figures. The Burgplatz postcard of 1908 provides cues for brims, caps and clothing silhouettes. The 1865 Hetjens studio portrait provides a reference for the grooming of one fictional 1869 character. The portrait depicts one individual and cannot establish a typical local look. [Burgplatz postcard](https://commons.wikimedia.org/wiki/File:Burgplatz_Duesseldorf.jpg) · [Hetjens-Museum portrait](https://www.deutsche-digitale-bibliothek.de/item/T44GQY6MT2SWOOXUXIEAJIKV5E6HPGHQ)

For the 1869 scene, the default accessory is restricted to a bowler. The Texas Tech University Museum describes bowler adoption during the 1860s: https://www.ttumuseumcollections.org/exhibit_item/bowler-hat/

The Homburg-like accessory is only available for the later historical scene. Bad Homburg's official history dates the Homburg hat's origin to 1882: https://www.bad-homburg.de/de/stadt/aktuelles/vortrag-zur-entstehungsgeschichte-des-homburg-hutes-y65gxg0ykk

## Local texture optimization

Opaque color images are re-encoded as JPEG quality 90 with 4:4:4 chroma. Face textures remain 2048 × 2048 pixels. Normal maps, eyelashes and brows are preserved byte-for-byte. The original Jordan and Harper hair maps are also preserved. Teeth maps are reduced to 1024 pixels. Geometry, skeletal rigs, animation and accessors are unchanged. Sam’s alpha hair texture was additionally reduced to 1024 pixels with the same optimizer. The three optimized files total 39,568,456 bytes. The processing script and validation report are in `tools/`.
